import React, { useState } from "react";
import { Check, X, ChevronRight, Plus, Users, Plane, Hotel, Car, Salad, Download } from "lucide-react";
import { P, font } from "../theme";
import { SHOW_DIETARY } from "../constants";
import { FlagIcon, PeopleIcon, PlaneIcon, HotelIcon, CarIcon, SpreadsheetIcon, CrossCheckIcon } from "../icons";
import { downloadAllTemplates } from "./templatesDownload";
import { ExtraUploads } from "./ExtraUploads";
import { SetupTile } from "./SetupTile";

export function SetupScreen({
  projectName, setProjectName, eventName, setEventName, arrivalStart, setArrivalStart, arrivalEnd, setArrivalEnd,
  departureStart, setDepartureStart, departureEnd, setDepartureEnd,
  preferredAirports, setPreferredAirports,
  departureAirports, setDepartureAirports,
  arrivalCutoff, setArrivalCutoff,
  departureCutoff, setDepartureCutoff,
  lateArrivalCutoff, setLateArrivalCutoff,
  typeRules, setTypeRules,
  contacts, setContacts, setContactsOpen,
  registrationFile, setRegistrationFile, flightFile, setFlightFile, hotelFile, setHotelFile,
  hotelProperty, setHotelProperty, extraHotels, setExtraHotels,
  extraFlights, setExtraFlights, extraCars, setExtraCars, extraReg, setExtraReg, extraDietary, setExtraDietary,
  carFile, setCarFile, dietaryFile, setDietaryFile, abstractFile, setAbstractFile,
  ready, loading, error, runCheck, isMobile, isReRun
}) {
  const hasName = !!(projectName && projectName.trim());
  const canRun = hasName && ready && !loading;
  const hasContacts = contacts && (contacts.hotel?.email || contacts.travel?.email || contacts.car?.email);
  const anyTravel = !!(arrivalStart || arrivalEnd || departureStart || departureEnd || arrivalCutoff || departureCutoff || lateArrivalCutoff || (typeRules && typeRules.length) || preferredAirports || departureAirports);
  const updateContact = (group, field, val) => setContacts(prev => ({ ...prev, [group]: { ...prev[group], [field]: val } }));
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [advTravel, setAdvTravel] = useState(false);
  const optionalCount = (anyTravel ? 1 : 0) + (hasContacts ? 1 : 0);
  return (
    <div style={{ maxWidth:"760px", margin:"0 auto", width:"100%" }}>
      <h1 style={{ fontSize:"clamp(20px,3vw,24px)", fontWeight:600, color:P.navy, fontFamily:font, letterSpacing:"-0.02em", margin:"0 0 4px" }}>New project</h1>
      <p style={{ fontSize:"13.5px", color:P.grey600, fontFamily:font, margin:"0 0 18px", lineHeight:1.55 }}>Name your project, upload your files, then run the cross-check. Travel parameters and contacts are optional.</p>

      <div style={{ display:"flex", alignItems:"center", marginBottom:"18px", flexWrap:"wrap", gap:"8px" }}>
        {[
          { n:"1", label:"Project", state: hasName ? "done" : "active" },
          { n:"2", label:"Upload", state: hasName ? (ready ? "done" : "active") : "todo" },
          { n:"3", label:"Details", state: optionalCount ? "done" : "todo" },
          { n:"4", label:"Review", state:"todo" },
        ].map(({ n, label, state }, i) => (
          <React.Fragment key={label}>
            {i > 0 && <div className="gg-step-line" style={{ flex:1, height:"1.5px", background:P.grey100, margin:"0 12px", minWidth:"20px" }} />}
            <div style={{ display:"flex", alignItems:"center", gap:"9px" }}>
              <span style={{ width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"17px", fontWeight:600, flexShrink:0, fontFamily:font, background: state==="done"?P.accent:state==="active"?P.navy:P.grey100, color: state==="todo"?P.grey600:P.white }}>{state==="done"?<Check size={14} strokeWidth={2.5}/>:n}</span>
              <span style={{ fontSize:"18px", fontWeight: state==="todo"?400:500, color: state==="todo"?P.grey600:P.navy, fontFamily:font }}>{label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="gg-setup-cols" style={{ display:"flex", flexDirection:"column", gap:"0px", alignItems:"stretch" }}>
      <div style={{ order:1, background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"14px", padding:"18px 20px", marginBottom:"14px", boxShadow:"0 1px 2px rgba(12,30,63,0.04), 0 14px 30px -20px rgba(12,30,63,0.22)" }}>
        <div style={{ fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font, marginBottom:"3px" }}>Step 1 · Project info</div>
        <div style={{ fontSize:"12.5px", color:P.grey600, fontFamily:font, marginBottom:"14px", lineHeight:1.5 }}>Name your project and set the event name guests see in their emails.</div>
        <div style={{ marginBottom:"14px" }}>
          <label style={{ display:"block", fontSize:"16px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"6px" }}>Project name <span style={{ color:P.red }}>required</span></label>
          <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Sales Summit - working file"
            style={{ width:"100%", background:P.grey50, border:`1.5px solid ${hasName?P.accent+"88":P.grey100}`, borderRadius:"10px", padding:"11px 13px", fontSize:"15px", color:P.navy, fontFamily:font, outline:"none", boxSizing:"border-box" }} />
          <div style={{ fontSize:"13px", color:P.grey600, fontFamily:font, marginTop:"5px" }}>What this saved project is called in your list. Only you see it.</div>
        </div>
        <div style={{ marginBottom:"14px" }}>
          <label style={{ display:"block", fontSize:"16px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"6px" }}>Event name <span style={{ color:P.grey600, fontWeight:400 }}>· used in attendee emails</span></label>
          <input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. Sales Summit 2026"
            style={{ width:"100%", background:P.grey50, border:`1.5px solid ${eventName&&eventName.trim()?P.accent+"88":P.grey100}`, borderRadius:"10px", padding:"11px 13px", fontSize:"15px", color:P.navy, fontFamily:font, outline:"none", boxSizing:"border-box" }} />
          <div style={{ fontSize:"13px", color:P.grey600, fontFamily:font, marginTop:"5px" }}>The name guests see in emails and on the report. Left blank, emails fall back to a generic phrase.</div>
        </div>
      </div>

      {/* ── Optional details drawer: collapses Travel + Contacts (Option F) ── */}
      <button onClick={() => setOptionalOpen(o => !o)} type="button"
        style={{ order:3, display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"14px", padding:"15px 20px", marginBottom:"14px", cursor:"pointer", boxShadow:"0 1px 2px rgba(12,30,63,0.04), 0 14px 30px -20px rgba(12,30,63,0.22)", boxSizing:"border-box" }}>
        <span style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <span style={{ display:"inline-flex", transform: optionalOpen ? "rotate(90deg)" : "none", transition:"transform 0.18s", color:P.grey600 }}><ChevronRight size={18} strokeWidth={2} /></span>
          <span style={{ fontSize:"16px", fontWeight:600, color:P.navy, fontFamily:font }}>Step 3 · Optional details</span>
          <span style={{ fontSize:"13px", fontWeight:400, color:P.grey600, fontFamily:font }}>· travel parameters and contacts</span>
        </span>
        <span style={{ fontSize:"13px", fontWeight:500, color: optionalCount ? P.accentD : P.grey600, fontFamily:font }}>{optionalCount ? `${optionalCount} added · ${optionalOpen ? "hide" : "edit"}` : (optionalOpen ? "hide" : "add — optional")}</span>
      </button>

      {/* Collapse wrapper holds Box 2 (Travel) + Box 3 (Contacts) */}
      <div style={{ order:3, display: optionalOpen ? "block" : "none" }}>

      {/* ── Box 2 · Travel parameters ── */}
      <div style={{ background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"14px", padding:"18px 20px", marginBottom:"14px", boxShadow:"0 1px 2px rgba(12,30,63,0.04), 0 14px 30px -20px rgba(12,30,63,0.22)" }}>
        <div style={{ fontSize:"16px", fontWeight:600, color:P.navy, fontFamily:font, marginBottom:"3px" }}>Travel parameters <span style={{ fontSize:"13px", fontWeight:400, color:P.grey600 }}>· optional</span></div>
        <div style={{ fontSize:"12.5px", color:P.grey600, fontFamily:font, marginBottom:"18px", lineHeight:1.5 }}>Set your approved dates and airports so GroupGrid can flag anyone who falls outside them. Skip this to run without travel flags.</div>

        <div style={{ fontSize:"11.5px", fontWeight:600, color:P.grey600, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"9px" }}>Approved travel window</div>
        <div className="gg-setup-grid2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"10px" }}>
          {[
            { label:"Earliest arrival", val:arrivalStart, set:setArrivalStart },
            { label:"Latest arrival", val:arrivalEnd, set:setArrivalEnd },
            { label:"Earliest departure", val:departureStart, set:setDepartureStart },
            { label:"Latest departure", val:departureEnd, set:setDepartureEnd },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label style={{ display:"block", fontSize:"12px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"5px" }}>{label}</label>
              <input type="date" value={val} onChange={e => set(e.target.value)}
                style={{ width:"100%", background:P.grey50, border:`1.5px solid ${val?P.accent+"66":P.grey100}`, borderRadius:"10px", padding:"9px 12px", fontSize:"15px", color:val?P.navy:P.grey600, fontFamily:font, outline:"none", boxSizing:"border-box" }} />
            </div>
          ))}
        </div>

        <div style={{ fontSize:"11.5px", fontWeight:600, color:P.grey600, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.05em", margin:"14px 0 9px" }}>Airports</div>
        <div className="gg-setup-grid2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
          <div>
            <label style={{ display:"block", fontSize:"12px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"5px" }}>Arrival airport(s)</label>
            <input type="text" value={preferredAirports} onChange={e => setPreferredAirports(e.target.value)} placeholder="e.g. JFK, LGA"
              style={{ width:"100%", background:P.grey50, border:`1.5px solid ${preferredAirports?P.accent+"66":P.grey100}`, borderRadius:"10px", padding:"9px 12px", fontSize:"15px", color:preferredAirports?P.navy:P.grey600, fontFamily:font, fontWeight:600, outline:"none", boxSizing:"border-box" }} />
          </div>
          <div>
            <label style={{ display:"block", fontSize:"12px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"5px" }}>Departure airport(s)</label>
            <input type="text" value={departureAirports} onChange={e => setDepartureAirports(e.target.value)} placeholder="e.g. JFK, LGA"
              style={{ width:"100%", background:P.grey50, border:`1.5px solid ${departureAirports?P.accent+"66":P.grey100}`, borderRadius:"10px", padding:"9px 12px", fontSize:"15px", color:departureAirports?P.navy:P.grey600, fontFamily:font, fontWeight:600, outline:"none", boxSizing:"border-box" }} />
          </div>
        </div>

        <button type="button" onClick={() => setAdvTravel(o => !o)}
          style={{ display:"flex", alignItems:"center", gap:"7px", background:"transparent", border:"none", padding:"14px 0 0", cursor:"pointer", fontFamily:font }}>
          <span style={{ display:"inline-flex", transform: advTravel ? "rotate(90deg)" : "none", transition:"transform 0.15s", color:P.grey600 }}><ChevronRight size={16} strokeWidth={2}/></span>
          <span style={{ fontSize:"13px", fontWeight:600, color:P.navy }}>Advanced options</span>
          <span style={{ fontSize:"12px", color:P.grey600 }}>· cutoffs and attendee-type rules</span>
        </button>

        {advTravel && (
          <div style={{ marginTop:"14px" }}>
            <div className="gg-setup-grid2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
              <div>
                <label style={{ display:"block", fontSize:"12px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"5px" }}>Early-arrival cutoff</label>
                <input type="time" value={arrivalCutoff} onChange={e => setArrivalCutoff(e.target.value)}
                  style={{ width:"100%", background:P.grey50, border:`1.5px solid ${arrivalCutoff?P.accent+"66":P.grey100}`, borderRadius:"10px", padding:"9px 12px", fontSize:"15px", color:arrivalCutoff?P.navy:P.grey600, fontFamily:font, fontWeight:600, outline:"none", boxSizing:"border-box" }} />
                <div style={{ fontSize:"11.5px", color:P.grey600, fontFamily:font, marginTop:"5px", lineHeight:1.4 }}>Lands before this, needs the night before.</div>
              </div>
              <div>
                <label style={{ display:"block", fontSize:"12px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"5px" }}>Earliest departure time</label>
                <input type="time" value={departureCutoff} onChange={e => setDepartureCutoff(e.target.value)}
                  style={{ width:"100%", background:P.grey50, border:`1.5px solid ${departureCutoff?P.accent+"66":P.grey100}`, borderRadius:"10px", padding:"9px 12px", fontSize:"15px", color:departureCutoff?P.navy:P.grey600, fontFamily:font, fontWeight:600, outline:"none", boxSizing:"border-box" }} />
                <div style={{ fontSize:"11.5px", color:P.grey600, fontFamily:font, marginTop:"5px", lineHeight:1.4 }}>Earliest a flight may leave that day.</div>
              </div>
            </div>
            <div>
              <label style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:"12px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"5px" }}>
                <span>Late-arrival cutoff</span>
                <button type="button" onClick={() => setLateArrivalCutoff(lateArrivalCutoff ? "" : "22:30")} style={{ background:"transparent", border:"none", color:P.periwinkleD, fontSize:"12px", fontWeight:600, fontFamily:font, cursor:"pointer" }}>{lateArrivalCutoff ? "Turn off" : "Turn on (10:30 PM)"}</button>
              </label>
              <input type="time" value={lateArrivalCutoff} onChange={e => setLateArrivalCutoff(e.target.value)}
                style={{ width:"100%", background:P.grey50, border:`1.5px solid ${lateArrivalCutoff?P.amber+"88":P.grey100}`, borderRadius:"10px", padding:"9px 12px", fontSize:"15px", color:lateArrivalCutoff?P.navy:P.grey600, fontFamily:font, fontWeight:600, outline:"none", boxSizing:"border-box" }} />
              <div style={{ fontSize:"11.5px", color:P.grey600, fontFamily:font, marginTop:"5px", lineHeight:1.4 }}>Lands after this with a room booked, flags a possible late arrival so you can tell the hotel to hold it.</div>
            </div>

            <div style={{ marginTop:"16px", paddingTop:"14px", borderTop:`1px solid ${P.grey100}` }}>
              <div style={{ fontSize:"13px", fontWeight:600, color:P.navy, fontFamily:font, marginBottom:"4px" }}>Arrival rules by attendee type</div>
              <div style={{ fontSize:"12px", color:P.grey600, fontFamily:font, marginBottom:"12px", lineHeight:1.5 }}>Give a type an expected arrival date, for example Speakers arrive Dec 7. The type must be a column in your registration list. Leave a type off for no rule, like VIPs.</div>
              {typeRules.map(r => (
                <div key={r.id} style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"8px", flexWrap:"wrap" }}>
                  <input value={r.type} onChange={e => setTypeRules(prev => prev.map(x => x.id===r.id ? { ...x, type:e.target.value } : x))} placeholder="Attendee type (e.g. International)"
                    style={{ flex:"1 1 180px", minWidth:0, background:P.grey50, border:`1.5px solid ${r.type?P.accent+"66":P.grey100}`, borderRadius:"9px", padding:"9px 12px", fontSize:"14px", color:P.navy, fontFamily:font, outline:"none", boxSizing:"border-box" }} />
                  <input type="date" value={r.date || ""} onChange={e => setTypeRules(prev => prev.map(x => x.id===r.id ? { ...x, date:e.target.value } : x))}
                    title="Expected arrival date for this attendee type"
                    style={{ flex:"0 0 165px", background:P.grey50, border:`1.5px solid ${r.date?P.accent+"66":P.grey100}`, borderRadius:"9px", padding:"9px 10px", fontSize:"14px", fontWeight:600, color:r.date?P.navy:P.grey600, fontFamily:font, outline:"none", boxSizing:"border-box" }} />
                  <button type="button" onClick={() => setTypeRules(prev => prev.filter(x => x.id!==r.id))} title="Remove rule"
                    style={{ background:"transparent", border:"none", color:P.grey600, cursor:"pointer", flexShrink:0, padding:"4px" }}><X size={16} strokeWidth={1.8}/></button>
                </div>
              ))}
              <button type="button" onClick={() => setTypeRules(prev => [...prev, { id:Date.now(), type:"", date:"" }])}
                style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:"transparent", border:"none", color:P.accentD, fontSize:"13px", fontWeight:600, fontFamily:font, cursor:"pointer", padding:"4px 0", marginTop:"2px" }}>
                <Plus size={14} strokeWidth={2}/> Add an attendee-type rule
              </button>
            </div>
          </div>
        )}

        <div style={{ display:"flex", gap:"8px", alignItems:"flex-start", fontSize:"12.5px", color:P.grey600, fontFamily:font, lineHeight:1.5, background:P.amber+"12", borderRadius:"9px", padding:"9px 12px", marginTop:"16px" }}>
          <span style={{ flexShrink:0, marginTop:"1px" }}><FlagIcon size={14} line={P.amber} accent={P.amber} /></span>
          <span><strong style={{ color:P.navyLight, fontWeight:600 }}>GroupGrid flags</strong> arrivals or departures outside your window, wrong airports, early or late arrivals past your cutoffs, and attendee-type date mismatches.</span>
        </div>
      </div>

      {/* ── Box 3 · Contact details (expanded inline) ── */}
      <div style={{ background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"14px", padding:"18px 20px", marginBottom:"14px", boxShadow:"0 1px 2px rgba(12,30,63,0.04), 0 14px 30px -20px rgba(12,30,63,0.22)" }}>
        <div style={{ fontSize:"16px", fontWeight:600, color:P.navy, fontFamily:font, marginBottom:"3px" }}>Contacts <span style={{ fontSize:"13px", fontWeight:400, color:P.grey600 }}>· optional</span></div>
        <div style={{ fontSize:"12.5px", color:P.grey600, fontFamily:font, marginBottom:"16px", lineHeight:1.5 }}>Add your hotel, travel agency, and transfer contacts so you can email them directly from your results.</div>
        {[
          { key:"hotel", label:"Hotel", color:P.navy },
          { key:"travel", label:"Travel agency", color:P.periwinkleD },
          { key:"car", label:"Car / transfer", color:P.accentD },
        ].map(({ key, label, color }) => (
          <div key={key} style={{ marginBottom:"14px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"8px" }}>
              <span style={{ width:3, height:14, background:color, borderRadius:"2px" }} />
              <span style={{ fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font }}>{label}</span>
            </div>
            <div className="gg-setup-grid2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
              <input value={contacts[key]?.name || ""} onChange={e => updateContact(key, "name", e.target.value)} placeholder="Contact name"
                style={{ width:"100%", background:P.grey50, border:`1.5px solid ${contacts[key]?.name?color+"55":P.grey100}`, borderRadius:"10px", padding:"10px 13px", fontSize:"15px", color:P.navy, fontFamily:font, outline:"none", boxSizing:"border-box" }} />
              <input type="email" value={contacts[key]?.email || ""} onChange={e => updateContact(key, "email", e.target.value)} placeholder="email@company.com"
                style={{ width:"100%", background:P.grey50, border:`1.5px solid ${contacts[key]?.email?color+"55":P.grey100}`, borderRadius:"10px", padding:"10px 13px", fontSize:"15px", color:P.navy, fontFamily:font, outline:"none", boxSizing:"border-box" }} />
            </div>
          </div>
        ))}
        <button onClick={() => setContactsOpen(true)}
          style={{ display:"inline-flex", alignItems:"center", gap:"7px", background:"transparent", border:"none", color:P.periwinkleD, fontSize:"15px", fontWeight:600, fontFamily:font, cursor:"pointer", padding:"4px 0", marginTop:"2px" }}>
          <PeopleIcon size={15} line={P.periwinkleD} accent={P.accent}/>
          More contact options (multiple hotels, phone, email signature)
        </button>
      </div>

      </div>
      {/* end optional details drawer */}

      <div style={{ order:2, background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"14px", padding:"18px 20px", marginBottom:"14px", boxShadow:"0 1px 2px rgba(12,30,63,0.04), 0 14px 30px -20px rgba(12,30,63,0.22)", opacity: hasName ? 1 : 0.55, pointerEvents: hasName ? "auto" : "none", transition:"opacity 0.2s" }}>
        <div style={{ fontSize:"16px", fontWeight:600, color:P.navy, fontFamily:font, marginBottom:"3px" }}>Step 2 · Upload files {!hasName && <span style={{ fontSize:"13px", fontWeight:400, color:P.grey600 }}>· name your project first</span>}</div>
        <div style={{ fontSize:"13px", color:P.grey600, fontFamily:font, marginBottom:"12px", lineHeight:1.5 }}>Upload whatever you have. GroupGrid cross-checks any 2 or more files (Excel, CSV, or PDF). Hover a tile to see the columns it expects.</div>
        <div style={{ display:"flex", gap:"8px", alignItems:"flex-start", fontSize:"12.5px", color:P.navyLight, fontFamily:font, marginBottom:"14px", padding:"9px 12px", background:P.periwinkle+"0D", borderRadius:"9px", border:`1px solid ${P.periwinkle}22`, lineHeight:1.5 }}>
          <span style={{ background:P.periwinkle+"22", color:P.periwinkleD, borderRadius:"5px", padding:"1px 7px", fontSize:"11.5px", fontWeight:700, flexShrink:0 }}>TIP</span>
          <span>Include an <strong style={{ fontWeight:600 }}>Email</strong> column for the most accurate matching. GroupGrid matches by email first, then name.</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"10px", flexWrap:"wrap", marginBottom:"12px" }}>
          <span style={{ fontSize:"13px", fontWeight:500, color:P.grey600, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.05em" }}>Upload any 2 or more</span>
          <button type="button" onClick={downloadAllTemplates}
            style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:P.accent+"14", border:`1px solid ${P.accent}55`, borderRadius:"8px", padding:"6px 12px", fontSize:"13px", fontWeight:600, color:P.accentD, fontFamily:font, cursor:"pointer" }}>
            <Download size={14} strokeWidth={1.8}/> Download all templates (.zip)
          </button>
        </div>
        <div className="gg-setup-tiles3" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"14px" }}>
          <SetupTile label="Registration List" sub="Required" icon={<PeopleIcon size={20} />} accent={P.accentD} file={registrationFile} setter={setRegistrationFile} required columns={["First/Last Name (or Name)","Email","Company / Job Title (opt)","Requested Check-In / Out (opt)","Flight / Hotel Request (opt)"]} />
          <SetupTile label="Flight Manifest" icon={<PlaneIcon size={20} />} accent={P.periwinkleD} file={flightFile} setter={setFlightFile} columns={["First/Last Name (or Name)","Email (opt)","Arrival Date","Departure Date","Flight # (opt)"]} />
          <SetupTile label="Hotel Roster" icon={<HotelIcon size={20} />} accent={P.navy} file={hotelFile} setter={setHotelFile} columns={["First/Last Name (or Name)","Email (opt)","Check-In Date","Check-Out Date","Hotel / Room (opt)"]} />
        </div>

        <ExtraUploads show={!!registrationFile} items={extraReg} setItems={setExtraReg} Icon={Users} color={P.accentD} />
        <ExtraUploads show={!!flightFile} items={extraFlights} setItems={setExtraFlights} Icon={Plane} color={P.periwinkleD} />
        {/* Multi-hotel: name the property and add more rooming lists */}
        {hotelFile && (
          <div style={{ background:P.grey50, border:`1px solid ${P.grey100}`, borderRadius:"12px", padding:"14px 16px", marginBottom:"14px" }}>
            <div style={{ fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font, marginBottom:"3px" }}>Hotel properties</div>
            <div style={{ fontSize:"13px", color:P.grey600, fontFamily:font, marginBottom:"12px", lineHeight:1.5 }}>Running more than one hotel? Name each property and add its rooming list. If a file already has a "Hotel" column, GroupGrid uses that automatically.</div>

            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
              <Hotel size={16} strokeWidth={1.8} color="#C97A0A" style={{ flexShrink:0 }}/>
              <span style={{ fontSize:"16px", color:P.grey600, fontFamily:font, flex:"0 0 130px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{hotelFile.name}</span>
              <input value={hotelProperty} onChange={e => setHotelProperty(e.target.value)} placeholder="Property name (optional)"
                style={{ flex:1, background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"8px", padding:"7px 11px", fontSize:"15px", color:P.navy, fontFamily:font, outline:"none", minWidth:0 }} />
            </div>

            {extraHotels.map((eh, idx) => (
              <div key={eh.id} style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
                <Hotel size={16} strokeWidth={1.8} color="#C97A0A" style={{ flexShrink:0 }}/>
                <label style={{ flex:"0 0 130px", overflow:"hidden" }}>
                  <input type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} onChange={e => { const f = e.target.files[0]; if (f) setExtraHotels(prev => prev.map(x => x.id===eh.id ? { ...x, file:f } : x)); }} />
                  <span style={{ display:"inline-block", fontSize:"15px", color:eh.file?P.navy:P.periwinkleD, fontFamily:font, cursor:"pointer", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"130px", fontWeight:500 }}>{eh.file ? eh.file.name : "+ choose file"}</span>
                </label>
                <input value={eh.property} onChange={e => setExtraHotels(prev => prev.map(x => x.id===eh.id ? { ...x, property:e.target.value } : x))} placeholder="Property name (optional)"
                  style={{ flex:1, background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"8px", padding:"7px 11px", fontSize:"15px", color:P.navy, fontFamily:font, outline:"none", minWidth:0 }} />
                <button onClick={() => setExtraHotels(prev => prev.filter(x => x.id !== eh.id))} style={{ background:"transparent", border:"none", color:P.grey600, cursor:"pointer", flexShrink:0 }} title="Remove"><X size={15} strokeWidth={1.8}/></button>
              </div>
            ))}

            <button onClick={() => setExtraHotels(prev => [...prev, { id:Date.now(), file:null, property:"" }])}
              style={{ background:"transparent", border:"none", color:P.accentD, fontSize:"15px", fontWeight:500, fontFamily:font, cursor:"pointer", marginTop:"4px", padding:"4px 0" }}>+ Add another hotel property</button>
          </div>
        )}

        <div style={{ fontSize:"13px", fontWeight:500, color:P.grey600, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"12px" }}>More files</div>
        <div className="gg-setup-tiles2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          <SetupTile label="Car Transfers" icon={<CarIcon size={20} />} accent={P.grey600} file={carFile} setter={setCarFile} columns={["First/Last Name (or Name)","Email (opt)","Pickup Date","Dropoff Date","Pickup Location (opt)"]} />
          <SetupTile label="Abstract Submissions" icon={<SpreadsheetIcon size={20} />} accent={P.purple} file={abstractFile} setter={setAbstractFile} columns={["First/Last Name (or Name)","Email","Abstract Title (opt)","Status (opt)"]} />
          {SHOW_DIETARY && <SetupTile label="Dietary & Access" icon={<Salad size={20} strokeWidth={1.8} color="#0D9E6E"/>} accent={P.teal} file={dietaryFile} setter={setDietaryFile} columns={["First/Last Name (or Name)","Email (opt)","Dietary Restrictions","Accessibility Needs","Special Notes (opt)"]} />}
        </div>
        <ExtraUploads show={!!carFile} items={extraCars} setItems={setExtraCars} Icon={Car} color={P.grey600} />
        {SHOW_DIETARY && <ExtraUploads show={!!dietaryFile} items={extraDietary} setItems={setExtraDietary} Icon={Salad} color="#0D9E6E" />}
      </div>
      </div>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"14px", background:P.navy, borderRadius:"12px", padding:"13px 18px", flexWrap:"wrap" }}>
        <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.6)", fontFamily:font }}>
          {!hasName ? "Name your event to begin." : !ready ? "Upload at least 2 files to cross-check." : "Ready to run."}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          {error && <span style={{ fontSize:"15px", color:"#FFB3AB", fontFamily:font }}>{error}</span>}
          <button onClick={runCheck} disabled={!canRun}
            style={{ background:canRun?P.accent:"rgba(255,255,255,0.15)", color:canRun?P.white:"rgba(255,255,255,0.4)", border:"none", borderRadius:"10px", padding:"11px 24px", fontSize:"15px", fontWeight:600, fontFamily:font, cursor:canRun?"pointer":"not-allowed", transition:"all 0.18s", whiteSpace:"nowrap", display:"inline-flex", alignItems:"center", gap:"8px" }}>
            <span>{loading ? "Checking…" : isReRun ? "Re-run Cross-Check" : "Run Cross-Check"}</span>
            {!loading && <CrossCheckIcon size={17} line={canRun?"rgba(255,255,255,0.92)":"rgba(255,255,255,0.4)"} accent={canRun?P.white:"rgba(255,255,255,0.4)"} />}
          </button>
        </div>
      </div>
    </div>
  );
}
