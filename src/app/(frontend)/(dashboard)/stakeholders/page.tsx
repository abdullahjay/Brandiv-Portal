"use client";

import { useState } from "react";
import Topbar from "@frontend/components/layout/Topbar";
import StakeholderList from "@frontend/components/stakeholders/StakeholderList";
import StakeholderDetail from "@frontend/components/stakeholders/StakeholderDetail";
import AddStakeholderModal from "@frontend/components/stakeholders/AddStakeholderModal";
import { useAccounts } from "@frontend/hooks/useAccounts";
import type { CrmAccount } from "@frontend/types";

export default function StakeholdersPage() {
  const { data: accounts, loading, refetch } = useAccounts("stakeholder");
  const [selected, setSelected] = useState<CrmAccount | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  function handleCreated(account: CrmAccount) {
    refetch();
    setSelected(account);
  }

  function handleUpdated(updated: CrmAccount) {
    refetch();
    setSelected(updated);
  }

  function handleDeleted(id: string) {
    refetch();
    setSelected((prev) => (prev?.id === id ? null : prev));
  }

  return (
    <>
      <Topbar title="Stakeholders" />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left panel — list */}
        <div style={{ width: 280, minWidth: 280, borderRight: "0.5px solid var(--b3)", overflowY: "auto", background: "var(--bg1)" }}>
          <StakeholderList
            stakeholders={accounts}
            selected={selected}
            onSelect={setSelected}
            onAdd={() => setShowAdd(true)}
            loading={loading}
          />
        </div>

        {/* Right panel — detail or empty state */}
        <div style={{ flex: 1, overflowY: "auto", background: "var(--bg1)" }}>
          {!selected ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: "var(--t3)" }}>
              <i className="ti ti-user-share" style={{ fontSize: 40 }} />
              <div style={{ fontSize: 14, color: "var(--t2)" }}>Select a stakeholder to view details</div>
              <div style={{ fontSize: 12 }}>or add a new one</div>
              <button className="btn-primary" style={{ marginTop: 4 }} onClick={() => setShowAdd(true)}>
                <i className="ti ti-plus" style={{ fontSize: 12 }} /> Add stakeholder
              </button>
            </div>
          ) : (
            <StakeholderDetail
              stakeholder={selected}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          )}
        </div>
      </div>

      <AddStakeholderModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
