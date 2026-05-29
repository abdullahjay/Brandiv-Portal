# Brandiv Labs CRM — Project Map

## Stack
Next.js 14 · TypeScript · Tailwind CSS · Prisma · PostgreSQL · NextAuth.js · PWA

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
