"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTimeEntries, deleteTimeEntryRequest } from "@frontend/hooks/useTimeEntries";
import AddTimeEntryModal from "./AddTimeEntryModal";
import Avatar from "@frontend/components/ui/Avatar";
import PeriodSelect from "@frontend/components/ui/PeriodSelect";
import type { TimeEntry } from "@frontend/types";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function fmtHours(h: number) {
  if (h === Math.floor(h)) return `${h}h`;
  const mins = Math.round((h % 1) * 60);
  return `${Math.floor(h)}h ${mins}m`;
}

function fmtDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function groupByDate(entries: TimeEntry[]): [string, TimeEntry[]][] {
  const map = new Map<string, TimeEntry[]>();
  for (const e of entries) {
    const key = e.date;
    const group = map.get(key) ?? [];
    group.push(e);
    map.set(key, group);
  }
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

function BillablePill({ billable }: { billable: boolean }) {
  return (
    <span style={{
      fontSize: 10,
      padding: "2px 7px",
      borderRadius: 20,
      fontWeight: 500,
      flexShrink: 0,
      background: billable ? "var(--green-bg)" : "var(--bg2)",
      color: billable ? "var(--green)" : "var(--t3)",
    }}>
      {billable ? "Billable" : "Non-billable"}
    </span>
  );
}

export default function TimeEntryList() {
  const { data: session } = useSession();
  const [period, setPeriod] = useState(currentPeriod());
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = ["super_admin", "admin", "manager"].includes(session?.user?.role ?? "");

  const { data, loading, error, refetch } = useTimeEntries({ period, pageSize: 100 });

  const entries = data?.items ?? [];
  const grouped = groupByDate(entries);

  const totalHours    = entries.reduce((s, e) => s + e.hours, 0);
  const billableHours = entries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0);
  const projectCount  = new Set(entries.map((e) => e.project.id)).size;

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteTimeEntryRequest(id);
      refetch();
    } catch {
      // silently fail — entry stays
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--t2)" }}>Period</span>
          <PeriodSelect value={period} onChange={setPeriod} />
        </div>
        <button className="btn-primary" style={{ height: 34, flexShrink: 0 }} onClick={() => setShowAdd(true)}>
          <i className="ti ti-clock-plus" style={{ fontSize: 13 }} /> Log time
        </button>
      </div>

      {/* Summary bar */}
      <div className="stat-bar" style={{ marginBottom: 20 }}>
        <div className="stat-bar-item">
          <div className="stat-bar-label">Total Hours</div>
          <div className="stat-bar-value" style={{ color: "var(--blue)" }}>{fmtHours(totalHours)}</div>
          <div className="stat-bar-sub">this period</div>
        </div>
        <div className="stat-bar-item">
          <div className="stat-bar-label">Billable</div>
          <div className="stat-bar-value" style={{ color: "var(--green)" }}>{fmtHours(billableHours)}</div>
          <div className="stat-bar-sub">{totalHours > 0 ? `${Math.round((billableHours / totalHours) * 100)}%` : "—"}</div>
        </div>
        <div className="stat-bar-item">
          <div className="stat-bar-label">Non-Billable</div>
          <div className="stat-bar-value" style={{ color: "var(--t2)" }}>{fmtHours(totalHours - billableHours)}</div>
          <div className="stat-bar-sub">{totalHours > 0 ? `${Math.round(((totalHours - billableHours) / totalHours) * 100)}%` : "—"}</div>
        </div>
        <div className="stat-bar-item">
          <div className="stat-bar-label">Projects</div>
          <div className="stat-bar-value" style={{ color: "var(--t1)" }}>{projectCount}</div>
          <div className="stat-bar-sub">active this period</div>
        </div>
      </div>

      {/* Entry list */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 48, color: "var(--t3)", fontSize: 12 }}>
          <i className="ti ti-loader-2" style={{ fontSize: 18 }} /> Loading…
        </div>
      ) : error ? (
        <div style={{ padding: 20, fontSize: 12, color: "var(--red)" }}>{error}</div>
      ) : grouped.length === 0 ? (
        <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", padding: 48, textAlign: "center" }}>
          <i className="ti ti-clock" style={{ fontSize: 32, color: "var(--t3)", display: "block", marginBottom: 8 }} />
          <div style={{ fontSize: 14, color: "var(--t2)" }}>No time logged for {period}</div>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAdd(true)}>
            <i className="ti ti-plus" style={{ fontSize: 12 }} /> Log your first entry
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {grouped.map(([date, dayEntries]) => {
            const dayTotal = dayEntries.reduce((s, e) => s + e.hours, 0);
            return (
              <div key={date}>
                {/* Date group header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, padding: "0 2px" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)" }}>{fmtDate(date)}</span>
                  <span style={{ fontSize: 12, color: "var(--blue)", fontWeight: 600 }}>{fmtHours(dayTotal)}</span>
                </div>

                <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden" }}>
                  {dayEntries.map((entry, idx) => (
                    <div key={entry.id} style={{ borderBottom: idx < dayEntries.length - 1 ? "0.5px solid var(--b3)" : "none" }}>

                      {/* ── Desktop row ── */}
                      <div className="ledger-desktop-only" style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px" }}>
                        {isAdmin && <Avatar name={entry.user.name} size={28} fontSize={11} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>
                            {entry.project.client.companyName} — {entry.project.name}
                          </div>
                          {entry.description && (
                            <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {entry.description}
                            </div>
                          )}
                          {isAdmin && (
                            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 1 }}>{entry.user.name}</div>
                          )}
                        </div>
                        <BillablePill billable={entry.billable} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--blue)", minWidth: 36, textAlign: "right" }}>
                          {fmtHours(entry.hours)}
                        </span>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={deletingId === entry.id}
                          title="Delete entry"
                          style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "none", cursor: "pointer", color: "var(--t3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                        >
                          <i className={`ti ${deletingId === entry.id ? "ti-loader-2" : "ti-trash"}`} style={{ fontSize: 13 }} />
                        </button>
                      </div>

                      {/* ── Mobile card ── */}
                      <div className="ledger-mobile-only" style={{ display: "none", flexDirection: "column", padding: "10px 14px", gap: 6 }}>
                        {/* Top: project name + hours */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {entry.project.name}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {entry.project.client.companyName}
                            </div>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--blue)", flexShrink: 0 }}>
                            {fmtHours(entry.hours)}
                          </span>
                        </div>

                        {/* Description */}
                        {entry.description && (
                          <div style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.4 }}>{entry.description}</div>
                        )}

                        {/* Bottom: billable pill + user (admin) + delete */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <BillablePill billable={entry.billable} />
                            {isAdmin && (
                              <span style={{ fontSize: 10, color: "var(--t3)" }}>{entry.user.name}</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={deletingId === entry.id}
                            title="Delete entry"
                            style={{ width: 26, height: 26, borderRadius: 6, border: "0.5px solid var(--b3)", background: "var(--bg2)", cursor: "pointer", color: "var(--t3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                          >
                            <i className={`ti ${deletingId === entry.id ? "ti-loader-2" : "ti-trash"}`} style={{ fontSize: 13 }} />
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddTimeEntryModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={() => { setShowAdd(false); refetch(); }}
      />
    </>
  );
}
