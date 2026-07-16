import React from "react";
import { Check, X, ShieldCheck, Salad } from "lucide-react";
import { P, font, fontDisplay } from "../theme";
import { SHOW_DIETARY, APP_VERSION } from "../constants";
import {
  BrandLogo, SpreadsheetIcon, PlaneIcon, HotelIcon, MagnifierIcon, CrossCheckIcon,
  UploadIcon, CalendarIcon, CarIcon, PeopleIcon, FlagIcon, AlertIcon, ClearedIcon,
} from "../icons";
import { EarlyAccessForm } from "./EarlyAccessForm";

// ── Landing Page ──────────────────────────────────────────────────────────────
export function LandingPage({ onEnter, onPricing, onAbout, onContact, onPrivacy, onTerms, onFaq }) {

  const problems = [
    { time:"Day 1", label:"You export your registration list", sub:"Everyone who signed up, names, dates, requests", color:P.navy, Icon:SpreadsheetIcon },
    { time:"Day 3", label:"Flight manifest arrives", sub:"280 names — different format, different spelling", color:P.accentD, Icon:PlaneIcon },
    { time:"Day 7", label:"Hotel roster comes in separately", sub:"294 rooms — do they all match who registered?", color:P.navy, Icon:HotelIcon },
    { time:"Day 14", label:"You're still cross-checking", sub:"VLOOKUPs, filters, manual row-by-row scanning…", color:P.accentD, Icon:MagnifierIcon },
  ];

  const eventTypes = [
    "Sales Kickoffs","Board Retreats","Tradeshows","Healthcare Meetings",
    "Conferences","Advisory Boards","Executive Roundtables","Field Marketing",
    "Corporate Events","Association Meetings","Event Agencies","Global Programs",
  ];

  const steps = [
    { n:"01", icon:"upload", box:P.accentD, title:"Upload your registration list", body:"Start with your master list of who registered — the source of truth. Then add your travel files: flight manifest, hotel roster, car transfers. Excel or CSV (.xlsx, .xls, .csv), any column names — GroupGrid figures it out." },
    { n:"02", icon:"crosscheck", box:P.navyLight, title:"Run the check", body:"In seconds, GroupGrid matches every registered person against the travel files by email, then name. It finds who registered but isn't booked, who's booked but never registered, and whose dates don't match." },
    { n:"03", icon:"magnifier", box:P.accentD, title:"See exactly what needs fixing", body:"Each flag shows who's affected and what's wrong — registered with no flight, hotel booked for someone not on the list, check-in dates that don't match what they requested. Resolve, add notes, mark done." },
    { n:"04", icon:"spreadsheet", box:P.navyLight, title:"Communicate & export", body:"Draft emails to your hotel or travel agency, download a clean Excel report, or generate a shareable HTML report — all without leaving GroupGrid." },
  ];

  // Testimonials removed — placeholder quotes taken down. Add real, attributed quotes here when available.

  return (
    <div style={{ minHeight:"100vh", fontFamily:font, background:P.white, WebkitFontSmoothing:"antialiased" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Poppins:wght@500;600;700&display=swap" rel="stylesheet" />

      {/* ── Nav ── */}
      <nav className="gg-landing-nav" style={{ background:P.navy, height:"64px", padding:"0 40px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 0 rgba(255,255,255,0.06)" }}>
        <div className="gg-landing-logo" style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <BrandLogo height={40} onDark={true} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"28px" }}>
          <div className="gg-landing-navlinks" style={{ display:"flex", alignItems:"center", gap:"28px" }}>
            <button onClick={onAbout} style={{ background:"none", border:"none", fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.6)", fontFamily:font, cursor:"pointer" }}>About</button>
            <button onClick={onFaq} style={{ background:"none", border:"none", fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.6)", fontFamily:font, cursor:"pointer" }}>FAQ</button>
            <button onClick={onPricing} style={{ background:"none", border:"none", fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.6)", fontFamily:font, cursor:"pointer" }}>Pricing</button>
          </div>
          <button onClick={onEnter} style={{ background:P.accent, border:"none", borderRadius:"8px", padding:"8px 18px", fontSize:"15px", fontWeight:700, color:P.white, fontFamily:font, cursor:"pointer", boxShadow:"0 2px 12px rgba(0,201,177,0.35)", whiteSpace:"nowrap", flexShrink:0 }}>Open App →</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ background:`linear-gradient(170deg, ${P.navy} 0%, #0D1E40 60%, #0A1628 100%)`, padding:"96px 40px 80px", position:"relative", overflow:"hidden" }}>
        {/* bg glow orbs */}
        <div style={{ position:"absolute", top:-100, right:-100, width:500, height:500, borderRadius:"50%", background:`radial-gradient(circle, ${P.accent}12, transparent 65%)`, pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-80, left:-60, width:400, height:400, borderRadius:"50%", background:`radial-gradient(circle, ${P.periwinkleD}15, transparent 65%)`, pointerEvents:"none" }} />
        {/* dot grid — all teal dots, fading to grey toward upper-right */}
        <svg style={{ position:"absolute", bottom:"40px", right:"0", pointerEvents:"none", width:"65%", height:"100%", minWidth:"500px" }} viewBox="0 0 1000 600" preserveAspectRatio="xMaxYMax meet" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Fade: bottom-left = full teal, top-right = dim grey */}
            <linearGradient id="heroDotFade" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%"   stopColor="white" stopOpacity="1"/>
              <stop offset="60%"  stopColor="white" stopOpacity="0.5"/>
              <stop offset="100%" stopColor="white" stopOpacity="0.08"/>
            </linearGradient>
            <mask id="heroDotMask">
              <rect width="1000" height="600" fill="url(#heroDotFade)"/>
            </mask>
          </defs>
          <g mask="url(#heroDotMask)">
            {/* 4 rows × 4 cols — all teal, evenly spaced, bottom-right anchor */}
            {/* Cols: 280, 520, 760, 1000 — Rows: 20, 207, 393, 580 */}
            {[20, 207, 393, 580].map((cy, row) =>
              [280, 520, 760, 1000].map((cx, col) => (
                <circle key={`${row}-${col}`} cx={cx} cy={cy} r="18" fill="#00C9B1"/>
              ))
            )}
          </g>
        </svg>

        <div style={{ maxWidth:"1100px", margin:"0 auto", display:"flex", alignItems:"flex-start", gap:"64px", flexWrap:"wrap" }}>
          {/* Left copy */}
          <div style={{ flex:1, minWidth:"320px" }}>

            <div style={{ margin:"0 0 24px" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                {[
                  { label:"Registered",     status:"check" },
                  { label:"Flight booked",   status:"check" },
                  { label:"Hotel booked",    status:"check" },
                  { label:"Dates match",     status:"error" },
                ].map(({ label, status }) => (
                  <div key={label} style={{ display:"flex", alignItems:"center", gap:"14px" }}>
                    <div style={{
                      width: 32, height: 32, borderRadius:"8px", flexShrink:0,
                      background: status === "check" ? "rgba(0,201,177,0.15)" : "rgba(220,50,50,0.2)",
                      border: `1.5px solid ${status === "check" ? "rgba(0,201,177,0.4)" : "rgba(220,50,50,0.5)"}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"16px", fontWeight:900,
                    }}>
                      {status === "check"
                        ? <Check size={16} strokeWidth={3} color="#00C9B1"/>
                        : <X size={16} strokeWidth={3} color="#FF5252"/>}
                    </div>
                    <span style={{
                      fontSize:"clamp(22px, 3.5vw, 36px)",
                      fontWeight: 900,
                      fontFamily: font,
                      letterSpacing:"-0.04em",
                      lineHeight: 1,
                      color: status === "check" ? "rgba(255,255,255,0.85)" : "#FF5252",
                      textDecoration: status === "error" ? "none" : "none",
                    }}>{label}{status === "error" ? " ✗" : ""}</span>
                  </div>
                ))}
              </div>
            </div>
            <h1 style={{ fontSize:"clamp(28px, 4.5vw, 44px)", fontWeight:700, color:P.white, fontFamily:fontDisplay, lineHeight:1.1, margin:"0 0 18px", maxWidth:"540px", letterSpacing:"-0.035em" }}>
              Your attendees registered.<br/><span style={{ color:P.accent }}>But did they book their travel?</span>
            </h1>
            <p style={{ fontSize:"18px", color:"rgba(255,255,255,0.6)", fontFamily:font, lineHeight:1.75, margin:"0 0 12px", maxWidth:"520px" }}>
              When you're managing group travel for attendees who need flights, hotels, and car transfers, the mistakes are easy to miss.
            </p>
            <p style={{ fontSize:"18px", color:"rgba(255,255,255,0.85)", fontFamily:font, lineHeight:1.75, margin:"0 0 36px", maxWidth:"520px", fontWeight:600 }}>
              GroupGrid catches them early, saving you thousands of dollars and hours, and saving you and your attendees from mismatched travel dates and <span style={{ color:P.red }}>red flags.</span>
            </p>
            <div style={{ display:"flex", gap:"12px", flexWrap:"wrap", alignItems:"center" }}>
              <button onClick={onEnter} style={{ background:`linear-gradient(135deg, ${P.accent}, ${P.accentD})`, border:"none", borderRadius:"12px", padding:"14px 32px", fontSize:"16px", fontWeight:800, color:P.white, fontFamily:font, cursor:"pointer", boxShadow:"0 4px 20px rgba(0,201,177,0.4)", letterSpacing:"-0.02em" }}>
                Open GroupGrid →
              </button>
              <button onClick={onPricing} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"12px", padding:"14px 24px", fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.75)", fontFamily:font, cursor:"pointer" }}>
                See pricing
              </button>
            </div>
          </div>

          {/* Right — live mismatch demo card */}
          <div className="gg-hero-card" style={{ flexShrink:0, width:"340px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"20px", overflow:"hidden", backdropFilter:"blur(10px)" }}>
            <div style={{ background:"rgba(0,0,0,0.2)", padding:"12px 16px", display:"flex", alignItems:"center", gap:"8px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display:"flex", gap:"5px" }}>
                {["#FF5F57","#FFBD2E","#28C840"].map(c => <div key={c} style={{ width:10, height:10, borderRadius:"50%", background:c }} />)}
              </div>
              <span style={{ fontSize:"15px", color:"rgba(255,255,255,0.35)", fontFamily:font, fontWeight:600 }}>GroupGrid — Annual Sales Summit 2025</span>
            </div>
            <div style={{ padding:"16px" }}>
              <div style={{ fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.35)", fontFamily:font, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"10px" }}>Cross-check complete · 300 reviewed · <span style={{ color:"#FF8A80" }}>4 need action</span></div>
              {[
                { name:"Sarah Solomon", issue:"Registered but no flight booked", type:"error", badge:"No Flight" },
                { name:"Marcus Williams", issue:"Has a hotel room but never registered", type:"error", badge:"Not Registered" },
                { name:"Jennifer Park", issue:"Requested check-in Dec 4 · hotel booked Dec 5", type:"warn", badge:"Date Mismatch" },
                { name:"David Chen", issue:"Registered but no hotel booked", type:"error", badge:"No Hotel" },
              ].map(({ name, issue, type, badge }) => (
                <div key={name} style={{ background: type==="error" ? "rgba(192,57,43,0.15)" : "rgba(201,122,10,0.15)", border:`1px solid ${type==="error" ? "rgba(192,57,43,0.3)" : "rgba(201,122,10,0.3)"}`, borderRadius:"10px", padding:"12px 14px", marginBottom:"8px" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"4px" }}>
                    <span style={{ fontSize:"15px", fontWeight:700, color:P.white, fontFamily:font }}>{name}</span>
                    <span style={{ fontSize:"15px", fontWeight:800, color: type==="error" ? "#FF8A80" : "#FFD54F", background: type==="error" ? "rgba(192,57,43,0.3)" : "rgba(201,122,10,0.3)", padding:"2px 8px", borderRadius:"20px", fontFamily:font }}>{badge}</span>
                  </div>
                  <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.5)", fontFamily:font, lineHeight:1.5 }}>{issue}</div>
                </div>
              ))}
              <div style={{ marginTop:"12px", background:"rgba(0,201,177,0.1)", border:"1px solid rgba(0,201,177,0.2)", borderRadius:"8px", padding:"10px 12px", display:"flex", alignItems:"center", gap:"8px" }}>
                <Check size={14} strokeWidth={2.5} color={P.accent} style={{flexShrink:0}}/>
                <span style={{ fontSize:"15px", color:"rgba(255,255,255,0.6)", fontFamily:font }}>296 registered guests fully booked · <span style={{ color:P.accent, fontWeight:700 }}>✓ No action needed</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Problem section ── */}
      <div style={{ background:"#F0F2F7", padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
        <div style={{ maxWidth:"1000px", margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:"56px" }}>
            <div style={{ fontSize:"15px", fontWeight:800, color:P.periwinkleD, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>SOUND FAMILIAR?</div>
            <h2 style={{ fontSize:"clamp(30px, 5vw, 44px)", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 16px", letterSpacing:"-0.035em", lineHeight:1.1 }}>
              Event Data Shouldn&rsquo;t<br/>Need a Detective.
            </h2>
            <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, maxWidth:"560px", margin:"0 auto" }}>
              When attendee information lives in separate spreadsheets, mistakes are inevitable. Keep registrations, travel, and accommodations connected in one place.
            </p>
          </div>
          <div className="gg-timeline-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"16px", marginBottom:"40px" }}>
            {problems.map(({ time, label, sub, color, bg, Icon }, i) => (
              <div key={time} className="gg-timeline-card" style={{ background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"16px", padding:"24px", position:"relative", overflow:"visible", boxShadow:"0 1px 3px rgba(12,30,63,0.04)" }}>
                <div style={{ width:"44px", height:"44px", borderRadius:"12px", background:color, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"16px" }}>{Icon && <Icon size={22} line="rgba(255,255,255,0.95)" accent={P.white} />}</div>
                <div style={{ fontSize:"15px", fontWeight:800, color, fontFamily:font, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"8px" }}>{time}</div>
                <div style={{ fontSize:"16px", fontWeight:700, color:P.navy, fontFamily:fontDisplay, marginBottom:"8px", lineHeight:1.3, letterSpacing:"-0.01em" }}>{label}</div>
                <div style={{ fontSize:"16px", color:P.grey600, fontFamily:font, lineHeight:1.6 }}>{sub}</div>
                {i < 3 && <div className="gg-timeline-arrow" style={{ position:"absolute", top:"50%", right:"-12px", transform:"translateY(-50%)", fontSize:"16px", color:P.grey200, zIndex:2 }}>→</div>}
              </div>
            ))}
          </div>
          <div style={{ background:P.navy, borderRadius:"16px", padding:"22px 28px", display:"flex", alignItems:"center", gap:"18px" }}>
            <div style={{ width:46, height:46, borderRadius:"12px", background:P.navyLight, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><AlertIcon size={24} line="rgba(255,255,255,0.95)" accent={P.amber} /></div>
            <div>
              <div style={{ fontSize:"15px", fontWeight:700, color:P.white, fontFamily:fontDisplay, marginBottom:"5px", letterSpacing:"-0.01em" }}>Meanwhile, your event is in <span style={{ color:P.amber }}>3 days</span></div>
              <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.62)", fontFamily:font, lineHeight:1.65 }}>You've checked the lists more than once, and they look right. But the person who registered late and never booked a flight, the hotel room held for someone who isn't on your list, the name spelled two different ways: those are the ones that surface at check-in.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Solution ── */}
      <div style={{ background:P.white, padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
        <div style={{ maxWidth:"1000px", margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:"56px" }}>
            <div style={{ fontSize:"15px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>THE GROUPGRID WAY</div>
            <h2 style={{ fontSize:"clamp(30px, 5vw, 44px)", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 16px", letterSpacing:"-0.035em", lineHeight:1.1 }}>
              Days of work.<br/><span style={{ color:P.accent }}>Done in minutes.</span>
            </h2>
            <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, maxWidth:"520px", margin:"0 auto" }}>
              Upload your registration list and your travel files, run the check, see every gap instantly — then communicate fixes directly to your hotel and travel agency without switching tabs.
            </p>
          </div>
          <div className="gg-card-grid-3" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>
            {steps.map(({ n, icon, box, title, body }) => {
              const StepIcon = { upload:UploadIcon, crosscheck:CrossCheckIcon, magnifier:MagnifierIcon, spreadsheet:SpreadsheetIcon }[icon];
              const iconAccent = box === P.accentD ? P.white : P.accent; // teal accent vanishes on a teal box, so go white there
              return (
              <div key={n} style={{ background:P.navy, borderRadius:"16px", padding:"28px 28px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"14px" }}>
                  <div style={{ width:44, height:44, borderRadius:"12px", background:box, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{StepIcon && <StepIcon size={22} line="rgba(255,255,255,0.95)" accent={iconAccent} />}</div>
                  <div>
                    <div style={{ fontSize:"16px", fontWeight:700, color:P.white, fontFamily:fontDisplay, letterSpacing:"-0.015em" }}>{title}</div>
                  </div>
                </div>
                <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.62)", fontFamily:font, lineHeight:1.75 }}>{body}</div>
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── What it catches ── */}
      <div style={{ background:"#F0F2F7", padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
        <div style={{ maxWidth:"1000px", margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:"48px" }}>
            <div style={{ fontSize:"15px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>WHAT GROUPGRID CATCHES</div>
            <h2 style={{ fontSize:"clamp(28px, 4.5vw, 42px)", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 14px", letterSpacing:"-0.035em", lineHeight:1.1 }}>
              The gaps that cause<br/><span style={{ color:P.accent }}>day-of disasters.</span>
            </h2>
            <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, maxWidth:"520px", margin:"0 auto" }}>
              Add your registration list and GroupGrid checks it against every travel file, person by person.
            </p>
          </div>
          <div className="gg-card-grid-3" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px" }}>
            {[
              { Icon:PlaneIcon, box:P.navy, title:"Registered, but no flight", body:"See everyone who signed up for your event but doesn't have a flight booked yet." },
              { Icon:HotelIcon, box:P.accentD, title:"Registered, but no hotel", body:"Spot registered attendees who have travel but no hotel room reserved." },
              { Icon:FlagIcon, box:P.navy, title:"Booked, but not registered", body:"Find flights or hotel rooms booked for people who never registered — often the costliest gap to miss." },
              { Icon:CalendarIcon, box:P.accentD, title:"Dates that don't match", body:"Catch when a hotel check-in or flight date doesn't match what the person requested at registration." },
              { Icon:CarIcon, box:P.navy, title:"Missing transfers", body:"Flag car bookings that don't line up with anyone's flight or registration." },
              { Icon:PeopleIcon, box:P.accentD, title:"Duplicates", body:"The same person registered or booked twice across your files, before it becomes a double charge." },
            ].map(({ Icon, box, title, body }) => {
              const iconAccent = box === P.accentD ? P.white : P.accent;
              return (
              <div key={title} style={{ background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"14px", padding:"24px 22px" }}>
                <div style={{ width:46, height:46, borderRadius:"12px", background:box, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"14px" }}><Icon size={24} line="rgba(255,255,255,0.95)" accent={iconAccent} /></div>
                <div style={{ fontSize:"16px", fontWeight:800, color:P.navy, fontFamily:font, marginBottom:"6px", letterSpacing:"-0.02em" }}>{title}</div>
                <div style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.65 }}>{body}</div>
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Use cases ── */}
      <div style={{ background:P.white, padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
        <div style={{ maxWidth:"1000px", margin:"0 auto", textAlign:"center" }}>
          <div style={{ fontSize:"15px", fontWeight:800, color:P.navy, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>WHO IT'S FOR</div>
          <h2 style={{ fontSize:"clamp(28px, 4.5vw, 42px)", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 12px", letterSpacing:"-0.035em", lineHeight:1.1 }}>
            Built for event planners<br/><span style={{ color:P.accent }}>running events of any size</span>
          </h2>
          <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, maxWidth:"520px", margin:"0 auto 40px" }}>
            Anywhere you need to make sure attendees arrive on time, have a confirmed room, and won't be stranded at the wrong airport.
          </p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"10px", justifyContent:"center", marginBottom:"48px" }}>
            {eventTypes.map(tag => (
              <span key={tag} style={{ background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"20px", padding:"8px 18px", fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font, boxShadow:"0 1px 4px rgba(15,29,53,0.06)" }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Value band (testimonials to be added once real) ── */}
      <div style={{ background:`linear-gradient(160deg, ${P.navy} 0%, ${P.navyLight} 100%)`, padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
        <div style={{ maxWidth:"880px", margin:"0 auto", textAlign:"center" }}>
          <div style={{ fontSize:"15px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"16px" }}>WHY PLANNERS USE IT</div>
          <h2 style={{ fontSize:"clamp(26px, 4vw, 38px)", fontWeight:700, color:P.white, fontFamily:fontDisplay, margin:"0 0 20px", letterSpacing:"-0.035em", lineHeight:1.15 }}>
            The check that used to take days,<br/>done before your coffee gets cold.
          </h2>
          <p style={{ fontSize:"17px", color:"rgba(255,255,255,0.65)", fontFamily:font, lineHeight:1.7, maxWidth:"600px", margin:"0 auto" }}>
            The late registrant with no flight, the room booked for a no-show, the date that's one day off — surfaced automatically, so you can fix them before they become day-of surprises.
          </p>
        </div>
      </div>

      {/* ── Animated Demo ── */}
      {(() => {
        const [demoPhase, setDemoPhase] = React.useState("idle"); // idle | loading | checking | results
        const [filesLoaded, setFilesLoaded] = React.useState([false,false,false,false,false]);
        const [checkPct, setCheckPct]   = React.useState(0);
        const [rowsVisible, setRowsVisible] = React.useState(0);
        const [expandedRow, setExpandedRow] = React.useState(null);

        const demoGuests = [
          { key:"sc",  first:"Sarah",   last:"Solomon",   email:"s.solomon@corp.com", status:"error", arrDiff:"—",   depDiff:"—",   issues:["Registered but no flight booked"],
            reg:{ checkIn:"Dec 4", checkOut:"Dec 7" }, flight:null, hotel:{ in:"Dec 4", out:"Dec 7", name:"Marriott Marquis" }, car:null },
          { key:"mw",  first:"Marcus",  last:"Williams",  email:"m.williams@corp.com", status:"error", arrDiff:"—",   depDiff:"—",   issues:["Has a hotel room but never registered"],
            reg:null, flight:{ arr:"Dec 5", dep:"Dec 8", num:"DL 441" },  hotel:{ in:"Dec 5", out:"Dec 8", name:"Westin St. Francis" }, car:{ pickup:"Dec 5", loc:"LAX" } },
          { key:"jp",  first:"Jennifer",last:"Park",      email:"j.park@corp.com",     status:"warn",  arrDiff:"+1d", depDiff:"0",   issues:["Requested check-in Dec 4 · hotel booked Dec 5"],
            reg:{ checkIn:"Dec 4", checkOut:"Dec 8" }, flight:{ arr:"Dec 5", dep:"Dec 8", num:"AA 109" },  hotel:{ in:"Dec 5", out:"Dec 8", name:"Hilton Union Sq" }, car:{ pickup:"Dec 5", loc:"SFO" } },
          { key:"dc",  first:"David",   last:"Chen",      email:"d.chen@corp.com",     status:"error", arrDiff:"—",   depDiff:"—",   issues:["Registered but no hotel booked"],
            reg:{ checkIn:"Dec 5", checkOut:"Dec 8" }, flight:{ arr:"Dec 5", dep:"Dec 8", num:"SW 884" },  hotel:null, car:null },
          { key:"ps",  first:"Priya",   last:"Sharma",    email:"p.sharma@corp.com",   status:"ok",    arrDiff:"0",   depDiff:"0",   issues:[],
            reg:{ checkIn:"Dec 4", checkOut:"Dec 7" }, flight:{ arr:"Dec 4", dep:"Dec 7", num:"UA 332" },  hotel:{ in:"Dec 4", out:"Dec 7", name:"Hilton Union Sq" }, car:{ pickup:"Dec 4", loc:"SFO" } },
          { key:"jm",  first:"James",   last:"Mitchell",  email:"j.mitchell@corp.com", status:"ok",    arrDiff:"0",   depDiff:"0",   issues:[],
            reg:{ checkIn:"Dec 5", checkOut:"Dec 8" }, flight:{ arr:"Dec 5", dep:"Dec 8", num:"AA 771" },  hotel:{ in:"Dec 5", out:"Dec 8", name:"Grand Hyatt" }, car:{ pickup:"Dec 5", loc:"OAK" } },
        ];

        const statusColor = s => s==="error" ? P.red : s==="warn" ? P.amber : P.green;
        const statusBg    = s => s==="error" ? P.redLight : s==="warn" ? P.amberLight : P.greenLight;
        const statusLabel = s => s==="error" ? "Flag" : s==="warn" ? "Review" : "OK";
        // Shared column layout + per-column alignment so the header and every row line up cleanly.
        const demoCols = "minmax(60px,0.8fr) minmax(74px,0.9fr) minmax(150px,1.7fr) 100px 78px 78px 66px";
        const demoJustify = ["start","start","stretch","center","center","center","end"];

        const fileInfo = [
          { label:"Registration List", color:"#00A896", Icon:PeopleIcon, sub:"event_registration.xlsx" },
          { label:"Flight Manifest", color:"#4F8EF7", Icon:PlaneIcon, sub:"flight_manifest_dec.xlsx" },
          { label:"Hotel Roster",    color:"#C97A0A", Icon:HotelIcon, sub:"hotel_roster_marriott.xlsx" },
          { label:"Car Transfers",   color:"#6B3FA0", Icon:CarIcon, sub:"car_transfers_sfo.xlsx" },
          ...(SHOW_DIETARY?[{ label:"Dietary & Access",color:P.teal, Icon:Salad, sub:"dietary_requirements.xlsx" }]:[]),
        ];

        const runDemo = () => {
          if (demoPhase !== "idle" && demoPhase !== "results") return;
          setDemoPhase("loading"); setFilesLoaded([false,false,false,false,false]);
          setCheckPct(0); setRowsVisible(0); setExpandedRow(null);

          [350,700,1050,1400,1750].forEach((t,i) =>
            setTimeout(() => setFilesLoaded(p => { const n=[...p]; n[i]=true; return n; }), t)
          );
          setTimeout(() => setDemoPhase("checking"), 2200);
          [8,22,37,51,65,78,90,100].forEach((v,i) =>
            setTimeout(() => setCheckPct(v), 2100 + i*200)
          );
          for (let i=0; i<demoGuests.length; i++)
            setTimeout(() => setRowsVisible(i+1), 3900 + i*260);
          setTimeout(() => setDemoPhase("results"), 3900 + demoGuests.length*260);
        };

        return (
          <div style={{ background:"#F0F2F7", padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
            <style>{`
              @keyframes ggIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
              @keyframes ggPulse { 0%,100%{opacity:.45} 50%{opacity:1} }
            `}</style>

            <div style={{ maxWidth:"1000px", margin:"0 auto" }}>
              {/* Header */}
              <div style={{ textAlign:"center", marginBottom:"48px" }}>
                <div style={{ fontSize:"15px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>SEE IT IN ACTION</div>
                <h2 style={{ fontSize:"clamp(28px, 4.5vw, 42px)", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 14px", letterSpacing:"-0.035em", lineHeight:1.1 }}>
                  From files to flags<br/><span style={{ color:P.accent }}>in minutes, not days.</span>
                </h2>
                <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, maxWidth:"460px", margin:"0 auto" }}>
                  Watch GroupGrid check your full registration list against the travel files and surface every gap instantly.
                </p>
              </div>

              {/* Browser window */}
              <div style={{ background:P.white, borderRadius:"20px", boxShadow:"0 8px 48px rgba(15,29,53,0.13)", overflow:"hidden", border:`1px solid ${P.grey100}` }}>

                {/* Chrome bar */}
                <div style={{ background:P.navy, padding:"11px 18px", display:"flex", alignItems:"center", gap:"10px" }}>
                  <div style={{ display:"flex", gap:"6px" }}>
                    {["#FF5F57","#FFBD2E","#28C840"].map(c => <div key={c} style={{ width:11, height:11, borderRadius:"50%", background:c }}/>)}
                  </div>
                  <div style={{ flex:1, display:"flex", justifyContent:"center" }}>
                    <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:"6px", padding:"4px 20px", fontSize:"15px", color:"rgba(255,255,255,0.45)", fontFamily:font }}>groupgrid.io — Annual Sales Summit · Dec 2026</div>
                  </div>
                </div>

                <div className="gg-demo-body" style={{ display:"flex", minHeight:"480px" }}>

                  {/* Mini sidebar */}
                  <div className="gg-demo-sidebar" style={{ width:"160px", flexShrink:0, background:P.navy, padding:"16px 12px", display:"flex", flexDirection:"column", gap:"4px" }}>
                    {[
                      { Icon:PeopleIcon, label:"Registered",    count:demoPhase==="results"||demoPhase==="checking"?"300":"—",   active:true },
                      { Icon:FlagIcon, label:"Action Needed", count:demoPhase==="results"?"4":"—",   color:P.red },
                      { Icon:ClearedIcon, label:"Fully Booked",  count:demoPhase==="results"?"296":"—", color:P.accent },
                      { Icon:AlertIcon, label:"Not Registered",count:demoPhase==="results"?"1":"—",   color:P.purple },
                    ].map(({ Icon, label, count, active, color }) => (
                      <div key={label} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"5px 8px", borderRadius:"6px", background:active?"rgba(0,201,177,0.15)":"transparent" }}>
                        <span style={{ width:12, display:"inline-flex", alignItems:"center", justifyContent:"center" }}><Icon size={12} line={active?P.accent:(color||"rgba(255,255,255,0.4)")} accent={active?P.accent:(color||"rgba(255,255,255,0.4)")} /></span>
                        <span style={{ flex:1, fontSize:"15px", color:active?P.accent:"rgba(255,255,255,0.55)", fontFamily:font, fontWeight:active?700:400 }}>{label}</span>
                        <span style={{ fontSize:"15px", fontWeight:700, color:color||"rgba(255,255,255,0.4)", fontFamily:font }}>{count}</span>
                      </div>
                    ))}
                    <div style={{ height:1, background:"rgba(255,255,255,0.08)", margin:"8px 0" }}/>
                    <div style={{ fontSize:"15px", fontWeight:800, color:"rgba(255,255,255,0.3)", fontFamily:font, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"4px" }}>Files</div>
                    {fileInfo.map(({ label, color, Icon }, i) => (
                      <div key={label} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"4px 8px" }}>
                        <span style={{ width:12, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>{filesLoaded[i] ? <ClearedIcon size={12} line={P.accent} accent={P.accent}/> : <Icon size={12} line="rgba(255,255,255,0.35)" accent="rgba(255,255,255,0.35)"/>}</span>
                        <span style={{ fontSize:"15px", color:filesLoaded[i]?color:"rgba(255,255,255,0.25)", fontFamily:font, fontWeight:filesLoaded[i]?600:400, lineHeight:1.3 }}>{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Main panel */}
                  <div className="gg-demo-panel" style={{ flex:1, minWidth:0, padding:"20px 24px", overflowX:"hidden" }}>

                    {/* Idle state */}
                    {demoPhase === "idle" && (
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", flexDirection:"column", gap:"20px" }}>
                        <button onClick={runDemo} style={{ display:"flex", alignItems:"center", gap:"14px", background:`linear-gradient(135deg, ${P.navy}, ${P.navyLight})`, border:"none", borderRadius:"16px", padding:"18px 32px", cursor:"pointer", boxShadow:"0 4px 24px rgba(15,29,53,0.2)" }}>
                          <div style={{ width:44, height:44, borderRadius:"50%", background:P.accent, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <span style={{ marginLeft:"3px", display:"inline-flex" }}><svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 3l9 5-9 5z" fill={P.navy}/></svg></span>
                          </div>
                          <div style={{ textAlign:"left" }}>
                            <div style={{ fontSize:"16px", fontWeight:800, color:P.white, fontFamily:font }}>Watch the demo</div>
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Loading files */}
                    {(demoPhase === "loading" || demoPhase === "checking" || demoPhase === "results") && (
                      <>
                        {/* File upload strip */}
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"8px", marginBottom:"16px" }}>
                          {fileInfo.map(({ label, color, Icon }, i) => (
                            <div key={label} style={{ border:`1.5px ${filesLoaded[i]?"solid":"dashed"} ${filesLoaded[i]?color:P.grey200}`, borderRadius:"10px", padding:"10px 8px", textAlign:"center", background:filesLoaded[i]?color+"0D":P.offWhite, transition:"all 0.3s" }}>
                              <div style={{ marginBottom:"4px", display:"flex", justifyContent:"center" }}>{filesLoaded[i] ? <ClearedIcon size={20} line={color} accent={color}/> : <Icon size={20} line={P.navy} accent={color}/>}</div>
                              <div style={{ fontSize:"15px", fontWeight:700, color:filesLoaded[i]?color:P.grey600, fontFamily:font, lineHeight:1.3 }}>{label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Progress bar */}
                        {(demoPhase === "checking" || demoPhase === "results") && (
                          <div style={{ marginBottom:"16px", animation:"ggIn 0.5s cubic-bezier(.2,.8,.2,1)" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
                              <span style={{ fontSize:"15px", fontWeight:700, color:P.navy, fontFamily:font }}>
                                {checkPct < 100 ? "Checking your registrations against travel…" : "Check complete, 4 issues found"}
                              </span>
                              <span style={{ fontSize:"15px", fontWeight:800, color:P.accent, fontFamily:font }}>{checkPct}%</span>
                            </div>
                            <div style={{ height:"6px", background:P.grey100, borderRadius:"20px", overflow:"hidden" }}>
                              <div style={{ height:"100%", width:`${checkPct}%`, background:`linear-gradient(90deg,${P.periwinkleD},${P.accent})`, borderRadius:"20px", transition:"width 0.2s ease" }}/>
                            </div>
                            {checkPct < 100 && <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginTop:"4px", animation:"ggPulse 1s infinite" }}>Matching names · comparing dates · scanning gaps…</div>}
                          </div>
                        )}

                        {/* Results table */}
                        {rowsVisible > 0 && (
                          <div className="gg-demo-table-scroll" style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
                          <div style={{ border:`1px solid ${P.grey100}`, borderRadius:"12px", overflow:"hidden", animation:"ggIn 0.5s cubic-bezier(.2,.8,.2,1)", minWidth:"620px" }}>
                            {/* Table header */}
                            <div style={{ display:"grid", gridTemplateColumns:demoCols, background:P.grey50, padding:"10px 16px", gap:"12px" }}>
                              {["First","Last","Email","Status","Arr.","Dep.","Δ Arr"].map((h,ci) => (
                                <div key={h} style={{ fontSize:"13px", fontWeight:700, color:P.grey600, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.05em", justifySelf:demoJustify[ci], whiteSpace:"nowrap" }}>{h}</div>
                              ))}
                            </div>
                            {/* Rows */}
                            {demoGuests.slice(0, rowsVisible).map((g, i) => {
                              const isExp = expandedRow === g.key;
                              return (
                                <React.Fragment key={g.key}>
                                  <div onClick={() => setExpandedRow(isExp ? null : g.key)}
                                    style={{ display:"grid", gridTemplateColumns:demoCols, padding:"11px 16px", gap:"12px", alignItems:"center", background:isExp?P.grey50:i%2===0?P.white:P.offWhite, borderTop:`1px solid ${P.grey100}`, cursor:"pointer", animation:"ggIn 0.5s cubic-bezier(.2,.8,.2,1)", transition:"background 0.15s" }}>
                                    <span style={{ fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font, justifySelf:"start" }}>{g.first}</span>
                                    <span style={{ fontSize:"15px", fontWeight:700, color:P.navy, fontFamily:font, justifySelf:"start" }}>{g.last}</span>
                                    <span style={{ fontSize:"15px", color:P.grey600, fontFamily:font, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", minWidth:0, maxWidth:"100%", justifySelf:"stretch" }}>{g.email}</span>
                                    <span style={{ fontSize:"14px", fontWeight:800, color:statusColor(g.status), background:statusBg(g.status), padding:"2px 10px 2px 8px", borderRadius:"20px", fontFamily:font, whiteSpace:"nowrap", display:"inline-flex", alignItems:"center", gap:"4px", justifySelf:"center" }}>{g.status==="error" ? <FlagIcon size={11} line={statusColor(g.status)} accent={statusColor(g.status)}/> : g.status==="warn" ? <AlertIcon size={11} line={statusColor(g.status)} accent={statusColor(g.status)}/> : <ClearedIcon size={11} line={statusColor(g.status)} accent={statusColor(g.status)}/>}{statusLabel(g.status)}</span>
                                    <span style={{ fontSize:"15px", color:P.grey600, fontFamily:font, display:"inline-flex", alignItems:"center", justifySelf:"center" }}>{g.flight?.arr || <AlertIcon size={12} line={P.amber} accent={P.amber}/>}</span>
                                    <span style={{ fontSize:"15px", color:P.grey600, fontFamily:font, display:"inline-flex", alignItems:"center", justifySelf:"center" }}>{g.flight?.dep || <AlertIcon size={12} line={P.amber} accent={P.amber}/>}</span>
                                    <span style={{ fontSize:"15px", fontWeight:700, fontFamily:font, color:g.arrDiff==="0"?P.green:g.arrDiff==="—"?P.grey400:P.red, justifySelf:"end" }}>{g.arrDiff}</span>
                                  </div>
                                  {/* Expanded detail */}
                                  {isExp && (
                                    <div style={{ background:P.grey50, borderTop:`1px solid ${P.grey100}`, padding:"16px 18px", animation:"ggIn 0.45s cubic-bezier(.2,.8,.2,1)" }}>
                                      {g.issues.length > 0 && (
                                        <div style={{ display:"flex", gap:"8px", marginBottom:"14px", flexWrap:"wrap" }}>
                                          {g.issues.map(iss => (
                                            <div key={iss} style={{ display:"flex", alignItems:"center", gap:"6px", background:P.redLight, border:`1px solid ${P.red}33`, borderRadius:"8px", padding:"5px 10px" }}>
                                              <FlagIcon size={12} line={P.red} accent={P.red}/>
                                              <span style={{ fontSize:"15px", fontWeight:700, color:P.red, fontFamily:font }}>{iss}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(158px, 1fr))", gap:"10px" }}>
                                        {/* Registration card — the source of truth */}
                                        <div style={{ background:P.white, border:`1.5px solid ${g.reg?"#00A89633":"#FDECEC"}`, borderRadius:"10px", padding:"12px 14px" }}>
                                          <div style={{ fontSize:"15px", fontWeight:800, color:"#00A896", fontFamily:font, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.06em", display:"inline-flex", alignItems:"center", gap:"5px" }}><PeopleIcon size={12} line="#00A896" accent="#00A896"/>Registration</div>
                                          {g.reg ? <>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Requested in: <strong style={{ color:P.navy }}>{g.reg.checkIn}</strong></div>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Requested out: <strong style={{ color:P.navy }}>{g.reg.checkOut}</strong></div>
                                            <div style={{ fontSize:"15px", color:P.accentD, fontFamily:font, fontWeight:700, display:"inline-flex", alignItems:"center", gap:"4px" }}><ClearedIcon size={12} line={P.accentD} accent={P.accentD}/>Registered</div>
                                          </> : <div style={{ fontSize:"15px", fontWeight:700, color:P.red, fontFamily:font, display:"inline-flex", alignItems:"center", gap:"4px" }}><FlagIcon size={12} line={P.red} accent={P.red}/>Not on registration list</div>}
                                        </div>
                                        {/* Flight card */}
                                        <div style={{ background:P.white, border:`1.5px solid #4F8EF722`, borderRadius:"10px", padding:"12px 14px" }}>
                                          <div style={{ fontSize:"15px", fontWeight:800, color:"#4F8EF7", fontFamily:font, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.06em", display:"inline-flex", alignItems:"center", gap:"5px" }}><PlaneIcon size={12} line="#4F8EF7" accent="#4F8EF7"/>Flight</div>
                                          {g.flight ? <>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Arrival: <strong style={{ color:P.navy }}>{g.flight.arr}</strong></div>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Departure: <strong style={{ color:P.navy }}>{g.flight.dep}</strong></div>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font }}>Flight: {g.flight.num}</div>
                                          </> : <div style={{ fontSize:"15px", fontWeight:700, color:P.red, fontFamily:font, display:"inline-flex", alignItems:"center", gap:"4px" }}><FlagIcon size={12} line={P.red} accent={P.red}/>No flight booked</div>}
                                        </div>
                                        {/* Hotel card */}
                                        <div style={{ background:P.white, border:`1.5px solid ${g.hotel?"#C97A0A22":"#FDECEC"}`, borderRadius:"10px", padding:"12px 14px" }}>
                                          <div style={{ fontSize:"15px", fontWeight:800, color:"#C97A0A", fontFamily:font, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.06em", display:"inline-flex", alignItems:"center", gap:"5px" }}><HotelIcon size={12} line="#C97A0A" accent="#C97A0A"/>Hotel</div>
                                          {g.hotel ? <>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Check-in: <strong style={{ color: g.status!=="ok"&&g.issues[0]?.includes("check-in")?P.red:P.navy }}>{g.hotel.in}</strong></div>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Check-out: <strong style={{ color:P.navy }}>{g.hotel.out}</strong></div>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font }}>{g.hotel.name}</div>
                                          </> : <div style={{ fontSize:"15px", fontWeight:700, color:P.red, fontFamily:font, display:"inline-flex", alignItems:"center", gap:"4px" }}><FlagIcon size={12} line={P.red} accent={P.red}/>No hotel booked</div>}
                                        </div>
                                        {/* Car card */}
                                        <div style={{ background:P.white, border:`1.5px solid #6B3FA022`, borderRadius:"10px", padding:"12px 14px" }}>
                                          <div style={{ fontSize:"15px", fontWeight:800, color:"#6B3FA0", fontFamily:font, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.06em", display:"inline-flex", alignItems:"center", gap:"5px" }}><CarIcon size={12} line="#6B3FA0" accent="#6B3FA0"/>Car Transfer</div>
                                          {g.car ? <>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Pickup: <strong style={{ color:P.navy }}>{g.car.pickup}</strong></div>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font }}>Location: {g.car.loc}</div>
                                          </> : <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font }}>No transfer booked</div>}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                          </div>
                        )}

                        {/* Replay */}
                        {demoPhase === "results" && (
                          <div style={{ display:"flex", justifyContent:"center", gap:"12px", marginTop:"20px", animation:"ggIn 0.55s cubic-bezier(.2,.8,.2,1)" }}>
                            <button onClick={runDemo} style={{ background:"none", border:`1.5px solid ${P.grey100}`, borderRadius:"10px", padding:"8px 18px", fontSize:"16px", fontWeight:700, color:P.grey600, fontFamily:font, cursor:"pointer" }}>↺ Replay</button>
                            <button onClick={onEnter} style={{ background:P.accent, border:"none", borderRadius:"10px", padding:"8px 20px", fontSize:"15px", fontWeight:700, color:P.white, fontFamily:font, cursor:"pointer", boxShadow:"0 2px 10px rgba(0,201,177,0.3)" }}>Try with your files →</button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* ── Early access ── */}
      <div style={{ background:P.offWhite, padding:"72px 40px", display:"flex", justifyContent:"center" }}>
        <div style={{ width:"100%", maxWidth:"960px", display:"flex", gap:"48px", alignItems:"center", flexWrap:"wrap", justifyContent:"center" }}>
          <div style={{ flex:"1 1 320px", minWidth:"280px" }}>
            <div style={{ fontSize:"16px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:P.accentD, fontFamily:font, marginBottom:"12px" }}>Early access</div>
            <h2 style={{ fontSize:"clamp(28px,4vw,40px)", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 14px", letterSpacing:"-0.03em", lineHeight:1.15 }}>Be first to run a cleaner event</h2>
            <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.6, margin:0, maxWidth:"420px" }}>Not ready to upload your files yet? Join the early access list and we'll reach out when your spot opens, with a quick guide to load your first event.</p>
          </div>
          <div style={{ flex:"0 1 440px", minWidth:"300px", width:"100%", display:"flex", justifyContent:"center" }}>
            <EarlyAccessForm />
          </div>
        </div>
      </div>

      <div style={{ background:`linear-gradient(135deg, ${P.navy}, #0D1E40)`, padding:"96px 40px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-120, left:"50%", transform:"translateX(-50%)", width:600, height:600, borderRadius:"50%", background:`radial-gradient(circle, ${P.accent}10, transparent 65%)`, pointerEvents:"none" }} />
        <div style={{ position:"relative" }}>
          <h2 style={{ fontSize:"clamp(32px,5vw,52px)", fontWeight:700, color:P.white, fontFamily:fontDisplay, margin:"0 0 16px", letterSpacing:"-0.04em", lineHeight:1.1 }}>
            Stop cross-checking.<br/>Start <span style={{ color:P.accent }}>running great events.</span>
          </h2>
          <p style={{ fontSize:"18px", color:"rgba(255,255,255,0.5)", fontFamily:font, margin:"0 auto 28px", lineHeight:1.7, maxWidth:"480px" }}>
            Join event professionals who've turned days of logistics work into a few minutes.
          </p>
          <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:"rgba(0,201,177,0.1)", border:"1px solid rgba(0,201,177,0.25)", borderRadius:"20px", padding:"6px 16px", marginBottom:"32px" }}>
            <ShieldCheck size={14} strokeWidth={1.8} color={P.accent}/>
            <span style={{ fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.7)", fontFamily:font }}>Built by an event planner who spent 15+ years reconciling attendee lists by hand</span>
          </div>
          <div className="gg-cta-btns" style={{ display:"flex", gap:"12px", justifyContent:"center", flexWrap:"wrap" }}>
            <button onClick={onEnter} style={{ background:`linear-gradient(135deg, ${P.accent}, ${P.accentD})`, border:"none", borderRadius:"12px", padding:"16px 40px", fontSize:"17px", fontWeight:800, color:P.white, fontFamily:font, cursor:"pointer", boxShadow:"0 4px 24px rgba(0,201,177,0.4)", letterSpacing:"-0.02em" }}>
              Open GroupGrid →
            </button>
            <button onClick={onPricing} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"12px", padding:"16px 28px", fontSize:"16px", fontWeight:600, color:"rgba(255,255,255,0.75)", fontFamily:font, cursor:"pointer" }}>
              View pricing
            </button>
          </div>
          <p style={{ fontSize:"15px", color:"rgba(255,255,255,0.25)", fontFamily:font, marginTop:"20px" }}>Full access · $250/mo · Cancel any time</p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ background:P.navy, padding:"28px 40px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <span style={{ fontSize:"15px", color:"rgba(255,255,255,0.3)", fontFamily:font }}>Built for event professionals · © 2026 · <span style={{ color:"rgba(255,255,255,0.5)" }}>{APP_VERSION}</span></span>
        </div>
        <div style={{ display:"flex", gap:"20px" }}>
          {[
            ["Home", onEnter],
            ["Pricing", onPricing],
            ["About", onAbout],
            ["FAQ", onFaq],
            ["Contact", onContact],
            ["Privacy Policy", onPrivacy],
            ["Terms of Service", onTerms],
          ].map(([label, fn]) => (
            <button key={label} onClick={fn} style={{ background:"none", border:"none", fontSize:"15px", color:"rgba(255,255,255,0.35)", fontFamily:font, cursor:"pointer", textDecoration:"underline", textDecorationColor:"rgba(255,255,255,0.15)" }}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
