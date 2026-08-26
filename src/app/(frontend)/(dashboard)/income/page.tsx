import { prefetchPage } from "@frontend/lib/prefetchPage";
import { currentPeriod, prefetchIncome } from "@frontend/lib/queries/listQueries";
import IncomePageClient from "./IncomePageClient";

export default async function IncomePage() {
  const period = currentPeriod();
  return prefetchPage(
    (qc) => prefetchIncome(qc, { status: "all", period }),
    <IncomePageClient />
  );
}
