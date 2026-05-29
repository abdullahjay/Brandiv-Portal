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

export default function TimeEntryList() {
  const { data: session } = useSession();
  const [period, setPeriod] = useState(currentPeriod());
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = ["super_admin", "admin", "manager"].includes(session?.user?.role ?? "");

  const { data, loading, error, refetch } = useTimeEntries({ period, pageSize: 100 });

  const entries = data?.items ?? [];
  const grouped = groupByDate(entries);

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const billableHours = entries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0);
  const projectCount = new Set(entries.map((e) => e.project.id)).size;

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
        <button className="btn-primary" style={{ height: 34 }} onClick={() => setShowAdd(true)}>
          <i className="ti ti-clock-plus" style={{ fontSize: 13 }} /> Log time
        </button>
      </div>

      {/* Summary metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total hours", value: fmtHours(totalHours), icon: "ti-clock", color: "var(--blue)" },
          { label: "Billable", value: fmtHours(billableHours), icon: "ti-coin", color: "var(--green)" },
          { label: "Non-billable", value: fmtHours(totalHours - billableHours), icon: "ti-clock-off", color: "var(--t2)" },
          { label: "Projects", value: String(projectCount), icon: "ti-briefcase", color: "var(--t1)" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className={`ti ${icon}`} style={{ fontSize: 15, color }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 11, color: "var(--t3)" }}>{label}</div>
            </div>
          </div>
        ))}
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
                    <div
                      key={entry.id}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: idx < dayEntries.length - 1 ? "0.5px solid var(--b3)" : "none" }}
                    >
                      {/* Avatar (admin sees all users) */}
                      {isAdmin && (
                        <Avatar name={entry.user.name} size={28} fontSize={11} />
                      )}

                      {/* Project + description */}
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

                      {/* Billable badge */}
                      <span style={{
                        fontSize: 10,
                        padding: "2px 7px",
                        borderRadius: 20,
                        fontWeight: 500,
                        background: entry.billable ? "var(--green-bg)" : "var(--bg2)",
                        color: entry.billable ? "var(--green)" : "var(--t3)",
                      }}>
                        {entry.billable ? "Billable" : "Non-billable"}
                      </span>

                      {/* Hours */}
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--blue)", minWidth: 36, textAlign: "right" }}>
                        {fmtHours(entry.hours)}
                      </span>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        title="Delete entry"
                        style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "none", cursor: "pointer", color: "var(--t3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                      >
                        <i className={`ti ${deletingId === entry.id ? "ti-loader-2" : "ti-trash"}`} style={{ fontSize: 13 }} />
                      </button>
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
