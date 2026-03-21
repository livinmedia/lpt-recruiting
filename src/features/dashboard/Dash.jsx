// RKRT.in Dashboard Feature
// Extracted from App.jsx for scalable architecture

import { useState, useEffect } from 'react';
import T from '../../lib/theme';
import { STAGES } from '../../lib/constants';
import { ago } from '../../lib/utils';
import { Pill, UPill, TPill, Dot } from '../../components/ui/Pill';
import { Gauge } from '../../components/ui/Gauge';
import { supabase } from '../../lib/supabase';

const HEAT_COLOR = { cold: "#2A3345", warming: "#3B82F6", interested: "#F59E0B", hot: "#f97316", on_fire: "#F43F5E" };
const HEAT_ICON = { cold: "❄️", warming: "🌡️", interested: "🔥", hot: "🔥🔥", on_fire: "🔥🔥🔥" };

export default function Dash({
  leads = [],
  profile = {},
  activity = [],
  recentLeads = [],
  userId = null,
  onNavigate = () => {},
  onSelectLead = () => {},
  askRueInline = () => {},
  onOpenRue = () => {},
  inlineLoading = false,
  chartsReady = false,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
}) {
  const [scoreAlerts, setScoreAlerts] = useState([]);

  useEffect(() => {
    if (!userId) return;
    supabase.from('lead_score_alerts').select('*').eq('user_id', userId).eq('read', false).order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => { if (data) setScoreAlerts(data); });
  }, [userId]);

  const dismissAlert = async (alertId) => {
    setScoreAlerts(prev => prev.filter(a => a.id !== alertId));
    await supabase.from('lead_score_alerts').update({ read: true }).eq('id', alertId);
  };
  // Computed values
  const total = leads.length;
  const targets = leads.filter(l => l.brokerage && !l.brokerage.toLowerCase().includes("lpt")).length;
  const urgent = leads.filter(l => l.urgency === "HIGH").length;
  const today = leads.filter(l => l.created_at && new Date(l.created_at).toDateString() === new Date().toDateString()).length;
  const cpl = total > 0 ? (20 / total).toFixed(2) : "—";

  const needsFollowUp = leads.filter(l => l.pipeline_stage && l.pipeline_stage !== "new" && l.pipeline_stage !== "recruited" && l.created_at && (Date.now() - new Date(l.created_at)) > 3 * 86400000);
  const needsResearch = leads.filter(l => l.pipeline_stage === "new");
  const hasMeeting = leads.filter(l => l.pipeline_stage === "meeting_booked");
  const inOutreach = leads.filter(l => l.pipeline_stage === "outreach_sent");

  const pScore = Math.min(100, Math.round((total > 0 ? 25 : 0) + (targets > 0 ? 25 : 0) + (leads.some(l => l.pipeline_stage === "outreach_sent") ? 25 : 0) + (leads.some(l => l.pipeline_stage === "meeting_booked") ? 25 : 0)));
  const stages = STAGES.map(s => ({ ...s, count: leads.filter(l => l.pipeline_stage === s.id).length }));

  // Rue AI prompts
  const ruePrompts = [
    ["🎯", "Who to Call", `Who should I call first today? Look at my pipeline and tell me the highest priority lead.${profile?.brokerage ? " I recruit for " + profile.brokerage : ""}`, T.a],
    ["📱", "Draft a DM", `Draft a compelling recruiting DM for my hottest pipeline lead right now.${profile?.brokerage ? " Context: I'm at " + profile.brokerage : ""}`, T.bl],
    ["🔍", "Find Agents", `Find me 5 real estate agents${profile?.market ? " in " + profile.market : ""} who might be looking to switch brokerages. Include their likely objections.`, T.p],
    ["📋", "Weekly Plan", `Create a detailed recruiting game plan for this week based on my current pipeline stage counts.${profile?.brokerage ? " I'm at " + profile.brokerage : ""}`, T.y],
  ];

  // Navigation quick actions (distinct from Rue prompts)
  const navActions = [
    ["➕", "Add Lead", () => onNavigate("addlead"), T.a],
    ["📊", "Pipeline", () => onNavigate("pipeline"), T.bl],
    ["💬", "CRM", () => onNavigate("crm"), T.p],
    ["✨", "Content", () => onNavigate("content"), T.y],
  ];

  // Sorted leads by interest_score
  const scoredLeads = [...leads].filter(l => (l.interest_score || 0) > 0).sort((a, b) => (b.interest_score || 0) - (a.interest_score || 0));

  const isNewUser = total === 0;
  const isTrial = profile?.is_trial === true;
  const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const trialDaysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds - Date.now()) / 86400000)) : 0;
  const hasTargets = leads.some(l => l.pipeline_stage === "outreach_sent" || l.pipeline_stage === "meeting_booked");

  return (
    <>
      {/* Lead Score Alert Banners */}
      {scoreAlerts.map(alert => (
        <div key={alert.id} style={{ marginBottom: 12, borderRadius: 10, padding: "14px 18px", background: "linear-gradient(90deg, #F43F5E, #f97316)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#fff" }}>{alert.message}</div>
          {alert.lead_id && (
            <div
              onClick={() => { const l = leads.find(x => x.id === alert.lead_id); if(l){onSelectLead(l);onNavigate("lead");} }}
              style={{ padding: "6px 14px", borderRadius: 7, background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
            >
              View Lead →
            </div>
          )}
          <div onClick={() => dismissAlert(alert.id)} style={{ fontSize: 18, color: "rgba(255,255,255,0.8)", cursor: "pointer", flexShrink: 0, lineHeight: 1 }}>✕</div>
        </div>
      ))}

      {/* Trial Status Banner */}
      {isTrial && (
        <div style={{ background: `linear-gradient(90deg, ${T.a}12, ${T.bl}12)`, border: `1.5px solid ${T.a}30`, borderRadius: 12, padding: "16px 22px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.t }}>🎉 Your 7-day free trial is active</div>
            <div style={{ fontSize: 13, color: "#B0BCCD", marginTop: 2 }}>{trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining — full access to all features</div>
          </div>
          <div style={{ padding: "8px 18px", borderRadius: 8, background: T.a, color: "#000", fontSize: 13, fontWeight: 700, cursor: "default" }}>Trial Active</div>
        </div>
      )}

      {/* Team Blog Card — for team_leader and regional_operator */}
      {(profile?.plan === "team_leader" || profile?.plan === "regional_operator" || profile?.role === "owner") && profile?.team_id && (
        <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 28 }}>📰</div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.t }}>Your Team Blog</div>
            <div style={{ fontSize: 13, color: T.s }}>{profile?.brokerage || "Your team"} · Recruiting content powered by RKRT</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <div onClick={() => onNavigate("content")} style={{ padding: "8px 16px", borderRadius: 8, background: T.d, border: `1px solid ${T.b}`, color: T.s, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Write Article</div>
            <div onClick={() => window.open(`https://rkrt.in/team/${(profile?.brokerage || "team").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")}`, "_blank")} style={{ padding: "8px 16px", borderRadius: 8, background: T.a, color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>View Blog →</div>
          </div>
        </div>
      )}

      {/* Getting Started Card — shown for new users with 0 leads */}
      {isNewUser && (
        <div style={{ background: "linear-gradient(135deg, #0B0F17, #101828)", border: `1.5px solid ${T.a}30`, borderRadius: 14, padding: "28px 30px", marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.t, marginBottom: 6 }}>Welcome to RKRT{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!</div>
          <div style={{ fontSize: 15, color: "#B0BCCD", marginBottom: 24, lineHeight: 1.6 }}>
            {isTrial ? "Your trial is live — you have full access. Let's make the most of it." : "Let's get your recruiting pipeline started. Complete these 3 steps to land your first recruit."}
          </div>
          <div className="getting-started-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {[
              {
                icon: "🔍", title: "Find Your First Targets", desc: "Search the agent directory for top producers in your market.",
                action: () => onNavigate("agents"), color: T.a, cta: "Open Directory →",
              },
              {
                icon: "💬", title: "Talk to Rue", desc: `Ask Rue to find top producers${profile?.market ? " in " + profile.market : ""} ready to switch.`,
                action: () => onOpenRue(), color: T.bl, cta: "Open Rue →",
              },
              {
                icon: "📧", title: "Draft Your First Outreach", desc: "Create a personalized recruiting message for your top target.",
                action: () => onNavigate("pipeline"), color: T.p, cta: "Go to Pipeline →",
              },
            ].map((step, i) => (
              <div
                key={i}
                onClick={step.action}
                style={{
                  background: step.color + "08", border: `1.5px solid ${step.color}25`,
                  borderRadius: 12, padding: "22px 20px", cursor: "pointer",
                  transition: "all 0.2s", position: "relative",
                }}
                onMouseOver={ev => { ev.currentTarget.style.background = step.color + "18"; ev.currentTarget.style.borderColor = step.color + "50"; ev.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseOut={ev => { ev.currentTarget.style.background = step.color + "08"; ev.currentTarget.style.borderColor = step.color + "25"; ev.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ fontSize: 11, color: step.color, fontWeight: 800, letterSpacing: 1.5, marginBottom: 10 }}>STEP {i + 1}</div>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{step.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.t, marginBottom: 6 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: "#B0BCCD", lineHeight: 1.5, marginBottom: 14 }}>{step.desc}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: step.color }}>{step.cta}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🔥 Hottest Leads Podium */}
      {(() => {
        const ranked = [...scoredLeads].sort((a, b) => (b.interest_score || 0) - (a.interest_score || 0));
        const top3 = ranked.slice(0, 3);
        const rest = ranked.slice(3, 10);
        const hotCount = scoredLeads.filter(l => l.heat_level === "hot" || l.heat_level === "on_fire").length;
        const warmCount = scoredLeads.filter(l => l.heat_level === "warming" || l.heat_level === "interested").length;
        const coldCount = scoredLeads.filter(l => !l.heat_level || l.heat_level === "cold").length;
        const MEDAL = ["🥇", "🥈", "🥉"];
        const MEDAL_BORDER = ["#FFD700", "#C0C0C0", "#CD7F32"];
        const MEDAL_GLOW = ["rgba(255,215,0,0.25)", "rgba(192,192,192,0.15)", "rgba(205,127,50,0.15)"];
        const MEDAL_SCORE_SIZE = [48, 36, 36];
        return (
          <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "24px 26px", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: T.t }}>🔥 Hottest Leads</span>
              <span onClick={() => onNavigate("pipeline")} style={{ fontSize: 12, color: T.a, cursor: "pointer", fontWeight: 600 }}>View All →</span>
            </div>
            {scoredLeads.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 16px", color: "#8B949E" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: "#B0BCCD" }}>No lead activity yet. Share your recruiting links and content to start tracking engagement.</div>
              </div>
            ) : (
              <>
                <div className="hottest-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
                  {[
                    { label: "Total Leads", value: scoredLeads.length, color: T.a },
                    { label: "Hot Leads", value: hotCount, color: "#FF4444" },
                    { label: "Warming", value: warmCount, color: "#FF8C00" },
                    { label: "Cold", value: coldCount, color: "#8B949E" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: T.d, border: `1px solid ${T.b}`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
                      <div style={{ fontSize: 11, color: "#8B949E", marginTop: 3, fontWeight: 600, letterSpacing: 0.5 }}>{label}</div>
                    </div>
                  ))}
                </div>
                {top3.length > 0 && (
                  <div className="hottest-podium" style={{ display: "grid", gridTemplateColumns: `repeat(${top3.length}, 1fr)`, gap: 12, marginBottom: 20 }}>
                    {top3.map((l, i) => {
                      const heatColor = HEAT_COLOR[l.heat_level] || T.b;
                      const heatIcon = HEAT_ICON[l.heat_level] || "❄️";
                      const isToday = l.last_activity_at && new Date(l.last_activity_at).toDateString() === new Date().toDateString();
                      return (
                        <div key={i} onClick={() => { onSelectLead(l); onNavigate("lead"); }}
                          style={{ background: T.d, border: `1.5px solid ${MEDAL_BORDER[i]}`, borderRadius: 12, padding: "18px 16px", cursor: "pointer", textAlign: "center", boxShadow: `0 0 18px ${MEDAL_GLOW[i]}`, transition: "transform 0.15s", position: "relative" }}
                          onMouseOver={ev => ev.currentTarget.style.transform = "translateY(-2px)"}
                          onMouseOut={ev => ev.currentTarget.style.transform = "translateY(0)"}
                        >
                          <div style={{ position: "absolute", top: 10, left: 12, fontSize: 18 }}>{MEDAL[i]}</div>
                          <div style={{ fontSize: MEDAL_SCORE_SIZE[i], fontWeight: 900, color: MEDAL_BORDER[i], lineHeight: 1, marginBottom: 8, marginTop: 8 }}>{l.interest_score || 0}</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: T.t, marginBottom: 3 }}>{l.first_name} {l.last_name}</div>
                          <div style={{ fontSize: 12, color: T.s, marginBottom: 8 }}>{(l.brokerage_name || l.brokerage || "Unknown").substring(0, 22)}</div>
                          <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: heatColor + "22", border: `1px solid ${heatColor}44`, color: heatColor, fontWeight: 700 }}>{heatIcon} {(l.heat_level || "cold").replace(/_/g, " ")}</span>
                            {l.last_activity_at && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: T.b + "30", color: "#8B949E", fontWeight: 600 }}>{isToday ? "Active today" : ago(l.last_activity_at)}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {rest.length > 0 && (
                  <div style={{ borderTop: `1px solid ${T.b}`, paddingTop: 16 }}>
                    {rest.map((l, i) => {
                      const heatColor = HEAT_COLOR[l.heat_level] || T.b;
                      const heatIcon = HEAT_ICON[l.heat_level] || "❄️";
                      const isToday = l.last_activity_at && new Date(l.last_activity_at).toDateString() === new Date().toDateString();
                      return (
                        <div key={i} onClick={() => { onSelectLead(l); onNavigate("lead"); }}
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 10px", borderRadius: 8, marginBottom: 4, cursor: "pointer", transition: "background 0.1s" }}
                          onMouseOver={ev => ev.currentTarget.style.background = T.d}
                          onMouseOut={ev => ev.currentTarget.style.background = "transparent"}
                        >
                          <span style={{ fontSize: 12, color: "#8B949E", fontWeight: 800, minWidth: 22, textAlign: "center" }}>#{i + 4}</span>
                          <span style={{ fontSize: 14, flexShrink: 0 }}>{heatIcon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: T.t, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.first_name} {l.last_name}</div>
                            <div style={{ fontSize: 11, color: T.s }}>{(l.brokerage_name || l.brokerage || "Unknown").substring(0, 28)}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <div style={{ padding: "3px 9px", borderRadius: 20, background: heatColor + "22", border: `1px solid ${heatColor}44`, fontSize: 12, fontWeight: 800, color: heatColor }}>{l.interest_score || 0}</div>
                            <div style={{ fontSize: 10, color: "#8B949E", minWidth: 60, textAlign: "right" }}>{isToday ? "Today" : l.last_activity_at ? ago(l.last_activity_at) : "—"}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* Rue Quick Actions */}
      <div className="ask-rue-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${ruePrompts.length},1fr)`, gap: 12, marginBottom: 20 }}>
        {ruePrompts.map(([icon, label, q, c], i) => (
          <div
            key={i}
            onClick={() => askRueInline(q)}
            style={{
              background: (c || T.bl) + "12",
              border: `1.5px solid ${(c || T.bl)}30`,
              borderRadius: 10,
              padding: "18px 20px",
              cursor: inlineLoading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
              opacity: inlineLoading ? 0.5 : 1,
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => { if (!inlineLoading) { e.currentTarget.style.background = (c || T.bl) + "28"; e.currentTarget.style.borderColor = (c || T.bl) + "50"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
            onMouseOut={(e) => { e.currentTarget.style.background = (c || T.bl) + "12"; e.currentTarget.style.borderColor = (c || T.bl) + "30"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <span style={{ fontSize: 24 }}>{icon}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.t }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Brokerage Banner */}
      {profile?.brokerage && profile.brokerage !== "LPT Realty" && (
        <div style={{ background: T.bl + "10", border: `1px solid ${T.bl}20`, borderRadius: 10, padding: "12px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18 }}>🎯</span>
          <div style={{ flex: 1, fontSize: 13, color: "#B0BCCD" }}>
            RUE is targeting <strong style={{ color: T.t }}>{profile.brokerage}</strong> agents in <strong style={{ color: T.t }}>{profile.market || "your market"}</strong>
          </div>
          <div onClick={() => onNavigate("profile")} style={{ fontSize: 12, color: T.bl, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Edit →</div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
        {[
          ["◎", "Leads", total, today > 0 ? `+${today} today` : "", T.bl],
          ["🎯", "Targets", targets, urgent > 0 ? `${urgent} hot` : "", T.a],
          ["💰", "CPL", `$${cpl}`, "$20/day", T.y],
          ["📅", "Meetings", hasMeeting.length, inOutreach.length > 0 ? `${inOutreach.length} awaiting` : "", T.p]
        ].map(([ic, l, v, s, c], i) => (
          <div key={i} className="kpi-card" style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "22px 24px", display: "flex", alignItems: "center", gap: 16 }}>
            <div className="kpi-icon" style={{ width: 52, height: 52, borderRadius: 10, background: c + "10", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{ic}</div>
            <div>
              <div className="kpi-label" style={{ fontSize: 13, color: "#B0BCCD", letterSpacing: 2, fontWeight: 700 }}>{l.toUpperCase()}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span className="kpi-val" style={{ fontSize: 32, fontWeight: 800, color: T.t }}>{v}</span>
                {s && <span className="kpi-sub" style={{ fontSize: 14, color: c, fontWeight: 600 }}>{s}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Nav Quick Actions */}
      <div className="quick-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {navActions.map(([ic, label, action, c], i) => (
          <div
            key={i}
            onClick={action}
            style={{ background: c + "12", border: `1.5px solid ${c}25`, borderRadius: 10, padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s" }}
            onMouseOver={ev => { ev.currentTarget.style.background = c + "28"; ev.currentTarget.style.borderColor = c + "50"; ev.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseOut={ev => { ev.currentTarget.style.background = c + "12"; ev.currentTarget.style.borderColor = c + "25"; ev.currentTarget.style.transform = "translateY(0)"; }}
          >
            <span style={{ fontSize: 20 }}>{ic}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.t }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Two Column Section: Today's Actions + Pipeline & Activity */}
      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Left: Today's Actions */}
        <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "24px 26px" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 16 }}>📋 Today's Actions</div>
          {isNewUser ? (
            <div>
              <div
                onClick={() => onNavigate("agents")}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, background: T.a + "08", border: `1px solid ${T.a}15`, marginBottom: 8, cursor: "pointer", transition: "background 0.15s" }}
                onMouseOver={ev => ev.currentTarget.style.background = T.a + "18"}
                onMouseOut={ev => ev.currentTarget.style.background = T.a + "08"}
              >
                <span style={{ fontSize: 18 }}>🔍</span>
                <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 600, color: T.t }}>Search Agent Directory</div><div style={{ fontSize: 13, color: "#B0BCCD" }}>Find top producers{profile?.market ? ` in ${profile.market}` : ""}</div></div>
                <span style={{ fontSize: 13, color: T.a, fontWeight: 600 }}>Go →</span>
              </div>
              <div
                onClick={() => onOpenRue()}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, background: T.bl + "08", border: `1px solid ${T.bl}15`, marginBottom: 8, cursor: "pointer", transition: "background 0.15s" }}
                onMouseOver={ev => ev.currentTarget.style.background = T.bl + "18"}
                onMouseOut={ev => ev.currentTarget.style.background = T.bl + "08"}
              >
                <span style={{ fontSize: 18 }}>💬</span>
                <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 600, color: T.t }}>Ask Rue for Recruiting Intel</div><div style={{ fontSize: 13, color: "#B0BCCD" }}>Your AI agent knows your market</div></div>
                <span style={{ fontSize: 13, color: T.bl, fontWeight: 600 }}>Chat →</span>
              </div>
              <div
                onClick={() => onNavigate("addlead")}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, background: T.p + "08", border: `1px solid ${T.p}15`, marginBottom: 8, cursor: "pointer", transition: "background 0.15s" }}
                onMouseOver={ev => ev.currentTarget.style.background = T.p + "18"}
                onMouseOut={ev => ev.currentTarget.style.background = T.p + "08"}
              >
                <span style={{ fontSize: 18 }}>➕</span>
                <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 600, color: T.t }}>Add Your First Lead</div><div style={{ fontSize: 13, color: "#B0BCCD" }}>Know someone? Add them manually</div></div>
                <span style={{ fontSize: 13, color: T.p, fontWeight: 600 }}>Add →</span>
              </div>
            </div>
          ) : (needsFollowUp.length > 0 || needsResearch.length > 0 || hasMeeting.length > 0) ? (
            <div>
              {hasMeeting.map((l, i) => (
                <div key={`m${i}`} onClick={() => { onSelectLead(l); onNavigate("lead"); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, background: T.p + "08", border: `1px solid ${T.p}15`, marginBottom: 8, cursor: "pointer" }}>
                  <span style={{ fontSize: 18 }}>🤝</span>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 600, color: T.t }}>Prep for {l.first_name} {l.last_name}</div><div style={{ fontSize: 13, color: T.s }}>Meeting booked</div></div>
                  <span style={{ fontSize: 13, color: T.p, fontWeight: 600 }}>Prep →</span>
                </div>
              ))}
              {needsFollowUp.slice(0, 3).map((l, i) => (
                <div key={`f${i}`} onClick={() => { onSelectLead(l); onNavigate("lead"); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, background: T.r + "08", border: `1px solid ${T.r}15`, marginBottom: 8, cursor: "pointer" }}>
                  <span style={{ fontSize: 18 }}>🔄</span>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 600, color: T.t }}>Follow up with {l.first_name} {l.last_name}</div><div style={{ fontSize: 13, color: T.s }}>{l.market} · {ago(l.created_at)} since last touch</div></div>
                  <span style={{ fontSize: 13, color: T.r, fontWeight: 600 }}>Overdue</span>
                </div>
              ))}
              {needsResearch.slice(0, 3).map((l, i) => (
                <div key={`r${i}`} onClick={() => { onSelectLead(l); onNavigate("lead"); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, background: T.bl + "08", border: `1px solid ${T.bl}15`, marginBottom: 8, cursor: "pointer" }}>
                  <span style={{ fontSize: 18 }}>🔍</span>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 600, color: T.t }}>Research {l.first_name} {l.last_name}</div><div style={{ fontSize: 13, color: T.s }}>New lead — needs intel</div></div>
                  <span style={{ fontSize: 13, color: T.bl, fontWeight: 600 }}>Research →</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px", color: "#8B949E" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 15, color: "#B0BCCD" }}>All caught up!</div>
            </div>
          )}
        </div>

        {/* Right: Pipeline + Recent Activity stacked */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Pipeline Chart */}
          <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "24px 26px" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 16 }}>📈 Pipeline</div>
            <Gauge score={pScore} />
            <div style={{ marginTop: 12 }}>
              {chartsReady && ResponsiveContainer ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={stages} layout="vertical" barSize={14}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="l" tick={{ fontSize: 13, fill: "#B0BCCD" }} width={76} axisLine={false} tickLine={false} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {stages.map((d, i) => <Cell key={i} fill={d.c} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "#8B949E", fontSize: 13 }}>Loading chart...</div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "24px 26px" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 16 }}>📋 Recent Activity</div>
            {activity && activity.length > 0 ? activity.slice(0, 8).map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", alignItems: "flex-start", borderBottom: i < 7 ? `1px solid ${T.b}` : "none" }}>
                <Dot c={T.a} />
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, color: T.t, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.action?.replace(/_/g, " ")}</div></div>
                <span style={{ fontSize: 12, color: "#8B949E", flexShrink: 0 }}>{ago(a.created_at)}</span>
              </div>
            )) : (
              <div style={{ textAlign: "center", padding: "24px", color: "#8B949E" }}><div style={{ fontSize: 24, marginBottom: 8 }}>📋</div><div style={{ fontSize: 15, color: "#B0BCCD" }}>Activity will appear as you work</div></div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
