import { P, font, fontDisplay } from "../theme";
import { PageShell, Section } from "./PageShell";

export function HelpPage({ onBack, nav }) {
  const steps = [
    { n:"1", t:"Name your project", d:"Give the project a name so you can find it later, and set the event name that guests will see in emails." },
    { n:"2", t:"Upload your files", d:"Add any two or more files: registration, flights, hotel, car transfers, or dietary. Your registration list is the recommended source of truth." },
    { n:"3", t:"Set travel details (optional)", d:"Add your approved dates and airports so GroupGrid can flag anyone outside them. You can skip this and run without travel flags." },
    { n:"4", t:"Run the cross-check", d:"GroupGrid compares every list and shows you who is aligned and who needs attention, in about a minute." },
  ];
  const flags = [
    ["Missing record", "Registered but not booked, or booked but with a piece missing (no flight, no hotel room)."],
    ["Not registered", "Has a booking but never appears on the registration list. A drop, a duplicate, or a ghost booking."],
    ["Date mismatch", "A flight that lands after hotel check-in, a checkout before the last session, or a transfer on the wrong day."],
    ["Outside window", "Arrival or departure falls outside your approved travel dates."],
    ["Wrong airport", "Flying into an airport other than the ones you approved."],
    ["Duplicate", "The same person appears more than once across your files."],
  ];
  return (
    <PageShell title="Help & Guides" onBack={onBack} nav={nav}>
      <div style={{ marginBottom:"32px" }}>
        <h1 style={{ fontSize:"32px", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 8px", letterSpacing:"-0.03em" }}>Help &amp; guides</h1>
        <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, margin:0 }}>Everything you need to run your first cross-check and get the most out of GroupGrid.</p>
      </div>

      <Section title="Quick start">
        <div style={{ display:"flex", flexDirection:"column", gap:"10px", marginTop:"4px" }}>
          {steps.map(({ n, t, d }) => (
            <div key={n} style={{ display:"flex", gap:"14px", alignItems:"flex-start", background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"12px", padding:"16px 18px" }}>
              <span style={{ flexShrink:0, width:"28px", height:"28px", borderRadius:"8px", background:P.navy, color:P.white, fontFamily:fontDisplay, fontWeight:800, fontSize:"15px", display:"flex", alignItems:"center", justifyContent:"center" }}>{n}</span>
              <div>
                <div style={{ fontSize:"16px", fontWeight:700, color:P.navy, fontFamily:font, marginBottom:"3px" }}>{t}</div>
                <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, lineHeight:1.65 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Preparing your files">
        GroupGrid reads standard Excel (.xlsx, .xls) and CSV files. You do not need to rename your columns: common headers like "Arrival Date," "Arr. Date," and "Flight In" are all recognized automatically. Two tips make matching more accurate. First, include an <strong>Email</strong> column wherever you can, because GroupGrid matches by email first and falls back to name only when email is missing. Second, keep one row per person per file. If you need a starting point, use the downloadable templates on the upload screen.
      </Section>

      <Section title="Adding notes">
        Any file can carry a notes column. Add a column named Notes, Comments, or Remarks to any sheet and GroupGrid attaches it to that attendee, labeled by the sheet it came from, so a note on the hotel file shows as "Hotel Notes" on the record. You can also type your own note on any record after a cross-check, which saves with the project. Notes are informational and do not clear a flag.
      </Section>

      <Section title="Understanding the results">
        After a cross-check, every attendee sits on one grid with a status. Aligned records are cleared, and the ones that need you are flagged. Here is what each flag means:
        <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginTop:"14px" }}>
          {flags.map(([name, desc]) => (
            <div key={name} style={{ display:"grid", gridTemplateColumns:"140px 1fr", gap:"12px", alignItems:"start", padding:"10px 14px", background:P.offWhite, border:`1px solid ${P.grey100}`, borderRadius:"10px" }}>
              <span style={{ fontSize:"14px", fontWeight:800, color:P.navy, fontFamily:font }}>{name}</span>
              <span style={{ fontSize:"14.5px", color:P.grey600, fontFamily:font, lineHeight:1.6 }}>{desc}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Resolving flags">
        A flag is a prompt, not a verdict. Once you have confirmed or fixed something, mark it resolved on the record and it clears from your active list. Resolved items are remembered when you save the project, so re-running a check does not make you redo work you have already handled.
      </Section>

      <Section title="Contacts and emailing vendors">
        Add your hotel, travel agency, and transfer contacts in the project's optional details. From your results you can then draft an email to the right vendor directly, or send each hotel property only its own guest list.
      </Section>

      <Section title="Exporting reports">
        You can export the full cross-check to Excel, build a custom report with only the fields a specific vendor needs, or download a clean onsite itinerary. Exports include your notes and which flags were resolved.
      </Section>

      <Section title="Running more than one hotel">
        If your event uses multiple properties, name each one and add its rooming list. If a file already has a "Hotel" column, GroupGrid uses that automatically to sort guests to the right property.
      </Section>

      <Section title="Saving and reopening your work">
        Save a project to keep its data, your notes, and which flags you resolved. Saved projects appear in the left sidebar. If you are signed in, they sync to your account so you can reach them from another device; if not, they are stored in your browser on this device. Reopen a project any time to pick up exactly where you left off.
      </Section>

      <Section title="Re-running a check and seeing what changed">
        Travel details change right up to the event, so re-run the cross-check whenever you get updated files. GroupGrid keeps your resolved items and notes, so you are not redoing work. You can also compare a fresh run against a saved version to see exactly what moved: who got booked, whose dates changed, and which new gaps appeared since last time.
      </Section>

      <Section title="Tips for accurate matching">
        A few habits make every check cleaner. Include an <strong>Email</strong> column wherever possible, since GroupGrid matches by email first and names second. Keep one row per person per file. Use consistent spellings of names across files. If a column is not being picked up, rename it to a common header such as "Email," "Arrival Date," or "Check-In." Clean, consistent inputs are what let you check a large event as easily as a small one.
      </Section>

      <Section title="Billing">
        GroupGrid is $250 per month for full access: unlimited events, unlimited guests, every feature. You can manage or cancel your subscription at any time from your account. Billing questions go to <a href="mailto:billing@groupgrid.io" style={{ color:P.periwinkleD, fontWeight:600 }}>billing@groupgrid.io</a>.
      </Section>

      <Section title="Troubleshooting">
        If a file will not match the way you expect, check that names or emails are consistent across your files, and that each person appears only once per file. If a column is not being picked up, rename it to a common header (for example "Email," "Arrival Date," "Check-In"). Still stuck? We are happy to look at it with you.
      </Section>

      <div style={{ marginTop:"12px", background:P.accentLight, border:`1.5px solid ${P.accent}44`, borderRadius:"14px", padding:"22px 26px", textAlign:"center" }}>
        <div style={{ fontSize:"15px", fontWeight:800, color:P.teal, fontFamily:font, marginBottom:"6px" }}>Need a hand?</div>
        <div style={{ fontSize:"17px", color:P.grey600, fontFamily:font }}>Email <a href="mailto:support@groupgrid.io" style={{ color:P.periwinkleD, fontWeight:700, textDecoration:"none" }}>support@groupgrid.io</a> and we'll get back to you within one business day.</div>
      </div>
    </PageShell>
  );
}
