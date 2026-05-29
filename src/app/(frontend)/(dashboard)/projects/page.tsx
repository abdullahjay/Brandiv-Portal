"use client";

import { useState, useEffect } from "react";
import Topbar from "@frontend/components/layout/Topbar";
import ProjectList from "@frontend/components/projects/ProjectList";
import ProjectDetail from "@frontend/components/projects/ProjectDetail";
import AddProjectModal from "@frontend/components/projects/AddProjectModal";
import EditProjectModal from "@frontend/components/projects/EditProjectModal";
import { useProjects } from "@frontend/hooks/useProjects";
import type { Project } from "@frontend/types";

type FilterStatus = "all" | "active" | "pending" | "done" | "cancelled";

export default function ProjectsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, refetch } = useProjects({
    status: filter,
    search: debouncedSearch,
  });

  const projects = data?.items ?? [];

  useEffect(() => {
    if (!loading && !selectedId && projects.length > 0) {
      setSelectedId(projects[0].id);
    }
  }, [loading, projects, selectedId]);

  function handleCreated(project: Project) {
    refetch();
    setSelectedId(project.id);
  }

  function handleUpdated() {
    refetch();
    setDetailRefreshKey((k) => k + 1);
    setShowEdit(false);
  }

  return (
    <>
      <Topbar title="Projects" />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <ProjectList
          projects={projects}
          selectedId={selectedId}
          filter={filter}
          search={search}
          loading={loading}
          onSelect={setSelectedId}
          onFilterChange={setFilter}
          onSearchChange={setSearch}
          onAddClick={() => setShowAdd(true)}
        />
        <ProjectDetail
          projectId={selectedId}
          onEditClick={() => setShowEdit(true)}
          onUpdated={refetch}
          refreshKey={detailRefreshKey}
        />
      </div>

      <AddProjectModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={handleCreated}
      />

      <EditProjectModal
        open={showEdit}
        projectId={selectedId}
        onClose={() => setShowEdit(false)}
        onUpdated={handleUpdated}
      />
    </>
  );
}
