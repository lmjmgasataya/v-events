# v-4-events

Event registration and check-in: create an event, share its public registration link, add or CSV-import participants, check people in at the door, and view reports.

## Setup

```bash
nvm use 24
npm install
cp .env.local.example .env.local   # use the same DATABASE_URL / DATABASE_URL_UNPOOLED as v-1
npm run db:push                    # creates the er_* tables only (see drizzle.config.ts tablesFilter)
npm run db:seed                    # creates admin / changeme
npm run dev
```

This app shares v-1's database. All of its tables are prefixed `er_`; drizzle-kit is scoped to `er_*`, so it won't touch v-1's tables. See `CLAUDE.md` for details.

## CSV import format

Header row, any column order. Only Last Name and First Name are required.

```
Last Name,First Name,Contact Number,Service Attended,Lifestage,Status(Registered),Date of Registration
Dela Cruz,Juan,09171234567,9AM - Mandurriao,Single,Registered,2026-09-15
```

Tab-delimited files and Excel-saved CSVs work. People already in the event (same name and contact number) are skipped.
