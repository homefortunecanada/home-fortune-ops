-- order_items had no DELETE policy at all, so removing a window/door line
-- from an order was blocked at the database level regardless of what the
-- app's UI allowed — RLS denies any action with no matching policy. Adds
-- one, mirroring the existing order_items_update policy: any active,
-- non-readonly employee can delete an item, but only while its material
-- calculation is not yet approved (same lock as editing). Purely additive.

drop policy if exists order_items_delete on order_items;
create policy order_items_delete on order_items for delete using (
  is_active_user() and current_role_name() <> 'readonly' and calc_status <> 'approved'
);
