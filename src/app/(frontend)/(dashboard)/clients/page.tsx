"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Topbar from "@frontend/components/layout/Topbar";
import ClientList from "@frontend/components/clients/ClientList";
import ClientDetail from "@frontend/components/clients/ClientDetail";
import { useClients } from "@frontend/hooks/useClients";
import type { Client, Invoice } from "@frontend/types";

const AddClientModal  = dynamic(() => import("@frontend/components/clients/AddClientModal"),  { ssr: false });
const EditClientModal = dynamic(() => import("@frontend/components/clients/EditClientModal"),  { ssr: false });
const AddInvoiceModal = dynamic(() => import("@frontend/components/invoices/AddInvoiceModal"), { ssr: false });

type FilterStatus = "all" | "active" | "pending" | "inactive";

export default function ClientsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  // Incrementing key forces ClientDetail to remount (and refetch) after an edit
  const [detailKey, setDetailKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, refetch } = useClients({
    status: filter,
    search: debouncedSearch,
  });

  const clients = data?.items ?? [];

  // Auto-select first record when list loads and nothing is selected
  useEffect(() => {
    if (!loading && !selectedId && clients.length > 0) {
      setSelectedId(clients[0].id);
    }
  }, [loading, clients, selectedId]);

  function handleCreated(client: Client) {
    refetch();
    setSelectedId(client.id);
  }

  function handleUpdated() {
    refetch();
    setShowEdit(false);
    setDetailKey((k) => k + 1); // force ClientDetail to refetch
  }

  function handleInvoiceCreated(_inv: Invoice) {
    setShowCreateInvoice(false);
    setDetailKey((k) => k + 1);
  }

  return (
    <>
      <Topbar title="Clients" />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <ClientList
          clients={clients}
          selectedId={selectedId}
          filter={filter}
          search={search}
          loading={loading}
          onSelect={setSelectedId}
          onFilterChange={setFilter}
          onSearchChange={setSearch}
          onAddClick={() => setShowAdd(true)}
        />

        <ClientDetail
          key={detailKey}
          clientId={selectedId}
          onEditClick={() => setShowEdit(true)}
          onCreateInvoice={() => setShowCreateInvoice(true)}
          onUpdated={refetch}
        />
      </div>

      <AddClientModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={handleCreated}
      />

      <EditClientModal
        open={showEdit}
        clientId={selectedId}
        onClose={() => setShowEdit(false)}
        onUpdated={handleUpdated}
      />

      <AddInvoiceModal
        open={showCreateInvoice}
        onClose={() => setShowCreateInvoice(false)}
        onCreated={handleInvoiceCreated}
        defaultClientId={selectedId ?? undefined}
      />
    </>
  );
}
