import { useState } from "react";
import { X, Save } from "lucide-react";
import { P, font } from "../theme";
import { Btn } from "./common";

export function ContactsModal({ contacts, onSave, onClose }) {
  const [local, setLocal] = useState(JSON.parse(JSON.stringify(contacts)));
  function update(type, field, val) {
    setLocal(prev => ({ ...prev, [type]: { ...prev[type], [field]: val } }));
  }
  const fields = [
    { key:"hotel", label:"Hotel Contact", color:P.navy, fields:[{f:"name",ph:"Contact name"},{f:"email",ph:"hotel@property.com"},{f:"phone",ph:"+1 (212) 555-0100"},{f:"property",ph:"Property / hotel name"}] },
    { key:"travel", label:"Travel Agency Contact", color:P.periwinkleD, fields:[{f:"name",ph:"Contact name"},{f:"email",ph:"agent@travelco.com"},{f:"phone",ph:"+1 (212) 555-0200"},{f:"agency",ph:"Agency name"}] },
    { key:"car", label:"Car / Transfer Contact", color:P.accentD, fields:[{f:"name",ph:"Contact name"},{f:"email",ph:"transfers@vendor.com"},{f:"phone",ph:"+1 (212) 555-0300"},{f:"vendor",ph:"Transfer vendor name"}] },
  ];  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(27,42,74,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div className="gg-modal" style={{ background:P.white, borderRadius:"22px", width:"100%", maxWidth:"620px", maxHeight:"90vh", overflow:"auto", boxShadow:"0 20px 60px rgba(27,42,74,0.3)" }}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${P.grey100}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontWeight:600, fontSize:"15px", color:P.navy, fontFamily:font }}>Event Contacts</div>
            <div style={{ fontSize:"15px", color:P.navyLight, fontFamily:font, marginTop:"2px" }}>Pre-load contacts so emails auto-populate and reports can be shared directly</div>
          </div>
          <button onClick={onClose} style={{ background:P.grey100, border:"none", borderRadius:"10px", width:30, height:30, cursor:"pointer", fontSize:"15px", color:P.navy, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15} strokeWidth={1.8}/></button>
        </div>
        <div style={{ padding:"20px 24px" }}>
          {fields.map(({ key, label, color, fields: flds }) => (
            <div key={key} style={{ marginBottom:"24px" }}>
              <div style={{ fontSize:"15px", fontWeight:600, color, marginBottom:"12px", fontFamily:font, display:"flex", alignItems:"center", gap:"8px" }}>
                <div style={{ width:3, height:16, background:color, borderRadius:"2px" }} />{label}
              </div>
              <div className="gg-contacts-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                {flds.map(({ f, ph }) => (
                  <div key={f}>
                    <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"4px" }}>{f}</div>
                    <input value={local[key]?.[f]||""} onChange={e => update(key, f, e.target.value)} placeholder={ph}
                      style={{ width:"100%", background:P.offWhite, border:`1.5px solid ${local[key]?.[f]?color+"44":P.grey100}`, borderRadius:"10px", padding:"9px 12px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* Per-property hotel contacts (multi-hotel) */}
          <div style={{ marginBottom:"24px" }}>
            <div style={{ fontSize:"15px", fontWeight:600, color:P.navy, marginBottom:"4px", fontFamily:font, display:"flex", alignItems:"center", gap:"8px" }}>
              <div style={{ width:3, height:16, background:"#C97A0A", borderRadius:"2px" }} />Additional hotel properties
            </div>
            <div style={{ fontSize:"15px", color:P.navyLight, fontFamily:font, marginBottom:"12px" }}>Running multiple hotels? Add a contact per property. Emails about each guest's room route to the matching property automatically.</div>
            {(local.hotels||[]).map((h, idx) => (
              <div key={idx} style={{ display:"flex", gap:"8px", marginBottom:"8px", alignItems:"center", flexWrap:"wrap" }}>
                <input value={h.property||""} onChange={e => setLocal(prev => ({ ...prev, hotels: prev.hotels.map((x,i)=>i===idx?{...x,property:e.target.value}:x) }))} placeholder="Property name"
                  style={{ flex:"1 1 140px", background:P.offWhite, border:`1.5px solid ${h.property?"#C97A0A44":P.grey100}`, borderRadius:"9px", padding:"9px 11px", fontSize:"15px", fontFamily:font, fontWeight:500, color:P.navy, outline:"none", minWidth:0 }} />
                <input value={h.name||""} onChange={e => setLocal(prev => ({ ...prev, hotels: prev.hotels.map((x,i)=>i===idx?{...x,name:e.target.value}:x) }))} placeholder="Contact name"
                  style={{ flex:"1 1 120px", background:P.offWhite, border:`1.5px solid ${P.grey100}`, borderRadius:"9px", padding:"9px 11px", fontSize:"15px", fontFamily:font, fontWeight:500, color:P.navy, outline:"none", minWidth:0 }} />
                <input value={h.email||""} onChange={e => setLocal(prev => ({ ...prev, hotels: prev.hotels.map((x,i)=>i===idx?{...x,email:e.target.value}:x) }))} placeholder="email@hotel.com"
                  style={{ flex:"2 1 160px", background:P.offWhite, border:`1.5px solid ${h.email?"#C97A0A44":P.grey100}`, borderRadius:"9px", padding:"9px 11px", fontSize:"15px", fontFamily:font, fontWeight:500, color:P.navy, outline:"none", minWidth:0 }} />
                <button onClick={() => setLocal(prev => ({ ...prev, hotels: prev.hotels.filter((_,i)=>i!==idx) }))} style={{ background:"transparent", border:"none", color:P.grey600, cursor:"pointer", flexShrink:0, padding:"4px" }} title="Remove"><X size={15} strokeWidth={1.8}/></button>
              </div>
            ))}
            <button onClick={() => setLocal(prev => ({ ...prev, hotels:[...(prev.hotels||[]), {property:"",name:"",email:""}] }))}
              style={{ background:"transparent", border:"none", color:P.accentD, fontSize:"15px", fontWeight:500, fontFamily:font, cursor:"pointer", marginTop:"4px", padding:"4px 0" }}>+ Add hotel property contact</button>
          </div>
          <div style={{ marginBottom:"24px" }}>
            <div style={{ fontSize:"15px", fontWeight:800, color:P.navy, marginBottom:"12px", fontFamily:font, display:"flex", alignItems:"center", gap:"8px" }}>
              <div style={{ width:3, height:16, background:P.grey600, borderRadius:"2px" }} />✍ Your Name (used in email signatures)
            </div>
            <input value={local.plannerName||""} onChange={e => setLocal(prev => ({...prev, plannerName:e.target.value}))} placeholder="e.g. Your name, Events Team"
              style={{ width:"100%", background:P.offWhite, border:`1.5px solid ${local.plannerName?P.grey600+"44":P.grey100}`, borderRadius:"10px", padding:"9px 12px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
          </div>
          <div style={{ display:"flex", gap:"10px", paddingTop:"8px", borderTop:`1px solid ${P.grey100}` }}>
            <Btn onClick={() => { onSave(local); onClose(); }} color={P.accent}>Save Contacts <Save size={13} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>
            <Btn onClick={onClose} outline>Cancel</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
