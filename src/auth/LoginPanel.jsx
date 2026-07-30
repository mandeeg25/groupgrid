import { useState } from "react";
import { X, FileSpreadsheet, Mail, Users, BarChart2 } from "lucide-react";
import { P, font } from "../theme";
import { APP_VERSION } from "../constants";
import { BrandLogo } from "../icons";
import { getSupabase } from "./supabaseClient";

// ── Login Panel (slide-in drawer) ────────────────────────────────────────────
export function LoginPanel({ onLogin, onClose }) {
  const [mode, setMode]         = useState("signin"); // "signin" | "signup" | "reset"
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [focused, setFocused]   = useState("");

  function clearForm() { setError(""); setSuccess(""); }

  async function handleSignIn(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError("Please enter your email and password."); return; }
    clearForm(); setLoading(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Auth not available. Please refresh and try again.");
      const { data, error: sbErr } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (sbErr) throw sbErr;
      onLogin({ email: data.user.email, name: data.user.user_metadata?.name || data.user.email.split("@")[0], id: data.user.id });
    } catch (err) {
      setError(err.message === "Invalid login credentials" ? "Incorrect email or password. Please try again." : err.message);
    } finally { setLoading(false); }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    clearForm(); setLoading(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Auth not available. Please refresh and try again.");
      const { data, error: sbErr } = await sb.auth.signUp({
        email: email.trim(), password,
        options: { data: { name: name.trim() }, emailRedirectTo: window.location.origin }
      });
      if (sbErr) throw sbErr;
      // TODO: re-enable once the /api/hubspot-upsert backend function exists (see
      // docs/stripe-backend-plan.md "Open questions" — needs client's HubSpot intent
      // confirmed first). No /api route exists yet, so this was 405ing on every signup.
      // fetch("/api/hubspot-upsert", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      // }).catch(() => {});
      if (data.user && !data.session) {
        // Email confirmation required
        setSuccess("Check your inbox! We sent a confirmation link to " + email.trim() + ". Click it to activate your account.");
      } else if (data.session) {
        // Auto-confirmed (email confirm disabled in Supabase)
        onLogin({ email: data.user.email, name: name.trim(), id: data.user.id });
      }
    } catch (err) {
      setError(err.message.includes("already registered") ? "An account with this email already exists. Try signing in." : err.message);
    } finally { setLoading(false); }
  }

  async function handleReset(e) {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address."); return; }
    clearForm(); setLoading(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Auth not available. Please refresh and try again.");
      const { error: sbErr } = await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin
      });
      if (sbErr) throw sbErr;
      setSuccess("Password reset link sent to " + email.trim() + ". Check your inbox.");
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  const inputStyle = (field) => ({
    width:"100%", background:"rgba(255,255,255,0.07)", border:`1.5px solid ${focused===field ? P.periwinkle : "rgba(255,255,255,0.12)"}`,
    borderRadius:"12px", padding:"12px 14px", fontSize:"15px", fontFamily:font, fontWeight:600,
    color:P.white, outline:"none", boxSizing:"border-box", transition:"border-color 0.2s", caretColor:P.periwinkleL
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", fontFamily:font }}>

      {/* Header */}
      <div style={{ padding:"24px 28px 20px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center" }}>
          <BrandLogo height={24} onDark={true} />
        </div>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"10px", width:32, height:32, cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15} strokeWidth={1.8}/></button>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:"auto", padding:"32px 28px" }}>

        {/* Mode tabs */}
        {mode !== "reset" && (
          <div style={{ display:"flex", background:"rgba(255,255,255,0.06)", borderRadius:"10px", padding:"3px", gap:"2px", marginBottom:"28px" }}>
            {[["signin","Sign In"],["signup","Create Account"]].map(([k,l]) => (
              <button key={k} onClick={() => { setMode(k); clearForm(); }}
                style={{ flex:1, padding:"8px", borderRadius:"8px", border:"none", cursor:"pointer", fontFamily:font, fontSize:"15px", fontWeight:700, transition:"all 0.15s", background:mode===k?"rgba(255,255,255,0.12)":"transparent", color:mode===k?P.white:"rgba(255,255,255,0.4)" }}>
                {l}
              </button>
            ))}
          </div>
        )}

        {/* Heading */}
        <div style={{ marginBottom:"24px" }}>
          <div style={{ fontSize:"22px", fontWeight:900, color:P.white, marginBottom:"6px" }}>
            {mode==="signin" ? "Welcome back" : mode==="signup" ? "Create your account" : "Reset your password"}
          </div>
          <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.4)", lineHeight:1.5 }}>
            {mode==="signin" ? "Sign in to access your saved projects and event history." :
             mode==="signup" ? "Save projects, sync across devices, and access your event history." :
             "Enter your email and we'll send you a reset link."}
          </div>
        </div>

        {/* Success message */}
        {success && (
          <div style={{ background:"rgba(0,201,177,0.12)", border:"1px solid rgba(0,201,177,0.3)", borderRadius:"10px", padding:"12px 14px", fontSize:"15px", color:P.accent, fontWeight:600, marginBottom:"20px", lineHeight:1.5 }}>
            ✓ {success}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ background:"rgba(192,57,43,0.15)", border:"1px solid rgba(192,57,43,0.35)", borderRadius:"10px", padding:"10px 14px", fontSize:"15px", color:"#C0392B", fontWeight:700, marginBottom:"20px" }}>
            ⚠ {error}
          </div>
        )}

        {/* Sign In form */}
        {mode === "signin" && !success && (
          <form onSubmit={handleSignIn} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div>
              <label style={{ display:"block", fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"7px" }}>Email</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} onFocus={() => setFocused("email")} onBlur={() => setFocused("")} placeholder="you@company.com" style={inputStyle("email")} />
            </div>
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"7px" }}>
                <label style={{ fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.07em" }}>Password</label>
                <button type="button" onClick={() => { setMode("reset"); clearForm(); }} style={{ background:"transparent", border:"none", color:P.periwinkleL, fontSize:"15px", fontWeight:700, cursor:"pointer", padding:0 }}>Forgot password?</button>
              </div>
              <div style={{ position:"relative" }}>
                <input type={showPw?"text":"password"} value={password} onChange={e => { setPassword(e.target.value); setError(""); }} onFocus={() => setFocused("password")} onBlur={() => setFocused("")} placeholder="••••••••" style={{ ...inputStyle("password"), paddingRight:"42px" }} />
                <button type="button" onClick={() => setShowPw(s => !s)} style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", color:"rgba(255,255,255,0.3)", cursor:"pointer", fontSize:"15px", padding:0 }}>{showPw?"🙈":"👁"}</button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ width:"100%", background:loading?"rgba(91,109,184,0.5)":`linear-gradient(135deg, ${P.periwinkleD}, ${P.periwinkle})`, border:"none", borderRadius:"10px", padding:"13px", fontSize:"15px", fontWeight:700, fontFamily:font, color:P.white, cursor:loading?"wait":"pointer", marginTop:"4px", boxShadow:loading?"none":"0 2px 12px rgba(69,87,176,0.28)", transition:"all 0.2s" }}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>
        )}

        {/* Sign Up form */}
        {mode === "signup" && !success && (
          <form onSubmit={handleSignUp} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div>
              <label style={{ display:"block", fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"7px" }}>Your Name</label>
              <input type="text" value={name} onChange={e => { setName(e.target.value); setError(""); }} onFocus={() => setFocused("name")} onBlur={() => setFocused("")} placeholder="First Name Last Name" style={inputStyle("name")} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"7px" }}>Email</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} onFocus={() => setFocused("email")} onBlur={() => setFocused("")} placeholder="you@company.com" style={inputStyle("email")} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"7px" }}>Password <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(min. 8 characters)</span></label>
              <div style={{ position:"relative" }}>
                <input type={showPw?"text":"password"} value={password} onChange={e => { setPassword(e.target.value); setError(""); }} onFocus={() => setFocused("password")} onBlur={() => setFocused("")} placeholder="Create a strong password" style={{ ...inputStyle("password"), paddingRight:"42px" }} />
                <button type="button" onClick={() => setShowPw(s => !s)} style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", color:"rgba(255,255,255,0.3)", cursor:"pointer", fontSize:"15px", padding:0 }}>{showPw?"🙈":"👁"}</button>
              </div>
              {password.length > 0 && password.length < 8 && (
                <div style={{ fontSize:"15px", color:"rgba(192,57,43,0.8)", marginTop:"5px" }}>Password too short ({password.length}/8)</div>
              )}
            </div>
            <button type="submit" disabled={loading}
              style={{ width:"100%", background:loading?"rgba(0,201,177,0.3)":P.accent, border:"none", borderRadius:"10px", padding:"13px", fontSize:"15px", fontWeight:700, fontFamily:font, color:P.white, cursor:loading?"wait":"pointer", marginTop:"4px", boxShadow:loading?"none":"0 2px 12px rgba(0,201,177,0.3)", transition:"all 0.2s" }}>
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>
        )}

        {/* Password Reset form */}
        {mode === "reset" && !success && (
          <form onSubmit={handleReset} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div>
              <label style={{ display:"block", fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"7px" }}>Email Address</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} onFocus={() => setFocused("email")} onBlur={() => setFocused("")} placeholder="you@company.com" style={inputStyle("email")} />
            </div>
            <button type="submit" disabled={loading}
              style={{ width:"100%", background:loading?"rgba(91,109,184,0.5)":`linear-gradient(135deg, ${P.periwinkleD}, ${P.periwinkle})`, border:"none", borderRadius:"10px", padding:"13px", fontSize:"15px", fontWeight:700, fontFamily:font, color:P.white, cursor:loading?"wait":"pointer", boxShadow:loading?"none":"0 2px 12px rgba(69,87,176,0.28)", transition:"all 0.2s" }}>
              {loading ? "Sending…" : "Send Reset Link →"}
            </button>
            <button type="button" onClick={() => { setMode("signin"); clearForm(); }}
              style={{ background:"transparent", border:"none", color:"rgba(255,255,255,0.35)", fontSize:"15px", fontWeight:600, cursor:"pointer", fontFamily:font, padding:"4px" }}>
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* What you get when signed in */}
        {mode !== "reset" && !success && (
          <div style={{ marginTop:"32px" }}>
            <div style={{ fontSize:"15px", fontWeight:800, color:"rgba(255,255,255,0.25)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"14px" }}>When signed in you get</div>
            {[
              { icon:<FileSpreadsheet size={14} strokeWidth={1.8}/>, label:"Save & restore projects across sessions" },
              { icon:<Mail size={14} strokeWidth={1.8}/>, label:"Custom email templates saved to your account" },
              { icon:<Users size={14} strokeWidth={1.8}/>, label:"Contacts & planner preferences synced" },
              { icon:<BarChart2 size={14} strokeWidth={1.8}/>, label:"Event history and past cross-checks" },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px" }}>
                <div style={{ width:30, height:30, borderRadius:"9px", background:"rgba(123,143,212,0.15)", border:"1px solid rgba(123,143,212,0.25)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{icon}</div>
                <span style={{ fontSize:"15px", color:"rgba(255,255,255,0.45)", fontWeight:600, lineHeight:1.4 }}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding:"16px 28px", borderTop:"1px solid rgba(255,255,255,0.07)", flexShrink:0 }}>
        <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.18)", textAlign:"center" }}>© 2026 GroupGrid · Built for event professionals · {APP_VERSION}</div>
      </div>
    </div>
  );
}
