// ─────────────────────────────────────────────────────────────────────────────
// GroupGrid — optimised build
// Architecture: 100% browser-local React SPA. No server, no PII storage.
// ─────────────────────────────────────────────────────────────────────────────

// Storage shim: falls back to localStorage when window.storage (Claude artifact API) is unavailable
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) {
      const val = localStorage.getItem(key);
      return val !== null ? { key, value: val } : null;
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return { key, value };
    },
    async delete(key) {
      localStorage.removeItem(key);
      return { key, deleted: true };
    },
    async list(prefix) {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!prefix || k.startsWith(prefix)) keys.push(k);
      }
      return { keys };
    },
  };
}

import React, { useState, useCallback, useEffect, useRef, Fragment } from "react";
import * as XLSX from "xlsx";
import { Plane, Hotel, Car, Salad, LayoutGrid, BarChart2, Mail, Lock, Contact, Calendar, Star, Search, Upload, Send, AlertTriangle, AlertCircle, Circle, Copy, Check, X, ChevronDown, ChevronUp, Plus, ShieldCheck, Ban, FileSpreadsheet, Users, Download, ExternalLink } from "lucide-react";

const P = {
  navy:"#0F1F3D", navyLight:"#1A2E52", periwinkle:"#6B7FD4", periwinkleL:"#9BAAE8",
  periwinkleD:"#4C62C4", white:"#FFFFFF", offWhite:"#F0F2F7", grey50:"#EEF1F8",
  grey100:"#DDE2EF", grey200:"#B8C0D8", grey400:"#7E8BA8", grey600:"#4A5568",
  green:"#0D9E6E", greenLight:"#E3F7F0", amber:"#C97A0A", amberLight:"#FEF2DC",
  red:"#C0392B", redLight:"#FDECEC", purple:"#6B3FA0", purpleLight:"#EEE5F9",
  teal:"#0A7B7A", tealLight:"#DCF2F2",
  accent:"#00C9B1", accentLight:"#E0FAF7", accentD:"#00A896",
};
const font = "'DM Sans', sans-serif";

// ── Feature flags ─────────────────────────────────────────────────────────────
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
  const dateFields = new Set(["flightArrival","flightDeparture","checkIn","checkOut","pickupDate","dropoffDate"]);
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
function parseCarSheet(wb) {
  return parseSheet(wb, { name:["name","attendee","passenger","guest"], email:["email","e-mail","email address"], pickupDate:["pickup","pick up","transfer in","arrival transfer","car arrival"], dropoffDate:["dropoff","drop off","transfer out","departure transfer"], pickupLoc:["pickup location","pick up location","from","origin"], dropoffLoc:["dropoff location","drop off location","to","destination"], confirmation:["confirmation","conf","booking","transfer #","vendor"] });
}
function parseDietarySheet(wb) {
  return parseSheet(wb, { name:["name","attendee","guest","passenger"], email:["email","e-mail","email address"], dietary:["dietary","diet","food","restriction","allergy","allergies"], accessibility:["accessibility","access","mobility","accommodation","disability","special need"], specialNotes:["notes","special","request","other","additional"] });
}

function crossMatch(flights, hotels, cars, dietary, aw, existingMeta) {
  const { arrivalStart, arrivalEnd, departureStart, departureEnd } = aw || {};
  const mkMaps = (arr) => { const byE = new Map(), byN = new Map(); arr.forEach(x => { if (x.email) byE.set(x.email, x); const k = normName(x.name); if (k) byN.set(k, x); }); return [byE, byN]; };
  const [fByE, fByN] = mkMaps(flights), [hByE, hByN] = mkMaps(hotels), [cByE, cByN] = mkMaps(cars), [dByE, dByN] = mkMaps(dietary);
  const emailKeys = new Set([...flights,...hotels,...cars,...dietary].map(x => x.email).filter(Boolean));
  const nameKeys = new Set([...flights,...hotels,...cars,...dietary].map(x => normName(x.name)).filter(Boolean));
  const emailMatchedNames = new Set();
  emailKeys.forEach(ek => [fByE.get(ek),hByE.get(ek),cByE.get(ek),dByE.get(ek)].forEach(r => { if (r) emailMatchedNames.add(normName(r.name)); }));
  const dupNames = new Set();
  [flights,hotels,cars].forEach(list => { const seen = new Map(); list.forEach(x => { const k = normName(x.name); seen.set(k,(seen.get(k)||0)+1); }); seen.forEach((v,k) => { if (v>1) dupNames.add(k); }); });

  function build(flight, hotel, car, diet, key, matchedBy) {
    const displayName = flight?.name || hotel?.name || car?.name || diet?.name || key;
    const email = flight?.email || hotel?.email || car?.email || diet?.email || "";
    const metaKey = email || key;
    const existing = existingMeta?.[metaKey] || {};
    const issues = [];
    if (!flight) issues.push({ type:"missing", text:"Missing from flight manifest" });
    if (!hotel)  issues.push({ type:"missing", text:"Missing from hotel roster" });
    if (cars.length > 0 && !car) issues.push({ type:"missing", text:"Missing from car transfers" });
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
    const arrDate = flight?.flightArrival || hotel?.checkIn, depDate = flight?.flightDeparture || hotel?.checkOut;
    if (arrDate && isOutside(arrDate, arrivalStart, arrivalEnd)) {
      const windowStr = arrivalStart && arrivalEnd ? ` (event window: ${fmt(arrivalStart)} – ${fmt(arrivalEnd)})` : arrivalStart ? ` (not before ${fmt(arrivalStart)})` : arrivalEnd ? ` (not after ${fmt(arrivalEnd)})` : "";
      issues.push({ type:"window", text:`Arrival ${fmt(arrDate)} booked outside event dates${windowStr}` });
    }
    if (depDate && isOutside(depDate, departureStart, departureEnd)) {
      const windowStr = departureStart && departureEnd ? ` (event window: ${fmt(departureStart)} – ${fmt(departureEnd)})` : departureStart ? ` (not before ${fmt(departureStart)})` : departureEnd ? ` (not after ${fmt(departureEnd)})` : "";
      issues.push({ type:"window", text:`Departure ${fmt(depDate)} booked outside event dates${windowStr}` });
    }
    if (dupNames.has(normName(displayName))) issues.push({ type:"duplicate", text:"Duplicate name detected across lists" });
    const seen = new Set(); const uniqueIssues = issues.filter(x => { if (seen.has(x.text)) return false; seen.add(x.text); return true; });
    const resolved = existing.resolved || [];
    const active = uniqueIssues.filter(x => !resolved.includes(x.text));
    const status = active.length === 0 ? "ok" : active.length === 1 ? "warn" : "error";
    const { firstName, lastName } = splitName(displayName);
    const resolvedFirstName = flight?.firstName || hotel?.firstName || car?.firstName || diet?.firstName || firstName;
    const resolvedLastName  = flight?.lastName  || hotel?.lastName  || car?.lastName  || diet?.lastName  || lastName;
    return { key, displayName, firstName:resolvedFirstName, lastName:resolvedLastName, email, matchedBy, flight, hotel, car, diet, issues:uniqueIssues, status, details, note:existing.note||"", resolved };
  }

  const results = [];
  emailKeys.forEach(ek => results.push(build(fByE.get(ek)||null, hByE.get(ek)||null, cByE.get(ek)||null, dByE.get(ek)||null, ek, "email")));
  nameKeys.forEach(nk => { if (emailMatchedNames.has(nk)) return; results.push(build(fByN.get(nk)||null, hByN.get(nk)||null, cByN.get(nk)||null, dByN.get(nk)||null, nk, "name")); });
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
      <input type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
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
  const cfg = { missing:{bg:P.amberLight,color:P.amber,border:`1px solid ${P.amber}44`,icon:<Circle size={11} strokeWidth={2}/>}, mismatch:{bg:P.redLight,color:P.red,border:`1px solid ${P.red}44`,icon:<AlertTriangle size={11} strokeWidth={2}/>}, window:{bg:P.purpleLight,color:P.purple,border:`1px solid ${P.purple}44`,icon:<Calendar size={11} strokeWidth={1.5}/>}, duplicate:{bg:"#FFF3E0",color:"#E65100",border:"1px solid #E6510044",icon:<AlertCircle size={11} strokeWidth={2}/>} };
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
      <div style={{ background:P.white, borderRadius:"22px", width:"100%", maxWidth:"620px", maxHeight:"90vh", overflow:"auto", boxShadow:"0 20px 60px rgba(27,42,74,0.3)" }}>
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
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
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
          <div style={{ marginBottom:"24px" }}>
            <div style={{ fontSize:"14px", fontWeight:800, color:P.navy, marginBottom:"12px", fontFamily:font, display:"flex", alignItems:"center", gap:"8px" }}>
              <div style={{ width:3, height:16, background:P.grey400, borderRadius:"2px" }} />✍ Your Name (used in email signatures)
            </div>
            <input value={local.plannerName||""} onChange={e => setLocal(prev => ({...prev, plannerName:e.target.value}))} placeholder="e.g. Amanda G., Events Team"
              style={{ width:"100%", background:P.offWhite, border:`1.5px solid ${local.plannerName?P.grey400+"44":P.grey100}`, borderRadius:"10px", padding:"9px 12px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
          </div>
          <div style={{ display:"flex", gap:"10px", paddingTop:"8px", borderTop:`1px solid ${P.grey100}` }}>
            <Btn onClick={() => { onSave(local); onClose(); }} color={P.green}>Save Contacts</Btn>
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
        return `  Your arrival:          ${flightArrival || "—"}\n  Your departure:        ${flightDeparture || "—"}\n\n  Your travel dates appear to be booked outside the approved event dates. Could you confirm these dates are correct, or let us know if any changes are needed?`;
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
                  <button onClick={saveEdits} style={{ background:saved?P.greenLight:P.periwinkleD, color:saved?P.green:P.white, border:"none", borderRadius:"6px", padding:"3px 10px", fontSize:"12px", fontWeight:700, fontFamily:font, cursor:"pointer" }}>{saved?"✓ Saved":"Save"}</button>
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

┌─────────────────────────────────────────────────────────────────┐
    Here is what needs your attention:

    Your flight arrives into {{airport}} on {{flightArrival}}
         Flight: {{flightIn}}

    Your hotel check-in at {{hotel}} is {{checkIn}}

  Your flight lands the day before your hotel check-in date.
└─────────────────────────────────────────────────────────────────┘

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

┌─────────────────────────────────────────────────────────────────┐
    Here is what needs your attention:

    Your hotel check-out at {{hotel}} is {{checkOut}}

    Your flight departs {{airport}} on {{flightDeparture}}
         Flight: {{flightOut}}

  Your hotel checks out the day before your flight departs.
└─────────────────────────────────────────────────────────────────┘

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

┌─────────────────────────────────────────────────────────────────┐
    Here is what needs your attention:

    Your flight arrives into {{airport}} on {{flightArrival}}
         Flight: {{flightIn}}

    Hotel booking: Not currently on file

  We do not have a hotel booking on file for you for {{eventName}}.
└─────────────────────────────────────────────────────────────────┘

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

┌─────────────────────────────────────────────────────────────────┐
    Here is what needs your attention:

    Flight details: Not currently on file

    Your hotel: {{hotel}}
    Check-in date: {{checkIn}}
    Check-out date: {{checkOut}}

  We have your hotel confirmed but no flight information on file.
└─────────────────────────────────────────────────────────────────┘

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

┌─────────────────────────────────────────────────────────────────┐
    Here is what needs your attention:

    Your flight arrives into {{airport}} on {{flightArrival}}
         Flight: {{flightIn}}

    Transfer to hotel: Not currently on file
    Your hotel: {{hotel}}

  We do not have a transfer arranged for you from {{airport}} to {{hotel}}.
└─────────────────────────────────────────────────────────────────┘

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
    description: "Guest travel dates are booked outside the approved event dates",
    subject: "A quick note about your travel dates for {{eventName}}",
    body: `Hi {{guestName}},

We are so glad you will be joining us for {{eventName}} — we want to make sure every detail of your trip is perfectly arranged and that you have the most wonderful experience!

While reviewing travel details for all of our guests, we noticed something we wanted to bring to your attention right away:

┌─────────────────────────────────────────────────────────────────┐
    Here is what needs your attention:

    Your flight arrives into {{airport}} on {{flightArrival}}
    Your flight departs {{airport}} on {{flightDeparture}}

    {{eventName}} travel window: {{eventStart}} – {{eventEnd}}

  Your travel dates fall outside the standard event dates.
└─────────────────────────────────────────────────────────────────┘

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

┌─────────────────────────────────────────────────────────────────┐
    Arrival flight:     {{flightArrival}} into {{airport}}
                          Flight {{flightIn}}

    Hotel check-in:    {{checkIn}} at {{hotel}}
    Hotel check-out:   {{checkOut}}

    Departure flight:  {{flightDeparture}} from {{airport}}
                          Flight {{flightOut}}
└─────────────────────────────────────────────────────────────────┘

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
  if (issues.some(x => x.text?.includes("before check-in"))) applicable.push("arrives_early");
  if (issues.some(x => x.text?.includes("before check-out"))) applicable.push("departs_late");
  if (issues.some(x => x.text === "Missing from hotel roster")) applicable.push("missing_hotel");
  if (issues.some(x => x.text === "Missing from flight manifest")) applicable.push("missing_flight");
  if (issues.some(x => x.text === "Missing from car transfers")) applicable.push("missing_transfer");
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
            <Btn onClick={handleSave} color={P.periwinkleD}>✨ Save Template</Btn>
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
      // Default templates: use first applicable match
      const applicable = getApplicableTemplates(record);
      if (applicable.length > 0) {
        const templateId = applicable[0];
        const tmpl = templates[templateId];
        if (tmpl) q.push({ id: `${record.key}-${templateId}`, record, templateId, subject: fillTemplate(tmpl.subject, record, extra), body: fillTemplate(tmpl.body, record, extra), to: record.email, status: "pending" });
      }
      // Custom templates: add a separate queue item for each that matches
      Object.values(templates).filter(t => t.isCustom).forEach(tmpl => {
        if (getCustomApplicable(record, tmpl)) {
          q.push({ id: `${record.key}-${tmpl.id}`, record, templateId: tmpl.id, subject: fillTemplate(tmpl.subject, record, extra), body: fillTemplate(tmpl.body, record, extra), to: record.email, status: "pending" });
        }
      });
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
  const flaggedWithEmail = guestsWithEmail.filter(r =>
    getApplicableTemplates(r).length > 0 ||
    customTemplates.some(t => getCustomApplicable(r, t))
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
                <Btn onClick={saveEdit} color={P.green}>Save Template</Btn>
                <Btn onClick={() => { setTemplates(prev => ({...prev, [editingTemplate]: DEFAULT_TEMPLATES[editingTemplate]})); setEditSubject(DEFAULT_TEMPLATES[editingTemplate].subject); setEditBody(DEFAULT_TEMPLATES[editingTemplate].body); }} outline color={P.grey400}>↺ Reset to Default</Btn>
                <Btn onClick={() => setEditingTemplate(null)} outline>Cancel</Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-nav */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"20px" }}>
        <div style={{ display:"flex", gap:"6px" }}>
          {[{k:"templates",l:"Templates"},{k:"queue",l:`Send Queue${queue?` (${pendingCount} pending)`:""}`}].map(({k,l}) => (
            <button key={k} onClick={() => setActiveView(k)} style={{ background:activeView===k?P.navy:P.white, color:activeView===k?P.white:P.grey600, border:`1px solid ${activeView===k?P.navy:P.grey100}`, borderRadius:"7px", padding:"6px 14px", fontSize:"14px", fontWeight:500, fontFamily:font, cursor:"pointer" }}>{l}</button>
          ))}
        </div>
        {activeView === "templates" && (
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <Btn onClick={() => setNewTemplateOpen(true)} outline color={P.periwinkleD} small>✨ New Template</Btn>
            {flaggedWithEmail.length > 0
              ? <Btn onClick={buildQueue} color={P.periwinkleD}>Build Send Queue ({flaggedWithEmail.length} guests) →</Btn>
              : <span style={{ fontSize:"14px", color:P.navyLight }}>Run a cross-check first to build the send queue</span>}
          </div>
        )}
        {activeView === "queue" && queue && (
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            {sendMsg && <span style={{ fontSize:"14px", color:P.green, fontWeight:700 }}>{sendMsg}</span>}
            <div style={{ fontSize:"14px", color:P.navyLight }}>{sentCount} sent · {skippedCount} skipped · {pendingCount} pending</div>
            {pendingCount > 0 && <>
            <Btn onClick={sendAll} color={P.green}>📤 Open All ({pendingCount}) in Mail App</Btn>
            <Btn onClick={() => {
              const text = (queue||[]).filter(x=>x.status==="pending").map(item =>
                `TO: ${item.to}\nSUBJECT: ${item.subject}\n\n${item.body}\n\n${"─".repeat(60)}`
              ).join("\n\n");
              navigator.clipboard?.writeText(text).then(() => {});
              const blob = new Blob([text], {type:"text/plain"});
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
              a.download = `groupgrid-email-queue-${new Date().toISOString().slice(0,10)}.txt`; a.click();
            }} outline color={P.periwinkleD}>⬇ Download All as .txt</Btn>
          </>}
          </div>
        )}
      </div>

      {/* TEMPLATES VIEW */}
      {activeView === "templates" && (
        <>
          {/* Send mode selector */}
          <div style={{ background:P.white, borderRadius:"10px", padding:"16px 20px", border:`1px solid ${P.grey100}`, marginBottom:"20px", display:"flex", alignItems:"center", gap:"20px" }}>
            <div>
              <div style={{ fontSize:"15px", fontWeight:600, color:P.navy }}>Send Mode</div>
              <div style={{ fontSize:"15px", color:P.navyLight, marginTop:"2px" }}>Controls how emails are handled when the queue is built</div>
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
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, color, fontFamily:font }}>{val}</div>
                <div style={{ fontSize:"14px", fontWeight:700, color:P.navy, marginTop:"3px" }}>{label}</div>
                <div style={{ fontSize:"15px", color:P.navyLight, marginTop:"2px" }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Templates grid */}
          <div style={{ fontSize:"14px", fontWeight:800, color:P.navy, marginBottom:"12px" }}>Email Templates</div>
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
                        <div style={{ fontSize:"15px", fontWeight:800, color:P.navy }}>{tmpl.label}</div>
                        <div style={{ fontSize:"15px", color:P.navyLight, marginTop:"2px" }}>{tmpl.description}</div>
                      </div>
                    </div>
                    {isCustomized && <span style={{ background:P.periwinkle+"22", color:P.periwinkleD, fontSize:"14px", fontWeight:800, padding:"2px 8px", borderRadius:"20px", flexShrink:0, marginLeft:"8px" }}>Edited</span>}
                    {tmpl.isCustom && <span style={{ background:P.periwinkleD+"18", color:P.periwinkleD, fontSize:"14px", fontWeight:800, padding:"2px 8px", borderRadius:"20px", flexShrink:0, marginLeft:"4px" }}>✨ Custom</span>}
                  </div>
                  <div style={{ background:P.offWhite, borderRadius:"8px", padding:"10px 12px", marginBottom:"12px" }}>
                    <div style={{ fontSize:"15px", fontWeight:700, color:P.navy, marginBottom:"3px" }}>Subject preview</div>
                    <div style={{ fontSize:"14px", color:P.navy, fontWeight:600 }}>{tmpl.subject.replace(/\{\{[^}]+\}\}/g, "…")}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                      {applicable.length > 0
                        ? <span style={{ background:tmpl.color+"18", color:tmpl.color, fontSize:"15px", fontWeight:700, padding:"3px 10px", borderRadius:"20px" }}>Applies to {applicable.length} guest{applicable.length!==1?"s":""}</span>
                        : <span style={{ background:P.grey50, color:P.navyLight, fontSize:"15px", fontWeight:600, padding:"3px 10px", borderRadius:"20px" }}>No guests currently</span>}
                    </div>
                    <div style={{ display:"flex", gap:"6px" }}>
                      {tmpl.isCustom && (
                        <Btn onClick={() => { if (window.confirm(`Delete "${tmpl.label}"?`)) deleteTemplate(tmpl.id); }} outline small color={P.red}>🗑 Delete</Btn>
                      )}
                      <Btn onClick={() => startEdit(tmpl.id)} outline small color={P.periwinkleD}>✏ Edit</Btn>
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
        <div style={{ padding:"40px", fontFamily:"'DM Sans',sans-serif", maxWidth:"600px", margin:"40px auto" }}>
          <div style={{ background:"#FDEAEA", border:"1.5px solid #C53B3B44", borderRadius:"16px", padding:"24px" }}>
            <div style={{ fontSize:"16px", fontWeight:900, color:"#C53B3B", marginBottom:"8px" }}><AlertTriangle size={16} style={{display:"inline",marginRight:6,verticalAlign:"middle"}}/>Something went wrong</div>
            <div style={{ fontSize:"15px", color:"#1B2A4A", fontWeight:600, marginBottom:"12px" }}>Error details (copy these to report the issue):</div>
            <pre style={{ background:"white", borderRadius:"10px", padding:"12px", fontSize:"15px", color:"#C53B3B", overflowX:"auto", whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
              {this.state.error?.message}{"\n\n"}{this.state.error?.stack}
            </pre>
            <button onClick={() => this.setState({error:null})} style={{ marginTop:"14px", background:"#1B2A4A", color:"white", border:"none", borderRadius:"10px", padding:"8px 20px", fontSize:"14px", fontWeight:800, fontFamily:"'DM Sans',sans-serif", cursor:"pointer" }}>Try Again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Login Panel (slide-in drawer) ────────────────────────────────────────────
function LoginPanel({ onLogin, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState("");

  // ── Auth stub — replace body with Supabase when ready ───────────────────────
  // TODO: wire up real auth here
  // const { data, error } = await authClient.signIn({ email, password })
  function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError("Please enter your email and password."); return; }
    setError(""); setLoading(true);
    setTimeout(() => { setLoading(false); onLogin({ email, name: email.split("@")[0] }); }, 900);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", fontFamily:font }}>
      <style>{`
        @keyframes pulse-dot {
          from { opacity: 0.2; transform: scale(1); }
          to   { opacity: 0.7; transform: scale(1.6); }
        }
      `}</style>

      {/* Header */}
      <div style={{ padding:"24px 28px 20px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center" }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 52" width="96" height="24" style={{display:"block"}}>
              <defs>
                <linearGradient id="ggIconBg" x1="0%" y1="0%" x2="100%" y2="100%">
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
              <text x="62" y="36" fontFamily="'DM Sans', sans-serif" fontSize="26" fontWeight="700" letterSpacing="-0.5" fill="white">Group</text>
              <text x="144" y="36" fontFamily="'DM Sans', sans-serif" fontSize="26" fontWeight="300" letterSpacing="-0.5" fill="#00C9B1">Grid</text>
            </svg>
        </div>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"10px", width:32, height:32, cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15} strokeWidth={2}/></button>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:"auto", padding:"32px 28px" }}>
        <div style={{ marginBottom:"32px" }}>
          <div style={{ fontSize:"22px", fontWeight:900, color:P.white, marginBottom:"6px" }}>Welcome back</div>
          <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.45)", fontWeight:500, lineHeight:1.5 }}>Sign in to save projects, sync preferences, and access your event history.</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
          <div>
            <label style={{ display:"block", fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.45)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"7px" }}>Email Address</label>
            <input type="email" value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
              onFocus={() => setFocused("email")} onBlur={() => setFocused("")}
              placeholder="you@company.com"
              style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:`1.5px solid ${focused==="email" ? P.periwinkle : "rgba(255,255,255,0.12)"}`, borderRadius:"12px", padding:"12px 14px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.white, outline:"none", boxSizing:"border-box", transition:"border-color 0.2s", caretColor:P.periwinkleL }} />
          </div>

          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"7px" }}>
              <label style={{ fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.45)", textTransform:"uppercase", letterSpacing:"0.07em" }}>Password</label>
              <span style={{ fontSize:"15px", color:P.periwinkleL, fontWeight:700, cursor:"pointer" }}>Forgot password?</span>
            </div>
            <div style={{ position:"relative" }}>
              <input type={showPw ? "text" : "password"} value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onFocus={() => setFocused("password")} onBlur={() => setFocused("")}
                placeholder="••••••••"
                style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:`1.5px solid ${focused==="password" ? P.periwinkle : "rgba(255,255,255,0.12)"}`, borderRadius:"12px", padding:"12px 42px 12px 14px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.white, outline:"none", boxSizing:"border-box", transition:"border-color 0.2s", caretColor:P.periwinkleL }} />
              <button type="button" onClick={() => setShowPw(s => !s)} style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", color:"rgba(255,255,255,0.3)", cursor:"pointer", fontSize:"15px", padding:0, lineHeight:1 }}>
                {showPw ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background:"rgba(197,59,59,0.15)", border:"1px solid rgba(197,59,59,0.35)", borderRadius:"10px", padding:"10px 14px", fontSize:"14px", color:"#F08080", fontWeight:700 }}>
              ⚠ {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ width:"100%", background:loading?"rgba(91,109,184,0.5)":`linear-gradient(135deg, ${P.periwinkleD}, ${P.periwinkle})`, border:"none", borderRadius:"8px", padding:"12px", fontSize:"15px", fontWeight:500, fontFamily:font, color:P.white, cursor:loading?"wait":"pointer", marginTop:"4px", boxShadow:loading?"none":"0 2px 12px rgba(69,87,176,0.28)", transition:"all 0.2s" }}>
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        <div style={{ marginTop:"28px", paddingTop:"24px", borderTop:"1px solid rgba(255,255,255,0.07)", textAlign:"center" }}>
          <span style={{ fontSize:"14px", color:"rgba(255,255,255,0.3)" }}>Don't have an account? </span>
          <span style={{ fontSize:"14px", color:P.periwinkleL, fontWeight:700, cursor:"pointer" }}>Request access →</span>
        </div>

        {/* What you get when signed in */}
        <div style={{ marginTop:"32px" }}>
          <div style={{ fontSize:"15px", fontWeight:800, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"14px" }}>When signed in you get</div>
          {[
            { icon:<FileSpreadsheet size={14} strokeWidth={1.5}/>, label:"Save & restore projects across sessions" },
            { icon:<Mail size={14} strokeWidth={1.5}/>, label:"Custom email templates saved to your account" },
            { icon:<Contact size={14} strokeWidth={1.5}/>, label:"Contacts & planner preferences synced" },
            { icon:<BarChart2 size={14} strokeWidth={1.5}/>, label:"Event history and past cross-checks" },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px" }}>
              <div style={{ width:30, height:30, borderRadius:"9px", background:"rgba(123,143,212,0.15)", border:"1px solid rgba(123,143,212,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", flexShrink:0 }}>{icon}</div>
              <span style={{ fontSize:"14px", color:"rgba(255,255,255,0.5)", fontWeight:600, lineHeight:1.4 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding:"16px 28px", borderTop:"1px solid rgba(255,255,255,0.07)", flexShrink:0 }}>
        <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.18)", textAlign:"center" }}>© 2026 GroupGrid · Built for event professionals</div>
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
        Questions about these Terms? Email us at <a href="mailto:legal@groupgrid.io" style={{ color:P.periwinkleD, fontWeight:600 }}>legal@groupgrid.io</a>.
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
          GroupGrid was born out of 15 years of managing complex guest logistics — and the very real panic of discovering a mismatch the night before an event.
        </p>
      </div>

      <div style={{ maxWidth:"820px", margin:"0 auto", padding:"56px 28px 80px" }}>

        {/* Founder story */}
        <div style={{ background:P.white, borderRadius:"20px", border:`1.5px solid ${P.grey100}`, padding:"36px 40px", marginBottom:"32px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, width:"4px", height:"100%", background:`linear-gradient(180deg, ${P.accent}, ${P.periwinkleD})` }} />
          <div style={{ fontSize:"13px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"16px" }}>The Story Behind GroupGrid</div>
          <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.85, margin:"0 0 20px" }}>
            After 15 years managing events across some of the most demanding programs in the industry — from intimate executive roundtables to tradeshows with thousands of attendees — one problem never went away: <strong style={{ color:P.navy }}>cross-referencing guest travel data is a nightmare.</strong>
          </p>
          <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.85, margin:"0 0 20px" }}>
            Flight manifest says John Smith arrives Tuesday. Hotel roster has him checking in Wednesday. Car transfer has him down for the wrong airport. Three spreadsheets, three sources of truth, and you're doing VLOOKUPs at midnight the day before your event trying to find the gaps before they become disasters.
          </p>
          <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.85, margin:0 }}>
            GroupGrid exists to eliminate that scramble. Upload your files, run the check, and know in seconds exactly which guests have mismatches, missing records, or logistics that don't add up — with enough time to actually fix them.
          </p>
        </div>

        {/* Credentials strip */}
        <div style={{ background:P.navy, borderRadius:"16px", padding:"28px 32px", marginBottom:"32px" }}>
          <div style={{ fontSize:"13px", fontWeight:800, color:"rgba(255,255,255,0.5)", fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"20px" }}>Deep Industry Roots</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
            {[
              { stat:"15+", label:"Years in corporate event management" },
              { stat:"100+", label:"Global programs managed annually" },
              { stat:"$10M+", label:"Budget management experience" },
              { stat:"3", label:"Regions: NAMER, EMEA & APAC" },
            ].map(({ stat, label }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:"16px" }}>
                <div style={{ fontSize:"28px", fontWeight:900, color:P.accent, fontFamily:font, lineHeight:1, flexShrink:0, minWidth:"60px" }}>{stat}</div>
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
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"10px" }}>
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
              { n:"2", title:"Run the cross-check", body:"GroupGrid matches every guest across all files by name and email, identifying mismatches, missing records, date gaps, and duplicates in seconds." },
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
            Guest names, emails, flight details, hotel records — all processed locally on your device. GroupGrid has no servers that touch your data. Nothing is stored, synced, or transmitted. GDPR-friendly by design, not by policy.
          </div>
        </div>

        {/* Community */}
        <div style={{ background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"14px", padding:"24px 28px", textAlign:"center" }}>
          <div style={{ fontSize:"15px", fontWeight:800, color:P.navy, fontFamily:font, marginBottom:"8px" }}>Part of the events community</div>
          <div style={{ fontSize:"15px", color:P.grey400, fontFamily:font, lineHeight:1.7, marginBottom:"16px" }}>
            GroupGrid is built in partnership with the event industry's leading professional communities. We're actively involved with CEMA and PCMA — reach out to connect.
          </div>
          <a href="mailto:hello@groupgrid.io" style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:P.navy, borderRadius:"10px", padding:"10px 22px", fontSize:"14px", fontWeight:700, color:P.white, fontFamily:font, textDecoration:"none" }}>
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
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"36px" }}>
        {[
          { icon:"✉", label:"General Inquiries", value:"hello@groupgrid.io", href:"mailto:hello@groupgrid.io", color:P.periwinkleD, bg:P.grey50 },
          { icon:"🐛", label:"Bug Reports", value:"bugs@groupgrid.io", href:"mailto:bugs@groupgrid.io", color:P.red, bg:"#FFF5F5" },
          { icon:"💡", label:"Feature Requests", value:"ideas@groupgrid.io", href:"mailto:ideas@groupgrid.io", color:P.teal, bg:P.accentLight },
          { icon:"🤝", label:"Partnerships", value:"partners@groupgrid.io", href:"mailto:partners@groupgrid.io", color:P.amber, bg:P.amberLight },
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
      <Section title="Based in">
        GroupGrid is built by an event industry veteran with 15 years of experience managing corporate programs across NAMER, EMEA, and APAC. Active leader in CEMA and PCMA.
      </Section>
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
        The current version of GroupGrid uses no third-party services that receive your data. External fonts (DM Sans via Google Fonts) are loaded from Google's CDN, which is subject to Google's standard font API privacy policy.
      </Section>
      <Section title="Changes to this policy">
        We will notify users of any material changes to this policy via in-app notification and email (once accounts are available). Continued use after notification constitutes acceptance of the updated policy.
      </Section>
      <Section title="Contact">
        Questions about privacy? Email us at <a href="mailto:privacy@groupgrid.io" style={{ color:P.periwinkleD, fontWeight:600 }}>privacy@groupgrid.io</a>.
      </Section>
    </PageShell>
  );
}

// ── Landing Page ──────────────────────────────────────────────────────────────
function LandingPage({ onEnter, onPricing, onAbout, onContact, onPrivacy, onTerms }) {

  const problems = [
    { time:"Day 1", label:"You get the hotel roster", sub:"300 guests, check-in dates, room types", color:P.periwinkleD, bg:"#EEF1FF" },
    { time:"Day 3", label:"Flight manifest arrives", sub:"280 names — different format, different spelling", color:P.amber, bg:P.amberLight },
    { time:"Day 7", label:"Car transfers added", sub:"150 pickups, some airports don't match flights", color:P.purple, bg:P.purpleLight },
    { time:"Day 14", label:"You're still cross-checking", sub:"VLOOKUPs, filters, manual row-by-row scanning…", color:P.red, bg:P.redLight },
  ];

  const eventTypes = [
    "Sales Kickoffs","Board Retreats","Tradeshows","Healthcare Meetings",
    "Conferences","Advisory Boards","Executive Roundtables","Field Marketing",
    "Corporate Events","Association Meetings","Event Agencies","Global Programs",
  ];

  const steps = [
    { n:"01", icon:"📁", title:"Upload your files", body:"Drop in your flight manifest, hotel roster, car transfers, and dietary spreadsheets. Excel files (.xlsx or .xls), any column names — GroupGrid figures it out." },
    { n:"02", icon:"⚡", title:"Run the cross-check", body:"In seconds, every guest is matched across all sources. Mismatches, missing records, date gaps, wrong airports, duplicates — all surfaced instantly." },
    { n:"03", icon:"🎯", title:"See exactly what needs fixing", body:"Each flag shows you who's affected, what's wrong, and how far off the dates are. Resolve issues, add notes, mark them done." },
    { n:"04", icon:"📤", title:"Communicate & export", body:"Draft emails to your hotel or travel agency, download a clean Excel report, or generate a shareable HTML report — all without leaving GroupGrid." },
  ];

  const testimonials = [
    { quote:"I used to spend two full days before every SKO cross-checking arrivals. Now it takes 20 minutes.", role:"Senior Field Marketing Manager", event:"500-person Sales Kickoff" },
    { quote:"Found three guests with no hotel room the week before our board retreat. GroupGrid flagged them immediately.", role:"Executive Events Coordinator", event:"Board Retreat, 45 Executives" },
    { quote:"We manage 30+ events a year. This has changed how our entire agency operates.", role:"Director of Events", event:"Event Agency, 30+ programs/yr" },
  ];

  return (
    <div style={{ minHeight:"100vh", fontFamily:font, background:P.white, WebkitFontSmoothing:"antialiased" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ── Nav ── */}
      <nav className="gg-landing-nav" style={{ background:P.navy, height:"64px", padding:"0 40px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 0 rgba(255,255,255,0.06)" }}>
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
            <text x="62" y="36" fontFamily="'DM Sans', sans-serif" fontSize="26" fontWeight="700" letterSpacing="-0.5" fill="white">Group</text>
            <text x="144" y="36" fontFamily="'DM Sans', sans-serif" fontSize="26" fontWeight="300" letterSpacing="-0.5" fill="#00C9B1">Grid</text>
          </svg>
        </div>
        <div className="gg-landing-nav-links" style={{ display:"flex", alignItems:"center", gap:"28px" }}>
          <button onClick={onAbout} style={{ background:"none", border:"none", fontSize:"14px", fontWeight:600, color:"rgba(255,255,255,0.6)", fontFamily:font, cursor:"pointer" }}>About</button>
          <button onClick={onPricing} style={{ background:"none", border:"none", fontSize:"14px", fontWeight:600, color:"rgba(255,255,255,0.6)", fontFamily:font, cursor:"pointer" }}>Pricing</button>
          <button className="gg-nav-cta" onClick={onEnter} style={{ background:P.accent, border:"none", borderRadius:"8px", padding:"8px 20px", fontSize:"14px", fontWeight:700, color:P.white, fontFamily:font, cursor:"pointer", boxShadow:"0 2px 12px rgba(0,201,177,0.35)" }}>Open App →</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="gg-hero" style={{ background:`linear-gradient(170deg, ${P.navy} 0%, #0D1E40 60%, #0A1628 100%)`, padding:"96px 40px 80px", position:"relative", overflow:"hidden" }}>
        {/* bg glow orbs */}
        <div style={{ position:"absolute", top:-100, right:-100, width:500, height:500, borderRadius:"50%", background:`radial-gradient(circle, ${P.accent}12, transparent 65%)`, pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-80, left:-60, width:400, height:400, borderRadius:"50%", background:`radial-gradient(circle, ${P.periwinkleD}15, transparent 65%)`, pointerEvents:"none" }} />
        {/* dot grid — all teal dots, fading to grey toward upper-right */}
        <svg className="gg-hero-dot-svg" style={{ position:"absolute", bottom:"40px", right:"0", pointerEvents:"none", width:"65%", height:"100%", minWidth:"500px" }} viewBox="0 0 1000 600" preserveAspectRatio="xMaxYMax meet" xmlns="http://www.w3.org/2000/svg">
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

        <div className="gg-hero-flex" style={{ maxWidth:"1100px", margin:"0 auto", display:"flex", alignItems:"flex-start", gap:"64px", flexWrap:"wrap" }}>
          {/* Left copy */}
          <div className="gg-hero-left" style={{ flex:1, minWidth:"320px" }}>

            <div style={{ margin:"0 0 24px" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                {[
                  { label:"Flight booked",   status:"check" },
                  { label:"Hotel confirmed", status:"check" },
                  { label:"Car transfer",    status:"check" },
                  { label:"Dates align",     status:"error" },
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
            <p style={{ fontSize:"16px", fontWeight:700, color:"rgba(255,255,255,0.4)", fontFamily:font, lineHeight:1.4, margin:"0 0 16px", maxWidth:"480px", letterSpacing:"-0.01em", textTransform:"uppercase", letterSpacing:"0.06em" }}>
              Everything looked fine — until it wasn't.
            </p>
            <p style={{ fontSize:"18px", color:"rgba(255,255,255,0.6)", fontFamily:font, lineHeight:1.75, margin:"0 0 12px", maxWidth:"520px" }}>
              You're managing a large team event. Hundreds of people arriving and leaving on different days — flights, hotels, car transfers, dietary needs. You need to make sure every single person has somewhere to stay, a ride waiting, and no surprises when they land.
            </p>
            <p style={{ fontSize:"18px", color:"rgba(255,255,255,0.85)", fontFamily:font, lineHeight:1.75, margin:"0 0 36px", maxWidth:"520px", fontWeight:600 }}>
              Right now, that means days — sometimes weeks — of cross-checking spreadsheets over and over again. GroupGrid turns that into <span style={{ color:P.accent }}>a few minutes.</span>
            </p>
            <div style={{ display:"flex", gap:"12px", flexWrap:"wrap", alignItems:"center" }}>
              <button onClick={onEnter} style={{ background:`linear-gradient(135deg, ${P.accent}, ${P.accentD})`, border:"none", borderRadius:"12px", padding:"14px 32px", fontSize:"16px", fontWeight:800, color:P.white, fontFamily:font, cursor:"pointer", boxShadow:"0 4px 20px rgba(0,201,177,0.4)", letterSpacing:"-0.02em" }}>
                Try GroupGrid free →
              </button>
              <button onClick={onPricing} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"12px", padding:"14px 24px", fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.75)", fontFamily:font, cursor:"pointer" }}>
                See pricing
              </button>
            </div>
            <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.3)", fontFamily:font, marginTop:"14px" }}>Process 10,000+ guest records · No upload to any server · All processing happens in your browser</p>
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
              <div style={{ fontSize:"11px", fontWeight:700, color:"rgba(255,255,255,0.35)", fontFamily:font, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"10px" }}>3 issues detected · 247 guests total</div>
              {[
                { name:"Sarah Sol", issue:"Hotel check-in Dec 4 · Flight arrives Dec 5", type:"error", badge:"Date Gap" },
                { name:"Marcus Williams", issue:"Car transfer booked — no hotel record found", type:"error", badge:"Missing" },
                { name:"Jennifer Park", issue:"Departs Dec 7 · Hotel checkout Dec 9", type:"warn", badge:"Early Out" },
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
                <span style={{ fontSize:"12px", color:"rgba(255,255,255,0.6)", fontFamily:font }}>244 guests fully aligned · <span style={{ color:P.accent, fontWeight:700 }}>✓ No action needed</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Problem section ── */}
      <div className="gg-section" style={{ background:"#FAFBFD", padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
        <div style={{ maxWidth:"1000px", margin:"0 auto" }}>
          <div className="gg-section-center" style={{ textAlign:"center", marginBottom:"56px" }}>
            <div style={{ fontSize:"12px", fontWeight:800, color:P.periwinkleD, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>SOUND FAMILIAR?</div>
            <h2 style={{ fontSize:"38px", fontWeight:900, color:P.navy, fontFamily:font, margin:"0 0 16px", letterSpacing:"-0.03em", lineHeight:1.15 }}>
              The spreadsheet death spiral<br/>before every big event
            </h2>
            <p style={{ fontSize:"17px", color:P.grey400, fontFamily:font, lineHeight:1.7, maxWidth:"560px", margin:"0 auto" }}>
              You have hundreds of people arriving on different days. You need them all to have a room, a ride, and a confirmed itinerary. Here's what that process looks like right now.
            </p>
          </div>
          <div className="gg-problem-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"16px", marginBottom:"40px" }}>
            {problems.map(({ time, label, sub, color, bg }, i) => (
              <div key={time} style={{ background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"16px", padding:"24px", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:"3px", background:color }} />
                <div style={{ fontSize:"11px", fontWeight:800, color, fontFamily:font, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"10px" }}>{time}</div>
                <div style={{ fontSize:"15px", fontWeight:700, color:P.navy, fontFamily:font, marginBottom:"6px", lineHeight:1.4 }}>{label}</div>
                <div style={{ fontSize:"13px", color:P.grey400, fontFamily:font, lineHeight:1.6 }}>{sub}</div>
                {i < 3 && <div className="gg-problem-arrow" style={{ position:"absolute", top:"50%", right:"-12px", transform:"translateY(-50%)", fontSize:"16px", color:P.grey200, zIndex:2 }}>→</div>}
              </div>
            ))}
          </div>
          <div style={{ background:P.redLight, border:`1.5px solid ${P.red}22`, borderRadius:"14px", padding:"20px 28px", display:"flex", alignItems:"center", gap:"16px" }}>
            <span style={{ fontSize:"28px", flexShrink:0 }}>😩</span>
            <div>
              <div style={{ fontSize:"15px", fontWeight:800, color:P.red, fontFamily:font, marginBottom:"4px" }}>Meanwhile, your event is in 3 days</div>
              <div style={{ fontSize:"14px", color:P.grey600, fontFamily:font, lineHeight:1.6 }}>You've gone through the roster 6 times. You think it's right. But that one guest who booked late, the name that's spelled two different ways across your files, the car transfer that was added last minute — those are the ones that show up as surprises at check-in.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Solution ── */}
      <div className="gg-section" style={{ background:P.white, padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
        <div style={{ maxWidth:"1000px", margin:"0 auto" }}>
          <div className="gg-section-center" style={{ textAlign:"center", marginBottom:"56px" }}>
            <div style={{ fontSize:"12px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>THE GROUPGRID WAY</div>
            <h2 style={{ fontSize:"38px", fontWeight:900, color:P.navy, fontFamily:font, margin:"0 0 16px", letterSpacing:"-0.03em", lineHeight:1.15 }}>
              Days of work.<br/><span style={{ color:P.accent }}>Done in minutes.</span>
            </h2>
            <p style={{ fontSize:"17px", color:P.grey400, fontFamily:font, lineHeight:1.7, maxWidth:"520px", margin:"0 auto" }}>
              Upload your spreadsheets, run the check, see every problem instantly — then communicate fixes directly to your hotel and travel agency without switching tabs.
            </p>
          </div>
          <div className="gg-steps-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>
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

      {/* ── Use cases ── */}
      <div className="gg-section" style={{ background:"#FAFBFD", padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
        <div style={{ maxWidth:"1000px", margin:"0 auto", textAlign:"center" }}>
          <div style={{ fontSize:"12px", fontWeight:800, color:P.navy, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>WHO IT'S FOR</div>
          <h2 style={{ fontSize:"36px", fontWeight:900, color:P.navy, fontFamily:font, margin:"0 0 12px", letterSpacing:"-0.03em" }}>
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
              <div style={{ fontSize:"16px", fontWeight:800, color:P.white, fontFamily:font, marginBottom:"6px" }}>Your guest data never leaves your browser</div>
              <div style={{ fontSize:"14px", color:"rgba(255,255,255,0.5)", fontFamily:font, lineHeight:1.65 }}>All processing happens locally on your device. GroupGrid has no servers that touch your data. No PII uploaded. No cloud storage. GDPR-friendly by design — not by policy.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Testimonials ── */}
      <div className="gg-section" style={{ background:P.white, padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
        <div style={{ maxWidth:"1000px", margin:"0 auto" }}>
          <div className="gg-section-center" style={{ textAlign:"center", marginBottom:"48px" }}>
            <div style={{ fontSize:"12px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>FROM THE COMMUNITY</div>
            <h2 style={{ fontSize:"32px", fontWeight:900, color:P.navy, fontFamily:font, margin:0, letterSpacing:"-0.03em" }}>
              Built from real industry experience
            </h2>
          </div>
          <div className="gg-testimonials-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"20px" }}>
            {testimonials.map(({ quote, role, event }) => (
              <div key={role} style={{ background:"#FAFBFD", border:`1.5px solid ${P.grey100}`, borderRadius:"16px", padding:"28px" }}>
                <div style={{ fontSize:"32px", color:P.accent, fontFamily:"Georgia, serif", lineHeight:1, marginBottom:"12px" }}>"</div>
                <p style={{ fontSize:"15px", color:P.grey600, fontFamily:font, lineHeight:1.75, margin:"0 0 20px", fontStyle:"italic" }}>{quote}</p>
                <div style={{ borderTop:`1px solid ${P.grey100}`, paddingTop:"14px" }}>
                  <div style={{ fontSize:"13px", fontWeight:700, color:P.navy, fontFamily:font }}>{role}</div>
                  <div style={{ fontSize:"12px", color:P.grey400, fontFamily:font, marginTop:"2px" }}>{event}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Animated Demo ── */}
      {(() => {
        const [demoPhase, setDemoPhase] = React.useState("idle"); // idle | loading | checking | results
        const [filesLoaded, setFilesLoaded] = React.useState([false,false,false,false]);
        const [checkPct, setCheckPct]   = React.useState(0);
        const [rowsVisible, setRowsVisible] = React.useState(0);
        const [expandedRow, setExpandedRow] = React.useState(null);

        const demoGuests = [
          { key:"sc",  first:"Sarah",   last:"Sol",      email:"s.sol@corp.com",    status:"error", arrDiff:"+1d", depDiff:"0",   issues:["Hotel check-in 1 day after flight arrives"],
            flight:{ arr:"Dec 4", dep:"Dec 7", num:"UA 2281" }, hotel:{ in:"Dec 5", out:"Dec 7", name:"Marriott Marquis" }, car:{ pickup:"Dec 4", loc:"SFO" } },
          { key:"mw",  first:"Marcus",  last:"Williams",  email:"m.williams@corp.com", status:"error", arrDiff:"—",   depDiff:"—",   issues:["No hotel record found"],
            flight:{ arr:"Dec 5", dep:"Dec 8", num:"DL 441" },  hotel:null,                                            car:{ pickup:"Dec 5", loc:"LAX" } },
          { key:"jp",  first:"Jennifer",last:"Park",      email:"j.park@corp.com",     status:"ok",    arrDiff:"0",   depDiff:"0",   issues:[],
            flight:{ arr:"Dec 5", dep:"Dec 8", num:"AA 109" },  hotel:{ in:"Dec 5", out:"Dec 8", name:"Hilton Union Sq" }, car:{ pickup:"Dec 5", loc:"SFO" } },
          { key:"dt",  first:"David",   last:"Torres",    email:"d.torres@corp.com",   status:"warn",  arrDiff:"0",   depDiff:"+2d", issues:["Departs Dec 7 · hotel checks out Dec 9"],
            flight:{ arr:"Dec 5", dep:"Dec 7", num:"SW 884" },  hotel:{ in:"Dec 5", out:"Dec 9", name:"Marriott Marquis" }, car:null },
          { key:"ps",  first:"Priya",   last:"Sharma",    email:"p.sharma@corp.com",   status:"ok",    arrDiff:"0",   depDiff:"0",   issues:[],
            flight:{ arr:"Dec 4", dep:"Dec 7", num:"UA 332" },  hotel:{ in:"Dec 4", out:"Dec 7", name:"Hilton Union Sq" }, car:{ pickup:"Dec 4", loc:"SFO" } },
          { key:"jm",  first:"James",   last:"Mitchell",  email:"j.mitchell@corp.com", status:"error", arrDiff:"-1d", depDiff:"0",   issues:["Hotel check-in before flight — date mismatch"],
            flight:{ arr:"Dec 5", dep:"Dec 8", num:"AA 771" },  hotel:{ in:"Dec 4", out:"Dec 8", name:"Grand Hyatt" }, car:{ pickup:"Dec 5", loc:"OAK" } },
        ];

        const statusColor = s => s==="error" ? P.red : s==="warn" ? P.amber : P.green;
        const statusBg    = s => s==="error" ? "#FDECEC" : s==="warn" ? "#FEF8EC" : "#F0FDF7";
        const statusLabel = s => s==="error" ? "⚑ Flag" : s==="warn" ? "⚠ Review" : "✓ OK";

        const fileInfo = [
          { label:"Flight Manifest", color:"#4F8EF7", icon:"✈️", sub:"flight_manifest_dec.xlsx" },
          { label:"Hotel Roster",    color:"#F5A623", icon:"🏨", sub:"hotel_roster_marriott.xlsx" },
          { label:"Car Transfers",   color:"#9B59B6", icon:"🚗", sub:"car_transfers_sfq.xlsx" },
          { label:"Dietary & Access",color:"#27AE60", icon:"🥗", sub:"dietary_requirements.xlsx" },
        ];

        const runDemo = () => {
          if (demoPhase !== "idle" && demoPhase !== "results") return;
          setDemoPhase("loading"); setFilesLoaded([false,false,false,false]);
          setCheckPct(0); setRowsVisible(0); setExpandedRow(null);

          [400,850,1200,1550].forEach((t,i) =>
            setTimeout(() => setFilesLoaded(p => { const n=[...p]; n[i]=true; return n; }), t)
          );
          setTimeout(() => setDemoPhase("checking"), 2100);
          [8,22,37,51,65,78,90,100].forEach((v,i) =>
            setTimeout(() => setCheckPct(v), 2100 + i*200)
          );
          for (let i=0; i<demoGuests.length; i++)
            setTimeout(() => setRowsVisible(i+1), 3900 + i*260);
          setTimeout(() => setDemoPhase("results"), 3900 + demoGuests.length*260);
        };

        return (
          <div className="gg-demo-section" style={{ background:"#F0F2F7", padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
            <style>{`
              @keyframes ggIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
              @keyframes ggPulse { 0%,100%{opacity:.45} 50%{opacity:1} }
            `}</style>

            <div style={{ maxWidth:"1000px", margin:"0 auto" }}>
              {/* Header */}
              <div style={{ textAlign:"center", marginBottom:"48px" }}>
                <div style={{ fontSize:"12px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>SEE IT IN ACTION</div>
                <h2 style={{ fontSize:"38px", fontWeight:900, color:P.navy, fontFamily:font, margin:"0 0 14px", letterSpacing:"-0.03em", lineHeight:1.1 }}>
                  From files to flags<br/><span style={{ color:P.accent }}>in under 60 seconds.</span>
                </h2>
                <p style={{ fontSize:"16px", color:P.grey400, fontFamily:font, lineHeight:1.7, maxWidth:"460px", margin:"0 auto" }}>
                  Watch GroupGrid cross-reference a 247-person event roster and surface every mismatch instantly.
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

                <div style={{ display:"flex", minHeight:"480px" }}>

                  {/* Mini sidebar */}
                  <div style={{ width:"160px", flexShrink:0, background:P.navy, padding:"16px 12px", display:"flex", flexDirection:"column", gap:"4px" }}>
                    {[
                      { icon:"◉", label:"All Guests",    count:demoPhase==="results"||demoPhase==="checking"?"247":"—",   active:true },
                      { icon:"⚑", label:"Action Needed", count:demoPhase==="results"?"3":"—",   color:P.red },
                      { icon:"✓", label:"Aligned",        count:demoPhase==="results"?"244":"—", color:P.accent },
                      { icon:"○", label:"Missing",        count:demoPhase==="results"?"1":"—",   color:P.amber },
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
                  <div style={{ flex:1, minWidth:0, padding:"20px 24px", overflowX:"hidden" }}>

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
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"8px", marginBottom:"16px" }}>
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
                                {checkPct < 100 ? "Cross-referencing 247 guests…" : "✓ Cross-check complete — 3 issues found"}
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
                          <div style={{ border:`1px solid ${P.grey100}`, borderRadius:"12px", overflow:"hidden", animation:"ggIn 0.3s ease" }}>
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
                                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px" }}>
                                        {/* Flight card */}
                                        <div style={{ background:P.white, border:`1.5px solid #4F8EF722`, borderRadius:"10px", padding:"12px 14px" }}>
                                          <div style={{ fontSize:"11px", fontWeight:800, color:"#4F8EF7", fontFamily:font, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.06em" }}>✈ Flight</div>
                                          {g.flight ? <>
                                            <div style={{ fontSize:"12px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Arrival: <strong style={{ color:P.navy }}>{g.flight.arr}</strong></div>
                                            <div style={{ fontSize:"12px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Departure: <strong style={{ color:P.navy }}>{g.flight.dep}</strong></div>
                                            <div style={{ fontSize:"12px", color:P.grey400, fontFamily:font }}>Flight: {g.flight.num}</div>
                                          </> : <div style={{ fontSize:"12px", fontWeight:700, color:P.amber, fontFamily:font }}>○ Not in manifest</div>}
                                        </div>
                                        {/* Hotel card */}
                                        <div style={{ background:P.white, border:`1.5px solid ${g.hotel?"#F5A62322":"#FDECEC"}`, borderRadius:"10px", padding:"12px 14px" }}>
                                          <div style={{ fontSize:"11px", fontWeight:800, color:"#F5A623", fontFamily:font, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.06em" }}>🏨 Hotel</div>
                                          {g.hotel ? <>
                                            <div style={{ fontSize:"12px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Check-in: <strong style={{ color: g.status==="error"&&g.issues[0]?.includes("check-in")?P.red:P.navy }}>{g.hotel.in}</strong></div>
                                            <div style={{ fontSize:"12px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Check-out: <strong style={{ color:P.navy }}>{g.hotel.out}</strong></div>
                                            <div style={{ fontSize:"12px", color:P.grey400, fontFamily:font }}>{g.hotel.name}</div>
                                          </> : <div style={{ fontSize:"12px", fontWeight:700, color:P.red, fontFamily:font }}>⚑ No hotel record</div>}
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
      <div className="gg-cta-section" style={{ background:`linear-gradient(135deg, ${P.navy}, #0D1E40)`, padding:"96px 40px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-120, left:"50%", transform:"translateX(-50%)", width:600, height:600, borderRadius:"50%", background:`radial-gradient(circle, ${P.accent}10, transparent 65%)`, pointerEvents:"none" }} />
        <div style={{ position:"relative" }}>
          <h2 style={{ fontSize:"clamp(32px,5vw,52px)", fontWeight:900, color:P.white, fontFamily:font, margin:"0 0 16px", letterSpacing:"-0.04em", lineHeight:1.1 }}>
            Stop cross-checking.<br/>Start <span style={{ color:P.accent }}>running great events.</span>
          </h2>
          <p style={{ fontSize:"18px", color:"rgba(255,255,255,0.5)", fontFamily:font, margin:"0 auto 40px", lineHeight:1.7, maxWidth:"480px" }}>
            Join event professionals who've turned days of logistics work into a few minutes.
          </p>
          <div style={{ display:"flex", gap:"12px", justifyContent:"center", flexWrap:"wrap" }}>
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
      <div className="gg-landing-footer" style={{ background:P.navy, padding:"28px 40px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <span style={{ fontSize:"13px", color:"rgba(255,255,255,0.3)", fontFamily:font }}>Built for event professionals · © 2026</span>
        </div>
        <div className="gg-landing-footer-links" style={{ display:"flex", gap:"20px" }}>
          {[
            ["Home", onEnter],
            ["Pricing", onPricing],
            ["About", onAbout],
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
            { icon:<ShieldCheck size={13} strokeWidth={2}/>, text:"Your data never leaves your browser" },
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
          <div style={{ fontSize:"14px", color:P.grey400, fontFamily:font }}>Email us at <a href="mailto:hello@groupgrid.io" style={{ color:P.periwinkleD, fontWeight:600, textDecoration:"none" }}>hello@groupgrid.io</a> and we'll get back to you within one business day.</div>
        </div>
      </div>
    </div>
  );
}

export default function GroupGridApp() {
  const [user, setUser] = useState(null);
  return <ErrorBoundary><GroupGrid user={user} onLogin={setUser} onLogout={() => setUser(null)} /></ErrorBoundary>;
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
        <input type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={e => e.target.files[0] && setter(e.target.files[0])} />
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
      <input type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={e => e.target.files[0] && setter(e.target.files[0])} />
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
function GroupGrid({ user, onLogin, onLogout }) {
  const [flightFile, setFlightFile] = useState(null);
  const [hotelFile, setHotelFile] = useState(null);
  const [carFile, setCarFile] = useState(null);
  const [dietaryFile, setDietaryFile] = useState(null);
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
  const parsedDataRef = useRef(null); // store parsed sheets for re-running crossMatch on window date changes
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState("idle"); // "idle" | "saving" | "saved"
  const [shareModal, setShareModal] = useState(null); // null | { html, filename }
  const isDirty = useRef(false); // tracks unsaved changes since last autosave
  const tableScrollRef = useRef(null);
  const [tableScrollTop, setTableScrollTop] = useState(0);
  const TABLE_ROW_HEIGHT = 44;
  const TABLE_EXPANDED_HEIGHT = 320;
  const TABLE_VISIBLE_ROWS = 16; // rows visible at once (~600px container)
  const [savedSessions, setSavedSessions] = useState([]);
  const [contacts, setContacts] = useState({ hotel:{name:"",email:"",phone:"",property:""}, travel:{name:"",email:"",phone:"",agency:""}, plannerName:"" });
  const [contactsOpen, setContactsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [sortBy, setSortBy] = useState(null);       // null | "name" | "status" | "arrival" | "checkin" | "departure" | "checkout"
  const [sortDir, setSortDir] = useState("asc");    // "asc" | "desc"
  const [selectedRows, setSelectedRows] = useState(new Set()); // set of record keys

  const hasWindow = arrivalStart || arrivalEnd || departureStart || departureEnd;

  // ── Persistent storage via window.storage API ────────────────────────────────
  const storageKey = `groupgrid-sessions-${user?.email || "anonymous"}`;
  const metaKey    = `groupgrid-activemeta-${user?.email || "anonymous"}`;

  // Load saved sessions + meta on mount / when user changes
  useEffect(() => {
    async function load() {
      try {
        const raw = await window.storage.get(storageKey);
        if (raw) setSavedSessions(JSON.parse(raw.value));
        else setSavedSessions([]);
      } catch(e) { setSavedSessions([]); }
      try {
        const rawMeta = await window.storage.get(metaKey);
        if (rawMeta) setMeta(JSON.parse(rawMeta.value));
        else setMeta({});
      } catch(e) { setMeta({}); }
    }
    load();
  }, [storageKey]);

  // Persist meta continuously (debounced 600ms)
  useEffect(() => {
    const t = setTimeout(async () => {
      try { await window.storage.set(metaKey, JSON.stringify(meta)); } catch(e) {}
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
      setTimeout(async () => {
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
          try { window.storage.set(storageKey, JSON.stringify(next)); } catch(e) {}
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
    if (!flightFile || !hotelFile) return;
    setLoading(true); setError(null); setExpanded(null);
    try {
      const [fWb, hWb] = await Promise.all([readXlsx(flightFile), readXlsx(hotelFile)]);
      const flights = parseFlightSheet(fWb), hotels = parseHotelSheet(hWb);
      let cars = [], dietary = [];
      if (carFile) { const w = await readXlsx(carFile); cars = parseCarSheet(w); }
      if (dietaryFile) { const w = await readXlsx(dietaryFile); dietary = parseDietarySheet(w); }
      const aw = { arrivalStart:arrivalStart?new Date(arrivalStart):null, arrivalEnd:arrivalEnd?new Date(arrivalEnd):null, departureStart:departureStart?new Date(departureStart):null, departureEnd:departureEnd?new Date(departureEnd):null };
      parsedDataRef.current = { flights, hotels, cars, dietary };
      const allResults = crossMatch(flights, hotels, cars, dietary, aw, meta);
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

  // Re-run cross-reference when travel window dates change (after initial check)
  useEffect(() => {
    if (!parsedDataRef.current || !results) return;
    const { flights, hotels, cars, dietary } = parsedDataRef.current;
    const aw = { arrivalStart:arrivalStart?new Date(arrivalStart):null, arrivalEnd:arrivalEnd?new Date(arrivalEnd):null, departureStart:departureStart?new Date(departureStart):null, departureEnd:departureEnd?new Date(departureEnd):null };
    const updated = crossMatch(flights, hotels, cars, dietary, aw, meta);
    setResults(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrivalStart, arrivalEnd, departureStart, departureEnd]);

  function toggleResolve(record, issueText) {
    const current = record.resolved || [];
    const resolved = current.includes(issueText) ? current.filter(x => x !== issueText) : [...current, issueText];
    updateMeta(record, { resolved });
  }

  async function saveSession() {
    if (!results) return;
    const session = { id:Date.now(), name:eventName||`Session ${new Date().toLocaleDateString()}`, date:new Date().toISOString(), meta, eventName, arrivalStart, arrivalEnd, departureStart, departureEnd, guestCount:results.length, issueCount:results.filter(r=>r.status!=="ok").length };
    const next = [session, ...savedSessions.filter(s => s.name !== session.name)].slice(0, 50);
    setSavedSessions(next);
    try { await window.storage.set(storageKey, JSON.stringify(next)); } catch(e) {}
    isDirty.current = false;
    setAutoSaveStatus("idle");
    setSaveMsg(user ? `Saved to ${user.name}'s account` : "Saved locally");
    setTimeout(() => setSaveMsg(""), 3000);
  }

  function exportToContact(contactType) {
    
    if (!XLSX) { setError("Spreadsheet library not loaded."); return; }
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
    const rows = filtered.map(r => ({ "First Name":r.firstName||r.displayName.split(" ")[0]||"—", "Last Name":r.lastName||r.displayName.split(" ").slice(1).join(" ")||"—", "Full Name":r.displayName, "Email":r.email||"—", "Status":{ok:"Aligned",warn:"1 Issue",error:"Action Needed"}[r.status], "Active Issues":r.issues.filter(x=>!(r.resolved||[]).includes(x.text)).map(x=>x.text).join("; ")||"None", "Resolved":r.resolved?.join("; ")||"—", "Note":r.note||"—", "Dietary":r.diet?.dietary||"—", "Accessibility":r.diet?.accessibility||"—", "Flight Arrival":fmt(r.flight?.flightArrival), "Hotel Check-In":fmt(r.hotel?.checkIn), "Arrival Δ":r.details?.arrDiff??"N/A", "Flight Departure":fmt(r.flight?.flightDeparture), "Hotel Check-Out":fmt(r.hotel?.checkOut), "Departure Δ":r.details?.depDiff??"N/A", "Car Pickup":fmt(r.car?.pickupDate), "Car Dropoff":fmt(r.car?.dropoffDate), "Hotel":r.hotel?.hotel||"—", "Room":r.hotel?.room||"—", "Matched By":r.matchedBy }));
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

  function exportSelected() {
    const toExport = selectedRows.size > 0 ? filtered.filter(r => selectedRows.has(r.key)) : filtered;
    const rows = toExport.map(r => ({ "First Name":r.firstName||r.displayName.split(" ")[0]||"—", "Last Name":r.lastName||r.displayName.split(" ").slice(1).join(" ")||"—", "Full Name":r.displayName, "Email":r.email||"—", "Status":{ok:"Aligned",warn:"1 Issue",error:"Action Needed"}[r.status], "Active Issues":r.issues.filter(x=>!(r.resolved||[]).includes(x.text)).map(x=>x.text).join("; ")||"None", "Note":r.note||"—", "Flight Arrival":fmt(r.flight?.flightArrival), "Flight In":r.flight?.flightIn||"—", "Hotel Check-In":fmt(r.hotel?.checkIn), "Arrival Δ":r.details?.arrDiff??"N/A", "Flight Departure":fmt(r.flight?.flightDeparture), "Flight Out":r.flight?.flightOut||"—", "Hotel Check-Out":fmt(r.hotel?.checkOut), "Departure Δ":r.details?.depDiff??"N/A", "Airport":r.flight?.airport||"—", "Hotel":r.hotel?.hotel||"—", "Room":r.hotel?.room||"—", "Car Pickup":fmt(r.car?.pickupDate), "Car Dropoff":fmt(r.car?.dropoffDate), "Dietary":r.diet?.dietary||"—", "Accessibility":r.diet?.accessibility||"—" }));
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
      + '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>'
      + "<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'DM Sans',sans-serif;background:#F0F2F7;color:#0F1D35;font-size:14px;-webkit-font-smoothing:antialiased;}a{color:inherit;text-decoration:none;}@media print{body{background:white;}.no-print{display:none!important;}table{page-break-inside:auto;}tr{page-break-inside:avoid;}}</style>"
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
    if (["ok","warn","error"].includes(filter)) return r.status === filter;
    return true;
  });

  const counts = results ? { total:results.length, ok:results.filter(r=>r.status==="ok").length, warn:results.filter(r=>r.status==="warn").length, error:results.filter(r=>r.status==="error").length, missing:results.filter(r=>r.issues.some(x=>x.type==="missing")).length, window:results.filter(r=>r.issues.some(x=>x.type==="window")).length, duplicate:results.filter(r=>r.issues.some(x=>x.type==="duplicate")).length, dietary:results.filter(r=>r.diet?.dietary||r.diet?.accessibility).length } : null;

  const hasCars = results?.some(r => r.car);
  const hasDiet = results?.some(r => r.diet);
  const ready = !!(flightFile && hotelFile);


  return (
    <div style={{ minHeight:"100vh", background:"#F0F2F7", fontFamily:font, fontSize:"15px", WebkitFontSmoothing:"antialiased" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      {emailModal && <EmailModal record={emailModal} eventName={eventName} contacts={contacts} onClose={() => setEmailModal(null)} />}
      {loginOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:2000, display:"flex", alignItems:"center", justifyContent:"flex-end" }}>
          <div onClick={() => setLoginOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(27,42,74,0.5)", backdropFilter:"blur(4px)" }} />
          <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:"420px", height:"100%", background:P.navy, boxShadow:"-20px 0 60px rgba(0,0,0,0.4)", display:"flex", flexDirection:"column", overflowY:"auto" }}>
            <LoginPanel onLogin={async u => {
                // Migrate anonymous sessions to the newly signed-in account
                try {
                  const anonKey = "groupgrid-sessions-anonymous";
                  const userKey = `groupgrid-sessions-${u.email}`;
                  const anonRaw = await window.storage.get(anonKey);
                  if (anonRaw) {
                    const anonSessions = JSON.parse(anonRaw.value);
                    if (anonSessions.length > 0) {
                      let existing = [];
                      try { const er = await window.storage.get(userKey); if (er) existing = JSON.parse(er.value); } catch(e) {}
                      const merged = [...anonSessions, ...existing.filter(e => !anonSessions.some(a => a.name === e.name))].slice(0, 50);
                      await window.storage.set(userKey, JSON.stringify(merged));
                      await window.storage.delete(anonKey);
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

      {/* ── Responsive CSS ── */}
      <style>{`
        @media (max-width: 768px) {
          /* Landing nav */
          .gg-landing-nav { padding: 0 16px !important; height: 56px !important; }
          .gg-landing-nav-links { gap: 12px !important; }
          .gg-landing-nav-links button { font-size: 12px !important; }
          .gg-landing-nav-links .gg-nav-cta { padding: 6px 14px !important; font-size: 13px !important; }
          /* Landing hero */
          .gg-hero { padding: 48px 20px 40px !important; }
          .gg-hero-flex { gap: 32px !important; }
          .gg-hero-left { min-width: unset !important; width: 100% !important; }
          .gg-hero-card { width: 100% !important; max-width: 360px; margin: 0 auto; }
          .gg-hero-card-inner { display: none; } /* hide on very small, show on tablet */
          .gg-hero-dot-svg { display: none !important; }
          /* Problem grid */
          .gg-section { padding: 48px 20px !important; }
          .gg-problem-grid { grid-template-columns: 1fr 1fr !important; }
          .gg-problem-arrow { display: none !important; }
          .gg-steps-grid { grid-template-columns: 1fr !important; }
          .gg-testimonials-grid { grid-template-columns: 1fr !important; }
          .gg-section h2 { font-size: 28px !important; }
          .gg-section-center p { font-size: 15px !important; }
          /* Demo section */
          .gg-demo-section { padding: 48px 16px !important; }
          .gg-demo-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          /* CTA */
          .gg-cta-section { padding: 56px 20px !important; }
          /* Landing footer */
          .gg-landing-footer { padding: 20px 16px !important; flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .gg-landing-footer-links { flex-wrap: wrap !important; gap: 10px !important; }
          /* App header */
          .gg-app-header { padding: 0 12px !important; }
          .gg-app-header-logo svg { width: 140px !important; height: 36px !important; }
          .gg-app-header-right { gap: 4px !important; }
          .gg-app-header-right .gg-autosave-text { display: none !important; }
          /* App sidebar */
          .gg-sidebar { position: fixed !important; left: 0; top: 52px; bottom: 0; z-index: 2000; width: 260px !important; transform: translateX(-100%); transition: transform 0.25s ease; }
          .gg-sidebar.gg-sidebar-open { transform: translateX(0); }
          .gg-sidebar-overlay { display: block !important; }
          .gg-sidebar-toggle { display: flex !important; }
          /* App main */
          .gg-main { padding: 16px 12px !important; }
          .gg-main-upload-hero { padding: 20px 16px !important; }
          .gg-main-upload-hero h2 { font-size: 22px !important; }
          .gg-main-upload-hero p { font-size: 14px !important; }
          .gg-upload-grid { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
          /* App footer */
          .gg-app-footer { padding: 10px 12px !important; flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
          .gg-app-footer-links { flex-wrap: wrap !important; gap: 8px !important; }
          .gg-app-footer-badges { flex-wrap: wrap !important; }
          .gg-app-footer-badges > div { padding: 3px 8px !important; }
          .gg-app-footer-badges span { font-size: 11px !important; }
          /* Filter bar in grid */
          .gg-grid-bar { flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; }
          /* Result table horizontal scroll */
          .gg-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .gg-table-wrap table { min-width: 700px; }
        }
        @media (max-width: 480px) {
          .gg-hero-card { display: none; }
          .gg-problem-grid { grid-template-columns: 1fr !important; }
          .gg-upload-grid { grid-template-columns: 1fr !important; }
          .gg-hero-checklist span { font-size: 22px !important; }
          .gg-section h2 { font-size: 24px !important; }
        }
        @media (min-width: 769px) {
          .gg-sidebar-overlay { display: none !important; }
          .gg-sidebar-toggle { display: none !important; }
        }
      `}</style>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div className="gg-sidebar-overlay" onClick={() => setSidebarOpen(false)} style={{ display:"none", position:"fixed", inset:0, top:52, background:"rgba(0,0,0,0.5)", zIndex:1999 }} />}

      {/* ── Page overlays ── */}
      {page === "landing" && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowY:"auto" }}><LandingPage onEnter={() => setPage("app")} onPricing={() => setPage("pricing")} onAbout={() => setPage("about")} onContact={() => setPage("contact")} onPrivacy={() => setPage("privacy")} onTerms={() => setPage("terms")} /></div>}
      {page === "pricing" && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowY:"auto" }}><PricingPage onBack={() => setPage("app")} /></div>}
      {page === "about"   && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowY:"auto" }}><AboutPage   onBack={() => setPage("app")} /></div>}
      {page === "contact" && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowY:"auto" }}><ContactPage onBack={() => setPage("app")} /></div>}
      {page === "privacy" && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowY:"auto" }}><PrivacyPage onBack={() => setPage("app")} /></div>}
      {page === "terms"   && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowY:"auto" }}><TermsPage   onBack={() => setPage("app")} /></div>}

      {/* Header */}
      <div className="gg-app-header" style={{ background:P.navy, padding:"0 32px", display:"flex", alignItems:"center", justifyContent:"space-between", height:"52px", boxShadow:"0 1px 0 rgba(255,255,255,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          {/* Mobile sidebar toggle */}
          <button className="gg-sidebar-toggle" onClick={() => setSidebarOpen(o => !o)} style={{ display:"none", alignItems:"center", justifyContent:"center", width:36, height:36, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"8px", cursor:"pointer", flexShrink:0 }}>
            <span style={{ fontSize:"18px", color:"rgba(255,255,255,0.7)", lineHeight:1 }}>☰</span>
          </button>
          <svg className="gg-app-header-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 52" width="185" height="46" style={{display:"block"}}>
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
              <text x="62" y="36" fontFamily="'DM Sans', sans-serif" fontSize="26" fontWeight="700" letterSpacing="-0.5" fill="white">Group</text>
              <text x="144" y="36" fontFamily="'DM Sans', sans-serif" fontSize="26" fontWeight="300" letterSpacing="-0.5" fill="#00C9B1">Grid</text>
            </svg>
            <button onClick={() => setPage("landing")} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"7px", padding:"4px 12px", fontSize:"12px", fontWeight:600, color:"rgba(255,255,255,0.45)", fontFamily:font, cursor:"pointer", letterSpacing:"0.03em" }}>← Home</button>
        </div>
        <div className="gg-app-header-right" style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          {/* Autosave indicator */}
          {autoSaveStatus === "saving" && (
            <span className="gg-autosave-text" style={{ fontSize:"15px", color:"rgba(255,255,255,0.45)", fontFamily:font, display:"flex", alignItems:"center", gap:"5px" }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:"rgba(255,255,255,0.4)", display:"inline-block", animation:"pulse 1s infinite" }} />
              Autosaving…
            </span>
          )}
          {autoSaveStatus === "saved" && (
            <span style={{ fontSize:"15px", color:"rgba(255,255,255,0.55)", fontFamily:font }}>✓ Autosaved</span>
          )}
          {autoSaveStatus === "idle" && saveMsg && <span style={{ fontSize:"15px", color:"rgba(255,255,255,0.6)", fontFamily:font }}>✓ {saveMsg}</span>}
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
      </div>

      <div style={{ display:"flex", flex:1, maxWidth:"1400px", margin:"0 auto", width:"100%", minHeight:"calc(100vh - 52px)", alignItems:"flex-start" }}>

        {/* ── Left Sidebar ── */}
        <div className={`gg-sidebar${sidebarOpen ? " gg-sidebar-open" : ""}`} style={{ width:224, flexShrink:0, background:P.navy, borderRight:`1px solid rgba(255,255,255,0.07)`, display:"flex", flexDirection:"column", padding:"20px 14px", overflowY:"auto", position:"sticky", top:0, height:"calc(100vh - 52px)", alignSelf:"flex-start" }}>

          {/* ── Set Up Event ── */}
          <div style={{ marginBottom:"20px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"6px" }}>
              <div style={{ width:3, height:14, background:P.accent, borderRadius:"2px" }} />
              <span style={{ fontSize:"14px", fontWeight:700, color:P.white, letterSpacing:"0.03em", textTransform:"uppercase", fontFamily:font }}>Event Information</span>
            </div>
            <div style={{ fontSize:"14px", color:P.white, fontFamily:font, marginBottom:"16px", paddingLeft:"9px", lineHeight:1.5 }}>
              Name your event, set travel dates, and add contacts for sending emails directly from GroupGrid.
            </div>

            {/* Step 1 — Event name */}
            <div style={{ marginBottom:"14px" }}>
              <div style={{ fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.7)", fontFamily:font, letterSpacing:"0.02em", textTransform:"uppercase", marginBottom:"7px", paddingLeft:"2px", display:"flex", alignItems:"center" }}>
                <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:18, height:18, borderRadius:"50%", background:P.accent, color:P.navy, fontSize:"15px", fontWeight:700, flexShrink:0, marginRight:"7px" }}>1</span>
                Event Name
              </div>
              <input placeholder="e.g. Sales Summit 2025" value={eventName} onChange={e => setEventName(e.target.value)}
                style={{ width:"100%", background:eventName?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.07)", border:`1.5px solid ${eventName?P.accent+"88":"rgba(255,255,255,0.12)"}`, borderRadius:"10px", padding:"9px 12px", fontSize:"15px", fontWeight:eventName?600:400, color:eventName?P.white:"rgba(255,255,255,0.3)", fontFamily:font, outline:"none", boxSizing:"border-box", transition:"all 0.2s" }} />
            </div>

            {/* Step 2 — Travel window */}
            <div style={{ marginBottom:"14px" }}>
              <div style={{ fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.7)", fontFamily:font, letterSpacing:"0.02em", textTransform:"uppercase", marginBottom:"7px", paddingLeft:"2px", display:"flex", alignItems:"center" }}>
                <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:18, height:18, borderRadius:"50%", background:"rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.6)", fontSize:"15px", fontWeight:700, flexShrink:0, marginRight:"7px" }}>2</span>
                Travel Window <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0, color:"rgba(255,255,255,0.3)", marginLeft:"5px", fontSize:"15px" }}>· optional</span>
              </div>
              <div style={{ fontSize:"14px", color:P.white, fontFamily:font, marginBottom:"8px", paddingLeft:"2px", lineHeight:1.5 }}>Flag guests arriving or departing outside your approved event dates.</div>
              <div style={{ background:hasWindow?"rgba(107,63,160,0.35)":"rgba(255,255,255,0.07)", border:`1px solid ${hasWindow?"rgba(107,63,160,0.5)":"rgba(255,255,255,0.1)"}`, borderRadius:"8px", padding:"10px" }}>
                <div onClick={() => setWindowOpen(!windowOpen)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", marginBottom:windowOpen?"12px":0 }}>
                  <span style={{ fontSize:"14px", fontWeight:600, color:hasWindow?"#C4A0F0":P.accent, fontFamily:font }}>{hasWindow ? "Dates set" : "Set event dates"}</span>
                  <span style={{ display:"flex", alignItems:"center", color:"rgba(255,255,255,0.35)" }}>{windowOpen?<ChevronUp size={14} strokeWidth={1.5}/>:<ChevronDown size={14} strokeWidth={1.5}/>}</span>
                </div>
                {windowOpen && (
                  <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                    {[
                      { label:"Earliest Arrival", val:arrivalStart, set:setArrivalStart },
                      { label:"Latest Arrival", val:arrivalEnd, set:setArrivalEnd },
                      { label:"Earliest Departure", val:departureStart, set:setDepartureStart },
                      { label:"Latest Departure", val:departureEnd, set:setDepartureEnd },
                    ].map(({ label, val, set }) => (
                      <div key={label}>
                        <div style={{ fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.6)", fontFamily:font, marginBottom:"3px" }}>{label}</div>
                        <input type="date" value={val} onChange={e => set(e.target.value)}
                          style={{ width:"100%", background:"rgba(255,255,255,0.08)", border:`1px solid rgba(255,255,255,0.15)`, borderRadius:"7px", padding:"6px 8px", fontSize:"14px", fontFamily:font, color:val?P.white:"rgba(255,255,255,0.3)", outline:"none", boxSizing:"border-box" }} />
                      </div>
                    ))}
                    {hasWindow && <button onClick={() => { setArrivalStart(""); setArrivalEnd(""); setDepartureStart(""); setDepartureEnd(""); }} style={{ background:"transparent", border:`1px solid rgba(255,255,255,0.2)`, borderRadius:"6px", padding:"5px", color:"rgba(255,255,255,0.45)", fontSize:"15px", fontWeight:600, fontFamily:font, cursor:"pointer", marginTop:"2px" }}>Clear dates</button>}
                  </div>
                )}
              </div>
            </div>

            {/* Step 3 — Contacts */}
            <div>
              <div style={{ fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.7)", fontFamily:font, letterSpacing:"0.02em", textTransform:"uppercase", marginBottom:"7px", paddingLeft:"2px", display:"flex", alignItems:"center" }}>
                <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:18, height:18, borderRadius:"50%", background:"rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.6)", fontSize:"15px", fontWeight:700, flexShrink:0, marginRight:"7px" }}>3</span>
                Contacts <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0, color:"rgba(255,255,255,0.3)", marginLeft:"5px", fontSize:"15px" }}>· optional</span>
              </div>
              <div style={{ fontSize:"14px", color:P.white, fontFamily:font, marginBottom:"8px", paddingLeft:"2px", lineHeight:1.5 }}>Add hotel and travel agency contacts to email them directly from GroupGrid.</div>
              <button onClick={() => setContactsOpen(true)}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:"10px", background:(contacts.hotel.email||contacts.travel.email)?"rgba(0,201,177,0.12)":"rgba(255,255,255,0.07)", border:`1px solid ${(contacts.hotel.email||contacts.travel.email)?P.accent+"44":"rgba(255,255,255,0.12)"}`, borderRadius:"8px", padding:"10px 12px", cursor:"pointer", fontFamily:font, transition:"all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.12)"}
                onMouseLeave={e => e.currentTarget.style.background=(contacts.hotel.email||contacts.travel.email)?"rgba(0,201,177,0.12)":"rgba(255,255,255,0.07)"}>
                <Contact size={16} strokeWidth={1.5} color={P.accent}/>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:"14px", fontWeight:600, color:(contacts.hotel.email||contacts.travel.email)?P.accent:"rgba(255,255,255,0.55)", fontFamily:font }}>
                    {(contacts.hotel.email||contacts.travel.email) ? "Contacts added" : "Add hotel & travel contacts"}
                  </div>
                  {(contacts.hotel.email||contacts.travel.email) && <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.4)", fontFamily:font, marginTop:"1px" }}>{[contacts.hotel.name, contacts.travel.name].filter(Boolean).join(" · ")}</div>}
                </div>
                {(contacts.hotel.email||contacts.travel.email) && <Check size={14} strokeWidth={2.5} color={P.accent} style={{marginLeft:"auto"}}/>}
              </button>
            </div>
          </div>

          <div style={{ height:1, background:"rgba(255,255,255,0.08)", marginBottom:"18px" }} />

          {/* ── Projects section ── */}
          <div style={{ marginTop:"18px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px", paddingLeft:"4px" }}>
              <span style={{ fontSize:"15px", fontWeight:700, color:P.white, letterSpacing:"0.03em", textTransform:"uppercase" }}>Projects</span>
              {(user || savedSessions.length > 0) && (
                <span style={{ fontSize:"15px", color: user ? P.accent : "rgba(255,255,255,0.35)", fontWeight:600 }}>{user ? `Synced` : "Local only"}</span>
              )}
            </div>

            {/* New project button */}
            <button onClick={() => { setResults(null); setFlightFile(null); setHotelFile(null); setCarFile(null); setDietaryFile(null); setEventName(""); setMeta({}); setFilter("all"); setSearch(""); setExpanded(null); setActiveTab("grid"); }}
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
                      <button onClick={e => { e.stopPropagation(); setSavedSessions(prev => { const next = prev.filter(x => x.id !== s.id); try { window.storage.set(storageKey, JSON.stringify(next)); } catch(ex) {} return next; }); }}
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
              { k:"comms", icon:<Mail size={15} strokeWidth={1.5}/>, label:"Communications", badge: results.filter(r=>r.email && getApplicableTemplates(r).length > 0).length > 0 ? results.filter(r=>r.email && getApplicableTemplates(r).length > 0).length : null },
            ].map(({ k, icon, label, badge }) => (
              <button key={k} onClick={() => setActiveTab(k)}
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
              <button key={k} onClick={() => { setFilter(k); setActiveTab("grid"); }}
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
                <Contact size={14} strokeWidth={1.5} color="rgba(255,255,255,0.35)"/>
                <span style={{ fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.4)" }}>Add contacts</span>
              </button>
            )}
          </>}
        </div>

        {/* ── Main Content ── */}
        <div className="gg-main" style={{ flex:1, minWidth:0, padding:"24px 28px", overflowY:"auto" }}>

        {/* ── Upload hero — full size when no results, compact strip when results exist ── */}
        {!results ? (
          <div style={{ marginBottom:"24px" }}>

            {/* Value prop hero — shown when no files loaded yet */}
            {!flightFile && !hotelFile && (
              <div className="gg-main-upload-hero" style={{ background:P.navy, borderRadius:"16px", padding:"32px 36px", marginBottom:"20px", position:"relative", overflow:"hidden" }}>
                {/* dot grid — matches landing page hero */}
                <svg style={{ position:"absolute", bottom:"10px", right:"0", pointerEvents:"none", width:"55%", height:"100%", minWidth:"300px" }} viewBox="0 0 1000 600" preserveAspectRatio="xMaxYMax meet" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <radialGradient id="appHeroDotFade" cx="100%" cy="100%" r="85%">
                      <stop offset="0%"   stopColor="white" stopOpacity="1"/>
                      <stop offset="55%"  stopColor="white" stopOpacity="0.7"/>
                      <stop offset="100%" stopColor="white" stopOpacity="0"/>
                    </radialGradient>
                    <mask id="appHeroDotMask">
                      <rect width="1000" height="600" fill="url(#appHeroDotFade)"/>
                    </mask>
                  </defs>
                  <g mask="url(#appHeroDotMask)">
                    <circle cx="280"  cy="20"  r="18" fill="rgba(255,255,255,0.18)"/>
                    <circle cx="520"  cy="20"  r="18" fill="rgba(255,255,255,0.18)"/>
                    <circle cx="760"  cy="20"  r="18" fill="rgba(255,255,255,0.18)"/>
                    <circle cx="1000" cy="20"  r="18" fill="rgba(255,255,255,0.18)"/>
                    <circle cx="280"  cy="200" r="18" fill="rgba(255,255,255,0.18)"/>
                    <circle cx="520"  cy="200" r="18" fill="rgba(255,255,255,0.18)"/>
                    <circle cx="760"  cy="200" r="18" fill="rgba(0,201,177,1)" opacity="0.45"/>
                    <circle cx="1000" cy="200" r="18" fill="rgba(0,201,177,1)" opacity="0.65"/>
                    <circle cx="280"  cy="380" r="18" fill="rgba(255,255,255,0.18)"/>
                    <circle cx="520"  cy="380" r="18" fill="rgba(0,201,177,1)" opacity="0.45"/>
                    <circle cx="760"  cy="380" r="18" fill="rgba(0,201,177,1)" opacity="0.75"/>
                    <circle cx="1000" cy="380" r="18" fill="rgba(0,201,177,1)" opacity="0.9"/>
                    <circle cx="280"  cy="560" r="18" fill="rgba(0,201,177,1)" opacity="0.35"/>
                    <circle cx="520"  cy="560" r="18" fill="rgba(0,201,177,1)" opacity="0.6"/>
                    <circle cx="760"  cy="560" r="18" fill="rgba(0,201,177,1)" opacity="0.85"/>
                    <circle cx="1000" cy="560" r="18" fill="rgba(0,201,177,1)" opacity="1"/>
                  </g>
                </svg>
                <div style={{ padding:"6px 0 10px" }}>
                    <h2 style={{ fontSize:"22px", fontWeight:900, color:P.white, fontFamily:font, margin:"0 0 6px", letterSpacing:"-0.03em", lineHeight:1.2 }}>
                      Upload your spreadsheets. See every mismatch instantly.
                    </h2>
                    <p style={{ fontSize:"14px", color:"rgba(255,255,255,0.5)", fontFamily:font, lineHeight:1.6, margin:0 }}>
                      Flights, hotels, car transfers, dietary needs — cross-referenced in seconds.
                    </p>
                </div>
              </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"12px", marginBottom:"16px" }}>
              <UploadSquare label="Flight Manifest" icon={<Plane size={22} strokeWidth={1.5} color="#4F8EF7"/>} accent={P.periwinkleD} file={flightFile} setter={setFlightFile} required={true}  sub="Required · .xlsx / .xls" />
              <UploadSquare label="Hotel Roster"    icon={<Hotel size={22} strokeWidth={1.5} color="#F5A623"/>} accent={P.navy}        file={hotelFile}  setter={setHotelFile}  required={true}  sub="Required · .xlsx / .xls" />
              <UploadSquare label="Car Transfers"   icon={<Car size={22} strokeWidth={1.5} color="#9B59B6"/>} accent={P.grey600}     file={carFile}    setter={setCarFile}    required={false} sub="Optional · .xlsx / .xls" />
              <UploadSquare label="Dietary & Access" icon={<Salad size={22} strokeWidth={1.5} color="#27AE60"/>} accent={P.teal}       file={dietaryFile} setter={setDietaryFile} required={false} sub="Optional · .xlsx / .xls" />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
              <button onClick={runCheck} disabled={!ready || loading}
                style={{ background:ready&&!loading?P.periwinkleD:P.grey100, color:ready&&!loading?P.white:P.grey400, border:"none", borderRadius:"10px", padding:"11px 28px", fontSize:"15px", fontWeight:600, fontFamily:font, cursor:ready&&!loading?"pointer":"not-allowed", transition:"all 0.18s", flexShrink:0, letterSpacing:"-0.01em", boxShadow:ready&&!loading?"0 2px 12px rgba(76,98,196,0.3)":"none" }}>
                {loading ? "Checking…" : "Run Cross-Check"}
              </button>
              {!ready && !error && <span style={{ fontSize:"15px", color:P.navyLight, fontFamily:font }}>Upload a flight manifest and hotel roster to run</span>}
              {error && <div style={{ fontSize:"15px", color:P.red, fontFamily:font, background:P.redLight, borderRadius:"8px", padding:"7px 12px" }}>{error}</div>}
            </div>
            <div style={{ fontSize:"13px", color:P.navyLight, fontFamily:font, marginTop:"12px", padding:"8px 12px", background:P.periwinkle+"0D", borderRadius:"8px", border:`1px solid ${P.periwinkle}22` }}>
              <span style={{ background:P.periwinkle+"22", color:P.periwinkleD, borderRadius:"5px", padding:"1px 7px", fontSize:"11px", fontWeight:800, marginRight:"7px" }}>💡 TIP</span>
              Include an <strong>Email Address</strong> column for the most accurate matching. GroupGrid matches by email first, then name.
            </div>
          </div>
        ) : (
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"16px", padding:"10px 14px", background:P.white, borderRadius:"12px", border:`1px solid ${P.grey100}`, flexWrap:"wrap" }}>
            <UploadSquare label="Flight" icon={<Plane size={22} strokeWidth={1.5} color="#4F8EF7"/>} accent={P.periwinkleD} file={flightFile} setter={setFlightFile} required={true}  sub="Required" compact />
            <UploadSquare label="Hotel"  icon={<Hotel size={22} strokeWidth={1.5} color="#F5A623"/>} accent={P.navy}        file={hotelFile}  setter={setHotelFile}  required={true}  sub="Required" compact />
            <UploadSquare label="Car"    icon={<Car size={22} strokeWidth={1.5} color="#9B59B6"/>} accent={P.grey600}     file={carFile}    setter={setCarFile}    required={false} sub="Optional" compact />
            <UploadSquare label="Dietary" icon={<Salad size={22} strokeWidth={1.5} color="#27AE60"/>} accent={P.teal}       file={dietaryFile} setter={setDietaryFile} required={false} sub="Optional" compact />
            <div style={{ width:1, height:32, background:P.grey100, flexShrink:0 }} />
            <button onClick={runCheck} disabled={!ready || loading}
              style={{ background:ready&&!loading?P.periwinkleD:P.grey100, color:ready&&!loading?P.white:P.grey400, border:"none", borderRadius:"7px", padding:"7px 16px", fontSize:"14px", fontWeight:500, fontFamily:font, cursor:ready&&!loading?"pointer":"not-allowed", transition:"all 0.18s", flexShrink:0, whiteSpace:"nowrap", boxShadow:ready&&!loading?"0 1px 6px rgba(0,201,177,0.3)":"none" }}>
              {loading ? "⏳" : "Re-run"}
            </button>
            {error && <div style={{ fontSize:"15px", color:P.red, fontFamily:font, background:P.redLight, borderRadius:"8px", padding:"5px 10px" }}>{error}</div>}
            {results && <span style={{ fontSize:"15px", color:P.green, fontFamily:font, fontWeight:700, marginLeft:"auto", whiteSpace:"nowrap" }}>✓ {results.length} guests · {results.filter(r=>r.status!=="ok").length} flags found</span>}
          </div>
        )}

        {/* Format guide */}
        {!results && !loading && (
          <div style={{ background:P.white, borderRadius:"10px", padding:"20px", boxShadow:"0 1px 2px rgba(15,29,53,0.05)", border:`1px solid ${P.grey100}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"16px" }}>
              <div style={{ width:4, height:16, background:P.periwinkle, borderRadius:"3px" }} />
              <span style={{ fontFamily:font, fontSize:"14px", fontWeight:800, color:P.navy }}>Expected Column Headers</span>
              <span style={{ background:P.periwinkle+"1A", color:P.periwinkleD, fontSize:"15px", fontWeight:700, padding:"2px 10px", borderRadius:"20px", fontFamily:font }}>Auto-detected</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"16px" }}>
              {[
                {title:"Flight",color:P.periwinkleD,cols:["First Name + Last Name (or Name)","Email (opt)","Arrival Date","Departure Date","Inbound Flight # (opt)","Outbound Flight # (opt)"]},
                {title:"Hotel",color:P.navy,cols:["First Name + Last Name (or Name)","Email (opt)","Check-In Date","Check-Out Date","Hotel Name (opt)","Room / Conf # (opt)"]},
                {title:"Car Transfers",color:P.navy,cols:["First Name + Last Name (or Name)","Email (opt)","Pickup Date","Dropoff Date","Pickup Location (opt)","Conf # (opt)"]},
                {title:"Dietary & Access",color:P.teal,cols:["First Name + Last Name (or Name)","Email (opt)","Dietary Restrictions","Accessibility Needs","Special Notes (opt)"]},
              ].map(({title,color,cols}) => (
                <div key={title}>
                  <div style={{ fontWeight:800, color, fontSize:"15px", marginBottom:"8px", fontFamily:font }}>{title}</div>
                  {cols.map(c => <div key={c} style={{ background:P.offWhite, border:`1px solid ${P.grey100}`, borderRadius:"7px", padding:"5px 10px", fontSize:"15px", color:P.navy, marginBottom:"4px", fontFamily:font }}>{c}</div>)}
                </div>
              ))}
            </div>
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
                  {contacts.hotel.email && <Btn onClick={() => exportToContact("hotel")} outline color={P.navy}>🏨 Send to {contacts.hotel.name||"Hotel"}</Btn>}
                  {contacts.travel.email && <Btn onClick={() => exportToContact("travel")} outline color={P.periwinkleD}>✈ Send to {contacts.travel.name||"Travel Agency"}</Btn>}
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
                      <Btn onClick={() => setEmailModal(r)} small outline color={P.red}>✉ Draft</Btn>
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
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"12px" }}>
              {/* Search */}
              <div style={{ position:"relative", flex:1 }}>
                <input placeholder="Search guests by name or email…" value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width:"100%", background:P.white, border:`1.5px solid ${P.grey200}`, borderRadius:"10px", padding:"8px 12px 8px 34px", color:P.navy, fontSize:"15px", fontFamily:font, outline:"none", boxSizing:"border-box" }} />
                <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:P.navyLight, fontSize:"14px", pointerEvents:"none" }}>🔍</span>
                {search && <button onClick={() => setSearch("")} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", color:P.navyLight, fontSize:"15px", cursor:"pointer" }}>✕</button>}
              </div>
              {/* Filter pills */}
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
              {/* Sort dropdown */}
              <select value={sortBy||""} onChange={e => { setSortBy(e.target.value||null); setSortDir("asc"); }}
                style={{ background:P.white, border:`1.5px solid ${P.grey200}`, borderRadius:"8px", padding:"6px 10px", fontSize:"15px", fontWeight:700, fontFamily:font, color:P.navy, cursor:"pointer", outline:"none" }}>
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
                  style={{ background:P.navy, border:"none", borderRadius:"8px", padding:"6px 10px", fontSize:"15px", fontWeight:700, fontFamily:font, color:P.white, cursor:"pointer" }}>
                  {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
                </button>
              )}
              <span style={{ fontSize:"14px", color:P.navyLight, fontFamily:font, whiteSpace:"nowrap" }}>{displayRows.length} guests</span>
            </div>

            {/* Export / selection toolbar */}
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px", padding:"8px 12px", background:P.white, borderRadius:"12px", border:`1px solid ${someSelected ? P.accent+"66" : P.grey100}`, transition:"border-color 0.2s", flexWrap:"nowrap", overflow:"hidden" }}>
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
              {/* Export button */}
              <button onClick={exportSelected}
                style={{ display:"flex", alignItems:"center", gap:"5px", background:someSelected?P.accent:P.offWhite, border:`1.5px solid ${someSelected?P.accent:P.grey200}`, borderRadius:"7px", padding:"5px 12px", fontSize:"13px", fontWeight:700, fontFamily:font, color:someSelected?P.white:P.grey600, cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap", flexShrink:0 }}>
                ⬇ {someSelected ? `Export ${selCount}` : "Export all"}
              </button>
              {/* Share Report button */}
              <button onClick={generateShareableReport}
                style={{ display:"flex", alignItems:"center", gap:"5px", background:P.navy, border:"none", borderRadius:"7px", padding:"5px 12px", fontSize:"13px", fontWeight:600, fontFamily:font, color:P.white, cursor:"pointer", flexShrink:0, whiteSpace:"nowrap", boxShadow:"0 1px 4px rgba(15,29,53,0.18)" }}>
                <Send size={12} strokeWidth={1.5}/> Share Report
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
              <div ref={tableScrollRef} onScroll={e => setTableScrollTop(e.currentTarget.scrollTop)}
                style={{ overflowX:"auto", overflowY:"auto", maxHeight:`${containerH}px` }}>
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
                                    <Btn onClick={() => setEmailModal(r)} small outline color={P.periwinkleD}>✉ Draft Email</Btn>
                                    <div style={{ flex:1, display:"flex", alignItems:"center", gap:"8px" }}>
                                      <span style={{ fontSize:"15px", fontWeight:700, color:P.navyLight, fontFamily:font, flexShrink:0 }}>Note</span>
                                      <input value={r.note||""} onChange={e => updateMeta(r,{note:e.target.value})} placeholder={user ? `Planner note — saved to ${user.name}'s account` : "Planner note — saved locally (sign in to sync)"} onClick={e => e.stopPropagation()}
                                        style={{ flex:1, background:P.white, border:`1.5px solid ${r.note ? P.periwinkle+"66" : P.grey200}`, borderRadius:"9px", padding:"5px 12px", fontSize:"14px", fontFamily:font, color:P.navy, outline:"none" }} />
                                      {r.note && <span style={{ fontSize:"14px", color:P.green, fontFamily:font, fontWeight:700, flexShrink:0 }}>{user ? "synced" : "saved"}</span>}
                                    </div>
                                    <span style={{ fontSize:"15px", color:P.navyLight, fontFamily:font }}>{r.matchedBy==="email"?"✉ email match":"👤 name match"}</span>
                                  </div>
                                  <div style={{ display:"grid", gridTemplateColumns:hasDiet?"1fr 1fr 1fr 1fr 1fr":"1fr 1fr 1fr 1fr", gap:"10px" }}>
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

      <div className="gg-app-footer" style={{ borderTop:`1px solid ${P.grey100}`, padding:"12px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", background:P.white, flexWrap:"wrap", gap:"10px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
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
              <text x="62" y="36" fontFamily="'DM Sans', sans-serif" fontSize="26" fontWeight="700" letterSpacing="-0.5" fill="#0F1F3D">Group</text>
              <text x="144" y="36" fontFamily="'DM Sans', sans-serif" fontSize="26" fontWeight="300" letterSpacing="-0.5" fill="#00A896">Grid</text>
            </svg>
            <span style={{ fontSize:"13px", color:P.grey400, fontFamily:font }}>Built for event professionals · © 2026</span>
          </div>
          <div className="gg-app-footer-links" style={{ display:"flex", gap:"20px" }}>
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
        <div className="gg-app-footer-badges" style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
          {[
            { icon:<Lock size={10} strokeWidth={2}/>,       label:"Browser-only processing", bg:"#FFF7ED", border:"#FB923C", color:"#C2410C" },
            { icon:<Ban size={10} strokeWidth={2}/>,        label:"No data uploaded",         bg:"#FFF0F6", border:"#F472B6", color:"#BE185D" },
            { icon:<ShieldCheck size={10} strokeWidth={2}/>, label:"PII never stored",        bg:"#F0FDF4", border:"#4ADE80", color:"#15803D" },
            { icon:<Check size={11} strokeWidth={2.5}/>,    label:"GDPR-friendly",            bg:"#EFF6FF", border:"#60A5FA", color:"#1D4ED8" },
          ].map(({ icon, label, bg, border, color }) => (
            <div key={label} style={{ display:"flex", alignItems:"center", gap:"5px", background:bg, border:`1px solid ${border}`, borderRadius:"20px", padding:"4px 10px" }}>
              <span style={{ display:"flex", alignItems:"center", color }}>{icon}</span>
              <span style={{ fontSize:"15px", fontWeight:600, color, fontFamily:font }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
