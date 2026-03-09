import { useState, useEffect, useRef } from "react";

const T = {
  bg:"#04060A",side:"#070A10",card:"#0B0F17",hover:"#101520",
  b:"rgba(255,255,255,0.04)",bh:"rgba(255,255,255,0.08)",
  a:"#00E5A0",am:"rgba(0,229,160,0.14)",as:"rgba(0,229,160,0.06)",
  r:"#F43F5E",y:"#F59E0B",bl:"#3B82F6",p:"#8B5CF6",c:"#06B6D4",
  t:"#E4E8F1",s:"#7B8BA3",m:"#2A3345",d:"#161C28",
};

const SYSTEM = `You are Rue, an AI recruiting assistant built into RKRT.in — a real estate agent recruiting platform. You help recruiters and team leaders build their pipeline.

## WHAT YOU CAN ACTUALLY DO TODAY
- Analyze the pipeline data passed to you and give smart advice on who to prioritize
- Draft personalized outreach messages (text, email, DM) based on lead data
- Suggest recruiting strategies and handle objection scripts
- Create recruiting social media content and value propositions
- Help think through competitive positioning against other brokerages
- Give accountability coaching based on pipeline activity

## WHAT YOU CANNOT DO YET (be honest if asked)
- You cannot scrape the web, Twitter/X, or any external source in real time
- You cannot auto-send messages or DMs — you draft, the recruiter sends
- You cannot schedule calls or push notifications to phones
- You cannot access data beyond what's passed to you in this conversation
- You cannot run background tasks or automations on a timer
- Never roleplay or simulate capabilities you don't have. If you can't do it in this chat right now, don't offer to do it.

## PERSONALITY
- Direct and concise — no fluff, no hype
- Confident but honest about your limits
- Always end with one clear next action
- Short paragraphs, max 4 bullet points in any list
- Use their first name naturally
- When you don't have enough data to answer, say so and ask for it

## FORMAT
- Never use markdown headers with ### in chat — use bold or plain text
- Keep responses under 200 words unless drafting actual content
- When drafting outreach, make it specific — never generic templates`;

// ── Supabase constants (same anon key as App.jsx) ─────────────────────────────
const SUPA_URL = "https://usknntguurefeyzusbdh.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVza25udGd1dXJlZmV5enVzYmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MTcwODAsImV4cCI6MjA4Nzk5MzA4MH0.pxexo90zyugIA4pPzLonGo3E1frr8bSZvz-XT7BmuqQ";
const AGENT_ID = "rue";
// ─────────────────────────────────────────────────────────────────────────────

export default function RueDrawer({ open, onClose, profile, leads, userId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null); // ── ADDED
  const messagesEnd = useRef(null);
  const inputRef = useRef(null);
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  // Reset conversation ID when drawer closes
  useEffect(() => {
    if (!open) setConversationId(null);
  }, [open]);

  // Greeting on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
      const leadCount = leads?.length || 0;
      const urgent = leads?.filter(l => l.urgency === "HIGH").length || 0;
      const needsFollowUp = leads?.filter(l =>
        l.pipeline_stage && l.pipeline_stage !== "new" && l.pipeline_stage !== "recruited" &&
        l.created_at && (Date.now() - new Date(l.created_at)) > 3 * 86400000
      ).length || 0;

      let greetingText = `${greeting}, ${firstName}! I'm Rue, your recruiting intelligence agent. How can I help you today?`;
      if (leadCount > 0) {
        greetingText += `\n\nQuick glance at your pipeline: ${leadCount} leads`;
        if (urgent > 0) greetingText += `, ${urgent} hot`;
        if (needsFollowUp > 0) greetingText += `, ${needsFollowUp} need follow-up`;
        greetingText += ".";
      }
      setMessages([{ role: "assistant", content: greetingText, ts: Date.now() }]);
    }
  }, [open]);

  // ── ADDED: create a conversations row on first real user message ──────────
  const ensureConversation = async () => {
    if (conversationId) return conversationId;
    if (!userId) return null;
    try {
      const res = await fetch(`${SUPA_URL}/rest/v1/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPA_KEY,
          "Authorization": `Bearer ${SUPA_KEY}`,
          "Prefer": "return=representation",
        },
        body: JSON.stringify({
          user_id: userId,
          agent_id: AGENT_ID,
          title: "Rue Chat",
          message_count: 0,
        }),
      });
      if (!res.ok) return null;
      const [row] = await res.json();
      setConversationId(row.id);
      return row.id;
    } catch {
      return null; // silent — don't break chat
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  // ── ADDED: persist user + assistant message pair ──────────────────────────
  const saveMessages = async (convId, userContent, assistantContent) => {
    if (!convId || !userId) return;
    try {
      await fetch(`${SUPA_URL}/rest/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPA_KEY,
          "Authorization": `Bearer ${SUPA_KEY}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify([
          { conversation_id: convId, user_id: userId, agent_id: AGENT_ID, role: "user",      content: userContent },
          { conversation_id: convId, user_id: userId, agent_id: AGENT_ID, role: "assistant", content: assistantContent },
        ]),
      });
      // Update last_message_at on the conversation
      await fetch(`${SUPA_URL}/rest/v1/conversations?id=eq.${convId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPA_KEY,
          "Authorization": `Bearer ${SUPA_KEY}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({ last_message_at: new Date().toISOString() }),
      });
    } catch {
      // silent — persistence failure should never break the chat UI
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  // ── REFACTORED: shared helpers to eliminate duplication ──────────────────
  const buildSystemPrompt = () => {
    let sys = SYSTEM;
    if (profile?.brokerage) sys += `\n\nUser's brokerage: ${profile.brokerage}. Market: ${profile.market || "not set"}.`;
    if (leads?.length > 0) {
      sys += `\n\nPIPELINE (${leads.length} leads):\n` + leads.slice(0, 10).map(l =>
        `- ${l.first_name} ${l.last_name} | ${l.market} | ${l.brokerage?.substring(0, 20) || "?"} | ${l.tier} | ${l.urgency} | ${l.pipeline_stage}`
      ).join("\n");
    }
    return sys;
  };

  const callAI = async (history) => {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + (import.meta.env.VITE_OPENROUTER_KEY || ""),
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat-v3-0324",
        max_tokens: 1500,
        messages: [{ role: "system", content: buildSystemPrompt() }, ...history],
      }),
    });
    if (!r.ok) throw new Error(`API error ${r.status}`);
    const d = await r.json();
    return d.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";
  };
  // ─────────────────────────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userContent = input.trim();
    const userMsg = { role: "user", content: userContent, ts: Date.now() };
    setMessages(p => [...p, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.concat(userMsg).map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));
      const reply = await callAI(history);
      setMessages(p => [...p, { role: "assistant", content: reply, ts: Date.now() }]);
      // ── ADDED: persist ──────────────────────────────────────────────────
      const convId = await ensureConversation();
      await saveMessages(convId, userContent, reply);
      // ───────────────────────────────────────────────────────────────────
    } catch (e) {
      setMessages(p => [...p, { role: "assistant", content: `Error: ${e.message}. Try again.`, ts: Date.now() }]);
    }
    setLoading(false);
  };

  const sendQuick = async (q) => {
    if (loading) return;
    const userMsg = { role: "user", content: q, ts: Date.now() };
    setMessages(p => [...p, userMsg]);
    setLoading(true);

    try {
      const history = messages.concat(userMsg).map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));
      const reply = await callAI(history);
      setMessages(p => [...p, { role: "assistant", content: reply, ts: Date.now() }]);
      // ── ADDED: persist ──────────────────────────────────────────────────
      const convId = await ensureConversation();
      await saveMessages(convId, q, reply);
      // ───────────────────────────────────────────────────────────────────
    } catch (e) {
      setMessages(p => [...p, { role: "assistant", content: "Connection error.", ts: Date.now() }]);
    }
    setLoading(false);
  };

  const quickActions = [
    { icon: "🎯", label: "Who should I call?", q: "Who should I call first today? Look at my pipeline and tell me the highest priority lead." },
    { icon: "📱", label: "Draft outreach",     q: "Draft a recruiting DM for my hottest lead." },
    { icon: "📋", label: "Today's game plan",  q: "Create my recruiting game plan for today based on my pipeline." },
    { icon: "🔍", label: "Find agents",        q: `Find me agents${profile?.market ? " in " + profile.market : ""} who might be looking to switch.` },
  ];

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="rue-backdrop"
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(2px)", zIndex: 1300,
        }}
      />

      {/* Drawer */}
      <div
        className="rue-drawer"
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: 420, maxWidth: "100vw",
          background: T.bg, borderLeft: `1px solid ${T.b}`,
          zIndex: 1301, display: "flex", flexDirection: "column",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
          animation: "slideInRight 0.25s ease",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "18px 20px", borderBottom: `1px solid ${T.b}`,
          display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg, #00E5A0, #3B82F6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, flexShrink: 0,
          }}>🤖</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.t }}>Rue</div>
            <div style={{ fontSize: 12, color: T.a, fontWeight: 600 }}>Your AI Recruiting Agent</div>
          </div>
          <div
            onClick={() => { setMessages([]); setConversationId(null); }}
            style={{
              padding: "6px 12px", borderRadius: 6, background: T.d,
              border: `1px solid ${T.b}`, color: T.m, fontSize: 11,
              fontWeight: 700, cursor: "pointer",
            }}
          >Clear</div>
          <div
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8, display: "flex",
              alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 16, color: T.s,
              background: T.d, border: `1px solid ${T.b}`,
            }}
          >✕</div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflow: "auto", padding: "16px 20px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "85%", padding: "12px 16px",
                borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: msg.role === "user" ? T.a + "18" : T.card,
                border: `1px solid ${msg.role === "user" ? T.a + "30" : T.b}`,
                color: T.t, fontSize: 14, lineHeight: 1.6,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {msg.role === "assistant" && (
                  <div style={{ fontSize: 11, color: T.a, fontWeight: 700, marginBottom: 4, letterSpacing: 0.5 }}>RUE</div>
                )}
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ padding: "12px 16px", borderRadius: "14px 14px 14px 4px", background: T.card, border: `1px solid ${T.b}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.a, animation: "pulse 1s infinite" }} />
                  <span style={{ fontSize: 13, color: T.s }}>Rue is thinking...</span>
                </div>
              </div>
            </div>
          )}

          {messages.length <= 1 && !loading && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
              {quickActions.map((qa, i) => (
                <div
                  key={i}
                  onClick={() => sendQuick(qa.q)}
                  style={{
                    padding: "12px 14px", borderRadius: 10,
                    background: T.d, border: `1px solid ${T.b}`,
                    cursor: loading ? "wait" : "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                    transition: "border-color 0.15s", opacity: loading ? 0.5 : 1,
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = T.a + "40"}
                  onMouseOut={e => e.currentTarget.style.borderColor = T.b}
                >
                  <span style={{ fontSize: 16 }}>{qa.icon}</span>
                  <span style={{ fontSize: 13, color: T.s, fontWeight: 600 }}>{qa.label}</span>
                </div>
              ))}
            </div>
          )}

          <div ref={messagesEnd} />
        </div>

        {/* Input */}
        <div style={{
          padding: "14px 20px", borderTop: `1px solid ${T.b}`,
          display: "flex", gap: 10, flexShrink: 0, background: T.side,
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask Rue anything..."
            style={{
              flex: 1, padding: "12px 16px", borderRadius: 10,
              background: T.d, border: `1px solid ${T.b}`,
              color: T.t, fontSize: 14, outline: "none", fontFamily: "inherit",
            }}
          />
          <div
            onClick={sendMessage}
            style={{
              padding: "12px 20px", borderRadius: 10,
              background: input.trim() && !loading ? T.a : T.d,
              color: input.trim() && !loading ? "#000" : T.m,
              fontSize: 14, fontWeight: 700,
              cursor: input.trim() && !loading ? "pointer" : "default",
              display: "flex", alignItems: "center", transition: "all 0.15s",
            }}
          >Send</div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @media (max-width: 768px) {
          .rue-drawer { width: 100vw !important; border-left: none !important; }
          .rue-backdrop { backdrop-filter: none !important; }
        }
      `}</style>
    </>
  );
}
