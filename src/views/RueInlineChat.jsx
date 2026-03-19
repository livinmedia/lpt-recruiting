import T from '../lib/theme';

function RueInlineChat({ ctx, renderRueResponse }) {
  const { inlineLoading, inlineResponse, inlineChatHistory, setInlineResponse, setInlineChatHistory, setRueConvId, rueChatInput, setRueChatInput, rueCopySaved, rueMessagesRef, copyRueResponse, sendRueChatReply } = ctx;
  if (!inlineLoading && !inlineResponse && inlineChatHistory.length === 0) return null;
  return (
    <div style={{ marginBottom: 20, borderRadius: 12, background: T.card, border: `1px solid ${T.a}30`, overflow: "hidden", maxHeight: 400, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.b}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: inlineLoading ? T.a : "#22c55e", animation: inlineLoading ? "pulse 1s infinite" : "none", flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: T.a, fontWeight: 700, letterSpacing: 1.5, flex: 1 }}>🤖 RUE AI ASSISTANT</span>
        <div onClick={copyRueResponse} style={{ padding: "4px 10px", borderRadius: 6, background: T.d, border: `1px solid ${T.b}`, color: rueCopySaved ? T.a : T.s, fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0, transition: "color 0.2s" }}>{rueCopySaved ? "✓ Copied" : "💾 Save"}</div>
        <div onClick={() => { setInlineResponse(null); setInlineChatHistory([]); setRueConvId(null); }} style={{ width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.s, fontSize: 14, background: T.d, border: `1px solid ${T.b}`, flexShrink: 0 }}>✕</div>
      </div>
      <div ref={rueMessagesRef} style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "14px 18px" }}>
        {inlineChatHistory.filter(m => m.role !== "system").map((msg, i) => (
          <div key={i} style={{ marginBottom: 12, display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ fontSize: 9, color: T.m, marginBottom: 3, fontWeight: 700, letterSpacing: 1 }}>{msg.role === "user" ? "YOU" : "RUE"}</div>
            <div style={{ maxWidth: "92%", padding: "10px 14px", borderRadius: msg.role === "user" ? "10px 10px 2px 10px" : "2px 10px 10px 10px", background: msg.role === "user" ? T.a + "15" : T.d, border: `1px solid ${msg.role === "user" ? T.a + "25" : T.b}`, fontSize: 13, color: T.t, lineHeight: 1.7, fontFamily: "inherit" }}>
              {msg.role === "assistant" ? renderRueResponse(msg.content) : msg.content}
            </div>
          </div>
        ))}
        {inlineLoading && (<div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0" }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: T.a, animation: "pulse 0.8s infinite" }} /><div style={{ width: 6, height: 6, borderRadius: "50%", background: T.a, animation: "pulse 0.8s 0.2s infinite" }} /><div style={{ width: 6, height: 6, borderRadius: "50%", background: T.a, animation: "pulse 0.8s 0.4s infinite" }} /><span style={{ fontSize: 12, color: T.m, marginLeft: 4 }}>Rue is thinking...</span></div>)}
      </div>
      {inlineResponse && !inlineLoading && (
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.b}`, display: "flex", gap: 8, flexShrink: 0 }}>
          <input value={rueChatInput} onChange={e => setRueChatInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendRueChatReply(rueChatInput); setRueChatInput(""); } }} placeholder="Ask Rue a follow-up..." style={{ flex: 1, background: T.d, border: `1px solid ${T.b}`, borderRadius: 7, padding: "8px 12px", fontSize: 13, color: T.t, outline: "none" }} />
          <div onClick={() => { if (rueChatInput.trim()) { sendRueChatReply(rueChatInput); setRueChatInput(""); } }} style={{ padding: "8px 16px", borderRadius: 7, background: T.a, color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", whiteSpace: "nowrap", flexShrink: 0 }}>Send →</div>
        </div>
      )}
    </div>
  );
}

export default RueInlineChat;
