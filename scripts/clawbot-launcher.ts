/**
 * Clawbot container launcher for deploy flow.
 * Run from repo root with: node --import tsx scripts/clawbot-launcher.ts
 *
 * Required env:
 *   LINKER_URL, DEPLOY_JOB_ID, DEPLOY_SECRET, BOT_NAME, GATEWAY_TOKEN,
 *   IDENTITY_PUBLIC_URL (e.g. http://host:3001), GATEWAY_PUBLIC_URL (e.g. wss://host)
 *
 * 1. Load/create keypair, register with linker, get claim code
 * 2. Start identity server (so linker can POST attestation)
 * 3. Call /api/deploy/[id]/ready (auto-claim + store gateway_url)
 * 4. Spawn OpenClaw gateway in background
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const requiredEnv = [
  "LINKER_URL",
  "DEPLOY_JOB_ID",
  "DEPLOY_SECRET",
  "BOT_NAME",
  "GATEWAY_TOKEN",
  "IDENTITY_PUBLIC_URL",
  "GATEWAY_PUBLIC_URL",
] as const;

function getEnv(): Record<(typeof requiredEnv)[number], string> {
  const out: Record<string, string> = {};
  for (const key of requiredEnv) {
    const v = process.env[key];
    if (!v?.trim()) {
      console.error(`Missing required env: ${key}`);
      process.exit(1);
    }
    out[key] = v.trim();
  }
  return out as Record<(typeof requiredEnv)[number], string>;
}

async function main() {
  const env = getEnv();
  const linkerUrl = env.LINKER_URL.replace(/\/$/, "");
  const jobId = env.DEPLOY_JOB_ID;

  // Dynamic import identity package (run from repo root)
  const identityPath = path.join(REPO_ROOT, "packages", "identity", "src", "index.ts");
  const identity = await import(pathToFileURL(identityPath).href);
  const { loadOrCreateKeypair, registerClawbot, createIdentityRoutes } = identity;
  const { serve } = await import("@hono/node-server");
  const { Hono } = await import("hono");

  console.log("Loading identity keypair...");
  const keypair = await loadOrCreateKeypair();
  console.log("Registering with linker...");
  const registration = await registerClawbot({
    publicKey: keypair.publicKeyEncoded,
    name: env.BOT_NAME,
    endpoint: env.IDENTITY_PUBLIC_URL,
    linkerUrl,
  });
  console.log("Registered:", registration.clawbotId);

  // Start identity server first so linker can POST attestation when we call /ready
  const identityApp = new Hono();
  identityApp.route("/", createIdentityRoutes(keypair));
  const identityPort = 3001;
  serve({ fetch: identityApp.fetch, port: identityPort }, () => {
    console.log(`Identity server listening on :${identityPort}`);
  });

  // Call /ready so backend auto-claims and stores gateway_url
  const readyRes = await fetch(`${linkerUrl}/api/deploy/${jobId}/ready`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Deploy-Secret": env.DEPLOY_SECRET,
    },
    body: JSON.stringify({
      claimCode: registration.claimCode,
      clawbotId: registration.clawbotId,
      gatewayUrl: env.GATEWAY_PUBLIC_URL,
      gatewayToken: env.GATEWAY_TOKEN,
    }),
  });
  if (!readyRes.ok) {
    const err = await readyRes.text();
    console.error("Deploy ready failed:", readyRes.status, err);
    process.exit(1);
  }
  console.log("Deploy ready acknowledged.");

  // Spawn OpenClaw gateway (run from openclaw dir)
  const openclawDir = path.join(REPO_ROOT, "openclaw");
  const gatewayEnv = {
    ...process.env,
    OPENCLAW_GATEWAY_TOKEN: env.GATEWAY_TOKEN,
    CLAWDBOT_GATEWAY_TOKEN: env.GATEWAY_TOKEN,
  };
  const gateway = spawn("node", ["scripts/run-node.mjs", "gateway", "--allow-unconfigured", "--bind", "0.0.0.0"], {
    cwd: openclawDir,
    env: gatewayEnv,
    stdio: "inherit",
  });
  gateway.on("error", (err) => {
    console.error("Gateway process error:", err);
    process.exit(1);
  });
  gateway.on("exit", (code, signal) => {
    console.error("Gateway exited:", code ?? signal);
    process.exit(code ?? 1);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
