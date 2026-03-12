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
    setSelectedThread(thread); setThreadLoading(true); setComposing(false); setComposeNew(false); setReplyText("");
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
      const ctx = messages.map(m => `${m.direction === "inbound" ? "LEAD" : "YOU"}: ${strip(m.body_text || m.body_html || "")}`).join("\n");
      const res = await fetch(`${SUPABASE_FN}/rue-chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId, message: `Draft a follow-up reply for this email thread. Be professional but warm. Conversation:\n\n${ctx}\n\nLead: ${selectedThread.contact_name || "this person"}. ${selectedThread.heat_level ? `Heat: ${selectedThread.heat_level}.` : ""} Write ONLY the reply text.` }) });
      const data = await res.json();
      const draft = data.reply || data.response || data.message;
      if (draft) { setReplyText(draft); setComposing(true); }
    } catch (err) { console.error("Rue error:", err); }
    setRueLoading(false);
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

  return (
    <div style={{ display: "flex", height: "calc(100vh - 100px)", background: T.bg, borderRadius: 16, overflow: "hidden", border: `1px solid ${T.b}` }}>

      {/* FOLDER SIDEBAR */}
      <div style={{ width: 56, background: T.d, borderRight: `1px solid ${T.b}`, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 2 }}>
        {FOLDERS.map(f => (
          <button key={f.id} onClick={() => { setFolder(f.id); setSelectedIds(new Set()); }} title={f.label} style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: folder === f.id ? T.aDim : "transparent", border: folder === f.id ? `1px solid ${T.a}33` : "1px solid transparent", cursor: "pointer", fontSize: 16, transition: "all 0.15s", position: "relative" }}>
            {f.icon}
            {f.id === "unread" && unreadCount > 0 && (<span style={{ position: "absolute", top: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: T.a, color: "#000", fontSize: 8, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{unreadCount > 9 ? "9+" : unreadCount}</span>)}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => { setComposeNew(true); setSelectedThread(null); }} title="Compose" style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${T.a}, ${T.green})`, border: "none", cursor: "pointer", fontSize: 18, marginBottom: 12, boxShadow: `0 2px 12px ${T.aGlow}` }}>✏️</button>
      </div>

      {/* THREAD LIST */}
      <div style={{ width: 340, borderRight: `1px solid ${T.b}`, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.b}`, background: T.card }}>
          <div style={{ display: "flex", gap: 6, marginBottom: selectedIds.size > 0 ? 8 : 0 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ flex: 1, padding: "8px 12px", fontSize: 13, borderRadius: 8, background: T.d, color: T.t, border: `1px solid ${T.b}`, outline: "none", fontFamily: "'JetBrains Mono', monospace" }} onFocus={focusHandler} onBlur={blurHandler} />
            <IconBtn onClick={loadInbox} title="Refresh">↻</IconBtn>
          </div>
          {selectedIds.size > 0 && (<div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: T.m }}><span style={{ color: T.a, fontWeight: 700 }}>{selectedIds.size} selected</span><IconBtn onClick={bulkDelete} title="Delete" danger>🗑</IconBtn><IconBtn onClick={() => setSelectedIds(new Set())} title="Deselect">✕</IconBtn></div>)}
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (<div style={{ padding: 40, textAlign: "center", color: T.m }}><div style={{ fontSize: 20, animation: "pulse 1.5s infinite" }}>📬</div><div style={{ fontSize: 12, marginTop: 8 }}>Loading...</div></div>)
          : filtered.length === 0 ? (<div style={{ padding: 40, textAlign: "center", color: T.m }}><div style={{ fontSize: 36, marginBottom: 8 }}>📭</div><div style={{ fontSize: 13, fontWeight: 600 }}>No messages</div><div style={{ fontSize: 11, marginTop: 4, color: T.s }}>{folder === "all" ? "Replies to outreach appear here" : `No messages in ${folder}`}</div></div>)
          : filtered.map(t => {
            const isHot = ["hot", "on_fire"].includes(t.heat_level);
            const isSel = selectedIds.has(t.thread_id);
            const isAct = selectedThread?.thread_id === t.thread_id;
            return (
              <div key={t.thread_id} onClick={() => openThread(t)} style={{ padding: "12px 14px", cursor: "pointer", borderBottom: `1px solid ${T.b}08`, borderLeft: isHot ? `3px solid ${T.hot}` : isAct ? `3px solid ${T.a}` : "3px solid transparent", background: isAct ? T.cardActive : isSel ? T.aDim : "transparent", transition: "all 0.12s" }}
                onMouseEnter={e => { if (!isAct) e.currentTarget.style.background = T.cardHover; }} onMouseLeave={e => { if (!isAct && !isSel) e.currentTarget.style.background = "transparent"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <input type="checkbox" checked={isSel} onChange={e => toggleSelect(t.thread_id, e)} style={{ accentColor: T.a, cursor: "pointer", width: 14, height: 14 }} />
                  {t.unread_count > 0 && <UnreadDot />}
                  <span style={{ fontSize: 14, fontWeight: t.unread_count > 0 ? 700 : 500, color: T.t, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.contact_name || t.from_email}</span>
                  <div style={{ display: "flex", gap: 3 }}>{t.heat_level && <HeatPill level={t.heat_level} />}<DirPill dir={t.direction} /></div>
                </div>
                <div style={{ fontSize: 13, fontWeight: t.unread_count > 0 ? 600 : 400, color: t.unread_count > 0 ? T.t : T.m, marginLeft: 20, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>{t.subject || "(no subject)"}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginLeft: 20 }}>
                  <span style={{ fontSize: 11, color: T.s, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "55%" }}>{trunc(strip(t.body_text), 40)}</span>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}><span style={{ fontSize: 11, color: T.s }}>{timeAgo(t.last_message_at)}</span>{t.message_count > 1 && <span style={{ fontSize: 9, color: T.m, background: T.aDim, padding: "1px 5px", borderRadius: 4 }}>{t.message_count}</span>}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.d }}>
        {composeNew && !selectedThread && (<div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${T.b}`, background: T.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 16, fontWeight: 700, color: T.t }}>✏️ New Message</span><IconBtn onClick={() => setComposeNew(false)}>✕</IconBtn></div>
          <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 10, color: T.m, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 4 }}>To</label><input value={newTo} onChange={e => setNewTo(e.target.value)} placeholder="lead@email.com" style={inputStyle} onFocus={focusHandler} onBlur={blurHandler} /></div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 10, color: T.m, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 4 }}>Subject</label><input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Subject..." style={inputStyle} onFocus={focusHandler} onBlur={blurHandler} /></div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 10, color: T.m, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 4 }}>Message</label><textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Write your email..." rows={10} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} onFocus={focusHandler} onBlur={blurHandler} /></div>
          </div>
          <div style={{ padding: "12px 24px", borderTop: `1px solid ${T.b}`, background: T.card, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setComposeNew(false)} style={{ padding: "10px 20px", fontSize: 12, borderRadius: 8, cursor: "pointer", background: "transparent", color: T.m, border: `1px solid ${T.b}` }}>Cancel</button>
            <button onClick={sendNew} disabled={sending || !newTo.trim() || !newBody.trim()} style={{ padding: "10px 24px", fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: "pointer", background: sending ? T.s : `linear-gradient(135deg, ${T.a}, ${T.green})`, color: "#000", border: "none", opacity: sending || !newTo.trim() || !newBody.trim() ? 0.4 : 1, boxShadow: `0 2px 12px ${T.aGlow}` }}>{sending ? "Sending..." : "Send ✉️"}</button>
          </div>
        </div>)}

        {!selectedThread && !composeNew && (<div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ textAlign: "center", color: T.m }}><div style={{ fontSize: 56, marginBottom: 16, opacity: 0.5 }}>📧</div><div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Select a conversation</div><div style={{ fontSize: 12, color: T.s }}>or compose a new message</div></div></div>)}

        {selectedThread && !composeNew && (<>
          <div style={{ padding: "14px 24px", borderBottom: `1px solid ${T.b}`, background: T.card }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 16, fontWeight: 700, color: T.t, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedThread.subject || "(no subject)"}</span>{selectedThread.heat_level && <HeatPill level={selectedThread.heat_level} />}{selectedThread.lead_id && <Pill bg={T.greenDim} color={T.green}>Linked Lead</Pill>}</div>
                <div style={{ fontSize: 13, color: T.m, marginTop: 2 }}>{selectedThread.contact_name || selectedThread.from_email}{selectedThread.interest_score > 0 && <span style={{ marginLeft: 8, color: T.warm }}>Score: {selectedThread.interest_score}</span>}</div>
              </div>
              <div style={{ display: "flex", gap: 4 }}><IconBtn onClick={() => toggleStar(selectedThread.thread_id)} active={starred.has(selectedThread.thread_id)} title="Star">⭐</IconBtn><IconBtn onClick={() => toggleArchive(selectedThread.thread_id)} title="Archive">📦</IconBtn><IconBtn onClick={() => deleteThread(selectedThread.thread_id)} danger title="Delete">🗑</IconBtn></div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
            {threadLoading ? (<div style={{ textAlign: "center", color: T.m, padding: 40 }}>Loading...</div>) : messages.map((msg, i) => (
              <div key={msg.id} style={{ marginBottom: 12, padding: "14px 16px", borderRadius: 12, background: msg.direction === "inbound" ? T.card : T.aDim, border: `1px solid ${msg.direction === "inbound" ? T.b : T.a + "18"}`, maxWidth: "80%", marginLeft: msg.direction === "outbound" ? "auto" : 0, animation: `fadeIn 0.2s ease ${i * 0.05}s both` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}><DirPill dir={msg.direction} /><span style={{ fontSize: 13, fontWeight: 600, color: T.t }}>{msg.direction === "inbound" ? (msg.from_name || msg.from_email) : "You"}</span><span style={{ fontSize: 9, color: T.s, marginLeft: "auto" }}>{timeAgo(msg.created_at)}</span></div>
                <div style={{ fontSize: 14, color: T.t, lineHeight: 1.65, wordBreak: "break-word" }}>
                  {msg.body_html && msg.body_html.length > 10 ? <div dangerouslySetInnerHTML={{ __html: msg.body_html }} style={{ maxHeight: 400, overflow: "auto" }} /> : <div style={{ whiteSpace: "pre-wrap" }}>{msg.body_text || strip(msg.body_html) || "(empty)"}</div>}
                </div>
                {msg.has_attachments && <div style={{ marginTop: 8, fontSize: 10, color: T.m }}>📎 {msg.attachment_count} attachment{msg.attachment_count !== 1 ? "s" : ""}</div>}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div style={{ borderTop: `1px solid ${T.b}`, padding: "10px 24px", background: T.card }}>
            {composing ? (<div>
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your reply..." rows={4} style={{ width: "100%", background: T.d, color: T.t, border: `1px solid ${T.b}`, borderRadius: 10, padding: 12, fontSize: 14, resize: "vertical", outline: "none", lineHeight: 1.6, boxSizing: "border-box" }} onFocus={focusHandler} onBlur={blurHandler} autoFocus />
              <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "space-between" }}>
                <button onClick={askRueDraft} disabled={rueLoading} style={{ padding: "8px 14px", fontSize: 11, borderRadius: 6, cursor: "pointer", background: T.purpleDim, color: T.purple, border: `1px solid ${T.purple}33`, fontWeight: 600 }}>{rueLoading ? "✨ Drafting..." : "🤖 Ask Rue"}</button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setComposing(false); setReplyText(""); }} style={{ padding: "8px 16px", fontSize: 12, borderRadius: 8, cursor: "pointer", background: "transparent", color: T.m, border: `1px solid ${T.b}` }}>Cancel</button>
                  <button onClick={sendReply} disabled={sending || !replyText.trim()} style={{ padding: "8px 20px", fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: "pointer", background: sending ? T.s : `linear-gradient(135deg, ${T.a}, ${T.green})`, color: "#000", border: "none", opacity: sending || !replyText.trim() ? 0.4 : 1, boxShadow: `0 2px 12px ${T.aGlow}` }}>{sending ? "..." : "Send ✉️"}</button>
                </div>
              </div>
            </div>) : (<div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setComposing(true)} style={{ flex: 1, padding: "12px 16px", fontSize: 12, textAlign: "left", background: T.d, color: T.m, border: `1px solid ${T.b}`, borderRadius: 10, cursor: "pointer", transition: "border 0.15s" }} onMouseEnter={e => e.currentTarget.style.borderColor = T.a} onMouseLeave={e => e.currentTarget.style.borderColor = T.b}>↩ Reply...</button>
              <button onClick={askRueDraft} disabled={rueLoading} style={{ padding: "12px 14px", fontSize: 11, borderRadius: 10, cursor: "pointer", background: T.purpleDim, color: T.purple, border: `1px solid ${T.purple}33`, fontWeight: 700, whiteSpace: "nowrap" }}>{rueLoading ? "✨..." : "🤖 Rue"}</button>
            </div>)}
          </div>
        </>)}
      </div>

      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } } @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } } input::placeholder, textarea::placeholder { color: ${T.s}; }`}</style>
    </div>
  );
}
