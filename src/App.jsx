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
  if (!authUser) return <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, fontFamily: "'SF Pro Display',-apple-system,sans-serif" }}><div style={{ fontSize: 24, fontWeight: 800, color: T.t }}>rkrt<span style={{ color: T.a }}>.in</span></div><a href="/login.html" style={{ padding: "14px 32px", borderRadius: 10, background: T.a, color: "#000", fontSize: 16, fontWeight: 700, textDecoration: "none" }}>Log In</a><a href="/signup.html" style={{ fontSize: 14, color: T.s, textDecoration: "none" }}>Don't have an account? Sign up</a></div>;
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
        {view === "home" && <Dash leads={leads} profile={effectiveProfile} activity={activity} recentLeads={leads.slice(0, 5)} userId={effectiveUserId} onNavigate={setViewWithHistory} onSelectLead={handleSelectLead} askRueInline={askRueInline} chartsReady={chartsLoaded} BarChart={BarChart} Bar={Bar} XAxis={XAxis} YAxis={YAxis} ResponsiveContainer={ResponsiveContainer} Cell={Cell} />}
        {view === "pipeline" && <>{!authLoading && !isPro && <div style={{ background: '#F59E0B15', border: '1px solid #F59E0B40', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><div><span style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B' }}>⚠️ Free Plan: </span><span style={{ fontSize: 13, color: T.s }}>{leads.length} of {limits.leadLimit} leads used · Upgrade for unlimited</span></div><div onClick={() => startCheckout({ priceId: STRIPE_PRICES.recruiter, plan: 'recruiter' })} style={{ padding: '8px 16px', borderRadius: 8, background: '#F59E0B', color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Upgrade →</div></div>}<Pipeline leads={leads} onSelectLead={handleSelectLead} onNavigate={setViewWithHistory} askRueInline={askRueInline} search={search} setSearch={setSearch} onTriggerDraftEmail={() => setAutoDraftEmail(true)} /></>}
        {view === "crm" && <>{!authLoading && !isPro && <div style={{ background: '#F59E0B15', border: '1px solid #F59E0B40', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><div><span style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B' }}>⚠️ Free Plan: </span><span style={{ fontSize: 13, color: T.s }}>{leads.length} of {limits.leadLimit} leads used · Upgrade for unlimited</span></div><div onClick={() => startCheckout({ priceId: STRIPE_PRICES.recruiter, plan: 'recruiter' })} style={{ padding: '8px 16px', borderRadius: 8, background: '#F59E0B', color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Upgrade →</div></div>}<CRM leads={leads} onSelectLead={handleSelectLead} onNavigate={setViewWithHistory} askRueInline={askRueInline} userId={effectiveUserId} profile={effectiveProfile} onBulkDelete={(ids) => setLeads(p => p.filter(l => !ids.includes(l.id)))} /></>}
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
      <RueDrawer open={rueDrawerOpen} onClose={() => setRueDrawerOpen(false)} profile={effectiveProfile} leads={leads} userId={effectiveUserId} />
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
