import { useState, useEffect, useRef } from "react";
import { isPro } from '../lib/utils';
import { startCheckout } from '../lib/supabase';
import { STRIPE_PRICES } from '../lib/constants';

const FREE_MESSAGE_LIMIT = 10;

const RUE_CHAT_URL = "https://usknntguurefeyzusbdh.supabase.co/functions/v1/rue-chat";

const T = {
  bg:"#04060A",side:"#070A10",card:"#0B0F17",hover:"#101520",
  b:"rgba(255,255,255,0.04)",bh:"rgba(255,255,255,0.08)",
  a:"#00E5A0",am:"rgba(0,229,160,0.14)",as:"rgba(0,229,160,0.06)",
  r:"#F43F5E",y:"#F59E0B",bl:"#3B82F6",p:"#8B5CF6",c:"#06B6D4",
  t:"#E4E8F1",s:"#7B8BA3",m:"#2A3345",d:"#161C28",
};

const SYSTEM = `You are RUE, an elite AI recruiting assistant for real estate team leaders and brokers, powered by RKRT.

You help them recruit real estate agents to their brokerage or team. You seamlessly handle all aspects of the recruiting process:

LEAD INTELLIGENCE: Research target agents — their production volume, brokerage history, social presence, reviews, license status. Identify who's likely to switch and why.

OUTREACH & FOLLOW-UP: Draft personalized recruiting messages (text, email, DM, LinkedIn, video scripts). Create multi-touch nurture sequences. Track who needs follow-up.

OBJECTION HANDLING: Handle common objections like "I'm happy where I am," "what's your split," "I don't want to pay fees." Provide scripts and role-play.

CONTENT & MARKETING: Create recruiting-focused social media content, video scripts for attracting agents, market reports, and value propositions. Make them look like the obvious choice.

PIPELINE MANAGEMENT: Track recruiting pipeline stages (new → researched → outreach → meeting → talking → recruited). Prioritize who to contact based on urgency and fit.

COMPETITIVE INTEL: Analyze competitor brokerages — their splits, fees, culture, weaknesses. Position our offer against theirs.

ACCOUNTABILITY: Daily recruiting activity check-ins. Track calls made, messages sent, meetings booked. Hold them to their recruiting goals.

PERSONALITY:
- Direct and actionable — no fluff
- Proactive — suggest who to call and what to say without being asked
- Confident like a top recruiter — you know how to close
- Short paragraphs, not walls of text
- 3-5 items max in any list
- Always end with a clear next action
- Reference their pipeline data when available
- When drafting messages, make them personal and specific — never generic
- When greeting the user, be warm and use their first name
- You are their unfair advantage in recruiting. Act like it.`;

export default function RueDrawer({ open, onClose, profile, leads, userId, autoOpen }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState(null);
  const messagesEnd = useRef(null);
  const inputRef = useRef(null);
  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const isFirstTimeUser = (leads?.length || 0) === 0;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when opened; reset convId when closed
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      setConvId(null);
    }
  }, [open]);

  // Greeting on first open — context-aware for new users
  useEffect(() => {
    if (open && messages.length === 0) {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
      const leadCount = leads?.length || 0;
      const urgent = leads?.filter(l => l.urgency === "HIGH").length || 0;
      const needsFollowUp = leads?.filter(l => l.pipeline_stage && l.pipeline_stage !== "new" && l.pipeline_stage !== "recruited" && l.created_at && (Date.now() - new Date(l.created_at)) > 3 * 86400000).length || 0;

      let greetingText;

      if (isFirstTimeUser) {
        greetingText = `${greeting}, ${firstName}! I'm Rue, your AI recruiting agent.`;
        if (profile?.brokerage) greetingText += ` I see you're recruiting for **${profile.brokerage}**`;
        if (profile?.market) greetingText += ` in the **${profile.market}** market`;
        if (profile?.brokerage || profile?.market) greetingText += " — great choice.";
        greetingText += `\n\nI'm here to help you find, research, and recruit real estate agents. Here's what I can do right now:\n\n`;
        greetingText += `**1.** Find top-producing agents${profile?.market ? " in " + profile.market : ""} who might be ready to switch\n`;
        greetingText += `**2.** Draft personalized recruiting messages\n`;
        greetingText += `**3.** Build your weekly recruiting game plan\n\n`;
        greetingText += `Want me to find some recruiting targets to get you started?`;
      } else {
        greetingText = `${greeting}, ${firstName}! I'm Rue, your recruiting intelligence agent. How can I help you today?`;
        if (leadCount > 0) {
          greetingText += `\n\nQuick glance at your pipeline: ${leadCount} leads`;
          if (urgent > 0) greetingText += `, ${urgent} hot`;
          if (needsFollowUp > 0) greetingText += `, ${needsFollowUp} need follow-up`;
          greetingText += ".";
        }
      }

      setMessages([{ role: "assistant", content: greetingText, ts: Date.now() }]);
    }
  }, [open]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim(), ts: Date.now() };
    setMessages(p => [...p, userMsg]);
    setInput("");
    setLoading(true);

    try {
      let sys = SYSTEM;
      sys += `\n\n[USER CONTEXT: Name: ${profile?.full_name || "Unknown"}, Brokerage: ${profile?.brokerage || "not set"}, Market: ${profile?.market || "not set"}, Plan: ${profile?.plan || "free"}]`;
      if (isFirstTimeUser) sys += `\nThis is a new user who just completed onboarding. They have 0 leads. Be helpful, proactive, and guide them toward finding their first recruiting targets.`;
      if (leads?.length > 0) {
        sys += `\n\nPIPELINE (${leads.length} leads):\n` + leads.slice(0, 10).map(l =>
          `- ${l.first_name} ${l.last_name} | ${l.market} | ${l.brokerage?.substring(0, 20) || "?"} | ${l.tier} | ${l.urgency} | ${l.pipeline_stage}`
        ).join("\n");
      }

      // Build conversation history for context
      const convHistory = messages.concat(userMsg).map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      }));

      const body = { system: sys, messages: convHistory, user_id: userId };
      if (convId) body.conversation_id = convId;
      const r = await fetch(RUE_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!r.ok) {
        setMessages(p => [...p, { role: "assistant", content: `API error ${r.status}. Please try again.`, ts: Date.now() }]);
        setLoading(false);
        return;
      }
      const d = await r.json();
      if (d.conversation_id) setConvId(d.conversation_id);
      const reply = d.content || "Sorry, I couldn't process that.";
      setMessages(p => [...p, { role: "assistant", content: reply, ts: Date.now() }]);
    } catch (e) {
      setMessages(p => [...p, { role: "assistant", content: "Connection error. Try again.", ts: Date.now() }]);
    }
    setLoading(false);
  };

  const quickActions = [
    { icon: "🎯", label: "Who should I call?", q: "Who should I call first today? Look at my pipeline and tell me the highest priority lead." },
    { icon: "📱", label: "Draft outreach", q: "Draft a recruiting DM for my hottest lead." },
    { icon: "📋", label: "Today's game plan", q: "Create my recruiting game plan for today based on my pipeline." },
    { icon: "🔍", label: "Find agents", q: `Find me agents${profile?.market ? " in " + profile.market : ""} who might be looking to switch.` },
  ];

  const handleQuickAction = (q) => {
    setInput(q);
    setTimeout(() => {
      setInput(q);
      sendMessage();
    }, 50);
  };

  // Quick action that directly sends
  const sendQuick = async (q) => {
    if (loading) return;
    const userMsg = { role: "user", content: q, ts: Date.now() };
    setMessages(p => [...p, userMsg]);
    setLoading(true);

    try {
      let sys = SYSTEM;
      sys += `\n\n[USER CONTEXT: Name: ${profile?.full_name || "Unknown"}, Brokerage: ${profile?.brokerage || "not set"}, Market: ${profile?.market || "not set"}, Plan: ${profile?.plan || "free"}]`;
      if (isFirstTimeUser) sys += `\nThis is a new user who just completed onboarding. They have 0 leads. Be helpful, proactive, and guide them toward finding their first recruiting targets.`;
      if (leads?.length > 0) {
        sys += `\n\nPIPELINE (${leads.length} leads):\n` + leads.slice(0, 10).map(l =>
          `- ${l.first_name} ${l.last_name} | ${l.market} | ${l.brokerage?.substring(0, 20) || "?"} | ${l.tier} | ${l.urgency} | ${l.pipeline_stage}`
        ).join("\n");
      }
      const convHistory = messages.concat(userMsg).map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      }));
      const qbody = { system: sys, messages: convHistory, user_id: userId };
      if (convId) qbody.conversation_id = convId;
      const r = await fetch(RUE_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(qbody)
      });
      if (!r.ok) { setMessages(p => [...p, { role: "assistant", content: `API error ${r.status}`, ts: Date.now() }]); setLoading(false); return; }
      const d = await r.json();
      if (d.conversation_id) setConvId(d.conversation_id);
      setMessages(p => [...p, { role: "assistant", content: d.content || "No response.", ts: Date.now() }]);
    } catch (e) {
      setMessages(p => [...p, { role: "assistant", content: "Connection error.", ts: Date.now() }]);
    }
    setLoading(false);
  };

  if (!open) return null;

  const userIsPro = isPro(profile);

  // Free users can use Rue for basic confirmation/validation with a message limit
  const userMessageCount = messages.filter(m => m.role === "user").length;
  const freeHitLimit = !userIsPro && userMessageCount >= FREE_MESSAGE_LIMIT;

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
            onClick={() => { setMessages([]); }}
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
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div style={{
                maxWidth: "85%",
                padding: "12px 16px",
                borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: msg.role === "user" ? T.a + "18" : T.card,
                border: `1px solid ${msg.role === "user" ? T.a + "30" : T.b}`,
                color: T.t,
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
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
              <div style={{
                padding: "12px 16px", borderRadius: "14px 14px 14px 4px",
                background: T.card, border: `1px solid ${T.b}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.a, animation: "pulse 1s infinite" }} />
                  <span style={{ fontSize: 13, color: T.s }}>Rue is thinking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick actions — show when only greeting is visible */}
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
                    transition: "border-color 0.15s",
                    opacity: loading ? 0.5 : 1,
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

        {/* Free tier limit banner */}
        {freeHitLimit && (
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.b}`, background: "#F59E0B08", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 12, color: T.s }}>You've used your {FREE_MESSAGE_LIMIT} free messages. Upgrade for unlimited Rue access.</div>
              <div onClick={() => startCheckout({ priceId: STRIPE_PRICES.recruiter, plan: 'recruiter' })} style={{ padding: "6px 14px", borderRadius: 7, background: "#F59E0B", color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>Upgrade →</div>
            </div>
          </div>
        )}

        {/* Input */}
        {!freeHitLimit && (
          <div style={{
            padding: "14px 20px", borderTop: `1px solid ${T.b}`,
            display: "flex", gap: 10, flexShrink: 0,
            background: T.side,
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
                color: T.t, fontSize: 14, outline: "none",
                fontFamily: "inherit",
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
                display: "flex", alignItems: "center",
                transition: "all 0.15s",
              }}
            >Send</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @media (max-width: 768px) {
          .rue-drawer {
            width: 100vw !important;
            border-left: none !important;
          }
          .rue-backdrop {
            backdrop-filter: none !important;
          }
        }
      `}</style>
    </>
  );
}
