"use client";

import { type ReactNode } from "react";
import { AlienProvider, useLaunchParams } from "@alien_org/react";
import { AuthProvider } from "@/hooks/use-auth";
import { LockScreen } from "@/components/lock-screen";

interface AppShellProps {
  children: ReactNode;
}

function SafeAreaWrapper({ children }: { children: ReactNode }) {
  const params = useLaunchParams();
  const insets = params?.safeAreaInsets;

  const style = insets
    ? {
        paddingTop: insets.top,
        paddingRight: insets.right,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
      }
    : undefined;

  return <div style={style}>{children}</div>;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <AlienProvider autoReady={false}>
      <AuthProvider>
        <SafeAreaWrapper>
          <div className="scanlines relative min-h-screen bg-terminal-bg">
            <LockScreen />
            <div className="mx-auto max-w-lg px-4 pb-8 pt-4">{children}</div>
          </div>
        </SafeAreaWrapper>
      </AuthProvider>
    </AlienProvider>
  );
}
