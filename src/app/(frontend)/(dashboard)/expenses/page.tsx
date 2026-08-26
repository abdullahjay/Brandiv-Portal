import { prefetchPage } from "@frontend/lib/prefetchPage";
import { prefetchExpenses } from "@frontend/lib/queries/listQueries";
import ExpensesPageClient from "./ExpensesPageClient";

export default async function ExpensesPage() {
  return prefetchPage((qc) => prefetchExpenses(qc), <ExpensesPageClient />);
}
