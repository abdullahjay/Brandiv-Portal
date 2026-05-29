export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["*"],
  admin: ["*"],
  manager: [
    "dashboard",
    "clients",
    "projects",
    "stakeholders",
    "pipeline",
    "income",
    "invoices",
    "transactions",
    "expenses",
    "time-tracking",
    "commissions",
    "employees",
    "users",
    "reports",
  ],
  staff: [
    "dashboard",
    "clients",
    "projects",
    "pipeline",
    "time-tracking",
  ],
  finance: [
    "dashboard",
    "income",
    "invoices",
    "transactions",
    "expenses",
    "payroll",
    "accounts",
    "transfers",
    "employees",
    "reports",
    "settings",
  ],
};

export function hasModuleAccess(role: string, module: string): boolean {
  const allowed = ROLE_PERMISSIONS[role] ?? [];
  return allowed.includes("*") || allowed.includes(module);
}

// Maps first URL path segment → module name (for middleware route protection)
export const SEGMENT_TO_MODULE: Record<string, string> = {
  dashboard: "dashboard",
  clients: "clients",
  projects: "projects",
  stakeholders: "stakeholders",
  pipeline: "pipeline",
  income: "income",
  invoices: "invoices",
  transactions: "transactions",
  expenses: "expenses",
  payroll: "payroll",
  accounts: "accounts",
  transfers: "transfers",
  "time-tracking": "time-tracking",
  commissions: "commissions",
  employees: "employees",
  users: "users",
  reports: "reports",
  settings: "settings",
};
