import { prefetchPage } from "@frontend/lib/prefetchPage";
import { prefetchSettingsPage } from "@frontend/lib/queries/listQueries";
import SettingsPageClient from "./SettingsPageClient";

export default async function SettingsPage() {
  return prefetchPage((qc) => prefetchSettingsPage(qc), <SettingsPageClient />);
}
