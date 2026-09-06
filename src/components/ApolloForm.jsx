import { useEffect, useState } from "react";

// Apollo lead-capture form, isolated in a same-origin iframe (/apollo-form.html).
// Isolation is deliberate: Apollo's embed injects and mutates DOM, which crashes
// React if done inside the app tree. Keeping it in its own document means a form
// problem can never white-screen the page, worst case is an empty box. The child
// document posts its height so the iframe can size to the form.
export function ApolloForm() {
  const [height, setHeight] = useState(560);
  useEffect(() => {
    function onMessage(e) {
      var d = e && e.data;
      if (d && typeof d.__ggApolloHeight === "number") {
        setHeight(Math.max(320, Math.min(1400, d.__ggApolloHeight + 8)));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return (
    <iframe
      title="Get in touch with GroupGrid"
      src="/apollo-form.html"
      loading="lazy"
      style={{ width: "100%", border: "none", height: height + "px", display: "block", background: "transparent" }}
    />
  );
}
