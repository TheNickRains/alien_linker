"use client";

import { use } from "react";
import Link from "next/link";
import { GlowText } from "@/components/ui/glow-text";
import { TerminalCard } from "@/components/ui/terminal-card";
import { TerminalInput } from "@/components/ui/terminal-input";
import { TerminalButton } from "@/components/ui/terminal-button";
import { PageTransition } from "@/components/layout/page-transition";
import { useClawbot } from "@/hooks/use-clawbot";
import { useClawbotChat } from "@/hooks/use-clawbot-chat";
import { useState, useRef, useEffect } from "react";

export default function BotChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { clawbot, loading: botLoading, error: botError } = useClawbot(id);
  const { messages, sendMessage, loading: chatLoading } = useClawbotChat(id);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (botLoading || !clawbot) {
    return (
      <PageTransition className="space-y-4">
        <Link href={`/bot/${id}`} className="inline-flex items-center gap-1 text-xs text-terminal-dim hover:text-terminal-text">
          ← Back
        </Link>
        <TerminalCard>
          <div className="animate-pulse space-y-2">
            <div className="h-4 w-2/3 rounded bg-terminal-border" />
            <div className="h-4 w-1/2 rounded bg-terminal-border" />
          </div>
        </TerminalCard>
      </PageTransition>
    );
  }

  if (botError || !clawbot.gatewayUrl) {
    return (
      <PageTransition className="space-y-4">
        <Link href={`/bot/${id}`} className="inline-flex items-center gap-1 text-xs text-terminal-dim hover:text-terminal-text">
          ← Back
        </Link>
        <TerminalCard glow="green">
          <p className="text-sm text-terminal-red glow-red">
            {botError || "This agent does not support chat"}
          </p>
        </TerminalCard>
      </PageTransition>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatLoading) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <PageTransition className="flex flex-col gap-4 min-h-[70vh]">
      <Link href={`/bot/${id}`} className="inline-flex items-center gap-1 text-xs text-terminal-dim hover:text-terminal-text">
        ← Back to {clawbot.name}
      </Link>

      <div className="text-center">
        <GlowText as="h1" color="cyan" className="text-lg font-bold">
          Chat with {clawbot.name}
        </GlowText>
      </div>

      <TerminalCard title="chat" glow="cyan" className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-[40vh]">
          {messages.length === 0 && (
            <p className="text-sm text-terminal-dim">Send a message to start.</p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`text-sm font-mono ${
                m.role === "user"
                  ? "text-terminal-cyan"
                  : "text-terminal-text"
              }`}
            >
              <span className="text-terminal-dim mr-2">
                {m.role === "user" ? ">" : "<"}
              </span>
              {m.content}
            </div>
          ))}
          {chatLoading && (
            <div className="text-sm text-terminal-dim animate-pulse">
              ...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="mt-4 pt-3 border-t border-terminal-border">
          <div className="flex gap-2">
            <TerminalInput
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={chatLoading}
              className="flex-1"
            />
            <TerminalButton type="submit" disabled={chatLoading || !input.trim()}>
              Send
            </TerminalButton>
          </div>
        </form>
      </TerminalCard>
    </PageTransition>
  );
}
