"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ReceiptDraft } from "../lib/api";
import { CATEGORIES } from "../lib/format";
import { BrandSelect } from "./BrandSelect";

const CATEGORY_OPTIONS = CATEGORIES.map((item) => ({ value: item.id, label: item.label }));

function moneyNumber(value: string) {
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : 0;
}

export function ReceiptSheet({
  previewUrl,
  initial,
  warning,
  busy,
  error,
  mode = "create",
  onClose,
  onConfirm,
}: {
  previewUrl: string;
  initial: ReceiptDraft;
  warning: string;
  busy: boolean;
  error: string;
  mode?: "create" | "edit";
  onClose: () => void;
  onConfirm: (payload: {
    merchant: string;
    purchasedAt: string;
    category: string;
    currency: string;
    items: { name: string; qty: number; amount: number }[];
    tax: number;
    tip: number;
    total: number;
    notes: string;
  }) => void;
}) {
  const [merchant, setMerchant] = useState(initial.merchant || "");
  const [purchasedAt, setPurchasedAt] = useState(initial.purchasedAt || new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(initial.category || "other");
  const [total, setTotal] = useState(initial.total ? String(initial.total) : "");
  const [notes, setNotes] = useState(initial.notes || "");
  const [mounted, setMounted] = useState(false);
  const isEdit = mode === "edit";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMerchant(initial.merchant || "");
    setPurchasedAt(initial.purchasedAt || new Date().toISOString().slice(0, 10));
    setCategory(initial.category || "other");
    setTotal(initial.total ? String(initial.total) : "");
    setNotes(initial.notes || "");
  }, [initial]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.documentElement.classList.add("sheet-open");
    document.body.classList.add("sheet-open");
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.classList.remove("sheet-open");
      document.body.classList.remove("sheet-open");
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const amount = moneyNumber(total);
    onConfirm({
      merchant: merchant.trim(),
      purchasedAt,
      category,
      currency: initial.currency || "USD",
      items: amount > 0 ? [{ name: "Receipt total", qty: 1, amount }] : [],
      tax: 0,
      tip: 0,
      total: amount,
      notes: notes.trim(),
    });
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="sheet"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <form
        className="sheet-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-title"
        onSubmit={onSubmit}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden />

        <header className="sheet-head">
          <div>
            <p className="eyebrow">{isEdit ? "Edit receipt" : "Check the receipt"}</p>
            <h1 id="receipt-title" className="sheet-title">
              {isEdit ? "Update total" : "Confirm total"}
            </h1>
          </div>
          <button className="icon-box sheet-close" type="button" onClick={onClose} disabled={busy} aria-label="Close">
            <span aria-hidden>×</span>
          </button>
        </header>

        <div className="sheet-body">
          {previewUrl ? (
            <div className="media-box">
              <img className="preview" src={previewUrl} alt="Receipt preview" />
            </div>
          ) : null}
          {warning ? <p className="notice">{warning}</p> : null}

          <div className="sheet-fields">
            <label className="field-span">
              Merchant
              <input value={merchant} onChange={(event) => setMerchant(event.target.value)} required />
            </label>
            <label>
              Date
              <input type="date" value={purchasedAt} onChange={(event) => setPurchasedAt(event.target.value)} required />
            </label>
            <label>
              Category
              <BrandSelect
                ariaLabel="Category"
                value={category}
                options={CATEGORY_OPTIONS}
                onChange={setCategory}
                disabled={busy}
              />
            </label>
          </div>

          <label className="total-field">
            Total
            <input
              inputMode="decimal"
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              placeholder="0.00"
              required
            />
          </label>
          <p className="muted sheet-hint">
            {isEdit
              ? "Adjust anything that looks off, then save. Premier Ikon gets an updated confirmation email."
              : "We pull the receipt total from the photo. Edit it if anything looks off — the image is saved with the expense."}
          </p>

          <label>
            Notes
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
          </label>

          {error ? <p className="error">{error}</p> : null}
        </div>

        <footer className="sheet-foot">
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : isEdit ? "Save changes" : "Confirm and send"}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
