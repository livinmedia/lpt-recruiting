// RKRT.in Utility Functions
// Shared helper functions

/**
 * Format a date as relative time (e.g., "5m", "2h", "3d")
 */
export function ago(d) {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

/**
 * Format a date as "Mon DD" or "Mon DD, YYYY" if different year
 */
export function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  const now = new Date();
  const diff = Math.floor((now - dt) / (1000 * 86400));
  if (diff < 1) return "Today";
  if (diff < 7) return diff + "d ago";
  if (diff < 30) return Math.floor(diff / 7) + "w ago";
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: dt.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Format a number as currency
 */
export function formatCurrency(n, decimals = 0) {
  if (n === null || n === undefined) return "—";
  return "$" + n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a large number with K/M suffix
 */
export function formatCompact(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

/**
 * Truncate a string with ellipsis
 */
export function truncate(str, maxLength = 30) {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + "…";
}

/**
 * Clean name - remove LLC, PA, etc.
 */
export function cleanName(n) {
  return (n || "")
    .replace(/\b(LLC|PA|PL|PLLC|INC|CORP|LTD|JR|SR|II|III|IV)\b\.?/gi, "")
    .trim();
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get brokerage slug for URL
 */
export function getBrokerageSlug(b) {
  const name = (b || "").toUpperCase();
  if (name.includes("LPT")) return "LPT";
  if (name.includes("EXP")) return "eXp";
  if (name.includes("KELLER")) return "KW";
  if (name.includes("REMAX") || name.includes("RE/MAX")) return "REMAX";
  if (name.includes("COMPASS")) return "Compass";
  if (name.includes("COLDWELL")) return "CB";
  return "";
}

/**
 * Check if user has pro features
 */
export function isPro(profile) {
  if (!profile) return false;
  return (
    profile.plan === "pro" ||
    profile.plan === "recruiter" ||
    profile.plan === "team_leader" ||
    profile.plan === "regional_operator" ||
    profile.plan === "enterprise" ||
    profile.role === "owner"
  );
}

/**
 * Get plan limits for a user
 */
export function getPlanLimits(profile) {
  const isProUser = isPro(profile);
  return {
    isPro: isProUser,
    canGenerateContent: isProUser,
    canAccessAgents: isProUser,
    canEnrichContacts: isProUser,
    canAccessCalculator: isProUser,
    canAccessRevenueShare: isProUser,
    leadLimit: isProUser ? Infinity : 10,
    landingPageCount: isProUser ? 5 : 1,
    hasUTMTracking: isProUser,
  };
}

/**
 * Debounce function
 */
export function debounce(fn, ms = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard?.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const t = document.createElement("textarea");
    t.value = text;
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.focus();
    t.select();
    document.execCommand("copy");
    document.body.removeChild(t);
    return true;
  }
}

/**
 * Group tasks by due date
 */
export function groupTasksByDue(tasks) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const overdue = [];
  const today = [];
  const upcoming = [];
  const completed = [];

  tasks.forEach((t) => {
    if (t.completed_at) {
      completed.push(t);
      return;
    }
    const d = new Date(t.due_date);
    if (d < now) overdue.push(t);
    else if (d <= todayEnd) today.push(t);
    else upcoming.push(t);
  });

  return { overdue, today, upcoming, completed };
}

/**
 * Get interest score label and color
 */
export function getInterestLevel(score) {
  if (score <= 20) return { label: "Cold", color: "#2A3345" };
  if (score <= 40) return { label: "Warming", color: "#3B82F6" };
  if (score <= 60) return { label: "Interested", color: "#F59E0B" };
  if (score <= 80) return { label: "Hot", color: "#f97316" };
  return { label: "On Fire 🔥", color: "#F43F5E" };
}
