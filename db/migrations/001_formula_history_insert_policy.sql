-- Optional fix: schema.sql enables RLS on material_formula_history and
-- pricing_product_history but only defines a SELECT policy for each — there
-- is no INSERT policy, so admin edits in Formula Admin cannot write an audit
-- row into either history table (the app catches this and still saves the
-- live formula/price; only the "Version history" list stays empty).
--
-- Run this once in the Supabase SQL Editor if you want that version history
-- to actually populate. Safe to run any time — it only adds policies, no
-- data or structure changes.

drop policy if exists formula_history_admin_insert on material_formula_history;
create policy formula_history_admin_insert on material_formula_history
  for insert with check (current_role_name()='admin');

drop policy if exists pricing_hist_admin_insert on pricing_product_history;
create policy pricing_hist_admin_insert on pricing_product_history
  for insert with check (current_role_name()='admin');
