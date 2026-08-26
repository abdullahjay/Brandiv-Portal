#!/usr/bin/env node
/**
 * HTTP smoke test: login via NextAuth credentials, then hit key routes.
 * Usage: node scripts/smoke-test.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? "http://localhost:3000";
const EMAIL = process.env.SMOKE_EMAIL ?? "abdullah.shahid@constellationdealer.com";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "Admin@1234";

const ROUTES = [
  "/dashboard",
  "/clients",
  "/projects",
  "/invoices",
  "/income",
  "/expenses",
  "/settings",
  "/transfers",
  "/compensation",
];

function parseSetCookie(headers) {
  const raw = headers.getSetCookie?.() ?? [];
  const jar = new Map();
  for (const line of raw) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  return jar;
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function main() {
  const jar = new Map();
  let passed = 0;
  let failed = 0;

  // CSRF
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { redirect: "manual" });
  for (const [k, v] of parseSetCookie(csrfRes.headers)) jar.set(k, v);
  const { csrfToken } = await csrfRes.json();
  if (!csrfToken) throw new Error("No CSRF token");

  // Login
  const loginBody = new URLSearchParams({
    csrfToken,
    email: EMAIL,
    password: PASSWORD,
    callbackUrl: `${BASE}/dashboard`,
    json: "true",
  });
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(jar),
    },
    body: loginBody,
    redirect: "manual",
  });
  for (const [k, v] of parseSetCookie(loginRes.headers)) jar.set(k, v);

  const loginJson = await loginRes.json().catch(() => ({}));
  if (loginJson.error) {
    console.error("LOGIN FAILED:", loginJson.error);
    process.exit(1);
  }
  console.log("✓ Login OK");

  // Session check
  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: cookieHeader(jar) },
  });
  const session = await sessionRes.json();
  if (!session?.user?.email) {
    console.error("SESSION FAILED:", session);
    process.exit(1);
  }
  console.log(`✓ Session: ${session.user.email} (${session.user.role})`);

  // Protected pages
  for (const route of ROUTES) {
    const res = await fetch(`${BASE}${route}`, {
      headers: { Cookie: cookieHeader(jar) },
      redirect: "manual",
    });
    const ok = res.status === 200;
    console.log(`${ok ? "✓" : "✗"} ${route} → ${res.status}`);
    if (ok) passed++;
    else failed++;
  }

  // Settings API (branding source)
  const settingsRes = await fetch(`${BASE}/api/settings`, {
    headers: { Cookie: cookieHeader(jar) },
  });
  const settingsJson = await settingsRes.json();
  const settingsOk = settingsRes.status === 200 && settingsJson.success !== false;
  console.log(
    `${settingsOk ? "✓" : "✗"} /api/settings → ${settingsRes.status}` +
      (settingsOk ? ` (company: ${settingsJson.data?.company_name ?? "—"})` : "")
  );
  if (settingsOk) passed++;
  else failed++;

  // Logo upload + remove (branding API)
  const pngBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  const form = new FormData();
  form.append("logo", new Blob([pngBytes], { type: "image/png" }), "smoke-logo.png");
  const uploadRes = await fetch(`${BASE}/api/settings/upload-logo`, {
    method: "POST",
    headers: { Cookie: cookieHeader(jar) },
    body: form,
  });
  const uploadJson = await uploadRes.json();
  const uploadOk = uploadRes.status === 200 && uploadJson.success && uploadJson.data?.logoUrl;
  console.log(`${uploadOk ? "✓" : "✗"} POST /api/settings/upload-logo → ${uploadRes.status}`);
  if (uploadOk) passed++;
  else failed++;

  if (uploadOk) {
    const removeRes = await fetch(`${BASE}/api/settings`, {
      method: "PUT",
      headers: { Cookie: cookieHeader(jar), "Content-Type": "application/json" },
      body: JSON.stringify({ logo_url: null }),
    });
    const removeJson = await removeRes.json();
    const removeOk = removeRes.status === 200 && removeJson.success !== false;
    console.log(`${removeOk ? "✓" : "✗"} PUT /api/settings (remove logo) → ${removeRes.status}`);
    if (removeOk) passed++;
    else failed++;
  }

  // Branding context wiring check in HTML (settings page should include BrandingProvider)
  const settingsHtml = await fetch(`${BASE}/settings`, {
    headers: { Cookie: cookieHeader(jar) },
  }).then((r) => r.text());
  const hasSidebar = settingsHtml.includes("Brandiv CRM") || settingsHtml.includes("sidebar");
  console.log(`${hasSidebar ? "✓" : "✗"} Settings page renders dashboard shell`);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
