"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LoginScreen } from "../../components/LoginScreen";
import { Expense, postApi } from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";
import { categoryLabel, formatDay, formatMoney, statusLabel } from "../../lib/format";

export default function ExpensePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { loading, user } = useAuth();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      setDeleting(false);
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
          {expense.items.map((item, index) => (
            <div className="line" key={item.id || index}>
              <span>
                {item.name}
                {item.qty && item.qty !== 1 ? ` × ${item.qty}` : ""}
              </span>
              <strong>{formatMoney(item.amount, expense.currency)}</strong>
            </div>
          ))}
          <div className="line">
            <span>Tax</span>
            <span>{formatMoney(expense.tax, expense.currency)}</span>
          </div>
          <div className="line">
            <span>Tip</span>
            <span>{formatMoney(expense.tip, expense.currency)}</span>
          </div>
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
            ) : (
              <p className="muted sheet-hint">Reimbursed receipts can’t be deleted from here.</p>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
