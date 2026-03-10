// RKRT.in Theme System
// All colors and design tokens in one place

export const T = {
  // Backgrounds
  bg: "#04060A",
  side: "#070A10",
  card: "#0B0F17",
  hover: "#101520",
  d: "#161C28",

  // Borders
  b: "rgba(255,255,255,0.04)",
  bh: "rgba(255,255,255,0.08)",

  // Primary - Accent Green
  a: "#00E5A0",
  am: "rgba(0,229,160,0.14)",
  as: "rgba(0,229,160,0.06)",

  // Semantic Colors
  r: "#F43F5E",  // Red - danger, urgent
  y: "#F59E0B",  // Yellow - warning, medium
  bl: "#3B82F6", // Blue - info, links
  p: "#8B5CF6",  // Purple - special, elite
  c: "#06B6D4",  // Cyan - talking, conversation

  // Text
  t: "#E4E8F1",  // Primary text
  s: "#7B8BA3",  // Secondary text
  m: "#2A3345",  // Muted text
};

// Color utilities
export const withAlpha = (color, alpha) => {
  // For hex colors, append alpha as hex
  if (color.startsWith('#')) {
    const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return color + alphaHex;
  }
  return color;
};

// Urgency color mapping
export const urgencyColors = {
  HIGH: T.r,
  MEDIUM: T.y,
  LOW: T.a,
};

// Tier color mapping
export const tierColors = {
  Elite: T.p,
  Strong: T.a,
  Mid: T.bl,
  Building: T.y,
  New: T.s,
};

export default T;
