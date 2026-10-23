"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Expense, ReceiptDraft, postApi } from "../lib/api";
import { useAuth } from "../lib/AuthProvider";
import { categoryLabel, formatDay, formatMoney, statusLabel } from "../lib/format";
import { fileToJpeg } from "../lib/image";
import { ReceiptSheet } from "./ReceiptSheet";

const emptyDraft: ReceiptDraft = {
  merchant: "",
  purchasedAt: "",
  currency: "USD",
  category: "other",
  items: [],
  subtotal: 0,
  tax: 0,
  tip: 0,
  total: 0,
  notes: "",
};

export function ExpenseHome() {
  const { user, profile, logOut } = useAuth();
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sheetError, setSheetError] = useState("");
  const [warning, setWarning] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [image, setImage] = useState<{ base64: string; contentType: string } | null>(null);
  const [draft, setDraft] = useState<ReceiptDraft | null>(null);

  async function load() {
    if (!user) return;
    const token = await user.getIdToken();
    const payload = await postApi<{ expenses: Expense[] }>({ action: "listMyExpenses" }, token);
    setExpenses(payload.expenses || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load expenses."));
  }, [user]);

  const pending = useMemo(
    () => expenses.filter((item) => item.status === "submitted").reduce((sum, item) => sum + item.total, 0),
    [expenses]
  );
  const reimbursed = useMemo(
    () => expenses.filter((item) => item.status === "reimbursed").reduce((sum, item) => sum + item.total, 0),
    [expenses]
  );

  async function onFile(file?: File) {
    if (!file || !user) return;
    setError("");
    setBanner("");
    setSheetError("");
    setReading(true);
    let photo: { base64: string; contentType: string; previewUrl: string };
    try {
      photo = await fileToJpeg(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that photo.");
      setReading(false);
      return;
    }
    setPreviewUrl(photo.previewUrl);
    setImage({ base64: photo.base64, contentType: photo.contentType });
    try {
      const token = await user.getIdToken();
      const payload = await postApi<{ receipt: ReceiptDraft; warning?: string }>(
        { action: "parseReceipt", imageBase64: photo.base64, contentType: photo.contentType },
        token
      );
      setDraft(payload.receipt || emptyDraft);
      setWarning(payload.warning || payload.receipt?.warning || "");
    } catch (err) {
      setDraft(emptyDraft);
      setWarning(err instanceof Error ? err.message : "Enter the receipt yourself.");
    } finally {
      setReading(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (libraryRef.current) libraryRef.current.value = "";
    }
  }

  function closeSheet() {
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setDraft(null);
    setPreviewUrl("");
    setImage(null);
    setSheetError("");
  }

  async function onConfirm(payload: {
    merchant: string;
    purchasedAt: string;
    category: string;
    currency: string;
    items: { name: string; qty: number; amount: number }[];
    tax: number;
    tip: number;
    total: number;
    notes: string;
  }) {
    if (!user || !image) return;
    setSaving(true);
    setSheetError("");
    try {
      const token = await user.getIdToken();
      const result = await postApi<{ emailSent: boolean }>(
        { action: "confirmExpense", ...payload, imageBase64: image.base64, contentType: image.contentType },
        token
      );
      closeSheet();
      setBanner(
        result.emailSent
          ? "Receipt saved. A confirmation is on the way, and dylan@premierikon.com is copied."
          : "Receipt saved. The confirmation email did not send, but the expense is on your list."
      );
      await load();
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : "Could not save that receipt.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="screen">
      <header className="brand-bar">
        <img className="brand-mark" src="/logo.png" alt="Bluff 2026 US Tour" />
        <div className="brand-actions">
          <button className="soft" type="button" onClick={() => void logOut()}>
            Sign out
          </button>
        </div>
      </header>

      <section className="hero-balance">
        <div className="who">
          <p className="eyebrow">Tour expenses</p>
          <p className="muted">{profile?.name || profile?.email}</p>
        </div>
        <div className="balance-block">
          <p className="balance-label">Waiting on reimbursement</p>
          <p className="total">{formatMoney(pending)}</p>
          <div className="total-accent" aria-hidden />
        </div>
        <div className="balance-meta">
          <span>
            Reimbursed <strong>{formatMoney(reimbursed)}</strong>
          </span>
          <span>
            Receipts <strong>{expenses.length}</strong>
          </span>
        </div>
      </section>

      {banner ? <p className="notice ok">{banner}</p> : null}
      {error ? <p className="notice bad">{error}</p> : null}
      {reading ? <p className="reading">Reading the receipt…</p> : null}

      <div className="section-head">
        <h2>Your receipts</h2>
        {expenses.length ? <span className="muted">{expenses.length}</span> : null}
      </div>

      {!expenses.length && !reading ? (
        <div className="empty">
          <strong>No receipts yet</strong>
          Snap a tour receipt, check the line items, and send it in for reimbursement.
        </div>
      ) : null}

      <section className="expense-list">
        {expenses.map((expense) => (
          <Link className="expense-row" href={`/expense/${expense.id}`} key={expense.id}>
            <div>
              <strong>{expense.merchant}</strong>
              <p className="meta">
                {formatDay(expense.purchasedAt)} · {categoryLabel(expense.category)}
              </p>
            </div>
            <div className="row-side">
              <div className="amount">{formatMoney(expense.total, expense.currency)}</div>
              <span
                className={`pill${expense.status === "reimbursed" ? " is-ok" : ""}${
                  expense.status === "rejected" ? " is-bad" : ""
                }`}
              >
                {statusLabel(expense.status)}
              </span>
            </div>
          </Link>
        ))}
      </section>

      <div className="scan-bar">
        <div className="scan-bar-inner">
          <button className="primary" type="button" onClick={() => cameraRef.current?.click()} disabled={reading}>
            {reading ? "Reading…" : "Scan receipt"}
          </button>
          <button className="ghost" type="button" onClick={() => libraryRef.current?.click()} disabled={reading}>
            Upload
          </button>
        </div>
      </div>

      <input
        ref={cameraRef}
        hidden
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => void onFile(event.target.files?.[0])}
      />
      <input
        ref={libraryRef}
        hidden
        type="file"
        accept="image/*"
        onChange={(event) => void onFile(event.target.files?.[0])}
      />

      {draft ? (
        <ReceiptSheet
          previewUrl={previewUrl}
          initial={draft}
          warning={warning}
          busy={saving}
          error={sheetError}
          onClose={closeSheet}
          onConfirm={(payload) => void onConfirm(payload)}
        />
      ) : null}
    </main>
  );
}
