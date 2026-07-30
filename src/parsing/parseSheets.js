import * as XLSX from "xlsx";
import { findCol, parseTimeStr, parseDate, normEmail, splitName } from "../format";

export function parseSheet(wb, fieldMap, timeFallback = {}) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
  if (rows.length < 2) return [];
  const h = rows[0];
  const cols = {};
  // Add first/last name column detection to every sheet
  const fullFieldMap = {
    ...fieldMap,
    firstName: ["first name","firstname","first","given name","given"],
    lastName:  ["last name","lastname","last","surname","family name","family"],
  };
  Object.entries(fullFieldMap).forEach(([key, candidates]) => { cols[key] = findCol(h, candidates); });
  const dateFields = new Set(["flightArrival","flightDeparture","checkIn","checkOut","pickupDate","dropoffDate","regCheckIn","regCheckOut"]);
  const timeFields = new Set(Object.keys(fullFieldMap).filter(k => /Time$/.test(k)));
  return rows.slice(1).filter(r => r.some(c => c !== "")).map((r, i) => {
    const obj = {};
    Object.entries(cols).forEach(([key, idx]) => {
      if (timeFields.has(key)) {
        let tIdx = idx;
        if (tIdx < 0 && timeFallback[key] != null) tIdx = cols[timeFallback[key]]; // pull time out of the date cell
        obj[key] = tIdx >= 0 ? parseTimeStr(r[tIdx]) : "";
      }
      else if (dateFields.has(key)) obj[key] = idx >= 0 ? parseDate(r[idx]) : null;
      else if (key === "email") obj[key] = idx >= 0 ? normEmail(r[idx]) : "";
      else if (key === "name") obj[key] = idx >= 0 ? String(r[idx] || "").trim() : `Row ${i + 2}`;
      else obj[key] = idx >= 0 ? String(r[idx] || "").trim() : "";
    });
    // If sheet has separate first/last columns, build name from them; else split the name field
    if (obj.firstName || obj.lastName) {
      obj.name = [obj.firstName, obj.lastName].filter(Boolean).join(" ") || obj.name || `Row ${i + 2}`;
    } else {
      const { firstName, lastName } = splitName(obj.name);
      obj.firstName = firstName;
      obj.lastName = lastName;
    }
    return obj;
  });
}

export function parseFlightSheet(wb) {
  return parseSheet(wb, { name:["name","attendee","passenger","guest","traveler"], email:["email","e-mail","email address"], flightArrival:["arrival date","inbound date","arrival","arrive","land","flight in"], flightDeparture:["departure date","return date","outbound date","departure","depart","fly out"], arrivalTime:["arrival time","arr time","inbound time","landing time","time in"], departureTime:["departure time","dep time","outbound time","return time","time out"], flightIn:["inbound flight","arrival flight","flight in #","inbound #"], flightOut:["outbound flight","departure flight","flight out","return flight"], arrivalAirport:["arrival airport","arr airport","arriving airport","inbound airport","origin airport","origin"], departureAirport:["departure airport","dep airport","departing airport","outbound airport","destination airport","destination"], airport:["airport","hub"] }, { arrivalTime:"flightArrival", departureTime:"flightDeparture" });
}
export function parseHotelSheet(wb) {
  return parseSheet(wb, { name:["name","attendee","guest","passenger"], email:["email","e-mail","email address"], checkIn:["check-in","checkin","arrival","hotel in"], checkOut:["check-out","checkout","departure","hotel out"], room:["room","confirmation","conf","booking","reservation"], hotel:["hotel","property","venue"] });
}
// Parse a hotel roster and tag every record with a property name.
// Priority: the row's own "Hotel" column (combined-file case) → the file-level property name (separate-file case).
export function parseHotelSheetTagged(wb, fileProperty) {
  const rows = parseHotelSheet(wb);
  return rows.map(r => ({ ...r, hotel: (r.hotel && r.hotel.trim()) ? r.hotel.trim() : (fileProperty || "").trim() }));
}
export function parseCarSheet(wb) {
  return parseSheet(wb, { name:["name","attendee","passenger","guest"], email:["email","e-mail","email address"], pickupDate:["pickup date","pickup","pick up","transfer in","arrival transfer","car arrival"], dropoffDate:["dropoff date","dropoff","drop off","transfer out","departure transfer"], pickupTime:["pickup time","pick up time","transfer in time","time in"], dropoffTime:["dropoff time","drop off time","transfer out time","time out"], pickupLoc:["pickup location","pick up location","from","origin"], dropoffLoc:["dropoff location","drop off location","to","destination"], confirmation:["confirmation","conf","booking","transfer #","vendor"] }, { pickupTime:"pickupDate", dropoffTime:"dropoffDate" });
}
export function parseDietarySheet(wb) {
  return parseSheet(wb, { name:["name","attendee","guest","passenger"], email:["email","e-mail","email address"], dietary:["dietary","diet","food","restriction","allergy","allergies"], accessibility:["accessibility","access","mobility","accommodation","disability","special need"], specialNotes:["notes","special","request","other","additional"] });
}
export function parseAbstractSheet(wb) {
  return parseSheet(wb, { name:["name","author","presenter","speaker","submitter","attendee"], email:["email","e-mail","email address"], title:["abstract title","title","abstract","paper","session","topic","presentation"], status:["status","decision","accepted","review status","outcome"] });
}
export function parseRegistrationSheet(wb) {
  return parseSheet(wb, {
    name:["name","attendee","registrant","guest","participant"],
    email:["email","e-mail","email address"],
    company:["company","organization","org","employer","account"],
    jobTitle:["job title","title","position","role"],
    regCheckIn:["hotel check in","hotel check-in","check in","check-in","requested check in","hotel in","arrival"],
    regCheckOut:["hotel check out","hotel check-out","check out","check-out","requested check out","hotel out","departure"],
    flightRequest:["flight request","flight needed","flight required","needs flight","travel request","air travel"],
    hotelRequest:["hotel request","hotel needed","hotel required","needs hotel","room request","accommodation"],
    dietaryRequest:["dietary request","dietary","diet","food restriction","allergy","allergies"],
    departCity:["departing city","departure city","origin city","home city","city"],
    departState:["departing state","state","province","region"],
    departCountry:["departing country","country","nation"],
    regNotes:["notes","note","registration notes","reg notes","comments","comment","special requests","remark","remarks","exception","exceptions","approval","approvals","approved"],
    reason:["reason","justification","exception reason","no travel reason","opt out reason","explanation"],
    assignedHotel:["assigned hotel","hotel assignment","assigned property","designated hotel","hotel block","room block","expected hotel"],
    attendeeType:["attendee type","attendeetype","registrant type","segment","category","audience","type"],
  });
}
