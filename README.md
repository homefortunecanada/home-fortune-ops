# Home Fortune Operations

Real, connected operations system for Home Fortune Windows & Doors — client
profiles, orders, window/door item entry, a material cut-size calculation
engine, a client quote/pricing engine, bilingual (EN/简体中文) printable
factory production sheets and client invoices, an archive/restore workflow,
a calendar of order/completion dates, and 5 role-based views (admin /
office / measurement / factory / read-only).

The **factory sheet** (production-facing, no pricing) and the **invoice**
(client-facing, with pricing) are separate printable documents, each with
their own version counter and audit trail. The invoice uses the order's
sent/approved quote snapshot when one exists (frozen totals, including any
manual price override), or live totals with a "PROVISIONAL" banner
otherwise. A quote can also include **manually priced line items**
(installation labour, a one-off charge, a manually engineered product) —
"+ Add Manual Item" under Client Quote on the order page — which flow into
the quote subtotal and the invoice the same as calculated window items.

Plain HTML/CSS/JS, no build step. Backed by Supabase (Postgres + Auth) via
`supabase-js` loaded straight from a CDN as an ES module.

**Material cut-size formulas are real and verified** — every one of the 11
HMST82/4000 product configurations in `src/calc-engine.js` was cross-checked
line-by-line against Home Fortune's own cut-list workbooks
(家福工单32132.NEW.xls, 4000美式窗下料尺寸-new.xls), and `tests/calc-engine.test.html`
is an automated regression test using those exact worked examples — run it
after any change to calc-engine.js.

**Quote/client pricing is real too** — verified against
`Home_Fortune_Pricing_Workbook.xlsx`. A window's price is
`MAX((frame rate + glass rate) × sq ft, configuration minimum)`, plus a flat
$150/window installation fee if requested. Frame type (2 options) and glass
type (8 options) are chosen per item and each carry their own $/sq ft rate;
colour/screen/hardware/grid remain on the item as production detail but no
longer affect price. Patio doors are flat-priced, separate products (no
material calculation). All editable under Formula Admin → Quote Pricing.
Sales tax has no global rate — it's set per quote, same as before.

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
5. `005_invoice_version.sql` — adds the version counter the invoice feature
   uses (mirrors the existing factory-sheet version). **Required** for the
   Invoice button on an order to work.
6. `006_manual_quote_line_items.sql` — adds storage for ad-hoc priced quote
   line items. **Required** for "+ Add Manual Item" under Client Quote.
7. `007_real_pricing_catalog.sql` — seeds the real frame types, glass types,
   patio door prices, and window-configuration minimum charges (per
   `Home_Fortune_Pricing_Workbook.xlsx`), and adds the installation-fee
   setting and the item-level "include installation?" column. **Required**
   for any window/door item's price to calculate correctly — without it,
   every item will show a pricing error.
8. `008_xox_extra_glass_surcharge.sql` — adds a flat per-window surcharge
   for XOX-family configurations (extra centre glass pane): +$80 for HMST82
   XOX and 4000 XOX, +$160 for 4000 Fixed-over-XOX. Folded silently into
   the window's own price on the quote/invoice (not a separate line, unlike
   installation). Editable under Formula Admin → Quote Pricing → Window
   Configuration Minimum Charges.
9. `009_delete_order_items.sql` — adds the missing DELETE policy for
   `order_items` (there wasn't one at all before, so deleting a window/door
   line was blocked at the database level regardless of the UI). **Required**
   for the "Delete" button on a Windows & Products item card to work — an
   item can only be deleted while its calculation isn't yet approved, same
   lock as editing.

## Known gaps / next steps

- **Patio door installation is not charged** — the pricing workbook
  explicitly flags this as unconfirmed, so the item form doesn't offer an
  install toggle for doors at all yet. Say the word once you have a real
  door-install fee and I'll add it.
- **One door's name is ambiguous in the source workbook**: `DOR-6-LOWE-I89`'s
  display name says "LowE/689" but its ID says I89 — I went with I89
  (matching the ID) since the workbook itself flags this as unconfirmed.
  Double check this is the right glass spec.
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
