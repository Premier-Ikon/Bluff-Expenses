"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { postApi } from "../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = await postApi<{ message?: string }>({
        action: "requestPasswordReset",
        email,
      });
      setMessage(payload.message || "If that email is on the tour list, a password reset link is on the way.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a reset email.");
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
            <p className="eyebrow">2026 US Tour</p>
            <h1>Forgot password</h1>
            <p className="lede center">Enter the email from your Bluff tour invite and we’ll send a reset link.</p>
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
            disabled={Boolean(message)}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="ok">{message}</p> : null}
        {!message ? (
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        ) : null}
        <p className="auth-foot">
          <Link href="/">Back to sign in</Link>
        </p>
      </form>
    </main>
  );
}
