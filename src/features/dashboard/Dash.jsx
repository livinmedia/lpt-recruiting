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
              <div style={{ textAlign: "center", padding: "40px 16px", color: T.m }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>No lead activity yet. Share your recruiting links and content to start tracking engagement.</div>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
                  {[
                    { label: "Total Leads", value: scoredLeads.length, color: T.a },
                    { label: "Hot Leads", value: hotCount, color: "#FF4444" },
                    { label: "Warming", value: warmCount, color: "#FF8C00" },
                    { label: "Cold", value: coldCount, color: T.m },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: T.d, border: `1px solid ${T.b}`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
                      <div style={{ fontSize: 11, color: T.m, marginTop: 3, fontWeight: 600, letterSpacing: 0.5 }}>{label}</div>
                    </div>
                  ))}
                </div>
                {top3.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${top3.length}, 1fr)`, gap: 12, marginBottom: 20 }}>
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
                            {l.last_activity_at && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: T.b + "30", color: T.m, fontWeight: 600 }}>{isToday ? "Active today" : ago(l.last_activity_at)}</span>}
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
                          <span style={{ fontSize: 12, color: T.m, fontWeight: 800, minWidth: 22, textAlign: "center" }}>#{i + 4}</span>
                          <span style={{ fontSize: 14, flexShrink: 0 }}>{heatIcon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: T.t, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.first_name} {l.last_name}</div>
                            <div style={{ fontSize: 11, color: T.s }}>{(l.brokerage_name || l.brokerage || "Unknown").substring(0, 28)}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <div style={{ padding: "3px 9px", borderRadius: 20, background: heatColor + "22", border: `1px solid ${heatColor}44`, fontSize: 12, fontWeight: 800, color: heatColor }}>{l.interest_score || 0}</div>
                            <div style={{ fontSize: 10, color: T.m, minWidth: 60, textAlign: "right" }}>{isToday ? "Today" : l.last_activity_at ? ago(l.last_activity_at) : "—"}</div>
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
              background: (c || T.bl) + "10",
              border: `1px solid ${(c || T.bl)}20`,
              borderRadius: 10,
              padding: "18px 20px",
              cursor: inlineLoading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
              opacity: inlineLoading ? 0.5 : 1,
              transition: "all 0.15s",
            }}
            onMouseOver={(e) => { if (!inlineLoading) e.currentTarget.style.background = (c || T.bl) + "20"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = (c || T.bl) + "10"; }}
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
          <div style={{ flex: 1, fontSize: 13, color: T.s }}>
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
              <div className="kpi-label" style={{ fontSize: 13, color: T.s, letterSpacing: 2, fontWeight: 700 }}>{l.toUpperCase()}</div>
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
            style={{ background: c + "10", border: `1px solid ${c}20`, borderRadius: 10, padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s" }}
            onMouseOver={ev => ev.currentTarget.style.background = c + "20"}
            onMouseOut={ev => ev.currentTarget.style.background = c + "10"}
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
          {(needsFollowUp.length > 0 || needsResearch.length > 0 || hasMeeting.length > 0) ? (
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
            <div style={{ textAlign: "center", padding: "24px", color: T.m }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 15 }}>All caught up!</div>
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
                    <YAxis type="category" dataKey="l" tick={{ fontSize: 13, fill: T.s }} width={76} axisLine={false} tickLine={false} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {stages.map((d, i) => <Cell key={i} fill={d.c} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: T.m, fontSize: 13 }}>Loading chart...</div>
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
                <span style={{ fontSize: 12, color: T.m, flexShrink: 0 }}>{ago(a.created_at)}</span>
              </div>
            )) : (
              <div style={{ textAlign: "center", padding: "24px", color: T.m }}><div style={{ fontSize: 24, marginBottom: 8 }}>📋</div><div style={{ fontSize: 15 }}>Activity will appear as you work</div></div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
// build trigger 1773261493
