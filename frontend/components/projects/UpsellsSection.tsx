"use client";

import { useState } from "react";
import Badge from "@frontend/components/ui/Badge";
import AddUpsellModal from "@frontend/components/projects/AddUpsellModal";
import { approveUpsellRequest, cancelUpsellRequest, deleteUpsellRequest } from "@frontend/hooks/useUpsells";
import type { ProjectUpsell } from "@frontend/types";

interface UpsellsSectionProps {
  projectId: string;
  currency: string;
  upsells: ProjectUpsell[];
  onChanged: () => void;
}

// Realized commissions are always actual PKR (paid from the PKR operating
// account). Upsell sale amounts/previews are in the project's own currency —
// there's no FX conversion pipeline, matching how project value works.
function fmtPkr(n: number) {
  return `PKR ${(n / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtAmount(n: number, currency: string) {
  return `${currency} ${(n / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function upsellAmountUnits(upsell: ProjectUpsell) {
  return (upsell.amountOriginal ?? upsell.amountPkr) / 100;
}

function upsellCurrency(upsell: ProjectUpsell, fallback: string) {
  return upsell.currency ?? fallback;
}

function UpsellRow({ projectId, currency, upsell, onChanged, onEdit }: { projectId: string; currency: string; upsell: ProjectUpsell; onChanged: () => void; onEdit: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleApprove() {
    setBusy("approve");
    setActionError(null);
    try {
      await approveUpsellRequest(projectId, upsell.id);
      onChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel() {
    if (!confirm(`Cancel upsell "${upsell.title}"?`)) return;
    setBusy("cancel");
    setActionError(null);
    try {
      await cancelUpsellRequest(projectId, upsell.id);
      onChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete upsell "${upsell.title}"?`)) return;
    setBusy("delete");
    setActionError(null);
    try {
      await deleteUpsellRequest(projectId, upsell.id);
      onChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(null);
    }
  }

  const displayCurrency = upsellCurrency(upsell, currency);
  const amountUnits = upsellAmountUnits(upsell);
  const commissionPreview = amountUnits * (upsell.commissionRatePct / 100);
  const canEditOrDelete = upsell.status === "pending";
  const canCancel = ["pending", "approved", "active"].includes(upsell.status);

  return (
    <div className="trow" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>{upsell.title}</div>
          <div style={{ fontSize: 11, color: "var(--t2)" }}>
            {upsell.earnerAccount?.name ?? "Unknown"}
            {upsell.managingPartner && ` · managed by ${upsell.managingPartner.name}`}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <Badge status={upsell.billingMode} size="sm" />
          <Badge status={upsell.status} size="sm" />
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{fmtAmount((upsell.amountOriginal ?? upsell.amountPkr), displayCurrency)}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, color: "var(--t3)" }}>
          Commission preview: {upsell.commissionRatePct}% = {fmtAmount(commissionPreview * 100, displayCurrency)}
          {upsell.managingPartner && upsell.managingCommissionRatePct > 0 &&
            ` · managing ${upsell.managingCommissionRatePct}%`}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {actionError && <span style={{ fontSize: 11, color: "var(--red)" }}>{actionError}</span>}
          {upsell.status === "pending" && (
            <button className="btn-outline" style={{ height: 24, fontSize: 11 }} onClick={handleApprove} disabled={busy !== null}>
              {busy === "approve" ? <i className="ti ti-loader-2" style={{ fontSize: 11 }} /> : "Approve"}
            </button>
          )}
          {canEditOrDelete && (
            <button className="btn-outline" style={{ height: 24, fontSize: 11 }} onClick={onEdit} disabled={busy !== null}>Edit</button>
          )}
          {canCancel && (
            <button className="btn-outline" style={{ height: 24, fontSize: 11, color: "var(--red)" }} onClick={upsell.status === "pending" ? handleDelete : handleCancel} disabled={busy !== null}>
              {busy === "delete" || busy === "cancel" ? <i className="ti ti-loader-2" style={{ fontSize: 11 }} /> : (upsell.status === "pending" ? "Delete" : "Cancel")}
            </button>
          )}
        </div>
      </div>

      {upsell.commissions && upsell.commissions.length > 0 && (
        <div style={{ borderTop: "0.5px solid var(--b3)", paddingTop: 6, marginTop: 2 }}>
          {upsell.commissions.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--t2)" }}>
              <span>{c.commissionType.replace(/_/g, " ")}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {fmtPkr(c.commissionPkr)}
                <Badge status={c.status} size="sm" />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UpsellsSection({ projectId, currency, upsells, onChanged }: UpsellsSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectUpsell | null>(null);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(u: ProjectUpsell) {
    setEditing(u);
    setModalOpen(true);
  }

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>Upsells</div>
        <span style={{ fontSize: 11, color: "var(--blue)", cursor: "pointer" }} onClick={openAdd}>+ Add upsell</span>
      </div>

      {upsells.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {upsells.map((u) => (
            <UpsellRow key={u.id} projectId={projectId} currency={currency} upsell={u} onChanged={onChanged} onEdit={() => openEdit(u)} />
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: "var(--t2)", textAlign: "center", padding: "12px 0" }}>
          No upsells yet
        </p>
      )}

      <AddUpsellModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        projectId={projectId}
        defaultCurrency={currency}
        upsell={editing}
        onSaved={onChanged}
      />
    </div>
  );
}
