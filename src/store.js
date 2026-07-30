// Shared in-memory app state. Business data itself always lives in Postgres —
// this just holds the current session's cached lookups and UI state so
// render functions (which run synchronously against already-fetched data)
// don't need to be threaded through every call.
export const state = {
  session: null,        // Supabase auth session
  user: null,            // profiles row for the signed-in user {id, full_name, role, active}
  lang: localStorage.getItem('hfw_lang') || 'en',
  profilesById: {},      // uuid -> profiles row, for resolving calc_by/approved_by/etc to names
  profilesActive: [],    // active profiles, for employee-picker dropdowns
  formulas: null,        // product_type -> formula shape (see data.js mapFormulaRow)
  pricing: null,         // {products:{...}, modifiers:{...}}
  statuses: [],           // ordered list of status labels
};

export function setLang(lang) {
  state.lang = lang;
  localStorage.setItem('hfw_lang', lang);
}
