-- =============================================================================
-- Home Fortune Windows & Doors — Operations System
-- Production database schema for Supabase (Postgres + Auth + Storage + RLS)
--
-- HOW TO USE:
--   1. Create a Supabase project (see ROADMAP.md).
--   2. Open Supabase Dashboard -> SQL Editor -> New Query.
--   3. Paste this entire file and click "Run".
--   4. Create your first Administrator account (see bottom of this file).
--
-- This schema mirrors the data model already tested in the clickable
-- prototype (HomeFortune-Ops-Prototype.html), so nothing here should
-- surprise anyone who has used it.
--
-- IMPORTANT — no hard deletes: no policy below grants DELETE on clients,
-- orders, or order_items to any role, including admin. This is intentional
-- and matches "no client/production information should be permanently
-- deleted." Use the archived_at/archived_by columns to archive a record
-- instead — archived rows stay fully recoverable by an admin.
-- =============================================================================

-- ---------- extensions ----------
create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------- employee profiles & roles ----------
-- Supabase Auth already manages login/passwords/2FA/sessions in auth.users.
-- This table adds the business-specific fields (role, name, active/deactivated).
do $$ begin
  create type user_role as enum ('admin','office','measurement','factory','readonly');
exception when duplicate_object then null;
end $$;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'readonly',
  active boolean not null default true,      -- deactivate former employees instead of deleting
  created_at timestamptz not null default now()
);

-- helper used by RLS policies below
create or replace function current_role_name() returns user_role
language sql stable security definer as $$
  select role from profiles where id = auth.uid();
$$;
create or replace function is_active_user() returns boolean
language sql stable security definer as $$
  select coalesce((select active from profiles where id = auth.uid()), false);
$$;

alter table profiles enable row level security;
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select using (is_active_user());
drop policy if exists profiles_admin_write on profiles;
create policy profiles_admin_write on profiles for all using (current_role_name()='admin') with check (current_role_name()='admin');

-- ---------- clients ----------
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  client_no text unique not null,
  full_name text not null,
  company text,
  phone1 text,
  phone2 text,
  email text,
  pref_lang text default 'English',
  billing_address text,
  project_address text,
  referral text,
  notes text,
  owner_employee uuid references profiles(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,       -- soft-delete: set instead of DELETE, stays recoverable
  archived_by uuid references profiles(id)
);
create index if not exists clients_search_idx on clients using gin (
  to_tsvector('simple', coalesce(full_name,'')||' '||coalesce(phone1,'')||' '||coalesce(phone2,'')||' '||coalesce(email,'')||' '||coalesce(project_address,'')||' '||client_no)
);

-- auto-generate client numbers server-side (CL-1004, CL-1005, ...) so concurrent
-- employees creating clients at the same time can never collide or duplicate a number
create sequence if not exists client_no_seq start with 1004;
create or replace function set_client_no() returns trigger
language plpgsql as $$
begin
  if new.client_no is null then
    new.client_no := 'CL-' || nextval('client_no_seq');
  end if;
  return new;
end; $$;
create or replace trigger trg_set_client_no before insert on clients for each row execute function set_client_no();

create table if not exists client_files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  storage_path text not null,   -- path inside the "client-files" Supabase Storage bucket
  file_name text not null,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now()
);

alter table clients enable row level security;
alter table client_files enable row level security;
drop policy if exists clients_select on clients;
create policy clients_select on clients for select using (is_active_user());
drop policy if exists clients_write on clients;
create policy clients_write on clients for insert with check (is_active_user() and current_role_name() <> 'readonly');
drop policy if exists clients_update on clients;
create policy clients_update on clients for update using (is_active_user() and current_role_name() <> 'readonly');
drop policy if exists client_files_select on client_files;
create policy client_files_select on client_files for select using (is_active_user());
drop policy if exists client_files_write on client_files;
create policy client_files_write on client_files for insert with check (is_active_user() and current_role_name() <> 'readonly');

-- ---------- statuses (admin-editable list) ----------
create table if not exists statuses (
  id serial primary key,
  label text unique not null,
  sort_order int not null
);
insert into statuses (label, sort_order) values
 ('New Inquiry',1),('Measurement Required',2),('Measurements Completed',3),('Quote In Progress',4),
 ('Quote Sent',5),('Customer Approval Required',6),('Deposit Received',7),('Confirmed Order',8),
 ('Ready For Factory',9),('Sent To Factory',10),('In Production',11),('Production Completed',12),
 ('Installation Scheduled',13),('Installed',14),('Payment Outstanding',15),('Completed',16),('Cancelled/On Hold',17)
 on conflict (label) do nothing;
alter table statuses enable row level security;
drop policy if exists statuses_select on statuses;
create policy statuses_select on statuses for select using (is_active_user());
drop policy if exists statuses_admin_write on statuses;
create policy statuses_admin_write on statuses for all using (current_role_name()='admin') with check (current_role_name()='admin');

-- ---------- orders ----------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null,
  client_id uuid not null references clients(id),
  project_address text,
  order_date date,
  due_date date,
  install_address text,
  salesperson text,
  measurement_employee text,
  office_employee text,
  status text not null default 'New Inquiry' references statuses(label),
  deposit numeric(10,2) default 0,
  payment_notes text,
  internal_notes text,
  factory_notes text,
  install_notes text,
  factory_sheet_version int not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,       -- soft-delete: set instead of DELETE, stays recoverable
  archived_by uuid references profiles(id)
);
create index if not exists orders_client_idx on orders(client_id);
create index if not exists orders_status_idx on orders(status);
create index if not exists orders_due_idx on orders(due_date);

-- auto-generate order numbers server-side (ORD-5004, ORD-5005, ...) for the same
-- concurrency-safety reason as client_no above
create sequence if not exists order_no_seq start with 5004;
create or replace function set_order_no() returns trigger
language plpgsql as $$
begin
  if new.order_no is null then
    new.order_no := 'ORD-' || nextval('order_no_seq');
  end if;
  return new;
end; $$;
create or replace trigger trg_set_order_no before insert on orders for each row execute function set_order_no();

create table if not exists order_files (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now()
);

alter table orders enable row level security;
alter table order_files enable row level security;
drop policy if exists orders_select on orders;
create policy orders_select on orders for select using (is_active_user());
drop policy if exists orders_write on orders;
create policy orders_write on orders for insert with check (is_active_user() and current_role_name() <> 'readonly');
drop policy if exists orders_update on orders;
create policy orders_update on orders for update using (is_active_user() and current_role_name() <> 'readonly');
drop policy if exists order_files_select on order_files;
create policy order_files_select on order_files for select using (is_active_user());
drop policy if exists order_files_write on order_files;
create policy order_files_write on order_files for insert with check (is_active_user() and current_role_name() <> 'readonly');

-- ---------- order items (windows / doors / screens) ----------
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  item_no text not null,
  category text not null,                -- casement | awning | slider | bay_bow | patio_door | custom_shape
  width numeric not null,
  height numeric not null,
  unit text not null default 'mm',
  quantity int not null default 1,
  frame_system text,
  opening_style text,
  panels int,
  fixed_or_operating text,
  glass_type text,
  glass_thickness text,
  color text,
  screen_type text,
  hardware text,
  grid text,
  special_options text,
  install_notes text,
  room text,
  notes text,
  -- material calculation lifecycle (draft -> calculated -> approved)
  calc_status text not null default 'draft',
  calc_results jsonb,
  calc_formula_version int,
  calc_by uuid references profiles(id),
  calc_at timestamptz,
  calc_approved_by uuid references profiles(id),
  calc_approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id, item_no)
);
create index if not exists order_items_order_idx on order_items(order_id);

alter table order_items enable row level security;
drop policy if exists order_items_select on order_items;
create policy order_items_select on order_items for select using (is_active_user());
drop policy if exists order_items_write on order_items;
create policy order_items_write on order_items for insert with check (is_active_user() and current_role_name() <> 'readonly');
-- Direct UPDATEs are allowed for non-approval fields; approval/reopen MUST go through
-- the approve_calculation() / reopen_calculation() functions below so the lock is enforced
-- server-side and can't be bypassed by editing calc_status directly from the browser.
drop policy if exists order_items_update on order_items;
create policy order_items_update on order_items for update using (
  is_active_user() and current_role_name() <> 'readonly' and calc_status <> 'approved'
) with check (
  calc_status <> 'approved'  -- setting to 'approved' is only allowed via approve_calculation() below
);

-- ---------- order-level client quote ----------
create table if not exists order_quotes (
  order_id uuid primary key references orders(id) on delete cascade,
  status text not null default 'draft',   -- draft | sent | approved
  discount_pct numeric(5,2) not null default 0,
  tax_pct numeric(5,2) not null default 5,
  snapshot jsonb,                          -- frozen totals + per-item breakdown at time of send
  sent_by uuid references profiles(id),
  sent_at timestamptz,
  approved_by text,                        -- client name / "via phone" — client has no login
  approved_at timestamptz,
  approval_note text
);
alter table order_quotes enable row level security;
drop policy if exists order_quotes_select on order_quotes;
create policy order_quotes_select on order_quotes for select using (is_active_user());
drop policy if exists order_quotes_write on order_quotes;
create policy order_quotes_write on order_quotes for all using (
  is_active_user() and current_role_name() <> 'readonly' and status <> 'approved'
) with check (
  is_active_user() and current_role_name() <> 'readonly' and status <> 'approved'
  -- transitioning to 'approved' is only allowed via approve_quote() below
);

-- ---------- order history / audit trail ----------
create table if not exists order_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  at timestamptz not null default now(),
  by uuid references profiles(id),
  event_key text not null,    -- e.g. 'orderCreated','calculated','approvedCalc','sentQuote' — matches app i18n keys
  params jsonb not null default '{}'
);
create index if not exists order_history_order_idx on order_history(order_id);
alter table order_history enable row level security;
drop policy if exists order_history_select on order_history;
create policy order_history_select on order_history for select using (is_active_user());
drop policy if exists order_history_insert on order_history;
create policy order_history_insert on order_history for insert with check (is_active_user());

-- ---------- global activity feed (dashboard "Recent Activity") ----------
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  by uuid references profiles(id),
  event_key text not null,
  params jsonb not null default '{}'
);
alter table activity_log enable row level security;
drop policy if exists activity_select on activity_log;
create policy activity_select on activity_log for select using (is_active_user());
drop policy if exists activity_insert on activity_log;
create policy activity_insert on activity_log for insert with check (is_active_user());

-- ---------- material calculation formulas (admin-managed, versioned) ----------
create table if not exists material_formulas (
  product_type text primary key,
  active boolean not null default true,
  version int not null default 1,
  min_w numeric, max_w numeric, min_h numeric, max_h numeric,
  deductions jsonb not null default '{}',
  note text,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now()
);
create table if not exists material_formula_history (
  id uuid primary key default gen_random_uuid(),
  product_type text not null references material_formulas(product_type),
  version int not null,
  deductions jsonb not null,
  min_w numeric, max_w numeric, min_h numeric, max_h numeric,
  active boolean not null,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null
);
alter table material_formulas enable row level security;
alter table material_formula_history enable row level security;
drop policy if exists formulas_select on material_formulas;
create policy formulas_select on material_formulas for select using (is_active_user());
drop policy if exists formulas_admin_write on material_formulas;
create policy formulas_admin_write on material_formulas for all using (current_role_name()='admin') with check (current_role_name()='admin');
drop policy if exists formula_history_select on material_formula_history;
create policy formula_history_select on material_formula_history for select using (is_active_user());

-- ---------- quote pricing (admin-managed, versioned) ----------
create table if not exists pricing_products (
  product_type text primary key,
  active boolean not null default true,
  base_price numeric(10,2) not null default 0,
  price_per_sqft numeric(10,2) not null default 0,
  version int not null default 1,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now()
);
create table if not exists pricing_product_history (
  id uuid primary key default gen_random_uuid(),
  product_type text not null references pricing_products(product_type),
  version int not null, base_price numeric(10,2), price_per_sqft numeric(10,2), active boolean,
  changed_by uuid references profiles(id), changed_at timestamptz not null
);
create table if not exists pricing_modifiers (
  id int primary key default 1 check (id = 1),   -- singleton row: one shared modifier set
  glass jsonb not null default '{}',
  color jsonb not null default '{}',
  screen jsonb not null default '{}',
  hardware jsonb not null default '{}',
  grid_surcharge numeric(10,2) not null default 0,
  version int not null default 1,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now()
);
alter table pricing_products enable row level security;
alter table pricing_product_history enable row level security;
alter table pricing_modifiers enable row level security;
drop policy if exists pricing_select on pricing_products;
create policy pricing_select on pricing_products for select using (is_active_user());
drop policy if exists pricing_admin_write on pricing_products;
create policy pricing_admin_write on pricing_products for all using (current_role_name()='admin') with check (current_role_name()='admin');
drop policy if exists pricing_hist_select on pricing_product_history;
create policy pricing_hist_select on pricing_product_history for select using (is_active_user());
drop policy if exists modifiers_select on pricing_modifiers;
create policy modifiers_select on pricing_modifiers for select using (is_active_user());
drop policy if exists modifiers_admin_write on pricing_modifiers;
create policy modifiers_admin_write on pricing_modifiers for all using (current_role_name()='admin') with check (current_role_name()='admin');

-- =============================================================================
-- SERVER-ENFORCED FUNCTIONS (RPC)
-- These wrap the business-critical, integrity-sensitive actions so a browser
-- can never bypass the locking/approval rules by writing to the table directly.
-- The frontend should call supabase.rpc('approve_calculation', {...}) etc.
-- instead of updating order_items/order_quotes directly for these actions.
-- =============================================================================

create or replace function approve_calculation(p_item_id uuid) returns void
language plpgsql security definer as $$
begin
  if current_role_name() = 'readonly' then
    raise exception 'Read-only users cannot approve calculations.';
  end if;
  update order_items
    set calc_status = 'approved', calc_approved_by = auth.uid(), calc_approved_at = now()
    where id = p_item_id and calc_status = 'calculated';
  if not found then
    raise exception 'Item must be in "calculated" status before it can be approved.';
  end if;
end; $$;

create or replace function reopen_calculation(p_item_id uuid) returns void
language plpgsql security definer as $$
begin
  if current_role_name() <> 'admin' then
    raise exception 'Only administrators can reopen an approved calculation.';
  end if;
  update order_items
    set calc_status = 'calculated', calc_approved_by = null, calc_approved_at = null
    where id = p_item_id and calc_status = 'approved';
end; $$;

create or replace function approve_quote(p_order_id uuid, p_approved_by text, p_note text) returns void
language plpgsql security definer as $$
begin
  if current_role_name() = 'readonly' then
    raise exception 'Read-only users cannot record quote approval.';
  end if;
  update order_quotes
    set status = 'approved', approved_by = p_approved_by, approved_at = now(), approval_note = p_note
    where order_id = p_order_id and status = 'sent';
  if not found then
    raise exception 'Quote must be in "sent" status before approval can be recorded.';
  end if;
end; $$;

create or replace function reopen_quote(p_order_id uuid) returns void
language plpgsql security definer as $$
begin
  if current_role_name() <> 'admin' then
    raise exception 'Only administrators can reopen an approved quote.';
  end if;
  update order_quotes set status = 'sent', approved_by = null, approved_at = null where order_id = p_order_id;
  -- resetting the quote also resets any material calculations back to draft,
  -- matching the rule that calculations require an approved quote first
  update order_items set calc_status='draft', calc_results=null, calc_formula_version=null,
    calc_by=null, calc_at=null, calc_approved_by=null, calc_approved_at=null
    where order_id = p_order_id and calc_status <> 'draft';
end; $$;

-- =============================================================================
-- SEED DATA — same SAMPLE placeholder formulas/prices as the prototype, so the
-- app is immediately usable. Replace these with real values via the Formula
-- Admin / Quote Pricing screens once you send the real numbers.
-- =============================================================================
insert into material_formulas (product_type, active, version, min_w, max_w, min_h, max_h, deductions) values
  ('casement', true, 1, 300, 1200, 300, 1800, '{"frameHS":3,"frameJ":3,"sashW":90,"sashH":90,"glassW":60,"glassH":60,"screenW":100,"screenH":100}'),
  ('awning', true, 1, 300, 1500, 300, 1200, '{"frameHS":3,"frameJ":3,"sashW":88,"sashH":88,"glassW":58,"glassH":58,"screenW":100,"screenH":100}'),
  ('slider', true, 1, 600, 3000, 300, 1800, '{"frameHS":3,"frameJ":3,"sashOverlap":20,"sashHDeduct":30,"glassW":70,"glassH":70,"screenW":100,"screenH":100}'),
  ('bay_bow', true, 1, 300, 1200, 300, 1800, '{"frameHS":3,"frameJ":3,"sashW":90,"sashH":90,"glassW":60,"glassH":60,"screenW":100,"screenH":100,"angleAllowance":15}'),
  ('patio_door', true, 1, 1200, 3600, 1800, 2400, '{"frameHS":5,"frameJ":5,"sashOverlap":25,"sashHDeduct":35,"glassW":90,"glassH":90,"screenW":120,"screenH":120}'),
  ('custom_shape', false, 1, 300, 2000, 300, 2000, '{}')
  on conflict (product_type) do nothing;
update material_formulas set note = 'No verified geometry formula on file yet — requires manual engineering review for each order.' where product_type = 'custom_shape';

insert into pricing_products (product_type, active, base_price, price_per_sqft, version) values
  ('casement', true, 250, 18, 1),
  ('awning', true, 220, 17, 1),
  ('slider', true, 300, 15, 1),
  ('bay_bow', true, 650, 22, 1),
  ('patio_door', true, 900, 20, 1),
  ('custom_shape', false, 0, 0, 1)
  on conflict (product_type) do nothing;

insert into pricing_modifiers (id, glass, color, screen, hardware, grid_surcharge, version) values (1,
  '{"Double Pane Clear":0,"Double Pane Low-E":45,"Triple Pane Low-E":95,"Tempered Double Pane":60,"Obscure/Privacy":35}',
  '{"White":0,"Almond":15,"Black":40,"Dark Bronze":40,"Woodgrain":85}',
  '{"None":0,"Standard Fiberglass":25,"Pet-Resistant":55,"Retractable":120}',
  '{"None":0,"Standard Crank (Casement)":0,"Standard Awning Operator":0,"Sliding Latch + Lock":0,"Multi-Point Lock":35,"Patio Door Handle Set":0}',
  40, 1
) on conflict (id) do nothing;

-- =============================================================================
-- FIRST ADMIN ACCOUNT
-- After running this file:
--   1. Supabase Dashboard -> Authentication -> Add User -> create your own
--      login (email + password).
--   2. Copy that user's UUID from the Authentication table.
--   3. Run:
--        insert into profiles (id, full_name, role) values
--          ('paste-uuid-here', 'Your Name', 'admin');
--   4. Repeat step 1-3 for each employee, using the correct role
--      ('admin' | 'office' | 'measurement' | 'factory' | 'readonly').
-- =============================================================================
