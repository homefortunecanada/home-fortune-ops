-- Supports the real HMST82/4000 profile-system calculation rules (replacing
-- the SAMPLE placeholder categories). Several configurations need up to 3
-- extra dimension inputs beyond width/height:
--   O = opening width or opening height (HMST82 sliders/hung windows)
--   S = side-sash width (4000 XOX, fixed-over-XOX)
--   T = secondary section height (4000 fixed-over-XOX, stacked O/X)
-- Purely additive: 3 new nullable columns, no data changes.

alter table order_items add column if not exists dim_o numeric;
alter table order_items add column if not exists dim_s numeric;
alter table order_items add column if not exists dim_t numeric;
