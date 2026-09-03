import { P, font, fontDisplay } from "../theme";
import { PageShell, Section } from "./PageShell";

export function SecurityPage({ onBack, nav }) {
  const pillars = [
    { t:"Your guest data never leaves your browser", d:"Registration lists, flight manifests, rooming lists, and transfer files are read and cross-checked entirely on your device. They are never uploaded to our servers, never stored by us, and never seen by us." },
    { t:"Encrypted in transit", d:"The whole site and app run over HTTPS. Every connection between your browser and GroupGrid is encrypted." },
    { t:"No advertising, no data selling", d:"We do not sell, rent, or share your data. We run no advertising networks against it, ever." },
  ];
  return (
    <PageShell title="Security & Trust" onBack={onBack} nav={nav}>
      <div style={{ marginBottom:"32px" }}>
        <h1 style={{ fontSize:"32px", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 8px", letterSpacing:"-0.03em" }}>Security &amp; trust</h1>
        <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, margin:0 }}>GroupGrid handles the travel details of your most important people. We built it so the sensitive part of that data never has to leave your hands.</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:"12px", marginBottom:"36px" }}>
        {pillars.map(({ t, d }) => (
          <div key={t} style={{ background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"14px", padding:"20px 24px", borderLeft:`4px solid ${P.accent}` }}>
            <div style={{ fontSize:"16px", fontWeight:800, color:P.navy, fontFamily:font, marginBottom:"6px", letterSpacing:"-0.01em" }}>{t}</div>
            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, lineHeight:1.7 }}>{d}</div>
          </div>
        ))}
      </div>

      <Section title="Where your data lives">
        The core design choice behind GroupGrid is that your guest spreadsheets are processed in the browser. When you upload a registration list or a rooming list, the file is parsed and cross-checked locally on your computer. It is not sent to us, and we keep no copy of it. When you close the tab, the file is gone from memory unless you have chosen to save the project.
      </Section>

      <Section title="Saved projects">
        When you save a project, it is stored locally in your browser so you can reopen it later. If you are signed in, your saved projects sync to your account so you can reach them from another device. You stay in control: you can remove a saved project at any time from your projects list.
      </Section>

      <Section title="How sign-in works">
        Account authentication is handled by Supabase, an established third-party provider, over an encrypted connection. We use it only to confirm who you are. Your guest files are never sent to Supabase or tied to your login.
      </Section>

      <Section title="Payments">
        Billing is handled by Stripe, a PCI-compliant payment processor trusted across the industry. GroupGrid never sees or stores your full card number. Card details are entered directly into Stripe's secure checkout.
      </Section>

      <Section title="Hosting and infrastructure">
        GroupGrid is served through Vercel's global network with automatically managed TLS certificates, so every page and every request is delivered over HTTPS. Marketing emails and early-access signups, when you opt in, are handled by HubSpot.
      </Section>

      <Section title="What we never do">
        We never upload your guest data to our servers. We never sell or rent your data. We do not run advertising or third-party tracking against your guest files. Analytics on the marketing site are consent-gated, and you can decline them.
      </Section>

      <Section title="Your responsibilities">
        You are responsible for making sure you have the right to process the personal data you upload, and for complying with the data protection laws that apply to you, such as GDPR and CCPA. Because your files stay on your device, you retain direct control over that data at all times. See our Privacy Policy for the full detail.
      </Section>

      <Section title="Reporting a concern">
        If you believe you have found a security issue, please tell us right away and we will respond quickly. We appreciate responsible disclosure and will work with you to confirm and address anything you report.
      </Section>

      <div style={{ marginTop:"12px", background:P.accentLight, border:`1.5px solid ${P.accent}44`, borderRadius:"14px", padding:"22px 26px", textAlign:"center" }}>
        <div style={{ fontSize:"15px", fontWeight:800, color:P.teal, fontFamily:font, marginBottom:"6px" }}>Questions about security?</div>
        <div style={{ fontSize:"17px", color:P.grey600, fontFamily:font }}>Email us at <a href="mailto:support@groupgrid.io" style={{ color:P.periwinkleD, fontWeight:700, textDecoration:"none" }}>support@groupgrid.io</a> and we'll get back to you promptly.</div>
      </div>
    </PageShell>
  );
}
