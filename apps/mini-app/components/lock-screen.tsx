"use client";

import { motion, AnimatePresence } from "framer-motion";
import { GlowText } from "@/components/ui/glow-text";
import { useAuth } from "@/hooks/use-auth";

export function LockScreen() {
  const { signed, sign, signing } = useAuth();

  return (
    <AnimatePresence>
      {!signed && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-terminal-bg/95 backdrop-blur-xl"
        >
          <div className="flex flex-col items-center gap-6 px-8 text-center">
            <GlowText color="green" as="h1" className="text-2xl font-bold tracking-wider">
              ALIENCLAW
            </GlowText>

            <p className="text-xs uppercase tracking-widest text-terminal-dim">
              Agent Identity Linker
            </p>

            <div className="my-2 h-px w-32 bg-terminal-border" />

            <p className="max-w-[240px] text-xs leading-relaxed text-terminal-text">
              Sign with your Alien ID to unlock.
            </p>

            <button
              onClick={sign}
              disabled={signing}
              className="relative mt-2 w-48 rounded-md border border-terminal-green/30 bg-terminal-green/10 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-terminal-green transition-all active:bg-terminal-green/30 disabled:opacity-60"
            >
              {signing ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    className="inline-block h-3 w-3 rounded-full border-2 border-terminal-green border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                  />
                  Verifying...
                </span>
              ) : (
                "Sign In"
              )}
            </button>

            {signing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-1 text-[11px] text-terminal-dim"
              >
                <p>Requesting signature...</p>
                <p className="text-terminal-cyan glow-cyan">
                  Confirm in your Alien app
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
