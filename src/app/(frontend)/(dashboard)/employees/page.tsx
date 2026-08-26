import { prefetchPage } from "@frontend/lib/prefetchPage";
import { prefetchEmployees } from "@frontend/lib/queries/listQueries";
import EmployeesPageClient from "./EmployeesPageClient";

export default async function EmployeesPage() {
  return prefetchPage((qc) => prefetchEmployees(qc), <EmployeesPageClient />);
}
