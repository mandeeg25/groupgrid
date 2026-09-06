import { useEffect } from "react";

// Apollo inbound lead-capture form. Loads Apollo's embed script once, then inits the
// form into the #apollo-forms div. Handles SPA remounts (script already present) and
// cleans up so a re-init doesn't fire after unmount.
const APOLLO_APP_ID = "6a9a41cb6781930010d627ee";

export function ApolloForm() {
  useEffect(() => {
    let cancelled = false;
    const init = () => {
      try {
        if (window.ApolloInbound && window.ApolloInbound.forms) {
          window.ApolloInbound.forms.init({ appId: APOLLO_APP_ID });
        }
      } catch (err) {
        console.error("[Apollo] Error initializing form:", err);
      }
    };
    if (window.ApolloInbound && window.ApolloInbound.forms) {
      init();
    } else {
      let script = document.getElementById("apollo-inbound-js");
      if (!script) {
        script = document.createElement("script");
        script.id = "apollo-inbound-js";
        script.src = "https://assets.apollo.io/js/apollo-inbound.js?nocache=" + Math.random().toString(36).substring(7);
        script.async = true;
        script.onload = () => { if (!cancelled) init(); };
        script.onerror = () => console.error("[Apollo] Failed to load form script");
        document.head.appendChild(script);
      } else {
        // Script tag exists but the global may not be ready yet; poll briefly.
        const t = setInterval(() => {
          if (window.ApolloInbound && window.ApolloInbound.forms) { clearInterval(t); if (!cancelled) init(); }
        }, 200);
        setTimeout(() => clearInterval(t), 6000);
      }
    }
    return () => { cancelled = true; };
  }, []);

  return <div id="apollo-forms" />;
}
