import { Prisma } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { AMOUNT_MULTIPLIER } from "@backend/lib/constants";
import type { CreateEmployeeInput, UpdateEmployeeInput, ListEmployeesInput } from "@backend/validators/employeeValidator";

const EMPLOYEE_SELECT = {
  id: true,
  name: true,
  designation: true,
  department: true,
  email: true,
  phone: true,
  cnic: true,
  joinDate: true,
  baseSalary: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function findAllEmployees(input: ListEmployeesInput) {
  const { search, status, department, page, pageSize } = input;
  const where: Prisma.EmployeeWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { designation: { contains: search, mode: "insensitive" } },
      { department: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status !== "all") where.status = status as "active" | "inactive";
  if (department) where.department = { contains: department, mode: "insensitive" };

  const [items, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      select: EMPLOYEE_SELECT,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function findEmployeeById(id: string) {
  return prisma.employee.findUnique({ where: { id }, select: EMPLOYEE_SELECT });
}

export async function createEmployee(data: CreateEmployeeInput) {
  return prisma.employee.create({
    data: {
      name: data.name,
      designation: data.designation ?? null,
      department: data.department ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      cnic: data.cnic ?? null,
      joinDate: data.joinDate ? new Date(data.joinDate) : null,
      baseSalary: data.baseSalary != null ? BigInt(Math.round(data.baseSalary * AMOUNT_MULTIPLIER)) : null,
      status: data.status ?? "active",
      notes: data.notes ?? null,
    },
    select: EMPLOYEE_SELECT,
  });
}

export async function updateEmployee(id: string, data: UpdateEmployeeInput) {
  const updateData: Prisma.EmployeeUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.designation !== undefined) updateData.designation = data.designation ?? null;
  if (data.department !== undefined) updateData.department = data.department ?? null;
  if (data.email !== undefined) updateData.email = data.email ?? null;
  if (data.phone !== undefined) updateData.phone = data.phone ?? null;
  if (data.cnic !== undefined) updateData.cnic = data.cnic ?? null;
  if (data.joinDate !== undefined) updateData.joinDate = data.joinDate ? new Date(data.joinDate) : null;
  if (data.baseSalary !== undefined) updateData.baseSalary = data.baseSalary != null ? BigInt(Math.round(data.baseSalary * AMOUNT_MULTIPLIER)) : null;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes ?? null;

  return prisma.employee.update({ where: { id }, data: updateData, select: EMPLOYEE_SELECT });
}

export async function employeeExists(id: string): Promise<boolean> {
  return (await prisma.employee.count({ where: { id } })) > 0;
}

export async function deleteEmployee(id: string): Promise<void> {
  await prisma.employee.delete({ where: { id } });
}
