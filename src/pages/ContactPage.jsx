import { Mail, CreditCard, AlertTriangle, Plus, Users } from "lucide-react";
import { P, font, fontDisplay } from "../theme";
import { PageShell, Section } from "./PageShell";

export function ContactPage({ onBack, nav }) {
  return (
    <PageShell title="Contact Us" onBack={onBack} nav={nav}>
      <div style={{ marginBottom:"40px" }}>
        <h1 style={{ fontSize:"32px", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 12px", letterSpacing:"-0.03em" }}>Get in touch.</h1>
        <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, margin:0 }}>Have a question, found a bug, or want to share feedback? We'd love to hear from you.</p>
      </div>
      <div className="gg-card-grid-3" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"36px" }}>
        {[
          { Icon:Mail, label:"General Inquiries", value:"hello@groupgrid.io", href:"mailto:hello@groupgrid.io", color:P.periwinkleD, bg:P.grey50 },
          { Icon:CreditCard, label:"Billing & Pricing", value:"billing@groupgrid.io", href:"mailto:billing@groupgrid.io", color:P.teal, bg:P.tealLight },
          { Icon:AlertTriangle, label:"Bug Reports", value:"support@groupgrid.io", href:"mailto:support@groupgrid.io", color:P.red, bg:P.redLight },
          { Icon:Plus, label:"Feature Requests", value:"support@groupgrid.io", href:"mailto:support@groupgrid.io", color:P.accentD, bg:P.accentLight },
          { Icon:Users, label:"Partnerships", value:"hello@groupgrid.io", href:"mailto:hello@groupgrid.io", color:P.amber, bg:P.amberLight },
        ].map(({ Icon, label, value, href, color, bg }) => (
          <a key={label} href={href} style={{ display:"flex", alignItems:"center", gap:"14px", background:bg, border:`1.5px solid ${color}22`, borderRadius:"12px", padding:"18px 20px", textDecoration:"none" }}>
            <span style={{ display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon size={22} strokeWidth={1.8} color={color} /></span>
            <div>
              <div style={{ fontSize:"16px", fontWeight:700, color:P.grey600, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"3px" }}>{label}</div>
              <div style={{ fontSize:"15px", fontWeight:600, color, fontFamily:font }}>{value}</div>
            </div>
          </a>
        ))}
      </div>
      <Section title="Response times">
        We aim to respond to all inquiries within 1–2 business days. For urgent event-day issues, include "URGENT" in your subject line and we'll prioritize your message.
      </Section>
      <Section title="About GroupGrid">
        GroupGrid is built for event and meeting planners who need to make sure everyone who registered for their event actually has the travel they need. It's a simple, fast tool: upload your registration list and travel files, and see every gap in minutes.
      </Section>
    </PageShell>
  );
}
