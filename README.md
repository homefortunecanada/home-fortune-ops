# Home Fortune Operations

Real, connected operations system for Home Fortune Windows & Doors — client
profiles, orders, window/door item entry, a deterministic material cut-size
calculation engine, a client quote/pricing engine, a bilingual (EN/简体中文)
printable factory production sheet, a calendar of order/completion dates, and
5 role-based views (admin / office / measurement / factory / read-only).

Plain HTML/CSS/JS, no build step. Backed by Supabase (Postgres + Auth) via
`supabase-js` loaded straight from a CDN as an ES module.

**Calculation formulas and quote pricing are still SAMPLE placeholder
values** (seeded in `db/schema.sql`, editable by an admin under Formula
Admin in the app). They must be replaced with Home Fortune's real,
verified numbers before this is used for real production orders.

## Project layout

```
index.html          App shell + all CSS
src/config.js        Supabase project URL + publishable (anon) key — safe to commit
src/supabase-client.js
src/store.js          Shared in-memory session state
src/i18n.js            Bilingual strings, product/option catalogs, role/nav config
src/calc-engine.js     Material cut-size + quote pricing formulas (pure functions)
src/data.js             All Supabase reads/writes, row <-> app-shape mapping
src/main.js               Routing, page rendering, event handlers
db/schema.sql        The deployed Postgres schema (source of truth already run in Supabase)
db/migrations/        Any follow-up SQL to run manually in the Supabase SQL Editor
```

## Running locally

No build step, no npm install. Any static file server works:

```bash
python3 -m http.server 8420
```

Then open http://localhost:8420. Sign in with an employee account that
already has a row in the `profiles` table (see "Adding employees" below).

## Adding employees

There's no in-app "create user" screen — this matches the account-security
note in `db/schema.sql`. To add someone:

1. Supabase Dashboard → Authentication → Add User → set their email + password.
2. Copy their new user UUID.
3. Run in the SQL Editor:
   ```sql
   insert into profiles (id, full_name, role) values
     ('paste-uuid-here', 'Employee Name', 'office'); -- or admin/measurement/factory/readonly
   ```

To deactivate someone instead of deleting their account, set
`profiles.active = false` — the app blocks their login with a clear message
but keeps their name attached to historical records.

## Known gaps / next steps

- **Formulas and prices are placeholders.** Replace them under Formula
  Admin (admin login only) once Home Fortune's real numbers are ready —
  every change is versioned and requires no code changes.
- **File/photo uploads are not wired up yet.** `schema.sql` defines
  `client_files` / `order_files` tables pointing at Supabase Storage
  buckets, but no bucket has been created and the app doesn't yet have
  upload UI. Say the word if you want this added next.
- **Formula/pricing version history has an RLS gap.** `material_formula_history`
  and `pricing_product_history` are readable but have no INSERT policy in
  the deployed schema, so admin edits save correctly but can't write an
  audit row — the "Version history" list in Formula Admin will stay empty
  until you run `db/migrations/001_formula_history_insert_policy.sql` once
  in the Supabase SQL Editor (safe, additive, no data changes).
- **Interface language (EN/中文) is a personal browser preference**, stored
  in `localStorage`, not synced across devices — everything else lives in
  Postgres.

## Deploying

Static site, zero build config — works on Vercel's free tier out of the box.
Push this repo to GitHub, then import it in the Vercel dashboard as a new
project (framework preset: "Other" / static).
