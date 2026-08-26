import { NextResponse } from "next/server";
import { serializeForClient } from "@backend/lib/serialize";

function serialize<T>(data: T): T {
  return serializeForClient(data);
}

function extractMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  return "Internal server error";
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data: serialize(data) }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(message: string, errors?: unknown) {
  return NextResponse.json({ success: false, message, errors }, { status: 400 });
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ success: false, message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ success: false, message }, { status: 403 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ success: false, message }, { status: 404 });
}

export function serverError(err: unknown = "Internal server error") {
  const message = extractMessage(err);
  // Log the full error on the server so it's visible in the terminal
  if (err instanceof Error) console.error("[API Error]", err);
  return NextResponse.json({ success: false, message }, { status: 500 });
}
