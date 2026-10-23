"use client";

import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Profile, postApi } from "./api";
import { firebaseReady, getFirebaseAuth } from "./firebase";

type AuthState = {
  loading: boolean;
  ready: boolean;
  user: User | null;
  profile: Profile | null;
  gateError: string;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  clearGateError: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

function authMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found" ||
    code === "auth/invalid-email"
  ) {
    return "That email or password is not right.";
  }
  if (code === "auth/too-many-requests") return "Too many attempts. Wait a minute and try again.";
  if (code === "auth/unauthorized-domain") return "This address is not allowed to sign in yet.";
  if (error instanceof Error && error.message) return error.message;
  return "Could not sign in.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const ready = firebaseReady();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [gateError, setGateError] = useState("");

  useEffect(() => {
    if (!ready) {
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, async (current) => {
      if (!current) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const token = await current.getIdToken();
        const next = await postApi<Profile>({ action: "me" }, token);
        setUser(current);
        setProfile(next);
        setGateError("");
      } catch (error) {
        await signOut(auth);
        setUser(null);
        setProfile(null);
        setGateError(error instanceof Error ? error.message : "This account is not on the tour list.");
      } finally {
        setLoading(false);
      }
    });
  }, [ready]);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      ready,
      user,
      profile,
      gateError,
      clearGateError() {
        setGateError("");
      },
      async signIn(email, password) {
        setGateError("");
        try {
          await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
        } catch (error) {
          throw new Error(authMessage(error));
        }
      },
      async logOut() {
        await signOut(getFirebaseAuth());
      },
    }),
    [loading, ready, user, profile, gateError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
