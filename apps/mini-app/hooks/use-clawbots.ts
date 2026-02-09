"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "./use-auth";
import { getFakeAgents } from "@/lib/fake-agents";
import type { Clawbot } from "@/lib/types";

export function useClawbots() {
  const { token } = useAuth();
  const [clawbots, setClawbots] = useState<Clawbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    let remote: Clawbot[] = [];
    if (token) {
      try {
        remote = await apiFetch<Clawbot[]>("/api/clawbots", token);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load clawbots");
      }
    }

    // Merge in locally-deployed fake agents
    const fake = getFakeAgents();
    const remoteIds = new Set(remote.map((b) => b.clawbotId));
    const merged = [...remote, ...fake.filter((f) => !remoteIds.has(f.clawbotId))];

    setClawbots(merged);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { clawbots, loading, error, refetch };
}
