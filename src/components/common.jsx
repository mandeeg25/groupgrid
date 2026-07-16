import { Circle, AlertTriangle, Calendar, AlertCircle, Ban, Plane, Check } from "lucide-react";
import { P, font } from "../theme";
import { ClearedIcon } from "../icons";

export function StatusChip({ status }) {
  const cfg = { ok:{label:"Aligned",bg:P.greenLight,color:P.green}, warn:{label:"1 Issue",bg:P.amberLight,color:P.amber}, error:{label:"Action Needed",bg:P.redLight,color:P.red} };
  const s = cfg[status] || cfg.ok;
  return <span style={{ display:"inline-flex", alignItems:"center", gap:"5px", background:s.bg, color:s.color, borderRadius:"20px", padding:"2px 9px 2px 7px", fontSize:"15px", fontWeight:600, fontFamily:font, whiteSpace:"nowrap" }}>{status==="ok" ? <ClearedIcon size={14} line={s.color} accent={s.color} /> : <span style={{ width:5, height:5, borderRadius:"50%", background:s.color, display:"inline-block" }} />}{s.label}</span>;
}

export function Delta({ val }) {
  if (val === null || val === undefined) return <span style={{ color:P.grey600 }}>—</span>;
  if (val === 0) return <span style={{ color:P.green, fontWeight:700, fontFamily:font, fontSize:"15px" }}>On time</span>;
  const days = Math.abs(val);
  const word = days === 1 ? "day" : "days";
  const dir  = val > 0 ? "late" : "early";
  return <span style={{ color:days<=1?P.amber:P.red, fontWeight:700, fontFamily:font, fontSize:"15px", whiteSpace:"nowrap" }}>{days} {word} {dir}</span>;
}

export function IssueTag({ issue, resolved, onResolve }) {
  const cfg = { missing:{bg:P.amberLight,color:P.amber,border:`1px solid ${P.amber}44`,icon:<Circle size={11} strokeWidth={1.8}/>}, mismatch:{bg:P.redLight,color:P.red,border:`1px solid ${P.red}44`,icon:<AlertTriangle size={11} strokeWidth={1.8}/>}, window:{bg:P.purpleLight,color:P.purple,border:`1px solid ${P.purple}44`,icon:<Calendar size={11} strokeWidth={1.8}/>}, duplicate:{bg:"#FEF2DC",color:"#C97A0A",border:"1px solid #C97A0A44",icon:<AlertCircle size={11} strokeWidth={1.8}/>}, unregistered:{bg:P.purpleLight,color:P.purple,border:`1px solid ${P.purple}44`,icon:<Ban size={11} strokeWidth={1.8}/>}, airport:{bg:"#EAF2FE",color:"#4F8EF7",border:"1px solid #4F8EF744",icon:<Plane size={11} strokeWidth={1.8}/>}, earlyarrival:{bg:"#EAF2FE",color:P.periwinkleD,border:`1px solid ${P.periwinkleD}44`,icon:<Calendar size={11} strokeWidth={1.8}/>}, earlydeparture:{bg:"#EAF2FE",color:P.periwinkleD,border:`1px solid ${P.periwinkleD}44`,icon:<Calendar size={11} strokeWidth={1.8}/>} };
  const s = cfg[issue.type] || cfg.mismatch;
  const isRes = (resolved || []).includes(issue.text);
  return (
    <div style={{ background:isRes?"#EEF1F8":s.bg, border:isRes?`1px solid ${P.grey100}`:s.border, borderRadius:"8px", padding:"7px 11px", fontSize:"15px", color:isRes?P.grey600:s.color, fontWeight:700, fontFamily:font, marginBottom:"6px", display:"flex", alignItems:"flex-start", gap:"6px", opacity:isRes?0.6:1 }}>
      <span style={{ flexShrink:0, display:"flex", alignItems:"center" }}>{isRes?<Check size={11} strokeWidth={2.5}/>:s.icon}</span>
      <span style={{ flex:1, textDecoration:isRes?"line-through":"none" }}>{issue.text}</span>
      <button onClick={e => { e.stopPropagation(); onResolve(issue.text); }} style={{ background:"transparent", border:`1px solid ${isRes?P.grey200:s.color}`, borderRadius:"6px", padding:"2px 8px", fontSize:"15px", color:isRes?P.grey600:s.color, fontWeight:700, fontFamily:font, cursor:"pointer", flexShrink:0 }}>{isRes?"Unresolve":"Resolve"}</button>
    </div>
  );
}

export function Card({ title, color, children }) {
  return (
    <div style={{ background:P.white, borderRadius:"10px", padding:"14px 16px", border:`1px solid ${P.grey100}` }}>
      <div style={{ fontSize:"17px", color, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:font, marginBottom:"10px" }}>{title}</div>
      {children}
    </div>
  );
}

export function DR({ label, val, accent, warn }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", gap:"8px", fontSize:"15px", fontFamily:font, marginBottom:"4px" }}>
      <span style={{ color:P.navy, fontWeight:600, flexShrink:0 }}>{label}</span>
      <span style={{ color:warn?P.red:accent?P.periwinkleD:P.navy, fontWeight:accent||warn?700:500, textAlign:"right", wordBreak:"break-all" }}>{val||"—"}</span>
    </div>
  );
}

export function Btn({ onClick, children, color, outline, small, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background:disabled?P.grey100:outline?"transparent":(color||P.navy), color:disabled?P.grey600:outline?(color||P.navy):P.white, border:`1.5px solid ${disabled?P.grey200:(color||P.navy)}`, borderRadius:"7px", padding:small?"4px 11px":"8px 18px", fontSize:small?"11px":"12px", fontWeight:500, fontFamily:font, cursor:disabled?"not-allowed":"pointer", whiteSpace:"nowrap" }}>{children}</button>
  );
}
