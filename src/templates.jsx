// GroupGrid email templates: default library, vendor bodies, routing tables, and TemplateIcon.
import { P } from "./theme";
import { fmt, fmtTime, parseDate } from "./format";
import { HotelIcon, PlaneIcon, CarIcon, FlagIcon, CalendarIcon, PeopleIcon, ClearedIcon } from "./icons";

// ── Default Email Templates ───────────────────────────────────────────────────
export const DEFAULT_TEMPLATES = {
  arrives_early: {
    id: "arrives_early",
    label: "Arrives Before Check-In",
    icon: "✈",
    color: P.amber,
    description: "Guest flight arrives before hotel check-in date",
    subject: "{{eventName}} [Arrival]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

We are reviewing travel for {{eventName}} and spotted a timing gap to confirm with you:

──────────────────────
Flight arrives: {{flightArrival}}{{arrivalTimeTail}} into {{arrivalAirport}} (Flight {{flightIn}})
Hotel check-in: {{checkIn}} at {{hotel}}

Your flight lands the day before your hotel check-in.
──────────────────────

What we need: reply to let us know one of these.

  My arrival night is covered, no change needed.
  Please add an extra night at {{hotel}} for me.

Happy to contact {{hotel}} for you if that is easier.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  arrives_late: {
    id: "arrives_late",
    label: "Possible Late Arrival",
    icon: "🌙",
    color: P.amber,
    description: "Guest arrives after the late-arrival cutoff — hotel may release the room",
    subject: "{{eventName}} [Late Arrival]: Please hold the room for {{guestFullName}}",
    body: `Hi {{guestName}},

A quick heads-up about your arrival for {{eventName}}:

──────────────────────
Expected arrival: {{expectedArrival}}
Hotel check-in: {{checkIn}} at {{hotel}}
──────────────────────

Your arrival is later in the evening, so we are letting {{hotel}} know to hold your room. No action needed on your side — just reply if your plans change.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  departs_late: {
    id: "departs_late",
    label: "Departs After Check-Out",
    icon: "🏨",
    color: P.amber,
    description: "Guest flight departs after hotel check-out date",
    subject: "{{eventName}} [Departure]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

We are reviewing travel for {{eventName}} and spotted a timing gap to confirm:

──────────────────────
Hotel check-out: {{checkOut}} at {{hotel}}
Flight departs: {{flightDeparture}}{{departureTimeTail}} from {{departureAirport}} (Flight {{flightOut}})

Your hotel checks out before your flight departs.
──────────────────────

What we need: reply to let us know one of these.

  My departure night is covered, no change needed.
  Please extend my stay at {{hotel}} by one night.

Happy to contact {{hotel}} for you if that is easier.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  missing_hotel: {
    id: "missing_hotel",
    label: "No Hotel Record Found",
    icon: "🏨",
    color: P.red,
    description: "Guest appears in flight list but no hotel booking on file",
    subject: "{{eventName}} [Hotel]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

We are reviewing travel for {{eventName}} and we do not have a hotel booking on file for you:

──────────────────────
Flight arrives: {{flightArrival}}{{arrivalTimeTail}} into {{arrivalAirport}} (Flight {{flightIn}})
Hotel booking: Not on file
──────────────────────

We do not want you arriving without a room. What we need: reply with one of these.

  I booked my own hotel. Confirmation: ___________
  Please book a room for me.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  missing_flight: {
    id: "missing_flight",
    label: "No Flight Record Found",
    icon: "✈",
    color: P.red,
    description: "Guest appears in hotel list but no flight on file",
    subject: "{{eventName}} [Flight]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

Your room at {{hotel}} is confirmed for {{eventName}}, but we do not have your flight details yet:

──────────────────────
Flight: Not on file
Hotel check-in: {{checkIn}} at {{hotel}}
──────────────────────

What we need: reply with your inbound and outbound flight numbers, dates, and arrival airport. If you are not flying, just let us know and we will update your record.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  missing_transfer: {
    id: "missing_transfer",
    label: "No Transfer on File",
    icon: "🚗",
    color: P.amber,
    description: "Guest has no car transfer record",
    subject: "{{eventName}} [Transfer]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

We are arranging ground transfers for {{eventName}} and do not have one on file for you:

──────────────────────
Flight arrives: {{flightArrival}}{{arrivalTimeTail}} into {{arrivalAirport}} (Flight {{flightIn}})
Transfer: Not on file
──────────────────────

What we need: reply with your preference.

  Yes, please arrange a transfer from {{arrivalAirport}} to {{hotel}}.
  No thanks, I have my own transportation.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  car_mismatch: {
    id: "car_mismatch",
    label: "Car Transfer Timing",
    icon: "🚗",
    color: P.red,
    description: "Car transfer time does not line up with the guest's flight",
    subject: "{{eventName}} [Car Transfer]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

We are reviewing ground transfers for {{eventName}} and your transfer times do not line up with your flights:

──────────────────────
Flight arrives: {{flightArrival}}{{arrivalTimeTail}}
Car pickup: {{carPickup}}

Flight departs: {{flightDeparture}}{{departureTimeTail}}
Car dropoff: {{carDropoff}}
──────────────────────

What we need: reply to confirm these times are right, or tell us what to adjust.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  needs_registration: {
    id: "needs_registration",
    label: "Needs to Register",
    icon: "📝",
    color: P.purple,
    description: "Guest has travel booked but is not on the registration list",
    subject: "{{eventName}} [Registration]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

We can see travel arranged for you for {{eventName}}, but you are not yet on our registration list:

──────────────────────
We have booked for you:
{{bookedTravel}}

Registration: Not on file
──────────────────────

What we need: complete your registration for {{eventName}}. It takes a minute and confirms your spot. If you believe you already registered, just reply and we will check.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  wrong_airport: {
    id: "wrong_airport",
    label: "Different Airport",
    icon: "✈",
    color: "#4F8EF7",
    description: "Guest is flying into an airport that isn't a preferred event airport",
    subject: "{{eventName}} [Airport]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

We are reviewing travel for {{eventName}} and noticed your arrival airport:

──────────────────────
Flight arrives: {{arrivalAirport}} on {{flightArrival}}{{arrivalTimeTail}} (Flight {{flightIn}})

This is not an airport we are coordinating arrivals around.
──────────────────────

This may be intentional. What we need: reply to confirm your airport is correct, or let us know if you would like help adjusting it.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  outside_window: {
    id: "outside_window",
    label: "Outside Approved Travel Window",
    icon: "🗓",
    color: P.purple,
    description: "Guest travel dates fall outside the approved event window",
    subject: "{{eventName}} [Travel Dates]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

We are reviewing travel for {{eventName}} and your dates fall outside the event travel window:

──────────────────────
Flight arrives: {{flightArrival}}{{arrivalTimeTail}} into {{arrivalAirport}}
Flight departs: {{flightDeparture}}{{departureTimeTail}} from {{departureAirport}}
Event window: {{eventStart}} to {{eventEnd}}
──────────────────────

This may be intentional. What we need: reply to confirm your dates are correct, or tell us if they need a change.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  abstract_reminder: {
    id: "abstract_reminder",
    label: "Submitted Abstract, Not Registered",
    icon: "📝",
    color: P.purple,
    description: "Submitted an abstract but has not completed registration",
    subject: "{{eventName}} [Registration]: Please complete your registration",
    body: `Hi {{guestName}},

Thank you for submitting an abstract for {{eventName}}. We do not yet see a completed registration for you:

──────────────────────
Abstract: on file
Registration: Not on file
──────────────────────

What we need: please complete your registration so we can confirm your spot and, if you are presenting, coordinate your travel. If you have already registered, just reply and we will check.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  general_confirmation: {
    id: "general_confirmation",
    label: "General Travel Confirmation",
    icon: "✅",
    color: P.green,
    description: "Proactive confirmation request for all guests",
    subject: "{{eventName}} [Travel Review]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

A quick travel check for {{eventName}}. Here is what we have on file:

──────────────────────
Arrival: {{flightArrival}}{{arrivalTimeTail}} into {{arrivalAirport}} (Flight {{flightIn}})
Hotel: {{checkIn}} to {{checkOut}} at {{hotel}}
Departure: {{flightDeparture}}{{departureTimeTail}} from {{departureAirport}} (Flight {{flightOut}})
──────────────────────

What we need: reply to confirm it is correct, or tell us what to change.

  Looks good, I am all set.
  Please update: ___________

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
};
export function fillTemplate(template, record, extra = {}) {
  const map = {
    "{{guestName}}": record.firstName || record.displayName || "",
    "{{guestFirstName}}": record.firstName || record.displayName.split(" ")[0] || "",
    "{{guestLastName}}": record.lastName || record.displayName.split(" ").slice(1).join(" ") || "",
    "{{guestFullName}}": record.displayName || "",
    "{{eventName}}": extra.eventName || "our event",
    "{{flightArrival}}": fmt(record.flight?.flightArrival) || "—",
    "{{flightDeparture}}": fmt(record.flight?.flightDeparture) || "—",
    "{{arrivalTime}}": fmtTime(record.flight?.arrivalTime, "ampm") || "—",
    "{{departureTime}}": fmtTime(record.flight?.departureTime, "ampm") || "—",
    "{{arrivalTimeTail}}": record.flight?.arrivalTime ? ` at ${fmtTime(record.flight.arrivalTime, "ampm")}` : "",
    "{{departureTimeTail}}": record.flight?.departureTime ? ` at ${fmtTime(record.flight.departureTime, "ampm")}` : "",
    "{{carPickupTime}}": fmtTime(record.car?.pickupTime, "ampm") || "—",
    "{{carDropoffTime}}": fmtTime(record.car?.dropoffTime, "ampm") || "—",
    "{{flightIn}}": record.flight?.flightIn || "—",
    "{{flightOut}}": record.flight?.flightOut || "—",
    "{{arrivalAirport}}": record.flight?.arrivalAirport || record.flight?.airport || "the airport",
    "{{departureAirport}}": record.flight?.departureAirport || record.flight?.airport || "the airport",
    "{{airport}}": record.flight?.airport || record.flight?.arrivalAirport || record.flight?.departureAirport || "the airport",
    "{{checkIn}}": fmt(record.hotel?.checkIn) || "—",
    "{{checkOut}}": fmt(record.hotel?.checkOut) || "—",
    "{{hotel}}": record.hotel?.hotel || "the hotel",
    "{{room}}": record.hotel?.room || "—",
    "{{expectedArrival}}": (() => {
      const f = record.flight, c = record.car;
      if (f?.flightArrival) return `${fmt(f.flightArrival)}${f.arrivalTime ? ` at ${fmtTime(f.arrivalTime, "ampm")}` : ""}${f.flightIn ? ` (Flight ${f.flightIn})` : ""}`;
      if (c?.pickupDate) return `${fmt(c.pickupDate)}${c.pickupTime ? ` at ${fmtTime(c.pickupTime, "ampm")}` : ""} (car transfer)`;
      return "—";
    })(),
    "{{bookedTravel}}": (() => {
      const lines = [];
      if (record.flight) {
        const arr = fmt(record.flight.flightArrival);
        const t = record.flight.arrivalTime ? ` at ${fmtTime(record.flight.arrivalTime, "ampm")}` : "";
        const tail = record.flight.flightIn ? ` (Flight ${record.flight.flightIn})` : "";
        lines.push(`Flight arrival: ${arr || "on file"}${t}${tail}`);
      }
      if (record.hotel) {
        lines.push(`Hotel: ${record.hotel.hotel || "booking on file"}`);
      }
      if (record.car) {
        const ct = record.car.pickupTime ? ` at ${fmtTime(record.car.pickupTime, "ampm")}` : "";
        lines.push(`Car transfer: ${fmt(record.car.pickupDate) || "on file"}${ct}`);
      }
      if (!lines.length) lines.push("Travel details on file");
      return lines.join("\n");
    })(),
    "{{hotelContact}}": extra.hotelName || "Hotel Team",
    "{{travelContact}}": extra.travelName || "Travel Team",
    "{{carContact}}": extra.carName || "Transfer Team",
    "{{guestEmailParen}}": record.email ? ` (${record.email})` : "",
    "{{flightInTail}}": record.flight?.flightIn ? ` — Flight ${record.flight.flightIn}` : "",
    "{{flightOutTail}}": record.flight?.flightOut ? ` — Flight ${record.flight.flightOut}` : "",
    "{{issueSummary}}": (record.issues || []).filter(x => !(record.resolved || []).includes(x.text)).map(x => x.text).join("; ") || "—",
    "{{carPickup}}": fmt(record.car?.pickupDate) || "—",
    "{{carDropoff}}": fmt(record.car?.dropoffDate) || "—",
    "{{plannerName}}": extra.plannerName || "The Planning Team",
    "{{arrivalEnd}}": extra.arrivalEnd ? fmt(parseDate(extra.arrivalEnd)) : "—",
    "{{departureEnd}}": extra.departureEnd ? fmt(parseDate(extra.departureEnd)) : "—",
    "{{eventStart}}": extra.arrivalStart ? fmt(parseDate(extra.arrivalStart)) : "—",
    "{{eventEnd}}": extra.departureEnd ? fmt(parseDate(extra.departureEnd)) : "—",
  };
  let s = template;
  Object.entries(map).forEach(([k, v]) => { s = s.split(k).join(v); });
  return s;
}

export function getApplicableTemplates(record) {
  const applicable = [];
  const issues = record.issues || [];
  const has = (sub) => issues.some(x => x.text && x.text.includes(sub));
  // Hotel arrival-timing issues (flight vs check-in, or check-in differs from registration) → hotel
  if (has("check-in")) applicable.push("arrives_early");
  // Hotel departure-timing issues (flight vs check-out, or check-out differs from registration) → hotel
  else if (has("check-out")) applicable.push("departs_late");
  // Missing hotel — matches both the registration-anchored text and the travel-vs-travel fallback text
  if (has("no hotel booked") || has("Missing from hotel roster") || has("no hotel' but no reason")) applicable.push("missing_hotel");
  // Missing flight — same, across both engine paths
  if (has("no flight booked") || has("Missing from flight manifest") || has("no flight' but no reason")) applicable.push("missing_flight");
  if (has("Missing from car transfers")) applicable.push("missing_transfer");
  // Car transfer timing mismatch (pickup vs flight arrival, dropoff vs flight departure)
  if (has("Car pickup") || has("Car dropoff")) applicable.push("car_mismatch");
  if (has("not on registration list") || issues.some(x => x.type === "unregistered")) applicable.push("needs_registration");
  if (issues.some(x => x.type === "window")) applicable.push("outside_window");
  if (issues.some(x => x.type === "airport")) applicable.push("wrong_airport");
  if (issues.some(x => x.type === "earlyarrival") && !applicable.includes("arrives_early")) applicable.push("arrives_early");
  if (issues.some(x => x.type === "latearrival")) applicable.push("arrives_late");
  if (issues.some(x => x.type === "abstract_unreg")) applicable.push("abstract_reminder");
  return applicable;
}

// ── Email routing: who each template is addressed TO, by default ───────────────
// audience: "hotel" | "travel" | "car" | "guest". Vendor-routed templates carry a
// vendor-addressed body so the recipient never gets a "Hi {{guestName}}" email meant
// for the attendee. The original guest-addressed body stays on the template as a fallback.
export const TEMPLATE_AUDIENCE = {
  arrives_early:      "hotel",
  arrives_late:       "hotel",
  departs_late:       "hotel",
  missing_hotel:      "hotel",
  missing_flight:     "travel",
  outside_window:     "guest",
  wrong_airport:      "guest",
  missing_transfer:   "car",
  car_mismatch:       "car",
  needs_registration: "guest",
  abstract_reminder: "guest",
  general_confirmation: "guest",
};
// Group the comms by what they are about, so hotel/flight/car messages sit together.
export const TEMPLATE_CATEGORY = {
  arrives_early:      "Hotel",
  arrives_late:       "Hotel",
  departs_late:       "Hotel",
  missing_hotel:      "Hotel",
  missing_flight:     "Flight",
  wrong_airport:      "Flight",
  outside_window:     "Flight",
  missing_transfer:   "Car Transfer",
  car_mismatch:       "Car Transfer",
  needs_registration: "Registration & Confirmation",
  abstract_reminder: "Registration & Confirmation",
  general_confirmation: "Registration & Confirmation",
};
export const CATEGORY_ORDER = ["Hotel", "Flight", "Car Transfer", "Registration & Confirmation", "Custom"];
// Brand icon for each template (single-line GroupGrid icon set).
export const TEMPLATE_ICON_KEY = {
  arrives_early:      "hotel",
  arrives_late:       "hotel",
  departs_late:       "hotel",
  missing_hotel:      "hotel",
  missing_flight:     "plane",
  wrong_airport:      "flag",
  outside_window:     "calendar",
  missing_transfer:   "car",
  car_mismatch:       "car",
  needs_registration: "people",
  abstract_reminder: "people",
  general_confirmation: "cleared",
};
export const TEMPLATE_ICONS = { hotel: HotelIcon, plane: PlaneIcon, car: CarIcon, flag: FlagIcon, calendar: CalendarIcon, people: PeopleIcon, cleared: ClearedIcon };
export function TemplateIcon({ tmpl, size = 20 }) {
  const Comp = TEMPLATE_ICONS[TEMPLATE_ICON_KEY[tmpl.id]];
  if (Comp) return <Comp size={size} line={tmpl.color} accent={tmpl.color} />;
  return <span style={{ fontSize: size - 2 }}>{tmpl.icon}</span>; // custom templates keep their emoji
}
// Vendor-addressed bodies, keyed by audience. The planner is writing TO the vendor about a guest.
export const VENDOR_BODY = {
  hotel: `Dear {{hotelContact}},

I am writing about {{guestFullName}}{{guestEmailParen}} for {{eventName}}. While reviewing guest records we found an issue to confirm:

──────────────────────
Guest: {{guestFullName}}
Flight arrival: {{flightArrival}}{{arrivalTimeTail}}{{flightInTail}}
Hotel check-in: {{checkIn}} at {{hotel}}
Hotel check-out: {{checkOut}}
Flight departure: {{flightDeparture}}{{departureTimeTail}}{{flightOutTail}}

Issue: {{issueSummary}}
──────────────────────

Could you confirm the correct booking details at your earliest convenience? Thank you.

Warm regards,
{{plannerName}}
{{eventName}} Planning Team`,
  travel: `Dear {{travelContact}},

I am writing about the itinerary for {{guestFullName}}{{guestEmailParen}} for {{eventName}}. While reviewing guest records we found something to confirm:

──────────────────────
Guest: {{guestFullName}}
Inbound: {{flightArrival}}{{arrivalTimeTail}} into {{arrivalAirport}}{{flightInTail}}
Hotel check-in: {{checkIn}} at {{hotel}}
Hotel check-out: {{checkOut}}
Outbound: {{flightDeparture}}{{departureTimeTail}} from {{departureAirport}}{{flightOutTail}}

Issue: {{issueSummary}}
──────────────────────

Please advise on the correct details and any changes needed. Thank you.

Warm regards,
{{plannerName}}
{{eventName}} Planning Team`,
  car: `Dear {{carContact}},

I am writing about the ground transfer for {{guestFullName}}{{guestEmailParen}} for {{eventName}}. While reviewing guest records we found something to confirm:

──────────────────────
Guest: {{guestFullName}}
Flight arrival: {{flightArrival}}{{arrivalTimeTail}}{{flightInTail}}
Car pickup: {{carPickup}}
Car dropoff: {{carDropoff}}
Flight departure: {{flightDeparture}}{{departureTimeTail}}{{flightOutTail}}

Issue: {{issueSummary}}
──────────────────────

Could you confirm the transfer times are correct, or let us know if they need adjusting? Thank you.

Warm regards,
{{plannerName}}
{{eventName}} Planning Team`,
};
// Per-template vendor bodies. When a built-in template needs a message tailored beyond the
// generic per-audience VENDOR_BODY, its id maps to a specific body here and takes precedence.
export const VENDOR_BODY_OVERRIDE = {
  arrives_late: `Dear {{hotelContact}},

I am writing about a late arrival for {{guestFullName}}{{guestEmailParen}}, a confirmed guest for {{eventName}}. Their travel is scheduled to arrive later in the evening, potentially after your standard check-in cutoff:

──────────────────────
Guest: {{guestFullName}}
Room / confirmation: {{room}}
Hotel check-in: {{checkIn}} at {{hotel}}
Expected arrival: {{expectedArrival}}
──────────────────────

Please hold the room for a late arrival so it is not released if the guest has not checked in by your standard cutoff. Kindly confirm the room will be held.

Thank you very much.

Warm regards,
{{plannerName}}
{{eventName}} Planning Team`,
};
