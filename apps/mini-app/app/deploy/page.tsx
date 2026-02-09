"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEvent } from "@alien_org/react";
import { send } from "@alien_org/bridge";
import { TerminalButton } from "@/components/ui/terminal-button";
import { TerminalInput } from "@/components/ui/terminal-input";
import { TerminalCard } from "@/components/ui/terminal-card";
import { GlowText } from "@/components/ui/glow-text";
import { PageTransition } from "@/components/layout/page-transition";
import { addFakeAgent } from "@/lib/fake-agents";
import { useAuth } from "@/hooks/use-auth";

type Phase = "config" | "signing" | "deploying";

const DEPLOY_STEPS = [
  { label: "Provisioning container", duration: 4000, logs: [
    "Allocating compute resources...",
    "Region: us-east-1 (auto)",
    "Container image: alienclaw/agent:latest",
    "Memory: 512MB / CPU: 0.5 vCPU",
  ]},
  { label: "Installing dependencies", duration: 5000, logs: [
    "npm install @alienclaw/identity",
    "added 47 packages in 3.2s",
    "Compiling TypeScript...",
    "Build complete.",
  ]},
  { label: "Generating keypair", duration: 3000, logs: [
    "Generating ed25519 keypair...",
    "Keypair saved to ~/.alienclaw/identity.key",
    "Public key: ed25519:aBcDeFgHiJ...",
  ]},
  { label: "Registering with linker", duration: 4000, logs: [
    "POST /api/clawbots/register",
    "Status: 201 Created",
    "Assigned clawbot ID...",
  ]},
  { label: "Starting agent process", duration: 5000, logs: [
    "Agent process started (PID 1)",
    "Identity server listening on :3001",
    "Health check: OK",
  ]},
  { label: "Issuing attestation", duration: 4000, logs: [
    "Challenge-response verified.",
    "Signing attestation...",
    "POST /attestation — 200 OK",
    "Attestation saved.",
  ]},
  { label: "Verifying link", duration: 4000, logs: [
    "Verifying ownership proof...",
    "Agent linked successfully.",
  ]},
];

function generateId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "claw_";
  for (let i = 0; i < 12; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export default function DeployPage() {
  const router = useRouter();
  const { sign } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<Phase>("config");
  const [signProgress, setSignProgress] = useState(0); // 0=idle, 1=requesting, 2=confirmed, 3=done
  const [currentStep, setCurrentStep] = useState(0);
  const [visibleLogs, setVisibleLogs] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [visibleLogs, scrollToBottom]);

  const handleDeploy = () => {
    if (!name.trim()) return;
    setPhase("signing");
    setSignProgress(0);
  };

  const handleSign = async () => {
    setSignProgress(1);

    // Step 1: requesting signature
    await new Promise((r) => setTimeout(r, 1200));
    setSignProgress(2);

    // Step 2: verifying
    await sign();
    setSignProgress(3);

    // Step 3: brief pause then start deploy
    await new Promise((r) => setTimeout(r, 800));
    setPhase("deploying");
    setCurrentStep(0);
    setVisibleLogs([]);
    setDone(false);
  };

  const deploying = phase === "deploying";

  // Show native back button when not on config, handle back navigation
  useEffect(() => {
    if (phase !== "config") {
      send("host.back.button:toggle", { visible: true });
    } else {
      send("host.back.button:toggle", { visible: false });
    }
  }, [phase]);

  useEvent("host.back.button:clicked", () => {
    if (phase === "signing" && signProgress === 0) {
      setPhase("config");
    } else if (done) {
      router.push("/");
    }
  });

  // Step through the fake deployment
  useEffect(() => {
    if (!deploying || done) return;
    if (currentStep >= DEPLOY_STEPS.length) {
      // All done — create fake agent and mark done
      const clawbotId = generateId();
      addFakeAgent({
        id: clawbotId,
        clawbotId,
        name: name.trim(),
        description: description.trim() || null,
        endpoint: null,
        publicKey: "ed25519:" + btoa(Math.random().toString()).slice(0, 32),
        alienId: "demo-user",
        status: "claimed",
        attestation: {
          type: "alienclaw-ownership-v1",
          alienId: "demo-user",
          clawbotId,
          publicKey: "ed25519:demo",
          issuedBy: "alienclaw-linker",
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
          signature: "demo-sig",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setDone(true);
      return;
    }

    const step = DEPLOY_STEPS[currentStep];
    let logIdx = 0;

    // Drip-feed log lines
    const logInterval = setInterval(() => {
      if (logIdx < step.logs.length) {
        setVisibleLogs((prev) => [...prev, step.logs[logIdx]]);
        logIdx++;
      }
    }, step.duration / (step.logs.length + 1));

    // Move to next step
    const stepTimer = setTimeout(() => {
      clearInterval(logInterval);
      // Flush any remaining logs
      setVisibleLogs((prev) => {
        const existing = new Set(prev);
        const remaining = step.logs.filter((l) => !existing.has(l));
        return [...prev, ...remaining];
      });
      setCurrentStep((s) => s + 1);
    }, step.duration);

    return () => {
      clearInterval(logInterval);
      clearTimeout(stepTimer);
    };
  }, [deploying, currentStep, done, name, description]);

  const handleGoHome = () => {
    router.push("/");
  };

  return (
    <PageTransition className="space-y-5">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-terminal-dim hover:text-terminal-text"
      >
        &larr; Back
      </Link>

      {phase === "config" ? (
        /* Config form */
        <>
          <div className="space-y-1">
            <GlowText as="h1" color="cyan" className="text-lg font-bold">
              Deploy New Agent
            </GlowText>
            <p className="text-xs text-terminal-dim">
              Launch an agent, auto-linked to your identity.
            </p>
          </div>

          <TerminalCard title="deploy.config" glow="cyan">
            <div className="space-y-4">
              <TerminalInput
                label="Name"
                placeholder="my-research-bot"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <TerminalInput
                label="Description (optional)"
                placeholder="Helps with papers"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-wider text-terminal-dim">
                  Template
                </label>
                <div className="rounded-md border border-terminal-border bg-terminal-bg px-3 py-2.5">
                  <span className="text-sm text-terminal-text">Default Agent</span>
                </div>
              </div>
            </div>
          </TerminalCard>

          <TerminalButton
            variant="secondary"
            className="w-full"
            onClick={handleDeploy}
            disabled={!name.trim()}
          >
            Deploy
          </TerminalButton>

          <p className="text-center text-[11px] text-terminal-dim">
            Auto-claimed to your Alien identity.
          </p>
        </>
      ) : phase === "signing" ? (
        /* Signing step */
        <>
          <div className="space-y-1">
            <GlowText as="h1" color="amber" className="text-lg font-bold">
              Sign Deployment
            </GlowText>
            <p className="text-xs text-terminal-dim">
              Authorize deployment of <span className="text-terminal-text">{name.trim()}</span> with your Alien ID.
            </p>
          </div>

          <TerminalCard title="deploy.auth" glow="amber">
            <div className="space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-terminal-dim">Agent</span>
                  <span className="text-terminal-text">{name.trim()}</span>
                </div>
                {description.trim() && (
                  <div className="flex justify-between">
                    <span className="text-terminal-dim">Description</span>
                    <span className="text-terminal-text">{description.trim()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-terminal-dim">Template</span>
                  <span className="text-terminal-text">Default Agent</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-dim">Owner</span>
                  <GlowText color="green" className="text-xs">Your Alien ID</GlowText>
                </div>
              </div>

              <div className="h-px bg-terminal-border" />

              {signProgress === 0 && (
                <p className="text-center text-[11px] text-terminal-amber">
                  This deployment will be cryptographically signed with your identity.
                </p>
              )}

              <AnimatePresence mode="wait">
                {signProgress >= 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-2"
                  >
                    {/* Step: Requesting */}
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                        {signProgress > 1 ? (
                          <span className="text-terminal-green glow-green">&#10003;</span>
                        ) : (
                          <motion.span
                            className="inline-block h-2.5 w-2.5 rounded-full border-[1.5px] border-terminal-amber border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                          />
                        )}
                      </div>
                      <span className={signProgress > 1 ? "text-terminal-green" : "text-terminal-amber"}>
                        Requesting signature{signProgress === 1 && "..."}
                      </span>
                    </div>

                    {/* Step: Verifying */}
                    {signProgress >= 2 && (
                      <motion.div
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 text-xs"
                      >
                        <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                          {signProgress > 2 ? (
                            <span className="text-terminal-green glow-green">&#10003;</span>
                          ) : (
                            <motion.span
                              className="inline-block h-2.5 w-2.5 rounded-full border-[1.5px] border-terminal-amber border-t-transparent"
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                            />
                          )}
                        </div>
                        <span className={signProgress > 2 ? "text-terminal-green" : "text-terminal-amber"}>
                          Verifying identity{signProgress === 2 && "..."}
                        </span>
                      </motion.div>
                    )}

                    {/* Step: Confirmed */}
                    {signProgress >= 3 && (
                      <motion.div
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 text-xs"
                      >
                        <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                          <span className="text-terminal-green glow-green">&#10003;</span>
                        </div>
                        <span className="text-terminal-green">
                          Deployment authorized
                        </span>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </TerminalCard>

          {signProgress === 0 && (
            <TerminalButton
              variant="primary"
              className="w-full"
              onClick={handleSign}
            >
              Sign &amp; Deploy
            </TerminalButton>
          )}
        </>
      ) : (
        /* Deployment animation */
        <>
          <div className="space-y-1">
            <GlowText as="h1" color="cyan" className="text-lg font-bold">
              {done ? "Agent Deployed" : "Deploying..."}
            </GlowText>
            <p className="text-xs text-terminal-dim">
              {done
                ? `${name.trim()} is live and linked.`
                : `Setting up ${name.trim()}`}
            </p>
          </div>

          {/* Step progress */}
          <TerminalCard title="deploy.log" glow={done ? "green" : "cyan"}>
            <div className="space-y-3">
              {DEPLOY_STEPS.map((step, i) => {
                const isDone = i < currentStep || done;
                const isActive = i === currentStep && !done;
                const isPending = i > currentStep && !done;

                return (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-2.5"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {isDone ? (
                        <span className="text-terminal-green glow-green text-xs">
                          &#10003;
                        </span>
                      ) : isActive ? (
                        <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-terminal-cyan border-t-transparent" />
                      ) : (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-terminal-dim" />
                      )}
                    </div>
                    <span
                      className={`text-xs ${
                        isDone
                          ? "text-terminal-green"
                          : isActive
                            ? "text-terminal-cyan glow-cyan"
                            : isPending
                              ? "text-terminal-dim"
                              : ""
                      }`}
                    >
                      {step.label}
                      {isActive && "..."}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </TerminalCard>

          {/* Live log output */}
          <TerminalCard glow={done ? "green" : "cyan"}>
            <div className="max-h-40 overflow-y-auto font-mono text-[11px] leading-relaxed">
              <AnimatePresence>
                {visibleLogs.map((line, i) => (
                  <motion.div
                    key={`${i}-${line}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-terminal-dim"
                  >
                    <span className="text-terminal-green/60 mr-1.5 select-none">$</span>
                    {line}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={logsEndRef} />
              {!done && (
                <span className="inline-block mt-1 text-terminal-cyan cursor-blink">
                  _
                </span>
              )}
            </div>
          </TerminalCard>

          {/* Done state */}
          {done && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <TerminalCard glow="green">
                <div className="text-center space-y-1">
                  <p className="text-sm text-terminal-green glow-green font-semibold">
                    Agent linked successfully
                  </p>
                  <p className="text-[11px] text-terminal-dim">
                    {name.trim()} is now verified and linked to your identity.
                  </p>
                </div>
              </TerminalCard>

              <TerminalButton
                variant="primary"
                className="w-full"
                onClick={handleGoHome}
              >
                View My Agents
              </TerminalButton>
            </motion.div>
          )}
        </>
      )}
    </PageTransition>
  );
}
