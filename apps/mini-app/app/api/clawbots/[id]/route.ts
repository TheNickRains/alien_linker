import { NextResponse } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import type { Clawbot, ApiError } from "@/lib/types";

/**
 * GET /api/clawbots/[id]
 * Requires Alien JWT. Returns a single clawbot (must be owned by caller).
 */
export async function GET(
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

  const { id } = await params;
  const db = createServerSupabase();
  const { data: row, error } = await db
    .from("clawbots")
    .select("*")
    .eq("clawbot_id", id)
    .eq("alien_id", alienId)
    .single();

  if (error || !row) {
    return NextResponse.json<ApiError>(
      { error: "Clawbot not found" },
      { status: 404 }
    );
  }

  const clawbot: Clawbot = {
    id: row.id,
    clawbotId: row.clawbot_id,
    name: row.name,
    description: row.description,
    endpoint: row.endpoint,
    publicKey: row.public_key,
    alienId: row.alien_id,
    status: row.status,
    attestation: row.attestation,
    gatewayUrl: row.gateway_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return NextResponse.json(clawbot);
}
