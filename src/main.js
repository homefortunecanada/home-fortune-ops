import { state, setLang as setLangState } from './store.js';
import * as D from './data.js';
import * as C from './calc-engine.js';
import {
  t, tf, actMsg, esc, fmtDate, fmtDateTime, opt, optionsHtml, optById, optionsHtmlById, statusLabel, pname, productLabel, opt2en, opt2zh,
  ROLES, NAV_BY_ROLE, NAV_ITEMS, PRODUCT_TYPES, CATEGORY_CONFIG, OPENING_STYLES, GLASS_TYPES, FRAME_TYPES, COLORS, SCREEN_TYPES, HARDWARE, PREF_LANGS,
  canEdit, isAdmin,
} from './i18n.js';

let currentRoute = 'dashboard';
let currentParam = null;
let formulaAdminTab = 'materials';
let currentOrder = null; // full order (items/quote/history) for the order-detail page currently shown

/* ================= AUTH / BOOT ================= */
async function boot(){
  const session = await D.getSession();
  if(session && await establishSession(session)){ showApp(); return; }
  showLogin();
}
async function establishSession(session){
  let profile;
  try{ profile = await D.loadOwnProfile(session.user.id); }
  catch(e){ showLoginError(tf('auth.genericError',{msg:e.message})); await D.signOut(); return false; }
  if(!profile){ showLoginError(t('auth.noProfile')); await D.signOut(); return false; }
  if(!profile.active){ showLoginError(t('auth.inactive')); await D.signOut(); return false; }
  if(!ROLES[profile.role]){ showLoginError(tf('auth.unknownRole',{role:profile.role})); await D.signOut(); return false; }
  state.session = session;
  state.user = profile;
  await Promise.all([D.loadProfiles(), D.loadStatuses(), D.loadFormulas(), D.loadPricing()]);
  return true;
}
function showLoginError(msg){
  document.getElementById('loginError').innerHTML = msg ? `<div class="banner error">${esc(msg)}</div>` : '';
}
function showLogin(){
  document.getElementById('appShell').classList.remove('active');
  document.getElementById('loginScreen').style.display = 'flex';
}
function showApp(){
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').classList.add('active');
  showLoginError('');
  buildNav();
  applyLangButtons();
  route('dashboard');
}
async function doLogin(){
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  showLoginError('');
  if(!email || !password){ showLoginError(t('auth.invalidCredentials')); return; }
  btn.disabled = true;
  try{
    const session = await D.signIn(email, password);
    if(await establishSession(session)) showApp();
  }catch(err){
    const msg = /invalid login credentials/i.test(err.message||'') ? t('auth.invalidCredentials') : tf('auth.genericError',{msg:err.message});
    showLoginError(msg);
  }finally{
    btn.disabled = false;
  }
}
async function logout(){
  await D.signOut();
  state.session = null; state.user = null;
  showLogin();
}

/* ================= LANGUAGE ================= */
async function onSetLang(lang){
  setLangState(lang);
  buildNav();
  applyLangButtons();
  await route(currentRoute, currentParam);
}
function applyLangButtons(){
  document.getElementById('langBtnEn').classList.toggle('active', state.lang==='en');
  document.getElementById('langBtnZh').classList.toggle('active', state.lang==='zh');
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent = t(el.getAttribute('data-i18n')); });
  const gs = document.getElementById('globalSearch');
  if(gs) gs.setAttribute('placeholder', t('search.placeholder'));
}

/* ================= NAV / ROUTING ================= */
function buildNav(){
  const allowed = NAV_BY_ROLE[state.user.role] || ['dashboard'];
  const nav = document.getElementById('navLinks');
  nav.innerHTML = NAV_ITEMS.filter(i=>allowed.includes(i.id)).map(i=>
    `<a href="#" data-route="${i.id}" class="${currentRoute===i.id?'active':''}" onclick="route('${i.id}');return false;">
      <span>${i.icon}</span><span>${t(i.key)}</span></a>`).join('');
  const roleInfo = ROLES[state.user.role];
  document.getElementById('userRoleLabel').textContent = roleInfo ? (roleInfo[state.lang] || roleInfo.en) : state.user.role;
  document.getElementById('userNameLabel').textContent = state.user.full_name;
}
async function route(r, param){
  currentRoute = r; currentParam = param;
  document.querySelectorAll('#navLinks a').forEach(a=> a.classList.toggle('active', a.dataset.route===r));
  const content = document.getElementById('content');
  content.innerHTML = `<div class="card">${esc(t('common.loading'))}</div>`;
  try{
    let html;
    if(r==='dashboard') html = await renderDashboard();
    else if(r==='clients') html = await renderClients();
    else if(r==='client-detail') html = await renderClientDetail(param);
    else if(r==='orders') html = await renderOrders();
    else if(r==='order-detail') html = await renderOrderDetail(param);
    else if(r==='calendar') html = await renderCalendar();
    else if(r==='formulas') html = await renderFormulas();
    else html = '';
    content.innerHTML = html;
  }catch(err){
    content.innerHTML = `<div class="banner error">${esc(err.message)}</div>`;
  }
  applyLangButtons();
}

/* ================= DASHBOARD ================= */
async function renderDashboard(){
  const [orders, activity] = await Promise.all([D.listOrders(), D.loadRecentActivity(10)]);
  const counts = {};
  orders.forEach(o=> counts[o.status] = (counts[o.status]||0)+1 );
  const today = new Date().toISOString().slice(0,10);
  const overdue = orders.filter(o=> o.dueDate && o.dueDate < today && !['Completed','Installed','Cancelled/On Hold'].includes(o.status));
  const missingInfo = orders.filter(o=> !o.measurementEmployee || o.itemCategories.length===0);

  const cardDefs = [
    {label:t('stat.newInquiry'), val:counts['New Inquiry']||0},
    {label:t('stat.measurementRequired'), val:counts['Measurement Required']||0},
    {label:t('stat.quoteInProgress'), val:counts['Quote In Progress']||0},
    {label:t('stat.customerApproval'), val:counts['Customer Approval Required']||0},
    {label:t('stat.readyForFactory'), val:counts['Ready For Factory']||0, cls:'ok'},
    {label:t('stat.inProduction'), val:counts['In Production']||0},
    {label:t('stat.installScheduled'), val:counts['Installation Scheduled']||0},
    {label:t('stat.overdue'), val:overdue.length, cls:'warn'},
  ];

  return `
    <div class="pageHead"><div><h2 data-i18n="dash.title">${t('dash.title')}</h2><div class="desc" data-i18n="dash.desc">${t('dash.desc')}</div></div></div>
    <div class="statCards">${cardDefs.map(c=>`<div class="statCard ${c.cls||''}"><div class="n">${c.val}</div><div class="l">${esc(c.label)}</div></div>`).join('')}</div>
    <div class="grid cols-2">
      <div class="card">
        <h3 style="margin-top:0;font-size:14.5px;color:var(--navy)" data-i18n="dash.overdue">${t('dash.overdue')}</h3>
        ${overdue.length===0 ? `<div class="small" data-i18n="dash.noOverdue">${t('dash.noOverdue')}</div>` :
        `<table><thead><tr><th>${t('th.orderNo')}</th><th>${t('th.client')}</th><th>${t('th.due')}</th><th>${t('th.status')}</th><th></th></tr></thead><tbody>
          ${overdue.map(o=>`<tr><td>${o.orderNo}</td><td>${esc(o.clientName)}</td><td>${fmtDate(o.dueDate)}</td>
            <td><span class="badge hold">${esc(statusLabel(o.status))}</span></td>
            <td><a href="#" onclick="route('order-detail','${o.id}');return false;">${t('common.view')}</a></td></tr>`).join('')}
          </tbody></table>`}
        ${missingInfo.length>0 ? `<div class="banner warn" style="margin-top:12px;">${missingInfo.length} ${t('dash.missingInfo')}</div>`:''}
      </div>
      <div class="card">
        <h3 style="margin-top:0;font-size:14.5px;color:var(--navy)" data-i18n="dash.recent">${t('dash.recent')}</h3>
        <table><tbody>
          ${activity.map(a=>`<tr><td style="white-space:nowrap;color:var(--gray-400);font-size:11.5px;">${fmtDateTime(a.at)}</td><td><b>${esc(a.by)}</b> — ${esc(actMsg(a.key,a.params))}</td></tr>`).join('')}
        </tbody></table>
      </div>
    </div>
    <div class="footNote">${t('dash.footnote')}</div>
  `;
}

/* ================= CLIENTS ================= */
let clientsShowArchived = false;
async function renderClients(){
  const list = await D.listClients(clientsShowArchived);
  return `
    <div class="pageHead">
      <div><h2 data-i18n="clients.title">${t('clients.title')}</h2><div class="desc" data-i18n="clients.desc">${t('clients.desc')}</div></div>
      ${canEdit() ? `<button class="btn" onclick="openClientModal()">${t('clients.new')}</button>` : ''}
    </div>
    <div class="toolbar">
      <input id="clientSearchBox" placeholder="${t('clients.search')}" style="min-width:340px;" oninput="filterClientTable(this.value)">
      <label class="small flexRow" style="gap:5px;"><input type="checkbox" ${clientsShowArchived?'checked':''} onchange="toggleArchivedClients(this.checked)">${t('common.showArchived')}</label>
    </div>
    <div class="card" style="padding:0;">
      <table id="clientTable"><thead><tr><th>${t('th.clientNo')}</th><th>${t('th.name')}</th><th>${t('th.phone')}</th><th>${t('th.email')}</th><th>${t('th.projectAddress')}</th><th>${t('th.language')}</th><th></th></tr></thead>
      <tbody>${list.map(clientRow).join('')}</tbody></table>
    </div>
  `;
}
function toggleArchivedClients(checked){ clientsShowArchived = checked; route('clients'); }
function clientRow(c){
  const archived = !!c.archivedAt;
  return `<tr data-search="${esc((c.fullName+' '+c.clientNo+' '+c.phone1+' '+c.email+' '+c.projectAddress).toLowerCase())}">
    <td>${c.clientNo}</td><td><a href="#" onclick="route('client-detail','${c.id}');return false;">${esc(c.fullName)}</a>${archived?` <span class="badge hold">${t('common.archived')}</span>`:''}${c.company?`<div class="small">${esc(c.company)}</div>`:''}</td>
    <td>${esc(c.phone1)}</td><td>${esc(c.email)}</td><td>${esc(c.projectAddress)}</td><td>${esc(opt(PREF_LANGS,c.prefLang))}</td>
    <td class="rowActions"><a href="#" onclick="route('client-detail','${c.id}');return false;">${t('common.view')}</a>${canEdit()&&!archived?`<a href="#" onclick="openClientModal('${c.id}');return false;">${t('common.edit')}</a>`:''}</td>
  </tr>`;
}
function filterClientTable(q){
  q = q.toLowerCase();
  document.querySelectorAll('#clientTable tbody tr').forEach(tr=>{
    tr.style.display = tr.dataset.search.includes(q) ? '' : 'none';
  });
}

async function openClientModal(id){
  const c = id ? await D.getClient(id) : null;
  document.getElementById('modalTitle').textContent = c ? `${t('client.edit')} — ${c.clientNo}` : t('client.new');
  document.getElementById('modalBody').innerHTML = `
    <div id="dupWarning"></div>
    <div class="grid cols-2">
      <div class="field"><label>${t('form.fullName')}</label><input id="f_fullName" value="${esc(c?.fullName||'')}"></div>
      <div class="field"><label>${t('form.companyOpt')}</label><input id="f_company" value="${esc(c?.company||'')}"></div>
      <div class="field"><label>${t('form.phone1')}</label><input id="f_phone1" oninput="checkDup()" value="${esc(c?.phone1||'')}"></div>
      <div class="field"><label>${t('form.phone2')}</label><input id="f_phone2" value="${esc(c?.phone2||'')}"></div>
      <div class="field"><label>${t('form.email')}</label><input id="f_email" oninput="checkDup()" value="${esc(c?.email||'')}"></div>
      <div class="field"><label>${t('form.prefLang')}</label>
        <select id="f_prefLang">${optionsHtml(PREF_LANGS, c?.prefLang||'English')}</select></div>
      <div class="field"><label>${t('form.referral')}</label><input id="f_referral" value="${esc(c?.referral||'')}"></div>
      <div class="field"><label>${t('form.owner')}</label>
        <select id="f_owner">${state.profilesActive.map(p=>`<option value="${p.id}" ${(c?.ownerEmployeeId||state.user.id)===p.id?'selected':''}>${esc(p.full_name)}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>${t('form.billingAddress')}</label><input id="f_billing" value="${esc(c?.billingAddress||'')}"></div>
    <div class="field"><label>${t('form.projectAddress')}</label><input id="f_project" value="${esc(c?.projectAddress||'')}"></div>
    <div class="field"><label>${t('form.notes')}</label><textarea id="f_notes" rows="3">${esc(c?.notes||'')}</textarea></div>
  `;
  document.getElementById('modalFoot').innerHTML = `
    <button class="btn secondary" onclick="closeModal()">${t('common.cancel')}</button>
    <button class="btn" onclick="saveClient('${c?c.id:''}')">${t('common.save')}</button>`;
  openModal();
}
async function checkDup(){
  const phone = document.getElementById('f_phone1').value.trim();
  const email = document.getElementById('f_email').value.trim();
  const dup = await D.findDuplicateClient(phone, email);
  document.getElementById('dupWarning').innerHTML = dup ?
    `<div class="banner warn">⚠ ${t('dup.warning')}: <b>${esc(dup.fullName)}</b> (${dup.clientNo}). ${t('dup.check')}</div>` : '';
}
async function saveClient(id){
  const fullName = document.getElementById('f_fullName').value.trim();
  if(!fullName){ alert(t('alert.fullNameRequired')); return; }
  const data = {
    fullName, company:document.getElementById('f_company').value.trim(),
    phone1:document.getElementById('f_phone1').value.trim(), phone2:document.getElementById('f_phone2').value.trim(),
    email:document.getElementById('f_email').value.trim(), prefLang:document.getElementById('f_prefLang').value,
    referral:document.getElementById('f_referral').value.trim(), ownerEmployeeId:document.getElementById('f_owner').value,
    billingAddress:document.getElementById('f_billing').value.trim(), projectAddress:document.getElementById('f_project').value.trim(),
    notes:document.getElementById('f_notes').value.trim(),
  };
  try{
    let clientId = id;
    if(id){ await D.updateClient(id, data); }
    else{ const row = await D.createClient(data); clientId = row.id; }
    closeModal();
    route(currentRoute==='client-detail'?'client-detail':'clients', clientId);
  }catch(err){ alert(err.message); }
}
async function archiveClient(id){
  if(!confirm(t('confirm.archiveClient'))) return;
  try{
    const c = await D.getClient(id);
    await D.archiveClient(id, c.fullName);
    route('client-detail', id);
  }catch(err){ alert(err.message); }
}
async function restoreClient(id){
  try{
    const c = await D.getClient(id);
    await D.restoreClient(id, c.fullName);
    route('client-detail', id);
  }catch(err){ alert(err.message); }
}

async function renderClientDetail(id){
  const c = await D.getClient(id);
  if(!c) return renderClients();
  const archived = !!c.archivedAt;
  const orders = await D.listOrdersForClient(id);
  return `
    <div class="pageHead">
      <div><h2>${esc(c.fullName)} <span class="small">(${c.clientNo})</span>${archived?` <span class="badge hold">${t('common.archived')}</span>`:''}</h2><div class="desc">${esc(c.projectAddress)}</div></div>
      <div>
        ${canEdit()&&!archived?`<button class="btn secondary" onclick="openClientModal('${c.id}')">${t('common.edit')}</button>`:''}
        ${canEdit()&&!archived?`<button class="btn secondary" onclick="archiveClient('${c.id}')">${t('common.archive')}</button>`:''}
        ${canEdit()&&archived?`<button class="btn secondary" onclick="restoreClient('${c.id}')">${t('common.restore')}</button>`:''}
        <button class="btn secondary" onclick="route('clients')">${t('order.back')}</button>
      </div>
    </div>
    ${archived?`<div class="banner warn">${t('archived.clientBanner')} ${t('archived.by')} ${esc(c.archivedBy)} ${t('archived.on')} ${fmtDateTime(c.archivedAt)}.</div>`:''}
    <div class="grid cols-2">
      <div class="card">
        <h3 style="margin-top:0;font-size:14px;color:var(--navy)">${t('client.contact')}</h3>
        <table><tbody>
          <tr><td class="small">${t('client.phone')}</td><td>${esc(c.phone1)} ${c.phone2?'/ '+esc(c.phone2):''}</td></tr>
          <tr><td class="small">${t('client.email')}</td><td>${esc(c.email)||t('common.na')}</td></tr>
          <tr><td class="small">${t('client.company')}</td><td>${esc(c.company)||t('common.na')}</td></tr>
          <tr><td class="small">${t('client.prefLang')}</td><td>${esc(opt(PREF_LANGS,c.prefLang))}</td></tr>
          <tr><td class="small">${t('client.billingAddress')}</td><td>${esc(c.billingAddress)}</td></tr>
          <tr><td class="small">${t('client.projectAddress')}</td><td>${esc(c.projectAddress)}</td></tr>
          <tr><td class="small">${t('client.referral')}</td><td>${esc(c.referral)||t('common.na')}</td></tr>
          <tr><td class="small">${t('client.owner')}</td><td>${esc(c.ownerEmployee)}</td></tr>
          <tr><td class="small">${t('client.created')}</td><td>${fmtDate(c.createdAt)}</td></tr>
        </tbody></table>
      </div>
      <div class="card">
        <h3 style="margin-top:0;font-size:14px;color:var(--navy)">${t('client.notes')}</h3>
        <div class="small" style="white-space:pre-wrap;">${esc(c.notes)||t('client.noNotes')}</div>
        <h3 style="font-size:14px;color:var(--navy)">${t('client.files')}</h3>
        <div class="small">${t('client.noFiles')}</div>
      </div>
    </div>
    <div class="card">
      <div class="flexRow" style="justify-content:space-between;">
        <h3 style="margin:0;font-size:14px;color:var(--navy)">${t('client.history')} (${orders.length})</h3>
        ${canEdit()?`<button class="btn secondary" onclick="openOrderModal(null,'${c.id}')">${t('client.newOrderFor')}</button>`:''}
      </div>
      <table><thead><tr><th>${t('th.orderNo')}</th><th>${t('th.orderDate')}</th><th>${t('th.due')}</th><th>${t('th.status')}</th><th>${t('th.items')}</th><th></th></tr></thead>
      <tbody>${orders.map(o=>`<tr><td>${o.orderNo}</td><td>${fmtDate(o.orderDate)}</td><td>${fmtDate(o.dueDate)}</td>
        <td><span class="badge ${statusBadgeClass(o.status)}">${esc(statusLabel(o.status))}</span></td><td>${o.itemCount}</td>
        <td><a href="#" onclick="route('order-detail','${o.id}');return false;">${t('common.view')}</a></td></tr>`).join('') || `<tr><td colspan="6" class="small">${t('client.noOrdersYet')}</td></tr>`}</tbody></table>
    </div>
  `;
}

/* ================= ORDERS ================= */
function statusBadgeClass(s){
  if(['Completed','Installed','Production Completed'].includes(s)) return 'done';
  if(['Cancelled/On Hold','Payment Outstanding'].includes(s)) return 'hold';
  if(['Sent To Factory','In Production','Ready For Factory'].includes(s)) return 'factory';
  if(['New Inquiry','Measurement Required'].includes(s)) return 'new';
  return 'progress';
}
let ordersShowArchived = false;
async function renderOrders(){
  const orders = await D.listOrders(ordersShowArchived);
  return `
    <div class="pageHead">
      <div><h2 data-i18n="orders.title">${t('orders.title')}</h2><div class="desc" data-i18n="orders.desc">${t('orders.desc')}</div></div>
      ${canEdit()?`<button class="btn" onclick="openOrderModal()">${t('orders.new')}</button>`:''}
    </div>
    <div class="toolbar">
      <select id="filterStatus" onchange="applyOrderFilters()"><option value="">${t('filter.allStatuses')}</option>${state.statuses.map(s=>`<option value="${esc(s)}">${esc(statusLabel(s))}</option>`).join('')}</select>
      <input id="filterEmployee" placeholder="${t('filter.employee')}" oninput="applyOrderFilters()">
      <input id="filterCustomer" placeholder="${t('filter.customer')}" oninput="applyOrderFilters()">
      <select id="filterProduct" onchange="applyOrderFilters()"><option value="">${t('filter.allProducts')}</option>${PRODUCT_TYPES.map(p=>`<option value="${p.id}">${esc(pname(p))}</option>`).join('')}</select>
      <label class="small flexRow" style="gap:5px;"><input type="checkbox" ${ordersShowArchived?'checked':''} onchange="toggleArchivedOrders(this.checked)">${t('common.showArchived')}</label>
    </div>
    <div class="card" style="padding:0;">
      <table id="orderTable"><thead><tr><th>${t('th.orderNo')}</th><th>${t('th.client')}</th><th>${t('th.status')}</th><th>${t('th.orderDate')}</th><th>${t('th.dueDate')}</th><th>${t('th.salesperson')}</th><th>${t('th.items')}</th><th></th></tr></thead>
      <tbody>${orders.map(orderRow).join('')}</tbody></table>
    </div>
  `;
}
function toggleArchivedOrders(checked){ ordersShowArchived = checked; route('orders'); }
function orderRow(o){
  const today = new Date().toISOString().slice(0,10);
  const overdue = o.dueDate && o.dueDate < today && !['Completed','Installed','Cancelled/On Hold'].includes(o.status);
  const productTypes = [...new Set(o.itemCategories)].join(',');
  const archived = !!o.archivedAt;
  return `<tr data-status="${esc(o.status)}" data-employee="${esc((o.salesperson+' '+o.officeEmployee+' '+o.measurementEmployee).toLowerCase())}" data-customer="${esc((o.clientName||'').toLowerCase())}" data-product="${esc(productTypes)}">
    <td>${o.orderNo}${overdue?` <span title="${t('calc.overdueTitle')}" style="color:var(--red)">⚠</span>`:''}${archived?` <span class="badge hold">${t('common.archived')}</span>`:''}</td>
    <td><a href="#" onclick="route('client-detail','${o.clientId}');return false;">${esc(o.clientName)}</a></td>
    <td><span class="badge ${statusBadgeClass(o.status)}">${esc(statusLabel(o.status))}</span></td>
    <td>${fmtDate(o.orderDate)}</td><td>${fmtDate(o.dueDate)}</td><td>${esc(o.salesperson)}</td><td>${o.itemCategories.length}</td>
    <td><a href="#" onclick="route('order-detail','${o.id}');return false;">${t('common.view')}</a></td>
  </tr>`;
}
function applyOrderFilters(){
  const st = document.getElementById('filterStatus').value;
  const emp = document.getElementById('filterEmployee').value.toLowerCase();
  const cust = document.getElementById('filterCustomer').value.toLowerCase();
  const prod = document.getElementById('filterProduct').value;
  document.querySelectorAll('#orderTable tbody tr').forEach(tr=>{
    const okSt = !st || tr.dataset.status===st;
    const okEmp = !emp || tr.dataset.employee.includes(emp);
    const okCust = !cust || tr.dataset.customer.includes(cust);
    const okProd = !prod || tr.dataset.product.includes(prod);
    tr.style.display = (okSt&&okEmp&&okCust&&okProd) ? '' : 'none';
  });
}

/* ================= CALENDAR ================= */
let calendarCursor = new Date();
async function renderCalendar(){
  const orders = await D.listOrders();
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth(); // 0-based
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0,10);

  const events = {}; // 'YYYY-MM-DD' -> [{type:'order'|'due', o}]
  orders.forEach(o=>{
    if(o.orderDate) (events[o.orderDate] = events[o.orderDate]||[]).push({type:'order', o});
    if(o.dueDate) (events[o.dueDate] = events[o.dueDate]||[]).push({type:'due', o});
  });

  const monthLabel = firstOfMonth.toLocaleDateString(state.lang==='zh'?'zh-CN':'en-CA', {year:'numeric', month:'long'});
  const weekdayLabels = state.lang==='zh' ? ['日','一','二','三','四','五','六'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const cellsArr = [];
  for(let i=0;i<startWeekday;i++) cellsArr.push(`<td class="calCell empty"></td>`);
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayEvents = events[dateStr]||[];
    const isToday = dateStr===todayStr;
    const dots = dayEvents.slice(0,6).map(ev=>
      `<div class="calDot ${ev.type}" title="${esc(ev.o.orderNo)} · ${esc(ev.type==='order'?t('calendar.legendOrder'):t('calendar.legendDue'))} · ${esc(statusLabel(ev.o.status))}" onclick="route('order-detail','${ev.o.id}')"></div>`
    ).join('');
    cellsArr.push(`<td class="calCell ${isToday?'today':''}"><div class="calDayNum">${d}</div><div class="calDots">${dots}</div></td>`);
  }
  while(cellsArr.length % 7 !== 0) cellsArr.push(`<td class="calCell empty"></td>`);
  let rowsHtml = '';
  for(let i=0;i<cellsArr.length;i+=7) rowsHtml += `<tr>${cellsArr.slice(i,i+7).join('')}</tr>`;

  const upcoming = orders.filter(o=>o.dueDate && o.dueDate>=todayStr && !['Completed','Installed','Cancelled/On Hold'].includes(o.status))
    .sort((a,b)=> a.dueDate.localeCompare(b.dueDate)).slice(0,15);

  return `
    <div class="pageHead">
      <div><h2>${t('calendar.title')}</h2><div class="desc">${t('calendar.desc')}</div></div>
      <div class="flexRow">
        <button class="btn secondary" onclick="calPrevMonth()">‹</button>
        <div style="min-width:150px;text-align:center;font-weight:700;color:var(--navy);">${esc(monthLabel)}</div>
        <button class="btn secondary" onclick="calNextMonth()">›</button>
        <button class="btn secondary" onclick="calGoToday()">${t('calendar.today')}</button>
      </div>
    </div>
    <div class="card">
      <div class="small" style="margin-bottom:8px;">
        <span class="calLegendDot order"></span> ${t('calendar.legendOrder')}
        &nbsp;&nbsp;<span class="calLegendDot due"></span> ${t('calendar.legendDue')}
      </div>
      <table class="calTable"><thead><tr>${weekdayLabels.map(w=>`<th>${w}</th>`).join('')}</tr></thead>
      <tbody>${rowsHtml}</tbody></table>
    </div>
    <div class="card">
      <h3 style="margin-top:0;font-size:14.5px;color:var(--navy)">${t('calendar.upcoming')}</h3>
      ${upcoming.length===0 ? `<div class="small">${t('calendar.noEvents')}</div>` :
      `<table><thead><tr><th>${t('th.dueDate')}</th><th>${t('th.orderNo')}</th><th>${t('th.client')}</th><th>${t('th.status')}</th></tr></thead><tbody>
        ${upcoming.map(o=>`<tr><td>${fmtDate(o.dueDate)}</td><td><a href="#" onclick="route('order-detail','${o.id}');return false;">${o.orderNo}</a></td><td>${esc(o.clientName)}</td><td><span class="badge ${statusBadgeClass(o.status)}">${esc(statusLabel(o.status))}</span></td></tr>`).join('')}
      </tbody></table>`}
    </div>
  `;
}
function calPrevMonth(){ calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth()-1, 1); route('calendar'); }
function calNextMonth(){ calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth()+1, 1); route('calendar'); }
function calGoToday(){ calendarCursor = new Date(); route('calendar'); }

async function openOrderModal(id, presetClientId){
  const o = id ? currentOrder : null; // edit is only triggered from order-detail, where currentOrder is already loaded & fresh
  const clients = await D.listClients();
  document.getElementById('modalTitle').textContent = o ? `${t('order.edit')} — ${o.orderNo}` : t('order.new');
  document.getElementById('modalBody').innerHTML = `
    <div class="grid cols-2">
      <div class="field"><label>${t('form.client')}</label>
        <select id="f_clientId" ${o?'disabled':''}>${clients.map(c=>`<option value="${c.id}" ${(o?.clientId===c.id||presetClientId===c.id)?'selected':''}>${esc(c.fullName)} (${c.clientNo})</option>`).join('')}</select></div>
      <div class="field"><label>${t('form.status')}</label>
        <select id="f_status">${state.statuses.map(s=>`<option value="${esc(s)}" ${o?.status===s?'selected':''}>${esc(statusLabel(s))}</option>`).join('')}</select></div>
      <div class="field"><label>${t('form.orderDate')}</label><input type="date" id="f_orderDate" value="${o?.orderDate||new Date().toISOString().slice(0,10)}"></div>
      <div class="field"><label>${t('form.dueDate')}</label><input type="date" id="f_dueDate" value="${o?.dueDate||''}"></div>
      <div class="field"><label>${t('form.salesperson')}</label><input id="f_sales" value="${esc(o?.salesperson||state.user.full_name)}"></div>
      <div class="field"><label>${t('form.measEmployee')}</label><input id="f_meas" value="${esc(o?.measurementEmployee||'')}"></div>
      <div class="field"><label>${t('form.officeEmployee')}</label><input id="f_office" value="${esc(o?.officeEmployee||state.user.full_name)}"></div>
      <div class="field"><label>${t('form.deposit')}</label><input id="f_deposit" value="${esc(o?.deposit||'0')}"></div>
    </div>
    <div class="field"><label>${t('form.installAddr')}</label><input id="f_installAddr" value="${esc(o?.installAddress||'')}"></div>
    <div class="grid cols-3">
      <div class="field"><label>${t('form.internalNotes')}</label><textarea id="f_intNotes" rows="2">${esc(o?.internalNotes||'')}</textarea></div>
      <div class="field"><label>${t('form.factoryNotes')}</label><textarea id="f_facNotes" rows="2">${esc(o?.factoryNotes||'')}</textarea></div>
      <div class="field"><label>${t('form.installNotes')}</label><textarea id="f_instNotes" rows="2">${esc(o?.installNotes||'')}</textarea></div>
    </div>
  `;
  document.getElementById('modalFoot').innerHTML = `
    <button class="btn secondary" onclick="closeModal()">${t('common.cancel')}</button>
    <button class="btn" onclick="saveOrder('${o?o.id:''}')">${t('common.save')}</button>`;
  openModal();
}
async function saveOrder(id){
  const clientId = document.getElementById('f_clientId').value;
  if(!clientId){ alert(t('alert.selectClient')); return; }
  const clientOpt = document.getElementById('f_clientId').selectedOptions[0].textContent;
  const data = {
    clientId, status:document.getElementById('f_status').value,
    orderDate:document.getElementById('f_orderDate').value, dueDate:document.getElementById('f_dueDate').value,
    installAddress:document.getElementById('f_installAddr').value.trim(), salesperson:document.getElementById('f_sales').value.trim(),
    measurementEmployee:document.getElementById('f_meas').value.trim(), officeEmployee:document.getElementById('f_office').value.trim(),
    deposit:Number(document.getElementById('f_deposit').value)||0, internalNotes:document.getElementById('f_intNotes').value.trim(),
    factoryNotes:document.getElementById('f_facNotes').value.trim(), installNotes:document.getElementById('f_instNotes').value.trim(),
  };
  try{
    let orderId = id;
    if(id){
      const statusChanged = currentOrder.status !== data.status;
      await D.updateOrder(id, {...data, orderNo:currentOrder.orderNo, projectAddress:currentOrder.projectAddress}, statusChanged);
    } else {
      const client = await D.getClient(clientId);
      data.projectAddress = client.projectAddress;
      orderId = await D.createOrder({...data, clientName: client.fullName});
    }
    closeModal(); route('order-detail', orderId);
  }catch(err){ alert(err.message); }
}
async function archiveOrder(orderId){
  if(!confirm(t('confirm.archiveOrder'))) return;
  try{
    await D.archiveOrder(orderId, currentOrder.orderNo);
    route('order-detail', orderId);
  }catch(err){ alert(err.message); }
}
async function restoreOrder(orderId){
  try{
    await D.restoreOrder(orderId, currentOrder.orderNo);
    route('order-detail', orderId);
  }catch(err){ alert(err.message); }
}

async function renderOrderDetail(id){
  const o = await D.getOrderFull(id);
  if(!o) return renderOrders();
  currentOrder = o;
  const archived = !!o.archivedAt;
  const client = await D.getClient(o.clientId);
  return `
    <div class="pageHead">
      <div><h2>${o.orderNo} <span class="badge ${statusBadgeClass(o.status)}">${esc(statusLabel(o.status))}</span>${archived?` <span class="badge hold">${t('common.archived')}</span>`:''}</h2>
        <div class="desc">${esc(client?.fullName||'')} — ${esc(o.projectAddress)}</div></div>
      <div>
        ${canEdit()&&!archived?`<button class="btn secondary" onclick="openOrderModal('${o.id}')">${t('common.edit')}</button>`:''}
        <button class="btn secondary" onclick="openFactorySheet('${o.id}')">${t('order.factorySheetBtn')}</button>
        <button class="btn secondary" onclick="openInvoiceModal('${o.id}')">${t('invoice.btn')}</button>
        ${canEdit()&&!archived?`<button class="btn secondary" onclick="archiveOrder('${o.id}')">${t('common.archive')}</button>`:''}
        ${canEdit()&&archived?`<button class="btn secondary" onclick="restoreOrder('${o.id}')">${t('common.restore')}</button>`:''}
        <button class="btn secondary" onclick="route('orders')">${t('order.back')}</button>
      </div>
    </div>
    ${archived?`<div class="banner warn">${t('archived.orderBanner')} ${t('archived.by')} ${esc(o.archivedBy)} ${t('archived.on')} ${fmtDateTime(o.archivedAt)}.</div>`:''}
    <div class="grid cols-3">
      <div class="card"><div class="small">${t('order.orderDate')}</div><b>${fmtDate(o.orderDate)}</b></div>
      <div class="card"><div class="small">${t('order.requiredCompletion')}</div><b>${fmtDate(o.dueDate)}</b></div>
      <div class="card"><div class="small">${t('order.assigned')}</div><b>${t('order.sales')}:</b> ${esc(o.salesperson)||t('common.na')}<br><b>${t('order.measure')}:</b> ${esc(o.measurementEmployee)||t('common.na')}<br><b>${t('order.office')}:</b> ${esc(o.officeEmployee)||t('common.na')}</div>
    </div>
    <div class="card">
      <div class="flexRow" style="justify-content:space-between;">
        <h3 style="margin:0;font-size:14.5px;color:var(--navy)">${t('order.windowsProducts')} (${o.items.length})</h3>
        ${canEdit()?`<button class="btn" onclick="openItemModal('${o.id}')">${t('order.addItem')}</button>`:''}
      </div>
      <div id="itemsWrap">${o.items.length? o.items.map((it)=>renderItemCard(o,it)).join('') : `<div class="small" style="margin-top:10px;">${t('order.noItemsYet')}</div>`}</div>
    </div>
    ${renderQuoteSummary(o)}
    <div class="tabs noPrint">
      <button class="active" onclick="switchOrderTab(this,'notes')">${t('order.tabNotes')}</button>
      <button onclick="switchOrderTab(this,'history')">${t('order.tabHistory')}</button>
    </div>
    <div id="tab-notes" class="card">
      <div class="grid cols-3">
        <div><div class="small"><b>${t('order.internalNotesLbl')}</b></div><div>${esc(o.internalNotes)||t('common.na')}</div></div>
        <div><div class="small"><b>${t('order.factoryNotesLbl')}</b></div><div>${esc(o.factoryNotes)||t('common.na')}</div></div>
        <div><div class="small"><b>${t('order.installNotesLbl')}</b></div><div>${esc(o.installNotes)||t('common.na')}</div></div>
      </div>
      <div class="small" style="margin-top:10px;"><b>${t('order.depositLabel')}:</b> $${esc(o.deposit)} — ${esc(o.paymentNotes)||t('order.noPaymentNotes')}</div>
    </div>
    <div id="tab-history" class="card hidden">
      <table><tbody>${o.history.map(h=>`<tr><td style="white-space:nowrap;color:var(--gray-400);font-size:11.5px;">${fmtDateTime(h.at)}</td><td><b>${esc(h.by)}</b> — ${esc(actMsg(h.key,h.params))}</td></tr>`).join('')}</tbody></table>
    </div>
  `;
}
function switchOrderTab(btn, tab){
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-notes').classList.toggle('hidden', tab!=='notes');
  document.getElementById('tab-history').classList.toggle('hidden', tab!=='history');
}

const SLIDING_CATEGORIES = ['hmst82_xo_ox','hmst82_xox','p4000_x','p4000_xx','p4000_ox','p4000_xox','p4000_fixed_over_xox','p4000_stacked_ox'];
const HUNG_CATEGORIES = ['hmst82_lower_hung','hmst82_upper_hung'];
function diagramSVG(category){
  const w=90,h=70;
  let inner = `<rect x="4" y="4" width="${w-8}" height="${h-8}" fill="none" stroke="#1f5fa8" stroke-width="3"/>`;
  if(HUNG_CATEGORIES.includes(category)){
    inner += `<line x1="4" y1="${h/2}" x2="${w-4}" y2="${h/2}" stroke="#96a1ad" stroke-width="1.5"/>`;
  } else if(SLIDING_CATEGORIES.includes(category)){
    inner += `<line x1="${w/2}" y1="4" x2="${w/2}" y2="${h-4}" stroke="#96a1ad" stroke-width="1.5"/><polyline points="18,${h/2} 10,${h/2-6} 10,${h/2+6} 18,${h/2}" fill="none" stroke="#96a1ad"/>`;
  } else if(category==='custom_shape'){
    inner = `<path d="M4,${h-4} L4,20 A${w/2-4},20 0 0 1 ${w-4},20 L${w-4},${h-4} Z" fill="none" stroke="#1f5fa8" stroke-width="3"/>`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
}

function renderItemCard(o, it){
  const cfg = CATEGORY_CONFIG[it.category] || {};
  const q = C.computeQuoteLine(it, state.pricing);
  const priceHtml = q.ok
    ? `<div><b>${t('quote.estimatedPrice')}:</b> $${C.fmtCents(q.unitCents)} ${t('quote.perUnit')} · <b>${t('quote.lineTotal')}: $${C.fmtCents(q.lineTotalCents)}</b></div>`
    : `<div class="small" style="color:var(--red);">${esc(q.error)}</div>`;

  if(cfg.kind === 'door'){
    return `<div class="itemCard">
      <div class="itemHead">
        <h4>${esc(it.itemNo)} — ${esc(productLabel(it.category))} <span class="small">(${t('item.qty')} ${it.quantity})</span></h4>
        <div class="flexRow noPrint">
          ${canEdit()?`<button class="btn ghost" onclick="openItemModal('${o.id}','${it.itemNo}')">${t('item.edit')}</button>`:''}
          ${canEdit()?`<button class="btn ghost" onclick="duplicateItem('${o.id}','${it.itemNo}')">${t('item.duplicate')}</button>`:''}
        </div>
      </div>
      <div class="small">
        <div><b>${t('item.room')}:</b> ${esc(it.room)||t('common.na')}</div>
        ${priceHtml}
      </div>
    </div>`;
  }

  const calc = it.calc;
  const statusBadge = calc.status==='approved' ? `<span class="lockBadge">🔒 ${t('item.approvedBy')} ${esc(calc.approvedBy)} — ${fmtDateTime(calc.approvedAt)}</span>`
    : calc.status==='calculated' ? `<span class="small" style="color:var(--amber);">${t('item.calcAwaiting')}</span>`
    : `<span class="small">${t('item.draftNotCalc')}</span>`;
  const quoteApproved = o.quote && o.quote.status==='approved';
  const quoteStale = quoteApproved && C.isQuoteStaleForItem(o.quote, it, state.pricing);
  const quoteReady = quoteApproved && !quoteStale;
  let calcActionsHtml;
  if(!quoteReady){
    calcActionsHtml = `<span class="small" style="color:var(--amber);">⏳ ${quoteStale ? t('quote.outOfDate') : t('quote.awaitingApproval')}</span>`;
  } else {
    calcActionsHtml = `
      ${calc.status==='draft' ? (canEdit()?`<button class="btn" onclick="runCalculation('${o.id}','${it.itemNo}')">${t('common.calculate')}</button>`:`<span class="small">${t('item.notCalculated')}</span>`) : ''}
      ${calc.status!=='draft' && canEdit() ? `<button class="btn secondary" onclick="runCalculation('${o.id}','${it.itemNo}')">${t('item.recalculate')}</button>` : ''}
      ${calc.status==='calculated' && canEdit() ? `<button class="btn" style="background:var(--green);margin-left:6px;" onclick="approveCalc('${o.id}','${it.itemNo}')">${t('common.approve')}</button>` : ''}
      ${calc.status==='approved' && isAdmin() ? `<button class="btn secondary" style="margin-left:6px;" onclick="reopenCalc('${o.id}','${it.itemNo}')">${t('item.reopenAdmin')}</button>` : ''}
    `;
  }
  const locked = calc.status==='approved';
  const dimBits = [`${it.width}×${it.height}${it.unit}`];
  if(it.dimO!=null) dimBits.push(`O=${it.dimO}${it.unit}`);
  if(it.dimS!=null) dimBits.push(`S=${it.dimS}${it.unit}`);
  if(it.dimT!=null) dimBits.push(`T=${it.dimT}${it.unit}`);
  return `<div class="itemCard">
    <div class="itemHead">
      <h4>${esc(it.itemNo)} — ${esc(productLabel(it.category))} <span class="small">(${dimBits.join(', ')} × ${t('item.qty')} ${it.quantity})</span></h4>
      <div class="flexRow noPrint">
        ${statusBadge}
        ${canEdit() && !locked ?`<button class="btn ghost" onclick="openItemModal('${o.id}','${it.itemNo}')">${t('item.edit')}</button>`:''}
        ${canEdit()?`<button class="btn ghost" onclick="duplicateItem('${o.id}','${it.itemNo}')">${t('item.duplicate')}</button>`:''}
      </div>
    </div>
    <div class="grid cols-3">
      <div class="diagram">${diagramSVG(it.category)}</div>
      <div class="small">
        <div><b>${t('item.opening')}:</b> ${esc(opt(OPENING_STYLES,it.openingStyle))}</div>
        <div><b>${t('item.glass')}:</b> ${esc(optById(GLASS_TYPES,it.glassType))} (${esc(it.glassThickness)})</div>
        <div><b>${t('item.color')}:</b> ${esc(opt(COLORS,it.color))}</div>
        <div><b>${t('item.screen')}:</b> ${esc(opt(SCREEN_TYPES,it.screenType))}</div>
        <div><b>${t('item.hardware')}:</b> ${esc(opt(HARDWARE,it.hardware))}</div>
        <div><b>${t('item.room')}:</b> ${esc(it.room)||t('common.na')}</div>
        <div><b>${t('item.install')}:</b> ${it.installRequested?t('common.yes'):t('common.no')}</div>
        ${priceHtml}
      </div>
      <div>${calcActionsHtml}</div>
    </div>
    ${(calc.results || calc.error) ? renderCalcTable(calc, it.category) : ''}
  </div>`;
}
function renderCalcTable(calc, category){
  if(calc.error) return `<div class="banner error" style="margin-top:10px;">${esc(calc.error)}</div>`;
  let html = '';
  if(calc.warnings && calc.warnings.length) html += calc.warnings.map(w=>`<div class="banner warn" style="margin-top:10px;">⚠ ${esc(w)}</div>`).join('');
  if(calc.scalesWithQty===false) html += `<div class="banner warn" style="margin-top:10px;">⚠ ${t('calc.upperHungQtyWarning')}</div>`;
  html += `<table class="calcTable" style="margin-top:10px;"><thead><tr><th>${t('th.component')}</th><th>${t('th.cutLength')}</th><th>${t('th.qtyPerUnit')}</th><th>${t('th.totalQty')}</th></tr></thead><tbody>
    ${calc.results.map(c=>`<tr><td>${esc(state.lang==='zh'?c.labelZh:c.label)}${c.code&&c.code!=='TBD'?` <span class="tag">${esc(c.code)}</span>`:''}</td><td class="num">${c.length}</td><td class="num">${c.qtyEach}</td><td class="num">${c.totalQty}</td></tr>`).join('')}
    </tbody></table>`;
  if(calc.glass && calc.glass.length){
    html += `<table class="calcTable" style="margin-top:8px;"><thead><tr><th>${t('th.glass')}</th><th>${t('th.widthIn')}</th><th>${t('th.heightIn')}</th><th>${t('th.qtyPerUnit')}</th><th>${t('th.totalQty')}</th></tr></thead><tbody>
    ${calc.glass.map(g=>`<tr><td>${esc(state.lang==='zh'?g.labelZh:g.label)}</td><td class="num">${g.widthDisplay}</td><td class="num">${g.heightDisplay}</td><td class="num">${g.qtyEach}</td><td class="num">${g.totalQty}</td></tr>`).join('')}
    </tbody></table>`;
  }
  if(calc.areaM2!=null) html += `<div class="small" style="margin-top:4px;"><b>${t('calc.areaLabel')}:</b> ${calc.areaM2} m²</div>`;
  const noteKey = category==='custom_shape' ? 'calc.sampleNote' : 'calc.verifiedNote';
  html += `<div class="small" style="margin-top:4px;">${t('calc.formulaVersion')} ${calc.formulaVersion} · ${t('calc.calculatedBy')} ${esc(calc.calculatedBy)} ${t('calc.on')} ${fmtDateTime(calc.calculatedAt)}. ${t(noteKey)}</div>`;
  return html;
}

function findItem(itemNo){ return currentOrder.items.find(i=>i.itemNo===itemNo); }

const DOOR_WIDTH_IN = 71.5, DOOR_HEIGHT_IN = 79.5; // nominal patio door size, per pricing workbook notes
function openItemModal(orderId, itemNo){
  const it = itemNo ? findItem(itemNo) : null;
  document.getElementById('modalTitle').textContent = it ? `${t('item.editItem')} — ${it.itemNo}` : t('item.addWindow');
  document.getElementById('modalBody').innerHTML = `
    <div class="grid cols-3">
      <div class="field"><label>${t('form.category')}</label>
        <select id="i_category" onchange="refreshItemFormFields()">${PRODUCT_TYPES.map(p=>`<option value="${p.id}" ${it?.category===p.id?'selected':''}>${esc(pname(p))}</option>`).join('')}</select></div>
      <div class="field"><label>${t('form.qty')}</label><input type="number" id="i_qty" value="${it?.quantity||1}"></div>
      <div class="field"><label>${t('form.room')}</label><input id="i_room" value="${esc(it?.room||'')}"></div>
    </div>
    <div id="itemTypeBody"></div>
    <div class="field"><label>${t('form.specialOptions')}</label><input id="i_special" value="${esc(it?.specialOptions||'')}"></div>
    <div class="field"><label>${t('form.installReq')}</label><input id="i_installNotes" value="${esc(it?.installNotes||'')}"></div>
    <div class="field"><label>${t('form.notes')}</label><textarea id="i_notes" rows="2">${esc(it?.notes||'')}</textarea></div>
  `;
  document.getElementById('modalFoot').innerHTML = `
    <button class="btn secondary" onclick="closeModal()">${t('common.cancel')}</button>
    <button class="btn" onclick="saveItem('${orderId}','${itemNo||''}')">${t('common.save')}</button>`;
  openModal();
  refreshItemFormFields(it);
}
function itemFormBodyHtml(cat, it){
  const cfg = CATEGORY_CONFIG[cat] || {unit:'mm', dims:[]};
  if(cfg.kind === 'door'){
    return `<div class="banner info">${t('quote.doorNote')}</div>`;
  }
  let dimExtra = '';
  if(cfg.dims.includes('O')){
    dimExtra += cfg.oAuto
      ? `<div class="field"><label>${tf('form.dimOAuto',{unit:cfg.unit})}</label><input id="i_dimO" value="${it?.dimO ?? ''}" disabled></div>`
      : `<div class="field"><label>${tf('form.dimO',{unit:cfg.unit})}</label><input type="number" id="i_dimO" value="${it?.dimO ?? ''}"></div>`;
  }
  if(cfg.dims.includes('S')) dimExtra += `<div class="field"><label>${tf('form.dimS',{unit:cfg.unit})}</label><input type="number" id="i_dimS" value="${it?.dimS ?? ''}"></div>`;
  if(cfg.dims.includes('T')) dimExtra += `<div class="field"><label>${tf('form.dimT',{unit:cfg.unit})}</label><input type="number" id="i_dimT" value="${it?.dimT ?? ''}"></div>`;
  const installFee = C.fmtCents(state.pricing.modifiers.installFeeCents||0);
  return `
    <div class="grid cols-3">
      <div class="field"><label id="lbl_width">${tf('form.width',{unit:cfg.unit})}</label><input type="number" id="i_width" value="${it?.width||''}" oninput="refreshAutoO()"></div>
      <div class="field"><label id="lbl_height">${tf('form.height',{unit:cfg.unit})}</label><input type="number" id="i_height" value="${it?.height||''}"></div>
      ${dimExtra}
      <div class="field"><label>${t('form.openingStyle')}</label><select id="i_opening">${optionsHtml(OPENING_STYLES, it?.openingStyle)}</select></div>
      <div class="field"><label>${t('form.frameType')}</label><select id="i_frame">${optionsHtmlById(FRAME_TYPES, it?.frameSystem, true)}</select></div>
      <div class="field"><label>${t('form.glassType')}</label><select id="i_glass">${optionsHtmlById(GLASS_TYPES, it?.glassType, true)}</select></div>
      <div class="field"><label>${t('form.glassThickness')}</label><input id="i_glassThick" value="${esc(it?.glassThickness||'24mm IGU')}"></div>
      <div class="field"><label>${t('form.colour')}</label><select id="i_color">${optionsHtml(COLORS, it?.color)}</select></div>
      <div class="field"><label>${t('form.screenType')}</label><select id="i_screen">${optionsHtml(SCREEN_TYPES, it?.screenType)}</select></div>
      <div class="field"><label>${t('form.hardware')}</label><select id="i_hardware">${optionsHtml(HARDWARE, it?.hardware)}</select></div>
      <div class="field"><label>${t('form.grid')}</label><input id="i_grid" value="${esc(it?.grid||'None')}"></div>
      <div class="field"><label>${tf('form.installRequested',{fee:installFee})}</label>
        <select id="i_install"><option value="0" ${!it?.installRequested?'selected':''}>${t('common.no')}</option><option value="1" ${it?.installRequested?'selected':''}>${t('common.yes')}</option></select></div>
    </div>
    <div id="diagramPreview" class="diagram" style="width:100px;"></div>
  `;
}
function refreshItemFormFields(it){
  const cat = document.getElementById('i_category').value;
  document.getElementById('itemTypeBody').innerHTML = itemFormBodyHtml(cat, it);
  const cfg = CATEGORY_CONFIG[cat] || {};
  if(cfg.kind !== 'door'){
    refreshAutoO();
    document.getElementById('diagramPreview').innerHTML = diagramSVG(cat);
  }
}
function refreshAutoO(){
  const cat = document.getElementById('i_category').value;
  const cfg = CATEGORY_CONFIG[cat];
  const oInput = document.getElementById('i_dimO');
  if(cfg && cfg.oAuto && oInput){
    const w = Number(document.getElementById('i_width').value)||0;
    oInput.value = w ? (w/2).toFixed(4) : '';
  }
}
async function saveItem(orderId, itemNo){
  const category = document.getElementById('i_category').value;
  const cfg = CATEGORY_CONFIG[category] || {unit:'mm', dims:[]};
  const qty = Number(document.getElementById('i_qty').value)||1;
  const room = document.getElementById('i_room').value.trim();
  const specialOptions = document.getElementById('i_special').value.trim();
  const installNotes = document.getElementById('i_installNotes').value.trim();
  const notes = document.getElementById('i_notes').value.trim();
  let data;
  if(cfg.kind === 'door'){
    data = {
      category, width: DOOR_WIDTH_IN, height: DOOR_HEIGHT_IN, unit: cfg.unit, dimO:null, dimS:null, dimT:null, quantity: qty,
      frameSystem: '', openingStyle: '', glassType: '', glassThickness: '', color: '', screenType: '', hardware: '', grid: '',
      room, specialOptions, installNotes, notes, installRequested: false,
    };
  } else {
    const width = Number(document.getElementById('i_width').value);
    const height = Number(document.getElementById('i_height').value);
    if(!width || !height){ alert(t('alert.widthHeightRequired')); return; }
    const dimO = cfg.dims.includes('O') ? Number(document.getElementById('i_dimO').value)||null : null;
    const dimS = cfg.dims.includes('S') ? Number(document.getElementById('i_dimS').value)||null : null;
    const dimT = cfg.dims.includes('T') ? Number(document.getElementById('i_dimT').value)||null : null;
    if(cfg.dims.includes('O') && !cfg.oAuto && !dimO){ alert(t('alert.widthHeightRequired')); return; }
    if(cfg.dims.includes('S') && !dimS){ alert(t('alert.widthHeightRequired')); return; }
    if(cfg.dims.includes('T') && !dimT){ alert(t('alert.widthHeightRequired')); return; }
    data = {
      category, width, height, unit: cfg.unit, dimO, dimS, dimT, quantity: qty,
      frameSystem: document.getElementById('i_frame').value, openingStyle: document.getElementById('i_opening').value,
      glassType: document.getElementById('i_glass').value, glassThickness: document.getElementById('i_glassThick').value.trim(),
      color: document.getElementById('i_color').value, screenType: document.getElementById('i_screen').value,
      hardware: document.getElementById('i_hardware').value, grid: document.getElementById('i_grid').value.trim(),
      room, specialOptions, installNotes, notes,
      installRequested: document.getElementById('i_install').value === '1',
    };
  }
  try{
    if(itemNo){
      const it = findItem(itemNo);
      const measurementsChanged = it.width!==data.width || it.height!==data.height || it.category!==data.category
        || it.dimO!==data.dimO || it.dimS!==data.dimS || it.dimT!==data.dimT;
      await D.updateItem(orderId, it.id, itemNo, data, measurementsChanged);
    } else {
      await D.createItem(orderId, currentOrder.items.length, data);
    }
    closeModal(); route('order-detail', orderId);
  }catch(err){ alert(err.message); }
}
async function duplicateItem(orderId, itemNo){
  try{
    const src = findItem(itemNo);
    await D.duplicateItem(orderId, src, currentOrder.items.length);
    route('order-detail', orderId);
  }catch(err){ alert(err.message); }
}
async function runCalculation(orderId, itemNo){
  try{
    const it = findItem(itemNo);
    const dims = { W: it.width, H: it.height, O: it.dimO, S: it.dimS, T: it.dimT };
    const res = C.calcComponents(it.category, dims, it.quantity, state.formulas);
    await D.runCalculation(orderId, it, res);
    route('order-detail', orderId);
  }catch(err){ alert(err.message); }
}
async function approveCalc(orderId, itemNo){
  try{
    const it = findItem(itemNo);
    await D.approveCalc(orderId, it);
    route('order-detail', orderId);
  }catch(err){ alert(err.message); }
}
async function reopenCalc(orderId, itemNo){
  if(!confirm(t('confirm.reopen'))) return;
  try{
    const it = findItem(itemNo);
    await D.reopenCalc(orderId, it);
    route('order-detail', orderId);
  }catch(err){ alert(err.message); }
}

/* ================= CLIENT QUOTE ================= */
// Renders 1-2 <tr> rows for a quote/invoice line item: the window/door
// itself (its price already includes any XOX extra-glass surcharge, folded
// in silently), plus a SEPARATE row for installation if it was requested
// (e.g. "6 windows: $X" + "Installation (6 x $150): $900" as distinct rows).
// `s` is a normalized summary: {itemNo,category,width,height,unit,quantity,
// ok,error,productUnitCents,productLineTotalCents,installUnitCents,installLineTotalCents}
function quoteLineRowsHtml(s){
  if(!s.ok) return `<tr><td>${esc(s.itemNo)} — ${esc(productLabel(s.category))}</td><td colspan="2" class="small" style="color:var(--red);">${esc(s.error||t('quote.manualQuoteRequired'))}</td></tr>`;
  // Older quotes sent before installation had its own breakdown won't have
  // productUnitCents/installLineTotalCents in their frozen snapshot — fall
  // back to the combined total so they still render (just without the split).
  const productUnitCents = s.productUnitCents ?? s.unitCents;
  const productLineTotalCents = s.productLineTotalCents ?? s.lineTotalCents;
  let html = `<tr><td>${esc(s.itemNo)} — ${esc(productLabel(s.category))} (${s.width}×${s.height}${s.unit||'mm'} × ${s.quantity})</td><td class="num">$${C.fmtCents(productUnitCents)}</td><td class="num">$${C.fmtCents(productLineTotalCents)}</td></tr>`;
  if(s.installLineTotalCents){
    html += `<tr><td class="small">${t('quote.installFeeLine')} — ${esc(s.itemNo)} (${s.quantity} × $${C.fmtCents(s.installUnitCents)})</td><td class="num">$${C.fmtCents(s.installUnitCents)}</td><td class="num">$${C.fmtCents(s.installLineTotalCents)}</td></tr>`;
  }
  return html;
}
function liveResultToSummary(r){
  return { itemNo:r.item.itemNo, category:r.item.category, width:r.item.width, height:r.item.height, unit:r.item.unit,
    quantity:r.item.quantity, ok:r.q.ok, error:r.q.error,
    productUnitCents:r.q.productUnitCents, productLineTotalCents:r.q.productLineTotalCents,
    installUnitCents:r.q.installUnitCents, installLineTotalCents:r.q.installLineTotalCents };
}
function renderQuoteSummary(o){
  const manualItems = o.quote.manualItems || [];
  if(o.items.length===0 && manualItems.length===0 && !canEdit()){
    return `<div class="card"><h3 style="margin-top:0;font-size:14.5px;color:var(--navy);">${t('quote.title')}</h3><div class="small">${t('quote.addItemsFirst')}</div></div>`;
  }
  const live = C.computeOrderQuoteLive(o.items, state.pricing);
  const manualItemsTotalCents = C.computeManualItemsTotal(manualItems);
  const q = o.quote;
  const subtotalCents = live.subtotalCents + manualItemsTotalCents;
  const discountCents = Math.round(subtotalCents * (q.discountPct||0)/100);
  const taxableCents = subtotalCents - discountCents;
  const taxCents = Math.round(taxableCents * (q.taxPct||0)/100);
  const calculatedTotalCents = taxableCents + taxCents;
  const hasOverride = q.manualTotalCents!=null;
  const totalCents = hasOverride ? q.manualTotalCents : calculatedTotalCents;
  const locked = q.status==='approved';

  const rows = live.results.map(r => quoteLineRowsHtml(liveResultToSummary(r))).join('');
  const manualRows = manualItems.map(mi => `<tr><td>${esc(mi.description)}${mi.quantity!==1?` × ${mi.quantity}`:''}</td>
    <td class="num">$${C.fmtCents(mi.unitPriceCents)}</td><td class="num">$${C.fmtCents(mi.unitPriceCents*mi.quantity)}
    ${canEdit()&&!locked?` <button class="btn ghost" style="padding:2px 6px;" onclick="removeManualItem('${o.id}','${mi.id}')">✕</button>`:''}</td></tr>`).join('');
  const isStaleApproved = locked && o.items.some(it=>C.isQuoteStaleForItem(q,it,state.pricing));

  let statusHtml;
  if(q.status==='draft') statusHtml = `<span class="badge new">${t('quote.statusDraft')}</span>`;
  else if(q.status==='sent') statusHtml = `<span class="badge progress">${t('quote.statusSent')}</span> <span class="small">${t('quote.sentOn')} ${fmtDateTime(q.sentAt)} ${t('quote.by')} ${esc(q.sentBy)}</span>`;
  else statusHtml = `<span class="badge done">🔒 ${t('quote.statusApproved')}</span> <span class="small">${t('quote.approvedOn')} ${fmtDateTime(q.approvedAt)} ${t('quote.by')} ${esc(q.approvedBy)}</span>`;

  const nothingToQuote = (live.results.length===0 || live.results.every(r=>!r.q.ok)) && manualItems.length===0;
  let actionsHtml = '';
  if(canEdit()){
    if(isStaleApproved){
      actionsHtml = `<div class="banner warn">⚠ ${t('quote.outOfDate')}</div><button class="btn" onclick="sendQuoteToClient('${o.id}')">${t('quote.sendToClient')}</button>`;
    } else if(q.status==='draft'){
      actionsHtml = `<button class="btn" onclick="sendQuoteToClient('${o.id}')" ${nothingToQuote?'disabled':''}>${t('quote.sendToClient')}</button>`;
    } else if(q.status==='sent'){
      actionsHtml = `<button class="btn secondary" onclick="sendQuoteToClient('${o.id}')">${t('quote.sendToClient')} (${t('common.edit')})</button>
        <button class="btn" style="background:var(--green);margin-left:6px;" onclick="openApprovalModal('${o.id}')">${t('quote.recordApproval')}</button>`;
    } else if(q.status==='approved' && isAdmin()){
      actionsHtml = `<button class="btn secondary" onclick="reopenQuote('${o.id}')">${t('quote.reopenQuote')}</button>`;
    }
  }

  return `<div class="card">
    <div class="flexRow" style="justify-content:space-between;">
      <h3 style="margin:0;font-size:14.5px;color:var(--navy);">${t('quote.title')}</h3>
      <div>${statusHtml}</div>
    </div>
    ${live.excludedCount>0 ? `<div class="banner warn" style="margin-top:10px;">${live.excludedCount} ${t('quote.excludedItems')}</div>` : ''}
    ${o.items.length>0 ? `<table style="margin-top:10px;"><thead><tr><th>${t('order.windowsProducts')}</th><th>${t('quote.unitPrice')}</th><th>${t('quote.lineTotal')}</th></tr></thead>
    <tbody>${rows}</tbody></table>` : ''}
    <div class="flexRow" style="justify-content:space-between;margin-top:14px;">
      <h4 style="margin:0;font-size:13px;color:var(--navy);">${t('quote.manualItemsTitle')}</h4>
      ${canEdit()&&!locked?`<button class="btn ghost" onclick="openManualItemModal('${o.id}')">${t('quote.addManualItem')}</button>`:''}
    </div>
    ${manualItems.length>0
      ? `<table style="margin-top:6px;"><thead><tr><th>${t('quote.manualItemDesc')}</th><th>${t('quote.unitPrice')}</th><th>${t('quote.lineTotal')}</th></tr></thead><tbody>${manualRows}</tbody></table>`
      : `<div class="small" style="margin-top:4px;">${t('quote.noManualItems')}</div>`}
    <div class="grid cols-3" style="margin-top:12px;">
      <div class="small"><b>${t('quote.subtotal')}:</b> $${C.fmtCents(subtotalCents)}</div>
      <div class="field" style="margin:0;"><label>${t('quote.discountPctLabel')}</label>
        <input type="number" min="0" max="100" step="0.5" value="${q.discountPct||0}" ${locked?'disabled':''} onchange="updateQuoteRates('${o.id}','discountPct',this.value)"></div>
      <div class="field" style="margin:0;"><label>${t('quote.taxPctLabel')}</label>
        <input type="number" min="0" max="100" step="0.1" value="${q.taxPct||0}" ${locked?'disabled':''} onchange="updateQuoteRates('${o.id}','taxPct',this.value)"></div>
    </div>
    <div class="field" style="margin-top:4px;"><label>${t('quote.manualOverrideLabel')}</label>
      <input type="number" min="0" step="0.01" placeholder="${C.fmtCents(calculatedTotalCents)}" value="${hasOverride?C.fmtCents(q.manualTotalCents):''}" ${locked?'disabled':''} onchange="updateManualTotal('${o.id}',this.value)"></div>
    ${hasOverride ? `<div class="small" style="margin-top:4px;color:var(--amber);">⚠ ${tf('quote.manualOverrideNote',{calc:C.fmtCents(calculatedTotalCents)})}</div>` : ''}
    <div style="text-align:right;margin-top:8px;font-size:16px;color:var(--navy);font-weight:800;">${t('quote.grandTotal')}: $${C.fmtCents(totalCents)}</div>
    <div class="small" style="margin-top:4px;">${t('quote.sampleNote')}</div>
    <div class="noPrint" style="margin-top:12px;">${actionsHtml}</div>
  </div>`;
}
async function updateQuoteRates(orderId, field, value){
  try{
    await D.updateQuoteRates(orderId, field, Number(value)||0);
    route('order-detail', orderId);
  }catch(err){ alert(err.message); }
}
async function updateManualTotal(orderId, value){
  try{
    const trimmed = String(value).trim();
    await D.updateManualTotal(orderId, trimmed==='' ? null : Number(trimmed));
    route('order-detail', orderId);
  }catch(err){ alert(err.message); }
}
function openManualItemModal(orderId){
  document.getElementById('modalTitle').textContent = t('quote.addManualItem');
  document.getElementById('modalBody').innerHTML = `
    <div class="field"><label>${t('quote.manualItemDesc')}</label><input id="mi_desc" value=""></div>
    <div class="grid cols-2">
      <div class="field"><label>${t('quote.manualItemPrice')}</label><input type="number" min="0" step="0.01" id="mi_price" value=""></div>
      <div class="field"><label>${t('quote.manualItemQty')}</label><input type="number" min="1" step="1" id="mi_qty" value="1"></div>
    </div>
  `;
  document.getElementById('modalFoot').innerHTML = `
    <button class="btn secondary" onclick="closeModal()">${t('common.cancel')}</button>
    <button class="btn" onclick="saveManualItem('${orderId}')">${t('common.save')}</button>`;
  openModal();
}
async function saveManualItem(orderId){
  const description = document.getElementById('mi_desc').value.trim();
  const unitPrice = Number(document.getElementById('mi_price').value);
  const quantity = Number(document.getElementById('mi_qty').value)||1;
  if(!description || !(unitPrice>0)){ alert(t('alert.widthHeightRequired')); return; }
  try{
    const items = [...(currentOrder.quote.manualItems||[]), {
      id: crypto.randomUUID(), description, unitPriceCents: Math.round(unitPrice*100), quantity,
    }];
    await D.saveManualItems(orderId, items);
    closeModal(); route('order-detail', orderId);
  }catch(err){ alert(err.message); }
}
async function removeManualItem(orderId, itemId){
  if(!confirm(t('confirm.removeManualItem'))) return;
  try{
    const items = (currentOrder.quote.manualItems||[]).filter(i=>i.id!==itemId);
    await D.saveManualItems(orderId, items);
    route('order-detail', orderId);
  }catch(err){ alert(err.message); }
}
async function sendQuoteToClient(orderId){
  try{
    const o = currentOrder;
    const live = C.computeOrderQuoteLive(o.items, state.pricing);
    const manualItems = o.quote.manualItems || [];
    const manualItemsTotalCents = C.computeManualItemsTotal(manualItems);
    const q = o.quote;
    const subtotalCents = live.subtotalCents + manualItemsTotalCents;
    const discountCents = Math.round(subtotalCents * (q.discountPct||0)/100);
    const taxableCents = subtotalCents - discountCents;
    const taxCents = Math.round(taxableCents * (q.taxPct||0)/100);
    const calculatedTotalCents = taxableCents + taxCents;
    const hasOverride = q.manualTotalCents!=null;
    const totalCents = hasOverride ? q.manualTotalCents : calculatedTotalCents;
    const snapshot = {
      subtotalCents, discountPct:q.discountPct||0, taxPct:q.taxPct||0,
      discountCents, taxCents, calculatedTotalCents, manualTotalCents: hasOverride?q.manualTotalCents:null, totalCents,
      generatedAt: new Date().toISOString(),
      items: live.results.map(r=>({itemNo:r.item.itemNo, category:r.item.category, width:r.item.width, height:r.item.height, unit:r.item.unit,
        quantity:r.item.quantity, ok:r.q.ok, error:r.q.error, unitCents:r.q.ok?r.q.unitCents:null, lineTotalCents:r.q.ok?r.q.lineTotalCents:null,
        productUnitCents:r.q.ok?r.q.productUnitCents:null, productLineTotalCents:r.q.ok?r.q.productLineTotalCents:null,
        installUnitCents:r.q.ok?r.q.installUnitCents:null, installLineTotalCents:r.q.ok?r.q.installLineTotalCents:null})),
      manualItems,
    };
    const nextStatus = ['New Inquiry','Measurement Required','Measurements Completed','Quote In Progress'].includes(o.status) ? 'Customer Approval Required' : null;
    const manualTotalDollars = hasOverride ? q.manualTotalCents/100 : null;
    await D.sendQuoteToClient(orderId, snapshot, q.discountPct||0, q.taxPct||0, manualTotalDollars, nextStatus);
    route('order-detail', orderId);
  }catch(err){ alert(err.message); }
}
function openApprovalModal(orderId){
  document.getElementById('modalTitle').textContent = t('quote.recordApproval');
  document.getElementById('modalBody').innerHTML = `
    <div class="field"><label>${t('quote.approvedByLabel')}</label><input id="qa_by" value=""></div>
    <div class="field"><label>${t('quote.approvalNoteLabel')}</label><textarea id="qa_note" rows="2"></textarea></div>
  `;
  document.getElementById('modalFoot').innerHTML = `
    <button class="btn secondary" onclick="closeModal()">${t('common.cancel')}</button>
    <button class="btn" style="background:var(--green);" onclick="recordApproval('${orderId}')">${t('quote.confirmApproval')}</button>`;
  openModal();
}
async function recordApproval(orderId){
  const by = document.getElementById('qa_by').value.trim();
  const note = document.getElementById('qa_note').value.trim();
  if(!by){ alert(t('alert.fullNameRequired')); return; }
  try{
    const o = currentOrder;
    const nextStatus = ['Customer Approval Required','Quote Sent','Quote In Progress'].includes(o.status) ? 'Confirmed Order' : null;
    await D.recordApproval(orderId, by, note, nextStatus);
    closeModal(); route('order-detail', orderId);
  }catch(err){ alert(err.message); }
}
async function reopenQuote(orderId){
  if(!confirm(t('quote.reopenConfirm'))) return;
  try{
    await D.reopenQuote(orderId);
    route('order-detail', orderId);
  }catch(err){ alert(err.message); }
}

/* ================= FACTORY SHEET ================= */
function openFactorySheet(orderId){
  document.getElementById('modalTitle').textContent = t('factory.title');
  document.getElementById('modalBody').innerHTML = `
    <div class="field"><label>${t('factory.docLang')}</label>
      <select id="fs_lang"><option value="en">${t('factory.langEn')}</option><option value="zh">${t('factory.langZh')}</option><option value="both" selected>${t('factory.langBoth')}</option></select></div>
    <div class="banner info">${t('factory.info')}</div>
  `;
  document.getElementById('modalFoot').innerHTML = `
    <button class="btn secondary" onclick="closeModal()">${t('common.cancel')}</button>
    <button class="btn" onclick="generateFactorySheet('${orderId}')">${t('factory.generatePreview')}</button>`;
  openModal();
}
async function generateFactorySheet(orderId){
  const o = currentOrder;
  const client = await D.getClient(o.clientId);
  const lang = document.getElementById('fs_lang').value;
  let version;
  try{
    version = await D.generateFactorySheet(orderId, o.factorySheetVersion, lang);
  }catch(err){ alert(err.message); return; }
  o.factorySheetVersion = version;

  const approved = o.items.filter(i=>i.calc.status==='approved');
  const notApproved = o.items.filter(i=>i.calc.status!=='approved');

  const showEn = lang==='en'||lang==='both', showZh = lang==='zh'||lang==='both';
  const label = (en,zh) => showEn&&showZh? `${en} / ${zh}` : showZh ? zh : en;

  let itemsHtml = approved.map(it=>{
    const dimBits = [`${it.width}×${it.height}${it.unit}`];
    if(it.dimO!=null) dimBits.push(`O=${it.dimO}${it.unit}`);
    if(it.dimS!=null) dimBits.push(`S=${it.dimS}${it.unit}`);
    if(it.dimT!=null) dimBits.push(`T=${it.dimT}${it.unit}`);
    const qtyWarning = it.calc.scalesWithQty===false ? `<div class="small" style="color:var(--red);">⚠ ${label('Quantities below do NOT scale with the order quantity — verify piece counts manually.','以下数量不会随订单数量翻倍 — 请人工核实件数。')}</div>` : '';
    return `
    <h4 style="margin:16px 0 4px;color:var(--navy);">${esc(it.itemNo)} — ${esc(showEn?PRODUCT_TYPES.find(p=>p.id===it.category)?.en||it.category:'')}${showEn&&showZh?' / ':''}${esc(showZh?productLabel(it.category):'')}</h4>
    <div class="small">${label('Original size','原始尺寸')}: ${dimBits.join(', ')} &nbsp; | &nbsp; ${label('Qty','数量')}: ${it.quantity} &nbsp; | &nbsp; ${label('Colour','颜色')}: ${esc(label(opt2en(COLORS,it.color),opt2zh(COLORS,it.color)))}</div>
    <div class="small">${label('Screen','纱窗')}: ${esc(label(opt2en(SCREEN_TYPES,it.screenType),opt2zh(SCREEN_TYPES,it.screenType)))} &nbsp; | &nbsp; ${label('Hardware','五金')}: ${esc(label(opt2en(HARDWARE,it.hardware),opt2zh(HARDWARE,it.hardware)))}</div>
    ${it.specialOptions?`<div class="small"><b>${label('Special instructions','特殊说明')}:</b> ${esc(it.specialOptions)}</div>`:''}
    ${qtyWarning}
    <table><thead><tr><th>${label('Code','代码')}</th><th>${label('Component','部件')}</th><th>${label('Cut Length (mm)','下料长度(mm)')}</th><th>${label('Qty/unit','每件数量')}</th><th>${label('Total Qty','总数量')}</th></tr></thead>
    <tbody>${(it.calc.results||[]).map(c=>`<tr><td>${c.code&&c.code!=='TBD'?esc(c.code):'—'}</td><td>${label(c.label,c.labelZh)}</td><td>${c.length}</td><td>${c.qtyEach}</td><td>${c.totalQty}</td></tr>`).join('')}</tbody></table>
    ${it.calc.glass && it.calc.glass.length ? `
    <table style="margin-top:6px;"><thead><tr><th>${label('Glass','玻璃')}</th><th>${label('Width','宽度')}</th><th>${label('Height','高度')}</th><th>${label('Qty/unit','每件数量')}</th><th>${label('Total Qty','总数量')}</th></tr></thead>
    <tbody>${it.calc.glass.map(g=>`<tr><td>${label(g.label,g.labelZh)}</td><td>${g.widthDisplay}"</td><td>${g.heightDisplay}"</td><td>${g.qtyEach}</td><td>${g.totalQty}</td></tr>`).join('')}</tbody></table>` : ''}
    ${it.calc.areaM2!=null ? `<div class="small">${label('Area','面积')}: ${it.calc.areaM2} m²</div>` : ''}
    <div class="small">${label('Approved by','批准人')}: ${esc(it.calc.approvedBy)} · ${fmtDateTime(it.calc.approvedAt)} · ${label('Formula version','公式版本')} ${it.calc.formulaVersion}</div>
  `;}).join('') || `<div class="small">${label('No approved items on this order yet.','此订单尚无已批准项目。')}</div>`;

  const sheet = `
    <div class="fsheet">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div><h2 style="margin:0;">家福门窗 Home Fortune Windows &amp; Doors</h2>
        <div class="small">120–8812 Laurel Street, Vancouver, BC V6P 3V8 · 604 349 9180 · homefortunecanada@gmail.com</div></div>
        <div style="text-align:right;">
          <div style="font-weight:800;font-size:16px;color:var(--navy);">${label('FACTORY PRODUCTION SHEET','工厂生产单')}</div>
          <div class="small">${label('Order','订单')}: ${o.orderNo} · v${version}</div>
          <div class="small">${label('Generated','生成时间')}: ${fmtDateTime(new Date().toISOString())}</div>
        </div>
      </div>
      <div class="metaGrid">
        <div><b>${label('Client','客户')}:</b> ${esc(client.fullName)} (${client.clientNo})</div>
        <div><b>${label('Required completion','要求完工日期')}:</b> ${fmtDate(o.dueDate)}</div>
        <div><b>${label('Installation address','安装地址')}:</b> ${esc(o.installAddress)}</div>
        <div><b>${label('Salesperson','销售员')}:</b> ${esc(o.salesperson)}</div>
        <div><b>${label('Factory notes','工厂备注')}:</b> ${esc(o.factoryNotes)||'—'}</div>
        <div><b>${label('Status','状态')}:</b> ${esc(statusLabel(o.status))}</div>
      </div>
      ${notApproved.length? `<div class="banner warn">${notApproved.length} ${label('item(s) excluded — not yet approved','个项目已排除 — 尚未批准')}: ${notApproved.map(i=>esc(i.itemNo)).join(', ')}</div>`:''}
      ${itemsHtml}
      <div class="footNote">${label('Document version','文档版本')} ${version}. ${label('Cut formulas verified against Home Fortune\'s own cut-list workbooks. Custom Shape items still require individual engineering review.','下料公式已与家福自己的下料表核对无误。异形窗项目仍需单独工程审核。')}</div>
    </div>`;
  document.getElementById('printSheet').innerHTML = sheet;

  document.getElementById('modalBody').innerHTML = `<div style="max-height:60vh;overflow:auto;border:1px solid var(--gray-200);border-radius:8px;padding:10px;">${sheet}</div>`;
  document.getElementById('modalFoot').innerHTML = `
    <button class="btn secondary" onclick="closeModal()">${t('common.close')}</button>
    <button class="btn secondary" onclick="markSentToFactory('${orderId}')">${t('factory.markSent')}</button>
    <button class="btn" onclick="printDocument()">${t('common.print')}</button>`;
}
function printDocument(){
  document.getElementById('printSheet').classList.add('showing');
  window.print();
  setTimeout(()=> document.getElementById('printSheet').classList.remove('showing'), 300);
}
async function markSentToFactory(orderId){
  try{
    await D.markSentToFactory(orderId);
    closeModal(); route('order-detail', orderId);
  }catch(err){ alert(err.message); }
}

/* ================= INVOICE ================= */
function openInvoiceModal(orderId){
  document.getElementById('modalTitle').textContent = t('invoice.title');
  document.getElementById('modalBody').innerHTML = `
    <div class="field"><label>${t('invoice.docLang')}</label>
      <select id="inv_lang"><option value="en">${t('factory.langEn')}</option><option value="zh">${t('factory.langZh')}</option><option value="both" selected>${t('factory.langBoth')}</option></select></div>
    <div class="banner info">${t('invoice.info')}</div>
  `;
  document.getElementById('modalFoot').innerHTML = `
    <button class="btn secondary" onclick="closeModal()">${t('common.cancel')}</button>
    <button class="btn" onclick="generateInvoice('${orderId}')">${t('invoice.generatePreview')}</button>`;
  openModal();
}
async function generateInvoice(orderId){
  const o = currentOrder;
  const client = await D.getClient(o.clientId);
  const lang = document.getElementById('inv_lang').value;
  let version;
  try{
    version = await D.generateInvoice(orderId, o.invoiceVersion, lang);
  }catch(err){ alert(err.message); return; }
  o.invoiceVersion = version;

  const showEn = lang==='en'||lang==='both', showZh = lang==='zh'||lang==='both';
  const label = (en,zh) => showEn&&showZh? `${en} / ${zh}` : showZh ? zh : en;

  const q = o.quote;
  // Only an approved quote is actually locked from further edits — a "sent"
  // quote can still be freely revised (manual items, discount, etc.), so
  // the invoice must reflect live totals until it's truly approved,
  // otherwise edits made after sending would silently not show up here.
  const useSnapshot = q.status==='approved' && q.snapshot;
  let subtotalCents, discountPct, taxPct, discountCents, taxCents, totalCents, lineRows, excludedCount;
  if(useSnapshot){
    const snap = q.snapshot;
    subtotalCents = snap.subtotalCents; discountPct = snap.discountPct; taxPct = snap.taxPct;
    discountCents = snap.discountCents; taxCents = snap.taxCents; totalCents = snap.totalCents;
    excludedCount = snap.items.filter(s=>!s.ok).length;
    lineRows = snap.items.map(s => quoteLineRowsHtml(s));
    (snap.manualItems||[]).forEach(mi => lineRows.push(
      `<tr><td>${esc(mi.description)}${mi.quantity!==1?` × ${mi.quantity}`:''}</td><td class="num">$${C.fmtCents(mi.unitPriceCents)}</td><td class="num">$${C.fmtCents(mi.unitPriceCents*mi.quantity)}</td></tr>`));
  } else {
    const live = C.computeOrderQuoteLive(o.items, state.pricing);
    const manualItems = o.quote.manualItems || [];
    const manualItemsTotalCents = C.computeManualItemsTotal(manualItems);
    subtotalCents = live.subtotalCents + manualItemsTotalCents; discountPct = q.discountPct||0; taxPct = q.taxPct||0;
    discountCents = Math.round(subtotalCents*discountPct/100);
    const taxableCents = subtotalCents-discountCents;
    taxCents = Math.round(taxableCents*taxPct/100);
    totalCents = q.manualTotalCents!=null ? q.manualTotalCents : taxableCents+taxCents;
    excludedCount = live.excludedCount;
    lineRows = live.results.map(r => quoteLineRowsHtml(liveResultToSummary(r)));
    manualItems.forEach(mi => lineRows.push(
      `<tr><td>${esc(mi.description)}${mi.quantity!==1?` × ${mi.quantity}`:''}</td><td class="num">$${C.fmtCents(mi.unitPriceCents)}</td><td class="num">$${C.fmtCents(mi.unitPriceCents*mi.quantity)}</td></tr>`));
  }
  const depositCents = Math.round((Number(o.deposit)||0)*100);
  const balanceDueCents = totalCents - depositCents;
  const provisional = q.status!=='approved';

  const sheet = `
    <div class="fsheet">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div><h2 style="margin:0;">家福门窗 Home Fortune Windows &amp; Doors</h2>
        <div class="small">120–8812 Laurel Street, Vancouver, BC V6P 3V8 · 604 349 9180 · homefortunecanada@gmail.com</div></div>
        <div style="text-align:right;">
          <div style="font-weight:800;font-size:16px;color:var(--navy);">${label('INVOICE','发票')}</div>
          <div class="small">${label('Invoice #','发票号')}: ${o.orderNo}-INV${version} &nbsp; ${label('Date','日期')}: ${fmtDate(new Date().toISOString())}</div>
        </div>
      </div>
      ${provisional ? `<div class="banner warn">⚠ ${label('PROVISIONAL — this quote has not been approved by the client yet. Totals reflect the current order and may still change.','临时版本 — 该报价尚未经客户批准，总额反映当前订单内容，可能仍会变动。')}</div>` : ''}
      <div class="metaGrid">
        <div><b>${label('Bill To','账单地址')}:</b> ${esc(client.fullName)}${client.company?' — '+esc(client.company):''}<br>${esc(client.billingAddress)}<br>${esc(client.phone1)}${client.email?' · '+esc(client.email):''}</div>
        <div><b>${label('Project Address','项目地址')}:</b> ${esc(o.projectAddress)}</div>
        <div><b>${label('Order #','订单号')}:</b> ${o.orderNo}</div>
        <div><b>${label('Order Date','订单日期')}:</b> ${fmtDate(o.orderDate)}</div>
        <div><b>${label('Salesperson','销售员')}:</b> ${esc(o.salesperson)||'—'}</div>
        <div><b>${label('Status','状态')}:</b> ${esc(statusLabel(o.status))}</div>
      </div>
      ${excludedCount>0 ? `<div class="banner warn">${excludedCount} ${label('item(s) need a manual quote and are not included in this invoice.','个项目需要手动报价，未包含在此发票中。')}</div>` : ''}
      <table><thead><tr><th>${label('Description','说明')}</th><th>${label('Unit Price','单价')}</th><th>${label('Line Total','小计')}</th></tr></thead>
      <tbody>${lineRows.join('')}</tbody></table>
      <table style="margin-top:8px;">
        <tbody>
          <tr><td style="text-align:right;border:none;"><b>${label('Subtotal','小计总额')}</b></td><td class="num" style="width:120px;border:none;">$${C.fmtCents(subtotalCents)}</td></tr>
          ${discountCents ? `<tr><td style="text-align:right;border:none;">${label('Discount','折扣')} (${discountPct}%)</td><td class="num" style="border:none;">−$${C.fmtCents(discountCents)}</td></tr>` : ''}
          <tr><td style="text-align:right;border:none;">${label('Tax','税额')} (${taxPct}%)</td><td class="num" style="border:none;">$${C.fmtCents(taxCents)}</td></tr>
          <tr><td style="text-align:right;border:none;font-size:15px;color:var(--navy);"><b>${label('Grand Total','总计')}</b></td><td class="num" style="border:none;font-size:15px;color:var(--navy);"><b>$${C.fmtCents(totalCents)}</b></td></tr>
          <tr><td style="text-align:right;border:none;">${label('Deposit Received','已收订金')}</td><td class="num" style="border:none;">−$${C.fmtCents(depositCents)}</td></tr>
          <tr><td style="text-align:right;border:none;font-weight:800;">${label('Balance Due','尾款金额')}</td><td class="num" style="border:none;font-weight:800;">$${C.fmtCents(balanceDueCents)}</td></tr>
        </tbody>
      </table>
      ${o.paymentNotes?`<div class="small" style="margin-top:8px;"><b>${label('Payment Notes','付款备注')}:</b> ${esc(o.paymentNotes)}</div>`:''}
      <div class="footNote">${label('Invoice version','发票版本')} ${version}. ${label('Pricing per Home Fortune\'s approved price list.','所示价格依据家福门窗已核准的价目表。')}</div>
    </div>`;
  document.getElementById('printSheet').innerHTML = sheet;

  document.getElementById('modalBody').innerHTML = `<div style="max-height:60vh;overflow:auto;border:1px solid var(--gray-200);border-radius:8px;padding:10px;">${sheet}</div>`;
  document.getElementById('modalFoot').innerHTML = `
    <button class="btn secondary" onclick="closeModal()">${t('common.close')}</button>
    <button class="btn" onclick="printDocument()">${t('common.print')}</button>`;
}

/* ================= FORMULA ADMIN ================= */
async function renderFormulas(){
  if(!isAdmin()) return `<div class="banner error">${t('formulas.restricted')}</div>`;
  return `
    <div class="pageHead"><div><h2 data-i18n="formulas.title">${t('formulas.title')}</h2><div class="desc" data-i18n="formulas.desc">${t('formulas.desc')}</div></div></div>
    <div class="tabs noPrint">
      <button class="${formulaAdminTab==='materials'?'active':''}" onclick="switchFormulaAdminTab('materials')">${t('formulas.tabMaterials')}</button>
      <button class="${formulaAdminTab==='pricing'?'active':''}" onclick="switchFormulaAdminTab('pricing')">${t('formulas.tabPricing')}</button>
    </div>
    ${formulaAdminTab==='materials' ? renderMaterialFormulasTab() : renderPricingTab()}
  `;
}
function switchFormulaAdminTab(tab){ formulaAdminTab = tab; route('formulas'); }
function renderMaterialFormulasTab(){
  const rows = PRODUCT_TYPES.map(p=>{
    const f = state.formulas[p.id];
    const unit = (CATEGORY_CONFIG[p.id]||{unit:'mm'}).unit;
    const range = (min,max) => (min==null && max==null) ? t('common.na') : `${min ?? '—'}–${max ?? '—'} ${unit}`;
    return `<tr>
      <td>${esc(pname(p))}<div class="small">${esc(state.lang==='zh'?p.en:p.zh)}</div></td>
      <td>${f.active? `<span class="badge done">${t('formulas.active')}</span>` : `<span class="badge hold">${t('formulas.inactive')}</span>`}</td>
      <td>v${f.version}</td>
      <td>${range(f.minW,f.maxW)}</td><td>${range(f.minH,f.maxH)}</td>
      <td class="small">${esc(f.changedBy)}<br>${fmtDateTime(f.changedAt)}</td>
      <td><button class="btn ghost" onclick="openFormulaModal('${p.id}')">${t('common.edit')}</button></td>
    </tr>`;
  }).join('');
  return `
    <div class="banner warn">${t('formulas.warnBanner')}</div>
    <div class="card" style="padding:0;">
      <table><thead><tr><th>${t('th.product')}</th><th>${t('th.status')}</th><th>${t('th.versionCol')}</th><th>${t('th.widthRange')}</th><th>${t('th.heightRange')}</th><th>${t('th.lastChanged')}</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>
  `;
}
function renderPricingTab(){
  const windowCats = PRODUCT_TYPES.filter(p => (CATEGORY_CONFIG[p.id]||{}).kind !== 'door');
  const minRows = windowCats.map(p=>{
    const pr = state.pricing.products[p.id];
    return `<tr>
      <td>${esc(pname(p))}<div class="small">${esc(state.lang==='zh'?p.en:p.zh)}</div></td>
      <td>${pr.active? `<span class="badge done">${t('formulas.active')}</span>` : `<span class="badge hold">${t('formulas.inactive')}</span>`}</td>
      <td>v${pr.version}</td>
      <td>$${pr.basePrice}</td>
      <td>${pr.extraGlassSurcharge?`$${pr.extraGlassSurcharge}`:'—'}</td>
      <td class="small">${esc(pr.changedBy)}<br>${fmtDateTime(pr.changedAt)}</td>
      <td><button class="btn ghost" onclick="openProductPricingModal('${p.id}')">${t('common.edit')}</button></td>
    </tr>`;
  }).join('');
  const frameRows = Object.values(state.pricing.frameTypes).map(f => `<tr>
    <td>${esc(state.lang==='zh'?f.labelZh:f.labelEn)}<div class="small">${esc(f.id)}</div></td>
    <td>${f.active?`<span class="badge done">${t('formulas.active')}</span>`:`<span class="badge hold">${t('formulas.inactive')}</span>`}</td>
    <td>v${f.version}</td><td>$${f.ratePerSqFt}/sqft</td>
    <td class="small">${esc(f.changedBy)}<br>${fmtDateTime(f.changedAt)}</td>
    <td><button class="btn ghost" onclick="openFrameTypeModal('${f.id}')">${t('common.edit')}</button></td>
  </tr>`).join('');
  const glassRows = Object.values(state.pricing.glassTypes).map(g => `<tr>
    <td>${esc(state.lang==='zh'?g.labelZh:g.labelEn)}<div class="small">${esc(g.id)}</div></td>
    <td>${g.active?`<span class="badge done">${t('formulas.active')}</span>`:`<span class="badge hold">${t('formulas.inactive')}</span>`}</td>
    <td>v${g.version}</td><td>$${g.ratePerSqFt}/sqft</td>
    <td class="small">${esc(g.changedBy)}<br>${fmtDateTime(g.changedAt)}</td>
    <td><button class="btn ghost" onclick="openGlassTypeModal('${g.id}')">${t('common.edit')}</button></td>
  </tr>`).join('');
  const doorRows = Object.values(state.pricing.patioDoors).map(d => `<tr>
    <td>${esc(state.lang==='zh'?d.labelZh:d.labelEn)}<div class="small">${esc(d.id)}</div></td>
    <td>${d.active?`<span class="badge done">${t('formulas.active')}</span>`:`<span class="badge hold">${t('formulas.inactive')}</span>`}</td>
    <td>v${d.version}</td><td>$${C.fmtCents(d.flatPriceCents)}</td>
    <td class="small">${esc(d.changedBy)}<br>${fmtDateTime(d.changedAt)}</td>
    <td><button class="btn ghost" onclick="openPatioDoorModal('${d.id}')">${t('common.edit')}</button></td>
  </tr>`).join('');
  const m = state.pricing.modifiers;
  return `
    <div class="banner info">${t('pricing.realNote')}</div>
    <div class="card">
      <h3 style="margin-top:0;font-size:14px;color:var(--navy);">${t('pricing.frameTypesTitle')}</h3>
      <table><thead><tr><th>${t('th.product')}</th><th>${t('th.status')}</th><th>${t('th.versionCol')}</th><th>${t('th.ratePerSqFt')}</th><th>${t('th.lastChanged')}</th><th></th></tr></thead>
      <tbody>${frameRows}</tbody></table>
    </div>
    <div class="card">
      <h3 style="margin-top:0;font-size:14px;color:var(--navy);">${t('pricing.glassTypesTitle')}</h3>
      <table><thead><tr><th>${t('th.product')}</th><th>${t('th.status')}</th><th>${t('th.versionCol')}</th><th>${t('th.ratePerSqFt')}</th><th>${t('th.lastChanged')}</th><th></th></tr></thead>
      <tbody>${glassRows}</tbody></table>
    </div>
    <div class="card">
      <h3 style="margin-top:0;font-size:14px;color:var(--navy);">${t('pricing.minimumsTitle')}</h3>
      <div class="small" style="margin-bottom:6px;">${t('pricing.minimumsDesc')}</div>
      <table><thead><tr><th>${t('th.product')}</th><th>${t('th.status')}</th><th>${t('th.versionCol')}</th><th>${t('th.minimumCharge')}</th><th>${t('th.extraGlassSurcharge')}</th><th>${t('th.lastChanged')}</th><th></th></tr></thead>
      <tbody>${minRows}</tbody></table>
    </div>
    <div class="card">
      <h3 style="margin-top:0;font-size:14px;color:var(--navy);">${t('pricing.doorsTitle')}</h3>
      <table><thead><tr><th>${t('th.product')}</th><th>${t('th.status')}</th><th>${t('th.versionCol')}</th><th>${t('th.flatPrice')}</th><th>${t('th.lastChanged')}</th><th></th></tr></thead>
      <tbody>${doorRows}</tbody></table>
    </div>
    <div class="card">
      <div class="flexRow" style="justify-content:space-between;">
        <h3 style="margin:0;font-size:14px;color:var(--navy);">${t('pricing.installFeeTitle')} (v${m.version})</h3>
        <button class="btn secondary" onclick="openInstallFeeModal()">${t('common.edit')}</button>
      </div>
      <div class="small" style="margin-top:6px;">$${C.fmtCents(m.installFeeCents)} ${t('pricing.perWindow')}</div>
      <div class="small" style="margin-top:6px;">${t('pricing.lastChanged')}: ${esc(m.changedBy)} · ${fmtDateTime(m.changedAt)}</div>
    </div>
  `;
}
function openProductPricingModal(typeId){
  const pr = state.pricing.products[typeId];
  const p = PRODUCT_TYPES.find(x=>x.id===typeId);
  const cfg = CATEGORY_CONFIG[typeId] || {unit:'mm'};
  const defaultW = cfg.unit==='in' ? 36 : 900, defaultH = cfg.unit==='in' ? 48 : 1200;
  document.getElementById('modalTitle').textContent = `${t('pricing.editMinimum')} — ${pname(p)}`;
  document.getElementById('modalBody').innerHTML = `
    <div class="grid cols-2">
      <div class="field"><label>${t('formulas.active')}</label><select id="pp_active"><option value="1" ${pr.active?'selected':''}>${t('formulas.active')}</option><option value="0" ${!pr.active?'selected':''}>${t('formulas.inactive')}</option></select></div>
      <div class="field"><label>${t('formulas.version')}</label><input value="v${pr.version} ${t('formulas.autoIncrement')}" disabled></div>
      <div class="field"><label>${t('pricing.minimumChargeLbl')}</label><input type="number" step="0.01" id="pp_min" value="${pr.basePrice}"></div>
      <div class="field"><label>${t('pricing.extraGlassSurchargeLbl')}</label><input type="number" step="0.01" id="pp_extraGlass" value="${pr.extraGlassSurcharge||0}"></div>
    </div>
    <fieldset><legend>${t('pricing.testMinimumTitle')}</legend>
      <div class="grid cols-3">
        <div class="field"><label>${tf('form.width',{unit:cfg.unit})}</label><input type="number" id="pp_testW" value="${defaultW}"></div>
        <div class="field"><label>${tf('form.height',{unit:cfg.unit})}</label><input type="number" id="pp_testH" value="${defaultH}"></div>
        <div class="field"><label>${t('pricing.testCombinedRate')}</label><input type="number" step="0.01" id="pp_testRate" value="30"></div>
      </div>
      <button class="btn secondary" type="button" onclick="testProductPricing('${typeId}')">${t('formulas.runTest')}</button>
      <div id="pp_testResult" style="margin-top:10px;" class="small"></div>
    </fieldset>
    <div class="small" id="pp_history">${t('formulas.versionHistory')}: …</div>
  `;
  document.getElementById('modalFoot').innerHTML = `
    <button class="btn secondary" onclick="closeModal()">${t('common.cancel')}</button>
    <button class="btn" onclick="saveProductPricing('${typeId}')">${t('formulas.savePublish')}</button>`;
  openModal();
  D.loadPricingProductHistory(typeId).then(hist=>{
    document.getElementById('pp_history').textContent = `${t('formulas.versionHistory')}: ` +
      (hist.length? hist.map(h=>`v${h.version} ${t('formulas.by')} ${h.by} ${t('formulas.on')} ${fmtDateTime(h.at)}`).join(' · ') : t('formulas.none'));
  });
}
function testProductPricing(typeId){
  const cfg = CATEGORY_CONFIG[typeId] || {unit:'mm'};
  const minimum = Number(document.getElementById('pp_min').value)||0;
  const rate = Number(document.getElementById('pp_testRate').value)||0;
  const w = Number(document.getElementById('pp_testW').value)||0;
  const h = Number(document.getElementById('pp_testH').value)||0;
  const areaSqFt = cfg.unit==='in' ? (w*h)/144 : (w/304.8)*(h/304.8);
  const sizePrice = rate*areaSqFt;
  const price = Math.max(sizePrice, minimum);
  document.getElementById('pp_testResult').innerHTML = `${t('pricing.testResultLabel')}: <b>$${price.toFixed(2)}</b> (${areaSqFt.toFixed(2)} sq ft; size price $${sizePrice.toFixed(2)}${sizePrice<minimum?' — minimum applied':''})`;
}
async function saveProductPricing(typeId){
  const draft = {
    active: document.getElementById('pp_active').value==='1',
    basePrice: Number(document.getElementById('pp_min').value)||0,
    pricePerSqFt: 0,
    extraGlassSurcharge: Number(document.getElementById('pp_extraGlass').value)||0,
  };
  try{
    await D.saveProductPricing(typeId, draft);
    closeModal(); route('formulas');
  }catch(err){ alert(err.message); }
}
function openFrameTypeModal(id){
  const f = state.pricing.frameTypes[id];
  document.getElementById('modalTitle').textContent = `${t('pricing.editFrameType')} — ${state.lang==='zh'?f.labelZh:f.labelEn}`;
  document.getElementById('modalBody').innerHTML = `
    <div class="grid cols-2">
      <div class="field"><label>${t('formulas.active')}</label><select id="ft_active"><option value="1" ${f.active?'selected':''}>${t('formulas.active')}</option><option value="0" ${!f.active?'selected':''}>${t('formulas.inactive')}</option></select></div>
      <div class="field"><label>${t('formulas.version')}</label><input value="v${f.version} ${t('formulas.autoIncrement')}" disabled></div>
      <div class="field"><label>${t('pricing.ratePerSqFtLbl')}</label><input type="number" step="0.01" id="ft_rate" value="${f.ratePerSqFt}"></div>
    </div>
  `;
  document.getElementById('modalFoot').innerHTML = `
    <button class="btn secondary" onclick="closeModal()">${t('common.cancel')}</button>
    <button class="btn" onclick="saveFrameTypeModal('${id}')">${t('formulas.savePublish')}</button>`;
  openModal();
}
async function saveFrameTypeModal(id){
  const draft = { active: document.getElementById('ft_active').value==='1', ratePerSqFt: Number(document.getElementById('ft_rate').value)||0 };
  try{ await D.saveFrameType(id, draft); closeModal(); route('formulas'); }catch(err){ alert(err.message); }
}
function openGlassTypeModal(id){
  const g = state.pricing.glassTypes[id];
  document.getElementById('modalTitle').textContent = `${t('pricing.editGlassType')} — ${state.lang==='zh'?g.labelZh:g.labelEn}`;
  document.getElementById('modalBody').innerHTML = `
    <div class="grid cols-2">
      <div class="field"><label>${t('formulas.active')}</label><select id="gt_active"><option value="1" ${g.active?'selected':''}>${t('formulas.active')}</option><option value="0" ${!g.active?'selected':''}>${t('formulas.inactive')}</option></select></div>
      <div class="field"><label>${t('formulas.version')}</label><input value="v${g.version} ${t('formulas.autoIncrement')}" disabled></div>
      <div class="field"><label>${t('pricing.ratePerSqFtLbl')}</label><input type="number" step="0.01" id="gt_rate" value="${g.ratePerSqFt}"></div>
    </div>
  `;
  document.getElementById('modalFoot').innerHTML = `
    <button class="btn secondary" onclick="closeModal()">${t('common.cancel')}</button>
    <button class="btn" onclick="saveGlassTypeModal('${id}')">${t('formulas.savePublish')}</button>`;
  openModal();
}
async function saveGlassTypeModal(id){
  const draft = { active: document.getElementById('gt_active').value==='1', ratePerSqFt: Number(document.getElementById('gt_rate').value)||0 };
  try{ await D.saveGlassType(id, draft); closeModal(); route('formulas'); }catch(err){ alert(err.message); }
}
function openPatioDoorModal(id){
  const d = state.pricing.patioDoors[id];
  document.getElementById('modalTitle').textContent = `${t('pricing.editDoor')} — ${state.lang==='zh'?d.labelZh:d.labelEn}`;
  document.getElementById('modalBody').innerHTML = `
    <div class="grid cols-2">
      <div class="field"><label>${t('formulas.active')}</label><select id="dr_active"><option value="1" ${d.active?'selected':''}>${t('formulas.active')}</option><option value="0" ${!d.active?'selected':''}>${t('formulas.inactive')}</option></select></div>
      <div class="field"><label>${t('formulas.version')}</label><input value="v${d.version} ${t('formulas.autoIncrement')}" disabled></div>
      <div class="field"><label>${t('pricing.flatPriceLbl')}</label><input type="number" step="0.01" id="dr_price" value="${C.fmtCents(d.flatPriceCents)}"></div>
    </div>
  `;
  document.getElementById('modalFoot').innerHTML = `
    <button class="btn secondary" onclick="closeModal()">${t('common.cancel')}</button>
    <button class="btn" onclick="savePatioDoorModal('${id}')">${t('formulas.savePublish')}</button>`;
  openModal();
}
async function savePatioDoorModal(id){
  const draft = { active: document.getElementById('dr_active').value==='1', flatPrice: Number(document.getElementById('dr_price').value)||0 };
  try{ await D.savePatioDoorPrice(id, draft); closeModal(); route('formulas'); }catch(err){ alert(err.message); }
}
function openInstallFeeModal(){
  const m = state.pricing.modifiers;
  document.getElementById('modalTitle').textContent = t('pricing.installFeeTitle');
  document.getElementById('modalBody').innerHTML = `<div class="field"><label>${t('pricing.installFeeLbl')}</label><input type="number" step="0.01" id="if_fee" value="${C.fmtCents(m.installFeeCents)}"></div>`;
  document.getElementById('modalFoot').innerHTML = `
    <button class="btn secondary" onclick="closeModal()">${t('common.cancel')}</button>
    <button class="btn" onclick="saveInstallFeeModal()">${t('formulas.savePublish')}</button>`;
  openModal();
}
async function saveInstallFeeModal(){
  const dollars = Number(document.getElementById('if_fee').value)||0;
  try{
    await D.saveInstallFee(dollars);
    closeModal(); route('formulas');
  }catch(err){ alert(err.message); }
}
function openFormulaModal(typeId){
  const f = state.formulas[typeId];
  const p = PRODUCT_TYPES.find(x=>x.id===typeId);
  const cfg = CATEGORY_CONFIG[typeId] || {unit:'mm', dims:[]};
  document.getElementById('modalTitle').textContent = `${t('formulas.edit')} — ${pname(p)}`;
  document.getElementById('modalBody').innerHTML = `
    <div class="banner info">${t('formulas.codeDefinedNote')}</div>
    <div class="grid cols-2">
      <div class="field"><label>${t('formulas.active')}</label><select id="ff_active"><option value="1" ${f.active?'selected':''}>${t('formulas.active')}</option><option value="0" ${!f.active?'selected':''}>${t('formulas.inactive')}</option></select></div>
      <div class="field"><label>${t('formulas.version')}</label><input value="v${f.version} ${t('formulas.autoIncrement')}" disabled></div>
      <div class="field"><label>${tf('formulas.minWidth',{unit:cfg.unit})}</label><input type="number" id="ff_minW" value="${f.minW ?? ''}"></div>
      <div class="field"><label>${tf('formulas.maxWidth',{unit:cfg.unit})}</label><input type="number" id="ff_maxW" value="${f.maxW ?? ''}"></div>
      <div class="field"><label>${tf('formulas.minHeight',{unit:cfg.unit})}</label><input type="number" id="ff_minH" value="${f.minH ?? ''}"></div>
      <div class="field"><label>${tf('formulas.maxHeight',{unit:cfg.unit})}</label><input type="number" id="ff_maxH" value="${f.maxH ?? ''}"></div>
    </div>
    <fieldset><legend>${t('formulas.testFormula')}</legend>
      <div class="grid cols-3">
        <div class="field"><label>${tf('form.width',{unit:cfg.unit})}</label><input type="number" id="ff_testW" value=""></div>
        <div class="field"><label>${tf('form.height',{unit:cfg.unit})}</label><input type="number" id="ff_testH" value=""></div>
        <div class="field"><label>${t('formulas.testQty')}</label><input type="number" id="ff_testQ" value="1"></div>
        ${cfg.dims.includes('O')?`<div class="field"><label>${tf('form.dimO',{unit:cfg.unit})}</label><input type="number" id="ff_testO" value=""></div>`:''}
        ${cfg.dims.includes('S')?`<div class="field"><label>${tf('form.dimS',{unit:cfg.unit})}</label><input type="number" id="ff_testS" value=""></div>`:''}
        ${cfg.dims.includes('T')?`<div class="field"><label>${tf('form.dimT',{unit:cfg.unit})}</label><input type="number" id="ff_testT" value=""></div>`:''}
      </div>
      <button class="btn secondary" type="button" onclick="testFormula('${typeId}')">${t('formulas.runTest')}</button>
      <div id="ff_testResult" style="margin-top:10px;"></div>
    </fieldset>
    <div class="small" id="ff_history">${t('formulas.versionHistory')}: …</div>
  `;
  document.getElementById('modalFoot').innerHTML = `
    <button class="btn secondary" onclick="closeModal()">${t('common.cancel')}</button>
    <button class="btn" onclick="saveFormula('${typeId}')">${t('formulas.savePublish')}</button>`;
  openModal();
  D.loadFormulaHistory(typeId).then(hist=>{
    document.getElementById('ff_history').textContent = `${t('formulas.versionHistory')}: ` +
      (hist.length? hist.map(h=>`v${h.version} ${t('formulas.by')} ${h.by} ${t('formulas.on')} ${fmtDateTime(h.at)}`).join(' · ') : t('formulas.none'));
  });
}
function collectFormulaDraft(typeId){
  return {
    active: document.getElementById('ff_active').value==='1',
    minW: document.getElementById('ff_minW').value===''?null:Number(document.getElementById('ff_minW').value),
    maxW: document.getElementById('ff_maxW').value===''?null:Number(document.getElementById('ff_maxW').value),
    minH: document.getElementById('ff_minH').value===''?null:Number(document.getElementById('ff_minH').value),
    maxH: document.getElementById('ff_maxH').value===''?null:Number(document.getElementById('ff_maxH').value),
  };
}
function testFormula(typeId){
  const draft = collectFormulaDraft(typeId);
  const tempFormulas = JSON.parse(JSON.stringify(state.formulas));
  tempFormulas[typeId] = {...tempFormulas[typeId], ...draft, version: tempFormulas[typeId].version};
  const dims = {
    W: Number(document.getElementById('ff_testW').value),
    H: Number(document.getElementById('ff_testH').value),
    O: document.getElementById('ff_testO') ? Number(document.getElementById('ff_testO').value) : undefined,
    S: document.getElementById('ff_testS') ? Number(document.getElementById('ff_testS').value) : undefined,
    T: document.getElementById('ff_testT') ? Number(document.getElementById('ff_testT').value) : undefined,
  };
  const q = Number(document.getElementById('ff_testQ').value)||1;
  const res = C.calcComponents(typeId, dims, q, tempFormulas);
  document.getElementById('ff_testResult').innerHTML = res.ok ?
    (res.warnings.length? res.warnings.map(w=>`<div class="banner warn">${esc(w)}</div>`).join(''):'') +
    `<table class="calcTable"><thead><tr><th>${t('th.component')}</th><th>${t('th.cutLength')}</th><th>${t('th.qtyPerUnit')}</th><th>${t('th.totalQty')}</th></tr></thead><tbody>${res.components.map(c=>`<tr><td>${esc(state.lang==='zh'?c.labelZh:c.label)}</td><td class="num">${c.length}</td><td class="num">${c.qtyEach}</td><td class="num">${c.totalQty}</td></tr>`).join('')}</tbody></table>`
      + (res.glass ? `<table class="calcTable" style="margin-top:8px;"><thead><tr><th>${t('th.glass')}</th><th>${t('th.widthIn')}</th><th>${t('th.heightIn')}</th></tr></thead><tbody>${res.glass.map(g=>`<tr><td>${esc(state.lang==='zh'?g.labelZh:g.label)}</td><td class="num">${g.widthDisplay}</td><td class="num">${g.heightDisplay}</td></tr>`).join('')}</tbody></table>` : '')
      + (res.areaM2!=null ? `<div class="small" style="margin-top:6px;">Area: ${res.areaM2} m²</div>` : '')
    : `<div class="banner error">${esc(res.error)}</div>`;
}
async function saveFormula(typeId){
  const draft = collectFormulaDraft(typeId);
  try{
    await D.saveFormula(typeId, draft);
    closeModal(); route('formulas');
  }catch(err){ alert(err.message); }
}

/* ================= SEARCH ================= */
let searchSeq = 0;
async function onGlobalSearch(q){
  const box = document.getElementById('searchResults');
  q = q.trim();
  if(!q){ box.style.display='none'; box.innerHTML=''; return; }
  const seq = ++searchSeq;
  let results;
  try{ results = await D.globalSearch(q); }catch(e){ return; }
  if(seq !== searchSeq) return; // a newer keystroke's search already landed
  const { clients, orders } = results;
  if(clients.length===0 && orders.length===0){ box.style.display='block'; box.innerHTML = `<div class="r">${t('search.noMatches')}</div>`; return; }
  box.innerHTML = [
    ...clients.map(c=>`<div class="r" onclick="closeSearch();route('client-detail','${c.id}')"><b>${esc(c.fullName)}</b> <span class="meta">${c.clientNo} · ${esc(c.phone1)}</span></div>`),
    ...orders.map(o=>`<div class="r" onclick="closeSearch();route('order-detail','${o.id}')"><b>${o.orderNo}</b> <span class="meta">${esc(o.clientName)}</span></div>`)
  ].join('');
  box.style.display='block';
}
function closeSearch(){ document.getElementById('searchResults').style.display='none'; document.getElementById('globalSearch').value=''; }
document.addEventListener('click', (e)=>{ if(!e.target.closest('.search')) { const b=document.getElementById('searchResults'); if(b) b.style.display='none'; } });

/* ================= MODAL HELPERS ================= */
function openModal(){ document.getElementById('modalOverlay').classList.add('active'); }
function closeModal(){ document.getElementById('modalOverlay').classList.remove('active'); }

/* ================= EXPOSE HANDLERS FOR INLINE onclick=... ================= */
Object.assign(window, {
  route, logout, setLang: onSetLang,
  openClientModal, saveClient, checkDup, filterClientTable, toggleArchivedClients, archiveClient, restoreClient,
  openOrderModal, saveOrder, applyOrderFilters, calPrevMonth, calNextMonth, calGoToday,
  toggleArchivedOrders, archiveOrder, restoreOrder,
  openItemModal, saveItem, refreshItemFormFields, refreshAutoO, duplicateItem, runCalculation, approveCalc, reopenCalc,
  switchOrderTab,
  updateQuoteRates, updateManualTotal, openManualItemModal, saveManualItem, removeManualItem,
  sendQuoteToClient, openApprovalModal, recordApproval, reopenQuote,
  openFactorySheet, generateFactorySheet, printDocument, markSentToFactory,
  openInvoiceModal, generateInvoice,
  switchFormulaAdminTab, openFormulaModal, testFormula, saveFormula,
  openProductPricingModal, testProductPricing, saveProductPricing,
  openFrameTypeModal, saveFrameTypeModal, openGlassTypeModal, saveGlassTypeModal,
  openPatioDoorModal, savePatioDoorModal, openInstallFeeModal, saveInstallFeeModal,
  onGlobalSearch, closeSearch, openModal, closeModal,
});

/* ================= INIT ================= */
document.getElementById('loginForm').addEventListener('submit', (e)=>{ e.preventDefault(); doLogin(); });
boot();
