import { Prisma } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";

export interface LedgerRow {
  id: string;
  type: "income" | "expense" | "payroll" | "distribution" | "commission" | "transfer" | "adjustment";
  date: string;
  period: string;
  description: string;
  party: string | null;
  reference: string | null;
  pkrAmount: number;
  status: string;
}

export interface LedgerQuery {
  period?: string;
  type?: "income" | "expense" | "payroll" | "distribution" | "commission" | "transfer" | "adjustment";
  page: number;
  pageSize: number;
}

type RawLedgerRow = {
  id: string;
  type: string;
  sort_date: Date;
  period: string;
  description: string;
  party: string | null;
  reference: string | null;
  pkr_amount: bigint | number;
  status: string;
};

function periodFilter(tableAlias: string, period?: string) {
  return period ? Prisma.sql`AND ${Prisma.raw(tableAlias)}.period = ${period}` : Prisma.empty;
}

function distributionPeriodFilter(period?: string) {
  return period ? Prisma.sql`AND d.period = ${period}` : Prisma.empty;
}

function buildLedgerUnion(type?: LedgerQuery["type"], period?: string): Prisma.Sql {
  const branches: Prisma.Sql[] = [];

  if (!type || type === "income") {
    branches.push(Prisma.sql`
      SELECT
        ir.id,
        'income'::text AS type,
        ir."receivedAt" AS sort_date,
        ir.period,
        COALESCE(ir."incomeType", 'Payment received') AS description,
        c."companyName" AS party,
        i."invoiceNumber" AS reference,
        ir."netPkr"::float8 AS pkr_amount,
        ir.status::text AS status
      FROM income_records ir
      INNER JOIN clients c ON c.id = ir."clientId"
      LEFT JOIN invoices i ON i.id = ir."invoiceId"
      WHERE 1=1 ${periodFilter("ir", period)}
    `);
  }

  if (!type || type === "expense") {
    branches.push(Prisma.sql`
      SELECT
        e.id,
        'expense'::text AS type,
        e.date::timestamp AS sort_date,
        e.period,
        (e.category || ': ' || e.description) AS description,
        NULL::text AS party,
        NULL::text AS reference,
        (-e."amountPkr")::float8 AS pkr_amount,
        'completed'::text AS status
      FROM expenses e
      WHERE e.category <> 'Salaries' ${periodFilter("e", period)}
    `);
  }

  if (!type || type === "payroll") {
    branches.push(Prisma.sql`
      SELECT
        pr.id,
        'payroll'::text AS type,
        COALESCE(pr."paidAt", pr."createdAt") AS sort_date,
        pr.period,
        ('Salary — ' || COALESCE(u.name, emp.name, 'Employee') || ' (' || pr.period || ')') AS description,
        COALESCE(u.name, emp.name, 'Employee') AS party,
        NULL::text AS reference,
        (-pr."netPkr")::float8 AS pkr_amount,
        pr.status::text AS status
      FROM payroll_records pr
      LEFT JOIN users u ON u.id = pr."userId"
      LEFT JOIN employees emp ON emp.id = pr."employeeId"
      WHERE pr.status = 'paid' ${periodFilter("pr", period)}
    `);
  }

  if (!type || type === "distribution") {
    branches.push(Prisma.sql`
      SELECT
        d.id,
        'distribution'::text AS type,
        d."runAt" AS sort_date,
        d.period,
        'Profit distribution'::text AS description,
        NULL::text AS party,
        d.period AS reference,
        (-d."totalDistributedPkr")::float8 AS pkr_amount,
        'completed'::text AS status
      FROM distributions d
      WHERE 1=1 ${distributionPeriodFilter(period)}
    `);
  }

  if (!type || type === "commission") {
    branches.push(Prisma.sql`
      SELECT
        cm.id,
        'commission'::text AS type,
        cm."createdAt" AS sort_date,
        cm.period,
        CASE
          WHEN cm."commissionType" = 'managing' THEN
            'Managing commission — ' || sa.name ||
            CASE WHEN p.name IS NOT NULL THEN ' (' || p.name || ')' ELSE '' END
          ELSE 'Commission accrued'
        END AS description,
        sa.name AS party,
        c."companyName" AS reference,
        (-cm."commissionPkr")::float8 AS pkr_amount,
        cm.status::text AS status
      FROM commissions cm
      INNER JOIN crm_accounts sa ON sa.id = cm."stakeholderAccountId"
      INNER JOIN clients c ON c.id = cm."clientId"
      LEFT JOIN projects p ON p.id = cm."projectId"
      WHERE cm.status IN ('approved', 'paid') ${periodFilter("cm", period)}
    `);
  }

  if (!type || type === "transfer") {
    branches.push(Prisma.sql`
      SELECT
        t.id,
        'transfer'::text AS type,
        t."transferAt" AS sort_date,
        t.period,
        t.description,
        (fa.name || ' → ' || ta.name) AS party,
        NULL::text AS reference,
        t."amountPkr"::float8 AS pkr_amount,
        t.status AS status
      FROM account_transfers t
      INNER JOIN crm_accounts fa ON fa.id = t."fromAccountId"
      INNER JOIN crm_accounts ta ON ta.id = t."toAccountId"
      WHERE 1=1 ${periodFilter("t", period)}
    `);
  }

  if (!type || type === "adjustment") {
    branches.push(Prisma.sql`
      SELECT
        a.id,
        'adjustment'::text AS type,
        a."adjustedAt" AS sort_date,
        a.period,
        COALESCE(a.note, 'Balance adjustment') AS description,
        ac.name AS party,
        NULL::text AS reference,
        a."amountPkr"::float8 AS pkr_amount,
        'completed'::text AS status
      FROM account_adjustments a
      INNER JOIN crm_accounts ac ON ac.id = a."accountId"
      WHERE 1=1 ${periodFilter("a", period)}
    `);
  }

  if (branches.length === 0) {
    return Prisma.sql`
      SELECT
        NULL::uuid AS id,
        NULL::text AS type,
        NULL::timestamp AS sort_date,
        NULL::text AS period,
        NULL::text AS description,
        NULL::text AS party,
        NULL::text AS reference,
        NULL::float8 AS pkr_amount,
        NULL::text AS status
      WHERE false
    `;
  }

  return Prisma.join(branches, " UNION ALL ");
}

function mapRow(row: RawLedgerRow): LedgerRow {
  return {
    id: row.id,
    type: row.type as LedgerRow["type"],
    date: row.sort_date.toISOString(),
    period: row.period,
    description: row.description,
    party: row.party,
    reference: row.reference,
    pkrAmount: Number(row.pkr_amount),
    status: row.status,
  };
}

export async function listLedgerEntries(q: LedgerQuery) {
  const union = buildLedgerUnion(q.type, q.period);
  const offset = (q.page - 1) * q.pageSize;

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<RawLedgerRow[]>`
      SELECT id, type, sort_date, period, description, party, reference, pkr_amount, status
      FROM (${union}) AS ledger
      ORDER BY sort_date DESC
      LIMIT ${q.pageSize} OFFSET ${offset}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count
      FROM (${union}) AS ledger
    `,
  ]);

  const total = Number(countRows[0]?.count ?? 0);

  return {
    items: rows.map(mapRow),
    total,
    page: q.page,
    pageSize: q.pageSize,
  };
}
