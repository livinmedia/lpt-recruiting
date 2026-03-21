import T from '../lib/theme';
import { trackActivity } from '../lib/track';

function FloatingToolbar({ ctx }) {
  const { loading, load, notifOpen, setNotifOpen, unreadCount, profileMenuOpen, setProfileMenuOpen, rueDrawerOpen, setRueDrawerOpen, effectiveUserId, effectiveProfile, impersonating, notifications, loadNotifications, supabase, handleSelectLead, setViewWithHistory, leads } = ctx;
  return (
    <div className="floating-toolbar" style={{ position: "fixed", bottom: 20, left: 20, zIndex: 1100, display: "flex", flexDirection: "column", gap: 4, background: "rgba(7,10,16,0.92)", border: `1px solid ${T.b}`, borderRadius: 14, padding: "8px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}>
      {[
        { icon: loading ? "⟳" : "↻", label: "Refresh", color: loading ? T.a : T.s, bg: loading ? T.am : "transparent", action: () => load() },
        { icon: "🔔", label: "Notifications", color: notifOpen ? T.a : T.s, bg: notifOpen ? T.am : "transparent", action: (e) => { e.stopPropagation(); setNotifOpen(o => !o); }, badge: unreadCount > 0 ? unreadCount : null },
        { icon: null, label: "Profile", color: profileMenuOpen ? T.a : T.s, bg: profileMenuOpen ? T.am : "transparent", action: () => setProfileMenuOpen(v => !v), avatar: true },
        { icon: "🤖", label: "Ask Rue", color: T.a, bg: rueDrawerOpen ? T.am : T.as, action: () => { setRueDrawerOpen(true); trackActivity(effectiveUserId, 'rue_drawer_open'); }, rueBtn: true },
        { icon: "🚪", label: "Logout", color: T.r, bg: "transparent", action: () => supabase.auth.signOut().then(() => { window.location.href = "/login"; }) },
      ].map((item, i) => (
        <div key={i} onClick={item.action} className="ftb-item" style={{ display: "flex", alignItems: "center", gap: 0, height: 42, borderRadius: 10, cursor: "pointer", background: item.bg, transition: "all 0.2s", overflow: "hidden", position: "relative", whiteSpace: "nowrap", padding: "0 10px", boxShadow: item.rueBtn && !rueDrawerOpen ? `0 0 10px ${T.a}40,0 0 20px ${T.a}20` : undefined }}>
          <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, position: "relative" }}>
            {item.avatar ? <div style={{ width: 24, height: 24, borderRadius: "50%", background: impersonating ? "#F59E0B" : T.a, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#000" }}>{effectiveProfile?.full_name?.charAt(0).toUpperCase() || "?"}</div> : <span style={{ animation: item.rueBtn && !rueDrawerOpen ? "rueGlow 2s ease-in-out infinite" : undefined }}>{item.icon}</span>}
            {item.badge && <div style={{ position: 'absolute', top: -4, right: -6, background: '#EF4444', color: '#fff', borderRadius: '50%', width: 14, height: 14, fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.badge > 9 ? '9+' : item.badge}</div>}
          </div>
          <span className="ftb-label" style={{ fontSize: 13, fontWeight: 600, color: item.color, marginLeft: 0, maxWidth: 0, opacity: 0, transition: "all 0.25s ease", overflow: "hidden" }}>{item.label}</span>
        </div>
      ))}
      {notifOpen && <div style={{ position: 'absolute', bottom: 0, left: 60, width: 320, background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 1200, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.b}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: T.t, fontSize: 14 }}>Notifications</span>
          {unreadCount > 0 && <span onClick={async (e) => { e.stopPropagation(); await supabase.from('notifications').update({ read: true }).eq('user_id', effectiveUserId).eq('read', false); loadNotifications(); }} style={{ fontSize: 11, color: T.a, cursor: 'pointer' }}>Mark all read</span>}
        </div>
        {notifications.length === 0
          ? <div style={{ padding: 24, textAlign: 'center', color: T.s, fontSize: 13 }}>No notifications yet</div>
          : notifications.slice(0, 8).map(n => (
            <div key={n.id} onClick={() => {
              supabase.from('notifications').update({ read: true }).eq('id', n.id);
              setNotifOpen(false);
              const leadId = n.lead_id || n.metadata?.lead_id;
              if (leadId) {
                const found = leads?.find(l => l.id === leadId);
                if (found) handleSelectLead(found);
                setViewWithHistory('lead');
                if (!found) window.location.hash = 'lead/' + leadId;
              } else if (n.action_url) {
                window.location.hash = n.action_url.replace('#', '');
              }
            }} style={{ padding: '12px 16px', borderBottom: `1px solid ${T.b}20`, background: n.read ? 'transparent' : T.a + '10', cursor: 'pointer' }}>
              <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 700, color: T.t, marginBottom: 2 }}>{n.title}</div>
              <div style={{ fontSize: 11, color: T.s, lineHeight: 1.4 }}>{n.body}</div>
              <div style={{ fontSize: 10, color: T.m, marginTop: 4 }}>{new Date(n.created_at).toLocaleDateString()}</div>
            </div>
          ))
        }
      </div>}
    </div>
  );
}

export default FloatingToolbar;
