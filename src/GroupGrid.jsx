// ─────────────────────────────────────────────────────────────────────────────
// GroupGrid — mobile-optimised build  (v3, June 2026)
// Architecture: 100% browser-local React SPA. No server, no PII storage.
//
// Mobile changes (v2):
//   [x] useIsMobile hook drives layout switching at 768px
//   [x] Sidebar becomes slide-in drawer on mobile (hamburger toggle)
//   [x] Upload grid: 4-col desktop → 2-col mobile
//   [x] Compact upload bar: wraps cleanly on small screens
//   [x] Guest table: horizontal scroll + touch-friendly row height on mobile
//   [x] Guest detail expand: single-column card stack on mobile
//   [x] Header: hides non-essential controls on mobile
//   [x] Modals: full-screen on mobile
//   [x] Landing/marketing pages: responsive text sizes and grid cols
//   [x] Bottom nav bar for key actions when results are loaded on mobile
//
// Auth + storage changes (v3):
//   [x] window.storage replaced with localStorage wrapper (works on Vercel)
//   [x] Mock login replaced with Supabase email/password auth
//   [x] Sign up with name, email, password (min 8 chars)
//   [x] Password reset via email link
//   [x] Session persists across page refreshes (Supabase session tokens)
//   [x] Anonymous → user session migration on sign-in
//   [x] Supabase JS loaded via CDN (no build step required)
//   [x] Graceful fallback if Supabase CDN fails (app still works)
//
// Registration source-of-truth (v4):
//   [x] Registration list upload added (optional 5th file)
//   [x] parseRegistrationSheet — detects company, job title, requested dates, flight/hotel requests
//   [x] crossMatch reworked: registration anchors the comparison when present
//   [x] New flag: "Registered but no flight booked"
//   [x] New flag: "Registered but no hotel booked"
//   [x] New flag: "Booked travel but not on registration list"
//   [x] New flag: hotel dates differ from what registration requested
//   [x] Unregistered filter + count added
//   [x] Falls back to travel-vs-travel checks when no registration uploaded
//
// Remaining next steps:
//   [ ] Sync saved sessions to Supabase DB (currently localStorage only)
//   [ ] Compare registration's dietary requests vs. dietary file
//   [ ] Change tracking: diff current run vs saved session
//   [ ] Custom report branding (logo upload)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback, useEffect, useRef, Fragment } from "react";
import * as XLSX from "xlsx";
import { Plane, Hotel, Car, Salad, LayoutGrid, BarChart2, Mail, Lock, Calendar, Send, AlertTriangle, AlertCircle, Circle, Copy, Check, X, Plus, ShieldCheck, Ban, FileSpreadsheet, Users, Download, Save, Trash2, Pencil} from "lucide-react";

const P = {
  navy:"#0F1F3D", navyLight:"#1A2E52", periwinkle:"#6B7FD4", periwinkleL:"#9BAAE8",
  periwinkleD:"#4C62C4", white:"#FFFFFF", offWhite:"#F0F2F7", grey50:"#EEF1F8",
  grey100:"#DDE2EF", grey200:"#B8C0D8", grey400:"#7E8BA8", grey600:"#4A5568",
  green:"#0D9E6E", greenLight:"#E3F7F0", amber:"#C97A0A", amberLight:"#FEF2DC",
  red:"#C0392B", redLight:"#FDECEC", purple:"#6B3FA0", purpleLight:"#EEE5F9",
  teal:"#0A7B7A", tealLight:"#DCF2F2",
  accent:"#00C9B1", accentLight:"#E0FAF7", accentD:"#00A896",
};
const font = "'Manrope', sans-serif";

// ── Responsive hook ───────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < breakpoint : false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = e => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

// ── Global mobile CSS (injected once) ────────────────────────────────────────
const MOBILE_CSS = `
  @media (max-width: 767px) {
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
    .gg-setup-cols { grid-template-columns: 1fr !important; }
    .gg-eventbar { flex-direction: column !important; align-items: stretch !important; }
    .gg-eventbar > div, .gg-eventbar > button { width: 100% !important; }
    .gg-cta-btns { flex-direction: column; align-items: stretch !important; }
    .gg-pricing-grid { grid-template-columns: 1fr !important; }
    .gg-contacts-grid { grid-template-columns: 1fr !important; }
    .gg-bottom-nav { display: flex !important; }
    .gg-table-row-height td { height: 52px !important; }
  }
  .gg-sidebar-overlay { display: none; }
  .gg-bottom-nav { display: none; }
  @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
  @keyframes ggIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes ggPulse { 0%,100%{opacity:.45} 50%{opacity:1} }
  @keyframes ggSlideUp { from { opacity:0; transform:translateY(100%); } to { opacity:1; transform:translateY(0); } }
`;

function GlobalStyles() {
  useEffect(() => {
    const el = document.createElement("style");
    el.id = "gg-mobile-css";
    el.textContent = MOBILE_CSS;
    if (!document.getElementById("gg-mobile-css")) document.head.appendChild(el);
    return () => { const e = document.getElementById("gg-mobile-css"); if (e) e.remove(); };
  }, []);
  return null;
}
const FEATURES = {
  shareableReport: true,
  emailTemplates:  true,
  savedProjects:   true,
  changeTracking:  false,
  customBranding:  false,
};

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val)) return val;
  if (typeof val === "number") { const d = new Date(Math.round((val - 25569) * 86400 * 1000)); return isNaN(d) ? null : d; }
  const d = new Date(val); return isNaN(d) ? null : d;
}
function fmt(date) { if (!date) return "—"; return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function stripTime(d) { if (!d) return null; const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function diffDays(a, b) { if (!a || !b) return null; return Math.round((stripTime(a) - stripTime(b)) / 86400000); }
function findCol(headers, candidates) {
  const h = headers.map(x => String(x || "").toLowerCase().trim());
  for (const c of candidates) { const i = h.findIndex(x => x.includes(c)); if (i !== -1) return i; }
  return -1;
}
function normName(n) { return String(n || "").toLowerCase().replace(/[^a-z]/g, ""); }
function normEmail(e) { return String(e || "").toLowerCase().trim(); }
function splitName(full) {
  const s = String(full || "").trim();
  if (!s) return { firstName: "", lastName: "" };
  // Handle "Last, First" format
  if (s.includes(",")) {
    const [last, ...rest] = s.split(",");
    return { firstName: rest.join(",").trim(), lastName: last.trim() };
  }
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  const lastName = parts.pop();
  return { firstName: parts.join(" "), lastName };
}
function isOutside(date, ws, we) {
  if (!date) return false;
  const d = stripTime(date);
  if (ws && d < stripTime(ws)) return true;
  if (we && d > stripTime(we)) return true;
  return false;
}

function parseSheet(wb, fieldMap) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
  if (rows.length < 2) return [];
  const h = rows[0];
  const cols = {};
  // Add first/last name column detection to every sheet
  const fullFieldMap = {
    ...fieldMap,
    firstName: ["first name","firstname","first","given name","given"],
    lastName:  ["last name","lastname","last","surname","family name","family"],
  };
  Object.entries(fullFieldMap).forEach(([key, candidates]) => { cols[key] = findCol(h, candidates); });
  const dateFields = new Set(["flightArrival","flightDeparture","checkIn","checkOut","pickupDate","dropoffDate","regCheckIn","regCheckOut"]);
  return rows.slice(1).filter(r => r.some(c => c !== "")).map((r, i) => {
    const obj = {};
    Object.entries(cols).forEach(([key, idx]) => {
      if (dateFields.has(key)) obj[key] = idx >= 0 ? parseDate(r[idx]) : null;
      else if (key === "email") obj[key] = idx >= 0 ? normEmail(r[idx]) : "";
      else if (key === "name") obj[key] = idx >= 0 ? String(r[idx] || "").trim() : `Row ${i + 2}`;
      else obj[key] = idx >= 0 ? String(r[idx] || "").trim() : "";
    });
    // If sheet has separate first/last columns, build name from them; else split the name field
    if (obj.firstName || obj.lastName) {
      obj.name = [obj.firstName, obj.lastName].filter(Boolean).join(" ") || obj.name || `Row ${i + 2}`;
    } else {
      const { firstName, lastName } = splitName(obj.name);
      obj.firstName = firstName;
      obj.lastName = lastName;
    }
    return obj;
  });
}

function parseFlightSheet(wb) {
  return parseSheet(wb, { name:["name","attendee","passenger","guest","traveler"], email:["email","e-mail","email address"], flightArrival:["arrival","arrive","inbound date","land","flight in"], flightDeparture:["departure","depart","outbound","fly out","return date"], flightIn:["inbound flight","arrival flight","flight in #","inbound #"], flightOut:["outbound flight","departure flight","flight out","return flight"], airport:["airport","hub"] });
}
function parseHotelSheet(wb) {
  return parseSheet(wb, { name:["name","attendee","guest","passenger"], email:["email","e-mail","email address"], checkIn:["check-in","checkin","arrival","hotel in"], checkOut:["check-out","checkout","departure","hotel out"], room:["room","confirmation","conf","booking","reservation"], hotel:["hotel","property","venue"] });
}
// Parse a hotel roster and tag every record with a property name.
// Priority: the row's own "Hotel" column (combined-file case) → the file-level property name (separate-file case).
function parseHotelSheetTagged(wb, fileProperty) {
  const rows = parseHotelSheet(wb);
  return rows.map(r => ({ ...r, hotel: (r.hotel && r.hotel.trim()) ? r.hotel.trim() : (fileProperty || "").trim() }));
}
function parseCarSheet(wb) {
  return parseSheet(wb, { name:["name","attendee","passenger","guest"], email:["email","e-mail","email address"], pickupDate:["pickup","pick up","transfer in","arrival transfer","car arrival"], dropoffDate:["dropoff","drop off","transfer out","departure transfer"], pickupLoc:["pickup location","pick up location","from","origin"], dropoffLoc:["dropoff location","drop off location","to","destination"], confirmation:["confirmation","conf","booking","transfer #","vendor"] });
}
function parseDietarySheet(wb) {
  return parseSheet(wb, { name:["name","attendee","guest","passenger"], email:["email","e-mail","email address"], dietary:["dietary","diet","food","restriction","allergy","allergies"], accessibility:["accessibility","access","mobility","accommodation","disability","special need"], specialNotes:["notes","special","request","other","additional"] });
}
function parseRegistrationSheet(wb) {
  return parseSheet(wb, {
    name:["name","attendee","registrant","guest","participant"],
    email:["email","e-mail","email address"],
    company:["company","organization","org","employer","account"],
    jobTitle:["job title","title","position","role"],
    regCheckIn:["hotel check in","hotel check-in","check in","check-in","requested check in","hotel in","arrival"],
    regCheckOut:["hotel check out","hotel check-out","check out","check-out","requested check out","hotel out","departure"],
    flightRequest:["flight request","flight needed","flight required","needs flight","travel request","air travel"],
    hotelRequest:["hotel request","hotel needed","hotel required","needs hotel","room request","accommodation"],
    dietaryRequest:["dietary request","dietary","diet","food restriction","allergy","allergies"],
    departCity:["departing city","departure city","origin city","home city","city"],
    departState:["departing state","state","province","region"],
    departCountry:["departing country","country","nation"],
    regNotes:["registration notes","reg notes","notes","comments","special requests"],
    reason:["reason","justification","exception reason","no travel reason","opt out reason","explanation"],
    assignedHotel:["assigned hotel","hotel assignment","assigned property","designated hotel","hotel block","room block","expected hotel"],
  });
}

function crossMatch(flights, hotels, cars, dietary, aw, existingMeta, registration) {
  registration = registration || [];
  const hasReg = registration.length > 0;
  const hasFlights = flights.length > 0;
  const hasHotels = hotels.length > 0;
  const { arrivalStart, arrivalEnd, departureStart, departureEnd } = aw || {};
  const mkMaps = (arr) => { const byE = new Map(), byN = new Map(); arr.forEach(x => { if (x.email) byE.set(x.email, x); const k = normName(x.name); if (k) byN.set(k, x); }); return [byE, byN]; };
  const [fByE, fByN] = mkMaps(flights), [hByE, hByN] = mkMaps(hotels), [cByE, cByN] = mkMaps(cars), [dByE, dByN] = mkMaps(dietary), [rByE, rByN] = mkMaps(registration);
  const allLists = [...flights,...hotels,...cars,...dietary,...registration];
  const emailKeys = new Set(allLists.map(x => x.email).filter(Boolean));
  const nameKeys = new Set(allLists.map(x => normName(x.name)).filter(Boolean));
  const emailMatchedNames = new Set();
  emailKeys.forEach(ek => [fByE.get(ek),hByE.get(ek),cByE.get(ek),dByE.get(ek),rByE.get(ek)].forEach(r => { if (r) emailMatchedNames.add(normName(r.name)); }));
  const dupNames = new Set();
  [flights,hotels,cars].forEach(list => { const seen = new Map(); list.forEach(x => { const k = normName(x.name); seen.set(k,(seen.get(k)||0)+1); }); seen.forEach((v,k) => { if (v>1) dupNames.add(k); }); });

  // Helper: does this registration row have a noted reason (in notes OR a dedicated reason column)?
  const hasReason = (reg) => {
    if (!reg) return false;
    const note = (reg.regNotes || "").trim();
    const reason = (reg.reason || "").trim();
    return note.length > 0 || reason.length > 0;
  };
  // Does a row request a flight/hotel? Blank → expected (flag if missing). Explicit "No" → only
  // suppress the missing flag if a reason is noted; "No" with no reason is an incomplete record → still flag.
  const NEGATIVE = ["no","n","none","not needed","not required","false","0"];
  const wantsFlight = (reg) => {
    if (!reg) return false;
    const v = (reg.flightRequest || "").toLowerCase().trim();
    if (v === "") return true;
    if (NEGATIVE.includes(v)) return !hasReason(reg); // No + reason → don't expect; No + no reason → still flag
    return true;
  };
  const wantsHotel = (reg) => {
    if (!reg) return false;
    const v = (reg.hotelRequest || "").toLowerCase().trim();
    if (v === "") return true;
    if (NEGATIVE.includes(v)) return !hasReason(reg);
    return true;
  };

  function build(flight, hotel, car, diet, key, matchedBy, reg) {
    const displayName = reg?.name || flight?.name || hotel?.name || car?.name || diet?.name || key;
    const email = reg?.email || flight?.email || hotel?.email || car?.email || diet?.email || "";
    const metaKey = email || key;
    const existing = existingMeta?.[metaKey] || {};
    const issues = [];

    // ── Registration-anchored checks (only when a registration list is uploaded) ──
    if (hasReg) {
      if (!reg) {
        // Travel record exists but person is NOT in registration → booked but not registered
        issues.push({ type:"unregistered", text:"Booked travel but not on registration list" });
      } else {
        // Person IS registered — check what they requested vs. what got booked
        if (wantsFlight(reg) && !flight) {
          const saidNo = NEGATIVE.includes((reg.flightRequest || "").toLowerCase().trim());
          issues.push({ type:"missing", text: saidNo ? "Marked 'no flight' but no reason given" : "Registered but no flight booked" });
        }
        if (wantsHotel(reg) && !hotel) {
          const saidNo = NEGATIVE.includes((reg.hotelRequest || "").toLowerCase().trim());
          issues.push({ type:"missing", text: saidNo ? "Marked 'no hotel' but no reason given" : "Registered but no hotel booked" });
        }
        // Registration's requested hotel dates vs. actual hotel roster dates
        if (hotel && reg.regCheckIn && hotel.checkIn) {
          const ci = diffDays(reg.regCheckIn, hotel.checkIn);
          if (ci !== null && ci !== 0) issues.push({ type:"mismatch", text:`Hotel check-in differs from registration by ${Math.abs(ci)} ${Math.abs(ci)===1?"day":"days"}` });
        }
        if (hotel && reg.regCheckOut && hotel.checkOut) {
          const co = diffDays(reg.regCheckOut, hotel.checkOut);
          if (co !== null && co !== 0) issues.push({ type:"mismatch", text:`Hotel check-out differs from registration by ${Math.abs(co)} ${Math.abs(co)===1?"day":"days"}` });
        }
        // Right-hotel check (only when registration provides an assigned hotel AND the booked record names a property)
        if (hotel && reg.assignedHotel && reg.assignedHotel.trim() && hotel.hotel && hotel.hotel.trim()) {
          const assigned = reg.assignedHotel.trim().toLowerCase();
          const booked = hotel.hotel.trim().toLowerCase();
          if (assigned !== booked) issues.push({ type:"mismatch", text:`Booked at ${hotel.hotel.trim()} but assigned to ${reg.assignedHotel.trim()}` });
        }
      }
    }

    // ── Existing travel-vs-travel checks (only flag files that were actually uploaded) ──
    if (!hasReg) {
      // Original behavior when no registration list: flag missing across travel files,
      // but only for file types the planner actually provided.
      if (hasFlights && !flight) issues.push({ type:"missing", text:"Missing from flight manifest" });
      if (hasHotels && !hotel)  issues.push({ type:"missing", text:"Missing from hotel roster" });
    }
    if (cars.length > 0 && !car && (reg || flight || hotel)) issues.push({ type:"missing", text:"Missing from car transfers" });

    const details = {};
    if (flight && hotel) {
      const ad = diffDays(flight.flightArrival, hotel.checkIn), dd = diffDays(flight.flightDeparture, hotel.checkOut);
      details.arrDiff = ad; details.depDiff = dd;
      if (ad !== null && ad !== 0) issues.push({ type:"mismatch", text: ad<0?`Arrives ${Math.abs(ad)} ${Math.abs(ad)===1?"day":"days"} before check-in`:`Arrives ${ad} ${ad===1?"day":"days"} after check-in` });
      if (dd !== null && dd !== 0) issues.push({ type:"mismatch", text: dd<0?`Departs ${Math.abs(dd)} ${Math.abs(dd)===1?"day":"days"} before check-out`:`Departs ${dd} ${dd===1?"day":"days"} after check-out` });
    }
    if (flight && car) {
      if (car.pickupDate && flight.flightArrival) { const pd = diffDays(car.pickupDate, flight.flightArrival); details.pickupDiff = pd; if (pd!==0) issues.push({ type:"mismatch", text:`Car pickup ${Math.abs(pd)} ${Math.abs(pd)===1?"day":"days"} ${pd<0?"before":"after"} flight arrival` }); }
      if (car.dropoffDate && flight.flightDeparture) { const dd2 = diffDays(car.dropoffDate, flight.flightDeparture); if (dd2!==0) issues.push({ type:"mismatch", text:`Car dropoff ${Math.abs(dd2)} ${Math.abs(dd2)===1?"day":"days"} ${dd2<0?"before":"after"} flight departure` }); }
    }
    const arrDate = flight?.flightArrival || hotel?.checkIn || reg?.regCheckIn, depDate = flight?.flightDeparture || hotel?.checkOut || reg?.regCheckOut;
    if (arrDate && isOutside(arrDate, arrivalStart, arrivalEnd)) issues.push({ type:"window", text:`Arrival ${fmt(arrDate)} outside approved window` });
    if (depDate && isOutside(depDate, departureStart, departureEnd)) issues.push({ type:"window", text:`Departure ${fmt(depDate)} outside approved window` });
    if (dupNames.has(normName(displayName))) issues.push({ type:"duplicate", text:"Duplicate name detected across lists" });
    const seen = new Set(); const uniqueIssues = issues.filter(x => { if (seen.has(x.text)) return false; seen.add(x.text); return true; });
    const resolved = existing.resolved || [];
    const active = uniqueIssues.filter(x => !resolved.includes(x.text));
    const status = active.length === 0 ? "ok" : active.length === 1 ? "warn" : "error";
    const { firstName, lastName } = splitName(displayName);
    const resolvedFirstName = reg?.firstName || flight?.firstName || hotel?.firstName || car?.firstName || diet?.firstName || firstName;
    const resolvedLastName  = reg?.lastName  || flight?.lastName  || hotel?.lastName  || car?.lastName  || diet?.lastName  || lastName;
    return { key, displayName, firstName:resolvedFirstName, lastName:resolvedLastName, email, matchedBy, flight, hotel, car, diet, reg, registered: !!reg, issues:uniqueIssues, status, details, note:existing.note||"", resolved };
  }

  const results = [];
  emailKeys.forEach(ek => results.push(build(fByE.get(ek)||null, hByE.get(ek)||null, cByE.get(ek)||null, dByE.get(ek)||null, ek, "email", rByE.get(ek)||null)));
  nameKeys.forEach(nk => { if (emailMatchedNames.has(nk)) return; results.push(build(fByN.get(nk)||null, hByN.get(nk)||null, cByN.get(nk)||null, dByN.get(nk)||null, nk, "name", rByN.get(nk)||null)); });
  return results;
}

// ── Change tracking diff ──────────────────────────────────────────────────────
function diffResults(prev, curr) {
  if (!prev || !curr) return { added:[], removed:[], changed:[], unchanged:[] };
  const prevMap = new Map((prev||[]).map(r => [r.email || r.key, r]));
  const currMap = new Map((curr||[]).map(r => [r.email || r.key, r]));
  const added = [], removed = [], changed = [], unchanged = [];
  currMap.forEach((r, k) => {
    if (!prevMap.has(k)) { added.push(r); return; }
    const p = prevMap.get(k);
    const prevIssues = (p.issues||[]).map(x=>x.text).sort().join("|");
    const currIssues = (r.issues||[]).map(x=>x.text).sort().join("|");
    if (prevIssues !== currIssues || p.status !== r.status) changed.push({ prev:p, curr:r });
    else unchanged.push(r);
  });
  prevMap.forEach((r, k) => { if (!currMap.has(k)) removed.push(r); });
  return { added, removed, changed, unchanged };
}


// ── UI ────────────────────────────────────────────────────────────────────────
function DropZone({ label, icon, sub, onFile, fileName, accent, optional }) {
  const [drag, setDrag] = useState(false);
  const onDrop = useCallback(e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }, [onFile]);
  return (
    <label onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
      style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", border:`2px dashed ${drag ? accent : fileName ? accent+"88" : P.grey200}`, borderRadius:"10px", padding:"18px 12px", cursor:"pointer", minHeight:"110px", background: fileName ? accent+"07" : P.white, transition:"all 0.2s", position:"relative" }}>
      <input type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
      {optional && !fileName && <span style={{ position:"absolute", top:7, right:10, fontSize:"10px", color:P.grey400, fontFamily:font, fontWeight:500, textTransform:"uppercase" }}>Optional</span>}
      <div style={{ marginBottom:"6px", color:P.grey400, display:"flex", alignItems:"center", justifyContent:"center" }}>{icon}</div>
      {fileName ? <>
        <div style={{ color:accent, fontSize:"15px", fontWeight:700, textAlign:"center", maxWidth:"120px", wordBreak:"break-word", fontFamily:font }}>{fileName}</div>
        <div style={{ marginTop:"5px", background:P.greenLight, color:P.green, fontSize:"15px", fontWeight:800, padding:"2px 10px", borderRadius:"20px", fontFamily:font }}><Check size={10} strokeWidth={2.5} style={{display:"inline",marginRight:3}}/>Ready</div>
      </> : <>
        <div style={{ color:P.navy, fontWeight:800, fontSize:"14px", marginBottom:"2px", fontFamily:font }}>{label}</div>
        <div style={{ color:P.navyLight, fontSize:"15px", fontFamily:font, textAlign:"center" }}>{sub}</div>
      </>}
    </label>
  );
}

function StatusChip({ status }) {
  const cfg = { ok:{label:"Aligned",bg:P.greenLight,color:P.green}, warn:{label:"1 Issue",bg:P.amberLight,color:P.amber}, error:{label:"Action Needed",bg:P.redLight,color:P.red} };
  const s = cfg[status] || cfg.ok;
  return <span style={{ display:"inline-flex", alignItems:"center", gap:"5px", background:s.bg, color:s.color, borderRadius:"20px", padding:"2px 9px 2px 7px", fontSize:"15px", fontWeight:600, fontFamily:font, whiteSpace:"nowrap" }}><span style={{ width:5, height:5, borderRadius:"50%", background:s.color, display:"inline-block" }} />{s.label}</span>;
}

function Delta({ val }) {
  if (val === null || val === undefined) return <span style={{ color:P.grey400 }}>—</span>;
  if (val === 0) return <span style={{ color:P.green, fontWeight:700, fontFamily:font, fontSize:"15px" }}>On time</span>;
  const days = Math.abs(val);
  const word = days === 1 ? "day" : "days";
  const dir  = val > 0 ? "late" : "early";
  return <span style={{ color:days<=1?P.amber:P.red, fontWeight:700, fontFamily:font, fontSize:"15px", whiteSpace:"nowrap" }}>{days} {word} {dir}</span>;
}

function IssueTag({ issue, resolved, onResolve }) {
  const cfg = { missing:{bg:P.amberLight,color:P.amber,border:`1px solid ${P.amber}44`,icon:<Circle size={11} strokeWidth={2}/>}, mismatch:{bg:P.redLight,color:P.red,border:`1px solid ${P.red}44`,icon:<AlertTriangle size={11} strokeWidth={2}/>}, window:{bg:P.purpleLight,color:P.purple,border:`1px solid ${P.purple}44`,icon:<Calendar size={11} strokeWidth={1.5}/>}, duplicate:{bg:"#FFF3E0",color:"#E65100",border:"1px solid #E6510044",icon:<AlertCircle size={11} strokeWidth={2}/>}, unregistered:{bg:P.purpleLight,color:P.purple,border:`1px solid ${P.purple}44`,icon:<Ban size={11} strokeWidth={2}/>} };
  const s = cfg[issue.type] || cfg.mismatch;
  const isRes = (resolved || []).includes(issue.text);
  return (
    <div style={{ background:isRes?"#f8f8f8":s.bg, border:isRes?`1px solid ${P.grey100}`:s.border, borderRadius:"8px", padding:"7px 11px", fontSize:"15px", color:isRes?P.grey400:s.color, fontWeight:700, fontFamily:font, marginBottom:"6px", display:"flex", alignItems:"flex-start", gap:"6px", opacity:isRes?0.6:1 }}>
      <span style={{ flexShrink:0, display:"flex", alignItems:"center" }}>{isRes?<Check size={11} strokeWidth={2.5}/>:s.icon}</span>
      <span style={{ flex:1, textDecoration:isRes?"line-through":"none" }}>{issue.text}</span>
      <button onClick={e => { e.stopPropagation(); onResolve(issue.text); }} style={{ background:"transparent", border:`1px solid ${isRes?P.grey200:s.color}`, borderRadius:"6px", padding:"2px 8px", fontSize:"15px", color:isRes?P.grey400:s.color, fontWeight:700, fontFamily:font, cursor:"pointer", flexShrink:0 }}>{isRes?"Unresolve":"Resolve"}</button>
    </div>
  );
}

function Card({ title, color, children }) {
  return (
    <div style={{ background:P.white, borderRadius:"10px", padding:"14px 16px", border:`1px solid ${P.grey100}` }}>
      <div style={{ fontSize:"14px", color, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:font, marginBottom:"10px" }}>{title}</div>
      {children}
    </div>
  );
}

function DR({ label, val, accent, warn }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", gap:"8px", fontSize:"14px", fontFamily:font, marginBottom:"4px" }}>
      <span style={{ color:P.navy, fontWeight:600, flexShrink:0 }}>{label}</span>
      <span style={{ color:warn?P.red:accent?P.periwinkleD:P.navy, fontWeight:accent||warn?700:500, textAlign:"right", wordBreak:"break-all" }}>{val||"—"}</span>
    </div>
  );
}

function DateInput({ label, value, onChange }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
      <label style={{ fontSize:"15px", fontWeight:700, color:P.navy, fontFamily:font }}>{label}</label>
      <input type="date" value={value} onChange={e => onChange(e.target.value)} style={{ background:P.white, border:`1.5px solid ${P.grey200}`, borderRadius:"10px", padding:"7px 10px", color:value?P.navy:P.grey400, fontSize:"14px", fontFamily:font, fontWeight:600, outline:"none" }} />
    </div>
  );
}

function Btn({ onClick, children, color, outline, small, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background:disabled?P.grey100:outline?"transparent":(color||P.navy), color:disabled?P.grey400:outline?(color||P.navy):P.white, border:`1.5px solid ${disabled?P.grey200:(color||P.navy)}`, borderRadius:"7px", padding:small?"4px 11px":"8px 18px", fontSize:small?"11px":"12px", fontWeight:500, fontFamily:font, cursor:disabled?"not-allowed":"pointer", whiteSpace:"nowrap" }}>{children}</button>
  );
}

// ── Contacts Manager Modal ────────────────────────────────────────────────────
function ContactsModal({ contacts, onSave, onClose }) {
  const [local, setLocal] = useState(JSON.parse(JSON.stringify(contacts)));
  function update(type, field, val) {
    setLocal(prev => ({ ...prev, [type]: { ...prev[type], [field]: val } }));
  }
  const fields = [
    { key:"hotel", label:"Hotel Contact", color:P.navy, fields:[{f:"name",ph:"Contact name"},{f:"email",ph:"hotel@property.com"},{f:"phone",ph:"+1 (212) 555-0100"},{f:"property",ph:"Property / hotel name"}] },
    { key:"travel", label:"Travel Agency Contact", color:P.periwinkleD, fields:[{f:"name",ph:"Contact name"},{f:"email",ph:"agent@travelco.com"},{f:"phone",ph:"+1 (212) 555-0200"},{f:"agency",ph:"Agency name"}] },
  ];  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(27,42,74,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div className="gg-modal" style={{ background:P.white, borderRadius:"22px", width:"100%", maxWidth:"620px", maxHeight:"90vh", overflow:"auto", boxShadow:"0 20px 60px rgba(27,42,74,0.3)" }}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${P.grey100}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontWeight:600, fontSize:"15px", color:P.navy, fontFamily:font }}>Event Contacts</div>
            <div style={{ fontSize:"14px", color:P.navyLight, fontFamily:font, marginTop:"2px" }}>Pre-load contacts so emails auto-populate and reports can be shared directly</div>
          </div>
          <button onClick={onClose} style={{ background:P.grey100, border:"none", borderRadius:"10px", width:30, height:30, cursor:"pointer", fontSize:"14px", color:P.navy, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15} strokeWidth={2}/></button>
        </div>
        <div style={{ padding:"20px 24px" }}>
          {fields.map(({ key, label, color, fields: flds }) => (
            <div key={key} style={{ marginBottom:"24px" }}>
              <div style={{ fontSize:"14px", fontWeight:600, color, marginBottom:"12px", fontFamily:font, display:"flex", alignItems:"center", gap:"8px" }}>
                <div style={{ width:3, height:16, background:color, borderRadius:"2px" }} />{label}
              </div>
              <div className="gg-contacts-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                {flds.map(({ f, ph }) => (
                  <div key={f}>
                    <div style={{ fontSize:"15px", fontWeight:700, color:P.navyLight, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"4px" }}>{f}</div>
                    <input value={local[key]?.[f]||""} onChange={e => update(key, f, e.target.value)} placeholder={ph}
                      style={{ width:"100%", background:P.offWhite, border:`1.5px solid ${local[key]?.[f]?color+"44":P.grey100}`, borderRadius:"10px", padding:"9px 12px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* Per-property hotel contacts (multi-hotel) */}
          <div style={{ marginBottom:"24px" }}>
            <div style={{ fontSize:"14px", fontWeight:600, color:P.navy, marginBottom:"4px", fontFamily:font, display:"flex", alignItems:"center", gap:"8px" }}>
              <div style={{ width:3, height:16, background:"#F5A623", borderRadius:"2px" }} />Additional hotel properties
            </div>
            <div style={{ fontSize:"13px", color:P.navyLight, fontFamily:font, marginBottom:"12px" }}>Running multiple hotels? Add a contact per property. Emails about each guest's room route to the matching property automatically.</div>
            {(local.hotels||[]).map((h, idx) => (
              <div key={idx} style={{ display:"flex", gap:"8px", marginBottom:"8px", alignItems:"center", flexWrap:"wrap" }}>
                <input value={h.property||""} onChange={e => setLocal(prev => ({ ...prev, hotels: prev.hotels.map((x,i)=>i===idx?{...x,property:e.target.value}:x) }))} placeholder="Property name"
                  style={{ flex:"1 1 140px", background:P.offWhite, border:`1.5px solid ${h.property?"#F5A62344":P.grey100}`, borderRadius:"9px", padding:"9px 11px", fontSize:"14px", fontFamily:font, fontWeight:500, color:P.navy, outline:"none", minWidth:0 }} />
                <input value={h.name||""} onChange={e => setLocal(prev => ({ ...prev, hotels: prev.hotels.map((x,i)=>i===idx?{...x,name:e.target.value}:x) }))} placeholder="Contact name"
                  style={{ flex:"1 1 120px", background:P.offWhite, border:`1.5px solid ${P.grey100}`, borderRadius:"9px", padding:"9px 11px", fontSize:"14px", fontFamily:font, fontWeight:500, color:P.navy, outline:"none", minWidth:0 }} />
                <input value={h.email||""} onChange={e => setLocal(prev => ({ ...prev, hotels: prev.hotels.map((x,i)=>i===idx?{...x,email:e.target.value}:x) }))} placeholder="email@hotel.com"
                  style={{ flex:"2 1 160px", background:P.offWhite, border:`1.5px solid ${h.email?"#F5A62344":P.grey100}`, borderRadius:"9px", padding:"9px 11px", fontSize:"14px", fontFamily:font, fontWeight:500, color:P.navy, outline:"none", minWidth:0 }} />
                <button onClick={() => setLocal(prev => ({ ...prev, hotels: prev.hotels.filter((_,i)=>i!==idx) }))} style={{ background:"transparent", border:"none", color:P.grey400, cursor:"pointer", flexShrink:0, padding:"4px" }} title="Remove"><X size={15} strokeWidth={2}/></button>
              </div>
            ))}
            <button onClick={() => setLocal(prev => ({ ...prev, hotels:[...(prev.hotels||[]), {property:"",name:"",email:""}] }))}
              style={{ background:"transparent", border:"none", color:P.accentD, fontSize:"13px", fontWeight:500, fontFamily:font, cursor:"pointer", marginTop:"4px", padding:"4px 0" }}>+ Add hotel property contact</button>
          </div>
          <div style={{ marginBottom:"24px" }}>
            <div style={{ fontSize:"14px", fontWeight:800, color:P.navy, marginBottom:"12px", fontFamily:font, display:"flex", alignItems:"center", gap:"8px" }}>
              <div style={{ width:3, height:16, background:P.grey400, borderRadius:"2px" }} />✍ Your Name (used in email signatures)
            </div>
            <input value={local.plannerName||""} onChange={e => setLocal(prev => ({...prev, plannerName:e.target.value}))} placeholder="e.g. Your name, Events Team"
              style={{ width:"100%", background:P.offWhite, border:`1.5px solid ${local.plannerName?P.grey400+"44":P.grey100}`, borderRadius:"10px", padding:"9px 12px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
          </div>
          <div style={{ display:"flex", gap:"10px", paddingTop:"8px", borderTop:`1px solid ${P.grey100}` }}>
            <Btn onClick={() => { onSave(local); onClose(); }} color={P.accent}>Save Contacts <Save size={13} strokeWidth={2} style={{verticalAlign:"-2px"}}/></Btn>
            <Btn onClick={onClose} outline>Cancel</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Email Modal ───────────────────────────────────────────────────────────────

function ShareModal({ html, filename, onClose }) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [tab, setTab] = useState("options"); // "options" | "preview"

  function download() {
    const blob = new Blob([html], { type:"text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  }

  function copyHtml() {
    navigator.clipboard?.writeText(html).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => download());
  }

  // Build a safe srcdoc preview (no blob URLs, no window.open)
  const iframeSrc = html;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(27,42,74,0.65)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:P.white, borderRadius:"20px", width:"100%", maxWidth: tab==="preview" ? "900px" : "480px", maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(27,42,74,0.3)", overflow:"hidden", transition:"max-width 0.2s" }}>

        {/* Header */}
        <div style={{ background:P.navy, padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            <div>
              <div style={{ fontWeight:800, fontSize:"15px", color:P.white, fontFamily:font }}>Share Report</div>
              <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.45)", fontFamily:font, marginTop:"1px" }}>{filename}</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            {/* Tab toggle */}
            <div style={{ display:"flex", background:"rgba(255,255,255,0.08)", borderRadius:"8px", padding:"3px", gap:"3px" }}>
              {[["options","Options"],["preview","Preview"]].map(([t,label]) => (
                <button key={t} onClick={() => setTab(t)} style={{ padding:"4px 12px", borderRadius:"6px", border:"none", cursor:"pointer", fontFamily:font, fontSize:"12px", fontWeight:700, background:tab===t?"rgba(255,255,255,0.15)":"transparent", color:tab===t?P.white:"rgba(255,255,255,0.45)", transition:"all 0.15s" }}>{label}</button>
              ))}
            </div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"8px", width:28, height:28, cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={14} strokeWidth={2}/></button>
          </div>
        </div>

        {tab === "options" && (
          <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:"10px" }}>

            {/* Download */}
            <button onClick={download} style={{ display:"flex", alignItems:"center", gap:"14px", background:downloaded?P.greenLight:P.offWhite, border:`2px solid ${downloaded?P.green:P.grey200}`, borderRadius:"12px", padding:"14px 18px", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}>
              <div style={{ width:38, height:38, borderRadius:"10px", background:downloaded?P.green:P.navy, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background 0.15s" }}>
                <Download size={17} strokeWidth={2} color="white"/>
              </div>
              <div>
                <div style={{ fontSize:"14px", fontWeight:700, color:downloaded?P.green:P.navy, fontFamily:font }}>{downloaded ? "✓ Downloaded!" : "Download HTML File"}</div>
                <div style={{ fontSize:"12px", color:P.grey400, fontFamily:font, marginTop:"2px" }}>Save to your device. Email it, or upload to Google Drive to share with your team.</div>
              </div>
            </button>

            {/* Copy HTML */}
            <button onClick={copyHtml} style={{ display:"flex", alignItems:"center", gap:"14px", background:copied?"#EFF6FF":P.offWhite, border:`2px solid ${copied?P.periwinkleD:P.grey200}`, borderRadius:"12px", padding:"14px 18px", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}>
              <div style={{ width:38, height:38, borderRadius:"10px", background:copied?P.periwinkleD:P.periwinkle, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background 0.15s" }}>
                <Copy size={17} strokeWidth={2} color="white"/>
              </div>
              <div>
                <div style={{ fontSize:"14px", fontWeight:700, color:copied?P.periwinkleD:P.navy, fontFamily:font }}>{copied ? "✓ HTML copied!" : "Copy HTML Source"}</div>
                <div style={{ fontSize:"12px", color:P.grey400, fontFamily:font, marginTop:"2px" }}>Copy the full HTML to paste into an email, CMS, or any editor that accepts HTML.</div>
              </div>
            </button>

            <div style={{ background:P.offWhite, borderRadius:"8px", padding:"10px 14px", fontSize:"12px", color:P.grey400, fontFamily:font, lineHeight:1.6 }}>
              🔒 All guest data is embedded in the file only — nothing is uploaded anywhere.
            </div>
          </div>
        )}

        {tab === "preview" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
            <div style={{ padding:"8px 16px", background:P.offWhite, borderBottom:`1px solid ${P.grey100}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:"12px", color:P.grey400, fontFamily:font }}>Report preview — scroll to explore</span>
              <button onClick={download} style={{ display:"flex", alignItems:"center", gap:"6px", background:P.navy, border:"none", borderRadius:"8px", padding:"6px 14px", cursor:"pointer", fontFamily:font, fontSize:"12px", fontWeight:700, color:P.white }}>
                <Download size={13} strokeWidth={2} color="white"/> Download
              </button>
            </div>
            <iframe
              srcDoc={iframeSrc}
              style={{ flex:1, border:"none", width:"100%", minHeight:"520px" }}
              sandbox="allow-same-origin"
              title="Report Preview"
            />
          </div>
        )}

      </div>
    </div>
  );
}

function EmailModal({ record, eventName, contacts, onClose }) {
  const [type, setType] = useState("hotel");
  const [copied, setCopied] = useState(false);
  const [toEmail, setToEmail] = useState("");
  const [editedSubject, setEditedSubject] = useState(null); // null = use draft default
  const [editedBody, setEditedBody] = useState(null);       // null = use draft default
  const [saved, setSaved] = useState(false);

  const issues = record.issues.filter(x => x.type !== "duplicate");

  const hotelName = contacts?.hotel?.property || record.hotel?.hotel || "the hotel";
  const hotelContact = contacts?.hotel?.name || "Hotel Team";
  const hotelEmail = contacts?.hotel?.email || "";
  const travelContact = contacts?.travel?.name || "Travel Team";
  const travelAgency = contacts?.travel?.agency || "Travel Agency";
  const travelEmail = contacts?.travel?.email || "";

  const evName = eventName && eventName.trim() ? eventName.trim() : null;
  const guestName = record.firstName && record.lastName ? `${record.firstName} ${record.lastName}` : record.displayName;
  const flightArrival = record.flight?.flightArrival ? record.flight.flightArrival.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }) : null;
  const flightDeparture = record.flight?.flightDeparture ? record.flight.flightDeparture.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }) : null;
  const flightIn = record.flight?.flightIn || null;
  const flightOut = record.flight?.flightOut || null;
  const airport = record.flight?.airport || null;
  const checkIn = record.hotel?.checkIn ? record.hotel.checkIn.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }) : null;
  const checkOut = record.hotel?.checkOut ? record.hotel.checkOut.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }) : null;
  const hotel = record.hotel?.hotel || hotelName;

  // Build specific discrepancy lines for each issue — no emojis, clean plain text
  function buildGuestIssueLines() {
    return issues.map(issue => {
      // Flight arrives BEFORE hotel check-in (early arrival)
      if (issue.text?.includes("before check-in") && flightArrival && checkIn)
        return `  Your flight arrives:   ${flightArrival}${airport ? " (" + airport + ")" : ""}${flightIn ? " — Flight " + flightIn : ""}\n  Your hotel check-in:   ${checkIn}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}\n\n  Your flight lands before your hotel check-in date. We want to make sure you have somewhere to stay that first night.\n  Do you need an extra night${hotel && hotel !== "the hotel" ? " at " + hotel : ""}, or do you have accommodations arranged?`;
      // Flight arrives AFTER hotel check-in (late arrival)
      if (issue.text?.includes("after check-in") && flightArrival && checkIn)
        return `  Your flight arrives:   ${flightArrival}${airport ? " (" + airport + ")" : ""}${flightIn ? " — Flight " + flightIn : ""}\n  Your hotel check-in:   ${checkIn}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}\n\n  Your flight arrives after your hotel check-in date. Your room will be held, but we wanted to flag this in case the dates need updating.\n  Could you confirm these details are correct?`;
      // Flight departs BEFORE hotel check-out (early departure)
      if (issue.text?.includes("before check-out") && checkOut && flightDeparture)
        return `  Your hotel check-out:  ${checkOut}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}\n  Your flight departs:   ${flightDeparture}${airport ? " (" + airport + ")" : ""}${flightOut ? " — Flight " + flightOut : ""}\n\n  Your flight departs before your hotel check-out date. You may be paying for a night you won't use.\n  Would you like us to adjust your check-out, or is this intentional?`;
      // Flight departs AFTER hotel check-out (late departure — the common case)
      if (issue.text?.includes("after check-out") && checkOut && flightDeparture)
        return `  Your hotel check-out:  ${checkOut}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}\n  Your flight departs:   ${flightDeparture}${airport ? " (" + airport + ")" : ""}${flightOut ? " — Flight " + flightOut : ""}\n\n  Your hotel checks out on ${checkOut}, but your flight does not depart until ${flightDeparture}. You may not have somewhere to stay on your last night.\n  Would you like to extend your stay${hotel && hotel !== "the hotel" ? " at " + hotel : ""} by one night, or do you have other arrangements?`;
      if (issue.text === "Missing from hotel roster")
        return `  Your flight arrives:   ${flightArrival || "—"}${airport ? " (" + airport + ")" : ""}\n  Hotel booking:         Not currently on file\n\n  We do not have a hotel booking on file for you. We want to make sure you have somewhere to stay.\n  Have you arranged your own accommodations, or would you like us to help?`;
      if (issue.text === "Missing from flight manifest")
        return `  Flight details:        Not currently on file\n  Your hotel check-in:   ${checkIn || "—"}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}\n\n  We do not have your flight details on file. Could you share your inbound and outbound flight numbers and dates?`;
      if (issue.text === "Missing from car transfers")
        return `  Your flight arrives:   ${flightArrival || "—"}${airport ? " (" + airport + ")" : ""}${flightIn ? " — Flight " + flightIn : ""}\n  Ground transfer:       Not currently on file\n  Hotel:                 ${hotel}\n\n  We do not have a ground transfer arranged for you. Would you like us to arrange transportation from ${airport || "the airport"} to ${hotel}?`;
      if (issue.type === "window")
        return `  Your arrival:          ${flightArrival || "—"}\n  Your departure:        ${flightDeparture || "—"}\n\n  Your travel dates appear to fall outside the approved event travel window. Could you confirm these dates are correct, or let us know if any changes are needed?`;
      return `  ${issue.text}`;
    }).join("\n\n");
  }

  function buildHotelIssueLines() {
    return issues.map(issue => {
      if (issue.text?.includes("before check-in") && flightArrival && checkIn)
        return `  • Guest flight arrives ${flightArrival}${flightIn ? " (Flight " + flightIn + ")" : ""} — hotel check-in is ${checkIn}\n    The guest arrives before check-in. Could you accommodate an early check-in or add a night?`;
      if (issue.text?.includes("after check-in") && flightArrival && checkIn)
        return `  • Guest flight arrives ${flightArrival}${flightIn ? " (Flight " + flightIn + ")" : ""} — hotel check-in is ${checkIn}\n    The guest arrives after the check-in date. Please confirm the reservation is held correctly.`;
      if (issue.text?.includes("before check-out") && checkOut && flightDeparture)
        return `  • Hotel check-out is ${checkOut} — guest flight departs ${flightDeparture}${flightOut ? " (Flight " + flightOut + ")" : ""}\n    The guest departs before check-out. You may want to adjust the checkout date.`;
      if (issue.text?.includes("after check-out") && checkOut && flightDeparture)
        return `  • Hotel check-out is ${checkOut}${hotel && hotel !== "the hotel" ? " at " + hotel : ""} — guest flight departs ${flightDeparture}${flightOut ? " (Flight " + flightOut + ")" : ""}\n    The guest's flight departs the day after check-out. Could you extend the stay by one night or arrange a late check-out?`;
      if (issue.text === "Missing from hotel roster")
        return `  • No hotel booking found on file for this guest\n    Could you confirm whether a reservation exists, or assist with creating one?`;
      return `  • ${issue.text}`;
    }).join("\n");
  }

  function buildTravelIssueLines() {
    return issues.map(issue => {
      if (issue.text?.includes("before check-in") && flightArrival && checkIn)
        return `  • Inbound flight ${flightIn || ""} arrives ${flightArrival}${airport ? " into " + airport : ""} — hotel check-in is ${checkIn}\n    The guest arrives before check-in. Please confirm whether this itinerary is correct.`;
      if (issue.text?.includes("after check-in") && flightArrival && checkIn)
        return `  • Inbound flight ${flightIn || ""} arrives ${flightArrival}${airport ? " into " + airport : ""} — hotel check-in is ${checkIn}\n    The guest arrives after the hotel check-in date. Please confirm the booking is correctly held.`;
      if (issue.text?.includes("before check-out") && checkOut && flightDeparture)
        return `  • Hotel check-out is ${checkOut} — outbound flight ${flightOut || ""} departs ${flightDeparture}${airport ? " from " + airport : ""}\n    The guest departs before hotel check-out. Please confirm if the itinerary needs adjusting.`;
      if (issue.text?.includes("after check-out") && checkOut && flightDeparture)
        return `  • Hotel check-out is ${checkOut}${hotel && hotel !== "the hotel" ? " at " + hotel : ""} — outbound flight ${flightOut || ""} departs ${flightDeparture}${airport ? " from " + airport : ""}\n    The guest's flight departs after hotel check-out. Please confirm whether the stay should be extended or a late check-out arranged.`;
      if (issue.text === "Missing from flight manifest")
        return `  • No flight record found on file for this guest\n    Hotel check-in${hotel && hotel !== "the hotel" ? " at " + hotel : ""} is confirmed for ${checkIn || "—"}. Could you provide the inbound and outbound itinerary?`;
      return `  • ${issue.text}`;
    }).join("\n");
  }

  const drafts = {
    hotel: {
      contactName: hotelContact,
      toDisplay: hotelEmail ? `${hotelContact} <${hotelEmail}>` : hotelContact,
      toEmail: hotelEmail,
      subject: `${evName ? evName + " — " : ""}Guest Record Review: ${guestName}`,
      body: `Dear ${hotelContact},

I hope this message finds you well! I am reaching out regarding the reservation for ${guestName}${record.email ? " (" + record.email + ")" : ""} ${hotel && hotel !== "the hotel" ? "at " + hotel : ""}${evName ? " for " + evName : ""}.

While reviewing our guest travel records, we noticed the following that we would love your help to resolve:

${buildHotelIssueLines()}

Here is the full travel summary we have on file for this guest:

    Flight arrival:    ${flightArrival || "—"}${flightIn ? " — Flight " + flightIn : ""}
    Hotel check-in:   ${checkIn || "—"}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}
    Hotel check-out:  ${checkOut || "—"}
    Flight departure:  ${flightDeparture || "—"}${flightOut ? " — Flight " + flightOut : ""}

Could you please review and confirm the correct booking details at your earliest convenience? We truly appreciate your help in making sure ${guestName}'s stay is perfectly arranged!

Thank you so much,
[Your Name]
${evName ? evName + " Planning Team" : "Planning Team"}`,
    },
    travel: {
      contactName: travelContact,
      toDisplay: travelEmail ? `${travelContact} <${travelEmail}>` : travelContact,
      toEmail: travelEmail,
      subject: `${evName ? evName + " — " : ""}Itinerary Review: ${guestName}`,
      body: `Dear ${travelContact},

I hope you are doing well! I am reaching out regarding the travel itinerary for ${guestName}${record.email ? " (" + record.email + ")" : ""}${evName ? " for " + evName : ""}.

While reviewing our guest travel records, we noticed the following that we would love your help to confirm or correct:

${buildTravelIssueLines()}

Here is the full travel summary we have on file for this guest:

    Inbound:           ${flightArrival || "—"}${airport ? " into " + airport : ""}${flightIn ? " — Flight " + flightIn : ""}
    Hotel check-in:   ${checkIn || "—"}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}
    Hotel check-out:  ${checkOut || "—"}
    Outbound:          ${flightDeparture || "—"}${airport ? " from " + airport : ""}${flightOut ? " — Flight " + flightOut : ""}

Kindly advise on the correct details and any changes needed. We really appreciate your support in making sure everything lines up perfectly for ${guestName}!

Thank you so much,
[Your Name]
${evName ? evName + " Planning Team" : "Planning Team"}`,
    },
    guest: {
      contactName: guestName,
      toDisplay: record.email || "Guest email",
      toEmail: record.email || "",
      subject: `${evName ? evName + ": " : ""}A quick note about your travel`,
      body: `Hi ${guestName},

We are so excited to have you joining us${evName ? " for " + evName : ""} and we truly cannot wait to see you there!

We are doing a careful review of all guest travel details to make sure everything is perfectly in place, and we wanted to flag the following for your attention:

ITEM REQUIRING YOUR REVIEW:

${buildGuestIssueLines()}

Could you take a quick look and let us know if anything needs to be updated? We are happy to help with any changes — please just reply to this email.

Your full travel summary on file:

  Arrival:          ${flightArrival || "—"}${airport ? " (" + airport + ")" : ""}${flightIn ? " — Flight " + flightIn : ""}
  Hotel check-in:   ${checkIn || "—"}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}
  Hotel check-out:  ${checkOut || "—"}
  Departure:        ${flightDeparture || "—"}${airport ? " (" + airport + ")" : ""}${flightOut ? " — Flight " + flightOut : ""}

Thank you so much — we truly look forward to seeing you${evName ? " at " + evName : ""}!

Warmly,
[Your Name]
${evName ? evName + " Planning Team" : "Planning Team"}`,
    },
  };

  const draft = drafts[type];
  React.useEffect(() => { setToEmail(draft.toEmail); setEditedSubject(null); setEditedBody(null); setSaved(false); }, [type]);

  const currentSubject = editedSubject !== null ? editedSubject : draft.subject;
  const currentBody    = editedBody    !== null ? editedBody    : draft.body;
  const isDirtyEmail   = editedSubject !== null || editedBody !== null;

  function saveEdits() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function resetEdits() {
    setEditedSubject(null);
    setEditedBody(null);
    setSaved(false);
  }

  function copy() {
    const text = `To: ${toEmail || draft.toDisplay}\nSubject: ${currentSubject}\n\n${currentBody}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
    } else { setCopied(true); setTimeout(() => setCopied(false), 1500); }
  }

  function openMailto() {
    const addr = toEmail || draft.toEmail;
    if (!addr) { copy(); return; }
    const subject = encodeURIComponent(currentSubject);
    const body = encodeURIComponent(currentBody);
    window.open(`mailto:${addr}?subject=${subject}&body=${body}`, "_blank");
  }

  const hasContact = type === "hotel" ? !!hotelEmail : type === "travel" ? !!travelEmail : !!record.email;
  const tabs = [
    { k:"hotel", l:"Hotel", hasContact: !!hotelEmail },
    { k:"travel", l:"✈ Travel Agency", hasContact: !!travelEmail },
    { k:"guest", l:"👤 Guest", hasContact: !!record.email },
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(27,42,74,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:P.white, borderRadius:"22px", width:"100%", maxWidth:"600px", maxHeight:"90vh", overflow:"auto", boxShadow:"0 20px 60px rgba(27,42,74,0.3)" }}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${P.grey100}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontWeight:600, fontSize:"15px", color:P.navy, fontFamily:font }}>Draft Email</div>
            <div style={{ fontSize:"14px", color:P.navyLight, fontFamily:font, marginTop:"2px" }}>{record.displayName} · {issues.length} flag{issues.length !== 1 ? "s" : ""}</div>
          </div>
          <button onClick={onClose} style={{ background:P.grey100, border:"none", borderRadius:"10px", width:30, height:30, cursor:"pointer", fontSize:"14px", color:P.navy, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15} strokeWidth={2}/></button>
        </div>
        <div style={{ padding:"18px 24px" }}>
          {/* Tabs with contact indicator */}
          <div style={{ display:"flex", gap:"8px", marginBottom:"18px" }}>
            {tabs.map(({ k, l, hasContact: hc }) => (
              <button key={k} onClick={() => setType(k)} style={{ background:type===k?P.navy:P.offWhite, color:type===k?P.white:P.grey600, border:`1px solid ${type===k?P.navy:P.grey200}`, borderRadius:"7px", padding:"5px 12px", fontSize:"14px", fontWeight:500, fontFamily:font, cursor:"pointer", position:"relative", display:"flex", alignItems:"center", gap:"6px" }}>
                {l}
                {hc
                  ? <span style={{ width:7, height:7, borderRadius:"50%", background:type===k?"rgba(255,255,255,0.7)":P.green, display:"inline-block" }} title="Contact saved" />
                  : <span style={{ width:7, height:7, borderRadius:"50%", background:type===k?"rgba(255,255,255,0.3)":P.grey200, display:"inline-block" }} title="No contact saved" />}
              </button>
            ))}
          </div>

          {/* No contact warning */}
          {!hasContact && (
            <div style={{ background:P.amberLight, border:`1px solid ${P.amber}44`, borderRadius:"10px", padding:"10px 14px", marginBottom:"14px", fontSize:"14px", color:P.amber, fontWeight:700, fontFamily:font, display:"flex", alignItems:"center", gap:"8px" }}>
              <AlertTriangle size={13} strokeWidth={2}/>
              <span>No {type === "hotel" ? "hotel" : type === "travel" ? "travel agency" : "guest"} email on file.
                {type !== "guest" && <span style={{ fontWeight:400, color:P.amber }}> Close this and click <strong>📇 Contacts</strong> to add one.</span>}
              </span>
            </div>
          )}

          {/* To field — editable */}
          <div style={{ marginBottom:"10px" }}>
            <div style={{ fontSize:"15px", fontWeight:700, color:P.navyLight, fontFamily:font, marginBottom:"3px", textTransform:"uppercase", letterSpacing:"0.06em" }}>To</div>
            <input value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder={draft.toDisplay || "Enter email address…"}
              style={{ width:"100%", background:toEmail?P.white:P.offWhite, border:`1.5px solid ${toEmail?P.periwinkle+"44":P.grey100}`, borderRadius:"9px", padding:"8px 12px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
          </div>

          {/* Subject — editable */}
          <div style={{ marginBottom:"10px" }}>
            <div style={{ fontSize:"15px", fontWeight:700, color:P.navyLight, fontFamily:font, marginBottom:"3px", textTransform:"uppercase", letterSpacing:"0.06em" }}>Subject</div>
            <input value={currentSubject} onChange={e => setEditedSubject(e.target.value)}
              style={{ width:"100%", background:editedSubject!==null?P.white:P.offWhite, border:`1.5px solid ${editedSubject!==null?P.periwinkle+"66":P.grey100}`, borderRadius:"9px", padding:"8px 12px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
          </div>

          {/* Body — editable */}
          <div style={{ marginBottom:"16px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"3px" }}>
              <div style={{ fontSize:"15px", fontWeight:700, color:P.navyLight, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.06em" }}>Body</div>
              {isDirtyEmail && (
                <div style={{ display:"flex", gap:"6px" }}>
                  <button onClick={saveEdits} style={{ background:saved?P.greenLight:P.periwinkleD, color:saved?P.green:P.white, border:"none", borderRadius:"6px", padding:"3px 10px", fontSize:"12px", fontWeight:700, fontFamily:font, cursor:"pointer" }}>{saved ? <>Saved <Check size={12} strokeWidth={2.5} style={{verticalAlign:"-2px"}}/></> : <>Save <Save size={12} strokeWidth={2} style={{verticalAlign:"-2px"}}/></>}</button>
                  <button onClick={resetEdits} style={{ background:P.offWhite, color:P.grey400, border:`1px solid ${P.grey200}`, borderRadius:"6px", padding:"3px 10px", fontSize:"12px", fontWeight:700, fontFamily:font, cursor:"pointer" }}>Reset</button>
                </div>
              )}
            </div>
            <textarea value={currentBody} onChange={e => setEditedBody(e.target.value)}
              style={{ width:"100%", height:"220px", background:editedBody!==null?P.white:P.offWhite, border:`1.5px solid ${editedBody!==null?P.periwinkle+"66":P.grey100}`, borderRadius:"10px", padding:"12px", fontSize:"14px", fontFamily:font, color:P.navy, resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.6 }} />
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
            <Btn onClick={openMailto} color={hasContact || toEmail ? P.navy : P.grey400} disabled={!hasContact && !toEmail}>
              {hasContact || toEmail ? "Open in Mail App ↗" : "Open in Mail App ↗"}
            </Btn>
            <Btn onClick={copy} color={copied?P.green:P.periwinkleD} outline>{copied?"Copied!":"Copy to Clipboard"}</Btn>
            <Btn onClick={onClose} outline>Close</Btn>
          </div>
          {(!toEmail && !hasContact) && <div style={{ fontSize:"15px", color:P.navyLight, fontFamily:font, marginTop:"8px" }}>Enter an email address in the To field to open in your mail app.</div>}
        </div>
      </div>
    </div>
  );
}

// ── Default Email Templates ───────────────────────────────────────────────────
const DEFAULT_TEMPLATES = {
  arrives_early: {
    id: "arrives_early",
    label: "Arrives Before Check-In",
    icon: "✈",
    color: P.amber,
    description: "Guest flight arrives before hotel check-in date",
    subject: "Quick question about your arrival for {{eventName}}",
    body: `Hi {{guestName}},

We are so excited to have you joining us for {{eventName}} — it is going to be a wonderful event and we truly cannot wait to see you there!

We are doing a careful review of all guest travel details to make sure everything lines up perfectly, and we noticed something we wanted to flag with you right away:

┌────────────────────────┐
    Here is what needs your attention:

    Your flight arrives into {{airport}} on {{flightArrival}}
         Flight: {{flightIn}}

    Your hotel check-in at {{hotel}} is {{checkIn}}

  Your flight lands the day before your hotel check-in date.
└────────────────────────┘

We just want to make sure you have somewhere comfortable to stay that first night, {{guestName}}!

Could you take a quick look and let us know one of the following?

    I have accommodations arranged for my arrival night — no changes needed!
    I would like to add an extra night at {{hotel}} — please help me sort this out.

Either answer is completely fine — we just want to make sure you are taken care of from the moment you land at {{airport}}. If you need us to reach out to {{hotel}} on your behalf, we are more than happy to do that for you!

Here is your full travel summary for {{eventName}} as we have it:

    Arrival:          {{flightArrival}} into {{airport}} — Flight {{flightIn}}
    Hotel check-in:  {{checkIn}} at {{hotel}}
    Hotel check-out: {{checkOut}}
    Departure:        {{flightDeparture}} — Flight {{flightOut}}

Thank you so much for helping us make sure every detail is just right for your trip to {{eventName}}!

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  departs_late: {
    id: "departs_late",
    label: "Departs After Check-Out",
    icon: "🏨",
    color: P.amber,
    description: "Guest flight departs after hotel check-out date",
    subject: "Quick question about your departure for {{eventName}}",
    body: `Hi {{guestName}},

We are so excited to have you joining us for {{eventName}} — it is going to be a wonderful event and we truly cannot wait to see you there!

We are doing a careful review of all guest travel details to make sure everything lines up perfectly, and we noticed something we wanted to flag with you right away:

┌────────────────────────┐
    Here is what needs your attention:

    Your hotel check-out at {{hotel}} is {{checkOut}}

    Your flight departs {{airport}} on {{flightDeparture}}
         Flight: {{flightOut}}

  Your hotel checks out the day before your flight departs.
└────────────────────────┘

We just want to make sure you have somewhere comfortable to stay that last night, {{guestName}}!

Could you take a quick look and let us know one of the following?

    I have accommodations arranged for my departure night — no changes needed!
    I would like to extend my stay at {{hotel}} by one night — please help me sort this out.

Either answer is completely fine — we just want to make sure you are comfortable right up until your flight home from {{airport}}. If you need us to reach out to {{hotel}} on your behalf, we are absolutely happy to do that for you!

Here is your full travel summary for {{eventName}} as we have it:

    Arrival:          {{flightArrival}} into {{airport}} — Flight {{flightIn}}
    Hotel check-in:  {{checkIn}} at {{hotel}}
    Hotel check-out: {{checkOut}}
    Departure:        {{flightDeparture}} from {{airport}} — Flight {{flightOut}}

Thank you so much for helping us make sure every detail is just right for your trip to {{eventName}}!

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  missing_hotel: {
    id: "missing_hotel",
    label: "No Hotel Record Found",
    icon: "🏨",
    color: P.red,
    description: "Guest appears in flight list but no hotel booking on file",
    subject: "We want to make sure you have a place to stay at {{eventName}}",
    body: `Hi {{guestName}},

We are so looking forward to welcoming you to {{eventName}} — it is going to be a fantastic event and we are thrilled you will be joining us!

We are reviewing travel details for all of our guests to make sure no one has any gaps, and we noticed something important we wanted to flag with you right away:

┌────────────────────────┐
    Here is what needs your attention:

    Your flight arrives into {{airport}} on {{flightArrival}}
         Flight: {{flightIn}}

    Hotel booking: Not currently on file

  We do not have a hotel booking on file for you for {{eventName}}.
└────────────────────────┘

We would hate for you to arrive at {{airport}} on {{flightArrival}} without confirmed accommodations, {{guestName}} — so we wanted to reach out right away!

Could you help us out with a quick reply?

    I have already booked my own hotel — here is my confirmation: ___________
    I would love help booking a room — please arrange one for me!

There is truly no wrong answer — we just want to make sure you have a wonderful, comfortable stay during {{eventName}}. Please reach out with any questions at all and we will get this sorted for you immediately!

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  missing_flight: {
    id: "missing_flight",
    label: "No Flight Record Found",
    icon: "✈",
    color: P.red,
    description: "Guest appears in hotel list but no flight on file",
    subject: "Could you share your flight details for {{eventName}}?",
    body: `Hi {{guestName}},

We are so thrilled you will be joining us for {{eventName}} — it is going to be such a wonderful event and we genuinely cannot wait to see you there!

We are reviewing travel details for all of our guests to make sure everything is perfectly coordinated, and we noticed something we wanted to flag with you:

┌────────────────────────┐
    Here is what needs your attention:

    Flight details: Not currently on file

    Your hotel: {{hotel}}
    Check-in date: {{checkIn}}
    Check-out date: {{checkOut}}

  We have your hotel confirmed but no flight information on file.
└────────────────────────┘

Your room at {{hotel}} is all confirmed and ready for you, {{guestName}} — we just need your flight details to complete your travel profile! Having your flight information helps us coordinate your ground transfer, make sure someone is there to greet you when you land, and catch anything that might need attention before you travel.

When you get a moment, could you send us the following?

    Inbound flight number and arrival date
    Outbound flight number and departure date
    Arriving airport

If you are making your own way to {{hotel}} without flying, just let us know and we will update your record — no problem at all!

Thank you so much, and please do not hesitate to reach out with any questions. We cannot wait to see you at {{eventName}}!

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  missing_transfer: {
    id: "missing_transfer",
    label: "No Transfer on File",
    icon: "🚗",
    color: P.amber,
    description: "Guest has no car transfer record",
    subject: "Can we arrange your airport transfer for {{eventName}}?",
    body: `Hi {{guestName}},

We hope you are getting excited for {{eventName}} — we certainly are, and we truly cannot wait to see you!

We are finalizing ground transportation for all of our guests, and we noticed something we wanted to check with you on:

┌────────────────────────┐
    Here is what needs your attention:

    Your flight arrives into {{airport}} on {{flightArrival}}
         Flight: {{flightIn}}

    Transfer to hotel: Not currently on file
    Your hotel: {{hotel}}

  We do not have a transfer arranged for you from {{airport}} to {{hotel}}.
└────────────────────────┘

We want to make absolutely sure you have a smooth, stress-free arrival at {{hotel}}, {{guestName}} — so we wanted to check in right away!

Could you let us know your preference?

    Yes please — I would love a transfer from {{airport}} to {{hotel}}!
    No thank you — I have my own transportation arranged.

We want to make sure you arrive at {{hotel}} feeling relaxed and completely ready to enjoy every moment of {{eventName}}. Just reply with your preference and we will take care of everything from there!

With warm regards,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  outside_window: {
    id: "outside_window",
    label: "Outside Approved Travel Window",
    icon: "🗓",
    color: P.purple,
    description: "Guest travel dates fall outside the approved event window",
    subject: "A quick note about your travel dates for {{eventName}}",
    body: `Hi {{guestName}},

We are so glad you will be joining us for {{eventName}} — we want to make sure every detail of your trip is perfectly arranged and that you have the most wonderful experience!

While reviewing travel details for all of our guests, we noticed something we wanted to bring to your attention right away:

┌────────────────────────┐
    Here is what needs your attention:

    Your flight arrives into {{airport}} on {{flightArrival}}
    Your flight departs {{airport}} on {{flightDeparture}}

    {{eventName}} travel window: {{eventStart}} – {{eventEnd}}

  Your travel dates fall outside the standard event travel window.
└────────────────────────┘

This might be completely intentional, {{guestName}} — perhaps you are extending your trip to explore, which sounds wonderful! If that is the case, no action is needed at all — just reply to let us know you are all set and we will note it in your travel record.

If you think your dates may have been entered incorrectly or you would like to revisit your booking, we are more than happy to help sort it out together. No question is too small!

Here is your full travel summary for {{eventName}} as we have it:

    Arrival:          {{flightArrival}} into {{airport}} — Flight {{flightIn}}
    Hotel check-in:  {{checkIn}} at {{hotel}}
    Hotel check-out: {{checkOut}}
    Departure:        {{flightDeparture}} from {{airport}} — Flight {{flightOut}}

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  general_confirmation: {
    id: "general_confirmation",
    label: "General Travel Confirmation",
    icon: "✅",
    color: P.green,
    description: "Proactive confirmation request for all guests",
    subject: "Does your travel info look right for {{eventName}}?",
    body: `Hi {{guestName}},

We are getting SO excited for {{eventName}} and we hope you are too — we truly cannot wait to see you there!

As we get closer to {{eventName}}, we are doing a final check to make sure every guest's travel details are perfectly in order. We would love for you to take just 30 seconds to review what we have on file and confirm everything looks right!

Here is your complete travel summary for {{eventName}}:

┌────────────────────────┐
    Arrival flight:     {{flightArrival}} into {{airport}}
                          Flight {{flightIn}}

    Hotel check-in:    {{checkIn}} at {{hotel}}
    Hotel check-out:   {{checkOut}}

    Departure flight:  {{flightDeparture}} from {{airport}}
                          Flight {{flightOut}}
└────────────────────────┘

Does everything look right, {{guestName}}?

    Yes, everything looks perfect — I am all set!
    Something needs to be updated — here is what to change: ___________

If everything is correct, you do not need to do a single thing — just sit back, relax, and get ready for a fantastic time at {{eventName}}! If anything needs adjusting, please reply and we will take care of it immediately. No change is too small and no question is too silly — we are here for you!

See you very soon at {{eventName}}!

With excitement,
{{plannerName}}
{{eventName}} Planning Team`,
  },
};
function fillTemplate(template, record, extra = {}) {
  const map = {
    "{{guestName}}": record.firstName || record.displayName || "",
    "{{guestFirstName}}": record.firstName || record.displayName.split(" ")[0] || "",
    "{{guestLastName}}": record.lastName || record.displayName.split(" ").slice(1).join(" ") || "",
    "{{guestFullName}}": record.displayName || "",
    "{{eventName}}": extra.eventName || "our event",
    "{{flightArrival}}": fmt(record.flight?.flightArrival) || "—",
    "{{flightDeparture}}": fmt(record.flight?.flightDeparture) || "—",
    "{{flightIn}}": record.flight?.flightIn || "—",
    "{{flightOut}}": record.flight?.flightOut || "—",
    "{{airport}}": record.flight?.airport || "the airport",
    "{{checkIn}}": fmt(record.hotel?.checkIn) || "—",
    "{{checkOut}}": fmt(record.hotel?.checkOut) || "—",
    "{{hotel}}": record.hotel?.hotel || "the hotel",
    "{{plannerName}}": extra.plannerName || "The Planning Team",
    "{{arrivalEnd}}": extra.arrivalEnd ? fmt(new Date(extra.arrivalEnd)) : "—",
    "{{departureEnd}}": extra.departureEnd ? fmt(new Date(extra.departureEnd)) : "—",
    "{{eventStart}}": extra.arrivalStart ? fmt(new Date(extra.arrivalStart)) : "—",
    "{{eventEnd}}": extra.departureEnd ? fmt(new Date(extra.departureEnd)) : "—",
  };
  let s = template;
  Object.entries(map).forEach(([k, v]) => { s = s.split(k).join(v); });
  return s;
}

function getApplicableTemplates(record) {
  const applicable = [];
  const issues = record.issues || [];
  const has = (sub) => issues.some(x => x.text && x.text.includes(sub));
  if (has("before check-in")) applicable.push("arrives_early");
  if (has("before check-out")) applicable.push("departs_late");
  // Missing hotel — matches both the registration-anchored text and the travel-vs-travel fallback text
  if (has("no hotel booked") || has("Missing from hotel roster") || has("no hotel' but no reason")) applicable.push("missing_hotel");
  // Missing flight — same, across both engine paths
  if (has("no flight booked") || has("Missing from flight manifest") || has("no flight' but no reason")) applicable.push("missing_flight");
  if (has("Missing from car transfers")) applicable.push("missing_transfer");
  if (issues.some(x => x.type === "window")) applicable.push("outside_window");
  return applicable;
}

// ── New Template Modal ────────────────────────────────────────────────────────
const ICON_OPTIONS = ["✉","📋","⭐","🔔","🎯","🚨","💬","📌","🏷","👋","🎉","⚡","📣","🤝","📝","🔁","❓","✅","🛎","💡"];
const TRIGGER_OPTIONS = [
  { value:"all_guests", label:"All guests with email" },
  { value:"missing_hotel", label:"Missing hotel booking" },
  { value:"missing_flight", label:"Missing flight record" },
  { value:"missing_transfer", label:"Missing transfer record" },
  { value:"arrives_early", label:"Arrives before check-in" },
  { value:"departs_late", label:"Departs after check-out" },
  { value:"outside_window", label:"Outside travel window" },
  { value:"has_flags", label:"Any flag / issue" },
  { value:"manual_only", label:"Manual send only (no auto-match)" },
];

function NewTemplateModal({ onSave, onClose }) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("✉");
  const [trigger, setTrigger] = useState("manual_only");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!label.trim()) e.label = "Template name is required";
    if (!subject.trim()) e.subject = "Subject line is required";
    if (!body.trim()) e.body = "Email body is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const id = "custom_" + Date.now();
    onSave({
      id, label: label.trim(), icon, trigger, color: P.periwinkleD,
      description: TRIGGER_OPTIONS.find(t => t.value === trigger)?.label || "Custom template",
      subject: subject.trim(), body: body.trim(), isCustom: true,
    });
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(27,42,74,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:P.white, borderRadius:"22px", width:"100%", maxWidth:"680px", maxHeight:"93vh", overflow:"auto", boxShadow:"0 20px 60px rgba(27,42,74,0.3)" }}>
        <div style={{ padding:"20px 26px", borderBottom:`1px solid ${P.grey100}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontWeight:600, fontSize:"15px", color:P.navy, fontFamily:font }}>New Template</div>
            <div style={{ fontSize:"14px", color:P.navyLight, marginTop:"2px", fontFamily:font }}>Create a custom email template for your event</div>
          </div>
          <button onClick={onClose} style={{ background:P.grey100, border:"none", borderRadius:"10px", width:30, height:30, cursor:"pointer", fontSize:"14px", color:P.navy, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15} strokeWidth={2}/></button>
        </div>

        <div style={{ padding:"22px 26px", display:"flex", flexDirection:"column", gap:"18px" }}>

          {/* Name + Icon row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:"14px", alignItems:"start" }}>
            <div>
              <div style={{ fontSize:"15px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px", fontFamily:font }}>Template Name *</div>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. VIP Welcome Message"
                style={{ width:"100%", background:errors.label?P.redLight:P.offWhite, border:`1.5px solid ${errors.label?P.red:P.grey200}`, borderRadius:"10px", padding:"10px 14px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
              {errors.label && <div style={{ fontSize:"15px", color:P.red, fontFamily:font, marginTop:"4px" }}>{errors.label}</div>}
            </div>
            <div>
              <div style={{ fontSize:"15px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px", fontFamily:font }}>Icon</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", maxWidth:"210px" }}>
                {ICON_OPTIONS.map(ic => (
                  <button key={ic} onClick={() => setIcon(ic)}
                    style={{ width:32, height:32, borderRadius:"8px", border:`1.5px solid ${icon===ic?P.periwinkleD:P.grey200}`, background:icon===ic?P.periwinkle+"22":P.offWhite, fontSize:"15px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Trigger */}
          <div>
            <div style={{ fontSize:"15px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px", fontFamily:font }}>Auto-Send Trigger</div>
            <div style={{ fontSize:"15px", color:P.navyLight, fontFamily:font, marginBottom:"8px" }}>When should this template be included in the send queue?</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px" }}>
              {TRIGGER_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setTrigger(opt.value)}
                  style={{ background:trigger===opt.value?P.navy:P.offWhite, color:trigger===opt.value?P.white:P.grey600, border:`1.5px solid ${trigger===opt.value?P.navy:P.grey100}`, borderRadius:"8px", padding:"7px 11px", fontSize:"15px", fontWeight:700, fontFamily:font, cursor:"pointer", textAlign:"left" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Variables hint */}
          <div style={{ background:P.offWhite, borderRadius:"10px", padding:"10px 14px", fontSize:"15px", color:P.navy, fontFamily:font }}>
            <strong>Available variables:</strong>{" "}
            {["guestName","eventName","eventStart","eventEnd","flightArrival","flightDeparture","flightIn","flightOut","airport","checkIn","checkOut","hotel","plannerName"].map((v,i,arr) => (
              <span key={v}><span style={{ background:P.periwinkle+"22", color:P.periwinkleD, borderRadius:"4px", padding:"1px 5px", fontWeight:700 }}>{`{{${v}}}`}</span>{i < arr.length-1 ? " " : ""}</span>
            ))}
          </div>

          {/* Subject */}
          <div>
            <div style={{ fontSize:"15px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px", fontFamily:font }}>Subject Line *</div>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Welcome to {{eventName}}, {{guestName}}!"
              style={{ width:"100%", background:errors.subject?P.redLight:P.offWhite, border:`1.5px solid ${errors.subject?P.red:P.grey200}`, borderRadius:"10px", padding:"10px 14px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
            {errors.subject && <div style={{ fontSize:"15px", color:P.red, fontFamily:font, marginTop:"4px" }}>{errors.subject}</div>}
          </div>

          {/* Body */}
          <div>
            <div style={{ fontSize:"15px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px", fontFamily:font }}>Email Body *</div>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={`Hi {{guestName}},\n\nWe're looking forward to seeing you at {{eventName}}!\n\n{{plannerName}}\n{{eventName}} Planning Team`}
              style={{ width:"100%", height:"240px", background:errors.body?P.redLight:P.offWhite, border:`1.5px solid ${errors.body?P.red:P.grey200}`, borderRadius:"10px", padding:"14px", fontSize:"14px", fontFamily:font, color:P.navy, resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.7 }} />
            {errors.body && <div style={{ fontSize:"15px", color:P.red, fontFamily:font, marginTop:"4px" }}>{errors.body}</div>}
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:"10px", paddingTop:"4px" }}>
            <Btn onClick={handleSave} color={P.accent}>Save Template <Save size={13} strokeWidth={2} style={{verticalAlign:"-2px"}}/></Btn>
            <Btn onClick={onClose} outline>Cancel</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Communications Hub ────────────────────────────────────────────────────────
function CommHub({ results, eventName, contacts, arrivalStart, arrivalEnd, departureStart, departureEnd }) {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [sendMode, setSendMode] = useState("manual"); // manual | review | auto
  const [queue, setQueue] = useState(null); // null = not built yet
  const [reviewIdx, setReviewIdx] = useState(0);
  const [sentIds, setSentIds] = useState(new Set());
  const [sendMsg, setSendMsg] = useState("");
  const [activeView, setActiveView] = useState("templates"); // templates | queue
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [bulkRecipient, setBulkRecipient] = useState("guest"); // guest | hotel | travel | all
  const [editedIds, setEditedIds] = useState(new Set()); // tracks which queue items have been manually edited
  const [localEdits, setLocalEdits] = useState({}); // {id: {to, subject, body}} — staged edits before save
  const [showTemplateConfig, setShowTemplateConfig] = useState(false); // collapse template/config UI by default

  const plannerName = contacts?.plannerName || "The Planning Team";
  const extra = { eventName, plannerName, arrivalStart, arrivalEnd, departureStart, departureEnd };

  function saveNewTemplate(tmpl) {
    setTemplates(prev => ({ ...prev, [tmpl.id]: tmpl }));
    setNewTemplateOpen(false);
  }

  function deleteTemplate(id) {
    setTemplates(prev => { const n = { ...prev }; delete n[id]; return n; });
    if (queue) setQueue(prev => prev ? prev.filter(item => item.templateId !== id) : prev);
  }

  function getCustomApplicable(record, tmpl) {
    if (!tmpl.isCustom) return false;
    const issues = record.issues || [];
    switch (tmpl.trigger) {
      case "all_guests": return !!record.email;
      case "has_flags": return issues.length > 0;
      case "missing_hotel": return issues.some(x => x.text === "Missing from hotel roster");
      case "missing_flight": return issues.some(x => x.text === "Missing from flight manifest");
      case "missing_transfer": return issues.some(x => x.text === "Missing from car transfers");
      case "arrives_early": return issues.some(x => x.text?.includes("before check-in"));
      case "departs_late": return issues.some(x => x.text?.includes("before check-out"));
      case "outside_window": return issues.some(x => x.type === "window");
      case "manual_only": return false;
      default: return false;
    }
  }

  // Build the send queue from all flagged guests who have emails
  function buildQueue() {
    const q = [];
    (results || []).forEach(record => {
      if (!record.email) return;
      const unresolved = (record.issues || []).filter(x => !(record.resolved || []).includes(x.text));
      if (unresolved.length === 0) return; // only message guests who actually have an open issue
      let matched = false;
      // Default templates: use first applicable match
      const applicable = getApplicableTemplates(record);
      if (applicable.length > 0) {
        const templateId = applicable[0];
        const tmpl = templates[templateId];
        if (tmpl) { q.push({ id: `${record.key}-${templateId}`, record, templateId, subject: fillTemplate(tmpl.subject, record, extra), body: fillTemplate(tmpl.body, record, extra), to: record.email, status: "pending" }); matched = true; }
      }
      // Custom templates: add a separate queue item for each that matches
      Object.values(templates).filter(t => t.isCustom).forEach(tmpl => {
        if (getCustomApplicable(record, tmpl)) {
          q.push({ id: `${record.key}-${tmpl.id}`, record, templateId: tmpl.id, subject: fillTemplate(tmpl.subject, record, extra), body: fillTemplate(tmpl.body, record, extra), to: record.email, status: "pending" });
          matched = true;
        }
      });
      // Fallback: flagged guest with an email but no matching template — still queue a generic note
      // so they're never silently dropped (covers date mismatches, wrong-hotel, unregistered, etc.)
      if (!matched) {
        const issueList = unresolved.map(x => "• " + x.text).join("\n");
        const subject = `${eventName || "Event"} — please review your travel details`;
        const body = `Hi ${record.firstName || record.displayName || "there"},\n\nWhile reviewing arrangements for ${eventName || "our event"}, we found something on your record that needs attention:\n\n${issueList}\n\nCould you take a look and let us know? Thank you.\n\n${contacts?.plannerName || "[Your Name]"}`;
        q.push({ id: `${record.key}-generic`, record, templateId: null, subject, body, to: record.email, status: "pending" });
      }
    });
    setQueue(q);
    setReviewIdx(0);
    setActiveView("queue");
  }

  function updateQueueItem(id, patch) {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
  }

  function markSent(id) {
    setSentIds(prev => new Set([...prev, id]));
    updateQueueItem(id, { status: "sent" });
  }

  function markSkipped(id) {
    updateQueueItem(id, { status: "skipped" });
  }

  function openMailto(item) {
    const subject = encodeURIComponent(item.subject);
    const body = encodeURIComponent(item.body);
    window.open(`mailto:${item.to}?subject=${subject}&body=${body}`, "_blank");
    markSent(item.id);
  }

  function getRecipientAddresses(item) {
    // Returns array of {to, toLabel} based on bulkRecipient setting
    const addrs = [];
    if (bulkRecipient === "guest" || bulkRecipient === "all") {
      if (item.to) addrs.push({ to: item.to, label: item.record.displayName });
    }
    if (bulkRecipient === "hotel" || bulkRecipient === "all") {
      const email = contacts?.hotel?.email;
      if (email) addrs.push({ to: email, label: contacts?.hotel?.name || "Hotel Contact" });
    }
    if (bulkRecipient === "travel" || bulkRecipient === "all") {
      const email = contacts?.travel?.email;
      if (email) addrs.push({ to: email, label: contacts?.travel?.name || "Travel Contact" });
    }
    return addrs;
  }

  function bulkSendChecked() {
    // Auto-save any staged edits before sending
    const items = (queue || []).filter(x => checkedIds.has(x.id) && x.status === "pending");
    items.forEach(item => { if (hasUnsavedEdits(item.id)) saveEdits(item.id); });

    // Re-read queue after saves
    const latestQueue = queue.map(item => {
      if (!checkedIds.has(item.id) || item.status !== "pending") return item;
      const edits = localEdits[item.id];
      return edits ? { ...item, ...edits } : item;
    });

    let delay = 0;
    items.forEach(item => {
      // Use the latest version (with staged edits applied)
      const latest = latestQueue.find(q => q.id === item.id) || item;
      const sendTo = getStagedField(latest, "to") || latest.to;
      const sendSubject = getStagedField(latest, "subject") || latest.subject;
      const sendBody = getStagedField(latest, "body") || latest.body;
      const addrs = getRecipientAddresses({ ...latest, to: sendTo });
      addrs.forEach(({ to }) => {
        setTimeout(() => {
          window.open(`mailto:${to}?subject=${encodeURIComponent(sendSubject)}&body=${encodeURIComponent(sendBody)}`, "_blank");
        }, delay);
        delay += 350;
      });
      markSent(item.id);
    });
    setCheckedIds(new Set());
    setSendMsg(`Opening ${items.length} email${items.length !== 1 ? "s" : ""}…`);
    setTimeout(() => setSendMsg(""), 3000);
  }

  function saveAllEdits() {
    // Save all staged edits at once
    Object.keys(localEdits).forEach(id => saveEdits(id));
  }

  const unsavedCount = Object.keys(localEdits).length;

  function toggleCheck(id) {
    setCheckedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleCheckAll() {
    const pending = (queue || []).filter(x => x.status === "pending").map(x => x.id);
    const allChecked = pending.every(id => checkedIds.has(id));
    setCheckedIds(allChecked ? new Set() : new Set(pending));
  }

  function stageEdit(id, field, value) {
    setLocalEdits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  }

  function getStagedField(item, field) {
    return localEdits[item.id]?.[field] ?? item[field];
  }

  function saveEdits(id) {
    const edits = localEdits[id];
    if (!edits) return;
    updateQueueItem(id, edits);
    setEditedIds(prev => new Set([...prev, id]));
    setLocalEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  function hasUnsavedEdits(id) {
    return !!localEdits[id] && Object.keys(localEdits[id]).length > 0;
  }

  function resetToOriginal(item) {
    const tmpl = templates[item.templateId];
    if (!tmpl) return;
    const orig = { to: item.record.email || "", subject: fillTemplate(tmpl.subject, item.record, extra), body: fillTemplate(tmpl.body, item.record, extra) };
    updateQueueItem(item.id, orig);
    setEditedIds(prev => { const n = new Set(prev); n.delete(item.id); return n; });
    setLocalEdits(prev => { const n = { ...prev }; delete n[item.id]; return n; });
  }

  function sendAll() {
    const pending = (queue || []).filter(x => x.status === "pending");
    pending.forEach((item, i) => {
      setTimeout(() => {
        const subject = encodeURIComponent(item.subject);
        const body = encodeURIComponent(item.body);
        window.open(`mailto:${item.to}?subject=${subject}&body=${body}`, "_blank");
        markSent(item.id);
      }, i * 400);
    });
    setSendMsg(`Opening ${pending.length} email${pending.length !== 1 ? "s" : ""}…`);
    setTimeout(() => setSendMsg(""), 3000);
  }

  function startEdit(templateId) {
    const t = templates[templateId];
    setEditingTemplate(templateId);
    setEditSubject(t.subject);
    setEditBody(t.body);
  }

  function saveEdit() {
    setTemplates(prev => ({ ...prev, [editingTemplate]: { ...prev[editingTemplate], subject: editSubject, body: editBody } }));
    setEditingTemplate(null);
    // Rebuild queue if active so edits reflect
    if (queue) {
      setQueue(prev => prev ? prev.map(item => {
        if (item.templateId !== editingTemplate || item.status !== "pending") return item;
        const tmpl = { ...templates[editingTemplate], subject: editSubject, body: editBody };
        return { ...item, subject: fillTemplate(tmpl.subject, item.record, extra), body: fillTemplate(tmpl.body, item.record, extra) };
      }) : prev);
    }
  }

  const guestsWithEmail = (results || []).filter(r => r.email);
  const customTemplates = Object.values(templates).filter(t => t.isCustom);
  // A guest "needs a message" if they have an email AND any unresolved issue —
  // whether or not a prebuilt template matches (date mismatches, wrong-hotel, etc. still count).
  const flaggedWithEmail = guestsWithEmail.filter(r =>
    (r.issues || []).filter(x => !(r.resolved || []).includes(x.text)).length > 0
  );
  const pendingCount = (queue || []).filter(x => x.status === "pending").length;
  const sentCount = (queue || []).filter(x => x.status === "sent").length;
  const skippedCount = (queue || []).filter(x => x.status === "skipped").length;

  return (
    <div style={{ fontFamily: font }}>

      {/* New template modal */}
      {newTemplateOpen && <NewTemplateModal onSave={saveNewTemplate} onClose={() => setNewTemplateOpen(false)} />}

      {/* Template editor modal */}
      {editingTemplate && (
        <div style={{ position:"fixed", inset:0, background:"rgba(27,42,74,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
          <div style={{ background:P.white, borderRadius:"22px", width:"100%", maxWidth:"660px", maxHeight:"92vh", overflow:"auto", boxShadow:"0 20px 60px rgba(27,42,74,0.3)" }}>
            <div style={{ padding:"20px 26px", borderBottom:`1px solid ${P.grey100}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontWeight:600, fontSize:"15px", color:P.navy }}>Edit Template</div>
                <div style={{ fontSize:"14px", color:P.navyLight, marginTop:"2px" }}>{templates[editingTemplate]?.label}</div>
              </div>
              <button onClick={() => setEditingTemplate(null)} style={{ background:P.grey100, border:"none", borderRadius:"10px", width:30, height:30, cursor:"pointer", fontSize:"14px", color:P.navy, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15} strokeWidth={2}/></button>
            </div>
            <div style={{ padding:"20px 26px" }}>
              <div style={{ background:P.offWhite, borderRadius:"10px", padding:"10px 14px", marginBottom:"16px", fontSize:"15px", color:P.navy }}>
                <strong>Available variables:</strong> {"{{"}<span>guestName</span>{"}}"}, {"{{"}<span>eventName</span>{"}}"}, {"{{"}<span>eventStart</span>{"}}"}, {"{{"}<span>eventEnd</span>{"}}"}, {"{{"}<span>flightArrival</span>{"}}"}, {"{{"}<span>flightDeparture</span>{"}}"}, {"{{"}<span>flightIn</span>{"}}"}, {"{{"}<span>flightOut</span>{"}}"}, {"{{"}<span>airport</span>{"}}"}, {"{{"}<span>checkIn</span>{"}}"}, {"{{"}<span>checkOut</span>{"}}"}, {"{{"}<span>hotel</span>{"}}"}, {"{{"}<span>plannerName</span>{"}}"}
              </div>
              <div style={{ marginBottom:"14px" }}>
                <div style={{ fontSize:"15px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px" }}>Subject Line</div>
                <input value={editSubject} onChange={e => setEditSubject(e.target.value)}
                  style={{ width:"100%", background:P.offWhite, border:`1.5px solid ${P.grey200}`, borderRadius:"10px", padding:"10px 14px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
              </div>
              <div style={{ marginBottom:"16px" }}>
                <div style={{ fontSize:"15px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px" }}>Email Body</div>
                <textarea value={editBody} onChange={e => setEditBody(e.target.value)}
                  style={{ width:"100%", height:"300px", background:P.offWhite, border:`1.5px solid ${P.grey200}`, borderRadius:"10px", padding:"14px", fontSize:"14px", fontFamily:font, color:P.navy, resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.7 }} />
              </div>
              <div style={{ display:"flex", gap:"10px" }}>
                <Btn onClick={saveEdit} color={P.accent}>Save Template <Save size={13} strokeWidth={2} style={{verticalAlign:"-2px"}}/></Btn>
                <Btn onClick={() => { setTemplates(prev => ({...prev, [editingTemplate]: DEFAULT_TEMPLATES[editingTemplate]})); setEditSubject(DEFAULT_TEMPLATES[editingTemplate].subject); setEditBody(DEFAULT_TEMPLATES[editingTemplate].body); }} outline color={P.grey400}>↺ Reset to Default</Btn>
                <Btn onClick={() => setEditingTemplate(null)} outline>Cancel</Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Streamlined start: one clear next step ── */}
      {activeView === "templates" && (
        <>
          <div style={{ background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"16px", padding:"24px 26px", marginBottom:"14px" }}>
            <div style={{ fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font, marginBottom:"4px" }}>
              {flaggedWithEmail.length > 0 ? `${flaggedWithEmail.length} guest${flaggedWithEmail.length!==1?"s":""} need a message` : "No messages needed right now"}
            </div>
            <div style={{ fontSize:"13px", color:P.grey600, fontFamily:font, lineHeight:1.6, marginBottom:"16px" }}>
              {flaggedWithEmail.length > 0
                ? "GroupGrid drafted a personalized email for each flagged guest, explaining exactly what's missing or mismatched. Review them, then send."
                : "When a cross-check turns up flagged guests with an email on file, you'll be able to review and send personalized messages here."}
            </div>
            <div style={{ display:"flex", gap:"10px", marginBottom:"18px", flexWrap:"wrap" }}>
              {[
                { n: flaggedWithEmail.length, l:"flagged, with email", c:P.amber },
                { n: (results||[]).filter(r=>!r.email&&r.issues.length>0).length, l:"flagged, no email", c:P.grey400 },
                { n: (results||[]).length, l:"total guests", c:P.periwinkleD },
              ].map(({n,l,c}) => (
                <div key={l} style={{ display:"flex", alignItems:"center", gap:"8px", background:P.grey50, border:`1px solid ${P.grey100}`, borderRadius:"10px", padding:"8px 13px" }}>
                  <span style={{ fontSize:"17px", fontWeight:600, color:c, fontFamily:font }}>{n}</span>
                  <span style={{ fontSize:"12px", color:P.grey600, fontFamily:font }}>{l}</span>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"16px", flexWrap:"wrap" }}>
              {flaggedWithEmail.length > 0
                ? <button onClick={buildQueue} style={{ background:P.accent, color:P.white, border:"none", borderRadius:"11px", padding:"12px 24px", fontSize:"14px", fontWeight:600, fontFamily:font, cursor:"pointer" }}>Review &amp; send {flaggedWithEmail.length} message{flaggedWithEmail.length!==1?"s":""} <Mail size={14} strokeWidth={2} style={{verticalAlign:"-2px",marginLeft:"2px"}}/></button>
                : <span style={{ fontSize:"13px", color:P.grey400, fontFamily:font }}>Run a cross-check to generate messages.</span>}
              <button onClick={() => setShowTemplateConfig(v=>!v)} style={{ background:"transparent", border:"none", color:P.periwinkleD, fontSize:"13px", fontWeight:500, fontFamily:font, cursor:"pointer" }}>{showTemplateConfig ? "Hide send settings" : "Send settings"}</button>
            </div>
          </div>
          {queue && <button onClick={() => setActiveView("queue")} style={{ background:"transparent", border:"none", color:P.periwinkleD, fontSize:"13px", fontWeight:500, fontFamily:font, cursor:"pointer", marginBottom:"14px" }}>← Back to your send queue ({pendingCount} pending)</button>}
        </>
      )}

      {/* Queue-view actions bar */}
      {activeView === "queue" && queue && (
        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"16px", flexWrap:"wrap" }}>
          <button onClick={() => setActiveView("templates")} style={{ background:P.white, color:P.grey600, border:`1px solid ${P.grey100}`, borderRadius:"8px", padding:"7px 14px", fontSize:"13px", fontWeight:500, fontFamily:font, cursor:"pointer" }}>← Back</button>
          <div style={{ fontSize:"13px", color:P.grey600, fontFamily:font }}>{sentCount} sent · {skippedCount} skipped · {pendingCount} pending</div>
          {sendMsg && <span style={{ fontSize:"13px", color:P.green, fontWeight:600, fontFamily:font }}>{sendMsg}</span>}
          {pendingCount > 0 && <div style={{ marginLeft:"auto", display:"flex", gap:"8px" }}>
            <button onClick={() => {
              const text = (queue||[]).filter(x=>x.status==="pending").map(item =>
                `TO: ${item.to}\nSUBJECT: ${item.subject}\n\n${item.body}\n\n${"─".repeat(60)}`
              ).join("\n\n");
              navigator.clipboard?.writeText(text).then(() => {});
              const blob = new Blob([text], {type:"text/plain"});
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
              a.download = `groupgrid-email-queue-${new Date().toISOString().slice(0,10)}.txt`; a.click();
            }} style={{ background:P.white, color:P.periwinkleD, border:`1px solid ${P.grey200}`, borderRadius:"8px", padding:"7px 14px", fontSize:"13px", fontWeight:500, fontFamily:font, cursor:"pointer" }}>Download .txt <Download size={13} strokeWidth={2} style={{verticalAlign:"-2px"}}/></button>
            <button onClick={sendAll} style={{ background:P.accent, color:P.white, border:"none", borderRadius:"8px", padding:"7px 16px", fontSize:"13px", fontWeight:600, fontFamily:font, cursor:"pointer" }}>Open all {pendingCount} in mail app <Mail size={13} strokeWidth={2} style={{verticalAlign:"-2px"}}/></button>
          </div>}
        </div>
      )}

      {/* TEMPLATES VIEW */}
      {activeView === "templates" && showTemplateConfig && (
        <>
          {/* Send mode selector */}
          <div style={{ background:P.white, borderRadius:"10px", padding:"16px 20px", border:`1px solid ${P.grey100}`, marginBottom:"20px", display:"flex", alignItems:"center", gap:"20px" }}>
            <div>
              <div style={{ fontSize:"15px", fontWeight:600, color:P.navy }}>Send Mode</div>
              <div style={{ fontSize:"13px", color:P.navyLight, marginTop:"2px" }}>Controls how emails are handled when the queue is built</div>
            </div>
            <div style={{ display:"flex", gap:"8px", marginLeft:"auto" }}>
              {[
                { k:"manual", l:"✋ Manual", sub:"You open each email individually" },
                { k:"review", l:"👁 Review First", sub:"Preview every email before sending" },
                { k:"auto", l:"⚡ Build & Send", sub:"Open all in mail app at once" },
              ].map(({k,l,sub}) => (
                <button key={k} onClick={() => setSendMode(k)} style={{ background:sendMode===k?P.navy:P.offWhite, color:sendMode===k?P.white:P.grey600, border:`1px solid ${sendMode===k?P.navy:P.grey100}`, borderRadius:"8px", padding:"9px 14px", cursor:"pointer", textAlign:"left", fontFamily:font }}>
                  <div style={{ fontSize:"14px", fontWeight:500, color:sendMode===k?P.white:P.navy }}>{l}</div>
                  <div style={{ fontSize:"15px", color:sendMode===k?"rgba(255,255,255,0.6)":P.grey400, marginTop:"2px", maxWidth:"140px" }}>{sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px", marginBottom:"20px" }}>
            {[
              { label:"Guests with Email", val: guestsWithEmail.length, sub:`of ${(results||[]).length} total guests`, color:P.periwinkleD },
              { label:"Need a Message", val: flaggedWithEmail.length, sub:"flagged guests with email on file", color:P.amber },
              { label:"No Email on File", val: (results||[]).filter(r=>!r.email&&r.issues.length>0).length, sub:"flagged guests — manual follow-up needed", color:P.navyLight },
            ].map(({label,val,sub,color}) => (
              <div key={label} style={{ background:P.white, borderRadius:"8px", padding:"12px 16px", border:`1px solid ${P.grey100}` }}>
                <div style={{ fontSize:"22px", fontWeight:600, color, fontFamily:font }}>{val}</div>
                <div style={{ fontSize:"13px", fontWeight:600, color:P.navy, marginTop:"3px" }}>{label}</div>
                <div style={{ fontSize:"12px", color:P.navyLight, marginTop:"2px" }}>{sub}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Templates grid — always visible (templates list is core, not a setting) */}
      {activeView === "templates" && (
        <>
          {/* Templates grid */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
            <div style={{ fontSize:"14px", fontWeight:600, color:P.navy }}>Email Templates</div>
            <Btn onClick={() => setNewTemplateOpen(true)} outline color={P.periwinkleD} small>New Template <Plus size={12} strokeWidth={2} style={{verticalAlign:"-2px"}}/></Btn>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
            {Object.values(templates).map(tmpl => {
              const applicable = (results||[]).filter(r => r.email && (getApplicableTemplates(r).includes(tmpl.id) || getCustomApplicable(r, tmpl)));
              const isCustomized = !tmpl.isCustom && JSON.stringify(tmpl) !== JSON.stringify(DEFAULT_TEMPLATES[tmpl.id]);
              return (
                <div key={tmpl.id} style={{ background:P.white, borderRadius:"10px", border:`1px solid ${P.grey100}`, padding:"16px 20px" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"10px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                      <div style={{ width:36, height:36, borderRadius:"10px", background:tmpl.color+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", flexShrink:0 }}>{tmpl.icon}</div>
                      <div>
                        <div style={{ fontSize:"15px", fontWeight:600, color:P.navy }}>{tmpl.label}</div>
                        <div style={{ fontSize:"13px", color:P.navyLight, marginTop:"2px" }}>{tmpl.description}</div>
                      </div>
                    </div>
                    {isCustomized && <span style={{ background:P.periwinkle+"22", color:P.periwinkleD, fontSize:"12px", fontWeight:500, padding:"2px 8px", borderRadius:"20px", flexShrink:0, marginLeft:"8px" }}>Edited</span>}
                    {tmpl.isCustom && <span style={{ background:P.periwinkleD+"18", color:P.periwinkleD, fontSize:"12px", fontWeight:500, padding:"2px 8px", borderRadius:"20px", flexShrink:0, marginLeft:"4px" }}>Custom</span>}
                  </div>
                  <div style={{ background:P.offWhite, borderRadius:"8px", padding:"10px 12px", marginBottom:"12px" }}>
                    <div style={{ fontSize:"11px", fontWeight:500, color:P.grey400, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"4px" }}>Subject preview</div>
                    <div style={{ fontSize:"14px", color:P.navy, fontWeight:600 }}>{tmpl.subject.replace(/\{\{[^}]+\}\}/g, "…")}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                      {applicable.length > 0
                        ? <span style={{ background:tmpl.color+"18", color:tmpl.color, fontSize:"12px", fontWeight:500, padding:"3px 10px", borderRadius:"20px" }}>Applies to {applicable.length} guest{applicable.length!==1?"s":""}</span>
                        : <span style={{ background:P.grey50, color:P.navyLight, fontSize:"12px", fontWeight:500, padding:"3px 10px", borderRadius:"20px" }}>No guests currently</span>}
                    </div>
                    <div style={{ display:"flex", gap:"6px" }}>
                      {tmpl.isCustom && (
                        <Btn onClick={() => { if (window.confirm(`Delete "${tmpl.label}"?`)) deleteTemplate(tmpl.id); }} outline small color={P.red}>Delete <Trash2 size={12} strokeWidth={2} style={{verticalAlign:"-2px"}}/></Btn>
                      )}
                      <Btn onClick={() => startEdit(tmpl.id)} outline small color={P.periwinkleD}>Edit <Pencil size={12} strokeWidth={2} style={{verticalAlign:"-2px"}}/></Btn>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* QUEUE VIEW */}
      {activeView === "queue" && (
        <>
          {!queue && (
            <div style={{ background:P.white, borderRadius:"10px", padding:"40px", textAlign:"center", border:`1px solid ${P.grey100}` }}>
              <div style={{ fontSize:"32px", marginBottom:"12px" }}>📤</div>
              <div style={{ fontSize:"15px", fontWeight:800, color:P.navy, marginBottom:"6px" }}>No queue yet</div>
              <div style={{ fontSize:"15px", color:P.navyLight, marginBottom:"20px" }}>Go to Templates and click "Build Send Queue" to generate personalized emails for all flagged guests.</div>
              <Btn onClick={() => setActiveView("templates")}>Go to Templates</Btn>
            </div>
          )}

          {queue && queue.length === 0 && (
            <div style={{ background:P.white, borderRadius:"10px", padding:"40px", textAlign:"center", border:`1px solid ${P.grey100}` }}>
              <div style={{ fontSize:"32px", marginBottom:"12px" }}>✅</div>
              <div style={{ fontSize:"15px", fontWeight:800, color:P.green, marginBottom:"6px" }}>No emails to send</div>
              <div style={{ fontSize:"15px", color:P.navyLight }}>Either no guests have flags, or no flagged guests have email addresses on file.</div>
            </div>
          )}

          {queue && queue.length > 0 && (() => {
            const pendingItems = queue.filter(x => x.status === "pending");
            const allChecked = pendingItems.length > 0 && pendingItems.every(x => checkedIds.has(x.id));
            const someChecked = pendingItems.some(x => checkedIds.has(x.id));
            const checkedPending = pendingItems.filter(x => checkedIds.has(x.id));
            const hasHotelContact = !!contacts?.hotel?.email;
            const hasTravelContact = !!contacts?.travel?.email;

            return (
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>

              {/* ── Bulk Send Toolbar ── */}
              <div style={{ background:P.white, border:`1px solid ${someChecked ? P.periwinkle+"66" : P.grey100}`, borderRadius:"10px", padding:"12px 16px", display:"flex", alignItems:"center", gap:"14px", flexWrap:"wrap", transition:"border-color 0.2s" }}>
                {/* Select all checkbox */}
                <label style={{ display:"flex", alignItems:"center", gap:"8px", cursor:"pointer", flexShrink:0 }}>
                  <div onClick={toggleCheckAll} style={{ width:20, height:20, borderRadius:"6px", border:`2px solid ${allChecked ? P.periwinkleD : someChecked ? P.periwinkle : P.grey200}`, background:allChecked ? P.periwinkleD : someChecked ? P.periwinkle+"33" : P.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.15s", flexShrink:0 }}>
                    {allChecked && <span style={{ color:P.white, fontSize:"14px", lineHeight:1, fontWeight:900 }}>✓</span>}
                    {!allChecked && someChecked && <span style={{ color:P.periwinkleD, fontSize:"15px", lineHeight:1, fontWeight:900 }}>—</span>}
                  </div>
                  <span style={{ fontSize:"14px", fontWeight:700, color:P.navy, fontFamily:font }}>
                    {someChecked ? `${checkedPending.length} selected` : `Select all (${pendingItems.length} pending)`}
                  </span>
                </label>

                <div style={{ width:1, height:28, background:P.grey100, flexShrink:0 }} />

                {/* Send to selector */}
                <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
                  <span style={{ fontSize:"15px", fontWeight:700, color:P.navyLight, fontFamily:font, flexShrink:0 }}>Send to:</span>
                  {[
                    { k:"guest",   l:"Guest",          available: true },
                    { k:"hotel",   l: hasHotelContact ? (contacts.hotel.name || "Hotel Contact") : "Hotel Contact",   available: hasHotelContact },
                    { k:"travel",  l: hasTravelContact ? (contacts.travel.name || "Travel Contact") : "Travel Contact", available: hasTravelContact },
                    { k:"all",     l:"All Three",       available: hasHotelContact && hasTravelContact },
                  ].map(({ k, l, available }) => (
                    <button key={k} onClick={() => available && setBulkRecipient(k)}
                      title={!available ? "Add this contact first" : ""}
                      style={{ background:bulkRecipient===k ? P.navy : available ? P.offWhite : P.grey50, color:bulkRecipient===k ? P.white : available ? P.navy : P.grey300, border:`1.5px solid ${bulkRecipient===k ? P.navy : available ? P.grey200 : P.grey100}`, borderRadius:"8px", padding:"5px 12px", fontSize:"15px", fontWeight:800, fontFamily:font, cursor:available?"pointer":"not-allowed", transition:"all 0.15s", opacity: available ? 1 : 0.5 }}>
                      {l}
                      {!available && <span style={{ fontSize:"14px", marginLeft:"4px" }}>⚠</span>}
                    </button>
                  ))}
                </div>

                <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                  {sendMsg && <span style={{ fontSize:"14px", color:P.green, fontWeight:700 }}>{sendMsg}</span>}
                  {unsavedCount > 0 && (
                    <button onClick={saveAllEdits}
                      style={{ background:P.amber+"18", border:`1.5px solid ${P.amber}66`, borderRadius:"9px", padding:"7px 14px", fontSize:"13px", fontWeight:800, fontFamily:font, color:P.amber, cursor:"pointer", display:"flex", alignItems:"center", gap:"6px" }}>
                      💾 Save All Edits ({unsavedCount})
                    </button>
                  )}
                  {checkedPending.length > 0 ? (
                    <button onClick={bulkSendChecked}
                      style={{ background:`linear-gradient(135deg, ${P.periwinkleD}, ${P.periwinkle})`, border:"none", borderRadius:"10px", padding:"9px 20px", fontSize:"15px", fontWeight:800, fontFamily:font, color:P.white, cursor:"pointer", boxShadow:"0 3px 12px rgba(91,109,184,0.4)", display:"flex", alignItems:"center", gap:"8px" }}>
                      Send {checkedPending.length} Email{checkedPending.length !== 1 ? "s" : ""}
                      <span style={{ background:"rgba(255,255,255,0.25)", borderRadius:"6px", padding:"1px 7px", fontSize:"15px" }}>
                        {bulkRecipient === "all" ? "× 3 recipients" : `to ${bulkRecipient === "guest" ? "Guests" : bulkRecipient === "hotel" ? (contacts?.hotel?.name || "Hotel") : (contacts?.travel?.name || "Travel")}`}
                      </span>
                    </button>
                  ) : (
                    <span style={{ fontSize:"15px", color:P.navyLight, fontFamily:font }}>Select emails above to bulk send</span>
                  )}
                </div>
              </div>

              {/* ── Queue Items ── */}
              {queue.map((item, idx) => {
                const tmpl = templates[item.templateId];
                const isActive = reviewIdx === idx;
                const isChecked = checkedIds.has(item.id);
                return (
                  <div key={item.id} style={{ background:P.white, borderRadius:"16px", border:`1.5px solid ${item.status==="sent"?P.green+"44":item.status==="skipped"?P.grey200:isChecked?P.periwinkle+"88":isActive?P.periwinkle+"55":P.grey100}`, overflow:"hidden", opacity:item.status==="skipped"?0.55:1, transition:"border-color 0.15s" }}>
                    {/* Queue item header */}
                    <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"14px 18px" }}>
                      {/* Checkbox — only for pending items */}
                      {item.status === "pending" ? (
                        <div onClick={() => toggleCheck(item.id)} style={{ width:20, height:20, borderRadius:"6px", border:`2px solid ${isChecked ? P.periwinkleD : P.grey200}`, background:isChecked ? P.periwinkleD : P.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.15s", flexShrink:0 }}>
                          {isChecked && <span style={{ color:P.white, fontSize:"14px", lineHeight:1, fontWeight:900 }}>✓</span>}
                        </div>
                      ) : (
                        <div style={{ width:20, height:20, flexShrink:0 }} />
                      )}
                      <div onClick={() => setReviewIdx(isActive ? -1 : idx)} style={{ display:"flex", alignItems:"center", gap:"12px", flex:1, minWidth:0, cursor:"pointer" }}>
                        <div style={{ width:34, height:34, borderRadius:"9px", background:item.status==="sent"?P.greenLight:item.status==="skipped"?P.grey50:tmpl.color+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", flexShrink:0 }}>
                          {item.status==="sent"?"✓":item.status==="skipped"?"—":tmpl.icon}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                            <span style={{ fontWeight:800, fontSize:"15px", color:P.navy }}>{item.record.displayName}</span>
                            <span style={{ fontSize:"15px", color:P.navyLight }}>{item.to}</span>
                            <span style={{ background:tmpl.color+"18", color:tmpl.color, fontSize:"15px", fontWeight:700, padding:"1px 8px", borderRadius:"20px" }}>{tmpl.label}</span>
                            {item.status==="sent" && <span style={{ background:P.greenLight, color:P.green, fontSize:"15px", fontWeight:800, padding:"1px 8px", borderRadius:"20px" }}>✓ Sent</span>}
                            {item.status==="skipped" && <span style={{ background:P.grey50, color:P.navyLight, fontSize:"15px", fontWeight:800, padding:"1px 8px", borderRadius:"20px" }}>Skipped</span>}
                            {editedIds.has(item.id) && item.status==="pending" && <span style={{ background:P.amber+"22", color:P.amber, fontSize:"15px", fontWeight:800, padding:"1px 8px", borderRadius:"20px" }}>Edited</span>}
                            {hasUnsavedEdits(item.id) && <span style={{ background:P.amber+"22", color:P.amber, fontSize:"13px", fontWeight:800, padding:"1px 8px", borderRadius:"20px" }}>⚠ Unsaved</span>}
                          </div>
                          <div style={{ fontSize:"14px", color:P.navy, marginTop:"2px", fontWeight:600 }}>{item.subject}</div>
                        </div>
                      </div>
                      {item.status === "pending" && (
                        <div style={{ display:"flex", gap:"6px", flexShrink:0 }}>
                          <Btn onClick={e => { e.stopPropagation(); openMailto(item); }} small color={P.navy}>Open in Mail ↗</Btn>
                          <Btn onClick={e => { e.stopPropagation(); markSkipped(item.id); }} small outline color={P.grey400}>Skip</Btn>
                        </div>
                      )}
                      {item.status === "sent" && (
                        <Btn onClick={e => { e.stopPropagation(); updateQueueItem(item.id, {status:"pending"}); setSentIds(prev => { const n = new Set(prev); n.delete(item.id); return n; }); }} small outline color={P.grey400}>Undo</Btn>
                      )}
                    </div>

                    {/* Expanded edit panel */}
                    {isActive && item.status === "pending" && (
                      <div style={{ borderTop:`1px solid ${P.grey100}`, padding:"18px 20px", background:P.grey50 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
                          <div style={{ fontSize:"14px", fontWeight:800, color:P.navy }}>
                            Edit Email
                            {editedIds.has(item.id) && <span style={{ marginLeft:"8px", background:P.amber+"22", color:P.amber, fontSize:"15px", fontWeight:800, padding:"2px 8px", borderRadius:"20px" }}>Edited — will use your version on bulk send</span>}
                          </div>
                          {editedIds.has(item.id) && (
                            <button onClick={() => resetToOriginal(item)} style={{ background:"transparent", border:`1px solid ${P.grey200}`, borderRadius:"7px", padding:"4px 10px", fontSize:"15px", fontWeight:700, color:P.grey500||P.grey400, fontFamily:font, cursor:"pointer" }}>
                              Reset to original
                            </button>
                          )}
                        </div>

                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
                          <div>
                            <div style={{ fontSize:"15px", fontWeight:700, color:P.navy, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px" }}>To</div>
                            <input value={getStagedField(item, "to")} onChange={e => stageEdit(item.id, "to", e.target.value)}
                              style={{ width:"100%", background:P.white, border:`1.5px solid ${localEdits[item.id]?.to !== undefined ? P.amber+"88" : P.grey200}`, borderRadius:"9px", padding:"8px 12px", fontSize:"14px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
                          </div>
                          <div>
                            <div style={{ fontSize:"15px", fontWeight:700, color:P.navy, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px" }}>Subject</div>
                            <input value={getStagedField(item, "subject")} onChange={e => stageEdit(item.id, "subject", e.target.value)}
                              style={{ width:"100%", background:P.white, border:`1.5px solid ${localEdits[item.id]?.subject !== undefined ? P.amber+"88" : P.grey200}`, borderRadius:"9px", padding:"8px 12px", fontSize:"14px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
                          </div>
                        </div>

                        <div style={{ marginBottom:"12px" }}>
                          <div style={{ fontSize:"15px", fontWeight:700, color:P.navy, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px" }}>Email Body</div>
                          <textarea value={getStagedField(item, "body")} onChange={e => stageEdit(item.id, "body", e.target.value)}
                            style={{ width:"100%", height:"240px", background:P.white, border:`1.5px solid ${localEdits[item.id]?.body !== undefined ? P.amber+"88" : P.grey200}`, borderRadius:"10px", padding:"12px 14px", fontSize:"14px", fontFamily:font, color:P.navy, resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.7 }} />
                        </div>

                        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                          {hasUnsavedEdits(item.id) ? (
                            <button onClick={() => { saveEdits(item.id); setReviewIdx(-1); }}
                              style={{ background:P.green, border:"none", borderRadius:"10px", padding:"9px 20px", fontSize:"14px", fontWeight:800, fontFamily:font, color:P.white, cursor:"pointer", boxShadow:"0 2px 8px rgba(34,197,94,0.3)", display:"flex", alignItems:"center", gap:"7px" }}>
                              ✓ Save Changes
                            </button>
                          ) : (
                            <button onClick={() => openMailto({ ...item, to: getStagedField(item,"to"), subject: getStagedField(item,"subject"), body: getStagedField(item,"body") })}
                              style={{ background:P.navy, border:"none", borderRadius:"10px", padding:"9px 20px", fontSize:"14px", fontWeight:800, fontFamily:font, color:P.white, cursor:"pointer" }}>
                              Open in Mail App ↗
                            </button>
                          )}
                          {hasUnsavedEdits(item.id) && (
                            <button onClick={() => openMailto({ ...item, to: getStagedField(item,"to"), subject: getStagedField(item,"subject"), body: getStagedField(item,"body") })}
                              style={{ background:"transparent", border:`1.5px solid ${P.navy}`, borderRadius:"10px", padding:"9px 20px", fontSize:"14px", fontWeight:800, fontFamily:font, color:P.navy, cursor:"pointer" }}>
                              Send without saving ↗
                            </button>
                          )}
                          <Btn onClick={() => markSkipped(item.id)} outline color={P.grey400}>Skip</Btn>
                          {hasUnsavedEdits(item.id) && <span style={{ fontSize:"15px", color:P.amber, fontFamily:font, fontWeight:700 }}>⚠ Save to include in bulk send — or use "Save All Edits" above</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
          })()}
        </>
      )}
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding:"40px", fontFamily:"'Manrope',sans-serif", maxWidth:"600px", margin:"40px auto" }}>
          <div style={{ background:"#FDEAEA", border:"1.5px solid #C53B3B44", borderRadius:"16px", padding:"24px" }}>
            <div style={{ fontSize:"16px", fontWeight:900, color:"#C53B3B", marginBottom:"8px" }}><AlertTriangle size={16} style={{display:"inline",marginRight:6,verticalAlign:"middle"}}/>Something went wrong</div>
            <div style={{ fontSize:"15px", color:"#1B2A4A", fontWeight:600, marginBottom:"12px" }}>Error details (copy these to report the issue):</div>
            <pre style={{ background:"white", borderRadius:"10px", padding:"12px", fontSize:"15px", color:"#C53B3B", overflowX:"auto", whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
              {this.state.error?.message}{"\n\n"}{this.state.error?.stack}
            </pre>
            <button onClick={() => this.setState({error:null})} style={{ marginTop:"14px", background:"#1B2A4A", color:"white", border:"none", borderRadius:"10px", padding:"8px 20px", fontSize:"14px", fontWeight:800, fontFamily:"'Manrope',sans-serif", cursor:"pointer" }}>Try Again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Login Panel (slide-in drawer) ────────────────────────────────────────────
function LoginPanel({ onLogin, onClose }) {
  const [mode, setMode]         = useState("signin"); // "signin" | "signup" | "reset"
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [focused, setFocused]   = useState("");

  function clearForm() { setError(""); setSuccess(""); }

  async function handleSignIn(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError("Please enter your email and password."); return; }
    clearForm(); setLoading(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Auth not available. Please refresh and try again.");
      const { data, error: sbErr } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (sbErr) throw sbErr;
      onLogin({ email: data.user.email, name: data.user.user_metadata?.name || data.user.email.split("@")[0], id: data.user.id });
    } catch (err) {
      setError(err.message === "Invalid login credentials" ? "Incorrect email or password. Please try again." : err.message);
    } finally { setLoading(false); }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    clearForm(); setLoading(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Auth not available. Please refresh and try again.");
      const { data, error: sbErr } = await sb.auth.signUp({
        email: email.trim(), password,
        options: { data: { name: name.trim() } }
      });
      if (sbErr) throw sbErr;
      if (data.user && !data.session) {
        // Email confirmation required
        setSuccess("Check your inbox! We sent a confirmation link to " + email.trim() + ". Click it to activate your account.");
      } else if (data.session) {
        // Auto-confirmed (email confirm disabled in Supabase)
        onLogin({ email: data.user.email, name: name.trim(), id: data.user.id });
      }
    } catch (err) {
      setError(err.message.includes("already registered") ? "An account with this email already exists. Try signing in." : err.message);
    } finally { setLoading(false); }
  }

  async function handleReset(e) {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address."); return; }
    clearForm(); setLoading(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Auth not available. Please refresh and try again.");
      const { error: sbErr } = await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin
      });
      if (sbErr) throw sbErr;
      setSuccess("Password reset link sent to " + email.trim() + ". Check your inbox.");
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  const inputStyle = (field) => ({
    width:"100%", background:"rgba(255,255,255,0.07)", border:`1.5px solid ${focused===field ? P.periwinkle : "rgba(255,255,255,0.12)"}`,
    borderRadius:"12px", padding:"12px 14px", fontSize:"15px", fontFamily:font, fontWeight:600,
    color:P.white, outline:"none", boxSizing:"border-box", transition:"border-color 0.2s", caretColor:P.periwinkleL
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", fontFamily:font }}>

      {/* Header */}
      <div style={{ padding:"24px 28px 20px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center" }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 52" width="96" height="24" style={{display:"block"}}>
            <defs>
              <linearGradient id="ggTealLP" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00C9B1"/><stop offset="100%" stopColor="#00A896"/>
              </linearGradient>
            </defs>
            <g transform="translate(2,2)">
              <rect x="0" y="0" width="48" height="48" rx="10" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
              {[9,19,29,39].map(cx => [9,19,29,39].map(cy => {
                const isTeal = (cx===29&&cy===19)||(cx===39&&cy===19)||(cx===19&&cy===29)||(cx===29&&cy===29)||(cx===39&&cy===29)||(cx===9&&cy===39)||(cx===19&&cy===39)||(cx===29&&cy===39)||(cx===39&&cy===39);
                const op = isTeal ? (cx+cy)/80 : 0.18;
                return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill={isTeal?"url(#ggTealLP)":`rgba(255,255,255,${op})`} opacity={isTeal?op:1}/>;
              }))}
            </g>
            <text x="62" y="36" fontFamily="'Manrope', sans-serif" fontSize="26" fontWeight="700" fill="white">Group</text>
            <text x="144" y="36" fontFamily="'Manrope', sans-serif" fontSize="26" fontWeight="300" fill="#00C9B1">Grid</text>
          </svg>
        </div>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"10px", width:32, height:32, cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15} strokeWidth={2}/></button>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:"auto", padding:"32px 28px" }}>

        {/* Mode tabs */}
        {mode !== "reset" && (
          <div style={{ display:"flex", background:"rgba(255,255,255,0.06)", borderRadius:"10px", padding:"3px", gap:"2px", marginBottom:"28px" }}>
            {[["signin","Sign In"],["signup","Create Account"]].map(([k,l]) => (
              <button key={k} onClick={() => { setMode(k); clearForm(); }}
                style={{ flex:1, padding:"8px", borderRadius:"8px", border:"none", cursor:"pointer", fontFamily:font, fontSize:"13px", fontWeight:700, transition:"all 0.15s", background:mode===k?"rgba(255,255,255,0.12)":"transparent", color:mode===k?P.white:"rgba(255,255,255,0.4)" }}>
                {l}
              </button>
            ))}
          </div>
        )}

        {/* Heading */}
        <div style={{ marginBottom:"24px" }}>
          <div style={{ fontSize:"22px", fontWeight:900, color:P.white, marginBottom:"6px" }}>
            {mode==="signin" ? "Welcome back" : mode==="signup" ? "Create your account" : "Reset your password"}
          </div>
          <div style={{ fontSize:"14px", color:"rgba(255,255,255,0.4)", lineHeight:1.5 }}>
            {mode==="signin" ? "Sign in to access your saved projects and event history." :
             mode==="signup" ? "Save projects, sync across devices, and access your event history." :
             "Enter your email and we'll send you a reset link."}
          </div>
        </div>

        {/* Success message */}
        {success && (
          <div style={{ background:"rgba(0,201,177,0.12)", border:"1px solid rgba(0,201,177,0.3)", borderRadius:"10px", padding:"12px 14px", fontSize:"14px", color:P.accent, fontWeight:600, marginBottom:"20px", lineHeight:1.5 }}>
            ✓ {success}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ background:"rgba(197,59,59,0.15)", border:"1px solid rgba(197,59,59,0.35)", borderRadius:"10px", padding:"10px 14px", fontSize:"14px", color:"#F08080", fontWeight:700, marginBottom:"20px" }}>
            ⚠ {error}
          </div>
        )}

        {/* Sign In form */}
        {mode === "signin" && !success && (
          <form onSubmit={handleSignIn} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div>
              <label style={{ display:"block", fontSize:"12px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"7px" }}>Email</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} onFocus={() => setFocused("email")} onBlur={() => setFocused("")} placeholder="you@company.com" style={inputStyle("email")} />
            </div>
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"7px" }}>
                <label style={{ fontSize:"12px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.07em" }}>Password</label>
                <button type="button" onClick={() => { setMode("reset"); clearForm(); }} style={{ background:"transparent", border:"none", color:P.periwinkleL, fontSize:"13px", fontWeight:700, cursor:"pointer", padding:0 }}>Forgot password?</button>
              </div>
              <div style={{ position:"relative" }}>
                <input type={showPw?"text":"password"} value={password} onChange={e => { setPassword(e.target.value); setError(""); }} onFocus={() => setFocused("password")} onBlur={() => setFocused("")} placeholder="••••••••" style={{ ...inputStyle("password"), paddingRight:"42px" }} />
                <button type="button" onClick={() => setShowPw(s => !s)} style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", color:"rgba(255,255,255,0.3)", cursor:"pointer", fontSize:"15px", padding:0 }}>{showPw?"🙈":"👁"}</button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ width:"100%", background:loading?"rgba(91,109,184,0.5)":`linear-gradient(135deg, ${P.periwinkleD}, ${P.periwinkle})`, border:"none", borderRadius:"10px", padding:"13px", fontSize:"15px", fontWeight:700, fontFamily:font, color:P.white, cursor:loading?"wait":"pointer", marginTop:"4px", boxShadow:loading?"none":"0 2px 12px rgba(69,87,176,0.28)", transition:"all 0.2s" }}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>
        )}

        {/* Sign Up form */}
        {mode === "signup" && !success && (
          <form onSubmit={handleSignUp} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div>
              <label style={{ display:"block", fontSize:"12px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"7px" }}>Your Name</label>
              <input type="text" value={name} onChange={e => { setName(e.target.value); setError(""); }} onFocus={() => setFocused("name")} onBlur={() => setFocused("")} placeholder="First Name Last Name" style={inputStyle("name")} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:"12px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"7px" }}>Email</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} onFocus={() => setFocused("email")} onBlur={() => setFocused("")} placeholder="you@company.com" style={inputStyle("email")} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:"12px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"7px" }}>Password <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(min. 8 characters)</span></label>
              <div style={{ position:"relative" }}>
                <input type={showPw?"text":"password"} value={password} onChange={e => { setPassword(e.target.value); setError(""); }} onFocus={() => setFocused("password")} onBlur={() => setFocused("")} placeholder="Create a strong password" style={{ ...inputStyle("password"), paddingRight:"42px" }} />
                <button type="button" onClick={() => setShowPw(s => !s)} style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", color:"rgba(255,255,255,0.3)", cursor:"pointer", fontSize:"15px", padding:0 }}>{showPw?"🙈":"👁"}</button>
              </div>
              {password.length > 0 && password.length < 8 && (
                <div style={{ fontSize:"12px", color:"rgba(197,59,59,0.8)", marginTop:"5px" }}>Password too short ({password.length}/8)</div>
              )}
            </div>
            <button type="submit" disabled={loading}
              style={{ width:"100%", background:loading?"rgba(0,201,177,0.3)":P.accent, border:"none", borderRadius:"10px", padding:"13px", fontSize:"15px", fontWeight:700, fontFamily:font, color:P.white, cursor:loading?"wait":"pointer", marginTop:"4px", boxShadow:loading?"none":"0 2px 12px rgba(0,201,177,0.3)", transition:"all 0.2s" }}>
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>
        )}

        {/* Password Reset form */}
        {mode === "reset" && !success && (
          <form onSubmit={handleReset} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div>
              <label style={{ display:"block", fontSize:"12px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"7px" }}>Email Address</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} onFocus={() => setFocused("email")} onBlur={() => setFocused("")} placeholder="you@company.com" style={inputStyle("email")} />
            </div>
            <button type="submit" disabled={loading}
              style={{ width:"100%", background:loading?"rgba(91,109,184,0.5)":`linear-gradient(135deg, ${P.periwinkleD}, ${P.periwinkle})`, border:"none", borderRadius:"10px", padding:"13px", fontSize:"15px", fontWeight:700, fontFamily:font, color:P.white, cursor:loading?"wait":"pointer", boxShadow:loading?"none":"0 2px 12px rgba(69,87,176,0.28)", transition:"all 0.2s" }}>
              {loading ? "Sending…" : "Send Reset Link →"}
            </button>
            <button type="button" onClick={() => { setMode("signin"); clearForm(); }}
              style={{ background:"transparent", border:"none", color:"rgba(255,255,255,0.35)", fontSize:"14px", fontWeight:600, cursor:"pointer", fontFamily:font, padding:"4px" }}>
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* What you get when signed in */}
        {mode !== "reset" && !success && (
          <div style={{ marginTop:"32px" }}>
            <div style={{ fontSize:"12px", fontWeight:800, color:"rgba(255,255,255,0.25)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"14px" }}>When signed in you get</div>
            {[
              { icon:<FileSpreadsheet size={14} strokeWidth={1.5}/>, label:"Save & restore projects across sessions" },
              { icon:<Mail size={14} strokeWidth={1.5}/>, label:"Custom email templates saved to your account" },
              { icon:<Users size={14} strokeWidth={1.5}/>, label:"Contacts & planner preferences synced" },
              { icon:<BarChart2 size={14} strokeWidth={1.5}/>, label:"Event history and past cross-checks" },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px" }}>
                <div style={{ width:30, height:30, borderRadius:"9px", background:"rgba(123,143,212,0.15)", border:"1px solid rgba(123,143,212,0.25)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{icon}</div>
                <span style={{ fontSize:"14px", color:"rgba(255,255,255,0.45)", fontWeight:600, lineHeight:1.4 }}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding:"16px 28px", borderTop:"1px solid rgba(255,255,255,0.07)", flexShrink:0 }}>
        <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.18)", textAlign:"center" }}>© 2026 GroupGrid · Built for event professionals</div>
      </div>
    </div>
  );
}



// ── Static Pages ─────────────────────────────────────────────────────────────
function PageShell({ title, onBack, children }) {
  return (
    <div style={{ minHeight:"100vh", background:P.offWhite, fontFamily:font }}>
      <div style={{ background:P.navy, padding:"0 32px", height:"52px", display:"flex", alignItems:"center", gap:"16px", boxShadow:"0 1px 0 rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"8px", padding:"5px 12px", color:"rgba(255,255,255,0.7)", fontSize:"13px", fontFamily:font, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:"6px" }}>← Back</button>
        <span style={{ color:P.white, fontSize:"15px", fontWeight:700, fontFamily:font }}>{title}</span>
      </div>
      <div style={{ maxWidth:"760px", margin:"0 auto", padding:"48px 28px" }}>
        {children}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:"36px" }}>
      <h2 style={{ fontSize:"18px", fontWeight:800, color:P.navy, fontFamily:font, margin:"0 0 12px", letterSpacing:"-0.02em" }}>{title}</h2>
      <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, lineHeight:1.8 }}>{children}</div>
    </div>
  );
}

function TermsPage({ onBack }) {
  return (
    <PageShell title="Terms of Service" onBack={onBack}>
      <div style={{ marginBottom:"40px" }}>
        <h1 style={{ fontSize:"32px", fontWeight:900, color:P.navy, fontFamily:font, margin:"0 0 8px", letterSpacing:"-0.03em" }}>Terms of Service</h1>
        <p style={{ fontSize:"14px", color:P.grey400, fontFamily:font, margin:"0 0 16px" }}>Last updated: February 2026</p>
        <p style={{ fontSize:"17px", color:P.grey400, fontFamily:font, lineHeight:1.7, margin:0 }}>By using GroupGrid, you agree to these terms. Please read them carefully.</p>
      </div>
      <Section title="1. Acceptance of Terms">
        By accessing or using GroupGrid ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service. We reserve the right to update these terms at any time with notice provided via the Service.
      </Section>
      <Section title="2. Description of Service">
        GroupGrid is a browser-based event logistics tool that cross-references guest travel data (flight manifests, hotel rosters, car transfers, and dietary records) to identify discrepancies. All data processing occurs locally in your browser. No guest data is transmitted to or stored on GroupGrid servers.
      </Section>
      <Section title="3. Acceptable Use">
        You may use GroupGrid only for lawful purposes and in accordance with these Terms. You agree not to: (a) use the Service to process data you do not have authorization to access; (b) attempt to reverse-engineer or compromise the Service; (c) use the Service in any manner that violates applicable laws or regulations, including data protection laws.
      </Section>
      <Section title="4. Your Data & Privacy">
        Because GroupGrid processes all data locally in your browser, we do not have access to your guest data. You are solely responsible for ensuring you have appropriate authorization to process any personal data you upload into the Service, and for complying with applicable data protection regulations including GDPR and CCPA.
      </Section>
      <Section title="5. Intellectual Property">
        GroupGrid and its original content, features, and functionality are owned by GroupGrid and are protected by international copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works of the Service without our prior written consent.
      </Section>
      <Section title="6. Disclaimers">
        THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. GROUPGRID DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS. YOU USE THE SERVICE AT YOUR OWN RISK.
      </Section>
      <Section title="7. Limitation of Liability">
        TO THE FULLEST EXTENT PERMITTED BY LAW, GROUPGRID SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE, EVEN IF GROUPGRID HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
      </Section>
      <Section title="8. Indemnification">
        You agree to defend, indemnify, and hold harmless GroupGrid from any claims, damages, obligations, losses, or expenses arising from your use of the Service, your violation of these Terms, or your violation of any third-party rights.
      </Section>
      <Section title="9. Termination">
        We reserve the right to terminate or suspend access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, third parties, or for any other reason.
      </Section>
      <Section title="10. Governing Law">
        These Terms shall be governed by the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved in the courts of Delaware.
      </Section>
      <Section title="11. Contact">
        Questions about these Terms? Email us at <a href="mailto:groupgrid@outlook.com" style={{ color:P.periwinkleD, fontWeight:600 }}>groupgrid@outlook.com</a>.
      </Section>
    </PageShell>
  );
}

function AboutPage({ onBack }) {
  const useCases = [
    { icon:"🎯", label:"Sales Kickoffs" },
    { icon:"🏢", label:"Corporate Events" },
    { icon:"🤝", label:"Board Retreats" },
    { icon:"💼", label:"Advisory Boards" },
    { icon:"🔵", label:"Executive Roundtables" },
    { icon:"🎪", label:"Tradeshows" },
    { icon:"🏥", label:"Healthcare Meetings" },
    { icon:"🏆", label:"Event Agencies" },
    { icon:"🎤", label:"Conferences" },
    { icon:"🤲", label:"Association Meetings" },
    { icon:"🌐", label:"Global Summits" },
    { icon:"📋", label:"Field Marketing Events" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:P.offWhite, fontFamily:font }}>
      {/* Nav */}
      <div style={{ background:P.navy, padding:"0 32px", height:"52px", display:"flex", alignItems:"center", gap:"16px", boxShadow:"0 1px 0 rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"8px", padding:"5px 12px", color:"rgba(255,255,255,0.7)", fontSize:"13px", fontFamily:font, fontWeight:600, cursor:"pointer" }}>← Back</button>
        <span style={{ color:P.white, fontSize:"15px", fontWeight:700, fontFamily:font }}>About GroupGrid</span>
      </div>

      {/* Hero */}
      <div style={{ background:`linear-gradient(160deg, ${P.navy} 0%, ${P.navyLight} 100%)`, padding:"64px 28px 56px", textAlign:"center" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:"rgba(0,201,177,0.12)", border:"1px solid rgba(0,201,177,0.3)", borderRadius:"20px", padding:"5px 16px", marginBottom:"20px" }}>
          <span style={{ fontSize:"13px", fontWeight:700, color:P.accent, fontFamily:font, letterSpacing:"0.05em" }}>BUILT BY A PLANNER, FOR PLANNERS</span>
        </div>
        <h1 style={{ fontSize:"42px", fontWeight:900, color:P.white, fontFamily:font, margin:"0 0 16px", letterSpacing:"-0.04em", lineHeight:1.1, maxWidth:"680px", marginLeft:"auto", marginRight:"auto" }}>
          The tool I wish I had<br/><span style={{ color:P.accent }}>for every event I've ever run.</span>
        </h1>
        <p style={{ fontSize:"18px", color:"rgba(255,255,255,0.6)", fontFamily:font, margin:"0 auto", lineHeight:1.7, maxWidth:"560px" }}>
          Created to solve a problem I lived with for over 15 years: making sure everyone who registers for an event actually has the travel they were promised.
        </p>
      </div>

      <div style={{ maxWidth:"820px", margin:"0 auto", padding:"56px 28px 80px" }}>

        {/* Founder story */}
        <div style={{ background:P.white, borderRadius:"20px", border:`1.5px solid ${P.grey100}`, padding:"36px 40px", marginBottom:"32px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, width:"4px", height:"100%", background:`linear-gradient(180deg, ${P.accent}, ${P.periwinkleD})` }} />
          <div style={{ fontSize:"13px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"16px" }}>Why GroupGrid Exists</div>
          <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.85, margin:"0 0 20px" }}>
            GroupGrid was created to solve a challenge I lived with for more than 15 years as an event professional: <strong style={{ color:P.navy }}>reconciling who registered for an event against what was actually booked for their travel.</strong> Registration lists, flight manifests, and hotel rosters never quite agree, and finding the gaps before they become day-of problems is slow, manual, and error-prone.
          </p>
          <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.85, margin:"0 0 20px" }}>
            For years, the only way to manage it reliably was to spend thousands of dollars outsourcing the cross-checking — paying others to do the painstaking work of comparing spreadsheets row by row. It was expensive, it was repetitive, and it was a problem the market had never properly solved.
          </p>
          <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.85, margin:0 }}>
            GroupGrid brings that work in-house and makes it fast. Upload your registration list and your travel files, run the check, and see exactly who registered but isn't booked, who's booked but never registered, and whose dates don't match — with enough time to fix it.
          </p>
        </div>

        {/* Value strip */}
        <div style={{ background:P.navy, borderRadius:"16px", padding:"28px 32px", marginBottom:"32px" }}>
          <div style={{ fontSize:"13px", fontWeight:800, color:"rgba(255,255,255,0.5)", fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"20px" }}>What GroupGrid Does For You</div>
          <div className="gg-landing-stats" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
            {[
              { stat:"Fast", label:"Check a full event without manual spreadsheet work" },
              { stat:"Every", label:"Registered person matched to their travel" },
              { stat:"0", label:"Guest files uploaded to any server" },
              { stat:"4+", label:"Gap types caught automatically" },
            ].map(({ stat, label }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:"16px" }}>
                <div style={{ fontSize:"24px", fontWeight:900, color:P.accent, fontFamily:font, lineHeight:1, flexShrink:0, minWidth:"72px" }}>{stat}</div>
                <div style={{ fontSize:"14px", color:"rgba(255,255,255,0.55)", fontFamily:font, lineHeight:1.5 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Who it's for */}
        <div style={{ marginBottom:"32px" }}>
          <div style={{ fontSize:"13px", fontWeight:800, color:P.navy, fontFamily:font, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"8px" }}>Built for Event Planners Managing 2 to 10,000+ Attendees</div>
          <p style={{ fontSize:"16px", color:P.grey600, fontFamily:font, lineHeight:1.7, margin:"0 0 20px" }}>
            Wherever you need to make sure attendees arrive on time, have a confirmed hotel room, and won't show up at the wrong airport — GroupGrid has you covered.
          </p>
          <div className="gg-landing-usecases" style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"10px" }}>
            {useCases.map(({ icon, label }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:"10px", background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"10px", padding:"12px 14px" }}>
                <span style={{ fontSize:"18px", flexShrink:0 }}>{icon}</span>
                <span style={{ fontSize:"14px", fontWeight:600, color:P.navy, fontFamily:font }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div style={{ background:P.white, borderRadius:"16px", border:`1.5px solid ${P.grey100}`, padding:"32px 36px", marginBottom:"32px" }}>
          <div style={{ fontSize:"13px", fontWeight:800, color:P.navy, fontFamily:font, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"20px" }}>How It Works</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"18px" }}>
            {[
              { n:"1", title:"Upload your spreadsheets", body:"Drag in your flight manifest, hotel roster, car transfers, and dietary files — Excel format (.xlsx / .xls), any column names. GroupGrid auto-detects them." },
              { n:"2", title:"Run the cross-check", body:"GroupGrid matches every guest across all files by name and email, identifying mismatches, missing records, date gaps, and duplicates." },
              { n:"3", title:"See exactly what needs fixing", body:"Every flag is surfaced with context — who's affected, what the mismatch is, and how many days off. Resolve issues, add notes, and export a clean report." },
              { n:"4", title:"Share with your team or hotel", body:"Download an Excel file, generate a shareable HTML report, or draft emails directly to your hotel and travel agency contacts — all from the same screen." },
            ].map(({ n, title, body }) => (
              <div key={n} style={{ display:"flex", gap:"16px", alignItems:"flex-start" }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:P.navy, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"1px" }}>
                  <span style={{ fontSize:"14px", fontWeight:800, color:P.accent, fontFamily:font }}>{n}</span>
                </div>
                <div>
                  <div style={{ fontSize:"15px", fontWeight:700, color:P.navy, fontFamily:font, marginBottom:"4px" }}>{title}</div>
                  <div style={{ fontSize:"14px", color:P.grey600, fontFamily:font, lineHeight:1.7 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div style={{ background:P.accentLight, border:`1.5px solid ${P.accent}44`, borderRadius:"14px", padding:"24px 28px", marginBottom:"32px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
            <ShieldCheck size={18} strokeWidth={2} color={P.teal}/>
            <div style={{ fontSize:"15px", fontWeight:800, color:P.teal, fontFamily:font }}>Zero data ever leaves your browser</div>
          </div>
          <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, lineHeight:1.7 }}>
            Your guest files — names, emails, flight details, hotel records — are processed entirely in your browser and never uploaded to any server. Saved projects are stored on your device. We use Supabase, a trusted third-party provider, only for secure account sign-in. GroupGrid is built to keep sensitive guest data on your device.
          </div>
        </div>

        {/* Community */}
        <div style={{ background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"14px", padding:"24px 28px", textAlign:"center" }}>
          <div style={{ fontSize:"15px", fontWeight:800, color:P.navy, fontFamily:font, marginBottom:"8px" }}>Part of the events community</div>
          <div style={{ fontSize:"15px", color:P.grey400, fontFamily:font, lineHeight:1.7, marginBottom:"16px" }}>
            GroupGrid is built by an active member of the event marketing community, including CEMA and PCMA. Have a question or want to connect? Reach out anytime.
          </div>
          <a href="mailto:groupgrid@outlook.com" style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:P.navy, borderRadius:"10px", padding:"10px 22px", fontSize:"14px", fontWeight:700, color:P.white, fontFamily:font, textDecoration:"none" }}>
            Get in touch →
          </a>
        </div>

      </div>
    </div>
  );
}

function ContactPage({ onBack }) {
  return (
    <PageShell title="Contact Us" onBack={onBack}>
      <div style={{ marginBottom:"40px" }}>
        <h1 style={{ fontSize:"32px", fontWeight:900, color:P.navy, fontFamily:font, margin:"0 0 12px", letterSpacing:"-0.03em" }}>Get in touch.</h1>
        <p style={{ fontSize:"17px", color:P.grey400, fontFamily:font, lineHeight:1.7, margin:0 }}>Have a question, found a bug, or want to share feedback? We'd love to hear from you.</p>
      </div>
      <div className="gg-card-grid-3" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"36px" }}>
        {[
          { icon:"✉", label:"General Inquiries", value:"groupgrid@outlook.com", href:"mailto:groupgrid@outlook.com", color:P.periwinkleD, bg:P.grey50 },
          { icon:"🐛", label:"Bug Reports", value:"groupgrid@outlook.com", href:"mailto:groupgrid@outlook.com", color:P.red, bg:"#FFF5F5" },
          { icon:"💡", label:"Feature Requests", value:"groupgrid@outlook.com", href:"mailto:groupgrid@outlook.com", color:P.teal, bg:P.accentLight },
          { icon:"🤝", label:"Partnerships", value:"groupgrid@outlook.com", href:"mailto:groupgrid@outlook.com", color:P.amber, bg:P.amberLight },
        ].map(({ icon, label, value, href, color, bg }) => (
          <a key={label} href={href} style={{ display:"flex", alignItems:"center", gap:"14px", background:bg, border:`1.5px solid ${color}22`, borderRadius:"12px", padding:"18px 20px", textDecoration:"none" }}>
            <span style={{ fontSize:"22px" }}>{icon}</span>
            <div>
              <div style={{ fontSize:"13px", fontWeight:700, color:P.grey400, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"3px" }}>{label}</div>
              <div style={{ fontSize:"15px", fontWeight:600, color, fontFamily:font }}>{value}</div>
            </div>
          </a>
        ))}
      </div>
      <Section title="Response times">
        We aim to respond to all inquiries within 1–2 business days. For urgent event-day issues, include "URGENT" in your subject line and we'll prioritize your message.
      </Section>
      <Section title="About GroupGrid">
        GroupGrid is built for event and meeting planners who need to make sure everyone who registered for their event actually has the travel they need. It's a simple, fast tool: upload your registration list and travel files, and see every gap in minutes.
      </Section>
    </PageShell>
  );
}

function FAQPage({ onBack }) {
  const faqs = [
    { q:"What does GroupGrid actually do?", a:"GroupGrid takes your event registration list and checks it against your travel files — flights, hotels, and car transfers. It tells you instantly who registered but isn't booked, who's booked but never registered, and whose dates don't match. What used to take days of manual spreadsheet cross-checking takes about a minute." },
    { q:"What files do I need?", a:"Flight and hotel files are required to run a check. Your registration list is recommended but optional — when you add it, GroupGrid uses it as the source of truth and checks everything against it. You can also add car transfer and dietary files. Everything is standard Excel format (.xlsx or .xls)." },
    { q:"What if my spreadsheet columns are named differently?", a:"GroupGrid auto-detects common column names. Your \"Arrival Date\" and someone else's \"Arr. Date\" or \"Flight In\" all get recognized automatically. There's no manual mapping or setup required." },
    { q:"What if I don't have email addresses?", a:"GroupGrid matches people by email first for the most accurate results, then falls back to matching by name. Including an email column is best, but it's not required." },
    { q:"Is my data secure?", a:"Your guest files are processed entirely in your browser and are never uploaded to any server. Saved projects are stored on your device. We use Supabase, a trusted third-party provider, only for secure account sign-in. GroupGrid is built to keep sensitive guest data on your device." },
    { q:"Who is GroupGrid for?", a:"Any event or meeting planner who manages attendee travel — from a 20-person board retreat to a 10,000-person conference. If people are registering and you're booking their flights and hotels, GroupGrid makes sure the two lists match." },
    { q:"How much does it cost?", a:"$249/month for full access — unlimited events, unlimited guests, every feature. You can try it free with your own files before subscribing — no credit card required." },
    { q:"Do I need to install anything?", a:"No. GroupGrid runs in your web browser. There's nothing to download or install." },
  ];
  return (
    <PageShell title="FAQ" onBack={onBack}>
      <div style={{ marginBottom:"32px" }}>
        <h1 style={{ fontSize:"32px", fontWeight:900, color:P.navy, fontFamily:font, margin:"0 0 8px", letterSpacing:"-0.03em" }}>Frequently asked questions</h1>
        <p style={{ fontSize:"17px", color:P.grey400, fontFamily:font, lineHeight:1.7, margin:0 }}>Everything you need to know about how GroupGrid works.</p>
      </div>
      {faqs.map(({ q, a }) => (
        <div key={q} style={{ background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"14px", padding:"22px 26px", marginBottom:"14px" }}>
          <div style={{ fontSize:"17px", fontWeight:800, color:P.navy, fontFamily:font, marginBottom:"8px", letterSpacing:"-0.01em" }}>{q}</div>
          <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, lineHeight:1.75 }}>{a}</div>
        </div>
      ))}
      <div style={{ marginTop:"24px", background:P.accentLight, border:`1.5px solid ${P.accent}44`, borderRadius:"14px", padding:"22px 26px", textAlign:"center" }}>
        <div style={{ fontSize:"15px", fontWeight:800, color:P.teal, fontFamily:font, marginBottom:"6px" }}>Still have a question?</div>
        <div style={{ fontSize:"14px", color:P.grey600, fontFamily:font }}>Email us at <a href="mailto:groupgrid@outlook.com" style={{ color:P.periwinkleD, fontWeight:700, textDecoration:"none" }}>groupgrid@outlook.com</a> and we'll get back to you within one business day.</div>
      </div>
    </PageShell>
  );
}

function PrivacyPage({ onBack }) {
  return (
    <PageShell title="Privacy Policy" onBack={onBack}>
      <div style={{ marginBottom:"40px" }}>
        <h1 style={{ fontSize:"32px", fontWeight:900, color:P.navy, fontFamily:font, margin:"0 0 8px", letterSpacing:"-0.03em" }}>Privacy Policy</h1>
        <p style={{ fontSize:"14px", color:P.grey400, fontFamily:font, margin:"0 0 16px" }}>Last updated: February 2026</p>
        <p style={{ fontSize:"17px", color:P.grey400, fontFamily:font, lineHeight:1.7, margin:0 }}>GroupGrid is built with privacy as a core design principle — not an afterthought. Here's exactly what we do and don't do with your data.</p>
      </div>
      <Section title="Data we collect">
        <strong>None.</strong> GroupGrid processes all spreadsheet data entirely within your browser. Your guest names, emails, flight details, hotel records, and any other information in your uploaded files are never transmitted to our servers. We have no access to this data — ever.
      </Section>
      <Section title="Local storage">
        GroupGrid uses your browser's local storage to save session data (event names, notes, resolved flags) between visits. This data lives only on your device and is never synced to any external server. You can clear it at any time by clearing your browser storage or using the app's built-in reset.
      </Section>
      <Section title="Cookies">
        GroupGrid does not use tracking cookies, advertising cookies, or any third-party analytics. We do not use Google Analytics, Meta Pixel, or similar tools.
      </Section>
      <Section title="Account data (future)">
        When account functionality is introduced, we will collect only your email address and encrypted password. We will never sell, rent, or share your personal information with third parties. Any account data will be stored securely with industry-standard encryption.
      </Section>
      <Section title="GDPR & CCPA">
        Because we collect no personal data in the current version of GroupGrid, there is nothing to request, export, or delete. If you create an account in future, you will have full rights to access, export, and permanently delete all account-associated data upon request.
      </Section>
      <Section title="Third-party services">
        The current version of GroupGrid uses no third-party services that receive your data. External fonts (Manrope via Google Fonts) are loaded from Google's CDN, which is subject to Google's standard font API privacy policy.
      </Section>
      <Section title="Changes to this policy">
        We will notify users of any material changes to this policy via in-app notification and email (once accounts are available). Continued use after notification constitutes acceptance of the updated policy.
      </Section>
      <Section title="Contact">
        Questions about privacy? Email us at <a href="mailto:groupgrid@outlook.com" style={{ color:P.periwinkleD, fontWeight:600 }}>groupgrid@outlook.com</a>.
      </Section>
    </PageShell>
  );
}

// ── Landing Page ──────────────────────────────────────────────────────────────
function LandingPage({ onEnter, onPricing, onAbout, onContact, onPrivacy, onTerms, onFaq }) {

  const problems = [
    { time:"Day 1", label:"You export your registration list", sub:"300 people signed up — names, dates, requests", color:P.accentD, bg:"#E0FAF7" },
    { time:"Day 3", label:"Flight manifest arrives", sub:"280 names — different format, different spelling", color:P.amber, bg:P.amberLight },
    { time:"Day 7", label:"Hotel roster comes in separately", sub:"294 rooms — do they all match who registered?", color:P.purple, bg:P.purpleLight },
    { time:"Day 14", label:"You're still cross-checking", sub:"VLOOKUPs, filters, manual row-by-row scanning…", color:P.red, bg:P.redLight },
  ];

  const eventTypes = [
    "Sales Kickoffs","Board Retreats","Tradeshows","Healthcare Meetings",
    "Conferences","Advisory Boards","Executive Roundtables","Field Marketing",
    "Corporate Events","Association Meetings","Event Agencies","Global Programs",
  ];

  const steps = [
    { n:"01", icon:"📋", title:"Upload your registration list", body:"Start with your master list of who registered — the source of truth. Then add your travel files: flight manifest, hotel roster, car transfers. Excel files (.xlsx or .xls), any column names — GroupGrid figures it out." },
    { n:"02", icon:"⚡", title:"Run the check", body:"In seconds, GroupGrid matches every registered person against the travel files by email, then name. It finds who registered but isn't booked, who's booked but never registered, and whose dates don't match." },
    { n:"03", icon:"🎯", title:"See exactly what needs fixing", body:"Each flag shows who's affected and what's wrong — registered with no flight, hotel booked for someone not on the list, check-in dates that don't match what they requested. Resolve, add notes, mark done." },
    { n:"04", icon:"📤", title:"Communicate & export", body:"Draft emails to your hotel or travel agency, download a clean Excel report, or generate a shareable HTML report — all without leaving GroupGrid." },
  ];

  // Testimonials removed — placeholder quotes taken down. Add real, attributed quotes here when available.

  return (
    <div style={{ minHeight:"100vh", fontFamily:font, background:P.white, WebkitFontSmoothing:"antialiased" }}>
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── Nav ── */}
      <nav style={{ background:P.navy, height:"64px", padding:"0 40px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 0 rgba(255,255,255,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 52" width="200" height="52" style={{display:"block"}}>
            <defs>
              <linearGradient id="ggIconBgL" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1A2E52"/>
                <stop offset="100%" stopColor="#0F1F3D"/>
              </linearGradient>
              <linearGradient id="ggTealL" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00C9B1"/>
                <stop offset="100%" stopColor="#00A896"/>
              </linearGradient>
            </defs>
            <g transform="translate(2,2)">
              <rect x="0" y="0" width="48" height="48" rx="10" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
              <circle cx="9"  cy="9"  r="3" fill="rgba(255,255,255,0.18)"/>
              <circle cx="19" cy="9"  r="3" fill="rgba(255,255,255,0.18)"/>
              <circle cx="29" cy="9"  r="3" fill="rgba(255,255,255,0.18)"/>
              <circle cx="39" cy="9"  r="3" fill="rgba(255,255,255,0.18)"/>
              <circle cx="9"  cy="19" r="3" fill="rgba(255,255,255,0.18)"/>
              <circle cx="19" cy="19" r="3" fill="rgba(255,255,255,0.18)"/>
              <circle cx="29" cy="19" r="3" fill="url(#ggTealL)" opacity="0.45"/>
              <circle cx="39" cy="19" r="3" fill="url(#ggTealL)" opacity="0.65"/>
              <circle cx="9"  cy="29" r="3" fill="rgba(255,255,255,0.18)"/>
              <circle cx="19" cy="29" r="3" fill="url(#ggTealL)" opacity="0.45"/>
              <circle cx="29" cy="29" r="3" fill="url(#ggTealL)" opacity="0.75"/>
              <circle cx="39" cy="29" r="3" fill="url(#ggTealL)" opacity="0.9"/>
              <circle cx="9"  cy="39" r="3" fill="url(#ggTealL)" opacity="0.35"/>
              <circle cx="19" cy="39" r="3" fill="url(#ggTealL)" opacity="0.6"/>
              <circle cx="29" cy="39" r="3" fill="url(#ggTealL)" opacity="0.85"/>
              <circle cx="39" cy="39" r="3" fill="url(#ggTealL)"/>
            </g>
            <text x="62" y="36" fontFamily="'Manrope', sans-serif" fontSize="26" fontWeight="700" letterSpacing="-0.5" fill="white">Group</text>
            <text x="144" y="36" fontFamily="'Manrope', sans-serif" fontSize="26" fontWeight="300" letterSpacing="-0.5" fill="#00C9B1">Grid</text>
          </svg>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"28px" }}>
          <button onClick={onAbout} style={{ background:"none", border:"none", fontSize:"14px", fontWeight:600, color:"rgba(255,255,255,0.6)", fontFamily:font, cursor:"pointer" }}>About</button>
          <button onClick={onFaq} style={{ background:"none", border:"none", fontSize:"14px", fontWeight:600, color:"rgba(255,255,255,0.6)", fontFamily:font, cursor:"pointer" }}>FAQ</button>
          <button onClick={onPricing} style={{ background:"none", border:"none", fontSize:"14px", fontWeight:600, color:"rgba(255,255,255,0.6)", fontFamily:font, cursor:"pointer" }}>Pricing</button>
          <button onClick={onEnter} style={{ background:P.accent, border:"none", borderRadius:"8px", padding:"8px 20px", fontSize:"14px", fontWeight:700, color:P.white, fontFamily:font, cursor:"pointer", boxShadow:"0 2px 12px rgba(0,201,177,0.35)" }}>Open App →</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ background:`linear-gradient(170deg, ${P.navy} 0%, #0D1E40 60%, #0A1628 100%)`, padding:"96px 40px 80px", position:"relative", overflow:"hidden" }}>
        {/* bg glow orbs */}
        <div style={{ position:"absolute", top:-100, right:-100, width:500, height:500, borderRadius:"50%", background:`radial-gradient(circle, ${P.accent}12, transparent 65%)`, pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-80, left:-60, width:400, height:400, borderRadius:"50%", background:`radial-gradient(circle, ${P.periwinkleD}15, transparent 65%)`, pointerEvents:"none" }} />
        {/* dot grid — all teal dots, fading to grey toward upper-right */}
        <svg style={{ position:"absolute", bottom:"40px", right:"0", pointerEvents:"none", width:"65%", height:"100%", minWidth:"500px" }} viewBox="0 0 1000 600" preserveAspectRatio="xMaxYMax meet" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Fade: bottom-left = full teal, top-right = dim grey */}
            <linearGradient id="heroDotFade" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%"   stopColor="white" stopOpacity="1"/>
              <stop offset="60%"  stopColor="white" stopOpacity="0.5"/>
              <stop offset="100%" stopColor="white" stopOpacity="0.08"/>
            </linearGradient>
            <mask id="heroDotMask">
              <rect width="1000" height="600" fill="url(#heroDotFade)"/>
            </mask>
          </defs>
          <g mask="url(#heroDotMask)">
            {/* 4 rows × 4 cols — all teal, evenly spaced, bottom-right anchor */}
            {/* Cols: 280, 520, 760, 1000 — Rows: 20, 207, 393, 580 */}
            {[20, 207, 393, 580].map((cy, row) =>
              [280, 520, 760, 1000].map((cx, col) => (
                <circle key={`${row}-${col}`} cx={cx} cy={cy} r="18" fill="#00C9B1"/>
              ))
            )}
          </g>
        </svg>

        <div style={{ maxWidth:"1100px", margin:"0 auto", display:"flex", alignItems:"flex-start", gap:"64px", flexWrap:"wrap" }}>
          {/* Left copy */}
          <div style={{ flex:1, minWidth:"320px" }}>

            <div style={{ margin:"0 0 24px" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                {[
                  { label:"Registered",     status:"check" },
                  { label:"Flight booked",   status:"check" },
                  { label:"Hotel booked",    status:"check" },
                  { label:"Dates match",     status:"error" },
                ].map(({ label, status }) => (
                  <div key={label} style={{ display:"flex", alignItems:"center", gap:"14px" }}>
                    <div style={{
                      width: 32, height: 32, borderRadius:"8px", flexShrink:0,
                      background: status === "check" ? "rgba(0,201,177,0.15)" : "rgba(220,50,50,0.2)",
                      border: `1.5px solid ${status === "check" ? "rgba(0,201,177,0.4)" : "rgba(220,50,50,0.5)"}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"16px", fontWeight:900,
                    }}>
                      {status === "check"
                        ? <Check size={16} strokeWidth={3} color="#00C9B1"/>
                        : <X size={16} strokeWidth={3} color="#FF5252"/>}
                    </div>
                    <span style={{
                      fontSize:"clamp(22px, 3.5vw, 36px)",
                      fontWeight: 900,
                      fontFamily: font,
                      letterSpacing:"-0.04em",
                      lineHeight: 1,
                      color: status === "check" ? "rgba(255,255,255,0.85)" : "#FF5252",
                      textDecoration: status === "error" ? "none" : "none",
                    }}>{label}{status === "error" ? " ✗" : ""}</span>
                  </div>
                ))}
              </div>
            </div>
            <h1 style={{ fontSize:"clamp(28px, 4.5vw, 44px)", fontWeight:900, color:P.white, fontFamily:font, lineHeight:1.1, margin:"0 0 18px", maxWidth:"540px", letterSpacing:"-0.035em" }}>
              300 people registered.<br/><span style={{ color:P.accent }}>Did all 300 get booked?</span>
            </h1>
            <p style={{ fontSize:"18px", color:"rgba(255,255,255,0.6)", fontFamily:font, lineHeight:1.75, margin:"0 0 12px", maxWidth:"520px" }}>
              You have one list of people who registered for your event. You have separate spreadsheets from your travel and hotel vendors. Somewhere between them, people fall through — the late registrant with no flight, the hotel booking for someone who never signed up, the check-in date that doesn't match.
            </p>
            <p style={{ fontSize:"18px", color:"rgba(255,255,255,0.85)", fontFamily:font, lineHeight:1.75, margin:"0 0 36px", maxWidth:"520px", fontWeight:600 }}>
              GroupGrid checks your registration list against every travel file and shows you exactly who's missing what — <span style={{ color:P.accent }}>in minutes, not days.</span>
            </p>
            <div style={{ display:"flex", gap:"12px", flexWrap:"wrap", alignItems:"center" }}>
              <button onClick={onEnter} style={{ background:`linear-gradient(135deg, ${P.accent}, ${P.accentD})`, border:"none", borderRadius:"12px", padding:"14px 32px", fontSize:"16px", fontWeight:800, color:P.white, fontFamily:font, cursor:"pointer", boxShadow:"0 4px 20px rgba(0,201,177,0.4)", letterSpacing:"-0.02em" }}>
                Try GroupGrid free →
              </button>
              <button onClick={onPricing} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"12px", padding:"14px 24px", fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.75)", fontFamily:font, cursor:"pointer" }}>
                See pricing
              </button>
            </div>
            <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.3)", fontFamily:font, marginTop:"14px" }}>No setup · Upload your spreadsheets and get answers in minutes · Your guest files never leave your browser</p>
          </div>

          {/* Right — live mismatch demo card */}
          <div className="gg-hero-card" style={{ flexShrink:0, width:"340px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"20px", overflow:"hidden", backdropFilter:"blur(10px)" }}>
            <div style={{ background:"rgba(0,0,0,0.2)", padding:"12px 16px", display:"flex", alignItems:"center", gap:"8px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display:"flex", gap:"5px" }}>
                {["#FF5F57","#FFBD2E","#28C840"].map(c => <div key={c} style={{ width:10, height:10, borderRadius:"50%", background:c }} />)}
              </div>
              <span style={{ fontSize:"12px", color:"rgba(255,255,255,0.35)", fontFamily:font, fontWeight:600 }}>GroupGrid — Annual Sales Summit 2025</span>
            </div>
            <div style={{ padding:"16px" }}>
              <div style={{ fontSize:"11px", fontWeight:700, color:"rgba(255,255,255,0.35)", fontFamily:font, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"10px" }}>Registration checked · 4 issues · 247 registered</div>
              {[
                { name:"Sarah Solomon", issue:"Registered but no flight booked", type:"error", badge:"No Flight" },
                { name:"Marcus Williams", issue:"Has a hotel room but never registered", type:"error", badge:"Not Registered" },
                { name:"Jennifer Park", issue:"Requested check-in Dec 4 · hotel booked Dec 5", type:"warn", badge:"Date Mismatch" },
                { name:"David Chen", issue:"Registered but no hotel booked", type:"error", badge:"No Hotel" },
              ].map(({ name, issue, type, badge }) => (
                <div key={name} style={{ background: type==="error" ? "rgba(192,57,43,0.15)" : "rgba(201,122,10,0.15)", border:`1px solid ${type==="error" ? "rgba(192,57,43,0.3)" : "rgba(201,122,10,0.3)"}`, borderRadius:"10px", padding:"12px 14px", marginBottom:"8px" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"4px" }}>
                    <span style={{ fontSize:"13px", fontWeight:700, color:P.white, fontFamily:font }}>{name}</span>
                    <span style={{ fontSize:"10px", fontWeight:800, color: type==="error" ? "#FF8A80" : "#FFD54F", background: type==="error" ? "rgba(192,57,43,0.3)" : "rgba(201,122,10,0.3)", padding:"2px 8px", borderRadius:"20px", fontFamily:font }}>{badge}</span>
                  </div>
                  <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.5)", fontFamily:font, lineHeight:1.5 }}>{issue}</div>
                </div>
              ))}
              <div style={{ marginTop:"12px", background:"rgba(0,201,177,0.1)", border:"1px solid rgba(0,201,177,0.2)", borderRadius:"8px", padding:"10px 12px", display:"flex", alignItems:"center", gap:"8px" }}>
                <Check size={14} strokeWidth={2.5} color={P.accent} style={{flexShrink:0}}/>
                <span style={{ fontSize:"12px", color:"rgba(255,255,255,0.6)", fontFamily:font }}>243 registered guests fully booked · <span style={{ color:P.accent, fontWeight:700 }}>✓ No action needed</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Problem section ── */}
      <div style={{ background:"#FAFBFD", padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
        <div style={{ maxWidth:"1000px", margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:"56px" }}>
            <div style={{ fontSize:"12px", fontWeight:800, color:P.periwinkleD, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>SOUND FAMILIAR?</div>
            <h2 style={{ fontSize:"clamp(30px, 5vw, 44px)", fontWeight:900, color:P.navy, fontFamily:font, margin:"0 0 16px", letterSpacing:"-0.035em", lineHeight:1.1 }}>
              The spreadsheet death spiral<br/>before every big event
            </h2>
            <p style={{ fontSize:"17px", color:P.grey400, fontFamily:font, lineHeight:1.7, maxWidth:"560px", margin:"0 auto" }}>
              Your registration list and your travel files live in different spreadsheets, in different formats. Making them agree by hand takes hours — and it's easy to miss someone.
            </p>
          </div>
          <div className="gg-timeline-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"16px", marginBottom:"40px" }}>
            {problems.map(({ time, label, sub, color, bg }, i) => (
              <div key={time} className="gg-timeline-card" style={{ background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"16px", padding:"24px", position:"relative", overflow:"visible" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:"3px", background:color, borderRadius:"16px 16px 0 0" }} />
                <div style={{ fontSize:"11px", fontWeight:800, color, fontFamily:font, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"10px" }}>{time}</div>
                <div style={{ fontSize:"15px", fontWeight:700, color:P.navy, fontFamily:font, marginBottom:"6px", lineHeight:1.4 }}>{label}</div>
                <div style={{ fontSize:"13px", color:P.grey400, fontFamily:font, lineHeight:1.6 }}>{sub}</div>
                {i < 3 && <div className="gg-timeline-arrow" style={{ position:"absolute", top:"50%", right:"-12px", transform:"translateY(-50%)", fontSize:"16px", color:P.grey200, zIndex:2 }}>→</div>}
              </div>
            ))}
          </div>
          <div style={{ background:P.redLight, border:`1.5px solid ${P.red}22`, borderRadius:"14px", padding:"20px 28px", display:"flex", alignItems:"center", gap:"16px" }}>
            <span style={{ fontSize:"28px", flexShrink:0 }}>😩</span>
            <div>
              <div style={{ fontSize:"15px", fontWeight:800, color:P.red, fontFamily:font, marginBottom:"4px" }}>Meanwhile, your event is in 3 days</div>
              <div style={{ fontSize:"14px", color:P.grey600, fontFamily:font, lineHeight:1.6 }}>You've gone through the lists 6 times. You think they match. But that one person who registered late and never got a flight, the hotel room booked for someone who isn't even on your list, the name spelled two different ways — those are the ones that show up as surprises at check-in.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Solution ── */}
      <div style={{ background:P.white, padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
        <div style={{ maxWidth:"1000px", margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:"56px" }}>
            <div style={{ fontSize:"12px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>THE GROUPGRID WAY</div>
            <h2 style={{ fontSize:"clamp(30px, 5vw, 44px)", fontWeight:900, color:P.navy, fontFamily:font, margin:"0 0 16px", letterSpacing:"-0.035em", lineHeight:1.1 }}>
              Days of work.<br/><span style={{ color:P.accent }}>Done in minutes.</span>
            </h2>
            <p style={{ fontSize:"17px", color:P.grey400, fontFamily:font, lineHeight:1.7, maxWidth:"520px", margin:"0 auto" }}>
              Upload your registration list and your travel files, run the check, see every gap instantly — then communicate fixes directly to your hotel and travel agency without switching tabs.
            </p>
          </div>
          <div className="gg-card-grid-3" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>
            {steps.map(({ n, icon, title, body }) => (
              <div key={n} style={{ background:"#FAFBFD", border:`1.5px solid ${P.grey100}`, borderRadius:"16px", padding:"28px 28px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"14px" }}>
                  <div style={{ width:40, height:40, borderRadius:"10px", background:P.navy, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", flexShrink:0 }}>{icon}</div>
                  <div>
                    <div style={{ fontSize:"11px", fontWeight:800, color:P.grey200, fontFamily:font, letterSpacing:"0.1em" }}>{n}</div>
                    <div style={{ fontSize:"16px", fontWeight:800, color:P.navy, fontFamily:font, letterSpacing:"-0.02em" }}>{title}</div>
                  </div>
                </div>
                <div style={{ fontSize:"14px", color:P.grey600, fontFamily:font, lineHeight:1.75 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── What it catches ── */}
      <div style={{ background:"#FAFBFD", padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
        <div style={{ maxWidth:"1000px", margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:"48px" }}>
            <div style={{ fontSize:"12px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>WHAT GROUPGRID CATCHES</div>
            <h2 style={{ fontSize:"clamp(28px, 4.5vw, 42px)", fontWeight:900, color:P.navy, fontFamily:font, margin:"0 0 14px", letterSpacing:"-0.035em", lineHeight:1.1 }}>
              The gaps that cause<br/><span style={{ color:P.accent }}>day-of disasters.</span>
            </h2>
            <p style={{ fontSize:"17px", color:P.grey400, fontFamily:font, lineHeight:1.7, maxWidth:"520px", margin:"0 auto" }}>
              Add your registration list and GroupGrid checks it against every travel file, person by person.
            </p>
          </div>
          <div className="gg-card-grid-3" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px" }}>
            {[
              { icon:"✈️", title:"Registered, but no flight", body:"See everyone who signed up for your event but doesn't have a flight booked yet." },
              { icon:"🏨", title:"Registered, but no hotel", body:"Spot registered attendees who have travel but no hotel room reserved." },
              { icon:"🚩", title:"Booked, but not registered", body:"Find flights or hotel rooms booked for people who never registered — often the costliest gap to miss." },
              { icon:"📅", title:"Dates that don't match", body:"Catch when a hotel check-in or flight date doesn't match what the person requested at registration." },
              { icon:"🚗", title:"Missing transfers", body:"Flag car bookings that don't line up with anyone's flight or registration." },
              { icon:"👥", title:"Duplicates", body:"The same person registered or booked twice across your files, before it becomes a double charge." },
            ].map(({ icon, title, body }) => (
              <div key={title} style={{ background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"14px", padding:"24px 22px" }}>
                <div style={{ fontSize:"24px", marginBottom:"12px" }}>{icon}</div>
                <div style={{ fontSize:"16px", fontWeight:800, color:P.navy, fontFamily:font, marginBottom:"6px", letterSpacing:"-0.02em" }}>{title}</div>
                <div style={{ fontSize:"14px", color:P.grey600, fontFamily:font, lineHeight:1.65 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Use cases ── */}
      <div style={{ background:P.white, padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
        <div style={{ maxWidth:"1000px", margin:"0 auto", textAlign:"center" }}>
          <div style={{ fontSize:"12px", fontWeight:800, color:P.navy, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>WHO IT'S FOR</div>
          <h2 style={{ fontSize:"clamp(28px, 4.5vw, 42px)", fontWeight:900, color:P.navy, fontFamily:font, margin:"0 0 12px", letterSpacing:"-0.035em", lineHeight:1.1 }}>
            Built for event planners managing<br/><span style={{ color:P.periwinkleD }}>2 to 10,000+ attendees</span>
          </h2>
          <p style={{ fontSize:"16px", color:P.grey400, fontFamily:font, lineHeight:1.7, maxWidth:"520px", margin:"0 auto 40px" }}>
            Anywhere you need to make sure attendees arrive on time, have a confirmed room, and won't be stranded at the wrong airport.
          </p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"10px", justifyContent:"center", marginBottom:"48px" }}>
            {eventTypes.map(tag => (
              <span key={tag} style={{ background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"20px", padding:"8px 18px", fontSize:"14px", fontWeight:600, color:P.navy, fontFamily:font, boxShadow:"0 1px 4px rgba(15,29,53,0.06)" }}>{tag}</span>
            ))}
          </div>
          {/* Privacy callout */}
          <div style={{ background:P.navy, borderRadius:"16px", padding:"28px 36px", display:"flex", alignItems:"center", gap:"32px", flexWrap:"wrap", justifyContent:"center", textAlign:"left" }}>
            <ShieldCheck size={36} strokeWidth={1.5} color={P.accent} style={{flexShrink:0}}/>
            <div style={{ flex:1, minWidth:"260px" }}>
              <div style={{ fontSize:"16px", fontWeight:800, color:P.white, fontFamily:font, marginBottom:"6px" }}>Your guest files never leave your browser</div>
              <div style={{ fontSize:"14px", color:"rgba(255,255,255,0.5)", fontFamily:font, lineHeight:1.65 }}>Your spreadsheets are processed locally on your device and are never uploaded. Saved projects stay on your device. We use Supabase only for secure account sign-in. Built to keep sensitive guest data on your device.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Value band (testimonials to be added once real) ── */}
      <div style={{ background:`linear-gradient(160deg, ${P.navy} 0%, ${P.navyLight} 100%)`, padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
        <div style={{ maxWidth:"880px", margin:"0 auto", textAlign:"center" }}>
          <div style={{ fontSize:"12px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"16px" }}>WHY PLANNERS USE IT</div>
          <h2 style={{ fontSize:"clamp(26px, 4vw, 38px)", fontWeight:900, color:P.white, fontFamily:font, margin:"0 0 32px", letterSpacing:"-0.035em", lineHeight:1.15 }}>
            The check that used to take days,<br/>done before your coffee gets cold.
          </h2>
          <div className="gg-card-grid-3" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"20px" }}>
            {[
              { icon:"⏱️", title:"Minutes, not days", body:"Upload your files and see every gap in minutes — no more row-by-row scanning the week before an event." },
              { icon:"🎯", title:"Catch what hides", body:"The late registrant with no flight, the room booked for a no-show, the date that's one day off — surfaced automatically." },
              { icon:"🔒", title:"Your data stays yours", body:"Guest files are processed in your browser and never uploaded. Nothing to worry about with sensitive attendee information." },
            ].map(({ icon, title, body }) => (
              <div key={title} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"16px", padding:"28px 24px", textAlign:"left", backdropFilter:"blur(10px)" }}>
                <div style={{ fontSize:"26px", marginBottom:"12px" }}>{icon}</div>
                <div style={{ fontSize:"16px", fontWeight:800, color:P.white, fontFamily:font, marginBottom:"6px", letterSpacing:"-0.02em" }}>{title}</div>
                <div style={{ fontSize:"14px", color:"rgba(255,255,255,0.6)", fontFamily:font, lineHeight:1.65 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Animated Demo ── */}
      {(() => {
        const [demoPhase, setDemoPhase] = React.useState("idle"); // idle | loading | checking | results
        const [filesLoaded, setFilesLoaded] = React.useState([false,false,false,false,false]);
        const [checkPct, setCheckPct]   = React.useState(0);
        const [rowsVisible, setRowsVisible] = React.useState(0);
        const [expandedRow, setExpandedRow] = React.useState(null);

        const demoGuests = [
          { key:"sc",  first:"Sarah",   last:"Solomon",   email:"s.solomon@corp.com", status:"error", arrDiff:"—",   depDiff:"—",   issues:["Registered but no flight booked"],
            reg:{ checkIn:"Dec 4", checkOut:"Dec 7" }, flight:null, hotel:{ in:"Dec 4", out:"Dec 7", name:"Marriott Marquis" }, car:null },
          { key:"mw",  first:"Marcus",  last:"Williams",  email:"m.williams@corp.com", status:"error", arrDiff:"—",   depDiff:"—",   issues:["Has a hotel room but never registered"],
            reg:null, flight:{ arr:"Dec 5", dep:"Dec 8", num:"DL 441" },  hotel:{ in:"Dec 5", out:"Dec 8", name:"Westin St. Francis" }, car:{ pickup:"Dec 5", loc:"LAX" } },
          { key:"jp",  first:"Jennifer",last:"Park",      email:"j.park@corp.com",     status:"warn",  arrDiff:"+1d", depDiff:"0",   issues:["Requested check-in Dec 4 · hotel booked Dec 5"],
            reg:{ checkIn:"Dec 4", checkOut:"Dec 8" }, flight:{ arr:"Dec 5", dep:"Dec 8", num:"AA 109" },  hotel:{ in:"Dec 5", out:"Dec 8", name:"Hilton Union Sq" }, car:{ pickup:"Dec 5", loc:"SFO" } },
          { key:"dc",  first:"David",   last:"Chen",      email:"d.chen@corp.com",     status:"error", arrDiff:"—",   depDiff:"—",   issues:["Registered but no hotel booked"],
            reg:{ checkIn:"Dec 5", checkOut:"Dec 8" }, flight:{ arr:"Dec 5", dep:"Dec 8", num:"SW 884" },  hotel:null, car:null },
          { key:"ps",  first:"Priya",   last:"Sharma",    email:"p.sharma@corp.com",   status:"ok",    arrDiff:"0",   depDiff:"0",   issues:[],
            reg:{ checkIn:"Dec 4", checkOut:"Dec 7" }, flight:{ arr:"Dec 4", dep:"Dec 7", num:"UA 332" },  hotel:{ in:"Dec 4", out:"Dec 7", name:"Hilton Union Sq" }, car:{ pickup:"Dec 4", loc:"SFO" } },
          { key:"jm",  first:"James",   last:"Mitchell",  email:"j.mitchell@corp.com", status:"ok",    arrDiff:"0",   depDiff:"0",   issues:[],
            reg:{ checkIn:"Dec 5", checkOut:"Dec 8" }, flight:{ arr:"Dec 5", dep:"Dec 8", num:"AA 771" },  hotel:{ in:"Dec 5", out:"Dec 8", name:"Grand Hyatt" }, car:{ pickup:"Dec 5", loc:"OAK" } },
        ];

        const statusColor = s => s==="error" ? P.red : s==="warn" ? P.amber : P.green;
        const statusBg    = s => s==="error" ? "#FDECEC" : s==="warn" ? "#FEF8EC" : "#F0FDF7";
        const statusLabel = s => s==="error" ? "⚑ Flag" : s==="warn" ? "⚠ Review" : "✓ OK";

        const fileInfo = [
          { label:"Registration List", color:"#00A896", icon:"📋", sub:"event_registration.xlsx" },
          { label:"Flight Manifest", color:"#4F8EF7", icon:"✈️", sub:"flight_manifest_dec.xlsx" },
          { label:"Hotel Roster",    color:"#F5A623", icon:"🏨", sub:"hotel_roster_marriott.xlsx" },
          { label:"Car Transfers",   color:"#9B59B6", icon:"🚗", sub:"car_transfers_sfo.xlsx" },
          { label:"Dietary & Access",color:"#27AE60", icon:"🥗", sub:"dietary_requirements.xlsx" },
        ];

        const runDemo = () => {
          if (demoPhase !== "idle" && demoPhase !== "results") return;
          setDemoPhase("loading"); setFilesLoaded([false,false,false,false,false]);
          setCheckPct(0); setRowsVisible(0); setExpandedRow(null);

          [350,700,1050,1400,1750].forEach((t,i) =>
            setTimeout(() => setFilesLoaded(p => { const n=[...p]; n[i]=true; return n; }), t)
          );
          setTimeout(() => setDemoPhase("checking"), 2200);
          [8,22,37,51,65,78,90,100].forEach((v,i) =>
            setTimeout(() => setCheckPct(v), 2100 + i*200)
          );
          for (let i=0; i<demoGuests.length; i++)
            setTimeout(() => setRowsVisible(i+1), 3900 + i*260);
          setTimeout(() => setDemoPhase("results"), 3900 + demoGuests.length*260);
        };

        return (
          <div style={{ background:"#F0F2F7", padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
            <style>{`
              @keyframes ggIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
              @keyframes ggPulse { 0%,100%{opacity:.45} 50%{opacity:1} }
            `}</style>

            <div style={{ maxWidth:"1000px", margin:"0 auto" }}>
              {/* Header */}
              <div style={{ textAlign:"center", marginBottom:"48px" }}>
                <div style={{ fontSize:"12px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>SEE IT IN ACTION</div>
                <h2 style={{ fontSize:"clamp(28px, 4.5vw, 42px)", fontWeight:900, color:P.navy, fontFamily:font, margin:"0 0 14px", letterSpacing:"-0.035em", lineHeight:1.1 }}>
                  From files to flags<br/><span style={{ color:P.accent }}>in minutes, not days.</span>
                </h2>
                <p style={{ fontSize:"16px", color:P.grey400, fontFamily:font, lineHeight:1.7, maxWidth:"460px", margin:"0 auto" }}>
                  Watch GroupGrid check a 247-person registration list against the travel files and surface every gap instantly.
                </p>
              </div>

              {/* Browser window */}
              <div style={{ background:P.white, borderRadius:"20px", boxShadow:"0 8px 48px rgba(15,29,53,0.13)", overflow:"hidden", border:`1px solid ${P.grey100}` }}>

                {/* Chrome bar */}
                <div style={{ background:P.navy, padding:"11px 18px", display:"flex", alignItems:"center", gap:"10px" }}>
                  <div style={{ display:"flex", gap:"6px" }}>
                    {["#FF5F57","#FFBD2E","#28C840"].map(c => <div key={c} style={{ width:11, height:11, borderRadius:"50%", background:c }}/>)}
                  </div>
                  <div style={{ flex:1, display:"flex", justifyContent:"center" }}>
                    <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:"6px", padding:"4px 20px", fontSize:"12px", color:"rgba(255,255,255,0.45)", fontFamily:font }}>groupgrid.io — Annual Sales Summit · Dec 2026</div>
                  </div>
                </div>

                <div className="gg-demo-body" style={{ display:"flex", minHeight:"480px" }}>

                  {/* Mini sidebar */}
                  <div className="gg-demo-sidebar" style={{ width:"160px", flexShrink:0, background:P.navy, padding:"16px 12px", display:"flex", flexDirection:"column", gap:"4px" }}>
                    {[
                      { icon:"◉", label:"Registered",    count:demoPhase==="results"||demoPhase==="checking"?"247":"—",   active:true },
                      { icon:"⚑", label:"Action Needed", count:demoPhase==="results"?"4":"—",   color:P.red },
                      { icon:"✓", label:"Fully Booked",  count:demoPhase==="results"?"243":"—", color:P.accent },
                      { icon:"○", label:"Not Registered",count:demoPhase==="results"?"1":"—",   color:P.purple },
                    ].map(({ icon, label, count, active, color }) => (
                      <div key={label} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"5px 8px", borderRadius:"6px", background:active?"rgba(0,201,177,0.15)":"transparent" }}>
                        <span style={{ fontSize:"11px", color:color||"rgba(255,255,255,0.4)", width:12 }}>{icon}</span>
                        <span style={{ flex:1, fontSize:"11px", color:active?P.accent:"rgba(255,255,255,0.55)", fontFamily:font, fontWeight:active?700:400 }}>{label}</span>
                        <span style={{ fontSize:"11px", fontWeight:700, color:color||"rgba(255,255,255,0.4)", fontFamily:font }}>{count}</span>
                      </div>
                    ))}
                    <div style={{ height:1, background:"rgba(255,255,255,0.08)", margin:"8px 0" }}/>
                    <div style={{ fontSize:"10px", fontWeight:800, color:"rgba(255,255,255,0.3)", fontFamily:font, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"4px" }}>Files</div>
                    {fileInfo.map(({ label, color, icon }, i) => (
                      <div key={label} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"4px 8px" }}>
                        <span style={{ fontSize:"11px" }}>{filesLoaded[i] ? "✅" : "○"}</span>
                        <span style={{ fontSize:"10px", color:filesLoaded[i]?color:"rgba(255,255,255,0.25)", fontFamily:font, fontWeight:filesLoaded[i]?600:400, lineHeight:1.3 }}>{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Main panel */}
                  <div className="gg-demo-panel" style={{ flex:1, minWidth:0, padding:"20px 24px", overflowX:"hidden" }}>

                    {/* Idle state */}
                    {demoPhase === "idle" && (
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", flexDirection:"column", gap:"20px" }}>
                        <button onClick={runDemo} style={{ display:"flex", alignItems:"center", gap:"14px", background:`linear-gradient(135deg, ${P.navy}, #0D1E40)`, border:"none", borderRadius:"16px", padding:"18px 32px", cursor:"pointer", boxShadow:"0 4px 24px rgba(15,29,53,0.2)" }}>
                          <div style={{ width:44, height:44, borderRadius:"50%", background:P.accent, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <span style={{ fontSize:"18px", marginLeft:"3px" }}>▶</span>
                          </div>
                          <div style={{ textAlign:"left" }}>
                            <div style={{ fontSize:"16px", fontWeight:800, color:P.white, fontFamily:font }}>Watch the demo</div>
                            <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.45)", fontFamily:font }}>See a cross-check run in ~45 seconds</div>
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Loading files */}
                    {(demoPhase === "loading" || demoPhase === "checking" || demoPhase === "results") && (
                      <>
                        {/* File upload strip */}
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"8px", marginBottom:"16px" }}>
                          {fileInfo.map(({ label, color, icon }, i) => (
                            <div key={label} style={{ border:`1.5px ${filesLoaded[i]?"solid":"dashed"} ${filesLoaded[i]?color:P.grey200}`, borderRadius:"10px", padding:"10px 8px", textAlign:"center", background:filesLoaded[i]?color+"0D":P.offWhite, transition:"all 0.3s" }}>
                              <div style={{ fontSize:"18px", marginBottom:"4px" }}>{filesLoaded[i] ? "✅" : icon}</div>
                              <div style={{ fontSize:"10px", fontWeight:700, color:filesLoaded[i]?color:P.grey400, fontFamily:font, lineHeight:1.3 }}>{label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Progress bar */}
                        {(demoPhase === "checking" || demoPhase === "results") && (
                          <div style={{ marginBottom:"16px", animation:"ggIn 0.3s ease" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
                              <span style={{ fontSize:"12px", fontWeight:700, color:P.navy, fontFamily:font }}>
                                {checkPct < 100 ? "Checking 247 registrations against travel…" : "✓ Check complete — 4 issues found"}
                              </span>
                              <span style={{ fontSize:"12px", fontWeight:800, color:P.accent, fontFamily:font }}>{checkPct}%</span>
                            </div>
                            <div style={{ height:"6px", background:P.grey100, borderRadius:"20px", overflow:"hidden" }}>
                              <div style={{ height:"100%", width:`${checkPct}%`, background:`linear-gradient(90deg,${P.periwinkleD},${P.accent})`, borderRadius:"20px", transition:"width 0.2s ease" }}/>
                            </div>
                            {checkPct < 100 && <div style={{ fontSize:"11px", color:P.grey400, fontFamily:font, marginTop:"4px", animation:"ggPulse 1s infinite" }}>Matching names · comparing dates · scanning gaps…</div>}
                          </div>
                        )}

                        {/* Results table */}
                        {rowsVisible > 0 && (
                          <div className="gg-demo-table-scroll" style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
                          <div style={{ border:`1px solid ${P.grey100}`, borderRadius:"12px", overflow:"hidden", animation:"ggIn 0.3s ease", minWidth:"560px" }}>
                            {/* Table header */}
                            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 120px 70px 70px 70px 70px", background:"#ECEEF6", padding:"8px 14px", gap:"8px" }}>
                              {["First","Last","Email","Status","Arr.","Dep.","Δ Arr"].map(h => (
                                <div key={h} style={{ fontSize:"10px", fontWeight:700, color:P.grey400, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.05em" }}>{h}</div>
                              ))}
                            </div>
                            {/* Rows */}
                            {demoGuests.slice(0, rowsVisible).map((g, i) => {
                              const isExp = expandedRow === g.key;
                              return (
                                <React.Fragment key={g.key}>
                                  <div onClick={() => setExpandedRow(isExp ? null : g.key)}
                                    style={{ display:"grid", gridTemplateColumns:"1fr 1fr 120px 70px 70px 70px 70px", padding:"9px 14px", gap:"8px", alignItems:"center", background:isExp?"#F4F6FB":i%2===0?P.white:"#FAFBFD", borderTop:`1px solid ${P.grey100}`, cursor:"pointer", animation:"ggIn 0.3s ease", transition:"background 0.15s" }}>
                                    <span style={{ fontSize:"13px", fontWeight:600, color:P.navy, fontFamily:font }}>{g.first}</span>
                                    <span style={{ fontSize:"13px", fontWeight:700, color:P.navy, fontFamily:font }}>{g.last}</span>
                                    <span style={{ fontSize:"11px", color:P.grey400, fontFamily:font, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{g.email}</span>
                                    <span style={{ fontSize:"10px", fontWeight:800, color:statusColor(g.status), background:statusBg(g.status), padding:"2px 7px", borderRadius:"20px", fontFamily:font, whiteSpace:"nowrap" }}>{statusLabel(g.status)}</span>
                                    <span style={{ fontSize:"12px", color:P.grey600, fontFamily:font }}>{g.flight?.arr||"⚠"}</span>
                                    <span style={{ fontSize:"12px", color:P.grey600, fontFamily:font }}>{g.flight?.dep||"⚠"}</span>
                                    <span style={{ fontSize:"12px", fontWeight:700, fontFamily:font, color:g.arrDiff==="0"?P.green:P.red }}>{g.arrDiff}</span>
                                  </div>
                                  {/* Expanded detail */}
                                  {isExp && (
                                    <div style={{ background:"#F4F6FB", borderTop:`1px solid ${P.grey100}`, padding:"14px 16px", animation:"ggIn 0.2s ease" }}>
                                      {g.issues.length > 0 && (
                                        <div style={{ display:"flex", gap:"8px", marginBottom:"12px", flexWrap:"wrap" }}>
                                          {g.issues.map(iss => (
                                            <div key={iss} style={{ display:"flex", alignItems:"center", gap:"6px", background:"#FDECEC", border:"1px solid #F5C6C6", borderRadius:"8px", padding:"5px 10px" }}>
                                              <span style={{ fontSize:"12px" }}>⚑</span>
                                              <span style={{ fontSize:"12px", fontWeight:700, color:P.red, fontFamily:font }}>{iss}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"10px" }}>
                                        {/* Registration card — the source of truth */}
                                        <div style={{ background:P.white, border:`1.5px solid ${g.reg?"#00A89633":"#FDECEC"}`, borderRadius:"10px", padding:"12px 14px" }}>
                                          <div style={{ fontSize:"11px", fontWeight:800, color:"#00A896", fontFamily:font, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.06em" }}>📋 Registration</div>
                                          {g.reg ? <>
                                            <div style={{ fontSize:"12px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Requested in: <strong style={{ color:P.navy }}>{g.reg.checkIn}</strong></div>
                                            <div style={{ fontSize:"12px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Requested out: <strong style={{ color:P.navy }}>{g.reg.checkOut}</strong></div>
                                            <div style={{ fontSize:"12px", color:P.accentD, fontFamily:font, fontWeight:700 }}>✓ Registered</div>
                                          </> : <div style={{ fontSize:"12px", fontWeight:700, color:P.red, fontFamily:font }}>⚑ Not on registration list</div>}
                                        </div>
                                        {/* Flight card */}
                                        <div style={{ background:P.white, border:`1.5px solid #4F8EF722`, borderRadius:"10px", padding:"12px 14px" }}>
                                          <div style={{ fontSize:"11px", fontWeight:800, color:"#4F8EF7", fontFamily:font, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.06em" }}>✈ Flight</div>
                                          {g.flight ? <>
                                            <div style={{ fontSize:"12px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Arrival: <strong style={{ color:P.navy }}>{g.flight.arr}</strong></div>
                                            <div style={{ fontSize:"12px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Departure: <strong style={{ color:P.navy }}>{g.flight.dep}</strong></div>
                                            <div style={{ fontSize:"12px", color:P.grey400, fontFamily:font }}>Flight: {g.flight.num}</div>
                                          </> : <div style={{ fontSize:"12px", fontWeight:700, color:P.red, fontFamily:font }}>⚑ No flight booked</div>}
                                        </div>
                                        {/* Hotel card */}
                                        <div style={{ background:P.white, border:`1.5px solid ${g.hotel?"#F5A62322":"#FDECEC"}`, borderRadius:"10px", padding:"12px 14px" }}>
                                          <div style={{ fontSize:"11px", fontWeight:800, color:"#F5A623", fontFamily:font, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.06em" }}>🏨 Hotel</div>
                                          {g.hotel ? <>
                                            <div style={{ fontSize:"12px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Check-in: <strong style={{ color: g.status!=="ok"&&g.issues[0]?.includes("check-in")?P.red:P.navy }}>{g.hotel.in}</strong></div>
                                            <div style={{ fontSize:"12px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Check-out: <strong style={{ color:P.navy }}>{g.hotel.out}</strong></div>
                                            <div style={{ fontSize:"12px", color:P.grey400, fontFamily:font }}>{g.hotel.name}</div>
                                          </> : <div style={{ fontSize:"12px", fontWeight:700, color:P.red, fontFamily:font }}>⚑ No hotel booked</div>}
                                        </div>
                                        {/* Car card */}
                                        <div style={{ background:P.white, border:`1.5px solid #9B59B622`, borderRadius:"10px", padding:"12px 14px" }}>
                                          <div style={{ fontSize:"11px", fontWeight:800, color:"#9B59B6", fontFamily:font, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.06em" }}>🚗 Car Transfer</div>
                                          {g.car ? <>
                                            <div style={{ fontSize:"12px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Pickup: <strong style={{ color:P.navy }}>{g.car.pickup}</strong></div>
                                            <div style={{ fontSize:"12px", color:P.grey400, fontFamily:font }}>Location: {g.car.loc}</div>
                                          </> : <div style={{ fontSize:"12px", color:P.grey400, fontFamily:font }}>— No transfer</div>}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                          </div>
                        )}

                        {/* Replay */}
                        {demoPhase === "results" && (
                          <div style={{ display:"flex", justifyContent:"center", gap:"12px", marginTop:"20px", animation:"ggIn 0.4s ease" }}>
                            <button onClick={runDemo} style={{ background:"none", border:`1.5px solid ${P.grey100}`, borderRadius:"10px", padding:"8px 18px", fontSize:"13px", fontWeight:700, color:P.grey400, fontFamily:font, cursor:"pointer" }}>↺ Replay</button>
                            <button onClick={onEnter} style={{ background:P.accent, border:"none", borderRadius:"10px", padding:"8px 20px", fontSize:"13px", fontWeight:700, color:P.white, fontFamily:font, cursor:"pointer", boxShadow:"0 2px 10px rgba(0,201,177,0.3)" }}>Try with your files →</button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      <div style={{ background:`linear-gradient(135deg, ${P.navy}, #0D1E40)`, padding:"96px 40px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-120, left:"50%", transform:"translateX(-50%)", width:600, height:600, borderRadius:"50%", background:`radial-gradient(circle, ${P.accent}10, transparent 65%)`, pointerEvents:"none" }} />
        <div style={{ position:"relative" }}>
          <h2 style={{ fontSize:"clamp(32px,5vw,52px)", fontWeight:900, color:P.white, fontFamily:font, margin:"0 0 16px", letterSpacing:"-0.04em", lineHeight:1.1 }}>
            Stop cross-checking.<br/>Start <span style={{ color:P.accent }}>running great events.</span>
          </h2>
          <p style={{ fontSize:"18px", color:"rgba(255,255,255,0.5)", fontFamily:font, margin:"0 auto 28px", lineHeight:1.7, maxWidth:"480px" }}>
            Join event professionals who've turned days of logistics work into a few minutes.
          </p>
          <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:"rgba(0,201,177,0.1)", border:"1px solid rgba(0,201,177,0.25)", borderRadius:"20px", padding:"6px 16px", marginBottom:"32px" }}>
            <ShieldCheck size={14} strokeWidth={2} color={P.accent}/>
            <span style={{ fontSize:"13px", fontWeight:600, color:"rgba(255,255,255,0.7)", fontFamily:font }}>Built by a planner with 15+ years in the field · Your data never leaves your browser</span>
          </div>
          <div className="gg-cta-btns" style={{ display:"flex", gap:"12px", justifyContent:"center", flexWrap:"wrap" }}>
            <button onClick={onEnter} style={{ background:`linear-gradient(135deg, ${P.accent}, ${P.accentD})`, border:"none", borderRadius:"12px", padding:"16px 40px", fontSize:"17px", fontWeight:800, color:P.white, fontFamily:font, cursor:"pointer", boxShadow:"0 4px 24px rgba(0,201,177,0.4)", letterSpacing:"-0.02em" }}>
              Try GroupGrid free →
            </button>
            <button onClick={onPricing} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"12px", padding:"16px 28px", fontSize:"16px", fontWeight:600, color:"rgba(255,255,255,0.75)", fontFamily:font, cursor:"pointer" }}>
              View pricing
            </button>
          </div>
          <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.25)", fontFamily:font, marginTop:"20px" }}>Full access · 10,000+ records · $249/mo · Cancel any time · No data ever leaves your browser</p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ background:P.navy, padding:"28px 40px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <span style={{ fontSize:"13px", color:"rgba(255,255,255,0.3)", fontFamily:font }}>Built for event professionals · © 2026</span>
        </div>
        <div style={{ display:"flex", gap:"20px" }}>
          {[
            ["Home", onEnter],
            ["Pricing", onPricing],
            ["About", onAbout],
            ["FAQ", onFaq],
            ["Contact", onContact],
            ["Privacy Policy", onPrivacy],
            ["Terms of Service", onTerms],
          ].map(([label, fn]) => (
            <button key={label} onClick={fn} style={{ background:"none", border:"none", fontSize:"13px", color:"rgba(255,255,255,0.35)", fontFamily:font, cursor:"pointer", textDecoration:"underline", textDecorationColor:"rgba(255,255,255,0.15)" }}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Pricing Page ──────────────────────────────────────────────────────────────
function PricingPage({ onBack }) {
  const [billing, setBilling] = useState("monthly");
  const annual = billing === "annual";

  // Replace these href values with your actual Stripe payment links
  const STRIPE_MONTHLY = "https://buy.stripe.com/monthly_link_placeholder";
  const STRIPE_ANNUAL  = "https://buy.stripe.com/annual_link_placeholder";

  return (
    <div style={{ minHeight:"100vh", background:P.offWhite, fontFamily:font }}>
      {/* Nav */}
      <div style={{ background:P.navy, padding:"0 32px", height:"52px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 0 rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"8px", padding:"5px 14px", color:"rgba(255,255,255,0.75)", fontSize:"13px", fontFamily:font, fontWeight:600, cursor:"pointer" }}>← Back to app</button>
        <span style={{ color:P.accent, fontSize:"13px", fontWeight:700, fontFamily:font, letterSpacing:"0.05em" }}>PRICING</span>
      </div>

      {/* Hero */}
      <div style={{ background:`linear-gradient(160deg, ${P.navy} 0%, ${P.navyLight} 100%)`, padding:"64px 28px 56px", textAlign:"center" }}>
        <h1 style={{ fontSize:"44px", fontWeight:900, color:P.white, fontFamily:font, margin:"0 0 14px", letterSpacing:"-0.04em", lineHeight:1.1 }}>
          Simple pricing.<br/><span style={{ color:P.accent }}>No surprises.</span>
        </h1>
        <p style={{ fontSize:"17px", color:"rgba(255,255,255,0.55)", fontFamily:font, margin:"0 0 32px", lineHeight:1.6 }}>
          One plan. All features. Try free with your real data.
        </p>
        {/* Billing toggle */}
        <div style={{ display:"inline-flex", background:"rgba(255,255,255,0.08)", borderRadius:"12px", padding:"4px", gap:"4px" }}>
          {[["monthly","Monthly"],["annual","Annual · Save 17%"]].map(([k,l]) => (
            <button key={k} onClick={() => setBilling(k)} style={{ padding:"8px 22px", borderRadius:"9px", border:"none", cursor:"pointer", fontFamily:font, fontSize:"14px", fontWeight:700, transition:"all 0.18s", background:billing===k?P.white:"transparent", color:billing===k?P.navy:"rgba(255,255,255,0.55)", boxShadow:billing===k?"0 1px 4px rgba(0,0,0,0.15)":"none" }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Single plan card */}
      <div style={{ maxWidth:"460px", margin:"-32px auto 0", padding:"0 24px 72px" }}>
        <div style={{ background:P.white, borderRadius:"20px", overflow:"hidden", boxShadow:"0 8px 40px rgba(0,201,177,0.18), 0 2px 12px rgba(0,0,0,0.06)", border:`2px solid ${P.accent}`, position:"relative" }}>

          {/* Best Value badge for annual */}
          {annual && (
            <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", background:P.accent, color:P.white, fontSize:"11px", fontWeight:800, fontFamily:font, letterSpacing:"0.07em", padding:"4px 18px", borderRadius:"0 0 10px 10px", textTransform:"uppercase", whiteSpace:"nowrap" }}>
              Best Value — Save $988/yr
            </div>
          )}

          <div style={{ padding: annual ? "40px 32px 28px" : "32px 32px 28px" }}>
            <div style={{ fontSize:"12px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"10px" }}>GroupGrid</div>

            {/* Price */}
            <div style={{ display:"flex", alignItems:"flex-end", gap:"6px", marginBottom:"6px" }}>
              <span style={{ fontSize:"52px", fontWeight:900, color:P.navy, fontFamily:font, letterSpacing:"-0.04em", lineHeight:1 }}>
                {annual ? "$2,000" : "$249"}
              </span>
              <span style={{ fontSize:"16px", color:P.grey400, fontFamily:font, marginBottom:"8px" }}>
                {annual ? "/year" : "/month"}
              </span>
            </div>
            {annual && (
              <div style={{ fontSize:"14px", color:P.green, fontWeight:700, fontFamily:font, marginBottom:"4px" }}>
                Equivalent to $167/mo · billed annually
              </div>
            )}
            <div style={{ fontSize:"14px", color:P.grey400, fontFamily:font, marginBottom:"16px" }}>1 user · unlimited events · all features</div>

            {/* Trial callout */}
            <div style={{ background:P.accentLight, border:`1.5px solid ${P.accent}44`, borderRadius:"10px", padding:"12px 16px", marginBottom:"16px", display:"flex", alignItems:"center", gap:"10px" }}>
              <span style={{ fontSize:"18px", flexShrink:0 }}>🎯</span>
              <div>
                <div style={{ fontSize:"13px", fontWeight:800, color:P.teal, fontFamily:font }}>Try it free first</div>
                <div style={{ fontSize:"13px", color:P.grey600, fontFamily:font, lineHeight:1.5 }}>Upload your own files and run a full cross-check — no credit card, no commitment. See exactly how GroupGrid works with your real data before subscribing.</div>
              </div>
            </div>

            <a href={annual ? STRIPE_ANNUAL : STRIPE_MONTHLY} target="_blank" rel="noreferrer"
              style={{ display:"block", width:"100%", background:P.accent, border:"none", borderRadius:"12px", padding:"15px", fontSize:"16px", fontWeight:800, fontFamily:font, color:P.white, cursor:"pointer", textAlign:"center", textDecoration:"none", boxShadow:"0 4px 16px rgba(0,201,177,0.35)", letterSpacing:"-0.01em", boxSizing:"border-box" }}>
              Subscribe now →
            </a>
          </div>

          {/* Feature list */}
          <div style={{ borderTop:`1px solid ${P.grey100}`, padding:"24px 32px 32px" }}>
            <div style={{ fontSize:"12px", fontWeight:700, color:P.grey400, fontFamily:font, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:"16px" }}>Everything included</div>
            {[
              "Flight, hotel, car & dietary cross-referencing",
              "Unlimited guests per event",
              "Date mismatch & flag detection",
              "Bulk email drafting (guest, hotel, travel)",
              "Shareable HTML reports",
              "Export to Excel",
              "Notes & issue resolution workflow",
              "Browser-local · zero PII uploaded",
            ].map((f,i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"10px", marginBottom:"12px" }}>
                <div style={{ width:18, height:18, borderRadius:"50%", background:P.accentLight, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"1px" }}>
                  <Check size={11} strokeWidth={3} color={P.accentD} />
                </div>
                <span style={{ fontSize:"14px", color:P.grey600, fontFamily:font, lineHeight:1.5 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust / reassurance */}
        <div style={{ marginTop:"28px", display:"flex", flexDirection:"column", gap:"10px" }}>
          {[
            { icon:<Check size={13} strokeWidth={2.5}/>, text:"Try free — no credit card required" },
            { icon:<Lock size={13} strokeWidth={2}/>, text:"Payments processed securely by Stripe" },
            { icon:<X size={13} strokeWidth={2.5}/>, text:"Cancel any time — no long-term commitment" },
            { icon:<ShieldCheck size={13} strokeWidth={2}/>, text:"Your guest files never leave your browser" },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <span style={{ color:P.grey400, display:"flex" }}>{icon}</span>
              <span style={{ fontSize:"13px", color:P.grey400, fontFamily:font }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Questions */}
        <div style={{ marginTop:"36px", background:P.white, borderRadius:"14px", border:`1px solid ${P.grey100}`, padding:"20px 24px", textAlign:"center" }}>
          <div style={{ fontSize:"15px", fontWeight:700, color:P.navy, fontFamily:font, marginBottom:"6px" }}>Questions?</div>
          <div style={{ fontSize:"14px", color:P.grey400, fontFamily:font }}>Email us at <a href="mailto:groupgrid@outlook.com" style={{ color:P.periwinkleD, fontWeight:600, textDecoration:"none" }}>groupgrid@outlook.com</a> and we'll get back to you within one business day.</div>
        </div>
      </div>
    </div>
  );
}

// ── Supabase client ───────────────────────────────────────────────────────────
// Loaded via CDN — no build step required.
// Keys are safe to be public (publishable key + RLS enforces data isolation).
const SUPABASE_URL = "https://ajabrqcbultkaszsycwh.supabase.co";
const SUPABASE_KEY = "sb_publishable_yn6mJb93k85y5nrJJReQSA_M6iliVoD";

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  if (window.supabase?.createClient) {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }
  return _supabase;
}

export default function GroupGridApp() {
  const [user, setUser]           = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Load Supabase from CDN once, then check existing session
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = async () => {
      const sb = getSupabase();
      if (!sb) { setAuthReady(true); return; }
      // Restore existing session (e.g. user refreshes the page)
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        setUser({ email: session.user.email, name: session.user.user_metadata?.name || session.user.email.split("@")[0], id: session.user.id });
      }
      // Listen for auth state changes (sign in, sign out, token refresh)
      sb.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({ email: session.user.email, name: session.user.user_metadata?.name || session.user.email.split("@")[0], id: session.user.id });
        } else {
          setUser(null);
        }
      });
      setAuthReady(true);
    };
    script.onerror = () => setAuthReady(true); // Fail gracefully — app still works without auth
    document.head.appendChild(script);
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, []);

  const handleLogout = async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setUser(null);
  };

  if (!authReady) {
    return (
      <div style={{ minHeight:"100vh", background:P.navy, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:font }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:40, height:40, border:`3px solid rgba(255,255,255,0.1)`, borderTop:`3px solid ${P.accent}`, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 16px" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ color:"rgba(255,255,255,0.4)", fontSize:"14px" }}>Loading GroupGrid…</div>
        </div>
      </div>
    );
  }

  return <ErrorBoundary><GroupGrid user={user} onLogin={setUser} onLogout={handleLogout} /></ErrorBoundary>;
}

// ── Upload Square component (hooks must be at component top level) ──────────
function UploadSquare({ label, icon, accent, file, setter, required, sub, compact }) {
  const [drag, setDrag] = useState(false);
  const onDrop = e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setter(f); };

  if (compact) {
    // Horizontal pill style for the sub-header bar
    return (
      <label
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        style={{ display:"flex", alignItems:"center", gap:"8px", border:`1.5px dashed ${drag ? accent : file ? accent : P.grey200}`, borderRadius:"10px", padding:"7px 12px", cursor:"pointer", background:file ? accent+"0D" : drag ? accent+"07" : P.offWhite, transition:"all 0.15s", position:"relative", flexShrink:0, minWidth:"140px" }}>
        <input type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} onChange={e => e.target.files[0] && setter(e.target.files[0])} />
        <span style={{ display:"flex", alignItems:"center", color:file?P.accent:accent }}>{file ? <Check size={14} strokeWidth={2.5}/> : icon}</span>
        <div style={{ minWidth:0 }}>
          {file ? (
            <>
              <div style={{ fontSize:"15px", fontWeight:800, color:accent, fontFamily:font, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"110px" }}>{file.name}</div>
              <div style={{ fontSize:"14px", color:P.green, fontWeight:700, fontFamily:font }}><Check size={10} strokeWidth={2.5} style={{display:"inline",marginRight:3}}/>Ready</div>
            </>
          ) : (
            <>
              <div style={{ fontSize:"15px", fontWeight:800, color:P.navy, fontFamily:font, whiteSpace:"nowrap" }}>{label}</div>
              <div style={{ fontSize:"14px", color:P.navyLight, fontFamily:font }}>{sub}{!required ? " · Optional" : ""}</div>
            </>
          )}
        </div>
        {file && <button onClick={e => { e.preventDefault(); setter(null); }} style={{ marginLeft:"auto", background:"transparent", border:"none", color:P.navyLight, fontSize:"14px", cursor:"pointer", lineHeight:1, flexShrink:0 }} title="Remove">✕</button>}
      </label>
    );
  }

  // Original full square layout (used in format guide preview / elsewhere if needed)
  return (
    <label
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"120px", border:`1.5px dashed ${drag ? accent : file ? accent : P.grey200}`, borderRadius:"12px", padding:"20px 12px 16px", cursor:"pointer", background:file ? accent+"08" : drag ? accent+"05" : P.white, transition:"all 0.18s", position:"relative", textAlign:"center" }}>
      <input type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} onChange={e => e.target.files[0] && setter(e.target.files[0])} />
      {!required && !file && (
        <span style={{ position:"absolute", top:7, right:10, fontSize:"10px", color:P.grey400, fontFamily:font, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.06em" }}>Optional</span>
      )}
      <div style={{ width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"8px", color:file?P.accent:accent, flexShrink:0 }}>{file ? <Check size={24} strokeWidth={2} color={P.green}/> : icon}</div>
      {file ? (
        <>
          <div style={{ color:accent, fontSize:"15px", fontWeight:600, fontFamily:font, maxWidth:"120px", wordBreak:"break-word", lineHeight:1.3, textAlign:"center" }}>{file.name}</div>
          <div style={{ marginTop:"6px", background:P.greenLight, color:P.green, fontSize:"15px", fontWeight:600, padding:"2px 10px", borderRadius:"20px", fontFamily:font, display:"flex", alignItems:"center", gap:3 }}><Check size={10} strokeWidth={2.5}/>Ready</div>
          <button onClick={e => { e.preventDefault(); setter(null); }} style={{ position:"absolute", top:9, right:12, background:"transparent", border:"none", color:P.navyLight, fontSize:"15px", cursor:"pointer", lineHeight:1, display:"flex", alignItems:"center" }} title="Remove"><X size={13} strokeWidth={2}/></button>
        </>
      ) : (
        <>
          <div style={{ color:P.navy, fontWeight:600, fontSize:"14px", marginBottom:"3px", fontFamily:font, textAlign:"center", lineHeight:1.3 }}>{label}</div>
          <div style={{ color:P.navyLight, fontSize:"15px", fontFamily:font, textAlign:"center" }}>{sub}</div>
        </>
      )}
    </label>
  );
}

// ── Two-step Setup screen (Option 1). Step 1 = project details (event name required),
// Step 2 = file uploads (required on top, optional below). Accepts .xlsx/.xls/.csv.
function SetupTile({ label, sub, icon, accent, file, setter, required, recommended, columns }) {
  const [drag, setDrag] = useState(false);
  const [hover, setHover] = useState(false);
  const onDrop = e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setter(f); };
  return (
    <label
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
      style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", justifyContent:"center", minHeight:"96px", border:`1.5px ${file?"solid":"dashed"} ${file?accent:drag?accent:P.grey200}`, borderRadius:"11px", padding:"12px 10px", cursor:"pointer", background:file?accent+"0D":drag?accent+"08":P.grey50, transition:"all 0.15s" }}>
      <input type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} onChange={e => e.target.files[0] && setter(e.target.files[0])} />
      <span style={{ position:"absolute", top:7, left:0, right:0, display:"flex", justifyContent:"center" }}>
        {recommended
          ? <span style={{ fontSize:"9px", fontWeight:600, padding:"1px 7px", borderRadius:"20px", background:"#DCF2F2", color:"#0A7B7A", fontFamily:font }}>Source of truth</span>
          : required
            ? <span style={{ fontSize:"9px", fontWeight:600, padding:"1px 7px", borderRadius:"20px", background:P.redLight, color:P.red, fontFamily:font }}>Required</span>
            : <span style={{ fontSize:"9px", fontWeight:500, padding:"1px 7px", borderRadius:"20px", background:P.grey100, color:P.grey400, fontFamily:font }}>Optional</span>}
      </span>
      <div style={{ marginTop:"12px", marginBottom:"5px", color:file?P.green:accent }}>{file ? <Check size={20} strokeWidth={2} color={P.green}/> : icon}</div>
      <div style={{ fontSize:"13px", fontWeight:500, color:P.navy, fontFamily:font, marginBottom:"2px", wordBreak:"break-word", maxWidth:"130px", lineHeight:1.25 }}>{file ? file.name : label}</div>
      <div style={{ fontSize:"10px", color:file?P.green:P.grey400, fontFamily:font, fontWeight:file?500:400 }}>{file ? "Ready" : sub}</div>
      {file && <button onClick={e => { e.preventDefault(); setter(null); }} style={{ position:"absolute", top:8, right:10, background:"transparent", border:"none", color:P.grey400, cursor:"pointer", lineHeight:1 }} title="Remove"><X size={13} strokeWidth={2}/></button>}
      {hover && !file && columns && (
        <div style={{ position:"absolute", bottom:"calc(100% + 8px)", left:"50%", transform:"translateX(-50%)", width:"210px", background:P.navy, borderRadius:"10px", padding:"12px 14px", boxShadow:"0 8px 24px rgba(0,0,0,0.3)", zIndex:30, textAlign:"left", pointerEvents:"none" }}>
          <div style={{ fontSize:"11px", fontWeight:600, color:P.accent, fontFamily:font, marginBottom:"7px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Expected columns</div>
          {columns.map(c => <div key={c} style={{ fontSize:"12px", color:"rgba(255,255,255,0.75)", fontFamily:font, lineHeight:1.7 }}>{c}</div>)}
        </div>
      )}
    </label>
  );
}

function SetupScreen({
  eventName, setEventName, arrivalStart, setArrivalStart, arrivalEnd, setArrivalEnd,
  departureStart, setDepartureStart, departureEnd, setDepartureEnd,
  contacts, setContactsOpen,
  registrationFile, setRegistrationFile, flightFile, setFlightFile, hotelFile, setHotelFile,
  hotelProperty, setHotelProperty, extraHotels, setExtraHotels,
  carFile, setCarFile, dietaryFile, setDietaryFile,
  ready, loading, error, runCheck, isMobile
}) {
  const hasName = !!(eventName && eventName.trim());
  const canRun = hasName && ready && !loading;
  const hasContacts = contacts && (contacts.hotel?.email || contacts.travel?.email);
  return (
    <div style={{ maxWidth:"1080px", margin:"0 auto", width:"100%" }}>
      <h1 style={{ fontSize:"clamp(20px,3vw,24px)", fontWeight:600, color:P.navy, fontFamily:font, letterSpacing:"-0.02em", margin:"0 0 4px" }}>New project</h1>
      <p style={{ fontSize:"13px", color:P.grey600, fontFamily:font, margin:"0 0 18px", lineHeight:1.5 }}>Set up your event, then upload your spreadsheets to run the cross-check.</p>

      <div style={{ display:"flex", alignItems:"center", marginBottom:"18px", flexWrap:"wrap", gap:"8px" }}>
        {[
          { n:"1", label:"Project details", state: hasName ? "done" : "active" },
          { n:"2", label:"Upload files", state: hasName ? (ready ? "done" : "active") : "todo" },
          { n:"3", label:"Review results", state:"todo" },
        ].map(({ n, label, state }, i) => (
          <React.Fragment key={label}>
            {i > 0 && <div className="gg-step-line" style={{ flex:1, height:"1.5px", background:P.grey100, margin:"0 12px", minWidth:"20px" }} />}
            <div style={{ display:"flex", alignItems:"center", gap:"9px" }}>
              <span style={{ width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:600, flexShrink:0, fontFamily:font, background: state==="done"?P.accent:state==="active"?P.navy:P.grey100, color: state==="todo"?P.grey400:P.white }}>{state==="done"?<Check size={14} strokeWidth={2.5}/>:n}</span>
              <span style={{ fontSize:"14px", fontWeight: state==="todo"?400:500, color: state==="todo"?P.grey400:P.navy, fontFamily:font }}>{label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="gg-setup-cols" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(380px, 1fr))", gap:"14px", alignItems:"start" }}>
      <div style={{ background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"14px", padding:"18px 20px", marginBottom:"14px" }}>
        <div style={{ fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font, marginBottom:"3px" }}>Step 1 · Project details</div>
        <div style={{ fontSize:"12px", color:P.grey400, fontFamily:font, marginBottom:"14px" }}>Name your event and (optionally) set travel dates and contacts.</div>
        <div style={{ marginBottom:"14px" }}>
          <label style={{ display:"block", fontSize:"13px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"6px" }}>Event name <span style={{ color:P.red }}>required</span></label>
          <input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. Sales Summit 2026"
            style={{ width:"100%", background:P.grey50, border:`1.5px solid ${hasName?P.accent+"88":P.grey100}`, borderRadius:"10px", padding:"11px 13px", fontSize:"14px", color:P.navy, fontFamily:font, outline:"none", boxSizing:"border-box" }} />
        </div>
        <div style={{ fontSize:"12px", fontWeight:500, color:P.grey400, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.05em", margin:"4px 0 4px" }}>Approved travel dates <span style={{ textTransform:"none", letterSpacing:0, fontWeight:400 }}>· optional</span></div>
        <div style={{ fontSize:"12px", color:P.grey400, fontFamily:font, marginBottom:"12px", lineHeight:1.5 }}>Set the dates your event covers. GroupGrid flags anyone whose flight or hotel falls outside this range — e.g. arriving early or leaving late beyond what's approved.</div>
        <div className="gg-setup-grid2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"6px" }}>
          {[
            { label:"Earliest arrival", val:arrivalStart, set:setArrivalStart },
            { label:"Latest arrival", val:arrivalEnd, set:setArrivalEnd },
            { label:"Earliest departure", val:departureStart, set:setDepartureStart },
            { label:"Latest departure", val:departureEnd, set:setDepartureEnd },
          ].map(({ label, val, set }) => (
            <div key={label} style={{ marginBottom:"12px" }}>
              <label style={{ display:"block", fontSize:"13px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"6px" }}>{label}</label>
              <input type="date" value={val} onChange={e => set(e.target.value)}
                style={{ width:"100%", background:P.grey50, border:`1.5px solid ${val?P.accent+"66":P.grey100}`, borderRadius:"10px", padding:"10px 13px", fontSize:"14px", color:val?P.navy:P.grey400, fontFamily:font, outline:"none", boxSizing:"border-box" }} />
            </div>
          ))}
        </div>
        <div style={{ fontSize:"12px", fontWeight:500, color:P.grey400, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.05em", margin:"8px 0 12px" }}>Contacts <span style={{ textTransform:"none", letterSpacing:0, fontWeight:400 }}>· optional — to email your hotel &amp; travel agency directly</span></div>
        <button onClick={() => setContactsOpen(true)}
          style={{ display:"flex", alignItems:"center", gap:"10px", width:"100%", background:hasContacts?P.accent+"12":P.grey50, border:`1.5px ${hasContacts?"solid":"dashed"} ${hasContacts?P.accent+"55":P.grey200}`, borderRadius:"10px", padding:"12px 14px", cursor:"pointer", fontFamily:font, textAlign:"left" }}>
          <Users size={18} strokeWidth={1.5} color={P.accentD}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:"14px", fontWeight:500, color:hasContacts?P.accentD:P.grey600, fontFamily:font }}>{hasContacts ? "Contacts added" : "Add hotel & travel agency contacts"}</div>
            {hasContacts && <div style={{ fontSize:"12px", color:P.grey400, fontFamily:font, marginTop:"1px" }}>{[contacts.hotel?.name, contacts.travel?.name].filter(Boolean).join(" · ")}</div>}
          </div>
          {hasContacts && <Check size={15} strokeWidth={2.5} color={P.accentD}/>}
        </button>
      </div>

      <div style={{ background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"14px", padding:"18px 20px", marginBottom:"14px", opacity: hasName ? 1 : 0.55, pointerEvents: hasName ? "auto" : "none", transition:"opacity 0.2s" }}>
        <div style={{ fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font, marginBottom:"3px" }}>Step 2 · Upload files {!hasName && <span style={{ fontSize:"12px", fontWeight:400, color:P.grey400 }}>· name your event first</span>}</div>
        <div style={{ fontSize:"12px", color:P.grey400, fontFamily:font, marginBottom:"14px" }}>Upload whatever you have — registration, flights, hotels, cars, dietary. GroupGrid cross-checks any 2 or more. Excel or CSV. Hover a tile for expected columns.</div>
        <div style={{ fontSize:"12px", fontWeight:500, color:P.grey400, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"12px" }}>Upload any 2 or more</div>
        <div className="gg-setup-tiles3" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"14px" }}>
          <SetupTile label="Registration List" sub="Best anchor" icon={<Users size={20} strokeWidth={1.5} color="#00A896"/>} accent={P.accentD} file={registrationFile} setter={setRegistrationFile} recommended columns={["First/Last Name (or Name)","Email","Company / Job Title (opt)","Requested Check-In / Out (opt)","Flight / Hotel Request (opt)"]} />
          <SetupTile label="Flight Manifest" sub=".xlsx, .xls, .csv" icon={<Plane size={20} strokeWidth={1.5} color="#4F8EF7"/>} accent={P.periwinkleD} file={flightFile} setter={setFlightFile} columns={["First/Last Name (or Name)","Email (opt)","Arrival Date","Departure Date","Flight # (opt)"]} />
          <SetupTile label="Hotel Roster" sub=".xlsx, .xls, .csv" icon={<Hotel size={20} strokeWidth={1.5} color="#F5A623"/>} accent={P.navy} file={hotelFile} setter={setHotelFile} columns={["First/Last Name (or Name)","Email (opt)","Check-In Date","Check-Out Date","Hotel / Room (opt)"]} />
        </div>

        {/* Multi-hotel: name the property and add more rooming lists */}
        {hotelFile && (
          <div style={{ background:P.grey50, border:`1px solid ${P.grey100}`, borderRadius:"12px", padding:"14px 16px", marginBottom:"14px" }}>
            <div style={{ fontSize:"13px", fontWeight:600, color:P.navy, fontFamily:font, marginBottom:"3px" }}>Hotel properties</div>
            <div style={{ fontSize:"12px", color:P.grey400, fontFamily:font, marginBottom:"12px", lineHeight:1.5 }}>Running more than one hotel? Name each property and add its rooming list. If a file already has a "Hotel" column, GroupGrid uses that automatically.</div>

            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
              <Hotel size={16} strokeWidth={1.5} color="#F5A623" style={{ flexShrink:0 }}/>
              <span style={{ fontSize:"13px", color:P.grey600, fontFamily:font, flex:"0 0 130px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{hotelFile.name}</span>
              <input value={hotelProperty} onChange={e => setHotelProperty(e.target.value)} placeholder="Property name (optional)"
                style={{ flex:1, background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"8px", padding:"7px 11px", fontSize:"13px", color:P.navy, fontFamily:font, outline:"none", minWidth:0 }} />
            </div>

            {extraHotels.map((eh, idx) => (
              <div key={eh.id} style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
                <Hotel size={16} strokeWidth={1.5} color="#F5A623" style={{ flexShrink:0 }}/>
                <label style={{ flex:"0 0 130px", overflow:"hidden" }}>
                  <input type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} onChange={e => { const f = e.target.files[0]; if (f) setExtraHotels(prev => prev.map(x => x.id===eh.id ? { ...x, file:f } : x)); }} />
                  <span style={{ display:"inline-block", fontSize:"13px", color:eh.file?P.navy:P.periwinkleD, fontFamily:font, cursor:"pointer", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"130px", fontWeight:500 }}>{eh.file ? eh.file.name : "+ choose file"}</span>
                </label>
                <input value={eh.property} onChange={e => setExtraHotels(prev => prev.map(x => x.id===eh.id ? { ...x, property:e.target.value } : x))} placeholder="Property name (optional)"
                  style={{ flex:1, background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"8px", padding:"7px 11px", fontSize:"13px", color:P.navy, fontFamily:font, outline:"none", minWidth:0 }} />
                <button onClick={() => setExtraHotels(prev => prev.filter(x => x.id !== eh.id))} style={{ background:"transparent", border:"none", color:P.grey400, cursor:"pointer", flexShrink:0 }} title="Remove"><X size={15} strokeWidth={2}/></button>
              </div>
            ))}

            <button onClick={() => setExtraHotels(prev => [...prev, { id:Date.now(), file:null, property:"" }])}
              style={{ background:"transparent", border:"none", color:P.accentD, fontSize:"13px", fontWeight:500, fontFamily:font, cursor:"pointer", marginTop:"4px", padding:"4px 0" }}>+ Add another hotel property</button>
          </div>
        )}

        <div style={{ fontSize:"12px", fontWeight:500, color:P.grey400, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"12px" }}>More files</div>
        <div className="gg-setup-tiles2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          <SetupTile label="Car Transfers" sub=".xlsx, .xls, .csv" icon={<Car size={20} strokeWidth={1.5} color="#9B59B6"/>} accent={P.grey600} file={carFile} setter={setCarFile} columns={["First/Last Name (or Name)","Email (opt)","Pickup Date","Dropoff Date","Pickup Location (opt)"]} />
          <SetupTile label="Dietary & Access" sub=".xlsx, .xls, .csv" icon={<Salad size={20} strokeWidth={1.5} color="#27AE60"/>} accent={P.teal} file={dietaryFile} setter={setDietaryFile} columns={["First/Last Name (or Name)","Email (opt)","Dietary Restrictions","Accessibility Needs","Special Notes (opt)"]} />
        </div>
        <div style={{ fontSize:"13px", color:P.navyLight, fontFamily:font, marginTop:"16px", padding:"10px 13px", background:P.periwinkle+"0D", borderRadius:"9px", border:`1px solid ${P.periwinkle}22`, lineHeight:1.5 }}>
          <span style={{ background:P.periwinkle+"22", color:P.periwinkleD, borderRadius:"5px", padding:"1px 7px", fontSize:"11px", fontWeight:600, marginRight:"7px" }}>TIP</span>
          Include an <strong style={{ fontWeight:600 }}>Email Address</strong> column for the most accurate matching. GroupGrid matches by email first, then name.
        </div>
      </div>
      </div>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"14px", background:P.navy, borderRadius:"12px", padding:"13px 18px", flexWrap:"wrap" }}>
        <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.6)", fontFamily:font }}>
          {!hasName ? "Name your event to begin." : !ready ? "Upload at least 2 files to cross-check." : "Ready to run."}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          {error && <span style={{ fontSize:"13px", color:"#FFB3AB", fontFamily:font }}>{error}</span>}
          <button onClick={runCheck} disabled={!canRun}
            style={{ background:canRun?P.accent:"rgba(255,255,255,0.15)", color:canRun?P.white:"rgba(255,255,255,0.4)", border:"none", borderRadius:"10px", padding:"11px 24px", fontSize:"14px", fontWeight:600, fontFamily:font, cursor:canRun?"pointer":"not-allowed", transition:"all 0.18s", whiteSpace:"nowrap" }}>
            {loading ? "Checking…" : "Run Cross-Check →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupGrid({ user, onLogin, onLogout }) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [flightFile, setFlightFile] = useState(null);
  const [hotelFile, setHotelFile] = useState(null);
  const [hotelProperty, setHotelProperty] = useState(""); // optional property name for the primary hotel file
  const [extraHotels, setExtraHotels] = useState([]); // [{ id, file, property }] additional hotel properties
  const [carFile, setCarFile] = useState(null);
  const [dietaryFile, setDietaryFile] = useState(null);
  const [registrationFile, setRegistrationFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [windowOpen, setWindowOpen] = useState(false);
  const [arrivalStart, setArrivalStart] = useState("");
  const [arrivalEnd, setArrivalEnd] = useState("");
  const [departureStart, setDepartureStart] = useState("");
  const [departureEnd, setDepartureEnd] = useState("");
  const [eventName, setEventName] = useState("");
  const [emailModal, setEmailModal] = useState(null);
  const [meta, setMeta] = useState({});
  const [activeTab, setActiveTab] = useState("grid");
  const [page, setPage] = useState("landing"); // "landing" | "app" | "pricing" | "contact" | "about" | "privacy" | "terms"
  const [compareSession, setCompareSession] = useState(null); // session to diff against
  const [showDiff, setShowDiff] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [autoSaveStatus, setAutoSaveStatus] = useState("idle"); // "idle" | "saving" | "saved"
  const [shareModal, setShareModal] = useState(null); // null | { html, filename }
  const isDirty = useRef(false); // tracks unsaved changes since last autosave
  const tableScrollRef = useRef(null);
  const [tableScrollTop, setTableScrollTop] = useState(0);
  const TABLE_ROW_HEIGHT = 44;
  const TABLE_EXPANDED_HEIGHT = 320;
  const TABLE_VISIBLE_ROWS = 16; // rows visible at once (~600px container)
  const [savedSessions, setSavedSessions] = useState([]);
  const [contacts, setContacts] = useState({ hotel:{name:"",email:"",phone:"",property:""}, travel:{name:"",email:"",phone:"",agency:""}, hotels:[], plannerName:"" });
  const [contactsOpen, setContactsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [sortBy, setSortBy] = useState(null);       // null | "name" | "status" | "arrival" | "checkin" | "departure" | "checkout"
  const [sortDir, setSortDir] = useState("asc");    // "asc" | "desc"
  const [selectedRows, setSelectedRows] = useState(new Set()); // set of record keys

  const hasWindow = arrivalStart || arrivalEnd || departureStart || departureEnd;

  // ── Persistent storage via localStorage ──────────────────────────────────────
  // Replaces window.storage (Claude artifact API) with standard browser localStorage.
  // Same interface throughout: storage.get(key) → { value } | null, storage.set(key, val), storage.delete(key)
  const storage = {
    get: (key) => {
      try {
        const val = localStorage.getItem(key);
        return val !== null ? { value: val } : null;
      } catch(e) { return null; }
    },
    set: (key, val) => {
      try { localStorage.setItem(key, val); return true; } catch(e) { return null; }
    },
    delete: (key) => {
      try { localStorage.removeItem(key); return true; } catch(e) { return null; }
    },
  };

  const storageKey = `groupgrid-sessions-${user?.email || "anonymous"}`;
  const metaKey    = `groupgrid-activemeta-${user?.email || "anonymous"}`;

  // Load saved sessions + meta on mount / when user changes
  useEffect(() => {
    function load() {
      try {
        const raw = storage.get(storageKey);
        if (raw) setSavedSessions(JSON.parse(raw.value));
        else setSavedSessions([]);
      } catch(e) { setSavedSessions([]); }
      try {
        const rawMeta = storage.get(metaKey);
        if (rawMeta) setMeta(JSON.parse(rawMeta.value));
        else setMeta({});
      } catch(e) { setMeta({}); }
    }
    load();
  }, [storageKey]);

  // Persist meta continuously (debounced 600ms)
  useEffect(() => {
    const t = setTimeout(() => {
      try { storage.set(metaKey, JSON.stringify(meta)); } catch(e) {}
    }, 600);
    return () => clearTimeout(t);
  }, [meta, metaKey]);

  // Mark dirty whenever meaningful state changes
  useEffect(() => { if (results) isDirty.current = true; }, [results, meta, eventName, arrivalStart, arrivalEnd, departureStart, departureEnd]);

  // Autosave every 60 seconds when there are results and something changed
  useEffect(() => {
    if (!results) return;
    const interval = setInterval(() => {
      if (!isDirty.current) return;
      setAutoSaveStatus("saving");
      setTimeout(() => {
        const session = {
          id: Date.now(),
          name: eventName || `Session ${new Date().toLocaleDateString()}`,
          date: new Date().toISOString(),
          meta, eventName, arrivalStart, arrivalEnd, departureStart, departureEnd,
          guestCount: results.length,
          issueCount: results.filter(r => r.status !== "ok").length,
          autoSaved: true,
        };
        setSavedSessions(prev => {
          const next = [session, ...prev.filter(s => s.name !== session.name)].slice(0, 50);
          try { storage.set(storageKey, JSON.stringify(next)); } catch(e) {}
          return next;
        });
        isDirty.current = false;
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 3000);
      }, 300);
    }, 60000);
    return () => clearInterval(interval);
  }, [results, meta, eventName, arrivalStart, arrivalEnd, departureStart, departureEnd, storageKey]);

  async function readXlsx(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => { try { res(XLSX.read(e.target.result, { type:"array", cellDates:true })); } catch (err) { rej(err); } };
      r.onerror = rej;
      r.readAsArrayBuffer(file);
    });
  }

  async function runCheck() {
    if (uploadedCount < 2) return;
    setLoading(true); setError(null); setExpanded(null);
    try {
      let flights = [], hotels = [], cars = [], dietary = [], registration = [];
      if (flightFile)       { const w = await readXlsx(flightFile);       flights = parseFlightSheet(w); }
      if (hotelFile)        { const w = await readXlsx(hotelFile);        hotels = parseHotelSheetTagged(w, hotelProperty); }
      // Additional hotel properties (multi-hotel): parse each and merge into one hotels array
      for (const eh of extraHotels) {
        if (eh.file) { const w = await readXlsx(eh.file); hotels = hotels.concat(parseHotelSheetTagged(w, eh.property)); }
      }
      if (carFile)          { const w = await readXlsx(carFile);          cars = parseCarSheet(w); }
      if (dietaryFile)      { const w = await readXlsx(dietaryFile);      dietary = parseDietarySheet(w); }
      if (registrationFile) { const w = await readXlsx(registrationFile); registration = parseRegistrationSheet(w); }
      const aw = { arrivalStart:arrivalStart?new Date(arrivalStart):null, arrivalEnd:arrivalEnd?new Date(arrivalEnd):null, departureStart:departureStart?new Date(departureStart):null, departureEnd:departureEnd?new Date(departureEnd):null };
      const allResults = crossMatch(flights, hotels, cars, dietary, aw, meta, registration);
      setResults(allResults);
    } catch (err) { setError("Could not read files: " + err.message); }
    setLoading(false);
  }

  function updateMeta(record, update) {
    const key = record.email || record.key;
    setMeta(prev => ({ ...prev, [key]: { ...prev[key], ...update } }));
    setResults(prev => prev ? prev.map(r => {
      if ((r.email || r.key) !== key) return r;
      const updated = { ...r, ...update };
      const active = updated.issues.filter(x => !(updated.resolved || []).includes(x.text));
      updated.status = active.length === 0 ? "ok" : active.length === 1 ? "warn" : "error";
      return updated;
    }) : prev);
  }

  function toggleResolve(record, issueText) {
    const current = record.resolved || [];
    const resolved = current.includes(issueText) ? current.filter(x => x !== issueText) : [...current, issueText];
    updateMeta(record, { resolved });
  }

  function saveSession() {
    if (!results) return;
    const session = { id:Date.now(), name:eventName||`Session ${new Date().toLocaleDateString()}`, date:new Date().toISOString(), meta, eventName, arrivalStart, arrivalEnd, departureStart, departureEnd, guestCount:results.length, issueCount:results.filter(r=>r.status!=="ok").length };
    const next = [session, ...savedSessions.filter(s => s.name !== session.name)].slice(0, 50);
    setSavedSessions(next);
    try { storage.set(storageKey, JSON.stringify(next)); } catch(e) {}
    isDirty.current = false;
    setAutoSaveStatus("idle");
    setSaveMsg(user ? "Saved to this device" : "Saved to this device");
    setTimeout(() => setSaveMsg(""), 3000);
  }

  // Multi-hotel: build and send a separate guest list to each property's contact, containing only that property's guests.
  function exportToHotelsByProperty() {
    if (!XLSX) { setError("Spreadsheet library not loaded."); return; }
    const propContacts = (contacts.hotels || []).filter(h => h.email && h.property);
    if (propContacts.length === 0) { setContactsOpen(true); return; }
    let sent = 0;
    propContacts.forEach((pc, idx) => {
      const propRows = filtered.filter(r => (r.hotel?.hotel || "").trim().toLowerCase() === pc.property.trim().toLowerCase());
      if (propRows.length === 0) return;
      const rows = propRows.map(r => ({
        "Guest": r.displayName, "Email": r.email||"—",
        "Status": {ok:"Aligned",warn:"1 Issue",error:"Action Needed"}[r.status],
        "Active Issues": r.issues.filter(x=>!(r.resolved||[]).includes(x.text)).map(x=>x.text).join("; ")||"None",
        "Hotel": r.hotel?.hotel||"—", "Check-In": fmt(r.hotel?.checkIn), "Check-Out": fmt(r.hotel?.checkOut), "Room/Conf": r.hotel?.room||"—",
        "Note": r.note||"—",
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Rooming List");
      XLSX.writeFile(wb, `groupgrid-${(eventName||"event").replace(/\s+/g,"-")}-${pc.property.replace(/\s+/g,"-")}.xlsx`);
      const subject = encodeURIComponent(`${eventName||"Event"} — Rooming list for ${pc.property}`);
      const body = encodeURIComponent(`Dear ${pc.name||"Team"},\n\nAttached is the current rooming list for ${pc.property} (${propRows.length} guests) for ${eventName||"our event"}.\n\nThe Excel file has been downloaded to your device — please attach it before sending.\n\nThank you,\n${contacts.plannerName||"[Your Name]"}`);
      setTimeout(() => window.open(`mailto:${pc.email}?subject=${subject}&body=${body}`, "_blank"), 300 * (idx+1));
      sent++;
    });
    if (sent === 0) setError("No guests matched your hotel properties. Check the property names match the rooming lists.");
  }

  function exportToContact(contactType) {
    
    if (!XLSX) { setError("Spreadsheet library not loaded."); return; }
    // Multi-hotel routing: if sending to "hotel" and per-property contacts exist, send each property its own list.
    if (contactType === "hotel" && Array.isArray(contacts.hotels) && contacts.hotels.filter(h=>h.email).length > 0) {
      return exportToHotelsByProperty();
    }
    const contact = contacts[contactType];
    if (!contact?.email) { setContactsOpen(true); return; }
    const rows = filtered.map(r => ({
      "Guest": r.displayName, "Email": r.email||"—",
      "Status": {ok:"Aligned",warn:"1 Issue",error:"Action Needed"}[r.status],
      "Active Issues": r.issues.filter(x=>!(r.resolved||[]).includes(x.text)).map(x=>x.text).join("; ")||"None",
      "Flight Arrival": fmt(r.flight?.flightArrival), "Hotel Check-In": fmt(r.hotel?.checkIn), "Arrival Δ": r.details?.arrDiff??"N/A",
      "Flight Departure": fmt(r.flight?.flightDeparture), "Hotel Check-Out": fmt(r.hotel?.checkOut), "Departure Δ": r.details?.depDiff??"N/A",
      "Car Pickup": fmt(r.car?.pickupDate), "Car Dropoff": fmt(r.car?.dropoffDate),
      "Hotel": r.hotel?.hotel||"—", "Room/Conf": r.hotel?.room||"—",
      "Dietary": r.diet?.dietary||"—", "Accessibility": r.diet?.accessibility||"—",
      "Note": r.note||"—",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "GroupGrid Report");
    const filename = `groupgrid-${(eventName||"report").replace(/\s+/g,"-")}-for-${contact.name||contactType}.xlsx`;
    XLSX.writeFile(wb, filename);
    // Open mailto with the file ready (browsers can't attach files via mailto, so we open email + note)
    const subject = encodeURIComponent(`${eventName||"Event"} — Guest Report`);
    const issueCount = filtered.filter(r=>r.status!=="ok").length;
    const body = encodeURIComponent(
      `Dear ${contact.name||"Team"},\n\nPlease find attached the latest guest report for ${eventName||"our upcoming event"}.\n\nSummary:\n• Total Guests: ${filtered.length}\n• Aligned: ${filtered.filter(r=>r.status==="ok").length}\n• Issues: ${issueCount}\n\nThe Excel report has been downloaded to your device. Please attach it to this email before sending.\n\nThank you,\n[Your Name]`
    );
    setTimeout(() => window.open(`mailto:${contact.email}?subject=${subject}&body=${body}`, "_blank"), 300);
  }

  function exportReport() {
    const rows = filtered.map(r => ({ "First Name":r.firstName||r.displayName.split(" ")[0]||"—", "Last Name":r.lastName||r.displayName.split(" ").slice(1).join(" ")||"—", "Full Name":r.displayName, "Email":r.email||"—", "Registered":r.reg?"Yes":(r.registered?"Yes":"No"), "Status":{ok:"Aligned",warn:"1 Issue",error:"Action Needed"}[r.status], "Active Issues":r.issues.filter(x=>!(r.resolved||[]).includes(x.text)).map(x=>x.text).join("; ")||"None", "Resolved":r.resolved?.join("; ")||"—", "Note":r.note||"—", "Company":r.reg?.company||"—", "Job Title":r.reg?.jobTitle||"—", "Requested Check-In":fmt(r.reg?.regCheckIn), "Requested Check-Out":fmt(r.reg?.regCheckOut), "Dietary":r.diet?.dietary||r.reg?.dietaryRequest||"—", "Accessibility":r.diet?.accessibility||"—", "Flight Arrival":fmt(r.flight?.flightArrival), "Hotel Check-In":fmt(r.hotel?.checkIn), "Arrival Δ":r.details?.arrDiff??"N/A", "Flight Departure":fmt(r.flight?.flightDeparture), "Hotel Check-Out":fmt(r.hotel?.checkOut), "Departure Δ":r.details?.depDiff??"N/A", "Car Pickup":fmt(r.car?.pickupDate), "Car Dropoff":fmt(r.car?.dropoffDate), "Hotel":r.hotel?.hotel||"—", "Room":r.hotel?.room||"—", "Matched By":r.matchedBy }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "GroupGrid");
    XLSX.writeFile(wb, `groupgrid-${(eventName||"report").replace(/\s+/g,"-")}-${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  }

  function sortedFiltered(rows) {
    if (!sortBy) return rows;
    return [...rows].sort((a, b) => {
      let av, bv;
      if (sortBy === "name" || sortBy === "lastName")  { av = (a.lastName||a.displayName).toLowerCase(); bv = (b.lastName||b.displayName).toLowerCase(); }
      else if (sortBy === "firstName") { av = (a.firstName||a.displayName).toLowerCase(); bv = (b.firstName||b.displayName).toLowerCase(); }
      else if (sortBy === "email") { av = (a.email||"").toLowerCase(); bv = (b.email||"").toLowerCase(); }
      else if (sortBy === "status") { const o = {ok:0,warn:1,error:2}; av = o[a.status]??0; bv = o[b.status]??0; }
      else if (sortBy === "arrival")  { av = a.flight?.flightArrival?.getTime()??0; bv = b.flight?.flightArrival?.getTime()??0; }
      else if (sortBy === "checkin")  { av = a.hotel?.checkIn?.getTime()??0; bv = b.hotel?.checkIn?.getTime()??0; }
      else if (sortBy === "departure"){ av = a.flight?.flightDeparture?.getTime()??0; bv = b.flight?.flightDeparture?.getTime()??0; }
      else if (sortBy === "checkout") { av = a.hotel?.checkOut?.getTime()??0; bv = b.hotel?.checkOut?.getTime()??0; }
      else if (sortBy === "hotel")    { av = (a.hotel?.hotel||"").toLowerCase(); bv = (b.hotel?.hotel||"").toLowerCase(); }
      else if (sortBy === "flags")    { av = a.issues.filter(x=>!(a.resolved||[]).includes(x.text)).length; bv = b.issues.filter(x=>!(b.resolved||[]).includes(x.text)).length; }
      else if (sortBy === "note")     { av = (a.note||"").toLowerCase(); bv = (b.note||"").toLowerCase(); }
      else return 0;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }

  function toggleSelectAll() {
    const ids = filtered.map(r => r.key);
    const allSel = ids.every(id => selectedRows.has(id));
    setSelectedRows(allSel ? new Set() : new Set(ids));
  }

  function toggleSelectRow(key) {
    setSelectedRows(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  // Quick-send emails for selected guests, right from the cross-check grid (no tab switch).
  // Uses the standard templates; deep customization lives in the Communications tab.
  function emailSelected() {
    const picked = filtered.filter(r => selectedRows.has(r.key) && r.email && (r.issues||[]).filter(x=>!(r.resolved||[]).includes(x.text)).length > 0);
    if (picked.length === 0) return;
    if (picked.length > 8 && !window.confirm(`This will open ${picked.length} email drafts in your mail app, one at a time. Continue?`)) return;
    const extra = {
      eventName: eventName || "our event",
      plannerName: contacts?.plannerName || "",
      hotelName: contacts?.hotel?.name || "", hotelEmail: contacts?.hotel?.email || "",
      travelName: contacts?.travel?.name || "", travelEmail: contacts?.travel?.email || "",
    };
    picked.forEach((record, idx) => {
      const applicable = getApplicableTemplates(record);
      let subject, body;
      if (applicable.length > 0 && DEFAULT_TEMPLATES[applicable[0]]) {
        const tmpl = DEFAULT_TEMPLATES[applicable[0]];
        subject = fillTemplate(tmpl.subject, record, extra);
        body = fillTemplate(tmpl.body, record, extra);
      } else {
        // Generic fallback for issues without a specific template (date mismatch, wrong hotel, etc.)
        const issueList = (record.issues||[]).filter(x=>!(record.resolved||[]).includes(x.text)).map(x => "• " + x.text).join("\n");
        subject = `${eventName || "Event"} — please review your travel details`;
        body = `Hi ${record.firstName || record.displayName || "there"},\n\nWhile reviewing arrangements for ${eventName || "our event"}, we found something on your record that needs attention:\n\n${issueList}\n\nCould you take a look and let us know? Thank you.\n\n${contacts?.plannerName || "[Your Name]"}`;
      }
      // Stagger so the browser doesn't block multiple mailto: opens
      setTimeout(() => window.open(`mailto:${record.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank"), 250 * idx);
    });
  }

  function exportSelected() {
    const toExport = selectedRows.size > 0 ? filtered.filter(r => selectedRows.has(r.key)) : filtered;
    const rows = toExport.map(r => ({ "First Name":r.firstName||r.displayName.split(" ")[0]||"—", "Last Name":r.lastName||r.displayName.split(" ").slice(1).join(" ")||"—", "Full Name":r.displayName, "Email":r.email||"—", "Registered":r.reg?"Yes":(r.registered?"Yes":"No"), "Status":{ok:"Aligned",warn:"1 Issue",error:"Action Needed"}[r.status], "Active Issues":r.issues.filter(x=>!(r.resolved||[]).includes(x.text)).map(x=>x.text).join("; ")||"None", "Note":r.note||"—", "Company":r.reg?.company||"—", "Job Title":r.reg?.jobTitle||"—", "Requested Check-In":fmt(r.reg?.regCheckIn), "Requested Check-Out":fmt(r.reg?.regCheckOut), "Flight Arrival":fmt(r.flight?.flightArrival), "Flight In":r.flight?.flightIn||"—", "Hotel Check-In":fmt(r.hotel?.checkIn), "Arrival Δ":r.details?.arrDiff??"N/A", "Flight Departure":fmt(r.flight?.flightDeparture), "Flight Out":r.flight?.flightOut||"—", "Hotel Check-Out":fmt(r.hotel?.checkOut), "Departure Δ":r.details?.depDiff??"N/A", "Airport":r.flight?.airport||"—", "Hotel":r.hotel?.hotel||"—", "Room":r.hotel?.room||"—", "Car Pickup":fmt(r.car?.pickupDate), "Car Dropoff":fmt(r.car?.dropoffDate), "Dietary":r.diet?.dietary||r.reg?.dietaryRequest||"—", "Accessibility":r.diet?.accessibility||"—" }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "GroupGrid");
    const label = selectedRows.size > 0 ? `${selectedRows.size}-selected` : "all";
    XLSX.writeFile(wb, `groupgrid-${(eventName||"report").replace(/\s+/g,"-")}-${label}-${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function generateShareableReport() {
    const evName = eventName || "Event";
    const dateStr = new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit" });
    const flagged = results.filter(r => r.status !== "ok");
    const aligned = results.filter(r => r.status === "ok");

    const localCounts = {
      total:     results.length,
      ok:        results.filter(r => r.status === "ok").length,
      error:     results.filter(r => r.status === "error").length,
      missing:   results.filter(r => r.issues.some(x => x.type === "missing")).length,
      window:    results.filter(r => r.issues.some(x => x.type === "window")).length,
      duplicate: results.filter(r => r.issues.some(x => x.type === "duplicate")).length,
      mismatch:  results.filter(r => r.issues.some(x => x.type === "mismatch")).length,
    };

    // ── helpers ──
    function sBadge(status) {
      if (status === "ok")   return '<span style="background:#E3F7F0;color:#0D9E6E;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;">Aligned</span>';
      if (status === "warn") return '<span style="background:#FEF2DC;color:#C97A0A;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;">1 Issue</span>';
      return '<span style="background:#FDECEC;color:#C0392B;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;">Action Needed</span>';
    }
    function sDelta(val) {
      if (val === null || val === undefined) return "\u2014";
      if (val === 0) return '<span style="color:#0D9E6E;font-weight:600;">On time</span>';
      const days = Math.abs(val), word = days === 1 ? "day" : "days", dir = val > 0 ? "late" : "early";
      return '<span style="color:' + (days <= 1 ? "#C97A0A" : "#C0392B") + ';font-weight:600;">' + days + " " + word + " " + dir + "</span>";
    }
    function sCell(val) { return val || "\u2014"; }
    function missingCell() { return '<span style="color:#C0392B;font-weight:600;">Missing</span>'; }

    // ── guest rows ──
    var guestRows = "";
    for (var gi = 0; gi < results.length; gi++) {
      var r = results[gi];
      var activeIssues = r.issues.filter(function(x) { return !(r.resolved || []).includes(x.text); });
      var issueHtml = "";
      if (activeIssues.length === 0) {
        issueHtml = '<span style="color:#0D9E6E;">&#10003; Clear</span>';
      } else {
        for (var ii = 0; ii < activeIssues.length; ii++) {
          var ic = activeIssues[ii].type === "missing" ? "#C97A0A" : activeIssues[ii].type === "window" ? "#6B3FA0" : "#C0392B";
          issueHtml += '<div style="color:' + ic + ';font-size:12px;margin:1px 0;">&bull; ' + activeIssues[ii].text + "</div>";
        }
      }
      var noteCell = r.note
        ? '<td style="padding:10px 12px;font-size:12px;color:#4A5166;font-style:italic;">' + r.note + "</td>"
        : '<td style="padding:10px 12px;color:#B4BBCF;">\u2014</td>';
      guestRows += '<tr style="border-bottom:1px solid #DDE1EE;' + (r.status === "error" ? "background:#fffafa;" : "") + '">'
        + '<td style="padding:10px 12px;font-weight:600;white-space:nowrap;">' + r.displayName + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;color:#4A5166;">' + sCell(r.email) + "</td>"
        + '<td style="padding:10px 12px;">' + sBadge(r.status) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + (r.flight ? fmt(r.flight.flightArrival) : missingCell()) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + (r.hotel ? fmt(r.hotel.checkIn) : missingCell()) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + sDelta(r.details && r.details.arrDiff) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + (r.flight ? fmt(r.flight.flightDeparture) : missingCell()) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + (r.hotel ? fmt(r.hotel.checkOut) : missingCell()) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + sDelta(r.details && r.details.depDiff) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + issueHtml + "</td>"
        + noteCell
        + "</tr>";
    }

    // ── diet rows ──
    var dietRows = "";
    var dietGuests = results.filter(function(r) { return r.diet && (r.diet.dietary || r.diet.accessibility || r.diet.specialNotes); });
    for (var di = 0; di < dietGuests.length; di++) {
      var dr = dietGuests[di];
      dietRows += '<tr style="border-bottom:1px solid #DDE1EE;">'
        + '<td style="padding:10px 12px;font-weight:600;">' + dr.displayName + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + sCell(dr.diet.dietary) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + sCell(dr.diet.accessibility) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;color:#4A5166;font-style:italic;">' + sCell(dr.diet.specialNotes) + "</td>"
        + "</tr>";
    }

    // ── summary cards ──
    var summaryCards = [
      { label:"Total Guests",   val:results.length,                                    color:"#0F1D35", bg:"white" },
      { label:"Fully Aligned",  val:aligned.length,                                    color:"#0D9E6E", bg:"#E3F7F0" },
      { label:"Action Needed",  val:flagged.filter(function(r){return r.status==="error";}).length, color:"#C0392B", bg:"#FDECEC" },
      { label:"Alignment Rate", val:Math.round(aligned.length / results.length * 100) + "%", color:"#00A896", bg:"#E0FAF7" },
    ];
    var cardsHtml = "";
    for (var ci = 0; ci < summaryCards.length; ci++) {
      var sc = summaryCards[ci];
      cardsHtml += '<div style="background:' + sc.bg + ';border:1px solid #DDE1EE;border-radius:10px;padding:18px 20px;">'
        + '<div style="font-size:13px;color:#7A84A0;margin-bottom:6px;">' + sc.label + "</div>"
        + '<div style="font-size:28px;font-weight:700;color:' + sc.color + ';">' + sc.val + "</div>"
        + "</div>";
    }

    // ── issue breakdown ──
    var issueBreakdown = "";
    if (flagged.length > 0) {
      var chips = "";
      if (localCounts.missing > 0) chips += '<div style="background:#FEF2DC;border-radius:8px;padding:10px 16px;"><div style="font-size:12px;color:#C97A0A;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Missing Record</div><div style="font-size:22px;font-weight:700;color:#C97A0A;">' + localCounts.missing + "</div></div>";
      if (localCounts.mismatch > 0) chips += '<div style="background:#FDECEC;border-radius:8px;padding:10px 16px;"><div style="font-size:12px;color:#C0392B;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Date Mismatch</div><div style="font-size:22px;font-weight:700;color:#C0392B;">' + localCounts.mismatch + "</div></div>";
      if (localCounts.window > 0)  chips += '<div style="background:#EEE5F9;border-radius:8px;padding:10px 16px;"><div style="font-size:12px;color:#6B3FA0;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Outside Window</div><div style="font-size:22px;font-weight:700;color:#6B3FA0;">' + localCounts.window + "</div></div>";
      if (localCounts.duplicate > 0) chips += '<div style="background:#FFF3E0;border-radius:8px;padding:10px 16px;"><div style="font-size:12px;color:#E65100;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Duplicates</div><div style="font-size:22px;font-weight:700;color:#E65100;">' + localCounts.duplicate + "</div></div>";
      issueBreakdown = '<div style="background:white;border:1px solid #DDE1EE;border-radius:10px;padding:20px 24px;margin-bottom:24px;"><div style="font-size:15px;font-weight:700;margin-bottom:14px;color:#0F1D35;">Issue Breakdown</div><div style="display:flex;gap:12px;flex-wrap:wrap;">' + chips + "</div></div>";
    }

    // ── contacts block ──
    var contactsBlock = "";
    if (contacts.hotel.email || contacts.travel.email) {
      var hotelDiv = contacts.hotel.email
        ? '<div style="background:#F4F6FA;border-radius:8px;padding:14px 16px;">'
          + '<div style="font-size:11px;font-weight:600;color:#7A84A0;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Hotel Contact</div>'
          + (contacts.hotel.name ? '<div style="font-weight:600;margin-bottom:2px;">' + contacts.hotel.name + "</div>" : "")
          + (contacts.hotel.property ? '<div style="font-size:13px;color:#4A5166;">' + contacts.hotel.property + "</div>" : "")
          + (contacts.hotel.email ? '<div style="font-size:13px;color:#4C62C4;margin-top:4px;">' + contacts.hotel.email + "</div>" : "")
          + (contacts.hotel.phone ? '<div style="font-size:13px;color:#4A5166;">' + contacts.hotel.phone + "</div>" : "")
          + "</div>" : "";
      var travelDiv = contacts.travel.email
        ? '<div style="background:#F4F6FA;border-radius:8px;padding:14px 16px;">'
          + '<div style="font-size:11px;font-weight:600;color:#7A84A0;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Travel Agency</div>'
          + (contacts.travel.name ? '<div style="font-weight:600;margin-bottom:2px;">' + contacts.travel.name + "</div>" : "")
          + (contacts.travel.agency ? '<div style="font-size:13px;color:#4A5166;">' + contacts.travel.agency + "</div>" : "")
          + (contacts.travel.email ? '<div style="font-size:13px;color:#4C62C4;margin-top:4px;">' + contacts.travel.email + "</div>" : "")
          + (contacts.travel.phone ? '<div style="font-size:13px;color:#4A5166;">' + contacts.travel.phone + "</div>" : "")
          + "</div>" : "";
      contactsBlock = '<div style="background:white;border:1px solid #DDE1EE;border-radius:10px;padding:20px 24px;margin-bottom:24px;"><div style="font-size:15px;font-weight:700;margin-bottom:14px;color:#0F1D35;">Event Contacts</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;">' + hotelDiv + travelDiv + "</div></div>";
    }

    // ── diet table ──
    var dietSection = "";
    if (dietRows) {
      dietSection = '<div style="background:white;border:1px solid #DDE1EE;border-radius:10px;overflow:hidden;margin-bottom:24px;">'
        + '<div style="background:#0A7B7A;padding:14px 20px;"><span style="font-size:14px;font-weight:600;color:white;">Dietary &amp; Accessibility Requirements</span></div>'
        + '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead>'
        + '<tr style="background:#DCF2F2;border-bottom:1px solid #DDE1EE;">'
        + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#0A7B7A;text-transform:uppercase;letter-spacing:0.04em;">Guest</th>'
        + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#0A7B7A;text-transform:uppercase;letter-spacing:0.04em;">Dietary</th>'
        + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#0A7B7A;text-transform:uppercase;letter-spacing:0.04em;">Accessibility</th>'
        + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#0A7B7A;text-transform:uppercase;letter-spacing:0.04em;">Notes</th>'
        + "</tr></thead><tbody>" + dietRows + "</tbody></table></div></div>";
    }

    // ── travel window line ──
    var windowLine = (arrivalStart && arrivalEnd)
      ? '<div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:4px;">Travel window: ' + arrivalStart + " \u2013 " + (departureEnd || arrivalEnd) + "</div>"
      : "";
    var plannerLine = contacts.plannerName
      ? '<div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:2px;">Prepared by ' + contacts.plannerName + "</div>"
      : "";

    // ── assemble final HTML ──
    var html = "<!DOCTYPE html>"
      + '<html lang="en"><head>'
      + '<meta charset="UTF-8"/>'
      + '<meta name="viewport" content="width=device-width,initial-scale=1"/>'
      + "<title>GroupGrid Report \u2014 " + evName + "</title>"
      + '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet"/>'
      + "<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Manrope',sans-serif;background:#F0F2F7;color:#0F1D35;font-size:14px;-webkit-font-smoothing:antialiased;}a{color:inherit;text-decoration:none;}@media print{body{background:white;}.no-print{display:none!important;}table{page-break-inside:auto;}tr{page-break-inside:avoid;}}</style>"
      + "</head><body>"
      + '<div style="max-width:1100px;margin:0 auto;padding:32px 24px;">'

      // header
      + '<div style="background:#0F1D35;border-radius:12px;padding:28px 32px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">'
      + "<div>"
      + '<div style="font-size:22px;font-weight:700;color:white;margin-bottom:4px;">Group<span style="color:#00C9B1;font-weight:400;">Grid</span><span style="font-size:13px;font-weight:400;color:rgba(255,255,255,0.45);margin-left:12px;">Cross-Check Report</span></div>'
      + '<div style="font-size:18px;font-weight:600;color:rgba(255,255,255,0.9);">' + evName + "</div>"
      + windowLine
      + "</div>"
      + '<div style="text-align:right;">'
      + '<div style="font-size:12px;color:rgba(255,255,255,0.4);">Generated</div>'
      + '<div style="font-size:13px;color:rgba(255,255,255,0.7);">' + dateStr + "</div>"
      + plannerLine
      + "</div></div>"

      // summary cards
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">' + cardsHtml + "</div>"

      // issue breakdown
      + issueBreakdown

      // guest table
      + '<div style="background:white;border:1px solid #DDE1EE;border-radius:10px;overflow:hidden;margin-bottom:24px;">'
      + '<div style="background:#0F1D35;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;">'
      + '<span style="font-size:14px;font-weight:600;color:white;">All Guests</span>'
      + '<span style="font-size:13px;color:rgba(255,255,255,0.5);">' + results.length + " total \u00b7 " + flagged.length + " flagged</span>"
      + "</div>"
      + '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead>'
      + '<tr style="background:#ECEEF6;border-bottom:1px solid #DDE1EE;">'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5166;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Guest</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5166;text-transform:uppercase;letter-spacing:0.04em;">Email</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5166;text-transform:uppercase;letter-spacing:0.04em;">Status</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5166;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Flight In</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5166;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Check-In</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5166;text-transform:uppercase;letter-spacing:0.04em;">\u0394 Arr</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5166;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Flight Out</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5166;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Check-Out</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5166;text-transform:uppercase;letter-spacing:0.04em;">\u0394 Dep</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5166;text-transform:uppercase;letter-spacing:0.04em;">Flags</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5166;text-transform:uppercase;letter-spacing:0.04em;">Note</th>'
      + "</tr></thead><tbody>" + guestRows + "</tbody></table></div></div>"

      // diet section
      + dietSection

      // contacts
      + contactsBlock

      // footer
      + '<div style="text-align:center;padding:20px;font-size:12px;color:#B4BBCF;">Generated by Group<span style="color:#00C9B1;">Grid</span> \u00b7 ' + dateStr + " \u00b7 Data processed locally \u2014 not stored on any server</div>"
      + "</div></body></html>";

    var filename = "GroupGrid-Report-" + (eventName || "Event").replace(/\s+/g, "-") + "-" + new Date().toISOString().slice(0, 10) + ".html";
    setShareModal({ html, filename });
  }

  const filtered = (results || []).filter(r => {
    if (search && !r.displayName.toLowerCase().includes(search.toLowerCase()) && !r.email.includes(search.toLowerCase())) return false;
    if (filter === "issues") return r.status !== "ok";
    if (filter === "missing") return r.issues.some(x => x.type === "missing");
    if (filter === "window") return r.issues.some(x => x.type === "window");
    if (filter === "duplicate") return r.issues.some(x => x.type === "duplicate");
    if (filter === "unregistered") return r.issues.some(x => x.type === "unregistered");
    if (["ok","warn","error"].includes(filter)) return r.status === filter;
    return true;
  });

  const counts = results ? { total:results.length, ok:results.filter(r=>r.status==="ok").length, warn:results.filter(r=>r.status==="warn").length, error:results.filter(r=>r.status==="error").length, missing:results.filter(r=>r.issues.some(x=>x.type==="missing")).length, window:results.filter(r=>r.issues.some(x=>x.type==="window")).length, duplicate:results.filter(r=>r.issues.some(x=>x.type==="duplicate")).length, unregistered:results.filter(r=>r.issues.some(x=>x.type==="unregistered")).length, dietary:results.filter(r=>r.diet?.dietary||r.diet?.accessibility).length } : null;

  const hasCars = results?.some(r => r.car);
  const hasDiet = results?.some(r => r.diet);
  const hasHotelNames = results?.some(r => r.hotel?.hotel && r.hotel.hotel.trim());
  const uploadedCount = [registrationFile, flightFile, hotelFile, carFile, dietaryFile].filter(Boolean).length + extraHotels.filter(h=>h.file).length;
  const ready = uploadedCount >= 2;


  return (
    <div style={{ minHeight:"100vh", width:"100%", maxWidth:"100vw", overflowX:"hidden", background:"#F0F2F7", fontFamily:font, fontSize:"15px", WebkitFontSmoothing:"antialiased", boxSizing:"border-box" }}>
      <GlobalStyles />
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── Mobile sidebar overlay ── */}
      {isMobile && sidebarOpen && (
        <div className="gg-sidebar-overlay" onClick={() => setSidebarOpen(false)}
          style={{ position:"fixed", top:"52px", left:0, right:0, bottom:0, background:"rgba(15,31,61,0.6)", zIndex:199, backdropFilter:"blur(2px)" }} />
      )}

      {emailModal && <EmailModal record={emailModal} eventName={eventName} contacts={contacts} onClose={() => setEmailModal(null)} />}
      {loginOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:2000, display:"flex", alignItems:"center", justifyContent:"flex-end" }}>
          <div onClick={() => setLoginOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(27,42,74,0.5)", backdropFilter:"blur(4px)" }} />
          <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:"420px", height:"100%", background:P.navy, boxShadow:"-20px 0 60px rgba(0,0,0,0.4)", display:"flex", flexDirection:"column", overflowY:"auto" }}>
            <LoginPanel onLogin={u => {
                // Migrate anonymous sessions to the newly signed-in account
                try {
                  const anonKey = "groupgrid-sessions-anonymous";
                  const userKey = `groupgrid-sessions-${u.email}`;
                  const anonRaw = storage.get(anonKey);
                  if (anonRaw) {
                    const anonSessions = JSON.parse(anonRaw.value);
                    if (anonSessions.length > 0) {
                      let existing = [];
                      try { const er = storage.get(userKey); if (er) existing = JSON.parse(er.value); } catch(e) {}
                      const merged = [...anonSessions, ...existing.filter(e => !anonSessions.some(a => a.name === e.name))].slice(0, 50);
                      storage.set(userKey, JSON.stringify(merged));
                      storage.delete(anonKey);
                    }
                  }
                } catch(e) {}
                onLogin(u);
                setLoginOpen(false);
              }} onClose={() => setLoginOpen(false)} />
          </div>
        </div>
      )}
      {contactsOpen && <ContactsModal contacts={contacts} onSave={setContacts} onClose={() => setContactsOpen(false)} />}
      {shareModal && <ShareModal html={shareModal.html} filename={shareModal.filename} onClose={() => setShareModal(null)} />}

      {/* ── Page overlays ── */}
      {page === "landing" && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowY:"auto" }}><LandingPage onEnter={() => setPage("app")} onPricing={() => setPage("pricing")} onAbout={() => setPage("about")} onContact={() => setPage("contact")} onPrivacy={() => setPage("privacy")} onTerms={() => setPage("terms")} onFaq={() => setPage("faq")} /></div>}
      {page === "pricing" && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowY:"auto" }}><PricingPage onBack={() => setPage("app")} /></div>}
      {page === "about"   && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowY:"auto" }}><AboutPage   onBack={() => setPage("app")} /></div>}
      {page === "faq"     && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowY:"auto" }}><FAQPage     onBack={() => setPage("app")} /></div>}
      {page === "contact" && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowY:"auto" }}><ContactPage onBack={() => setPage("app")} /></div>}
      {page === "privacy" && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowY:"auto" }}><PrivacyPage onBack={() => setPage("app")} /></div>}
      {page === "terms"   && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowY:"auto" }}><TermsPage   onBack={() => setPage("app")} /></div>}

      {/* Header */}
      <div style={{ background:P.navy, padding:`0 ${isMobile ? "14px" : "32px"}`, display:"flex", alignItems:"center", justifyContent:"space-between", height:"52px", boxShadow:"0 1px 0 rgba(255,255,255,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          {/* Hamburger — mobile only */}
          {isMobile && (
            <button onClick={() => setSidebarOpen(o => !o)}
              style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"8px", width:36, height:36, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"4px", cursor:"pointer", flexShrink:0, padding:0 }}>
              {[0,1,2].map(i => <span key={i} style={{ width:14, height:2, background:"rgba(255,255,255,0.7)", borderRadius:2, transition:"all 0.2s" }} />)}
            </button>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 52" width={isMobile ? 120 : 185} height={isMobile ? 30 : 46} style={{display:"block"}}>
              <defs>
                <linearGradient id="ggIconBg2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1A2E52"/>
                  <stop offset="100%" stopColor="#0F1F3D"/>
                </linearGradient>
                <linearGradient id="ggTeal" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00C9B1"/>
                  <stop offset="100%" stopColor="#00A896"/>
                </linearGradient>
              </defs>
              <g transform="translate(2,2)">
                <rect x="0" y="0" width="48" height="48" rx="10" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                <circle cx="9"  cy="9"  r="3" fill="rgba(255,255,255,0.18)"/>
                <circle cx="19" cy="9"  r="3" fill="rgba(255,255,255,0.18)"/>
                <circle cx="29" cy="9"  r="3" fill="rgba(255,255,255,0.18)"/>
                <circle cx="39" cy="9"  r="3" fill="rgba(255,255,255,0.18)"/>
                <circle cx="9"  cy="19" r="3" fill="rgba(255,255,255,0.18)"/>
                <circle cx="19" cy="19" r="3" fill="rgba(255,255,255,0.18)"/>
                <circle cx="29" cy="19" r="3" fill="url(#ggTeal)" opacity="0.45"/>
                <circle cx="39" cy="19" r="3" fill="url(#ggTeal)" opacity="0.65"/>
                <circle cx="9"  cy="29" r="3" fill="rgba(255,255,255,0.18)"/>
                <circle cx="19" cy="29" r="3" fill="url(#ggTeal)" opacity="0.45"/>
                <circle cx="29" cy="29" r="3" fill="url(#ggTeal)" opacity="0.75"/>
                <circle cx="39" cy="29" r="3" fill="url(#ggTeal)" opacity="0.9"/>
                <circle cx="9"  cy="39" r="3" fill="url(#ggTeal)" opacity="0.35"/>
                <circle cx="19" cy="39" r="3" fill="url(#ggTeal)" opacity="0.6"/>
                <circle cx="29" cy="39" r="3" fill="url(#ggTeal)" opacity="0.85"/>
                <circle cx="39" cy="39" r="3" fill="url(#ggTeal)"/>
              </g>
              <text x="62" y="36" fontFamily="'Manrope', sans-serif" fontSize="26" fontWeight="700" letterSpacing="-0.5" fill="white">Group</text>
              <text x="144" y="36" fontFamily="'Manrope', sans-serif" fontSize="26" fontWeight="300" letterSpacing="-0.5" fill="#00C9B1">Grid</text>
            </svg>
            {!isMobile && <button onClick={() => setPage("landing")} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"7px", padding:"4px 12px", fontSize:"12px", fontWeight:600, color:"rgba(255,255,255,0.45)", fontFamily:font, cursor:"pointer", letterSpacing:"0.03em" }}>← Home</button>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          {/* Autosave indicator */}
          {autoSaveStatus === "saving" && (
            <span style={{ fontSize:"15px", color:"rgba(255,255,255,0.45)", fontFamily:font, display:"flex", alignItems:"center", gap:"5px" }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:"rgba(255,255,255,0.4)", display:"inline-block", animation:"pulse 1s infinite" }} />
              Autosaving…
            </span>
          )}
          {autoSaveStatus === "saved" && (
            <span style={{ fontSize:"15px", color:"rgba(255,255,255,0.55)", fontFamily:font }}>✓ Autosaved</span>
          )}
          {autoSaveStatus === "idle" && saveMsg && <span style={{ fontSize:"15px", color:"rgba(255,255,255,0.6)", fontFamily:font }}>✓ {saveMsg}</span>}
          <div className="gg-header-extras" style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          {results && (
            <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <Btn onClick={saveSession} outline small color="rgba(255,255,255,0.6)">Save Now</Btn>
              {results && <span style={{ fontSize:"12px", color:"rgba(255,255,255,0.35)", fontFamily:font, whiteSpace:"nowrap" }}>Autosaves</span>}
            </div>
          )}
          <div style={{ width:1, height:16, background:"rgba(255,255,255,0.15)", marginLeft:"2px" }} />
          {user ? (
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg, ${P.periwinkle}, ${P.periwinkleD})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", fontWeight:800, color:P.white, fontFamily:font, flexShrink:0, cursor:"default" }} title={user.email}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize:"14px", color:"rgba(255,255,255,0.75)", fontFamily:font, fontWeight:700 }}>{user.name}</span>
              <button onClick={onLogout} style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"8px", padding:"4px 10px", fontSize:"15px", fontWeight:700, fontFamily:font, color:"rgba(255,255,255,0.4)", cursor:"pointer" }}>Sign out</button>
            </div>
          ) : (
            <button onClick={() => setLoginOpen(true)} style={{ display:"flex", alignItems:"center", gap:"8px", background:P.accent, border:"none", borderRadius:"8px", padding:"7px 16px", cursor:"pointer", fontFamily:font, boxShadow:"0 1px 8px rgba(0,201,177,0.3)" }}>
              <span style={{ fontSize:"15px", fontWeight:500, color:P.white, letterSpacing:"0em" }}>Sign In</span>
            </button>
          )}
          </div>
          {/* Mobile: sign-in button always visible */}
          {isMobile && !user && (
            <button onClick={() => setLoginOpen(true)} style={{ background:P.accent, border:"none", borderRadius:"8px", padding:"6px 14px", cursor:"pointer", fontFamily:font }}>
              <span style={{ fontSize:"13px", fontWeight:600, color:P.white }}>Sign In</span>
            </button>
          )}
        </div>
      </div>

      <div style={{ display:"flex", flex:1, width:"100%", minHeight:`calc(100vh - ${isMobile && results ? "104px" : "52px"})`, alignItems:"flex-start" }}>

        {/* ── Left Sidebar / Mobile Drawer ── */}
        <div className={`gg-sidebar${isMobile && sidebarOpen ? " open" : ""}`}
          style={{ width:224, flexShrink:0, background:P.navy, borderRight:`1px solid rgba(255,255,255,0.07)`, display:"flex", flexDirection:"column", padding:"20px 14px", overflowY:"auto", position: isMobile ? "fixed" : "sticky", top: isMobile ? "52px" : 0, height: isMobile ? "calc(100vh - 52px)" : "calc(100vh)", alignSelf:"flex-start", zIndex: isMobile ? 200 : "auto" }}>

          {/* Mobile drawer close */}
          {isMobile && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
              <span style={{ fontSize:"13px", fontWeight:700, color:"rgba(255,255,255,0.5)", letterSpacing:"0.08em", textTransform:"uppercase" }}>Menu</span>
              <button onClick={() => setSidebarOpen(false)} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"8px", width:30, height:30, cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X size={14} strokeWidth={2}/>
              </button>
            </div>
          )}


          {/* ── Projects section ── */}
          <div style={{ marginTop:"18px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px", paddingLeft:"4px" }}>
              <span style={{ fontSize:"15px", fontWeight:700, color:P.white, letterSpacing:"0.03em", textTransform:"uppercase" }}>Projects</span>
              {(user || savedSessions.length > 0) && (
                <span style={{ fontSize:"15px", color: user ? P.accent : "rgba(255,255,255,0.35)", fontWeight:600 }}>{user ? `Synced` : "Local only"}</span>
              )}
            </div>

            {/* New project button */}
            <button onClick={() => { setResults(null); setFlightFile(null); setHotelFile(null); setCarFile(null); setDietaryFile(null); setRegistrationFile(null); setEventName(""); setMeta({}); setFilter("all"); setSearch(""); setExpanded(null); setActiveTab("grid"); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:"rgba(255,255,255,0.07)", border:`1px dashed rgba(255,255,255,0.18)`, borderRadius:"8px", padding:"7px 10px", cursor:"pointer", marginBottom:"6px", fontFamily:font, transition:"all 0.15s", textAlign:"left" }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.12)"}
              onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.07)"}>
              <div style={{ width:24, height:24, borderRadius:"6px", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", flexShrink:0, color:P.white, fontWeight:900 }}>+</div>
              <div>
                <div style={{ fontSize:"15px", fontWeight:800, color:P.white, fontFamily:font }}>New Project</div>
                <div style={{ fontSize:"14px", color:"rgba(255,255,255,0.4)", fontFamily:font }}>Start fresh</div>
              </div>
            </button>

            {/* Current unsaved / active project */}
            {(flightFile || results) && !savedSessions.some(s => s.name === eventName && eventName) && (
              <div style={{ display:"flex", alignItems:"center", gap:"8px", background:"rgba(0,201,177,0.12)", border:`1px solid rgba(0,201,177,0.3)`, borderRadius:"8px", padding:"7px 10px", marginBottom:"4px" }}>
                <div style={{ width:24, height:24, borderRadius:"6px", background:P.accent, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:P.navy }} />
                </div>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:"15px", fontWeight:800, color:P.white, fontFamily:font, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{eventName || "Unsaved Project"}</div>
                  <div style={{ fontSize:"14px", color:P.accent, fontFamily:font }}>{results ? `${results.length} guests · ${results.filter(r=>r.status!=="ok").length} flags` : "Active"}</div>
                </div>
                <span style={{ fontSize:"14px", background:P.accent, color:P.navy, padding:"2px 6px", borderRadius:"20px", fontFamily:font, fontWeight:800, flexShrink:0 }}>Active</span>
              </div>
            )}

            {/* Saved projects — most recent first */}
            {savedSessions.length > 0 && (
              <div style={{ marginTop:"4px" }}>
                {savedSessions.map((s, idx) => {
                  const isActive = eventName === s.eventName && s.eventName;
                  const color = `hsl(${(idx * 67 + 200) % 360},55%,42%)`;
                  return (
                    <button key={s.id}
                      onClick={() => { setMeta(s.meta||{}); setEventName(s.eventName||""); setArrivalStart(s.arrivalStart||""); setArrivalEnd(s.arrivalEnd||""); setDepartureStart(s.departureStart||""); setDepartureEnd(s.departureEnd||""); }}
                      style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:isActive?"rgba(255,255,255,0.1)":"transparent", border:`1.5px solid ${isActive?"rgba(255,255,255,0.15)":"transparent"}`, borderRadius:"10px", padding:"7px 8px", cursor:"pointer", marginBottom:"2px", fontFamily:font, transition:"all 0.12s", textAlign:"left" }}
                      onMouseEnter={e => !isActive && (e.currentTarget.style.background="rgba(255,255,255,0.07)")}
                      onMouseLeave={e => !isActive && (e.currentTarget.style.background="transparent")}>
                      <div style={{ width:24, height:24, borderRadius:"6px", background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", flexShrink:0, color:"white", fontWeight:800 }}>
                        {(s.name||"?").charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:"15px", fontWeight:800, color:P.white, fontFamily:font, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</div>
                        <div style={{ fontSize:"14px", color:"rgba(255,255,255,0.4)", fontFamily:font }}>{s.guestCount} guests · {s.issueCount} flags</div>
                      </div>
                      {results && <button onClick={e => { e.stopPropagation(); setCompareSession(s); setShowDiff(true); setActiveTab("grid"); }} style={{ background:"rgba(255,255,255,0.12)", border:`1px solid rgba(255,255,255,0.2)`, borderRadius:"5px", padding:"2px 7px", fontSize:"11px", color:P.white, fontWeight:700, fontFamily:font, cursor:"pointer", marginRight:"4px" }}>↔ Diff</button>}
                      <button onClick={e => { e.stopPropagation(); setSavedSessions(prev => { const next = prev.filter(x => x.id !== s.id); try { storage.set(storageKey, JSON.stringify(next)); } catch(ex) {} return next; }); }}
                        style={{ background:"transparent", border:"none", color:"rgba(255,255,255,0.2)", fontSize:"14px", cursor:"pointer", padding:"2px 4px", flexShrink:0, lineHeight:1, borderRadius:"4px" }}
                        onMouseEnter={e => { e.currentTarget.style.color = P.red; e.currentTarget.style.background = "rgba(192,57,43,0.2)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.2)"; e.currentTarget.style.background = "transparent"; }}
                        title="Remove">✕</button>
                    </button>
                  );
                })}
              </div>
            )}

            {savedSessions.length === 0 && !flightFile && !results && (
              <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.3)", fontFamily:font, paddingLeft:"4px", paddingTop:"2px", fontStyle:"italic" }}>No saved projects yet</div>
            )}

            {/* Sign-in nudge */}
            {!user && savedSessions.length > 0 && (
              <button onClick={() => setLoginOpen(true)} style={{ width:"100%", marginTop:"8px", background:"rgba(107,127,212,0.2)", border:`1px solid rgba(107,127,212,0.35)`, borderRadius:"8px", padding:"6px 10px", cursor:"pointer", fontFamily:font, textAlign:"center" }}>
                <span style={{ fontSize:"15px", fontWeight:700, color:P.white }}>Sign in to sync across devices</span>
              </button>
            )}
          </div>

          {/* Navigation — only shown after results */}
          {results && <>
            <div style={{ width:"100%", height:1, background:"rgba(255,255,255,0.08)", margin:"4px 0 14px" }} />
            <div style={{ fontSize:"14px", fontWeight:600, color:"rgba(255,255,255,0.5)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"8px", paddingLeft:"2px" }}>Views</div>
            {[
              { k:"grid", icon:<LayoutGrid size={15} strokeWidth={1.5}/>, label:"Group Grid", badge: null },
              { k:"summary", icon:<BarChart2 size={15} strokeWidth={1.5}/>, label:"Summary", badge: results.filter(r=>r.status!=="ok").length > 0 ? results.filter(r=>r.status!=="ok").length : null },
              { k:"comms", icon:<Mail size={15} strokeWidth={1.5}/>, label:"Communications", badge: (() => { const n = results.filter(r => r.email && (r.issues||[]).filter(x=>!(r.resolved||[]).includes(x.text)).length > 0).length; return n > 0 ? n : null; })() },
            ].map(({ k, icon, label, badge }) => (
              <button key={k} onClick={() => { setActiveTab(k); if (isMobile) setSidebarOpen(false); }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:"10px", background:activeTab===k?"rgba(0,201,177,0.18)":"transparent", border:`1px solid ${activeTab===k?"rgba(0,201,177,0.35)":"transparent"}`, borderRadius:"7px", padding:"7px 10px", cursor:"pointer", marginBottom:"2px", textAlign:"left", transition:"all 0.15s" }}
                onMouseEnter={e => activeTab!==k && (e.currentTarget.style.background="rgba(255,255,255,0.07)")}
                onMouseLeave={e => activeTab!==k && (e.currentTarget.style.background="transparent")}>
                <span style={{ width:20, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:activeTab===k?P.accent:"rgba(255,255,255,0.45)" }}>{icon}</span>
                <span style={{ flex:1, fontSize:"14px", fontWeight:700, color:activeTab===k?P.accent:"rgba(255,255,255,0.7)", fontFamily:font }}>{label}</span>
                {badge && <span style={{ background:P.red, color:P.white, fontSize:"15px", fontWeight:800, padding:"1px 7px", borderRadius:"20px", flexShrink:0 }}>{badge}</span>}
              </button>
            ))}

            <div style={{ width:"100%", height:1, background:"rgba(255,255,255,0.08)", margin:"14px 0" }} />
            <div style={{ fontSize:"14px", fontWeight:600, color:"rgba(255,255,255,0.5)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"8px", paddingLeft:"2px" }}>Filters</div>
            {[
              { k:"all", icon:"◉", label:"All Guests", count: results.length },
              { k:"issues", icon:"⚑", label:"Action Needed", count: results.filter(r=>r.status!=="ok").length, color:P.red },
              { k:"ok", icon:"✓", label:"Aligned", count: results.filter(r=>r.status==="ok").length, color:P.accent },
              { k:"missing", icon:"○", label:"Missing Records", count: results.filter(r=>r.issues.some(x=>x.type==="missing")).length, color:P.amber },
              { k:"window", icon:"🗓", label:"Outside Window", count: results.filter(r=>r.issues.some(x=>x.type==="window")).length, color:"#C4A0F0" },
              { k:"duplicate", icon:<AlertCircle size={13} strokeWidth={1.5}/>, label:"Duplicates", count: results.filter(r=>r.issues.some(x=>x.type==="duplicate")).length, color:"#FF8A65" },
            ].map(({ k, icon, label, count, color }) => (
              <button key={k} onClick={() => { setFilter(k); setActiveTab("grid"); if (isMobile) setSidebarOpen(false); }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:filter===k&&activeTab==="grid"?"rgba(0,201,177,0.15)":"transparent", border:`1px solid ${filter===k&&activeTab==="grid"?"rgba(0,201,177,0.3)":"transparent"}`, borderRadius:"7px", padding:"6px 10px", cursor:"pointer", marginBottom:"2px", textAlign:"left" }}
                onMouseEnter={e => (filter!==k||activeTab!=="grid") && (e.currentTarget.style.background="rgba(255,255,255,0.07)")}
                onMouseLeave={e => (filter!==k||activeTab!=="grid") && (e.currentTarget.style.background="transparent")}>
                <span style={{ fontSize:"14px", color:color||"rgba(255,255,255,0.45)", width:16, textAlign:"center", flexShrink:0 }}>{icon}</span>
                <span style={{ flex:1, fontSize:"15px", fontWeight:filter===k&&activeTab==="grid"?600:400, color:filter===k&&activeTab==="grid"?P.accent:"rgba(255,255,255,0.65)", fontFamily:font }}>{label}</span>
                <span style={{ fontSize:"15px", fontWeight:600, color:color||"rgba(255,255,255,0.5)", background:(color||"rgba(255,255,255,0.5)")+"22", padding:"1px 7px", borderRadius:"20px", flexShrink:0 }}>{count}</span>
              </button>
            ))}

            <div style={{ width:"100%", height:1, background:"rgba(255,255,255,0.08)", margin:"14px 0" }} />
            <div style={{ fontSize:"14px", fontWeight:800, color:"rgba(255,255,255,0.5)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"8px", paddingLeft:"4px" }}>Export</div>
            <button onClick={exportReport} style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:"transparent", border:`1.5px solid rgba(255,255,255,0.12)`, borderRadius:"9px", padding:"7px 10px", cursor:"pointer", marginBottom:"6px", fontFamily:font }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              <span style={{ fontSize:"15px" }}>⬇</span>
              <span style={{ fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.75)" }}>Download Excel</span>
            </button>
            {contacts.hotel.email && (
              <button onClick={() => exportToContact("hotel")} style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:"transparent", border:`1.5px solid rgba(255,255,255,0.12)`, borderRadius:"9px", padding:"7px 10px", cursor:"pointer", marginBottom:"6px", fontFamily:font }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                <span style={{ fontSize:"15px" }}>🏨</span>
                <span style={{ fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.75)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>Send to {contacts.hotel.name||"Hotel"}</span>
              </button>
            )}
            {contacts.travel.email && (
              <button onClick={() => exportToContact("travel")} style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:"transparent", border:`1.5px solid rgba(255,255,255,0.12)`, borderRadius:"9px", padding:"7px 10px", cursor:"pointer", marginBottom:"6px", fontFamily:font }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                <span style={{ fontSize:"15px" }}>✈</span>
                <span style={{ fontSize:"15px", fontWeight:700, color:P.white, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>Send to {contacts.travel.name||"Travel Agency"}</span>
              </button>
            )}
            {!contacts.hotel.email && !contacts.travel.email && (
              <button onClick={() => setContactsOpen(true)} style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:"transparent", border:`1.5px dashed rgba(255,255,255,0.15)`, borderRadius:"9px", padding:"7px 10px", cursor:"pointer", fontFamily:font }}>
                <Users size={14} strokeWidth={1.5} color="rgba(255,255,255,0.35)"/>
                <span style={{ fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.4)" }}>Add contacts</span>
              </button>
            )}
          </>}
        </div>

        {/* ── Main Content ── */}
        <div className="gg-main" style={{ flex:1, minWidth:0, padding:isMobile ? "16px 14px" : "24px 28px", overflowY:"auto" }}>

        {/* ── Event Info TOP BAR (results state) — moved off the sidebar so the table gets full width ── */}
        {results && (
          <div className="gg-eventbar" style={{ display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap", background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"12px", padding:"10px 14px", marginBottom:"16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", flex:"1 1 220px", minWidth:0 }}>
              <span style={{ width:3, height:18, background:P.accent, borderRadius:"2px", flexShrink:0 }} />
              <input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Name your event"
                style={{ flex:1, minWidth:0, background:"transparent", border:"none", fontSize:"16px", fontWeight:600, color:P.navy, fontFamily:font, outline:"none", padding:"4px 2px" }} />
            </div>
            <div style={{ position:"relative" }}>
              <button onClick={() => setWindowOpen(!windowOpen)}
                style={{ display:"inline-flex", alignItems:"center", gap:"7px", background:hasWindow?P.periwinkle+"14":P.grey50, border:`1.5px solid ${hasWindow?P.periwinkle+"55":P.grey100}`, borderRadius:"9px", padding:"8px 13px", fontSize:"13px", fontWeight:500, color:hasWindow?P.periwinkleD:P.grey600, fontFamily:font, cursor:"pointer", whiteSpace:"nowrap" }}>
                {hasWindow ? "Dates set" : "Approved travel dates"} <Calendar size={14} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/>
              </button>
              {windowOpen && (
                <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:60, width:"260px", background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"12px", padding:"14px", boxShadow:"0 12px 32px rgba(15,29,53,0.16)" }}>
                  <div style={{ fontSize:"12px", color:P.grey400, fontFamily:font, marginBottom:"10px", lineHeight:1.5 }}>Flag guests arriving or departing outside these dates.</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                    {[
                      { label:"Earliest arrival", val:arrivalStart, set:setArrivalStart },
                      { label:"Latest arrival", val:arrivalEnd, set:setArrivalEnd },
                      { label:"Earliest departure", val:departureStart, set:setDepartureStart },
                      { label:"Latest departure", val:departureEnd, set:setDepartureEnd },
                    ].map(({ label, val, set }) => (
                      <div key={label}>
                        <div style={{ fontSize:"12px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"3px" }}>{label}</div>
                        <input type="date" value={val} onChange={e => set(e.target.value)}
                          style={{ width:"100%", background:P.grey50, border:`1.5px solid ${val?P.accent+"66":P.grey100}`, borderRadius:"8px", padding:"7px 9px", fontSize:"13px", fontFamily:font, color:val?P.navy:P.grey400, outline:"none", boxSizing:"border-box" }} />
                      </div>
                    ))}
                    <div style={{ display:"flex", gap:"8px", marginTop:"4px" }}>
                      {hasWindow && <button onClick={() => { setArrivalStart(""); setArrivalEnd(""); setDepartureStart(""); setDepartureEnd(""); }} style={{ flex:1, background:"transparent", border:`1px solid ${P.grey200}`, borderRadius:"7px", padding:"6px", color:P.grey600, fontSize:"12px", fontWeight:500, fontFamily:font, cursor:"pointer" }}>Clear</button>}
                      <button onClick={() => setWindowOpen(false)} style={{ flex:1, background:P.navy, border:"none", borderRadius:"7px", padding:"6px", color:P.white, fontSize:"12px", fontWeight:500, fontFamily:font, cursor:"pointer" }}>Done</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setContactsOpen(true)}
              style={{ display:"inline-flex", alignItems:"center", gap:"7px", background:(contacts.hotel.email||contacts.travel.email)?P.accent+"14":P.grey50, border:`1.5px solid ${(contacts.hotel.email||contacts.travel.email)?P.accent+"55":P.grey100}`, borderRadius:"9px", padding:"8px 13px", fontSize:"13px", fontWeight:500, color:(contacts.hotel.email||contacts.travel.email)?P.accentD:P.grey600, fontFamily:font, cursor:"pointer", whiteSpace:"nowrap" }}>
              {(contacts.hotel.email||contacts.travel.email) ? "Contacts added" : "Contacts"} <Users size={14} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/>
            </button>
          </div>
        )}

        {/* ── Upload hero — full size when no results, compact strip when results exist ── */}
        {!results ? (
          <SetupScreen
            eventName={eventName} setEventName={setEventName}
            arrivalStart={arrivalStart} setArrivalStart={setArrivalStart}
            arrivalEnd={arrivalEnd} setArrivalEnd={setArrivalEnd}
            departureStart={departureStart} setDepartureStart={setDepartureStart}
            departureEnd={departureEnd} setDepartureEnd={setDepartureEnd}
            contacts={contacts} setContactsOpen={setContactsOpen}
            registrationFile={registrationFile} setRegistrationFile={setRegistrationFile}
            flightFile={flightFile} setFlightFile={setFlightFile}
            hotelFile={hotelFile} setHotelFile={setHotelFile}
            hotelProperty={hotelProperty} setHotelProperty={setHotelProperty}
            extraHotels={extraHotels} setExtraHotels={setExtraHotels}
            carFile={carFile} setCarFile={setCarFile}
            dietaryFile={dietaryFile} setDietaryFile={setDietaryFile}
            ready={ready} loading={loading} error={error} runCheck={runCheck} isMobile={isMobile}
          />
        ) : (
          <div style={{ marginBottom:"16px", padding:"10px 14px", background:P.white, borderRadius:"12px", border:`1px solid ${P.grey100}` }}>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "auto auto auto auto auto auto auto auto", gap:"8px", alignItems:"center" }}>
              <UploadSquare label="Registration" icon={<Users size={22} strokeWidth={1.5} color="#00A896"/>} accent={P.accentD} file={registrationFile} setter={setRegistrationFile} required={false} sub="Source of truth" compact />
              <UploadSquare label="Flight"  icon={<Plane size={22} strokeWidth={1.5} color="#4F8EF7"/>} accent={P.periwinkleD} file={flightFile}  setter={setFlightFile}  required={false}  sub="Optional" compact />
              <UploadSquare label="Hotel"   icon={<Hotel size={22} strokeWidth={1.5} color="#F5A623"/>} accent={P.navy}        file={hotelFile}   setter={setHotelFile}   required={false}  sub="Optional" compact />
              <UploadSquare label="Car"     icon={<Car size={22} strokeWidth={1.5} color="#9B59B6"/>}   accent={P.grey600}     file={carFile}     setter={setCarFile}     required={false} sub="Optional" compact />
              <UploadSquare label="Dietary" icon={<Salad size={22} strokeWidth={1.5} color="#27AE60"/>} accent={P.teal}        file={dietaryFile} setter={setDietaryFile} required={false} sub="Optional" compact />
              {!isMobile && <div style={{ width:1, height:32, background:P.grey100, flexShrink:0 }} />}
              <button onClick={runCheck} disabled={!ready || loading}
                style={{ background:ready&&!loading?P.accent:P.grey100, color:ready&&!loading?P.white:P.grey400, border:"none", borderRadius:"7px", padding:"7px 16px", fontSize:"14px", fontWeight:600, fontFamily:font, cursor:ready&&!loading?"pointer":"not-allowed", transition:"all 0.18s", flexShrink:0, whiteSpace:"nowrap", boxShadow:ready&&!loading?"0 1px 6px rgba(0,201,177,0.3)":"none", gridColumn: isMobile ? "1 / -1" : "auto" }}>
                {loading ? "Checking…" : "Re-run Check"}
              </button>
            </div>
            {error && <div style={{ fontSize:"13px", color:P.red, fontFamily:font, background:P.redLight, borderRadius:"8px", padding:"5px 10px", marginTop:"8px" }}>{error}</div>}
            {results && <div style={{ fontSize:"13px", color:P.green, fontFamily:font, fontWeight:600, marginTop:"8px", textAlign: isMobile ? "center" : "right" }}>{results.length} guests · {results.filter(r=>r.status!=="ok").length} flags found</div>}
          </div>
        )}

        {/* Results */}
        {results && (<>

              {showDiff && compareSession && (() => {
                const prevResults = Object.entries(compareSession.meta||{}).map(([k,v]) => ({
                  key:k, email:k.includes("@")?k:"", displayName:v.displayName||k,
                  status:v.status||"ok", issues:v.issues||[], resolved:v.resolved||[], ...v
                }));
                const diff = diffResults(prevResults, results);
                return (
                  <div style={{ background:P.white, border:`1.5px solid ${P.periwinkle}44`, borderRadius:"12px", padding:"16px 20px", marginBottom:"16px" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                        <span style={{ fontSize:"15px", fontWeight:800, color:P.navy, fontFamily:font }}>↔ Changes vs "{compareSession.name}"</span>
                        <span style={{ fontSize:"13px", color:P.grey400, fontFamily:font }}>{new Date(compareSession.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
                      </div>
                      <button onClick={() => { setShowDiff(false); setCompareSession(null); }} style={{ background:"transparent", border:"none", color:P.grey400, cursor:"pointer", fontSize:"18px", lineHeight:1 }}>×</button>
                    </div>
                    <div style={{ display:"flex", gap:"12px", flexWrap:"wrap" }}>
                      {[
                        { label:"New guests", val:diff.added.length, color:P.green, bg:P.greenLight, items:diff.added.map(r=>r.displayName) },
                        { label:"Removed", val:diff.removed.length, color:P.red, bg:P.redLight, items:diff.removed.map(r=>r.displayName) },
                        { label:"Issues changed", val:diff.changed.length, color:P.amber, bg:P.amberLight, items:diff.changed.map(d=>`${d.curr.displayName}: ${d.prev.issues.map(x=>x.text).join(", ")||"none"} → ${d.curr.issues.map(x=>x.text).join(", ")||"none"}`) },
                        { label:"Unchanged", val:diff.unchanged.length, color:P.grey400, bg:P.grey50, items:[] },
                      ].map(({label,val,color,bg,items}) => (
                        <div key={label} style={{ background:bg, border:`1px solid ${color}33`, borderRadius:"8px", padding:"10px 14px", minWidth:"110px" }}>
                          <div style={{ fontSize:"22px", fontWeight:900, color, fontFamily:font }}>{val}</div>
                          <div style={{ fontSize:"13px", fontWeight:600, color, fontFamily:font }}>{label}</div>
                          {items.length > 0 && items.length <= 5 && <div style={{ marginTop:"6px", fontSize:"12px", color, fontFamily:font, lineHeight:1.6 }}>{items.map((x,i)=><div key={i} style={{ opacity:0.8 }}>• {x}</div>)}</div>}
                          {items.length > 5 && <div style={{ marginTop:"6px", fontSize:"12px", color, fontFamily:font, opacity:0.8 }}>• {items[0]}<br/>• {items[1]}<br/>+{items.length-2} more</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
          {activeTab === "comms" && (
            <CommHub
              results={results}
              eventName={eventName}
              contacts={contacts}
              arrivalStart={arrivalStart}
              arrivalEnd={arrivalEnd}
              departureStart={departureStart}
              departureEnd={departureEnd}
            />
          )}

          {activeTab === "summary" && (
            <div style={{ background:P.white, borderRadius:"10px", padding:"22px", boxShadow:"0 1px 2px rgba(15,29,53,0.05)", border:`1px solid ${P.grey100}` }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"20px" }}>
                <div>
                  <h2 style={{ fontFamily:font, fontSize:"18px", fontWeight:900, color:P.navy, margin:"0 0 3px" }}>{eventName||"Event"} — Summary</h2>
                  <div style={{ fontSize:"14px", color:P.navyLight, fontFamily:font }}>{new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>
                </div>
                <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
                  <Btn onClick={exportReport} outline>Export</Btn>
                  {contacts.hotel.email && <Btn onClick={() => exportToContact("hotel")} color={P.accent}>Send to {contacts.hotel.name||"Hotel"} <Mail size={13} strokeWidth={2} style={{verticalAlign:"-2px"}}/></Btn>}
                  {contacts.travel.email && <Btn onClick={() => exportToContact("travel")} color={P.accent}>Send to {contacts.travel.name||"Travel Agency"} <Mail size={13} strokeWidth={2} style={{verticalAlign:"-2px"}}/></Btn>}
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"10px", marginBottom:"20px" }}>
                {[{label:"Total Guests",val:counts.total,color:P.navy,icon:<Users size={14} strokeWidth={1.5}/>},{label:"Fully Aligned",val:counts.ok,color:P.green,icon:<Check size={14} strokeWidth={2}/>},{label:"Action Needed",val:counts.error,color:P.red,icon:<AlertTriangle size={14} strokeWidth={1.5}/>},{label:"Alignment Rate",val:(counts.total>0?Math.round(counts.ok/counts.total*100):0)+"%",color:P.periwinkleD,icon:<BarChart2 size={14} strokeWidth={1.5}/>}].map(({label,val,color,icon}) => (
                  <div key={label} style={{ background:P.offWhite, borderRadius:"12px", padding:"14px 16px" }}>
                    <div style={{ fontSize:"20px", fontWeight:900, color, fontFamily:font }}>{icon} {val}</div>
                    <div style={{ fontSize:"14px", color:P.navy, fontWeight:600, marginTop:"4px", fontFamily:font }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", marginBottom:"20px" }}>
                {[{label:"Missing Records",val:counts.missing,color:P.amber,icon:<Circle size={14} strokeWidth={1.5}/>},{label:"Date Mismatches",val:results.filter(r=>r.issues.some(x=>x.type==="mismatch")).length,color:P.red,icon:<AlertTriangle size={14} strokeWidth={1.5}/>},{label:"Outside Window",val:counts.window,color:P.purple,icon:<Calendar size={14} strokeWidth={1.5}/>},{label:"Duplicate Names",val:counts.duplicate,color:"#E65100",icon:<AlertCircle size={14} strokeWidth={1.5}/>},{label:"Dietary / Access",val:counts.dietary,color:P.teal,icon:<Salad size={14} strokeWidth={1.5}/>}].map(({label,val,color,icon}) => (
                  <div key={label} style={{ background:P.offWhite, borderRadius:"10px", padding:"10px 14px", display:"flex", alignItems:"center", gap:"10px" }}>
                    <div style={{ fontSize:"18px", fontWeight:900, color, fontFamily:font, minWidth:"28px" }}>{val}</div>
                    <div style={{ fontSize:"15px", color:P.navy, fontWeight:600, fontFamily:font }}>{icon} {label}</div>
                  </div>
                ))}
              </div>
              {counts.error > 0 && (
                <div>
                  <div style={{ fontWeight:800, fontSize:"15px", color:P.red, fontFamily:font, marginBottom:"8px" }}>⚑ Guests Requiring Action</div>
                  {results.filter(r=>r.status==="error").map((r,i) => (
                    <div key={i} style={{ background:P.redLight, borderRadius:"10px", padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"6px" }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:"14px", color:P.navy, fontFamily:font }}>{r.firstName} {r.lastName}</div>
                        <div style={{ fontSize:"15px", color:P.red, fontFamily:font, marginTop:"2px" }}>{r.issues.filter(x=>!(r.resolved||[]).includes(x.text)).map(x=>x.text).join(" · ")}</div>
                      </div>
                      <Btn onClick={() => setEmailModal(r)} small outline color={P.red}>Draft <Mail size={12} strokeWidth={2} style={{verticalAlign:"-2px"}}/></Btn>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "grid" && (<>
            {/* Search + active filter indicator */}
            {(() => {
            const displayRows = sortedFiltered(filtered);
            const allSelected = displayRows.length > 0 && displayRows.every(r => selectedRows.has(r.key));
            const someSelected = displayRows.some(r => selectedRows.has(r.key));
            const selCount = displayRows.filter(r => selectedRows.has(r.key)).length;
            return (<>
            <div style={{ display:"flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", gap:"10px", marginBottom:"12px" }}>
              {/* Search */}
              <div style={{ position:"relative", flex:1 }}>
                <input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width:"100%", background:P.white, border:`1.5px solid ${P.grey200}`, borderRadius:"10px", padding:"10px 12px 10px 34px", color:P.navy, fontSize:"15px", fontFamily:font, outline:"none", boxSizing:"border-box" }} />
                <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:P.navyLight, fontSize:"14px", pointerEvents:"none" }}>🔍</span>
                {search && <button onClick={() => setSearch("")} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", color:P.navyLight, fontSize:"15px", cursor:"pointer" }}>✕</button>}
              </div>
              {/* Filter pills — hidden on mobile (use sidebar) */}
              {!isMobile && (
                <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
                  {[
                    { k:"all",       l:"All" },
                    { k:"issues",    l:"Action Needed" },
                    { k:"ok",        l:"Aligned" },
                    { k:"missing",   l:"Missing" },
                    { k:"window",    l:"Window" },
                    { k:"duplicate", l:"Dupes" },
                  ].map(({ k, l }) => (
                    <button key={k} onClick={() => setFilter(k)}
                      style={{ background:filter===k?P.navy:P.white, color:filter===k?P.white:P.grey600, border:`1.5px solid ${filter===k?P.navy:P.grey200}`, borderRadius:"8px", padding:"5px 11px", fontSize:"15px", fontWeight:700, fontFamily:font, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.12s" }}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
              {/* Sort — full width row on mobile */}
              <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
              <select value={sortBy||""} onChange={e => { setSortBy(e.target.value||null); setSortDir("asc"); }}
                style={{ background:P.white, border:`1.5px solid ${P.grey200}`, borderRadius:"8px", padding:"8px 10px", fontSize:"14px", fontWeight:700, fontFamily:font, color:P.navy, cursor:"pointer", outline:"none", flex: isMobile ? 1 : "none" }}>
                <option value="">Sort by…</option>
                <option value="lastName">Last Name A→Z</option>
                <option value="firstName">First Name A→Z</option>
                <option value="email">Email A→Z</option>
                <option value="status">Status</option>
                <option value="arrival">Arrival Date</option>
                <option value="checkin">Check-In</option>
                <option value="departure">Departure Date</option>
                <option value="checkout">Check-Out</option>
                <option value="hotel">Hotel</option>
              </select>
              {sortBy && (
                <button onClick={() => setSortDir(d => d==="asc"?"desc":"asc")}
                  style={{ background:P.navy, border:"none", borderRadius:"8px", padding:"8px 10px", fontSize:"14px", fontWeight:700, fontFamily:font, color:P.white, cursor:"pointer" }}>
                  {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
                </button>
              )}
              <span style={{ fontSize:"14px", color:P.navyLight, fontFamily:font, whiteSpace:"nowrap" }}>{displayRows.length} guests</span>
              </div>{/* end sort wrapper */}
            </div>

            {/* Export / selection toolbar */}
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px", padding:"8px 12px", background:P.white, borderRadius:"12px", border:`1px solid ${someSelected ? P.accent+"66" : P.grey100}`, transition:"border-color 0.2s", flexWrap: isMobile ? "nowrap" : "nowrap", overflowX: isMobile ? "auto" : "hidden" }}>
              {/* Select all */}
              <label style={{ display:"flex", alignItems:"center", gap:"7px", cursor:"pointer", flexShrink:0 }}>
                <div onClick={toggleSelectAll} style={{ width:18, height:18, borderRadius:"5px", border:`2px solid ${allSelected?P.accent:someSelected?P.accent:P.grey300}`, background:allSelected?P.accent:someSelected?P.accent+"33":P.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, transition:"all 0.15s" }}>
                  {allSelected && <span style={{ color:P.white, fontSize:"15px", fontWeight:900, lineHeight:1 }}>✓</span>}
                  {!allSelected && someSelected && <span style={{ color:P.periwinkleD, fontSize:"14px", fontWeight:900, lineHeight:1 }}>—</span>}
                </div>
                <span style={{ fontSize:"13px", fontWeight:700, color:P.navy, fontFamily:font, whiteSpace:"nowrap" }}>
                  {someSelected ? `${selCount} selected` : `Select all`}
                </span>
              </label>
              <div style={{ width:1, height:20, background:P.grey100, flexShrink:0 }} />
              {/* Excel export — PRIMARY */}
              <button onClick={exportSelected}
                style={{ display:"flex", alignItems:"center", gap:"5px", background:P.accent, border:"none", borderRadius:"7px", padding:"5px 13px", fontSize:"13px", fontWeight:700, fontFamily:font, color:P.white, cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap", flexShrink:0, boxShadow:"0 1px 6px rgba(0,201,177,0.3)" }}>
                {someSelected ? `Export ${selCount} to Excel` : "Export to Excel"} <FileSpreadsheet size={13} strokeWidth={1.8} style={{verticalAlign:"-2px",marginLeft:"4px"}}/>
              </button>
              {/* Email selected — send messages without leaving the cross-check tab */}
              {someSelected && (() => {
                const emailable = displayRows.filter(r => selectedRows.has(r.key) && r.email && (r.issues||[]).filter(x=>!(r.resolved||[]).includes(x.text)).length > 0);
                return (
                  <button onClick={() => emailSelected()} disabled={emailable.length===0}
                    title={emailable.length===0 ? "Selected guests have no email or no open issues" : `Draft emails to ${emailable.length} guest(s)`}
                    style={{ display:"flex", alignItems:"center", gap:"5px", background:emailable.length>0?P.white:P.grey50, border:`1.5px solid ${emailable.length>0?P.accent:P.grey100}`, borderRadius:"7px", padding:"5px 12px", fontSize:"13px", fontWeight:600, fontFamily:font, color:emailable.length>0?P.accentD:P.grey400, cursor:emailable.length>0?"pointer":"not-allowed", flexShrink:0, whiteSpace:"nowrap" }}>
                    Email {emailable.length>0?emailable.length:""} selected <Mail size={13} strokeWidth={2} style={{verticalAlign:"-2px",marginLeft:"2px"}}/>
                  </button>
                );
              })()}
              {/* Share HTML Report — SECONDARY */}
              <button onClick={generateShareableReport}
                style={{ display:"flex", alignItems:"center", gap:"5px", background:P.offWhite, border:`1.5px solid ${P.grey200}`, borderRadius:"7px", padding:"5px 12px", fontSize:"13px", fontWeight:600, fontFamily:font, color:P.grey600, cursor:"pointer", flexShrink:0, whiteSpace:"nowrap" }}>
                Share HTML Report <Send size={12} strokeWidth={1.5} style={{verticalAlign:"-2px",marginLeft:"4px"}}/>
              </button>
              {someSelected && (
                <button onClick={() => setSelectedRows(new Set())}
                  style={{ background:"transparent", border:"none", fontSize:"13px", color:P.navyLight, fontFamily:font, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                  Clear
                </button>
              )}
              <div style={{ marginLeft:"auto", display:"flex", gap:"6px", alignItems:"center", flexShrink:0 }}>
                {(filter !== "all" || sortBy) && (
                  <button onClick={() => { setFilter("all"); setSortBy(null); setSortDir("asc"); }}
                    style={{ background:"transparent", border:`1px solid ${P.grey200}`, borderRadius:"6px", padding:"3px 8px", fontSize:"13px", fontWeight:600, color:P.navyLight, fontFamily:font, cursor:"pointer", whiteSpace:"nowrap" }}>
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {(() => {
              // Virtual scroll calculations
              const OVERSCAN = 4;
              const containerH = TABLE_ROW_HEIGHT * TABLE_VISIBLE_ROWS;
              // compute row tops accounting for expanded rows
              const rowTops = [];
              let cumH = 0;
              for (let i = 0; i < displayRows.length; i++) {
                rowTops.push(cumH);
                cumH += (expanded === displayRows[i].key) ? TABLE_ROW_HEIGHT + TABLE_EXPANDED_HEIGHT : TABLE_ROW_HEIGHT;
              }
              const totalVH = cumH;
              // find visible range
              let vStart = 0;
              while (vStart < displayRows.length - 1 && rowTops[vStart + 1] <= tableScrollTop - OVERSCAN * TABLE_ROW_HEIGHT) vStart++;
              let vEnd = vStart;
              while (vEnd < displayRows.length && rowTops[vEnd] < tableScrollTop + containerH + OVERSCAN * TABLE_ROW_HEIGHT) vEnd++;
              vEnd = Math.min(vEnd, displayRows.length);
              const topPad = rowTops[vStart] || 0;
              const botPad = vEnd < displayRows.length ? totalVH - rowTops[vEnd] : 0;
              return (
            <div style={{ background:P.white, borderRadius:"10px", boxShadow:"0 1px 2px rgba(15,29,53,0.06), 0 4px 12px rgba(15,29,53,0.05)", border:`1px solid ${P.grey100}`, overflow:"hidden" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", borderBottom:`1px solid ${P.grey100}`, background:P.grey50 }}>
                <span style={{ fontSize:"12px", color:P.grey400, fontFamily:font }}>Scroll to see all columns →</span>
                <div style={{ display:"flex", gap:"6px" }}>
                  <button onClick={() => { if (tableScrollRef.current) tableScrollRef.current.scrollBy({ left:-320, behavior:"smooth" }); }}
                    style={{ width:"30px", height:"28px", borderRadius:"7px", border:`1px solid ${P.grey200}`, background:P.white, color:P.grey600, cursor:"pointer", fontSize:"14px", display:"flex", alignItems:"center", justifyContent:"center" }} title="Scroll left">‹</button>
                  <button onClick={() => { if (tableScrollRef.current) tableScrollRef.current.scrollBy({ left:320, behavior:"smooth" }); }}
                    style={{ width:"30px", height:"28px", borderRadius:"7px", border:`1px solid ${P.grey200}`, background:P.white, color:P.grey600, cursor:"pointer", fontSize:"14px", display:"flex", alignItems:"center", justifyContent:"center" }} title="Scroll right">›</button>
                </div>
              </div>
              <div className="gg-table-wrap" ref={tableScrollRef} onScroll={e => setTableScrollTop(e.currentTarget.scrollTop)}
                style={{ overflowX:"auto", overflowY:"auto", maxHeight:isMobile ? `calc(100vh - 220px)` : `${containerH}px` }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"14px", minWidth:hasCars?"1060px":"760px" }}>
                  <thead style={{ position:"sticky", top:0, zIndex:10 }}>
                    <tr style={{ background:P.navy }}>
                      {/* Checkbox column */}
                      <th style={{ padding:"10px 8px 10px 14px", width:"32px" }}>
                        <div onClick={toggleSelectAll} style={{ width:16, height:16, borderRadius:"4px", border:`2px solid ${allSelected?"white":someSelected?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.3)"}`, background:allSelected?"white":someSelected?"rgba(255,255,255,0.2)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.15s" }}>
                          {allSelected && <span style={{ color:P.navy, fontSize:"15px", fontWeight:900, lineHeight:1 }}>✓</span>}
                          {!allSelected && someSelected && <span style={{ color:"white", fontSize:"8px", fontWeight:900, lineHeight:1 }}>—</span>}
                        </div>
                      </th>
                      {[
                        { l:"First Name", col:"firstName", w:"110px" },
                        { l:"Last Name",  col:"lastName",  w:"110px" },
                        { l:"Email",      col:"email",     w:"160px" },
                        { l:"Status",    col:"status" },
                        { l:"Arrival",   col:"arrival" },
                        { l:"Check-In",  col:"checkin" },
                        { l:"Δ",         col:null },
                        { l:"Departure", col:"departure" },
                        { l:"Check-Out", col:"checkout" },
                        { l:"Δ",         col:null },
                        ...(hasHotelNames?[{l:"Hotel",col:"hotel"}]:[]),
                        ...(hasCars?[{l:"Pickup",col:null},{l:"Dropoff",col:null},{l:"Δ",col:null}]:[]),
                        ...(hasDiet?[{l:"Dietary",col:null}]:[]),
                        { l:"Flags",     col:"flags" },
                        { l:"Note",      col:"note" },
                      ].map((h, i) => (
                        <th key={i} onClick={h.col ? () => toggleSort(h.col) : undefined}
                          style={{ padding:"10px 12px", textAlign:"left", fontSize:"14px", fontWeight:800, color: sortBy===h.col?"white":"rgba(255,255,255,0.55)", letterSpacing:"0.1em", textTransform:"uppercase", width:h.w, whiteSpace:"nowrap", fontFamily:font, cursor:h.col?"pointer":"default", userSelect:"none", transition:"color 0.15s" }}>
                          {h.l}{sortBy===h.col ? (sortDir==="asc"?" ↑":" ↓") : h.col ? " ↕" : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={20} style={{ padding:"40px", textAlign:"center", color:P.navyLight, fontStyle:"italic", fontFamily:font }}>No records match your filter.</td></tr>
                    )}
                    {topPad > 0 && <tr style={{ height:`${topPad}px` }}><td colSpan={20} style={{ padding:0 }} /></tr>}
                    {displayRows.slice(vStart, vEnd).map((r, vi) => {
                      const i = vStart + vi;
                      const isExp = expanded === r.key;
                      const isSel = selectedRows.has(r.key);
                      const baseBg = isSel ? P.accent+"0D" : i%2===0 ? P.white : P.offWhite;
                      const activeIssues = r.issues.filter(x => !(r.resolved||[]).includes(x.text));
                      return (
                        <Fragment key={`${r.key}-${i}`}>
                          <tr style={{ background:isExp?P.grey50:baseBg, borderBottom:`1px solid ${P.grey100}`, cursor:"pointer", outline:isSel?`inset 0 0 0 1.5px ${P.periwinkle}44`:undefined }}
                            onMouseEnter={e => { if(!isExp) e.currentTarget.style.background=P.grey50; }}
                            onMouseLeave={e => { if(!isExp) e.currentTarget.style.background=baseBg; }}>
                            {/* Row checkbox */}
                            <td style={{ padding:"10px 8px 10px 14px" }} onClick={e => { e.stopPropagation(); toggleSelectRow(r.key); }}>
                              <div style={{ width:16, height:16, borderRadius:"4px", border:`2px solid ${isSel?P.accent:P.grey200}`, background:isSel?P.accent:P.white, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>
                                {isSel && <span style={{ color:P.white, fontSize:"15px", fontWeight:900, lineHeight:1 }}>✓</span>}
                              </div>
                            </td>
                            {/* First Name */}
                            <td style={{ padding:"10px 12px" }} onClick={() => setExpanded(isExp ? null : r.key)}>
                              <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                                <span style={{ fontWeight:600, fontSize:"14px", color:P.navy, fontFamily:font }}>
                                  {r.firstName || r.displayName.split(" ")[0]}
                                </span>
                              </div>
                            </td>
                            {/* Last Name */}
                            <td style={{ padding:"10px 12px", fontWeight:700, color:P.navy, fontSize:"14px", fontFamily:font }} onClick={() => setExpanded(isExp ? null : r.key)}>
                              {r.lastName || r.displayName.split(" ").slice(1).join(" ") || "—"}
                            </td>
                            {/* Email */}
                            <td style={{ padding:"10px 12px", fontSize:"15px", color:r.email?P.grey600:P.grey200, fontFamily:font }} onClick={() => setExpanded(isExp ? null : r.key)}>
                              {r.email || "—"}
                            </td>
                            <td style={{ padding:"10px 12px" }}><StatusChip status={r.status} /></td>
                            <td style={{ padding:"10px 12px", color:r.flight?P.grey600:P.red, fontSize:"15px", fontFamily:font, fontWeight:r.flight?500:700 }}>{r.flight ? fmt(r.flight.flightArrival) : "⚠ Missing"}</td>
                            <td style={{ padding:"10px 12px", color:r.hotel?P.grey600:P.red, fontSize:"15px", fontFamily:font, fontWeight:r.hotel?500:700 }}>{r.hotel ? fmt(r.hotel.checkIn) : "⚠ Missing"}</td>
                            <td style={{ padding:"10px 12px", textAlign:"center" }}><Delta val={r.details?.arrDiff} /></td>
                            <td style={{ padding:"10px 12px", color:r.flight?P.grey600:P.red, fontSize:"15px", fontFamily:font, fontWeight:r.flight?500:700 }}>{r.flight ? fmt(r.flight.flightDeparture) : "⚠ Missing"}</td>
                            <td style={{ padding:"10px 12px", color:r.hotel?P.grey600:P.red, fontSize:"15px", fontFamily:font, fontWeight:r.hotel?500:700 }}>{r.hotel ? fmt(r.hotel.checkOut) : "⚠ Missing"}</td>
                            <td style={{ padding:"10px 12px", textAlign:"center" }}><Delta val={r.details?.depDiff} /></td>
                            {hasHotelNames && (() => {
                              const wrongHotel = (r.issues||[]).some(x => x.text && x.text.includes("but assigned to"));
                              return <td style={{ padding:"10px 12px", color:wrongHotel?P.red:P.navy, fontSize:"15px", fontFamily:font, fontWeight:wrongHotel?600:500, whiteSpace:"nowrap" }}>{r.hotel?.hotel ? (wrongHotel ? "⚠ "+r.hotel.hotel : r.hotel.hotel) : "—"}</td>;
                            })()}
                            {hasCars && <>
                              <td style={{ padding:"10px 12px", color:P.navy, fontSize:"15px", fontFamily:font }}>{fmt(r.car?.pickupDate)}</td>
                              <td style={{ padding:"10px 12px", color:P.navy, fontSize:"15px", fontFamily:font }}>{fmt(r.car?.dropoffDate)}</td>
                              <td style={{ padding:"10px 12px", textAlign:"center" }}><Delta val={r.details?.pickupDiff} /></td>
                            </>}
                            {hasDiet && <td style={{ padding:"10px 12px" }}>
                              {r.diet?.dietary ? <span style={{ background:P.tealLight, color:P.teal, fontSize:"15px", fontWeight:700, padding:"2px 8px", borderRadius:"20px", fontFamily:font }}>{r.diet.dietary.slice(0,16)}{r.diet.dietary.length>16?"…":""}</span> : <span style={{ color:P.grey400 }}>—</span>}
                            </td>}
                            <td style={{ padding:"10px 12px" }}>
                              {activeIssues.length === 0
                                ? <span style={{ color:P.grey200, fontSize:"15px" }}>—</span>
                                : <div style={{ display:"flex", flexDirection:"column", gap:"2px" }}>
                                    {activeIssues.some(x=>x.type==="missing") && <span style={{ color:P.amber, fontSize:"15px", fontWeight:700, fontFamily:font }}>○ missing</span>}
                                    {activeIssues.some(x=>x.type==="window") && <span style={{ color:P.purple, fontSize:"15px", fontWeight:700, fontFamily:font }}>🗓 window</span>}
                                    {activeIssues.some(x=>x.type==="mismatch") && <span style={{ color:P.red, fontSize:"15px", fontWeight:700, fontFamily:font }}>⚑ mismatch</span>}
                                    {activeIssues.some(x=>x.type==="duplicate") && <span style={{ color:"#E65100", fontSize:"15px", fontWeight:700, fontFamily:font }}>⚠ dupe</span>}
                                  </div>}
                            </td>
                            <td style={{ padding:"10px 12px" }}>
                              {r.note ? <span style={{ color:P.navy, fontSize:"15px", fontFamily:font, maxWidth:"90px", display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={r.note}>📝 {r.note}</span> : <span style={{ color:P.grey200, fontSize:"15px" }}>—</span>}
                            </td>
                          </tr>
                          {isExp && (
                            <tr>
                              <td colSpan={20} style={{ padding:0 }}>
                                <div style={{ background:P.grey50, borderBottom:`1px solid ${P.grey100}`, padding:"16px 18px" }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px", flexWrap:"wrap" }}>
                                    <Btn onClick={() => setEmailModal(r)} small color={P.accent}>Draft Email <Mail size={12} strokeWidth={2} style={{verticalAlign:"-2px"}}/></Btn>
                                    <div style={{ flex:1, display:"flex", alignItems:"center", gap:"8px" }}>
                                      <span style={{ fontSize:"15px", fontWeight:700, color:P.navyLight, fontFamily:font, flexShrink:0 }}>Note</span>
                                      <input value={r.note||""} onChange={e => updateMeta(r,{note:e.target.value})} placeholder={user ? `Planner note — saved to ${user.name}'s account` : "Planner note — saved locally (sign in to sync)"} onClick={e => e.stopPropagation()}
                                        style={{ flex:1, background:P.white, border:`1.5px solid ${r.note ? P.periwinkle+"66" : P.grey200}`, borderRadius:"9px", padding:"5px 12px", fontSize:"14px", fontFamily:font, color:P.navy, outline:"none" }} />
                                      {r.note && <span style={{ fontSize:"14px", color:P.green, fontFamily:font, fontWeight:700, flexShrink:0 }}>{user ? "synced" : "saved"}</span>}
                                    </div>
                                    <span style={{ fontSize:"15px", color:P.navyLight, fontFamily:font }}>{r.matchedBy==="email"?"✉ email match":"👤 name match"}</span>
                                  </div>
                                  <div className="gg-detail-grid" style={{ display:"grid", gridTemplateColumns:hasDiet?"1fr 1fr 1fr 1fr 1fr":"1fr 1fr 1fr 1fr", gap:"10px" }}>
                                    <Card title="✈ Flight" color={P.periwinkleD}>
                                      {r.flight ? <>
                                        <DR label="Arrival" val={fmt(r.flight.flightArrival)} />
                                        <DR label="Departure" val={fmt(r.flight.flightDeparture)} />
                                        {r.flight.flightIn && <DR label="Inbound #" val={r.flight.flightIn} accent />}
                                        {r.flight.flightOut && <DR label="Outbound #" val={r.flight.flightOut} accent />}
                                        {r.flight.airport && <DR label="Airport" val={r.flight.airport} />}
                                        {r.flight.email && <DR label="Email" val={r.flight.email} />}
                                      </> : <div style={{ background:P.amberLight, borderRadius:"8px", padding:"8px 10px", color:P.amber, fontSize:"15px", fontWeight:700, fontFamily:font }}>○ Not in flight manifest</div>}
                                    </Card>
                                    <Card title="Hotel" color={P.navy}>
                                      {r.hotel ? <>
                                        {r.hotel.hotel && <DR label="Property" val={r.hotel.hotel} />}
                                        <DR label="Check-In" val={fmt(r.hotel.checkIn)} />
                                        <DR label="Check-Out" val={fmt(r.hotel.checkOut)} />
                                        {r.hotel.room && <DR label="Room/Conf" val={r.hotel.room} accent />}
                                        {r.hotel.email && <DR label="Email" val={r.hotel.email} />}
                                      </> : <div style={{ background:P.amberLight, borderRadius:"8px", padding:"8px 10px", color:P.amber, fontSize:"15px", fontWeight:700, fontFamily:font }}>○ Not in hotel roster</div>}
                                    </Card>
                                    <Card title="Car Transfers" color={P.grey600}>
                                      {r.car ? <>
                                        <DR label="Pickup" val={fmt(r.car.pickupDate)} />
                                        {r.car.pickupLoc && <DR label="From" val={r.car.pickupLoc} />}
                                        <DR label="Dropoff" val={fmt(r.car.dropoffDate)} />
                                        {r.car.dropoffLoc && <DR label="To" val={r.car.dropoffLoc} />}
                                        {r.car.confirmation && <DR label="Conf #" val={r.car.confirmation} accent />}
                                      </> : <div style={{ color:P.grey200, fontSize:"15px", fontStyle:"italic", fontFamily:font }}>No transfer on file</div>}
                                    </Card>
                                    {hasDiet && (
                                      <Card title="🥗 Dietary & Access" color={P.teal}>
                                        {r.diet ? <>
                                          {r.diet.dietary && <DR label="Dietary" val={r.diet.dietary} />}
                                          {r.diet.accessibility && <DR label="Access" val={r.diet.accessibility} />}
                                          {r.diet.specialNotes && <DR label="Notes" val={r.diet.specialNotes} />}
                                        </> : <div style={{ color:P.grey200, fontSize:"15px", fontStyle:"italic", fontFamily:font }}>No dietary info on file</div>}
                                      </Card>
                                    )}
                                    <Card title="⚑ Flags" color={P.red}>
                                      <div style={{ marginBottom:"8px" }}>
                                        <span style={{ fontSize:"15px", fontWeight:700, fontFamily:font, padding:"2px 8px", borderRadius:"20px", background:r.matchedBy==="email"?P.greenLight:P.amberLight, color:r.matchedBy==="email"?P.green:P.amber }}>
                                          {r.matchedBy==="email"?"✉ email match":"👤 name match"}
                                        </span>
                                      </div>
                                      {r.issues.length === 0
                                        ? <div style={{ color:P.green, fontSize:"14px", fontWeight:700, fontFamily:font }}>✓ All clear</div>
                                        : r.issues.map((issue, j) => <IssueTag key={j} issue={issue} resolved={r.resolved} onResolve={txt => toggleResolve(r, txt)} />)}
                                      {r.resolved?.length > 0 && <div style={{ fontSize:"15px", color:P.navyLight, fontFamily:font, marginTop:"4px" }}>{r.resolved.length} resolved</div>}
                                    </Card>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {botPad > 0 && <tr style={{ height:`${botPad}px` }}><td colSpan={20} style={{ padding:0 }} /></tr>}
                  </tbody>
                </table>
              </div>
              <div style={{ padding:"8px 14px", background:P.offWhite, borderTop:`1px solid ${P.grey100}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:"15px", color:P.navyLight, fontFamily:font, fontWeight:600 }}>Showing {displayRows.length} of {results.length} guests{selCount > 0 ? ` · ${selCount} selected` : ""}</span>
                <div style={{ display:"flex", gap:"10px", fontSize:"15px", fontFamily:font, fontWeight:700 }}>
                  <span style={{ color:P.amber }}>○ missing</span>
                  <span style={{ color:P.red }}>⚑ mismatch</span>
                  <span style={{ color:P.purple }}>🗓 window</span>
                  <span style={{ color:"#E65100" }}>⚠ dupe</span>
                </div>
              </div>
            </div>
              ); // close IIFE return
            })()} {/* close virtual scroll IIFE */}
            </>);
            })()}
        </>)}
        </>)}
      </div>{/* end main content */}
      </div>{/* end sidebar+main flex */}

      <div style={{ borderTop:`1px solid ${P.grey100}`, padding:"12px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", background:P.white, flexWrap:"wrap", gap:"10px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 52" width="100" height="25" style={{display:"block"}}>
              <defs>
                <linearGradient id="ggIconBgL" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1A2E52"/>
                  <stop offset="100%" stopColor="#0F1F3D"/>
                </linearGradient>
                <linearGradient id="ggTealL" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00C9B1"/>
                  <stop offset="100%" stopColor="#00A896"/>
                </linearGradient>
              </defs>
              <g transform="translate(2,2)">
                <rect x="0" y="0" width="48" height="48" rx="10" fill="url(#ggIconBgL)"/>
                <circle cx="9"  cy="9"  r="3" fill="rgba(255,255,255,0.18)"/>
                <circle cx="19" cy="9"  r="3" fill="rgba(255,255,255,0.18)"/>
                <circle cx="29" cy="9"  r="3" fill="rgba(255,255,255,0.18)"/>
                <circle cx="39" cy="9"  r="3" fill="rgba(255,255,255,0.18)"/>
                <circle cx="9"  cy="19" r="3" fill="rgba(255,255,255,0.18)"/>
                <circle cx="19" cy="19" r="3" fill="rgba(255,255,255,0.18)"/>
                <circle cx="29" cy="19" r="3" fill="url(#ggTealL)" opacity="0.45"/>
                <circle cx="39" cy="19" r="3" fill="url(#ggTealL)" opacity="0.65"/>
                <circle cx="9"  cy="29" r="3" fill="rgba(255,255,255,0.18)"/>
                <circle cx="19" cy="29" r="3" fill="url(#ggTealL)" opacity="0.45"/>
                <circle cx="29" cy="29" r="3" fill="url(#ggTealL)" opacity="0.75"/>
                <circle cx="39" cy="29" r="3" fill="url(#ggTealL)" opacity="0.9"/>
                <circle cx="9"  cy="39" r="3" fill="url(#ggTealL)" opacity="0.35"/>
                <circle cx="19" cy="39" r="3" fill="url(#ggTealL)" opacity="0.6"/>
                <circle cx="29" cy="39" r="3" fill="url(#ggTealL)" opacity="0.85"/>
                <circle cx="39" cy="39" r="3" fill="url(#ggTealL)"/>
              </g>
              <text x="62" y="36" fontFamily="'Manrope', sans-serif" fontSize="26" fontWeight="700" letterSpacing="-0.5" fill="#0F1F3D">Group</text>
              <text x="144" y="36" fontFamily="'Manrope', sans-serif" fontSize="26" fontWeight="300" letterSpacing="-0.5" fill="#00A896">Grid</text>
            </svg>
            <span style={{ fontSize:"13px", color:P.grey400, fontFamily:font }}>Built for event professionals · © 2026</span>
          </div>
          <div style={{ display:"flex", gap:"20px" }}>
            {[
              { label:"Home", pg:"landing" },
              { label:"Pricing", pg:"pricing" },
              { label:"About", pg:"about" },
              { label:"Contact", pg:"contact" },
              { label:"Privacy Policy", pg:"privacy" },
              { label:"Terms of Service", pg:"terms" },
            ].map(({ label, pg }) => (
              <button key={pg} onClick={() => setPage(pg)} style={{ background:"none", border:"none", padding:0, fontSize:"13px", color:P.grey400, fontFamily:font, fontWeight:500, cursor:"pointer", textDecoration:"underline", textDecorationColor:P.grey200 }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
          {[
            { icon:<Lock size={10} strokeWidth={2}/>,       label:"Files stay in your browser", bg:"#FFF7ED", border:"#FB923C", color:"#C2410C" },
            { icon:<Ban size={10} strokeWidth={2}/>,        label:"Guest files not uploaded",   bg:"#FFF0F6", border:"#F472B6", color:"#BE185D" },
            { icon:<ShieldCheck size={10} strokeWidth={2}/>, label:"Encrypted accounts",        bg:"#F0FDF4", border:"#4ADE80", color:"#15803D" },
            { icon:<Check size={11} strokeWidth={2.5}/>,    label:"Secure by design",          bg:"#EFF6FF", border:"#60A5FA", color:"#1D4ED8" },
          ].map(({ icon, label, bg, border, color }) => (
            <div key={label} style={{ display:"flex", alignItems:"center", gap:"5px", background:bg, border:`1px solid ${border}`, borderRadius:"20px", padding:"4px 10px" }}>
              <span style={{ display:"flex", alignItems:"center", color }}>{icon}</span>
              <span style={{ fontSize:"15px", fontWeight:600, color, fontFamily:font }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mobile bottom nav — only shown when results are loaded ── */}
      {results && (
        <div className="gg-bottom-nav"
          style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:150, background:P.navy, borderTop:`1px solid rgba(255,255,255,0.1)`, padding:"8px 0 max(8px, env(safe-area-inset-bottom))", display:"flex", alignItems:"center", justifyContent:"space-around" }}>
          {[
            { k:"grid",    icon:<LayoutGrid size={20} strokeWidth={1.5}/>, label:"Grid" },
            { k:"summary", icon:<BarChart2 size={20} strokeWidth={1.5}/>,  label:"Summary" },
            { k:"comms",   icon:<Mail size={20} strokeWidth={1.5}/>,       label:"Comms" },
          ].map(({ k, icon, label }) => {
            const active = activeTab === k;
            return (
              <button key={k} onClick={() => { setActiveTab(k); setSidebarOpen(false); }}
                style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", background:"transparent", border:"none", cursor:"pointer", padding:"4px 0" }}>
                <span style={{ color: active ? P.accent : "rgba(255,255,255,0.4)", display:"flex", alignItems:"center" }}>{icon}</span>
                <span style={{ fontSize:"10px", fontWeight: active ? 700 : 500, color: active ? P.accent : "rgba(255,255,255,0.4)", fontFamily:font, letterSpacing:"0.04em" }}>{label}</span>
              </button>
            );
          })}
          <button onClick={() => setSidebarOpen(o => !o)}
            style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", background:"transparent", border:"none", cursor:"pointer", padding:"4px 0" }}>
            <span style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", color:"rgba(255,255,255,0.4)" }}>
              {[0,1,2].map(i => <span key={i} style={{ width:16, height:2, background:"rgba(255,255,255,0.4)", borderRadius:2, display:"block" }} />)}
            </span>
            <span style={{ fontSize:"10px", fontWeight:500, color:"rgba(255,255,255,0.4)", fontFamily:font, letterSpacing:"0.04em" }}>Menu</span>
          </button>
        </div>
      )}
    </div>
  );
}
