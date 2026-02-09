"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlowText } from "@/components/ui/glow-text";
import { TerminalCard } from "@/components/ui/terminal-card";
import { TerminalButton } from "@/components/ui/terminal-button";
import { DeployStepper } from "@/components/deploy-stepper";
import { PageTransition } from "@/components/layout/page-transition";
import { useDeployJob } from "@/hooks/use-deploy-job";

function stepFromStatus(status: string): number {
  switch (status) {
    case "pending":
      return 0;
    case "deploying":
      return 1;
    case "running":
      return 4;
    case "failed":
      return -1;
    default:
      return 0;
  }
}

export default function DeployProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { job, loading, error } = useDeployJob(id);
  const currentStep = job ? stepFromStatus(job.status) : 0;

  useEffect(() => {
    if (job?.status === "running" && job.clawbotId) {
      router.replace(`/bot/${job.clawbotId}`);
    }
  }, [job?.status, job?.clawbotId, router]);

  if (loading && !job) {
    return (
      <PageTransition className="space-y-6">
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-terminal-dim hover:text-terminal-text">
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

  if (error || (job?.status === "failed")) {
    return (
      <PageTransition className="space-y-6">
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-terminal-dim hover:text-terminal-text">
          ← Back
        </Link>
        <TerminalCard glow="green">
          <p className="text-sm text-terminal-red glow-red">
            {error || (job?.providerMetadata as { error?: string })?.error || "Deploy failed"}
          </p>
        </TerminalCard>
        <Link href="/deploy">
          <TerminalButton variant="ghost" className="w-full">Try again</TerminalButton>
        </Link>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-xs text-terminal-dim hover:text-terminal-text">
        ← Back
      </Link>

      <div className="text-center space-y-2">
        <GlowText as="h1" color="cyan" className="text-lg font-bold">
          {job?.status === "running" ? "Deployed" : "Deploying..."}
        </GlowText>
        <p className="text-xs text-terminal-dim">Job ID: {id}</p>
      </div>

      <TerminalCard title="deploy.log" glow="cyan">
        <DeployStepper currentStep={currentStep} />
      </TerminalCard>

      {job?.status !== "running" && (
        <p className="text-center text-xs text-terminal-dim animate-pulse">
          {job?.provider === "manual"
            ? "Start your clawbot container and use the claim code to link it."
            : "This can take a minute."}
        </p>
      )}

      <Link href="/" className="block">
        <TerminalButton variant="ghost" className="w-full">
          Back to Dashboard
        </TerminalButton>
      </Link>
    </PageTransition>
  );
}
