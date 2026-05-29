import {
  findAllEmployees,
  findEmployeeById,
  createEmployee,
  updateEmployee,
  employeeExists,
  deleteEmployee,
} from "@backend/repositories/employeeRepository";
import type { CreateEmployeeInput, UpdateEmployeeInput, ListEmployeesInput } from "@backend/validators/employeeValidator";

export async function listEmployees(input: ListEmployeesInput) {
  return findAllEmployees(input);
}

export async function getEmployee(id: string) {
  return findEmployeeById(id);
}

export async function addEmployee(data: CreateEmployeeInput) {
  return createEmployee(data);
}

export async function editEmployee(id: string, data: UpdateEmployeeInput) {
  const exists = await employeeExists(id);
  if (!exists) return null;
  return updateEmployee(id, data);
}

export async function deactivateEmployee(id: string): Promise<boolean> {
  const exists = await employeeExists(id);
  if (!exists) return false;
  await updateEmployee(id, { status: "inactive" });
  return true;
}

export async function reactivateEmployee(id: string): Promise<boolean> {
  const exists = await employeeExists(id);
  if (!exists) return false;
  await updateEmployee(id, { status: "active" });
  return true;
}

export async function removeEmployee(id: string): Promise<boolean> {
  const exists = await employeeExists(id);
  if (!exists) return false;
  await deleteEmployee(id);
  return true;
}
