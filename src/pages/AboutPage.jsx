import { ShieldCheck } from "lucide-react";
import { P, font, fontDisplay } from "../theme";
import { MarketingNav } from "./PageShell";
import { FlagIcon, CityIcon, PeopleIcon, BadgeIcon, GridIcon, GlobeIcon, CrossCheckIcon } from "../icons";

export function AboutPage({ onBack, nav }) {
  const useCases = [
    { Icon:FlagIcon,   label:"Sales Kickoffs" },
    { Icon:CityIcon,   label:"Corporate Events" },
    { Icon:PeopleIcon, label:"Board Retreats" },
    { Icon:PeopleIcon, label:"Advisory Boards" },
    { Icon:PeopleIcon, label:"Executive Roundtables" },
    { Icon:BadgeIcon,  label:"Tradeshows" },
    { Icon:CityIcon,   label:"Healthcare Meetings" },
    { Icon:GridIcon,   label:"Event Agencies" },
    { Icon:CityIcon,   label:"Conferences" },
    { Icon:PeopleIcon, label:"Association Meetings" },
    { Icon:GlobeIcon,  label:"Global Summits" },
    { Icon:FlagIcon,   label:"Field Marketing Events" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:P.offWhite, fontFamily:font }}>
      {nav ? <MarketingNav nav={nav} /> : (
      <div style={{ background:P.navy, padding:"0 32px", height:"52px", display:"flex", alignItems:"center", gap:"16px", boxShadow:"0 1px 0 rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"8px", padding:"5px 12px", color:"rgba(255,255,255,0.7)", fontSize:"15px", fontFamily:font, fontWeight:600, cursor:"pointer" }}>← Back</button>
        <span style={{ color:P.white, fontSize:"15px", fontWeight:700, fontFamily:font }}>About GroupGrid</span>
      </div>
      )}

      {/* Hero */}
      <div style={{ background:`linear-gradient(160deg, ${P.navy} 0%, ${P.navyLight} 100%)`, padding:"64px 28px 56px", textAlign:"center" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:"rgba(0,201,177,0.12)", border:"1px solid rgba(0,201,177,0.3)", borderRadius:"20px", padding:"5px 16px", marginBottom:"20px" }}>
          <span style={{ fontSize:"15px", fontWeight:700, color:P.accent, fontFamily:font, letterSpacing:"0.05em" }}>BUILT BY A PLANNER, FOR PLANNERS</span>
        </div>
        <h1 style={{ fontSize:"42px", fontWeight:700, color:P.white, fontFamily:fontDisplay, margin:"0 0 16px", letterSpacing:"-0.04em", lineHeight:1.1, maxWidth:"680px", marginLeft:"auto", marginRight:"auto" }}>
          The tool I wish I had<br/><span style={{ color:P.accent }}>for every event I've ever run.</span>
        </h1>
        <p style={{ fontSize:"18px", color:"rgba(255,255,255,0.6)", fontFamily:font, margin:"0 auto", lineHeight:1.7, maxWidth:"560px" }}>
          Created to solve a problem I lived with for over 15 years: making sure everyone who registers for an event actually has the travel they were promised.
        </p>
      </div>

      <div style={{ maxWidth:"820px", margin:"0 auto", padding:"56px 28px 80px" }}>

        {/* Founder story */}
        <div style={{ background:P.white, borderRadius:"20px", border:`1.5px solid ${P.grey100}`, padding:"36px 40px", marginBottom:"32px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, width:"4px", height:"100%", background:`linear-gradient(180deg, ${P.accent}, ${P.navy})` }} />
          <div style={{ fontSize:"16px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"16px" }}>Why GroupGrid Exists</div>
          <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.85, margin:"0 0 20px" }}>
            GroupGrid was created to solve a challenge I lived with for more than 15 years as an event professional: <strong style={{ color:P.navy }}>reconciling who registered for an event against what was actually booked for their travel.</strong> Registration lists, flight manifests, and hotel rosters never quite agree, and finding the gaps before they become day-of problems is slow, manual, and error-prone.
          </p>
          <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.85, margin:"0 0 20px" }}>
            For years, the only way to manage it reliably was to spend thousands of dollars outsourcing the cross-checking — paying others to do the painstaking work of comparing spreadsheets row by row. It was expensive, it was repetitive, and it was a problem the market had never properly solved.
          </p>
          <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.85, margin:0 }}>
            GroupGrid brings that work in-house and makes it fast. Upload your registration list and your travel files, run the check, and see exactly who registered but isn't booked, who's booked but never registered, and whose dates don't match — with enough time to fix it.
          </p>
        </div>

        {/* Value strip */}
        <div style={{ background:P.navy, borderRadius:"16px", padding:"28px 32px", marginBottom:"32px" }}>
          <div style={{ fontSize:"16px", fontWeight:800, color:"rgba(255,255,255,0.5)", fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"22px" }}>What GroupGrid Does For You</div>
          <div className="gg-landing-stats" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"22px 28px" }}>
            {[
              { Icon:CrossCheckIcon, title:"No manual cross-checking", body:"Check an entire event without comparing spreadsheets row by row." },
              { Icon:PeopleIcon, title:"Everyone matched to their travel", body:"Each registered guest is lined up against their flight, hotel, and car." },
              { Icon:ShieldCheck, title:"Your guest files stay private", body:"Files are read in your browser and never uploaded to a server.", lucide:true },
              { Icon:FlagIcon, title:"Gaps caught before the event", body:"Missing bookings, mismatched dates, and duplicates, surfaced with time to fix them." },
            ].map(({ Icon, title, body, lucide }, i) => {
              const box = i % 2 === 0 ? P.accentD : P.navyLight;
              const iconAccent = box === P.accentD ? P.white : P.accent;
              return (
              <div key={title} style={{ display:"flex", alignItems:"flex-start", gap:"14px" }}>
                <div style={{ width:38, height:38, borderRadius:"10px", background:box, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"2px" }}>
                  {lucide ? <Icon size={19} strokeWidth={1.8} color="rgba(255,255,255,0.95)"/> : <Icon size={20} line="rgba(255,255,255,0.95)" accent={iconAccent} />}
                </div>
                <div>
                  <div style={{ fontSize:"15px", fontWeight:700, color:P.white, fontFamily:font, marginBottom:"3px", letterSpacing:"-0.01em" }}>{title}</div>
                  <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.55)", fontFamily:font, lineHeight:1.55 }}>{body}</div>
                </div>
              </div>
              );
            })}
          </div>
        </div>

        {/* Who it's for */}
        <div style={{ marginBottom:"32px" }}>
          <div style={{ fontSize:"16px", fontWeight:800, color:P.navy, fontFamily:font, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"8px" }}>Built for Event Planners Running Events of Any Size</div>
          <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, margin:"0 0 20px" }}>
            Wherever you need to make sure attendees arrive on time, have a confirmed hotel room, and won't show up at the wrong airport — GroupGrid has you covered.
          </p>
          <div className="gg-landing-usecases" style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"10px" }}>
            {useCases.map(({ Icon, label }, i) => {
              const box = i % 2 === 0 ? P.navy : P.accentD;
              const iconAccent = box === P.accentD ? P.white : P.accent;
              return (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:"12px", background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"12px", padding:"12px 14px" }}>
                <div style={{ width:36, height:36, borderRadius:"10px", background:box, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon size={19} line="rgba(255,255,255,0.95)" accent={iconAccent} /></div>
                <span style={{ fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font }}>{label}</span>
              </div>
              );
            })}
          </div>
        </div>

        {/* How it works */}
        <div style={{ background:P.white, borderRadius:"16px", border:`1.5px solid ${P.grey100}`, padding:"32px 36px", marginBottom:"32px" }}>
          <div style={{ fontSize:"16px", fontWeight:800, color:P.navy, fontFamily:font, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"20px" }}>How It Works</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"18px" }}>
            {[
              { n:"1", title:"Upload your spreadsheets", body:"Drag in your flight manifest, hotel roster, and car transfers — Excel or CSV (.xlsx, .xls, .csv), any column names. GroupGrid auto-detects them." },
              { n:"2", title:"Run the cross-check", body:"GroupGrid matches every guest across all files by name and email, identifying mismatches, missing records, date gaps, and duplicates." },
              { n:"3", title:"See exactly what needs fixing", body:"Every flag is surfaced with context — who's affected, what the mismatch is, and how many days off. Resolve issues, add notes, and export a clean report." },
              { n:"4", title:"Share with your team or hotel", body:"Download an Excel file, generate a shareable HTML report, or draft emails directly to your hotel and travel agency contacts — all from the same screen." },
            ].map(({ n, title, body }) => (
              <div key={n} style={{ display:"flex", gap:"16px", alignItems:"flex-start" }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:P.navy, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"1px" }}>
                  <span style={{ fontSize:"15px", fontWeight:800, color:P.accent, fontFamily:font }}>{n}</span>
                </div>
                <div>
                  <div style={{ fontSize:"15px", fontWeight:700, color:P.navy, fontFamily:font, marginBottom:"4px" }}>{title}</div>
                  <div style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div style={{ background:P.accentLight, border:`1.5px solid ${P.accent}44`, borderRadius:"14px", padding:"24px 28px", marginBottom:"32px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
            <ShieldCheck size={18} strokeWidth={1.8} color={P.teal}/>
            <div style={{ fontSize:"15px", fontWeight:800, color:P.teal, fontFamily:font }}>Your guest files never leave your browser</div>
          </div>
          <div style={{ fontSize:"16px", color:P.grey600, fontFamily:font, lineHeight:1.7 }}>
            Your guest files — names, emails, flight details, hotel records — are read and processed entirely in your browser and are never uploaded to our servers. Account sign-in is handled securely through Supabase, a trusted third-party provider, and your saved projects are stored locally in your browser. The sensitive guest spreadsheet data itself stays in your browser.
          </div>
        </div>

        {/* Community */}
        <div style={{ background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"14px", padding:"24px 28px", textAlign:"center" }}>
          <div style={{ fontSize:"15px", fontWeight:800, color:P.navy, fontFamily:font, marginBottom:"8px" }}>Part of the events community</div>
          <div style={{ fontSize:"16px", color:P.grey600, fontFamily:font, lineHeight:1.7, marginBottom:"16px" }}>
            GroupGrid is built by an active member of the event marketing community, including CEMA and PCMA. Have a question or want to connect? Reach out anytime.
          </div>
          <a href="mailto:hello@groupgrid.io" style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:P.navy, borderRadius:"10px", padding:"10px 22px", fontSize:"15px", fontWeight:700, color:P.white, fontFamily:font, textDecoration:"none" }}>
            Get in touch →
          </a>
        </div>

      </div>
    </div>
  );
}
