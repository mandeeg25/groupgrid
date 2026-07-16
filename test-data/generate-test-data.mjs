// Generates a 5-file GroupGrid test scenario (Registration, Flight, Hotel, Car,
// Abstract) with overlapping guests designed to exercise the cross-match engine.
// Run from repo root: node test-data/generate-test-data.mjs
import * as XLSX from "xlsx";
import { fileURLToPath } from "url";
import path from "path";

const outDir = path.dirname(fileURLToPath(import.meta.url));

function writeSheet(filename, sheetName, rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, path.join(outDir, filename));
  console.log(`Wrote ${filename} (${rows.length} rows)`);
}

// ── Registration list (source of truth) ──────────────────────────────────────
// Guests: Priya (aligned), James (no flight), Sarah (no hotel), Jennifer (date
// mismatch), David (wrong airport), Taylor (car mismatch), Morgan (late arrival).
// Marcus and Alex are intentionally left off this list.
writeSheet("Registration.xlsx", "Registration", [
  { Name: "Priya Sharma", Email: "priya.sharma@example.com", Company: "Acme Corp", "Job Title": "Director of Sales", "Requested Check-In": "2026-12-04", "Requested Check-Out": "2026-12-07", "Flight Request": "", "Hotel Request": "", Notes: "" },
  { Name: "James Mitchell", Email: "james.mitchell@example.com", Company: "Beacon Health", "Job Title": "VP Operations", "Requested Check-In": "2026-12-05", "Requested Check-Out": "2026-12-08", "Flight Request": "", "Hotel Request": "", Notes: "" },
  { Name: "Sarah Solomon", Email: "sarah.solomon@example.com", Company: "NovaTech", "Job Title": "Marketing Lead", "Requested Check-In": "2026-12-04", "Requested Check-Out": "2026-12-07", "Flight Request": "", "Hotel Request": "", Notes: "" },
  { Name: "Jennifer Park", Email: "jennifer.park@example.com", Company: "Foresight Inc", "Job Title": "Analyst", "Requested Check-In": "2026-12-04", "Requested Check-Out": "2026-12-08", "Flight Request": "", "Hotel Request": "", Notes: "" },
  { Name: "David Chen", Email: "david.chen@example.com", Company: "Chen Consulting", "Job Title": "Principal", "Requested Check-In": "2026-12-05", "Requested Check-Out": "2026-12-08", "Flight Request": "", "Hotel Request": "", Notes: "" },
  { Name: "Taylor Brooks", Email: "taylor.brooks@example.com", Company: "Brooks & Co", "Job Title": "Founder", "Requested Check-In": "2026-12-04", "Requested Check-Out": "2026-12-07", "Flight Request": "", "Hotel Request": "", Notes: "" },
  { Name: "Morgan Lee", Email: "morgan.lee@example.com", Company: "Lee Dynamics", "Job Title": "COO", "Requested Check-In": "2026-12-04", "Requested Check-Out": "2026-12-07", "Flight Request": "", "Hotel Request": "", Notes: "" },
]);

// ── Flight manifest ───────────────────────────────────────────────────────────
// Marcus has travel but is NOT on the registration list. Sarah is registered but
// has no hotel record. James has no flight record at all (omitted below).
// David's airport (EWR) is intentionally not the preferred one (set JFK in-app).
writeSheet("Flight_Manifest.xlsx", "Flights", [
  { Name: "Priya Sharma", Email: "priya.sharma@example.com", "Arrival Date": "2026-12-04", "Arrival Time": "9:15 AM", "Arrival Airport": "JFK", "Inbound Flight": "UA332", "Departure Date": "2026-12-07", "Departure Time": "4:30 PM", "Departure Airport": "JFK", "Outbound Flight": "UA771" },
  { Name: "Sarah Solomon", Email: "sarah.solomon@example.com", "Arrival Date": "2026-12-04", "Arrival Time": "6:15 AM", "Arrival Airport": "JFK", "Inbound Flight": "DL1234", "Departure Date": "2026-12-07", "Departure Time": "5:40 PM", "Departure Airport": "JFK", "Outbound Flight": "DL5678" },
  { Name: "Marcus Williams", Email: "marcus.williams@example.com", "Arrival Date": "2026-12-05", "Arrival Time": "11:00 AM", "Arrival Airport": "JFK", "Inbound Flight": "AA109", "Departure Date": "2026-12-08", "Departure Time": "2:20 PM", "Departure Airport": "JFK", "Outbound Flight": "AA771" },
  { Name: "Jennifer Park", Email: "jennifer.park@example.com", "Arrival Date": "2026-12-05", "Arrival Time": "10:05 AM", "Arrival Airport": "JFK", "Inbound Flight": "AA110", "Departure Date": "2026-12-08", "Departure Time": "3:15 PM", "Departure Airport": "JFK", "Outbound Flight": "AA772" },
  { Name: "David Chen", Email: "david.chen@example.com", "Arrival Date": "2026-12-05", "Arrival Time": "1:30 PM", "Arrival Airport": "EWR", "Inbound Flight": "SW884", "Departure Date": "2026-12-08", "Departure Time": "6:45 PM", "Departure Airport": "EWR", "Outbound Flight": "SW885" },
  { Name: "Taylor Brooks", Email: "taylor.brooks@example.com", "Arrival Date": "2026-12-04", "Arrival Time": "3:00 PM", "Arrival Airport": "JFK", "Inbound Flight": "B6210", "Departure Date": "2026-12-07", "Departure Time": "1:10 PM", "Departure Airport": "JFK", "Outbound Flight": "B6455" },
  { Name: "Morgan Lee", Email: "morgan.lee@example.com", "Arrival Date": "2026-12-04", "Arrival Time": "11:45 PM", "Arrival Airport": "JFK", "Inbound Flight": "DL900", "Departure Date": "2026-12-07", "Departure Time": "12:30 PM", "Departure Airport": "JFK", "Outbound Flight": "DL901" },
]);

// ── Hotel roster ──────────────────────────────────────────────────────────────
// Jennifer's check-in (12-05) is one day later than her registration request
// (12-04) — triggers a "differs from registration" mismatch. Sarah is omitted
// (no hotel record) to trigger "Registered but no hotel booked".
writeSheet("Hotel_Roster.xlsx", "Hotel", [
  { Name: "Priya Sharma", Email: "priya.sharma@example.com", Hotel: "Grand Hyatt", "Check-In": "2026-12-04", "Check-Out": "2026-12-07", Confirmation: "GH10234" },
  { Name: "James Mitchell", Email: "james.mitchell@example.com", Hotel: "Grand Hyatt", "Check-In": "2026-12-05", "Check-Out": "2026-12-08", Confirmation: "GH10235" },
  { Name: "Marcus Williams", Email: "marcus.williams@example.com", Hotel: "Grand Hyatt", "Check-In": "2026-12-05", "Check-Out": "2026-12-08", Confirmation: "GH10240" },
  { Name: "Jennifer Park", Email: "jennifer.park@example.com", Hotel: "Grand Hyatt", "Check-In": "2026-12-05", "Check-Out": "2026-12-08", Confirmation: "GH10245" },
  { Name: "David Chen", Email: "david.chen@example.com", Hotel: "Grand Hyatt", "Check-In": "2026-12-05", "Check-Out": "2026-12-08", Confirmation: "GH10250" },
  { Name: "Taylor Brooks", Email: "taylor.brooks@example.com", Hotel: "Grand Hyatt", "Check-In": "2026-12-04", "Check-Out": "2026-12-07", Confirmation: "GH10260" },
  { Name: "Morgan Lee", Email: "morgan.lee@example.com", Hotel: "Grand Hyatt", "Check-In": "2026-12-04", "Check-Out": "2026-12-07", Confirmation: "GH10270" },
]);

// ── Car transfers ─────────────────────────────────────────────────────────────
// Taylor's pickup (12-05) is one day after their flight arrival (12-04) —
// triggers a car pickup / flight arrival mismatch.
writeSheet("Car_Transfers.xlsx", "Car Transfers", [
  { Name: "Priya Sharma", Email: "priya.sharma@example.com", "Pickup Date": "2026-12-04", "Pickup Time": "9:45 AM", "Dropoff Date": "2026-12-07", "Dropoff Time": "5:00 PM" },
  { Name: "Taylor Brooks", Email: "taylor.brooks@example.com", "Pickup Date": "2026-12-05", "Pickup Time": "10:00 AM", "Dropoff Date": "2026-12-07", "Dropoff Time": "6:00 PM" },
]);

// ── Abstract submissions ──────────────────────────────────────────────────────
// Alex submitted (and had accepted) an abstract but never registered.
writeSheet("Abstract_Submissions.xlsx", "Abstracts", [
  { Name: "Alex Rivera", Email: "alex.rivera@example.com", "Abstract Title": "Scaling Distributed Systems at the Edge", Status: "Accepted" },
]);

console.log("\nDone. See test-data/README.md for the expected flag on each guest.");
