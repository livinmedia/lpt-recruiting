// RKRT.in Lead Page
// Individual lead detail view

import { useState, useEffect } from 'react';
import T from '../../lib/theme';
import { STAGES } from '../../lib/constants';
import { ago } from '../../lib/utils';
import { supabase, logActivity } from '../../lib/supabase';
import { Pill, UPill, TPill } from '../../components/ui/Pill';
import { CopyButton } from '../../components/ui/CopyButton';

const RUE_CHAT_URL = "https://usknntguurefeyzusbdh.supabase.co/functions/v1/rue-chat";

function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const EVENT_META = {
  email_open:           { icon: "📧", color: "#10b981", label: (m) => `Opened email${m?.subject ? `: ${m.subject}` : ""}` },
  outreach_sent:        { icon: "✉️", color: "#22d3ee", label: (m) => `Email sent${m?.subject ? `: ${m.subject}` : ""}` },
  blog_visit:           { icon: "📝", color: "#a78bfa", label: () => "Visited blog" },
  return_visit:         { icon: "🔄", color: "#f59e0b", label: () => "Returned to site" },
  multiple_visits_day:  { icon: "👀", color: "#f97316", label: () => "Multiple page views" },
  agent_enriched:       { icon: "🔍", color: "#22d3ee", label: () => "Contact enriched from directory" },
  lead_created:         { icon: "➕", color: "#10b981", label: () => "Added to CRM" },
  form_submit:          { icon: "📋", color: "#3b82f6", label: () => "Submitted form" },
  landing_page_submit:  { icon: "🏠", color: "#10b981", label: () => "Landing page submission" },
};

function ScoreGauge({ score }) {
  const s = Math.min(Math.max(score || 0, 0), 100);
  const pct = s / 100;
  const label = s >= 81 ? "On Fire 🔥" : s >= 61 ? "Hot" : s >= 41 ? "Interested" : s >= 21 ? "Warming" : "Cold";
  const color = s >= 81 ? "#ef4444" : s >= 61 ? "#f97316" : s >= 41 ? "#f59e0b" : s >= 21 ? "#22d3ee" : "#3b82f6";
  const r = 80, cx = 100, cy = 95, sw = 16;
  const circumference = Math.PI * r;
  const dashLen = circumference * pct;
  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <svg viewBox="0 0 200 120" width="100%" style={{ maxWidth: 220 }}>
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="25%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="75%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#1a2540" strokeWidth={sw} strokeLinecap="round" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${dashLen} ${circumference}`} style={{ transition: "stroke-dasharray 1s ease, stroke 0.5s ease" }} />
      </svg>
      <div style={{ marginTop: -10, fontSize: 36, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace" }}>{s}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color, marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Based on engagement</div>
    </div>
  );
}

export default function LeadPage({ lead, onBack, onAskInline, inlineResponse, inlineLoading, userId, onDelete, userProfile }) {
  const [tab, setTab] = useState("overview");
  const [notes, setNotes] = useState(lead.notes || "");
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Email sidebar
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailDrafting, setEmailDrafting] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [rueCoaching, setRueCoaching] = useState("");
  const [rueCoachingLoading, setRueCoachingLoading] = useState(false);
  const [rueCoachingOpen, setRueCoachingOpen] = useState(true);
  const [emailHistory, setEmailHistory] = useState([]);
  const [emailHistoryLoading, setEmailHistoryLoading] = useState(false);

  const [events, setEvents] = useState([]);
  const [enriching, setEnriching] = useState(false);
  const [enrichDone, setEnrichDone] = useState(false);

  // Drip sequence
  const [dripEmails, setDripEmails] = useState([]);
  const [dripEnabled, setDripEnabled] = useState(lead.drip_enabled ?? false);
  const [dripToggling, setDripToggling] = useState(false);

  useEffect(() => {
    if (lead?.id) {
      loadTasks();
      supabase.from("lead_events").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false }).limit(10).then(({ data }) => setEvents(data || []));
      loadDripEmails();
    }
  }, [lead?.id]);

  const loadDripEmails = async () => {
    const { data } = await supabase.from("lead_drip_emails").select("*").eq("lead_id", lead.id).order("scheduled_for", { ascending: true });
    setDripEmails(data || []);
  };

  const toggleDrip = async () => {
    setDripToggling(true);
    const newVal = !dripEnabled;
    await supabase.from("leads").update({ drip_enabled: newVal }).eq("id", lead.id);
    lead.drip_enabled = newVal;
    setDripEnabled(newVal);
    logActivity(userId, newVal ? 'drip_enabled' : 'drip_disabled', { lead_id: lead.id });
    setDripToggling(false);
  };

  const cancelDripEmail = async (emailId) => {
    await supabase.from("lead_drip_emails").update({ status: "cancelled" }).eq("id", emailId);
    loadDripEmails();
  };

  const loadTasks = async () => {
    const { data, error } = await supabase.from('lead_tasks').select('*').eq('lead_id', lead.id).order('created_at', { ascending: true });
    if (error) console.error('loadTasks error:', error);
    setTasks(data || []);
  };

  const saveNotes = async () => {
    setSaving(true);
    await supabase.from("leads").update({ notes }).eq("id", lead.id);
    logActivity(userId, 'update_lead_notes', { lead_id: lead.id });
    setSaving(false);
  };

  const updateStage = async (newStage) => {
    await supabase.from("leads").update({ pipeline_stage: newStage }).eq("id", lead.id);
    logActivity(userId, 'update_lead_stage', { lead_id: lead.id, stage: newStage });
    lead.pipeline_stage = newStage;
  };

  const completeTask = async (taskId) => {
    await supabase.from('lead_tasks').update({ completed_at: new Date().toISOString() }).eq('id', taskId);
    loadTasks();
  };

  const handleEnrich = async () => {
    setEnriching(true);
    setEnrichDone(false);
    try {
      const res = await fetch("https://usknntguurefeyzusbdh.supabase.co/functions/v1/enrich-agent-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id, user_id: userId }),
      });
      const json = await res.json();
      if (res.ok) {
        if (json.quality === 0 || json.no_credit_charged) {
          setEnrichDone(false);
          setEnriching(false);
          alert("No data found — no credit charged.");
          return;
        }
        // Refresh lead data in place so sections update
        const { data: updated } = await supabase.from("leads").select("*").eq("id", lead.id).single();
        if (updated) Object.assign(lead, updated);
        setEnrichDone(true);
        setTimeout(() => setEnrichDone(false), 3000);
        logActivity(userId, "enrich_lead", { lead_id: lead.id });
      }
    } catch (err) {
      console.error("Enrich error:", err);
    }
    setEnriching(false);
  };

  const interestLevel = (score) => {
    if (score <= 20) return { label: "Cold", color: T.m, emoji: "🥶" };
    if (score <= 40) return { label: "Warming", color: T.bl, emoji: "🌡️" };
    if (score <= 60) return { label: "Interested", color: T.y, emoji: "👀" };
    if (score <= 80) return { label: "Hot", color: "#f97316", emoji: "🔥" };
    return { label: "On Fire", color: T.r, emoji: "🔥🔥" };
  };

  const interest = interestLevel(lead.interest_score || 0);

  const openEmailSidebar = async () => {
    setEmailTo(lead.email || "");
    setEmailSubject(`Why ${lead.brokerage_name || lead.brokerage || "your brokerage"} agents are making a move`);
    setEmailBody("");
    setEmailSuccess(false);
    setRueCoaching("");
    setRueCoachingOpen(true);
    setEmailHistory([]);
    setEmailOpen(true);
    // Load coaching
    setRueCoachingLoading(true);
    try {
      const r = await fetch(RUE_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "You are Rue, a recruiting email coach. Give brief, actionable advice. 2-3 bullet points max.",
          messages: [{ role: "user", content: `I'm emailing ${lead.first_name} ${lead.last_name} from ${lead.brokerage_name || lead.brokerage || "their brokerage"}. Score: ${lead.interest_score || 0}/100 (${lead.heat_level || "cold"}). Stage: ${(lead.pipeline_stage || "new").replace(/_/g, " ")}. ${lead.activity_summary ? `Activity: ${JSON.stringify(lead.activity_summary)}.` : ""} What approach should I take?` }],
          user_id: userId,
        }),
      });
      const d = await r.json();
      if (d.content) setRueCoaching(d.content);
    } catch { setRueCoaching("Coaching unavailable right now."); }
    setRueCoachingLoading(false);
    // Load history
    if (lead.id) {
      setEmailHistoryLoading(true);
      try {
        const { data } = await supabase.from('email_log').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(5);
        setEmailHistory(data || []);
      } catch { setEmailHistory([]); }
      setEmailHistoryLoading(false);
    }
  };

  const draftWithRue = async () => {
    setEmailDrafting(true);
    const autoSubject = !emailSubject.trim()
      ? (lead.brokerage_name ? `Quick question about ${lead.brokerage_name}` : `${lead.first_name}, quick thought for you`)
      : emailSubject;
    if (!emailSubject.trim()) setEmailSubject(autoSubject);
    try {
      const draftPrompt = `Write a recruiting email from me to this lead.

ABOUT ME (the recruiter):
- Name: ${userProfile?.full_name || "your recruiter"}
- My brokerage: ${userProfile?.brokerage || "LPT Realty"}
- My email: ${userProfile?.rkrt_email || userProfile?.email || ""}
- My market: ${userProfile?.market || "nationwide"}

ABOUT THE LEAD:
- Name: ${lead.first_name} ${lead.last_name}
- Their current brokerage: ${lead.brokerage_name || lead.brokerage || "unknown"}
- Their market: ${lead.market || "unknown"}
- Email: ${lead.email || "unknown"}
- Phone: ${lead.phone || "unknown"}
- Pipeline stage: ${(lead.pipeline_stage || "new").replace(/_/g, " ")}
- Interest score: ${lead.interest_score || 0}/100 (${lead.heat_level || "cold"})
- Activity: ${lead.activity_summary ? JSON.stringify(lead.activity_summary) : "no activity yet"}
- Source: ${lead.source || "unknown"}
- Tier: ${lead.tier || "unknown"}
- Notes: ${lead.notes || "none"}
- Pain points: ${lead.pain_points ? JSON.stringify(lead.pain_points) : "unknown"}
- Outreach angle: ${lead.outreach_angle || "none set"}
${rueCoaching ? `\nCoaching notes from Rue: ${rueCoaching}` : ""}

EMAIL SUBJECT: ${autoSubject}

Write the email body. Be specific to this person — reference their brokerage, market, or situation. Make it feel like I actually know them. No generic recruiting spam.`;
      const r = await fetch(RUE_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "You are Rue, an expert recruiting email writer for real estate. Write personalized, compelling emails that feel human — NOT templated.\n\nCRITICAL RULES:\n- NEVER use placeholders like [Name], [Your Brokerage], [X years], etc.\n- NEVER use generic phrases like \"your impressive work\" or \"exciting opportunity\"\n- Use SPECIFIC details about the lead and recruiter provided\n- Keep it conversational and direct — like a real person texting a colleague\n- Short paragraphs, 150-250 words max\n- End with a clear, low-pressure CTA\n- Do NOT include a subject line in the body — just write the email body\n- Sign off with the recruiter's actual name",
          messages: [{ role: "user", content: draftPrompt }],
          user_id: userId,
        }),
      });
      const d = await r.json();
      if (d.content) setEmailBody(d.content);
    } catch { setEmailBody("Error drafting. Please try again."); }
    setEmailDrafting(false);
  };

  const sendEmail = async () => {
    if (!emailTo || !emailSubject || !emailBody || emailSending) return;
    setEmailSending(true);
    try {
      await fetch("https://usknntguurefeyzusbdh.supabase.co/functions/v1/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "user_outreach", to: emailTo, subject: emailSubject, body: emailBody, lead_id: lead.id, user_id: userId }),
      });
      if (lead.id && userId) {
        await supabase.from('lead_activities').insert({ lead_id: lead.id, user_id: userId, action: 'outreach_sent', notes: `Email: ${emailSubject}` });
      }
    } catch { /* swallow */ }
    setEmailSending(false);
    setEmailSuccess(true);
  };

  const rkrtEmail = userProfile?.rkrt_email;
  const fromName = userProfile?.full_name || "You";

  // Rue prompts for this lead
  const ruePrompts = [
    ["🔍", "Research", `Research ${lead.first_name} ${lead.last_name} at ${lead.brokerage || "their brokerage"} in ${lead.market || "their market"}. Find production, reviews, social media, and give me an outreach angle.`],
    ["📱", "Draft Outreach", `Draft a personalized recruiting message to ${lead.first_name} ${lead.last_name}. They're at ${lead.brokerage || "unknown"} in ${lead.market || "unknown"}.${lead.outreach_angle ? " Angle: " + lead.outreach_angle : ""}`],
    ["🎯", "Objection Prep", `What objections might ${lead.first_name} ${lead.last_name} have about switching from ${lead.brokerage || "their brokerage"}? Give me responses for each.`],
    ["📋", "Meeting Prep", `Create a meeting prep sheet for ${lead.first_name} ${lead.last_name}. They're ${lead.tier || "unknown"} tier at ${lead.brokerage || "unknown"}. Include talking points and how to close.`],
  ];

  return (
    <div>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

      {/* Email Sidebar */}
      {emailOpen && (
        <>
          <div onClick={() => setEmailOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 900 }} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, background: T.side, borderLeft: `1px solid ${T.b}`, zIndex: 1000, display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(0,0,0,0.5)", animation: "slideInRight 0.25s ease" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.b}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: T.t, flex: 1 }}>📧 Email {lead.first_name} {lead.last_name}</span>
              <div onClick={() => setEmailOpen(false)} style={{ width: 28, height: 28, borderRadius: 6, background: T.d, border: `1px solid ${T.b}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.s, fontSize: 14 }}>✕</div>
            </div>
            {/* From address */}
            <div style={{ padding: "12px 24px", borderBottom: `1px solid ${T.b}`, background: T.d, flexShrink: 0 }}>
              {rkrtEmail ? (
                <>
                  <div style={{ fontSize: 12, color: T.m, fontWeight: 700, letterSpacing: 1 }}>FROM</div>
                  <div style={{ fontSize: 13, color: T.t, marginTop: 3 }}>{fromName} <span style={{ color: T.a, fontWeight: 700 }}>&lt;{rkrtEmail}&gt;</span></div>
                  <div style={{ fontSize: 11, color: T.m, marginTop: 2 }}>Replies go to {userProfile?.email || "your email"}</div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "#F59E0B" }}>⚠️ Set up your @rkrt.in email in Profile settings</div>
              )}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              {emailSuccess ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 8 }}>Email sent to {lead.first_name}!</div>
                  <div onClick={() => setEmailOpen(false)} style={{ display: "inline-block", padding: "10px 24px", borderRadius: 8, background: T.a, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 12 }}>Close</div>
                </div>
              ) : (
                <>
                  {/* Rue Coaching */}
                  <div style={{ borderLeft: `3px solid ${T.a}`, background: T.a + "08", borderRadius: "0 8px 8px 0", overflow: "hidden" }}>
                    <div onClick={() => setRueCoachingOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", cursor: "pointer" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.a, flex: 1 }}>🤖 Rue's Coaching</span>
                      {rueCoachingLoading && <div style={{ width: 10, height: 10, borderRadius: "50%", background: T.a, animation: "pulse 0.8s infinite" }} />}
                      <span style={{ fontSize: 11, color: T.m }}>{rueCoachingOpen ? "▲" : "▼"}</span>
                    </div>
                    {rueCoachingOpen && (
                      <div style={{ padding: "0 14px 12px" }}>
                        {rueCoachingLoading
                          ? <div style={{ fontSize: 12, color: T.m, fontStyle: "italic" }}>Rue is analyzing this lead...</div>
                          : rueCoaching
                            ? <div style={{ fontSize: 13, color: T.t, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{rueCoaching}</div>
                            : <div style={{ fontSize: 12, color: T.m }}>No coaching available.</div>
                        }
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
                  <div onClick={draftWithRue} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, background: T.a + "15", border: `1px solid ${T.a}30`, cursor: emailDrafting ? "wait" : "pointer", opacity: emailDrafting ? 0.6 : 1 }}>
                    <span style={{ fontSize: 18 }}>✨</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.a }}>{emailDrafting ? "Drafting..." : "Draft with Rue"}</span>
                  </div>
                  {/* Body */}
                  <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                    <div style={{ fontSize: 11, color: T.m, fontWeight: 700, letterSpacing: 1.2, marginBottom: 6 }}>BODY</div>
                    <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Type your message or click ✨ Draft with Rue..." style={{ flex: 1, minHeight: 200, width: "100%", background: T.d, border: `1px solid ${T.b}`, borderRadius: 7, padding: "12px 14px", fontSize: 14, color: T.t, outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }} />
                  </div>
                  {/* Send */}
                  <div onClick={sendEmail} style={{ padding: "13px", borderRadius: 8, background: (!emailTo || !emailSubject || !emailBody || emailSending) ? T.d : T.a, color: (!emailTo || !emailSubject || !emailBody || emailSending) ? T.m : "#000", fontSize: 14, fontWeight: 700, textAlign: "center", cursor: (!emailTo || !emailSubject || !emailBody || emailSending) ? "not-allowed" : "pointer", transition: "all 0.15s", boxSizing: "border-box" }}>
                    {emailSending ? "Sending..." : "📤 Send Email"}
                  </div>
                  {/* Email History */}
                  {(emailHistory.length > 0 || emailHistoryLoading) && (
                    <div style={{ borderTop: `1px solid ${T.b}`, paddingTop: 12 }}>
                      <div style={{ fontSize: 11, color: T.m, fontWeight: 700, letterSpacing: 1.2, marginBottom: 8 }}>PREVIOUS EMAILS</div>
                      {emailHistoryLoading ? (
                        <div style={{ fontSize: 12, color: T.m }}>Loading history...</div>
                      ) : emailHistory.map((h, i) => (
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
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div onClick={onBack} style={{ fontSize: 14, color: T.s, cursor: "pointer", marginBottom: 8 }}>← Back to Pipeline</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.t }}>{lead.first_name} {lead.last_name}</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
            <TPill t={lead.tier} />
            <UPill u={lead.urgency} />
            <Pill text={lead.pipeline_stage?.replace(/_/g, " ") || "new"} color={STAGES.find(s => s.id === lead.pipeline_stage)?.c || T.s} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {lead.email && (
            <div onClick={openEmailSidebar} style={{ padding: "10px 16px", borderRadius: 8, background: T.a, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>📧 Email</div>
          )}
          <div onClick={() => setShowDeleteConfirm(true)} style={{ padding: "10px 16px", borderRadius: 8, background: T.r + "15", color: T.r, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>🗑️ Delete</div>
        </div>
      </div>

      {/* Rue Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        {/* Enrich Contact — replaces Research */}
        <div
          onClick={enriching ? undefined : handleEnrich}
          style={{ background: enrichDone ? "rgba(16,185,129,0.1)" : T.card, border: `1px solid ${enrichDone ? "#10b981" : enriching ? T.a : T.b}`, borderRadius: 8, padding: "14px 16px", cursor: enriching ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 10, opacity: enriching ? 0.6 : 1, transition: "all 0.2s" }}
        >
          <span style={{ fontSize: 20 }}>{enrichDone ? "✅" : "🔍"}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: enrichDone ? "#10b981" : T.t }}>
            {enrichDone ? "Enriched!" : enriching ? "Enriching..." : "Enrich Contact"}
          </span>
        </div>
        {ruePrompts.slice(1).map(([icon, label, q], i) => (
          <div
            key={i}
            onClick={() => onAskInline(q)}
            style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 8, padding: "14px 16px", cursor: inlineLoading ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 10, opacity: inlineLoading ? 0.5 : 1 }}
            onMouseOver={e => e.currentTarget.style.borderColor = T.bh}
            onMouseOut={e => e.currentTarget.style.borderColor = T.b}
          >
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: T.t }}>{label}</span>
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
            <span style={{ fontSize: 12, color: T.a, fontWeight: 700 }}>🤖 RUE RESPONSE</span>
            <CopyButton text={inlineResponse} label="Copy" />
          </div>
          <pre style={{ fontSize: 14, color: T.t, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, maxHeight: 300, overflow: "auto" }}>{inlineResponse}</pre>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["overview", "tasks", "notes", "activity"].map(t => (
          <div key={t} onClick={() => setTab(t)} style={{ padding: "10px 18px", borderRadius: 8, background: tab === t ? T.a + "18" : T.card, color: tab === t ? T.a : T.s, fontSize: 14, fontWeight: 600, cursor: "pointer", border: `1px solid ${tab === t ? T.a + "40" : T.b}` }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        {/* Main Content */}
        <div>
          {tab === "overview" && (
            <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "24px" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 20 }}>Contact Info</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 4 }}>EMAIL</div>
                  <div onClick={lead.email ? openEmailSidebar : undefined} style={{ fontSize: 15, color: lead.email ? T.bl : T.m, cursor: lead.email ? "pointer" : "default", textDecoration: lead.email ? "underline" : "none" }}>{lead.email || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 4 }}>PHONE</div>
                  <div style={{ fontSize: 15, color: T.t }}>{lead.phone || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 4 }}>MARKET</div>
                  <div style={{ fontSize: 15, color: T.t }}>{lead.market || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 4 }}>BROKERAGE</div>
                  <div style={{ fontSize: 15, color: lead.brokerage?.toLowerCase().includes("lpt") ? T.a : T.t }}>{lead.brokerage || "—"}</div>
                </div>
              </div>

              {lead.outreach_angle && (
                <div style={{ marginTop: 20, padding: "16px", borderRadius: 8, background: T.d }}>
                  <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 4 }}>OUTREACH ANGLE</div>
                  <div style={{ fontSize: 14, color: T.t, lineHeight: 1.6 }}>{lead.outreach_angle}</div>
                </div>
              )}

              {lead?.raw_dossier && (
                <div style={{ marginTop: 16, background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ color: '#00E5A0', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>🎯 RUE RECRUITING DOSSIER</div>
                  {lead.raw_dossier.split('##').filter(s => s.trim()).map((section, i) => {
                    const lines = section.trim().split('\n').filter(Boolean);
                    const title = lines[0]?.trim();
                    const body = lines.slice(1).join('\n').trim();
                    return (
                      <div key={i} style={{ marginBottom: i < 2 ? 14 : 0 }}>
                        <div style={{ color: '#7B8BA3', fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>{title}</div>
                        <div style={{ color: '#E4E8F1', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{body}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Drip Sequence */}
              {(dripEmails.length > 0 || dripEnabled) && (
                <div style={{ marginTop: 16, background: '#111827', border: '1px solid #1a2540', borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ color: '#22d3ee', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>💧 DRIP SEQUENCE</div>
                    <div onClick={toggleDrip} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', opacity: dripToggling ? 0.5 : 1 }}>
                      <span style={{ fontSize: 11, color: dripEnabled ? T.a : T.s }}>{dripEnabled ? 'Active' : 'Paused'}</span>
                      <div style={{ width: 36, height: 20, borderRadius: 10, background: dripEnabled ? T.a : '#374151', position: 'relative', transition: 'background 0.2s' }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: dripEnabled ? 18 : 2, transition: 'left 0.2s' }} />
                      </div>
                    </div>
                  </div>
                  {dripEmails.length === 0 ? (
                    <div style={{ fontSize: 13, color: T.s }}>No drip emails scheduled yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {dripEmails.map(e => {
                        const statusColors = { scheduled: '#FBBF24', sent: '#10b981', cancelled: '#6b7280', failed: '#EF4444' };
                        const color = statusColors[e.status] || T.s;
                        return (
                          <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid #1a2540' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, color: T.t, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject || 'Untitled'}</div>
                              <div style={{ fontSize: 11, color: T.s, marginTop: 2 }}>{e.scheduled_for ? new Date(e.scheduled_for).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color, background: color + '20', padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{e.status}</span>
                              {e.status === 'scheduled' && (
                                <span onClick={() => cancelDripEmail(e.id)} style={{ fontSize: 11, color: '#EF4444', cursor: 'pointer', fontWeight: 600 }}>Cancel</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Online Presence */}
              {(lead.website_url || lead.zillow_url || lead.realtor_url) && (
                <div style={{ marginTop: 16, background: "#111827", border: "1px solid #1a2540", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>ONLINE PRESENCE</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {lead.website_url && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: T.s, minWidth: 80 }}>🌐 Website</span>
                        <a href={lead.website_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#22d3ee", textDecoration: "none", wordBreak: "break-all" }}>{lead.website_url.replace("https://", "")}</a>
                      </div>
                    )}
                    {lead.zillow_url && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: T.s, minWidth: 80 }}>🏠 Zillow</span>
                        <a href={lead.zillow_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#22d3ee", textDecoration: "none" }}>View Zillow Profile</a>
                      </div>
                    )}
                    {lead.realtor_url && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: T.s, minWidth: 80 }}>🏡 Realtor.com</span>
                        <a href={lead.realtor_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#22d3ee", textDecoration: "none" }}>View Realtor Profile</a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Social Media */}
              {(lead.linkedin_url || lead.facebook_url || lead.instagram_handle || lead.youtube_channel || lead.tiktok_handle) && (
                <div style={{ marginTop: 16, background: "#111827", border: "1px solid #1a2540", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>SOCIAL MEDIA</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {lead.linkedin_url && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: T.s, minWidth: 80 }}>🔗 LinkedIn</span>
                        <a href={lead.linkedin_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#22d3ee", textDecoration: "none", wordBreak: "break-all" }}>{lead.linkedin_url.replace("https://", "")}</a>
                      </div>
                    )}
                    {lead.facebook_url && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: T.s, minWidth: 80 }}>📘 Facebook</span>
                        <a href={lead.facebook_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#22d3ee", textDecoration: "none", wordBreak: "break-all" }}>{lead.facebook_url.replace("https://", "")}</a>
                      </div>
                    )}
                    {lead.instagram_handle && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: T.s, minWidth: 80 }}>📸 Instagram</span>
                        <a href={lead.instagram_handle.startsWith("@") ? `https://instagram.com/${lead.instagram_handle.slice(1)}` : lead.instagram_handle} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#22d3ee", textDecoration: "none" }}>{lead.instagram_handle}</a>
                      </div>
                    )}
                    {lead.youtube_channel && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: T.s, minWidth: 80 }}>🎬 YouTube</span>
                        <a href={lead.youtube_channel} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#22d3ee", textDecoration: "none", wordBreak: "break-all" }}>{lead.youtube_channel.replace("https://", "")}</a>
                      </div>
                    )}
                    {lead.tiktok_handle && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: T.s, minWidth: 80 }}>🎵 TikTok</span>
                        <a href={lead.tiktok_handle.startsWith("@") ? `https://tiktok.com/${lead.tiktok_handle}` : lead.tiktok_handle} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#22d3ee", textDecoration: "none" }}>{lead.tiktok_handle}</a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Enrichment */}
              {lead.enrichment_quality != null && (
                <div style={{ marginTop: 16, background: "#111827", border: "1px solid #1a2540", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>ENRICHMENT</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: T.s }}>Quality</span>
                      {(() => {
                        const q = lead.enrichment_quality;
                        const color = q >= 60 ? "#10b981" : q >= 30 ? "#f59e0b" : "#ef4444";
                        const label = q >= 60 ? "High" : q >= 30 ? "Moderate" : "Low";
                        return (
                          <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: `${color}15`, color, border: `1px solid ${color}40`, fontFamily: "'JetBrains Mono', monospace" }}>
                            {q}/100 · {label}
                          </span>
                        );
                      })()}
                    </div>
                    {lead.enrichment_sources && (
                      <div style={{ fontSize: 12, color: T.s }}>
                        Sources: <span style={{ color: T.m }}>{Array.isArray(lead.enrichment_sources) ? lead.enrichment_sources.join(" + ") : lead.enrichment_sources}</span>
                      </div>
                    )}
                    {lead.transaction_count != null && (
                      <div style={{ fontSize: 12, color: T.s }}>
                        Transactions: <span style={{ color: T.t, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{lead.transaction_count}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stage Selector */}
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 8 }}>PIPELINE STAGE</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {STAGES.map(s => (
                    <div
                      key={s.id}
                      onClick={() => updateStage(s.id)}
                      style={{ padding: "8px 14px", borderRadius: 6, background: lead.pipeline_stage === s.id ? s.c + "20" : T.d, border: `1px solid ${lead.pipeline_stage === s.id ? s.c : T.b}`, color: lead.pipeline_stage === s.id ? s.c : T.s, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      {s.l}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "tasks" && (
            <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "24px" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 20 }}>Tasks</div>
              {tasks.length > 0 ? tasks.map(task => (
                <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${T.b}` }}>
                  <div onClick={() => !task.completed_at && completeTask(task.id)} style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${task.completed_at ? T.a : T.m}`, background: task.completed_at ? T.a : "transparent", cursor: task.completed_at ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12 }}>
                    {task.completed_at && "✓"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, color: task.completed_at ? T.m : T.t, textDecoration: task.completed_at ? "line-through" : "none" }}>{task.title}</div>
                    <div style={{ fontSize: 12, color: T.m }}>{ago(task.due_date)}</div>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: "center", padding: "40px", color: T.m }}>No tasks yet</div>
              )}
            </div>
          )}

          {tab === "notes" && (
            <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "24px" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 16 }}>Notes</div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes about this lead..."
                style={{ width: "100%", minHeight: 200, padding: "16px", borderRadius: 8, background: T.d, border: `1px solid ${T.b}`, color: T.t, fontSize: 15, outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
              />
              <div onClick={saveNotes} style={{ marginTop: 12, padding: "12px 20px", borderRadius: 8, background: saving ? T.m : T.a, color: saving ? T.s : "#000", fontSize: 14, fontWeight: 700, cursor: saving ? "wait" : "pointer", textAlign: "center", width: "fit-content" }}>
                {saving ? "Saving..." : "Save Notes"}
              </div>
            </div>
          )}

          {tab === "activity" && (
            <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "24px" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 16 }}>Activity</div>
              <div style={{ textAlign: "center", padding: "40px", color: T.m }}>Activity log coming soon</div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          {/* Interest Score Gauge */}
          <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "12px 20px 8px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, fontWeight: 700 }}>INTEREST SCORE</div>
            <ScoreGauge score={lead.interest_score} />
          </div>

          {/* Quick Stats */}
          <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "20px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>QUICK STATS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: T.s }}>📅 Added</span>
                <span style={{ fontSize: 13, color: T.t }}>{ago(lead.created_at)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: T.s }}>📌 Source</span>
                <span style={{ fontSize: 13, color: T.t }}>{lead.source || "Ad"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: T.s }}>🪪 License</span>
                <span style={{ fontSize: 13, color: T.t, fontFamily: "'JetBrains Mono', monospace" }}>{lead.license_number || "—"}</span>
              </div>
              {lead.license_state && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: T.s }}>📍 State</span>
                  <span style={{ fontSize: 13, color: T.t, fontWeight: 700 }}>{lead.license_state}</span>
                </div>
              )}
              {lead.transaction_count != null && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: T.s }}>📊 Transactions</span>
                  <span style={{ fontSize: 13, color: T.t, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{lead.transaction_count}</span>
                </div>
              )}
              {lead.enrichment_quality != null && (() => {
                const q = lead.enrichment_quality;
                const c = q >= 60 ? "#10b981" : q >= 30 ? "#f59e0b" : "#ef4444";
                return (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: T.s }}>🔍 Enrichment</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: `${c}15`, color: c, border: `1px solid ${c}40`, fontFamily: "'JetBrains Mono', monospace" }}>{q}/100</span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "20px" }}>
            <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>RECENT ACTIVITY</div>
            {events.length === 0 ? (
              <div style={{ fontSize: 12, color: T.s, fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>No activity yet</div>
            ) : events.map((ev, i) => {
              const meta = EVENT_META[ev.event_type] || { icon: "⚡", color: "#64748b", label: () => ev.event_type?.replace(/_/g, " ") || "Event" };
              return (
                <div key={ev.id || i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0 8px 10px", borderLeft: `2px solid ${meta.color}40`, borderBottom: i < events.length - 1 ? `1px solid #1a254030` : "none", marginBottom: i < events.length - 1 ? 4 : 0 }}>
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{meta.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: T.t, lineHeight: 1.4 }}>{meta.label(ev.metadata || ev.meta || {})}</div>
                    <div style={{ fontSize: 11, color: T.s, marginTop: 2 }}>{timeAgo(ev.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowDeleteConfirm(false)}>
          <div style={{ background: T.card, borderRadius: 16, padding: "32px", maxWidth: 400, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.t, marginBottom: 8 }}>Delete {lead.first_name}?</div>
            <div style={{ fontSize: 15, color: T.s, marginBottom: 24 }}>This will permanently remove this lead from your pipeline.</div>
            <div style={{ display: "flex", gap: 12 }}>
              <div onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: "13px", borderRadius: 8, background: T.d, color: T.s, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Cancel</div>
              <div onClick={() => { onDelete(lead); setShowDeleteConfirm(false); }} style={{ flex: 1, padding: "13px", borderRadius: 8, background: T.r, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Delete</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
