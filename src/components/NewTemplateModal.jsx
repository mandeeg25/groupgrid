import { useState } from "react";
import { X, Save } from "lucide-react";
import { P, font } from "../theme";
import { Btn } from "./common";

const ICON_OPTIONS = ["✉","📋","⭐","🔔","🎯","🚨","💬","📌","🏷","👋","🎉","⚡","📣","🤝","📝","🔁","❓","✅","🛎","💡"];
export const TRIGGER_OPTIONS = [
  { value:"all_guests", label:"All guests with email" },
  { value:"missing_hotel", label:"Missing hotel booking" },
  { value:"missing_flight", label:"Missing flight record" },
  { value:"missing_transfer", label:"Missing transfer record" },
  { value:"car_mismatch", label:"Car transfer timing mismatch" },
  { value:"needs_registration", label:"Booked travel but not registered" },
  { value:"arrives_early", label:"Arrives before check-in" },
  { value:"arrives_late", label:"Possible late arrival" },
  { value:"departs_late", label:"Departs after check-out" },
  { value:"outside_window", label:"Outside travel window" },
  { value:"has_flags", label:"Any flag / issue" },
  { value:"manual_only", label:"Manual send only (no auto-match)" },
];

export function NewTemplateModal({ onSave, onClose }) {
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
            <div style={{ fontSize:"15px", color:P.navyLight, marginTop:"2px", fontFamily:font }}>Create a custom email template for your event</div>
          </div>
          <button onClick={onClose} style={{ background:P.grey100, border:"none", borderRadius:"10px", width:30, height:30, cursor:"pointer", fontSize:"15px", color:P.navy, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15} strokeWidth={1.8}/></button>
        </div>

        <div style={{ padding:"22px 26px", display:"flex", flexDirection:"column", gap:"18px" }}>

          {/* Name + Icon row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:"14px", alignItems:"start" }}>
            <div>
              <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px", fontFamily:font }}>Template Name *</div>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. VIP Welcome Message"
                style={{ width:"100%", background:errors.label?P.redLight:P.offWhite, border:`1.5px solid ${errors.label?P.red:P.grey200}`, borderRadius:"10px", padding:"10px 14px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
              {errors.label && <div style={{ fontSize:"15px", color:P.red, fontFamily:font, marginTop:"4px" }}>{errors.label}</div>}
            </div>
            <div>
              <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px", fontFamily:font }}>Icon</div>
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
            <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px", fontFamily:font }}>Auto-Send Trigger</div>
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
            <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px", fontFamily:font }}>Subject Line *</div>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Welcome to {{eventName}}, {{guestName}}!"
              style={{ width:"100%", background:errors.subject?P.redLight:P.offWhite, border:`1.5px solid ${errors.subject?P.red:P.grey200}`, borderRadius:"10px", padding:"10px 14px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
            {errors.subject && <div style={{ fontSize:"15px", color:P.red, fontFamily:font, marginTop:"4px" }}>{errors.subject}</div>}
          </div>

          {/* Body */}
          <div>
            <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px", fontFamily:font }}>Email Body *</div>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={`Hi {{guestName}},\n\nWe're looking forward to seeing you at {{eventName}}!\n\n{{plannerName}}\n{{eventName}} Planning Team`}
              style={{ width:"100%", height:"240px", background:errors.body?P.redLight:P.offWhite, border:`1.5px solid ${errors.body?P.red:P.grey200}`, borderRadius:"10px", padding:"14px", fontSize:"15px", fontFamily:font, color:P.navy, resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.7 }} />
            {errors.body && <div style={{ fontSize:"15px", color:P.red, fontFamily:font, marginTop:"4px" }}>{errors.body}</div>}
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:"10px", paddingTop:"4px" }}>
            <Btn onClick={handleSave} color={P.accent}>Save Template <Save size={13} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>
            <Btn onClick={onClose} outline>Cancel</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
