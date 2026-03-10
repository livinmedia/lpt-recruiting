// RKRT.in CRM Feature
// Lead table/CRM view

import { useState } from 'react';
import T from '../../lib/theme';
import { STAGES } from '../../lib/constants';
import { ago } from '../../lib/utils';
import { Pill, UPill, TPill } from '../../components/ui/Pill';

export default function CRM({
  leads,
  onSelectLead,
  onNavigate,
  askRueInline,
  inlineResponse,
  inlineLoading,
}) {
  const [crmSearch, setCrmSearch] = useState("");
  const [crmSort, setCrmSort] = useState("newest");

  // Rue prompts for CRM
  const ruePrompts = [
    ["🔍", "Find Prospects", `Find me 5 real estate agents who might be looking to switch brokerages.`, T.a],
    ["📊", "Score Leads", `Score my current leads and tell me who to prioritize.`, T.bl],
    ["📱", "Outreach Plan", `Create an outreach plan for all my new and researched leads.`, T.p],
    ["🎯", "Market Analysis", `Which markets should I be targeting for recruiting?`, T.y],
  ];

  const crmLeads = leads.filter(l => {
    if (crmSearch) {
      const s = crmSearch.toLowerCase();
      if (!(
        l.first_name?.toLowerCase().includes(s) ||
        l.last_name?.toLowerCase().includes(s) ||
        l.email?.toLowerCase().includes(s) ||
        l.phone?.includes(s) ||
        l.market?.toLowerCase().includes(s) ||
        l.brokerage?.toLowerCase().includes(s)
      )) return false;
    }
    return true;
  }).sort((a, b) => {
    if (crmSort === "newest") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    if (crmSort === "oldest") return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    if (crmSort === "name") return (a.first_name || "").localeCompare(b.first_name || "");
    if (crmSort === "urgency") return ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[a.urgency] || 3) - ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[b.urgency] || 3);
    return 0;
  });

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
          <span style={{ fontSize: 12, color: T.a, fontWeight: 700 }}>🤖 RUE RESPONSE</span>
          <pre style={{ fontSize: 14, color: T.t, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: "8px 0 0", maxHeight: 400, overflow: "auto" }}>{inlineResponse}</pre>
        </div>
      )}

      {/* Toolbar */}
      <div className="crm-toolbar" style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={crmSearch}
          onChange={ev => setCrmSearch(ev.target.value)}
          placeholder="Search leads..."
          style={{ padding: "12px 18px", borderRadius: 8, background: T.card, border: `1px solid ${T.b}`, color: T.t, fontSize: 15, outline: "none", fontFamily: "inherit", width: 280 }}
        />
        <select
          value={crmSort}
          onChange={ev => setCrmSort(ev.target.value)}
          style={{ padding: "10px 14px", borderRadius: 6, background: T.card, border: `1px solid ${T.b}`, color: T.t, fontSize: 14, outline: "none", fontFamily: "inherit" }}
        >
          {[["newest", "🕐 Newest"], ["oldest", "⏳ Oldest"], ["name", "🔤 Name"], ["urgency", "🔥 Urgency"]].map(([v, l]) => (
            <option key={v} value={v} style={{ background: T.card }}>{l}</option>
          ))}
        </select>
        <div className="crm-spacer" style={{ flex: 1 }} />
        <span style={{ fontSize: 14, color: T.s }}>{crmLeads.length} leads</span>
      </div>

      {/* Table */}
      <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="crm-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
            <thead>
              <tr>
                {["Name", "Email", "Phone", "Market", "Brokerage", "Tier", "Urgency", "Stage", "Source", "Added"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "14px 16px", fontSize: 12, fontWeight: 700, color: T.m, letterSpacing: 1.5, borderBottom: `1px solid ${T.b}`, whiteSpace: "nowrap", background: T.side }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {crmLeads.length > 0 ? crmLeads.map((l, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: `1px solid ${T.b}` }}
                  onMouseOver={ev => ev.currentTarget.style.background = T.d}
                  onMouseOut={ev => ev.currentTarget.style.background = "transparent"}
                >
                  <td
                    onClick={() => { onSelectLead(l); onNavigate("lead"); }}
                    style={{ padding: "14px 16px", fontSize: 15, fontWeight: 600, color: T.t, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    {l.first_name} {l.last_name}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 14, color: T.bl }}>
                    {l.email ? <a href={`mailto:${l.email}`} style={{ color: T.bl, textDecoration: "none" }}>{l.email.length > 26 ? l.email.substring(0, 26) + "…" : l.email}</a> : "—"}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 14, color: T.s, whiteSpace: "nowrap" }}>{l.phone || "—"}</td>
                  <td style={{ padding: "14px 16px", fontSize: 14, color: T.s }}>{l.market || "—"}</td>
                  <td style={{ padding: "14px 16px", fontSize: 14, color: l.brokerage?.toLowerCase().includes("lpt") ? T.a : T.t }}>{l.brokerage?.substring(0, 22) || "—"}</td>
                  <td style={{ padding: "14px 16px" }}><TPill t={l.tier} /></td>
                  <td style={{ padding: "14px 16px" }}><UPill u={l.urgency} /></td>
                  <td style={{ padding: "14px 16px" }}><Pill text={l.pipeline_stage?.replace(/_/g, " ") || "—"} color={STAGES.find(s => s.id === l.pipeline_stage)?.c || T.s} /></td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: T.s }}>{l.source || "Ad"}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: T.m, whiteSpace: "nowrap" }}>{ago(l.created_at)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "60px 20px", color: T.m, fontSize: 16 }}>No leads found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
