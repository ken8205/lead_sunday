# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Before writing code

This project pins a Next.js version with breaking changes relative to training data (see `AGENTS.md`). Check `node_modules/next/dist/docs/` for the relevant guide and any deprecation notices before using App Router APIs.

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

There is no test suite configured in this repo.

> **Windows note:** Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` once in PowerShell if `npm` commands fail with a script execution policy error.

## Architecture

A Korean-language lead collection app built with Next.js App Router: a public form at `/` writes to the `leads` table, and a password-gated `/admin` area lists/edits leads and attaches internal memos to them.

**Data layer (`src/db/`, `src/lib/supabase/`):**
- `src/db/schema.ts` — Drizzle schema, two tables: `leads` (name/email/phone/inquiry, email unique) and `leadMemos` (free-text notes, cascades on lead delete).
- `src/db/index.ts` — Drizzle client (`db`) using the `postgres` driver, connected via `DATABASE_URL`. All reads/writes go through this, not through Supabase.
- `src/lib/supabase/client.ts` / `server.ts` — Supabase auth/browser clients (`@supabase/ssr`). Present for future use; the admin login flow below does not use them.
- `src/app/actions.ts` — the single `"use server"` module holding all data access: `createLead`, `getLeads`, `getLeadById`, `updateLead`, `deleteLead`, `getLeadsWithMemos` (leads joined with their memos in-memory), `getMemosForLead`, `addMemo`, plus `reportError`. Client components call these directly as server actions rather than hitting API routes.

**Admin auth (`src/lib/admin-auth.ts`, `src/middleware.ts`):**
- Single shared password via `ADMIN_PASSWORD` env var — no user accounts. `computeToken` SHA-256-hashes `password + SALT` to produce the cookie value; the cookie itself (`admin_auth`) is the token, not a session id.
- `middleware.ts` gates every `/admin/*` route except `/admin/login`: no `ADMIN_PASSWORD` set or a missing/mismatched cookie redirects to `/admin/login`.
- `src/app/admin/login/actions.ts` sets/clears the cookie (`login`/`logout` server actions) on top of the same `computeToken` logic.

**Notifications (in `src/app/actions.ts`):**
- Every `createLead` call sends an HTML email via Resend to a hardcoded address, and fires a PostHog server-side `lead_created` event. Both are best-effort: failures are logged, never thrown back to the caller.
- `reportError` sends a similar Resend email and is invoked from `src/app/error.tsx` and `src/app/global-error.tsx` on render errors, so uncaught exceptions page the same inbox.

**Analytics (PostHog):**
- Server-side capture: `src/lib/posthog/server.ts`, only active when `NEXT_PUBLIC_POSTHOG_KEY` is set and `NODE_ENV === "production"`.
- Client-side: `src/app/providers.tsx` (`PHProvider`, same production-only gating) initializes `posthog-js` and wraps `RootLayout`; `src/app/PostHogPageView.tsx` fires manual `$pageview` events on route change (`capture_pageview: false` at init).
- `next.config.ts` rewrites `/ingest/*` to PostHog's ingestion domains so requests go through the app's own origin instead of posthog's, to dodge ad blockers. Update those destinations if switching to PostHog's EU cloud.

**UI:**
- `src/app/page.tsx` → `LeadForm` — public intake form, client-side controlled state, calls `createLead` directly.
- `src/app/admin/page.tsx` → `LeadsTable` — lists leads with memo previews; row actions call `deleteLead` / navigate to edit.
- `src/app/admin/[id]/edit/page.tsx` → `LeadEditForm` + `LeadMemos` — edit a lead's fields and append memos (`addMemo`), each via its own server action call and `router.refresh()`/`router.push()` rather than a full form post.
- `FormField` / `TextAreaField` (`src/components/`) are the shared input primitives used by both the public and admin forms.

## Environment variables

Copy `.env.local` values from Supabase dashboard (Settings → API and Settings → Database) plus the service-specific keys below:

```
DATABASE_URL=                      # Postgres connection string (Transaction mode)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ADMIN_PASSWORD=                    # Shared password gating /admin/*
RESEND_API_KEY=                    # Lead + error notification emails; notifications silently disabled if unset
NEXT_PUBLIC_POSTHOG_KEY=           # Analytics; both server and client capture are no-ops if unset or outside production
NEXT_PUBLIC_POSTHOG_HOST=          # Optional, defaults to PostHog US cloud
```
