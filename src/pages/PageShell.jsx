import { P, font } from "../theme";
import { BrandMark, BrandWordmark } from "../icons";

// ── Static Pages ─────────────────────────────────────────────────────────────
export function PageShell({ title, onBack, nav, children }) {
  return (
    <div style={{ minHeight:"100vh", background:P.offWhite, fontFamily:font }}>
      {nav ? <MarketingNav nav={nav} /> : (
      <div style={{ background:P.navy, padding:"0 32px", height:"52px", display:"flex", alignItems:"center", gap:"16px", boxShadow:"0 1px 0 rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"8px", padding:"5px 12px", color:"rgba(255,255,255,0.7)", fontSize:"15px", fontFamily:font, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:"6px" }}>← Back</button>
        <span style={{ color:P.white, fontSize:"15px", fontWeight:700, fontFamily:font }}>{title}</span>
      </div>
      )}
      <div style={{ maxWidth:"760px", margin:"0 auto", padding:"48px 28px" }}>
        {children}
      </div>
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <div style={{ marginBottom:"36px" }}>
      <h2 style={{ fontSize:"18px", fontWeight:800, color:P.navy, fontFamily:font, margin:"0 0 12px", letterSpacing:"-0.02em" }}>{title}</h2>
      <div style={{ fontSize:"16px", color:P.grey600, fontFamily:font, lineHeight:1.8 }}>{children}</div>
    </div>
  );
}

export function MarketingNav({ nav }) {
  // Persistent marketing header: logo returns home, tabs navigate, current tab highlighted, Open App on the right.
  const tabs = [
    { key:"landing", label:"Home",    go: nav?.onHome },
    { key:"pricing", label:"Pricing", go: nav?.onPricing },
    { key:"about",   label:"About",   go: nav?.onAbout },
    { key:"faq",     label:"FAQ",     go: nav?.onFaq },
    { key:"contact", label:"Contact", go: nav?.onContact },
  ];
  return (
    <div style={{ position:"sticky", top:0, zIndex:50, background:P.navy, padding:"0 16px", minHeight:"56px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px", boxShadow:"0 1px 0 rgba(255,255,255,0.06)", flexWrap:"nowrap" }}>
      <button onClick={nav?.onHome} style={{ display:"flex", alignItems:"center", gap:"9px", background:"none", border:"none", cursor:"pointer", padding:0, flexShrink:0 }}>
        <BrandMark size={26} onDark={true} />
        <BrandWordmark light={true} size={17} />
      </button>
      <div style={{ display:"flex", alignItems:"center", gap:"4px", flexShrink:0 }}>
        <div className="gg-mktnav-tabs" style={{ display:"flex", alignItems:"center", gap:"4px" }}>
        {tabs.map(t => {
          const active = nav?.current === t.key;
          return (
            <button key={t.key} onClick={t.go} style={{ background: active ? "rgba(0,201,177,0.15)" : "transparent", border:"none", borderRadius:"7px", padding:"6px 12px", color: active ? P.accent : "rgba(255,255,255,0.7)", fontSize:"15px", fontWeight: active ? 700 : 500, fontFamily:font, cursor:"pointer", whiteSpace:"nowrap" }}>{t.label}</button>
          );
        })}
        </div>
        <button onClick={nav?.onApp} style={{ marginLeft:"4px", background:P.accent, border:"none", borderRadius:"8px", padding:"8px 14px", fontSize:"15px", fontWeight:700, color:P.white, fontFamily:font, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>Open App →</button>
      </div>
    </div>
  );
}
