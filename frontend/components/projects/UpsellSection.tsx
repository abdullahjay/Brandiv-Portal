"use client";

import { useState } from "react";
import Badge from "@frontend/components/ui/Badge";
import AddUpsellModal from "./AddUpsellModal";
import { useUpsells, approveUpsellRequest, deleteUpsellRequest } from "@frontend/hooks/useUpsells";
import type { ProjectUpsell } from "@frontend/types";

interface Props {
  projectId: string;
}

function fmtPkr(paise: number) {
  return `PKR ${(paise / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function UpsellRow({
  upsell,
  projectId,
  onRefresh,
}: {
  upsell: ProjectUpsell;
  projectId: string;
  onRefresh: () => void;
}) {
  const [approving, setApproving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleApprove() {
    setApproving(true);
    setErr(null);
    try {
      await approveUpsellRequest(projectId, upsell.id);
      onRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setApproving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this upsell?")) return;
    setDeleting(true);
    setErr(null);
    try {
      await deleteUpsellRequest(projectId, upsell.id);
      onRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setDeleting(false);
    }
  }

  const commissionPkr = upsell.commissions[0]?.commissionPkr;

  return (
    <div className="trow" style={{ flexWrap: "wrap", gap: 4 }}>
      {/* Left: source + description */}
      <div style={{ flex: "1 1 180px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Badge
            status={upsell.source === "addon" ? "info" : "recurring"}
            label={upsell.source === "addon" ? "Add-on" : "Value ↑"}
            size="sm"
          />
          <span style={{ fontSize: 12, color: "var(--t1)", fontWeight: 500 }}>
            {fmtPkr(upsell.incrementPkr)}
          </span>
          <span style={{ fontSize: 11, color: "var(--t3)" }}>× {Number(upsell.ratePct)}%</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 2 }}>
          {upsell.earnerAccount.name} · {upsell.period}
        </div>
        {upsell.description && (
          <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {upsell.description}
          </div>
        )}
      </div>

      {/* Right: commission + status + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {commissionPkr != null && (
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)" }}>
            {fmtPkr(commissionPkr)}
          </span>
        )}
        <Badge status={upsell.status} size="sm" />

        {upsell.status === "pending" && (
          <>
            <button
              className="btn-outline"
              style={{ height: 24, fontSize: 10, paddingInline: 8, color: "var(--green)" }}
              onClick={handleApprove}
              disabled={approving}
            >
              {approving ? <i className="ti ti-loader-2" style={{ fontSize: 10 }} /> : "Approve"}
            </button>
            <button
              className="btn-outline"
              style={{ height: 24, fontSize: 10, paddingInline: 8, color: "var(--red)" }}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <i className="ti ti-loader-2" style={{ fontSize: 10 }} /> : <i className="ti ti-trash" style={{ fontSize: 10 }} />}
            </button>
          </>
        )}
        {err && <span style={{ fontSize: 10, color: "var(--red)" }}>{err}</span>}
      </div>
    </div>
  );
}

export default function UpsellSection({ projectId }: Props) {
  const { data, loading, refetch } = useUpsells(projectId);
  const [showAdd, setShowAdd] = useState(false);

  const totalApproved = data
    .filter((u) => u.status !== "pending")
    .reduce((s, u) => s + u.commissions.reduce((cs, c) => cs + c.commissionPkr, 0), 0);

  return (
    <>
      <div
        style={{
          background: "var(--bg1)",
          border: "0.5px solid var(--b3)",
          borderRadius: "var(--rl)",
          padding: 16,
          marginBottom: 14,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>Upsells</span>
            {totalApproved > 0 && (
              <span style={{ fontSize: 11, color: "var(--t2)", marginLeft: 8 }}>
                {fmtPkr(totalApproved)} commission
              </span>
            )}
          </div>
          <button
            className="btn-outline"
            style={{ height: 26, fontSize: 11 }}
            onClick={() => setShowAdd(true)}
          >
            <i className="ti ti-plus" style={{ fontSize: 11 }} /> Add
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ fontSize: 12, color: "var(--t3)", textAlign: "center", padding: "10px 0" }}>
            <i className="ti ti-loader-2" style={{ fontSize: 14 }} />
          </div>
        ) : data.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--t2)", textAlign: "center", padding: "12px 0" }}>
            No upsells yet
          </p>
        ) : (
          data.map((u) => (
            <UpsellRow key={u.id} upsell={u} projectId={projectId} onRefresh={refetch} />
          ))
        )}
      </div>

      <AddUpsellModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        projectId={projectId}
        onCreated={refetch}
      />
    </>
  );
}
