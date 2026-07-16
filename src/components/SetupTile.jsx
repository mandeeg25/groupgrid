import { useState } from "react";
import { Check, X } from "lucide-react";
import { P, font } from "../theme";

export function SetupTile({ label, sub, icon, accent, file, setter, required, columns }) {
  const [drag, setDrag] = useState(false);
  const [hover, setHover] = useState(false);
  const onDrop = e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setter(f); };
  return (
    <label
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
      style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", justifyContent:"center", minHeight:"84px", border:`1.5px ${file?"solid":"dashed"} ${file?accent:drag?accent:P.grey200}`, borderRadius:"11px", padding:"14px 8px", cursor:"pointer", background:file?accent+"0D":drag?accent+"08":P.grey50, transition:"all 0.15s" }}>
      <input type="file" accept=".xlsx,.xls,.csv,.pdf" style={{ display:"none" }} onChange={e => e.target.files[0] && setter(e.target.files[0])} />
      <div style={{ marginTop:"2px", marginBottom:"6px", color:file?P.green:accent }}>{file ? <Check size={20} strokeWidth={1.8} color={P.green}/> : icon}</div>
      <div style={{ fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font, marginBottom:"1px", wordBreak:"break-word", maxWidth:"140px", lineHeight:1.25 }}>{file ? file.name : label}</div>
      {(file || sub) && <div style={{ fontSize:"12.5px", color:file?P.green:required?P.red:P.grey600, fontFamily:font, fontWeight:(file||required)?600:400, marginTop:"1px" }}>{file ? "Ready" : sub}</div>}
      {file && <button onClick={e => { e.preventDefault(); setter(null); }} style={{ position:"absolute", top:8, right:10, background:"transparent", border:"none", color:P.grey600, cursor:"pointer", lineHeight:1 }} title="Remove"><X size={13} strokeWidth={1.8}/></button>}
      {hover && !file && columns && (
        <div style={{ position:"absolute", bottom:"calc(100% + 8px)", left:"50%", transform:"translateX(-50%)", width:"210px", background:P.navy, borderRadius:"10px", padding:"12px 14px", boxShadow:"0 8px 24px rgba(0,0,0,0.3)", zIndex:30, textAlign:"left", pointerEvents:"none" }}>
          <div style={{ fontSize:"15px", fontWeight:600, color:P.accent, fontFamily:font, marginBottom:"7px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Expected columns</div>
          {columns.map(c => <div key={c} style={{ fontSize:"15px", color:"rgba(255,255,255,0.75)", fontFamily:font, lineHeight:1.7 }}>{c}</div>)}
        </div>
      )}
    </label>
  );
}
