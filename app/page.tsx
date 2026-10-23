"use client";

import { ExpenseHome } from "./components/ExpenseHome";
import { LoginScreen } from "./components/LoginScreen";
import { useAuth } from "./lib/AuthProvider";

export default function HomePage() {
  const { loading, user, profile } = useAuth();
  if (loading) {
    return (
      <main className="login loading-screen">
        <div className="loading-mark">
          <img className="logo-loading" src="/logo-loading.png" alt="Bluff 2026 US Tour" />
          <p className="muted">Loading…</p>
        </div>
      </main>
    );
  }
  if (!user || !profile) return <LoginScreen />;
  return <ExpenseHome />;
}
