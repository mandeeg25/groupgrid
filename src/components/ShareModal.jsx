import { useState } from "react";
import { X, Download, Copy } from "lucide-react";
import { P, font } from "../theme";

export function ShareModal({ html, filename, onClose }) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [tab, setTab] = useState("options"); // "options" | "preview"

  function download() {
    const blob = new Blob([html], { type:"text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  }

  function copyHtml() {
    navigator.clipboard?.writeText(html).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => download());
  }

  // Build a safe srcdoc preview (no blob URLs, no window.open)
  const iframeSrc = html;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(27,42,74,0.65)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:P.white, borderRadius:"20px", width:"100%", maxWidth: tab==="preview" ? "900px" : "480px", maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(27,42,74,0.3)", overflow:"hidden", transition:"max-width 0.2s" }}>

        {/* Header */}
        <div style={{ background:P.navy, padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            <div>
              <div style={{ fontWeight:800, fontSize:"15px", color:P.white, fontFamily:font }}>Share Report</div>
              <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.45)", fontFamily:font, marginTop:"1px" }}>{filename}</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            {/* Tab toggle */}
            <div style={{ display:"flex", background:"rgba(255,255,255,0.08)", borderRadius:"8px", padding:"3px", gap:"3px" }}>
              {[["options","Options"],["preview","Preview"]].map(([t,label]) => (
                <button key={t} onClick={() => setTab(t)} style={{ padding:"4px 12px", borderRadius:"6px", border:"none", cursor:"pointer", fontFamily:font, fontSize:"15px", fontWeight:700, background:tab===t?"rgba(255,255,255,0.15)":"transparent", color:tab===t?P.white:"rgba(255,255,255,0.45)", transition:"all 0.15s" }}>{label}</button>
              ))}
            </div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"8px", width:28, height:28, cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={14} strokeWidth={1.8}/></button>
          </div>
        </div>

        {tab === "options" && (
          <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:"10px" }}>

            {/* Download */}
            <button onClick={download} style={{ display:"flex", alignItems:"center", gap:"14px", background:downloaded?P.greenLight:P.offWhite, border:`2px solid ${downloaded?P.green:P.grey200}`, borderRadius:"12px", padding:"14px 18px", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}>
              <div style={{ width:38, height:38, borderRadius:"10px", background:downloaded?P.green:P.navy, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background 0.15s" }}>
                <Download size={17} strokeWidth={1.8} color="white"/>
              </div>
              <div>
                <div style={{ fontSize:"15px", fontWeight:700, color:downloaded?P.green:P.navy, fontFamily:font }}>{downloaded ? "✓ Downloaded!" : "Download HTML File"}</div>
                <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginTop:"2px" }}>Save to your device. Email it, or upload to Google Drive to share with your team.</div>
              </div>
            </button>

            {/* Copy HTML */}
            <button onClick={copyHtml} style={{ display:"flex", alignItems:"center", gap:"14px", background:copied?"#EAF2FE":P.offWhite, border:`2px solid ${copied?P.periwinkleD:P.grey200}`, borderRadius:"12px", padding:"14px 18px", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}>
              <div style={{ width:38, height:38, borderRadius:"10px", background:copied?P.periwinkleD:P.periwinkle, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background 0.15s" }}>
                <Copy size={17} strokeWidth={1.8} color="white"/>
              </div>
              <div>
                <div style={{ fontSize:"15px", fontWeight:700, color:copied?P.periwinkleD:P.navy, fontFamily:font }}>{copied ? "✓ HTML copied!" : "Copy HTML Source"}</div>
                <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginTop:"2px" }}>Copy the full HTML to paste into an email, CMS, or any editor that accepts HTML.</div>
              </div>
            </button>

            <div style={{ background:P.offWhite, borderRadius:"8px", padding:"10px 14px", fontSize:"15px", color:P.grey600, fontFamily:font, lineHeight:1.6 }}>
              🔒 All guest data is embedded in the file only — nothing is uploaded anywhere.
            </div>
          </div>
        )}

        {tab === "preview" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
            <div style={{ padding:"8px 16px", background:P.offWhite, borderBottom:`1px solid ${P.grey100}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:"15px", color:P.grey600, fontFamily:font }}>Report preview</span>
              <button onClick={download} style={{ display:"flex", alignItems:"center", gap:"6px", background:P.navy, border:"none", borderRadius:"8px", padding:"6px 14px", cursor:"pointer", fontFamily:font, fontSize:"15px", fontWeight:700, color:P.white }}>
                <Download size={13} strokeWidth={1.8} color="white"/> Download
              </button>
            </div>
            <iframe
              srcDoc={iframeSrc}
              style={{ flex:1, border:"none", width:"100%", minHeight:"520px" }}
              sandbox="allow-same-origin"
              title="Report Preview"
            />
          </div>
        )}

      </div>
    </div>
  );
}
