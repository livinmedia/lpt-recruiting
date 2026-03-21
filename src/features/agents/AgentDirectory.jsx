// RKRT.in Agent Directory
// Searchable database of 1.2M+ real estate agents

import { useState, useEffect, useCallback, useRef } from 'react';
import T from '../../lib/theme';
import { supabase, agentSearch, logActivity, startCheckout } from '../../lib/supabase';
import { CREDIT_PACKS } from '../../lib/constants';
import { ago, truncate } from '../../lib/utils';

function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const e = email.trim().toLowerCase();
  if (!e || !e.includes("@")) return false;
  const junk = ["unknown","none","n/a","na","null","undefined","noemail","no-email","noreply","no-reply","test","placeholder","example","fake"];
  const local = e.split("@")[0];
  const domain = e.split("@")[1];
  if (junk.includes(local) || junk.includes(e)) return false;
  if (["example.com","test.com","unknown.com","none.com"].includes(domain)) return false;
  return true;
}

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];
const STATE_DATA = { FL: 939832, TX: 189036, NY: 143738, CT: 19568 };
const TOTAL_AGENTS = 1292174;

// Credit packs imported from constants

export default function AgentDirectory({ userId, userProfile, onAddLead, onEnrich }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ state: "", brokerage: "", name: "", city: "", newDays: "" });
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichedData, setEnrichedData] = useState(null);
  const [usage, setUsage] = useState(null);
  const [availableStates, setAvailableStates] = useState(US_STATES);
  const didInit = useRef(false);

  const LIMIT = 50;

  const search = useCallback(async (resetPage = true) => {
    setLoading(true);
    if (resetPage) setPage(0);
    const offset = resetPage ? 0 : page * LIMIT;
    
    const result = await agentSearch({
      state: filters.state,
      brokerage: filters.brokerage,
      name: filters.name,
      city: filters.city,
      newDays: filters.newDays ? parseInt(filters.newDays) : null,
      limit: LIMIT,
      offset,
    });
    
    setAgents(result.data);
    setTotal(result.total);
    setLoading(false);
    logActivity(userId, 'search_agents', { filters, results: result.total });
  }, [filters, page, userId]);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (userProfile?.license_state) {
      setFilters(f => ({ ...f, state: userProfile.license_state }));
    }
    setTimeout(() => search(true), 100);
    fetchUsage();
    // Fetch distinct states dynamically from agent_directory
    (async () => {
      try {
        const { data, error } = await supabase.rpc('get_distinct_agent_states');
        if (!error && data && data.length > 0) {
          const states = data.map(r => r.state).filter(Boolean);
          if (states.length > 0) setAvailableStates(states);
        }
      } catch {
        // RPC not available — fall back to hardcoded US_STATES (already the default)
      }
    })();
  }, [userProfile]);

  async function fetchUsage() {
    try {
      const { data } = await supabase.from("v_enrichment_usage").select("*").eq("user_id", userId).maybeSingle();
      if (data) setUsage({ used: data.used_this_month ?? 0, limit: data.monthly_limit ?? 0, remaining: data.remaining ?? 0, plan: data.plan ?? "" });
    } catch {}
  }

  const agentName = (a) => {
    if (a.full_name && a.full_name.trim()) return a.full_name;
    if (a.first_name || a.last_name) return `${a.first_name || ''} ${a.last_name || ''}`.trim();
    return '—';
  };

  const enrichAgent = async (agent) => {
    setEnriching(true);
    setEnrichedData(null);
    try {
      const res = await fetch(`https://usknntguurefeyzusbdh.supabase.co/functions/v1/enrich-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: agentName(agent), brokerage: agent.brokerage_name, city: agent.city, state: agent.state }),
      });
      const data = await res.json();
      setEnrichedData(data);
      logActivity(userId, 'enrich_agent', { agent_id: agent.id });
    } catch (e) {
      console.error('Enrich failed:', e);
    }
    setEnriching(false);
  };

  const addToLeads = async (agent) => {
    const leadData = {
      user_id: userId,
      first_name: agent.first_name || agentName(agent).split(' ')[0] || '',
      last_name: agent.last_name || agentName(agent).split(' ').slice(1).join(' ') || '',
      email: agent.email || '',
      phone: agent.phone || '',
      market: agent.city ? `${agent.city}, ${agent.state}` : agent.state,
      brokerage: agent.brokerage_name,
      license_number: agent.license_number,
      license_state: agent.state,
      source: 'agent_directory',
      pipeline_stage: 'new',
      urgency: 'LOW',
    };
    
    const { data, error } = await supabase.from('leads').insert(leadData).select().single();
    if (!error && data) {
      logActivity(userId, 'add_lead_from_directory', { agent_id: agent.id, lead_id: data.id });
      if (onAddLead) onAddLead(data);
      setSelectedAgent(null);
    }
  };

  const inp = { padding: "12px 16px", borderRadius: 8, background: T.card, border: `1px solid ${T.b}`, color: T.t, fontSize: 15, outline: "none", fontFamily: "inherit", width: "100%" };

  return (
    <div>
      {/* Credits Bar */}
      {usage && (() => {
        const pct = usage.limit > 0 ? Math.min((usage.used / usage.limit) * 100, 100) : 0;
        const barColor = pct < 50 ? "#10b981" : pct < 80 ? "#f59e0b" : "#ef4444";
        return (
          <div style={{ background: "#111827", border: "1px solid #1a2540", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "#94a3b8" }}>
                🔍 <strong style={{ color: "#e2e8f0" }}>{usage.used}</strong> / {usage.limit} Enrichments Used
                {usage.plan ? <span style={{ fontSize: 11, color: "#64748b", marginLeft: 8 }}>· {usage.plan} plan</span> : null}
              </span>
              <span style={{ fontSize: 12, color: barColor, fontWeight: 700 }}>{usage.remaining} remaining</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "#334155", overflow: "hidden", marginBottom: 10 }}>
              <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3, transition: "width 0.5s ease" }} />
            </div>
            {usage.remaining < 20 && (
              <div style={{ fontSize: 12, color: "#f59e0b", marginBottom: 10 }}>
                ⚠️ Running low on enrichments — top up to keep prospecting.
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CREDIT_PACKS.map(pack => (
                <button
                  key={pack.key}
                  onClick={() => startCheckout({ priceId: pack.priceId, plan: pack.key, mode: "payment" })}
                  style={{
                    padding: "5px 12px", fontSize: 12, borderRadius: 6, cursor: "pointer",
                    background: "rgba(34,211,238,0.08)", color: "#22d3ee",
                    border: "1px solid rgba(34,211,238,0.25)", fontWeight: 600,
                  }}
                >
                  {pack.credits} for {pack.price} <span style={{ fontSize: 10, color: "#64748b", fontWeight: 400 }}>{pack.perCredit}/ea</span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Stats Bar */}
      <div className="agent-stats-bar" style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {[["TOTAL AGENTS", TOTAL_AGENTS, T.a], ["FLORIDA", STATE_DATA.FL, T.bl], ["TEXAS", STATE_DATA.TX, "#FBBF24"], ["NEW YORK", STATE_DATA.NY, T.p], ["CONNECTICUT", STATE_DATA.CT, T.s]].map(([label, val, color]) => (
          <div key={label} style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 10, padding: "14px 18px", flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{val.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: T.m, letterSpacing: 1, fontWeight: 700, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Full-width Filter Bar */}
      <div className="agent-filter-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1.5fr 1fr 1fr auto", gap: 12, marginBottom: 20, alignItems: "end", background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "16px 20px" }}>
        <div>
          <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 6 }}>STATE</div>
          <select value={filters.state} onChange={e => setFilters(f => ({ ...f, state: e.target.value }))} style={inp}>
            <option value="">All States</option>
            {availableStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 6 }}>BROKERAGE</div>
          <input value={filters.brokerage} onChange={e => setFilters(f => ({ ...f, brokerage: e.target.value }))} placeholder="e.g. Keller Williams" style={inp} onKeyDown={e => e.key === 'Enter' && search(true)} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 6 }}>NAME</div>
          <input value={filters.name} onChange={e => setFilters(f => ({ ...f, name: e.target.value }))} placeholder="Agent name" style={inp} onKeyDown={e => e.key === 'Enter' && search(true)} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 6 }}>CITY</div>
          <input value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))} placeholder="City" style={inp} onKeyDown={e => e.key === 'Enter' && search(true)} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 6 }}>NEW AGENTS</div>
          <select value={filters.newDays} onChange={e => setFilters(f => ({ ...f, newDays: e.target.value }))} style={inp}>
            <option value="">Any</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last year</option>
          </select>
        </div>
        <div onClick={() => search(true)} style={{ padding: "12px 28px", borderRadius: 8, background: T.a, color: "#000", fontSize: 15, fontWeight: 700, cursor: "pointer", textAlign: "center", whiteSpace: "nowrap", height: 46, display: "flex", alignItems: "center", justifyContent: "center" }}>
          🔍 Search
        </div>
      </div>

      {/* Results Count */}
      <div style={{ fontSize: 14, color: T.s, marginBottom: 16 }}>
        {loading ? "Searching..." : `${total.toLocaleString()} agents found`}
      </div>

      {/* Results Table */}
      <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                {["Name", "Brokerage", "City", "State", "License #", "Status", "Licensed", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "14px 16px", fontSize: 12, fontWeight: 700, color: T.m, letterSpacing: 1.5, borderBottom: `1px solid ${T.b}`, background: T.side }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.length > 0 ? agents.map((a, i) => (
                <tr key={a.id ?? i} style={{ borderBottom: `1px solid ${T.b}` }} onMouseOver={e => e.currentTarget.style.background = T.d} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "14px 16px", fontSize: 15, fontWeight: 600, color: T.t }}>{truncate(agentName(a), 28)}</td>
                  <td style={{ padding: "14px 16px", fontSize: 14, color: T.s }}>{truncate(a.brokerage_name, 24) || "—"}</td>
                  <td style={{ padding: "14px 16px", fontSize: 14, color: T.s }}>{a.city || "—"}</td>
                  <td style={{ padding: "14px 16px", fontSize: 14, color: T.t, fontWeight: 600 }}>{a.state}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: T.m, fontFamily: "monospace" }}>{a.license_number}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 4, background: a.license_status === "Active" ? T.a + "18" : T.r + "18", color: a.license_status === "Active" ? T.a : T.r }}>{a.license_status}</span>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: T.m }}>{a.original_license_date ? new Date(a.original_license_date).getFullYear() : "—"}</td>
                  <td style={{ padding: "14px 16px" }}>
                    {onEnrich && <button onClick={(e) => { e.stopPropagation(); onEnrich(a); }} style={{ fontSize: 12, padding: "4px 10px", background: "rgba(34,211,238,0.15)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.3)", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>🔍 Enrich</button>}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "60px 20px", color: T.m }}>
                    {loading ? "Loading..." : "No agents found. Try adjusting your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20 }}>
          <div onClick={() => { if (page > 0) { setPage(p => p - 1); search(false); } }} style={{ padding: "10px 20px", borderRadius: 8, background: page > 0 ? T.card : T.d, color: page > 0 ? T.t : T.m, cursor: page > 0 ? "pointer" : "not-allowed", border: `1px solid ${T.b}` }}>← Previous</div>
          <div style={{ padding: "10px 20px", color: T.s }}>Page {page + 1} of {Math.ceil(total / LIMIT)}</div>
          <div onClick={() => { if ((page + 1) * LIMIT < total) { setPage(p => p + 1); search(false); } }} style={{ padding: "10px 20px", borderRadius: 8, background: (page + 1) * LIMIT < total ? T.card : T.d, color: (page + 1) * LIMIT < total ? T.t : T.m, cursor: (page + 1) * LIMIT < total ? "pointer" : "not-allowed", border: `1px solid ${T.b}` }}>Next →</div>
        </div>
      )}

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => { setSelectedAgent(null); setEnrichedData(null); }}>
          <div style={{ background: T.card, borderRadius: 16, padding: "32px", maxWidth: 600, width: "100%", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: T.t }}>{agentName(selectedAgent)}</div>
                <div style={{ fontSize: 14, color: T.s, marginTop: 4 }}>{selectedAgent.brokerage_name || '—'}</div>
              </div>
              <div onClick={() => { setSelectedAgent(null); setEnrichedData(null); }} style={{ fontSize: 20, color: T.m, cursor: "pointer" }}>✕</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div><div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 4 }}>STATE</div><div style={{ fontSize: 15, color: T.t }}>{selectedAgent.state}</div></div>
              <div><div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 4 }}>CITY</div><div style={{ fontSize: 15, color: T.t }}>{selectedAgent.city || "—"}</div></div>
              <div><div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 4 }}>LICENSE #</div><div style={{ fontSize: 15, color: T.t, fontFamily: "monospace" }}>{selectedAgent.license_number}</div></div>
              <div><div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 4 }}>STATUS</div><div style={{ fontSize: 15, color: selectedAgent.license_status === "Active" ? T.a : T.r }}>{selectedAgent.license_status}</div></div>
              <div><div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 4 }}>LICENSE TYPE</div><div style={{ fontSize: 15, color: T.t }}>{selectedAgent.license_type || "—"}</div></div>
              <div><div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 4 }}>LICENSED SINCE</div><div style={{ fontSize: 15, color: T.t }}>{selectedAgent.original_license_date || "—"}</div></div>
              {selectedAgent.phone && <div><div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 4 }}>PHONE</div><div style={{ fontSize: 15, color: T.t }}>{selectedAgent.phone}</div></div>}
              {selectedAgent.email && <div><div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 4 }}>EMAIL</div><div style={{ fontSize: 15, color: T.bl }}>{selectedAgent.email}</div></div>}
            </div>

            {enrichedData && (
              <div style={{ background: T.d, borderRadius: 10, padding: "16px 20px", marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: T.a, fontWeight: 700, marginBottom: 12 }}>🔍 ENRICHED DATA</div>
                {isValidEmail(enrichedData.email) ? <div style={{ fontSize: 14, color: T.t, marginBottom: 8 }}>📧 {enrichedData.email}</div> : <div style={{ fontSize: 14, color: T.m, marginBottom: 8, fontStyle: "italic" }}>📧 No email found</div>}
                {enrichedData.phone && <div style={{ fontSize: 14, color: T.t, marginBottom: 8 }}>📱 {enrichedData.phone}</div>}
                {enrichedData.linkedin && <div style={{ fontSize: 14, color: T.bl, marginBottom: 8 }}>💼 <a href={enrichedData.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: T.bl }}>{enrichedData.linkedin}</a></div>}
                {enrichedData.summary && <div style={{ fontSize: 14, color: T.s, lineHeight: 1.6, marginTop: 12 }}>{enrichedData.summary}</div>}
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <div onClick={() => enrichAgent(selectedAgent)} style={{ flex: 1, padding: "14px", borderRadius: 8, background: enriching ? T.m : T.p + "15", color: enriching ? T.s : T.p, fontSize: 15, fontWeight: 700, cursor: enriching ? "wait" : "pointer", textAlign: "center", border: `1px solid ${T.p}30` }}>
                {enriching ? "Enriching..." : "🔍 Enrich Contact"}
              </div>
              <div onClick={() => addToLeads(selectedAgent)} style={{ flex: 1, padding: "14px", borderRadius: 8, background: T.a, color: "#000", fontSize: 15, fontWeight: 700, cursor: "pointer", textAlign: "center" }}>
                ➕ Add to Pipeline
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
