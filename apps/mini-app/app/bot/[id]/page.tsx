"use client";

import { use } from "react";
import Link from "next/link";
import { GlowText } from "@/components/ui/glow-text";
import { TerminalCard } from "@/components/ui/terminal-card";
import { TerminalButton } from "@/components/ui/terminal-button";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { AttestationViewer } from "@/components/attestation-viewer";
import { PageTransition } from "@/components/layout/page-transition";
import { useClawbot } from "@/hooks/use-clawbot";

export default function BotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { clawbot, loading, error } = useClawbot(id);

  if (loading) {
    return (
      <PageTransition className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-terminal-dim hover:text-terminal-text"
        >
          ← Back
        </Link>
        <TerminalCard>
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-1/3 rounded bg-terminal-border" />
            <div className="h-4 w-2/3 rounded bg-terminal-border" />
            <div className="h-4 w-1/2 rounded bg-terminal-border" />
          </div>
        </TerminalCard>
      </PageTransition>
    );
  }

  if (error || !clawbot) {
    return (
      <PageTransition className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-terminal-dim hover:text-terminal-text"
        >
          ← Back
        </Link>
        <TerminalCard glow="green">
          <p className="text-sm text-terminal-red glow-red">
            {error || "Clawbot not found"}
          </p>
        </TerminalCard>
      </PageTransition>
    );
  }

  const statusMap = {
    claimed: "online" as const,
    registered: "pending" as const,
    offline: "offline" as const,
  };

  return (
    <PageTransition className="space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-terminal-dim hover:text-terminal-text"
      >
        ← Back
      </Link>

      {/* Identity Card */}
      <TerminalCard title="identity" glow="green">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <GlowText color="green" className="text-base font-bold">
              {clawbot.name}
            </GlowText>
            <StatusIndicator status={statusMap[clawbot.status]} />
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-terminal-dim">ID</span>
              <span className="text-terminal-text">{clawbot.clawbotId}</span>
            </div>
            {clawbot.endpoint && (
              <div className="flex justify-between">
                <span className="text-terminal-dim">Endpoint</span>
                <span className="text-terminal-cyan">{clawbot.endpoint}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-terminal-dim">Public Key</span>
              <span className="truncate ml-4 max-w-[180px] text-terminal-text">
                {clawbot.publicKey}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-dim">Status</span>
              <span className="text-terminal-text capitalize">
                {clawbot.status}
              </span>
            </div>
          </div>
        </div>
      </TerminalCard>

      {/* Attestation */}
      {clawbot.attestation && (
        <AttestationViewer attestation={clawbot.attestation} />
      )}

      {/* Verification Instructions */}
      <TerminalCard title="verification" glow="cyan">
        <div className="space-y-2 text-xs text-terminal-dim">
          <p className="text-terminal-text">
            Third parties can verify this clawbot&apos;s ownership:
          </p>
          <ol className="list-inside list-decimal space-y-1">
            <li>
              <code className="text-terminal-cyan">
                GET {clawbot.endpoint || "<endpoint>"}/identity
              </code>
            </li>
            <li>Check attestation signature against backend public key</li>
            <li>
              <code className="text-terminal-cyan">
                POST {clawbot.endpoint || "<endpoint>"}/challenge
              </code>{" "}
              with a nonce
            </li>
            <li>Verify signature against the clawbot&apos;s public key</li>
          </ol>
        </div>
      </TerminalCard>

      {/* Chat (when gateway URL is set, e.g. deployed clawbots) */}
      {clawbot.gatewayUrl && (
        <Link href={`/bot/${id}/chat`} className="block">
          <TerminalButton className="w-full">
            Chat with agent →
          </TerminalButton>
        </Link>
      )}

      {/* ERC-8004 */}
      <Link href={`/bot/${id}/register`} className="block">
        <TerminalButton variant="ghost" className="w-full">
          Register On-Chain →
        </TerminalButton>
      </Link>
    </PageTransition>
  );
}
