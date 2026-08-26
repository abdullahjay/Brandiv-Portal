import { getQueryClient } from "@frontend/lib/getQueryClient";

function qc() {
  return getQueryClient();
}

async function invalidatePrefix(prefix: readonly unknown[]) {
  await qc().invalidateQueries({ queryKey: prefix });
}

/** Run cache invalidations in the background — mutations return when the API succeeds, not when refetches finish. */
export function refreshAfter(...invalidations: Promise<void>[]) {
  void Promise.all(invalidations);
}

/** After recording income: balances, commissions, and any linked invoice may have changed. */
export function invalidateAfterIncomeRecord(opts?: { incomeId?: string; invoiceId?: string | null }) {
  const tasks: Promise<void>[] = [
    invalidateIncome(opts?.incomeId),
    invalidateFinancialData(),
    invalidateCommissions(),
  ];
  if (opts?.invoiceId) tasks.push(invalidateInvoices(opts.invoiceId));
  refreshAfter(...tasks);
}

export async function invalidateClients(id?: string) {
  await invalidatePrefix(["clients"]);
  if (id) await invalidatePrefix(["clients", id]);
}

export async function invalidateProjects(id?: string) {
  await invalidatePrefix(["projects"]);
  if (id) await invalidatePrefix(["projects", id]);
}

export async function invalidateInvoices(_id?: string) {
  // Prefix matches list + detail queries (["invoices", …]).
  await invalidatePrefix(["invoices"]);
}

export async function invalidateIncome(id?: string) {
  await invalidatePrefix(["income"]);
  if (id) await invalidatePrefix(["income", id]);
}

export async function invalidateExpenses() {
  await invalidatePrefix(["expenses"]);
}

export async function invalidateCommissions() {
  await invalidatePrefix(["commissions"]);
}

export async function invalidateAccounts() {
  await invalidatePrefix(["accounts"]);
}

export async function invalidateDistribution() {
  await Promise.all([
    invalidatePrefix(["distribution"]),
    invalidateAccounts(),
  ]);
}

export async function invalidateEmployees() {
  await invalidatePrefix(["employees"]);
}

export async function invalidateUsers() {
  await invalidatePrefix(["users"]);
}

export async function invalidatePayroll() {
  await invalidatePrefix(["payroll"]);
}

export async function invalidateLedger() {
  await invalidatePrefix(["ledger"]);
}

export async function invalidateDashboard() {
  await invalidatePrefix(["dashboard"]);
}

export async function invalidateTransfers() {
  await invalidatePrefix(["transfers"]);
}

export async function invalidateTimeEntries() {
  await invalidatePrefix(["time-entries"]);
}

export async function invalidateUpsells(projectId?: string) {
  await invalidatePrefix(["upsells"]);
  if (projectId) await invalidateProjects(projectId);
}

export async function invalidateSettings() {
  await invalidatePrefix(["settings"]);
}

export async function invalidateLookups() {
  await Promise.all([
    invalidatePrefix(["lookups"]),
    invalidatePrefix(["settings", "lookups"]),
  ]);
}

export async function invalidateCompensation() {
  await invalidatePrefix(["compensation"]);
}

/** Ledger, account balances, dashboard totals, distributions, transfers */
export async function invalidateFinancialData() {
  await Promise.all([
    invalidateLedger(),
    invalidateAccounts(),
    invalidateDashboard(),
    invalidatePrefix(["distribution"]),
    invalidateTransfers(),
  ]);
}
