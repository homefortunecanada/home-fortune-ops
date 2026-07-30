// Deterministic material cut-size and quote pricing engines.
// These are pure functions of (item, formulas/pricing) — SAMPLE placeholder
// formulas/prices are stored in Postgres (material_formulas, pricing_products,
// pricing_modifiers) and must be replaced with Home Fortune's verified
// manufacturing/pricing rules before real production use. See Formula Admin.
import { t, tf, opt, GLASS_TYPES, COLORS, SCREEN_TYPES, HARDWARE } from './i18n.js';

/* ---------------- precise integer-mm math helpers ---------------- */
// work in hundredths of a millimetre as integers to avoid float drift
function toHundredths(mm){ return Math.round(Number(mm)*100); }
function fromHundredths(h){ return (h/100).toFixed(1); }

/* ---------------- calculation engine ---------------- */
// Returns {ok, warnings:[], components:[{label,labelZh,w,h,qtyEach}], error}
export function calcComponents(type, wMM, hMM, qty, formulas){
  const f = formulas[type];
  const warnings = [];
  if(!f || !f.active){
    return {ok:false, error: type==='custom_shape' ? t('calc.error.custom') : t('calc.error.inactive')};
  }
  const W = Number(wMM), H = Number(hMM);
  if(!W || !H || W<=0 || H<=0) return {ok:false, error:t('calc.error.badnum')};
  if(W < f.minW || W > f.maxW) warnings.push(tf('calc.warn.widthRange',{w:W,min:f.minW,max:f.maxW}));
  if(H < f.minH || H > f.maxH) warnings.push(tf('calc.warn.heightRange',{h:H,min:f.minH,max:f.maxH}));

  const Wh = toHundredths(W), Hh = toHundredths(H);
  const d = f.deductions;
  let components = [];

  if(type==='casement' || type==='awning' || type==='bay_bow'){
    const frameHS = Wh - toHundredths(d.frameHS);
    const frameJ  = Hh - toHundredths(d.frameJ);
    const sashW = Wh - toHundredths(d.sashW);
    const sashH = Hh - toHundredths(d.sashH);
    const glassWfix = Wh - toHundredths(d.sashW) - toHundredths(d.glassW);
    const glassHfix = Hh - toHundredths(d.sashH) - toHundredths(d.glassH);
    const screenW = Wh - toHundredths(d.screenW);
    const screenH = Hh - toHundredths(d.screenH);
    components = [
      {label:'Frame Head/Sill', labelZh:'框架上下横料', w:fromHundredths(frameHS), h:'—', qtyEach:2},
      {label:'Frame Jamb (L/R)', labelZh:'框架左右立料', w:'—', h:fromHundredths(frameJ), qtyEach:2},
      {label:'Sash', labelZh:'扇料', w:fromHundredths(sashW), h:fromHundredths(sashH), qtyEach:1},
      {label:'Glass Pane', labelZh:'玻璃', w:fromHundredths(glassWfix), h:fromHundredths(glassHfix), qtyEach:1},
      {label:'Screen', labelZh:'纱窗', w:fromHundredths(screenW), h:fromHundredths(screenH), qtyEach:1},
    ];
    if(type==='bay_bow') components.push({label:'Angle Allowance / Panel', labelZh:'角度余量/每扇', w:d.angleAllowance+' mm', h:'—', qtyEach:3});
  } else if(type==='slider' || type==='patio_door'){
    const frameHS = Wh - toHundredths(d.frameHS);
    const frameJ  = Hh - toHundredths(d.frameJ);
    const panelW = Math.round(Wh/2) + toHundredths(d.sashOverlap);
    const panelH = Hh - toHundredths(d.sashHDeduct);
    const glassW = panelW - toHundredths(d.glassW);
    const glassH = panelH - toHundredths(d.glassH);
    const screenW = Math.round(Wh/2) - toHundredths(d.screenW/2);
    const screenH = Hh - toHundredths(d.screenH);
    components = [
      {label:'Frame Head/Sill', labelZh:'框架上下横料', w:fromHundredths(frameHS), h:'—', qtyEach:2},
      {label:'Frame Jamb (L/R)', labelZh:'框架左右立料', w:'—', h:fromHundredths(frameJ), qtyEach:2},
      {label:'Sliding Panel', labelZh:'活动扇', w:fromHundredths(panelW), h:fromHundredths(panelH), qtyEach:2},
      {label:'Glass Pane', labelZh:'玻璃', w:fromHundredths(glassW), h:fromHundredths(glassH), qtyEach:2},
      {label:'Screen', labelZh:'纱窗', w:fromHundredths(screenW), h:fromHundredths(screenH), qtyEach:1},
    ];
  }
  // multiply each component's per-unit quantity by order quantity
  components = components.map(c=>({...c, totalQty: (c.qtyEach||1) * (Number(qty)||1)}));
  return {ok:true, warnings, components, formulaVersion:f.version};
}

/* ---------------- quote (pricing) engine ---------------- */
// Returns {ok, lines:[{key,label,cents}], unitCents, lineTotalCents, version, error}
export function computeQuoteLine(item, pricing){
  const prod = pricing.products[item.category];
  if(!prod || !prod.active){
    return {ok:false, error: item.category==='custom_shape' ? t('quote.error.custom') : t('quote.error.inactive')};
  }
  const W = Number(item.width), H = Number(item.height);
  if(!W || !H || W<=0 || H<=0) return {ok:false, error:t('calc.error.badnum')};
  const areaSqFt = (W/304.8) * (H/304.8);
  const m = pricing.modifiers;
  const baseCents = Math.round(prod.basePrice*100);
  const sizeCents = Math.round(prod.pricePerSqFt*100*areaSqFt);
  const glassCents = Math.round((m.glass[item.glassType]||0)*100);
  const colorCents = Math.round((m.color[item.color]||0)*100);
  const screenCents = Math.round((m.screen[item.screenType]||0)*100);
  const hardwareCents = Math.round((m.hardware[item.hardware]||0)*100);
  const hasGrid = item.grid && item.grid.trim() && item.grid.trim().toLowerCase()!=='none';
  const gridCents = hasGrid ? Math.round(m.gridSurcharge*100) : 0;
  const lines = [
    {key:'base', label:t('quote.basePrice'), cents:baseCents},
    {key:'size', label:tf('quote.sizeArea',{w:W,h:H,area:areaSqFt.toFixed(2)}), cents:sizeCents},
  ];
  if(glassCents) lines.push({key:'glass', label:t('quote.glassUpgrade')+': '+opt(GLASS_TYPES,item.glassType), cents:glassCents});
  if(colorCents) lines.push({key:'color', label:t('quote.colourUpgrade')+': '+opt(COLORS,item.color), cents:colorCents});
  if(screenCents) lines.push({key:'screen', label:t('quote.screenUpgrade')+': '+opt(SCREEN_TYPES,item.screenType), cents:screenCents});
  if(hardwareCents) lines.push({key:'hardware', label:t('quote.hardwareUpgrade')+': '+opt(HARDWARE,item.hardware), cents:hardwareCents});
  if(gridCents) lines.push({key:'grid', label:t('quote.gridSurcharge'), cents:gridCents});
  const unitCents = lines.reduce((s,l)=>s+l.cents,0);
  const lineTotalCents = unitCents * (Number(item.quantity)||1);
  return {ok:true, lines, unitCents, lineTotalCents, version:pricing.version};
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
