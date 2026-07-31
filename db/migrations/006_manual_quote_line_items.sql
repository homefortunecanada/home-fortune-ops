-- Lets office/admin staff add ad-hoc priced line items to a quote — e.g.
-- installation labour, a custom/manually-engineered product, delivery, a
-- one-off charge — that don't come from the calculated window/door items.
-- These flow into the quote subtotal (and, from there, the printable
-- invoice) exactly like calculated items do.
-- Purely additive: one new column (a JSON array of {id, description,
-- unitPriceCents, quantity}), no data changes.

alter table order_quotes add column if not exists manual_items jsonb not null default '[]';
