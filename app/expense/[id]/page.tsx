"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LoginScreen } from "../../components/LoginScreen";
import { ReceiptSheet } from "../../components/ReceiptSheet";
import { Expense, ReceiptDraft, postApi } from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";
import { categoryLabel, formatDay, formatMoney, statusLabel } from "../../lib/format";

function toDraft(expense: Expense): ReceiptDraft {
  return {
    merchant: expense.merchant || "",
    purchasedAt: expense.purchasedAt || new Date().toISOString().slice(0, 10),
    currency: expense.currency || "USD",
    category: expense.category || "other",
    items: expense.items || [],
    subtotal: expense.subtotal || expense.total || 0,
    tax: expense.tax || 0,
    tip: expense.tip || 0,
    total: expense.total || 0,
    notes: expense.notes || "",
  };
}

export default function ExpensePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { loading, user } = useAuth();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sheetError, setSheetError] = useState("");

  useEffect(() => {
    if (!user || !params.id) return;
    user
      .getIdToken()
      .then((token) => postApi<{ expense: Expense }>({ action: "getExpense", id: params.id, includeImage: true }, token))
      .then((payload) => setExpense(payload.expense))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not open that receipt."));
  }, [user, params.id]);

  async function onDelete() {
    if (!user || !expense || deleting) return;
    setDeleting(true);
    setError("");
    try {
      const token = await user.getIdToken();
      await postApi({ action: "deleteExpense", id: expense.id }, token);
      router.replace("/");
    } catch (err) {
      setConfirmDelete(false);
      setError(err instanceof Error ? err.message : "Could not delete that receipt.");
    }
    setDeleting(false);
  }

  async function onSaveEdit(payload: {
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
    if (!user || !expense || saving) return;
    setSaving(true);
    setSheetError("");
    setBanner("");
    try {
      const token = await user.getIdToken();
      const result = await postApi<{ expense: Expense; emailSent?: boolean }>(
        {
          action: "updateExpense",
          id: expense.id,
          ...payload,
        },
        token
      );
      setExpense({
        ...result.expense,
        imageDataUrl: expense.imageDataUrl,
      });
      setEditing(false);
      setBanner(
        result.emailSent
          ? "Receipt updated. Confirmation email sent, with dylan@premierikon.com copied."
          : "Receipt updated. The confirmation email did not send."
      );
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : "Could not update that receipt.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="screen">
        <p className="muted">Loading…</p>
      </main>
    );
  }
  if (!user) return <LoginScreen />;

  const canEdit = expense && expense.status !== "reimbursed";
  const canDelete = expense && expense.status !== "reimbursed";

  return (
    <main className="screen">
      <Link className="back" href="/">
        <span className="chevron" aria-hidden>
          ←
        </span>
        Back
      </Link>
      {error ? <p className="notice bad" style={{ marginTop: 16 }}>{error}</p> : null}
      {banner ? <p className="notice ok" style={{ marginTop: 16 }}>{banner}</p> : null}
      {!expense && !error ? <p className="muted" style={{ marginTop: 16 }}>Loading receipt…</p> : null}
      {expense ? (
        <div className="stack" style={{ marginTop: 18 }}>
          <div>
            <p className="eyebrow">{categoryLabel(expense.category)}</p>
            <div className="split" style={{ alignItems: "flex-start" }}>
              <h1 style={{ fontSize: 42 }}>{expense.merchant}</h1>
              <span
                className={`pill${expense.status === "reimbursed" ? " is-ok" : ""}${
                  expense.status === "rejected" ? " is-bad" : ""
                }`}
              >
                {statusLabel(expense.status)}
              </span>
            </div>
            <p className="meta">{formatDay(expense.purchasedAt)}</p>
          </div>
          {expense.imageDataUrl ? (
            <div className="media-box">
              <img className="detail-photo" src={expense.imageDataUrl} alt="Receipt" />
            </div>
          ) : null}
          {expense.items.length > 1 || (expense.items[0] && expense.items[0].name !== "Receipt total")
            ? expense.items.map((item, index) => (
                <div className="line" key={item.id || index}>
                  <span>
                    {item.name}
                    {item.qty && item.qty !== 1 ? ` × ${item.qty}` : ""}
                  </span>
                  <strong>{formatMoney(item.amount, expense.currency)}</strong>
                </div>
              ))
            : null}
          {expense.tax > 0 ? (
            <div className="line">
              <span>Tax</span>
              <span>{formatMoney(expense.tax, expense.currency)}</span>
            </div>
          ) : null}
          {expense.tip > 0 ? (
            <div className="line">
              <span>Tip</span>
              <span>{formatMoney(expense.tip, expense.currency)}</span>
            </div>
          ) : null}
          <div className="line total-line">
            <strong>Total</strong>
            <strong>{formatMoney(expense.total, expense.currency)}</strong>
          </div>
          {expense.notes ? <p>{expense.notes}</p> : null}
          {expense.adminNote ? <p className="muted">Note from Premier Ikon: {expense.adminNote}</p> : null}
          <p className={expense.emailSent ? "ok" : "muted"}>
            {expense.emailSent
              ? "Confirmation email sent, with dylan@premierikon.com copied."
              : "Saved on your list. The confirmation email did not send."}
          </p>

          <div className="detail-actions">
            {canEdit ? (
              <button
                className="ghost"
                type="button"
                onClick={() => {
                  setSheetError("");
                  setBanner("");
                  setEditing(true);
                }}
              >
                Edit receipt
              </button>
            ) : (
              <p className="muted sheet-hint">Reimbursed receipts can’t be edited from here.</p>
            )}

            {canDelete ? (
              confirmDelete ? (
                <div className="delete-confirm">
                  <p className="muted">Delete this receipt? It will be removed from your list and Premier Ikon’s view.</p>
                  <div className="delete-confirm-row">
                    <button className="danger" type="button" onClick={() => void onDelete()} disabled={deleting}>
                      {deleting ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button className="ghost" type="button" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                      Keep it
                    </button>
                  </div>
                </div>
              ) : (
                <button className="ghost danger-outline" type="button" onClick={() => setConfirmDelete(true)}>
                  Delete receipt
                </button>
              )
            ) : null}
          </div>
        </div>
      ) : null}

      {editing && expense ? (
        <ReceiptSheet
          mode="edit"
          previewUrl={expense.imageDataUrl || ""}
          initial={toDraft(expense)}
          warning=""
          busy={saving}
          error={sheetError}
          onClose={() => {
            if (!saving) setEditing(false);
          }}
          onConfirm={(payload) => void onSaveEdit(payload)}
        />
      ) : null}
    </main>
  );
}
