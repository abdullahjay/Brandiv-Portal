"use client";

import { useState, useEffect } from "react";
import Topbar from "@frontend/components/layout/Topbar";
import ExpenseList from "@frontend/components/expenses/ExpenseList";
import ExpenseDetail from "@frontend/components/expenses/ExpenseDetail";
import AddExpenseModal from "@frontend/components/expenses/AddExpenseModal";
import { useExpenses } from "@frontend/hooks/useExpenses";
import type { Expense } from "@frontend/types";

export default function ExpensesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, refetch } = useExpenses({ search: debouncedSearch });

  const expenses = data?.items ?? [];
  const selectedExpense: Expense | null = expenses.find((e) => e.id === selectedId) ?? null;

  useEffect(() => {
    if (!loading && !selectedId && expenses.length > 0) {
      setSelectedId(expenses[0].id);
    }
  }, [loading, expenses, selectedId]);

  function handleCreated(expense: Expense) {
    refetch();
    setSelectedId(expense.id);
  }

  function handleDeleted() {
    setSelectedId(null);
    refetch();
  }

  return (
    <>
      <Topbar title="Expenses" />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <ExpenseList
          expenses={expenses}
          selectedId={selectedId}
          search={search}
          loading={loading}
          onSelect={setSelectedId}
          onSearchChange={setSearch}
          onAddClick={() => setShowAdd(true)}
        />
        <ExpenseDetail
          expense={selectedExpense}
          loading={false}
          onDeleted={handleDeleted}
        />
      </div>

      <AddExpenseModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
