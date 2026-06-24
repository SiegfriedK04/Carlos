import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ClerkProvider, useAuth as useClerkAuth, useClerk } from "@clerk/tanstack-react-start";
import type { AuthSessionResponse } from "@damas/shared-types";
import { clerkLocalization, clerkProviderAppearance } from "./theme";
import { api } from "./api";

const SESSION_STORAGE_KEY = "damas-local-session-token";
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim() || "";

interface ClerkSnapshot {
  isLoaded: boolean;
  isSignedIn: boolean;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<unknown>;
}

interface SessionAuthContextValue {
  clerkEnabled: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  authSource: "local" | "clerk" | null;
  getToken: () => Promise<string | null>;
  acceptLocalSession: (session: AuthSessionResponse) => void;
  signOut: () => Promise<void>;
}

const SessionAuthContext = createContext<SessionAuthContextValue | null>(null);

function SessionAuthProvider({
  children,
  clerkEnabled,
}: {
  children: ReactNode;
  clerkEnabled: boolean;
}) {
  const [localToken, setLocalToken] = useState<string | null>(null);
  const [localReady, setLocalReady] = useState(false);
  const [clerkSnapshot, setClerkSnapshot] = useState<ClerkSnapshot>({
    isLoaded: !clerkEnabled,
    isSignedIn: false,
    getToken: async () => null,
    signOut: async () => undefined,
  });

  useEffect(() => {
    setLocalToken(window.localStorage.getItem(SESSION_STORAGE_KEY));
    setLocalReady(true);
  }, []);

  const acceptLocalSession = useCallback((session: AuthSessionResponse) => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, session.sessionToken);
    setLocalToken(session.sessionToken);
  }, []);

  const getToken = useCallback(async () => {
    if (localToken) {
      return localToken;
    }

    if (clerkEnabled) {
      return clerkSnapshot.getToken();
    }

    return null;
  }, [clerkEnabled, clerkSnapshot, localToken]);

  const signOut = useCallback(async () => {
    if (localToken) {
      try {
        await api.logout(localToken);
      } finally {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
        setLocalToken(null);
      }
      return;
    }

    if (clerkEnabled && clerkSnapshot.isSignedIn) {
      await clerkSnapshot.signOut();
    }
  }, [clerkEnabled, clerkSnapshot, localToken]);

  const value = useMemo<SessionAuthContextValue>(() => ({
    clerkEnabled,
    isLoaded: localReady && (!clerkEnabled || clerkSnapshot.isLoaded),
    isSignedIn: Boolean(localToken) || clerkSnapshot.isSignedIn,
    authSource: localToken ? "local" : clerkSnapshot.isSignedIn ? "clerk" : null,
    getToken,
    acceptLocalSession,
    signOut,
  }), [acceptLocalSession, clerkEnabled, clerkSnapshot.isLoaded, clerkSnapshot.isSignedIn, getToken, localReady, localToken, signOut]);

  return (
    <SessionAuthContext.Provider value={value}>
      {clerkEnabled ? <ClerkBridge onChange={setClerkSnapshot} /> : null}
      {children}
    </SessionAuthContext.Provider>
  );
}

function ClerkBridge({ onChange }: { onChange: (snapshot: ClerkSnapshot) => void }) {
  const { getToken, isLoaded, isSignedIn } = useClerkAuth();
  const clerk = useClerk();

  useEffect(() => {
    onChange({
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      getToken,
      signOut: () => clerk.signOut(),
    });
  }, [clerk, getToken, isLoaded, isSignedIn, onChange]);

  return null;
}

export function AppAuthProvider({ children }: { children: ReactNode }) {
  if (!clerkPublishableKey) {
    return (
      <SessionAuthProvider clerkEnabled={false}>
        {children}
      </SessionAuthProvider>
    );
  }

  return (
    <ClerkProvider
      appearance={clerkProviderAppearance}
      localization={clerkLocalization}
      publishableKey={clerkPublishableKey}
    >
      <SessionAuthProvider clerkEnabled>
        {children}
      </SessionAuthProvider>
    </ClerkProvider>
  );
}

export function useSessionAuth() {
  const context = useContext(SessionAuthContext);
  if (!context) {
    throw new Error("useSessionAuth debe usarse dentro de AppAuthProvider.");
  }

  return context;
}
