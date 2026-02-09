import { NextResponse } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import type { Clawbot, ApiError } from "@/lib/types";

/**
 * GET /api/clawbots
 * Requires Alien JWT. Lists all clawbots owned by the authenticated user.
 */
export async function GET(request: Request) {
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

  const db = createServerSupabase();
  const { data, error } = await db
    .from("clawbots")
    .select("*")
    .eq("alien_id", alienId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list clawbots:", error);
    return NextResponse.json<ApiError>(
      { error: "Failed to list clawbots" },
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clawbots: Clawbot[] = (data ?? []).map((row: any) => ({
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
  }));

  return NextResponse.json(clawbots);
}
