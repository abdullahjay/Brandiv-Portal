"use client";

import Badge from "@frontend/components/ui/Badge";
import ProgressBar from "@frontend/components/ui/ProgressBar";
import type { Project } from "@frontend/types";

type FilterStatus = "all" | "active" | "pending" | "done" | "cancelled";

const FILTERS: { label: string; value: FilterStatus }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Done", value: "done" },
  { label: "Cancelled", value: "cancelled" },
];

function fmt(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toLocaleString();
}

interface ProjectListProps {
  projects: Project[];
  selectedId: string | null;
  filter: FilterStatus;
  search: string;
  loading: boolean;
  onSelect: (id: string) => void;
  onFilterChange: (f: FilterStatus) => void;
  onSearchChange: (s: string) => void;
  onAddClick: () => void;
}

export default function ProjectList({
  projects,
  selectedId,
  filter,
  search,
  loading,
  onSelect,
  onFilterChange,
  onSearchChange,
  onAddClick,
}: ProjectListProps) {
  return (
    <div
      style={{
        width: 300,
        minWidth: 300,
        background: "var(--bg1)",
        borderRight: "0.5px solid var(--b3)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "0.5px solid var(--b3)" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", marginBottom: 10 }}>
          Projects{" "}
          <span style={{ fontSize: 11, color: "var(--t2)", fontWeight: 400 }}>
            {projects.length} total
          </span>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--bg2)",
              border: "0.5px solid var(--b3)",
              borderRadius: "var(--rm)",
              padding: "0 10px",
              height: 32,
            }}
          >
            <i className="ti ti-search" style={{ fontSize: 14, color: "var(--t3)" }} />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                fontSize: 12,
                color: "var(--t1)",
                outline: "none",
                width: "100%",
              }}
            />
          </div>
          <button className="btn-primary" style={{ height: 32 }} onClick={onAddClick}>
            <i className="ti ti-plus" style={{ fontSize: 12 }} />
            Add
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div
        style={{
          display: "flex",
          gap: 5,
          padding: "9px 16px",
          borderBottom: "0.5px solid var(--b3)",
          flexWrap: "wrap",
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            style={{
              fontSize: 11,
              padding: "3px 9px",
              borderRadius: 20,
              border: `0.5px solid ${filter === f.value ? "#85B7EB" : "var(--b3)"}`,
              cursor: "pointer",
              color: filter === f.value ? "var(--blue)" : "var(--t2)",
              background: filter === f.value ? "var(--blue-bg)" : "transparent",
              transition: "all .1s",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 200,
              color: "var(--t3)",
              fontSize: 12,
              gap: 8,
            }}
          >
            <i className="ti ti-loader-2" style={{ fontSize: 20 }} />
            Loading…
          </div>
        ) : projects.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: 200,
              color: "var(--t2)",
              gap: 8,
            }}
          >
            <i className="ti ti-briefcase" style={{ fontSize: 28, color: "var(--t3)" }} />
            <p style={{ fontSize: 13 }}>No projects found</p>
          </div>
        ) : (
          projects.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelect(p.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 16px",
                borderBottom: "0.5px solid var(--b3)",
                cursor: "pointer",
                background: p.id === selectedId ? "var(--blue-bg)" : "transparent",
                transition: "background .1s",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "var(--bg2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "var(--t2)",
                }}
              >
                <i className="ti ti-briefcase" style={{ fontSize: 16 }} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--t1)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--t2)",
                    marginTop: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.client?.companyName ?? "—"}
                </div>
                <ProgressBar value={p.progressPct} />
              </div>

              {/* Right */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: "var(--t1)", fontWeight: 500, marginBottom: 3 }}>
                  {p.currency} {fmt(p.valueOriginal / 100)}
                </div>
                <Badge status={p.status} size="sm" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
