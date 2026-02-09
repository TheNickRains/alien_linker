import { NextResponse } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import { gatewayAgentMessage } from "@/lib/gateway-client";
import type { ChatRequest, ChatResponse, ApiError } from "@/lib/types";

/**
 * POST /api/clawbots/[id]/chat
 * Sends a message to the clawbot's OpenClaw gateway and returns the agent reply.
 * Requires the clawbot to have gateway_url set (deployed clawbots).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let alienId: string;
  try {
    alienId = await authenticateRequest(request);
  } catch (e) {
    const status = e instanceof AuthError ? e.statusCode : 401;
    return NextResponse.json<ApiError>(
      { error: e instanceof Error ? e.message : "Unauthorized" },
      { status }
    );
  }

  const { id: clawbotId } = await params;
  const db = createServerSupabase();
  const { data: row, error } = await db
    .from("clawbots")
    .select("id, alien_id, gateway_url, gateway_token")
    .eq("clawbot_id", clawbotId)
    .single();

  if (error || !row) {
    return NextResponse.json<ApiError>(
      { error: "Clawbot not found" },
      { status: 404 }
    );
  }

  if (row.alien_id !== alienId) {
    return NextResponse.json<ApiError>(
      { error: "Clawbot not found" },
      { status: 404 }
    );
  }

  const gatewayUrl = row.gateway_url as string | null;
  if (!gatewayUrl?.trim()) {
    return NextResponse.json<ApiError>(
      { error: "This clawbot does not support chat (no gateway)" },
      { status: 400 }
    );
  }

  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiError>(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json<ApiError>(
      { error: "message is required" },
      { status: 400 }
    );
  }

  try {
    const reply = await gatewayAgentMessage(
      {
        url: gatewayUrl,
        token: (row.gateway_token as string) || undefined,
        timeoutMs: 90_000,
      },
      message
    );
    return NextResponse.json<ChatResponse>({ reply });
  } catch (e) {
    console.error("Gateway chat error:", e);
    const message = e instanceof Error ? e.message : "Chat failed";
    const friendlyMessage =
      message.includes("timeout") || message.includes("Timeout")
        ? "Agent is taking too long to respond. Try again."
        : message;
    return NextResponse.json<ApiError>(
      { error: friendlyMessage },
      { status: 502 }
    );
  }
}
