import React, { useState, useEffect, useRef, Fragment } from "react";
import * as XLSX from "xlsx";
import { Users, Check, AlertTriangle, BarChart2, Circle, Calendar, AlertCircle, Salad, Mail, FileSpreadsheet, Save, Send, X } from "lucide-react";
import { P, font, fontDisplay } from "./theme";
import { fmt, fmtTime, parseDate, rehydrateResults } from "./format";
import { PAGE_PATHS, pathToPage, SHOW_DIETARY, APP_VERSION } from "./constants";
import { BrandLogo, GridIcon, ClearedIcon, FlagIcon, CalendarIcon, PeopleIcon, CrossCheckIcon, SpreadsheetIcon, PlaneIcon, HotelIcon, CarIcon } from "./icons";
import { useIsMobile } from "./hooks";
import { GlobalStyles } from "./GlobalStyles";
import { parseFlightSheet, parseHotelSheetTagged, parseCarSheet, parseDietarySheet, parseRegistrationSheet, parseAbstractSheet } from "./parsing/parseSheets";
import { crossMatch, diffResults } from "./parsing/crossMatch";
import { StatusChip, Delta, IssueTag, Card, DR, Btn } from "./components/common";
import { EmailModal } from "./components/EmailModal";
import { ContactsModal } from "./components/ContactsModal";
import { SupportModal } from "./components/SupportModal";
import { ShareModal } from "./components/ShareModal";
import { CommHub } from "./components/CommHub";
import { UploadSquare } from "./components/UploadSquare";
import { SetupScreen } from "./components/SetupScreen";
import { tagSrc } from "./components/ExtraUploads";
import { ReportFieldDropdown, REPORT_PRESETS } from "./components/ReportFieldDropdown";
import { LoginPanel } from "./auth/LoginPanel";
import { LandingPage } from "./pages/LandingPage";
import { PricingPage } from "./pages/PricingPage";
import { AboutPage } from "./pages/AboutPage";
import { FAQPage } from "./pages/FAQPage";
import { ContactPage } from "./pages/ContactPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { extractPdfToWorkbook } from "./pdf/loadPdfJs";
import { DEFAULT_TEMPLATES, fillTemplate, getApplicableTemplates } from "./templates";
import { openBillingPortal, checkSubscription } from "./stripeClient";

export default function GroupGrid({ user, onLogin, onLogout }) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [flightFile, setFlightFile] = useState(null);
  const [hotelFile, setHotelFile] = useState(null);
  const [hotelProperty, setHotelProperty] = useState(""); // optional property name for the primary hotel file
  const [extraHotels, setExtraHotels] = useState([]); // [{ id, file, property }] additional hotel properties
  const [extraFlights, setExtraFlights] = useState([]); // [{ id, file, source }]
  const [extraCars, setExtraCars] = useState([]);
  const [extraReg, setExtraReg] = useState([]);
  const [extraDietary, setExtraDietary] = useState([]);
  const [carFile, setCarFile] = useState(null);
  const [dietaryFile, setDietaryFile] = useState(null);
  const [abstractFile, setAbstractFile] = useState(null);
  const [registrationFile, setRegistrationFile] = useState(null);
  const [results, setResults] = useState(null);
  const [timeFormat, setTimeFormat] = useState("ampm"); // "ampm" | "24hr"
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
  const [preferredAirports, setPreferredAirports] = useState(""); // arrival-side airports (key kept for saved-project compatibility)
  const [departureAirports, setDepartureAirports] = useState(""); // departure-side airports; empty = falls back to arrival list
  const [arrivalCutoff, setArrivalCutoff] = useState(""); // "HH:MM" — early-arrival cutoff; empty = off
  const [departureCutoff, setDepartureCutoff] = useState(""); // "HH:MM" — earliest allowed departure time; empty = off
  const [lateArrivalCutoff, setLateArrivalCutoff] = useState("22:30"); // "HH:MM" — flag arrivals after this as possible late arrivals; empty = off
  const [typeRules, setTypeRules] = useState([]); // [{ id, type, day }] — day is "0".."6" (Sun..Sat) or "" for no rule
  const [lastRunSig, setLastRunSig] = useState(""); // snapshot of params at last run, to detect post-run edits
  const [eventName, setEventName] = useState("");
  const [projectName, setProjectName] = useState(""); // internal save label, distinct from eventName (used in comms)
  const [emailModal, setEmailModal] = useState(null);
  const [meta, setMeta] = useState({});
  const [activeTab, setActiveTab] = useState("grid");
  const [reportTarget, setReportTarget] = useState("general");
  const [reportFields, setReportFields] = useState(() => new Set(REPORT_PRESETS.general));
  const [showSetup, setShowSetup] = useState(false); // edit setup while keeping results
  const [page, setPage] = useState(() => (typeof window !== "undefined" ? pathToPage(window.location.pathname) : "landing")); // "landing" | "app" | "pricing" | "contact" | "about" | "privacy" | "terms"
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
  const [contacts, setContacts] = useState({ hotel:{name:"",email:"",phone:"",property:""}, travel:{name:"",email:"",phone:"",agency:""}, car:{name:"",email:"",phone:"",vendor:""}, hotels:[], plannerName:"" });
  const [contactsOpen, setContactsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState("");
  // undefined = not checked yet, { hasAccess, status } once checked.
  const [subscription, setSubscription] = useState(undefined);

  // Check subscription access once signed in. This is a UI-level gate only —
  // the actual cross-check engine runs entirely client-side with no server
  // enforcement, same as the rest of the app's architecture.
  useEffect(() => {
    if (!user) { setSubscription(undefined); return; }
    let cancelled = false;
    checkSubscription().then(result => { if (!cancelled) setSubscription(result); });
    return () => { cancelled = true; };
  }, [user]);

  // Auth gate: the app (cross-check tool) requires login. Marketing pages stay public.
  // If logged in, enter the app; otherwise open the login modal and stay on the current marketing page.
  function enterApp() {
    if (user) { setPage("app"); }
    else { setLoginOpen(true); }
  }

  async function handleManageBilling() {
    setBillingError(""); setBillingLoading(true);
    try {
      await openBillingPortal();
    } catch (err) {
      setBillingError(err.message);
      setBillingLoading(false);
    }
  }
  // Safety guard: if a logged-out user ends up on the app view (e.g. after logout, or a stale state),
  // bounce them back to the public landing page and prompt login. The app requires authentication.
  useEffect(() => {
    if (!user && page === "app") { setPage("landing"); setLoginOpen(true); }
  }, [user, page]);
  // Keep the URL in sync with the current page so deep links, refresh, and back/forward work.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = PAGE_PATHS[page] || "/";
    if (window.location.pathname !== target) window.history.pushState({ page }, "", target);
  }, [page]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => setPage(pathToPage(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
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

  // Autosave every 30 seconds when there are results and something changed.
  // We keep the latest state in a ref so the interval can read current values
  // WITHOUT the effect tearing down and restarting the timer on every edit
  // (the old bug: every note/date change reset the 60s countdown, so it rarely fired).
  const autosaveData = useRef({});
  useEffect(() => {
    autosaveData.current = { results, meta, projectName, eventName, arrivalStart, arrivalEnd, departureStart, departureEnd, preferredAirports, departureAirports, arrivalCutoff, departureCutoff, lateArrivalCutoff, typeRules, storageKey };
  }, [results, meta, eventName, arrivalStart, arrivalEnd, departureStart, departureEnd, storageKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isDirty.current) return;
      const d = autosaveData.current;
      if (!d.results) return;
      setAutoSaveStatus("saving");
      setTimeout(() => {
        const session = {
          id: Date.now(),
          name: d.projectName || d.eventName || `Session ${new Date().toLocaleDateString()}`,
          date: new Date().toISOString(),
          meta: d.meta, projectName: d.projectName, eventName: d.eventName, arrivalStart: d.arrivalStart, arrivalEnd: d.arrivalEnd, departureStart: d.departureStart, departureEnd: d.departureEnd,
          preferredAirports: d.preferredAirports, departureAirports: d.departureAirports, arrivalCutoff: d.arrivalCutoff, departureCutoff: d.departureCutoff, lateArrivalCutoff: d.lateArrivalCutoff, typeRules: d.typeRules,
          guestCount: d.results.length,
          issueCount: d.results.filter(r => r.status !== "ok").length,
          autoSaved: true,
          results: d.results,
        };
        setSavedSessions(prev => {
          const next = [session, ...prev.filter(s => s.name !== session.name)].slice(0, 50);
          try {
            storage.set(d.storageKey, JSON.stringify(next));
          } catch(e) {
            try {
              const trimmed = next.map((s, i) => i === 0 ? s : { ...s, results: undefined });
              storage.set(d.storageKey, JSON.stringify(trimmed));
            } catch(e2) {}
          }
          return next;
        });
        isDirty.current = false;
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 3000);
      }, 300);
    }, 30000);
    return () => clearInterval(interval);
  }, []); // run once; reads live state via the ref so the timer never resets

  async function readXlsx(file) {
    const isPdf = (file.type && file.type.indexOf("pdf") >= 0) || /\.pdf$/i.test(file.name || "");
    if (isPdf) return extractPdfToWorkbook(file);
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
      let flights = [], hotels = [], cars = [], dietary = [], registration = [], abstracts = [];
      if (flightFile)       { const w = await readXlsx(flightFile);       flights = tagSrc(parseFlightSheet(w), flightFile.name); }
      for (const ex of extraFlights) { if (ex.file) { const w = await readXlsx(ex.file); flights = flights.concat(tagSrc(parseFlightSheet(w), ex.source || ex.file.name)); } }
      if (hotelFile)        { const w = await readXlsx(hotelFile);        hotels = tagSrc(parseHotelSheetTagged(w, hotelProperty), hotelProperty || hotelFile.name); }
      for (const eh of extraHotels) { if (eh.file) { const w = await readXlsx(eh.file); hotels = hotels.concat(tagSrc(parseHotelSheetTagged(w, eh.property), eh.property || eh.file.name)); } }
      if (carFile)          { const w = await readXlsx(carFile);          cars = tagSrc(parseCarSheet(w), carFile.name); }
      for (const ex of extraCars) { if (ex.file) { const w = await readXlsx(ex.file); cars = cars.concat(tagSrc(parseCarSheet(w), ex.source || ex.file.name)); } }
      if (dietaryFile)      { const w = await readXlsx(dietaryFile);      dietary = tagSrc(parseDietarySheet(w), dietaryFile.name); }
      for (const ex of extraDietary) { if (ex.file) { const w = await readXlsx(ex.file); dietary = dietary.concat(tagSrc(parseDietarySheet(w), ex.source || ex.file.name)); } }
      if (registrationFile) { const w = await readXlsx(registrationFile); registration = tagSrc(parseRegistrationSheet(w), registrationFile.name); }
      for (const ex of extraReg) { if (ex.file) { const w = await readXlsx(ex.file); registration = registration.concat(tagSrc(parseRegistrationSheet(w), ex.source || ex.file.name)); } }
      if (abstractFile)     { const w = await readXlsx(abstractFile);     abstracts = tagSrc(parseAbstractSheet(w), abstractFile.name); }
      const aw = { arrivalStart:parseDate(arrivalStart), arrivalEnd:parseDate(arrivalEnd), departureStart:parseDate(departureStart), departureEnd:parseDate(departureEnd), preferredAirports: preferredAirports.split(",").map(s=>s.trim()).filter(Boolean), departureAirports: departureAirports.split(",").map(s=>s.trim()).filter(Boolean), arrivalCutoff, departureCutoff, lateArrivalCutoff, typeRules };
      const allResults = crossMatch(flights, hotels, cars, dietary, aw, meta, registration, abstracts);
      setResults(allResults); setShowSetup(false);
      setLastRunSig(JSON.stringify({ arrivalStart, arrivalEnd, departureStart, departureEnd, preferredAirports, departureAirports, arrivalCutoff, departureCutoff, lateArrivalCutoff, typeRules, eventName }));
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
    const session = { id:Date.now(), name:(projectName||eventName)||`Session ${new Date().toLocaleDateString()}`, date:new Date().toISOString(), meta, projectName, eventName, arrivalStart, arrivalEnd, departureStart, departureEnd, preferredAirports, departureAirports, arrivalCutoff, departureCutoff, lateArrivalCutoff, typeRules, guestCount:results.length, issueCount:results.filter(r=>r.status!=="ok").length, results };
    const next = [session, ...savedSessions.filter(s => s.name !== session.name)].slice(0, 50);
    setSavedSessions(next);
    try {
      storage.set(storageKey, JSON.stringify(next));
    } catch(e) {
      // localStorage quota exceeded — retry without the heavy results arrays on older sessions
      try {
        const trimmed = next.map((s, i) => i === 0 ? s : { ...s, results: undefined });
        storage.set(storageKey, JSON.stringify(trimmed));
      } catch(e2) {}
    }
    isDirty.current = false;
    setAutoSaveStatus("idle");
    setSaveMsg(user ? "Saved to this device" : "Saved to this device");
    setTimeout(() => setSaveMsg(""), 3000);
  }
  // Export a saved project to a portable .ggproj file (JSON). Nothing leaves the device
  // beyond the file the user chooses to save; no server involved.
  function exportSession(session) {
    const payload = { app:"GroupGrid", type:"project", version:1, exportedAt:new Date().toISOString(), project: session };
    const blob = new Blob([JSON.stringify(payload)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${(session.name||"groupgrid-project").replace(/[^\w.-]+/g,"-")}.ggproj`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  // Import a .ggproj (or plain project JSON) back into the saved-projects list on this device.
  function importSessionFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const proj = (data && data.type === "project" && data.project) ? data.project : (data && data.name ? data : null);
        if (!proj || !proj.name) { setSaveMsg("That file is not a GroupGrid project."); setTimeout(() => setSaveMsg(""), 4000); return; }
        const imported = { ...proj, id: Date.now() };
        setSavedSessions(prev => {
          const next = [imported, ...prev.filter(x => x.name !== imported.name)].slice(0, 50);
          try { storage.set(storageKey, JSON.stringify(next)); } catch(e) {}
          return next;
        });
        setSaveMsg(`Loaded "${proj.name}" into your projects. Click it to open.`); setTimeout(() => setSaveMsg(""), 5000);
      } catch(e) { setSaveMsg("Could not read that project file."); setTimeout(() => setSaveMsg(""), 4000); }
    };
    reader.readAsText(file);
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
      "Flight Arrival": fmt(r.flight?.flightArrival), "Arrival Time": fmtTime(r.flight?.arrivalTime, timeFormat)||"—", "Arrival Airport": (r.flight?.arrivalAirport||r.flight?.airport||"").toUpperCase()||"—", "Hotel Check-In": fmt(r.hotel?.checkIn), "Arrival Δ": r.details?.arrDiff??"N/A",
      "Flight Departure": fmt(r.flight?.flightDeparture), "Departure Time": fmtTime(r.flight?.departureTime, timeFormat)||"—", "Departure Airport": (r.flight?.departureAirport||r.flight?.airport||"").toUpperCase()||"—", "Hotel Check-Out": fmt(r.hotel?.checkOut), "Departure Δ": r.details?.depDiff??"N/A",
      "Car Pickup": fmt(r.car?.pickupDate), "Car Pickup Time": fmtTime(r.car?.pickupTime, timeFormat)||"—", "Car Dropoff": fmt(r.car?.dropoffDate), "Car Dropoff Time": fmtTime(r.car?.dropoffTime, timeFormat)||"—",
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
    const rows = filtered.map(r => ({ "First Name":r.firstName||r.displayName.split(" ")[0]||"—", "Last Name":r.lastName||r.displayName.split(" ").slice(1).join(" ")||"—", "Full Name":r.displayName, "Email":r.email||"—", "Registered":r.reg?"Yes":(r.registered?"Yes":"No"), "Status":{ok:"Aligned",warn:"1 Issue",error:"Action Needed"}[r.status], "Active Issues":r.issues.filter(x=>!(r.resolved||[]).includes(x.text)).map(x=>x.text).join("; ")||"None", "Resolved":r.resolved?.join("; ")||"—", "Note":r.note||"—", "Note By":r.noteBy||"—", "Note Added":r.noteAt ? new Date(r.noteAt).toLocaleString() : "—", "Company":r.reg?.company||"—", "Job Title":r.reg?.jobTitle||"—", "Requested Check-In":fmt(r.reg?.regCheckIn), "Requested Check-Out":fmt(r.reg?.regCheckOut), "Dietary":r.diet?.dietary||r.reg?.dietaryRequest||"—", "Accessibility":r.diet?.accessibility||"—", "Flight Arrival":fmt(r.flight?.flightArrival), "Arrival Time":fmtTime(r.flight?.arrivalTime, timeFormat)||"—", "Hotel Check-In":fmt(r.hotel?.checkIn), "Arrival Δ":r.details?.arrDiff??"N/A", "Flight Departure":fmt(r.flight?.flightDeparture), "Departure Time":fmtTime(r.flight?.departureTime, timeFormat)||"—", "Hotel Check-Out":fmt(r.hotel?.checkOut), "Departure Δ":r.details?.depDiff??"N/A", "Car Pickup":fmt(r.car?.pickupDate), "Car Pickup Time":fmtTime(r.car?.pickupTime, timeFormat)||"—", "Car Dropoff":fmt(r.car?.dropoffDate), "Car Dropoff Time":fmtTime(r.car?.dropoffTime, timeFormat)||"—", "Hotel":r.hotel?.hotel||"—", "Room":r.hotel?.room||"—", "Arrival Airport":(r.flight?.arrivalAirport||r.flight?.airport||"").toUpperCase()||"—", "Departure Airport":(r.flight?.departureAirport||r.flight?.airport||"").toUpperCase()||"—", "Matched By":r.matchedBy, "Sources":[r.reg?.source, r.flight?.source, r.hotel?.source, r.car?.source, r.diet?.source].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(", ")||"—" }));
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
        subject = `${eventName || "Event"} [Travel]: Could you confirm your travel details?`;
        body = `Hi ${record.firstName || record.displayName || "there"},\n\nWhile reviewing arrangements for ${eventName || "our event"}, we found something on your record that needs attention:\n\n${issueList}\n\nCould you take a look and let us know? Thank you.\n\n${contacts?.plannerName || "[Your Name]"}`;
      }
      // Stagger so the browser doesn't block multiple mailto: opens
      setTimeout(() => window.open(`mailto:${record.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank"), 250 * idx);
    });
  }

  const REPORT_FIELDS = [
    { key:"lastName", label:"Last Name", group:"Attendee", get:r => r.lastName||r.displayName.split(" ").slice(1).join(" ")||"—" },
    { key:"firstName", label:"First Name", group:"Attendee", get:r => r.firstName||r.displayName.split(" ")[0]||"—" },
    { key:"email", label:"Email", group:"Attendee", get:r => r.email||"—" },
    { key:"company", label:"Company", group:"Attendee", get:r => r.reg?.company||"—" },
    { key:"note", label:"Note", group:"Attendee", get:r => r.note||"—" },
    { key:"noteBy", label:"Note By", group:"Attendee", get:r => r.noteBy||"—" },
    { key:"noteAt", label:"Note Added", group:"Attendee", get:r => r.noteAt ? new Date(r.noteAt).toLocaleString() : "—" },
    { key:"status", label:"Status", group:"Status", get:r => ({ok:"Aligned",warn:"1 Issue",error:"Action Needed"}[r.status]) },
    { key:"issues", label:"Flagged Issues", group:"Status", get:r => r.issues.filter(x=>!(r.resolved||[]).includes(x.text)).map(x=>x.text).join("; ")||"None" },
    { key:"flightArrival", label:"Flight Arrival", group:"Flight", get:r => fmt(r.flight?.flightArrival) },
    { key:"arrivalTime", label:"Arrival Time", group:"Flight", get:r => fmtTime(r.flight?.arrivalTime, timeFormat)||"—" },
    { key:"arrivalAirport", label:"Arrival Airport", group:"Flight", get:r => (r.flight?.arrivalAirport||r.flight?.airport||"").toUpperCase()||"—" },
    { key:"flightIn", label:"Flight In #", group:"Flight", get:r => r.flight?.flightIn||"—" },
    { key:"flightDeparture", label:"Flight Departure", group:"Flight", get:r => fmt(r.flight?.flightDeparture) },
    { key:"departureTime", label:"Departure Time", group:"Flight", get:r => fmtTime(r.flight?.departureTime, timeFormat)||"—" },
    { key:"departureAirport", label:"Departure Airport", group:"Flight", get:r => (r.flight?.departureAirport||r.flight?.airport||"").toUpperCase()||"—" },
    { key:"flightOut", label:"Flight Out #", group:"Flight", get:r => r.flight?.flightOut||"—" },
    { key:"hotel", label:"Hotel", group:"Hotel", get:r => r.hotel?.hotel||"—" },
    { key:"checkIn", label:"Hotel Check-In", group:"Hotel", get:r => fmt(r.hotel?.checkIn) },
    { key:"checkOut", label:"Hotel Check-Out", group:"Hotel", get:r => fmt(r.hotel?.checkOut) },
    { key:"room", label:"Room / Conf.", group:"Hotel", get:r => r.hotel?.room||"—" },
    { key:"carPickup", label:"Car Pickup", group:"Car", get:r => fmt(r.car?.pickupDate) },
    { key:"carPickupTime", label:"Car Pickup Time", group:"Car", get:r => fmtTime(r.car?.pickupTime, timeFormat)||"—" },
    { key:"carDropoff", label:"Car Dropoff", group:"Car", get:r => fmt(r.car?.dropoffDate) },
  ];
  const applyReportTarget = (t) => { setReportTarget(t); setReportFields(new Set(REPORT_PRESETS[t])); };
  const toggleReportField = (k) => setReportFields(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const setReportFieldGroup = (keys, on) => setReportFields(prev => { const n = new Set(prev); keys.forEach(k => on ? n.add(k) : n.delete(k)); return n; });
  const byLastName = (a,b) => (a.lastName||a.displayName||"").localeCompare(b.lastName||b.displayName||"", undefined, { sensitivity:"base" });
  function exportCustomReport() {
    const cols = REPORT_FIELDS.filter(f => reportFields.has(f.key));
    if (!cols.length) return;
    const rows = [...results].sort(byLastName).map(r => Object.fromEntries(cols.map(f => [f.label, f.get(r)])));
    const sheet = { general:"Report", hotel:"Hotel", car:"Car Transfers", travel:"Travel" }[reportTarget] || "Report";
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheet);
    XLSX.writeFile(wb, `groupgrid-${(eventName||"report").replace(/\s+/g,"-")}-${reportTarget}-${new Date().toISOString().slice(0,10)}.xlsx`);
  }
  function exportOnsiteList() {
    const rows = [...results].sort(byLastName).map(r => ({
      "Last Name": r.lastName||r.displayName.split(" ").slice(1).join(" ")||"—",
      "First Name": r.firstName||r.displayName.split(" ")[0]||"—",
      "Email": r.email||"—",
      "Note": r.note||"—",
      "Flight Arrival": fmt(r.flight?.flightArrival),
      "Arrival Time": fmtTime(r.flight?.arrivalTime, timeFormat)||"—",
      "Arrival Airport": (r.flight?.arrivalAirport||r.flight?.airport||"").toUpperCase()||"—",
      "Flight In #": r.flight?.flightIn||"—",
      "Flight Departure": fmt(r.flight?.flightDeparture),
      "Departure Time": fmtTime(r.flight?.departureTime, timeFormat)||"—",
      "Departure Airport": (r.flight?.departureAirport||r.flight?.airport||"").toUpperCase()||"—",
      "Flight Out #": r.flight?.flightOut||"—",
      "Hotel": r.hotel?.hotel||"—",
      "Check-In": fmt(r.hotel?.checkIn),
      "Check-Out": fmt(r.hotel?.checkOut),
      "Room": r.hotel?.room||"—",
      "Car Pickup": fmt(r.car?.pickupDate),
      "Car Pickup Time": fmtTime(r.car?.pickupTime, timeFormat)||"—",
      "Car Dropoff": fmt(r.car?.dropoffDate),
      "Status": ({ok:"Aligned",warn:"1 Issue",error:"Action Needed"}[r.status]),
      "Flags": r.issues.filter(x=>!(r.resolved||[]).includes(x.text)).map(x=>x.text).join("; ")||"None",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Onsite Itinerary");
    XLSX.writeFile(wb, `groupgrid-${(eventName||"event").replace(/\s+/g,"-")}-onsite-itinerary-${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function exportSelected() {
    const toExport = selectedRows.size > 0 ? filtered.filter(r => selectedRows.has(r.key)) : filtered;
    const rows = toExport.map(r => ({
      "First Name":r.firstName||r.displayName.split(" ")[0]||"—",
      "Last Name":r.lastName||r.displayName.split(" ").slice(1).join(" ")||"—",
      "Full Name":r.displayName,
      "Email":r.email||"—",
      "Registered":r.reg?"Yes":(r.registered?"Yes":"No"),
      "Status":{ok:"Aligned",warn:"1 Issue",error:"Action Needed"}[r.status],
      "Active Issues":r.issues.filter(x=>!(r.resolved||[]).includes(x.text)).map(x=>x.text).join("; ")||"None",
      "Note":r.note||"—",
      "Note By":r.noteBy||"—",
      "Note Added":r.noteAt ? new Date(r.noteAt).toLocaleString() : "—",
      "Requested Check-In":fmt(r.reg?.regCheckIn),
      "Requested Check-Out":fmt(r.reg?.regCheckOut),
      "Car Pickup":fmt(r.car?.pickupDate),
      "Car Pickup Time":fmtTime(r.car?.pickupTime, timeFormat)||"—",
      "Flight Arrival":fmt(r.flight?.flightArrival),
      "Arrival Time":fmtTime(r.flight?.arrivalTime, timeFormat)||"—",
      "Arrival Airport":(r.flight?.arrivalAirport||r.flight?.airport||"").toUpperCase()||"—",
      "Flight In":r.flight?.flightIn||"—",
      "Hotel":r.hotel?.hotel||"—",
      "Hotel Check-In":fmt(r.hotel?.checkIn),
      "Arrival Δ":r.details?.arrDiff??"N/A",
      "Hotel Check-Out":fmt(r.hotel?.checkOut),
      "Departure Δ":r.details?.depDiff??"N/A",
      "Room":r.hotel?.room||"—",
      "Flight Departure":fmt(r.flight?.flightDeparture),
      "Departure Time":fmtTime(r.flight?.departureTime, timeFormat)||"—",
      "Departure Airport":(r.flight?.departureAirport||r.flight?.airport||"").toUpperCase()||"—",
      "Flight Out":r.flight?.flightOut||"—",
      "Car Dropoff":fmt(r.car?.dropoffDate),
      "Car Dropoff Time":fmtTime(r.car?.dropoffTime, timeFormat)||"—",
      "Company":r.reg?.company||"—",
      "Job Title":r.reg?.jobTitle||"—",
      "Dietary":r.diet?.dietary||r.reg?.dietaryRequest||"—",
      "Accessibility":r.diet?.accessibility||"—"
    }));
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
      if (val === null || val === undefined) return "—";
      if (val === 0) return '<span style="color:#0D9E6E;font-weight:600;">On time</span>';
      const days = Math.abs(val), word = days === 1 ? "day" : "days", dir = val > 0 ? "late" : "early";
      return '<span style="color:' + (days <= 1 ? "#C97A0A" : "#C0392B") + ';font-weight:600;">' + days + " " + word + " " + dir + "</span>";
    }
    function sCell(val) { return val || "—"; }
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
        ? '<td style="padding:10px 12px;font-size:12px;color:#4A5568;font-style:italic;">' + r.note + "</td>"
        : '<td style="padding:10px 12px;color:#B8C0D8;">—</td>';
      guestRows += '<tr style="border-bottom:1px solid #DDE2EF;' + (r.status === "error" ? "background:#FDECEC;" : "") + '">'
        + '<td style="padding:10px 12px;font-weight:600;white-space:nowrap;">' + r.displayName + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;color:#4A5568;">' + sCell(r.email) + "</td>"
        + '<td style="padding:10px 12px;">' + sBadge(r.status) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + (r.flight ? fmt(r.flight.flightArrival) + (r.flight.arrivalTime ? '<div style="font-size:11px;color:#7E8BA8;">' + fmtTime(r.flight.arrivalTime, timeFormat) + '</div>' : "") : missingCell()) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;color:#4A5568;font-weight:600;">' + ((r.flight && (r.flight.arrivalAirport||r.flight.airport)) ? (r.flight.arrivalAirport||r.flight.airport).toUpperCase() : "—") + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + (r.hotel ? fmt(r.hotel.checkIn) : missingCell()) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + sDelta(r.details && r.details.arrDiff) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + (r.flight ? fmt(r.flight.flightDeparture) + (r.flight.departureTime ? '<div style="font-size:11px;color:#7E8BA8;">' + fmtTime(r.flight.departureTime, timeFormat) + '</div>' : "") : missingCell()) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;color:#4A5568;font-weight:600;">' + ((r.flight && (r.flight.departureAirport||r.flight.airport)) ? (r.flight.departureAirport||r.flight.airport).toUpperCase() : "—") + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + (r.hotel ? fmt(r.hotel.checkOut) : missingCell()) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + sDelta(r.details && r.details.depDiff) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + issueHtml + "</td>"
        + noteCell
        + "</tr>";
    }

    // ── diet rows ──
    var dietRows = "";
    var dietGuests = SHOW_DIETARY ? results.filter(function(r) { return r.diet && (r.diet.dietary || r.diet.accessibility || r.diet.specialNotes); }) : [];
    for (var di = 0; di < dietGuests.length; di++) {
      var dr = dietGuests[di];
      dietRows += '<tr style="border-bottom:1px solid #DDE2EF;">'
        + '<td style="padding:10px 12px;font-weight:600;">' + dr.displayName + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + sCell(dr.diet.dietary) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + sCell(dr.diet.accessibility) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;color:#4A5568;font-style:italic;">' + sCell(dr.diet.specialNotes) + "</td>"
        + "</tr>";
    }

    // ── summary cards ──
    var summaryCards = [
      { label:"Total Guests",   val:results.length,                                    color:"#0C1E3F", bg:"white" },
      { label:"Fully Aligned",  val:aligned.length,                                    color:"#0D9E6E", bg:"#E3F7F0" },
      { label:"Action Needed",  val:flagged.length, color:"#C0392B", bg:"#FDECEC" },
      { label:"Alignment Rate", val:Math.round(aligned.length / results.length * 100) + "%", color:"#00A896", bg:"#E0FAF7" },
    ];
    var cardsHtml = "";
    for (var ci = 0; ci < summaryCards.length; ci++) {
      var sc = summaryCards[ci];
      cardsHtml += '<div style="background:' + sc.bg + ';border:1px solid #DDE2EF;border-radius:10px;padding:18px 20px;">'
        + '<div style="font-size:13px;color:#7E8BA8;margin-bottom:6px;">' + sc.label + "</div>"
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
      if (localCounts.duplicate > 0) chips += '<div style="background:#FEF2DC;border-radius:8px;padding:10px 16px;"><div style="font-size:12px;color:#C97A0A;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Duplicates</div><div style="font-size:22px;font-weight:700;color:#C97A0A;">' + localCounts.duplicate + "</div></div>";
      issueBreakdown = '<div style="background:white;border:1px solid #DDE2EF;border-radius:10px;padding:20px 24px;margin-bottom:24px;"><div style="font-size:15px;font-weight:700;margin-bottom:14px;color:#0C1E3F;">Issue Breakdown</div><div style="display:flex;gap:12px;flex-wrap:wrap;">' + chips + "</div></div>";
    }

    // ── contacts block ──
    var contactsBlock = "";
    if (contacts.hotel.email || contacts.travel.email) {
      var hotelDiv = contacts.hotel.email
        ? '<div style="background:#F0F2F7;border-radius:8px;padding:14px 16px;">'
          + '<div style="font-size:11px;font-weight:600;color:#7E8BA8;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Hotel Contact</div>'
          + (contacts.hotel.name ? '<div style="font-weight:600;margin-bottom:2px;">' + contacts.hotel.name + "</div>" : "")
          + (contacts.hotel.property ? '<div style="font-size:13px;color:#4A5568;">' + contacts.hotel.property + "</div>" : "")
          + (contacts.hotel.email ? '<div style="font-size:13px;color:#4C62C4;margin-top:4px;">' + contacts.hotel.email + "</div>" : "")
          + (contacts.hotel.phone ? '<div style="font-size:13px;color:#4A5568;">' + contacts.hotel.phone + "</div>" : "")
          + "</div>" : "";
      var travelDiv = contacts.travel.email
        ? '<div style="background:#F0F2F7;border-radius:8px;padding:14px 16px;">'
          + '<div style="font-size:11px;font-weight:600;color:#7E8BA8;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Travel Agency</div>'
          + (contacts.travel.name ? '<div style="font-weight:600;margin-bottom:2px;">' + contacts.travel.name + "</div>" : "")
          + (contacts.travel.agency ? '<div style="font-size:13px;color:#4A5568;">' + contacts.travel.agency + "</div>" : "")
          + (contacts.travel.email ? '<div style="font-size:13px;color:#4C62C4;margin-top:4px;">' + contacts.travel.email + "</div>" : "")
          + (contacts.travel.phone ? '<div style="font-size:13px;color:#4A5568;">' + contacts.travel.phone + "</div>" : "")
          + "</div>" : "";
      contactsBlock = '<div style="background:white;border:1px solid #DDE2EF;border-radius:10px;padding:20px 24px;margin-bottom:24px;"><div style="font-size:15px;font-weight:700;margin-bottom:14px;color:#0C1E3F;">Event Contacts</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;">' + hotelDiv + travelDiv + "</div></div>";
    }

    // ── diet table ──
    var dietSection = "";
    if (dietRows) {
      dietSection = '<div style="background:white;border:1px solid #DDE2EF;border-radius:10px;overflow:hidden;margin-bottom:24px;">'
        + '<div style="background:#0A7B7A;padding:14px 20px;"><span style="font-size:14px;font-weight:600;color:white;">Dietary &amp; Accessibility Requirements</span></div>'
        + '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead>'
        + '<tr style="background:#DCF2F2;border-bottom:1px solid #DDE2EF;">'
        + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#0A7B7A;text-transform:uppercase;letter-spacing:0.04em;">Guest</th>'
        + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#0A7B7A;text-transform:uppercase;letter-spacing:0.04em;">Dietary</th>'
        + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#0A7B7A;text-transform:uppercase;letter-spacing:0.04em;">Accessibility</th>'
        + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#0A7B7A;text-transform:uppercase;letter-spacing:0.04em;">Notes</th>'
        + "</tr></thead><tbody>" + dietRows + "</tbody></table></div></div>";
    }

    // ── travel window line ──
    var windowLine = (arrivalStart && arrivalEnd)
      ? '<div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:4px;">Travel window: ' + arrivalStart + " – " + (departureEnd || arrivalEnd) + "</div>"
      : "";
    var plannerLine = contacts.plannerName
      ? '<div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:2px;">Prepared by ' + contacts.plannerName + "</div>"
      : "";

    // ── assemble final HTML ──
    var html = "<!DOCTYPE html>"
      + '<html lang="en"><head>'
      + '<meta charset="UTF-8"/>'
      + '<meta name="viewport" content="width=device-width,initial-scale=1"/>'
      + "<title>GroupGrid Report — " + evName + "</title>"
      + '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Poppins:wght@500;600;700&display=swap" rel="stylesheet"/>'
      + "<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'IBM Plex Sans',sans-serif;background:#F0F2F7;color:#0C1E3F;font-size:14px;-webkit-font-smoothing:antialiased;}a{color:inherit;text-decoration:none;}@media print{body{background:white;}.no-print{display:none!important;}table{page-break-inside:auto;}tr{page-break-inside:avoid;}}</style>"
      + "</head><body>"
      + '<div style="max-width:1100px;margin:0 auto;padding:32px 24px;">'

      // header
      + '<div style="background:#0C1E3F;border-radius:12px;padding:28px 32px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">'
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
      + '<div style="background:white;border:1px solid #DDE2EF;border-radius:10px;overflow:hidden;margin-bottom:24px;">'
      + '<div style="background:#0C1E3F;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;">'
      + '<span style="font-size:14px;font-weight:600;color:white;">All Guests</span>'
      + '<span style="font-size:13px;color:rgba(255,255,255,0.5);">' + results.length + " total · " + flagged.length + " flagged</span>"
      + "</div>"
      + '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead>'
      + '<tr style="background:#EEF1F8;border-bottom:1px solid #DDE2EF;">'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Guest</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;">Email</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;">Status</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Flight In</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Arr Apt</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Check-In</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;">Δ Arr</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Flight Out</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Dep Apt</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Check-Out</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;">Δ Dep</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;">Flags</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;">Note</th>'
      + "</tr></thead><tbody>" + guestRows + "</tbody></table></div></div>"

      // diet section
      + dietSection

      // contacts
      + contactsBlock

      // footer
      + '<div style="text-align:center;padding:20px;font-size:12px;color:#B8C0D8;">Generated by Group<span style="color:#00C9B1;">Grid</span> · ' + dateStr + " · Data processed locally — not stored on any server</div>"
      + "</div></body></html>";

    var filename = "GroupGrid-Report-" + (eventName || "Event").replace(/\s+/g, "-") + "-" + new Date().toISOString().slice(0, 10) + ".html";
    setShareModal({ html, filename });
  }

  const filtered = (results || []).filter(r => {
    if (search && !r.displayName.toLowerCase().includes(search.toLowerCase()) && !r.email.includes(search.toLowerCase())) return false;
    if (filter === "issues") return r.status !== "ok";
    if (filter === "missing") return r.issues.some(x => x.type === "missing");
    if (filter === "window") return r.issues.some(x => x.type === "window");
    if (filter === "mismatch") return r.issues.some(x => x.type === "mismatch");
    if (filter === "duplicate") return r.issues.some(x => x.type === "duplicate");
    if (filter === "unregistered") return r.issues.some(x => x.type === "unregistered");
    if (filter === "airport") return r.issues.some(x => x.type === "airport");
    if (filter === "earlyarrival") return r.issues.some(x => x.type === "earlyarrival");
    if (filter === "earlydeparture") return r.issues.some(x => x.type === "earlydeparture");
    if (filter === "abstractunreg") return r.issues.some(x => x.type === "abstract_unreg");
    if (filter === "typerule") return r.issues.some(x => x.type === "typerule");
    if (["ok","warn","error"].includes(filter)) return r.status === filter;
    return true;
  });

  const counts = results ? { total:results.length, ok:results.filter(r=>r.status==="ok").length, flagged:results.filter(r=>r.status!=="ok").length, warn:results.filter(r=>r.status==="warn").length, error:results.filter(r=>r.status==="error").length, missing:results.filter(r=>r.issues.some(x=>x.type==="missing")).length, window:results.filter(r=>r.issues.some(x=>x.type==="window")).length, mismatch:results.filter(r=>r.issues.some(x=>x.type==="mismatch")).length, duplicate:results.filter(r=>r.issues.some(x=>x.type==="duplicate")).length, unregistered:results.filter(r=>r.issues.some(x=>x.type==="unregistered")).length, airport:results.filter(r=>r.issues.some(x=>x.type==="airport")).length, earlyarrival:results.filter(r=>r.issues.some(x=>x.type==="earlyarrival")).length, earlydeparture:results.filter(r=>r.issues.some(x=>x.type==="earlydeparture")).length, abstractunreg:results.filter(r=>r.issues.some(x=>x.type==="abstract_unreg")).length, typerule:results.filter(r=>r.issues.some(x=>x.type==="typerule")).length, dietary:results.filter(r=>r.diet?.dietary||r.diet?.accessibility).length } : null;

  const hasCars = results?.some(r => r.car);
  const paramsDirty = !!results && !!lastRunSig && lastRunSig !== JSON.stringify({ arrivalStart, arrivalEnd, departureStart, departureEnd, preferredAirports, departureAirports, arrivalCutoff, departureCutoff, lateArrivalCutoff, typeRules, eventName });
  const hasDiet = SHOW_DIETARY && results?.some(r => r.diet);
  const hasHotelNames = results?.some(r => r.hotel?.hotel && r.hotel.hotel.trim());
  const uploadedCount = [registrationFile, flightFile, hotelFile, carFile, dietaryFile].filter(Boolean).length + [...extraHotels, ...extraFlights, ...extraCars, ...extraReg, ...extraDietary].filter(h=>h.file).length;
  const ready = uploadedCount >= 2;


  return (
    <div style={{ minHeight:"100vh", width:"100%", maxWidth:"100vw", overflowX:"clip", background:"#F0F2F7", fontFamily:font, fontSize:"15px", WebkitFontSmoothing:"antialiased", boxSizing:"border-box" }}>
      <GlobalStyles />
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Poppins:wght@500;600;700&display=swap" rel="stylesheet" />

      {/* ── Mobile sidebar overlay ── */}
      {isMobile && sidebarOpen && (
        <div className="gg-sidebar-overlay" onClick={() => setSidebarOpen(false)}
          style={{ position:"fixed", top:"52px", left:0, right:0, bottom:0, background:"rgba(15,31,61,0.6)", zIndex:199, backdropFilter:"blur(2px)" }} />
      )}

      {emailModal && <EmailModal record={emailModal} eventName={eventName} contacts={contacts} onClose={() => setEmailModal(null)} />}
      {loginOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:4000, display:"flex", alignItems:"center", justifyContent:"flex-end" }}>
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
                setPage("app");
              }} onClose={() => setLoginOpen(false)} />
          </div>
        </div>
      )}
      {contactsOpen && <ContactsModal contacts={contacts} onSave={setContacts} onClose={() => setContactsOpen(false)} />}
      {supportOpen && <SupportModal user={user} onClose={() => setSupportOpen(false)} />}
      {shareModal && <ShareModal html={shareModal.html} filename={shareModal.filename} onClose={() => setShareModal(null)} />}

      {/* ── Page overlays ── */}
      {(() => {
        const nav = { onHome:() => setPage("landing"), onPricing:() => setPage("pricing"), onAbout:() => setPage("about"), onFaq:() => setPage("faq"), onContact:() => setPage("contact"), onPrivacy:() => setPage("privacy"), onTerms:() => setPage("terms"), onApp:enterApp, current:page };
        return (<>
      {(page === "landing" || (!user && page === "app")) && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowX:"hidden", overflowY:"auto", overscrollBehavior:"none", WebkitOverflowScrolling:"touch" }}><LandingPage onEnter={enterApp} onPricing={() => setPage("pricing")} onAbout={() => setPage("about")} onContact={() => setPage("contact")} onPrivacy={() => setPage("privacy")} onTerms={() => setPage("terms")} onFaq={() => setPage("faq")} /></div>}
      {page === "pricing" && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowX:"hidden", overflowY:"auto", overscrollBehavior:"none", WebkitOverflowScrolling:"touch" }}><PricingPage onBack={() => setPage("landing")} nav={nav} user={user} /></div>}
      {page === "about"   && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowX:"hidden", overflowY:"auto", overscrollBehavior:"none", WebkitOverflowScrolling:"touch" }}><AboutPage   onBack={() => setPage("landing")} nav={nav} /></div>}
      {page === "faq"     && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowX:"hidden", overflowY:"auto", overscrollBehavior:"none", WebkitOverflowScrolling:"touch" }}><FAQPage     onBack={() => setPage("landing")} nav={nav} /></div>}
      {page === "contact" && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowX:"hidden", overflowY:"auto", overscrollBehavior:"none", WebkitOverflowScrolling:"touch" }}><ContactPage onBack={() => setPage("landing")} nav={nav} /></div>}
      {page === "privacy" && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowX:"hidden", overflowY:"auto", overscrollBehavior:"none", WebkitOverflowScrolling:"touch" }}><PrivacyPage onBack={() => setPage("landing")} nav={nav} /></div>}
      {page === "terms"   && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowX:"hidden", overflowY:"auto", overscrollBehavior:"none", WebkitOverflowScrolling:"touch" }}><TermsPage   onBack={() => setPage("landing")} nav={nav} /></div>}
        </>);
      })()}

      {/* Checking subscription access — brief, shows once right after sign-in */}
      {user && subscription === undefined && (
        <div style={{ minHeight:"100vh", background:P.navy, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:font }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ width:40, height:40, border:`3px solid rgba(255,255,255,0.1)`, borderTop:`3px solid ${P.accent}`, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 16px" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:"15px" }}>Checking your account…</div>
          </div>
        </div>
      )}

      {/* Signed in, but no active subscription (and not comped) — subscribe gate */}
      {user && subscription && !subscription.hasAccess && (
        <div style={{ minHeight:"100vh", background:P.offWhite, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:font, padding:"24px" }}>
          <div style={{ background:P.white, borderRadius:"16px", border:`1px solid ${P.grey100}`, padding:"40px 36px", maxWidth:"420px", textAlign:"center", boxShadow:"0 8px 40px rgba(12,30,63,0.1)" }}>
            <div style={{ fontSize:"20px", fontWeight:700, color:P.navy, fontFamily:fontDisplay, marginBottom:"10px" }}>Subscription required</div>
            <div style={{ fontSize:"16px", color:P.grey600, lineHeight:1.6, marginBottom:"24px" }}>
              {subscription.status === "past_due"
                ? "There's an issue with your last payment. Please update your billing details to keep using GroupGrid."
                : "Your account doesn't have an active subscription yet. Subscribe to start using GroupGrid."}
            </div>
            <Btn onClick={() => setPage("pricing")} color={P.accent}>{subscription.status === "past_due" ? "Update billing" : "View plans"}</Btn>
            <div style={{ marginTop:"18px" }}>
              <button onClick={onLogout} style={{ background:"transparent", border:"none", color:P.grey600, fontSize:"15px", fontFamily:font, cursor:"pointer", textDecoration:"underline" }}>Sign out</button>
            </div>
          </div>
        </div>
      )}

      {/* App shell — only rendered for signed-in users with active access. Logged-out visitors see marketing pages above. */}
      {user && subscription?.hasAccess && (<>
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
          <BrandLogo height={isMobile ? 28 : 40} onDark={true} />
            {!isMobile && <button onClick={() => setPage("landing")} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"7px", padding:"4px 12px", fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.45)", fontFamily:font, cursor:"pointer", letterSpacing:"0.03em" }}>← Home</button>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          {saveMsg && <span style={{ fontSize:"15px", color:P.accent, fontFamily:font, fontWeight:600 }}>✓ {saveMsg}</span>}
          <div className="gg-header-extras" style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          {results && (
            <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <Btn onClick={saveSession} small color={P.accent}>Save Project</Btn>
            </div>
          )}
          <div style={{ width:1, height:16, background:"rgba(255,255,255,0.15)", marginLeft:"2px" }} />
          {user ? (
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg, ${P.periwinkle}, ${P.periwinkleD})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", fontWeight:800, color:P.white, fontFamily:font, flexShrink:0, cursor:"default" }} title={user.email}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize:"15px", color:"rgba(255,255,255,0.75)", fontFamily:font, fontWeight:700 }}>{user.name}</span>
              <button onClick={onLogout} style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"8px", padding:"4px 10px", fontSize:"15px", fontWeight:700, fontFamily:font, color:"rgba(255,255,255,0.4)", cursor:"pointer" }}>Sign out</button>
            </div>
          ) : (
            <button onClick={() => setLoginOpen(true)} style={{ display:"flex", alignItems:"center", gap:"8px", background:P.accent, border:"none", borderRadius:"8px", padding:"7px 16px", cursor:"pointer", fontFamily:font, boxShadow:"0 1px 8px rgba(0,201,177,0.3)" }}>
              <span style={{ fontSize:"15px", fontWeight:500, color:P.white, letterSpacing:"0em" }}>Sign In</span>
            </button>
          )}
          </div>
          {/* Mobile: auth control always visible — Sign In when logged out, account + Sign out when logged in */}
          {isMobile && !user && (
            <button onClick={() => setLoginOpen(true)} style={{ background:P.accent, border:"none", borderRadius:"8px", padding:"6px 14px", cursor:"pointer", fontFamily:font }}>
              <span style={{ fontSize:"15px", fontWeight:600, color:P.white }}>Sign In</span>
            </button>
          )}
          {isMobile && user && (
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <div title={user.email} style={{ width:28, height:28, borderRadius:"50%", background:P.accentD, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:"15px", fontWeight:700, color:P.white, fontFamily:font, textTransform:"uppercase" }}>{(user.name || user.email || "?").trim().charAt(0)}</div>
              <button onClick={onLogout} style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.2)", borderRadius:"8px", padding:"6px 12px", cursor:"pointer", fontFamily:font }}>
                <span style={{ fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.7)" }}>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display:"flex", flex:1, width:"100%", minHeight:`calc(100vh - ${isMobile && results ? "104px" : "52px"})`, alignItems:"stretch" }}>

        {/* ── Left Sidebar / Mobile Drawer ── */}
        <div className={`gg-sidebar${isMobile && sidebarOpen ? " open" : ""}`}
          style={{ width:224, flexShrink:0, background:P.navy, borderRight:`1px solid rgba(255,255,255,0.07)`, display:"flex", flexDirection:"column", padding:"20px 14px", overflowY:"auto", position: isMobile ? "fixed" : "relative", left: isMobile ? 0 : undefined, top: isMobile ? "52px" : 0, height: isMobile ? "calc(100vh - 52px)" : "auto", minHeight: isMobile ? undefined : `calc(100vh - 52px)`, alignSelf:"stretch", zIndex: isMobile ? 250 : "auto", transform: isMobile ? (sidebarOpen ? "translateX(0)" : "translateX(-100%)") : "none", transition: isMobile ? "transform 0.25s ease" : "none", boxShadow: isMobile && sidebarOpen ? "4px 0 24px rgba(0,0,0,0.35)" : "none" }}>

          {/* Mobile drawer close */}
          {isMobile && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
              <span style={{ fontSize:"16px", fontWeight:700, color:"rgba(255,255,255,0.5)", letterSpacing:"0.08em", textTransform:"uppercase" }}>Menu</span>
              <button onClick={() => setSidebarOpen(false)} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"8px", width:30, height:30, cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X size={14} strokeWidth={1.8}/>
              </button>
            </div>
          )}


          {/* ── Projects section ── */}
          <div style={{ marginTop:"18px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px", paddingLeft:"4px" }}>
              <span style={{ fontSize:"16px", fontWeight:700, color:P.white, letterSpacing:"0.03em", textTransform:"uppercase" }}>Projects</span>
              {(user || savedSessions.length > 0) && (
                <span style={{ fontSize:"15px", color: user ? P.accent : "rgba(255,255,255,0.35)", fontWeight:600 }}>{user ? `Synced` : "Local only"}</span>
              )}
            </div>

            {/* New project button */}
            <button onClick={() => {
                // Notes and resolved flags live with the project. Starting fresh clears them,
                // so warn if there's unsaved work first — the user can Save, then reopen to get notes back.
                const hasWork = results && (Object.keys(meta||{}).length > 0 || eventName || projectName);
                if (hasWork && !window.confirm("Start a new project? Your current notes and resolved flags will be cleared from this screen. To keep them, click Cancel, then use Save Now first — you can reopen this project anytime to get them back.")) return;
                setResults(null); setFlightFile(null); setHotelFile(null); setCarFile(null); setDietaryFile(null); setRegistrationFile(null); setEventName(""); setProjectName(""); setMeta({}); setPreferredAirports(""); setDepartureAirports(""); setArrivalCutoff(""); setDepartureCutoff(""); setLastRunSig(""); setFilter("all"); setSearch(""); setExpanded(null); setActiveTab("grid"); setShowSetup(false); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:"rgba(255,255,255,0.07)", border:`1px dashed rgba(255,255,255,0.18)`, borderRadius:"8px", padding:"7px 10px", cursor:"pointer", marginBottom:"6px", fontFamily:font, transition:"all 0.15s", textAlign:"left" }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.12)"}
              onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.07)"}>
              <div style={{ width:24, height:24, borderRadius:"6px", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", flexShrink:0, color:P.white, fontWeight:900 }}>+</div>
              <div>
                <div style={{ fontSize:"15px", fontWeight:800, color:P.white, fontFamily:font }}>New Project</div>
                <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.4)", fontFamily:font }}>Start fresh</div>
              </div>
            </button>

            {/* Current unsaved / active project */}
            {(flightFile || results) && !savedSessions.some(s => s.name === (projectName||eventName) && (projectName||eventName)) && (
              <div style={{ display:"flex", alignItems:"center", gap:"8px", background:"rgba(0,201,177,0.12)", border:`1px solid rgba(0,201,177,0.3)`, borderRadius:"8px", padding:"7px 10px", marginBottom:"4px" }}>
                <div style={{ width:24, height:24, borderRadius:"6px", background:P.accent, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:P.navy }} />
                </div>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:"15px", fontWeight:800, color:P.white, fontFamily:font, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{projectName || eventName || "Unsaved Project"}</div>
                  <div style={{ fontSize:"15px", color:P.accent, fontFamily:font }}>{results ? `${results.length} guests · ${results.filter(r=>r.status!=="ok").length} flags` : "Active"}</div>
                </div>
                <span style={{ fontSize:"15px", background:P.accent, color:P.navy, padding:"2px 6px", borderRadius:"20px", fontFamily:font, fontWeight:800, flexShrink:0 }}>Active</span>
              </div>
            )}

            {/* Saved projects — most recent first */}
            {savedSessions.length > 0 && (
              <div style={{ marginTop:"4px" }}>
                {savedSessions.map((s, idx) => {
                  const isActive = (projectName||eventName) === (s.projectName||s.eventName) && (s.projectName||s.eventName);
                  const color = `hsl(${(idx * 67 + 200) % 360},55%,42%)`;
                  return (
                    <button key={s.id}
                      onClick={() => {
                        setMeta(s.meta||{}); setProjectName(s.projectName||s.eventName||""); setEventName(s.eventName||"");
                        setArrivalStart(s.arrivalStart||""); setArrivalEnd(s.arrivalEnd||"");
                        setDepartureStart(s.departureStart||""); setDepartureEnd(s.departureEnd||"");
                        setPreferredAirports(s.preferredAirports||"");
                        setDepartureAirports(s.departureAirports||"");
                        setArrivalCutoff(s.arrivalCutoff||"");
                        setDepartureCutoff(s.departureCutoff||"");
                        setLateArrivalCutoff(s.lateArrivalCutoff ?? "22:30");
                        setTypeRules(s.typeRules || []);
                        if (s.results && s.results.length) { setResults(rehydrateResults(s.results)); setActiveTab("grid"); setFilter("all"); setExpanded(null); setShowSetup(false); }
                        else { setResults(null); setSaveMsg("This project was saved before full data was stored — re-upload its files to view it."); setTimeout(()=>setSaveMsg(""), 5000); }
                        if (isMobile) setSidebarOpen(false);
                      }}
                      style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:isActive?"rgba(255,255,255,0.1)":"transparent", border:`1.5px solid ${isActive?"rgba(255,255,255,0.15)":"transparent"}`, borderRadius:"10px", padding:"7px 8px", cursor:"pointer", marginBottom:"2px", fontFamily:font, transition:"all 0.12s", textAlign:"left" }}
                      onMouseEnter={e => !isActive && (e.currentTarget.style.background="rgba(255,255,255,0.07)")}
                      onMouseLeave={e => !isActive && (e.currentTarget.style.background="transparent")}>
                      <div style={{ width:24, height:24, borderRadius:"6px", background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", flexShrink:0, color:"white", fontWeight:800 }}>
                        {(s.name||"?").charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:"15px", fontWeight:800, color:P.white, fontFamily:font, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</div>
                        <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.4)", fontFamily:font }}>{s.guestCount} guests · {s.issueCount} flags</div>
                      </div>
                      {results && <button onClick={e => { e.stopPropagation(); setCompareSession(s); setShowDiff(true); setActiveTab("grid"); }} style={{ background:"rgba(255,255,255,0.12)", border:`1px solid rgba(255,255,255,0.2)`, borderRadius:"5px", padding:"2px 7px", fontSize:"15px", color:P.white, fontWeight:700, fontFamily:font, cursor:"pointer", marginRight:"4px" }}>↔ Diff</button>}
                      <button onClick={e => { e.stopPropagation(); exportSession(s); }} title="Download project file"
                        style={{ background:"transparent", border:"none", color:"rgba(255,255,255,0.3)", fontSize:"15px", cursor:"pointer", padding:"2px 5px", flexShrink:0, lineHeight:1, borderRadius:"4px" }}
                        onMouseEnter={e => { e.currentTarget.style.color = P.white; e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; e.currentTarget.style.background = "transparent"; }}>↓</button>
                      <button onClick={e => { e.stopPropagation(); setSavedSessions(prev => { const next = prev.filter(x => x.id !== s.id); try { storage.set(storageKey, JSON.stringify(next)); } catch(ex) {} return next; }); }}
                        style={{ background:"transparent", border:"none", color:"rgba(255,255,255,0.2)", fontSize:"15px", cursor:"pointer", padding:"2px 4px", flexShrink:0, lineHeight:1, borderRadius:"4px" }}
                        onMouseEnter={e => { e.currentTarget.style.color = P.red; e.currentTarget.style.background = "rgba(192,57,43,0.2)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.2)"; e.currentTarget.style.background = "transparent"; }}
                        title="Remove">✕</button>
                    </button>
                  );
                })}
              </div>
            )}

            <label style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"7px", width:"100%", marginTop:"8px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:"8px", padding:"7px 10px", cursor:"pointer", fontFamily:font }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}>
              <input type="file" accept=".ggproj,.json,application/json" style={{ display:"none" }} onChange={e => { if (e.target.files[0]) { importSessionFile(e.target.files[0]); e.target.value = ""; } }} />
              <FileSpreadsheet size={13} strokeWidth={1.8} color="rgba(255,255,255,0.6)"/>
              <span style={{ fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.6)" }}>Load project from file</span>
            </label>

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
            <div style={{ fontSize:"17px", fontWeight:600, color:"rgba(255,255,255,0.5)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"8px", paddingLeft:"2px" }}>Views</div>
            {[
              { k:"grid", icon:<GridIcon size={16} line="rgba(255,255,255,0.85)"/>, label:"Group Grid", badge: null },
              { k:"summary", icon:<BarChart2 size={15} strokeWidth={1.8}/>, label:"Summary", badge: results.filter(r=>r.status!=="ok").length > 0 ? results.filter(r=>r.status!=="ok").length : null },
              { k:"comms", icon:<Mail size={15} strokeWidth={1.8}/>, label:"Communications", badge: (() => { const n = results.filter(r => r.email && (r.issues||[]).filter(x=>!(r.resolved||[]).includes(x.text)).length > 0).length; return n > 0 ? n : null; })() },
              { k:"reports", icon:<SpreadsheetIcon size={16} line="rgba(255,255,255,0.85)" accent={P.accent}/>, label:"Reporting", badge: null },
            ].map(({ k, icon, label, badge }) => (
              <button key={k} onClick={() => { setActiveTab(k); if (isMobile) setSidebarOpen(false); }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:"10px", background:activeTab===k?"rgba(0,201,177,0.18)":"transparent", border:`1px solid ${activeTab===k?"rgba(0,201,177,0.35)":"transparent"}`, borderRadius:"7px", padding:"7px 10px", cursor:"pointer", marginBottom:"2px", textAlign:"left", transition:"all 0.15s" }}
                onMouseEnter={e => activeTab!==k && (e.currentTarget.style.background="rgba(255,255,255,0.07)")}
                onMouseLeave={e => activeTab!==k && (e.currentTarget.style.background="transparent")}>
                <span style={{ width:20, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:activeTab===k?P.accent:"rgba(255,255,255,0.45)" }}>{icon}</span>
                <span style={{ flex:1, fontSize:"15px", fontWeight:700, color:activeTab===k?P.accent:"rgba(255,255,255,0.7)", fontFamily:font }}>{label}</span>
                {badge && <span style={{ background:P.red, color:P.white, fontSize:"15px", fontWeight:800, padding:"1px 7px", borderRadius:"20px", flexShrink:0 }}>{badge}</span>}
              </button>
            ))}

            <div style={{ width:"100%", height:1, background:"rgba(255,255,255,0.08)", margin:"14px 0" }} />
            <div style={{ fontSize:"17px", fontWeight:600, color:"rgba(255,255,255,0.5)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"8px", paddingLeft:"2px" }}>Filters</div>
            {(() => {
              const alignedCount = results.filter(r=>r.status==="ok").length;
              const actionCount = results.filter(r=>r.status!=="ok").length;
              const mainFilters = [
                { k:"all", icon:"◉", label:"All Guests", count: results.length, color:null, indent:false },
                { k:"ok", icon:<ClearedIcon size={15} line="rgba(255,255,255,0.8)"/>, label:"Aligned", count: alignedCount, color:P.accent, indent:false },
                { k:"issues", icon:<FlagIcon size={15} line="rgba(255,255,255,0.8)"/>, label:"Action Needed", count: actionCount, color:P.red, indent:false },
              ];
              const subFilters = [
                { k:"missing", icon:"○", label:"Missing records", count: results.filter(r=>r.issues.some(x=>x.type==="missing")).length, color:P.amber, indent:true },
                { k:"window", icon:"🗓", label:"Outside dates", count: results.filter(r=>r.issues.some(x=>x.type==="window")).length, color:"#6B3FA0", indent:true },
                { k:"mismatch", icon:"⇄", label:"Date mismatches", count: results.filter(r=>r.issues.some(x=>x.type==="mismatch")).length, color:"#C0392B", indent:true },
                { k:"duplicate", icon:<AlertCircle size={13} strokeWidth={1.8}/>, label:"Duplicates", count: results.filter(r=>r.issues.some(x=>x.type==="duplicate")).length, color:"#C97A0A", indent:true },
              ].filter(f => f.count > 0);
              const renderBtn = ({ k, icon, label, count, color, indent }) => (
                <button key={k} onClick={() => { setFilter(k); setActiveTab("grid"); if (isMobile) setSidebarOpen(false); }}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:filter===k&&activeTab==="grid"?"rgba(0,201,177,0.15)":"transparent", border:`1px solid ${filter===k&&activeTab==="grid"?"rgba(0,201,177,0.3)":"transparent"}`, borderRadius:"7px", padding:"6px 10px", paddingLeft: indent ? "26px" : "10px", cursor:"pointer", marginBottom:"2px", textAlign:"left" }}
                  onMouseEnter={e => (filter!==k||activeTab!=="grid") && (e.currentTarget.style.background="rgba(255,255,255,0.07)")}
                  onMouseLeave={e => (filter!==k||activeTab!=="grid") && (e.currentTarget.style.background="transparent")}>
                  <span style={{ fontSize:"15px", color:color||"rgba(255,255,255,0.45)", width:16, textAlign:"center", flexShrink:0 }}>{icon}</span>
                  <span style={{ flex:1, fontSize: indent ? "13px" : "15px", fontWeight:filter===k&&activeTab==="grid"?600:400, color:filter===k&&activeTab==="grid"?P.accent:(indent?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.65)"), fontFamily:font }}>{label}</span>
                  <span style={{ fontSize:"15px", fontWeight:600, color:filter===k&&activeTab==="grid"?P.accent:"rgba(255,255,255,0.4)", fontFamily:font }}>{count}</span>
                </button>
              );
              return (<>
                {mainFilters.map(renderBtn)}
                {subFilters.length > 0 && (<>
                  <div style={{ fontSize:"15px", fontWeight:500, color:"rgba(255,255,255,0.3)", letterSpacing:"0.04em", margin:"8px 0 4px", paddingLeft:"10px" }}>Within Action Needed</div>
                  {subFilters.map(renderBtn)}
                </>)}
              </>);
            })()}
            <div style={{ width:"100%", height:1, background:"rgba(255,255,255,0.08)", margin:"14px 0" }} />
            <div style={{ fontSize:"17px", fontWeight:800, color:"rgba(255,255,255,0.5)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"8px", paddingLeft:"4px" }}>Export</div>
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
                <PeopleIcon size={14} line="rgba(255,255,255,0.55)" accent={P.accent}/>
                <span style={{ fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.4)" }}>Add contacts</span>
              </button>
            )}
          </>}

          {/* ── Manage billing + Contact support (signed-in users only) ── */}
          <div style={{ marginTop:"auto", paddingTop:"16px" }}>
            <button onClick={handleManageBilling} disabled={billingLoading} style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:"transparent", border:`1px solid rgba(255,255,255,0.12)`, borderRadius:"9px", padding:"8px 10px", cursor:billingLoading?"wait":"pointer", fontFamily:font, transition:"all 0.15s", marginBottom:"6px" }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              <FileSpreadsheet size={15} strokeWidth={1.8} color="rgba(255,255,255,0.55)" />
              <span style={{ fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.75)" }}>{billingLoading ? "Opening billing…" : "Manage billing"}</span>
            </button>
            {billingError && <div style={{ fontSize:"15px", color:"#FFB3AB", fontFamily:font, marginBottom:"6px" }}>{billingError}</div>}
            <button onClick={() => setSupportOpen(true)} style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:"transparent", border:`1px solid rgba(255,255,255,0.12)`, borderRadius:"9px", padding:"8px 10px", cursor:"pointer", fontFamily:font, transition:"all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              <PeopleIcon size={15} line="rgba(255,255,255,0.55)" accent={P.accent} />
              <span style={{ fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.75)" }}>Contact support</span>
            </button>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="gg-main" style={{ flex:1, minWidth:0, padding:isMobile ? "16px 14px" : "24px 28px", overflowY:"auto" }}>

        {/* ── Event Info TOP BAR (results state) — moved off the sidebar so the table gets full width ── */}
        {results && !showSetup && (
          <div className="gg-eventbar" style={{ display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap", background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"12px", padding:"12px 16px", marginBottom:"16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"11px", flex:"1 1 200px", minWidth:0 }}>
              <span style={{ width:4, height:34, background:P.accent, borderRadius:"3px", flexShrink:0 }} />
              <div style={{ display:"flex", flexDirection:"column", minWidth:0, flex:1 }}>
                <span style={{ fontSize:"18px", fontWeight:600, color:P.grey600, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"1px" }}>Event</span>
                <input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Name your event"
                  style={{ width:"100%", minWidth:0, background:"transparent", border:"none", fontSize:"22px", fontWeight:600, letterSpacing:"-0.02em", color:P.navy, fontFamily:font, outline:"none", padding:"0", lineHeight:1.15 }} />
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", flexShrink:0 }}>
            <div style={{ position:"relative", display:"flex" }}>
              <button onClick={() => setWindowOpen(!windowOpen)}
                style={{ display:"inline-flex", alignItems:"center", gap:"7px", height:"36px", background:hasWindow?P.periwinkle+"14":P.grey50, border:`1.5px solid ${hasWindow?P.periwinkle+"55":P.grey100}`, borderRadius:"9px", padding:"0 13px", fontSize:"17px", fontWeight:500, color:hasWindow?P.periwinkleD:P.grey600, fontFamily:font, cursor:"pointer", whiteSpace:"nowrap" }}>
                {hasWindow ? "Dates set" : "Approved travel dates"} <CalendarIcon size={15} line={hasWindow?P.periwinkleD:P.grey600} accent={P.accent}/>
              </button>
              {windowOpen && (
                <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:60, width:"260px", background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"12px", padding:"14px", boxShadow:"0 12px 32px rgba(15,29,53,0.16)" }}>
                  <div style={{ fontSize:"13px", color:P.grey600, fontFamily:font, marginBottom:"10px", lineHeight:1.5 }}>Flag guests arriving or departing outside these dates.</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                    {[
                      { label:"Earliest arrival", val:arrivalStart, set:setArrivalStart },
                      { label:"Latest arrival", val:arrivalEnd, set:setArrivalEnd },
                      { label:"Earliest departure", val:departureStart, set:setDepartureStart },
                      { label:"Latest departure", val:departureEnd, set:setDepartureEnd },
                    ].map(({ label, val, set }) => (
                      <div key={label}>
                        <div style={{ fontSize:"13px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"3px" }}>{label}</div>
                        <input type="date" value={val} onChange={e => set(e.target.value)}
                          style={{ width:"100%", background:P.grey50, border:`1.5px solid ${val?P.accent+"66":P.grey100}`, borderRadius:"8px", padding:"7px 9px", fontSize:"17px", fontFamily:font, color:val?P.navy:P.grey600, outline:"none", boxSizing:"border-box" }} />
                      </div>
                    ))}
                    <div style={{ display:"flex", gap:"8px", marginTop:"4px" }}>
                      {hasWindow && <button onClick={() => { setArrivalStart(""); setArrivalEnd(""); setDepartureStart(""); setDepartureEnd(""); }} style={{ flex:1, background:"transparent", border:`1px solid ${P.grey200}`, borderRadius:"7px", padding:"6px", color:P.grey600, fontSize:"13px", fontWeight:500, fontFamily:font, cursor:"pointer" }}>Clear</button>}
                      <button onClick={() => setWindowOpen(false)} style={{ flex:1, background:P.navy, border:"none", borderRadius:"7px", padding:"6px", color:P.white, fontSize:"15px", fontWeight:500, fontFamily:font, cursor:"pointer" }}>Done</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setContactsOpen(true)}
              style={{ display:"inline-flex", alignItems:"center", gap:"7px", height:"36px", background:(contacts.hotel.email||contacts.travel.email)?P.accent+"14":P.grey50, border:`1.5px solid ${(contacts.hotel.email||contacts.travel.email)?P.accent+"55":P.grey100}`, borderRadius:"9px", padding:"0 13px", fontSize:"17px", fontWeight:500, color:(contacts.hotel.email||contacts.travel.email)?P.accentD:P.grey600, fontFamily:font, cursor:"pointer", whiteSpace:"nowrap" }}>
              {(contacts.hotel.email||contacts.travel.email) ? "Contacts added" : "Contacts"} <PeopleIcon size={15} line={(contacts.hotel.email||contacts.travel.email)?P.accentD:P.grey600} accent={P.accent}/>
            </button>
            </div>
          </div>
        )}

        {results && !showSetup && (
          <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap", fontSize:"13px", color:P.grey600, fontFamily:font, margin:"-6px 0 16px", padding:"0 2px" }}>
            <CalendarIcon size={13} line={P.grey600} accent={P.accent} />
            <span>{hasWindow ? `${arrivalStart?fmt(parseDate(arrivalStart)):"—"} – ${departureEnd?fmt(parseDate(departureEnd)):"—"}` : "No travel window"}</span>
            <span style={{ color:P.grey200 }}>·</span>
            <span>{arrivalCutoff || departureCutoff ? `${arrivalCutoff?`Arr ${fmtTime(arrivalCutoff,"ampm")}`:""}${arrivalCutoff&&departureCutoff?" / ":""}${departureCutoff?`Dep ${fmtTime(departureCutoff,"ampm")}`:""}` : "No cutoff"}</span>
            <span style={{ color:P.grey200 }}>·</span>
            <span>{preferredAirports || departureAirports ? `${preferredAirports||"any"} → ${departureAirports||preferredAirports||"any"}` : "Any airport"}</span>
            <span style={{ color:P.grey200 }}>·</span>
            <span>{[registrationFile, flightFile, hotelFile, carFile, dietaryFile].filter(Boolean).length} files</span>
            <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"12px" }}>
              {paramsDirty && (
                <button onClick={runCheck} disabled={loading}
                  style={{ display:"inline-flex", alignItems:"center", gap:"7px", background:P.amber+"1A", border:`1.5px solid ${P.amber}66`, borderRadius:"9px", padding:"6px 13px", fontSize:"15px", fontWeight:600, color:"#C97A0A", fontFamily:font, cursor:loading?"wait":"pointer" }}>
                  <CrossCheckIcon size={14} line="#C97A0A" accent={P.amber} />
                  {loading ? "Re-running…" : "Re-run to update flags"}
                </button>
              )}
              <button onClick={() => setShowSetup(true)} style={{ background:"transparent", border:"none", color:P.periwinkleD, fontSize:"15px", fontWeight:600, fontFamily:font, cursor:"pointer", textDecoration:"underline" }}>Edit setup</button>
            </div>
          </div>
        )}
        {showSetup && results && (
          <div style={{ marginBottom:"12px" }}>
            <button onClick={() => setShowSetup(false)} style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:P.white, border:`1.5px solid ${P.grey200}`, borderRadius:"9px", padding:"7px 13px", fontSize:"16px", fontWeight:600, color:P.grey600, fontFamily:font, cursor:"pointer" }}>← Back to results</button>
          </div>
        )}
        {/* ── Upload hero — full size when no results, compact strip when results exist ── */}
        {(!results || showSetup) ? (
          <SetupScreen
            projectName={projectName} setProjectName={setProjectName}
            eventName={eventName} setEventName={setEventName}
            arrivalStart={arrivalStart} setArrivalStart={setArrivalStart}
            arrivalEnd={arrivalEnd} setArrivalEnd={setArrivalEnd}
            departureStart={departureStart} setDepartureStart={setDepartureStart}
            departureEnd={departureEnd} setDepartureEnd={setDepartureEnd}
            preferredAirports={preferredAirports} setPreferredAirports={setPreferredAirports}
            departureAirports={departureAirports} setDepartureAirports={setDepartureAirports}
            arrivalCutoff={arrivalCutoff} setArrivalCutoff={setArrivalCutoff}
            departureCutoff={departureCutoff} setDepartureCutoff={setDepartureCutoff}
            lateArrivalCutoff={lateArrivalCutoff} setLateArrivalCutoff={setLateArrivalCutoff}
            typeRules={typeRules} setTypeRules={setTypeRules}
            isReRun={!!results}
            contacts={contacts} setContacts={setContacts} setContactsOpen={setContactsOpen}
            registrationFile={registrationFile} setRegistrationFile={setRegistrationFile}
            flightFile={flightFile} setFlightFile={setFlightFile}
            hotelFile={hotelFile} setHotelFile={setHotelFile}
            hotelProperty={hotelProperty} setHotelProperty={setHotelProperty}
            extraHotels={extraHotels} setExtraHotels={setExtraHotels}
            extraFlights={extraFlights} setExtraFlights={setExtraFlights}
            extraCars={extraCars} setExtraCars={setExtraCars}
            extraReg={extraReg} setExtraReg={setExtraReg}
            extraDietary={extraDietary} setExtraDietary={setExtraDietary}
            carFile={carFile} setCarFile={setCarFile}
            dietaryFile={dietaryFile} setDietaryFile={setDietaryFile}
            abstractFile={abstractFile} setAbstractFile={setAbstractFile}
            ready={ready} loading={loading} error={error} runCheck={runCheck} isMobile={isMobile}
          />
        ) : (
          <div style={{ marginBottom:"16px", padding:"10px 14px", background:P.white, borderRadius:"12px", border:`1px solid ${P.grey100}` }}>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "auto auto auto auto auto auto auto auto", gap:"8px", alignItems:"center" }}>
              <UploadSquare label="Registration" icon={<PeopleIcon size={22} />} accent={P.accentD} file={registrationFile} setter={setRegistrationFile} sub="Required" compact />
              <UploadSquare label="Flight"  icon={<PlaneIcon size={22} />} accent={P.periwinkleD} file={flightFile}  setter={setFlightFile}   sub="" compact />
              <UploadSquare label="Hotel"   icon={<HotelIcon size={22} />} accent={P.navy}        file={hotelFile}   setter={setHotelFile}    sub="" compact />
              <UploadSquare label="Car"     icon={<CarIcon size={22} />}   accent={P.grey600}     file={carFile}     setter={setCarFile}     sub="" compact />
              {SHOW_DIETARY && <UploadSquare label="Dietary" icon={<Salad size={22} strokeWidth={1.8} color="#0D9E6E"/>} accent={P.teal}        file={dietaryFile} setter={setDietaryFile} sub="" compact />}
              {!isMobile && <div style={{ width:1, height:32, background:P.grey100, flexShrink:0 }} />}
              <button onClick={runCheck} disabled={!ready || loading}
                style={{ background:ready&&!loading?P.accent:P.grey100, color:ready&&!loading?P.white:P.grey600, border:"none", borderRadius:"7px", padding:"7px 16px", fontSize:"18px", fontWeight:600, fontFamily:font, cursor:ready&&!loading?"pointer":"not-allowed", transition:"all 0.18s", flexShrink:0, whiteSpace:"nowrap", boxShadow:ready&&!loading?"0 1px 6px rgba(0,201,177,0.3)":"none", gridColumn: isMobile ? "1 / -1" : "auto" }}>
                {loading ? "Checking…" : "Re-run Check"}
              </button>
            </div>
            {error && <div style={{ fontSize:"15px", color:P.red, fontFamily:font, background:P.redLight, borderRadius:"8px", padding:"5px 10px", marginTop:"8px" }}>{error}</div>}
            {results && <div style={{ fontSize:"15px", color:P.green, fontFamily:font, fontWeight:600, marginTop:"8px", textAlign: isMobile ? "center" : "right" }}>{results.length} guests · {results.filter(r=>r.status!=="ok").length} flags found</div>}
          </div>
        )}

        {/* Results */}
        {results && !showSetup && (<>

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
                        <span style={{ fontSize:"16px", color:P.grey600, fontFamily:font }}>{new Date(compareSession.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
                      </div>
                      <button onClick={() => { setShowDiff(false); setCompareSession(null); }} style={{ background:"transparent", border:"none", color:P.grey600, cursor:"pointer", fontSize:"18px", lineHeight:1 }}>×</button>
                    </div>
                    <div style={{ display:"flex", gap:"12px", flexWrap:"wrap" }}>
                      {[
                        { label:"New guests", val:diff.added.length, color:P.green, bg:P.greenLight, items:diff.added.map(r=>r.displayName) },
                        { label:"Removed", val:diff.removed.length, color:P.red, bg:P.redLight, items:diff.removed.map(r=>r.displayName) },
                        { label:"Issues changed", val:diff.changed.length, color:P.amber, bg:P.amberLight, items:diff.changed.map(d=>`${d.curr.displayName}: ${d.prev.issues.map(x=>x.text).join(", ")||"none"} → ${d.curr.issues.map(x=>x.text).join(", ")||"none"}`) },
                        { label:"Unchanged", val:diff.unchanged.length, color:P.grey600, bg:P.grey50, items:[] },
                      ].map(({label,val,color,bg,items}) => (
                        <div key={label} style={{ background:bg, border:`1px solid ${color}33`, borderRadius:"8px", padding:"10px 14px", minWidth:"110px" }}>
                          <div style={{ fontSize:"22px", fontWeight:700, color, fontFamily:fontDisplay }}>{val}</div>
                          <div style={{ fontSize:"15px", fontWeight:600, color, fontFamily:font }}>{label}</div>
                          {items.length > 0 && items.length <= 5 && <div style={{ marginTop:"6px", fontSize:"15px", color, fontFamily:font, lineHeight:1.6 }}>{items.map((x,i)=><div key={i} style={{ opacity:0.8 }}>• {x}</div>)}</div>}
                          {items.length > 5 && <div style={{ marginTop:"6px", fontSize:"15px", color, fontFamily:font, opacity:0.8 }}>• {items[0]}<br/>• {items[1]}<br/>+{items.length-2} more</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
          {activeTab === "reports" && (
            <div style={{ maxWidth:"860px" }}>
              <h2 style={{ fontSize:"20px", fontWeight:700, color:P.navy, fontFamily:fontDisplay, letterSpacing:"-0.02em", margin:"0 0 4px" }}>Reporting</h2>
              <p style={{ fontSize:"18px", color:P.grey600, fontFamily:font, margin:"0 0 20px", lineHeight:1.5 }}>Export a clean onsite itinerary, the full cross-check report, or build a custom report for a specific vendor.</p>

              <div style={{ background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"14px", padding:"20px 22px", marginBottom:"16px", boxShadow:"0 1px 2px rgba(12,30,63,0.04), 0 14px 30px -20px rgba(12,30,63,0.22)" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:"12px", marginBottom:"14px" }}>
                  <div style={{ width:40, height:40, borderRadius:"10px", background:P.navy, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><PeopleIcon size={20} line="rgba(255,255,255,0.95)" accent={P.accent} /></div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"16px", fontWeight:700, color:P.navy, fontFamily:font, marginBottom:"2px" }}>Onsite master itinerary</div>
                    <div style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.5 }}>Every attendee A to Z by last name, with their full flight, hotel, and car details on one row. Built to print or use onsite.</div>
                  </div>
                </div>
                <button onClick={exportOnsiteList} style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:P.accent, color:P.white, border:"none", borderRadius:"10px", padding:"11px 20px", fontSize:"15px", fontWeight:800, fontFamily:font, cursor:"pointer", boxShadow:"0 2px 12px rgba(0,201,177,0.35)" }}>Download onsite itinerary (Excel)</button>
              </div>

              <div style={{ background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"14px", padding:"20px 22px", marginBottom:"16px", boxShadow:"0 1px 2px rgba(12,30,63,0.04), 0 14px 30px -20px rgba(12,30,63,0.22)" }}>
                <div style={{ fontSize:"16px", fontWeight:700, color:P.navy, fontFamily:font, marginBottom:"2px" }}>Full cross-check report</div>
                <div style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.5, marginBottom:"14px" }}>Every attendee and every field, including flagged issues and any resolution notes.</div>
                <button onClick={exportSelected} style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:"transparent", color:P.navy, border:`1.5px solid ${P.grey200}`, borderRadius:"10px", padding:"10px 18px", fontSize:"15px", fontWeight:700, fontFamily:font, cursor:"pointer" }}>Export full report</button>
              </div>

              <div style={{ background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"14px", padding:"20px 22px", marginBottom:"16px", boxShadow:"0 1px 2px rgba(12,30,63,0.04), 0 14px 30px -20px rgba(12,30,63,0.22)" }}>
                <div style={{ fontSize:"16px", fontWeight:700, color:P.navy, fontFamily:font, marginBottom:"2px" }}>Custom report</div>
                <div style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.5, marginBottom:"16px" }}>Pick who it's for and choose the fields. The report includes all {results.length} attendees with just the columns you select.</div>

                <div style={{ fontSize:"16px", fontWeight:700, color:P.grey600, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"8px" }}>Who is it for?</div>
                <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"18px" }}>
                  {[["general","Everything"],["hotel","Hotel"],["car","Car transfer"],["travel","Travel agency"]].map(([t,label]) => (
                    <button key={t} onClick={() => applyReportTarget(t)} style={{ background:reportTarget===t?P.accent+"18":P.grey50, border:`1.5px solid ${reportTarget===t?P.accent:P.grey100}`, borderRadius:"9px", padding:"7px 14px", fontSize:"17px", fontWeight:700, color:reportTarget===t?P.accentD:P.grey600, fontFamily:font, cursor:"pointer" }}>{label}</button>
                  ))}
                </div>

                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px" }}>
                  <div style={{ fontSize:"16px", fontWeight:700, color:P.grey600, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.05em" }}>Columns</div>
                  {reportFields.size > 0 && <button onClick={() => setReportFields(new Set())} style={{ background:"transparent", border:"none", color:P.periwinkleD, fontSize:"15px", fontWeight:600, fontFamily:font, cursor:"pointer" }}>Clear all</button>}
                </div>
                <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, lineHeight:1.5, marginBottom:"10px" }}>Open a category and check the fields you want. Pick a preset above to start, then fine-tune.</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", marginBottom:"4px" }}>
                  {["Attendee","Status","Flight","Hotel","Car"].map(group => (
                    <ReportFieldDropdown key={group} group={group}
                      fields={REPORT_FIELDS.filter(fl => fl.group===group)}
                      selected={reportFields} onToggle={toggleReportField} onSetGroup={setReportFieldGroup} />
                  ))}
                </div>

                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"14px", flexWrap:"wrap", marginTop:"18px", paddingTop:"16px", borderTop:`1px solid ${P.grey100}` }}>
                  <span style={{ fontSize:"17px", color:P.grey600, fontFamily:font }}>{reportFields.size} field{reportFields.size===1?"":"s"} selected · all {results.length} attendees</span>
                  <button onClick={exportCustomReport} disabled={!reportFields.size} style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:reportFields.size?P.accent:P.grey100, color:reportFields.size?P.white:P.grey600, border:"none", borderRadius:"10px", padding:"11px 20px", fontSize:"18px", fontWeight:800, fontFamily:font, cursor:reportFields.size?"pointer":"not-allowed", boxShadow:reportFields.size?"0 2px 12px rgba(0,201,177,0.35)":"none" }}>Export custom report</button>
                </div>

                <div style={{ display:"flex", gap:"8px", alignItems:"flex-start", marginTop:"14px", background:P.grey50, borderRadius:"9px", padding:"10px 12px" }}>
                  <span style={{ flexShrink:0, marginTop:"1px" }}><Mail size={14} strokeWidth={1.8} color={P.grey600} /></span>
                  <span style={{ fontSize:"16px", color:P.grey600, fontFamily:font, lineHeight:1.5 }}>Sending a report straight to your vendor contact from the app is coming once your email is connected. For now, download the file here and attach it to your message.</span>
                </div>
              </div>
            </div>
          )}
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
                  <h2 style={{ fontFamily:fontDisplay, fontSize:"18px", fontWeight:700, color:P.navy, margin:"0 0 3px" }}>{eventName||"Event"} — Summary</h2>
                  <div style={{ fontSize:"15px", color:P.navyLight, fontFamily:font }}>{new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>
                </div>
                <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
                  <Btn onClick={exportReport} outline>Export</Btn>
                  {contacts.hotel.email && <Btn onClick={() => exportToContact("hotel")} color={P.accent}>Send to {contacts.hotel.name||"Hotel"} <Mail size={13} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>}
                  {contacts.travel.email && <Btn onClick={() => exportToContact("travel")} color={P.accent}>Send to {contacts.travel.name||"Travel Agency"} <Mail size={13} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>}
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"10px", marginBottom:"20px" }}>
                {[{label:"Total Guests",val:counts.total,color:P.navy,icon:<Users size={14} strokeWidth={1.8}/>},{label:"Fully Aligned",val:counts.ok,color:P.green,icon:<Check size={14} strokeWidth={1.8}/>},{label:"Action Needed",val:counts.flagged,color:P.red,icon:<AlertTriangle size={14} strokeWidth={1.8}/>},{label:"Alignment Rate",val:(counts.total>0?Math.round(counts.ok/counts.total*100):0)+"%",color:P.periwinkleD,icon:<BarChart2 size={14} strokeWidth={1.8}/>}].map(({label,val,color,icon}) => (
                  <div key={label} style={{ background:P.offWhite, borderRadius:"12px", padding:"14px 16px" }}>
                    <div style={{ fontSize:"20px", fontWeight:900, color, fontFamily:font }}>{icon} {val}</div>
                    <div style={{ fontSize:"15px", color:P.navy, fontWeight:600, marginTop:"4px", fontFamily:font }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", marginBottom:"20px" }}>
                {[{label:"Missing Records",val:counts.missing,color:P.amber,icon:<Circle size={14} strokeWidth={1.8}/>},{label:"Date Mismatches",val:results.filter(r=>r.issues.some(x=>x.type==="mismatch")).length,color:P.red,icon:<AlertTriangle size={14} strokeWidth={1.8}/>},{label:"Outside Window",val:counts.window,color:P.purple,icon:<Calendar size={14} strokeWidth={1.8}/>},{label:"Duplicate Names",val:counts.duplicate,color:"#C97A0A",icon:<AlertCircle size={14} strokeWidth={1.8}/>},...(SHOW_DIETARY?[{label:"Dietary / Access",val:counts.dietary,color:P.teal,icon:<Salad size={14} strokeWidth={1.8}/>}]:[])].map(({label,val,color,icon}) => (
                  <div key={label} style={{ background:P.offWhite, borderRadius:"10px", padding:"10px 14px", display:"flex", alignItems:"center", gap:"10px" }}>
                    <div style={{ fontSize:"18px", fontWeight:900, color, fontFamily:font, minWidth:"28px" }}>{val}</div>
                    <div style={{ fontSize:"15px", color:P.navy, fontWeight:600, fontFamily:font }}>{icon} {label}</div>
                  </div>
                ))}
              </div>
              {counts.flagged > 0 && (
                <div>
                  <div style={{ fontWeight:800, fontSize:"15px", color:P.red, fontFamily:font, marginBottom:"8px" }}>⚑ Guests Requiring Action</div>
                  {results.filter(r=>r.status!=="ok").map((r,i) => (
                    <div key={i} style={{ background:P.redLight, borderRadius:"10px", padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"6px" }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:"15px", color:P.navy, fontFamily:font }}>{r.firstName} {r.lastName}</div>
                        <div style={{ fontSize:"15px", color:P.red, fontFamily:font, marginTop:"2px" }}>{r.issues.filter(x=>!(r.resolved||[]).includes(x.text)).map(x=>x.text).join(" · ")}</div>
                      </div>
                      <Btn onClick={() => setEmailModal(r)} small outline color={P.red}>Draft <Mail size={12} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>
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
            {/* ── Status scorecard — leads the view and doubles as the filter ── */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(118px, 1fr))", gap:"8px", marginBottom:"14px" }}>
              {[
                { k:"all",          l:"All guests",     v:counts.total,        c:P.navy },
                { k:"ok",           l:"Aligned",        v:counts.ok,           c:P.green },
                { k:"issues",       l:"Action needed",  v:counts.flagged,      c:P.red },
                { k:"earlyarrival", l:"Early arrival",  v:counts.earlyarrival, c:P.periwinkleD },
                { k:"earlydeparture", l:"Early departure", v:counts.earlydeparture, c:P.periwinkleD },
                { k:"missing",      l:"Missing record", v:counts.missing,      c:P.amber },
                { k:"airport",      l:"Wrong airport",  v:counts.airport,      c:"#4F8EF7" },
                { k:"window",       l:"Outside window", v:counts.window,       c:P.purple },
                { k:"mismatch",     l:"Date mismatch",  v:counts.mismatch,     c:P.red },
                { k:"duplicate",    l:"Duplicate",      v:counts.duplicate,    c:"#C97A0A" },
                { k:"unregistered", l:"Unregistered",   v:counts.unregistered, c:P.grey600 },
                { k:"abstractunreg", l:"Abstract, not reg.", v:counts.abstractunreg, c:P.purple },
                { k:"typerule",      l:"Wrong arrival day", v:counts.typerule,     c:P.periwinkleD },
              ].filter(card => ["all","ok","issues"].includes(card.k) || card.v > 0).map(({ k, l, v, c }) => {
                const on = filter === k;
                return (
                  <button key={k} onClick={() => setFilter(k)} aria-pressed={on} title={`Show ${l.toLowerCase()}`}
                    style={{ textAlign:"left", background:on?c+"14":P.offWhite, border:`1.5px solid ${on?c:P.grey100}`, borderRadius:"12px", padding:"12px 14px", cursor:"pointer", transition:"all 0.12s", outline:"none" }}>
                    <div style={{ fontSize:"24px", fontWeight:900, color:c, fontFamily:font, lineHeight:1 }}>{v}</div>
                    <div style={{ fontSize:"16px", fontWeight:600, color:on?c:P.grey600, fontFamily:font, marginTop:"5px" }}>{l}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ display:"flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", gap:"10px", marginBottom:"12px" }}>
              {/* Search */}
              <div style={{ position:"relative", flex:1 }}>
                <input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width:"100%", background:P.white, border:`1.5px solid ${P.grey200}`, borderRadius:"10px", padding:"10px 12px 10px 34px", color:P.navy, fontSize:"15px", fontFamily:font, outline:"none", boxSizing:"border-box" }} />
                <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:P.navyLight, fontSize:"15px", pointerEvents:"none" }}>🔍</span>
                {search && <button onClick={() => setSearch("")} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", color:P.navyLight, fontSize:"15px", cursor:"pointer" }}>✕</button>}
              </div>
              {/* Filter pills replaced by the status scorecard above */}
              {/* Sort — full width row on mobile */}
              <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
              <select value={sortBy||""} onChange={e => { setSortBy(e.target.value||null); setSortDir("asc"); }}
                style={{ background:P.white, border:`1.5px solid ${P.grey200}`, borderRadius:"8px", padding:"8px 10px", fontSize:"15px", fontWeight:700, fontFamily:font, color:P.navy, cursor:"pointer", outline:"none", flex: isMobile ? 1 : "none" }}>
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
                  style={{ background:P.navy, border:"none", borderRadius:"8px", padding:"8px 10px", fontSize:"15px", fontWeight:700, fontFamily:font, color:P.white, cursor:"pointer" }}>
                  {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
                </button>
              )}
              <div title="Time display format" style={{ display:"flex", border:`1.5px solid ${P.grey200}`, borderRadius:"8px", overflow:"hidden", flexShrink:0 }}>
                {[{k:"ampm",l:"AM/PM"},{k:"24hr",l:"24h"}].map(({k,l}) => (
                  <button key={k} onClick={() => setTimeFormat(k)}
                    style={{ background:timeFormat===k?P.navy:P.white, color:timeFormat===k?P.white:P.grey600, border:"none", padding:"8px 10px", fontSize:"17px", fontWeight:700, fontFamily:font, cursor:"pointer" }}>{l}</button>
                ))}
              </div>
              <span style={{ fontSize:"15px", color:P.navyLight, fontFamily:font, whiteSpace:"nowrap" }}>{displayRows.length} guests</span>
              </div>{/* end sort wrapper */}
            </div>

            {/* Export / selection toolbar */}
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px", padding:"8px 12px", background:P.white, borderRadius:"12px", border:`1px solid ${someSelected ? P.accent+"66" : P.grey100}`, transition:"border-color 0.2s", flexWrap: isMobile ? "nowrap" : "nowrap", overflowX: isMobile ? "auto" : "hidden" }}>
              {/* Select all */}
              <label style={{ display:"flex", alignItems:"center", gap:"7px", cursor:"pointer", flexShrink:0 }}>
                <div onClick={toggleSelectAll} style={{ width:18, height:18, borderRadius:"5px", border:`2px solid ${allSelected?P.accent:someSelected?P.accent:P.grey300}`, background:allSelected?P.accent:someSelected?P.accent+"33":P.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, transition:"all 0.15s" }}>
                  {allSelected && <span style={{ color:P.white, fontSize:"15px", fontWeight:900, lineHeight:1 }}>✓</span>}
                  {!allSelected && someSelected && <span style={{ color:P.periwinkleD, fontSize:"15px", fontWeight:900, lineHeight:1 }}>—</span>}
                </div>
                <span style={{ fontSize:"15px", fontWeight:700, color:P.navy, fontFamily:font, whiteSpace:"nowrap" }}>
                  {someSelected ? `${selCount} selected` : `Select all`}
                </span>
              </label>
              <div style={{ width:1, height:20, background:P.grey100, flexShrink:0 }} />
              {/* Excel export — PRIMARY */}
              <button onClick={exportSelected}
                style={{ display:"flex", alignItems:"center", gap:"5px", background:P.accent, border:"none", borderRadius:"7px", padding:"5px 13px", fontSize:"15px", fontWeight:700, fontFamily:font, color:P.white, cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap", flexShrink:0, boxShadow:"0 1px 6px rgba(0,201,177,0.3)" }}>
                {someSelected ? `Export ${selCount} to Excel` : "Export to Excel"} <FileSpreadsheet size={13} strokeWidth={1.8} style={{verticalAlign:"-2px",marginLeft:"4px"}}/>
              </button>
              {/* Email selected — send messages without leaving the cross-check tab */}
              {someSelected && (() => {
                const emailable = displayRows.filter(r => selectedRows.has(r.key) && r.email && (r.issues||[]).filter(x=>!(r.resolved||[]).includes(x.text)).length > 0);
                return (
                  <button onClick={() => emailSelected()} disabled={emailable.length===0}
                    title={emailable.length===0 ? "Selected guests have no email or no open issues" : `Draft emails to ${emailable.length} guest(s)`}
                    style={{ display:"flex", alignItems:"center", gap:"5px", background:emailable.length>0?P.white:P.grey50, border:`1.5px solid ${emailable.length>0?P.accent:P.grey100}`, borderRadius:"7px", padding:"5px 12px", fontSize:"17px", fontWeight:600, fontFamily:font, color:emailable.length>0?P.accentD:P.grey600, cursor:emailable.length>0?"pointer":"not-allowed", flexShrink:0, whiteSpace:"nowrap" }}>
                    Email {emailable.length>0?emailable.length:""} selected <Mail size={13} strokeWidth={1.8} style={{verticalAlign:"-2px",marginLeft:"2px"}}/>
                  </button>
                );
              })()}
              {/* Share HTML Report — SECONDARY */}
              <button onClick={generateShareableReport}
                style={{ display:"flex", alignItems:"center", gap:"5px", background:P.offWhite, border:`1.5px solid ${P.grey200}`, borderRadius:"7px", padding:"5px 12px", fontSize:"16px", fontWeight:600, fontFamily:font, color:P.grey600, cursor:"pointer", flexShrink:0, whiteSpace:"nowrap" }}>
                Share HTML Report <Send size={12} strokeWidth={1.8} style={{verticalAlign:"-2px",marginLeft:"4px"}}/>
              </button>
              {someSelected && (
                <button onClick={() => setSelectedRows(new Set())}
                  style={{ background:"transparent", border:"none", fontSize:"15px", color:P.navyLight, fontFamily:font, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                  Clear
                </button>
              )}
              <div style={{ marginLeft:"auto", display:"flex", gap:"6px", alignItems:"center", flexShrink:0 }}>
                <button onClick={saveSession}
                  style={{ display:"flex", alignItems:"center", gap:"5px", background:P.navy, border:"none", borderRadius:"7px", padding:"5px 14px", fontSize:"15px", fontWeight:700, fontFamily:font, color:P.white, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                  <Save size={13} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/> Save Project
                </button>
                {(filter !== "all" || sortBy) && (
                  <button onClick={() => { setFilter("all"); setSortBy(null); setSortDir("asc"); }}
                    style={{ background:"transparent", border:`1px solid ${P.grey200}`, borderRadius:"6px", padding:"3px 8px", fontSize:"15px", fontWeight:600, color:P.navyLight, fontFamily:font, cursor:"pointer", whiteSpace:"nowrap" }}>
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
                <span style={{ fontSize:"13px", color:P.grey600, fontFamily:font }}>Scroll to see all columns →</span>
                <div style={{ display:"flex", gap:"6px" }}>
                  <button onClick={() => { if (tableScrollRef.current) tableScrollRef.current.scrollBy({ left:-320, behavior:"smooth" }); }}
                    style={{ width:"30px", height:"28px", borderRadius:"7px", border:`1px solid ${P.grey200}`, background:P.white, color:P.grey600, cursor:"pointer", fontSize:"17px", display:"flex", alignItems:"center", justifyContent:"center" }} title="Scroll left">‹</button>
                  <button onClick={() => { if (tableScrollRef.current) tableScrollRef.current.scrollBy({ left:320, behavior:"smooth" }); }}
                    style={{ width:"30px", height:"28px", borderRadius:"7px", border:`1px solid ${P.grey200}`, background:P.white, color:P.grey600, cursor:"pointer", fontSize:"17px", display:"flex", alignItems:"center", justifyContent:"center" }} title="Scroll right">›</button>
                </div>
              </div>
              <div className="gg-table-wrap" ref={tableScrollRef} onScroll={e => setTableScrollTop(e.currentTarget.scrollTop)}
                style={{ overflowX:"auto", overflowY:"auto", maxHeight:isMobile ? `calc(100vh - 220px)` : `${containerH}px` }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"15px", minWidth:hasCars?"1060px":"760px" }}>
                  <thead style={{ position:"sticky", top:0, zIndex:10 }}>
                    <tr style={{ background:P.navy }}>
                      {/* Checkbox column */}
                      <th style={{ padding:"10px 8px 10px 14px", width:"32px" }}>
                        <div onClick={toggleSelectAll} style={{ width:16, height:16, borderRadius:"4px", border:`2px solid ${allSelected?"white":someSelected?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.3)"}`, background:allSelected?"white":someSelected?"rgba(255,255,255,0.2)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.15s" }}>
                          {allSelected && <span style={{ color:P.navy, fontSize:"15px", fontWeight:900, lineHeight:1 }}>✓</span>}
                          {!allSelected && someSelected && <span style={{ color:"white", fontSize:"15px", fontWeight:900, lineHeight:1 }}>—</span>}
                        </div>
                      </th>
                      {[
                        { l:"First Name", col:"firstName", w:"110px" },
                        { l:"Last Name",  col:"lastName",  w:"110px" },
                        { l:"Email",      col:"email",     w:"160px" },
                        { l:"Status",    col:"status" },
                        // Arrival side: flight in → car pickup → hotel check-in
                        { l:"Flight Arrival",   col:"arrival" },
                        { l:"Arr Airport",      col:null },
                        ...(hasCars?[{l:"Car Pickup",col:null},{l:"Δ",col:null}]:[]),
                        { l:"Hotel Check-In",  col:"checkin" },
                        { l:"Δ",         col:null },
                        // Departure side: hotel check-out → car dropoff → flight out
                        { l:"Hotel Check-Out", col:"checkout" },
                        { l:"Δ",         col:null },
                        ...(hasCars?[{l:"Car Dropoff",col:null}]:[]),
                        { l:"Flight Departure", col:"departure" },
                        { l:"Dep Airport",      col:null },
                        ...(hasHotelNames?[{l:"Hotel",col:"hotel"}]:[]),
                        ...(hasDiet?[{l:"Dietary",col:null}]:[]),
                        { l:"Flags",     col:"flags" },
                        { l:"Note",      col:"note" },
                      ].map((h, i) => (
                        <th key={i} onClick={h.col ? () => toggleSort(h.col) : undefined}
                          style={{ padding:"10px 12px", textAlign:"left", fontSize:"17px", fontWeight:800, color: sortBy===h.col?"white":"rgba(255,255,255,0.55)", letterSpacing:"0.1em", textTransform:"uppercase", width:h.w, whiteSpace:"nowrap", fontFamily:font, cursor:h.col?"pointer":"default", userSelect:"none", transition:"color 0.15s" }}>
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
                          <tr onClick={() => setExpanded(isExp ? null : r.key)} style={{ background:isExp?P.grey50:baseBg, borderBottom:`1px solid ${P.grey100}`, cursor:"pointer", outline:isSel?`inset 0 0 0 1.5px ${P.periwinkle}44`:undefined }}
                            onMouseEnter={e => { if(!isExp) e.currentTarget.style.background=P.grey50; }}
                            onMouseLeave={e => { if(!isExp) e.currentTarget.style.background=baseBg; }}>
                            {/* Row checkbox */}
                            <td style={{ padding:"10px 8px 10px 14px" }} onClick={e => { e.stopPropagation(); toggleSelectRow(r.key); }}>
                              <div style={{ width:16, height:16, borderRadius:"4px", border:`2px solid ${isSel?P.accent:P.grey200}`, background:isSel?P.accent:P.white, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>
                                {isSel && <span style={{ color:P.white, fontSize:"15px", fontWeight:900, lineHeight:1 }}>✓</span>}
                              </div>
                            </td>
                            {/* First Name */}
                            <td style={{ padding:"10px 12px" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                                <span style={{ fontWeight:600, fontSize:"15px", color:P.navy, fontFamily:font }}>
                                  {r.firstName || r.displayName.split(" ")[0]}
                                </span>
                              </div>
                            </td>
                            {/* Last Name */}
                            <td style={{ padding:"10px 12px", fontWeight:700, color:P.navy, fontSize:"15px", fontFamily:font }}>
                              {r.lastName || r.displayName.split(" ").slice(1).join(" ") || "—"}
                            </td>
                            {/* Email */}
                            <td style={{ padding:"10px 12px", fontSize:"13px", color:r.email?P.grey600:P.grey200, fontFamily:font }}>
                              {r.email || "—"}
                            </td>
                            <td style={{ padding:"10px 12px" }}><StatusChip status={r.status} /></td>
                            {/* Arrival side: flight arrival → car pickup → hotel check-in */}
                            <td style={{ padding:"10px 12px", color:r.flight?P.grey600:P.red, fontSize:"16px", fontFamily:font, fontWeight:r.flight?500:700 }}>{r.flight ? fmt(r.flight.flightArrival) : "⚠ Missing"}{r.flight?.arrivalTime ? <div style={{ fontSize:"13px", color:P.grey600, fontWeight:500 }}>{fmtTime(r.flight.arrivalTime, timeFormat)}</div> : null}</td>
                            <td style={{ padding:"10px 12px", color:P.grey600, fontSize:"17px", fontFamily:font, fontWeight:600, letterSpacing:"0.03em", whiteSpace:"nowrap" }}>{(r.flight?.arrivalAirport || r.flight?.airport || "").toUpperCase() || "—"}</td>
                            {hasCars && <>
                              <td style={{ padding:"10px 12px", color:P.navy, fontSize:"16px", fontFamily:font }}>{fmt(r.car?.pickupDate)}{r.car?.pickupTime ? <div style={{ fontSize:"13px", color:P.grey600, fontWeight:500 }}>{fmtTime(r.car.pickupTime, timeFormat)}</div> : null}</td>
                              <td style={{ padding:"10px 12px", textAlign:"center" }}><Delta val={r.details?.pickupDiff} /></td>
                            </>}
                            <td style={{ padding:"10px 12px", color:r.hotel?P.grey600:P.red, fontSize:"13px", fontFamily:font, fontWeight:r.hotel?500:700 }}>{r.hotel ? fmt(r.hotel.checkIn) : "⚠ Missing"}</td>
                            <td style={{ padding:"10px 12px", textAlign:"center" }}><Delta val={r.details?.arrDiff} /></td>
                            {/* Departure side: hotel check-out → car dropoff → flight departure */}
                            <td style={{ padding:"10px 12px", color:r.hotel?P.grey600:P.red, fontSize:"13px", fontFamily:font, fontWeight:r.hotel?500:700 }}>{r.hotel ? fmt(r.hotel.checkOut) : "⚠ Missing"}</td>
                            <td style={{ padding:"10px 12px", textAlign:"center" }}><Delta val={r.details?.depDiff} /></td>
                            {hasCars && <td style={{ padding:"10px 12px", color:P.navy, fontSize:"16px", fontFamily:font }}>{fmt(r.car?.dropoffDate)}{r.car?.dropoffTime ? <div style={{ fontSize:"13px", color:P.grey600, fontWeight:500 }}>{fmtTime(r.car.dropoffTime, timeFormat)}</div> : null}</td>}
                            <td style={{ padding:"10px 12px", color:r.flight?P.grey600:P.red, fontSize:"16px", fontFamily:font, fontWeight:r.flight?500:700 }}>{r.flight ? fmt(r.flight.flightDeparture) : "⚠ Missing"}{r.flight?.departureTime ? <div style={{ fontSize:"13px", color:P.grey600, fontWeight:500 }}>{fmtTime(r.flight.departureTime, timeFormat)}</div> : null}</td>
                            <td style={{ padding:"10px 12px", color:P.grey600, fontSize:"17px", fontFamily:font, fontWeight:600, letterSpacing:"0.03em", whiteSpace:"nowrap" }}>{(r.flight?.departureAirport || r.flight?.airport || "").toUpperCase() || "—"}</td>
                            {hasHotelNames && (() => {
                              const wrongHotel = (r.issues||[]).some(x => x.text && x.text.includes("but assigned to"));
                              return <td style={{ padding:"10px 12px", color:wrongHotel?P.red:P.navy, fontSize:"15px", fontFamily:font, fontWeight:wrongHotel?600:500, whiteSpace:"nowrap" }}>{r.hotel?.hotel ? (wrongHotel ? "⚠ "+r.hotel.hotel : r.hotel.hotel) : "—"}</td>;
                            })()}
                            {hasDiet && <td style={{ padding:"10px 12px" }}>
                              {r.diet?.dietary ? <span style={{ background:P.tealLight, color:P.teal, fontSize:"16px", fontWeight:700, padding:"2px 8px", borderRadius:"20px", fontFamily:font }}>{r.diet.dietary.slice(0,16)}{r.diet.dietary.length>16?"…":""}</span> : <span style={{ color:P.grey600 }}>—</span>}
                            </td>}
                            <td style={{ padding:"10px 12px" }}>
                              {activeIssues.length === 0
                                ? <span style={{ color:P.grey200, fontSize:"15px" }}>—</span>
                                : <div style={{ display:"flex", flexDirection:"column", gap:"2px" }}>
                                    {activeIssues.some(x=>x.type==="missing") && <span style={{ color:P.amber, fontSize:"15px", fontWeight:700, fontFamily:font }}>○ missing</span>}
                                    {activeIssues.some(x=>x.type==="window") && <span style={{ color:P.purple, fontSize:"15px", fontWeight:700, fontFamily:font }}>🗓 window</span>}
                                    {activeIssues.some(x=>x.type==="airport") && <span style={{ color:"#4F8EF7", fontSize:"15px", fontWeight:700, fontFamily:font }}>✈ airport</span>}
                                    {activeIssues.some(x=>x.type==="mismatch") && <span style={{ color:P.red, fontSize:"15px", fontWeight:700, fontFamily:font }}>⚑ mismatch</span>}
                                    {activeIssues.some(x=>x.type==="duplicate") && <span style={{ color:"#C97A0A", fontSize:"15px", fontWeight:700, fontFamily:font }}>⚠ dupe</span>}
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
                                    <Btn onClick={() => setEmailModal(r)} small color={P.accent}>Draft Email <Mail size={12} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>
                                    <div style={{ flex:1, display:"flex", alignItems:"center", gap:"8px" }}>
                                      <span style={{ fontSize:"15px", fontWeight:700, color:P.navyLight, fontFamily:font, flexShrink:0 }}>Note</span>
                                      <input value={r.note||""} onChange={e => updateMeta(r,{note:e.target.value, noteBy:(user&&user.name)||"You", noteAt:new Date().toISOString()})} placeholder={user ? `Planner note — saved to ${user.name}'s account` : "Planner note — saved locally (sign in to sync)"} onClick={e => e.stopPropagation()}
                                        style={{ flex:1, background:P.white, border:`1.5px solid ${r.note ? P.periwinkle+"66" : P.grey200}`, borderRadius:"9px", padding:"5px 12px", fontSize:"15px", fontFamily:font, color:P.navy, outline:"none" }} />
                                      <Btn onClick={(e) => { if (e && e.stopPropagation) e.stopPropagation(); saveSession(); }} small color={P.accent}>Save Note</Btn>
                                      {r.note && <span style={{ fontSize:"18px", color:P.green, fontFamily:font, fontWeight:700, flexShrink:0 }}>{user ? "synced" : "saved"}</span>}{r.note && r.noteAt && <span style={{ fontSize:"17px", color:P.grey600, fontFamily:font, flexShrink:0, whiteSpace:"nowrap" }}>{(r.noteBy||"You")} · {new Date(r.noteAt).toLocaleString([], { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" })}</span>}
                                    </div>
                                    <span style={{ fontSize:"15px", color:P.navyLight, fontFamily:font }}>{r.matchedBy==="email"?"✉ email match":"👤 name match"}</span>
                                  </div>
                                  <div className="gg-detail-grid" style={{ display:"grid", gridTemplateColumns:hasDiet?"1fr 1fr 1fr 1fr 1fr":"1fr 1fr 1fr 1fr", gap:"10px" }}>
                                    <Card title="✈ Flight" color={P.periwinkleD}>
                                      {r.flight ? <>
                                        <DR label="Arrival" val={fmt(r.flight.flightArrival) + (r.flight.arrivalTime ? " · " + fmtTime(r.flight.arrivalTime, timeFormat) : "")} />
                                        <DR label="Departure" val={fmt(r.flight.flightDeparture) + (r.flight.departureTime ? " · " + fmtTime(r.flight.departureTime, timeFormat) : "")} />
                                        {r.flight.flightIn && <DR label="Inbound #" val={r.flight.flightIn} accent />}
                                        {r.flight.flightOut && <DR label="Outbound #" val={r.flight.flightOut} accent />}
                                        {(r.flight.arrivalAirport || r.flight.airport) && <DR label="Arr Airport" val={(r.flight.arrivalAirport || r.flight.airport).toUpperCase()} />}
                                        {(r.flight.departureAirport || r.flight.airport) && <DR label="Dep Airport" val={(r.flight.departureAirport || r.flight.airport).toUpperCase()} />}
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
                                        <DR label="Pickup" val={fmt(r.car.pickupDate) + (r.car.pickupTime ? " · " + fmtTime(r.car.pickupTime, timeFormat) : "")} />
                                        {r.car.pickupLoc && <DR label="From" val={r.car.pickupLoc} />}
                                        <DR label="Dropoff" val={fmt(r.car.dropoffDate) + (r.car.dropoffTime ? " · " + fmtTime(r.car.dropoffTime, timeFormat) : "")} />
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
                                        ? <div style={{ color:P.green, fontSize:"15px", fontWeight:700, fontFamily:font }}>✓ All clear</div>
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
                  <span style={{ color:"#C97A0A" }}>⚠ dupe</span>
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

      {/* ── Mobile bottom nav — only shown when results are loaded ── */}
      {results && (
        <div className="gg-bottom-nav"
          style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:150, background:P.navy, borderTop:`1px solid rgba(255,255,255,0.1)`, padding:"8px 0 max(8px, env(safe-area-inset-bottom))", display:"flex", alignItems:"center", justifyContent:"space-around" }}>
          {[
            { k:"grid",    icon:<GridIcon size={20} line="rgba(255,255,255,0.85)"/>, label:"Grid" },
            { k:"summary", icon:<BarChart2 size={20} strokeWidth={1.8}/>,  label:"Summary" },
            { k:"comms",   icon:<Mail size={20} strokeWidth={1.8}/>,       label:"Comms" },
            { k:"reports", icon:<SpreadsheetIcon size={20} line="rgba(255,255,255,0.85)" accent={P.accent}/>, label:"Report" },
          ].map(({ k, icon, label }) => {
            const active = activeTab === k;
            return (
              <button key={k} onClick={() => { setActiveTab(k); setSidebarOpen(false); }}
                style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", background:"transparent", border:"none", cursor:"pointer", padding:"4px 0" }}>
                <span style={{ color: active ? P.accent : "rgba(255,255,255,0.4)", display:"flex", alignItems:"center" }}>{icon}</span>
                <span style={{ fontSize:"15px", fontWeight: active ? 700 : 500, color: active ? P.accent : "rgba(255,255,255,0.4)", fontFamily:font, letterSpacing:"0.04em" }}>{label}</span>
              </button>
            );
          })}
          <button onClick={() => setSidebarOpen(o => !o)}
            style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", background:"transparent", border:"none", cursor:"pointer", padding:"4px 0" }}>
            <span style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", color:"rgba(255,255,255,0.4)" }}>
              {[0,1,2].map(i => <span key={i} style={{ width:16, height:2, background:"rgba(255,255,255,0.4)", borderRadius:2, display:"block" }} />)}
            </span>
            <span style={{ fontSize:"15px", fontWeight:500, color:"rgba(255,255,255,0.4)", fontFamily:font, letterSpacing:"0.04em" }}>Menu</span>
          </button>
        </div>
      )}
      </>)}
    </div>
  );
}
