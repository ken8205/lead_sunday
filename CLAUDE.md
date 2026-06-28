# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint

npm run db:generate  # Generate Drizzle migration files
npm run db:migrate   # Run migrations
npm run db:push      # Push schema directly to DB (dev shortcut)
npm run db:studio    # Open Drizzle Studio (DB GUI)
```

> **Windows note:** Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` once in PowerShell if `npm` commands fail with a script execution policy error.

## Architecture

This is a lead collection app (이름, 이메일, 전화번호) built with Next.js App Router.

**Data layer:**
- `src/db/schema.ts` — Drizzle schema. The `leads` table is the only table.
- `src/db/index.ts` — Drizzle client (`db`) using `postgres` driver connected via `DATABASE_URL`.
- `drizzle.config.ts` — Points to the schema above; migration output goes to `./drizzle/`.

**Supabase clients:**
- `src/lib/supabase/client.ts` — Browser client (use in Client Components).
- `src/lib/supabase/server.ts` — Server client using `next/headers` cookies (use in Server Components and Route Handlers).

**UI:**
- `src/components/LeadForm.tsx` — Client Component with controlled form state. `handleSubmit` is the integration point for the future server action or API call.
- `src/app/page.tsx` — Single page that renders `LeadForm` centered on screen.

## Environment variables

Copy `.env.local` values from Supabase dashboard (Settings → API and Settings → Database):

```
DATABASE_URL=                      # Postgres connection string (Transaction mode)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
