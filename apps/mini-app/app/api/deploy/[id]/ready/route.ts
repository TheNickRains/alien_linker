import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { createAttestation } from "@/lib/attestation";
import type { ApiError } from "@/lib/types";

/**
 * POST /api/deploy/[id]/ready
 * Internal endpoint: called by the clawbot container after it has registered.
 * Auth: X-Deploy-Secret header must match DEPLOY_SECRET.
 * Body: { claimCode, clawbotId, gatewayUrl, gatewayToken? }
 * Auto-claims the clawbot for the deploy job's alien_id and marks the job running.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const secret = request.headers.get("X-Deploy-Secret");
  const expectedSecret = process.env.DEPLOY_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json<ApiError>(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: {
    claimCode?: string;
    clawbotId?: string;
    gatewayUrl?: string;
    gatewayToken?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiError>(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.claimCode || !/^\d{6}$/.test(body.claimCode)) {
    return NextResponse.json<ApiError>(
      { error: "claimCode must be a 6-digit string" },
      { status: 400 }
    );
  }
  if (!body.clawbotId || typeof body.clawbotId !== "string") {
    return NextResponse.json<ApiError>(
      { error: "clawbotId is required" },
      { status: 400 }
    );
  }
  if (!body.gatewayUrl || typeof body.gatewayUrl !== "string") {
    return NextResponse.json<ApiError>(
      { error: "gatewayUrl is required" },
      { status: 400 }
    );
  }

  const { id: jobId } = await params;
  const db = createServerSupabase();

  const { data: job, error: jobError } = await db
    .from("deploy_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return NextResponse.json<ApiError>(
      { error: "Deploy job not found" },
      { status: 404 }
    );
  }

  if (job.status === "running" || job.status === "failed") {
    return NextResponse.json<ApiError>(
      { error: "Deploy job already completed" },
      { status: 409 }
    );
  }

  const alienId = job.alien_id as string;

  const { data: bot, error: findError } = await db
    .from("clawbots")
    .select("*")
    .eq("claim_code", body.claimCode)
    .eq("clawbot_id", body.clawbotId)
    .is("alien_id", null)
    .single();

  if (findError || !bot) {
    return NextResponse.json<ApiError>(
      { error: "Invalid or expired claim code for this clawbot" },
      { status: 404 }
    );
  }

  if (
    bot.claim_code_expires_at &&
    new Date(bot.claim_code_expires_at) < new Date()
  ) {
    return NextResponse.json<ApiError>(
      { error: "Claim code has expired" },
      { status: 410 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://alienclaw-linker.vercel.app";
  const attestation = await createAttestation({
    alienId,
    clawbotId: bot.clawbot_id,
    publicKey: bot.public_key,
    issuedBy: appUrl,
  });

  const { error: updateBotError } = await db
    .from("clawbots")
    .update({
      alien_id: alienId,
      attestation: attestation as unknown as Record<string, unknown>,
      claim_code: null,
      claim_code_expires_at: null,
      status: "claimed",
      gateway_url: body.gatewayUrl,
      gateway_token: body.gatewayToken ?? null,
    })
    .eq("id", bot.id);

  if (updateBotError) {
    console.error("Failed to update clawbot:", updateBotError);
    return NextResponse.json<ApiError>(
      { error: "Failed to claim clawbot" },
      { status: 500 }
    );
  }

  const { error: updateJobError } = await db
    .from("deploy_jobs")
    .update({
      status: "running",
      clawbot_id: body.clawbotId,
      provider_metadata: {
        gatewayUrl: body.gatewayUrl,
        clawbotId: body.clawbotId,
      },
    })
    .eq("id", jobId);

  if (updateJobError) {
    console.error("Failed to update deploy job:", updateJobError);
    return NextResponse.json<ApiError>(
      { error: "Failed to update deploy job" },
      { status: 500 }
    );
  }

  if (bot.endpoint) {
    try {
      await fetch(`${bot.endpoint}/attestation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attestation),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      console.warn(
        `Could not deliver attestation to ${bot.endpoint}/attestation`
      );
    }
  }

  return NextResponse.json({ ok: true, clawbotId: body.clawbotId });
}
