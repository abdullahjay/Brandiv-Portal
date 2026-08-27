/** Current calendar month as YYYY-MM — default for period filters across the app. */
export function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function periodLabel(period: string): string {
  if (!period || period === "all") return "All periods";
  const [yr, mo] = period.split("-");
  const d = new Date(parseInt(yr, 10), parseInt(mo, 10) - 1, 1);
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}
