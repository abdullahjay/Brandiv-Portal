import {
  findManyPayroll,
  findPayrollById,
  createPayrollRecord,
  updatePayrollRecord,
  markPayrollPaid,
  payrollDuplicate,
  runPayrollBatch,
} from "@backend/repositories/payrollRepository";
import type { CreatePayrollInput, UpdatePayrollInput, ListPayrollInput, RunPayrollInput } from "@backend/validators/payrollValidator";

export async function listPayroll(input: ListPayrollInput) {
  return findManyPayroll(input);
}

export async function getPayrollRecord(id: string) {
  return findPayrollById(id);
}

export async function addPayrollRecord(input: CreatePayrollInput) {
  const isDuplicate = await payrollDuplicate(input.userId, input.employeeId, input.period);
  if (isDuplicate) {
    throw new Error(`A payroll record for this person already exists for ${input.period}`);
  }
  return createPayrollRecord(input);
}

export async function editPayrollRecord(id: string, input: UpdatePayrollInput) {
  const existing = await findPayrollById(id);
  if (!existing) return null;
  if (existing.status === "paid") {
    throw new Error("Cannot edit a paid payroll record");
  }
  return updatePayrollRecord(id, input);
}

export async function payPayrollRecord(id: string) {
  const existing = await findPayrollById(id);
  if (!existing) return null;
  if (existing.status === "paid") {
    throw new Error("Payroll record is already marked as paid");
  }
  return markPayrollPaid(id);
}

export async function runBatchPayroll(input: RunPayrollInput) {
  return runPayrollBatch(input);
}
