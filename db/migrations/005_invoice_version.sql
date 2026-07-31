-- Supports the printable client invoice, tracked the same way the factory
-- sheet already is (a version counter bumped each time one is generated,
-- logged to order_history for an audit trail).
-- Purely additive: one new column, no data changes.

alter table orders add column if not exists invoice_version int not null default 0;
