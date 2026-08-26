import { prefetchPage } from "@frontend/lib/prefetchPage";
import { prefetchPayrollPage } from "@frontend/lib/queries/listQueries";
import PayrollPageClient from "./PayrollPageClient";

export default async function PayrollPage() {
  return prefetchPage((qc) => prefetchPayrollPage(qc), <PayrollPageClient />);
}
