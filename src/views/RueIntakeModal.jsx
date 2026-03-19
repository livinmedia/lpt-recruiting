import T from '../lib/theme';

function RueIntakeModal({ ctx }) {
  const { showRueIntake, setShowRueIntake, rueConversation, rueLoading, rueIntakeInput, setRueIntakeInput, rueIntakeScrollRef, sendRueIntake } = ctx;
  if (!showRueIntake) return null;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ width: "100%", maxWidth: 520, maxHeight: "80vh", background: T.card, border: `1px solid ${T.b}`, borderRadius: 20, display: "flex", flexDirection: "column", boxShadow: "0 16px 60px rgba(0,0,0,0.7)", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.b}`, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontSize: 22, fontWeight: 800, color: T.t }}>Meet Rue</div><span onClick={() => { sessionStorage.setItem('rue_intake_skipped', '1'); setShowRueIntake(false); }} style={{ fontSize: 20, color: T.m, cursor: "pointer", padding: "4px 8px", borderRadius: 6, lineHeight: 1 }}>✕</span></div>
          <div style={{ fontSize: 13, color: T.s, marginTop: 2 }}>Your AI recruiting coach</div>
        </div>
        <div ref={el => { rueIntakeScrollRef.current = el; }} style={{ flex: 1, overflow: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {rueConversation.length === 0 && !rueLoading && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
              <div style={{ fontSize: 15, color: T.s, marginBottom: 20 }}>Rue wants to learn about your recruiting goals so she can coach you better.</div>
              <div onClick={() => sendRueIntake(null)} style={{ display: "inline-block", padding: "12px 28px", borderRadius: 10, background: T.a, color: "#000", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Start Conversation</div>
            </div>
          )}
          {rueConversation.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "85%", padding: "12px 16px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.role === "user" ? T.d : T.a + "15", border: `1px solid ${m.role === "user" ? T.b : T.a + "30"}`, color: T.t, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{m.content}</div>
            </div>
          ))}
          {rueLoading && <div style={{ display: "flex", justifyContent: "flex-start" }}><div style={{ padding: "12px 16px", borderRadius: "16px 16px 16px 4px", background: T.a + "15", border: `1px solid ${T.a}30`, color: T.s, fontSize: 14 }}>Rue is typing<span style={{ animation: "pulse 1.5s infinite" }}>...</span></div></div>}
        </div>
        {rueConversation.length > 0 && <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.b}`, display: "flex", gap: 8, flexShrink: 0 }}>
          <input value={rueIntakeInput} onChange={e => setRueIntakeInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && rueIntakeInput.trim() && !rueLoading) { const msg = rueIntakeInput.trim(); ctx.rueConversation.push({ role: "user", content: msg }); setRueIntakeInput(""); sendRueIntake(msg); setTimeout(() => { if (rueIntakeScrollRef.current) rueIntakeScrollRef.current.scrollTop = rueIntakeScrollRef.current.scrollHeight; }, 100); } }} placeholder="Type your reply..." style={{ flex: 1, padding: "12px 16px", borderRadius: 10, background: T.d, border: `1px solid ${T.b}`, color: T.t, fontSize: 14, outline: "none", fontFamily: "inherit" }} />
          <div onClick={() => { if (rueIntakeInput.trim() && !rueLoading) { const msg = rueIntakeInput.trim(); ctx.rueConversation.push({ role: "user", content: msg }); setRueIntakeInput(""); sendRueIntake(msg); setTimeout(() => { if (rueIntakeScrollRef.current) rueIntakeScrollRef.current.scrollTop = rueIntakeScrollRef.current.scrollHeight; }, 100); } }} style={{ padding: "12px 20px", borderRadius: 10, background: rueIntakeInput.trim() && !rueLoading ? T.a : "#333", color: rueIntakeInput.trim() && !rueLoading ? "#000" : T.m, fontSize: 14, fontWeight: 700, cursor: rueIntakeInput.trim() && !rueLoading ? "pointer" : "default", flexShrink: 0 }}>Send</div>
        </div>}
        <div style={{ padding: "8px 16px 12px", textAlign: "center", flexShrink: 0 }}>
          <span onClick={() => { sessionStorage.setItem('rue_intake_skipped', '1'); setShowRueIntake(false); }} style={{ fontSize: 12, color: T.m, cursor: "pointer", textDecoration: "underline" }}>Skip for now</span>
        </div>
      </div>
    </div>
  );
}

export default RueIntakeModal;
