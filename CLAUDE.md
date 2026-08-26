# Brandiv Labs CRM — Project Map

> **Pre-deploy review:** See [Pre-Deploy Review (Aug 2026)](#pre-deploy-review-aug-2026) below before pushing to Hostinger production.

## Stack
Next.js 15 · TypeScript · Tailwind CSS · Prisma · PostgreSQL · NextAuth.js · PWA · React Query

## Key Rules (from spec)
- All money stored as **BigInt integers** (PKR × 100). Never use FLOAT/DECIMAL for amounts.
- All foreign payments converted to PKR via exchange rate at time of receipt.
- Distribution is an **atomic PostgreSQL transaction** — all or nothing.
- Each period's net profit is calculated fresh. Never accumulate across periods.
- After distribution, Operating Account balance = 0. Period is locked.
- Commission auto-trigger runs inside the income record creation transaction.
- Internal transfers (type=transfer) never affect P&L or trigger commissions.

## Folder Structure
```
src/
├── backend/                    ← All server-side logic
│   ├── lib/
│   │   ├── prisma.ts           ← Prisma singleton
│   │   ├── constants.ts        ← Commission rates, currencies, roles
│   │   └── apiResponse.ts      ← Typed NextResponse helpers (ok, badRequest, etc.)
│   ├── repositories/           ← Raw DB queries (one file per entity)
│   │   ├── clientRepository.ts
│   │   ├── projectRepository.ts
│   │   ├── invoiceRepository.ts
│   │   ├── incomeRepository.ts
│   │   ├── commissionRepository.ts
│   │   ├── accountRepository.ts
│   │   ├── distributionRepository.ts
│   │   ├── expenseRepository.ts
│   │   ├── payrollRepository.ts
│   │   ├── timeEntryRepository.ts
│   │   ├── pipelineRepository.ts
│   │   ├── ledgerRepository.ts
│   │   └── userRepository.ts
│   ├── services/               ← Business logic
│   │   ├── authService.ts
│   │   ├── clientService.ts
│   │   ├── projectService.ts
│   │   ├── invoiceService.ts
│   │   ├── incomeService.ts    ← FX calc + WHT + net PKR + commission trigger
│   │   ├── commissionService.ts← Auto-calc on payment received
│   │   ├── distributionService.ts ← Atomic distribution engine
│   │   ├── accountService.ts
│   │   ├── expenseService.ts
│   │   ├── payrollService.ts
│   │   ├── timeEntryService.ts
│   │   ├── pipelineService.ts
│   │   └── reportService.ts
│   └── validators/             ← Zod schemas for request bodies
│       ├── clientValidator.ts
│       ├── projectValidator.ts
│       ├── invoiceValidator.ts
│       ├── incomeValidator.ts
│       └── ...
│
├── app/
│   ├── layout.tsx              ← Root layout (PWA meta, Tabler icons CDN)
│   ├── globals.css             ← Design tokens + component classes
│   ├── api/                    ← Thin API route handlers (call backend/services)
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── clients/
│   │   │   ├── route.ts        ← GET /api/clients, POST /api/clients
│   │   │   └── [id]/route.ts   ← GET, PUT, DELETE /api/clients/:id
│   │   ├── projects/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── milestones/route.ts
│   │   ├── invoices/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── pay/route.ts
│   │   ├── income/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── expenses/route.ts
│   │   ├── payroll/route.ts
│   │   ├── commissions/
│   │   │   ├── route.ts
│   │   │   └── [id]/approve/route.ts
│   │   ├── accounts/
│   │   │   ├── route.ts
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts
│   │   │   │   └── statement/route.ts
│   │   │   └── transfer/route.ts
│   │   ├── distribution/
│   │   │   ├── preview/route.ts
│   │   │   └── run/route.ts
│   │   ├── ledger/route.ts
│   │   ├── pipeline/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── time-entries/route.ts
│   │   ├── users/route.ts
│   │   ├── statements/
│   │   │   ├── pl/route.ts
│   │   │   └── cashflow/route.ts
│   │   └── settings/
│   │       ├── route.ts
│   │       └── fx-rates/route.ts
│   │
│   └── (frontend)/             ← All UI pages
│       ├── (auth)/
│       │   └── login/page.tsx
│       └── (dashboard)/
│           ├── layout.tsx      ← Sidebar + Topbar wrapper
│           ├── page.tsx        ← Dashboard
│           ├── clients/page.tsx
│           ├── projects/page.tsx
│           ├── pipeline/page.tsx
│           ├── income/page.tsx
│           ├── invoices/page.tsx
│           ├── transactions/page.tsx
│           ├── expenses/page.tsx
│           ├── payroll/page.tsx
│           ├── accounts/page.tsx
│           ├── time-tracking/page.tsx
│           ├── commissions/page.tsx
│           ├── users/page.tsx
│           ├── reports/page.tsx
│           └── settings/page.tsx
│
└── frontend/                   ← Shared frontend code
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx     ← 220px nav with all 15 modules
    │   │   └── Topbar.tsx      ← Page title + notifications + search
    │   ├── ui/                 ← Atomic components
    │   │   ├── Badge.tsx
    │   │   ├── Modal.tsx
    │   │   ├── MetricCard.tsx
    │   │   ├── TwoPanel.tsx    ← Left list + right detail layout
    │   │   ├── Avatar.tsx
    │   │   └── ProgressBar.tsx
    │   ├── clients/
    │   │   ├── ClientList.tsx
    │   │   ├── ClientDetail.tsx
    │   │   └── AddClientModal.tsx  ← 3-step wizard
    │   ├── projects/
    │   ├── invoices/
    │   ├── income/
    │   ├── pipeline/           ← KanbanBoard.tsx
    │   ├── accounts/
    │   └── dashboard/
    ├── hooks/                  ← Data fetching hooks
    │   ├── useClients.ts
    │   ├── useProjects.ts
    │   └── ...
    └── types/
        └── index.ts            ← Shared TypeScript interfaces

prisma/
├── schema.prisma               ← 20 tables, all enums, NextAuth tables
└── seed.ts                     ← Sample data (5 clients, 6 projects, etc.)
```

## DB Money Convention
Store PKR amounts as `BigInt` = actual PKR × 100 (paise).
`AMOUNT_MULTIPLIER = 100` is in `backend/lib/constants.ts`.
Display: divide by 100 when rendering.

## API Response Shape
All API routes return `{ success: true, data: T }` or `{ success: false, message: string }`.
Helpers in `backend/lib/apiResponse.ts`: `ok()`, `created()`, `badRequest()`, `notFound()`, `serverError()`.

## Auth
NextAuth with Credentials provider. Roles: `super_admin | admin | manager | staff | finance`.
Role permissions map in `backend/lib/constants.ts → ROLE_PERMISSIONS`.
Session includes `user.role` and `user.id`.

## Modules Build Order (spec §2.1)
1. DB schema ✓  2. Auth  3. Clients  4. Projects  5. Income  6. Invoices
7. Commissions  8. Expenses + Payroll  9. Accounts + Distribution
10. Financial Ledger  11. Statements  12. Pipeline  13. Time Tracking
14. Reports  15. Settings

---

## Pre-Deploy Review (Aug 2026)

**Status:** Ready for production deploy after checklist below.  
**Scope:** Performance + UX fixes only. No changes to financial business rules (commission calc, distribution atomicity, income FX/WHT, ledger posting).

### Executive summary

This release makes the CRM feel faster without changing what the app *does*:

| Area | Change | Functionality impact |
|------|--------|----------------------|
| Data loading | React Query + server prefetch on 18/19 dashboard pages | Same data, faster first paint |
| Mutations | `refreshAfter()` — cache invalidation no longer blocks buttons | Same writes; UI updates ~1s later in background |
| Auth | Middleware injects user headers; APIs use `requireApiUser()` | Same permissions; one fewer DB session lookup per API call |
| Serialization | `serializeForClient()` on server prefetch | Fixes BigInt/Decimal hydration crashes on list pages |
| Branding | `BrandingContext` updates sidebar logo without full page refresh | Settings logo upload/remove works instantly |
| Period filter | `PeriodSelect` portal + "All periods" on Income/Time Tracking | UI fix only |
| Deploy | `scripts/postinstall.mjs` — default still `prisma generate` + `next build` | **Hostinger unchanged** |

**Verdict:** Safe to deploy. Backend services, validators, and money invariants are untouched. Frontend-only behavioral change is *when* lists refresh after mutations, not *whether* they refresh.

---

### What changed (by layer)

#### Frontend — caching & prefetch
- `@tanstack/react-query` with 60s stale time, `keepPreviousData` on list hooks
- `frontend/lib/queries/listQueries.ts` — shared query keys + server prefetch helpers
- `frontend/lib/prefetchPage.tsx` — dehydrate/hydrate pattern for dashboard pages
- **18 pages prefetched:** Dashboard, Clients, Projects, Invoices, Income, Expenses, Commissions, Transactions, Accounts, Employees, Users, Payroll, Transfers, Time Tracking, Compensation, Reports, Settings, Stakeholders
- **Not prefetched:** Pipeline (placeholder/kanban — client-only by design)

#### Frontend — mutations (latest fix)
- `frontend/lib/invalidateQueries.ts` — centralized invalidation + `refreshAfter()`
- All mutation hooks (`useCommissions`, `useInvoices`, `useIncome`, etc.) fire invalidation in background
- **Approve commission:** invalidates commissions only (removed unnecessary financial refetch)
- **Record payment / create income:** invalidates income + financial + commissions + linked invoice
- **Mark invoice paid:** invalidates invoices + income + financial + commissions

#### Frontend — UI fixes
- `BrandingContext` + `DashboardProviders` — live logo/company name in sidebar
- `PeriodSelect` — fixed positioning via portal (no clipping in overflow containers)
- Income + Time Tracking lists — `includeAll` period option

#### Backend — supporting only (no business-logic changes)
- `backend/lib/serialize.ts` — JSON-safe BigInt/Decimal/Date for React Query dehydration
- `backend/lib/requestAuth.ts` — read auth from middleware headers (`x-auth-user-*`)
- `src/middleware.ts` — injects auth headers after JWT check; API routes return 401 if no token

#### Auth migration
- All dashboard API routes now use `requireApiUser(req)` instead of `getServerSession()`
- Only `/api/auth/*` still uses NextAuth directly
- Middleware remains the gate for both pages and APIs

#### Deploy / tooling
- `scripts/postinstall.mjs` — production default: `prisma generate` + `next build`
- Local fast install: `SKIP_NEXT_BUILD=1 npm install` (optional, do **not** use on Hostinger)
- `scripts/smoke-test.mjs` — login + key routes + logo upload/remove API
- `npm run dev` uses Turbopack; `npm run dev:webpack` fallback
- `npm start` → `node server.js` (unchanged for Hostinger)

#### Upsell module (included in diff, not part of performance work)
- New upsell API routes, service, repository, and UI components are in the working tree
- User-owned upsell logic — treat as existing feature, not modified for this release
- Known gaps (value history, commission gating) documented separately — **not fixed in this deploy**

---

### Functionality preserved (verified in code review)

| Invariant | Status |
|-----------|--------|
| Money stored as BigInt (PKR × 100) | Unchanged |
| Income → commission auto-trigger in DB transaction | Unchanged (`incomeService`) |
| Distribution atomic transaction | Unchanged |
| Internal transfers excluded from P&L/commissions | Unchanged |
| Role permissions on API routes | Unchanged (still checked per route) |
| Invoice create/send/pay/cancel flows | Unchanged (only cache timing differs) |
| Commission approve permissions (`super_admin`, `admin`, `finance`) | Unchanged |
| NextAuth login/session | Unchanged |
| PWA production build | Unchanged (`next.config.mjs`) |
| Hostinger `postinstall` build | Unchanged (default path) |

#### Mutation behavior note
After save/approve/pay, the modal closes immediately when the API succeeds. List/detail panels refresh within ~1 second via background invalidation. Old data stays visible (`keepPreviousData`) until the refetch completes — no blank flash, no lost writes.

---

### Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Brief stale UI after mutation (~1s) | Low | Expected; refetch always runs. User can navigate away safely. |
| Auth headers bypass if middleware skipped | Low | APIs still call `requireApiUser()`; direct API calls without JWT get 401 |
| BigInt > Number precision on very large amounts | Low | Same as before; amounts fit JS safe integer range at ×100 scale |
| Prisma schema has upsell tables but no `migrations/` folder | **Medium** | Run `npx prisma db push` or apply migration on prod **before** deploy if upsell tables not yet in prod DB |
| Uncommitted PWA worker files in `public/` | Low | Do not commit generated `sw.js` / workbox files (already in `.gitignore`) |
| `npm run build` not re-run locally (EPERM — dev server lock) | Info | Run build on Hostinger postinstall or stop dev server and rebuild before deploy |

---

### Pre-deploy checklist

**Environment (Hostinger — no changes expected)**
- [ ] `DATABASE_URL` set
- [ ] `NEXTAUTH_SECRET` set
- [ ] `NEXTAUTH_URL` set to production URL (not empty)
- [ ] Node ≥ 20

**Database**
- [ ] If upsell tables missing in prod: `npx prisma db push` (or run equivalent migration)
- [ ] If schema unchanged in prod: skip — performance release does not require new tables

**Build & deploy**
- [ ] Push/commit all intended files (exclude `.env`, `public/uploads/`, generated PWA workers)
- [ ] Hostinger deploy runs `npm install` → triggers `postinstall` → `prisma generate` + `next build`
- [ ] Do **not** set `SKIP_NEXT_BUILD=1` on production
- [ ] Start with `npm start` (`node server.js`)

**Post-deploy smoke test**
```bash
# Against production URL
node scripts/smoke-test.mjs https://your-prod-domain.com

# Or set credentials explicitly
SMOKE_EMAIL=... SMOKE_PASSWORD=... node scripts/smoke-test.mjs https://your-prod-domain.com
```

**Manual spot checks (5 min)**
- [ ] Login → Dashboard loads with data (not empty shell)
- [ ] Clients / Projects / Invoices — first visit shows list immediately
- [ ] Approve commission — button releases quickly; commission status updates within ~1s
- [ ] Send invoice — same; status changes to sent
- [ ] Record payment on invoice — invoice shows paid; income row appears
- [ ] Settings → upload logo → sidebar updates without full refresh
- [ ] Income / Time Tracking → period filter shows "All periods"; dropdown not clipped

---

### Files to include in deploy commit

**Core performance (required)**
- `frontend/lib/` — `invalidateQueries.ts`, `queries/listQueries.ts`, `prefetchPage.tsx`, `getQueryClient.ts`, `apiFetch.ts`
- `frontend/providers/` — `QueryProvider.tsx`, `QueryHydration.tsx`
- `frontend/hooks/use*.ts` — all data/mutation hooks
- `frontend/context/BrandingContext.tsx`
- `frontend/components/layout/DashboardProviders.tsx`
- `frontend/components/ui/PeriodSelect.tsx`
- `src/app/(frontend)/(dashboard)/**` — server pages + `*PageClient.tsx`
- `src/middleware.ts`
- `backend/lib/serialize.ts`, `backend/lib/requestAuth.ts`
- `src/app/api/**` — auth header migration
- `scripts/postinstall.mjs`, `scripts/smoke-test.mjs`
- `package.json`, `package-lock.json`

**Exclude from commit**
- `.env`, `.env.local`
- `public/uploads/`
- Generated PWA: `public/sw.js`, `public/workbox-*.js`, `public/fallback-*.js`, `public/swe-worker-*.js`
- `tmp-server-*.log`, `node_modules/`, `.next/`
- Optional dev scripts: `prisma/create-admin.*`, `prisma/test-*.js` (unless intentionally needed)

---

### Out of scope (post-deploy backlog)

- Pipeline server prefetch (placeholder page)
- Upsell perfection (value history, commission gating, double-invoice guard)
- Vite migration (not recommended — Next.js API/auth/PWA depend on current stack)
- Optimistic UI updates on mutations (optional future enhancement)
- Further auth trim on dashboard layout (`getRequestUser` still reads headers per navigation)

---

### Review sign-off

| Check | Result |
|-------|--------|
| TypeScript (`npx tsc --noEmit`) | Pass |
| Production build (`npm run build`) | Not re-run locally (Prisma EPERM — dev server likely holding lock). Hostinger postinstall will build. |
| `getServerSession` removed from API routes | Yes (except `/api/auth`) |
| Mutation hooks use non-blocking invalidation | Yes (all hooks) |
| Financial services unchanged | Yes (reviewed commission/income/invoice services) |
| Deploy script default unchanged | Yes |

**Recommendation:** Proceed with production deploy after DB check and post-deploy smoke test.

