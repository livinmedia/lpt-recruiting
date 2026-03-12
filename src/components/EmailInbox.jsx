import { useState, useEffect, useCallback } from "react";

// ─── Theme (matches App.jsx dark theme) ─────────────────────
const T = {
  bg: "#0a0e17", card: "#111827", cardHover: "#1a2236",
  b: "#1e293b", a: "#22d3ee", aDim: "rgba(34,211,238,0.15)",
  hot: "#f43f5e", warm: "#f59e0b", green: "#10b981",
  purple: "#a78bfa", t: "#e2e8f0", m: "#64748b", s: "#475569",
  d: "#0f172a",
};

const SUPABASE_FN_URL = "https://usknntguurefeyzusbdh.supabase.co/functions/v1";

// ─── Helpers ────────────────────────────────────────────────
const timeAgo = (d) => {
  if (!d) return "";
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
};

const stripHtml = (html) => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
};

const truncate = (str, len = 80) => {
  if (!str) return "";
  return str.length > len ? str.slice(0, len) + "…" : str;
};

// ─── Direction Badge ────────────────────────────────────────
const DirBadge = ({ dir }) => (
  <span style={{
    fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
    background: dir === "inbound" ? T.green + "22" : T.a + "22",
    color: dir === "inbound" ? T.green : T.a,
    textTransform: "uppercase", letterSpacing: "0.05em",
  }}>
    {dir === "inbound" ? "↓ IN" : "↑ OUT"}
  </span>
);

// ─── Unread Dot ─────────────────────────────────────────────
const UnreadDot = () => (
  <span style={{
    width: 8, height: 8, borderRadius: "50%", background: T.a,
    display: "inline-block", flexShrink: 0,
  }} />
);

// ═══════════════════════════════════════════════════════════════
// MAIN INBOX COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function EmailInbox({ supabase, userId, profile }) {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [composing, setComposing] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("all"); // all, unread, inbound, outbound

  // Load inbox threads
  const loadInbox = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("v_user_inbox")
      .select("*")
      .eq("user_id", userId)
      .order("last_message_at", { ascending: false });

    if (data) setThreads(data);
    if (error) console.error("Inbox load error:", error);

    // Unread count
    const { data: uc } = await supabase
      .from("v_unread_count")
      .select("unread")
      .eq("user_id", userId)
      .maybeSingle();
    setUnreadCount(uc?.unread || 0);

    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  // Load thread messages
  const openThread = async (thread) => {
    setSelectedThread(thread);
    setThreadLoading(true);
    setComposing(false);
    setReplyText("");

    const { data } = await supabase
      .from("email_messages")
      .select("*")
      .eq("thread_id", thread.thread_id)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data);
      // Mark unread messages as read
      const unreadIds = data.filter(m => !m.is_read && m.direction === "inbound").map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase
          .from("email_messages")
          .update({ is_read: true, read_at: new Date().toISOString() })
          .in("id", unreadIds);
        // Refresh inbox to update unread counts
        loadInbox();
      }
    }
    setThreadLoading(false);
  };

  // Send reply
  const sendReply = async () => {
    if (!replyText.trim() || !selectedThread) return;
    setSending(true);

    try {
      // Determine who to send to
      const lastInbound = [...messages].reverse().find(m => m.direction === "inbound");
      const toEmail = lastInbound?.from_email || selectedThread.from_email;
      const subject = selectedThread.subject?.startsWith("Re:") 
        ? selectedThread.subject 
        : `Re: ${selectedThread.subject || ""}`;

      // Send via send-email edge function
      const res = await fetch(`${SUPABASE_FN_URL}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "user_outreach",
          to: toEmail,
          subject,
          body: replyText,
          lead_id: selectedThread.lead_id,
          user_id: userId,
        }),
      });

      const result = await res.json();

      if (result.success) {
        // Store outbound message in email_messages
        await supabase.from("email_messages").insert({
          user_id: userId,
          lead_id: selectedThread.lead_id,
          direction: "outbound",
          from_email: profile?.rkrt_email || `${(profile?.full_name || "recruiter").toLowerCase().replace(/\s+/g, ".")}@rkrt.in`,
          from_name: profile?.full_name || "RKRT",
          to_email: toEmail,
          subject,
          body_text: replyText,
          body_html: null,
          thread_id: selectedThread.thread_id,
          resend_id: result.id,
          status: "sent",
          is_read: true,
          sent_at: new Date().toISOString(),
        });

        setReplyText("");
        setComposing(false);
        // Reload thread
        openThread(selectedThread);
      } else {
        alert("Failed to send: " + (result.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Send reply error:", err);
      alert("Failed to send reply");
    }
    setSending(false);
  };

  // Filter threads
  const filtered = threads.filter(t => {
    if (filter === "unread") return t.unread_count > 0;
    if (filter === "inbound") return t.direction === "inbound";
    if (filter === "outbound") return t.direction === "outbound";
    return true;
  });

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", background: T.bg, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.b}` }}>

      {/* ─── LEFT: Thread List ─────────────────────────────── */}
      <div style={{ width: 380, borderRight: `1px solid ${T.b}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.b}`, background: T.card }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: T.t, fontFamily: "'JetBrains Mono', monospace" }}>
                📬 Inbox
              </span>
              {unreadCount > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                  background: T.a, color: "#000",
                }}>
                  {unreadCount}
                </span>
              )}
            </div>
            <button onClick={loadInbox} style={{
              fontSize: 12, padding: "4px 10px", background: T.aDim, color: T.a,
              border: `1px solid ${T.a}33`, borderRadius: 6, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
            }}>↻</button>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 4 }}>
            {[["all", "All"], ["unread", "Unread"], ["inbound", "Received"], ["outbound", "Sent"]].map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id)} style={{
                fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                background: filter === id ? T.aDim : "transparent",
                color: filter === id ? T.a : T.m,
                border: filter === id ? `1px solid ${T.a}33` : "1px solid transparent",
                fontFamily: "'JetBrains Mono', monospace",
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Thread list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: T.m, fontSize: 13 }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: T.m }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 13 }}>No messages yet</div>
              <div style={{ fontSize: 11, marginTop: 4, color: T.s }}>
                Replies to your outreach emails will appear here
              </div>
            </div>
          ) : (
            filtered.map((t) => (
              <div key={t.thread_id} onClick={() => openThread(t)} style={{
                padding: "14px 20px", cursor: "pointer", borderBottom: `1px solid ${T.b}10`,
                background: selectedThread?.thread_id === t.thread_id ? T.cardHover : "transparent",
                transition: "background 0.15s",
              }}
                onMouseEnter={(e) => { if (selectedThread?.thread_id !== t.thread_id) e.currentTarget.style.background = T.card; }}
                onMouseLeave={(e) => { if (selectedThread?.thread_id !== t.thread_id) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  {t.unread_count > 0 && <UnreadDot />}
                  <span style={{
                    fontSize: 13, fontWeight: t.unread_count > 0 ? 700 : 500,
                    color: T.t, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {t.contact_name || t.from_email}
                  </span>
                  <DirBadge dir={t.direction} />
                </div>
                <div style={{
                  fontSize: 12, color: t.unread_count > 0 ? T.t : T.m,
                  fontWeight: t.unread_count > 0 ? 600 : 400,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4,
                }}>
                  {t.subject || "(no subject)"}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: T.s, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                    {truncate(stripHtml(t.body_text), 50)}
                  </span>
                  <span style={{ fontSize: 10, color: T.s, flexShrink: 0 }}>
                    {timeAgo(t.last_message_at)}
                    {t.message_count > 1 && <span style={{ marginLeft: 6, color: T.m }}>({t.message_count})</span>}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── RIGHT: Thread Detail ──────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.d }}>
        {!selectedThread ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.m }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
              <div style={{ fontSize: 14 }}>Select a conversation</div>
            </div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${T.b}`, background: T.card }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.t }}>{selectedThread.subject || "(no subject)"}</div>
                  <div style={{ fontSize: 12, color: T.m, marginTop: 2 }}>
                    {selectedThread.contact_name || selectedThread.from_email}
                    {selectedThread.lead_id && (
                      <span style={{ marginLeft: 8, fontSize: 10, padding: "1px 6px", borderRadius: 4, background: T.green + "22", color: T.green }}>
                        Linked Lead
                      </span>
                    )}
                    {selectedThread.heat_level && (
                      <span style={{ marginLeft: 6, fontSize: 10, padding: "1px 6px", borderRadius: 4, background: T.hot + "22", color: T.hot }}>
                        {selectedThread.heat_level}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: T.s }}>{messages.length} messages</span>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              {threadLoading ? (
                <div style={{ textAlign: "center", color: T.m, padding: 40 }}>Loading thread...</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} style={{
                    marginBottom: 16,
                    padding: 16,
                    borderRadius: 12,
                    background: msg.direction === "inbound" ? T.card : T.a + "08",
                    border: `1px solid ${msg.direction === "inbound" ? T.b : T.a + "22"}`,
                    maxWidth: "85%",
                    marginLeft: msg.direction === "outbound" ? "auto" : 0,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <DirBadge dir={msg.direction} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.t }}>
                        {msg.direction === "inbound" ? (msg.from_name || msg.from_email) : "You"}
                      </span>
                      <span style={{ fontSize: 10, color: T.s, marginLeft: "auto" }}>
                        {timeAgo(msg.created_at)}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: T.t, lineHeight: 1.6, wordBreak: "break-word" }}>
                      {msg.body_html ? (
                        <div dangerouslySetInnerHTML={{ __html: msg.body_html }} 
                          style={{ maxHeight: 400, overflow: "auto" }} />
                      ) : (
                        <div style={{ whiteSpace: "pre-wrap" }}>{msg.body_text || "(empty)"}</div>
                      )}
                    </div>
                    {msg.has_attachments && (
                      <div style={{ marginTop: 8, fontSize: 11, color: T.m }}>
                        📎 {msg.attachment_count} attachment{msg.attachment_count !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Reply area */}
            <div style={{ borderTop: `1px solid ${T.b}`, padding: "12px 24px", background: T.card }}>
              {composing ? (
                <div>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    rows={4}
                    style={{
                      width: "100%", background: T.d, color: T.t, border: `1px solid ${T.b}`,
                      borderRadius: 8, padding: 12, fontSize: 13, resize: "vertical",
                      fontFamily: "'Inter', -apple-system, sans-serif", outline: "none",
                    }}
                    onFocus={(e) => e.target.style.borderColor = T.a}
                    onBlur={(e) => e.target.style.borderColor = T.b}
                    autoFocus
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => { setComposing(false); setReplyText(""); }} style={{
                      padding: "8px 16px", fontSize: 12, borderRadius: 6, cursor: "pointer",
                      background: "transparent", color: T.m, border: `1px solid ${T.b}`,
                    }}>Cancel</button>
                    <button onClick={sendReply} disabled={sending || !replyText.trim()} style={{
                      padding: "8px 20px", fontSize: 12, fontWeight: 700, borderRadius: 6, cursor: "pointer",
                      background: sending ? T.s : T.a, color: "#000", border: "none",
                      opacity: sending || !replyText.trim() ? 0.5 : 1,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>{sending ? "Sending..." : "Send Reply"}</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setComposing(true)} style={{
                  width: "100%", padding: "12px 16px", fontSize: 13, textAlign: "left",
                  background: T.d, color: T.m, border: `1px solid ${T.b}`,
                  borderRadius: 8, cursor: "pointer", transition: "border 0.15s",
                }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = T.a}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = T.b}
                >
                  ↩ Reply to this thread...
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
