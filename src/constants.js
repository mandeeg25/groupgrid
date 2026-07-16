// Build version — bump this whenever code is deployed so you can confirm at a glance which build is live.
export const APP_VERSION = "v9.5 · Jun 2026";
// Deep-linkable marketing/legal pages. Maps URL path <-> in-app page so groupgrid.io/privacy
// loads the policy directly (and refresh/share keeps you there). Landing and app both live at "/".
export const PAGE_PATHS = { privacy:"/privacy", terms:"/terms", pricing:"/pricing", about:"/about", faq:"/faq", contact:"/contact" };
export function pathToPage(pathname) {
  const p = (pathname || "/").replace(/\/+$/, "").toLowerCase() || "/";
  for (const k in PAGE_PATHS) { if (PAGE_PATHS[k] === p) return k; }
  return "landing";
}
// Feature flag: hide the Dietary/Access feature from the UI for now while focusing on
// registration, flights, hotels, and cars. The parsing/engine code stays intact —
// flip this to true to bring the dietary upload, column, and detail back everywhere.
export const SHOW_DIETARY = false;
