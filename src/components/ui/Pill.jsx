// RKRT.in UI Components - Pills
// Pill, UPill (Urgency), TPill (Tier)

import T, { urgencyColors, tierColors } from '../../lib/theme';

/**
 * Generic pill/badge component
 */
export function Pill({ text, color }) {
  return (
    <span
      style={{
        fontSize: 14,
        fontWeight: 700,
        padding: "4px 10px",
        borderRadius: 4,
        background: color + "18",
        color,
        letterSpacing: 0.4,
      }}
    >
      {text}
    </span>
  );
}

/**
 * Urgency pill (HIGH, MEDIUM, LOW)
 */
export function UPill({ u }) {
  const color = urgencyColors[u] || T.s;
  return <Pill text={u || "—"} color={color} />;
}

/**
 * Tier pill (Elite, Strong, Mid, Building, New)
 */
export function TPill({ t }) {
  const color = tierColors[t] || T.s;
  return (
    <span
      style={{
        fontSize: 15,
        fontWeight: 600,
        color,
      }}
    >
      {t || "—"}
    </span>
  );
}

/**
 * Status dot indicator
 */
export function Dot({ c }) {
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: c,
        boxShadow: `0 0 5px ${c}`,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

export default Pill;
