import { Mail, AlertTriangle, CreditCard, Users, ChevronRight } from "lucide-react";
import { P, font, fontDisplay } from "../theme";
import { PageShell } from "./PageShell";

export function ContactPage({ onBack, nav }) {
  const departments = [
    { Icon: AlertTriangle, label: "Support",      desc: "Trouble with an upload, a flag that looks wrong, or an event-day issue.", email: "support@groupgrid.io" },
    { Icon: CreditCard,    label: "Billing",      desc: "Plans, invoices, receipts, and payment questions.",                        email: "billing@groupgrid.io" },
    { Icon: Users,         label: "Partnerships", desc: "Integrations, referrals, and ways to work together.",                     email: "hello@groupgrid.io" },
  ];

  return (
    <PageShell title="Contact" onBack={onBack} nav={nav}>
      {/* ── Hero ── */}
      <div style={{ marginBottom:"36px" }}>
        <div style={{ fontSize:"13px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:P.accentD, fontFamily:font, marginBottom:"14px" }}>Contact</div>
        <h1 style={{ fontSize:"clamp(30px,5vw,44px)", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 14px", letterSpacing:"-0.03em", lineHeight:1.1 }}>Let's talk.</h1>
        <p style={{ fontSize:"18px", color:P.grey600, fontFamily:font, lineHeight:1.6, margin:0, maxWidth:"520px" }}>Questions, feedback, or a hand getting started — reach the right team below and a real person will get back to you.</p>
      </div>

      {/* ── Primary contact ── */}
      <a href="mailto:hello@groupgrid.io" style={{ display:"block", textDecoration:"none", marginBottom:"16px" }}>
        <div style={{ background:P.navy, borderRadius:"16px", padding:"28px 30px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"22px", flexWrap:"wrap" }}>
          <div style={{ maxWidth:"460px" }}>
            <div style={{ fontSize:"20px", fontWeight:700, color:P.white, fontFamily:fontDisplay, marginBottom:"6px", letterSpacing:"-0.01em" }}>Talk to us</div>
            <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.72)", fontFamily:font, lineHeight:1.6 }}>General questions, a quick walkthrough, or anything sales-related. This is the fastest way to reach us.</div>
          </div>
          <div style={{ display:"inline-flex", alignItems:"center", gap:"10px", background:P.accent, color:P.white, borderRadius:"11px", padding:"13px 22px", fontSize:"15px", fontWeight:700, fontFamily:font, whiteSpace:"nowrap", flexShrink:0, boxShadow:"0 4px 18px rgba(0,201,177,0.3)" }}>
            <Mail size={17} strokeWidth={2} /> hello@groupgrid.io
          </div>
        </div>
      </a>

      {/* ── Department directory ── */}
      <div style={{ fontSize:"12px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:P.grey600, fontFamily:font, margin:"26px 0 10px", paddingLeft:"2px" }}>Reach a specific team</div>
      <div style={{ background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"16px", overflow:"hidden", marginBottom:"32px" }}>
        {departments.map(({ Icon, label, desc, email }, i) => (
          <a key={label} href={`mailto:${email}`}
            style={{ display:"flex", alignItems:"center", gap:"16px", padding:"18px 22px", textDecoration:"none", borderTop: i===0 ? "none" : `1px solid ${P.grey100}` }}>
            <div style={{ width:42, height:42, borderRadius:"11px", background:P.grey50, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Icon size={19} strokeWidth={1.8} color={P.navy} />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:"16px", fontWeight:700, color:P.navy, fontFamily:font, marginBottom:"2px" }}>{label}</div>
              <div style={{ fontSize:"14px", color:P.grey600, fontFamily:font, lineHeight:1.5 }}>{desc}</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"4px", color:P.accentD, fontSize:"14px", fontWeight:600, fontFamily:font, flexShrink:0, whiteSpace:"nowrap" }}>
              <span className="gg-contact-email">{email}</span>
              <ChevronRight size={16} strokeWidth={2.2} />
            </div>
          </a>
        ))}
      </div>

      {/* ── Response time note ── */}
      <div style={{ display:"flex", gap:"14px", alignItems:"flex-start", background:P.grey50, border:`1px solid ${P.grey100}`, borderRadius:"12px", padding:"18px 20px" }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:P.accent, flexShrink:0, marginTop:"7px" }} />
        <div>
          <div style={{ fontSize:"15px", fontWeight:700, color:P.navy, fontFamily:font, marginBottom:"3px" }}>Response times</div>
          <div style={{ fontSize:"14px", color:P.grey600, fontFamily:font, lineHeight:1.6 }}>We reply to most messages within 1–2 business days. For an urgent, event-day issue, add <strong style={{ color:P.navy }}>URGENT</strong> to your subject line and we'll prioritize it.</div>
        </div>
      </div>
    </PageShell>
  );
}
