// Build version — bump this whenever code is deployed so you can confirm at a glance which build is live.
export const APP_VERSION = "v9.5 · Jun 2026";
// Deep-linkable marketing/legal pages. Maps URL path <-> in-app page so groupgrid.io/privacy
// loads the policy directly (and refresh/share keeps you there). Landing and app both live at "/".
export const PAGE_PATHS = { privacy:"/privacy", terms:"/terms", security:"/security", help:"/help", pricing:"/pricing", about:"/about", faq:"/faq", contact:"/contact", whoPlanners:"/who-we-serve/event-planners", whoTravelManagers:"/who-we-serve/corporate-travel-managers", whoAssistants:"/who-we-serve/executive-assistants", whoSalesOps:"/who-we-serve/sales-revenue-ops" };
export function pathToPage(pathname) {
  const p = (pathname || "/").replace(/\/+$/, "").toLowerCase() || "/";
  for (const k in PAGE_PATHS) { if (PAGE_PATHS[k] === p) return k; }
  return "landing";
}
// Feature flag: hide the Dietary/Access feature from the UI for now while focusing on
// registration, flights, hotels, and cars. The parsing/engine code stays intact —
// flip this to true to bring the dietary upload, column, and detail back everywhere.
export const SHOW_DIETARY = true;
// Feature flag: hide the portable project-file download (.ggproj) and "Load project from
// file" import for now. A .ggproj is an unencrypted JSON file with attendee data, so it's
// hidden until we decide how to handle it securely. The functions stay intact — flip this
// to true to bring both the download button and the load control back.
export const SHOW_PROJECT_FILE_IO = false;
