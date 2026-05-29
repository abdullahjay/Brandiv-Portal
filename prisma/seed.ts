import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Lookup reference data ────────────────────────────────────────────────────

const LOOKUPS: Array<{
  type: string;
  value: string;
  label: string;
  code?: string;
  meta?: object;
  sortOrder?: number;
}> = [
  // Industries
  { type: "industry", value: "Technology", label: "Technology", sortOrder: 1 },
  { type: "industry", value: "Marketing & Advertising", label: "Marketing & Advertising", sortOrder: 2 },
  { type: "industry", value: "Finance & Banking", label: "Finance & Banking", sortOrder: 3 },
  { type: "industry", value: "Healthcare", label: "Healthcare", sortOrder: 4 },
  { type: "industry", value: "E-commerce & Retail", label: "E-commerce & Retail", sortOrder: 5 },
  { type: "industry", value: "Education", label: "Education", sortOrder: 6 },
  { type: "industry", value: "Real Estate", label: "Real Estate", sortOrder: 7 },
  { type: "industry", value: "Manufacturing", label: "Manufacturing", sortOrder: 8 },
  { type: "industry", value: "Media & Entertainment", label: "Media & Entertainment", sortOrder: 9 },
  { type: "industry", value: "Non-Profit", label: "Non-Profit", sortOrder: 10 },
  { type: "industry", value: "Logistics & Supply Chain", label: "Logistics & Supply Chain", sortOrder: 11 },
  { type: "industry", value: "Travel & Hospitality", label: "Travel & Hospitality", sortOrder: 12 },
  { type: "industry", value: "Legal & Consulting", label: "Legal & Consulting", sortOrder: 13 },
  { type: "industry", value: "Construction & Architecture", label: "Construction & Architecture", sortOrder: 14 },
  { type: "industry", value: "Other", label: "Other", sortOrder: 99 },

  // Countries
  { type: "country", value: "Pakistan", label: "Pakistan", code: "PK", meta: { dialCode: "+92", currency: "PKR" }, sortOrder: 1 },
  { type: "country", value: "United States", label: "United States", code: "US", meta: { dialCode: "+1", currency: "USD" }, sortOrder: 2 },
  { type: "country", value: "United Kingdom", label: "United Kingdom", code: "GB", meta: { dialCode: "+44", currency: "GBP" }, sortOrder: 3 },
  { type: "country", value: "United Arab Emirates", label: "United Arab Emirates", code: "AE", meta: { dialCode: "+971", currency: "AED" }, sortOrder: 4 },
  { type: "country", value: "Saudi Arabia", label: "Saudi Arabia", code: "SA", meta: { dialCode: "+966", currency: "SAR" }, sortOrder: 5 },
  { type: "country", value: "Canada", label: "Canada", code: "CA", meta: { dialCode: "+1", currency: "CAD" }, sortOrder: 6 },
  { type: "country", value: "Australia", label: "Australia", code: "AU", meta: { dialCode: "+61", currency: "AUD" }, sortOrder: 7 },
  { type: "country", value: "Germany", label: "Germany", code: "DE", meta: { dialCode: "+49", currency: "EUR" }, sortOrder: 8 },
  { type: "country", value: "France", label: "France", code: "FR", meta: { dialCode: "+33", currency: "EUR" }, sortOrder: 9 },
  { type: "country", value: "Netherlands", label: "Netherlands", code: "NL", meta: { dialCode: "+31", currency: "EUR" }, sortOrder: 10 },
  { type: "country", value: "Qatar", label: "Qatar", code: "QA", meta: { dialCode: "+974", currency: "QAR" }, sortOrder: 11 },
  { type: "country", value: "Kuwait", label: "Kuwait", code: "KW", meta: { dialCode: "+965", currency: "KWD" }, sortOrder: 12 },
  { type: "country", value: "Bahrain", label: "Bahrain", code: "BH", meta: { dialCode: "+973", currency: "BHD" }, sortOrder: 13 },
  { type: "country", value: "India", label: "India", code: "IN", meta: { dialCode: "+91", currency: "INR" }, sortOrder: 14 },
  { type: "country", value: "Singapore", label: "Singapore", code: "SG", meta: { dialCode: "+65", currency: "SGD" }, sortOrder: 15 },
  { type: "country", value: "Other", label: "Other", code: "XX", meta: {}, sortOrder: 99 },

  // Currencies
  { type: "currency", value: "PKR", label: "PKR — Pakistani Rupee", code: "PKR", meta: { symbol: "₨", name: "Pakistani Rupee" }, sortOrder: 1 },
  { type: "currency", value: "USD", label: "USD — US Dollar", code: "USD", meta: { symbol: "$", name: "US Dollar" }, sortOrder: 2 },
  { type: "currency", value: "GBP", label: "GBP — British Pound", code: "GBP", meta: { symbol: "£", name: "British Pound" }, sortOrder: 3 },
  { type: "currency", value: "EUR", label: "EUR — Euro", code: "EUR", meta: { symbol: "€", name: "Euro" }, sortOrder: 4 },
  { type: "currency", value: "AED", label: "AED — UAE Dirham", code: "AED", meta: { symbol: "د.إ", name: "UAE Dirham" }, sortOrder: 5 },
  { type: "currency", value: "SAR", label: "SAR — Saudi Riyal", code: "SAR", meta: { symbol: "﷼", name: "Saudi Riyal" }, sortOrder: 6 },
  { type: "currency", value: "CAD", label: "CAD — Canadian Dollar", code: "CAD", meta: { symbol: "CA$", name: "Canadian Dollar" }, sortOrder: 7 },
  { type: "currency", value: "AUD", label: "AUD — Australian Dollar", code: "AUD", meta: { symbol: "A$", name: "Australian Dollar" }, sortOrder: 8 },
  { type: "currency", value: "QAR", label: "QAR — Qatari Riyal", code: "QAR", meta: { symbol: "QR", name: "Qatari Riyal" }, sortOrder: 9 },
  { type: "currency", value: "KWD", label: "KWD — Kuwaiti Dinar", code: "KWD", meta: { symbol: "KD", name: "Kuwaiti Dinar" }, sortOrder: 10 },
  { type: "currency", value: "SGD", label: "SGD — Singapore Dollar", code: "SGD", meta: { symbol: "S$", name: "Singapore Dollar" }, sortOrder: 11 },

  // Timezones
  { type: "timezone", value: "UTC+5 (Pakistan)", label: "UTC+5 (Pakistan – PKT)", code: "Asia/Karachi", sortOrder: 1 },
  { type: "timezone", value: "UTC+4 (UAE/Oman)", label: "UTC+4 (UAE / Oman – GST)", code: "Asia/Dubai", sortOrder: 2 },
  { type: "timezone", value: "UTC+3 (KSA/Kuwait)", label: "UTC+3 (Saudi Arabia / Kuwait – AST)", code: "Asia/Riyadh", sortOrder: 3 },
  { type: "timezone", value: "UTC+0 (UK/GMT)", label: "UTC+0 (UK – GMT)", code: "Europe/London", sortOrder: 4 },
  { type: "timezone", value: "UTC+1 (Europe CET)", label: "UTC+1 (Central Europe – CET)", code: "Europe/Berlin", sortOrder: 5 },
  { type: "timezone", value: "UTC+5:30 (India)", label: "UTC+5:30 (India – IST)", code: "Asia/Kolkata", sortOrder: 6 },
  { type: "timezone", value: "UTC+8 (Singapore/HK)", label: "UTC+8 (Singapore / Hong Kong)", code: "Asia/Singapore", sortOrder: 7 },
  { type: "timezone", value: "UTC-5 (US Eastern)", label: "UTC-5 (US Eastern – EST)", code: "America/New_York", sortOrder: 8 },
  { type: "timezone", value: "UTC-8 (US Pacific)", label: "UTC-8 (US Pacific – PST)", code: "America/Los_Angeles", sortOrder: 9 },

  // Payment terms
  { type: "payment_terms", value: "Net 15", label: "Net 15", sortOrder: 1 },
  { type: "payment_terms", value: "Net 30", label: "Net 30", sortOrder: 2 },
  { type: "payment_terms", value: "Net 45", label: "Net 45", sortOrder: 3 },
  { type: "payment_terms", value: "Net 60", label: "Net 60", sortOrder: 4 },
  { type: "payment_terms", value: "50% Upfront, 50% on Delivery", label: "50% Upfront, 50% on Delivery", sortOrder: 5 },
  { type: "payment_terms", value: "Full Upfront", label: "Full Upfront", sortOrder: 6 },
  { type: "payment_terms", value: "Milestone-based", label: "Milestone-based", sortOrder: 7 },

  // Client sources
  { type: "client_source", value: "Stakeholder Referral", label: "Stakeholder Referral", sortOrder: 1 },
  { type: "client_source", value: "Word of Mouth", label: "Word of Mouth", sortOrder: 2 },
  { type: "client_source", value: "Social Media", label: "Social Media", sortOrder: 3 },
  { type: "client_source", value: "Direct / Website", label: "Direct / Website", sortOrder: 4 },
  { type: "client_source", value: "Cold Outreach", label: "Cold Outreach", sortOrder: 5 },
  { type: "client_source", value: "Event / Conference", label: "Event / Conference", sortOrder: 6 },
  { type: "client_source", value: "LinkedIn", label: "LinkedIn", sortOrder: 7 },
  { type: "client_source", value: "Google / SEO", label: "Google / SEO", sortOrder: 8 },
  { type: "client_source", value: "Partner Agency", label: "Partner Agency", sortOrder: 9 },
  { type: "client_source", value: "Other", label: "Other", sortOrder: 99 },

  // Budget ranges
  { type: "budget_range", value: "Under $1,000", label: "Under $1,000", sortOrder: 1 },
  { type: "budget_range", value: "$1,000 – $5,000", label: "$1,000 – $5,000", sortOrder: 2 },
  { type: "budget_range", value: "$5,000 – $15,000", label: "$5,000 – $15,000", sortOrder: 3 },
  { type: "budget_range", value: "$15,000 – $50,000", label: "$15,000 – $50,000", sortOrder: 4 },
  { type: "budget_range", value: "$50,000 – $100,000", label: "$50,000 – $100,000", sortOrder: 5 },
  { type: "budget_range", value: "$100,000+", label: "$100,000+", sortOrder: 6 },

  // Services offered
  { type: "service", value: "Branding", label: "Branding", sortOrder: 1 },
  { type: "service", value: "Web Design", label: "Web Design", sortOrder: 2 },
  { type: "service", value: "Web Development", label: "Web Development", sortOrder: 3 },
  { type: "service", value: "Mobile App", label: "Mobile App", sortOrder: 4 },
  { type: "service", value: "Social Media Management", label: "Social Media Management", sortOrder: 5 },
  { type: "service", value: "SEO", label: "SEO", sortOrder: 6 },
  { type: "service", value: "Content Strategy", label: "Content Strategy", sortOrder: 7 },
  { type: "service", value: "Digital Marketing", label: "Digital Marketing", sortOrder: 8 },
  { type: "service", value: "UI/UX Design", label: "UI/UX Design", sortOrder: 9 },
  { type: "service", value: "Video Production", label: "Video Production", sortOrder: 10 },
  { type: "service", value: "Photography", label: "Photography", sortOrder: 11 },
  { type: "service", value: "Copywriting", label: "Copywriting", sortOrder: 12 },
  { type: "service", value: "Email Marketing", label: "Email Marketing", sortOrder: 13 },

  // Project types
  { type: "project_type", value: "one_time", label: "One-time", sortOrder: 1 },
  { type: "project_type", value: "recurring", label: "Recurring", sortOrder: 2 },
  { type: "project_type", value: "milestone", label: "Milestone-based", sortOrder: 3 },

  // Commission rules
  { type: "commission_rule", value: "standard", label: "Standard (15% first, 5% recurring)", sortOrder: 1 },
  { type: "commission_rule", value: "custom", label: "Custom", sortOrder: 2 },
  { type: "commission_rule", value: "none", label: "No commission", sortOrder: 3 },

  // Contract statuses
  { type: "contract_status", value: "not_sent", label: "Not sent", sortOrder: 1 },
  { type: "contract_status", value: "sent", label: "Sent — awaiting signature", sortOrder: 2 },
  { type: "contract_status", value: "signed", label: "Signed", sortOrder: 3 },

  // Payment methods
  { type: "payment_method", value: "Bank Transfer", label: "Bank Transfer", sortOrder: 1 },
  { type: "payment_method", value: "Wise", label: "Wise", sortOrder: 2 },
  { type: "payment_method", value: "PayPal", label: "PayPal", sortOrder: 3 },
  { type: "payment_method", value: "Payoneer", label: "Payoneer", sortOrder: 4 },
  { type: "payment_method", value: "Crypto", label: "Crypto", sortOrder: 5 },
  { type: "payment_method", value: "Cheque", label: "Cheque", sortOrder: 6 },
  { type: "payment_method", value: "Cash", label: "Cash", sortOrder: 7 },
  { type: "payment_method", value: "Other", label: "Other", sortOrder: 99 },

  // Expense categories
  { type: "expense_category", value: "Office Rent", label: "Office Rent", sortOrder: 1 },
  { type: "expense_category", value: "Software & Subscriptions", label: "Software & Subscriptions", sortOrder: 2 },
  { type: "expense_category", value: "Salaries", label: "Salaries", sortOrder: 3 },
  { type: "expense_category", value: "Freelancer / Contractor", label: "Freelancer / Contractor", sortOrder: 4 },
  { type: "expense_category", value: "Marketing & Ads", label: "Marketing & Ads", sortOrder: 5 },
  { type: "expense_category", value: "Equipment & Hardware", label: "Equipment & Hardware", sortOrder: 6 },
  { type: "expense_category", value: "Travel", label: "Travel", sortOrder: 7 },
  { type: "expense_category", value: "Utilities", label: "Utilities", sortOrder: 8 },
  { type: "expense_category", value: "Legal & Professional", label: "Legal & Professional", sortOrder: 9 },
  { type: "expense_category", value: "Banking & Fees", label: "Banking & Fees", sortOrder: 10 },
  { type: "expense_category", value: "Other", label: "Other", sortOrder: 99 },

  // WHT percentages
  { type: "wht_pct", value: "0", label: "0% — Not applicable", sortOrder: 1 },
  { type: "wht_pct", value: "5", label: "5% — Standard IT export", sortOrder: 2 },
  { type: "wht_pct", value: "7.5", label: "7.5%", sortOrder: 3 },
  { type: "wht_pct", value: "10", label: "10%", sortOrder: 4 },
  { type: "wht_pct", value: "15", label: "15%", sortOrder: 5 },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed must not run in production. Aborting.");
  }

  console.log("Clearing database…");

  // Truncate all tables in FK-safe order (most dependent first)
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      distribution_items,
      distributions,
      commissions,
      income_records,
      invoice_line_items,
      invoices,
      financial_transactions,
      time_entries,
      expenses,
      payroll_records,
      milestones,
      pipeline_deals,
      projects,
      clients,
      crm_accounts,
      employees,
      notifications,
      exchange_rates,
      settings,
      lookups,
      auth_accounts,
      auth_sessions,
      auth_verification_tokens,
      users
    RESTART IDENTITY CASCADE
  `);
  console.log("  ✓ All tables cleared");

  // ── Users ────────────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash("Admin@1234", 10);

  const abdullah = await prisma.user.create({
    data: {
      name: "Abdullah Shahid",
      email: "abdullah.shahid@constellationdealer.com",
      passwordHash: hash,
      role: "super_admin",
      status: "active",
    },
  });
  console.log(`  ✓ Super admin: ${abdullah.email}`);

  // ── Lookup reference data ─────────────────────────────────────────────────
  let inserted = 0;
  for (const item of LOOKUPS) {
    await prisma.lookup.create({
      data: {
        type: item.type,
        value: item.value,
        label: item.label,
        code: item.code,
        meta: item.meta as any,
        sortOrder: item.sortOrder ?? 0,
      },
    });
    inserted++;
  }
  console.log(`  ✓ Lookup reference data: ${inserted} items`);

  // ── CRM Accounts ─────────────────────────────────────────────────────────
  const operatingAccount = await prisma.crmAccount.create({
    data: {
      name: "Brandiv Labs — Operating",
      type: "operating",
      isDefaultOperating: true,
      currentBalancePkr: BigInt(0),
    },
  });
  console.log(`  ✓ Operating account: ${operatingAccount.name}`);

  const abdullahAccount = await prisma.crmAccount.create({
    data: {
      name: "Abdullah Shahid",
      type: "stakeholder",
      sharePct: 100,
      ownerUserId: abdullah.id,
      currentBalancePkr: BigInt(0),
    },
  });
  console.log(`  ✓ Stakeholder account: ${abdullahAccount.name} (100% share)`);

  // ── Starter client ────────────────────────────────────────────────────────
  const client = await prisma.client.create({
    data: {
      companyName: "TechMark Solutions",
      industry: "Technology",
      contactName: "James Carter",
      contactTitle: "CEO",
      email: "james@techmark.io",
      phone: "+1 415 000 1111",
      country: "United States",
      city: "San Francisco",
      timezone: "UTC-8 (US Pacific)",
      currency: "USD",
      paymentTerms: "Net 30",
      status: "active",
      contractStatus: "signed",
      commissionRule: "standard",
      source: "Stakeholder Referral",
      partnerId: abdullahAccount.id,
      createdById: abdullah.id,
    },
  });
  console.log(`  ✓ Client: ${client.companyName} (partner: ${abdullahAccount.name})`);

  // ── Starter project ───────────────────────────────────────────────────────
  const project = await prisma.project.create({
    data: {
      name: "Brand Identity & Web Design",
      type: "milestone",
      status: "active",
      currency: "USD",
      valueOriginal: BigInt(500000),   // $5,000.00
      valuePkr: BigInt(139250000),     // PKR 1,392,500 @ 278.5
      progressPct: 0,
      startDate: new Date("2026-05-01"),
      deadline: new Date("2026-08-31"),
      description: "Full brand identity redesign including logo, brand guidelines, website design and development.",
      clientId: client.id,
      managerId: abdullah.id,
    },
  });

  await prisma.milestone.createMany({
    data: [
      { projectId: project.id, title: "Discovery & Strategy",          dueDate: new Date("2026-05-31"), valuePkr: BigInt(34812500) },
      { projectId: project.id, title: "Brand Identity Design",         dueDate: new Date("2026-06-30"), valuePkr: BigInt(34812500) },
      { projectId: project.id, title: "Website Design & Development",  dueDate: new Date("2026-07-31"), valuePkr: BigInt(34812500) },
      { projectId: project.id, title: "Launch & Handover",             dueDate: new Date("2026-08-31"), valuePkr: BigInt(34812500) },
    ],
  });
  console.log(`  ✓ Project: ${project.name} (4 milestones)`);

  // ── Starter invoice ───────────────────────────────────────────────────────
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2026-001",
      currency: "USD",
      subtotal: BigInt(125000),   // $1,250.00 (milestone 1)
      taxAmount: BigInt(0),
      totalAmount: BigInt(125000),
      paymentTerms: "Net 30",
      issueDate: new Date("2026-05-01"),
      dueDate: new Date("2026-05-31"),
      status: "sent",
      paymentNumber: 1,
      notes: "Milestone 1: Discovery & Strategy",
      clientId: client.id,
      projectId: project.id,
      createdById: abdullah.id,
      lineItems: {
        create: [
          {
            description: "Discovery & Strategy — Brand Identity & Web Design",
            quantity: 1,
            rate: BigInt(125000),
            amount: BigInt(125000),
            sortOrder: 1,
          },
        ],
      },
    },
  });
  console.log(`  ✓ Invoice: ${invoice.invoiceNumber} ($1,250 — ${invoice.status})`);

  console.log(`
─────────────────────────────────────────
  Seeding complete.

  Login:  abdullah.shahid@constellationdealer.com
  Pass:   Admin@1234
─────────────────────────────────────────`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
