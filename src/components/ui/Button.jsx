// RKRT.in UI Components - Button
// Reusable button components

import T from '../../lib/theme';

/**
 * Primary button
 */
export function Button({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = "primary", // primary, secondary, danger, ghost
  size = "medium", // small, medium, large
  icon,
  fullWidth = false,
  style = {},
}) {
  const variants = {
    primary: {
      background: T.a,
      color: "#000",
      border: "none",
    },
    secondary: {
      background: T.d,
      color: T.s,
      border: `1px solid ${T.b}`,
    },
    danger: {
      background: T.r + "15",
      color: T.r,
      border: `1px solid ${T.r}20`,
    },
    ghost: {
      background: "transparent",
      color: T.s,
      border: `1px solid ${T.b}`,
    },
    accent: {
      background: T.am,
      color: T.a,
      border: `1px solid ${T.a}30`,
    },
  };

  const sizes = {
    small: { padding: "8px 14px", fontSize: 12 },
    medium: { padding: "12px 20px", fontSize: 14 },
    large: { padding: "14px 28px", fontSize: 16 },
  };

  const isDisabled = disabled || loading;
  const variantStyle = variants[variant] || variants.primary;
  const sizeStyle = sizes[size] || sizes.medium;

  return (
    <div
      onClick={isDisabled ? null : onClick}
      style={{
        ...variantStyle,
        ...sizeStyle,
        borderRadius: 8,
        fontWeight: 700,
        cursor: isDisabled ? (loading ? "wait" : "not-allowed") : "pointer",
        opacity: isDisabled && !loading ? 0.5 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: fullWidth ? "100%" : "auto",
        textAlign: "center",
        transition: "all 0.15s",
        fontFamily: "inherit",
        ...style,
      }}
    >
      {icon && <span>{icon}</span>}
      {loading ? "Loading…" : children}
    </div>
  );
}

/**
 * Icon button (square, icon only)
 */
export function IconButton({
  icon,
  onClick,
  color = T.s,
  size = 44,
  tooltip,
}) {
  return (
    <div
      onClick={onClick}
      title={tooltip}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        background: T.card,
        border: `1px solid ${T.b}`,
        color,
        fontSize: size * 0.45,
        transition: "all 0.15s",
      }}
      onMouseOver={(e) => (e.currentTarget.style.borderColor = T.bh)}
      onMouseOut={(e) => (e.currentTarget.style.borderColor = T.b)}
    >
      {icon}
    </div>
  );
}

/**
 * Tab button for switching views
 */
export function TabButton({ active, onClick, children }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 18px",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 700,
        cursor: "pointer",
        background: active ? T.a + "18" : T.d,
        color: active ? T.a : T.s,
        border: `1px solid ${active ? T.a + "40" : T.b}`,
        transition: "all 0.15s",
      }}
    >
      {children}
    </div>
  );
}

/**
 * Quick action card button
 */
export function ActionCard({ icon, label, onClick, color = T.bl, disabled = false }) {
  return (
    <div
      onClick={disabled ? null : onClick}
      style={{
        background: color + "10",
        border: `1px solid ${color}20`,
        borderRadius: 10,
        padding: "18px 20px",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s",
      }}
      onMouseOver={(e) => {
        if (!disabled) e.currentTarget.style.background = color + "20";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = color + "10";
      }}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: T.t }}>{label}</span>
    </div>
  );
}

export default Button;
