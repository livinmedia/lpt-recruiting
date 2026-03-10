// RKRT.in Dashboard Feature
// Extracted from App.jsx for scalable architecture

import { useState, useEffect } from 'react';
import T from '../../lib/theme';
import { STAGES } from '../../lib/constants';
import { ago } from '../../lib/utils';
import { Pill, UPill, TPill, Dot } from '../../components/ui/Pill';
import { Gauge } from '../../components/ui/Gauge';

export default function Dash({
  leads,
  profile,
  activity,
  recentLeads,
  onNavigate,
  onSelectLead,
  askRueInline,
  inlineResponse,
  inlineLoading,
  chartsReady,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
}) {
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

  // Rue prompts for dashboard
  const ruePrompts = [
    ["🎯", "Who to Call", `Who should I call first today? Look at my pipeline and tell me the highest priority lead.${profile?.brokerage ? " I recruit for " + profile.brokerage : ""}`, T.a],
    ["📱", "Draft Outreach", `Draft a recruiting DM for my hottest lead in the pipeline.${profile?.brokerage ? " Context: I'm at " + profile.brokerage : ""}`, T.bl],
    ["🔍", "Find Agents", `Find me 5 real estate agents${profile?.market ? " in " + profile.market : ""} who might be looking to switch brokerages.`, T.p],
    ["📋", "Game Plan", `Create my recruiting game plan for this week based on my current pipeline.${profile?.brokerage ? " I'm at " + profile.brokerage : ""}`, T.y],
  ];

  return (
    <>
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

      {/* Inline Response */}
      {inlineLoading && (
        <div style={{ marginBottom: 20, padding: "16px 20px", borderRadius: 10, background: T.card, border: `1px solid ${T.b}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.a, animation: "pulse 1s infinite" }} />
            <span style={{ fontSize: 14, color: T.s }}>RUE is thinking...</span>
          </div>
        </div>
      )}

      {inlineResponse && !inlineLoading && (
        <div style={{ marginBottom: 20, padding: "20px 24px", borderRadius: 10, background: T.as, border: `1px solid ${T.a}20` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: T.a, fontWeight: 700, letterSpacing: 1.5 }}>🤖 RUE RESPONSE</span>
          </div>
          <pre style={{ fontSize: 14, color: T.t, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, maxHeight: 400, overflow: "auto" }}>
            {inlineResponse}
          </pre>
        </div>
      )}

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

      {/* Quick Actions */}
      <div className="quick-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          ["➕", "Add Lead", () => onNavigate("addlead"), T.a],
          ["📱", "Draft Outreach", () => onNavigate("pipeline"), T.bl],
          ["🔍", "Find Agents", () => onNavigate("agents"), T.p],
          ["📊", "Pipeline Review", () => onNavigate("pipeline"), T.y]
        ].map(([ic, label, action, c], i) => (
          <div
            key={i}
            onClick={action}
            style={{ background: c + "10", border: `1px solid ${c}20`, borderRadius: 10, padding: "18px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s" }}
            onMouseOver={ev => ev.currentTarget.style.background = c + "20"}
            onMouseOut={ev => ev.currentTarget.style.background = c + "10"}
          >
            <span style={{ fontSize: 24 }}>{ic}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.t }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Recent Leads Strip */}
      {recentLeads && recentLeads.length > 0 && (
        <div style={{ background: T.card, borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.t }}>🆕 Recent Leads</div>
            <div onClick={() => onNavigate("pipeline")} style={{ fontSize: 12, color: T.a, cursor: "pointer", fontWeight: 600 }}>View All →</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Name", "Market", "Brokerage", "Tier", "Urgency", "Stage", "Added"].map(h => (
                  <th key={h} style={{ fontSize: 10, color: T.m, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", textAlign: "left", padding: "0 8px 10px", borderBottom: `1px solid ${T.b}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLeads.slice(0, 5).map((l, i) => (
                <tr
                  key={i}
                  onClick={() => { onSelectLead(l); onNavigate("lead"); }}
                  style={{ cursor: "pointer", transition: "background 0.1s" }}
                  onMouseOver={ev => ev.currentTarget.style.background = T.bg + "80"}
                  onMouseOut={ev => ev.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "10px 8px", fontSize: 13, fontWeight: 700, color: T.t, whiteSpace: "nowrap", borderBottom: `1px solid ${T.b}20` }}>{l.first_name} {l.last_name}</td>
                  <td style={{ padding: "10px 8px", fontSize: 12, color: T.s, borderBottom: `1px solid ${T.b}20` }}>{l.city && l.state ? `${l.city}, ${l.state}` : l.market || "—"}</td>
                  <td style={{ padding: "10px 8px", fontSize: 12, color: l.brokerage ? T.a : T.m, borderBottom: `1px solid ${T.b}20` }}>{l.brokerage?.substring(0, 22) || "—"}</td>
                  <td style={{ padding: "10px 8px", borderBottom: `1px solid ${T.b}20` }}><TPill t={l.tier} /></td>
                  <td style={{ padding: "10px 8px", borderBottom: `1px solid ${T.b}20` }}><UPill u={l.urgency} /></td>
                  <td style={{ padding: "10px 8px", borderBottom: `1px solid ${T.b}20` }}><Pill text={l.pipeline_stage?.replace(/_/g, " ") || "new"} color={STAGES.find(s => s.id === l.pipeline_stage)?.c || T.s} /></td>
                  <td style={{ padding: "10px 8px", fontSize: 11, color: T.m, borderBottom: `1px solid ${T.b}20` }}>{ago(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Two Column Section */}
      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Today's Actions */}
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

        {/* Hot Leads */}
        <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "24px 26px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: T.t }}>🔥 Hot Leads</span>
            <span onClick={() => onNavigate("pipeline")} style={{ fontSize: 14, color: T.s, cursor: "pointer" }}>All →</span>
          </div>
          {leads.filter(l => l.urgency === "HIGH" || l.urgency === "MEDIUM").sort((a, b) => ({ HIGH: 0, MEDIUM: 1 }[a.urgency] || 2) - ({ HIGH: 0, MEDIUM: 1 }[b.urgency] || 2)).slice(0, 5).map((l, i) => (
            <div
              key={i}
              onClick={() => { onSelectLead(l); onNavigate("lead"); }}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 8, background: T.d, border: `1px solid ${T.b}`, marginBottom: 8, cursor: "pointer" }}
              onMouseOver={ev => ev.currentTarget.style.borderColor = T.bh}
              onMouseOut={ev => ev.currentTarget.style.borderColor = T.b}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.t }}>{l.first_name} {l.last_name}</div>
                <div style={{ fontSize: 13, color: T.s }}>{l.brokerage?.substring(0, 20) || "Unknown"} · {l.market}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><TPill t={l.tier} /><UPill u={l.urgency} /></div>
            </div>
          ))}
          {leads.filter(l => l.urgency === "HIGH" || l.urgency === "MEDIUM").length === 0 && (
            <div style={{ textAlign: "center", padding: "24px", color: T.m }}><div style={{ fontSize: 24, marginBottom: 8 }}>🎯</div><div style={{ fontSize: 15 }}>No hot leads yet.</div></div>
          )}
        </div>
      </div>

      {/* Pipeline & Activity Row */}
      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
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
    </>
  );
}
