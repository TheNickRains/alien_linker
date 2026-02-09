import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { authenticateRequest, AuthError } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import {
  triggerRailwayDeploy,
  isRailwayConfigured,
} from "@/lib/deploy/railway";
import type { DeployRequest, DeployResponse, ApiError } from "@/lib/types";

/**
 * POST /api/deploy
 * Creates a deploy job and, when Railway is configured, triggers a deployment.
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

  let body: DeployRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiError>(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.name) {
    return NextResponse.json<ApiError>(
      { error: "name is required" },
      { status: 400 }
    );
  }

  const provider = isRailwayConfigured() ? "railway" : "manual";
  const db = createServerSupabase();
  const { data, error } = await db
    .from("deploy_jobs")
    .insert({
      alien_id: alienId,
      config: {
        name: body.name,
        description: body.description ?? null,
        template: body.template ?? "default",
      },
      provider,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to create deploy job:", error);
    return NextResponse.json<ApiError>(
      { error: "Failed to create deploy job" },
      { status: 500 }
    );
  }

  let status: "pending" | "deploying" = "pending";
  if (isRailwayConfigured()) {
    const deploySecret = process.env.DEPLOY_SECRET;
    if (!deploySecret?.trim()) {
      console.error("DEPLOY_SECRET is required when Railway is configured");
      return NextResponse.json<ApiError>(
        { error: "Deploy not configured" },
        { status: 503 }
      );
    }
    const gatewayToken = randomBytes(24).toString("hex");
    const linkerUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://alienclaw-linker.vercel.app";
    try {
      await triggerRailwayDeploy({
        jobId: data.id,
        name: body.name.trim(),
        linkerUrl,
        deploySecret,
        gatewayToken,
        appUrl: linkerUrl,
      });
      status = "deploying";
      await db
        .from("deploy_jobs")
        .update({ status: "deploying" })
        .eq("id", data.id);
    } catch (e) {
      console.error("Railway deploy trigger failed:", e);
      await db
        .from("deploy_jobs")
        .update({ status: "failed", provider_metadata: { error: String(e) } })
        .eq("id", data.id);
      return NextResponse.json<ApiError>(
        { error: "Deploy trigger failed" },
        { status: 502 }
      );
    }
  }

  return NextResponse.json<DeployResponse>({
    id: data.id,
    status,
    provider,
  });
}
