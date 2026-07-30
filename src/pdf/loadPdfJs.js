import * as XLSX from "xlsx";

// ── PDF table extraction (beta) ───────────────────────────────────────────────
// Loads pdf.js on demand (only when a PDF is uploaded), extracts text with its
// position, reconstructs rows by line, and assigns each value to the nearest
// header column. Runs entirely in the browser, so files never leave the device.
// Best for clean, digital, table-style PDFs (e.g. hotel rooming lists); scanned
// or irregular PDFs may extract imperfectly, which is why results are shown for
// review before anything is sent.
const PDFJS_VERSION = "3.11.174";
let _pdfjsPromise = null;
export function loadPdfJs() {
  if (typeof window !== "undefined" && window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (_pdfjsPromise) return _pdfjsPromise;
  _pdfjsPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
    s.onload = () => {
      try {
        const lib = window.pdfjsLib;
        lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
        resolve(lib);
      } catch (e) { reject(e); }
    };
    s.onerror = () => { _pdfjsPromise = null; reject(new Error("Could not load the PDF reader. Check your connection and try again, or upload an Excel or CSV file.")); };
    document.head.appendChild(s);
  });
  return _pdfjsPromise;
}
export function buildAoaFromPdfLines(lines) {
  const KW = ["name","email","check","hotel","room","arrival","depart","date","time","flight","airport","pickup","dropoff","drop off","confirmation","guest","attendee","transfer","first","last"];
  let headerIdx = -1, best = 0;
  for (let i = 0; i < lines.length; i++) {
    const txt = lines[i].items.map(x => x.str).join(" ").toLowerCase();
    const hits = KW.reduce((a, k) => a + (txt.includes(k) ? 1 : 0), 0);
    if (lines[i].items.length >= 2 && hits > best) { best = hits; headerIdx = i; }
  }
  if (headerIdx < 0 || best < 2) return null;
  const header = lines[headerIdx].items;
  const anchors = header.map(h => h.x);
  const headerRow = header.map(h => h.str);
  const headerSig = headerRow.join(" ").toLowerCase();
  const nearest = x => { let bi = 0, bd = Infinity; for (let i = 0; i < anchors.length; i++) { const d = Math.abs(anchors[i] - x); if (d < bd) { bd = d; bi = i; } } return bi; };
  const out = [headerRow];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const sig = lines[i].items.map(x => x.str).join(" ").toLowerCase();
    if (sig === headerSig) continue; // skip repeated headers on later pages
    const cells = new Array(anchors.length).fill("");
    for (const it of lines[i].items) { const c = nearest(it.x); cells[c] = cells[c] ? cells[c] + " " + it.str : it.str; }
    if (cells.some(c => c && c.trim() !== "")) out.push(cells);
  }
  return out;
}
export async function extractPdfToWorkbook(file) {
  const pdfjsLib = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const items = tc.items
      .filter(it => it.str && it.str.trim() !== "")
      .map(it => ({ x: it.transform[4], y: Math.round(it.transform[5]), str: it.str.trim() }))
      .sort((a, b) => b.y - a.y || a.x - b.x);
    let cur = null;
    for (const it of items) {
      if (!cur || Math.abs(cur.y - it.y) > 3) { cur = { y: it.y, items: [it] }; lines.push(cur); }
      else cur.items.push(it);
    }
  }
  for (const ln of lines) ln.items.sort((a, b) => a.x - b.x);
  const aoa = buildAoaFromPdfLines(lines);
  if (!aoa || aoa.length < 2) throw new Error("Couldn't find a readable table in this PDF. Try the Excel or CSV version, or download a template for the right format.");
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PDF");
  return wb;
}
