"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { TerminalButton } from "@/components/ui/terminal-button";
import { TerminalCard } from "@/components/ui/terminal-card";
import { GlowText } from "@/components/ui/glow-text";
import { BotCard } from "@/components/bot-card";
import { PageTransition } from "@/components/layout/page-transition";
import { CopyBlock } from "@/components/ui/copy-block";
import { useClawbots } from "@/hooks/use-clawbots";

const AGENT_PROMPT = (linkerUrl: string) =>
  `Set up AlienClaw identity linking on this machine so I can link you to my Alien account.

1. Install the SDK:
   git clone --depth 1 https://github.com/nembal/alien_linker.git /tmp/alienclaw-tmp
   cp -r /tmp/alienclaw-tmp/packages/identity ./alienclaw-identity
   rm -rf /tmp/alienclaw-tmp
   npm install ./alienclaw-identity

2. Add to your startup:
   import { initIdentity } from "@alienclaw/identity"
   await initIdentity({ name: "my-agent", linkerUrl: "${linkerUrl}" })

3. Run it and show me the 6-digit claim code.`;

export default function Dashboard() {
  const { clawbots, loading, error } = useClawbots();
  const [manualOpen, setManualOpen] = useState(false);
  const linkerUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://your-linker.vercel.app";

  const hasAgents = clawbots.length > 0;

  return (
    <PageTransition className="space-y-5">
      {/* Compact Header */}
      <div className="pt-2 text-center">
        <GlowText color="green" as="h1" className="text-lg font-bold tracking-wide">
          ALIENCLAW
        </GlowText>
        <p className="mt-0.5 text-[11px] uppercase tracking-widest text-terminal-dim">
          Agent Identity Linker
        </p>
      </div>

      {/* Agent List */}
      {loading ? (
        <TerminalCard>
          <div className="flex items-center gap-2 text-xs text-terminal-dim">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-terminal-dim border-t-transparent" />
            Loading agents...
          </div>
        </TerminalCard>
      ) : error ? (
        <TerminalCard glow="green">
          <p className="text-xs text-terminal-red glow-red">Error: {error}</p>
        </TerminalCard>
      ) : hasAgents ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <GlowText color="green" className="text-[11px] uppercase tracking-wider">
              My Agents
            </GlowText>
            <span className="text-[11px] text-terminal-dim">
              {clawbots.length} linked
            </span>
          </div>
          {clawbots.map((bot, i) => (
            <motion.div
              key={bot.clawbotId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <BotCard bot={bot} />
            </motion.div>
          ))}
        </div>
      ) : (
        /* Empty state - inline with setup */
        <TerminalCard glow="cyan">
          <p className="text-center text-xs text-terminal-text">
            No agents linked yet.
            <br />
            <span className="text-terminal-dim">
              Use a Claude Code skill or paste a prompt into your agent.
            </span>
          </p>
        </TerminalCard>
      )}

      {/* Setup Section - always visible when no agents */}
      {!hasAgents && !loading && (
        <div className="space-y-3">
          {/* Primary: Claude Code Skill */}
          <TerminalCard title="quick setup" glow="green">
            <div className="space-y-2.5 text-xs">
              <p className="text-terminal-text">
                In <GlowText color="green">Claude Code</GlowText>, run:
              </p>
              <CopyBlock text="/alienclaw:setup" />
              <p className="text-[11px] text-terminal-dim">
                This installs the SDK, generates a keypair, and shows a 6-digit claim code.
              </p>
            </div>
          </TerminalCard>

          {/* Secondary: Manual / DIY - collapsible */}
          <button
            onClick={() => setManualOpen(!manualOpen)}
            className="flex w-full items-center justify-between rounded-lg border border-terminal-border bg-terminal-surface/80 px-4 py-3 text-left transition-colors active:bg-terminal-border/30"
          >
            <span className="text-xs text-terminal-dim uppercase tracking-wider">
              Do it yourself
            </span>
            <motion.span
              animate={{ rotate: manualOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-terminal-dim"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M3 4.5L6 7.5L9 4.5" />
              </svg>
            </motion.span>
          </button>

          <AnimatePresence>
            {manualOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <TerminalCard title="agent prompt" glow="cyan">
                  <div className="space-y-2.5 text-xs">
                    <p className="text-terminal-dim">
                      Copy this prompt and paste it into any AI agent:
                    </p>
                    <CopyBlock text={AGENT_PROMPT(linkerUrl)} />
                  </div>
                </TerminalCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2.5">
        <Link href="/claim" className="block">
          <TerminalButton variant="primary" className="w-full">
            Link an Agent
          </TerminalButton>
        </Link>
        <Link href="/deploy" className="block">
          <TerminalButton variant="secondary" className="w-full">
            Deploy New Agent
          </TerminalButton>
        </Link>
      </div>
    </PageTransition>
  );
}
