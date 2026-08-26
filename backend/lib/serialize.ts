/**
 * Convert Prisma/API values to plain JSON-safe types for client hydration.
 * Handles BigInt (stored as amount × 100) and Prisma Decimal fields.
 */
export function serializeForClient<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (typeof value === "bigint") return Number(value);
      if (value instanceof Date) return value.toISOString();
      if (
        value !== null &&
        typeof value === "object" &&
        typeof (value as { toNumber?: () => number }).toNumber === "function"
      ) {
        return (value as { toNumber: () => number }).toNumber();
      }
      return value;
    })
  );
}
