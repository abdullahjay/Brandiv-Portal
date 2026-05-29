import type { UserRole } from "@prisma/client";

// ─── API Response wrapper ─────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: unknown;
}

// ─── Lookup (Reference Data) ──────────────────────────────────────────────────
export interface LookupItem {
  id: string;
  type: string;
  value: string;
  label: string;
  code: string | null;
  meta: Record<string, unknown> | null;
  active: boolean;
  sortOrder: number;
}

export type LookupMap = Record<string, LookupItem[]>;

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
}

// ─── Navigation ───────────────────────────────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  module: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Clients ──────────────────────────────────────────────────────────────────
export interface Client {
  id: string;
  companyName: string;
  industry: string | null;
  website: string | null;
  contactName: string;
  contactTitle: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  city: string | null;
  timezone: string | null;
  currency: string;
  billingAddress: string | null;
  taxNumber: string | null;
  paymentTerms: string | null;
  contractStatus: "not_sent" | "sent" | "signed";
  ndaRequired: boolean;
  status: "active" | "pending" | "inactive";
  source: string | null;
  commissionRule: "standard" | "custom" | "none";
  commissionPriorPayments: number;
  notes: string | null;
  createdAt: string;
  accountManager?: { id: string; name: string } | null;
  referredByUserId?: string | null;
  referredBy?: { id: string; name: string } | null;
  partner?: { id: string; name: string; sharePct: number } | null;
  partnerId?: string | null;
  _count?: { projects: number; invoices: number };
  projects?: ClientProject[];
  invoices?: ClientInvoice[];
}

export interface CreateClientInput {
  companyName: string;
  industry?: string;
  website?: string;
  contactName: string;
  contactTitle?: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  timezone?: string;
  currency?: string;
  billingAddress?: string;
  taxNumber?: string;
  paymentTerms?: string;
  contractStatus?: "not_sent" | "sent" | "signed";
  ndaRequired?: boolean;
  status?: "active" | "pending" | "inactive";
  source?: string;
  commissionRule?: "standard" | "custom" | "none";
  notes?: string;
  accountManagerId?: string;
  referredByUserId?: string;
  partnerId?: string | null;
}

// ─── Client nested types ──────────────────────────────────────────────────────
export interface ClientProject {
  id: string;
  name: string;
  type: string;
  status: string;
  progressPct: number;
  currency: string;
  valueOriginal: number;
  valuePkr: number;
  deadline: string | null;
}

export interface ClientInvoice {
  id: string;
  invoiceNumber: string;
  currency: string;
  totalAmount: number;
  status: string;
  issueDate: string;
  dueDate: string;
}

// ─── Projects ─────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  type: "one_time" | "recurring" | "milestone";
  status: "active" | "pending" | "done" | "cancelled";
  valuePkr: number;
  currency: string;
  valueOriginal: number;
  progressPct: number;
  startDate: string | null;
  deadline: string | null;
  description: string | null;
  commissionExempt: boolean;
  billingCycleDay: number | null;
  createdAt: string;
  client?: { id: string; companyName: string; currency: string };
  manager?: { id: string; name: string } | null;
  _count?: { timeEntries: number; invoices: number; milestones: number };
  milestones?: ProjectMilestone[];
  invoices?: ClientInvoice[];
  timeEntries?: ProjectTimeEntry[];
}

export interface ProjectMilestone {
  id: string;
  title: string;
  dueDate: string | null;
  completedAt: string | null;
  valuePkr: number;
}

export interface ProjectTimeEntry {
  id: string;
  hours: number;
  description: string | null;
  date: string;
  billable: boolean;
  user: { id: string; name: string } | null;
}

export interface CreateProjectInput {
  name: string;
  clientId: string;
  type?: "one_time" | "recurring" | "milestone";
  status?: "active" | "pending" | "done" | "cancelled";
  currency?: string;
  valueOriginal?: number;
  progressPct?: number;
  startDate?: string;
  deadline?: string;
  description?: string;
  commissionExempt?: boolean;
  billingCycleDay?: number;
  managerId?: string;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────
export interface Invoice {
  id: string;
  invoiceNumber: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentTerms: string | null;
  issueDate: string;
  dueDate: string;
  paidAt: string | null;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  paymentNumber: number;
  notes: string | null;
  createdAt: string;
  client?: { id: string; companyName: string };
  project?: { id: string; name: string } | null;
  lineItems?: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  sortOrder: number;
}

export interface CreateInvoiceInput {
  clientId: string;
  projectId?: string | null;
  currency?: string;
  issueDate: string;
  dueDate: string;
  paymentTerms?: string | null;
  taxPct?: number;
  paymentNumber?: number;
  notes?: string | null;
  lineItems: { description: string; quantity: number; rate: number }[];
}

// ─── Accounts ─────────────────────────────────────────────────────────────────
export interface CrmAccount {
  id: string;
  name: string;
  type: "operating" | "company_reserve" | "stakeholder";
  sharePct: number;
  currentBalancePkr: number;
  lifetimeDistPkr: number;
  lifetimeCommPkr: number;
  isDefaultOperating: boolean;
  createdAt: string;
  ownerUserId: string | null;
  ownerUser?: { id: string; name: string; email: string; role: string; avatarUrl: string | null } | null;
}

export interface CreateAccountInput {
  name: string;
  type: "operating" | "company_reserve" | "stakeholder";
  sharePct?: number;
  isDefaultOperating?: boolean;
  ownerUserId?: string | null;
}

// ─── Income ───────────────────────────────────────────────────────────────────

export interface IncomeTotals {
  grossPkr: number;
  whtAmountPkr: number;
  gstAmountPkr: number;
  bankChargesPkr: number;
  netPkr: number;
}

export interface IncomeListResponse extends PaginatedResponse<IncomeRecord> {
  totals: IncomeTotals;
}

export interface IncomeRecord {
  id: string;
  period: string;
  originalAmount: number;
  originalCurrency: string;
  exchangeRate: number;
  rateSource: string | null;
  grossPkr: number;
  whtPct: number;
  whtAmountPkr: number;
  gstPct: number;
  gstAmountPkr: number;
  bankChargesPkr: number;
  netPkr: number;
  paymentMethod: string | null;
  transactionRef: string | null;
  receivedAt: string;
  status: "pending" | "cleared";
  incomeType: string | null;
  notes: string | null;
  createdAt: string;
  client?: { id: string; companyName: string; currency: string };
  invoice?: { id: string; invoiceNumber: string } | null;
  destinationAccount?: { id: string; name: string } | null;
  createdBy?: { id: string; name: string } | null;
  commissions?: IncomeCommission[];
}

export interface IncomeCommission {
  id: string;
  ratePct: number;
  baseAmountPkr: number;
  commissionPkr: number;
  status: "pending" | "approved" | "paid";
  paymentNumber: number;
  stakeholderAccount: { id: string; name: string; ownerUser?: { name: string; avatarUrl: string | null } | null };
}

export interface CreateIncomeInput {
  clientId: string;
  invoiceId?: string | null;
  destinationAccountId?: string | null;
  originalAmount: number;
  originalCurrency?: string;
  exchangeRate: number;
  rateSource?: string | null;
  whtPct?: number;
  gstPct?: number;
  bankChargesPkr?: number;
  paymentMethod?: string | null;
  transactionRef?: string | null;
  receivedAt: string;
  incomeType?: string | null;
  notes?: string | null;
}

// ─── Commissions ──────────────────────────────────────────────────────────────
export interface Commission {
  id: string;
  period: string;
  paymentNumber: number;
  ratePct: number;
  baseAmountPkr: number;
  commissionPkr: number;
  status: "pending" | "approved" | "paid";
  createdAt: string;
  stakeholderAccount: { id: string; name: string; ownerUser?: { name: string; avatarUrl: string | null } | null };
  client: { id: string; companyName: string };
  project?: { id: string; name: string } | null;
  invoice?: { id: string; invoiceNumber: string } | null;
  incomeRecord?: { id: string; originalAmount: number; originalCurrency: string; receivedAt: string } | null;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
export interface Expense {
  id: string;
  description: string;
  category: string;
  amountPkr: number;
  originalAmount: number | null;
  originalCurrency: string | null;
  exchangeRate: number | null;
  period: string;
  date: string;
  receiptUrl: string | null;
  notes: string | null;
  createdAt: string;
  project?: { id: string; name: string } | null;
}

export interface CreateExpenseInput {
  description: string;
  category: string;
  amountPkr: number;
  originalAmount?: number | null;
  originalCurrency?: string | null;
  exchangeRate?: number | null;
  date: string;
  projectId?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
}

// ─── Distribution ─────────────────────────────────────────────────────────────
export interface DistributionPreviewItem {
  accountId: string;
  accountName: string;
  ownerName: string | null;
  sharePct: number;
  distributionAmountPkr: number;
  commissionAmountPkr: number;
  totalPkr: number;
}

export interface DistributionPreview {
  operatingBalancePkr: number;  // actual operating account balance (paise)
  totalCommissionPkr: number;   // all approved commissions (paise)
  totalSharePct: number;
  items: DistributionPreviewItem[];
  warnings: string[];
}

export interface DistributionRecord {
  id: string;
  period: string;               // YYYY-MM label
  label: string | null;         // optional custom name
  operatingBalancePkr: number;  // account balance used (paise)
  totalCommissionPkr: number;
  totalDistributedPkr: number;
  operatingBalanceAfter: number;
  runAt: string;
  notes: string | null;
  runBy: { id: string; name: string } | null;
  items: {
    id: string;
    sharePct: number;
    distributionAmountPkr: number;
    commissionAmountPkr: number;
    totalPkr: number;
    account: { id: string; name: string; type: string };
  }[];
}

// ─── Transfers ────────────────────────────────────────────────────────────────
export interface TransferRecord {
  id: string;
  period: string;
  amountPkr: number;
  description: string;
  notes: string | null;
  status: string;
  reversalOfId: string | null;
  transferAt: string;
  createdAt: string;
  fromAccount: { id: string; name: string; type: string };
  toAccount:   { id: string; name: string; type: string };
  createdBy:   { id: string; name: string } | null;
}

// ─── Account Statement ────────────────────────────────────────────────────────
export interface StatementEntry {
  id: string;
  date: string;
  description: string;
  type: "income" | "expense" | "payroll" | "distribution";
  credit: number;
  debit: number;
  balance: number;
}

export interface AccountStatement {
  account: {
    id: string;
    name: string;
    type: string;
    currentBalancePkr: number;
  };
  period: string | null;
  openingBalance: number;
  entries: StatementEntry[];
  closingBalance: number;
  totalIn: number;
  totalOut: number;
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

export interface PayrollRunEntry {
  employeeId?: string;
  userId?: string;
  grossPkr: number;
  deductions: number;
  notes?: string | null;
}

export interface PayrollRunResult {
  created: number;
  skipped: number;
  records: PayrollRecord[];
}

export interface PayrollRecord {
  id: string;
  period: string;
  grossPkr: number;
  deductions: number;
  netPkr: number;
  status: "pending" | "paid";
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; role: string; avatarUrl: string | null } | null;
  employee: { id: string; name: string; designation: string | null; department: string | null } | null;
}

export interface CreatePayrollInput {
  userId?: string;
  employeeId?: string;
  period: string;
  grossPkr: number;
  deductions?: number;
  notes?: string | null;
}

// ─── Time Entries ─────────────────────────────────────────────────────────────
export interface TimeEntry {
  id: string;
  hours: number;
  date: string;
  description: string | null;
  billable: boolean;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
  project: { id: string; name: string; client: { id: string; companyName: string } };
}

export interface TimeEntrySummary {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  entryCount: number;
}

export interface CreateTimeEntryInput {
  projectId: string;
  date: string;
  hours: number;
  description?: string | null;
  billable?: boolean;
}

// ─── Ledger ───────────────────────────────────────────────────────────────────
export interface LedgerEntry {
  id: string;
  type: "income" | "expense" | "payroll" | "distribution" | "commission" | "transfer";
  date: string;
  period: string;
  description: string;
  party: string | null;
  reference: string | null;
  pkrAmount: number; // positive = inflow, negative = outflow
  status: string;
}

export interface LedgerPage {
  items: LedgerEntry[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Statements ───────────────────────────────────────────────────────────────
export interface PnLStatement {
  period: string;
  totalGrossPkr: number;
  totalWhtPkr: number;
  totalIncomePkr: number;
  totalExpensesPkr: number;
  totalPayrollPkr: number;
  totalCommissionPkr: number;
  netProfitPkr: number;
  grossMarginPct: number;
  incomeByClient: { clientName: string; amountPkr: number }[];
  expenseByCategory: { category: string; amountPkr: number }[];
  payrollByEmployee: { name: string; grossPkr: number; deductions: number; netPkr: number; status: string }[];
  commissionByStakeholder: { name: string; amountPkr: number; status: string }[];
  isDistributed: boolean;
  distributedPkr: number | null;
  distributionRunAt: string | null;
  allCommissionsCount: number;
  pendingCommissionsCount: number;
}

export interface CashFlowInflow {
  date: string;
  description: string;
  party: string;
  reference: string | null;
  amountPkr: number;
  status: string;
}

export interface CashFlowOutflow {
  date: string;
  description: string;
  party: string | null;
  reference: string | null;
  amountPkr: number;
  type: "expense" | "payroll" | "distribution";
}

export interface CashFlowStatement {
  period: string;
  inflows: CashFlowInflow[];
  outflows: CashFlowOutflow[];
  totalInflowPkr: number;
  totalOutflowPkr: number;
  netCashFlowPkr: number;
  operatingAccountName: string | null;
  operatingBalancePkr: number | null;
}

// ─── Employees ────────────────────────────────────────────────────────────────
export interface Employee {
  id: string;
  name: string;
  designation: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  cnic: string | null;
  joinDate: string | null;
  baseSalary: number | null;
  status: "active" | "inactive";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────
export interface CrmNotification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  items: CrmNotification[];
  unreadCount: number;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive";
  avatarUrl: string | null;
  lastLogin: string | null;
  createdAt: string;
}
