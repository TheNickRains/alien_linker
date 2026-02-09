/**
 * Minimal OpenClaw gateway RPC client for the chat proxy.
 * Connects via WebSocket, sends connect then agent request, returns final payload.
 */

const PROTOCOL_VERSION = 1;

export interface GatewayChatOptions {
  url: string;
  token?: string;
  password?: string;
  timeoutMs?: number;
}

/**
 * Send a message to the gateway's agent method and return the reply text.
 * Uses connect (with auth) then agent request; waits for final response.
 */
export async function gatewayAgentMessage(
  options: GatewayChatOptions,
  message: string
): Promise<string> {
  const { url, token, password, timeoutMs = 60_000 } = options;
  const WebSocketImpl = await getWebSocket();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Gateway timeout"));
    }, timeoutMs);

    let ws: InstanceType<typeof WebSocketImpl> | null = null;
    let connected = false;
    const pending = new Map<
      string,
      { resolve: (v: unknown) => void; reject: (e: Error) => void; expectFinal: boolean }
    >();

    function cleanup() {
      clearTimeout(timer);
      if (ws) {
        try {
          ws.close();
        } catch {}
        ws = null;
      }
    }

    function sendReq(id: string, method: string, params: unknown) {
      if (!ws || ws.readyState !== 1) return;
      ws.send(JSON.stringify({ type: "req", id, method, params }));
    }

    try {
      ws = new WebSocketImpl(url);
    } catch (e) {
      clearTimeout(timer);
      reject(e instanceof Error ? e : new Error(String(e)));
      return;
    }

    ws.onopen = () => {
      sendReq("connect-1", "connect", {
        minProtocol: PROTOCOL_VERSION,
        maxProtocol: PROTOCOL_VERSION,
        client: {
          id: "alienclaw-linker",
          version: "1",
          platform: "node",
          mode: "backend",
        },
        role: "operator",
        scopes: ["operator.admin"],
        auth: token || password ? { token: token || undefined, password: password || undefined } : undefined,
      });
    };

    ws.onmessage = (event: { data: string | Buffer }) => {
      const raw = typeof event.data === "string" ? event.data : event.data?.toString?.();
      if (!raw) return;
      try {
        const frame = JSON.parse(raw);
        if (frame.type === "res") {
          const id = frame.id;
          const p = pending.get(id);
          if (!p) return;
          if (p.expectFinal && frame.payload?.status === "accepted") {
            return;
          }
          pending.delete(id);
          if (frame.ok) {
            p.resolve(frame.payload);
          } else {
            p.reject(new Error(frame.error?.message ?? "Gateway error"));
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = (err: unknown) => {
      cleanup();
      const msg = err instanceof Error ? err.message : String(err);
      reject(new Error(msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") ? "Agent unreachable" : msg || "Connection error"));
    };

    ws.onclose = () => {
      if (!connected) {
        cleanup();
        reject(new Error("Agent unreachable"));
      }
    };

    pending.set("connect-1", {
      resolve: (payload: unknown) => {
        connected = true;
        const agentId = "agent-" + Date.now();
        pending.set(agentId, {
          resolve: (agentPayload: unknown) => {
            cleanup();
            const text = extractReplyText(agentPayload);
            resolve(text);
          },
          reject: (e) => {
            cleanup();
            reject(e);
          },
          expectFinal: true,
        });
        sendReq(agentId, "agent", {
          message: message.trim(),
          idempotencyKey: agentId,
        });
      },
      reject: (e) => {
        cleanup();
        reject(e);
      },
      expectFinal: false,
    });
  });
}

function extractReplyText(payload: unknown): string {
  if (payload == null) return "";
  if (typeof payload === "string") return payload;
  if (typeof payload === "object" && "text" in payload && typeof (payload as { text: string }).text === "string") {
    return (payload as { text: string }).text;
  }
  if (typeof payload === "object" && "reply" in payload && typeof (payload as { reply: string }).reply === "string") {
    return (payload as { reply: string }).reply;
  }
  return JSON.stringify(payload);
}

async function getWebSocket(): Promise<new (url: string) => WebSocket> {
  if (typeof globalThis.WebSocket !== "undefined") {
    return globalThis.WebSocket as new (url: string) => WebSocket;
  }
  const mod = await import("ws");
  return mod.default as unknown as new (url: string) => WebSocket;
}
