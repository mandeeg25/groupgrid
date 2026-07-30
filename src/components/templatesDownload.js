import * as XLSX from "xlsx";
import { SHOW_DIETARY } from "../constants";

// ── Downloadable upload templates ─────────────────────────────────────────────
// Builds a correctly formatted .xlsx (header row + one example row) entirely in the
// browser, using the exact column names the parsers recognize.
const TEMPLATE_DEFS = {
  registration: { file:"GroupGrid_Registration_Template.xlsx", sheet:"Registration", rows:[
    ["First Name","Last Name","Email","Notes"],
    ["Jane","Doe","jane.doe@example.com","VIP, seat near front. Approved to book own hotel."],
  ]},
  flight: { file:"GroupGrid_Flight_Template.xlsx", sheet:"Flights", rows:[
    ["Name","Email","Arrival Date","Arrival Time","Arrival Airport","Inbound Flight","Departure Date","Departure Time","Departure Airport","Outbound Flight"],
    ["Jane Doe","jane.doe@example.com","2026-09-14","6:15 AM","JFK","DL1234","2026-09-17","5:40 PM","JFK","DL5678"],
  ]},
  hotel: { file:"GroupGrid_Hotel_Template.xlsx", sheet:"Hotel", rows:[
    ["Name","Email","Hotel","Check-In","Check-Out","Confirmation"],
    ["Jane Doe","jane.doe@example.com","Grand Plaza Hotel","2026-09-14","2026-09-17","ABC12345"],
  ]},
  car: { file:"GroupGrid_Car_Template.xlsx", sheet:"Car Transfers", rows:[
    ["Name","Email","Pickup Date","Pickup Time","Dropoff Date","Dropoff Time"],
    ["Jane Doe","jane.doe@example.com","2026-09-14","7:00 AM","2026-09-17","6:30 PM"],
  ]},
  dietary: { file:"GroupGrid_Dietary_Template.xlsx", sheet:"Dietary", rows:[
    ["Name","Email","Dietary Restriction","Notes"],
    ["Jane Doe","jane.doe@example.com","Vegetarian","No nuts"],
  ]},
  abstract: { file:"GroupGrid_Abstract_Template.xlsx", sheet:"Abstracts", rows:[
    ["Name","Email","Abstract Title","Status"],
    ["Jane Doe","jane.doe@example.com","Trends in Cyber Resilience","Accepted"],
  ]},
};
function buildTemplateXlsx(def) {
  const ws = XLSX.utils.aoa_to_sheet(def.rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, def.sheet);
  return wb;
}
// Minimal in-browser ZIP writer (store method, no external dependency) so every upload
// template can be downloaded together in a single .zip.
function gg_crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let k = 0; k < 8; k++) crc = (crc & 1) ? (crc >>> 1) ^ 0xEDB88320 : crc >>> 1;
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function gg_makeZip(files) {
  const enc = new TextEncoder();
  const u16 = n => [n & 0xFF, (n >>> 8) & 0xFF];
  const u32 = n => [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];
  const parts = [], central = []; let offset = 0;
  files.forEach(f => {
    const name = enc.encode(f.name), crc = gg_crc32(f.data), size = f.data.length;
    const local = Uint8Array.from([].concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(size), u32(size), u16(name.length), u16(0)));
    parts.push(local, name, f.data);
    central.push(Uint8Array.from([].concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(size), u32(size), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset))), name);
    offset += local.length + name.length + size;
  });
  const cdStart = offset; let cdSize = 0;
  central.forEach(c => { parts.push(c); cdSize += c.length; });
  parts.push(Uint8Array.from([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cdSize), u32(cdStart), u16(0))));
  let total = 0; parts.forEach(p => total += p.length);
  const out = new Uint8Array(total); let pos = 0;
  parts.forEach(p => { out.set(p, pos); pos += p.length; });
  return out;
}
export function downloadAllTemplates() {
  const types = ["registration", "flight", "hotel", "car", "abstract"].concat(SHOW_DIETARY ? ["dietary"] : []);
  const files = types.map(t => {
    const def = TEMPLATE_DEFS[t];
    const data = new Uint8Array(XLSX.write(buildTemplateXlsx(def), { type: "array", bookType: "xlsx" }));
    return { name: def.file, data };
  });
  const blob = new Blob([gg_makeZip(files)], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "GroupGrid_Upload_Templates.zip";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
