import { useState } from "react";
import { P, font, fontDisplay } from "../theme";

// ── Early-access capture ──────────────────────────────────────────────────────
// Renders our own branded UI and posts to the published HubSpot form, so none of
// HubSpot's styling or free-tier branding appears. IDs come from the form's
// submissions URL. To collect company + events-per-year, add matching fields in
// the HubSpot form editor, then set HS_ENABLE_QUALIFIERS true.
const HS_PORTAL_ID = "246592315";
const HS_FORM_GUID = "640bb175-27b8-4971-80ad-c5639a63dd6a";
const HS_SUBMIT_URL = `https://api.hsforms.com/submissions/v3/integration/submit/${HS_PORTAL_ID}/${HS_FORM_GUID}`;
const HS_ENABLE_QUALIFIERS = false;
const HS_PRIVACY_URL = "https://groupgrid.io/privacy";

function getCookie(name) {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
  return m ? m.pop() : undefined;
}

export function EarlyAccessForm() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [eventsPerYear, setEventsPerYear] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  async function submit() {
    if (!validEmail(email)) { setStatus("error"); setErrorMsg("Enter a valid email so we can reach you."); return; }
    setStatus("submitting"); setErrorMsg("");
    const fields = [{ objectTypeId:"0-1", name:"email", value:email.trim() }];
    if (HS_ENABLE_QUALIFIERS) {
      if (company.trim()) fields.push({ objectTypeId:"0-1", name:"company", value:company.trim() });
      if (eventsPerYear) fields.push({ objectTypeId:"0-1", name:"events_per_year", value:eventsPerYear });
    }
    const ctx = { pageUri: typeof window!=="undefined"?window.location.href:"", pageName: typeof document!=="undefined"?document.title:"" };
    const hutk = getCookie("hubspotutk"); if (hutk) ctx.hutk = hutk;
    try {
      const res = await fetch(HS_SUBMIT_URL, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ fields, context:ctx }) });
      if (res.ok) { setStatus("success"); return; }
      let detail = ""; try { const d = await res.json(); detail = (d.errors&&d.errors[0]&&d.errors[0].message)||d.message||""; } catch(_){}
      setStatus("error"); setErrorMsg(/email/i.test(detail) ? "That email looks invalid — mind double-checking it?" : "Something went wrong on our end. Please try again in a moment.");
    } catch(_) { setStatus("error"); setErrorMsg("We couldn't reach the server. Check your connection and try again."); }
  }
  const onKey = e => { if (e.key === "Enter") submit(); };

  const card = { boxSizing:"border-box", width:"100%", maxWidth:"440px", background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"20px", padding:"32px 30px", fontFamily:font, boxShadow:"0 14px 40px rgba(12,30,63,0.10)" };
  const inputBase = { boxSizing:"border-box", width:"100%", padding:"12px 14px", fontSize:"15px", fontFamily:font, color:P.navy, background:P.white, borderRadius:"11px", outline:"none" };

  if (status === "success") {
    return (
      <div style={card}>
        <div style={{ width:44, height:44, borderRadius:12, background:P.accent, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
          <span style={{ color:P.white, fontSize:22, fontWeight:800, lineHeight:1 }}>✓</span>
        </div>
        <h3 style={{ margin:"0 0 8px", fontFamily:fontDisplay, fontWeight:700, fontSize:22, color:P.navy }}>You're on the list</h3>
        <p style={{ margin:0, fontSize:15, lineHeight:1.55, color:P.grey600 }}>Thanks for signing up for early access to GroupGrid. We'll reach out as soon as your access is ready, with a quick guide to load your first event.</p>
      </div>
    );
  }
  return (
    <div style={card}>
      <div aria-hidden="true" style={{ display:"grid", gridTemplateColumns:"repeat(3, 7px)", gap:"5px", marginBottom:"18px" }}>
        {[0,1,2,3,4,5,6,7,8].map(i => <span key={i} style={{ width:7, height:7, borderRadius:2, background:i===4?P.accent:P.periwinkle, opacity:i===4?1:0.55 }} />)}
      </div>
      <h3 style={{ margin:"0 0 8px", fontFamily:fontDisplay, fontWeight:700, fontSize:24, lineHeight:1.2, color:P.navy }}>Get early access to GroupGrid</h3>
      <p style={{ margin:"0 0 22px", fontSize:15, lineHeight:1.55, color:P.grey600 }}>Catch travel and logistics issues before they reach your attendees. Join the list and we'll be in touch when your spot opens.</p>
      <label htmlFor="gg-ea-email" style={{ display:"block", fontSize:13, fontWeight:700, color:P.navyLight, marginBottom:6 }}>Work email</label>
      <input id="gg-ea-email" type="email" autoComplete="email" value={email} onKeyDown={onKey}
        onChange={e => { setEmail(e.target.value); if (status==="error") { setStatus("idle"); setErrorMsg(""); } }}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="you@company.com"
        style={{ ...inputBase, border:`1.5px solid ${status==="error"?P.red:focused?P.accent:P.grey200}`, transition:"border-color 0.15s" }} />
      {HS_ENABLE_QUALIFIERS && (
        <div style={{ marginTop:14 }}>
          <label htmlFor="gg-ea-company" style={{ display:"block", fontSize:13, fontWeight:700, color:P.navyLight, marginBottom:6 }}>Company</label>
          <input id="gg-ea-company" type="text" value={company} onChange={e => setCompany(e.target.value)} onKeyDown={onKey} placeholder="Where you run events" style={{ ...inputBase, border:`1.5px solid ${P.grey200}` }} />
          <label htmlFor="gg-ea-events" style={{ display:"block", fontSize:13, fontWeight:700, color:P.navyLight, margin:"14px 0 6px" }}>Events per year</label>
          <select id="gg-ea-events" value={eventsPerYear} onChange={e => setEventsPerYear(e.target.value)} style={{ ...inputBase, color:eventsPerYear?P.navy:P.grey600, border:`1.5px solid ${P.grey200}` }}>
            <option value="">Select a range</option>
            <option value="1-5">1 to 5</option>
            <option value="6-15">6 to 15</option>
            <option value="16-50">16 to 50</option>
            <option value="50+">50+</option>
          </select>
        </div>
      )}
      {status === "error" && <p role="alert" style={{ margin:"10px 0 0", fontSize:13, fontWeight:600, color:P.red }}>{errorMsg}</p>}
      <button type="button" onClick={submit} disabled={status==="submitting"}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        style={{ width:"100%", marginTop:18, padding:"13px 16px", fontSize:15, fontWeight:700, fontFamily:font, color:P.white, background:status==="submitting"?P.navyLight:hovered?P.accentD:P.accent, border:"none", borderRadius:11, cursor:status==="submitting"?"default":"pointer", transition:"background 0.15s" }}>
        {status === "submitting" ? "Joining…" : "Get early access"}
      </button>
      <p style={{ margin:"14px 0 0", fontSize:12, lineHeight:1.5, color:P.grey600, textAlign:"center" }}>We respect your privacy. <a href={HS_PRIVACY_URL} style={{ color:P.navyLight, textDecoration:"underline" }}>Privacy</a></p>
    </div>
  );
}
