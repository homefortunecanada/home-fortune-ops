-- XOX-family window configurations need an extra pane of glass (the centre
-- fixed panel) beyond the standard two-pane pricing model accounts for —
-- adds a flat per-window surcharge on top of the normal size/minimum price,
-- folded silently into the window's own price on the quote and invoice
-- (not broken out as its own line, unlike the installation fee). Purely
-- additive: one new column, no data changes to existing rows beyond the
-- 3 configurations that need a non-zero value.

alter table pricing_products add column if not exists extra_glass_surcharge numeric(10,2) not null default 0;

update pricing_products set extra_glass_surcharge = 80 where product_type = 'hmst82_xox';
update pricing_products set extra_glass_surcharge = 80 where product_type = 'p4000_xox';
update pricing_products set extra_glass_surcharge = 160 where product_type = 'p4000_fixed_over_xox';
