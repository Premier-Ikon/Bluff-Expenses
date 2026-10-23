"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useAuth } from "../lib/AuthProvider";

export function LoginScreen() {
  const { ready, signIn, gateError, clearGateError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    clearGateError();
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-hero">
          <img className="brand-mark" src="/logo.png" alt="Bluff 2026 US Tour" />
          <div className="login-copy">
            <p className="eyebrow">Tour expenses</p>
            <h1>Sign in</h1>
            {ready ? (
              <p className="lede center">Use the email and password from your Bluff tour invite.</p>
            ) : (
              <p className="error">Firebase is not configured for this app yet.</p>
            )}
          </div>
        </div>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error || gateError ? <p className="error">{error || gateError}</p> : null}
        <button className="primary" type="submit" disabled={busy || !ready}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <Link className="ghost forgot-button" href="/forgot">
          Forgot password?
        </Link>
      </form>
    </main>
  );
}
