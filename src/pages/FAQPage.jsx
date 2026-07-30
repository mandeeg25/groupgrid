import { P, font, fontDisplay } from "../theme";
import { PageShell } from "./PageShell";

export function FAQPage({ onBack, nav }) {
  const faqs = [
    { q:"What does GroupGrid actually do?", a:"GroupGrid takes your event registration list and checks it against your travel files — flights, hotels, and car transfers. It tells you instantly who registered but isn't booked, who's booked but never registered, and whose dates don't match. What used to take days of manual spreadsheet cross-checking takes about a minute." },
    { q:"What files do I need?", a:"You need any two or more files to run a check — for example a registration list plus a hotel roster, or a flight manifest plus a hotel roster. Your registration list is recommended: when you add it, GroupGrid uses it as the source of truth and checks everything against it. You can also add car transfer and dietary files. Everything is standard Excel (.xlsx, .xls) or CSV format." },
    { q:"What if my spreadsheet columns are named differently?", a:"GroupGrid auto-detects common column names. Your \"Arrival Date\" and someone else's \"Arr. Date\" or \"Flight In\" all get recognized automatically. There's no manual mapping or setup required." },
    { q:"What if I don't have email addresses?", a:"GroupGrid matches people by email first for the most accurate results, then falls back to matching by name. Including an email column is best, but it's not required." },
    { q:"Is my data secure?", a:"Your guest files are read and processed entirely in your browser and are never uploaded to our servers. Account sign-in is handled securely through Supabase, a trusted third-party provider, and your saved projects are stored locally in your browser. The sensitive guest spreadsheet data itself stays in your browser." },
    { q:"Who is GroupGrid for?", a:"Any event or meeting planner who manages attendee travel, from a small board retreat to a large multi-day conference. If people are registering and you're booking their flights and hotels, GroupGrid makes sure the two lists match." },
    { q:"How much does it cost?", a:"$250/month for full access — unlimited events, unlimited guests, every feature. Create an account to get started." },
    { q:"Do I need to install anything?", a:"No. GroupGrid runs in your web browser. There's nothing to download or install." },
  ];
  return (
    <PageShell title="FAQ" onBack={onBack} nav={nav}>
      <div style={{ marginBottom:"32px" }}>
        <h1 style={{ fontSize:"32px", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 8px", letterSpacing:"-0.03em" }}>Frequently asked questions</h1>
        <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, margin:0 }}>Everything you need to know about how GroupGrid works.</p>
      </div>
      {faqs.map(({ q, a }) => (
        <div key={q} style={{ background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"14px", padding:"22px 26px", marginBottom:"14px" }}>
          <div style={{ fontSize:"17px", fontWeight:800, color:P.navy, fontFamily:font, marginBottom:"8px", letterSpacing:"-0.01em" }}>{q}</div>
          <div style={{ fontSize:"16px", color:P.grey600, fontFamily:font, lineHeight:1.75 }}>{a}</div>
        </div>
      ))}
      <div style={{ marginTop:"24px", background:P.accentLight, border:`1.5px solid ${P.accent}44`, borderRadius:"14px", padding:"22px 26px", textAlign:"center" }}>
        <div style={{ fontSize:"15px", fontWeight:800, color:P.teal, fontFamily:font, marginBottom:"6px" }}>Still have a question?</div>
        <div style={{ fontSize:"17px", color:P.grey600, fontFamily:font }}>Email us at <a href="mailto:support@groupgrid.io" style={{ color:P.periwinkleD, fontWeight:700, textDecoration:"none" }}>support@groupgrid.io</a> and we'll get back to you within one business day.</div>
      </div>
    </PageShell>
  );
}
