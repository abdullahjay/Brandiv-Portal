import { prefetchPage } from "@frontend/lib/prefetchPage";
import { prefetchInvoices } from "@frontend/lib/queries/listQueries";
import InvoicesPageClient from "./InvoicesPageClient";

export default async function InvoicesPage() {
  return prefetchPage((qc) => prefetchInvoices(qc), <InvoicesPageClient />);
}
