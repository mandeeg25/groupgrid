import { useState } from "react";
import { X } from "lucide-react";
import { P, font } from "../theme";

export function SupportModal({ user, onClose }) {
  const [stEmail, setStEmail] = useState(user?.email || "");
  const [stCategory, setStCategory] = useState("Question");
  const [stSubject, setStSubject] = useState("");
  const [stBody, setStBody] = useState("");
  const ready = !!(stSubject.trim() && stBody.trim());
  const send = () => {
    if (!ready) return;
    const subjectLine = `SUPPORT TICKET: ${stSubject.trim()}`;
    const lines = [
      stBody.trim(),
      "",
      "----",
      `Category: ${stCategory}`,
      stEmail.trim() ? `Reply to: ${stEmail.trim()}` : "",
      "Sent from the GroupGrid in-app support form",
    ].filter(Boolean);
    const routeAddr = stCategory === "Account / billing" ? "billing@groupgrid.io" : "support@groupgrid.io";
    window.location.href = `mailto:${routeAddr}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(lines.join("\n"))}`;
  };
  const inputStyle = (filled) => ({ width:"100%", background:P.grey50, border:`1.5px solid ${filled?P.accent+"66":P.grey100}`, borderRadius:"10px", padding:"11px 13px", fontSize:"15px", color:P.navy, fontFamily:font, outline:"none", boxSizing:"border-box" });
  const labelStyle = { display:"block", fontSize:"16px", fontWeight:600, color:P.grey600, fontFamily:font, marginBottom:"6px" };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(27,42,74,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div className="gg-modal" style={{ background:P.white, borderRadius:"22px", width:"100%", maxWidth:"560px", maxHeight:"90vh", overflow:"auto", boxShadow:"0 20px 60px rgba(27,42,74,0.3)" }}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${P.grey100}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:"14px" }}>
          <div>
            <div style={{ fontWeight:700, fontSize:"16px", color:P.navy, fontFamily:font }}>Contact support</div>
            <div style={{ fontSize:"16px", color:P.grey600, fontFamily:font, marginTop:"2px", lineHeight:1.5 }}>We reply within one business day. This opens a pre-filled email to {stCategory === "Account / billing" ? "billing@groupgrid.io" : "support@groupgrid.io"} in your mail app.</div>
          </div>
          <button onClick={onClose} style={{ background:P.grey100, border:"none", borderRadius:"10px", width:30, height:30, cursor:"pointer", color:P.navy, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><X size={15} strokeWidth={1.8}/></button>
        </div>
        <div style={{ padding:"20px 24px" }}>
          <div className="gg-contacts-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"14px" }}>
            <div>
              <label style={labelStyle}>Your email <span style={{ color:P.grey600, fontWeight:400 }}>· so we can reply</span></label>
              <input type="email" value={stEmail} onChange={e=>setStEmail(e.target.value)} placeholder="you@company.com" style={inputStyle(stEmail.trim())} />
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={stCategory} onChange={e=>setStCategory(e.target.value)} style={{ ...inputStyle(true), appearance:"none", cursor:"pointer", fontWeight:600 }}>
                {["Question","Bug report","Feature request","Account / billing","Urgent event-day issue","Other"].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:"14px" }}>
            <label style={labelStyle}>Subject <span style={{ color:P.red }}>required</span></label>
            <input type="text" value={stSubject} onChange={e=>setStSubject(e.target.value)} placeholder="Short summary of the issue" style={inputStyle(stSubject.trim())} />
          </div>
          <div style={{ marginBottom:"18px" }}>
            <label style={labelStyle}>Description <span style={{ color:P.red }}>required</span></label>
            <textarea value={stBody} onChange={e=>setStBody(e.target.value)} rows={5} placeholder="What happened, what you expected, and any steps to reproduce it. Include your event name if it helps." style={{ ...inputStyle(stBody.trim()), resize:"vertical", lineHeight:1.6 }} />
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:"12px", flexWrap:"wrap" }}>
            <button onClick={onClose} style={{ background:"transparent", border:`1.5px solid ${P.grey200}`, borderRadius:"10px", padding:"10px 18px", fontSize:"17px", fontWeight:600, color:P.grey600, fontFamily:font, cursor:"pointer" }}>Cancel</button>
            <button onClick={send} disabled={!ready} style={{ background:ready?P.accent:P.grey100, color:ready?P.white:P.grey600, border:"none", borderRadius:"10px", padding:"11px 22px", fontSize:"15px", fontWeight:800, fontFamily:font, cursor:ready?"pointer":"not-allowed", boxShadow:ready?"0 2px 12px rgba(0,201,177,0.35)":"none", transition:"all 0.18s", whiteSpace:"nowrap" }}>Send support ticket →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
