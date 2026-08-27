import type { QueryClient } from "@tanstack/react-query";
import { serializeForClient } from "@backend/lib/serialize";
import { listClients } from "@backend/services/clientService";
import { listProjects } from "@backend/services/projectService";
import { listInvoices } from "@backend/services/invoiceService";
import { listIncome } from "@backend/services/incomeService";
import { listExpenses } from "@backend/services/expenseService";
import { listCommissions } from "@backend/services/commissionService";
import { listAccounts } from "@backend/services/accountService";
import { listEmployees } from "@backend/services/employeeService";
import { listUsers } from "@backend/services/userService";
import { listPayroll } from "@backend/services/payrollService";
import { getDistributionPreview, listDistributions } from "@backend/services/distributionService";
import { listLedgerEntries, type LedgerQuery } from "@backend/repositories/ledgerRepository";
import { listTransfers } from "@backend/services/transferService";
import { listTimeEntries } from "@backend/services/timeEntryService";
import { fetchPnL, fetchCashFlow } from "@backend/services/statementService";
import { getAllSettings, getFxRates, listLookups } from "@backend/services/settingService";
import { getAllEmployeesWithCompensationHistory } from "@backend/services/compensationService";
import { getDashboardData } from "@backend/repositories/dashboardRepository";
import { apiFetch } from "@frontend/lib/apiFetch";
import { currentPeriod } from "@frontend/lib/period";
import type {
  Client,
  Commission,
  CrmAccount,
  CashFlowStatement,
  DistributionPreview,
  DistributionRecord,
  Employee,
  EmployeeWithCompensations,
  Expense,
  IncomeListResponse,
  Invoice,
  LedgerPage,
  LookupItem,
  PaginatedResponse,
  PayrollRecord,
  PnLStatement,
  Project,
  TeamUser,
  TimeEntry,
  TransferRecord,
} from "@frontend/types";
import type { AppSettings } from "@frontend/hooks/useSettings";

/** Server prefetch must serialize Prisma BigInt/Decimal before React Query dehydration. */
async function serverQuery<T>(fn: () => Promise<T>): Promise<T> {
  return serializeForClient(await fn());
}

// ─── Clients ────────────────────────────────────────────────────────────────

export type ClientsQueryParams = {
  status?: "active" | "pending" | "inactive" | "all";
  search?: string;
  page?: number;
};

export function clientsQueryKey(params: ClientsQueryParams = {}) {
  const { status = "all", search = "", page = 1 } = params;
  return ["clients", { status, search, page }] as const;
}

export async function fetchClients(params: ClientsQueryParams = {}) {
  const { status = "all", search = "", page = 1 } = params;
  const qs = new URLSearchParams({
    status,
    page: String(page),
    ...(search && { search }),
  });
  return apiFetch<PaginatedResponse<Client>>(`/api/clients?${qs}`);
}

export async function prefetchClients(qc: QueryClient, params: ClientsQueryParams = {}) {
  const { status = "all", search = "", page = 1 } = params;
  await qc.prefetchQuery({
    queryKey: clientsQueryKey(params),
    queryFn: () => serverQuery(() => listClients({ status, search: search || undefined, page, pageSize: 50 })),
  });
}

// ─── Projects ───────────────────────────────────────────────────────────────

export type ProjectsQueryParams = {
  status?: "active" | "pending" | "done" | "cancelled" | "all";
  type?: "one_time" | "recurring" | "milestone" | "all";
  clientId?: string;
  search?: string;
  page?: number;
};

export function projectsQueryKey(params: ProjectsQueryParams = {}) {
  const { status = "all", type = "all", clientId, search = "", page = 1 } = params;
  return ["projects", { status, type, clientId, search, page }] as const;
}

export async function fetchProjects(params: ProjectsQueryParams = {}) {
  const { status = "all", type = "all", clientId, search = "", page = 1 } = params;
  const qs = new URLSearchParams({
    status,
    type,
    page: String(page),
    ...(search && { search }),
    ...(clientId && { clientId }),
  });
  return apiFetch<PaginatedResponse<Project>>(`/api/projects?${qs}`);
}

export async function prefetchProjects(qc: QueryClient, params: ProjectsQueryParams = {}) {
  const { status = "all", type = "all", clientId, search = "", page = 1 } = params;
  await qc.prefetchQuery({
    queryKey: projectsQueryKey(params),
    queryFn: () =>
      serverQuery(() =>
      listProjects({
        status,
        type,
        clientId,
        search: search || undefined,
        page,
        pageSize: 50,
      })),
  });
}

// ─── Invoices ───────────────────────────────────────────────────────────────

export type InvoicesQueryParams = {
  status?: "all" | "draft" | "sent" | "paid" | "overdue" | "cancelled";
  clientId?: string;
  projectId?: string;
  search?: string;
  page?: number;
};

export function invoicesQueryKey(params: InvoicesQueryParams = {}) {
  const { status = "all", clientId, projectId, search = "", page = 1 } = params;
  return ["invoices", { status, clientId, projectId, search, page }] as const;
}

export async function fetchInvoices(params: InvoicesQueryParams = {}) {
  const { status = "all", clientId, projectId, search = "", page = 1 } = params;
  const qs = new URLSearchParams({
    status,
    page: String(page),
    ...(search && { search }),
    ...(clientId && { clientId }),
    ...(projectId && { projectId }),
  });
  return apiFetch<PaginatedResponse<Invoice>>(`/api/invoices?${qs}`);
}

export async function prefetchInvoices(qc: QueryClient, params: InvoicesQueryParams = {}) {
  const { status = "all", clientId, projectId, search = "", page = 1 } = params;
  await qc.prefetchQuery({
    queryKey: invoicesQueryKey(params),
    queryFn: () =>
      serverQuery(() =>
      listInvoices({
        status,
        clientId,
        projectId,
        search: search || undefined,
        page,
        pageSize: 50,
      })),
  });
}

// ─── Income ─────────────────────────────────────────────────────────────────

export type IncomeQueryParams = {
  status?: "all" | "pending" | "cleared";
  clientId?: string;
  period?: string;
  search?: string;
  page?: number;
};

export function incomeQueryKey(params: IncomeQueryParams = {}) {
  const { status = "all", clientId, period, search = "", page = 1 } = params;
  return ["income", { status, clientId, period, search, page }] as const;
}

export async function fetchIncome(params: IncomeQueryParams = {}) {
  const { status = "all", clientId, period, search = "", page = 1 } = params;
  const qs = new URLSearchParams({
    status,
    page: String(page),
    ...(search && { search }),
    ...(clientId && { clientId }),
    ...(period && { period }),
  });
  return apiFetch<IncomeListResponse>(`/api/income?${qs}`);
}

export async function prefetchIncome(qc: QueryClient, params: IncomeQueryParams = {}) {
  const { status = "all", clientId, period, search = "", page = 1 } = params;
  await qc.prefetchQuery({
    queryKey: incomeQueryKey(params),
    queryFn: () =>
      serverQuery(() =>
      listIncome({
        status,
        clientId,
        period,
        search: search || undefined,
        page,
        pageSize: 50,
      })),
  });
}

// ─── Expenses ───────────────────────────────────────────────────────────────

export type ExpensesQueryParams = {
  category?: string;
  projectId?: string;
  period?: string;
  search?: string;
  page?: number;
};

export function expensesQueryKey(params: ExpensesQueryParams = {}) {
  const { category, projectId, period, search, page = 1 } = params;
  return ["expenses", { category, projectId, period, search, page }] as const;
}

export async function fetchExpenses(params: ExpensesQueryParams = {}) {
  const { category, projectId, period, search, page = 1 } = params;
  const qs = new URLSearchParams({ page: String(page) });
  if (category) qs.set("category", category);
  if (projectId) qs.set("projectId", projectId);
  if (period) qs.set("period", period);
  if (search) qs.set("search", search);
  return apiFetch<PaginatedResponse<Expense>>(`/api/expenses?${qs}`);
}

export async function prefetchExpenses(qc: QueryClient, params: ExpensesQueryParams = {}) {
  const { category, projectId, period, search, page = 1 } = params;
  await qc.prefetchQuery({
    queryKey: expensesQueryKey(params),
    queryFn: () =>
      serverQuery(() =>
      listExpenses({
        category,
        projectId,
        period,
        search,
        page,
        pageSize: 50,
      })),
  });
}

// ─── Commissions ────────────────────────────────────────────────────────────

export type CommissionsQueryParams = {
  status?: "all" | "pending" | "approved" | "paid";
  stakeholderAccountId?: string;
  clientId?: string;
  period?: string;
  page?: number;
};

export function commissionsQueryKey(params: CommissionsQueryParams = {}) {
  const { status = "all", stakeholderAccountId, clientId, period, page = 1 } = params;
  return ["commissions", { status, stakeholderAccountId, clientId, period, page }] as const;
}

export async function fetchCommissions(params: CommissionsQueryParams = {}) {
  const { status = "all", stakeholderAccountId, clientId, period, page = 1 } = params;
  const qs = new URLSearchParams({ status, page: String(page) });
  if (stakeholderAccountId) qs.set("stakeholderAccountId", stakeholderAccountId);
  if (clientId) qs.set("clientId", clientId);
  if (period) qs.set("period", period);
  return apiFetch<PaginatedResponse<Commission>>(`/api/commissions?${qs}`);
}

export async function prefetchCommissions(qc: QueryClient, params: CommissionsQueryParams = {}) {
  const { status = "all", stakeholderAccountId, clientId, period, page = 1 } = params;
  await qc.prefetchQuery({
    queryKey: commissionsQueryKey(params),
    queryFn: () =>
      serverQuery(() =>
      listCommissions({
        status,
        stakeholderAccountId,
        clientId,
        period,
        page,
        pageSize: 50,
      })),
  });
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export { currentPeriod };

export function dashboardQueryKey(period?: string) {
  const p = period === "" ? "all" : (period ?? currentPeriod());
  return ["dashboard", p] as const;
}

export async function fetchDashboard(period?: string) {
  const p = period === "" ? "all" : (period ?? currentPeriod());
  return apiFetch<Awaited<ReturnType<typeof getDashboardData>>>(`/api/dashboard?period=${encodeURIComponent(p)}`);
}

export async function prefetchDashboard(qc: QueryClient, period?: string) {
  const p = period ?? currentPeriod();
  const apiPeriod = p === "" ? "all" : p;
  await qc.prefetchQuery({
    queryKey: dashboardQueryKey(p),
    queryFn: () => serverQuery(() => getDashboardData(apiPeriod)),
  });
}

// ─── Ledger ─────────────────────────────────────────────────────────────────

export type LedgerQueryParams = {
  period?: string;
  type?: LedgerQuery["type"];
  page?: number;
  pageSize?: number;
};

export function ledgerQueryKey(params: LedgerQueryParams = {}) {
  return ["ledger", params] as const;
}

export async function fetchLedger(params: LedgerQueryParams = {}) {
  const { period, type, page = 1, pageSize = 50 } = params;
  const qs = new URLSearchParams();
  if (period) qs.set("period", period);
  if (type) qs.set("type", type);
  if (page) qs.set("page", String(page));
  if (pageSize) qs.set("pageSize", String(pageSize));
  return apiFetch<LedgerPage>(`/api/ledger?${qs.toString()}`);
}

export async function prefetchLedger(qc: QueryClient, params: LedgerQueryParams = {}) {
  const { period, type, page = 1, pageSize = 50 } = params;
  await qc.prefetchQuery({
    queryKey: ledgerQueryKey(params),
    queryFn: () => serverQuery(() => listLedgerEntries({ period, type, page, pageSize })),
  });
}

// ─── Accounts ───────────────────────────────────────────────────────────────

export function accountsQueryKey(type: string = "all") {
  return ["accounts", type] as const;
}

export async function fetchAccounts(type?: "operating" | "company_reserve" | "stakeholder" | "all") {
  const qs = new URLSearchParams(type && type !== "all" ? { type } : {});
  return apiFetch<CrmAccount[]>(`/api/accounts?${qs}`);
}

export async function prefetchAccounts(qc: QueryClient, type: string = "all") {
  await qc.prefetchQuery({
    queryKey: accountsQueryKey(type),
    queryFn: () => serverQuery(() => listAccounts({ type: type as "operating" | "company_reserve" | "stakeholder" | "all" })),
  });
}

export function distributionPreviewQueryKey() {
  return ["distribution", "preview"] as const;
}

export function distributionsQueryKey() {
  return ["distribution", "list"] as const;
}

export async function fetchDistributionPreview() {
  return apiFetch<DistributionPreview>("/api/distribution/preview");
}

export async function fetchDistributions() {
  return apiFetch<DistributionRecord[]>("/api/distribution");
}

export async function prefetchDistributionPreview(qc: QueryClient) {
  await qc.prefetchQuery({
    queryKey: distributionPreviewQueryKey(),
    queryFn: () => serverQuery(getDistributionPreview),
  });
}

export async function prefetchDistributions(qc: QueryClient) {
  await qc.prefetchQuery({
    queryKey: distributionsQueryKey(),
    queryFn: () => serverQuery(listDistributions),
  });
}

export async function prefetchAccountsPage(qc: QueryClient) {
  await Promise.all([
    prefetchAccounts(qc),
    prefetchDistributionPreview(qc),
    prefetchDistributions(qc),
  ]);
}

// ─── Employees ──────────────────────────────────────────────────────────────

export type EmployeesQueryParams = {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export function employeesQueryKey(params: EmployeesQueryParams = {}) {
  const { search = "", status = "all", page = 1, pageSize = 50 } = params;
  return ["employees", { search, status, page, pageSize }] as const;
}

export async function fetchEmployees(params: EmployeesQueryParams = {}) {
  const { search = "", status = "all", page = 1, pageSize = 50 } = params;
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) qs.set("search", search);
  if (status && status !== "all") qs.set("status", status);
  return apiFetch<PaginatedResponse<Employee>>(`/api/employees?${qs}`);
}

export async function prefetchEmployees(qc: QueryClient, params: EmployeesQueryParams = {}) {
  const { search = "", status = "all", page = 1, pageSize = 50 } = params;
  await qc.prefetchQuery({
    queryKey: employeesQueryKey(params),
    queryFn: () =>
      serverQuery(() =>
      listEmployees({
        search: search || undefined,
        status: status as "active" | "inactive" | "all",
        page,
        pageSize,
      })),
  });
}

// ─── Users ──────────────────────────────────────────────────────────────────

export type UsersQueryParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
  status?: string;
};

function parseUserListFilters(role = "", status = "") {
  return {
    role: role || undefined,
    status: status || undefined,
  } as {
    role?: "super_admin" | "admin" | "manager" | "staff" | "finance";
    status?: "active" | "inactive";
  };
}

export function usersQueryKey(params: UsersQueryParams = {}) {
  const { page = 1, pageSize = 50, search = "", role = "", status = "" } = params;
  return ["users", { page, pageSize, search, role, status }] as const;
}

export async function fetchUsers(params: UsersQueryParams = {}) {
  const { page = 1, pageSize = 50, search = "", role = "", status = "" } = params;
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) qs.set("search", search);
  if (role) qs.set("role", role);
  if (status) qs.set("status", status);
  return apiFetch<PaginatedResponse<TeamUser>>(`/api/users?${qs}`);
}

export async function prefetchUsers(qc: QueryClient, params: UsersQueryParams = {}) {
  const { page = 1, pageSize = 50, search = "", role = "", status = "" } = params;
  const filters = parseUserListFilters(role, status);
  await qc.prefetchQuery({
    queryKey: usersQueryKey(params),
    queryFn: () =>
      serverQuery(() =>
      listUsers({
        page,
        pageSize,
        search: search || undefined,
        ...filters,
      })),
  });
}

// ─── Payroll ────────────────────────────────────────────────────────────────

export type PayrollQueryParams = {
  status?: "all" | "pending" | "paid";
  userId?: string;
  period?: string;
  page?: number;
};

export function payrollQueryKey(params: PayrollQueryParams = {}) {
  const { status = "all", userId, period, page = 1 } = params;
  return ["payroll", { status, userId, period, page }] as const;
}

export async function fetchPayroll(params: PayrollQueryParams = {}) {
  const { status = "all", userId, period, page = 1 } = params;
  const qs = new URLSearchParams({ status, page: String(page) });
  if (userId) qs.set("userId", userId);
  if (period) qs.set("period", period);
  return apiFetch<PaginatedResponse<PayrollRecord>>(`/api/payroll?${qs}`);
}

export async function prefetchPayroll(qc: QueryClient, params: PayrollQueryParams = {}) {
  const { status = "all", userId, period, page = 1 } = params;
  await qc.prefetchQuery({
    queryKey: payrollQueryKey(params),
    queryFn: () =>
      serverQuery(() =>
      listPayroll({
        status,
        userId,
        period,
        page,
        pageSize: 50,
      })),
  });
}

export async function prefetchPayrollPage(qc: QueryClient) {
  const period = currentPeriod();
  await Promise.all([
    prefetchPayroll(qc, { status: "all", period }),
    prefetchEmployees(qc, { search: "", status: "active", page: 1, pageSize: 200 }),
  ]);
}

// ─── Transfers ────────────────────────────────────────────────────────────────

export function transfersQueryKey(period: string) {
  return ["transfers", period] as const;
}

export async function fetchTransfers(period: string) {
  const url = period ? `/api/transfers?period=${period}` : "/api/transfers";
  return apiFetch<TransferRecord[]>(url);
}

export async function prefetchTransfers(qc: QueryClient, period?: string) {
  const p = period ?? currentPeriod();
  await qc.prefetchQuery({
    queryKey: transfersQueryKey(p),
    queryFn: () => serverQuery(() => listTransfers(p)),
  });
}

export async function prefetchTransfersPage(qc: QueryClient) {
  await Promise.all([prefetchTransfers(qc), prefetchAccounts(qc)]);
}

// ─── Time entries ───────────────────────────────────────────────────────────

export type TimeEntriesQueryParams = {
  period?: string;
  projectId?: string;
  userId?: string;
  billable?: boolean;
  page?: number;
  pageSize?: number;
};

export function timeEntriesQueryKey(params: TimeEntriesQueryParams = {}) {
  return ["time-entries", params] as const;
}

export async function fetchTimeEntries(params: TimeEntriesQueryParams = {}) {
  const qs = new URLSearchParams();
  if (params.period) qs.set("period", params.period);
  if (params.projectId) qs.set("projectId", params.projectId);
  if (params.userId) qs.set("userId", params.userId);
  if (params.billable !== undefined) qs.set("billable", String(params.billable));
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  return apiFetch<PaginatedResponse<TimeEntry>>(`/api/time-entries?${qs.toString()}`);
}

export async function prefetchTimeEntries(qc: QueryClient, params: TimeEntriesQueryParams = {}) {
  const { period, projectId, userId, billable, page = 1, pageSize = 50 } = params;
  await qc.prefetchQuery({
    queryKey: timeEntriesQueryKey(params),
    queryFn: () =>
      serverQuery(() =>
      listTimeEntries({
        period,
        projectId,
        userId,
        billable,
        page,
        pageSize,
      })),
  });
}

export async function prefetchTimeTrackingPage(qc: QueryClient) {
  await prefetchTimeEntries(qc, { period: currentPeriod(), pageSize: 100 });
}

// ─── Statements / reports ───────────────────────────────────────────────────

export function pnLQueryKey(period: string) {
  return ["statements", "pl", period] as const;
}

export function cashFlowQueryKey(period: string) {
  return ["statements", "cashflow", period] as const;
}

export async function fetchPnLStatement(period: string) {
  const qs = period ? `period=${encodeURIComponent(period)}` : "period=all";
  return apiFetch<PnLStatement>(`/api/statements/pl?${qs}`);
}

export async function fetchCashFlowStatement(period: string) {
  const qs = period ? `period=${encodeURIComponent(period)}` : "period=all";
  return apiFetch<CashFlowStatement>(`/api/statements/cashflow?${qs}`);
}

export async function prefetchPnL(qc: QueryClient, period?: string) {
  const p = period ?? currentPeriod();
  await qc.prefetchQuery({
    queryKey: pnLQueryKey(p),
    queryFn: () => serverQuery(() => fetchPnL(p || undefined)),
  });
}

export async function prefetchCashFlow(qc: QueryClient, period?: string) {
  const p = period ?? currentPeriod();
  await qc.prefetchQuery({
    queryKey: cashFlowQueryKey(p),
    queryFn: () => serverQuery(() => fetchCashFlow(p || undefined)),
  });
}

/** Server prefetch for Reports — default tab is P&L only; other tabs load on demand. */
export async function prefetchReportsPage(qc: QueryClient) {
  await prefetchPnL(qc, currentPeriod());
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function settingsQueryKey() {
  return ["settings"] as const;
}

export function fxRatesQueryKey() {
  return ["settings", "fx-rates"] as const;
}

export function settingsLookupsQueryKey() {
  return ["settings", "lookups"] as const;
}

export async function fetchSettings() {
  return apiFetch<AppSettings>("/api/settings");
}

export async function fetchFxRates() {
  return apiFetch<Record<string, number>>("/api/settings/fx-rates");
}

export async function fetchSettingsLookups() {
  return apiFetch<Record<string, LookupItem[]>>("/api/settings/lookups");
}

export async function prefetchSettings(qc: QueryClient) {
  await qc.prefetchQuery({
    queryKey: settingsQueryKey(),
    queryFn: () => serverQuery(getAllSettings),
  });
}

export async function prefetchFxRates(qc: QueryClient) {
  await qc.prefetchQuery({
    queryKey: fxRatesQueryKey(),
    queryFn: () => serverQuery(getFxRates),
  });
}

export async function prefetchSettingsLookups(qc: QueryClient) {
  await qc.prefetchQuery({
    queryKey: settingsLookupsQueryKey(),
    queryFn: () => serverQuery(listLookups),
  });
}

export async function prefetchSettingsPage(qc: QueryClient) {
  await Promise.all([
    prefetchSettings(qc),
    prefetchFxRates(qc),
    prefetchSettingsLookups(qc),
  ]);
}

// ─── Compensation ───────────────────────────────────────────────────────────

export function compensationQueryKey() {
  return ["compensation"] as const;
}

export async function fetchCompensation() {
  return apiFetch<EmployeeWithCompensations[]>("/api/compensation");
}

export async function prefetchCompensation(qc: QueryClient) {
  await qc.prefetchQuery({
    queryKey: compensationQueryKey(),
    queryFn: () => serverQuery(getAllEmployeesWithCompensationHistory),
  });
}

export async function prefetchStakeholdersPage(qc: QueryClient) {
  await prefetchAccounts(qc, "stakeholder");
}
