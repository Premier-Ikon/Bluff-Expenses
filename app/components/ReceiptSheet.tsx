"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ReceiptDraft } from "../lib/api";
import { CATEGORIES, formatMoney } from "../lib/format";
import { BrandSelect } from "./BrandSelect";

const CATEGORY_OPTIONS = CATEGORIES.map((item) => ({ value: item.id, label: item.label }));

type Row = { key: string; name: string; qty: string; amount: string };

function moneyNumber(value: string) {
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : 0;
}

function rowsFrom(draft: ReceiptDraft): Row[] {
  const rows = (draft.items || []).map((item) => ({
    key: crypto.randomUUID(),
    name: item.name || "",
    qty: String(item.qty || 1),
    amount: item.amount ? String(item.amount) : "",
  }));
  return rows.length ? rows : [{ key: crypto.randomUUID(), name: "", qty: "1", amount: "" }];
}

export function ReceiptSheet({
  previewUrl,
  initial,
  warning,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  previewUrl: string;
  initial: ReceiptDraft;
  warning: string;
  busy: boolean;
  error: string;
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
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(initial));
  const [tax, setTax] = useState(initial.tax ? String(initial.tax) : "");
  const [tip, setTip] = useState(initial.tip ? String(initial.tip) : "");
  const [notes, setNotes] = useState(initial.notes || "");
  const [totalTouched, setTotalTouched] = useState(false);
  const [totalOverride, setTotalOverride] = useState(initial.total ? String(initial.total) : "");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculated = useMemo(() => {
    const subtotal = rows.reduce((sum, row) => sum + moneyNumber(row.amount), 0);
    return Math.round((subtotal + moneyNumber(tax) + moneyNumber(tip)) * 100) / 100;
  }, [rows, tax, tip]);
  const total = totalTouched ? moneyNumber(totalOverride) : calculated;

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

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    onConfirm({
      merchant: merchant.trim(),
      purchasedAt,
      category,
      currency: initial.currency || "USD",
      items: rows
        .map((row) => ({
          name: row.name.trim(),
          qty: Number(row.qty) > 0 ? Number(row.qty) : 1,
          amount: moneyNumber(row.amount),
        }))
        .filter((row) => row.name),
      tax: moneyNumber(tax),
      tip: moneyNumber(tip),
      total,
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
            <p className="eyebrow">Check the receipt</p>
            <h1 id="receipt-title" className="sheet-title">
              Confirm items
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

          <div className="item-list">
            <div className="item-list-head">
              <span>Items</span>
              <span className="muted">Qty · amount</span>
            </div>
            {rows.map((row) => (
              <div className="item-row" key={row.key}>
                <input
                  aria-label="Item"
                  placeholder="Item"
                  value={row.name}
                  onChange={(event) => updateRow(row.key, { name: event.target.value })}
                />
                <input
                  aria-label="Quantity"
                  inputMode="decimal"
                  value={row.qty}
                  onChange={(event) => updateRow(row.key, { qty: event.target.value })}
                />
                <input
                  aria-label="Line total"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={row.amount}
                  onChange={(event) => updateRow(row.key, { amount: event.target.value })}
                />
                <button
                  className="icon-box icon-box-sm"
                  type="button"
                  aria-label="Remove item"
                  onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                >
                  <span aria-hidden>×</span>
                </button>
              </div>
            ))}
            <button
              className="ghost add-item"
              type="button"
              onClick={() =>
                setRows((current) => [...current, { key: crypto.randomUUID(), name: "", qty: "1", amount: "" }])
              }
            >
              Add item
            </button>
          </div>

          <div className="money-row">
            <label>
              Tax
              <input inputMode="decimal" value={tax} onChange={(event) => setTax(event.target.value)} />
            </label>
            <label>
              Tip
              <input inputMode="decimal" value={tip} onChange={(event) => setTip(event.target.value)} />
            </label>
            <label>
              Total
              <input
                inputMode="decimal"
                value={totalTouched ? totalOverride : calculated ? String(calculated) : ""}
                onChange={(event) => {
                  setTotalTouched(true);
                  setTotalOverride(event.target.value);
                }}
              />
            </label>
          </div>

          {totalTouched && Math.abs(total - calculated) > 0.009 ? (
            <button className="linkish" type="button" onClick={() => setTotalTouched(false)}>
              Use calculated total {formatMoney(calculated, initial.currency || "USD")}
            </button>
          ) : (
            <p className="muted sheet-hint">Amount is the line total. Quantity is just for the record.</p>
          )}

          <label>
            Notes
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
          </label>

          {error ? <p className="error">{error}</p> : null}
        </div>

        <footer className="sheet-foot">
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Confirm and send"}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
