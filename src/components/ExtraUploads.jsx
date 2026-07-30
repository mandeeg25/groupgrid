import { X } from "lucide-react";
import { P, font } from "../theme";

export function tagSrc(arr, src){ return (arr||[]).map(r => ({ ...r, source: (src||"").toString().trim() })); }

export function ExtraUploads({ show, items, setItems, Icon, color }) {
  if (!show) return null;
  return (
    <div style={{ marginBottom:"14px" }}>
      {items.map((it) => (
        <div key={it.id} style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px", background:P.grey50, border:`1px solid ${P.grey100}`, borderRadius:"9px", padding:"8px 12px" }}>
          <Icon size={16} strokeWidth={1.8} color={color} style={{ flexShrink:0 }}/>
          <label style={{ flex:"0 0 130px", overflow:"hidden" }}>
            <input type="file" accept=".xlsx,.xls,.csv,.pdf" style={{ display:"none" }} onChange={e => { const fl = e.target.files[0]; if (fl) setItems(prev => prev.map(x => x.id===it.id ? { ...x, file:fl } : x)); }} />
            <span style={{ display:"inline-block", fontSize:"15px", color:it.file?P.navy:P.periwinkleD, fontFamily:font, cursor:"pointer", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"130px", fontWeight:500 }}>{it.file ? it.file.name : "+ choose file"}</span>
          </label>
          <input value={it.source} onChange={e => setItems(prev => prev.map(x => x.id===it.id ? { ...x, source:e.target.value } : x))} placeholder="Source (e.g. Concur)"
            style={{ flex:1, background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"8px", padding:"7px 11px", fontSize:"15px", color:P.navy, fontFamily:font, outline:"none", minWidth:0 }} />
          <button onClick={() => setItems(prev => prev.filter(x => x.id !== it.id))} style={{ background:"transparent", border:"none", color:P.grey600, cursor:"pointer", flexShrink:0 }} title="Remove"><X size={15} strokeWidth={1.8}/></button>
        </div>
      ))}
      <button onClick={() => setItems(prev => [...prev, { id:Date.now(), file:null, source:"" }])}
        style={{ background:"transparent", border:"none", color:P.accentD, fontSize:"15px", fontWeight:500, fontFamily:font, cursor:"pointer", padding:"2px 0" }}>+ Add another file</button>
    </div>
  );
}
