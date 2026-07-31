// Supabase data-access layer: every read/write to Postgres goes through here.
// Row <-> app-shape mapping keeps the camelCase field names the render layer
// (ported from the prototype) already expects, so main.js stays close to the
// original prototype's structure. Approval-locked transitions (calculation
// approve/reopen, quote approve/reopen) are routed through the Postgres RPC
// functions defined in schema.sql — never written directly to the tables —
// so the server-side lock can't be bypassed from the browser.
import { supabase } from './supabase-client.js';
import { state } from './store.js';

async function call(promise){
  const { data, error } = await promise;
  if(error) throw new Error(error.message);
  return data;
}

/* ================= AUTH ================= */
export async function signIn(email, password){
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if(error) throw error;
  return data.session;
}
export async function signOut(){
  await supabase.auth.signOut();
}
export async function getSession(){
  const { data } = await supabase.auth.getSession();
  return data.session;
}
export async function loadOwnProfile(userId){
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if(error) throw new Error(error.message);
  return data; // null if no profile row exists yet
}

/* ================= PROFILES (name resolution + employee pickers) ================= */
export function profileName(id){
  if(!id) return null;
  const p = state.profilesById[id];
  return p ? p.full_name : 'Unknown';
}
export async function loadProfiles(){
  const rows = await call(supabase.from('profiles').select('*').order('full_name'));
  state.profilesById = {};
  rows.forEach(r => state.profilesById[r.id] = r);
  state.profilesActive = rows.filter(r => r.active);
}

/* ================= REFERENCE DATA: statuses / formulas / pricing ================= */
export async function loadStatuses(){
  const rows = await call(supabase.from('statuses').select('*').order('sort_order'));
  state.statuses = rows.map(r => r.label);
}

function mapFormulaRow(row){
  return {
    productType: row.product_type, active: row.active, version: row.version,
    minW: row.min_w, maxW: row.max_w, minH: row.min_h, maxH: row.max_h,
    deductions: row.deductions || {}, note: row.note,
    changedById: row.changed_by, changedBy: profileName(row.changed_by), changedAt: row.changed_at,
  };
}
export async function loadFormulas(){
  const rows = await call(supabase.from('material_formulas').select('*'));
  const formulas = {};
  rows.forEach(r => formulas[r.product_type] = mapFormulaRow(r));
  state.formulas = formulas;
}
export async function loadFormulaHistory(productType){
  const rows = await call(supabase.from('material_formula_history').select('*').eq('product_type', productType).order('version', {ascending:false}));
  return rows.map(r => ({version:r.version, by:profileName(r.changed_by), at:r.changed_at}));
}
export async function saveFormula(productType, draft){
  const current = state.formulas[productType];
  // Best-effort audit snapshot — the history tables are select-only for non-superuser
  // roles in the current schema (no INSERT policy), so this may silently no-op.
  try{
    await supabase.from('material_formula_history').insert({
      product_type: productType, version: current.version, deductions: current.deductions,
      min_w: current.minW, max_w: current.maxW, min_h: current.minH, max_h: current.maxH,
      active: current.active, changed_by: current.changedById, changed_at: current.changedAt,
    });
  }catch(e){ /* see README: material_formula_history has no INSERT policy yet */ }
  await call(supabase.from('material_formulas').update({
    active: draft.active, version: current.version + 1,
    min_w: draft.minW, max_w: draft.maxW, min_h: draft.minH, max_h: draft.maxH,
    changed_by: state.user.id, changed_at: new Date().toISOString(),
  }).eq('product_type', productType));
  await insertActivity('updatedFormula', { type: productType, v: current.version + 1 });
  await loadFormulas();
}

function mapPricingProductRow(row){
  return {
    productType: row.product_type, active: row.active, version: row.version,
    basePrice: Number(row.base_price), pricePerSqFt: Number(row.price_per_sqft),
    changedById: row.changed_by, changedBy: profileName(row.changed_by), changedAt: row.changed_at,
  };
}
function mapModifiersRow(row){
  return {
    version: row.version, glass: row.glass||{}, color: row.color||{}, screen: row.screen||{},
    hardware: row.hardware||{}, gridSurcharge: Number(row.grid_surcharge)||0,
    installFeeCents: Math.round(Number(row.install_fee||0)*100),
    changedBy: profileName(row.changed_by), changedAt: row.changed_at,
  };
}
function mapRateRow(row, priceField){
  return {
    id: row.id, labelEn: row.label_en, labelZh: row.label_zh,
    ratePerSqFt: priceField==='rate' ? Number(row.rate_per_sqft) : undefined,
    flatPriceCents: priceField==='flat' ? Math.round(Number(row.flat_price)*100) : undefined,
    active: row.active, version: row.version,
    changedById: row.changed_by, changedBy: profileName(row.changed_by), changedAt: row.changed_at,
  };
}
export async function loadPricing(){
  const [products, modifiers, frameTypes, glassTypes, patioDoors] = await Promise.all([
    call(supabase.from('pricing_products').select('*')),
    call(supabase.from('pricing_modifiers').select('*').eq('id',1).single()),
    call(supabase.from('pricing_frame_types').select('*').order('id')),
    call(supabase.from('pricing_glass_types').select('*').order('id')),
    call(supabase.from('pricing_patio_doors').select('*').order('id')),
  ]);
  const productsMap = {};
  products.forEach(r => productsMap[r.product_type] = mapPricingProductRow(r));
  const frameTypesMap = {}; frameTypes.forEach(r => frameTypesMap[r.id] = mapRateRow(r,'rate'));
  const glassTypesMap = {}; glassTypes.forEach(r => glassTypesMap[r.id] = mapRateRow(r,'rate'));
  const patioDoorsMap = {}; patioDoors.forEach(r => patioDoorsMap[r.id] = mapRateRow(r,'flat'));
  state.pricing = {
    products: productsMap, modifiers: mapModifiersRow(modifiers),
    frameTypes: frameTypesMap, glassTypes: glassTypesMap, patioDoors: patioDoorsMap,
  };
}
export async function loadFrameTypeHistory(id){
  const rows = await call(supabase.from('pricing_frame_types').select('version,changed_by,changed_at').eq('id', id));
  return rows.map(r => ({version:r.version, by:profileName(r.changed_by), at:r.changed_at}));
}
export async function saveFrameType(id, draft){
  await call(supabase.from('pricing_frame_types').update({
    active: draft.active, rate_per_sqft: draft.ratePerSqFt,
    version: state.pricing.frameTypes[id].version + 1, changed_by: state.user.id, changed_at: new Date().toISOString(),
  }).eq('id', id));
  await insertActivity('updatedFrameType', { id });
  await loadPricing();
}
export async function saveGlassType(id, draft){
  await call(supabase.from('pricing_glass_types').update({
    active: draft.active, rate_per_sqft: draft.ratePerSqFt,
    version: state.pricing.glassTypes[id].version + 1, changed_by: state.user.id, changed_at: new Date().toISOString(),
  }).eq('id', id));
  await insertActivity('updatedGlassType', { id });
  await loadPricing();
}
export async function savePatioDoorPrice(id, draft){
  await call(supabase.from('pricing_patio_doors').update({
    active: draft.active, flat_price: draft.flatPrice,
    version: state.pricing.patioDoors[id].version + 1, changed_by: state.user.id, changed_at: new Date().toISOString(),
  }).eq('id', id));
  await insertActivity('updatedPatioDoorPrice', { id });
  await loadPricing();
}
export async function saveInstallFee(dollars){
  const m = state.pricing.modifiers;
  await call(supabase.from('pricing_modifiers').update({
    install_fee: dollars, version: m.version+1, changed_by: state.user.id, changed_at: new Date().toISOString(),
  }).eq('id', 1));
  await insertActivity('updatedInstallFee', {});
  await loadPricing();
}
export async function loadPricingProductHistory(productType){
  const rows = await call(supabase.from('pricing_product_history').select('*').eq('product_type', productType).order('version', {ascending:false}));
  return rows.map(r => ({version:r.version, by:profileName(r.changed_by), at:r.changed_at}));
}
export async function saveProductPricing(productType, draft){
  const current = state.pricing.products[productType];
  try{
    await supabase.from('pricing_product_history').insert({
      product_type: productType, version: current.version, base_price: current.basePrice,
      price_per_sqft: current.pricePerSqFt, active: current.active,
      changed_by: current.changedById, changed_at: current.changedAt,
    });
  }catch(e){ /* see README: pricing_product_history has no INSERT policy yet */ }
  await call(supabase.from('pricing_products').update({
    active: draft.active, version: current.version + 1, base_price: draft.basePrice,
    price_per_sqft: draft.pricePerSqFt, changed_by: state.user.id, changed_at: new Date().toISOString(),
  }).eq('product_type', productType));
  await insertActivity('updatedPricingProduct', { type: productType, v: current.version + 1 });
  await loadPricing();
}

/* ================= ACTIVITY LOG (dashboard "Recent Activity") ================= */
export async function insertActivity(eventKey, params){
  await call(supabase.from('activity_log').insert({ by: state.user.id, event_key: eventKey, params: params||{} }));
}
export async function loadRecentActivity(limit=10){
  const rows = await call(supabase.from('activity_log').select('*').order('at',{ascending:false}).limit(limit));
  return rows.map(r => ({ at: r.at, by: profileName(r.by), key: r.event_key, params: r.params||{} }));
}

/* ================= CLIENTS ================= */
function mapClientRow(row){
  return {
    id: row.id, clientNo: row.client_no, fullName: row.full_name, company: row.company||'',
    phone1: row.phone1||'', phone2: row.phone2||'', email: row.email||'',
    prefLang: row.pref_lang||'English', billingAddress: row.billing_address||'', projectAddress: row.project_address||'',
    referral: row.referral||'', notes: row.notes||'',
    ownerEmployeeId: row.owner_employee, ownerEmployee: profileName(row.owner_employee) || '—',
    createdAt: row.created_at, archivedAt: row.archived_at, archivedBy: profileName(row.archived_by),
  };
}
export async function listClients(includeArchived=false){
  let q = supabase.from('clients').select('*').order('created_at',{ascending:false});
  if(!includeArchived) q = q.is('archived_at', null);
  const rows = await call(q);
  return rows.map(mapClientRow);
}
export async function getClient(id){
  // Deliberately not filtered by archived_at — an archived client must still be
  // viewable (e.g. from a link on one of their orders, or to restore them).
  const row = await call(supabase.from('clients').select('*').eq('id', id).maybeSingle());
  return row ? mapClientRow(row) : null;
}
export async function archiveClient(id, fullName){
  await call(supabase.from('clients').update({ archived_at: new Date().toISOString(), archived_by: state.user.id }).eq('id', id));
  await insertActivity('archivedClient', { name: fullName });
}
export async function restoreClient(id, fullName){
  await call(supabase.from('clients').update({ archived_at: null, archived_by: null }).eq('id', id));
  await insertActivity('restoredClient', { name: fullName });
}
export async function findDuplicateClient(phone, email, excludeId){
  let q = supabase.from('clients').select('*').is('archived_at', null);
  const ors = [];
  if(phone) ors.push(`phone1.eq.${phone}`);
  if(email) ors.push(`email.ilike.${email}`);
  if(ors.length===0) return null;
  q = q.or(ors.join(','));
  const rows = await call(q);
  const match = rows.find(r => r.id !== excludeId);
  return match ? mapClientRow(match) : null;
}
export async function createClient(data){
  const row = await call(supabase.from('clients').insert({
    full_name: data.fullName, company: data.company, phone1: data.phone1, phone2: data.phone2,
    email: data.email, pref_lang: data.prefLang, referral: data.referral, owner_employee: data.ownerEmployeeId,
    billing_address: data.billingAddress, project_address: data.projectAddress, notes: data.notes,
    created_by: state.user.id,
  }).select().single());
  await insertActivity('createClient', { name: data.fullName, no: row.client_no });
  return mapClientRow(row);
}
export async function updateClient(id, data){
  const row = await call(supabase.from('clients').update({
    full_name: data.fullName, company: data.company, phone1: data.phone1, phone2: data.phone2,
    email: data.email, pref_lang: data.prefLang, referral: data.referral, owner_employee: data.ownerEmployeeId,
    billing_address: data.billingAddress, project_address: data.projectAddress, notes: data.notes,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select().single());
  await insertActivity('updateClient', { name: data.fullName });
  return mapClientRow(row);
}

/* ================= ORDERS ================= */
function mapOrderRow(row){
  return {
    id: row.id, orderNo: row.order_no, clientId: row.client_id, projectAddress: row.project_address||'',
    orderDate: row.order_date, dueDate: row.due_date, installAddress: row.install_address||'',
    salesperson: row.salesperson||'', measurementEmployee: row.measurement_employee||'', officeEmployee: row.office_employee||'',
    status: row.status, deposit: row.deposit, paymentNotes: row.payment_notes||'',
    internalNotes: row.internal_notes||'', factoryNotes: row.factory_notes||'', installNotes: row.install_notes||'',
    factorySheetVersion: row.factory_sheet_version||0, invoiceVersion: row.invoice_version||0, createdAt: row.created_at,
    archivedAt: row.archived_at, archivedBy: profileName(row.archived_by),
  };
}
export async function listOrders(includeArchived=false){
  let orderQ = supabase.from('orders').select('*, clients(full_name)').order('created_at',{ascending:false});
  if(!includeArchived) orderQ = orderQ.is('archived_at', null);
  const [orders, items] = await Promise.all([
    call(orderQ),
    call(supabase.from('order_items').select('order_id,category')),
  ]);
  const byOrder = {};
  items.forEach(it => { (byOrder[it.order_id] = byOrder[it.order_id]||[]).push(it.category); });
  return orders.map(o => ({ ...mapOrderRow(o), clientName: o.clients?.full_name || '—', itemCategories: byOrder[o.id]||[] }));
}
export async function archiveOrder(id, orderNo){
  await call(supabase.from('orders').update({ archived_at: new Date().toISOString(), archived_by: state.user.id }).eq('id', id));
  await pushHistory(id, 'archivedOrder', {no:orderNo});
  await insertActivity('archivedOrder', { no: orderNo });
}
export async function restoreOrder(id, orderNo){
  await call(supabase.from('orders').update({ archived_at: null, archived_by: null }).eq('id', id));
  await pushHistory(id, 'restoredOrder', {no:orderNo});
  await insertActivity('restoredOrder', { no: orderNo });
}

function mapItemRow(row){
  const cr = row.calc_results || {};
  return {
    id: row.id, itemNo: row.item_no, category: row.category, width: row.width, height: row.height,
    dimO: row.dim_o, dimS: row.dim_s, dimT: row.dim_t,
    unit: row.unit||'mm', quantity: row.quantity, frameSystem: row.frame_system||'', openingStyle: row.opening_style||'',
    glassType: row.glass_type||'', glassThickness: row.glass_thickness||'', color: row.color||'',
    screenType: row.screen_type||'', hardware: row.hardware||'', grid: row.grid||'', specialOptions: row.special_options||'',
    installNotes: row.install_notes||'', room: row.room||'', notes: row.notes||'', installRequested: !!row.install_requested,
    calc: {
      status: row.calc_status, results: cr.components || null, glass: cr.glass || null, areaM2: cr.areaM2 ?? null,
      scalesWithQty: cr.scalesWithQty !== false, warnings: cr.warnings || [], error: cr.error || null,
      formulaVersion: row.calc_formula_version, calculatedBy: profileName(row.calc_by), calculatedAt: row.calc_at,
      approvedBy: profileName(row.calc_approved_by), approvedAt: row.calc_approved_at,
    },
  };
}
function mapQuoteRow(orderId, row){
  if(!row) return { orderId, status:'draft', discountPct:0, taxPct:5, manualTotalCents:null, manualItems:[], snapshot:null, sentBy:null, sentAt:null, approvedBy:null, approvedAt:null, approvalNote:'' };
  return {
    orderId, status: row.status, discountPct: Number(row.discount_pct)||0, taxPct: Number(row.tax_pct)||0,
    manualTotalCents: row.manual_total!=null ? Math.round(Number(row.manual_total)*100) : null,
    manualItems: row.manual_items || [],
    snapshot: row.snapshot, sentBy: profileName(row.sent_by), sentAt: row.sent_at,
    approvedBy: row.approved_by, approvedAt: row.approved_at, approvalNote: row.approval_note||'',
  };
}
function mapHistoryRow(row){
  return { at: row.at, by: profileName(row.by), key: row.event_key, params: row.params||{} };
}

export async function listOrdersForClient(clientId){
  const orders = await call(supabase.from('orders').select('*').eq('client_id', clientId).is('archived_at', null).order('created_at',{ascending:false}));
  if(orders.length===0) return [];
  const items = await call(supabase.from('order_items').select('order_id').in('order_id', orders.map(o=>o.id)));
  const counts = {};
  items.forEach(it => { counts[it.order_id] = (counts[it.order_id]||0)+1; });
  return orders.map(o => ({ ...mapOrderRow(o), itemCount: counts[o.id]||0 }));
}
export async function getOrderFull(id){
  // Deliberately not filtered by archived_at — an archived order must still be
  // viewable directly (e.g. from a link, or to restore it).
  const [order, items, quote, history] = await Promise.all([
    call(supabase.from('orders').select('*').eq('id', id).maybeSingle()),
    call(supabase.from('order_items').select('*').eq('order_id', id).order('created_at')),
    call(supabase.from('order_quotes').select('*').eq('order_id', id).maybeSingle()),
    call(supabase.from('order_history').select('*').eq('order_id', id).order('at',{ascending:false})),
  ]);
  if(!order) return null;
  return {
    ...mapOrderRow(order),
    items: items.map(mapItemRow),
    quote: mapQuoteRow(id, quote),
    history: history.map(mapHistoryRow),
  };
}
async function pushHistory(orderId, key, params){
  await call(supabase.from('order_history').insert({ order_id: orderId, by: state.user.id, event_key: key, params: params||{} }));
}

export async function createOrder(data){
  const row = await call(supabase.from('orders').insert({
    client_id: data.clientId, project_address: data.projectAddress, status: data.status,
    order_date: data.orderDate||null, due_date: data.dueDate||null, install_address: data.installAddress,
    salesperson: data.salesperson, measurement_employee: data.measurementEmployee, office_employee: data.officeEmployee,
    deposit: data.deposit||0, internal_notes: data.internalNotes, factory_notes: data.factoryNotes,
    install_notes: data.installNotes, created_by: state.user.id,
  }).select().single());
  await call(supabase.from('order_quotes').insert({ order_id: row.id }));
  await pushHistory(row.id, 'orderCreated', {});
  await insertActivity('createOrder', { no: row.order_no, name: data.clientName });
  return row.id;
}
export async function updateOrder(id, data, statusChanged){
  await call(supabase.from('orders').update({
    project_address: data.projectAddress, status: data.status, order_date: data.orderDate||null, due_date: data.dueDate||null,
    install_address: data.installAddress, salesperson: data.salesperson, measurement_employee: data.measurementEmployee,
    office_employee: data.officeEmployee, deposit: data.deposit||0, internal_notes: data.internalNotes,
    factory_notes: data.factoryNotes, install_notes: data.installNotes, updated_at: new Date().toISOString(),
  }).eq('id', id));
  if(statusChanged) await pushHistory(id, 'statusChanged', { status: data.status });
  else await pushHistory(id, 'orderUpdated', {});
  await insertActivity('updateOrder', { no: data.orderNo });
}

/* ================= ORDER ITEMS ================= */
export async function createItem(orderId, existingCount, data){
  let attempt = existingCount + 1;
  for(let tries=0; tries<5; tries++){
    const itemNo = `Window ${attempt}`;
    const { data: row, error } = await supabase.from('order_items').insert({
      order_id: orderId, item_no: itemNo, category: data.category, width: data.width, height: data.height,
      dim_o: data.dimO ?? null, dim_s: data.dimS ?? null, dim_t: data.dimT ?? null,
      unit: data.unit, quantity: data.quantity, frame_system: data.frameSystem, opening_style: data.openingStyle,
      glass_type: data.glassType, glass_thickness: data.glassThickness, color: data.color, screen_type: data.screenType,
      hardware: data.hardware, grid: data.grid, special_options: data.specialOptions, install_notes: data.installNotes,
      room: data.room, notes: data.notes, install_requested: !!data.installRequested,
    }).select().single();
    if(!error){ await pushHistory(orderId, 'addedItem', {item:itemNo}); return itemNo; }
    if(error.code === '23505'){ attempt++; continue; } // item_no collision, retry with next number
    throw new Error(error.message);
  }
  throw new Error('Could not allocate a unique item number — please retry.');
}
export async function updateItem(orderId, itemId, itemNo, data, measurementsChanged){
  const patch = {
    category: data.category, width: data.width, height: data.height,
    dim_o: data.dimO ?? null, dim_s: data.dimS ?? null, dim_t: data.dimT ?? null, unit: data.unit, quantity: data.quantity,
    frame_system: data.frameSystem, opening_style: data.openingStyle, glass_type: data.glassType,
    glass_thickness: data.glassThickness, color: data.color, screen_type: data.screenType, hardware: data.hardware,
    grid: data.grid, special_options: data.specialOptions, install_notes: data.installNotes, room: data.room,
    notes: data.notes, install_requested: !!data.installRequested, updated_at: new Date().toISOString(),
  };
  if(measurementsChanged){
    Object.assign(patch, { calc_status:'draft', calc_results:null, calc_formula_version:null, calc_by:null, calc_at:null, calc_approved_by:null, calc_approved_at:null });
  }
  await call(supabase.from('order_items').update(patch).eq('id', itemId));
  if(measurementsChanged) await pushHistory(orderId, 'itemMeasurementsChanged', {item:itemNo});
  else await pushHistory(orderId, 'itemUpdated', {item:itemNo});
}
export async function duplicateItem(orderId, srcItem, existingCount){
  let attempt = existingCount + 1;
  for(let tries=0; tries<5; tries++){
    const itemNo = `Window ${attempt}`;
    const { error } = await supabase.from('order_items').insert({
      order_id: orderId, item_no: itemNo, category: srcItem.category, width: srcItem.width, height: srcItem.height,
      dim_o: srcItem.dimO ?? null, dim_s: srcItem.dimS ?? null, dim_t: srcItem.dimT ?? null,
      unit: srcItem.unit, quantity: srcItem.quantity, frame_system: srcItem.frameSystem, opening_style: srcItem.openingStyle,
      glass_type: srcItem.glassType, glass_thickness: srcItem.glassThickness, color: srcItem.color,
      screen_type: srcItem.screenType, hardware: srcItem.hardware, grid: srcItem.grid,
      special_options: srcItem.specialOptions, install_notes: srcItem.installNotes, room: srcItem.room, notes: srcItem.notes,
      install_requested: !!srcItem.installRequested,
    });
    if(!error){ await pushHistory(orderId, 'duplicatedItem', {src:srcItem.itemNo, item:itemNo}); return itemNo; }
    if(error.code === '23505'){ attempt++; continue; }
    throw new Error(error.message);
  }
  throw new Error('Could not allocate a unique item number — please retry.');
}
export async function runCalculation(orderId, item, calcResult){
  const patch = calcResult.ok
    ? { calc_status:'calculated', calc_results:{components:calcResult.components, glass:calcResult.glass,
          areaM2:calcResult.areaM2, scalesWithQty:calcResult.scalesWithQty, warnings:calcResult.warnings},
        calc_formula_version:calcResult.formulaVersion, calc_by:state.user.id, calc_at:new Date().toISOString(),
        calc_approved_by:null, calc_approved_at:null }
    : { calc_status:'draft', calc_results:{error:calcResult.error}, calc_formula_version:null, calc_by:null, calc_at:null,
        calc_approved_by:null, calc_approved_at:null };
  await call(supabase.from('order_items').update(patch).eq('id', item.id));
  await pushHistory(orderId, 'calculated', {item:item.itemNo});
}
export async function approveCalc(orderId, item){
  await call(supabase.rpc('approve_calculation', { p_item_id: item.id }));
  await pushHistory(orderId, 'approvedCalc', {item:item.itemNo});
}
export async function reopenCalc(orderId, item){
  await call(supabase.rpc('reopen_calculation', { p_item_id: item.id }));
  await pushHistory(orderId, 'reopenedCalc', {item:item.itemNo});
}

/* ================= CLIENT QUOTE ================= */
export async function updateQuoteRates(orderId, field, value){
  const column = field === 'discountPct' ? 'discount_pct' : 'tax_pct';
  await call(supabase.from('order_quotes').update({ [column]: value }).eq('order_id', orderId));
}
export async function updateManualTotal(orderId, dollarsOrNull){
  await call(supabase.from('order_quotes').update({ manual_total: dollarsOrNull }).eq('order_id', orderId));
}
export async function saveManualItems(orderId, items){
  await call(supabase.from('order_quotes').update({ manual_items: items }).eq('order_id', orderId));
}
export async function sendQuoteToClient(orderId, snapshot, discountPct, taxPct, manualTotalDollarsOrNull, orderStatus){
  await call(supabase.from('order_quotes').update({
    status: 'sent', discount_pct: discountPct, tax_pct: taxPct, manual_total: manualTotalDollarsOrNull, snapshot,
    sent_by: state.user.id, sent_at: new Date().toISOString(), approved_by: null, approved_at: null,
  }).eq('order_id', orderId));
  if(orderStatus) await call(supabase.from('orders').update({ status: orderStatus }).eq('id', orderId));
  await pushHistory(orderId, 'sentQuote', { total: (snapshot.totalCents/100).toFixed(2) });
}
export async function recordApproval(orderId, by, note, orderStatus){
  await call(supabase.rpc('approve_quote', { p_order_id: orderId, p_approved_by: by, p_note: note }));
  if(orderStatus) await call(supabase.from('orders').update({ status: orderStatus }).eq('id', orderId));
  await pushHistory(orderId, 'approvedQuote', { by });
}
export async function reopenQuote(orderId){
  await call(supabase.rpc('reopen_quote', { p_order_id: orderId }));
  await pushHistory(orderId, 'reopenedQuote', {});
}

/* ================= FACTORY SHEET ================= */
export async function generateFactorySheet(orderId, currentVersion, lang){
  const nextVersion = currentVersion + 1;
  await call(supabase.from('orders').update({ factory_sheet_version: nextVersion }).eq('id', orderId));
  await pushHistory(orderId, 'generatedFactorySheet', { v: nextVersion, lang });
  return nextVersion;
}

/* ================= INVOICE ================= */
export async function generateInvoice(orderId, currentVersion, lang){
  const nextVersion = currentVersion + 1;
  await call(supabase.from('orders').update({ invoice_version: nextVersion }).eq('id', orderId));
  await pushHistory(orderId, 'generatedInvoice', { v: nextVersion, lang });
  return nextVersion;
}
export async function markSentToFactory(orderId){
  await call(supabase.from('orders').update({ status: 'Sent To Factory' }).eq('id', orderId));
  await pushHistory(orderId, 'sentToFactory', {});
}

/* ================= SEARCH ================= */
export async function globalSearch(q){
  const like = `%${q}%`;
  const [clients, orders] = await Promise.all([
    call(supabase.from('clients').select('*').is('archived_at', null)
      .or(`full_name.ilike.${like},phone1.ilike.${like},phone2.ilike.${like},email.ilike.${like},client_no.ilike.${like},project_address.ilike.${like}`)
      .limit(5)),
    call(supabase.from('orders').select('id,order_no,client_id,clients(full_name)').is('archived_at', null).ilike('order_no', like).limit(5)),
  ]);
  return {
    clients: clients.map(mapClientRow),
    orders: orders.map(o => ({ id:o.id, orderNo:o.order_no, clientId:o.client_id, clientName: o.clients?.full_name || '—' })),
  };
}
