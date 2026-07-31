-- Real Home Fortune pricing, per Home_Fortune_Pricing_Workbook.xlsx.
-- Replaces the SAMPLE placeholder base_price/price_per_sqft-per-category
-- model and the color/screen/hardware price modifiers, which were never
-- part of Home Fortune's actual pricing.
--
-- Real pricing model: a window's size price = (frame rate + glass rate,
-- each an independently chosen $/sq ft) x area in sq ft (width-in x
-- height-in / 144), compared against a per-window-configuration MINIMUM
-- charge — whichever is higher is charged. Plus an optional flat
-- installation fee per window ($150, confirmed). Patio doors are flat
-- priced, no size math, and installation is NOT charged for them yet
-- (explicitly unconfirmed in the source workbook).
--
-- pricing_products.base_price is reinterpreted here as that per-window
-- minimum charge (not a "starting price" anymore); price_per_sqft is set
-- to 0 and no longer used for window categories, since the $/sq ft now
-- comes from the two new rate tables below.

create table if not exists pricing_frame_types (
  id text primary key,                 -- e.g. 'FRM-CA-001'
  label_en text not null,
  label_zh text not null,
  rate_per_sqft numeric(10,2) not null default 0,
  active boolean not null default true,
  version int not null default 1,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now()
);
create table if not exists pricing_glass_types (
  id text primary key,                 -- e.g. 'GLS-LOWE-I89'
  label_en text not null,
  label_zh text not null,
  rate_per_sqft numeric(10,2) not null default 0,
  active boolean not null default true,
  version int not null default 1,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now()
);
create table if not exists pricing_patio_doors (
  id text primary key,                 -- e.g. 'DOR-6-LOWE-I89'
  label_en text not null,
  label_zh text not null,
  flat_price numeric(10,2) not null default 0,
  active boolean not null default true,
  version int not null default 1,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now()
);

alter table pricing_frame_types enable row level security;
alter table pricing_glass_types enable row level security;
alter table pricing_patio_doors enable row level security;
drop policy if exists frame_types_select on pricing_frame_types;
create policy frame_types_select on pricing_frame_types for select using (is_active_user());
drop policy if exists frame_types_admin_write on pricing_frame_types;
create policy frame_types_admin_write on pricing_frame_types for all using (current_role_name()='admin') with check (current_role_name()='admin');
drop policy if exists glass_types_select on pricing_glass_types;
create policy glass_types_select on pricing_glass_types for select using (is_active_user());
drop policy if exists glass_types_admin_write on pricing_glass_types;
create policy glass_types_admin_write on pricing_glass_types for all using (current_role_name()='admin') with check (current_role_name()='admin');
drop policy if exists patio_doors_select on pricing_patio_doors;
create policy patio_doors_select on pricing_patio_doors for select using (is_active_user());
drop policy if exists patio_doors_admin_write on pricing_patio_doors;
create policy patio_doors_admin_write on pricing_patio_doors for all using (current_role_name()='admin') with check (current_role_name()='admin');

alter table pricing_modifiers add column if not exists install_fee numeric(10,2) not null default 150;
alter table order_items add column if not exists install_requested boolean not null default false;

insert into pricing_frame_types (id, label_en, label_zh, rate_per_sqft) values
  ('FRM-CA-001', 'Casement / Awning', '平开窗／上悬窗', 16),
  ('FRM-SR-001', 'Sliders Reno', '翻新推拉窗', 13)
on conflict (id) do nothing;

insert into pricing_glass_types (id, label_en, label_zh, rate_per_sqft) values
  ('GLS-LOWE-PH', 'LowE // PinHead', 'LowE／针纹玻璃', 22),
  ('GLS-LOWE-I89', 'LowE // I89', 'LowE／I89', 22),
  ('GLS-LOWE-T-CT', 'LowE Temp // Clear Temp', 'LowE钢化／透明钢化', 17.5),
  ('GLS-CT-CT', 'Clear Temp // Clear Temp', '透明钢化／透明钢化', 15),
  ('GLS-PH-CLR', 'PinHead // Clear', '针纹玻璃／透明玻璃', 13.5),
  ('GLS-FR-CLR', 'Frost // Clear', '磨砂玻璃／透明玻璃', 14.5),
  ('GLS-CLR-CLR', 'Clear // Clear', '透明玻璃／透明玻璃', 10),
  ('GLS-LOWE-CLR', 'LowE // Clear', 'LowE／透明玻璃', 12.5)
on conflict (id) do nothing;

insert into pricing_patio_doors (id, label_en, label_zh, flat_price) values
  ('DOR-6-LOWE-I89', 'Patio Door 6ft — LowE / I89', '六英尺露台门 — LowE／I89', 2000),
  ('DOR-6-LOWE-CLR', 'Patio Door 6ft — LowE / Clear', '六英尺露台门 — LowE／透明', 1700),
  ('DOR-6-STD', 'Patio Door 6ft — Standard', '六英尺露台门 — 标准', 1400)
on conflict (id) do nothing;

update pricing_products set base_price = 260, price_per_sqft = 0 where product_type='hmst82_fixed';
update pricing_products set base_price = 300, price_per_sqft = 0 where product_type='hmst82_xo_ox';
update pricing_products set base_price = 500, price_per_sqft = 0 where product_type='hmst82_xox';
update pricing_products set base_price = 350, price_per_sqft = 0 where product_type='hmst82_lower_hung';
update pricing_products set base_price = 350, price_per_sqft = 0 where product_type='hmst82_upper_hung';
update pricing_products set base_price = 280, price_per_sqft = 0 where product_type='p4000_x';
update pricing_products set base_price = 380, price_per_sqft = 0 where product_type='p4000_xx';
update pricing_products set base_price = 350, price_per_sqft = 0 where product_type='p4000_ox';
update pricing_products set base_price = 600, price_per_sqft = 0 where product_type='p4000_xox';
update pricing_products set base_price = 650, price_per_sqft = 0 where product_type='p4000_fixed_over_xox';
update pricing_products set base_price = 350, price_per_sqft = 0 where product_type='p4000_stacked_ox';
update pricing_products set base_price = 850, price_per_sqft = 0 where product_type='custom_shape';

-- Patio doors get added as order_items like any other product, so they need
-- a pricing_products/material_formulas row too (material calc is skipped
-- entirely for them in the app — see calc-engine.js — these rows just avoid
-- Formula Admin crashing on a missing lookup).
insert into pricing_products (product_type, active, base_price, price_per_sqft, version) values
  ('door_6ft_lowe_i89', true, 0, 0, 1),
  ('door_6ft_lowe_clr', true, 0, 0, 1),
  ('door_6ft_std', true, 0, 0, 1)
on conflict (product_type) do nothing;

insert into material_formulas (product_type, active, version, deductions, note) values
  ('door_6ft_lowe_i89', false, 1, '{}', 'Flat-priced patio door — no material cut calculation (not covered by any HMST82/4000 workbook).'),
  ('door_6ft_lowe_clr', false, 1, '{}', 'Flat-priced patio door — no material cut calculation (not covered by any HMST82/4000 workbook).'),
  ('door_6ft_std', false, 1, '{}', 'Flat-priced patio door — no material cut calculation (not covered by any HMST82/4000 workbook).')
on conflict (product_type) do nothing;
