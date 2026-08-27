/**
 * One-time cleanup: remove expense rows that duplicate paid payroll_records.
 * Payroll records remain the canonical source in P&L, Cash Flow, Account Statement, and Ledger.
 *
 * Usage: npx tsx scripts/cleanup-payroll-expenses.ts
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { removePayrollMirrorExpenses } from "../backend/lib/financialFilters";

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env.development"));
loadEnvFile(resolve(process.cwd(), ".env"));

async function main() {
  const removed = await removePayrollMirrorExpenses();
  console.log(`Removed ${removed} payroll mirror expense row(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../backend/lib/prisma");
    await prisma.$disconnect();
  });
