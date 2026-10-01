# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

Run `nvm use 24` before any `npm` command.

```bash
# Development
npm run dev          # Start dev server (binds 0.0.0.0)
npm run build        # Production build
npm run lint         # ESLint

# Database
npm run db:generate  # Generate Drizzle migration files from schema changes
npm run db:migrate   # Apply pending migrations (uses DATABASE_URL_UNPOOLED)
npm run db:push      # Push schema directly without migration files
npm run db:studio    # Open Drizzle Studio GUI
npm run db:seed      # Seed the default admin user (loads .env.local automatically)
```

There are no tests configured in this project.

### Shared database with v-1 — read before touching the schema

This app **reuses v-1's Supabase database**. Every table this app owns is prefixed `er_`, and `drizzle.config.ts` sets `tablesFilter: ["er_*"]` so `db:push`/`db:generate` only ever see and change `er_*` tables — without it, drizzle-kit would try to drop all of v-1's tables. Migration history is kept in `__er_drizzle_migrations` (not v-1's `__drizzle_migrations`).

- New tables **must** be named `er_<something>`.
- Don't use `pgEnum` — Postgres enums are database-wide, not table-scoped, so they aren't covered by `tablesFilter` and can collide with v-1's (v-1 already owns `lifestage`, `user_role`, etc.). Use `text` columns and validate in code.
- Never import or query v-1's tables from here.

## Architecture

**Events** — event registration and check-in. Staff create an event, which gets a public shareable link (`/e/<slug>`) where people self-register. Staff can also add participants manually or import them from CSV, check people in at the door, and view reports.

### Stack
- **Next.js 16 App Router** with React 19 — all pages under `src/app/`
- **Drizzle ORM** on PostgreSQL — schema in `src/db/schema/index.ts`, client in `src/db/index.ts`
- **JWT sessions** via `jose` — `src/lib/auth.ts`, stored in the `er_session` cookie (12h, HS256)
- **Tailwind CSS 4** — custom colors `er-navy` / `er-accent` / `er-green` / `er-amber` defined via `@theme` in `src/app/globals.css`

### Data model
- `er_users` — staff accounts: `username`, `passwordHash` (bcryptjs), `name`, `role` (`admin` | `volunteer`)
- `er_events` — `name`, `description`, `venue`, `startsAt`, `endsAt`, `publicSlug` (unique random token for the public link), `registrationOpen`
- `er_participants` — one row per person **per event** (`eventId` FK, cascade delete): `lastName`, `firstName`, `contactNumber` (`''` when unknown, never null), `serviceAttended`, `lifestage`, `status` (default `Registered`, `Walk-in` for walk-ins), `registeredAt`, `source` (`manual` | `csv` | `public` | `walk_in`), `checkedInAt` / `checkedInById` (null = not checked in). Unique index `er_participants_event_person_uq` on `(eventId, lower(lastName), lower(firstName), contactNumber)` — the dedup rule for every add path.

Check-in lives on the participant row (one check-in per participant per event), not a separate table.

### Route sections
- `src/app/page.tsx` — dashboard: upcoming/ongoing and past events with registered/checked-in counts
- `src/app/events/new/` — create event; `src/app/events/actions.ts` has `createEvent`/`updateEvent`/`deleteEvent` (admin-only)/`setRegistrationOpen`/`regeneratePublicLink`
- `src/app/events/[id]/` — `layout.tsx` (header + `EventTabs`) wraps:
  - `page.tsx` — overview: stats, `PublicLinkCard` (copy/share/QR, open/close registration, regenerate link), delete
  - `participants/` — list with `?q=` search and `?filter=checked-in|not-checked-in`; add (modal), edit (`[participantId]/edit`), remove, CSV import (`ImportParticipantsModal` → `importParticipantsCsv`)
  - `check-in/` — `CheckInWorkspace`: whole roster loaded once and filtered client-side for instant search, `useOptimistic` check-in/undo, Enter checks in a single match, walk-in modal, auto-`router.refresh()` every 20s to pick up other devices' check-ins
  - `report/` — totals plus breakdowns by service / lifestage / status / source, check-ins by hour, registrations by date (queries in `src/lib/reports.ts`)
  - `export/route.ts` — participants CSV download
- `src/app/reports/` — all-events summary table; `export/route.ts` downloads it as CSV
- `src/app/e/[slug]/` — **public** event page + self-registration (`registerForEvent`), `success/` confirmation
- `src/app/login/` — staff login

### Patterns
**Auth gating** — every staff page/action/route starts with:
```ts
const session = await getSession();
if (!session) redirect("/login");
```
`src/proxy.ts` additionally guards `/`, `/events/*`, `/reports/*`. `/e/*` and `/login` must stay public.

**Mutations use Server Actions**, not API routes. Route handlers exist only for CSV downloads and `api/health`.

**Shared participant fields/validation** — `src/components/ParticipantFields.tsx` (inputs) and `src/lib/participants.ts` (`readParticipantInput` / `validateParticipantInput` / `toParticipantValues`) are used by the staff add/edit forms, walk-in, and the public form. When adding a participant field, change these once. Duplicate inserts are detected via `isUniqueViolation` (`src/lib/db-errors.ts`) on the unique index rather than a pre-check.

**CSV import** (`src/lib/csv.ts` + `importParticipantsCsv`) — columns are matched by header name (case/punctuation-insensitive, with aliases), so column order doesn't matter; only Last Name and First Name are required. Accepts comma- or tab-delimited text and strips the Excel BOM. `Date of Registration` is parsed by `parseRegistrationDate` (`src/lib/date.ts`; ISO, `M/D/YYYY [h:mm AM]`, or anything `Date.parse` reads), as Manila time; blank → now. Rows are bulk-inserted in chunks with `onConflictDoNothing`, so existing participants are skipped and counted as duplicates. Imported contact numbers are normalized but not format-validated. The participants export writes the same seven columns first, so an export can be re-imported.

**Time zone** — all display/parsing is Asia/Manila (fixed UTC+8) via `src/lib/date.ts`; datetime-local inputs are Manila wall time (`toManilaDateTimeLocal` / `fromManilaDateTimeLocal`).

**Toasts** — `withToast(path, type, message)` on a redirect, or `useToastOnResult(state)` / `useToast().showToast` on the client.

**Path alias:** `@/*` maps to `src/*`.

### Environment variables
- `DATABASE_URL` — pooled connection (runtime); same database as v-1
- `DATABASE_URL_UNPOOLED` — direct connection (drizzle-kit)
- `SESSION_SECRET` — JWT signing secret
- `APP_URL` — optional public origin for shareable event links; defaults to the request host
