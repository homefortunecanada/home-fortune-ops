-- Adds an optional manual override for a quote's final price. When set, the
-- app shows and sends this number instead of the auto-calculated grand
-- total (subtotal - discount + tax). Leaving it blank keeps the existing
-- automatic calculation exactly as before.
--
-- Purely additive: one new nullable column, no data changes, no changes to
-- existing columns/policies. Safe to run any time.

alter table order_quotes add column if not exists manual_total numeric(10,2);
