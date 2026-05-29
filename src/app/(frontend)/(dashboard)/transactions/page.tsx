"use client";

import Topbar from "@frontend/components/layout/Topbar";
import LedgerList from "@frontend/components/ledger/LedgerList";

export default function TransactionsPage() {
  return (
    <>
      <Topbar title="Financial Ledger" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "16px 20px 20px" }}>
        <LedgerList />
      </div>
    </>
  );
}
