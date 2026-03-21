import T from '../lib/theme';

function Sidebar({ ctx }) {
  const { view, setViewWithHistory, setSidebarOpen, setProfileMenuOpen, sidebarOpen, inboxUnread, isBeta, effectiveProfile, teamBlogSlug } = ctx;
  return (
    <div className={`app-sidebar${sidebarOpen ? " open" : ""}`} style={{ width: 80, background: T.side, borderRight: `1px solid ${T.b}`, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", overflow: "auto" }}>
        <div style={{ width: 44, height: 44, borderRadius: 9, marginBottom: 6, background: "linear-gradient(135deg,#00E5A0,#3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11, letterSpacing: "-0.5px", lineHeight: 1, flexShrink: 0 }}><span style={{ color: "#fff" }}>rkrt</span><span style={{ color: "#000" }}>.in</span></div>
        {[["home", "⬡"], ["pipeline", "◎"], ["crm", "📋"], ["agents", "🔍"], ["content", "📝"], ["inbox", "📬"], ["community", "💬"], ...(effectiveProfile?.team_id ? [["team", "👥"]] : []), ...((effectiveProfile?.plan === "team_leader" || effectiveProfile?.plan === "regional_operator") && effectiveProfile?.team_id ? [["blog", "📰"]] : [])].map(([id, ic]) =>
          <div key={id} onClick={() => { if (id === "blog" && teamBlogSlug) { window.open(`https://rkrt.in/team/${teamBlogSlug}`, "_blank"); return; } setViewWithHistory(id); setSidebarOpen(false); setProfileMenuOpen(false); }} title={id === "blog" ? "My Blog" : id} className="nav-btn" style={{ width: 48, height: 48, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20, background: view === id ? T.am : "transparent", color: view === id ? T.a : T.m, transition: "all 0.12s", flexShrink: 0, position: "relative" }}>
            {ic}
            {id === "inbox" && inboxUnread > 0 && <span style={{ position: "absolute", top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8, background: T.a, color: "#000", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", lineHeight: 1 }}>{inboxUnread > 99 ? "99+" : inboxUnread}</span>}
          </div>
        )}
        {isBeta && <div onClick={() => { setViewWithHistory("beta"); setSidebarOpen(false); setProfileMenuOpen(false); }} title="Beta Hub" className="nav-btn" style={{ width: 48, height: 48, borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: view === "beta" ? T.am : "transparent", color: view === "beta" ? T.a : T.m, transition: "all 0.12s", flexShrink: 0, gap: 2 }}><span style={{ fontSize: 18 }}>🧪</span><span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.5 }}>Beta</span></div>}
      </div>
      <div style={{ flexShrink: 0, height: 20 }} />
    </div>
  );
}

export default Sidebar;
