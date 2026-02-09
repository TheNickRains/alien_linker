"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLaunchParams } from "@alien_org/react";
import { TerminalButton } from "@/components/ui/terminal-button";
import { TerminalCard } from "@/components/ui/terminal-card";
import { GlowText } from "@/components/ui/glow-text";
import { CopyBlock } from "@/components/ui/copy-block";
import { ClaimCodeInput } from "@/components/claim-code-input";
import { PageTransition } from "@/components/layout/page-transition";
import { useClaimBot } from "@/hooks/use-claim-bot";
import Link from "next/link";

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

function ClaimContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const launchParams = useLaunchParams();
  const { state, error, claim, reset } = useClaimBot();
  const [code, setCode] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const linkerUrl = typeof window !== "undefined" ? window.location.origin : "https://your-linker.vercel.app";

  const prefill =
    launchParams?.startParam || searchParams.get("code") || "";

  useEffect(() => {
    if (prefill && /^\d{6}$/.test(prefill)) {
      setCode(prefill);
    }
  }, [prefill]);

  useEffect(() => {
    if (state === "success") {
      router.push("/claim/success");
    }
  }, [state, router]);

  const handleComplete = useCallback((value: string) => {
    setCode(value);
  }, []);

  const handleClaim = useCallback(() => {
    if (code.length === 6) {
      claim(code);
    }
  }, [code, claim]);

  return (
    <PageTransition className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-terminal-dim hover:text-terminal-text"
      >
        ← Back
      </Link>

      <div className="text-center space-y-2">
        <GlowText as="h1" color="green" className="text-lg font-bold">
          Link Your Agent
        </GlowText>
        <p className="text-sm text-terminal-text">
          Enter the 6-digit code from your agent&apos;s terminal
        </p>
      </div>

      <TerminalCard glow="green">
        <div className="py-4">
          <ClaimCodeInput
            onComplete={handleComplete}
            disabled={state === "submitting"}
          />
        </div>
      </TerminalCard>

      {error && (
        <TerminalCard glow="green">
          <p className="text-sm text-terminal-red glow-red">{error}</p>
          <button
            onClick={reset}
            className="mt-2 text-xs text-terminal-dim hover:text-terminal-text"
          >
            Try again
          </button>
        </TerminalCard>
      )}

      <TerminalButton
        variant="primary"
        className="w-full"
        onClick={handleClaim}
        loading={state === "submitting"}
        disabled={code.length !== 6}
      >
        Link Agent
      </TerminalButton>

      {/* How to get a code */}
      <div className="space-y-2">
        <button
          onClick={() => setShowSetup(!showSetup)}
          className="w-full text-left text-xs text-terminal-cyan"
        >
          {showSetup ? "▾" : "▸"} How do I get a claim code?
        </button>

        {showSetup && (
          <TerminalCard glow="cyan">
            <div className="space-y-5 text-xs">
              {/* Option 1: Claude Skill */}
              <div className="space-y-1.5">
                <p className="text-terminal-dim uppercase tracking-wider">
                  Option 1 — Claude Code plugin
                </p>
                <p className="text-terminal-text">
                  Install once, then run on any agent:
                </p>
                <CopyBlock text={`/plugin marketplace add nembal/alien_linker\n/plugin install alienclaw@nembal-alien-linker`} />
                <p className="text-terminal-text mt-1.5">
                  Then run:
                </p>
                <CopyBlock text={`/alienclaw:setup ${linkerUrl}`} />
              </div>

              {/* Option 2: Prompt */}
              <div className="space-y-1.5">
                <p className="text-terminal-dim uppercase tracking-wider">
                  Option 2 — Paste to any AI agent
                </p>
                <p className="text-terminal-text">
                  Copy this prompt and give it to your agent:
                </p>
                <CopyBlock text={AGENT_PROMPT(linkerUrl)} />
              </div>

              {/* Option 3: Manual */}
              <div className="space-y-1.5">
                <p className="text-terminal-dim uppercase tracking-wider">
                  Option 3 — Manual install
                </p>
                <CopyBlock text={`git clone --depth 1 https://github.com/nembal/alien_linker.git /tmp/alienclaw-tmp && cp -r /tmp/alienclaw-tmp/packages/identity ./alienclaw-identity && rm -rf /tmp/alienclaw-tmp && npm install ./alienclaw-identity`} />
                <CopyBlock
                  text={`import { initIdentity } from "@alienclaw/identity"

await initIdentity({
  name: "my-agent",
  linkerUrl: "${linkerUrl}",
})`}
                />
              </div>

              <p className="text-terminal-dim">
                The 6-digit code appears in the agent&apos;s terminal.
                Enter it above to link the agent to your Alien identity.
              </p>
            </div>
          </TerminalCard>
        )}
      </div>

      <div className="text-center">
        <p className="text-xs text-terminal-dim">
          Don&apos;t have an agent yet?{" "}
          <Link
            href="/deploy"
            className="text-terminal-cyan hover:underline"
          >
            Deploy one now →
          </Link>
        </p>
      </div>
    </PageTransition>
  );
}

export default function ClaimPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="animate-pulse text-terminal-dim">Loading...</div>
        </div>
      }
    >
      <ClaimContent />
    </Suspense>
  );
}
