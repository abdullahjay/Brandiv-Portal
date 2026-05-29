"use client";

import { useState } from "react";
import { useProject, archiveProjectRequest } from "@frontend/hooks/useProjects";
import Badge from "@frontend/components/ui/Badge";
import ProgressBar from "@frontend/components/ui/ProgressBar";
import Avatar from "@frontend/components/ui/Avatar";
import type { ProjectMilestone, ProjectTimeEntry } from "@frontend/types";

interface ProjectDetailProps {
  projectId: string | null;
  onEditClick: () => void;
  onUpdated?: () => void;
  refreshKey?: number;
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--t1)" }}>{value ?? "—"}</div>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--bg1)",
        border: "0.5px solid var(--b3)",
        borderRadius: "var(--rl)",
        padding: 16,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function MilestoneRow({ m }: { m: ProjectMilestone }) {
  const done = !!m.completedAt;
  return (
    <div className="trow">
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: `1.5px solid ${done ? "var(--green)" : "var(--b2)"}`,
          background: done ? "var(--green-bg)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {done && <i className="ti ti-check" style={{ fontSize: 10, color: "var(--green)" }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: "var(--t1)", fontWeight: done ? 400 : 500, textDecoration: done ? "line-through" : "none" }}>
          {m.title}
        </div>
        {m.dueDate && (
          <div style={{ fontSize: 11, color: "var(--t2)" }}>Due {fmtDate(m.dueDate)}</div>
        )}
      </div>
      <Badge status={done ? "done" : "pending"} size="sm" />
    </div>
  );
}

function TimeEntryRow({ t }: { t: ProjectTimeEntry }) {
  return (
    <div className="trow">
      {t.user ? (
        <Avatar name={t.user.name} size={28} fontSize={10} />
      ) : (
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bg2)", flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)" }}>
          {t.user?.name ?? "Unknown"}
        </div>
        {t.description && (
          <div style={{ fontSize: 11, color: "var(--t2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t.description}
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)", flexShrink: 0 }}>
        {Number(t.hours)}h
      </div>
      <div style={{ fontSize: 11, color: "var(--t2)", flexShrink: 0 }}>{fmtDate(t.date)}</div>
    </div>
  );
}

export default function ProjectDetail({ projectId, onEditClick, onUpdated, refreshKey }: ProjectDetailProps) {
  const { data: project, loading, refetch } = useProject(projectId, refreshKey);
  const [archiving, setArchiving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleArchive() {
    if (!project) return;
    setArchiving(true);
    setActionError(null);
    try {
      await archiveProjectRequest(project.id);
      setConfirmArchive(false);
      await refetch();
      onUpdated?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to archive project");
    } finally {
      setArchiving(false);
    }
  }

  if (!projectId) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          color: "var(--t2)",
        }}
      >
        <i className="ti ti-briefcase" style={{ fontSize: 40, color: "var(--t3)" }} />
        <p style={{ fontSize: 13 }}>Select a project to view details</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          color: "var(--t3)",
        }}
      >
        <i className="ti ti-loader-2" style={{ fontSize: 20 }} />
        <span style={{ fontSize: 12 }}>Loading…</span>
      </div>
    );
  }

  if (!project) return null;

  const totalHours = project.timeEntries?.reduce((s, t) => s + Number(t.hours), 0) ?? 0;
  const valueDisplay = `${project.currency} ${(project.valueOriginal / 100).toLocaleString()}`;
  const isArchived = project.status === "cancelled" || project.status === "done";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "13px 20px",
          background: "var(--bg1)",
          borderBottom: "0.5px solid var(--b3)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--blue-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i className="ti ti-briefcase" style={{ fontSize: 14, color: "var(--blue)" }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--t1)" }}>{project.name}</div>
          <Badge status={project.status} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {actionError && (
            <span style={{ fontSize: 11, color: "var(--red)" }}>{actionError}</span>
          )}
          {confirmArchive ? (
            <>
              <span style={{ fontSize: 12, color: "var(--t2)" }}>Archive this project?</span>
              <button
                className="btn-outline"
                style={{ color: "var(--red)", borderColor: "var(--red)" }}
                onClick={handleArchive}
                disabled={archiving}
              >
                {archiving ? <i className="ti ti-loader-2" style={{ fontSize: 12 }} /> : "Confirm"}
              </button>
              <button className="btn-outline" onClick={() => setConfirmArchive(false)}>Cancel</button>
            </>
          ) : (
            <>
              <button className="btn-outline" onClick={onEditClick}>
                <i className="ti ti-edit" style={{ fontSize: 12 }} /> Edit
              </button>
              <button className="btn-outline">
                <i className="ti ti-clock" style={{ fontSize: 12 }} /> Log time
              </button>
              <button className="btn-outline">
                <i className="ti ti-file-invoice" style={{ fontSize: 12 }} /> Invoice
              </button>
              {!isArchived && (
                <button
                  className="btn-outline"
                  style={{ color: "var(--red)" }}
                  onClick={() => setConfirmArchive(true)}
                >
                  <i className="ti ti-archive" style={{ fontSize: 12 }} /> Archive
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {/* Metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Project value</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: "var(--t1)" }}>{valueDisplay}</div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Progress</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: "var(--t1)" }}>
              {project.progressPct}%
            </div>
            <ProgressBar value={project.progressPct} />
          </div>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Hours logged</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: "var(--t1)" }}>{totalHours}h</div>
          </div>
        </div>

        {/* Project details */}
        <Section title="Project details" action={
          <button className="btn-outline" style={{ height: 26, fontSize: 11 }} onClick={onEditClick}>
            <i className="ti ti-edit" style={{ fontSize: 11 }} /> Edit
          </button>
        }>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <InfoItem
              label="Client"
              value={
                <span style={{ color: "var(--blue)", cursor: "pointer" }}>
                  {project.client?.companyName ?? "—"}
                </span>
              }
            />
            <InfoItem
              label="Type"
              value={<Badge status={project.type} label={project.type.replace(/_/g, " ")} />}
            />
            <InfoItem label="Manager" value={project.manager?.name ?? "Unassigned"} />
            <InfoItem label="Status" value={<Badge status={project.status} />} />
            <InfoItem label="Start date" value={fmtDate(project.startDate)} />
            <InfoItem label="Deadline" value={fmtDate(project.deadline)} />
            {project.description && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 2 }}>Description</div>
                <div style={{ fontSize: 13, color: "var(--t1)", lineHeight: 1.5 }}>
                  {project.description}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Milestones — only shown for milestone-type projects */}
        {project.type === "milestone" && (
          <Section
            title="Milestones"
            action={
              <span style={{ fontSize: 11, color: "var(--blue)", cursor: "pointer" }}>+ Add</span>
            }
          >
            {project.milestones?.length ? (
              project.milestones.map((m) => <MilestoneRow key={m.id} m={m} />)
            ) : (
              <p style={{ fontSize: 12, color: "var(--t2)", textAlign: "center", padding: "12px 0" }}>
                No milestones yet
              </p>
            )}
          </Section>
        )}

        {/* Invoices */}
        <Section
          title="Invoices"
          action={
            <span style={{ fontSize: 11, color: "var(--blue)", cursor: "pointer" }}>+ New</span>
          }
        >
          {project.invoices?.length ? (
            project.invoices.map((inv) => (
              <div key={inv.id} className="trow">
                <div style={{ fontSize: 12, color: "var(--blue)", width: 82, flexShrink: 0, fontWeight: 500 }}>
                  {inv.invoiceNumber}
                </div>
                <div style={{ fontSize: 11, color: "var(--t2)", flex: 1 }}>
                  {fmtDate(inv.issueDate)}
                </div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>
                  {inv.currency} {(inv.totalAmount / 100).toLocaleString()}
                </div>
                <Badge status={inv.status} size="sm" />
              </div>
            ))
          ) : (
            <p style={{ fontSize: 12, color: "var(--t2)", textAlign: "center", padding: "12px 0" }}>
              No invoices yet
            </p>
          )}
        </Section>

        {/* Time entries */}
        <Section
          title="Time entries"
          action={
            <button className="btn-outline" style={{ height: 26, fontSize: 11 }}>
              <i className="ti ti-plus" style={{ fontSize: 11 }} /> Log
            </button>
          }
        >
          {project.timeEntries?.length ? (
            project.timeEntries.map((t) => <TimeEntryRow key={t.id} t={t} />)
          ) : (
            <p style={{ fontSize: 12, color: "var(--t2)", textAlign: "center", padding: "12px 0" }}>
              No time logged yet
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}
