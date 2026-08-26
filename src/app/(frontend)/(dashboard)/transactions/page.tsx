import { prefetchPage } from "@frontend/lib/prefetchPage";
import { currentPeriod, prefetchLedger } from "@frontend/lib/queries/listQueries";
import TransactionsPageClient from "./TransactionsPageClient";

export default async function TransactionsPage() {
  const period = currentPeriod();
  return prefetchPage(
    (qc) => prefetchLedger(qc, { period, page: 1, pageSize: 100 }),
    <TransactionsPageClient />
  );
}
