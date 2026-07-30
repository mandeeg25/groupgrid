import { useState, useEffect } from "react";
import { P, font } from "./theme";
import { getSupabase } from "./auth/supabaseClient";
import { ErrorBoundary } from "./components/ErrorBoundary";
import GroupGridResults from "./GroupGridResults";

export default function App() {
  const [user, setUser]           = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Load Supabase from CDN once, then check existing session
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = async () => {
      const sb = getSupabase();
      if (!sb) { setAuthReady(true); return; }
      // Restore existing session (e.g. user refreshes the page)
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        setUser({ email: session.user.email, name: session.user.user_metadata?.name || session.user.email.split("@")[0], id: session.user.id });
      }
      // Listen for auth state changes (sign in, sign out, token refresh)
      sb.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({ email: session.user.email, name: session.user.user_metadata?.name || session.user.email.split("@")[0], id: session.user.id });
        } else {
          setUser(null);
        }
      });
      setAuthReady(true);
    };
    script.onerror = () => setAuthReady(true); // Fail gracefully — app still works without auth
    document.head.appendChild(script);
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, []);

  const handleLogout = async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setUser(null);
  };

  if (!authReady) {
    return (
      <div style={{ minHeight:"100vh", background:P.navy, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:font }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:40, height:40, border:`3px solid rgba(255,255,255,0.1)`, borderTop:`3px solid ${P.accent}`, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 16px" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ color:"rgba(255,255,255,0.4)", fontSize:"15px" }}>Loading GroupGrid…</div>
        </div>
      </div>
    );
  }

  return <ErrorBoundary><GroupGridResults user={user} onLogin={setUser} onLogout={handleLogout} /></ErrorBoundary>;
}
