import { useEffect } from "react";

// ── Global mobile CSS (injected once) ────────────────────────────────────────
const MOBILE_CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; max-width: 100%; overflow-x: clip; overscroll-behavior-y: none; }
  #root { overflow-x: clip; max-width: 100%; }
  @media (max-width: 767px) {
    .gg-landing-nav { padding: 0 16px !important; }
    .gg-landing-navlinks { display: none !important; }
    .gg-landing-logo svg { height: 30px !important; width: auto !important; }
    .gg-sidebar { transform: translateX(-100%); transition: transform 0.25s ease; position: fixed !important; z-index: 200; height: calc(100vh - 52px) !important; top: 52px !important; }
    .gg-sidebar.open { transform: translateX(0); }
    .gg-sidebar-overlay { display: block !important; }
    .gg-main { margin-left: 0 !important; }
    .gg-upload-grid { grid-template-columns: 1fr 1fr !important; }
    .gg-col-guide { grid-template-columns: 1fr 1fr !important; }
    .gg-timeline-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
    .gg-timeline-arrow { top: auto !important; bottom: -22px !important; right: 50% !important; transform: translateX(50%) rotate(90deg) !important; }
    .gg-card-grid-3 { grid-template-columns: 1fr !important; }
    .gg-hero-card { width: 100% !important; }
    .gg-demo-body { flex-direction: column !important; }
    .gg-demo-sidebar { width: 100% !important; flex-direction: row !important; flex-wrap: wrap !important; gap: 8px !important; }
    .gg-demo-table-scroll { overflow-x: auto !important; }
    .gg-header-extras { display: none !important; }
    .gg-table-wrap { -webkit-overflow-scrolling: touch; }
    .gg-modal { max-width: 100% !important; max-height: 100vh !important; border-radius: 0 !important; height: 100%; }
    .gg-modal-sheet { border-radius: 20px 20px 0 0 !important; max-height: 90vh; }
    .gg-detail-grid { grid-template-columns: 1fr !important; }
    .gg-landing-hero h1 { font-size: 28px !important; }
    .gg-landing-stats { grid-template-columns: 1fr !important; }
    .gg-landing-usecases { grid-template-columns: 1fr !important; }
    .gg-setup-grid2 { grid-template-columns: 1fr !important; }
    .gg-setup-tiles3 { grid-template-columns: 1fr !important; }
    .gg-setup-tiles2 { grid-template-columns: 1fr !important; }
    .gg-step-line { display: none !important; }
    .gg-mktnav-tabs { display: none !important; }
    .gg-setup-cols { grid-template-columns: 1fr !important; }
    .gg-eventbar { flex-direction: column !important; align-items: stretch !important; }
    .gg-eventbar > div { width: 100% !important; }
    .gg-eventbar > div:last-child { display: flex !important; gap: 8px !important; }
    .gg-eventbar > div:last-child > * { flex: 1 !important; }
    .gg-eventbar > div:last-child button { width: 100% !important; justify-content: center !important; }
    .gg-cta-btns { flex-direction: column; align-items: stretch !important; }
    .gg-pricing-grid { grid-template-columns: 1fr !important; }
    .gg-contacts-grid { grid-template-columns: 1fr !important; }
    .gg-bottom-nav { display: flex !important; }
    .gg-table-row-height td { height: 52px !important; }
  }
  .gg-sidebar-overlay { display: none; }
  .gg-bottom-nav { display: none; }
  /* Motion system (GroupGrid brand): rise and settle, then rest. Entrances 400-600ms,
     micro 120-200ms, ease-out cubic-bezier(.2,.8,.2,1). Nothing bounces, spins, or loops behind text. */
  @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
  @keyframes ggIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes ggPulse { 0%,100%{opacity:.45} 50%{opacity:1} }
  @keyframes ggSlideUp { from { opacity:0; transform:translateY(100%); } to { opacity:1; transform:translateY(0); } }
  /* Honor reduced-motion: settle instantly instead of moving. */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; scroll-behavior: auto !important; }
  }
`;

export function GlobalStyles() {
  useEffect(() => {
    // Ensure a correct mobile viewport meta exists even if the host index.html is missing or has a wrong one.
    let vp = document.querySelector('meta[name="viewport"]');
    if (!vp) { vp = document.createElement("meta"); vp.setAttribute("name", "viewport"); document.head.appendChild(vp); }
    vp.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");
    // Set the GroupGrid brand-mark favicon at runtime so it shows even if index.html has none.
    const faviconSvg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='26' fill='#0C1E3F'/><circle cx='28' cy='28' r='9' fill='#00C9B1'/><circle cx='50' cy='28' r='9' fill='#A9C2DC'/><circle cx='72' cy='28' r='9' fill='#A9C2DC'/><circle cx='28' cy='50' r='9' fill='#A9C2DC'/><circle cx='50' cy='50' r='9' fill='#00C9B1'/><circle cx='72' cy='50' r='9' fill='#A9C2DC'/><circle cx='28' cy='72' r='9' fill='#A9C2DC'/><circle cx='50' cy='72' r='9' fill='#A9C2DC'/><circle cx='72' cy='72' r='9' fill='#00C9B1'/></svg>";
    const faviconHref = "data:image/svg+xml," + encodeURIComponent(faviconSvg);
    let icon = document.querySelector('link[rel="icon"]');
    if (!icon) { icon = document.createElement("link"); icon.setAttribute("rel", "icon"); document.head.appendChild(icon); }
    icon.setAttribute("type", "image/svg+xml");
    icon.setAttribute("href", faviconHref);
    let apple = document.querySelector('link[rel="apple-touch-icon"]');
    if (!apple) { apple = document.createElement("link"); apple.setAttribute("rel", "apple-touch-icon"); document.head.appendChild(apple); }
    apple.setAttribute("href", faviconHref);
    const el = document.createElement("style");
    el.id = "gg-mobile-css";
    el.textContent = MOBILE_CSS;
    if (!document.getElementById("gg-mobile-css")) document.head.appendChild(el);
    return () => { const e = document.getElementById("gg-mobile-css"); if (e) e.remove(); };
  }, []);
  return null;
}
