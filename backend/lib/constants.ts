// Commission rates (as percentages)
export const COMMISSION_RATE_FIRST = 15;
export const COMMISSION_RATE_RECURRING = 5;

// Default currency
export const DEFAULT_CURRENCY = "PKR";

// Supported foreign currencies
export const SUPPORTED_CURRENCIES = ["USD", "GBP", "EUR", "AED", "PKR"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

// Default FX rates (PKR) — fallback when no manual rate entered
export const DEFAULT_FX_RATES: Record<string, number> = {
  USD: 278.5,
  GBP: 352.2,
  EUR: 301.8,
  AED: 75.8,
  PKR: 1,
};

// Invoice number prefix (can be overridden from settings)
export const INVOICE_PREFIX = "INV-";

// Pipeline stages in order
export const PIPELINE_STAGES = ["lead", "proposal", "negotiation", "closed"] as const;

// Expense categories
export const EXPENSE_CATEGORIES = [
  "Software",
  "Marketing",
  "Office",
  "Travel",
  "Payroll",
  "Other",
] as const;

// User roles and their allowed modules
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
    "employees",
    "reports",
    "settings",
  ],
};

// Pagination
export const DEFAULT_PAGE_SIZE = 50;

// Amount stored as integer (paise = smallest PKR unit × 100)
// To convert: amount_in_pkr * 100 = stored value
export const AMOUNT_MULTIPLIER = 100;
