"use client";

import { useState, useEffect } from "react";
import { createTimeEntryRequest } from "@frontend/hooks/useTimeEntries";
import type { ApiResponse, PaginatedResponse } from "@frontend/types";

interface Project {
  id: string;
  name: string;
  client: { companyName: string };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

export default function AddTimeEntryModal({ open, onClose, onCreated }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(today());
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/projects?pageSize=100&status=active")
      .then((r) => r.json())
      .then((j: ApiResponse<PaginatedResponse<Project>>) => {
        if (j.success) setProjects(j.data?.items ?? []);
      })
      .catch(() => {});
  }, [open]);

  function reset() {
    setProjectId("");
    setDate(today());
    setHours("");
    setDescription("");
    setBillable(true);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const h = parseFloat(hours);
    if (!projectId) { setError("Select a project"); return; }
    if (isNaN(h) || h <= 0 || h > 24) { setError("Hours must be between 0.1 and 24"); return; }

    setSaving(true);
    setError(null);
    try {
      await createTimeEntryRequest({
        projectId,
        date,
        hours: h,
        description: description.trim() || null,
        billable,
      });
      reset();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log time");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const hoursNum = parseFloat(hours);
  const validHours = !isNaN(hoursNum) && hoursNum > 0 && hoursNum <= 24;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}>
      <form
        onSubmit={handleSubmit}
        style={{ background: "var(--bg1)", borderRadius: "var(--rl)", border: "0.5px solid var(--b3)", width: 440, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)" }}>Log time</div>
          <button type="button" onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t3)", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Project */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--t2)", display: "block", marginBottom: 5 }}>Project *</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            required
            style={{ width: "100%", height: 36, padding: "0 10px", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", background: "var(--bg1)", fontSize: 13, color: "var(--t1)", outline: "none" }}
          >
            <option value="">Select project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.client.companyName} — {p.name}</option>
            ))}
          </select>
        </div>

        {/* Date + Hours */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--t2)", display: "block", marginBottom: 5 }}>Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              style={{ width: "100%", height: 36, padding: "0 10px", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", background: "var(--bg1)", fontSize: 13, color: "var(--t1)", outline: "none" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--t2)", display: "block", marginBottom: 5 }}>Hours *</label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              max="24"
              placeholder="e.g. 2.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
              style={{ width: "100%", height: 36, padding: "0 10px", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", background: "var(--bg1)", fontSize: 13, color: "var(--t1)", outline: "none" }}
            />
          </div>
        </div>

        {/* Hours preview */}
        {validHours && (
          <div style={{ background: "var(--blue-bg)", border: "0.5px solid var(--blue)", borderRadius: "var(--rm)", padding: "8px 12px", fontSize: 12, color: "var(--blue)" }}>
            <i className="ti ti-clock" style={{ fontSize: 13, marginRight: 5 }} />
            Logging <strong>{hoursNum}h</strong>
            {hoursNum >= 1 && ` (${Math.floor(hoursNum)}h ${Math.round((hoursNum % 1) * 60)}m)`}
          </div>
        )}

        {/* Description */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--t2)", display: "block", marginBottom: 5 }}>Description</label>
          <textarea
            placeholder="What did you work on?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={{ width: "100%", padding: "8px 10px", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", background: "var(--bg1)", fontSize: 13, color: "var(--t1)", outline: "none", resize: "vertical", fontFamily: "inherit" }}
          />
        </div>

        {/* Billable toggle */}
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
            style={{ width: 14, height: 14, accentColor: "var(--blue)" }}
          />
          <span style={{ fontSize: 13, color: "var(--t2)" }}>Billable to client</span>
        </label>

        {error && <div style={{ fontSize: 12, color: "var(--red)", background: "var(--red-bg)", borderRadius: "var(--rm)", padding: "8px 12px" }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button type="button" className="btn-outline" onClick={handleClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <i className="ti ti-clock-plus" style={{ fontSize: 12 }} />
            {saving ? "Logging…" : "Log time"}
          </button>
        </div>
      </form>
    </div>
  );
}
