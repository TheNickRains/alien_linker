"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "./use-auth";
import type { ChatResponse } from "@/lib/types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function useClawbotChat(clawbotId: string | null) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!clawbotId || !token?.trim()) {
        setError("Not authenticated or no bot");
        return;
      }
      const trimmed = text.trim();
      if (!trimmed) return;

      setError(null);
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setLoading(true);

      try {
        const data = await apiFetch<ChatResponse>(
          `/api/clawbots/${clawbotId}/chat`,
          token,
          {
            method: "POST",
            body: JSON.stringify({ message: trimmed }),
          }
        );
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply || "" },
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Send failed");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${e instanceof Error ? e.message : "Send failed"}`,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [clawbotId, token]
  );

  return { messages, sendMessage, loading, error };
}
