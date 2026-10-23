export const CATEGORIES = [
  { id: "meals", label: "Meals" },
  { id: "gas", label: "Gas" },
  { id: "rideshare", label: "Rideshare" },
  { id: "lodging", label: "Lodging" },
  { id: "parking", label: "Parking" },
  { id: "supplies", label: "Supplies" },
  { id: "travel", label: "Travel" },
  { id: "other", label: "Other" },
] as const;

export function categoryLabel(value?: string) {
  return CATEGORIES.find((item) => item.id === value)?.label || "Other";
}

export function formatMoney(value: number, currency = "USD") {
  const amount = Number(value) || 0;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function formatDay(value?: string | null) {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function statusLabel(status?: string) {
  if (status === "reimbursed") return "Reimbursed";
  if (status === "rejected") return "Rejected";
  return "Pending";
}
