export type LineItem = {
  id?: string;
  name: string;
  qty: number;
  amount: number;
};

export type Expense = {
  id: string;
  email: string;
  name: string;
  merchant: string;
  purchasedAt: string;
  category: string;
  currency: string;
  items: LineItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  notes: string;
  status: string;
  adminNote: string;
  emailSent: boolean;
  createdAt: string | null;
  reimbursedAt: string | null;
  imageDataUrl?: string;
};

export type Profile = {
  email: string;
  name: string;
  role: "admin" | "contractor";
  status: string;
};

export type ReceiptDraft = {
  merchant: string;
  purchasedAt: string;
  currency: string;
  category: string;
  items: LineItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  notes: string;
  warning?: string;
};

const API_URL = process.env.NEXT_PUBLIC_EXPENSES_API_URL || "";

export async function postApi<T>(body: Record<string, unknown>, token = ""): Promise<T> {
  if (!API_URL) throw new Error("The expenses API is not configured.");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(API_URL, {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as T & { ok?: boolean; error?: string };
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Could not reach the expenses API.");
  }
  return payload;
}
