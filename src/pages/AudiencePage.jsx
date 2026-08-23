import React from "react";
import { Check } from "lucide-react";
import { P, font, fontDisplay } from "../theme";
import { MarketingNav } from "./PageShell";

// ── Dedicated "Who it's built for" audience pages ───────────────────────────────
// Rendered for the /who-we-serve/* routes. One component, data-driven by page key.
export const AUDIENCES = {
  whoPlanners: {
    path: "/who-we-serve/event-planners",
    name: "Event & Meeting Planners",
    tagline: "Every attendee's travel, reconciled before arrival day",
    lead: "You're the one person who has to know that every registered attendee actually has a flight, a room, and a ride — across hundreds of people and four disconnected files. GroupGrid turns that certainty into a two-minute check instead of a two-week spreadsheet marathon.",
    challenges: [
      "Registration, flight manifest, rooming list, and transfers all live in separate exports that never talk to each other.",
      "The costly gaps hide between files: registered but unbooked, booked but never registered, dates that don't line up.",
      "Fares and room blocks tighten in the final weeks, so problems found late cost the most.",
      "Your team and your vendors need one version of the truth, not five conflicting lists.",
    ],
    helps: [
      "Cross-check all four lists in one upload — GroupGrid matches by email, then name, and flags every gap.",
      "See exactly who's affected and what's wrong, then resolve each flag with notes and status.",
      "Draft vendor emails and export a clean report so everyone works from the same list.",
    ],
  },
  whoTravelManagers: {
    path: "/who-we-serve/corporate-travel-managers",
    name: "Corporate Travel Managers",
    tagline: "Keep group travel on policy and on budget",
    lead: "Group travel is where policy quietly breaks down and spend creeps up. GroupGrid gives you a single view to catch the exceptions early — while there's still time and money to fix them.",
    challenges: [
      "Out-of-policy bookings — wrong dates, wrong airport, nights outside the block — surface too late, as change fees.",
      "Duplicates, ghost bookings, and no-shows sit on the books past the window to recover the cost.",
      "Travel is booked across self-service, an agency, and assistants, so no one sees the whole picture.",
      "Leadership wants a defensible record of what was flagged, fixed, and confirmed.",
    ],
    helps: [
      "Spot out-of-policy and mismatched bookings before they become penalties.",
      "Reconcile every traveler against the approved list to catch duplicates, ghosts, and drops while refunds are still possible.",
      "Keep a clear, exportable record of what was flagged, fixed, and confirmed for every program.",
    ],
  },
  whoAssistants: {
    path: "/who-we-serve/executive-assistants",
    name: "Executive Assistants",
    tagline: "Nothing slips for the people who can't be stranded",
    lead: "When you're responsible for the C-suite's travel, the details simply have to be right. GroupGrid double-checks the whole journey end to end, so an executive never lands to a missing room or a car that isn't there.",
    challenges: [
      "One wrong detail — a flight landing after check-in, a missing room — becomes a very visible problem.",
      "Executives change plans late, and their travel is often booked in a different system than everyone else's.",
      "VIP itineraries need to be verified end to end: flight, transfer timing, room, and checkout.",
      "There's no time to live in spreadsheets cross-referencing four files by hand.",
    ],
    helps: [
      "Confirm each executive's flight, hotel, and transfer actually connect — no gaps, no surprises.",
      "Keep a VIP watch list and verify the details that matter twice, automatically.",
      "Catch issues weeks out and resolve them with a two-line email, not an arrival-day scramble.",
    ],
  },
  whoSalesOps: {
    path: "/who-we-serve/sales-revenue-ops",
    name: "Sales & Revenue Ops",
    tagline: "Get hundreds of reps on the ground, on time",
    lead: "Sales kickoffs and field events pack a lot of people into a tight arrival window, on a budget leadership is watching. GroupGrid keeps the whole roster straight so the program starts on time with everyone in the room.",
    challenges: [
      "Hundreds of reps, one fixed start time, and arrivals spread across every time zone.",
      "Reps self-book off-policy, and the roster keeps moving as territories and headcount change.",
      "No-shows and drops leave rooms and flights on the books past the refund window.",
      "The events team and the travel agency end up working from conflicting exports.",
    ],
    helps: [
      "Cross-check the entire roster in minutes so no rep shows up without a room or a flight.",
      "Flag late registrations, drops, and swaps each week as the list keeps moving.",
      "Hand everyone one clean, current list instead of five versions of the truth.",
    ],
  },
};

export function AudiencePage({ which, onBack, nav }) {
  const a = AUDIENCES[which];
  if (!a) return null;
  const others = Object.entries(AUDIENCES).filter(([k]) => k !== which);
  return (
    <div style={{ minHeight:"100vh", background:P.white, fontFamily:font }}>
      <MarketingNav nav={nav} />

      {/* Hero */}
      <div style={{ background:`linear-gradient(165deg, ${P.navy} 0%, #0D1E40 60%, #0A1628 100%)`, padding:"72px 32px 64px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(rgba(255,255,255,0.06) 1.5px, transparent 1.5px)", backgroundSize:"22px 22px", pointerEvents:"none" }} />
        <div style={{ maxWidth:"820px", margin:"0 auto", position:"relative" }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"8px", padding:"6px 13px", color:"rgba(255,255,255,0.7)", fontSize:"14px", fontFamily:font, fontWeight:600, cursor:"pointer", marginBottom:"22px" }}>← Back</button>
          <div style={{ fontSize:"14px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"14px" }}>Who it's built for</div>
          <h1 style={{ fontSize:"clamp(30px, 5vw, 46px)", fontWeight:700, color:P.white, fontFamily:fontDisplay, lineHeight:1.08, letterSpacing:"-0.03em", margin:"0 0 8px" }}>{a.name}</h1>
          <div style={{ fontSize:"clamp(19px,2.6vw,24px)", fontWeight:600, color:P.accent, fontFamily:fontDisplay, letterSpacing:"-0.02em", margin:"0 0 18px" }}>{a.tagline}</div>
          <p style={{ fontSize:"18px", color:"rgba(255,255,255,0.75)", fontFamily:font, lineHeight:1.7, maxWidth:"640px", margin:0 }}>{a.lead}</p>
          <button onClick={nav?.onApp} style={{ marginTop:"28px", background:P.accent, border:"none", borderRadius:"10px", padding:"13px 26px", fontSize:"16px", fontWeight:700, color:P.white, fontFamily:font, cursor:"pointer", boxShadow:"0 4px 18px rgba(0,201,177,0.35)" }}>Open App →</button>
        </div>
      </div>

      {/* Challenges + Helps */}
      <div style={{ maxWidth:"820px", margin:"0 auto", padding:"64px 32px 40px" }}>
        <div style={{ fontSize:"14px", fontWeight:800, color:P.periwinkleD, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>The challenges you're up against</div>
        <div style={{ display:"flex", flexDirection:"column", gap:"12px", marginBottom:"48px" }}>
          {a.challenges.map((c, i) => (
            <div key={i} style={{ display:"flex", gap:"12px", alignItems:"flex-start", background:P.offWhite, border:`1px solid ${P.grey100}`, borderRadius:"12px", padding:"16px 18px" }}>
              <span style={{ flex:"0 0 auto", width:"22px", height:"22px", borderRadius:"6px", background:P.redLight, color:P.red, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:"14px", marginTop:"1px" }}>!</span>
              <span style={{ fontSize:"16px", color:P.navy, fontFamily:font, lineHeight:1.6 }}>{c}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize:"14px", fontWeight:800, color:P.accentD, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>How GroupGrid helps</div>
        <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
          {a.helps.map((h, i) => (
            <div key={i} style={{ display:"flex", gap:"12px", alignItems:"flex-start" }}>
              <span style={{ flex:"0 0 auto", width:"24px", height:"24px", borderRadius:"50%", background:P.accentLight, display:"flex", alignItems:"center", justifyContent:"center", marginTop:"1px" }}>
                <Check size={14} color={P.accentD} strokeWidth={3} />
              </span>
              <span style={{ fontSize:"16px", color:P.navy, fontFamily:font, lineHeight:1.6 }}>{h}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ maxWidth:"820px", margin:"0 auto", padding:"0 32px 56px" }}>
        <div style={{ background:P.navy, borderRadius:"18px", padding:"40px 32px", textAlign:"center", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 1.5px)", backgroundSize:"20px 20px" }} />
          <div style={{ position:"relative" }}>
            <h2 style={{ fontFamily:fontDisplay, color:P.white, fontSize:"clamp(22px,3vw,28px)", fontWeight:700, letterSpacing:"-0.02em", margin:"0 0 10px" }}>See every travel gap before it costs you</h2>
            <p style={{ color:"rgba(255,255,255,0.72)", fontSize:"16px", fontFamily:font, lineHeight:1.6, maxWidth:"520px", margin:"0 auto 22px" }}>Upload your registration, flight, hotel, and car files. GroupGrid flags every gap in one pass.</p>
            <button onClick={nav?.onApp} style={{ background:P.accent, border:"none", borderRadius:"11px", padding:"14px 30px", fontSize:"16px", fontWeight:700, color:P.white, fontFamily:font, cursor:"pointer" }}>Try GroupGrid →</button>
          </div>
        </div>
      </div>

      {/* Other audiences */}
      <div style={{ maxWidth:"820px", margin:"0 auto", padding:"0 32px 64px" }}>
        <div style={{ fontSize:"14px", fontWeight:800, color:P.grey400, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"14px" }}>Also built for</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"10px" }}>
          {others.map(([k, o]) => (
            <button key={k} onClick={() => { window.location.href = o.path; }} style={{ background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"999px", padding:"10px 18px", fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font, cursor:"pointer" }}>{o.name} →</button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background:P.navy, padding:"26px 32px", textAlign:"center" }}>
        <span style={{ fontSize:"14px", color:"rgba(255,255,255,0.3)", fontFamily:font }}>Built for event professionals · © 2026 GroupGrid</span>
      </div>
    </div>
  );
}
