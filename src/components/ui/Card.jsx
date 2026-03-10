// RKRT.in UI Components - Card
// Reusable card container component

import T from '../../lib/theme';

export function Card({ 
  children, 
  padding = "24px 26px", 
  style = {},
  onClick,
  hoverable = false,
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.card,
        border: `1px solid ${T.b}`,
        borderRadius: 12,
        padding,
        cursor: onClick ? "pointer" : "default",
        transition: hoverable ? "border-color 0.15s" : undefined,
        ...style,
      }}
      onMouseOver={hoverable ? (e) => (e.currentTarget.style.borderColor = T.bh) : undefined}
      onMouseOut={hoverable ? (e) => (e.currentTarget.style.borderColor = T.b) : undefined}
    >
      {children}
    </div>
  );
}

/**
 * KPI Card with icon, value, and label
 */
export function KPICard({ icon, label, value, subtitle, color }) {
  return (
    <Card style={{ display: "flex", alignItems: "center", gap: 16, padding: "22px 24px" }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 10,
          background: color + "10",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: 13,
            color: T.s,
            letterSpacing: 2,
            fontWeight: 700,
          }}
        >
          {label.toUpperCase()}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: T.t }}>
            {value}
          </span>
          {subtitle && (
            <span style={{ fontSize: 14, color, fontWeight: 600 }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * Stat Card - smaller, simpler card for stats
 */
export function StatCard({ label, value, color }) {
  return (
    <Card style={{ textAlign: "center", padding: "16px 20px" }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 13, color: T.s, marginTop: 4 }}>{label}</div>
    </Card>
  );
}

export default Card;
