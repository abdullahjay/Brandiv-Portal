"use client";

import { useState, useEffect } from "react";
import { createTimeEntryRequest } from "@frontend/hooks/useTimeEntries";
import Modal from "@frontend/components/ui/Modal";
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

  async function handleSubmit() {
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

  const hoursNum = parseFloat(hours);
  const validHours = !isNaN(hoursNum) && hoursNum > 0 && hoursNum <= 24;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Log time"
      width="narrow"
      footer={
        <>
          <button className="btn-outline" onClick={handleClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving || !projectId || !hours}>
            <i className="ti ti-clock-plus" style={{ fontSize: 12 }} />
            {saving ? "Logging…" : "Log time"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Project */}
        <div className="frow">
          <label>Project <span style={{ color: "var(--red)" }}>*</span></label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
            <option value="">Select project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.client.companyName} — {p.name}</option>
            ))}
          </select>
        </div>

        {/* Date + Hours */}
        <div className="f2">
          <div className="frow">
            <label>Date <span style={{ color: "var(--red)" }}>*</span></label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="frow">
            <label>Hours <span style={{ color: "var(--red)" }}>*</span></label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              max="24"
              placeholder="e.g. 2.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
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
        <div className="frow">
          <label>Description</label>
          <textarea
            placeholder="What did you work on?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
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

        {error && (
          <div style={{ fontSize: 12, color: "var(--red)", background: "var(--red-bg)", borderRadius: "var(--rm)", padding: "8px 12px" }}>
            {error}
          </div>
        )}

      </div>
    </Modal>
  );
}
