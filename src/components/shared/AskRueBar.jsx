// RKRT.in Shared Components - AskRueBar
// The quick action prompts bar for Rue AI

import T from '../../lib/theme';
import { CopyButton } from '../ui';

export function AskRueBar({ prompts, onAskRue, inlineResponse, inlineLoading }) {
  return (
    <>
      <div
        className="ask-rue-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${prompts.length},1fr)`,
          gap: 12,
          marginBottom: 20,
        }}
      >
        {prompts.map(([icon, label, q, c], i) => (
          <div
            key={i}
            onClick={() => onAskRue(q)}
            style={{
              background: (c || T.bl) + "10",
              border: `1px solid ${(c || T.bl)}20`,
              borderRadius: 10,
              padding: "18px 20px",
              cursor: inlineLoading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
              opacity: inlineLoading ? 0.5 : 1,
              transition: "all 0.15s",
            }}
            onMouseOver={(e) => {
              if (!inlineLoading) e.currentTarget.style.background = (c || T.bl) + "20";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = (c || T.bl) + "10";
            }}
          >
            <span style={{ fontSize: 24 }}>{icon}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.t }}>{label}</span>
          </div>
        ))}
      </div>

      {inlineLoading && (
        <div
          style={{
            marginBottom: 20,
            padding: "16px 20px",
            borderRadius: 10,
            background: T.card,
            border: `1px solid ${T.b}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: T.a,
                animation: "pulse 1s infinite",
              }}
            />
            <span style={{ fontSize: 14, color: T.s }}>RUE is thinking...</span>
          </div>
        </div>
      )}

      {inlineResponse && !inlineLoading && (
        <div
          style={{
            marginBottom: 20,
            padding: "20px 24px",
            borderRadius: 10,
            background: T.as,
            border: `1px solid ${T.a}20`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: T.a,
                fontWeight: 700,
                letterSpacing: 1.5,
              }}
            >
              🤖 RUE RESPONSE
            </span>
            <CopyButton text={inlineResponse} label="Copy" />
          </div>
          <pre
            style={{
              fontSize: 14,
              color: T.t,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              margin: 0,
              maxHeight: 400,
              overflow: "auto",
            }}
          >
            {inlineResponse}
          </pre>
        </div>
      )}
    </>
  );
}

export default AskRueBar;
