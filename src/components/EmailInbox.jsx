import { useState, useEffect, useCallback, useRef } from "react";

const T = {
  bg: "#060a12", card: "#0d1320", cardHover: "#141e30",
  cardActive: "#182237", b: "#1a2540", bLight: "#243352",
  a: "#22d3ee", aDim: "rgba(34,211,238,0.12)", aGlow: "rgba(34,211,238,0.25)",
  hot: "#f43f5e", hotDim: "rgba(244,63,94,0.12)",
  warm: "#f59e0b", warmDim: "rgba(245,158,11,0.12)",
  green: "#10b981", greenDim: "rgba(16,185,129,0.12)",
  purple: "#a78bfa", purpleDim: "rgba(167,139,250,0.12)",
  t: "#e2e8f0", m: "#64748b", s: "#475569", d: "#080d18",
};

const SUPABASE_FN = "https://usknntguurefeyzusbdh.supabase.co/functions/v1";

const timeAgo = (d) => {
  if (!d) return "";
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const dy = Math.floor(h / 24);
  if (dy < 7) return `${dy}d`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const strip = (html) => html ? html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim() : "";
const trunc = (s, n = 60) => s && s.length > n ? s.slice(0, n) + "…" : s || "";

const Pill = ({ children, bg, color, glow }) => (
  <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 4, background: bg, color, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap", boxShadow: glow ? `0 0 8px ${glow}` : "none" }}>{children}</span>
);
const DirPill = ({ dir }) => dir === "inbound" ? <Pill bg={T.greenDim} color={T.green}>↓ IN</Pill> : <Pill bg={T.aDim} color={T.a}>↑ OUT</Pill>;
const HeatPill = ({ level }) => {
  const m = { on_fire: { bg: T.hotDim, c: T.hot, l: "🔥", g: T.hot + "40" }, hot: { bg: "rgba(251,146,60,0.15)", c: "#fb923c", l: "🟠" }, interested: { bg: T.warmDim, c: T.warm, l: "⚡" }, warming: { bg: T.greenDim, c: T.green, l: "🌱" }, cold: { bg: "rgba(100,116,139,0.15)", c: T.s, l: "❄️" } };
  const h = m[level] || m.cold;
  return <Pill bg={h.bg} color={h.c} glow={h.g}>{h.l}</Pill>;
};
const UnreadDot = () => (<span style={{ width: 8, height: 8, borderRadius: "50%", background: T.a, boxShadow: `0 0 6px ${T.aGlow}`, display: "inline-block", flexShrink: 0 }} />);
const IconBtn = ({ children, onClick, title, danger, active, disabled }) => (
  <button onClick={onClick} title={title} disabled={disabled} style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: active ? T.aDim : "transparent", border: `1px solid ${active ? T.a + "33" : "transparent"}`, color: danger ? T.hot : active ? T.a : T.m, cursor: disabled ? "default" : "pointer", fontSize: 14, transition: "all 0.15s", opacity: disabled ? 0.3 : 1 }}>{children}</button>
);

const FOLDERS = [
  { id: "all", icon: "📬", label: "All" }, { id: "unread", icon: "🔵", label: "Unread" },
  { id: "hot", icon: "🔥", label: "Hot Leads" }, { id: "received", icon: "↓", label: "Received" },
  { id: "sent", icon: "↑", label: "Sent" }, { id: "starred", icon: "⭐", label: "Starred" },
  { id: "archived", icon: "📦", label: "Archived" },
];

export default function EmailInbox({ supabase, userId, profile }) {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [folder, setFolder] = useState("all");
  const [search, setSearch] = useState("");
  const [mainView, setMainView] = useState("list");
  const [composing, setComposing] = useState(false);
  const [composeNew, setComposeNew] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [rueLoading, setRueLoading] = useState(false);
  const [starred, setStarred] = useState(new Set());
  const [archived, setArchived] = useState(new Set());
  const [newTo, setNewTo] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [toSuggestions, setToSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef(null);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("v_user_inbox").select("*").eq("user_id", userId).order("last_message_at", { ascending: false });
    if (data) setThreads(data);
    const { data: uc } = await supabase.from("v_unread_count").select("unread").eq("user_id", userId).maybeSingle();
    setUnreadCount(uc?.unread || 0);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => { loadInbox(); }, [loadInbox]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const openThread = async (thread) => {
    setSelectedThread(thread); setMainView("thread"); setThreadLoading(true); setComposing(false); setComposeNew(false); setReplyText("");
    const { data } = await supabase.from("email_messages").select("*").eq("thread_id", thread.thread_id).eq("user_id", userId).order("created_at", { ascending: true });
    if (data) {
      setMessages(data);
      const unreadIds = data.filter(m => !m.is_read && m.direction === "inbound").map(m => m.id);
      if (unreadIds.length > 0) { await supabase.from("email_messages").update({ is_read: true, read_at: new Date().toISOString() }).in("id", unreadIds); loadInbox(); }
    }
    setThreadLoading(false);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedThread) return;
    setSending(true);
    try {
      const lastIn = [...messages].reverse().find(m => m.direction === "inbound");
      const toEmail = lastIn?.from_email || selectedThread.from_email;
      const subject = selectedThread.subject?.startsWith("Re:") ? selectedThread.subject : `Re: ${selectedThread.subject || ""}`;
      const res = await fetch(`${SUPABASE_FN}/send-email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "user_outreach", to: toEmail, subject, body: replyText, lead_id: selectedThread.lead_id, user_id: userId }) });
      const result = await res.json();
      if (result.success) {
        await supabase.from("email_messages").insert({ user_id: userId, lead_id: selectedThread.lead_id, direction: "outbound", from_email: profile?.rkrt_email || `${(profile?.full_name || "recruiter").toLowerCase().replace(/\s+/g, ".")}@rkrt.in`, from_name: profile?.full_name || "RKRT", to_email: toEmail, subject, body_text: replyText, thread_id: selectedThread.thread_id, resend_id: result.id, status: "sent", is_read: true, sent_at: new Date().toISOString() });
        setReplyText(""); setComposing(false); openThread(selectedThread);
      } else alert("Send failed: " + (result.error || "Unknown"));
    } catch (err) { alert("Error: " + err.message); }
    setSending(false);
  };

  const sendNew = async () => {
    if (!newTo.trim() || !newBody.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${SUPABASE_FN}/send-email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "user_outreach", to: newTo, subject: newSubject || "(no subject)", body: newBody, user_id: userId }) });
      const result = await res.json();
      if (result.success) {
        const tid = `thread_${crypto.randomUUID().split("-")[0]}`;
        await supabase.from("email_messages").insert({ user_id: userId, direction: "outbound", from_email: profile?.rkrt_email || `${(profile?.full_name || "recruiter").toLowerCase().replace(/\s+/g, ".")}@rkrt.in`, from_name: profile?.full_name || "RKRT", to_email: newTo, subject: newSubject || "(no subject)", body_text: newBody, thread_id: tid, resend_id: result.id, status: "sent", is_read: true, sent_at: new Date().toISOString() });
        setNewTo(""); setNewSubject(""); setNewBody(""); setComposeNew(false); loadInbox();
      } else alert("Send failed: " + (result.error || "Unknown"));
    } catch (err) { alert("Error: " + err.message); }
    setSending(false);
  };

  const deleteThread = async (tid) => { if (!confirm("Delete this conversation?")) return; await supabase.from("email_messages").delete().eq("thread_id", tid).eq("user_id", userId); if (selectedThread?.thread_id === tid) { setSelectedThread(null); setMessages([]); } loadInbox(); };
  const bulkDelete = async () => { if (!selectedIds.size || !confirm(`Delete ${selectedIds.size} conversation(s)?`)) return; for (const tid of selectedIds) await supabase.from("email_messages").delete().eq("thread_id", tid).eq("user_id", userId); setSelectedIds(new Set()); setSelectedThread(null); setMessages([]); loadInbox(); };
  const toggleStar = (tid) => setStarred(p => { const n = new Set(p); n.has(tid) ? n.delete(tid) : n.add(tid); return n; });
  const toggleArchive = (tid) => { setArchived(p => { const n = new Set(p); n.has(tid) ? n.delete(tid) : n.add(tid); return n; }); if (selectedThread?.thread_id === tid) setSelectedThread(null); };

  const askRueDraft = async () => {
    if (!selectedThread) return;
    setRueLoading(true);
    try {
      let leadContext = "";
      if (selectedThread.lead_id) {
        const { data: lead } = await supabase.from("leads").select("*").eq("id", selectedThread.lead_id).single();
        if (lead) {
          leadContext = `\n\nABOUT THE LEAD:\n- Name: ${lead.first_name} ${lead.last_name}\n- Brokerage: ${lead.brokerage_name || lead.brokerage || "unknown"}\n- Market: ${lead.market || "unknown"}\n- Score: ${lead.interest_score || 0}/100 (${lead.heat_level || "cold"})\n- Stage: ${lead.pipeline_stage || "new"}\n- Notes: ${lead.notes || "none"}\n- Outreach angle: ${lead.outreach_angle || "none"}`;
        }
      }
      const ctx = messages.map(m => `${m.direction === "inbound" ? "THEM" : "ME"}: ${strip(m.body_text || m.body_html || "")}`).join("\n");
      const contactName = selectedThread.contact_name || selectedThread.from_email?.split("@")[0] || "this person";
      const myName = profile?.full_name || "the recruiter";
      const prompt = `Write a reply to this email conversation. I am ${myName}${profile?.brokerage ? " from " + profile.brokerage : ""}.

EMAIL THREAD:
${ctx}

I am replying to: ${contactName} (${selectedThread.from_email})
Subject: ${selectedThread.subject}
${leadContext}

RULES:
- Write ONLY the reply body text — no subject line, no "Subject:", no preamble
- Address them by their actual first name (${contactName.split(" ")[0]})
- Sign off as ${myName.split(" ")[0]}
- Be warm, professional, conversational — not corporate
- 100-200 words max
- If they asked a question, answer it directly
- Do NOT use placeholders like [Name] or [Company]`;
      const res = await fetch(SUPABASE_FN + "/rue-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: "You are Rue, a recruiting email assistant. Write natural, personalized emails. NEVER use placeholders. NEVER hallucinate names or details not provided. Only reference information explicitly given to you.", messages: [{ role: "user", content: prompt }], user_id: userId, save: false }),
      });
      const data = await res.json();
      if (data.content) { setReplyText(data.content); setComposing(true); }
    } catch (err) { console.error("Rue draft error:", err); }
    setRueLoading(false);
  };

  const askRueCompose = async () => {
    setRueLoading(true);
    try {
      let leadContext = "";
      let recipientName = "a real estate agent";

      if (newTo.trim()) {
        const { data: matchedLead } = await supabase.from("leads").select("*").eq("user_id", userId).ilike("email", newTo.trim()).maybeSingle();
        if (matchedLead) {
          recipientName = matchedLead.first_name + " " + matchedLead.last_name;
          leadContext = "\n\nABOUT RECIPIENT:\n- Name: " + matchedLead.first_name + " " + matchedLead.last_name + "\n- Brokerage: " + (matchedLead.brokerage_name || matchedLead.brokerage || "unknown") + "\n- Market: " + (matchedLead.market || "unknown") + "\n- Score: " + (matchedLead.interest_score || 0) + "/100 (" + (matchedLead.heat_level || "cold") + ")\n- Stage: " + (matchedLead.pipeline_stage || "new");
          if (!newSubject.trim()) {
            setNewSubject(matchedLead.brokerage_name ? "Quick question about " + matchedLead.brokerage_name : matchedLead.first_name + ", quick thought for you");
          }
        }
      }

      const myName = profile?.full_name || "the recruiter";
      const myBrokerage = profile?.brokerage || "LPT Realty";
      const prompt = "Write a recruiting outreach email from " + myName + " at " + myBrokerage + " to " + recipientName + "." + (newSubject.trim() ? " Subject: " + newSubject + "." : " Also generate a compelling subject line — put it on the first line as 'Subject: ...' followed by a blank line, then the email body.") + leadContext + "\n\nRULES:\n- If no subject was provided, your FIRST line must be 'Subject: [your subject here]' then a blank line\n- Then write the email body\n- Be professional, warm, compelling\n- 150-250 words, 3-4 short paragraphs\n- End with a low-pressure CTA\n- Sign off as " + myName.split(" ")[0] + "\n- NEVER use placeholders like [Name] or [Company]";

      const res = await fetch(SUPABASE_FN + "/rue-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "You are Rue, a recruiting email assistant. Write personalized outreach emails. NEVER use placeholders. If asked to generate a subject line, put it as the FIRST line in format 'Subject: ...' followed by a blank line before the body.",
          messages: [{ role: "user", content: prompt }],
          user_id: userId,
          save: false,
        }),
      });
      const data = await res.json();
      if (data.content) {
        let content = data.content.trim();
        const subjectMatch = content.match(/^Subject:\s*(.+)/i);
        if (subjectMatch) {
          if (!newSubject.trim()) setNewSubject(subjectMatch[1].trim());
          content = content.replace(/^Subject:\s*.+\n\n?/, "").trim();
        }
        setNewBody(content);
      }
    } catch (err) { console.error("Rue compose error:", err); }
    setRueLoading(false);
  };

  const searchContacts = async (query) => {
    if (query.length < 2) { setToSuggestions([]); setShowSuggestions(false); return; }
    const { data } = await supabase.from("leads").select("id, first_name, last_name, email, brokerage_name, heat_level").eq("user_id", userId).or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`).limit(5);
    setToSuggestions(data || []);
    setShowSuggestions((data || []).length > 0);
  };

  const filtered = threads.filter(t => {
    if (archived.has(t.thread_id) && folder !== "archived") return false;
    if (folder === "unread") return t.unread_count > 0;
    if (folder === "hot") return t.heat_level && ["hot", "on_fire"].includes(t.heat_level);
    if (folder === "received") return t.direction === "inbound";
    if (folder === "sent") return t.direction === "outbound";
    if (folder === "starred") return starred.has(t.thread_id);
    if (folder === "archived") return archived.has(t.thread_id);
    if (search) { const q = search.toLowerCase(); return (t.contact_name || "").toLowerCase().includes(q) || (t.subject || "").toLowerCase().includes(q) || (t.from_email || "").toLowerCase().includes(q); }
    return true;
  }).sort((a, b) => {
    const aH = ["hot", "on_fire"].includes(a.heat_level) ? 1 : 0;
    const bH = ["hot", "on_fire"].includes(b.heat_level) ? 1 : 0;
    if (bH !== aH) return bH - aH;
    const aU = a.unread_count > 0 ? 1 : 0;
    const bU = b.unread_count > 0 ? 1 : 0;
    if (bU !== aU) return bU - aU;
    return new Date(b.last_message_at) - new Date(a.last_message_at);
  });

  const toggleSelect = (tid, e) => { e.stopPropagation(); setSelectedIds(p => { const n = new Set(p); n.has(tid) ? n.delete(tid) : n.add(tid); return n; }); };

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, borderRadius: 8, background: T.card, color: T.t, border: `1px solid ${T.b}`, outline: "none", boxSizing: "border-box" };
  const focusHandler = (e) => e.target.style.borderColor = T.a;
  const blurHandler = (e) => e.target.style.borderColor = T.b;

  const avatarColors = ["#22d3ee","#10b981","#a78bfa","#f59e0b","#f43f5e","#fb923c","#60a5fa","#34d399"];
  const getAvatarColor = (name) => avatarColors[(name || "?").charCodeAt(0) % avatarColors.length];
  const FOLDER_DEFS = [
    { id: "all", icon: "📥", label: "Inbox", count: threads.filter(t => !archived.has(t.thread_id)).length },
    { id: "unread", icon: "🔵", label: "Unread", count: threads.filter(t => t.unread_count > 0).length },
    { id: "hot", icon: "🔥", label: "Hot Leads", count: threads.filter(t => ["hot","on_fire"].includes(t.heat_level)).length },
    { id: "starred", icon: "⭐", label: "Starred", count: threads.filter(t => starred.has(t.thread_id)).length },
    { id: "sent", icon: "↑", label: "Sent", count: threads.filter(t => t.direction === "outbound" && !archived.has(t.thread_id)).length },
    { id: "archived", icon: "📦", label: "Archived", count: threads.filter(t => archived.has(t.thread_id)).length },
  ];

  const goBack = () => { setMainView("list"); setSelectedThread(null); setComposing(false); setReplyText(""); };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 100px)", background: T.bg, borderRadius: 16, overflow: "hidden", border: `1px solid ${T.b}` }}>

      {/* LEFT SIDEBAR — 240px */}
      <div style={{ width: 240, background: T.d, borderRight: `1px solid ${T.b}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "16px 10px 8px" }}>
          <button onClick={() => { setMainView("compose"); setSelectedThread(null); setNewTo(""); setNewSubject(""); setNewBody(""); }} style={{ width: "100%", padding: "13px 0", fontSize: 14, fontWeight: 700, borderRadius: 16, background: `linear-gradient(135deg, ${T.a}, ${T.green})`, color: "#000", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, justifyContent: "center", boxShadow: `0 2px 14px ${T.aGlow}`, transition: "opacity 0.15s" }} onMouseEnter={e => e.currentTarget.style.opacity = "0.88"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>✏️ Compose</button>
        </div>
        <div style={{ padding: "4px 0 8px" }}>
          {FOLDER_DEFS.map(f => {
            const isActive = folder === f.id;
            return (
              <button key={f.id} onClick={() => { setFolder(f.id); setSelectedIds(new Set()); setMainView("list"); }} style={{ width: "calc(100% - 10px)", marginLeft: 10, padding: "9px 14px", fontSize: 13, fontWeight: isActive ? 700 : 500, borderRadius: "0 22px 22px 0", background: isActive ? T.aDim : "transparent", color: isActive ? T.a : T.m, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 9, transition: "all 0.12s" }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = T.card; }} onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ fontSize: 14 }}>{f.icon}</span>
                <span style={{ flex: 1, textAlign: "left" }}>{f.label}</span>
                {f.count > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? T.a : T.s, fontFamily: "'JetBrains Mono', monospace" }}>{f.count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.bg, minWidth: 0 }}>

        {/* ── LIST VIEW ── */}
        {mainView === "list" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            {/* Search + bulk toolbar */}
            <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.b}`, background: T.card, display: "flex", gap: 8, alignItems: "center" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..." style={{ flex: 1, padding: "8px 12px", fontSize: 13, borderRadius: 8, background: T.d, color: T.t, border: `1px solid ${T.b}`, outline: "none" }} onFocus={e => e.target.style.borderColor = T.a} onBlur={e => e.target.style.borderColor = T.b} />
              <IconBtn onClick={loadInbox} title="Refresh">↻</IconBtn>
              {selectedIds.size > 0 && (<><span style={{ fontSize: 12, color: T.a, fontWeight: 700 }}>{selectedIds.size} selected</span><IconBtn onClick={bulkDelete} danger title="Delete selected">🗑</IconBtn><IconBtn onClick={() => setSelectedIds(new Set())} title="Deselect">✕</IconBtn></>)}
            </div>
            {/* Conversation rows */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: 60, textAlign: "center", color: T.m }}><div style={{ fontSize: 24, animation: "pulse 1.5s infinite" }}>📬</div><div style={{ fontSize: 13, marginTop: 10 }}>Loading...</div></div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 60, textAlign: "center", color: T.m }}><div style={{ fontSize: 40, marginBottom: 10 }}>📭</div><div style={{ fontSize: 14, fontWeight: 600 }}>No messages</div><div style={{ fontSize: 12, marginTop: 4, color: T.s }}>{folder === "all" ? "Replies to outreach appear here" : `No messages in ${FOLDER_DEFS.find(f => f.id === folder)?.label || folder}`}</div></div>
              ) : filtered.map(t => {
                const isHot = ["hot", "on_fire"].includes(t.heat_level);
                const isSel = selectedIds.has(t.thread_id);
                const isAct = selectedThread?.thread_id === t.thread_id;
                const name = t.contact_name || t.from_email || "?";
                const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
                const preview = strip(t.body_text || "");
                return (
                  <div key={t.thread_id} onClick={() => openThread(t)} style={{ height: 48, padding: "0 16px", cursor: "pointer", borderBottom: `1px solid ${T.b}18`, borderLeft: isHot ? `3px solid ${T.hot}` : "3px solid transparent", background: isAct ? T.cardActive : isSel ? T.aDim : t.unread_count > 0 ? `${T.card}88` : "transparent", transition: "background 0.1s", display: "flex", alignItems: "center", gap: 10 }}
                    onMouseEnter={e => { if (!isAct) e.currentTarget.style.background = T.cardHover; }} onMouseLeave={e => { if (!isAct && !isSel) e.currentTarget.style.background = t.unread_count > 0 ? `${T.card}88` : "transparent"; }}>
                    {/* Checkbox / avatar */}
                    <div onClick={e => toggleSelect(t.thread_id, e)} style={{ width: 32, height: 32, borderRadius: "50%", background: isSel ? T.aDim : getAvatarColor(name), border: isSel ? `2px solid ${T.a}` : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: isSel ? T.a : "#000", flexShrink: 0, cursor: "pointer" }}>
                      {isSel ? "✓" : initials}
                    </div>
                    {/* Sender name — fixed 160px */}
                    <span style={{ width: 160, minWidth: 160, fontSize: 13, fontWeight: t.unread_count > 0 ? 700 : 500, color: T.t, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                    {/* Subject + preview — flex:1, one line */}
                    <span style={{ flex: 1, fontSize: 13, color: T.m, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                      <span style={{ fontWeight: t.unread_count > 0 ? 600 : 400, color: t.unread_count > 0 ? T.t : T.m }}>{t.subject || "(no subject)"}</span>
                      {preview && <span style={{ color: T.s }}>{" — "}{trunc(preview, 60)}</span>}
                    </span>
                    {/* Badges + time */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {t.unread_count > 0 && <UnreadDot />}
                      {t.heat_level && <HeatPill level={t.heat_level} />}
                      {t.message_count > 1 && <span style={{ fontSize: 10, color: T.m, background: T.aDim, padding: "1px 5px", borderRadius: 4 }}>{t.message_count}</span>}
                      <span style={{ fontSize: 11, color: T.s, fontFamily: "'JetBrains Mono', monospace", minWidth: 32, textAlign: "right" }}>{timeAgo(t.last_message_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── THREAD VIEW ── */}
        {mainView === "thread" && selectedThread && (<>
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.b}`, background: T.card, display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={goBack} style={{ padding: "6px 12px", fontSize: 13, borderRadius: 8, background: "transparent", color: T.m, border: `1px solid ${T.b}`, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>← Back</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: T.t, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedThread.subject || "(no subject)"}</span>
                {selectedThread.heat_level && <HeatPill level={selectedThread.heat_level} />}
                {selectedThread.lead_id && <Pill bg={T.greenDim} color={T.green}>Linked Lead</Pill>}
              </div>
              <div style={{ fontSize: 12, color: T.m, marginTop: 1 }}>
                {selectedThread.contact_name || selectedThread.from_email}
                {selectedThread.interest_score > 0 && <span style={{ marginLeft: 8, color: T.warm }}>Score: {selectedThread.interest_score}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <IconBtn onClick={() => toggleStar(selectedThread.thread_id)} active={starred.has(selectedThread.thread_id)} title="Star">⭐</IconBtn>
              <IconBtn onClick={() => toggleArchive(selectedThread.thread_id)} title="Archive">📦</IconBtn>
              <IconBtn onClick={() => deleteThread(selectedThread.thread_id)} danger title="Delete">🗑</IconBtn>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {threadLoading ? (
              <div style={{ textAlign: "center", color: T.m, padding: 40 }}>Loading...</div>
            ) : messages.map((msg, i) => (
              <div key={msg.id} style={{ marginBottom: 16, padding: "14px 18px", borderRadius: 12, background: msg.direction === "inbound" ? T.card : T.aDim, border: `1px solid ${msg.direction === "inbound" ? T.b : T.a + "18"}`, maxWidth: "82%", marginLeft: msg.direction === "outbound" ? "auto" : 0, animation: `fadeIn 0.2s ease ${i * 0.05}s both` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <DirPill dir={msg.direction} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.t }}>{msg.direction === "inbound" ? (msg.from_name || msg.from_email) : "You"}</span>
                  <span style={{ fontSize: 11, color: T.s, marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace" }}>{timeAgo(msg.created_at)}</span>
                </div>
                <div style={{ fontSize: 14, color: T.t, lineHeight: 1.7, wordBreak: "break-word" }}>
                  {msg.body_html && msg.body_html.length > 10 ? <div dangerouslySetInnerHTML={{ __html: msg.body_html }} style={{ maxHeight: 400, overflow: "auto" }} /> : <div style={{ whiteSpace: "pre-wrap" }}>{msg.body_text || strip(msg.body_html) || "(empty)"}</div>}
                </div>
                {msg.has_attachments && <div style={{ marginTop: 8, fontSize: 11, color: T.m }}>📎 {msg.attachment_count} attachment{msg.attachment_count !== 1 ? "s" : ""}</div>}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div style={{ borderTop: `1px solid ${T.b}`, padding: "12px 24px", background: T.card }}>
            {composing ? (
              <div>
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your reply..." rows={4} style={{ width: "100%", background: T.d, color: T.t, border: `1px solid ${T.b}`, borderRadius: 10, padding: 12, fontSize: 14, resize: "vertical", outline: "none", lineHeight: 1.6, boxSizing: "border-box" }} onFocus={focusHandler} onBlur={blurHandler} autoFocus />
                <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "space-between" }}>
                  <button onClick={askRueDraft} disabled={rueLoading} style={{ padding: "8px 14px", fontSize: 12, borderRadius: 6, cursor: "pointer", background: T.purpleDim, color: T.purple, border: `1px solid ${T.purple}33`, fontWeight: 600 }}>{rueLoading ? "✨ Drafting..." : "🤖 Ask Rue"}</button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setComposing(false); setReplyText(""); }} style={{ padding: "8px 16px", fontSize: 13, borderRadius: 8, cursor: "pointer", background: "transparent", color: T.m, border: `1px solid ${T.b}` }}>Cancel</button>
                    <button onClick={sendReply} disabled={sending || !replyText.trim()} style={{ padding: "8px 20px", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer", background: sending ? T.s : `linear-gradient(135deg, ${T.a}, ${T.green})`, color: "#000", border: "none", opacity: sending || !replyText.trim() ? 0.4 : 1, boxShadow: `0 2px 12px ${T.aGlow}` }}>{sending ? "..." : "Send ✉️"}</button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setComposing(true)} style={{ flex: 1, padding: "12px 16px", fontSize: 13, textAlign: "left", background: T.d, color: T.m, border: `1px solid ${T.b}`, borderRadius: 10, cursor: "pointer", transition: "border 0.15s" }} onMouseEnter={e => e.currentTarget.style.borderColor = T.a} onMouseLeave={e => e.currentTarget.style.borderColor = T.b}>↩ Reply...</button>
                <button onClick={askRueDraft} disabled={rueLoading} style={{ padding: "12px 14px", fontSize: 12, borderRadius: 10, cursor: "pointer", background: T.purpleDim, color: T.purple, border: `1px solid ${T.purple}33`, fontWeight: 700, whiteSpace: "nowrap" }}>{rueLoading ? "✨..." : "🤖 Rue"}</button>
              </div>
            )}
          </div>
        </>)}

        {/* ── COMPOSE VIEW ── */}
        {mainView === "compose" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.b}`, background: T.card, display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={goBack} style={{ padding: "6px 12px", fontSize: 13, borderRadius: 8, background: "transparent", color: T.m, border: `1px solid ${T.b}`, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>← Back</button>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.t }}>✏️ New Message</span>
            </div>
            <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
              <div style={{ marginBottom: 12, position: "relative" }}>
                <label style={{ fontSize: 11, color: T.m, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 4 }}>To</label>
                <input value={newTo} onChange={e => { setNewTo(e.target.value); searchContacts(e.target.value); }} placeholder="Type a name or email..." style={{ width: "100%", padding: "10px 14px", fontSize: 14, borderRadius: 8, background: T.card, color: T.t, border: `1px solid ${T.b}`, outline: "none", boxSizing: "border-box" }} onFocus={e => { e.target.style.borderColor = T.a; if (toSuggestions.length) setShowSuggestions(true); }} onBlur={e => { e.target.style.borderColor = T.b; setTimeout(() => setShowSuggestions(false), 200); }} />
                {showSuggestions && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: T.card, border: `1px solid ${T.b}`, borderRadius: 8, marginTop: 4, zIndex: 10, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
                    {toSuggestions.map(s => (
                      <div key={s.id} onClick={() => { setNewTo(s.email); setShowSuggestions(false); setToSuggestions([]); if (!newSubject) setNewSubject(s.brokerage_name ? "Quick question about " + s.brokerage_name : s.first_name + ", quick thought"); }} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${T.b}30`, display: "flex", justifyContent: "space-between", alignItems: "center" }} onMouseEnter={e => e.currentTarget.style.background = T.cardHover} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: T.t }}>{s.first_name} {s.last_name}</div>
                          <div style={{ fontSize: 12, color: T.m }}>{s.email}</div>
                        </div>
                        <div style={{ fontSize: 12, color: T.s }}>{s.brokerage_name || ""}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 14 }}><label style={{ fontSize: 10, color: T.m, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 4 }}>Subject</label><input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Subject..." style={inputStyle} onFocus={focusHandler} onBlur={blurHandler} /></div>
              <div><label style={{ fontSize: 10, color: T.m, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 4 }}>Message</label><textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Write your email..." rows={14} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} onFocus={focusHandler} onBlur={blurHandler} /></div>
            </div>
            <div style={{ padding: "12px 24px", borderTop: `1px solid ${T.b}`, background: T.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={askRueCompose} disabled={rueLoading} style={{ padding: "10px 16px", fontSize: 13, borderRadius: 8, cursor: "pointer", background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)", fontWeight: 600 }}>{rueLoading ? "✨ Drafting..." : "🤖 Ask Rue"}</button>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={goBack} style={{ padding: "10px 20px", fontSize: 13, borderRadius: 8, cursor: "pointer", background: "transparent", color: T.m, border: `1px solid ${T.b}` }}>Cancel</button>
                <button onClick={sendNew} disabled={sending || !newTo.trim() || !newBody.trim()} style={{ padding: "10px 24px", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer", background: sending ? T.s : `linear-gradient(135deg, ${T.a}, ${T.green})`, color: "#000", border: "none", opacity: sending || !newTo.trim() || !newBody.trim() ? 0.4 : 1, boxShadow: `0 2px 12px ${T.aGlow}` }}>{sending ? "Sending..." : "Send ✉️"}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } } @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } } input::placeholder, textarea::placeholder { color: ${T.s}; }`}</style>
    </div>
  );
}
