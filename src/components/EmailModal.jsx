import React, { useState } from "react";
import { X, AlertTriangle, Check, Save } from "lucide-react";
import { P, font } from "../theme";
import { fmtTime } from "../format";
import { Btn } from "./common";

export function EmailModal({ record, eventName, contacts, onClose }) {
  const [type, setType] = useState("hotel");
  const [copied, setCopied] = useState(false);
  const [toEmail, setToEmail] = useState("");
  const [editedSubject, setEditedSubject] = useState(null); // null = use draft default
  const [editedBody, setEditedBody] = useState(null);       // null = use draft default
  const [saved, setSaved] = useState(false);

  const issues = record.issues.filter(x => x.type !== "duplicate");

  const hotelName = contacts?.hotel?.property || record.hotel?.hotel || "the hotel";
  const hotelContact = contacts?.hotel?.name || "Hotel Team";
  const hotelEmail = contacts?.hotel?.email || "";
  const travelContact = contacts?.travel?.name || "Travel Team";
  const travelAgency = contacts?.travel?.agency || "Travel Agency";
  const travelEmail = contacts?.travel?.email || "";

  const evName = eventName && eventName.trim() ? eventName.trim() : null;
  const guestName = record.firstName && record.lastName ? `${record.firstName} ${record.lastName}` : record.displayName;
  const flightArrival = record.flight?.flightArrival ? record.flight.flightArrival.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }) : null;
  const flightDeparture = record.flight?.flightDeparture ? record.flight.flightDeparture.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }) : null;
  const flightIn = record.flight?.flightIn || null;
  const flightOut = record.flight?.flightOut || null;
  const arrivalTimeT = record.flight?.arrivalTime ? " at " + fmtTime(record.flight.arrivalTime, "ampm") : "";
  const departureTimeT = record.flight?.departureTime ? " at " + fmtTime(record.flight.departureTime, "ampm") : "";
  const arrAirport = record.flight?.arrivalAirport || record.flight?.airport || null;
  const depAirport = record.flight?.departureAirport || record.flight?.airport || null;
  const airport = arrAirport || depAirport || null;
  const checkIn = record.hotel?.checkIn ? record.hotel.checkIn.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }) : null;
  const checkOut = record.hotel?.checkOut ? record.hotel.checkOut.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }) : null;
  const hotel = record.hotel?.hotel || hotelName;

  // Build specific discrepancy lines for each issue — no emojis, clean plain text
  function buildGuestIssueLines() {
    return issues.map(issue => {
      // Flight arrives BEFORE hotel check-in (early arrival)
      if (issue.text?.includes("before check-in") && flightArrival && checkIn)
        return `  Your flight arrives:   ${flightArrival}${arrAirport ? " (" + arrAirport + ")" : ""}${flightIn ? " — Flight " + flightIn : ""}\n  Your hotel check-in:   ${checkIn}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}\n\n  Your flight lands before your hotel check-in date. We want to make sure you have somewhere to stay that first night.\n  Do you need an extra night${hotel && hotel !== "the hotel" ? " at " + hotel : ""}, or do you have accommodations arranged?`;
      // Flight arrives AFTER hotel check-in (late arrival)
      if (issue.text?.includes("after check-in") && flightArrival && checkIn)
        return `  Your flight arrives:   ${flightArrival}${arrAirport ? " (" + arrAirport + ")" : ""}${flightIn ? " — Flight " + flightIn : ""}\n  Your hotel check-in:   ${checkIn}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}\n\n  Your flight arrives after your hotel check-in date. Your room will be held, but we wanted to flag this in case the dates need updating.\n  Could you confirm these details are correct?`;
      // Flight departs BEFORE hotel check-out (early departure)
      if (issue.text?.includes("before check-out") && checkOut && flightDeparture)
        return `  Your hotel check-out:  ${checkOut}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}\n  Your flight departs:   ${flightDeparture}${depAirport ? " (" + depAirport + ")" : ""}${flightOut ? " — Flight " + flightOut : ""}\n\n  Your flight departs before your hotel check-out date. You may be paying for a night you won't use.\n  Would you like us to adjust your check-out, or is this intentional?`;
      // Flight departs AFTER hotel check-out (late departure — the common case)
      if (issue.text?.includes("after check-out") && checkOut && flightDeparture)
        return `  Your hotel check-out:  ${checkOut}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}\n  Your flight departs:   ${flightDeparture}${depAirport ? " (" + depAirport + ")" : ""}${flightOut ? " — Flight " + flightOut : ""}\n\n  Your hotel checks out on ${checkOut}, but your flight does not depart until ${flightDeparture}. You may not have somewhere to stay on your last night.\n  Would you like to extend your stay${hotel && hotel !== "the hotel" ? " at " + hotel : ""} by one night, or do you have other arrangements?`;
      if (issue.text === "Missing from hotel roster")
        return `  Your flight arrives:   ${flightArrival || "—"}${arrAirport ? " (" + arrAirport + ")" : ""}\n  Hotel booking:         Not currently on file\n\n  We do not have a hotel booking on file for you. We want to make sure you have somewhere to stay.\n  Have you arranged your own accommodations, or would you like us to help?`;
      if (issue.text === "Missing from flight manifest")
        return `  Flight details:        Not currently on file\n  Your hotel check-in:   ${checkIn || "—"}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}\n\n  We do not have your flight details on file. Could you share your inbound and outbound flight numbers and dates?`;
      if (issue.text === "Missing from car transfers")
        return `  Your flight arrives:   ${flightArrival || "—"}${arrAirport ? " (" + arrAirport + ")" : ""}${flightIn ? " — Flight " + flightIn : ""}\n  Ground transfer:       Not currently on file${hotel && hotel !== "the hotel" ? "\n  Hotel:                 " + hotel : ""}\n\n  We do not have a ground transfer arranged for you. Would you like us to arrange transportation from ${arrAirport || "the airport"} to ${hotel && hotel !== "the hotel" ? hotel : "your hotel"}?`;
      if (issue.type === "window")
        return `  Your arrival:          ${flightArrival || "—"}\n  Your departure:        ${flightDeparture || "—"}\n\n  Your travel dates appear to fall outside the approved event travel window. Could you confirm these dates are correct, or let us know if any changes are needed?`;
      return `  ${issue.text}`;
    }).join("\n\n");
  }

  function buildHotelIssueLines() {
    return issues.map(issue => {
      if (issue.text?.includes("before check-in") && flightArrival && checkIn)
        return `  • Guest flight arrives ${flightArrival}${flightIn ? " (Flight " + flightIn + ")" : ""} — hotel check-in is ${checkIn}\n    The guest arrives before check-in. Could you accommodate an early check-in or add a night?`;
      if (issue.text?.includes("after check-in") && flightArrival && checkIn)
        return `  • Guest flight arrives ${flightArrival}${flightIn ? " (Flight " + flightIn + ")" : ""} — hotel check-in is ${checkIn}\n    The guest arrives after the check-in date. Please confirm the reservation is held correctly.`;
      if (issue.text?.includes("before check-out") && checkOut && flightDeparture)
        return `  • Hotel check-out is ${checkOut} — guest flight departs ${flightDeparture}${flightOut ? " (Flight " + flightOut + ")" : ""}\n    The guest departs before check-out. You may want to adjust the checkout date.`;
      if (issue.text?.includes("after check-out") && checkOut && flightDeparture)
        return `  • Hotel check-out is ${checkOut}${hotel && hotel !== "the hotel" ? " at " + hotel : ""} — guest flight departs ${flightDeparture}${flightOut ? " (Flight " + flightOut + ")" : ""}\n    The guest's flight departs the day after check-out. Could you extend the stay by one night or arrange a late check-out?`;
      if (issue.text === "Missing from hotel roster")
        return `  • No hotel booking found on file for this guest\n    Could you confirm whether a reservation exists, or assist with creating one?`;
      return `  • ${issue.text}`;
    }).join("\n");
  }

  function buildTravelIssueLines() {
    return issues.map(issue => {
      if (issue.text?.includes("before check-in") && flightArrival && checkIn)
        return `  • Inbound flight ${flightIn || ""} arrives ${flightArrival}${arrAirport ? " into " + arrAirport : ""} — hotel check-in is ${checkIn}\n    The guest arrives before check-in. Please confirm whether this itinerary is correct.`;
      if (issue.text?.includes("after check-in") && flightArrival && checkIn)
        return `  • Inbound flight ${flightIn || ""} arrives ${flightArrival}${arrAirport ? " into " + arrAirport : ""} — hotel check-in is ${checkIn}\n    The guest arrives after the hotel check-in date. Please confirm the booking is correctly held.`;
      if (issue.text?.includes("before check-out") && checkOut && flightDeparture)
        return `  • Hotel check-out is ${checkOut} — outbound flight ${flightOut || ""} departs ${flightDeparture}${depAirport ? " from " + depAirport : ""}\n    The guest departs before hotel check-out. Please confirm if the itinerary needs adjusting.`;
      if (issue.text?.includes("after check-out") && checkOut && flightDeparture)
        return `  • Hotel check-out is ${checkOut}${hotel && hotel !== "the hotel" ? " at " + hotel : ""} — outbound flight ${flightOut || ""} departs ${flightDeparture}${depAirport ? " from " + depAirport : ""}\n    The guest's flight departs after hotel check-out. Please confirm whether the stay should be extended or a late check-out arranged.`;
      if (issue.text === "Missing from flight manifest")
        return `  • No flight record found on file for this guest\n    Hotel check-in${hotel && hotel !== "the hotel" ? " at " + hotel : ""} is confirmed for ${checkIn || "—"}. Could you provide the inbound and outbound itinerary?`;
      return `  • ${issue.text}`;
    }).join("\n");
  }

  const drafts = {
    hotel: {
      contactName: hotelContact,
      toDisplay: hotelEmail ? `${hotelContact} <${hotelEmail}>` : hotelContact,
      toEmail: hotelEmail,
      subject: `${evName ? evName + " " : ""}[Hotel] — Guest Review: ${guestName}`,
      body: `Dear ${hotelContact},

I hope this message finds you well! I am reaching out regarding the reservation for ${guestName}${record.email ? " (" + record.email + ")" : ""} ${hotel && hotel !== "the hotel" ? "at " + hotel : ""}${evName ? " for " + evName : ""}.

While reviewing our guest travel records, we noticed the following that we would love your help to resolve:

${buildHotelIssueLines()}

Here is the full travel summary we have on file for this guest:

    Flight arrival:    ${flightArrival || "—"}${arrivalTimeT}${flightIn ? " — Flight " + flightIn : ""}
    Hotel check-in:   ${checkIn || "—"}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}
    Hotel check-out:  ${checkOut || "—"}
    Flight departure:  ${flightDeparture || "—"}${departureTimeT}${flightOut ? " — Flight " + flightOut : ""}

Could you please review and confirm the correct booking details at your earliest convenience? We truly appreciate your help in making sure ${guestName}'s stay is perfectly arranged!

Thank you so much,
[Your Name]
${evName ? evName + " Planning Team" : "Planning Team"}`,
    },
    travel: {
      contactName: travelContact,
      toDisplay: travelEmail ? `${travelContact} <${travelEmail}>` : travelContact,
      toEmail: travelEmail,
      subject: `${evName ? evName + " " : ""}[Flight] — Guest Review: ${guestName}`,
      body: `Dear ${travelContact},

I hope you are doing well! I am reaching out regarding the travel itinerary for ${guestName}${record.email ? " (" + record.email + ")" : ""}${evName ? " for " + evName : ""}.

While reviewing our guest travel records, we noticed the following that we would love your help to confirm or correct:

${buildTravelIssueLines()}

Here is the full travel summary we have on file for this guest:

    Inbound:           ${flightArrival || "—"}${arrivalTimeT}${arrAirport ? " into " + arrAirport : ""}${flightIn ? " — Flight " + flightIn : ""}
    Hotel check-in:   ${checkIn || "—"}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}
    Hotel check-out:  ${checkOut || "—"}
    Outbound:          ${flightDeparture || "—"}${departureTimeT}${depAirport ? " from " + depAirport : ""}${flightOut ? " — Flight " + flightOut : ""}

Kindly advise on the correct details and any changes needed. We really appreciate your support in making sure everything lines up perfectly for ${guestName}!

Thank you so much,
[Your Name]
${evName ? evName + " Planning Team" : "Planning Team"}`,
    },
    guest: {
      contactName: guestName,
      toDisplay: record.email || "Guest email",
      toEmail: record.email || "",
      subject: `${evName ? evName + " " : ""}[Travel]: Could you confirm your travel details?`,
      body: `Hi ${guestName},

We are so excited to have you joining us${evName ? " for " + evName : ""} and we truly cannot wait to see you there!

We are doing a careful review of all guest travel details to make sure everything is perfectly in place, and we wanted to flag the following for your attention:

ITEM REQUIRING YOUR REVIEW:

${buildGuestIssueLines()}

Could you take a quick look and let us know if anything needs to be updated? We are happy to help with any changes — please just reply to this email.

Your full travel summary on file:

  Arrival:          ${flightArrival || "—"}${arrAirport ? " (" + arrAirport + ")" : ""}${flightIn ? " — Flight " + flightIn : ""}
  Hotel check-in:   ${checkIn || "—"}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}
  Hotel check-out:  ${checkOut || "—"}
  Departure:        ${flightDeparture || "—"}${depAirport ? " (" + depAirport + ")" : ""}${flightOut ? " — Flight " + flightOut : ""}

Thank you so much — we truly look forward to seeing you${evName ? " at " + evName : ""}!

Warmly,
[Your Name]
${evName ? evName + " Planning Team" : "Planning Team"}`,
    },
  };

  const draft = drafts[type];
  React.useEffect(() => { setToEmail(draft.toEmail); setEditedSubject(null); setEditedBody(null); setSaved(false); }, [type]);

  const currentSubject = editedSubject !== null ? editedSubject : draft.subject;
  const currentBody    = editedBody    !== null ? editedBody    : draft.body;
  const isDirtyEmail   = editedSubject !== null || editedBody !== null;

  function saveEdits() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function resetEdits() {
    setEditedSubject(null);
    setEditedBody(null);
    setSaved(false);
  }

  function copy() {
    const text = `To: ${toEmail || draft.toDisplay}\nSubject: ${currentSubject}\n\n${currentBody}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
    } else { setCopied(true); setTimeout(() => setCopied(false), 1500); }
  }

  function openMailto() {
    const addr = toEmail || draft.toEmail;
    if (!addr) { copy(); return; }
    const subject = encodeURIComponent(currentSubject);
    const body = encodeURIComponent(currentBody);
    window.open(`mailto:${addr}?subject=${subject}&body=${body}`, "_blank");
  }

  const hasContact = type === "hotel" ? !!hotelEmail : type === "travel" ? !!travelEmail : !!record.email;
  const tabs = [
    { k:"hotel", l:"Hotel", hasContact: !!hotelEmail },
    { k:"travel", l:"✈ Travel Agency", hasContact: !!travelEmail },
    { k:"guest", l:"👤 Guest", hasContact: !!record.email },
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(27,42,74,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:P.white, borderRadius:"22px", width:"100%", maxWidth:"600px", maxHeight:"90vh", overflow:"auto", boxShadow:"0 20px 60px rgba(27,42,74,0.3)" }}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${P.grey100}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontWeight:600, fontSize:"15px", color:P.navy, fontFamily:font }}>Draft Email</div>
            <div style={{ fontSize:"15px", color:P.navyLight, fontFamily:font, marginTop:"2px" }}>{record.displayName} · {issues.length} flag{issues.length !== 1 ? "s" : ""}</div>
          </div>
          <button onClick={onClose} style={{ background:P.grey100, border:"none", borderRadius:"10px", width:30, height:30, cursor:"pointer", fontSize:"15px", color:P.navy, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15} strokeWidth={1.8}/></button>
        </div>
        <div style={{ padding:"18px 24px" }}>
          {/* Tabs with contact indicator */}
          <div style={{ display:"flex", gap:"8px", marginBottom:"18px" }}>
            {tabs.map(({ k, l, hasContact: hc }) => (
              <button key={k} onClick={() => setType(k)} style={{ background:type===k?P.navy:P.offWhite, color:type===k?P.white:P.grey600, border:`1px solid ${type===k?P.navy:P.grey200}`, borderRadius:"7px", padding:"5px 12px", fontSize:"15px", fontWeight:500, fontFamily:font, cursor:"pointer", position:"relative", display:"flex", alignItems:"center", gap:"6px" }}>
                {l}
                {hc
                  ? <span style={{ width:7, height:7, borderRadius:"50%", background:type===k?"rgba(255,255,255,0.7)":P.green, display:"inline-block" }} title="Contact saved" />
                  : <span style={{ width:7, height:7, borderRadius:"50%", background:type===k?"rgba(255,255,255,0.3)":P.grey200, display:"inline-block" }} title="No contact saved" />}
              </button>
            ))}
          </div>

          {/* No contact warning */}
          {!hasContact && (
            <div style={{ background:P.amberLight, border:`1px solid ${P.amber}44`, borderRadius:"10px", padding:"10px 14px", marginBottom:"14px", fontSize:"15px", color:P.amber, fontWeight:700, fontFamily:font, display:"flex", alignItems:"center", gap:"8px" }}>
              <AlertTriangle size={13} strokeWidth={1.8}/>
              <span>No {type === "hotel" ? "hotel" : type === "travel" ? "travel agency" : "guest"} email on file.
                {type !== "guest" && <span style={{ fontWeight:400, color:P.amber }}> Close this and click <strong>📇 Contacts</strong> to add one.</span>}
              </span>
            </div>
          )}

          {/* To field — editable */}
          <div style={{ marginBottom:"10px" }}>
            <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, fontFamily:font, marginBottom:"3px", textTransform:"uppercase", letterSpacing:"0.06em" }}>To</div>
            <input value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder={draft.toDisplay || "Enter email address…"}
              style={{ width:"100%", background:toEmail?P.white:P.offWhite, border:`1.5px solid ${toEmail?P.periwinkle+"44":P.grey100}`, borderRadius:"9px", padding:"8px 12px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
          </div>

          {/* Subject — editable */}
          <div style={{ marginBottom:"10px" }}>
            <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, fontFamily:font, marginBottom:"3px", textTransform:"uppercase", letterSpacing:"0.06em" }}>Subject</div>
            <input value={currentSubject} onChange={e => setEditedSubject(e.target.value)}
              style={{ width:"100%", background:editedSubject!==null?P.white:P.offWhite, border:`1.5px solid ${editedSubject!==null?P.periwinkle+"66":P.grey100}`, borderRadius:"9px", padding:"8px 12px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
          </div>

          {/* Body — editable */}
          <div style={{ marginBottom:"16px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"3px" }}>
              <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.06em" }}>Body</div>
              {isDirtyEmail && (
                <div style={{ display:"flex", gap:"6px" }}>
                  <button onClick={saveEdits} style={{ background:saved?P.greenLight:P.periwinkleD, color:saved?P.green:P.white, border:"none", borderRadius:"6px", padding:"3px 10px", fontSize:"15px", fontWeight:700, fontFamily:font, cursor:"pointer" }}>{saved ? <>Saved <Check size={12} strokeWidth={2.5} style={{verticalAlign:"-2px"}}/></> : <>Save <Save size={12} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></>}</button>
                  <button onClick={resetEdits} style={{ background:P.offWhite, color:P.grey600, border:`1px solid ${P.grey200}`, borderRadius:"6px", padding:"3px 10px", fontSize:"15px", fontWeight:700, fontFamily:font, cursor:"pointer" }}>Reset</button>
                </div>
              )}
            </div>
            <textarea value={currentBody} onChange={e => setEditedBody(e.target.value)}
              style={{ width:"100%", height:"220px", background:editedBody!==null?P.white:P.offWhite, border:`1.5px solid ${editedBody!==null?P.periwinkle+"66":P.grey100}`, borderRadius:"10px", padding:"12px", fontSize:"15px", fontFamily:font, color:P.navy, resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.6 }} />
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
            <Btn onClick={openMailto} color={hasContact || toEmail ? P.navy : P.grey600} disabled={!hasContact && !toEmail}>
              {hasContact || toEmail ? "Open in Mail App ↗" : "Open in Mail App ↗"}
            </Btn>
            <Btn onClick={copy} color={copied?P.green:P.periwinkleD} outline>{copied?"Copied!":"Copy to Clipboard"}</Btn>
            <Btn onClick={onClose} outline>Close</Btn>
          </div>
          {(!toEmail && !hasContact) && <div style={{ fontSize:"15px", color:P.navyLight, fontFamily:font, marginTop:"8px" }}>Enter an email address in the To field to open in your mail app.</div>}
        </div>
      </div>
    </div>
  );
}
