import { useState } from "react";
import { Check, X } from "lucide-react";
import { P, font } from "../theme";

// ── Upload Square component (hooks must be at component top level) ──────────
export function UploadSquare({ label, icon, accent, file, setter, sub, compact }) {
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
              <div style={{ fontSize:"15px", color:P.green, fontWeight:700, fontFamily:font }}><Check size={10} strokeWidth={2.5} style={{display:"inline",marginRight:3}}/>Ready</div>
            </>
          ) : (
            <>
              <div style={{ fontSize:"15px", fontWeight:800, color:P.navy, fontFamily:font, whiteSpace:"nowrap" }}>{label}</div>
              <div style={{ fontSize:"15px", color:P.navyLight, fontFamily:font }}>{sub}</div>
            </>
          )}
        </div>
        {file && <button onClick={e => { e.preventDefault(); setter(null); }} style={{ marginLeft:"auto", background:"transparent", border:"none", color:P.navyLight, fontSize:"15px", cursor:"pointer", lineHeight:1, flexShrink:0 }} title="Remove">✕</button>}
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
      <div style={{ width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"8px", color:file?P.accent:accent, flexShrink:0 }}>{file ? <Check size={24} strokeWidth={1.8} color={P.green}/> : icon}</div>
      {file ? (
        <>
          <div style={{ color:accent, fontSize:"15px", fontWeight:600, fontFamily:font, maxWidth:"120px", wordBreak:"break-word", lineHeight:1.3, textAlign:"center" }}>{file.name}</div>
          <div style={{ marginTop:"6px", background:P.greenLight, color:P.green, fontSize:"15px", fontWeight:600, padding:"2px 10px", borderRadius:"20px", fontFamily:font, display:"flex", alignItems:"center", gap:3 }}><Check size={10} strokeWidth={2.5}/>Ready</div>
          <button onClick={e => { e.preventDefault(); setter(null); }} style={{ position:"absolute", top:9, right:12, background:"transparent", border:"none", color:P.navyLight, fontSize:"15px", cursor:"pointer", lineHeight:1, display:"flex", alignItems:"center" }} title="Remove"><X size={13} strokeWidth={1.8}/></button>
        </>
      ) : (
        <>
          <div style={{ color:P.navy, fontWeight:600, fontSize:"15px", marginBottom:"3px", fontFamily:font, textAlign:"center", lineHeight:1.3 }}>{label}</div>
          <div style={{ color:P.navyLight, fontSize:"15px", fontFamily:font, textAlign:"center" }}>{sub}</div>
        </>
      )}
    </label>
  );
}
