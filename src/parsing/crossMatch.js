import { normName, diffDays, fmtTime, fmt, parseDate, splitName } from "../format";
import { isOutside, isWrongAirport } from "./airport";

export function crossMatch(flights, hotels, cars, dietary, aw, existingMeta, registration, abstracts) {
  registration = registration || [];
  abstracts = abstracts || [];
  const hasReg = registration.length > 0;
  const hasAbstracts = abstracts.length > 0;
  const hasFlights = flights.length > 0;
  const hasHotels = hotels.length > 0;
  const { arrivalStart, arrivalEnd, departureStart, departureEnd, preferredAirports, departureAirports, arrivalCutoff, departureCutoff, lateArrivalCutoff, typeRules } = aw || {};
  const mkMaps = (arr) => { const byE = new Map(), byN = new Map(); arr.forEach(x => { if (x.email) byE.set(x.email, x); const k = normName(x.name); if (k) byN.set(k, x); }); return [byE, byN]; };
  const [fByE, fByN] = mkMaps(flights), [hByE, hByN] = mkMaps(hotels), [cByE, cByN] = mkMaps(cars), [dByE, dByN] = mkMaps(dietary), [rByE, rByN] = mkMaps(registration), [abByE, abByN] = mkMaps(abstracts);
  const allLists = [...flights,...hotels,...cars,...dietary,...registration,...abstracts];
  const emailKeys = new Set(allLists.map(x => x.email).filter(Boolean));
  const nameKeys = new Set(allLists.map(x => normName(x.name)).filter(Boolean));
  const emailMatchedNames = new Set();
  emailKeys.forEach(ek => [fByE.get(ek),hByE.get(ek),cByE.get(ek),dByE.get(ek),rByE.get(ek),abByE.get(ek)].forEach(r => { if (r) emailMatchedNames.add(normName(r.name)); }));
  const dupSources = new Map();
  [flights,hotels,cars,dietary,registration,abstracts].forEach(list => {
    const seen = new Map();
    list.forEach(x => { const k = normName(x.name); if (!k) return; if (!seen.has(k)) seen.set(k, []); seen.get(k).push(x.source || ""); });
    seen.forEach((srcs, k) => { if (srcs.length > 1) { if (!dupSources.has(k)) dupSources.set(k, new Set()); srcs.forEach(sc => { if (sc) dupSources.get(k).add(sc); }); } });
  });
  const dupNames = new Set([...dupSources.keys()]);

  // Helper: does this registration row have a noted reason (in notes OR a dedicated reason column)?
  const hasReason = (reg) => {
    if (!reg) return false;
    const note = (reg.regNotes || "").trim();
    const reason = (reg.reason || "").trim();
    return note.length > 0 || reason.length > 0;
  };
  // Does a row request a flight/hotel? Blank → expected (flag if missing). Explicit "No" → only
  // suppress the missing flag if a reason is noted; "No" with no reason is an incomplete record → still flag.
  const NEGATIVE = ["no","n","none","not needed","not required","false","0"];
  const wantsFlight = (reg) => {
    if (!reg) return false;
    const v = (reg.flightRequest || "").toLowerCase().trim();
    if (v === "") return true;
    if (NEGATIVE.includes(v)) return !hasReason(reg); // No + reason → don't expect; No + no reason → still flag
    return true;
  };
  const wantsHotel = (reg) => {
    if (!reg) return false;
    const v = (reg.hotelRequest || "").toLowerCase().trim();
    if (v === "") return true;
    if (NEGATIVE.includes(v)) return !hasReason(reg);
    return true;
  };

  function build(flight, hotel, car, diet, key, matchedBy, reg, abstract) {
    const displayName = reg?.name || flight?.name || hotel?.name || car?.name || diet?.name || abstract?.name || key;
    const email = reg?.email || flight?.email || hotel?.email || car?.email || diet?.email || abstract?.email || "";
    const metaKey = email || key;
    const existing = existingMeta?.[metaKey] || {};
    const issues = [];

    // ── Registration-anchored checks (only when a registration list is uploaded) ──
    if (hasReg) {
      if (!reg) {
        // Travel record exists but person is NOT in registration → booked but not registered
        issues.push({ type:"unregistered", text:"Booked travel but not on registration list" });
      } else {
        // Person IS registered — check what they requested vs. what got booked
        if (wantsFlight(reg) && !flight) {
          const saidNo = NEGATIVE.includes((reg.flightRequest || "").toLowerCase().trim());
          issues.push({ type:"missing", text: saidNo ? "Marked 'no flight' but no reason given" : "Registered but no flight booked" });
        }
        if (wantsHotel(reg) && !hotel) {
          const saidNo = NEGATIVE.includes((reg.hotelRequest || "").toLowerCase().trim());
          issues.push({ type:"missing", text: saidNo ? "Marked 'no hotel' but no reason given" : "Registered but no hotel booked" });
        }
        // Registration's requested hotel dates vs. actual hotel roster dates
        if (hotel && reg.regCheckIn && hotel.checkIn) {
          const ci = diffDays(reg.regCheckIn, hotel.checkIn);
          if (ci !== null && ci !== 0) issues.push({ type:"mismatch", text:`Hotel check-in differs from registration by ${Math.abs(ci)} ${Math.abs(ci)===1?"day":"days"}` });
        }
        if (hotel && reg.regCheckOut && hotel.checkOut) {
          const co = diffDays(reg.regCheckOut, hotel.checkOut);
          if (co !== null && co !== 0) issues.push({ type:"mismatch", text:`Hotel check-out differs from registration by ${Math.abs(co)} ${Math.abs(co)===1?"day":"days"}` });
        }
        // Right-hotel check (only when registration provides an assigned hotel AND the booked record names a property)
        if (hotel && reg.assignedHotel && reg.assignedHotel.trim() && hotel.hotel && hotel.hotel.trim()) {
          const assigned = reg.assignedHotel.trim().toLowerCase();
          const booked = hotel.hotel.trim().toLowerCase();
          if (assigned !== booked) issues.push({ type:"mismatch", text:`Booked at ${hotel.hotel.trim()} but assigned to ${reg.assignedHotel.trim()}` });
        }
      }
    }

    // ── Existing travel-vs-travel checks (only flag files that were actually uploaded) ──
    if (!hasReg) {
      // Original behavior when no registration list: flag missing across travel files,
      // but only for file types the planner actually provided.
      if (hasFlights && !flight) issues.push({ type:"missing", text:"Missing from flight manifest" });
      if (hasHotels && !hotel)  issues.push({ type:"missing", text:"Missing from hotel roster" });
    }
    if (cars.length > 0 && !car && (reg || flight || hotel)) issues.push({ type:"missing", text:"Missing from car transfers" });

    const details = {};
    if (flight && hotel) {
      // An early arrival (before the cutoff) is expected to have the night prior booked,
      // so a check-in exactly one day before arrival is correct here, not a mismatch.
      const earlyArr = !!(arrivalCutoff && flight.arrivalTime && flight.flightArrival && flight.arrivalTime < arrivalCutoff);
      const ad = diffDays(flight.flightArrival, hotel.checkIn), dd = diffDays(flight.flightDeparture, hotel.checkOut);
      details.arrDiff = ad; details.depDiff = dd;
      if (ad !== null && ad !== 0 && !(earlyArr && ad === 1)) issues.push({ type:"mismatch", text: ad<0?`Arrives ${Math.abs(ad)} ${Math.abs(ad)===1?"day":"days"} before check-in`:`Arrives ${ad} ${ad===1?"day":"days"} after check-in` });
      if (dd !== null && dd !== 0) issues.push({ type:"mismatch", text: dd<0?`Departs ${Math.abs(dd)} ${Math.abs(dd)===1?"day":"days"} before check-out`:`Departs ${dd} ${dd===1?"day":"days"} after check-out` });
    }
    if (flight && car) {
      if (car.pickupDate && flight.flightArrival) { const pd = diffDays(car.pickupDate, flight.flightArrival); details.pickupDiff = pd; if (pd!==0) issues.push({ type:"mismatch", text:`Car pickup ${Math.abs(pd)} ${Math.abs(pd)===1?"day":"days"} ${pd<0?"before":"after"} flight arrival` }); }
      if (car.dropoffDate && flight.flightDeparture) { const dd2 = diffDays(car.dropoffDate, flight.flightDeparture); if (dd2!==0) issues.push({ type:"mismatch", text:`Car dropoff ${Math.abs(dd2)} ${Math.abs(dd2)===1?"day":"days"} ${dd2<0?"before":"after"} flight departure` }); }
    }
    // ── Early-arrival / night-prior hotel rule ──
    // If a flight lands before the planner's cutoff time, the traveler should already
    // have a room from the night before. Flag when no night-prior hotel night is on file.
    if (arrivalCutoff && flight && flight.arrivalTime && flight.flightArrival && flight.arrivalTime < arrivalCutoff && hotel && hotel.checkIn) {
      const gap = diffDays(flight.flightArrival, hotel.checkIn); // >= 1 means check-in is the night before (or earlier)
      if (gap === 0) {
        const prior = new Date(flight.flightArrival); prior.setDate(prior.getDate() - 1);
        issues.push({ type:"earlyarrival", text:`Arrives ${fmtTime(flight.arrivalTime,"ampm")} (before ${fmtTime(arrivalCutoff,"ampm")} cutoff) — book hotel for the night prior (${fmt(prior)})` });
      }
    }
    // ── Earliest-departure-time rule ──
    // If a flight leaves before the planner's earliest allowed departure time, flag it.
    if (departureCutoff && flight && flight.departureTime && flight.flightDeparture && flight.departureTime < departureCutoff) {
      issues.push({ type:"earlydeparture", text:`Departs ${fmtTime(flight.departureTime,"ampm")} (before ${fmtTime(departureCutoff,"ampm")} earliest departure)` });
    }
    // ── Late-arrival rule (after-cutoff hotel risk) ──
    // If a guest's flight lands (or their inbound car transfer picks up) after the late-arrival
    // cutoff AND they have a hotel room booked, flag it so the planner can warn the hotel to hold
    // the room. Many hotels release a room if the guest has not checked in by ~11 PM local time.
    if (lateArrivalCutoff && hotel && hotel.checkIn) {
      const flightLate = flight && flight.arrivalTime && flight.flightArrival && flight.arrivalTime > lateArrivalCutoff;
      const carLate = car && car.pickupTime && car.pickupDate && car.pickupTime > lateArrivalCutoff;
      const hotelName = hotel.hotel ? hotel.hotel.trim() : "the hotel";
      if (flightLate) {
        issues.push({ type:"latearrival", text:`Arrives ${fmtTime(flight.arrivalTime,"ampm")} (after ${fmtTime(lateArrivalCutoff,"ampm")} cutoff). Possible late arrival, notify ${hotelName} to hold the room` });
      } else if (carLate) {
        issues.push({ type:"latearrival", text:`Car pickup ${fmtTime(car.pickupTime,"ampm")} (after ${fmtTime(lateArrivalCutoff,"ampm")} cutoff). Possible late arrival, notify ${hotelName} to hold the room` });
      }
    }
    const arrDate = flight?.flightArrival || hotel?.checkIn || reg?.regCheckIn, depDate = flight?.flightDeparture || hotel?.checkOut || reg?.regCheckOut;
    if (arrDate && isOutside(arrDate, arrivalStart, arrivalEnd)) issues.push({ type:"window", text:`Arrival ${fmt(arrDate)} outside approved window` });
    if (depDate && isOutside(depDate, departureStart, departureEnd)) issues.push({ type:"window", text:`Departure ${fmt(depDate)} outside approved window` });
    const arrApt = flight?.arrivalAirport || flight?.airport, depApt = flight?.departureAirport || flight?.airport;
    const depAptList = (departureAirports && departureAirports.length) ? departureAirports : preferredAirports;
    if (arrApt && isWrongAirport(arrApt, preferredAirports)) issues.push({ type:"airport", text:`Arrives at ${arrApt.toUpperCase()} (not a preferred airport)` });
    if (depApt && depApt !== arrApt && isWrongAirport(depApt, depAptList)) issues.push({ type:"airport", text:`Departs from ${depApt.toUpperCase()} (not a preferred airport)` });
    // Attendee-type arrival-day rules (e.g., International arrives Sunday, Domestic Monday). VIP = no rule.
    if (typeRules && typeRules.length && reg && reg.attendeeType) {
      const gt = String(reg.attendeeType).trim().toLowerCase();
      const rule = typeRules.find(r => r.type && String(r.type).trim().toLowerCase() === gt && r.date);
      const arrD = flight?.flightArrival || hotel?.checkIn || reg?.regCheckIn;
      if (rule && arrD) {
        const want = parseDate(rule.date);
        if (want && diffDays(arrD, want) !== 0) issues.push({ type:"typerule", text:`${reg.attendeeType} should arrive ${fmt(want)}, arrives ${fmt(arrD)}` });
      }
    }
    // Abstract submitters who never registered (association speaker/presenter follow-up).
    if (hasReg && hasAbstracts && abstract && !reg) {
      const accepted = /accept/i.test(abstract.status || "");
      issues.push({ type:"abstract_unreg", text: accepted ? "Accepted abstract but not registered" : "Submitted an abstract but not registered" });
    }
    if (dupNames.has(normName(displayName))) { const _srcs = [...(dupSources.get(normName(displayName)) || [])]; issues.push({ type:"duplicate", text: _srcs.length ? `Appears in multiple files (${_srcs.join(", ")})` : "Appears in more than one file" }); }
    const seen = new Set(); const uniqueIssues = issues.filter(x => { if (seen.has(x.text)) return false; seen.add(x.text); return true; });
    // Notes from the registration file are informational only. Flags are cleared in-app with Resolve.
    const fileNote = (reg?.regNotes && String(reg.regNotes).trim()) ? String(reg.regNotes).trim() : "";
    const resolved = existing.resolved || [];
    const active = uniqueIssues.filter(x => !resolved.includes(x.text));
    const status = active.length === 0 ? "ok" : active.length === 1 ? "warn" : "error";
    const { firstName, lastName } = splitName(displayName);
    const resolvedFirstName = reg?.firstName || flight?.firstName || hotel?.firstName || car?.firstName || diet?.firstName || abstract?.firstName || firstName;
    const resolvedLastName  = reg?.lastName  || flight?.lastName  || hotel?.lastName  || car?.lastName  || diet?.lastName  || abstract?.lastName  || lastName;
    return { key, displayName, firstName:resolvedFirstName, lastName:resolvedLastName, email, matchedBy, flight, hotel, car, diet, reg, abstract, registered: !!reg, issues:uniqueIssues, status, details, note: fileNote || existing.note || "", noteBy: existing.noteBy || "", noteAt: existing.noteAt || "", resolved };
  }

  const results = [];
  emailKeys.forEach(ek => results.push(build(fByE.get(ek)||null, hByE.get(ek)||null, cByE.get(ek)||null, dByE.get(ek)||null, ek, "email", rByE.get(ek)||null, abByE.get(ek)||null)));
  nameKeys.forEach(nk => { if (emailMatchedNames.has(nk)) return; results.push(build(fByN.get(nk)||null, hByN.get(nk)||null, cByN.get(nk)||null, dByN.get(nk)||null, nk, "name", rByN.get(nk)||null, abByN.get(nk)||null)); });
  return results;
}

// ── Change tracking diff ──────────────────────────────────────────────────────
export function diffResults(prev, curr) {
  if (!prev || !curr) return { added:[], removed:[], changed:[], unchanged:[] };
  const prevMap = new Map((prev||[]).map(r => [r.email || r.key, r]));
  const currMap = new Map((curr||[]).map(r => [r.email || r.key, r]));
  const added = [], removed = [], changed = [], unchanged = [];
  currMap.forEach((r, k) => {
    if (!prevMap.has(k)) { added.push(r); return; }
    const p = prevMap.get(k);
    const prevIssues = (p.issues||[]).map(x=>x.text).sort().join("|");
    const currIssues = (r.issues||[]).map(x=>x.text).sort().join("|");
    if (prevIssues !== currIssues || p.status !== r.status) changed.push({ prev:p, curr:r });
    else unchanged.push(r);
  });
  prevMap.forEach((r, k) => { if (!currMap.has(k)) removed.push(r); });
  return { added, removed, changed, unchanged };
}
