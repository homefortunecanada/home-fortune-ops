# Home Fortune Operations

Real, connected operations system for Home Fortune Windows & Doors — client
profiles, orders, window/door item entry, a material cut-size calculation
engine, a client quote/pricing engine, a bilingual (EN/简体中文) printable
factory production sheet, an archive/restore workflow, a calendar of order/
completion dates, and 5 role-based views (admin / office / measurement /
factory / read-only).

Plain HTML/CSS/JS, no build step. Backed by Supabase (Postgres + Auth) via
`supabase-js` loaded straight from a CDN as an ES module.

**Material cut-size formulas are real and verified** — every one of the 11
HMST82/4000 product configurations in `src/calc-engine.js` was cross-checked
line-by-line against Home Fortune's own cut-list workbooks
(家福工单32132.NEW.xls, 4000美式窗下料尺寸-new.xls), and `tests/calc-engine.test.html`
is an automated regression test using those exact worked examples — run it
after any change to calc-engine.js.

**Quote/client pricing (dollar amounts) is still SAMPLE placeholder
values** — editable by an admin under Formula Admin → Quote Pricing. Replace
with Home Fortune's real price list before sending a client-facing quote for
real business.

## Project layout

```
index.html          App shell + all CSS
src/config.js        Supabase project URL + publishable (anon) key — safe to commit
src/supabase-client.js
src/store.js          Shared in-memory session state
src/i18n.js            Bilingual strings, product/option catalogs, role/nav config
src/calc-engine.js     Material cut-size formulas (real, verified) + quote pricing (placeholder)
src/data.js             All Supabase reads/writes, row <-> app-shape mapping
src/main.js               Routing, page rendering, event handlers
tests/calc-engine.test.html   Regression test against the source workbooks' own worked examples
db/schema.sql        The deployed Postgres schema (source of truth already run in Supabase)
db/migrations/        Follow-up SQL — run in order (001, 002, ...) in the Supabase SQL Editor
```

## Product line

The 11 real configurations (see `CATEGORY_CONFIG` in `src/i18n.js` and
`CALCULATORS` in `src/calc-engine.js`), plus Custom Shape for one-off/arch
windows outside these two systems:

| Category | Profile system | Unit | Extra inputs |
|---|---|---|---|
| HMST82 Fixed | HMST82 | inches | — |
| HMST82 XO/OX Slider | HMST82 | inches | O (auto = W/2) |
| HMST82 XOX Slider | HMST82 | inches | O (manual) |
| HMST82 Lower-Sash Hung | HMST82 | inches | O |
| HMST82 Upper-Sash Hung | HMST82 | inches | O — ⚠ quantities do not scale with order quantity (matches the source workbook exactly; verify manually if quantity > 1) |
| 4000 Single Casement (X) | 4000 | mm | — |
| 4000 Double Casement (XX) | 4000 | mm | — |
| 4000 Fixed + Casement (OX) | 4000 | mm | — |
| 4000 XOX | 4000 | mm | S |
| 4000 Fixed-over-XOX | 4000 | mm | S, T |
| 4000 Stacked O/X | 4000 | mm | T |

Known, confirmed-real gaps (verified against the source workbooks — not a
transcription issue, genuinely absent from Home Fortune's own data): steel-
reinforcement piece lengths are left out of every HMST82 calculation
(quantity was known, length never was — cut those manually); 4000 Single
Casement (X), 4000 OX, and 4000 Stacked O/X had every quantity cell blank in
the source, so each defaults to 1 piece per window (scaled by order
quantity as normal), per instruction to use the workbooks as-is.

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

## Database migrations

Run these once, in order, in the Supabase SQL Editor (each is additive/safe,
documented at the top of the file):

1. `001_formula_history_insert_policy.sql` — lets admin edits write an audit
   row into the formula/pricing version-history tables (optional; without
   it, saves still work, only the "Version history" list stays empty).
2. `002_manual_quote_total.sql` — adds the optional manual override field
   for a quote's final price.
3. `003_real_formula_dimensions.sql` — adds the O/S/T dimension columns the
   real product line needs. **Required** for item entry to work on any
   HMST82/4000 configuration that uses O, S, or T.
4. `004_real_product_categories.sql` — seeds the 11 real product
   configurations into Formula Admin / Quote Pricing. **Required** before
   creating any order item — without it, the new categories exist in the
   dropdown but have no formula/pricing row and will show "inactive".

## Known gaps / next steps

- **Quote pricing is still placeholder.** Replace it under Formula Admin →
  Quote Pricing (admin login only) once Home Fortune's real price list is
  ready — every change is versioned and requires no code changes.
- **Product range limits (min/max width/height) are provisional**, seeded
  with generous common-sense values in migration 004 — the source
  workbooks never specified real manufacturing limits. Update them under
  Formula Admin once confirmed.
- **File/photo uploads are not wired up yet.** `schema.sql` defines
  `client_files` / `order_files` tables pointing at Supabase Storage
  buckets, but no bucket has been created and the app doesn't yet have
  upload UI. Say the word if you want this added next.
- **Interface language (EN/中文) is a personal browser preference**, stored
  in `localStorage`, not synced across devices — everything else lives in
  Postgres.

## Deploying

Static site, zero build config — works on Vercel's free tier out of the box.
Push this repo to GitHub, then import it in the Vercel dashboard as a new
project (framework preset: "Other" / static).
