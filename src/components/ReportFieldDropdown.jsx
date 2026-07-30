import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { P, font } from "../theme";

// Multi-select dropdown for a group of report columns. Checkmarks + live count.
export function ReportFieldDropdown({ group, fields, selected, onToggle, onSetGroup }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const count = fields.filter(f => selected.has(f.key)).length;
  const allOn = count === fields.length && count > 0;
  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:P.white, border:`1.5px solid ${count?P.accent+"66":P.grey200}`, borderRadius:"9px", padding:"8px 13px", fontSize:"16px", fontWeight:600, color:P.navy, fontFamily:font, cursor:"pointer" }}>
        {group}
        <span style={{ background:count?P.accent+"1F":P.grey100, color:count?P.accentD:P.grey600, borderRadius:"20px", fontSize:"13px", fontWeight:700, padding:"1px 8px", minWidth:"20px", textAlign:"center" }}>{count}</span>
        <ChevronDown size={15} strokeWidth={2} style={{ color:P.grey400, transform: open?"rotate(180deg)":"none", transition:"transform 0.15s" }} />
      </button>
      {open && (
        <div style={{ position:"absolute", zIndex:40, top:"calc(100% + 6px)", left:0, minWidth:"216px", background:P.white, border:`1px solid ${P.grey200}`, borderRadius:"11px", boxShadow:"0 10px 30px rgba(12,30,63,0.18)", padding:"6px" }}>
          <div onClick={() => onSetGroup(fields.map(f => f.key), !allOn)}
            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 9px 8px", margin:"0 0 4px", borderBottom:`1px solid ${P.grey100}`, cursor:"pointer", fontSize:"14px", fontWeight:600, color:P.periwinkleD, fontFamily:font }}>
            <span>{allOn ? "Clear all" : "Select all"}</span>
            <span style={{ fontSize:"13px", color:P.grey600, fontWeight:500 }}>{count}/{fields.length}</span>
          </div>
          {fields.map(fl => {
            const on = selected.has(fl.key);
            return (
              <div key={fl.key} onClick={() => onToggle(fl.key)}
                style={{ display:"flex", alignItems:"center", gap:"9px", padding:"8px 9px", borderRadius:"7px", fontSize:"16px", color:P.navy, fontFamily:font, cursor:"pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = P.grey50}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ width:16, height:16, borderRadius:"5px", background:on?P.accent:P.white, border:`1.5px solid ${on?P.accent:P.grey200}`, display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{on && <Check size={11} strokeWidth={3} color={P.white} />}</span>
                {fl.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const REPORT_PRESETS = {
  general: ["lastName","firstName","email","company","note","status","issues","flightArrival","arrivalTime","arrivalAirport","flightIn","flightDeparture","departureTime","departureAirport","flightOut","hotel","checkIn","checkOut","room","carPickup","carPickupTime","carDropoff"],
  hotel: ["lastName","firstName","email","note","hotel","checkIn","checkOut","room","status","issues"],
  car: ["lastName","firstName","email","note","carPickup","carPickupTime","carDropoff","status","issues"],
  travel: ["lastName","firstName","email","note","flightArrival","arrivalTime","arrivalAirport","flightIn","flightDeparture","departureTime","departureAirport","flightOut","status","issues"],
};
