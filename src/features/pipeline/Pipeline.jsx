// RKRT.in Pipeline Feature
// Kanban board and table view for lead pipeline

import { useState } from 'react';
import T from '../../lib/theme';
import { STAGES } from '../../lib/constants';
import { ago } from '../../lib/utils';
import { Pill, UPill, TPill } from '../../components/ui/Pill';

function getStageAction(lead) {
  const s = lead.pipeline_stage;
  if (s === "researched") return { label: "Draft Outreach", icon: "📱", q: `Draft a personalized recruiting message to ${lead.first_name} ${lead.last_name}. They're at ${lead.brokerage || "unknown brokerage"} in ${lead.market || "unknown market"}.${lead.outreach_angle ? " Angle: " + lead.outreach_angle : ""}` };
  if (s === "outreach_sent") return { label: "Follow Up", icon: "🔄", q: `Write a follow-up message to ${lead.first_name} ${lead.last_name}. I already sent initial outreach. Make it casual and value-driven.` };
  if (s === "meeting_booked") return { label: "Prep Sheet", icon: "📋", q: `Create a meeting prep sheet for my call with ${lead.first_name} ${lead.last_name}. They're at ${lead.brokerage || "unknown"} in ${lead.market || "unknown"}. ${lead.tier || ""} tier. Include talking points, their likely objections, and how to close.` };
  if (s === "in_conversation") return { label: "Close Script", icon: "🎯", q: `Give me a closing script for ${lead.first_name} ${lead.last_name}. We've been talking and I need to move them to a decision.` };
  if (s === "new") return { label: "Research", icon: "🔍", q: `Research ${lead.first_name} ${lead.last_name} in ${lead.market || "their market"}. Find their production, reviews, social media, and give me an outreach angle.` };
  return null;
}

export default function Pipeline({
  leads,
  onSelectLead,
  onNavigate,
  askRueInline,
  search,
  setSearch,
  inlineLoading = false,
  onUpdateStage,
  onTriggerDraftEmail,
}) {
  const [pipeView, setPipeView] = useState("kanban");
  const [filters, setFilters] = useState({ market: "", tier: "", urgency: "", brokerage: "" });
  const [sortBy, setSortBy] = useState("urgency");
  const [dragLead, setDragLead] = useState(null);

  const allMarkets = [...new Set(leads.map(l => l.market).filter(Boolean))].sort();
  const allBrokerages = [...new Set(leads.map(l => l.brokerage).filter(Boolean))].sort();

  const sortFn = (a, b) => {
    if (sortBy === "urgency") { const o = { HIGH: 0, MEDIUM: 1, LOW: 2 }; return (o[a.urgency] ?? 3) - (o[b.urgency] ?? 3); }
    if (sortBy === "tier") { const o = { Elite: 0, Strong: 1, Mid: 2, Building: 3, New: 4 }; return (o[a.tier] ?? 5) - (o[b.tier] ?? 5); }
    if (sortBy === "oldest") return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === "newest") return new Date(b.created_at) - new Date(a.created_at);
    return 0;
  };

  const pipeLeads = leads.filter(l => {
    if (search && !`${l.first_name} ${l.last_name} ${l.market} ${l.brokerage}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.market && l.market !== filters.market) return false;
    if (filters.tier && l.tier !== filters.tier) return false;
    if (filters.urgency && l.urgency !== filters.urgency) return false;
    if (filters.brokerage && l.brokerage !== filters.brokerage) return false;
    return true;
  }).sort(sortFn);

  const overdue = leads.filter(l => l.pipeline_stage && l.pipeline_stage !== "new" && l.pipeline_stage !== "recruited" && l.created_at && (Date.now() - new Date(l.created_at)) > 7 * 86400000);

  // Rue prompts for pipeline
  const ruePrompts = [
    ["📱", "Draft Outreach", `Look at my pipeline and draft outreach for my highest priority lead.`, T.a],
    ["🔄", "Follow-ups", `Which leads need follow-up? Draft messages for each.`, T.bl],
    ["🎯", "Strategy", `Analyze my pipeline and suggest what I should focus on.`, T.p],
    ["📊", "Conversion Tips", `Based on my pipeline, what can I do to improve conversion?`, T.y],
  ];

  const Sel = ({ value, onChange, options, placeholder }) => (
    <select value={value} onChange={ev => onChange(ev.target.value)} style={{ padding: "10px 14px", borderRadius: 6, background: T.card, border: `1px solid ${T.b}`, color: value ? T.t : T.m, fontSize: 15, outline: "none", fontFamily: "inherit", cursor: "pointer", minWidth: 0 }}>
      <option value="" style={{ background: T.card, color: T.m }}>{placeholder}</option>
      {options.map(o => <option key={o} value={o} style={{ background: T.card, color: T.t }}>{o}</option>)}
    </select>
  );

  const KanbanCard = ({ lead: l }) => {
    const act = getStageAction(l);
    return (
      <div
        draggable
        onDragStart={() => setDragLead(l)}
        style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 8, padding: "14px 16px", marginBottom: 18, cursor: "grab", transition: "border-color 0.12s" }}
        onMouseOver={ev => ev.currentTarget.style.borderColor = T.bh}
        onMouseOut={ev => ev.currentTarget.style.borderColor = T.b}
      >
        <div onClick={() => { onSelectLead(l); onNavigate("lead"); }} style={{ cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.t }}>{l.first_name} {l.last_name}</div>
            <UPill u={l.urgency} />
          </div>
          <div style={{ fontSize: 14, color: T.s, marginBottom: 2 }}>{l.brokerage?.substring(0, 22) || "Unknown"}</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 14, color: T.s }}>{l.market}</span>
            <TPill t={l.tier} />
          </div>
        </div>
        {act && (
          <div
            onClick={() => { onSelectLead(l); onNavigate("lead"); if (act.label === "Draft Outreach" && onTriggerDraftEmail) { onTriggerDraftEmail(); } else { askRueInline(act.q); } }}
            style={{ marginTop: 6, padding: "10px 14px", borderRadius: 5, background: T.as, border: `1px solid ${T.a}15`, fontSize: 14, fontWeight: 700, color: T.a, cursor: "pointer", display: "flex", alignItems: "center", gap: 14, textAlign: "center", justifyContent: "center" }}
          >
            {act.icon} {act.label}
          </div>
        )}
      </div>
    );
  };

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

      {/* Stats */}
      <div className="pipe-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        {[
          ["Total Leads", pipeLeads.length, T.bl],
          ["In Pipeline", pipeLeads.filter(l => l.pipeline_stage !== "new" && l.pipeline_stage !== "recruited").length, T.p],
          ["Overdue (7d+)", overdue.length, overdue.length > 0 ? T.r : T.s],
          ["Recruited", pipeLeads.filter(l => l.pipeline_stage === "recruited").length, T.a]
        ].map(([l, v, c], i) => (
          <div key={i} style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 10, padding: "16px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: c }}>{v}</div>
            <div style={{ fontSize: 13, color: T.s, marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Overdue Warning */}
      {overdue.length > 0 && (
        <div style={{ background: T.r + "10", border: `1px solid ${T.r}25`, borderRadius: 10, padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.r }}>{overdue.length} leads need follow-up</div>
              <div style={{ fontSize: 14, color: T.s }}>Haven't been contacted in 7+ days</div>
            </div>
          </div>
          <div onClick={() => setSortBy("oldest")} style={{ padding: "10px 16px", borderRadius: 6, background: T.r + "20", fontSize: 14, fontWeight: 700, color: T.r, cursor: "pointer" }}>Show Overdue</div>
        </div>
      )}

      {/* Toolbar */}
      <div className="pipe-toolbar" style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={ev => setSearch(ev.target.value)}
          placeholder="Search..."
          style={{ padding: "12px 18px", borderRadius: 7, background: T.card, border: `1px solid ${T.b}`, color: T.t, fontSize: 16, outline: "none", fontFamily: "inherit", width: 220 }}
        />
        <Sel value={filters.market} onChange={v => setFilters(p => ({ ...p, market: v }))} options={allMarkets} placeholder="Market" />
        <Sel value={filters.tier} onChange={v => setFilters(p => ({ ...p, tier: v }))} options={["Elite", "Strong", "Mid", "Building", "New"]} placeholder="Tier" />
        <Sel value={filters.urgency} onChange={v => setFilters(p => ({ ...p, urgency: v }))} options={["HIGH", "MEDIUM", "LOW"]} placeholder="Urgency" />
        <Sel value={filters.brokerage} onChange={v => setFilters(p => ({ ...p, brokerage: v }))} options={allBrokerages} placeholder="Brokerage" />
        <div className="pipe-spacer" style={{ flex: 1 }} />
        <select value={sortBy} onChange={ev => setSortBy(ev.target.value)} style={{ padding: "10px 14px", borderRadius: 6, background: T.card, border: `1px solid ${T.b}`, color: T.t, fontSize: 15, outline: "none", fontFamily: "inherit" }}>
          {[["urgency", "🔥 Hot First"], ["tier", "🏆 Top Tier"], ["newest", "🕐 Newest"], ["oldest", "⏳ Oldest"]].map(([v, l]) => (
            <option key={v} value={v} style={{ background: T.card }}>{l}</option>
          ))}
        </select>
        <div onClick={() => setPipeView(pipeView === "kanban" ? "table" : "kanban")} style={{ padding: "10px 16px", borderRadius: 6, background: T.card, border: `1px solid ${T.b}`, fontSize: 15, color: T.s, cursor: "pointer" }}>
          {pipeView === "kanban" ? "☰ Table" : "▦ Board"}
        </div>
      </div>

      {/* Active Filters */}
      {Object.values(filters).some(Boolean) && (
        <div style={{ display: "flex", gap: 14, marginBottom: 14, alignItems: "center" }}>
          <span style={{ fontSize: 14, color: T.m }}>Filters:</span>
          {Object.entries(filters).filter(([, v]) => v).map(([k, v]) => (
            <div key={k} onClick={() => setFilters(p => ({ ...p, [k]: "" }))} style={{ fontSize: 14, padding: "4px 10px", borderRadius: 4, background: T.bl + "18", color: T.bl, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
              {v} <span style={{ color: T.s }}>✕</span>
            </div>
          ))}
          <div onClick={() => setFilters({ market: "", tier: "", urgency: "", brokerage: "" })} style={{ fontSize: 14, color: T.s, cursor: "pointer", marginLeft: 4 }}>Clear all</div>
        </div>
      )}

      {/* Kanban View */}
      {pipeView === "kanban" && (
        <div className="kanban-wrap" style={{ display: "flex", gap: 10, overflow: "auto", paddingBottom: 8 }}>
          {STAGES.map(stg => {
            const colLeads = pipeLeads.filter(l => l.pipeline_stage === stg.id);
            return (
              <div 
                key={stg.id} 
                style={{ minWidth: 220, flex: 1 }} 
                onDragOver={ev => ev.preventDefault()} 
                onDrop={() => { 
                  if (dragLead && dragLead.pipeline_stage !== stg.id && onUpdateStage) { 
                    onUpdateStage(dragLead.id, stg.id); 
                  }
                  setDragLead(null); 
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, padding: "0 2px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: stg.c }} />
                    <span style={{ fontSize: 15, fontWeight: 700, color: T.t }}>{stg.l}</span>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 800, color: stg.c }}>{colLeads.length}</span>
                </div>
                <div style={{ background: T.d, borderRadius: 8, padding: 10, minHeight: 300, border: `1px solid ${T.b}` }}>
                  {colLeads.map(l => <KanbanCard key={l.id || l.first_name + l.last_name} lead={l} />)}
                  {colLeads.length === 0 && <div style={{ fontSize: 14, color: T.m, textAlign: "center", padding: "30px 8px" }}>No leads</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {pipeView === "table" && (
        <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 10, padding: "20px 22px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Name", "Market", "Brokerage", "Tier", "Urgency", "Stage", "Last Contact", "Action"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 14px", fontSize: 13, fontWeight: 700, color: T.m, letterSpacing: 1.5, borderBottom: `1px solid ${T.b}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pipeLeads.map((l, i) => {
                const act = getStageAction(l);
                const daysSince = l.outreach_sent_at ? Math.floor((Date.now() - new Date(l.outreach_sent_at)) / 86400000) : null;
                const contactColor = daysSince === null ? T.m : daysSince > 7 ? T.r : daysSince > 3 ? T.y : T.a;
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.b}` }} onMouseOver={ev => ev.currentTarget.style.background = T.d} onMouseOut={ev => ev.currentTarget.style.background = "transparent"}>
                    <td onClick={() => { onSelectLead(l); onNavigate("lead"); }} style={{ padding: "14px", fontSize: 16, fontWeight: 600, color: T.t, cursor: "pointer" }}>{l.first_name} {l.last_name}</td>
                    <td style={{ padding: "14px", fontSize: 15, color: T.s }}>{l.market}</td>
                    <td style={{ padding: "14px", fontSize: 15, color: l.brokerage?.toLowerCase().includes("lpt") ? T.a : T.t }}>{l.brokerage?.substring(0, 22)}</td>
                    <td style={{ padding: "14px" }}><TPill t={l.tier} /></td>
                    <td style={{ padding: "14px" }}><UPill u={l.urgency} /></td>
                    <td style={{ padding: "14px" }}><Pill text={l.pipeline_stage?.replace(/_/g, " ") || "—"} color={STAGES.find(s => s.id === l.pipeline_stage)?.c || T.s} /></td>
                    <td style={{ padding: "14px", fontSize: 14, color: contactColor, fontWeight: daysSince > 7 ? 700 : 400 }}>{daysSince !== null ? `${daysSince}d ago` : "Never"}</td>
                    <td style={{ padding: "14px" }}>
                      {act && (
                        <span onClick={() => { onSelectLead(l); onNavigate("lead"); askRueInline(act.q); }} style={{ fontSize: 14, color: T.a, cursor: "pointer", fontWeight: 600 }}>
                          {act.icon} {act.label}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
