"use client";

import { useState, useEffect } from "react";
import Topbar from "@frontend/components/layout/Topbar";
import InvoiceList from "@frontend/components/invoices/InvoiceList";
import InvoiceDetail from "@frontend/components/invoices/InvoiceDetail";
import AddInvoiceModal from "@frontend/components/invoices/AddInvoiceModal";
import { useInvoices } from "@frontend/hooks/useInvoices";
import type { Invoice } from "@frontend/types";

type FilterStatus = "all" | "draft" | "sent" | "paid" | "overdue" | "cancelled";

export default function InvoicesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, refetch } = useInvoices({
    status: filter,
    search: debouncedSearch,
  });

  const invoices = data?.items ?? [];

  useEffect(() => {
    if (!loading && !selectedId && invoices.length > 0) {
      setSelectedId(invoices[0].id);
    }
  }, [loading, invoices, selectedId]);

  function handleCreated(invoice: Invoice) {
    refetch();
    setSelectedId(invoice.id);
  }

  return (
    <>
      <Topbar title="Invoices" />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <InvoiceList
          invoices={invoices}
          selectedId={selectedId}
          filter={filter}
          search={search}
          loading={loading}
          onSelect={setSelectedId}
          onFilterChange={setFilter}
          onSearchChange={setSearch}
          onAddClick={() => setShowAdd(true)}
        />
        <InvoiceDetail
          invoiceId={selectedId}
          onUpdated={refetch}
        />
      </div>

      <AddInvoiceModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
