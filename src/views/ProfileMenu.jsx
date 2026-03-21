import T from '../lib/theme';
import { supabase } from '../lib/supabase';

function ProfileMenu({ ctx }) {
  const { profileMenuOpen, setProfileMenuOpen, profile, impersonating, setImpersonating, setRealUser, setViewWithHistory, setSidebarOpen } = ctx;
  if (!profileMenuOpen) return null;
  return (
    <div className="profile-menu-popup" style={{ position: "fixed", bottom: 80, left: 90, width: 210, background: T.card, border: `1px solid ${T.b}`, borderRadius: 10, padding: "6px 0", zIndex: 1100, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
      {profile?.role === "owner" && !impersonating && <>
        <div onClick={() => { setViewWithHistory("admin"); setSidebarOpen(false); setProfileMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: T.r, borderRadius: 6 }} onMouseOver={ev => ev.currentTarget.style.background = T.r + "15"} onMouseOut={ev => ev.currentTarget.style.background = "transparent"}>
          <span>🛡️</span><span>Admin Dashboard</span>
        </div>
        <div style={{ height: 1, background: T.b, margin: "4px 0" }} />
      </>}
      <div onClick={() => { setViewWithHistory("profile"); setSidebarOpen(false); setProfileMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: T.t }} onMouseOver={ev => ev.currentTarget.style.background = T.bh} onMouseOut={ev => ev.currentTarget.style.background = "transparent"}>
        <span>👤</span><span>My Profile</span>
      </div>
      <div style={{ height: 1, background: T.b, margin: "4px 0" }} />
      <div onClick={() => { supabase.auth.signOut().then(() => { window.location.href = "/login"; }); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: T.r }} onMouseOver={ev => ev.currentTarget.style.background = T.r + "15"} onMouseOut={ev => ev.currentTarget.style.background = "transparent"}>
        <span>🚪</span><span>Logout</span>
      </div>
    </div>
  );
}

export default ProfileMenu;
