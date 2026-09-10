import { useEffect, useState } from "react";
import { P, font, fontDisplay } from "../theme";

// Apollo lead-capture form, isolated in a same-origin iframe (/apollo-form.html).
// Isolation is deliberate: Apollo's embed injects and mutates DOM, which crashes
// React if done inside the app tree. Keeping it in its own document means a form
// problem can never white-screen the page.
//
// The child document reports whether Apollo actually rendered a form (it refuses on
// domains not authorized in the Apollo form settings) plus its height. The whole
// "Stay in touch" section stays hidden until the form is confirmed on screen, so a
// blocked or failed embed leaves no empty box behind.
// variant="inline" drops the full-bleed grey band so the form sits inside a page's
// content column (Contact page); the default is the landing-page section.
export function ApolloForm({ variant = "section" } = {}) {
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(560);
  useEffect(() => {
    function onMessage(e) {
      if (e.origin !== window.location.origin) return;
      const d = e && e.data;
      if (!d || d.__ggApollo !== true) return;
      if (d.ready === true) setReady(true);
      if (typeof d.height === "number") setHeight(Math.max(320, Math.min(1400, d.height + 8)));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return (
    <div id="stay-in-touch" style={ variant === "inline"
      ? { display: ready ? "block" : "none", margin:"8px 0 32px" }
      : { display: ready ? "block" : "none", background:"#F0F2F7", borderTop:`1px solid ${P.grey100}`, padding:"72px 24px" } }>
      <div style={{ maxWidth:"560px", margin:"0 auto", textAlign:"center" }}>
        <div style={{ fontSize:"15px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>Stay in touch</div>
        <h2 style={{ fontSize:"clamp(26px,4vw,36px)", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 12px", letterSpacing:"-0.03em", lineHeight:1.12 }}>Want a closer look?</h2>
        <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.6, margin:"0 0 28px" }}>Leave your details for tips and updates. Ready to try it? Sign up and run your first check.</p>
        <div style={{ background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"16px", padding:"20px 22px", boxShadow:"0 1px 2px rgba(12,30,63,0.04), 0 18px 40px -28px rgba(12,30,63,0.45)", textAlign:"left" }}>
          <iframe
            title="Get in touch with GroupGrid"
            src="/apollo-form.html"
            style={{ width: "100%", border: "none", height: height + "px", display: "block", background: "transparent" }}
          />
        </div>
      </div>
    </div>
  );
}
