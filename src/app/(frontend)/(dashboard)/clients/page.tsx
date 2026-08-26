import { prefetchPage } from "@frontend/lib/prefetchPage";
import { prefetchClients } from "@frontend/lib/queries/listQueries";
import ClientsPageClient from "./ClientsPageClient";

export default async function ClientsPage() {
  return prefetchPage((qc) => prefetchClients(qc), <ClientsPageClient />);
}
