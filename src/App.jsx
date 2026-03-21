import { AppProvider, useApp } from './context/AppContext';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY, logActivity } from './lib/supabase';
import { startCheckout } from './lib/supabase';
import { STRIPE_PRICES } from './lib/constants';
import T from './lib/theme';

// Feature components
import Dash from './features/dashboard';
import Pipeline from './features/pipeline';
import CRM from './features/crm';
import LeadPage from './features/leads';
import AgentDirectory from './features/agents';
import ContentTab from './features/content';
import ProfilePage from './features/profile/ProfilePage';

// Views
import AdminView from './views/AdminView';
import BetaHubView, { BugReporter } from './views/BetaHubView';
import TeamView from './views/TeamView';
import AddLeadView from './views/AddLeadView';
import RueIntakeModal from './views/RueIntakeModal';
import RueInlineChat from './views/RueInlineChat';
import FloatingToolbar from './views/FloatingToolbar';
import GlobalStyles from './views/GlobalStyles';
import ProfileMenu from './views/ProfileMenu';
import Sidebar from './views/Sidebar';

// Shared components
import OnboardingFlow from './features/onboarding';
import BetaIntakeFlow from './components/BetaIntakeFlow';
import RueDrawer from './components/RueDrawer';
import EmailInbox from './components/EmailInbox';
import AgentEnrichment from './components/AgentEnrichment';
import RKRTCommunity from './components/RKRTCommunity';
import { ProGate } from './components/shared';

import { useState, useEffect } from "react";
let BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell;
const rechartsReady = import("recharts").then(m => {
  BarChart = m.BarChart; Bar = m.Bar; XAxis = m.XAxis; YAxis = m.YAxis;
  Tooltip = m.Tooltip; ResponsiveContainer = m.ResponsiveContainer;
  PieChart = m.PieChart; Pie = m.Pie; Cell = m.Cell;
});

export default function App() {
  return <AppProvider><AppShell /></AppProvider>;
}

function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) { setError(err.message); setLoading(false); }
    else setSuccess("Signed in! Loading...");
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: `${firstName} ${lastName}`.trim() } }
    });
    if (err) { setError(err.message); setLoading(false); return; }
    setSuccess("Check your email for a confirmation link!");
    setLoading(false);
  };

  const F = "'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
  const inputStyle = { width: "100%", padding: "14px 16px", background: T.bg, border: `1.5px solid rgba(255,255,255,0.06)`, borderRadius: 10, color: T.t, fontSize: 15, fontFamily: "inherit", outline: "none" };
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: "#4A5568", textTransform: "uppercase", marginBottom: 7 };

  const features = [
    ["🔍", "1.7M+ Agent Directory", "Search every licensed agent by production, market, and brokerage history."],
    ["🤖", "Rue AI Assistant", "Draft outreach, prep objections, research targets in seconds."],
    ["📊", "Pipeline Intelligence", "Track leads, score prospects, and automate follow-ups."],
  ];

  return (
    <div className="auth-split" style={{ display: "flex", minHeight: "100vh", fontFamily: F }}>
      {/* LEFT: Sales pitch */}
      <div className="auth-left" style={{ flex: "0 0 60%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px", background: T.bg, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(0,229,160,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 48, color: T.t }}>rkrt<span style={{ color: T.a }}>.in</span></div>
          <h1 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.15, marginBottom: 16, letterSpacing: -0.5, color: T.t }}>
            Recruit Smarter.<br /><span style={{ color: T.a }}>Close Faster.</span>
          </h1>
          <p style={{ fontSize: 18, color: T.s, lineHeight: 1.6, marginBottom: 48, maxWidth: 520 }}>
            AI-powered recruiting intelligence for real estate brokerages. Find the right agents, craft the perfect pitch, and fill your roster.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 48 }}>
            {features.map(([icon, title, desc], i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{ fontSize: 24, flexShrink: 0, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, background: "rgba(0,229,160,0.08)" }}>{icon}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.t, marginBottom: 3 }}>{title}</div>
                  <div style={{ fontSize: 13, color: T.s, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, color: "#4A5568", marginBottom: 20 }}>
            <span style={{ color: T.s }}>Trusted by recruiters across Florida, Texas, New York & Connecticut</span>
          </div>
          <div style={{ fontSize: 12, color: "#4A5568" }}>Powered by LIVIN Media</div>
        </div>
      </div>

      {/* RIGHT: Auth form */}
      <div className="auth-right" style={{ flex: "0 0 40%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 48px", background: "#0E1420", borderLeft: `1px solid rgba(255,255,255,0.04)`, overflowY: "auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: T.t, marginBottom: 6 }}>
            {mode === "login" ? "Welcome back" : "Start Your Free Trial"}
          </h2>
          <p style={{ fontSize: 15, color: T.s, lineHeight: 1.5 }}>
            {mode === "login" ? "Sign in to your rkrt.in account." : "7 days free. Full access. Cancel anytime."}
          </p>
        </div>

        {error && <div style={{ padding: "12px 16px", borderRadius: 8, fontSize: 14, marginBottom: 18, background: "#F5656510", border: "1px solid #F5656530", color: "#F56565" }}>{error}</div>}
        {success && <div style={{ padding: "12px 16px", borderRadius: 8, fontSize: 14, marginBottom: 18, background: "rgba(0,229,160,0.08)", border: "1px solid rgba(0,229,160,0.2)", color: T.a }}>{success}</div>}

        {!success && (
          <form onSubmit={mode === "login" ? handleLogin : handleSignup}>
            {mode === "signup" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>First Name</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Anthony" required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Last Name</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dazet" style={inputStyle} />
                </div>
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required style={inputStyle} />
            </div>
            <div style={{ marginBottom: mode === "login" ? 8 : 20 }}>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === "login" ? "••••••••" : "At least 8 characters"} required minLength={mode === "signup" ? 8 : undefined} style={inputStyle} />
            </div>
            {mode === "login" && <div style={{ textAlign: "right", marginBottom: 24 }}><span style={{ fontSize: 13, color: T.s, cursor: "pointer" }}>Forgot password?</span></div>}
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: 16, borderRadius: 10, background: T.a, color: "#000", fontSize: 16,
              fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
              opacity: loading ? 0.5 : 1, transition: "all 0.2s",
            }}>
              {loading ? (mode === "login" ? "Signing in..." : "Creating account...") : (mode === "login" ? "Log In" : "Start 7-Day Free Trial →")}
            </button>
          </form>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0", color: "#4A5568", fontSize: 13 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.04)" }} />
          <span>or</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.04)" }} />
        </div>

        <div style={{ textAlign: "center", fontSize: 14, color: T.s }}>
          {mode === "login" ? (
            <>Don't have an account? <span onClick={() => { setMode("signup"); setError(""); setSuccess(""); }} style={{ color: T.a, fontWeight: 600, cursor: "pointer" }}>Start 7-Day Free Trial →</span></>
          ) : (
            <>Already have an account? <span onClick={() => { setMode("login"); setError(""); setSuccess(""); }} style={{ color: T.a, fontWeight: 600, cursor: "pointer" }}>Log in</span></>
          )}
        </div>

        <div style={{ marginTop: 28, padding: 16, background: T.bg, border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10 }}>
          <div style={{ fontSize: 13, color: T.s, lineHeight: 1.6 }}>Start with a <strong style={{ color: T.a, fontWeight: 600 }}>7-day free trial</strong> of the Recruiter plan. Full access to 1.7M+ agents, Rue AI, and unlimited pipeline. No charge for 7 days.</div>
        </div>
      </div>

      <style>{`
        @media(max-width:768px){
          .auth-split { flex-direction: column !important; }
          .auth-left { flex: none !important; padding: 40px 24px 32px !important; }
          .auth-left h1 { font-size: 28px !important; }
          .auth-right { flex: none !important; padding: 32px 24px 48px !important; border-left: none !important; border-top: 1px solid rgba(255,255,255,0.04); }
        }
        @media(max-width:480px){
          .auth-left { padding: 28px 20px 24px !important; }
          .auth-right { padding: 28px 20px 40px !important; }
        }
      `}</style>
    </div>
  );
}

function AppShell() {
  const ctx = useApp();
  const {
    authUser, profile, authLoading, setProfile,
    showOnboarding, showBetaIntake, setShowBetaIntake, showUpgradeSuccess,
    handleOnboardingComplete,
    impersonating, setImpersonating, setRealUser,
    impersonateLoading, setImpersonateLoading,
    effectiveUserId, effectiveProfile,
    leads, setLeads, activity, loading, load, recentLeads,
    selLead, setSelLead, selLeadRef, pendingLeadId,
    handleSelectLead, handleDeleteLead,
    view, setViewWithHistory, search, setSearch,
    autoDraftEmail, setAutoDraftEmail,
    inlineResponse, setInlineResponse, inlineLoading, inlineChatHistory, setInlineChatHistory,
    askRueInline,
    rueIntakeToast,
    isPro, limits, isBeta, setChartsReady,
    newLead, setNewLead, saveLead, savingLead, canSaveLead,
    enrichAgent, setEnrichAgent, previewUrl, setPreviewUrl,
    sidebarOpen, setSidebarOpen, profileMenuOpen, setProfileMenuOpen,
    rueDrawerOpen, setRueDrawerOpen, notifOpen, setNotifOpen,
  } = ctx;

  const [chartsLoaded, setChartsLoaded] = useState(false);
  useEffect(() => { rechartsReady.then(() => { setChartsLoaded(true); setChartsReady(true); }); }, []);

  const renderRueResponse = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    const renderBold = (str, kp) => str.split(/\*\*(.+?)\*\*/g).map((p, i) => i % 2 === 1 ? <strong key={`${kp}-b${i}`}>{p}</strong> : p);
    return lines.map((line, li) => {
      const segments = []; let remaining = line;
      const matched = leads.filter(l => { const n = `${l.first_name} ${l.last_name}`.trim(); return n.length > 3 && remaining.includes(n); });
      matched.sort((a, b) => remaining.indexOf(`${a.first_name} ${a.last_name}`) - remaining.indexOf(`${b.first_name} ${b.last_name}`));
      let idx = 0;
      for (const lead of matched) {
        const name = `${lead.first_name} ${lead.last_name}`;
        const pos = remaining.indexOf(name);
        if (pos === -1) continue;
        if (pos > 0) segments.push(<span key={`${li}-${idx++}`}>{renderBold(remaining.slice(0, pos), `${li}-${idx}`)}</span>);
        segments.push(<span key={`${li}-lead-${lead.id}`} onClick={() => { handleSelectLead(lead); setViewWithHistory("lead"); }} style={{ color: T.a, cursor: "pointer", textDecoration: "underline", fontWeight: 700 }}>{name}</span>);
        remaining = remaining.slice(pos + name.length);
      }
      if (remaining) segments.push(<span key={`${li}-tail`}>{renderBold(remaining, `${li}-tail`)}</span>);
      return (<span key={li}>{segments.length > 0 ? segments : renderBold(line, `${li}`)}{li < lines.length - 1 && <br />}</span>);
    });
  };

  if (authLoading) return <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", color: T.s, fontSize: 18, fontFamily: "'SF Pro Display',-apple-system,sans-serif" }}>Authenticating…</div>;
  if (!authUser) return <AuthScreen />;
  if (showBetaIntake && authUser) return <BetaIntakeFlow userId={authUser.id} profile={profile} supabase={supabase} onComplete={(data) => { setProfile(p => ({ ...p, ...data })); setShowBetaIntake(false); logActivity(authUser.id, 'onboarding_complete'); }} />;
  if (showOnboarding && authUser) return <OnboardingFlow userId={authUser.id} email={authUser.email} onComplete={handleOnboardingComplete} />;

  return (<>
    <div style={{ minHeight: "100vh", background: T.bg, color: T.t, fontFamily: "'SF Pro Display',-apple-system,sans-serif", display: "flex", position: "relative", paddingTop: impersonating ? 42 : 0 }}>
      {showUpgradeSuccess && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: T.a, color: "#000", padding: "14px 32px", borderRadius: 10, fontSize: 15, fontWeight: 800, boxShadow: "0 4px 24px rgba(0,229,160,0.4)" }}>🎉 Welcome to RKRT.in Pro! All features unlocked.</div>}
      {rueIntakeToast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: T.a, color: "#000", padding: "14px 32px", borderRadius: 10, fontSize: 15, fontWeight: 800, boxShadow: "0 4px 24px rgba(0,229,160,0.4)" }}>🤖 Rue is ready to coach you!</div>}
      {impersonating && <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, background: "#F59E0B", color: "#000", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontSize: 14, fontWeight: 700 }}>
        <span>👁 Viewing as {impersonating.full_name} ({impersonating.email}) — {impersonating.plan} plan</span>
        <span onClick={() => { setImpersonating(null); setRealUser(null); setViewWithHistory("admin"); }} style={{ padding: "4px 14px", borderRadius: 6, background: "rgba(0,0,0,0.2)", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>✕ Exit</span>
      </div>}
      <RueIntakeModal ctx={ctx} />
      <GlobalStyles />
      {sidebarOpen && <div onClick={() => { setSidebarOpen(false); setProfileMenuOpen(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999 }} />}
      {notifOpen && <div onClick={() => setNotifOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 1099 }} />}
      {profileMenuOpen && <div onClick={() => setProfileMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 1099 }} />}
      <ProfileMenu ctx={ctx} />
      <Sidebar ctx={ctx} />
      <div className="main-scroll" style={{ flex: 1, overflow: "auto", padding: (view === "lead" || view === "addlead") ? "0 0 80px 0" : "24px 32px 80px 32px" }}>
        {view !== "lead" && view !== "addlead" && <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="hamburger-btn" onClick={() => setSidebarOpen(v => !v)} style={{ display: "none", width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center", fontSize: 22, cursor: "pointer", background: T.card, border: `1px solid ${T.b}`, color: T.t, flexShrink: 0 }}>☰</div>
          </div>
          {effectiveProfile?.brokerage && view === "home" && <div style={{ fontSize: 13, color: T.s, padding: "6px 12px", borderRadius: 6, background: T.card, border: `1px solid ${T.b}` }}>🏢 <span style={{ color: T.t, fontWeight: 600 }}>{effectiveProfile.brokerage}</span> · {effectiveProfile.market || "No market set"}</div>}
        </div>}
        <RueInlineChat ctx={ctx} renderRueResponse={renderRueResponse} />
        {view === "home" && <Dash leads={leads} profile={effectiveProfile} activity={activity} recentLeads={leads.slice(0, 5)} userId={effectiveUserId} onNavigate={setViewWithHistory} onSelectLead={handleSelectLead} askRueInline={askRueInline} onOpenRue={() => setRueDrawerOpen(true)} chartsReady={chartsLoaded} BarChart={BarChart} Bar={Bar} XAxis={XAxis} YAxis={YAxis} ResponsiveContainer={ResponsiveContainer} Cell={Cell} />}
        {view === "pipeline" && <>{!authLoading && !isPro && <div style={{ background: '#F59E0B15', border: '1px solid #F59E0B40', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><div><span style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B' }}>⚠️ Free Plan: </span><span style={{ fontSize: 13, color: T.s }}>{leads.length} of {limits.leadLimit} leads used · Start free trial for unlimited</span></div><div onClick={() => startCheckout({ priceId: STRIPE_PRICES.recruiter, plan: 'recruiter' })} style={{ padding: '8px 16px', borderRadius: 8, background: '#F59E0B', color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Start Free Trial →</div></div>}<Pipeline leads={leads} onSelectLead={handleSelectLead} onNavigate={setViewWithHistory} askRueInline={askRueInline} search={search} setSearch={setSearch} onTriggerDraftEmail={() => setAutoDraftEmail(true)} /></>}
        {view === "crm" && <>{!authLoading && !isPro && <div style={{ background: '#F59E0B15', border: '1px solid #F59E0B40', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><div><span style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B' }}>⚠️ Free Plan: </span><span style={{ fontSize: 13, color: T.s }}>{leads.length} of {limits.leadLimit} leads used · Start free trial for unlimited</span></div><div onClick={() => startCheckout({ priceId: STRIPE_PRICES.recruiter, plan: 'recruiter' })} style={{ padding: '8px 16px', borderRadius: 8, background: '#F59E0B', color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Start Free Trial →</div></div>}<CRM leads={leads} onSelectLead={handleSelectLead} onNavigate={setViewWithHistory} askRueInline={askRueInline} userId={effectiveUserId} profile={effectiveProfile} onBulkDelete={(ids) => setLeads(p => p.filter(l => !ids.includes(l.id)))} /></>}
        {view === "agents" && <ProGate feature="Agent Directory" userId={effectiveUserId} userProfile={effectiveProfile}><AgentDirectory userId={effectiveUserId} userProfile={effectiveProfile} onAddLead={(data) => { if (data?.id) { load(); handleSelectLead(data); setViewWithHistory("lead"); } else { setNewLead(prev => ({ ...prev, ...data })); setViewWithHistory("addlead"); } }} onEnrich={(agent) => setEnrichAgent(agent)} /></ProGate>}
        {enrichAgent && <AgentEnrichment supabase={supabase} agent={enrichAgent} userId={authUser?.id} profile={profile} onClose={() => setEnrichAgent(null)} onLeadAdded={() => setEnrichAgent(null)} />}
        {view === "content" && <ContentTab userId={effectiveUserId} userProfile={effectiveProfile} />}
        {view === "inbox" && <EmailInbox supabase={supabase} userId={authUser?.id} profile={effectiveProfile} />}
        {view === "community" && <RKRTCommunity userId={effectiveUserId} profile={effectiveProfile} supabase={supabase} />}
        {view === "team" && effectiveProfile?.team_id && <TeamView supabase={supabase} userId={effectiveUserId} profile={effectiveProfile} />}
        {view === "admin" && !impersonating && profile?.role === "owner" && <AdminView supabase={supabase} authUser={authUser} profile={profile} impersonating={impersonating} setImpersonating={setImpersonating} setRealUser={setRealUser} impersonateLoading={impersonateLoading} setImpersonateLoading={setImpersonateLoading} setViewWithHistory={setViewWithHistory} setProfile={setProfile} setPreviewUrl={setPreviewUrl} SUPABASE_URL={SUPABASE_URL} SUPABASE_ANON_KEY={SUPABASE_ANON_KEY} />}
        {view === "beta" && isBeta && <BetaHubView supabase={supabase} authUser={authUser} profile={profile} />}
        {view === "profile" && <ProfilePage profile={effectiveProfile} userId={effectiveUserId} leads={leads} onProfileUpdate={ctx.loadProfile} />}
        {view === "lead" && !selLead && <div style={{ padding: 40, textAlign: "center" }}>{pendingLeadId ? <p style={{ color: "#8B949E" }}>Loading lead…</p> : <><p style={{ color: "#8B949E" }}>No lead selected.</p><div onClick={() => setViewWithHistory("pipeline")} style={{ color: "#00B386", cursor: "pointer", marginTop: 8 }}>← Back to Pipeline</div></>}</div>}
        {view === "lead" && selLead && <LeadPage lead={selLead} onBack={() => { setSelLead(null); selLeadRef.current = null; setViewWithHistory("pipeline"); }} onAskInline={askRueInline} onClearInline={() => { setInlineResponse(null); setInlineChatHistory([]); }} inlineResponse={inlineResponse} inlineLoading={inlineLoading} userId={effectiveUserId} onDelete={handleDeleteLead} userProfile={effectiveProfile} autoDraftEmail={autoDraftEmail} onAutoDraftConsumed={() => setAutoDraftEmail(false)} />}
        {view === "addlead" && <AddLeadView newLead={newLead} setNewLead={setNewLead} canSaveLead={canSaveLead} savingLead={savingLead} saveLead={saveLead} onBack={() => setViewWithHistory("home")} />}
      </div>
      <RueDrawer open={rueDrawerOpen} onClose={() => setRueDrawerOpen(false)} profile={effectiveProfile} leads={leads} userId={effectiveUserId} autoOpen={leads.length === 0} />
      {previewUrl && <div style={{ position: "fixed", top: 0, right: 0, width: "60%", height: "100vh", zIndex: 1000, background: T.card, borderLeft: `1px solid ${T.b}`, display: "flex", flexDirection: "column", boxShadow: "-4px 0 30px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid ${T.b}`, flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.t, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 12 }}>{previewUrl}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div onClick={() => window.open(previewUrl, "_blank")} style={{ padding: "6px 14px", borderRadius: 6, background: T.d, border: `1px solid ${T.b}`, color: T.s, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>↗ Open in Tab</div>
            <div onClick={() => setPreviewUrl(null)} style={{ padding: "6px 14px", borderRadius: 6, background: T.r + "15", border: `1px solid ${T.r}20`, color: T.r, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✕ Close</div>
          </div>
        </div>
        <iframe src={previewUrl} style={{ width: "100%", flex: 1, border: "none", background: "#fff" }} />
      </div>}
      {isBeta && <BugReporter supabase={supabase} authUser={authUser} profile={profile} />}
    </div>
    <FloatingToolbar ctx={ctx} />
  </>);
}
