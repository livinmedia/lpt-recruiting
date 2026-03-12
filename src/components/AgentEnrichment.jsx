import { useState, useEffect, useRef } from "react";

const SUPABASE_FN = "https://usknntguurefeyzusbdh.supabase.co/functions/v1";

const T = {
  bg: "#0a0f1a",
  card: "#111827",
  cardHover: "#1a2540",
  b: "#1a2540",
  a: "#22d3ee",
  aGlow: "rgba(34,211,238,0.15)",
  t: "#e2e8f0",
  m: "#94a3b8",
  s: "#64748b",
  d: "#334155",
  green: "#10b981",
  yellow: "#f59e0b",
  red: "#ef4444",
  purple: "#a78bfa",
};

function formatName(raw) {
  if (!raw) return "";
  // Handle "LAST, FIRST" format
  if (raw.includes(",")) {
    const [last, first] = raw.split(",").map(s => s.trim());
    return [first, last]
      .filter(Boolean)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
      .join(" ");
  }
  return raw
    .split(" ")
    .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(" ");
}

function QualityBadge({ score }) {
  const color = score >= 60 ? T.green : score >= 30 ? T.yellow : T.red;
  const label = score >= 60 ? "High Quality" : score >= 30 ? "Moderate" : "Low Quality";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px", borderRadius: 20, border: `1px solid ${color}40`,
      background: `${color}15`, fontSize: 12, fontWeight: 700, color,
      fontFamily: "'JetBrains Mono', monospace"
    }}>
      <span style={{ fontSize: 10 }}>●</span> {score}/100 · {label}
    </span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ marginLeft: 8, padding: "2px 8px", fontSize: 11, borderRadius: 6, border: `1px solid ${T.b}`, background: "transparent", color: T.m, cursor: "pointer" }}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

const LOADING_MESSAGES = [
  "Searching public records...",
  "Checking Zillow & Realtor.com...",
  "Scanning brokerage websites...",
  "Analyzing contact data...",
  "Verifying information...",
];

function LoadingSpinner() {
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MESSAGES.length), 1500);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "60px 40px" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          border: `3px solid ${T.b}`, borderTopColor: T.a,
          margin: "0 auto", animation: "spin 0.8s linear infinite"
        }} />
      </div>
      <div style={{ fontSize: 16, color: T.t, fontWeight: 600, marginBottom: 8 }}>
        Running AI Enrichment
      </div>
      <div style={{ fontSize: 14, color: T.m, fontFamily: "'JetBrains Mono', monospace", minHeight: 22, transition: "opacity 0.3s" }}>
        {LOADING_MESSAGES[msgIdx]}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ProgressBar({ used, limit }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const color = pct < 50 ? T.green : pct < 80 ? T.yellow : T.red;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 6, borderRadius: 3, background: T.d, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

export default function AgentEnrichment({ supabase, agent, userId, profile, onClose, onLeadAdded }) {
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState(null);
  const [error, setError] = useState("");
  const [addingLead, setAddingLead] = useState(false);
  const [leadNotes, setLeadNotes] = useState("");
  const [leadAdded, setLeadAdded] = useState(null);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [emailVerified, setEmailVerified] = useState(null); // null | "pending" | "delivered" | "bounced"
  const [selectedEmail, setSelectedEmail] = useState("");
  const [usage, setUsage] = useState(null);

  const pollRef = useRef(null);

  useEffect(() => {
    fetchUsage();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function fetchUsage() {
    try {
      const { data } = await supabase
        .from("v_enrichment_usage")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) setUsage({ used: data.used_this_month ?? 0, limit: data.monthly_limit ?? 0, remaining: data.remaining ?? 0, plan: data.plan ?? "" });
    } catch {}
  }

  async function handleEnrich() {
    setEnriching(true);
    setError("");
    try {
      const res = await fetch(`${SUPABASE_FN}/enrich-agent-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agent.id, user_id: userId }),
      });
      if (res.status === 429) {
        setError("You've reached your enrichment limit. Upgrade your plan for more.");
        setEnriching(false);
        return;
      }
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Enrichment failed."); setEnriching(false); return; }
      const d = json.data || {};
      setEnrichResult({ ...d, quality: json.quality, sources: json.sources, status: json.status, pattern_guess: d.email_confidence === "pattern_guess" });
      setSelectedEmail(d.email || "");
      fetchUsage();
    } catch (err) {
      setError("Network error — please try again.");
    }
    setEnriching(false);
  }

  async function handleAddToPipeline() {
    setAddingLead(true);
    try {
      const res = await fetch(`${SUPABASE_FN}/enrich-agent-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agent.id, user_id: userId, add_to_leads: true, lead_notes: leadNotes }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Failed to add to pipeline."); setAddingLead(false); return; }
      const lead = json.lead || json;
      setLeadAdded(lead);
      if (onLeadAdded) onLeadAdded(lead);
    } catch (err) {
      setError("Network error — please try again.");
    }
    setAddingLead(false);
  }

  async function handleVerifyEmail() {
    if (!selectedEmail) return;
    setVerifyingEmail(true);
    setEmailVerified("pending");
    try {
      await fetch(`${SUPABASE_FN}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email_verify",
          to: selectedEmail,
          subject: "Verifying contact — RKRT.in",
          body: "<p>This is an automated verification.</p>",
          user_id: userId,
        }),
      });

      let elapsed = 0;
      pollRef.current = setInterval(async () => {
        elapsed += 3;
        try {
          const { data } = await supabase
            .from("email_tracking")
            .select("status")
            .eq("to_email", selectedEmail)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data?.status === "delivered") {
            setEmailVerified("delivered");
            clearInterval(pollRef.current);
            setVerifyingEmail(false);
          } else if (data?.status === "bounced") {
            setEmailVerified("bounced");
            clearInterval(pollRef.current);
            setVerifyingEmail(false);
            // Auto-select next candidate
            const candidates = enrichResult?.email_candidates || [];
            const idx = candidates.indexOf(selectedEmail);
            if (idx >= 0 && idx < candidates.length - 1) setSelectedEmail(candidates[idx + 1]);
          }
        } catch {}
        if (elapsed >= 30) {
          clearInterval(pollRef.current);
          setVerifyingEmail(false);
          if (emailVerified === "pending") setEmailVerified("pending"); // stays pending
        }
      }, 3000);
    } catch {
      setVerifyingEmail(false);
      setEmailVerified(null);
    }
  }

  const agentName = formatName(agent.full_name);
  const enrichedDaysAgo = agent.enriched_at
    ? Math.floor((Date.now() - new Date(agent.enriched_at)) / 86400000)
    : null;

  const verifyBadge = () => {
    if (emailVerified === "delivered") return <span style={{ marginLeft: 8, fontSize: 12, color: T.green, fontWeight: 700 }}>✅ Verified!</span>;
    if (emailVerified === "bounced") return <span style={{ marginLeft: 8, fontSize: 12, color: T.red, fontWeight: 700 }}>❌ Bounced</span>;
    if (emailVerified === "pending") return <span style={{ marginLeft: 8, fontSize: 12, color: T.yellow, fontWeight: 700 }}>⏳ Pending</span>;
    return null;
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{
        width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto",
        background: T.card, borderRadius: 16, border: `1px solid ${T.b}`,
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        position: "relative", color: T.t,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16, zIndex: 10,
            width: 32, height: 32, borderRadius: "50%",
            border: `1px solid ${T.b}`, background: T.bg,
            color: T.m, fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >×</button>

        {/* ── LOADING STATE ── */}
        {enriching && <LoadingSpinner />}

        {/* ── PRE-ENRICH ── */}
        {!enriching && !enrichResult && (
          <div style={{ padding: 32 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.a, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                Agent Enrichment
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.t, marginBottom: 4 }}>{agentName}</div>
              {enrichedDaysAgo !== null && (
                <div style={{ fontSize: 12, color: T.s, marginBottom: 12 }}>Last enriched: {enrichedDaysAgo} day{enrichedDaysAgo !== 1 ? "s" : ""} ago</div>
              )}
            </div>

            {/* Agent details */}
            <div style={{ background: T.bg, borderRadius: 12, padding: 16, marginBottom: 24, border: `1px solid ${T.b}` }}>
              {[
                ["License", agent.license_type && agent.license_number ? `${agent.license_type} #${agent.license_number}` : agent.license_type || agent.license_number || "—"],
                ["Brokerage", agent.brokerage_name || "—"],
                ["Location", [agent.city, agent.state].filter(Boolean).join(", ") || "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: T.s }}>{label}</span>
                  <span style={{ color: T.t, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Credits bar */}
            {usage && (
              <div style={{ background: T.bg, borderRadius: 12, padding: 16, marginBottom: 28, border: `1px solid ${T.b}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: T.m }}>🔍 Enrichments this month</span>
                  <span style={{ color: T.t, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                    {usage.used} / {usage.limit}
                  </span>
                </div>
                <ProgressBar used={usage.used} limit={usage.limit} />
                <div style={{ fontSize: 11, color: T.s, marginTop: 6 }}>
                  {usage.remaining > 0 ? `${usage.remaining} remaining` : "Limit reached"}{usage.plan ? ` · ${usage.plan} plan` : ""}
                </div>
              </div>
            )}

            {error && (
              <div style={{ background: `${T.red}15`, border: `1px solid ${T.red}40`, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: T.red }}>
                {error}
              </div>
            )}

            {usage?.remaining <= 0 ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ color: T.m, marginBottom: 12, fontSize: 14 }}>You've used all your enrichment credits.</div>
                <a href="/settings/billing" style={{ color: T.a, fontSize: 14, fontWeight: 600 }}>Upgrade your plan for more enrichments →</a>
              </div>
            ) : (
              <button
                onClick={handleEnrich}
                disabled={enriching || (usage && usage.remaining <= 0)}
                style={{
                  width: "100%", padding: "14px 0", fontSize: 15, fontWeight: 700,
                  borderRadius: 10, border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg, #06b6d4, #22d3ee)",
                  color: "#0a0f1a", letterSpacing: "0.02em",
                  opacity: enriching ? 0.6 : 1, transition: "opacity 0.2s",
                }}
              >
                🔍 Enrich Agent
              </button>
            )}
          </div>
        )}

        {/* ── RESULTS ── */}
        {!enriching && enrichResult && (
          <div>
            {/* Header */}
            <div style={{ padding: "24px 28px 16px", borderBottom: `1px solid ${T.b}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.a, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                Enrichment Results
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: T.t }}>{agentName}</span>
                {enrichResult.quality != null && <QualityBadge score={enrichResult.quality} />}
              </div>
              {enrichResult.sources?.length > 0 && (
                <div style={{ fontSize: 12, color: T.s }}>
                  Found via: {enrichResult.sources.join(" + ")}
                </div>
              )}
            </div>

            {/* Two-column grid */}
            <div style={{ padding: "20px 28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

              {/* LEFT — Contact Info */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.m, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                  Contact Info
                </div>

                {/* Email */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: T.s, marginBottom: 4 }}>📧 Email</div>
                  {enrichResult.email ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                        <span style={{ color: T.a, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", wordBreak: "break-all" }}>
                          {selectedEmail || enrichResult.email}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10,
                          background: enrichResult.pattern_guess ? `${T.yellow}20` : `${T.green}20`,
                          color: enrichResult.pattern_guess ? T.yellow : T.green,
                          border: `1px solid ${enrichResult.pattern_guess ? T.yellow : T.green}40`
                        }}>
                          {enrichResult.pattern_guess ? "Pattern Guess" : "AI Verified"}
                        </span>
                      </div>

                      {/* Candidates dropdown */}
                      {enrichResult.pattern_guess && enrichResult.email_candidates?.length > 1 && (
                        <div style={{ marginTop: 8, background: T.bg, borderRadius: 8, border: `1px solid ${T.b}`, overflow: "hidden" }}>
                          {enrichResult.email_candidates.map(email => (
                            <div
                              key={email}
                              onClick={() => { setSelectedEmail(email); setEmailVerified(null); }}
                              style={{
                                padding: "7px 12px", fontSize: 12, cursor: "pointer",
                                fontFamily: "'JetBrains Mono', monospace",
                                color: selectedEmail === email ? T.a : T.m,
                                background: selectedEmail === email ? T.aGlow : "transparent",
                                borderBottom: `1px solid ${T.b}30`,
                                display: "flex", alignItems: "center", gap: 6,
                              }}
                            >
                              <span style={{ fontSize: 10 }}>{selectedEmail === email ? "●" : "○"}</span>
                              {email}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Verify button */}
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center" }}>
                        <button
                          onClick={handleVerifyEmail}
                          disabled={verifyingEmail}
                          style={{
                            padding: "4px 12px", fontSize: 12, borderRadius: 6,
                            border: `1px solid ${T.a}50`, background: T.aGlow,
                            color: T.a, cursor: "pointer", fontWeight: 600,
                            opacity: verifyingEmail ? 0.6 : 1,
                          }}
                        >
                          {verifyingEmail ? "Sending..." : "✉️ Verify"}
                        </button>
                        {verifyBadge()}
                      </div>
                    </>
                  ) : (
                    <span style={{ color: T.s, fontSize: 13 }}>Not found</span>
                  )}
                </div>

                {/* Phone */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: T.s, marginBottom: 4 }}>📱 Phone</div>
                  {enrichResult.phone ? (
                    <span style={{ color: T.t, fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>
                      {enrichResult.phone}
                      <CopyButton text={enrichResult.phone} />
                    </span>
                  ) : (
                    <span style={{ color: T.s, fontSize: 13 }}>Not found</span>
                  )}
                </div>

                {/* LinkedIn */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: T.s, marginBottom: 4 }}>🔗 LinkedIn</div>
                  {enrichResult.linkedin ? (
                    <a href={enrichResult.linkedin} target="_blank" rel="noreferrer"
                      style={{ color: T.a, fontSize: 13, textDecoration: "none", wordBreak: "break-all" }}>
                      {enrichResult.linkedin.replace("https://", "")}
                    </a>
                  ) : (
                    <span style={{ color: T.s, fontSize: 13 }}>Not found</span>
                  )}
                </div>

                {/* Website */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: T.s, marginBottom: 4 }}>🌐 Website</div>
                  {enrichResult.website ? (
                    <a href={enrichResult.website} target="_blank" rel="noreferrer"
                      style={{ color: T.a, fontSize: 13, textDecoration: "none", wordBreak: "break-all" }}>
                      {enrichResult.website.replace("https://", "")}
                    </a>
                  ) : (
                    <span style={{ color: T.s, fontSize: 13 }}>Not found</span>
                  )}
                </div>

                {/* Zillow */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: T.s, marginBottom: 4 }}>🏠 Zillow</div>
                  {enrichResult.zillow_url ? (
                    <a href={enrichResult.zillow_url} target="_blank" rel="noreferrer"
                      style={{ color: T.a, fontSize: 13, textDecoration: "none", wordBreak: "break-all" }}>
                      View profile
                    </a>
                  ) : (
                    <span style={{ color: T.s, fontSize: 13 }}>Not found</span>
                  )}
                </div>

                {/* Facebook */}
                {enrichResult.facebook && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, color: T.s, marginBottom: 4 }}>📘 Facebook</div>
                    <a href={enrichResult.facebook} target="_blank" rel="noreferrer"
                      style={{ color: T.a, fontSize: 13, textDecoration: "none", wordBreak: "break-all" }}>
                      {enrichResult.facebook.replace("https://", "")}
                    </a>
                  </div>
                )}

                {/* Instagram */}
                {enrichResult.instagram && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, color: T.s, marginBottom: 4 }}>📸 Instagram</div>
                    <a
                      href={enrichResult.instagram.startsWith("@") ? `https://instagram.com/${enrichResult.instagram.slice(1)}` : enrichResult.instagram}
                      target="_blank" rel="noreferrer"
                      style={{ color: T.a, fontSize: 13, textDecoration: "none", wordBreak: "break-all" }}>
                      {enrichResult.instagram}
                    </a>
                  </div>
                )}

                {/* YouTube */}
                {enrichResult.youtube && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, color: T.s, marginBottom: 4 }}>🎬 YouTube</div>
                    <a href={enrichResult.youtube} target="_blank" rel="noreferrer"
                      style={{ color: T.a, fontSize: 13, textDecoration: "none", wordBreak: "break-all" }}>
                      {enrichResult.youtube.replace("https://", "")}
                    </a>
                  </div>
                )}

                {/* TikTok */}
                {enrichResult.tiktok && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, color: T.s, marginBottom: 4 }}>🎵 TikTok</div>
                    <a
                      href={enrichResult.tiktok.startsWith("@") ? `https://tiktok.com/${enrichResult.tiktok}` : enrichResult.tiktok}
                      target="_blank" rel="noreferrer"
                      style={{ color: T.a, fontSize: 13, textDecoration: "none", wordBreak: "break-all" }}>
                      {enrichResult.tiktok}
                    </a>
                  </div>
                )}

                {/* Realtor.com */}
                {enrichResult.realtor_url && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, color: T.s, marginBottom: 4 }}>🏡 Realtor.com</div>
                    <a href={enrichResult.realtor_url} target="_blank" rel="noreferrer"
                      style={{ color: T.a, fontSize: 13, textDecoration: "none", wordBreak: "break-all" }}>
                      View profile
                    </a>
                  </div>
                )}

                {/* Recent Sales */}
                {enrichResult.recent_sales != null && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, color: T.s, marginBottom: 4 }}>📊 Recent Sales</div>
                    <span style={{ color: T.t, fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>
                      {enrichResult.recent_sales}
                    </span>
                  </div>
                )}
              </div>

              {/* RIGHT — Bio */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.m, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                  AI Bio
                </div>
                <div style={{
                  background: T.bg, borderRadius: 10, padding: 14,
                  border: `1px solid ${T.b}`, fontSize: 13, color: T.m,
                  lineHeight: 1.7, minHeight: 120,
                }}>
                  {enrichResult.bio || <span style={{ color: T.s, fontStyle: "italic" }}>No bio available</span>}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div style={{ padding: "0 28px 20px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.m, marginBottom: 8 }}>📝 Add notes for your pipeline</div>
              <textarea
                value={leadNotes}
                onChange={e => setLeadNotes(e.target.value)}
                rows={3}
                placeholder="Why are you interested in this agent? Any context for follow-up..."
                style={{
                  width: "100%", padding: "10px 14px", fontSize: 13,
                  borderRadius: 8, background: T.bg, color: T.t,
                  border: `1px solid ${T.b}`, outline: "none", resize: "vertical",
                  fontFamily: "system-ui, sans-serif", lineHeight: 1.6,
                  boxSizing: "border-box",
                }}
                onFocus={e => { e.target.style.borderColor = T.a; }}
                onBlur={e => { e.target.style.borderColor = T.b; }}
              />
            </div>

            {error && (
              <div style={{ margin: "0 28px 16px", background: `${T.red}15`, border: `1px solid ${T.red}40`, borderRadius: 8, padding: 12, fontSize: 13, color: T.red }}>
                {error}
              </div>
            )}

            {/* Action bar */}
            <div style={{
              padding: "16px 28px", borderTop: `1px solid ${T.b}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <button
                onClick={onClose}
                style={{
                  padding: "10px 20px", fontSize: 14, borderRadius: 8,
                  border: `1px solid ${T.b}`, background: "transparent",
                  color: T.m, cursor: "pointer",
                }}
              >
                Close
              </button>

              {leadAdded ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: T.green, fontSize: 14, fontWeight: 700 }}>✅ Added to pipeline!</span>
                  <span style={{ color: T.s, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>ID: {leadAdded.id || leadAdded.lead_id}</span>
                </div>
              ) : (
                <button
                  onClick={handleAddToPipeline}
                  disabled={addingLead}
                  style={{
                    padding: "10px 22px", fontSize: 14, fontWeight: 700, borderRadius: 8,
                    border: "none", cursor: addingLead ? "not-allowed" : "pointer",
                    background: "linear-gradient(135deg, #06b6d4, #22d3ee)",
                    color: "#0a0f1a", opacity: addingLead ? 0.6 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  {addingLead ? "Adding..." : "➕ Add to Pipeline"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
