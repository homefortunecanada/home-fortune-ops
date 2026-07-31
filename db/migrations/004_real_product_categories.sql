-- Seeds the 11 real HMST82/4000 product configurations (plus the existing
-- custom_shape) into material_formulas and pricing_products. Purely
-- additive — old placeholder rows (casement, awning, slider, bay_bow,
-- patio_door) are left in place, just unused, since nothing references
-- them by name anymore. Safe to re-run (ON CONFLICT DO NOTHING).
--
-- Material cut-size FORMULAS themselves are not stored here — they're real,
-- verified logic in src/calc-engine.js (see tests/calc-engine.test.html).
-- This table only controls whether a category is active and its
-- width/height range-warning limits, which are provisional (the source
-- workbooks never specified manufacturing limits — see docx spec, "Range
-- checks" row) — replace min_w/max_w/min_h/max_h once Home Fortune
-- confirms real limits. HMST82 rows are in inches; 4000 rows are in mm.
--
-- Quote PRICING below is still 100% placeholder (base_price/price_per_sqft),
-- same as the rest of the app — replace via Formula Admin > Quote Pricing
-- once real prices are ready.

insert into material_formulas (product_type, active, version, min_w, max_w, min_h, max_h, deductions, note) values
  ('hmst82_fixed', true, 1, 12, 120, 12, 120, '{}', 'Provisional range — confirm real manufacturing limits.'),
  ('hmst82_xo_ox', true, 1, 24, 144, 12, 96, '{}', 'Provisional range — confirm real manufacturing limits.'),
  ('hmst82_xox', true, 1, 36, 216, 12, 96, '{}', 'Provisional range — confirm real manufacturing limits.'),
  ('hmst82_lower_hung', true, 1, 12, 72, 24, 96, '{}', 'Provisional range — confirm real manufacturing limits.'),
  ('hmst82_upper_hung', true, 1, 12, 72, 24, 96, '{}', 'Provisional range — confirm real manufacturing limits. Quantities do not scale with order quantity (see calc-engine.js).'),
  ('p4000_x', true, 1, 300, 1500, 300, 2400, '{}', 'Provisional range — confirm real manufacturing limits. Quantities default to 1/window (source workbook left them blank).'),
  ('p4000_xx', true, 1, 600, 3000, 300, 2400, '{}', 'Provisional range — confirm real manufacturing limits.'),
  ('p4000_ox', true, 1, 600, 3000, 300, 2400, '{}', 'Provisional range — confirm real manufacturing limits. Quantities default to 1/window (source workbook left them blank).'),
  ('p4000_xox', true, 1, 900, 4500, 300, 2400, '{}', 'Provisional range — confirm real manufacturing limits.'),
  ('p4000_fixed_over_xox', true, 1, 900, 4500, 600, 3600, '{}', 'Provisional range — confirm real manufacturing limits.'),
  ('p4000_stacked_ox', true, 1, 300, 1500, 600, 3600, '{}', 'Provisional range — confirm real manufacturing limits. Quantities default to 1/window; no glazing-bead formula exists in the source workbook.')
  on conflict (product_type) do nothing;

insert into pricing_products (product_type, active, base_price, price_per_sqft, version) values
  ('hmst82_fixed', true, 220, 16, 1),
  ('hmst82_xo_ox', true, 280, 17, 1),
  ('hmst82_xox', true, 380, 18, 1),
  ('hmst82_lower_hung', true, 320, 19, 1),
  ('hmst82_upper_hung', true, 320, 19, 1),
  ('p4000_x', true, 240, 17, 1),
  ('p4000_xx', true, 320, 18, 1),
  ('p4000_ox', true, 340, 19, 1),
  ('p4000_xox', true, 480, 20, 1),
  ('p4000_fixed_over_xox', true, 620, 21, 1),
  ('p4000_stacked_ox', true, 400, 19, 1)
  on conflict (product_type) do nothing;
