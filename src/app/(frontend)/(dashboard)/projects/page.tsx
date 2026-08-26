import { prefetchPage } from "@frontend/lib/prefetchPage";
import { prefetchProjects } from "@frontend/lib/queries/listQueries";
import ProjectsPageClient from "./ProjectsPageClient";

export default async function ProjectsPage() {
  return prefetchPage((qc) => prefetchProjects(qc), <ProjectsPageClient />);
}
