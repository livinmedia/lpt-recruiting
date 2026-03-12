// RKRT.in CRM Feature
// Lead table/CRM view

import { useState } from 'react';
import T from '../../lib/theme';
import { STAGES } from '../../lib/constants';
import { ago } from '../../lib/utils';
import { Pill, UPill, TPill } from '../../components/ui/Pill';
import { supabase } from '../../lib/supabase';
import { trackActivity } from '../../lib/track';

const HEAT_COLOR = { cold: "#2A3345", warming: "#3B82F6", interested: "#F59E0B", hot: "#f97316", on_fire: "#F43F5E" };
const HEAT_ICON = { cold: "❄️", warming: "🌡️", interested: "🔥", hot: "🔥🔥", on_fire: "🔥🔥🔥" };
const RUE_CHAT_URL = "https://usknntguurefeyzusbdh.supabase.co/functions/v1/rue-chat";

export default function CRM({
  leads,
  onSelectLead,
  onNavigate,
  askRueInline,
  inlineLoading = false,
  userId = null,
  profile = null,
  onBulkDelete = () => {},
}) {
  const [crmSearch, setCrmSearch] = useState("");
  const [crmSort, setCrmSort] = useState("newest");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [emailLead, setEmailLead] = useState(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailDrafting, setEmailDrafting] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Rue coaching
  const [rueCoaching, setRueCoaching] = useState("");
  const [rueCoachingLoading, setRueCoachingLoading] = useState(false);
  const [rueCoachingOpen, setRueCoachingOpen] = useState(true);

  // Email history
  const [emailHistory, setEmailHistory] = useState([]);
  const [emailHistoryLoading, setEmailHistoryLoading] = useState(false);

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

  const hotLeads = [...leads]
    .filter(l => (l.interest_score || 0) > 0)
    .sort((a, b) => (b.interest_score || 0) - (a.interest_score || 0))
    .slice(0, 10);

  const allSelected = crmLeads.length > 0 && crmLeads.every(l => selectedIds.has(l.id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(crmLeads.map(l => l.id)));
  };
  const toggleOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    const ids = [...selectedIds];
    trackActivity(userId, 'bulk_delete', { count: ids.length });
    await supabase.from('leads').delete().in('id', ids);
    onBulkDelete(ids);
    setSelectedIds(new Set());
    setConfirmDelete(false);
    setDeleting(false);
  };

  const loadCoaching = async (lead) => {
    setRueCoachingLoading(true);
    setRueCoaching("");
    try {
      const content = `I'm about to email ${lead.first_name} ${lead.last_name} from ${lead.brokerage_name || lead.brokerage || "their brokerage"}. Their engagement score is ${lead.interest_score || 0}/100 (${lead.heat_level || "cold"}). Pipeline stage: ${(lead.pipeline_stage || "new").replace(/_/g, " ")}. ${lead.activity_summary ? `Activity: ${JSON.stringify(lead.activity_summary)}.` : ""} What approach should I take? What should I mention or avoid?`;
      const r = await fetch(RUE_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "You are Rue, a recruiting email coach. Give brief, actionable advice for this specific email. Be concise — 2-3 bullet points max.",
          messages: [{ role: "user", content }],
          user_id: userId,
        }),
      });
      const d = await r.json();
      if (d.content) setRueCoaching(d.content);
    } catch {
      setRueCoaching("Coaching unavailable right now.");
    }
    setRueCoachingLoading(false);
  };

  const loadEmailHistory = async (lead) => {
    if (!lead.id) return;
    setEmailHistoryLoading(true);
    try {
      const { data } = await supabase
        .from('email_log')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setEmailHistory(data || []);
    } catch {
      setEmailHistory([]);
    }
    setEmailHistoryLoading(false);
  };

  const openEmail = (lead) => {
    setEmailLead(lead);
    setEmailTo(lead.email || "");
    setEmailSubject(`Why ${lead.brokerage_name || lead.brokerage || "your brokerage"} agents are making a move`);
    setEmailBody("");
    setEmailSuccess(false);
    setRueCoaching("");
    setRueCoachingOpen(true);
    setEmailHistory([]);
    loadCoaching(lead);
    loadEmailHistory(lead);
  };

  const draftWithRue = async () => {
    if (!emailLead) return;
    setEmailDrafting(true);
    try {
      const coachingContext = rueCoaching ? `\n\nCoaching notes: ${rueCoaching}` : "";
      const r = await fetch(RUE_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "You are Rue, a recruiting email assistant. Draft a professional, personalized recruiting email. Output ONLY the email body — no subject line, no preamble.",
          messages: [{
            role: "user",
            content: `Draft a recruiting email to ${emailLead.first_name} ${emailLead.last_name} who works at ${emailLead.brokerage_name || emailLead.brokerage || "their current brokerage"}. They are in the ${(emailLead.pipeline_stage || "new").replace(/_/g, " ")} stage. Engagement score: ${emailLead.interest_score || 0}/100.${coachingContext} Make it personal, compelling, and focused on why they should consider switching to LPT Realty.`,
          }],
          user_id: userId,
        }),
      });
      const d = await r.json();
      if (d.content) setEmailBody(d.content);
    } catch {
      setEmailBody("Error drafting email. Please try again.");
    }
    setEmailDrafting(false);
  };

  const sendEmail = async () => {
    if (!emailTo || !emailSubject || !emailBody || emailSending) return;
    setEmailSending(true);
    try {
      await fetch("https://usknntguurefeyzusbdh.supabase.co/functions/v1/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "user_outreach",
          to: emailTo,
          subject: emailSubject,
          body: emailBody,
          lead_id: emailLead?.id,
          user_id: userId,
        }),
      });
      if (emailLead?.id && userId) {
        await supabase.from('lead_activities').insert({ lead_id: emailLead.id, user_id: userId, action: 'outreach_sent', notes: `Email: ${emailSubject}` });
        trackActivity(userId, 'send_email', { lead_id: emailLead.id });
      }
    } catch { /* swallow */ }
    setEmailSending(false);
    setEmailSuccess(true);
  };

  const rkrtEmail = profile?.rkrt_email;
  const fromName = profile?.full_name || "You";

  return (
    <>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderRadius: 10, background: T.card, border: `2px solid ${T.a}`, marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.t }}>{selectedIds.size} selected</span>
          <div style={{ flex: 1 }} />
          <div
            onClick={() => setConfirmDelete(true)}
            style={{ padding: "8px 18px", borderRadius: 7, background: "#F43F5E", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            🗑️ Delete Selected
          </div>
          <div
            onClick={() => setSelectedIds(new Set())}
            style={{ padding: "8px 14px", borderRadius: 7, background: T.d, border: `1px solid ${T.b}`, color: T.s, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            ✕ Clear
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 14, padding: "32px 36px", maxWidth: 420, width: "90%", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 8 }}>Delete {selectedIds.size} lead{selectedIds.size > 1 ? "s" : ""}?</div>
            <div style={{ fontSize: 14, color: T.s, marginBottom: 24 }}>This cannot be undone.</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <div onClick={() => setConfirmDelete(false)} style={{ padding: "10px 24px", borderRadius: 8, background: T.d, border: `1px solid ${T.b}`, color: T.s, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Cancel</div>
              <div onClick={handleBulkDelete} style={{ padding: "10px 24px", borderRadius: 8, background: "#F43F5E", color: "#fff", fontSize: 14, fontWeight: 700, cursor: deleting ? "wait" : "pointer", opacity: deleting ? 0.6 : 1 }}>
                {deleting ? "Deleting..." : "Delete"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Sidebar */}
      {emailLead && (
        <>
          <div onClick={() => setEmailLead(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 900 }} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 500, background: T.side, borderLeft: `1px solid ${T.b}`, zIndex: 1000, display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(0,0,0,0.5)", animation: "slideInRight 0.25s ease" }}>
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.b}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: T.t, flex: 1 }}>📧 Email {emailLead.first_name} {emailLead.last_name}</span>
              <div onClick={() => setEmailLead(null)} style={{ width: 28, height: 28, borderRadius: 6, background: T.d, border: `1px solid ${T.b}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.s, fontSize: 14 }}>✕</div>
            </div>

            {/* From address */}
            <div style={{ padding: "12px 24px", borderBottom: `1px solid ${T.b}`, background: T.d, flexShrink: 0 }}>
              {rkrtEmail ? (
                <>
                  <div style={{ fontSize: 12, color: T.m, fontWeight: 700, letterSpacing: 1 }}>FROM</div>
                  <div style={{ fontSize: 13, color: T.t, marginTop: 3 }}>
                    {fromName} <span style={{ color: T.a, fontWeight: 700 }}>&lt;{rkrtEmail}&gt;</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.m, marginTop: 2 }}>Replies go to {profile?.email || "your email"}</div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "#F59E0B" }}>⚠️ Set up your @rkrt.in email in <span style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => { setEmailLead(null); onNavigate("profile"); }}>Profile settings</span></div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              {emailSuccess ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 8 }}>Email sent to {emailLead.first_name}!</div>
                  <div onClick={() => setEmailLead(null)} style={{ display: "inline-block", padding: "10px 24px", borderRadius: 8, background: T.a, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 12 }}>Close</div>
                </div>
              ) : (
                <>
                  {/* Rue Coaching */}
                  <div style={{ borderLeft: `3px solid ${T.a}`, background: T.a + "08", borderRadius: "0 8px 8px 0", overflow: "hidden" }}>
                    <div
                      onClick={() => setRueCoachingOpen(o => !o)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", cursor: "pointer" }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.a, flex: 1 }}>🤖 Rue's Coaching</span>
                      {rueCoachingLoading && <div style={{ width: 10, height: 10, borderRadius: "50%", background: T.a, animation: "pulse 0.8s infinite" }} />}
                      <span style={{ fontSize: 11, color: T.m }}>{rueCoachingOpen ? "▲" : "▼"}</span>
                    </div>
                    {rueCoachingOpen && (
                      <div style={{ padding: "0 14px 12px" }}>
                        {rueCoachingLoading ? (
                          <div style={{ fontSize: 12, color: T.m, fontStyle: "italic" }}>Rue is analyzing this lead...</div>
                        ) : rueCoaching ? (
                          <div style={{ fontSize: 13, color: T.t, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{rueCoaching}</div>
                        ) : (
                          <div style={{ fontSize: 12, color: T.m }}>No coaching available.</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* To */}
                  <div>
                    <div style={{ fontSize: 11, color: T.m, fontWeight: 700, letterSpacing: 1.2, marginBottom: 6 }}>TO</div>
                    <input value={emailTo} onChange={e => setEmailTo(e.target.value)} style={{ width: "100%", background: T.d, border: `1px solid ${T.b}`, borderRadius: 7, padding: "10px 14px", fontSize: 14, color: T.t, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>

                  {/* Subject */}
                  <div>
                    <div style={{ fontSize: 11, color: T.m, fontWeight: 700, letterSpacing: 1.2, marginBottom: 6 }}>SUBJECT</div>
                    <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={{ width: "100%", background: T.d, border: `1px solid ${T.b}`, borderRadius: 7, padding: "10px 14px", fontSize: 14, color: T.t, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>

                  {/* Draft button */}
                  <div
                    onClick={draftWithRue}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, background: T.a + "15", border: `1px solid ${T.a}30`, cursor: emailDrafting ? "wait" : "pointer", opacity: emailDrafting ? 0.6 : 1 }}
                  >
                    <span style={{ fontSize: 18 }}>✨</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.a }}>{emailDrafting ? "Drafting..." : "Draft with Rue"}</span>
                  </div>

                  {/* Body */}
                  <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                    <div style={{ fontSize: 11, color: T.m, fontWeight: 700, letterSpacing: 1.2, marginBottom: 6 }}>BODY</div>
                    <textarea
                      value={emailBody}
                      onChange={e => setEmailBody(e.target.value)}
                      placeholder="Type your message or click ✨ Draft with Rue..."
                      style={{ flex: 1, minHeight: 200, width: "100%", background: T.d, border: `1px solid ${T.b}`, borderRadius: 7, padding: "12px 14px", fontSize: 14, color: T.t, outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }}
                    />
                  </div>

                  {/* Send */}
                  <div
                    onClick={sendEmail}
                    style={{ padding: "13px", borderRadius: 8, background: (!emailTo || !emailSubject || !emailBody || emailSending) ? T.d : T.a, color: (!emailTo || !emailSubject || !emailBody || emailSending) ? T.m : "#000", fontSize: 14, fontWeight: 700, textAlign: "center", cursor: (!emailTo || !emailSubject || !emailBody || emailSending) ? "not-allowed" : "pointer", transition: "all 0.15s", width: "100%", boxSizing: "border-box" }}
                  >
                    {emailSending ? "Sending..." : "📤 Send Email"}
                  </div>

                  {/* Email History */}
                  {(emailHistory.length > 0 || emailHistoryLoading) && (
                    <div style={{ borderTop: `1px solid ${T.b}`, paddingTop: 12 }}>
                      <div style={{ fontSize: 11, color: T.m, fontWeight: 700, letterSpacing: 1.2, marginBottom: 8 }}>PREVIOUS EMAILS</div>
                      {emailHistoryLoading ? (
                        <div style={{ fontSize: 12, color: T.m }}>Loading history...</div>
                      ) : (
                        emailHistory.map((h, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < emailHistory.length - 1 ? `1px solid ${T.b}` : "none", alignItems: "flex-start" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: T.t, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.subject || "No subject"}</div>
                              <div style={{ fontSize: 11, color: T.m, marginTop: 2 }}>{h.from_address || rkrtEmail || "—"}</div>
                            </div>
                            <div style={{ flexShrink: 0, textAlign: "right" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: h.status === "opened" ? T.a : h.status === "delivered" ? T.bl : h.status === "bounced" ? "#F43F5E" : T.m }}>{h.status || "sent"}</div>
                              <div style={{ fontSize: 11, color: T.m, marginTop: 2 }}>{ago(h.created_at)}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Rue Quick Actions */}
      <div className="ask-rue-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${ruePrompts.length},1fr)`, gap: 12, marginBottom: 20 }}>
        {ruePrompts.map(([icon, label, q, c], i) => (
          <div
            key={i}
            onClick={() => askRueInline(q)}
            style={{ background: (c || T.bl) + "10", border: `1px solid ${(c || T.bl)}20`, borderRadius: 10, padding: "18px 20px", cursor: inlineLoading ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 12, opacity: inlineLoading ? 0.5 : 1 }}
            onMouseOver={(e) => { if (!inlineLoading) e.currentTarget.style.background = (c || T.bl) + "20"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = (c || T.bl) + "10"; }}
          >
            <span style={{ fontSize: 24 }}>{icon}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.t }}>{label}</span>
          </div>
        ))}
      </div>

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

      {/* 🔥 Hot Leads Pinned */}
      {hotLeads.length > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.b}`, background: T.side, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#FF4444", letterSpacing: 1.2 }}>🔥 HOT LEADS</span>
            <span style={{ fontSize: 12, color: T.m }}>— top {hotLeads.length} by engagement score</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <tbody>
                {hotLeads.map((l, i) => {
                  const heatColor = HEAT_COLOR[l.heat_level] || T.b;
                  const heatIcon = HEAT_ICON[l.heat_level] || "❄️";
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.b}`, borderLeft: `3px solid ${heatColor}` }}
                      onMouseOver={ev => ev.currentTarget.style.background = T.d}
                      onMouseOut={ev => ev.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap", fontSize: 16 }}>{heatIcon}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ padding: "3px 9px", borderRadius: 20, background: heatColor + "22", border: `1px solid ${heatColor}44`, fontSize: 12, fontWeight: 800, color: heatColor }}>{l.interest_score}</span>
                      </td>
                      <td onClick={() => { onSelectLead(l); onNavigate("lead"); }} style={{ padding: "10px 14px", fontSize: 14, fontWeight: 700, color: T.t, cursor: "pointer", whiteSpace: "nowrap" }}>
                        {l.first_name} {l.last_name}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 13, color: T.s }}>{(l.brokerage_name || l.brokerage || "—").substring(0, 26)}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <Pill text={l.pipeline_stage?.replace(/_/g, " ") || "—"} color={STAGES.find(s => s.id === l.pipeline_stage)?.c || T.s} />
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {l.email && (
                          <div onClick={() => openEmail(l)} title="Email this lead" style={{ width: 28, height: 28, borderRadius: 6, background: T.bl + "20", border: `1px solid ${T.bl}30`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13 }}>📧</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hotLeads.length > 0 && (
        <div style={{ fontSize: 11, color: T.m, fontWeight: 700, letterSpacing: 1.5, marginBottom: 8, paddingLeft: 4 }}>ALL LEADS</div>
      )}

      {/* Main Table */}
      <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="crm-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 1050 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "center", padding: "14px 12px", background: T.side, borderBottom: `1px solid ${T.b}`, width: 40 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: "pointer", accentColor: T.a, width: 15, height: 15 }} />
                </th>
                {["Name", "Email", "Phone", "Market", "Brokerage", "Tier", "Urgency", "Stage", "Source", "Added", "Score"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "14px 16px", fontSize: 12, fontWeight: 700, color: T.m, letterSpacing: 1.5, borderBottom: `1px solid ${T.b}`, whiteSpace: "nowrap", background: T.side }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {crmLeads.length > 0 ? crmLeads.map((l, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: `1px solid ${T.b}`, background: selectedIds.has(l.id) ? T.a + "10" : "transparent" }}
                  onMouseOver={ev => { if (!selectedIds.has(l.id)) ev.currentTarget.style.background = T.d; }}
                  onMouseOut={ev => { ev.currentTarget.style.background = selectedIds.has(l.id) ? T.a + "10" : "transparent"; }}
                >
                  <td style={{ textAlign: "center", padding: "14px 12px" }}>
                    <input type="checkbox" checked={selectedIds.has(l.id)} onChange={() => toggleOne(l.id)} onClick={e => e.stopPropagation()} style={{ cursor: "pointer", accentColor: T.a, width: 15, height: 15 }} />
                  </td>
                  <td onClick={() => { onSelectLead(l); onNavigate("lead"); }} style={{ padding: "14px 16px", fontSize: 15, fontWeight: 600, color: T.t, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {l.first_name} {l.last_name}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 14, color: T.bl }}>
                    {l.email ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <a href={`mailto:${l.email}`} style={{ color: T.bl, textDecoration: "none" }}>{l.email.length > 22 ? l.email.substring(0, 22) + "…" : l.email}</a>
                        <div onClick={() => openEmail(l)} title="Open email composer" style={{ width: 22, height: 22, borderRadius: 4, background: T.bl + "20", border: `1px solid ${T.bl}30`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 11, flexShrink: 0 }}>✉️</div>
                      </div>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 14, color: T.s, whiteSpace: "nowrap" }}>{l.phone || "—"}</td>
                  <td style={{ padding: "14px 16px", fontSize: 14, color: T.s }}>{l.market || "—"}</td>
                  <td style={{ padding: "14px 16px", fontSize: 14, color: l.brokerage?.toLowerCase().includes("lpt") ? T.a : T.t }}>{l.brokerage?.substring(0, 22) || "—"}</td>
                  <td style={{ padding: "14px 16px" }}><TPill t={l.tier} /></td>
                  <td style={{ padding: "14px 16px" }}><UPill u={l.urgency} /></td>
                  <td style={{ padding: "14px 16px" }}><Pill text={l.pipeline_stage?.replace(/_/g, " ") || "—"} color={STAGES.find(s => s.id === l.pipeline_stage)?.c || T.s} /></td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: T.s }}>{l.source || "Ad"}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: T.m, whiteSpace: "nowrap" }}>{ago(l.created_at)}</td>
                  <td style={{ padding: "14px 12px" }}>
                    {(l.interest_score || 0) > 0 && (
                      <span style={{ padding: "2px 7px", borderRadius: 20, background: (HEAT_COLOR[l.heat_level] || T.b) + "22", border: `1px solid ${(HEAT_COLOR[l.heat_level] || T.b)}44`, fontSize: 11, fontWeight: 800, color: HEAT_COLOR[l.heat_level] || T.m }}>{l.interest_score}</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={12} style={{ textAlign: "center", padding: "60px 20px", color: T.m, fontSize: 16 }}>No leads found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
