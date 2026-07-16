import { stripTime } from "../format";

export function isOutside(date, ws, we) {
  if (!date) return false;
  const d = stripTime(date);
  if (ws && d < stripTime(ws)) return true;
  if (we && d > stripTime(we)) return true;
  return false;
}
// Alias table for the most common business-event airports, so a planner can type a code
// like "JFK" and still match "Kennedy" in a flight file (and vice versa). Not exhaustive —
// for airports not listed here, exact code / direct string matching still applies.
const AIRPORT_ALIASES = {
  jfk:["kennedy","johnfkennedy","newyork"], lga:["laguardia","newyork"], ewr:["newark","newarkliberty","newyork"],
  lax:["losangeles"], sfo:["sanfrancisco"], ord:["ohare","chicago"], mdw:["midway","chicago"],
  atl:["atlanta","hartsfield","hartsfieldjackson"], dfw:["dallas","dallasfortworth","fortworth"], dal:["love","lovefield","dallas"],
  mia:["miami"], fll:["fortlauderdale","lauderdale","hollywood"], mco:["orlando"], tpa:["tampa"],
  bos:["boston","logan"], dca:["reagan","national","reagannational","washington"], iad:["dulles","washington"], bwi:["baltimore","baltimorewashington"],
  sea:["seattle","seatac","seattletacoma"], den:["denver"], las:["lasvegas","vegas","harryreid","mccarran"], phx:["phoenix","skyharbor"],
  iah:["houston","bush","intercontinental"], hou:["hobby","houston"], aus:["austin","bergstrom"], san:["sandiego"],
  slc:["saltlake","saltlakecity"], msp:["minneapolis","stpaul","minneapolisstpaul"], dtw:["detroit","metro"], phl:["philadelphia"],
  clt:["charlotte"], nash:["nashville"], bna:["nashville"], rdu:["raleigh","durham","raleighdurham"], pdx:["portland"],
  lhr:["heathrow","london"], lgw:["gatwick","london"], cdg:["charlesdegaulle","degaulle","paris"], yyz:["toronto","pearson"], yul:["montreal","trudeau"],
};
export function normAirport(s){ return String(s||"").toLowerCase().replace(/[^a-z0-9]/g,""); }
// Build the full set of tokens (code + aliases) a single preferred entry should match against.
export function expandAirport(token){
  const n = normAirport(token);
  const set = new Set([n]);
  if (AIRPORT_ALIASES[n]) AIRPORT_ALIASES[n].forEach(a => set.add(a));        // code → names
  Object.entries(AIRPORT_ALIASES).forEach(([code,names]) => {                  // name → code
    if (names.includes(n)) { set.add(code); names.forEach(a => set.add(a)); }
  });
  return [...set];
}
// True if the guest's airport value matches NONE of the preferred airports.
export function isWrongAirport(guestAirport, preferredList){
  if (!guestAirport || !preferredList || preferredList.length === 0) return false;
  const g = normAirport(guestAirport);
  if (!g) return false;
  for (const pref of preferredList) {
    for (const tok of expandAirport(pref)) {
      if (!tok) continue;
      if (g === tok || g.includes(tok) || tok.includes(g)) return false; // matches a preferred airport
    }
  }
  return true; // matched nothing on the preferred list
}
