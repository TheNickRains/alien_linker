"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "./use-auth";
import type { DeployJob } from "@/lib/types";

/**
 * Polls a single deploy job by id. Used on /deploy/[id] to show progress and redirect when running.
 */
export function useDeployJob(id: string | null) {
  const { token } = useAuth();
  const [job, setJob] = useState<DeployJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const data = await apiFetch<DeployJob>(`/api/deploy/${id}`, token);
        if (!cancelled) setJob(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, token]);

  return { job, loading, error };
}
