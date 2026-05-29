"use client";

import { useState, useEffect } from "react";
import Topbar from "@frontend/components/layout/Topbar";
import CommissionList from "@frontend/components/commissions/CommissionList";
import CommissionDetail from "@frontend/components/commissions/CommissionDetail";
import { useCommissions } from "@frontend/hooks/useCommissions";
import type { Commission } from "@frontend/types";

type FilterStatus = "all" | "pending" | "approved" | "paid";

export default function CommissionsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, refetch } = useCommissions({ status: filter });

  const allCommissions = data?.items ?? [];

  const commissions = debouncedSearch
    ? allCommissions.filter((c) => {
        const q = debouncedSearch.toLowerCase();
        return (
          c.stakeholderAccount.name.toLowerCase().includes(q) ||
          c.client.companyName.toLowerCase().includes(q) ||
          c.period.toLowerCase().includes(q)
        );
      })
    : allCommissions;

  const selectedCommission: Commission | null = commissions.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!loading && !selectedId && commissions.length > 0) {
      setSelectedId(commissions[0].id);
    }
  }, [loading, commissions, selectedId]);

  function handleApproved() {
    refetch();
  }

  function handleSelect(id: string) {
    setSelectedId(id);
  }

  function handleFilterChange(f: FilterStatus) {
    setFilter(f);
    setSelectedId(null);
  }

  return (
    <>
      <Topbar title="Commissions" />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <CommissionList
          commissions={commissions}
          selectedId={selectedId}
          filter={filter}
          search={search}
          loading={loading}
          onSelect={handleSelect}
          onFilterChange={handleFilterChange}
          onSearchChange={setSearch}
        />
        <CommissionDetail
          commission={selectedCommission}
          loading={false}
          onApproved={handleApproved}
        />
      </div>
    </>
  );
}
