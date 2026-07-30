import { useState } from "react";
import { Check, Lock, X, ShieldCheck } from "lucide-react";
import { P, font, fontDisplay } from "../theme";
import { MarketingNav } from "./PageShell";
import { startCheckout } from "../stripeClient";

// ── Pricing Page ──────────────────────────────────────────────────────────────
export function PricingPage({ onBack, nav, user }) {
  const [billing, setBilling] = useState("monthly");
  const annual = billing === "annual";
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  async function handleGetStarted() {
    // Not signed in yet — same login gate as the rest of the app. Once signed
    // in, they land in the app and can come back to Pricing to subscribe.
    if (!user) { nav?.onApp?.(); return; }
    setCheckoutError(""); setCheckoutLoading(true);
    try {
      await startCheckout(billing);
    } catch (err) {
      setCheckoutError(err.message);
      setCheckoutLoading(false);
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:P.offWhite, fontFamily:font }}>
      {nav ? <MarketingNav nav={nav} /> : (
      <div style={{ background:P.navy, padding:"0 32px", height:"52px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 0 rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"8px", padding:"5px 14px", color:"rgba(255,255,255,0.75)", fontSize:"15px", fontFamily:font, fontWeight:600, cursor:"pointer" }}>← Back to app</button>
        <span style={{ color:P.accent, fontSize:"15px", fontWeight:700, fontFamily:font, letterSpacing:"0.05em" }}>PRICING</span>
      </div>
      )}

      {/* Hero */}
      <div style={{ background:`linear-gradient(160deg, ${P.navy} 0%, ${P.navyLight} 100%)`, padding:"64px 28px 56px", textAlign:"center" }}>
        <h1 style={{ fontSize:"44px", fontWeight:700, color:P.white, fontFamily:fontDisplay, margin:"0 0 14px", letterSpacing:"-0.04em", lineHeight:1.1 }}>
          Simple pricing.<br/><span style={{ color:P.accent }}>No surprises.</span>
        </h1>
        <p style={{ fontSize:"17px", color:"rgba(255,255,255,0.55)", fontFamily:font, margin:"0 0 32px", lineHeight:1.6 }}>
          One plan. All features. One simple price.
        </p>
        {/* Billing toggle */}
        <div style={{ display:"inline-flex", background:"rgba(255,255,255,0.08)", borderRadius:"12px", padding:"4px", gap:"4px" }}>
          {[["monthly","Monthly"],["annual","Annual · Save 17%"]].map(([k,l]) => (
            <button key={k} onClick={() => setBilling(k)} style={{ padding:"8px 22px", borderRadius:"9px", border:"none", cursor:"pointer", fontFamily:font, fontSize:"15px", fontWeight:700, transition:"all 0.18s", background:billing===k?P.white:"transparent", color:billing===k?P.navy:"rgba(255,255,255,0.55)", boxShadow:billing===k?"0 1px 4px rgba(0,0,0,0.15)":"none" }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Single plan card */}
      <div style={{ maxWidth:"460px", margin:"-32px auto 0", padding:"0 24px 72px" }}>
        <div style={{ background:P.white, borderRadius:"20px", overflow:"hidden", boxShadow:"0 8px 40px rgba(0,201,177,0.18), 0 2px 12px rgba(0,0,0,0.06)", border:`2px solid ${P.accent}`, position:"relative" }}>

          {/* Best Value badge for annual */}
          {annual && (
            <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", background:P.accent, color:P.white, fontSize:"15px", fontWeight:800, fontFamily:font, letterSpacing:"0.07em", padding:"4px 18px", borderRadius:"0 0 10px 10px", textTransform:"uppercase", whiteSpace:"nowrap" }}>
              Best Value — Save $988/yr
            </div>
          )}

          <div style={{ padding: annual ? "40px 32px 28px" : "32px 32px 28px" }}>
            <div style={{ fontSize:"15px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"10px" }}>GroupGrid</div>

            {/* Price */}
            <div style={{ display:"flex", alignItems:"flex-end", gap:"6px", marginBottom:"6px" }}>
              <span style={{ fontSize:"52px", fontWeight:700, color:P.navy, fontFamily:fontDisplay, letterSpacing:"-0.04em", lineHeight:1 }}>
                {annual ? "$2,000" : "$250"}
              </span>
              <span style={{ fontSize:"17px", color:P.grey600, fontFamily:font, marginBottom:"8px" }}>
                {annual ? "/year" : "/month"}
              </span>
            </div>
            {annual && (
              <div style={{ fontSize:"15px", color:P.green, fontWeight:700, fontFamily:font, marginBottom:"4px" }}>
                Equivalent to $167/mo · billed annually
              </div>
            )}
            <div style={{ fontSize:"17px", color:P.grey600, fontFamily:font, marginBottom:"16px" }}>1 user · unlimited events · all features</div>

            {/* Access callout */}
            <div style={{ background:P.accentLight, border:`1.5px solid ${P.accent}44`, borderRadius:"10px", padding:"12px 16px", marginBottom:"16px", display:"flex", alignItems:"center", gap:"10px" }}>
              <span style={{ fontSize:"18px", flexShrink:0 }}>🎯</span>
              <div>
                <div style={{ fontSize:"15px", fontWeight:800, color:P.teal, fontFamily:font }}>One plan, everything included</div>
                <div style={{ fontSize:"16px", color:P.grey600, fontFamily:font, lineHeight:1.5 }}>Create an account to get started. Unlimited events, unlimited guests, and every feature — one simple monthly price.</div>
              </div>
            </div>

            <button onClick={handleGetStarted} disabled={checkoutLoading}
              style={{ display:"block", width:"100%", background:checkoutLoading?P.grey200:P.accent, border:"none", borderRadius:"12px", padding:"15px", fontSize:"16px", fontWeight:800, fontFamily:font, color:P.white, cursor:checkoutLoading?"wait":"pointer", textAlign:"center", textDecoration:"none", boxShadow:checkoutLoading?"none":"0 4px 16px rgba(0,201,177,0.35)", letterSpacing:"-0.01em", boxSizing:"border-box" }}>
              {checkoutLoading ? "Redirecting to checkout…" : "Get started →"}
            </button>
            {checkoutError && (
              <div style={{ marginTop:"10px", fontSize:"15px", color:P.red, fontFamily:font, textAlign:"center" }}>{checkoutError}</div>
            )}
          </div>

          {/* Feature list */}
          <div style={{ borderTop:`1px solid ${P.grey100}`, padding:"24px 32px 32px" }}>
            <div style={{ fontSize:"15px", fontWeight:700, color:P.grey600, fontFamily:font, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:"16px" }}>Everything included</div>
            {[
              "Flight, hotel, car & dietary cross-referencing",
              "Unlimited guests per event",
              "Date mismatch & flag detection",
              "Bulk email drafting (guest, hotel, travel)",
              "Shareable HTML reports",
              "Export to Excel",
              "Notes & issue resolution workflow",
              "Browser-local · zero PII uploaded",
            ].map((f,i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"10px", marginBottom:"12px" }}>
                <div style={{ width:18, height:18, borderRadius:"50%", background:P.accentLight, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"1px" }}>
                  <Check size={11} strokeWidth={3} color={P.accentD} />
                </div>
                <span style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.5 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust / reassurance */}
        <div style={{ marginTop:"28px", display:"flex", flexDirection:"column", gap:"10px" }}>
          {[
            { icon:<Check size={13} strokeWidth={2.5}/>, text:"One flat monthly price — no per-event fees" },
            { icon:<Lock size={13} strokeWidth={1.8}/>, text:"Payments processed securely by Stripe" },
            { icon:<X size={13} strokeWidth={2.5}/>, text:"Cancel any time — no long-term commitment" },
            { icon:<ShieldCheck size={13} strokeWidth={1.8}/>, text:"Your guest files never leave your browser" },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <span style={{ color:P.grey600, display:"flex" }}>{icon}</span>
              <span style={{ fontSize:"16px", color:P.grey600, fontFamily:font }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Questions */}
        <div style={{ marginTop:"36px", background:P.white, borderRadius:"14px", border:`1px solid ${P.grey100}`, padding:"20px 24px", textAlign:"center" }}>
          <div style={{ fontSize:"15px", fontWeight:700, color:P.navy, fontFamily:font, marginBottom:"6px" }}>Questions?</div>
          <div style={{ fontSize:"17px", color:P.grey600, fontFamily:font }}>Email us at <a href="mailto:billing@groupgrid.io" style={{ color:P.periwinkleD, fontWeight:600, textDecoration:"none" }}>billing@groupgrid.io</a> and we'll get back to you within one business day.</div>
        </div>
      </div>
    </div>
  );
}
