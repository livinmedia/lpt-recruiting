import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from "recharts";

// ─── Color Palette ──────────────────────────────────────────────
const C = {
  bg: "#0a0e17",
  card: "#111827",
  cardHover: "#1a2236",
  border: "#1e293b",
  accent: "#22d3ee",    // cyan
  accentDim: "rgba(34,211,238,0.15)",
  hot: "#f43f5e",       // rose
  warm: "#f59e0b",      // amber
  green: "#10b981",     // emerald
  purple: "#a78bfa",    // violet
  text: "#e2e8f0",
  textDim: "#64748b",
  textMuted: "#475569",
};

const PIE_COLORS = [C.accent, C.hot, C.warm, C.green, C.purple, "#818cf8", "#fb923c", "#38bdf8"];

// ─── Helpers ────────────────────────────────────────────────────
const fmt = (n) => {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
};

const pct = (n) => (n === null || n === undefined ? "—" : n + "%");

const daysSinceLabel = (d) => {
  if (d === null || d === undefined) return "Never";
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
};

const KPI = ({ label, value, sub, color = C.accent, icon }) => (
  <div style={{
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: "20px 24px",
    minWidth: 0,
    position: "relative",
    overflow: "hidden",
  }}>
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: 3,
      background: `linear-gradient(90deg, ${color}, transparent)`,
    }} />
    <div style={{ fontSize: 13, color: C.textDim, marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
      {icon && <span style={{ marginRight: 6 }}>{icon}</span>}{label}
    </div>
    <div style={{ fontSize: 32, fontWeight: 700, color: C.text, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>{sub}</div>}
  </div>
);

const SectionTitle = ({ children, count }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16, marginTop: 32 }}>
    <h2 style={{ fontSize: 18, fontWeight: 600, color: C.text, margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
      {children}
    </h2>
    {count !== undefined && (
      <span style={{ fontSize: 12, color: C.textDim, background: C.accentDim, padding: "2px 8px", borderRadius: 6 }}>
        {count}
      </span>
    )}
  </div>
);

const ChartCard = ({ title, children, span = 1 }) => (
  <div style={{
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
    padding: 20, gridColumn: `span ${span}`,
  }}>
    <div style={{ fontSize: 13, color: C.textDim, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {title}
    </div>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1a2236", border: `1px solid ${C.border}`, borderRadius: 8,
      padding: "10px 14px", fontSize: 12, color: C.text,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: C.accent }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block" }} />
          <span style={{ color: C.textDim }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// Heat badge
const HeatBadge = ({ level }) => {
  const colors = { on_fire: C.hot, hot: "#fb923c", interested: C.warm, warming: C.green, cold: C.textMuted };
  const labels = { on_fire: "🔥 ON FIRE", hot: "🟠 HOT", interested: "⚡ INTERESTED", warming: "🌱 WARMING", cold: "❄️ COLD" };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
      background: (colors[level] || C.textMuted) + "22",
      color: colors[level] || C.textMuted,
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      {labels[level] || level}
    </span>
  );
};

// ─── Tab Button ─────────────────────────────────────────────────
const Tab = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{
    padding: "8px 18px", fontSize: 13, fontWeight: active ? 600 : 400, borderRadius: 8,
    background: active ? C.accentDim : "transparent",
    color: active ? C.accent : C.textDim,
    border: active ? `1px solid ${C.accent}33` : "1px solid transparent",
    cursor: "pointer", transition: "all 0.2s",
    fontFamily: "'JetBrains Mono', monospace",
  }}>
    {children}
  </button>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AnalyticsDashboard({ supabase, isAdmin = false }) {
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [trends, setTrends] = useState([]);
  const [sources, setSources] = useState([]);
  const [features, setFeatures] = useState([]);
  const [emailPerf, setEmailPerf] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ovRes, usrRes, trendRes, srcRes, featRes, emailRes, myRes] = await Promise.all([
        supabase.from("v_admin_analytics_overview").select("*").single(),
        supabase.from("v_admin_user_engagement").select("*"),
        supabase.from("v_analytics_daily_trends").select("*"),
        supabase.from("v_lead_source_breakdown").select("*"),
        supabase.from("v_feature_adoption").select("*"),
        supabase.from("v_email_performance").select("*"),
        supabase.from("v_my_analytics").select("*").maybeSingle(),
      ]);
      if (ovRes.data) setOverview(ovRes.data);
      if (usrRes.data) setUsers(usrRes.data);
      if (trendRes.data) setTrends(trendRes.data);
      if (srcRes.data) setSources(srcRes.data);
      if (featRes.data) setFeatures(featRes.data);
      if (emailRes.data) setEmailPerf(emailRes.data);
      if (myRes.data) setMyStats(myRes.data);
    } catch (err) {
      console.error("Analytics load error:", err);
    }
    setLoading(false);
  };

  // Transform trends into chart-friendly format
  const dailyChartData = useMemo(() => {
    const byDate = {};
    trends.forEach((t) => {
      if (t.dimension === "platform" || t.dimension === "user") {
        const d = t.rollup_date;
        if (!byDate[d]) byDate[d] = { date: d };
        // Aggregate platform-level metrics
        if (t.dimension === "platform") {
          byDate[d][t.metric_type] = (byDate[d][t.metric_type] || 0) + Number(t.total_value);
        }
      }
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [trends]);

  // Feature adoption for bar chart
  const featureChartData = useMemo(() => {
    return features
      .filter((f) => !["page_view", "page_exit"].includes(f.feature))
      .slice(0, 10)
      .map((f) => ({ name: f.feature.replace(/_/g, " "), users: f.unique_users, uses: f.total_uses, pct: Number(f.adoption_pct) }));
  }, [features]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: C.textDim }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 8, animation: "pulse 1.5s infinite" }}>📊</div>
          <div style={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}>Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, color: C.text, padding: 24, minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, fontFamily: "'JetBrains Mono', monospace", color: C.accent }}>
            📊 Analytics Command Center
          </h1>
          <p style={{ fontSize: 13, color: C.textDim, margin: "4px 0 0" }}>
            Real-time platform intelligence • No GA needed
          </p>
        </div>
        <button onClick={loadData} style={{
          padding: "8px 16px", fontSize: 12, background: C.accentDim, color: C.accent,
          border: `1px solid ${C.accent}33`, borderRadius: 8, cursor: "pointer",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          ↻ Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, flexWrap: "wrap" }}>
        <Tab active={tab === "overview"} onClick={() => setTab("overview")}>Overview</Tab>
        <Tab active={tab === "users"} onClick={() => setTab("users")}>Users</Tab>
        <Tab active={tab === "leads"} onClick={() => setTab("leads")}>Leads & Sources</Tab>
        <Tab active={tab === "content"} onClick={() => setTab("content")}>Content & Email</Tab>
        <Tab active={tab === "features"} onClick={() => setTab("features")}>Feature Adoption</Tab>
      </div>

      {/* ─── OVERVIEW TAB ──────────────────────────────────── */}
      {tab === "overview" && overview && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <KPI label="Total Users" value={fmt(overview.total_users)} sub={`${overview.wau} WAU • ${overview.dau} DAU`} icon="👥" />
            <KPI label="Total Leads" value={fmt(overview.total_leads)} sub={`${overview.leads_this_week} this week`} color={C.green} icon="🎯" />
            <KPI label="Hot Leads" value={fmt(overview.hot_leads)} color={C.hot} icon="🔥" />
            <KPI label="Emails Sent" value={fmt(overview.total_emails_sent)} sub={`${overview.total_email_opens} opens • ${overview.total_email_clicks} clicks`} color={C.purple} icon="📧" />
            <KPI label="Events Tracked" value={fmt(overview.total_events_tracked)} sub="Your own analytics engine" color={C.warm} icon="⚡" />
            <KPI label="Agent Searches" value={fmt(overview.total_agent_searches)} color={C.green} icon="🔍" />
            <KPI label="Rue Conversations" value={fmt(overview.total_rue_conversations)} color={C.purple} icon="🤖" />
            <KPI label="Content Pieces" value={fmt(overview.total_daily_content + overview.total_brokerage_posts + overview.total_team_posts + overview.total_rkrt_content)} sub={`${overview.total_daily_content} daily • ${overview.total_brokerage_posts} brokerage • ${overview.total_team_posts} team`} color={C.warm} icon="📝" />
          </div>

          {/* Daily Trends Chart */}
          {dailyChartData.length > 0 && (
            <>
              <SectionTitle>Daily Activity Trends</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <ChartCard title="DAU & Actions">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={dailyChartData}>
                      <defs>
                        <linearGradient id="gradDau" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={C.accent} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.textDim }} tickFormatter={(d) => d.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: C.textDim }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="dau" name="DAU" stroke={C.accent} fill="url(#gradDau)" strokeWidth={2} />
                      <Line type="monotone" dataKey="total_actions" name="Actions" stroke={C.purple} strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Leads & Emails">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.textDim }} tickFormatter={(d) => d.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: C.textDim }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="leads_created" name="Leads" fill={C.green} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="emails_sent" name="Emails" fill={C.purple} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── USERS TAB ─────────────────────────────────────── */}
      {tab === "users" && (
        <div>
          <SectionTitle count={users.length}>User Engagement</SectionTitle>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["User", "Plan", "Last Active", "Leads", "Hot", "Emails", "Searches", "Rue", "Content", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: C.textDim, fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id} style={{ borderBottom: `1px solid ${C.border}10`, transition: "background 0.15s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = C.cardHover}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 600, color: C.text }}>{u.full_name || "—"}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{u.email}</div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                        background: u.plan === "regional_operator" ? C.accent + "22" : u.plan === "recruiter" ? C.green + "22" : C.textMuted + "22",
                        color: u.plan === "regional_operator" ? C.accent : u.plan === "recruiter" ? C.green : C.textDim,
                        textTransform: "uppercase",
                      }}>
                        {u.plan?.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: u.days_since_active > 3 ? C.hot : C.text }}>
                      {daysSinceLabel(u.days_since_active)}
                    </td>
                    <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace" }}>{u.lead_count}</td>
                    <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", color: u.hot_lead_count > 0 ? C.hot : C.textMuted }}>{u.hot_lead_count}</td>
                    <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace" }}>{u.emails_sent}</td>
                    <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace" }}>{u.agent_searches}</td>
                    <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace" }}>{u.rue_chats}</td>
                    <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace" }}>{u.content_copies}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: Math.min(80, Math.max(8, (u.total_actions / Math.max(...users.map((x) => x.total_actions || 1))) * 80)),
                          height: 6, borderRadius: 3, background: C.accent,
                        }} />
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{u.total_actions}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* At-Risk Users */}
          {users.filter((u) => u.days_since_active > 2).length > 0 && (
            <>
              <SectionTitle>⚠️ At-Risk Users</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                {users.filter((u) => u.days_since_active > 2).map((u) => (
                  <div key={u.user_id} style={{
                    background: C.card, border: `1px solid ${C.hot}33`, borderRadius: 12, padding: 16,
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.full_name}</div>
                    <div style={{ fontSize: 12, color: C.textDim }}>{u.email}</div>
                    <div style={{ fontSize: 12, color: C.hot, marginTop: 6 }}>
                      Inactive {u.days_since_active}d • {u.total_actions} total actions • {u.lead_count} leads
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── LEADS & SOURCES TAB ───────────────────────────── */}
      {tab === "leads" && (
        <div>
          <SectionTitle>Lead Source Breakdown</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <ChartCard title="Leads by Source">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={sources} dataKey="lead_count" nameKey="lead_source" cx="50%" cy="50%"
                    outerRadius={90} innerRadius={45} paddingAngle={3} strokeWidth={0}>
                    {sources.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: C.textDim }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Source Quality">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {["Source", "Leads", "Hot", "Avg Score"].map((h) => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.textDim, fontWeight: 500, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sources.map((s, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}10` }}>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], marginRight: 8 }} />
                          {s.lead_source}
                        </td>
                        <td style={{ padding: "8px 10px", fontFamily: "'JetBrains Mono', monospace" }}>{s.lead_count}</td>
                        <td style={{ padding: "8px 10px", fontFamily: "'JetBrains Mono', monospace", color: s.hot_count > 0 ? C.hot : C.textMuted }}>{s.hot_count}</td>
                        <td style={{ padding: "8px 10px", fontFamily: "'JetBrains Mono', monospace" }}>{s.avg_score || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>
        </div>
      )}

      {/* ─── CONTENT & EMAIL TAB ───────────────────────────── */}
      {tab === "content" && (
        <div>
          <SectionTitle>Email Performance</SectionTitle>
          {emailPerf.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
              {emailPerf.map((e, i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 13, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>
                    {e.email_type || "Unknown"}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{e.sent}</div>
                      <div style={{ fontSize: 10, color: C.textDim }}>SENT</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: C.green }}>{pct(e.open_rate)}</div>
                      <div style={{ fontSize: 10, color: C.textDim }}>OPEN RATE</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: C.accent }}>{pct(e.click_rate)}</div>
                      <div style={{ fontSize: 10, color: C.textDim }}>CLICK RATE</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 40, textAlign: "center", color: C.textDim }}>
              No email data yet. Send some emails to see performance metrics.
            </div>
          )}

          <SectionTitle>Content Generation</SectionTitle>
          {overview && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <KPI label="Daily Content" value={overview.total_daily_content} icon="📱" color={C.accent} />
              <KPI label="Brokerage Posts" value={overview.total_brokerage_posts} icon="🏢" color={C.green} />
              <KPI label="Team Posts" value={overview.total_team_posts} icon="👥" color={C.purple} />
              <KPI label="RKRT Content" value={overview.total_rkrt_content} icon="🚀" color={C.warm} />
            </div>
          )}
        </div>
      )}

      {/* ─── FEATURE ADOPTION TAB ──────────────────────────── */}
      {tab === "features" && (
        <div>
          <SectionTitle count={features.length}>Feature Adoption</SectionTitle>
          {featureChartData.length > 0 && (
            <ChartCard title="Feature Usage (Unique Users)" span={1}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={featureChartData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: C.textDim }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: C.text }} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="users" name="Unique Users" fill={C.accent} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {features.filter((f) => !["page_view", "page_exit"].includes(f.feature)).map((f) => (
              <div key={f.feature} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.feature.replace(/_/g, " ")}</div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                    color: Number(f.adoption_pct) > 50 ? C.green : Number(f.adoption_pct) > 25 ? C.warm : C.textDim,
                  }}>
                    {f.adoption_pct}%
                  </span>
                </div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
                  {f.unique_users} users • {f.total_uses} total uses
                </div>
                <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: C.border }}>
                  <div style={{
                    height: "100%", borderRadius: 2, width: `${Math.min(100, Number(f.adoption_pct))}%`,
                    background: `linear-gradient(90deg, ${C.accent}, ${C.green})`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 48, paddingTop: 16, borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
        <p style={{ fontSize: 11, color: C.textMuted }}>
          RKRT Analytics Engine • {overview?.total_events_tracked || 0} events tracked • No Google Analytics required
        </p>
      </div>
    </div>
  );
}
