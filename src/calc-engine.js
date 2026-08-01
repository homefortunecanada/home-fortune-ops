// Material cut-size calculation engine.
//
// Formulas below are Home Fortune's REAL, verified production formulas —
// cross-checked line-by-line against the worked examples already baked into
// the company's own cut-list workbooks (家福工单32132.NEW.xls and
// 4000美式窗下料尺寸-new.xls; see db/migrations/003 and CATEGORY_CONFIG in
// i18n.js). Every formula below reproduces those workbooks' own sample
// results exactly — see the test vectors in this file's companion tests.
//
// Known, confirmed-real gaps (not calculated here, by design — see README):
//   - Steel reinforcement piece lengths (all HMST82 configs): the source
//     workbooks have a quantity for these but never finished the length
//     formula. Left out of the component list entirely.
//   - HMST82 Upper-Sash Hung: quantities are static in the source workbook
//     and do NOT scale with the order quantity — reproduced faithfully as-is
//     (see scalesWithQty below), with a warning surfaced in the UI.
//   - 4000 Single Casement (X), 4000 OX, and 4000 Stacked O/X: the source
//     workbooks never filled in a quantity for any row, so each defaults to
//     1 piece per window (scaled by the order quantity as normal).
//
// The quote/pricing engine (dollar amounts) is unrelated to this file and
// still uses SAMPLE placeholder rates — see Formula Admin.
import { t, tf, CATEGORY_CONFIG } from './i18n.js';

const IN_TO_MM = 25.4;

function round2(n){ return Math.round(n*100)/100; }
function round1(n){ return Math.round(n*10)/10; }

// Nearest-sixteenth-of-an-inch display, matching Home Fortune's own glass
// labeling convention exactly (not simplified — e.g. 13.375 -> "13 6/16").
function toSixteenths(inches){
  let whole = Math.floor(inches);
  let sixteenths = Math.round((inches - whole) * 16);
  if(sixteenths === 16){ whole += 1; sixteenths = 0; }
  return sixteenths === 0 ? `${whole}` : `${whole} ${sixteenths}/16`;
}

function comp(code, label, labelZh, lengthMm, qtyEach){
  return { code, label, labelZh, length: round2(lengthMm), qtyEach };
}
function glassIn(label, labelZh, wIn, hIn, qtyEach){
  return { label, labelZh, widthIn: round2(wIn), heightIn: round2(hIn),
    widthDisplay: toSixteenths(wIn), heightDisplay: toSixteenths(hIn), qtyEach };
}

function applyQty(list, qty, scalesWithQty){
  return list.map(c => ({ ...c, totalQty: scalesWithQty ? c.qtyEach * qty : c.qtyEach }));
}

function checkPositive(vals){
  return Object.values(vals).every(v => v != null && Number(v) > 0);
}

/* ================= HMST82 (inches in, mm cuts, inches-as-sixteenths glass) ================= */

function calcHmst82Fixed({W,H}, qty){
  const FW = W*IN_TO_MM+6, FH = H*IN_TO_MM+6;
  const components = [
    comp('HMST82-02','Frame width','窗框宽', FW, 2),
    comp('HMST82-02','Frame height','窗框高', FH, 2),
    comp('HMST130-10','Glazing bead 1','玻璃压条1', FW-48, 2),
    comp('HMST130-10','Glazing bead 2','玻璃压条2', FH-48, 2),
  ];
  const glass = [ glassIn('Fixed glass','固定玻璃', W-1.9375, H-1.9375, 1) ];
  return { components, glass };
}

function calcHmst82XoOx({W,H}, qty){
  const O = W/2;
  const FW = W*IN_TO_MM+6, FH = H*IN_TO_MM+6, P = O*IN_TO_MM+3, SW = P-25, SH = FH-60.5;
  const components = [
    comp('HMST82-02','Frame width','窗框宽', FW, 2),
    comp('HMST82-02','Frame height','窗框高', FH, 2),
    comp('HMST82-03','Sash width','窗扇宽', SW, 2),
    comp('HMST82-03','Sash height','窗扇高', SH, 1),
    comp('HMST82-05','Handle side','扇把手边', SH, 1),
    comp('HMST82-06','Mullion','中挺', FH-39, 1),
    comp('HMST82-07','Sliding track','滑轨', FW-45, 1),
    comp('HMST130-10','Glazing bead 1','玻璃压条1', P-37, 2),
    comp('HMST130-10','Glazing bead 2','玻璃压条2', FH-45.5, 2),
    comp('HMST130-10','Glazing bead 3','玻璃压条3', SW-49, 2),
    comp('HMST130-10','Glazing bead 4','玻璃压条4', SH-42, 2),
    comp('TBD','Screen-frame width','纱窗框宽', SW-51, 2),
    comp('TBD','Screen-frame height','纱窗框高', SH-26, 2),
  ];
  const glass = [
    glassIn('Fixed glass','固定玻璃', O-1.625, H-1.875, 1),
    glassIn('Sash glass','扇玻璃', O-3.0325, H-4.3, 1),
  ];
  return { components, glass, O };
}

function calcHmst82Xox({W,H,O}, qty){
  const FW = W*IN_TO_MM+6, FH = H*IN_TO_MM+6, P = O*IN_TO_MM+3, SW = P-25, SH = FH-60.5;
  const components = [
    comp('HMST82-02','Frame width','窗框宽', FW, 2),
    comp('HMST82-02','Frame height','窗框高', FH, 2),
    comp('HMST82-03','Sash width','窗扇宽', SW, 4),
    comp('HMST82-03','Sash height','窗扇高', SH, 2),
    comp('HMST82-05','Handle side','扇把手边', SH, 2),
    comp('HMST82-06','Mullion','中挺', FH-38, 2),
    comp('HMST82-07','Sliding track','滑轨', FW-45, 1),
    comp('HMST130-10','Glazing bead 1','玻璃压条1', (W-2*O)*IN_TO_MM-29.8, 2),
    comp('HMST130-10','Glazing bead 2','玻璃压条2', FH-48.5, 2),
    comp('HMST130-10','Glazing bead 3','玻璃压条3', SW-47, 4),
    comp('HMST130-10','Glazing bead 4','玻璃压条4', SH-42, 4),
    comp('TBD','Screen-frame width','纱窗框宽', SW-50, 4),
    comp('TBD','Screen-frame height','纱窗框高', SH-28, 4),
  ];
  const glass = [
    glassIn('Centre fixed glass','中间固定玻璃', W-2*O-1.5, H-1.875, 1),
    glassIn('Side sash glass','两侧扇玻璃', O-3.0325, H-4.3, 2),
  ];
  return { components, glass };
}

function calcHmst82LowerHung({W,H,O}, qty){
  const FW = W*IN_TO_MM+6, FH = H*IN_TO_MM+6, P = O*IN_TO_MM+3;
  const components = [
    comp('HMST82-02','Frame width','窗框宽', FW, 2),
    comp('HMST82-02','Frame height','窗框高', FH, 2),
    comp('HMST82-04','Sash height','窗扇高', P-26, 2),
    comp('HMST82-04','Sash width','窗扇宽', FW-61, 1),
    comp('HMST82-05','Handle side','扇把手边', FW-61, 1),
    comp('HMST82-06','Mullion','中挺', FW-42, 1),
    comp('HMST130-10','Glazing bead 1','玻璃压条1', FW-44, 2),
    comp('HMST130-10','Glazing bead 2','玻璃压条2', FH-P-39, 2),
    comp('HMST130-10','Glazing bead 3','玻璃压条3', FW-112, 2),
    comp('HMST130-10','Glazing bead 4','玻璃压条4', P-74, 2),
    comp('TBD','Screen-frame width','纱窗框宽', FW-88, 2),
    comp('TBD','Screen-frame height','纱窗框高', P-76, 2),
  ];
  const glass = [
    glassIn('Fixed glass','固定玻璃', W-1.8125, H-O-1.6875, 1),
    glassIn('Sash glass','扇玻璃', W-4.25, O-3.125, 1),
  ];
  return { components, glass };
}

function calcHmst82UpperHung({W,H,O}, qty){
  const FW = W*IN_TO_MM+6, FH = H*IN_TO_MM+6, P = O*IN_TO_MM+3;
  // The source workbook's "sash width"/"sash height" row labels contradict
  // their own formulas; labeled here to match the (internally consistent)
  // Lower-Sash Hung sheet's convention — same underlying values either way.
  const components = [
    comp('HMST82-02','Frame width','窗框宽', FW, 2),
    comp('HMST82-02','Frame height','窗框高', FH, 2),
    comp('HMST82-04','Sash height','窗扇高', P-26, 2),
    comp('HMST82-03','Sash width','窗扇宽', FW-62, 1),
    comp('HMST82-05','Handle side','扇把手边', FW-62, 1),
    comp('HMST82-06','Mullion','中挺', FW-37, 1),
    comp('HMST130-10','Glazing bead 1','玻璃压条1', FW-44, 2),
    comp('HMST130-10','Glazing bead 2','玻璃压条2', FH-P-40, 2),
    comp('HMST130-10','Glazing bead 3','玻璃压条3', FW-109, 2),
    comp('HMST130-10','Glazing bead 4','玻璃压条4', P-49.5, 2),
    comp('TBD','Screen-frame width','纱窗框宽', FW-87, 2),
    comp('TBD','Screen-frame height','纱窗框高', P-76, 2),
  ];
  const glass = [
    glassIn('Fixed glass','固定玻璃', W-1.7455, H-O-1.7525, 1),
    glassIn('Sash glass','扇玻璃', W-4.245, O-3.0625, 1),
  ];
  return { components, glass };
}

/* ================= 4000 series (mm throughout, area in m², no glass-size formula on file) ================= */

function calcP4000X({W,H}, qty){
  return { components: [
    comp('4007','Frame width','框宽', W-52, 1),
    comp('4007','Frame height','框高', H-52, 1),
    comp('4002','Sash width','扇宽', W-98, 1),
    comp('4002','Sash height','扇高', H-98, 1),
    comp('3009','Glazing bead width','压条宽', W-207, 1),
    comp('3009','Glazing bead height','压条高', H-207, 1),
  ]};
}
function calcP4000Xx({W,H}, qty){
  return { components: [
    comp('4007','Frame width','框宽', W-52, 2),
    comp('4007','Frame height','框高', H-52, 2),
    comp('4002','Sash width','扇宽', W/2-80, 4),
    comp('4002','Sash height','扇高', H-98, 4),
    comp('4003','Mullion','中挺', H-55, 1),
    comp('3009','Glazing bead width','压条宽', W/2-189, 4),
    comp('3009','Glazing bead height','压条高', H-207, 4),
  ]};
}
function calcP4000Ox({W,H}, qty){
  return { components: [
    comp('4007','Frame width','框宽', W-52, 1),
    comp('4007','Frame height','框高', H-52, 1),
    comp('4002','Sash width','扇宽', W/2-80, 1),
    comp('4002','Sash height','扇高', H-98, 1),
    comp('4003','Mullion','中挺', H-55, 1),
    comp('3009','Sash bead width','扇压条宽', W/2-189, 1),
    comp('3009','Sash bead height','扇压条高', H-207, 1),
    comp('4011','Fixed bead width','固定压条宽', W/2-49.5, 1),
    comp('4011','Fixed bead height','固定压条高', H-67, 1),
  ]};
}
function calcP4000Xox({W,S,H}, qty){
  return { components: [
    comp('4007','Frame width','框宽', W-52, 2),
    comp('4007','Frame height','框高', H-52, 2),
    comp('4002','Sash width','扇宽', S-80, 4),
    comp('4002','Sash height','扇高', H-98, 4),
    comp('4003','Vertical mullion','中挺', H-55, 2),
    comp('3009','Sash bead width','扇宽压', S-189, 4),
    comp('3009','Sash bead height','扇高压', H-207, 4),
    comp('4011','Centre fixed bead width','固宽压', W-2*(S+15.85), 2),
    comp('4011','Centre fixed bead height','固高压', H-207, 2),
  ]};
}
function calcP4000FixedOverXox({W,S,H,T}, qty){
  return { components: [
    comp('4007','Frame width','框宽', W-52, 2),
    comp('4007','Frame height','框高', H-52, 2),
    comp('4002','Lower sash width','下部扇宽', S-80, 4),
    comp('4002','Lower sash height','下部扇高', H-T-80, 4),
    comp('4003','Horizontal transom H(T)','横中挺 H(T)', W-55, 1),
    comp('4003','Vertical mullion H(M)','竖中挺 H(M)', H-55, 2),
    comp('3009','Lower sash bead width','下扇压条宽', S-189, 4),
    comp('3009','Lower sash bead height','下扇压条高', H-T-189, 4),
    comp('4011','Middle fixed bead width WF(M)','中固定压条宽', W-2*(S+15.85), 2),
    comp('4011','Middle fixed bead height HF(M)','中固定压条高', H-T-189, 2),
    comp('4011','Top fixed bead width WF(T)','上固定压条宽', W-67, 2),
    comp('4011','Top fixed bead height HF(T)','上固定压条高', T-49.35, 2),
  ]};
}
function calcP4000StackedOx({W,H,T}, qty){
  return { components: [
    comp('4007','Frame width','框宽', W-52, 1),
    comp('4007','Frame height','框高', H-52, 1),
    comp('4002','Sash width','扇宽', W-98, 1),
    comp('4002','Sash height','扇高', T-17.5, 1),
    comp('4003','Transom','中挺', W-55, 1),
  ]};
}

const CALCULATORS = {
  hmst82_fixed: { fn: calcHmst82Fixed, required: ['W','H'], scalesWithQty: true },
  hmst82_xo_ox: { fn: calcHmst82XoOx, required: ['W','H'], scalesWithQty: true },
  hmst82_xox: { fn: calcHmst82Xox, required: ['W','H','O'], scalesWithQty: true },
  hmst82_lower_hung: { fn: calcHmst82LowerHung, required: ['W','H','O'], scalesWithQty: true },
  hmst82_upper_hung: { fn: calcHmst82UpperHung, required: ['W','H','O'], scalesWithQty: false },
  p4000_x: { fn: calcP4000X, required: ['W','H'], scalesWithQty: true, area: true },
  p4000_xx: { fn: calcP4000Xx, required: ['W','H'], scalesWithQty: true, area: true },
  p4000_ox: { fn: calcP4000Ox, required: ['W','H'], scalesWithQty: true, area: true },
  p4000_xox: { fn: calcP4000Xox, required: ['W','S','H'], scalesWithQty: true, area: true },
  p4000_fixed_over_xox: { fn: calcP4000FixedOverXox, required: ['W','S','H','T'], scalesWithQty: true, area: true },
  p4000_stacked_ox: { fn: calcP4000StackedOx, required: ['W','H','T'], scalesWithQty: true, area: true },
};

/* ================= calculation engine entry point ================= */
// dims: {W,H,O,S,T} — raw values as entered, in the category's native unit
// (inches for hmst82_*, millimetres for p4000_*). Returns
// {ok, warnings:[], components:[{code,label,labelZh,length,qtyEach,totalQty}],
//  glass:[{label,labelZh,widthIn,heightIn,widthDisplay,heightDisplay,qtyEach,totalQty}]|null,
//  areaM2:number|null, scalesWithQty, error}
export function calcComponents(category, dims, qty, formulas){
  const f = formulas[category];
  if(!f || !f.active){
    return {ok:false, error: category==='custom_shape' ? t('calc.error.custom') : t('calc.error.inactive')};
  }
  const calc = CALCULATORS[category];
  if(!calc){
    return {ok:false, error: t('calc.error.custom')};
  }
  if(!checkPositive(Object.fromEntries(calc.required.map(k=>[k,dims[k]])))){
    return {ok:false, error:t('calc.error.badnum')};
  }
  const W = Number(dims.W), H = Number(dims.H);
  const unit = (CATEGORY_CONFIG[category]||{unit:'mm'}).unit;
  const warnings = [];
  if(f.minW!=null && f.maxW!=null && (W < f.minW || W > f.maxW)) warnings.push(tf('calc.warn.widthRange',{w:W,min:f.minW,max:f.maxW,unit}));
  if(f.minH!=null && f.maxH!=null && (H < f.minH || H > f.maxH)) warnings.push(tf('calc.warn.heightRange',{h:H,min:f.minH,max:f.maxH,unit}));

  const result = calc.fn(dims, qty);
  const components = applyQty(result.components, qty, calc.scalesWithQty)
    .map(c => ({...c, totalQty: Math.round(c.totalQty)}));
  const glass = result.glass ? applyQty(result.glass, qty, calc.scalesWithQty).map(g => ({...g, totalQty: Math.round(g.totalQty)})) : null;
  const areaM2 = calc.area ? round2((W*H*qty)/1000000) : null;

  if(components.some(c => c.length <= 0) || (glass||[]).some(g => g.widthIn<=0 || g.heightIn<=0)){
    return {ok:false, error: t('calc.error.negativeResult')};
  }

  return { ok:true, warnings, components, glass, areaM2, formulaVersion:f.version, scalesWithQty: calc.scalesWithQty, oValue: result.O };
}

/* ================= quote (pricing) engine — real Home Fortune pricing ================= */
// Verified against Home_Fortune_Pricing_Workbook.xlsx. A window's size price
// is (frame rate + glass rate, both independently-chosen $/sq ft) x area in
// sq ft, compared against a per-configuration minimum charge — whichever is
// higher is charged — plus an optional flat installation fee per window.
// Patio doors are flat-priced (no size math); door installation is not
// charged (explicitly unconfirmed in the source workbook).
// Returns {ok, lines:[{key,label,cents}], unitCents, lineTotalCents, version, error}
export function computeQuoteLine(item, pricing){
  const cfg = CATEGORY_CONFIG[item.category] || {};

  if(cfg.kind === 'door'){
    const door = pricing.patioDoors[cfg.doorId];
    if(!door || !door.active) return {ok:false, error:t('quote.error.inactive')};
    const doorQty = Number(item.quantity)||1;
    const unitCents = door.flatPriceCents;
    const lineTotalCents = unitCents * doorQty;
    return {
      ok:true, lines:[{key:'door', label:t('quote.doorPrice'), cents:unitCents}], unitCents, lineTotalCents, version:door.version,
      productUnitCents: unitCents, productLineTotalCents: lineTotalCents, installUnitCents: 0, installLineTotalCents: 0,
    };
  }

  const prod = pricing.products[item.category];
  if(!prod || !prod.active){
    return {ok:false, error: item.category==='custom_shape' ? t('quote.error.custom') : t('quote.error.inactive')};
  }
  const frame = pricing.frameTypes[item.frameSystem];
  if(!frame || !frame.active) return {ok:false, error:t('quote.error.selectFrame')};
  const glass = pricing.glassTypes[item.glassType];
  if(!glass || !glass.active) return {ok:false, error:t('quote.error.selectGlass')};
  const W = Number(item.width), H = Number(item.height);
  if(!W || !H || W<=0 || H<=0) return {ok:false, error:t('calc.error.badnum')};
  // area for pricing purposes only; item.unit is 'in' for HMST82, 'mm' for 4000
  const areaSqFt = item.unit === 'in' ? (W*H)/144 : (W/304.8) * (H/304.8);
  const combinedRate = frame.ratePerSqFt + glass.ratePerSqFt;
  const sizeCents = Math.round(combinedRate*100*areaSqFt);
  const minimumCents = Math.round(prod.basePrice*100);
  const usedMinimum = minimumCents > sizeCents;
  // XOX-family configurations need an extra pane of glass (the centre fixed
  // panel) beyond what the standard per-sq-ft pricing accounts for — folded
  // directly into the window's own price (not shown as a separate charge),
  // unlike installation below. See pricing_products.extra_glass_surcharge.
  const extraGlassCents = Math.round((prod.extraGlassSurcharge||0)*100);
  const productCents = Math.max(sizeCents, minimumCents) + extraGlassCents;
  const installCents = item.installRequested ? (pricing.modifiers.installFeeCents||0) : 0;

  const lines = [
    {key:'size', label:tf('quote.sizeArea',{w:W,h:H,area:areaSqFt.toFixed(2),unit:item.unit||'mm'})+` (${frame.labelEn} $${frame.ratePerSqFt}/sqft + ${glass.labelEn} $${glass.ratePerSqFt}/sqft)`, cents:sizeCents},
  ];
  if(usedMinimum) lines.push({key:'minimum', label:t('quote.minimumApplied'), cents:minimumCents-sizeCents});
  if(installCents) lines.push({key:'install', label:t('quote.installFeeLine'), cents:installCents});

  const qty = Number(item.quantity)||1;
  // unitCents/lineTotalCents are the combined per-unit/total price (product,
  // which already includes any extra-glass surcharge, + install) — used for
  // subtotal math. productLineTotalCents/installLineTotalCents split that
  // same total back out so the UI can show installation as its own line
  // (e.g. "6 windows: $X" + "Installation (6 x $150): $900"); the extra-glass
  // surcharge stays folded into the window's own price, not broken out.
  const unitCents = productCents + installCents;
  const lineTotalCents = unitCents * qty;
  return {
    ok:true, lines, unitCents, lineTotalCents, version:prod.version, usedMinimum,
    productUnitCents: productCents, productLineTotalCents: productCents*qty,
    installUnitCents: installCents, installLineTotalCents: installCents*qty,
  };
}
export function computeOrderQuoteLive(items, pricing){
  const results = items.map(it => ({item:it, q: computeQuoteLine(it, pricing)}));
  const subtotalCents = results.reduce((s,r)=> s + (r.q.ok? r.q.lineTotalCents:0), 0);
  const excludedCount = results.filter(r=>!r.q.ok).length;
  return {results, subtotalCents, excludedCount};
}
export function isQuoteStaleForItem(quote, it, pricing){
  if(!quote || !quote.snapshot) return true;
  const snap = quote.snapshot.items.find(s=>s.itemNo===it.itemNo);
  if(!snap) return true;
  const live = computeQuoteLine(it, pricing);
  if(!live.ok || !snap.ok) return live.ok !== snap.ok ? true : false;
  return live.lineTotalCents !== snap.lineTotalCents;
}
export function fmtCents(cents){ return (cents/100).toFixed(2); }

// Ad-hoc priced line items on a quote (installation labour, a manually
// engineered product, delivery, etc.) that aren't calculated from a window
// item. Each: {id, description, unitPriceCents, quantity}.
export function computeManualItemsTotal(items){
  return (items||[]).reduce((s,i)=> s + (Number(i.unitPriceCents)||0) * (Number(i.quantity)||1), 0);
}
