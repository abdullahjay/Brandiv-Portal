"use client";

import { useState } from "react";
import { useClient, updateClientRequest } from "@frontend/hooks/useClients";
import Avatar from "@frontend/components/ui/Avatar";
import Badge from "@frontend/components/ui/Badge";
import ProgressBar from "@frontend/components/ui/ProgressBar";
import type { ClientProject, ClientInvoice } from "@frontend/types";

interface ClientDetailProps {
  clientId: string | null;
  onEditClick: () => void;
  onCreateInvoice?: () => void;
  onUpdated?: () => void;
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

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ProjectRow({ p }: { p: ClientProject }) {
  const typeLabel = p.type.replace(/_/g, "-");
  return (
    <div className="trow">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>{p.name}</div>
        <div style={{ fontSize: 11, color: "var(--t2)" }}>{typeLabel}</div>
        <ProgressBar value={p.progressPct} />
      </div>
      <Badge status={p.status} />
      <div style={{ fontSize: 12, fontWeight: 500, minWidth: 70, textAlign: "right", flexShrink: 0 }}>
        {p.currency} {fmt(p.valueOriginal / 100)}
      </div>
    </div>
  );
}

function InvoiceRow({ inv }: { inv: ClientInvoice }) {
  return (
    <div className="trow">
      <div style={{ fontSize: 12, color: "var(--blue)", width: 82, flexShrink: 0, fontWeight: 500 }}>
        {inv.invoiceNumber}
      </div>
      <div style={{ fontSize: 11, color: "var(--t2)", flex: 1 }}>{fmtDate(inv.issueDate)}</div>
      <div style={{ fontSize: 12, fontWeight: 500 }}>
        {inv.currency} {fmt(inv.totalAmount / 100)}
      </div>
      <Badge status={inv.status} />
      {inv.status === "overdue" && (
        <button className="btn-primary" style={{ height: 24, fontSize: 10, padding: "0 8px" }}>
          Record
        </button>
      )}
    </div>
  );
}

export default function ClientDetail({ clientId, onEditClick, onCreateInvoice, onUpdated }: ClientDetailProps) {
  const { data: client, loading, refetch } = useClient(clientId);
  const [deactivating, setDeactivating] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDeactivate() {
    if (!client) return;
    setDeactivating(true);
    setActionError(null);
    try {
      await updateClientRequest(client.id, { status: "inactive" });
      setConfirmDeactivate(false);
      await refetch();
      onUpdated?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to deactivate client");
    } finally {
      setDeactivating(false);
    }
  }

  async function handleReactivate() {
    if (!client) return;
    setDeactivating(true);
    setActionError(null);
    try {
      await updateClientRequest(client.id, { status: "active" });
      await refetch();
      onUpdated?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to reactivate client");
    } finally {
      setDeactivating(false);
    }
  }

  if (!clientId) {
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
        <i className="ti ti-user-circle" style={{ fontSize: 40, color: "var(--t3)" }} />
        <p style={{ fontSize: 13 }}>Select a client to view details</p>
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

  if (!client) return null;

  const totalInvoiced = client.invoices?.reduce((s, inv) => s + inv.totalAmount / 100, 0) ?? 0;
  const lastInvoice = client.invoices?.[0];
  const isInactive = client.status === "inactive";

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
          <Avatar name={client.companyName} size={30} fontSize={10} />
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--t1)" }}>
            {client.companyName}
          </div>
          <Badge status={client.status} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {actionError && (
            <span style={{ fontSize: 11, color: "var(--red)" }}>{actionError}</span>
          )}
          {confirmDeactivate ? (
            <>
              <span style={{ fontSize: 12, color: "var(--t2)" }}>Mark as inactive?</span>
              <button
                className="btn-outline"
                style={{ color: "var(--red)", borderColor: "var(--red)" }}
                onClick={handleDeactivate}
                disabled={deactivating}
              >
                {deactivating ? <i className="ti ti-loader-2" style={{ fontSize: 12 }} /> : "Confirm"}
              </button>
              <button className="btn-outline" onClick={() => setConfirmDeactivate(false)}>Cancel</button>
            </>
          ) : (
            <>
              <button className="btn-outline" onClick={onEditClick}>
                <i className="ti ti-edit" style={{ fontSize: 12 }} /> Edit
              </button>
              {isInactive ? (
                <button
                  className="btn-outline"
                  style={{ color: "var(--green)", borderColor: "var(--green)" }}
                  onClick={handleReactivate}
                  disabled={deactivating}
                >
                  <i className="ti ti-refresh" style={{ fontSize: 12 }} />
                  {deactivating ? "…" : "Reactivate"}
                </button>
              ) : (
                <button
                  className="btn-outline"
                  style={{ color: "var(--red)" }}
                  onClick={() => setConfirmDeactivate(true)}
                >
                  <i className="ti ti-user-off" style={{ fontSize: 12 }} /> Deactivate
                </button>
              )}
              <button className="btn-outline" onClick={onCreateInvoice}>
                <i className="ti ti-file-invoice" style={{ fontSize: 12 }} /> New invoice
              </button>
            </>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {/* Metrics row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Total invoiced</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: "var(--t1)" }}>
              {client.currency} {fmt(totalInvoiced)}
            </div>
            <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 3 }}>
              {client.invoices?.length ?? 0} invoices
            </div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Projects</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: "var(--t1)" }}>
              {client._count?.projects ?? client.projects?.length ?? 0}
            </div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Last invoice</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", paddingTop: 4 }}>
              {lastInvoice ? fmtDate(lastInvoice.issueDate) : "—"}
            </div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Currency</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "var(--t1)", paddingTop: 4 }}>
              {client.currency}
            </div>
          </div>
        </div>

        {/* Contact info */}
        <Section
          title="Contact info"
          action={
            <button
              className="btn-outline"
              style={{ height: 26, fontSize: 11 }}
              onClick={onEditClick}
            >
              <i className="ti ti-edit" style={{ fontSize: 11 }} /> Edit
            </button>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <InfoItem
              label="Contact"
              value={`${client.contactName}${client.contactTitle ? ` · ${client.contactTitle}` : ""}`}
            />
            <InfoItem
              label="Email"
              value={
                <a href={`mailto:${client.email}`} style={{ color: "var(--blue)" }}>
                  {client.email}
                </a>
              }
            />
            <InfoItem label="Phone" value={client.phone || "—"} />
            <InfoItem
              label="Location"
              value={[client.city, client.country].filter(Boolean).join(", ") || "—"}
            />
            <InfoItem label="Source" value={client.source || "—"} />
            <InfoItem label="Referred by" value={client.referredBy?.name || "—"} />
            <InfoItem
              label="Partner / Stakeholder"
              value={
                client.partner
                  ? <span style={{ color: "var(--blue)" }}>{client.partner.name} ({Number(client.partner.sharePct)}% share)</span>
                  : "—"
              }
            />
            <InfoItem
              label="Commission rule"
              value={
                <span style={{ textTransform: "capitalize" }}>
                  {client.commissionRule === "none"
                    ? <span style={{ color: "var(--t3)" }}>None</span>
                    : client.commissionRule}
                </span>
              }
            />
            {client.commissionRule !== "none" && client.commissionPriorPayments > 0 && (
              <InfoItem
                label="Prior payments offset"
                value={
                  <span title="First payment in system treated as recurring due to this offset" style={{ color: "var(--blue)" }}>
                    {client.commissionPriorPayments} payment{client.commissionPriorPayments !== 1 ? "s" : ""} — starts at recurring rate
                  </span>
                }
              />
            )}
            <InfoItem label="Payment terms" value={client.paymentTerms || "—"} />
            <InfoItem
              label="Contract"
              value={<Badge status={client.contractStatus} />}
            />
          </div>
        </Section>

        {/* Projects */}
        <Section
          title="Projects"
          action={
            <span style={{ fontSize: 11, color: "var(--blue)", cursor: "pointer" }}>
              View all
            </span>
          }
        >
          {client.projects?.length ? (
            client.projects.map((p) => <ProjectRow key={p.id} p={p} />)
          ) : (
            <p style={{ fontSize: 12, color: "var(--t2)", textAlign: "center", padding: "12px 0" }}>
              No projects yet
            </p>
          )}
        </Section>

        {/* Invoices */}
        <Section
          title="Invoices"
          action={
            <span style={{ fontSize: 11, color: "var(--blue)", cursor: "pointer" }} onClick={onCreateInvoice}>+ New</span>
          }
        >
          {client.invoices?.length ? (
            client.invoices.map((inv) => <InvoiceRow key={inv.id} inv={inv} />)
          ) : (
            <p style={{ fontSize: 12, color: "var(--t2)", textAlign: "center", padding: "12px 0" }}>
              No invoices yet
            </p>
          )}
        </Section>

        {/* Notes */}
        {client.notes && (
          <Section title="Notes">
            <p style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.6 }}>{client.notes}</p>
          </Section>
        )}
      </div>
    </div>
  );
}
