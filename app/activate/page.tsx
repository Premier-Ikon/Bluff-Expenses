"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { postApi } from "../lib/api";
import { getFirebaseAuth } from "../lib/firebase";

function ActivateForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("This invite link is missing a token.");
      setLoading(false);
      return;
    }
    postApi<{ email: string; name: string }>({ action: "previewInvite", token })
      .then((payload) => {
        setEmail(payload.email);
        setName(payload.name || "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "This invite link is not valid."))
      .finally(() => setLoading(false));
  }, [token]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await postApi({ action: "activateAccount", token, name, password });
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create that password.");
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
            <h1>Create password</h1>
            {loading ? <p className="lede center">Checking the invite…</p> : null}
            {!loading && email ? (
              <p className="lede center">This account is for {email}.</p>
            ) : null}
          </div>
        </div>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <label>
          Confirm password
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="primary" type="submit" disabled={busy || loading || !email}>
          {busy ? "Saving…" : "Create password"}
        </button>
      </form>
    </main>
  );
}

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <main className="login loading-screen">
          <div className="loading-mark">
            <img className="logo-loading" src="/logo-loading.png" alt="Bluff 2026 US Tour" />
            <p className="muted">Loading…</p>
          </div>
        </main>
      }
    >
      <ActivateForm />
    </Suspense>
  );
}
