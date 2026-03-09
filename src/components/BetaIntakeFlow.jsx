import { useState, useEffect, useRef } from "react";

const T = {
  bg:"#04060A", card:"#0B0F17", d:"#0F1520",
  b:"rgba(255,255,255,0.06)", bh:"rgba(255,255,255,0.12)",
  a:"#00E5A0", am:"rgba(0,229,160,0.12)", as:"rgba(0,229,160,0.05)",
  t:"#E4E8F1", s:"#7B8BA3", m:"#1E2A3A", dim:"#161C28",
  p:"#8B5CF6", pm:"rgba(139,92,246,0.12)",
};

const QUESTIONS = [
  {
    key: "years_recruiting",
    ask: "How many years have you been recruiting agents?",
    quick: ["Less than 1 year", "1–3 years", "3–5 years", "5+ years"],
  },
  {
    key: "current_brokerage",
    ask: "What brokerage are you recruiting for?",
    quick: ["LPT Realty", "eXp Realty", "Keller Williams", "RE/MAX", "Other"],
  },
  {
    key: "target_market",
    ask: "What's your primary recruiting market? (City or region)",
    quick: null,
  },
  {
    key: "team_size",
    ask: "How many agents are currently on your team or under your umbrella?",
    quick: ["Just me", "2–10", "11–25", "26–50", "50+"],
  },
  {
    key: "biggest_challenge",
    ask: "What's your biggest recruiting challenge right now?",
    quick: ["Finding the right agents to target", "Getting agents to respond", "Closing agents who are on the fence", "Keeping up with follow-up", "Standing out from other recruiters"],
  },
  {
    key: "goal_90_days",
    ask: "What's your #1 goal for the next 90 days?",
    quick: ["Recruit 3–5 agents", "Recruit 6–10 agents", "Build a consistent outreach system", "Convert agents I've already been talking to", "Expand into a new market"],
  },
  {
    key: "how_heard",
    ask: "Last one — how did you hear about RKRT?",
    quick: ["Anthony invited me", "Social media", "Word of mouth", "Real estate event", "Other"],
  },
];

export default function BetaIntakeFlow({ userId, profile, supabase, onComplete }) {
  const [messages, setMessages] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  // Boot message from Rue
  useEffect(() => {
    setTimeout(() => {
      addRue(`Hey ${firstName}! I'm Rue — your RKRT AI assistant. 👋`);
    }, 400);
    setTimeout(() => {
      addRue(`Before you dive in, I want to learn a little about you so I can make RKRT actually useful for your recruiting business. Just 7 quick questions. Ready?`);
    }, 1200);
    setTimeout(() => {
      addRue(QUESTIONS[0].ask);
    }, 2200);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function addRue(text) {
    setMessages(prev => [...prev, { from: "rue", text, ts: Date.now() }]);
  }

  function addUser(text) {
    setMessages(prev => [...prev, { from: "user", text, ts: Date.now() }]);
  }

  async function handleAnswer(answer) {
    if (!answer.trim()) return;

    const q = QUESTIONS[currentQ];
    addUser(answer);
    setInput("");

    const newAnswers = { ...answers, [q.key]: answer };
    setAnswers(newAnswers);

    const next = currentQ + 1;

    if (next < QUESTIONS.length) {
      setCurrentQ(next);
      setTimeout(() => {
        const affirm = getAffirmation(currentQ);
        addRue(affirm + " " + QUESTIONS[next].ask);
      }, 600);
    } else {
      // All done
      setCurrentQ(QUESTIONS.length);
      setTimeout(() => {
        addRue(`That's everything! You're all set, ${firstName}. Let me save your profile and get your dashboard ready. 🚀`);
      }, 600);
      setTimeout(() => saveIntake(newAnswers), 1400);
    }

    setTimeout(() => inputRef.current?.focus(), 700);
  }

  function getAffirmation(qIndex) {
    const affirms = ["Got it.", "Perfect.", "Nice.", "Great.", "Noted.", "Love it.", "Awesome."];
    return affirms[qIndex % affirms.length];
  }

  async function saveIntake(finalAnswers) {
    setSaving(true);
    try {
      // Save intake answers
      await supabase.from("beta_intake").upsert({
        user_id: userId,
        ...finalAnswers,
        completed: true,
        completed_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      // Update profile with what we learned
      await supabase.from("profiles").update({
        brokerage: finalAnswers.current_brokerage || profile?.brokerage,
        market: finalAnswers.target_market || profile?.market,
        onboarded: true,
      }).eq("id", userId);

      setDone(true);
    } catch (e) {
      console.error("intake save error", e);
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: T.t, marginBottom: 12 }}>You're all set, {firstName}!</div>
          <div style={{ fontSize: 15, color: T.s, lineHeight: 1.6, marginBottom: 32 }}>
            Your RKRT account is personalized and ready. Let's start recruiting smarter.
          </div>
          <button
            onClick={() => onComplete({ brokerage: answers.current_brokerage, market: answers.target_market, onboarded: true })}
            style={{ padding: "14px 40px", borderRadius: 10, background: T.a, color: "#000", fontSize: 16, fontWeight: 700, border: "none", cursor: "pointer" }}
          >
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = QUESTIONS[currentQ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", fontFamily: "'SF Pro Display',-apple-system,sans-serif" }}>

      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${T.b}`, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg,${T.a},#3B82F6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.t }}>Rue</div>
          <div style={{ fontSize: 12, color: T.a }}>● Setting up your account</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 13, color: T.s }}>
          {Math.min(currentQ, QUESTIONS.length)}/{QUESTIONS.length} questions
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: T.dim }}>
        <div style={{ height: "100%", background: `linear-gradient(90deg,${T.a},#3B82F6)`, width: `${(Math.min(currentQ, QUESTIONS.length) / QUESTIONS.length) * 100}%`, transition: "width 0.4s ease" }} />
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16, maxWidth: 680, width: "100%", margin: "0 auto" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", flexDirection: msg.from === "user" ? "row-reverse" : "row" }}>
            {msg.from === "rue" && (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${T.a},#3B82F6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🤖</div>
            )}
            <div style={{
              maxWidth: "75%", padding: "12px 16px", borderRadius: msg.from === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.from === "user" ? T.am : T.card,
              border: `1px solid ${msg.from === "user" ? T.a + "40" : T.b}`,
              fontSize: 14, color: T.t, lineHeight: 1.6,
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {saving && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${T.a},#3B82F6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
            <div style={{ padding: "12px 16px", borderRadius: "16px 16px 16px 4px", background: T.card, border: `1px solid ${T.b}` }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.a, animation: `bounce 1s ${i * 0.15}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {currentQuestion?.quick && currentQ < QUESTIONS.length && (
        <div style={{ padding: "0 20px 12px", maxWidth: 680, width: "100%", margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {currentQuestion.quick.map(opt => (
              <button key={opt} onClick={() => handleAnswer(opt)}
                style={{ padding: "8px 14px", borderRadius: 20, background: T.pm, border: `1px solid ${T.p}40`, color: T.t, fontSize: 13, cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit" }}
                onMouseEnter={e => { e.target.style.background = T.pm; e.target.style.borderColor = T.p; }}
                onMouseLeave={e => { e.target.style.borderColor = T.p + "40"; }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      {currentQ < QUESTIONS.length && (
        <div style={{ padding: "12px 20px 24px", borderTop: `1px solid ${T.b}`, maxWidth: 680, width: "100%", margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && input.trim()) handleAnswer(input); }}
              placeholder="Type your answer or pick one above…"
              style={{ flex: 1, padding: "12px 16px", borderRadius: 10, background: T.d, border: `1px solid ${T.b}`, color: T.t, fontSize: 14, fontFamily: "inherit", outline: "none" }}
            />
            <button
              onClick={() => input.trim() && handleAnswer(input)}
              style={{ padding: "12px 18px", borderRadius: 10, background: T.a, color: "#000", fontWeight: 700, border: "none", cursor: "pointer", fontSize: 18 }}
            >
              ↑
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
