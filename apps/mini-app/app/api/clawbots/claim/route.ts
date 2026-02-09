import { NextResponse } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import { createAttestation } from "@/lib/attestation";
import type { ClaimRequest, ClaimResponse, ApiError, Clawbot } from "@/lib/types";

/**
 * POST /api/clawbots/claim
 * Requires Alien JWT. Claims a clawbot by matching the 6-digit code.
 */
export async function POST(request: Request) {
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

  let body: ClaimRequest;
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

  const db = createServerSupabase();

  // Find matching clawbot by claim code
  const { data: bot, error: findError } = await db
    .from("clawbots")
    .select("*")
    .eq("claim_code", body.claimCode)
    .is("alien_id", null)
    .single();

  if (findError || !bot) {
    return NextResponse.json<ApiError>(
      { error: "Invalid or expired claim code" },
      { status: 404 }
    );
  }

  // Check expiration
  if (
    bot.claim_code_expires_at &&
    new Date(bot.claim_code_expires_at) < new Date()
  ) {
    return NextResponse.json<ApiError>(
      { error: "Claim code has expired" },
      { status: 410 }
    );
  }

  // Create signed attestation
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://alienclaw-linker.vercel.app";

  const attestation = await createAttestation({
    alienId,
    clawbotId: bot.clawbot_id,
    publicKey: bot.public_key,
    issuedBy: appUrl,
  });

  // Update the clawbot record
  const { error: updateError } = await db
    .from("clawbots")
    .update({
      alien_id: alienId,
      attestation: attestation as unknown as Record<string, unknown>,
      claim_code: null,
      claim_code_expires_at: null,
      status: "claimed",
    })
    .eq("id", bot.id);

  if (updateError) {
    console.error("Failed to claim clawbot:", updateError);
    return NextResponse.json<ApiError>(
      { error: "Failed to claim clawbot" },
      { status: 500 }
    );
  }

  // Deliver attestation to the clawbot's endpoint (best-effort)
  if (bot.endpoint) {
    try {
      await fetch(`${bot.endpoint}/attestation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attestation),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Non-fatal — clawbot can fetch it later
      console.warn(
        `Could not deliver attestation to ${bot.endpoint}/attestation`
      );
    }
  }

  const clawbot: Clawbot = {
    id: bot.id,
    clawbotId: bot.clawbot_id,
    name: bot.name,
    description: bot.description,
    endpoint: bot.endpoint,
    publicKey: bot.public_key,
    alienId,
    status: "claimed",
    attestation,
    gatewayUrl: bot.gateway_url ?? undefined,
    createdAt: bot.created_at,
    updatedAt: bot.updated_at,
  };

  return NextResponse.json<ClaimResponse>({ clawbot, attestation });
}
