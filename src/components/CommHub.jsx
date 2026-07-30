import { useState } from "react";
import { X, Save, Mail, Download, Plus, Trash2, Pencil } from "lucide-react";
import { P, font } from "../theme";
import { DEFAULT_TEMPLATES, TEMPLATE_AUDIENCE, VENDOR_BODY_OVERRIDE, VENDOR_BODY, fillTemplate, getApplicableTemplates, TEMPLATE_CATEGORY, CATEGORY_ORDER, TemplateIcon } from "../templates";
import { Btn } from "./common";
import { NewTemplateModal } from "./NewTemplateModal";

export function CommHub({ results, eventName, contacts, arrivalStart, arrivalEnd, departureStart, departureEnd }) {
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
  const [bulkRecipient, setBulkRecipient] = useState("smart"); // smart | guest | hotel | travel | car | all
  const [editedIds, setEditedIds] = useState(new Set()); // tracks which queue items have been manually edited
  const [localEdits, setLocalEdits] = useState({}); // {id: {to, subject, body}} — staged edits before save
  const [showTemplateConfig, setShowTemplateConfig] = useState(false); // collapse template/config UI by default

  const plannerName = contacts?.plannerName || "The Planning Team";
  const extra = { eventName, plannerName, arrivalStart, arrivalEnd, departureStart, departureEnd, hotelName: contacts?.hotel?.name, travelName: contacts?.travel?.name, carName: contacts?.car?.name };

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
      case "arrives_late": return issues.some(x => x.type === "latearrival");
      case "departs_late": return issues.some(x => x.text?.includes("before check-out"));
      case "outside_window": return issues.some(x => x.type === "window");
      case "manual_only": return false;
      default: return false;
    }
  }

  // Resolve the default recipient + body for a built-in template, based on its audience.
  // Vendor-routed templates use the vendor-addressed body and the vendor's email.
  // If the matching vendor contact has no email on file, fall back to the guest so the
  // email is never silently dropped (and the planner can fix the address).
  function resolveRouting(templateId, tmpl, record) {
    const audience = TEMPLATE_AUDIENCE[templateId] || "guest";
    const vendorEmail = audience === "hotel" ? contacts?.hotel?.email
                      : audience === "travel" ? contacts?.travel?.email
                      : audience === "car" ? contacts?.car?.email
                      : "";
    const vendorBody = VENDOR_BODY_OVERRIDE[templateId] || VENDOR_BODY[audience];
    if (audience !== "guest" && vendorEmail && vendorBody) {
      const tag = audience === "hotel" ? "Hotel" : audience === "travel" ? "Flight" : "Transfer";
      const subject = templateId === "arrives_late"
        ? `${(extra.eventName && extra.eventName !== "our event") ? extra.eventName + " " : ""}[Late Arrival] Please hold the room for ${record.displayName || record.firstName || ""}`
        : `${(extra.eventName && extra.eventName !== "our event") ? extra.eventName + " " : ""}[${tag}] — Guest Review: ${record.displayName || record.firstName || ""}`;
      return {
        to: vendorEmail,
        audience,
        subject,
        body: fillTemplate(vendorBody, record, extra),
      };
    }
    // guest audience, or vendor contact missing → guest-addressed body to the guest
    return {
      to: record.email,
      audience: "guest",
      subject: fillTemplate(tmpl.subject, record, extra),
      body: fillTemplate(tmpl.body, record, extra),
    };
  }

  // Build the send queue from all flagged guests who have emails
  function buildQueue() {
    const q = [];
    (results || []).forEach(record => {
      const unresolved = (record.issues || []).filter(x => !(record.resolved || []).includes(x.text));
      if (unresolved.length === 0) return; // only message guests who actually have an open issue
      let matched = false;
      // Default templates: use first applicable match, routed to the right recipient
      const applicable = getApplicableTemplates(record);
      if (applicable.length > 0) {
        const templateId = applicable[0];
        const tmpl = templates[templateId];
        if (tmpl) {
          const r = resolveRouting(templateId, tmpl, record);
          // Skip only if there's no recipient at all (no vendor email AND no guest email)
          if (r.to) { q.push({ id: `${record.key}-${templateId}`, record, templateId, audience: r.audience, subject: r.subject, body: r.body, to: r.to, status: "pending" }); matched = true; }
        }
      }
      // Custom templates: add a separate queue item for each that matches (still to guest)
      Object.values(templates).filter(t => t.isCustom).forEach(tmpl => {
        if (getCustomApplicable(record, tmpl) && record.email) {
          q.push({ id: `${record.key}-${tmpl.id}`, record, templateId: tmpl.id, audience: "guest", subject: fillTemplate(tmpl.subject, record, extra), body: fillTemplate(tmpl.body, record, extra), to: record.email, status: "pending" });
          matched = true;
        }
      });
      // Fallback: flagged guest with no matching template — generic note to the guest
      if (!matched && record.email) {
        const issueList = unresolved.map(x => "• " + x.text).join("\n");
        const subject = `${eventName || "Event"} [Travel]: Could you confirm your travel details?`;
        const body = `Hi ${record.firstName || record.displayName || "there"},\n\nWhile reviewing arrangements for ${eventName || "our event"}, we found something on your record that needs attention:\n\n${issueList}\n\nCould you take a look and let us know? Thank you.\n\n${contacts?.plannerName || "[Your Name]"}`;
        q.push({ id: `${record.key}-generic`, record, templateId: null, audience: "guest", subject, body, to: record.email, status: "pending" });
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
    // Returns array of {to, toLabel} based on bulkRecipient setting.
    // "smart" (default) uses each email's own auto-routed recipient (vendor or guest).
    const addrs = [];
    if (bulkRecipient === "smart") {
      if (item.to) {
        const label = item.audience === "hotel" ? (contacts?.hotel?.name || "Hotel Contact")
                    : item.audience === "travel" ? (contacts?.travel?.name || "Travel Contact")
                    : item.audience === "car" ? (contacts?.car?.name || "Transfer Contact")
                    : item.record.displayName;
        addrs.push({ to: item.to, label });
      }
      return addrs;
    }
    if (bulkRecipient === "guest" || bulkRecipient === "all") {
      if (item.record?.email) addrs.push({ to: item.record.email, label: item.record.displayName });
    }
    if (bulkRecipient === "hotel" || bulkRecipient === "all") {
      const email = contacts?.hotel?.email;
      if (email) addrs.push({ to: email, label: contacts?.hotel?.name || "Hotel Contact" });
    }
    if (bulkRecipient === "travel" || bulkRecipient === "all") {
      const email = contacts?.travel?.email;
      if (email) addrs.push({ to: email, label: contacts?.travel?.name || "Travel Contact" });
    }
    if (bulkRecipient === "car" || bulkRecipient === "all") {
      const email = contacts?.car?.email;
      if (email) addrs.push({ to: email, label: contacts?.car?.name || "Transfer Contact" });
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
                <div style={{ fontSize:"15px", color:P.navyLight, marginTop:"2px" }}>{templates[editingTemplate]?.label}</div>
              </div>
              <button onClick={() => setEditingTemplate(null)} style={{ background:P.grey100, border:"none", borderRadius:"10px", width:30, height:30, cursor:"pointer", fontSize:"15px", color:P.navy, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15} strokeWidth={1.8}/></button>
            </div>
            <div style={{ padding:"20px 26px" }}>
              <div style={{ background:P.offWhite, borderRadius:"10px", padding:"10px 14px", marginBottom:"16px", fontSize:"15px", color:P.navy }}>
                <strong>Available variables:</strong> {"{{"}<span>guestName</span>{"}}"}, {"{{"}<span>eventName</span>{"}}"}, {"{{"}<span>eventStart</span>{"}}"}, {"{{"}<span>eventEnd</span>{"}}"}, {"{{"}<span>flightArrival</span>{"}}"}, {"{{"}<span>flightDeparture</span>{"}}"}, {"{{"}<span>flightIn</span>{"}}"}, {"{{"}<span>flightOut</span>{"}}"}, {"{{"}<span>airport</span>{"}}"}, {"{{"}<span>checkIn</span>{"}}"}, {"{{"}<span>checkOut</span>{"}}"}, {"{{"}<span>hotel</span>{"}}"}, {"{{"}<span>plannerName</span>{"}}"}
              </div>
              <div style={{ marginBottom:"14px" }}>
                <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px" }}>Subject Line</div>
                <input value={editSubject} onChange={e => setEditSubject(e.target.value)}
                  style={{ width:"100%", background:P.offWhite, border:`1.5px solid ${P.grey200}`, borderRadius:"10px", padding:"10px 14px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
              </div>
              <div style={{ marginBottom:"16px" }}>
                <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px" }}>Email Body</div>
                <textarea value={editBody} onChange={e => setEditBody(e.target.value)}
                  style={{ width:"100%", height:"300px", background:P.offWhite, border:`1.5px solid ${P.grey200}`, borderRadius:"10px", padding:"14px", fontSize:"15px", fontFamily:font, color:P.navy, resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.7 }} />
              </div>
              <div style={{ display:"flex", gap:"10px" }}>
                <Btn onClick={saveEdit} color={P.accent}>Save Template <Save size={13} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>
                <Btn onClick={() => { setTemplates(prev => ({...prev, [editingTemplate]: DEFAULT_TEMPLATES[editingTemplate]})); setEditSubject(DEFAULT_TEMPLATES[editingTemplate].subject); setEditBody(DEFAULT_TEMPLATES[editingTemplate].body); }} outline color={P.grey600}>↺ Reset to Default</Btn>
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
            <div style={{ fontSize:"16px", color:P.grey600, fontFamily:font, lineHeight:1.6, marginBottom:"16px" }}>
              {flaggedWithEmail.length > 0
                ? "GroupGrid drafted a personalized email for each flagged guest, explaining exactly what's missing or mismatched. Review them, then send."
                : "When a cross-check turns up flagged guests with an email on file, you'll be able to review and send personalized messages here."}
            </div>
            <div style={{ display:"flex", gap:"10px", marginBottom:"18px", flexWrap:"wrap" }}>
              {[
                { n: flaggedWithEmail.length, l:"flagged, with email", c:P.amber },
                { n: (results||[]).filter(r=>!r.email&&r.issues.length>0).length, l:"flagged, no email", c:P.grey600 },
                { n: (results||[]).length, l:"total guests", c:P.periwinkleD },
              ].map(({n,l,c}) => (
                <div key={l} style={{ display:"flex", alignItems:"center", gap:"8px", background:P.grey50, border:`1px solid ${P.grey100}`, borderRadius:"10px", padding:"8px 13px" }}>
                  <span style={{ fontSize:"17px", fontWeight:600, color:c, fontFamily:font }}>{n}</span>
                  <span style={{ fontSize:"15px", color:P.grey600, fontFamily:font }}>{l}</span>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"16px", flexWrap:"wrap" }}>
              {flaggedWithEmail.length > 0
                ? <button onClick={buildQueue} style={{ background:P.accent, color:P.white, border:"none", borderRadius:"11px", padding:"12px 24px", fontSize:"15px", fontWeight:600, fontFamily:font, cursor:"pointer" }}>Review &amp; send {flaggedWithEmail.length} message{flaggedWithEmail.length!==1?"s":""} <Mail size={14} strokeWidth={1.8} style={{verticalAlign:"-2px",marginLeft:"2px"}}/></button>
                : <span style={{ fontSize:"16px", color:P.grey600, fontFamily:font }}>Run a cross-check to generate messages.</span>}
              <button onClick={() => setShowTemplateConfig(v=>!v)} style={{ background:"transparent", border:"none", color:P.periwinkleD, fontSize:"15px", fontWeight:500, fontFamily:font, cursor:"pointer" }}>{showTemplateConfig ? "Hide send settings" : "Send settings"}</button>
            </div>
          </div>
          {queue && <button onClick={() => setActiveView("queue")} style={{ background:"transparent", border:"none", color:P.periwinkleD, fontSize:"15px", fontWeight:500, fontFamily:font, cursor:"pointer", marginBottom:"14px" }}>← Back to your send queue ({pendingCount} pending)</button>}
        </>
      )}

      {/* Queue-view actions bar */}
      {activeView === "queue" && queue && (
        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"16px", flexWrap:"wrap" }}>
          <button onClick={() => setActiveView("templates")} style={{ background:P.white, color:P.grey600, border:`1px solid ${P.grey100}`, borderRadius:"8px", padding:"7px 14px", fontSize:"16px", fontWeight:500, fontFamily:font, cursor:"pointer" }}>← Back</button>
          <div style={{ fontSize:"16px", color:P.grey600, fontFamily:font }}>{sentCount} sent · {skippedCount} skipped · {pendingCount} pending</div>
          {sendMsg && <span style={{ fontSize:"15px", color:P.green, fontWeight:600, fontFamily:font }}>{sendMsg}</span>}
          {pendingCount > 0 && <div style={{ marginLeft:"auto", display:"flex", gap:"8px" }}>
            <button onClick={() => {
              const text = (queue||[]).filter(x=>x.status==="pending").map(item =>
                `TO: ${item.to}\nSUBJECT: ${item.subject}\n\n${item.body}\n\n${"─".repeat(60)}`
              ).join("\n\n");
              navigator.clipboard?.writeText(text).then(() => {});
              const blob = new Blob([text], {type:"text/plain"});
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
              a.download = `groupgrid-email-queue-${new Date().toISOString().slice(0,10)}.txt`; a.click();
            }} style={{ background:P.white, color:P.periwinkleD, border:`1px solid ${P.grey200}`, borderRadius:"8px", padding:"7px 14px", fontSize:"15px", fontWeight:500, fontFamily:font, cursor:"pointer" }}>Download .txt <Download size={13} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></button>
            <button onClick={sendAll} style={{ background:P.accent, color:P.white, border:"none", borderRadius:"8px", padding:"7px 16px", fontSize:"15px", fontWeight:600, fontFamily:font, cursor:"pointer" }}>Open all {pendingCount} in mail app <Mail size={13} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></button>
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
              <div style={{ fontSize:"15px", color:P.navyLight, marginTop:"2px" }}>Controls how emails are handled when the queue is built</div>
            </div>
            <div style={{ display:"flex", gap:"8px", marginLeft:"auto" }}>
              {[
                { k:"manual", l:"✋ Manual", sub:"You open each email individually" },
                { k:"review", l:"👁 Review First", sub:"Preview every email before sending" },
                { k:"auto", l:"⚡ Build & Send", sub:"Open all in mail app at once" },
              ].map(({k,l,sub}) => (
                <button key={k} onClick={() => setSendMode(k)} style={{ background:sendMode===k?P.navy:P.offWhite, color:sendMode===k?P.white:P.grey600, border:`1px solid ${sendMode===k?P.navy:P.grey100}`, borderRadius:"8px", padding:"9px 14px", cursor:"pointer", textAlign:"left", fontFamily:font }}>
                  <div style={{ fontSize:"15px", fontWeight:500, color:sendMode===k?P.white:P.navy }}>{l}</div>
                  <div style={{ fontSize:"15px", color:sendMode===k?"rgba(255,255,255,0.6)":P.grey600, marginTop:"2px", maxWidth:"140px" }}>{sub}</div>
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
                <div style={{ fontSize:"15px", fontWeight:600, color:P.navy, marginTop:"3px" }}>{label}</div>
                <div style={{ fontSize:"15px", color:P.navyLight, marginTop:"2px" }}>{sub}</div>
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
            <div style={{ fontSize:"15px", fontWeight:600, color:P.navy }}>Email Templates</div>
            <Btn onClick={() => setNewTemplateOpen(true)} outline color={P.periwinkleD} small>New Template <Plus size={12} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>
          </div>
          {(() => {
            const byCat = {};
            Object.values(templates).forEach(t => { const c = TEMPLATE_CATEGORY[t.id] || "Custom"; (byCat[c] = byCat[c] || []).push(t); });
            const cats = CATEGORY_ORDER.filter(c => byCat[c]?.length).concat(Object.keys(byCat).filter(c => !CATEGORY_ORDER.includes(c)));
            return cats.map(cat => (
            <div key={cat} style={{ marginBottom:"22px" }}>
              <div style={{ fontSize:"15px", fontWeight:800, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 10px" }}>{cat}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                {byCat[cat].map(tmpl => {
              const applicable = (results||[]).filter(r => r.email && (getApplicableTemplates(r).includes(tmpl.id) || getCustomApplicable(r, tmpl)));
              const isCustomized = !tmpl.isCustom && JSON.stringify(tmpl) !== JSON.stringify(DEFAULT_TEMPLATES[tmpl.id]);
              return (
                <div key={tmpl.id} style={{ background:P.white, borderRadius:"10px", border:`1px solid ${P.grey100}`, padding:"16px 20px" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"10px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                      <div style={{ width:36, height:36, borderRadius:"10px", background:tmpl.color+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><TemplateIcon tmpl={tmpl} size={20} /></div>
                      <div>
                        <div style={{ fontSize:"15px", fontWeight:600, color:P.navy }}>{tmpl.label}</div>
                        <div style={{ fontSize:"15px", color:P.navyLight, marginTop:"2px" }}>{tmpl.description}</div>
                      </div>
                    </div>
                    {isCustomized && <span style={{ background:P.periwinkle+"22", color:P.periwinkleD, fontSize:"15px", fontWeight:500, padding:"2px 8px", borderRadius:"20px", flexShrink:0, marginLeft:"8px" }}>Edited</span>}
                    {tmpl.isCustom && <span style={{ background:P.periwinkleD+"18", color:P.periwinkleD, fontSize:"15px", fontWeight:500, padding:"2px 8px", borderRadius:"20px", flexShrink:0, marginLeft:"4px" }}>Custom</span>}
                  </div>
                  <div style={{ background:P.offWhite, borderRadius:"8px", padding:"10px 12px", marginBottom:"12px" }}>
                    <div style={{ fontSize:"15px", fontWeight:500, color:P.grey600, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"4px" }}>Subject preview</div>
                    <div style={{ fontSize:"15px", color:P.navy, fontWeight:600 }}>{tmpl.subject.replace(/\{\{[^}]+\}\}/g, "…")}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                      {applicable.length > 0
                        ? <span style={{ background:tmpl.color+"18", color:tmpl.color, fontSize:"15px", fontWeight:500, padding:"3px 10px", borderRadius:"20px" }}>Applies to {applicable.length} guest{applicable.length!==1?"s":""}</span>
                        : <span style={{ background:P.grey50, color:P.navyLight, fontSize:"15px", fontWeight:500, padding:"3px 10px", borderRadius:"20px" }}>No guests currently</span>}
                    </div>
                    <div style={{ display:"flex", gap:"6px" }}>
                      {tmpl.isCustom && (
                        <Btn onClick={() => { if (window.confirm(`Delete "${tmpl.label}"?`)) deleteTemplate(tmpl.id); }} outline small color={P.red}>Delete <Trash2 size={12} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>
                      )}
                      <Btn onClick={() => startEdit(tmpl.id)} outline small color={P.periwinkleD}>Edit <Pencil size={12} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>
                    </div>
                  </div>
                </div>
              );
                })}
              </div>
            </div>
            ));
          })()}
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
            const hasCarContact = !!contacts?.car?.email;

            return (
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>

              {/* ── Bulk Send Toolbar ── */}
              <div style={{ background:P.white, border:`1px solid ${someChecked ? P.periwinkle+"66" : P.grey100}`, borderRadius:"10px", padding:"12px 16px", display:"flex", alignItems:"center", gap:"14px", flexWrap:"wrap", transition:"border-color 0.2s" }}>
                {/* Select all checkbox */}
                <label style={{ display:"flex", alignItems:"center", gap:"8px", cursor:"pointer", flexShrink:0 }}>
                  <div onClick={toggleCheckAll} style={{ width:20, height:20, borderRadius:"6px", border:`2px solid ${allChecked ? P.periwinkleD : someChecked ? P.periwinkle : P.grey200}`, background:allChecked ? P.periwinkleD : someChecked ? P.periwinkle+"33" : P.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.15s", flexShrink:0 }}>
                    {allChecked && <span style={{ color:P.white, fontSize:"15px", lineHeight:1, fontWeight:900 }}>✓</span>}
                    {!allChecked && someChecked && <span style={{ color:P.periwinkleD, fontSize:"15px", lineHeight:1, fontWeight:900 }}>—</span>}
                  </div>
                  <span style={{ fontSize:"15px", fontWeight:700, color:P.navy, fontFamily:font }}>
                    {someChecked ? `${checkedPending.length} selected` : `Select all (${pendingItems.length} pending)`}
                  </span>
                </label>

                <div style={{ width:1, height:28, background:P.grey100, flexShrink:0 }} />

                {/* Send to selector */}
                <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
                  <span style={{ fontSize:"15px", fontWeight:700, color:P.navyLight, fontFamily:font, flexShrink:0 }}>Send to:</span>
                  {[
                    { k:"smart",   l:"Smart (auto-route)", available: true },
                    { k:"guest",   l:"Guest",          available: true },
                    { k:"hotel",   l: hasHotelContact ? (contacts.hotel.name || "Hotel Contact") : "Hotel Contact",   available: hasHotelContact },
                    { k:"travel",  l: hasTravelContact ? (contacts.travel.name || "Travel Contact") : "Travel Contact", available: hasTravelContact },
                    { k:"car",     l: hasCarContact ? (contacts.car.name || "Transfer Contact") : "Transfer Contact", available: hasCarContact },
                  ].map(({ k, l, available }) => (
                    <button key={k} onClick={() => available && setBulkRecipient(k)}
                      title={!available ? "Add this contact first" : ""}
                      style={{ background:bulkRecipient===k ? P.navy : available ? P.offWhite : P.grey50, color:bulkRecipient===k ? P.white : available ? P.navy : P.grey300, border:`1.5px solid ${bulkRecipient===k ? P.navy : available ? P.grey200 : P.grey100}`, borderRadius:"8px", padding:"5px 12px", fontSize:"15px", fontWeight:800, fontFamily:font, cursor:available?"pointer":"not-allowed", transition:"all 0.15s", opacity: available ? 1 : 0.5 }}>
                      {l}
                      {!available && <span style={{ fontSize:"15px", marginLeft:"4px" }}>⚠</span>}
                    </button>
                  ))}
                </div>

                <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                  {sendMsg && <span style={{ fontSize:"15px", color:P.green, fontWeight:700 }}>{sendMsg}</span>}
                  {unsavedCount > 0 && (
                    <button onClick={saveAllEdits}
                      style={{ background:P.amber+"18", border:`1.5px solid ${P.amber}66`, borderRadius:"9px", padding:"7px 14px", fontSize:"15px", fontWeight:800, fontFamily:font, color:P.amber, cursor:"pointer", display:"flex", alignItems:"center", gap:"6px" }}>
                      💾 Save All Edits ({unsavedCount})
                    </button>
                  )}
                  {checkedPending.length > 0 ? (
                    <button onClick={bulkSendChecked}
                      style={{ background:`linear-gradient(135deg, ${P.periwinkleD}, ${P.periwinkle})`, border:"none", borderRadius:"10px", padding:"9px 20px", fontSize:"15px", fontWeight:800, fontFamily:font, color:P.white, cursor:"pointer", boxShadow:"0 3px 12px rgba(91,109,184,0.4)", display:"flex", alignItems:"center", gap:"8px" }}>
                      Send {checkedPending.length} Email{checkedPending.length !== 1 ? "s" : ""}
                      <span style={{ background:"rgba(255,255,255,0.25)", borderRadius:"6px", padding:"1px 7px", fontSize:"15px" }}>
                        {bulkRecipient === "smart" ? "auto-routed" : bulkRecipient === "all" ? "× recipients" : `to ${bulkRecipient === "guest" ? "Guests" : bulkRecipient === "hotel" ? (contacts?.hotel?.name || "Hotel") : bulkRecipient === "car" ? (contacts?.car?.name || "Transfer") : (contacts?.travel?.name || "Travel")}`}
                      </span>
                    </button>
                  ) : (
                    <span style={{ fontSize:"15px", color:P.navyLight, fontFamily:font }}>Select emails above to bulk send</span>
                  )}
                </div>
              </div>

              {/* ── Queue Items ── */}
              {queue.map((item, idx) => {
                const tmpl = templates[item.templateId] || { color: P.periwinkleD, icon: "✉", label: "Action needed" };
                const isActive = reviewIdx === idx;
                const isChecked = checkedIds.has(item.id);
                return (
                  <div key={item.id} style={{ background:P.white, borderRadius:"16px", border:`1.5px solid ${item.status==="sent"?P.green+"44":item.status==="skipped"?P.grey200:isChecked?P.periwinkle+"88":isActive?P.periwinkle+"55":P.grey100}`, overflow:"hidden", opacity:item.status==="skipped"?0.55:1, transition:"border-color 0.15s" }}>
                    {/* Queue item header */}
                    <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"14px 18px" }}>
                      {/* Checkbox — only for pending items */}
                      {item.status === "pending" ? (
                        <div onClick={() => toggleCheck(item.id)} style={{ width:20, height:20, borderRadius:"6px", border:`2px solid ${isChecked ? P.periwinkleD : P.grey200}`, background:isChecked ? P.periwinkleD : P.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.15s", flexShrink:0 }}>
                          {isChecked && <span style={{ color:P.white, fontSize:"15px", lineHeight:1, fontWeight:900 }}>✓</span>}
                        </div>
                      ) : (
                        <div style={{ width:20, height:20, flexShrink:0 }} />
                      )}
                      <div onClick={() => setReviewIdx(isActive ? -1 : idx)} style={{ display:"flex", alignItems:"center", gap:"12px", flex:1, minWidth:0, cursor:"pointer" }}>
                        <div style={{ width:34, height:34, borderRadius:"9px", background:item.status==="sent"?P.greenLight:item.status==="skipped"?P.grey50:tmpl.color+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", flexShrink:0 }}>
                          {item.status==="sent"?"✓":item.status==="skipped"?"—":<TemplateIcon tmpl={tmpl} size={18} />}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                            <span style={{ fontWeight:800, fontSize:"15px", color:P.navy }}>{item.record.displayName}</span>
                            <span style={{ fontSize:"15px", color:P.navyLight }}>{item.to}</span>
                            <span style={{ background:tmpl.color+"18", color:tmpl.color, fontSize:"15px", fontWeight:700, padding:"1px 8px", borderRadius:"20px" }}>{tmpl.label}</span>
                            {item.status==="sent" && <span style={{ background:P.greenLight, color:P.green, fontSize:"15px", fontWeight:800, padding:"1px 8px", borderRadius:"20px" }}>✓ Sent</span>}
                            {item.status==="skipped" && <span style={{ background:P.grey50, color:P.navyLight, fontSize:"15px", fontWeight:800, padding:"1px 8px", borderRadius:"20px" }}>Skipped</span>}
                            {editedIds.has(item.id) && item.status==="pending" && <span style={{ background:P.amber+"22", color:P.amber, fontSize:"15px", fontWeight:800, padding:"1px 8px", borderRadius:"20px" }}>Edited</span>}
                            {hasUnsavedEdits(item.id) && <span style={{ background:P.amber+"22", color:P.amber, fontSize:"15px", fontWeight:800, padding:"1px 8px", borderRadius:"20px" }}>⚠ Unsaved</span>}
                          </div>
                          <div style={{ fontSize:"15px", color:P.navy, marginTop:"2px", fontWeight:600 }}>{item.subject}</div>
                        </div>
                      </div>
                      {item.status === "pending" && (
                        <div style={{ display:"flex", gap:"6px", flexShrink:0 }}>
                          <Btn onClick={e => { e.stopPropagation(); openMailto(item); }} small color={P.navy}>Open in Mail ↗</Btn>
                          <Btn onClick={e => { e.stopPropagation(); markSkipped(item.id); }} small outline color={P.grey600}>Skip</Btn>
                        </div>
                      )}
                      {item.status === "sent" && (
                        <Btn onClick={e => { e.stopPropagation(); updateQueueItem(item.id, {status:"pending"}); setSentIds(prev => { const n = new Set(prev); n.delete(item.id); return n; }); }} small outline color={P.grey600}>Undo</Btn>
                      )}
                    </div>

                    {/* Expanded edit panel */}
                    {isActive && item.status === "pending" && (
                      <div style={{ borderTop:`1px solid ${P.grey100}`, padding:"18px 20px", background:P.grey50 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
                          <div style={{ fontSize:"15px", fontWeight:800, color:P.navy }}>
                            Edit Email
                            {editedIds.has(item.id) && <span style={{ marginLeft:"8px", background:P.amber+"22", color:P.amber, fontSize:"15px", fontWeight:800, padding:"2px 8px", borderRadius:"20px" }}>Edited — will use your version on bulk send</span>}
                          </div>
                          {editedIds.has(item.id) && (
                            <button onClick={() => resetToOriginal(item)} style={{ background:"transparent", border:`1px solid ${P.grey200}`, borderRadius:"7px", padding:"4px 10px", fontSize:"15px", fontWeight:700, color:P.grey500||P.grey600, fontFamily:font, cursor:"pointer" }}>
                              Reset to original
                            </button>
                          )}
                        </div>

                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
                          <div>
                            <div style={{ fontSize:"16px", fontWeight:700, color:P.navy, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px" }}>To</div>
                            <input value={getStagedField(item, "to")} onChange={e => stageEdit(item.id, "to", e.target.value)}
                              style={{ width:"100%", background:P.white, border:`1.5px solid ${localEdits[item.id]?.to !== undefined ? P.amber+"88" : P.grey200}`, borderRadius:"9px", padding:"8px 12px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
                          </div>
                          <div>
                            <div style={{ fontSize:"16px", fontWeight:700, color:P.navy, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px" }}>Subject</div>
                            <input value={getStagedField(item, "subject")} onChange={e => stageEdit(item.id, "subject", e.target.value)}
                              style={{ width:"100%", background:P.white, border:`1.5px solid ${localEdits[item.id]?.subject !== undefined ? P.amber+"88" : P.grey200}`, borderRadius:"9px", padding:"8px 12px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
                          </div>
                        </div>

                        <div style={{ marginBottom:"12px" }}>
                          <div style={{ fontSize:"16px", fontWeight:700, color:P.navy, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px" }}>Email Body</div>
                          <textarea value={getStagedField(item, "body")} onChange={e => stageEdit(item.id, "body", e.target.value)}
                            style={{ width:"100%", height:"240px", background:P.white, border:`1.5px solid ${localEdits[item.id]?.body !== undefined ? P.amber+"88" : P.grey200}`, borderRadius:"10px", padding:"12px 14px", fontSize:"15px", fontFamily:font, color:P.navy, resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.7 }} />
                        </div>

                        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                          {hasUnsavedEdits(item.id) ? (
                            <button onClick={() => { saveEdits(item.id); setReviewIdx(-1); }}
                              style={{ background:P.green, border:"none", borderRadius:"10px", padding:"9px 20px", fontSize:"15px", fontWeight:800, fontFamily:font, color:P.white, cursor:"pointer", boxShadow:"0 2px 8px rgba(34,197,94,0.3)", display:"flex", alignItems:"center", gap:"7px" }}>
                              ✓ Save Changes
                            </button>
                          ) : (
                            <button onClick={() => openMailto({ ...item, to: getStagedField(item,"to"), subject: getStagedField(item,"subject"), body: getStagedField(item,"body") })}
                              style={{ background:P.navy, border:"none", borderRadius:"10px", padding:"9px 20px", fontSize:"15px", fontWeight:800, fontFamily:font, color:P.white, cursor:"pointer" }}>
                              Open in Mail App ↗
                            </button>
                          )}
                          {hasUnsavedEdits(item.id) && (
                            <button onClick={() => openMailto({ ...item, to: getStagedField(item,"to"), subject: getStagedField(item,"subject"), body: getStagedField(item,"body") })}
                              style={{ background:"transparent", border:`1.5px solid ${P.navy}`, borderRadius:"10px", padding:"9px 20px", fontSize:"15px", fontWeight:800, fontFamily:font, color:P.navy, cursor:"pointer" }}>
                              Send without saving ↗
                            </button>
                          )}
                          <Btn onClick={() => markSkipped(item.id)} outline color={P.grey600}>Skip</Btn>
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
