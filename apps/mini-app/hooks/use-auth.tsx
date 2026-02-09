"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useAlien } from "@alien_org/react";
import { getAuthToken } from "@/lib/dev-auth";

interface AuthContextValue {
  token: string | null;
  isBridgeAvailable: boolean;
  /** Whether the user has signed to unlock the UI */
  signed: boolean;
  /** Trigger the signing flow. Returns true if signed successfully. */
  sign: () => Promise<boolean>;
  /** Whether a signing operation is in progress */
  signing: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  isBridgeAvailable: false,
  signed: false,
  sign: async () => false,
  signing: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { authToken, isBridgeAvailable, ready } = useAlien();
  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);

  const token = useMemo(() => {
    try {
      return getAuthToken(authToken);
    } catch {
      return null;
    }
  }, [authToken]);

  const sign = useCallback(async (): Promise<boolean> => {
    if (signed) return true;
    setSigning(true);

    // Simulate signature verification delay
    await new Promise((r) => setTimeout(r, 1800));

    setSigned(true);
    setSigning(false);

    // Signal the host app that we're ready to be displayed
    ready();

    return true;
  }, [signed, ready]);

  // Auto-sign when running inside the Alien app with a real token
  useEffect(() => {
    if (isBridgeAvailable && authToken && !signed && !signing) {
      sign();
    }
  }, [isBridgeAvailable, authToken, signed, signing, sign]);

  const value = useMemo<AuthContextValue>(
    () => ({ token, isBridgeAvailable, signed, sign, signing }),
    [token, isBridgeAvailable, signed, sign, signing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
