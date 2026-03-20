// RKRT.in Profile Page

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

// Local theme tokens (matches app theme)
const T = {
  bg: "#0D1117", card: "#161B22", b: "#21262D", t: "#F0F6FC",
  s: "#8B949E", m: "#6E7681", a: "#00B386", d: "#0D1117",
  bl: "#58A6FF", p: "#BC8CFF", y: "#F59E0B", r: "#F85149",
  side: "#0D1117",
};

const US_TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Phoenix", "Pacific/Honolulu",
];
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];
const PLAN_INFO = {
  regional_operator: { label: "Regional Operator", color: "#F59E0B" },
  team_leader:       { label: "Team Leader",        color: "#BC8CFF" },
  recruiter:         { label: "Recruiter",           color: "#58A6FF" },
};

const lbl = { fontSize: 11, color: T.m, fontWeight: 700, letterSpacing: 1.2, marginBottom: 5, display: "block" };
const inp = { width: "100%", background: "#0D1117", border: `1px solid ${T.b}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: T.t, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };

function Field({ label, value, editing, input }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={lbl}>{label}</label>
      {editing ? input : <div style={{ fontSize: 14, color: value ? T.t : T.m, lineHeight: 1.5 }}>{value || "—"}</div>}
    </div>
  );
}

function SectionCard({ title, id, editSection, onEdit, onCancel, onSave, saving, children }) {
  const editing = editSection === id;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "24px 26px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: T.t }}>{title}</span>
        <div style={{ display: "flex", gap: 8 }}>
          {editing ? (
            <>
              <div onClick={onCancel} style={{ padding: "7px 16px", borderRadius: 8, background: "transparent", border: `1px solid ${T.b}`, color: T.s, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</div>
              <div onClick={onSave} style={{ padding: "7px 16px", borderRadius: 8, background: T.a, color: "#000", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : "Save"}
              </div>
            </>
          ) : (
            <div onClick={onEdit} style={{ padding: "7px 16px", borderRadius: 8, background: "transparent", border: `1px solid ${T.b}`, color: T.s, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Edit</div>
          )}
        </div>
      </div>
      {children(editing)}
    </div>
  );
}

export default function ProfilePage({ profile = {}, userId = null, leads = [], onProfileUpdate = () => {} }) {
  const fileRef = useRef(null);
  const [editSection, setEditSection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planLoading, setPlanLoading] = useState(null);
  const [toast, setToast] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [rueConvCount, setRueConvCount] = useState(0);
  const [tagInput, setTagInput] = useState("");

  // Form state mirroring profile
  const [personal, setPersonal] = useState({});
  const [professional, setProfessional] = useState({});
  const [social, setSocial] = useState({});
  const [rkrt, setRkrt] = useState({});
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bookingAvail, setBookingAvail] = useState(null);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingCopied, setBookingCopied] = useState(false);
  const [bookingLoaded, setBookingLoaded] = useState(false);

  // Seed form state from profile prop
  useEffect(() => {
    if (!profile) return;

    const sl = profile.social_links || {};
    const specs = Array.isArray(profile.specialties)
      ? profile.specialties
      : (typeof profile.specialties === "string" && profile.specialties
          ? profile.specialties.split(",").map(s => s.trim()).filter(Boolean)
          : []);

    setAvatarUrl(profile.avatar_url || "");
    setPersonal({
      full_name:         profile.full_name || "",
      title:             profile.title || "",
      bio:               profile.bio || "",
      phone:             profile.phone || "",
      email:             profile.email || "",
      timezone:          profile.timezone || "America/New_York",
      preferred_contact: profile.preferred_contact || "email",
    });
    setProfessional({
      brokerage:        profile.brokerage || "",
      market:           profile.market || "",
      license_number:   profile.license_number || "",
      license_state:    profile.license_state || "",
      years_experience: profile.years_experience || "",
      specialties:      specs,
      recruiting_goal:  profile.recruiting_goal || "",
    });
    setSocial({
      linkedin:  sl.linkedin || "",
      instagram: sl.instagram || "",
      facebook:  sl.facebook || "",
      youtube:   sl.youtube || "",
      tiktok:    sl.tiktok || "",
    });
    setRkrt({
      rkrt_phone: profile.rkrt_phone || "",
      rkrt_email: profile.rkrt_email || "",
    });
  }, [profile]);

  // Fetch rue conversation count + booking availability
  useEffect(() => {
    if (!userId) return;
    supabase.from('conversations').select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then(({ count }) => { if (count !== null) setRueConvCount(count); });
    loadBookingAvail();
  }, [userId]);

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setAvatarLoading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;
      await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
      setAvatarUrl(publicUrl);
      showToast("Photo updated!");
      onProfileUpdate();
    } catch {
      showToast("Upload failed. Try again.", true);
    }
    setAvatarLoading(false);
  };

  const saveSection = async (sectionId) => {
    if (!userId) return;
    setSaving(true);
    try {
      let payload = {};
      if (sectionId === "personal") {
        payload = {
          full_name: personal.full_name,
          title: personal.title,
          bio: personal.bio,
          phone: personal.phone,
          timezone: personal.timezone,
          preferred_contact: personal.preferred_contact,
        };
      } else if (sectionId === "professional") {
        payload = {
          brokerage: professional.brokerage,
          market: professional.market,
          license_number: professional.license_number,
          license_state: professional.license_state,
          years_experience: professional.years_experience || null,
          specialties: professional.specialties,
          recruiting_goal: professional.recruiting_goal || null,
        };
      } else if (sectionId === "social") {
        payload = {
          social_links: {
            linkedin:  social.linkedin,
            instagram: social.instagram,
            facebook:  social.facebook,
            youtube:   social.youtube,
            tiktok:    social.tiktok,
          },
        };
      } else if (sectionId === "rkrt") {
        payload = {
          rkrt_phone: rkrt.rkrt_phone,
          rkrt_email: rkrt.rkrt_email,
        };
      }
      const { error } = await supabase.from('profiles').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', userId);
      if (error) throw error;
      showToast("Profile updated!");
      setEditSection(null);
      onProfileUpdate();
    } catch (err) {
      showToast(err?.message || "Save failed. Try again.", true);
    }
    setSaving(false);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !(professional.specialties || []).includes(t)) {
      setProfessional(p => ({ ...p, specialties: [...(p.specialties || []), t] }));
    }
    setTagInput("");
  };
  const removeTag = (tag) => setProfessional(p => ({ ...p, specialties: p.specialties.filter(s => s !== tag) }));

  const loadBookingAvail = async () => {
    if (!userId) return;
    const { data } = await supabase.from('booking_availability').select('*').eq('user_id', userId).maybeSingle();
    if (data) {
      setBookingAvail(data);
    } else {
      // Default values for new booking availability
      setBookingAvail({
        user_id: userId,
        slug: profile?.booking_slug || '',
        display_name: profile?.full_name || '',
        is_active: false,
        slot_duration: 30,
        available_days: [1, 2, 3, 4, 5],
        start_hour: 9,
        end_hour: 17,
        timezone: 'America/Chicago',
        meeting_type: 'video',
        meeting_link: '',
        confirmation_message: '',
      });
    }
    setBookingLoaded(true);
  };

  const saveBookingAvail = async () => {
    if (!userId || !bookingAvail) return;
    setBookingSaving(true);
    try {
      const { error } = await supabase.from('booking_availability').upsert({
        ...bookingAvail,
        user_id: userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (error) throw error;
      showToast("Booking settings saved!");
    } catch (err) {
      showToast(err?.message || "Save failed.", true);
    }
    setBookingSaving(false);
  };

  const toggleBookingActive = async () => {
    if (!bookingAvail) return;
    const newVal = !bookingAvail.is_active;
    setBookingAvail(b => ({ ...b, is_active: newVal }));
    await supabase.from('booking_availability').upsert({
      ...bookingAvail,
      is_active: newVal,
      user_id: userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    showToast(newVal ? "Bookings enabled!" : "Bookings paused.");
  };

  const copyBookingUrl = () => {
    navigator.clipboard.writeText(`https://rkrt.in/book/${profile?.booking_slug || ''}`);
    setBookingCopied(true);
    setTimeout(() => setBookingCopied(false), 2000);
  };

  // Derived stats
  const hottest = [...leads].sort((a, b) => (b.interest_score || 0) - (a.interest_score || 0))[0];
  const daysActive = profile?.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at)) / 86400000)
    : 0;
  const planInfo = PLAN_INFO[profile?.plan]
    || (profile?.role === "owner" ? { label: "Owner", color: "#F59E0B" } : { label: "Free", color: T.m });
  const initials = (personal.full_name || profile?.email || "?")
    .split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();

  const sectionProps = (id) => ({
    id,
    editSection,
    saving,
    onEdit:   () => setEditSection(id),
    onCancel: () => setEditSection(null),
    onSave:   () => saveSection(id),
  });

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .avatar-wrap:hover .cam-overlay { opacity: 1 !important; }
        input:focus, select:focus, textarea:focus { border-color: ${T.a} !important; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 3000, padding: "12px 22px", borderRadius: 10, background: toast.isError ? T.r : T.a, color: "#000", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 24px rgba(0,0,0,0.5)", pointerEvents: "none" }}>
          {toast.isError ? "⚠️" : "✓"} {toast.msg}
        </div>
      )}

      {/* ── Header Card ── */}
      <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "32px 36px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 32, flexWrap: "wrap" }}>
        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0, textAlign: "center" }}>
          <div
            className="avatar-wrap"
            style={{ width: 120, height: 120, borderRadius: "50%", border: `3px solid ${T.a}`, overflow: "hidden", position: "relative", cursor: "pointer", background: `linear-gradient(135deg, ${T.a}30, ${T.p}30)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 800, color: T.a }}
            onClick={() => fileRef.current?.click()}
          >
            {avatarLoading ? (
              <div style={{ width: 30, height: 30, border: `3px solid ${T.a}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            ) : avatarUrl ? (
              <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setAvatarUrl("")} />
            ) : initials}
            {/* Camera overlay */}
            <div className="cam-overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s", gap: 4 }}>
              <span style={{ fontSize: 24 }}>📷</span>
              <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>Change</span>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
        </div>

        {/* Profile info */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: T.t }}>{personal.full_name || profile?.email || "Your Profile"}</span>
            <span style={{ padding: "3px 12px", borderRadius: 20, background: planInfo.color + "20", border: `1px solid ${planInfo.color}40`, fontSize: 12, fontWeight: 700, color: planInfo.color }}>{planInfo.label}</span>
          </div>
          {personal.title && <div style={{ fontSize: 15, color: T.s, marginBottom: 6 }}>{personal.title}</div>}
          <div style={{ fontSize: 13, color: T.m, marginBottom: 10 }}>
            {[professional.brokerage, professional.market].filter(Boolean).join(" · ")}
            {profile?.created_at && (
              <span style={{ marginLeft: 6 }}>
                {(professional.brokerage || professional.market) ? "· " : ""}Member since {new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
            )}
          </div>
          {personal.bio && <div style={{ fontSize: 13, color: T.s, lineHeight: 1.7, maxWidth: 500 }}>{personal.bio}</div>}
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { icon: "◎",  label: "Total Leads",  value: leads.length,    sub: null,                                                      color: T.bl },
          { icon: "🔥", label: "Hottest Lead", value: hottest ? `${hottest.first_name} ${hottest.last_name?.charAt(0) || ""}.` : "—", sub: hottest ? `Score ${hottest.interest_score}` : null, color: "#FF4444" },
          { icon: "🤖", label: "Rue Chats",    value: rueConvCount,    sub: null,                                                      color: T.a  },
          { icon: "📅", label: "Days Active",  value: daysActive,      sub: null,                                                      color: T.p  },
        ].map(({ icon, label, value, sub, color }) => (
          <div key={label} style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{icon}</div>
              <span style={{ fontSize: 10, color: T.m, fontWeight: 700, letterSpacing: 1 }}>{label.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.2, wordBreak: "break-word" }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: T.m, marginTop: 4 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Section 1: Personal Info ── */}
      <SectionCard title="👤 Personal Info" {...sectionProps("personal")}>
        {(editing) => (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 28px" }}>
            <Field label="FULL NAME" value={personal.full_name} editing={editing}
              input={<input value={personal.full_name} onChange={e => setPersonal(p => ({ ...p, full_name: e.target.value }))} style={inp} />} />
            <Field label="TITLE / ROLE" value={personal.title} editing={editing}
              input={<input value={personal.title} onChange={e => setPersonal(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Senior Recruiter" style={inp} />} />
            <div style={{ gridColumn: "1 / -1", marginBottom: 18 }}>
              <label style={lbl}>BIO</label>
              {editing ? (
                <>
                  <textarea value={personal.bio} onChange={e => setPersonal(p => ({ ...p, bio: e.target.value.substring(0, 500) }))} rows={3} style={{ ...inp, resize: "vertical" }} />
                  <div style={{ fontSize: 11, color: T.m, textAlign: "right", marginTop: 3 }}>{(personal.bio || "").length}/500</div>
                </>
              ) : (
                <div style={{ fontSize: 14, color: personal.bio ? T.t : T.m, lineHeight: 1.7 }}>{personal.bio || "—"}</div>
              )}
            </div>
            <Field label="PHONE" value={personal.phone} editing={editing}
              input={<input value={personal.phone} onChange={e => setPersonal(p => ({ ...p, phone: e.target.value }))} style={inp} />} />
            <div style={{ marginBottom: 18 }}>
              <label style={lbl}>EMAIL</label>
              <div style={{ fontSize: 14, color: T.m }}>{personal.email || profile?.email || "—"}</div>
            </div>
            <Field label="TIMEZONE" value={personal.timezone} editing={editing}
              input={
                <select value={personal.timezone} onChange={e => setPersonal(p => ({ ...p, timezone: e.target.value }))} style={inp}>
                  {US_TIMEZONES.map(tz => <option key={tz} value={tz} style={{ background: T.card }}>{tz}</option>)}
                </select>
              } />
            <div style={{ marginBottom: 18 }}>
              <label style={lbl}>PREFERRED CONTACT</label>
              {editing ? (
                <div style={{ display: "flex", gap: 20, marginTop: 6 }}>
                  {["email", "phone", "text"].map(opt => (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: T.t, cursor: "pointer" }}>
                      <input type="radio" name="pref_contact" value={opt} checked={personal.preferred_contact === opt} onChange={() => setPersonal(p => ({ ...p, preferred_contact: opt }))} style={{ accentColor: T.a }} />
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 14, color: T.t }}>{personal.preferred_contact ? personal.preferred_contact.charAt(0).toUpperCase() + personal.preferred_contact.slice(1) : "—"}</div>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Section 2: Professional ── */}
      <SectionCard title="🏢 Professional" {...sectionProps("professional")}>
        {(editing) => (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 28px" }}>
            <Field label="BROKERAGE" value={professional.brokerage} editing={editing}
              input={<input value={professional.brokerage} onChange={e => setProfessional(p => ({ ...p, brokerage: e.target.value }))} style={inp} />} />
            <Field label="MARKET" value={professional.market} editing={editing}
              input={<input value={professional.market} onChange={e => setProfessional(p => ({ ...p, market: e.target.value }))} style={inp} />} />
            <Field label="LICENSE NUMBER" value={professional.license_number} editing={editing}
              input={<input value={professional.license_number} onChange={e => setProfessional(p => ({ ...p, license_number: e.target.value }))} style={inp} />} />
            <Field label="LICENSE STATE" value={professional.license_state} editing={editing}
              input={
                <select value={professional.license_state} onChange={e => setProfessional(p => ({ ...p, license_state: e.target.value }))} style={inp}>
                  <option value="">Select state</option>
                  {US_STATES.map(s => <option key={s} value={s} style={{ background: T.card }}>{s}</option>)}
                </select>
              } />
            <Field label="YEARS OF EXPERIENCE" value={professional.years_experience ? `${professional.years_experience} years` : ""} editing={editing}
              input={<input type="number" min="0" max="60" value={professional.years_experience} onChange={e => setProfessional(p => ({ ...p, years_experience: e.target.value }))} style={inp} />} />
            <Field label="MONTHLY RECRUITING GOAL" value={professional.recruiting_goal ? `${professional.recruiting_goal} leads/mo` : ""} editing={editing}
              input={<input type="number" min="0" value={professional.recruiting_goal} onChange={e => setProfessional(p => ({ ...p, recruiting_goal: e.target.value }))} style={inp} />} />
            {/* Specialties tag input */}
            <div style={{ gridColumn: "1 / -1", marginBottom: 18 }}>
              <label style={lbl}>SPECIALTIES</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: editing ? 8 : 0 }}>
                {(professional.specialties || []).map(tag => (
                  <span key={tag} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: T.a + "20", border: `1px solid ${T.a}40`, fontSize: 13, color: T.a, fontWeight: 600 }}>
                    {tag}
                    {editing && <span onClick={() => removeTag(tag)} style={{ cursor: "pointer", fontSize: 11, color: T.m, lineHeight: 1 }}>✕</span>}
                  </span>
                ))}
                {(professional.specialties || []).length === 0 && !editing && <span style={{ fontSize: 14, color: T.m }}>—</span>}
              </div>
              {editing && (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder='Add specialty (e.g. "luxury", "new agents") — press Enter'
                    style={{ ...inp, flex: 1 }}
                  />
                  <div onClick={addTag} style={{ padding: "10px 16px", borderRadius: 8, background: T.a + "20", border: `1px solid ${T.a}40`, color: T.a, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ Add</div>
                </div>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Section 3: Social & Links ── */}
      <SectionCard title="🔗 Social & Links" {...sectionProps("social")}>
        {(editing) => (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 28px" }}>
            {[
              { label: "LINKEDIN URL",        key: "linkedin",  prefix: "linkedin.com/in/", isUrl: true  },
              { label: "INSTAGRAM",           key: "instagram", prefix: "@",                isUrl: false },
              { label: "FACEBOOK URL",        key: "facebook",  prefix: "facebook.com/",    isUrl: true  },
              { label: "YOUTUBE",             key: "youtube",   prefix: "youtube.com/",     isUrl: true  },
              { label: "TIKTOK",              key: "tiktok",    prefix: "@",                isUrl: false },
            ].map(({ label, key, prefix, isUrl }) => {
              const val = social[key];
              const setSocField = (v) => setSocial(s => ({ ...s, [key]: v }));
              const displayHref = isUrl && val
                ? (val.startsWith("http") ? val : `https://${prefix}${val}`)
                : null;
              return (
                <div key={key} style={{ marginBottom: 18 }}>
                  <label style={lbl}>{label}</label>
                  {editing ? (
                    <div style={{ display: "flex" }}>
                      <span style={{ padding: "10px 12px", background: "#161B22", border: `1px solid ${T.b}`, borderRight: "none", borderRadius: "8px 0 0 8px", fontSize: 12, color: T.m, whiteSpace: "nowrap" }}>{prefix}</span>
                      <input value={val} onChange={e => setSocField(e.target.value)} style={{ ...inp, borderRadius: "0 8px 8px 0", flex: 1 }} />
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, color: val ? T.bl : T.m }}>
                      {val ? (
                        displayHref
                          ? <a href={displayHref} target="_blank" rel="noreferrer" style={{ color: T.bl, textDecoration: "none" }}>🔗 {prefix}{val}</a>
                          : `${prefix}${val}`
                      ) : "—"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* ── Section 4: RKRT Settings ── */}
      <SectionCard title="⚡ RKRT Settings" {...sectionProps("rkrt")}>
        {(editing) => (
          <div>
            <div style={{ fontSize: 13, color: T.m, lineHeight: 1.6, marginBottom: 20, padding: "10px 14px", background: T.bg, border: `1px solid ${T.b}`, borderRadius: 8 }}>
              These are the contact details shown on your recruiting landing pages.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 28px" }}>
              <Field label="RKRT PHONE" value={rkrt.rkrt_phone} editing={editing}
                input={<input value={rkrt.rkrt_phone} onChange={e => setRkrt(r => ({ ...r, rkrt_phone: e.target.value }))} style={inp} />} />
              <Field label="RKRT EMAIL" value={rkrt.rkrt_email} editing={editing}
                input={<input value={rkrt.rkrt_email} onChange={e => setRkrt(r => ({ ...r, rkrt_email: e.target.value }))} style={inp} />} />
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Section 5: Billing ── */}
      {(() => {
        const SUPABASE_URL = "https://usknntguurefeyzusbdh.supabase.co";
        const currentPlan = profile?.plan || "free";
        const creditsUsed = profile?.enrichment_credits_used || 0;
        const creditsTotal = profile?.enrichment_credits || 0;
        const creditsRemaining = Math.max(0, creditsTotal - creditsUsed);
        const planLabel = PLAN_INFO[currentPlan]?.label || (currentPlan === "free" ? "Free" : currentPlan);
        const planColor = PLAN_INFO[currentPlan]?.color || T.m;

        const handleCheckout = async ({ priceId, plan, mode = "subscription" }) => {
          setPlanLoading(plan || priceId);
          try {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            const token = authSession?.access_token;
            if (!token) { alert("Please sign in first."); setPlanLoading(null); return; }
            const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
              body: JSON.stringify({ priceId, plan, mode })
            });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else alert("Error: " + (data.error || "Unknown"));
          } catch (e) { alert(e.message); }
          setPlanLoading(null);
        };

        const PLANS = [
          { key: "recruiter", priceId: "price_1T7KWqLUyw8VkDG8LGq23UWH", name: "Recruiter", price: "$97", period: "/mo", features: ["100 enrichment credits/mo", "AI content generation", "Rue AI assistant", "Commission calculator", "Lead scoring & drip emails", "Post to Facebook"], color: "#22C55E", popular: false },
          { key: "team_leader", priceId: "price_1TBzqwLUyw8VkDG8QdUDNo9L", name: "Team Leader", price: "$297", period: "/mo", features: ["Everything in Recruiter", "5 team seats", "500 enrichment credits/mo", "Team blog", "Brokerage blog", "Priority support"], color: "#F59E0B", popular: true },
          { key: "regional_operator", priceId: "price_1TBzqwLUyw8VkDG8dvxzP3ZX", name: "Regional Operator", price: "$997", period: "/mo", features: ["Everything in Team Leader", "10 team seats", "1,000 enrichment credits/mo", "White label option", "Dedicated support", "Custom integrations"], color: "#8B5CF6", popular: false },
        ];
        const CREDIT_PACKS = [
          { key: "credits_50", priceId: "price_1TBzqwLUyw8VkDG8ybG9deHo", credits: 50, price: "$25", perCredit: "$0.50" },
          { key: "credits_200", priceId: "price_1TBzqxLUyw8VkDG8RDQNXLj6", credits: 200, price: "$75", perCredit: "$0.38" },
          { key: "credits_500", priceId: "price_1TBzqxLUyw8VkDG8hODfUyyk", credits: 500, price: "$150", perCredit: "$0.30" },
        ];

        return (<>
          <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "24px 26px", marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.t, marginBottom: 20 }}>💳 Billing</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div style={{ background: T.bg, border: `1px solid ${T.b}`, borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ fontSize: 11, color: T.m, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>CURRENT PLAN</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: planColor }}>{planLabel}</div>
              </div>
              <div style={{ background: T.bg, border: `1px solid ${T.b}`, borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ fontSize: 11, color: T.m, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>CREDITS REMAINING</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: creditsRemaining > 20 ? T.a : creditsRemaining > 0 ? T.y : T.r }}>{creditsRemaining} <span style={{ fontSize: 13, fontWeight: 600, color: T.m }}>/ {creditsTotal}</span></div>
              </div>
              <div style={{ background: T.bg, border: `1px solid ${T.b}`, borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ fontSize: 11, color: T.m, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>CREDITS USED</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: T.t }}>{creditsUsed}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <div onClick={() => setShowPlanModal(true)} style={{ padding: "10px 20px", borderRadius: 8, background: T.a + "18", border: `1px solid ${T.a}40`, color: T.a, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {currentPlan === "free" ? "Get Started" : "Change Plan"}
              </div>
              <div onClick={() => setShowPlanModal(true)} style={{ padding: "10px 20px", borderRadius: 8, background: T.bl + "18", border: `1px solid ${T.bl}40`, color: T.bl, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Buy More Credits
              </div>
            </div>
          </div>

          {/* Plan Selection Modal */}
          {showPlanModal && (
            <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowPlanModal(false)}>
              <div style={{ width: "100%", maxWidth: 900, maxHeight: "90vh", overflowY: "auto", background: T.card, border: `1px solid ${T.b}`, borderRadius: 16, padding: "32px" }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.t }}>Choose Your Plan</div>
                  <div onClick={() => setShowPlanModal(false)} style={{ cursor: "pointer", color: T.m, fontSize: 20 }}>✕</div>
                </div>

                {/* Plans */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
                  {PLANS.map(plan => {
                    const isCurrent = currentPlan === plan.key;
                    return (
                      <div key={plan.key} style={{ background: T.bg, border: `2px solid ${isCurrent ? plan.color : T.b}`, borderRadius: 14, padding: "24px 20px", position: "relative", display: "flex", flexDirection: "column" }}>
                        {plan.popular && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: plan.color, color: "#000", fontSize: 10, fontWeight: 800, padding: "3px 12px", borderRadius: 20, letterSpacing: 0.5 }}>MOST POPULAR</div>}
                        {isCurrent && <div style={{ position: "absolute", top: -10, right: 12, background: T.a, color: "#000", fontSize: 10, fontWeight: 800, padding: "3px 12px", borderRadius: 20 }}>CURRENT</div>}
                        <div style={{ fontSize: 18, fontWeight: 700, color: plan.color, marginBottom: 4 }}>{plan.name}</div>
                        <div style={{ marginBottom: 20 }}><span style={{ fontSize: 36, fontWeight: 900, color: T.t }}>{plan.price}</span><span style={{ fontSize: 14, color: T.m }}>{plan.period}</span></div>
                        <div style={{ flex: 1, marginBottom: 20 }}>
                          {plan.features.map(f => (
                            <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.s, marginBottom: 8 }}>
                              <span style={{ color: plan.color, fontSize: 14 }}>✓</span> {f}
                            </div>
                          ))}
                        </div>
                        {isCurrent ? (
                          <div style={{ padding: "12px", borderRadius: 8, background: T.b, color: T.m, fontSize: 14, fontWeight: 700, textAlign: "center" }}>Current Plan</div>
                        ) : (
                          <div onClick={() => handleCheckout({ priceId: plan.priceId, plan: plan.key })} style={{ padding: "12px", borderRadius: 8, background: plan.color, color: "#000", fontSize: 14, fontWeight: 700, textAlign: "center", cursor: planLoading === plan.key ? "wait" : "pointer", opacity: planLoading === plan.key ? 0.7 : 1 }}>
                            {planLoading === plan.key ? "Loading..." : currentPlan === "free" ? "Get Started" : "Upgrade"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Credit Packs */}
                <div style={{ borderTop: `1px solid ${T.b}`, paddingTop: 24 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.t, marginBottom: 16 }}>Need More Credits?</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    {CREDIT_PACKS.map(pack => (
                      <div key={pack.key} style={{ background: T.bg, border: `1px solid ${T.b}`, borderRadius: 10, padding: "18px 16px", textAlign: "center" }}>
                        <div style={{ fontSize: 28, fontWeight: 900, color: T.bl }}>{pack.credits}</div>
                        <div style={{ fontSize: 12, color: T.m, marginBottom: 8 }}>credits · {pack.perCredit} each</div>
                        <div onClick={() => handleCheckout({ priceId: pack.priceId, plan: pack.key, mode: "payment" })} style={{ padding: "10px", borderRadius: 8, background: T.bl + "18", border: `1px solid ${T.bl}40`, color: T.bl, fontSize: 13, fontWeight: 700, cursor: planLoading === pack.key ? "wait" : "pointer" }}>
                          {planLoading === pack.key ? "Loading..." : `Buy for ${pack.price}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>);
      })()}

      {/* ── Section 6: Recruiting Calendar ── */}
      <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "24px 26px", marginBottom: 16 }}>
        {(!profile?.plan || profile.plan === 'free') ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: T.m }}>📅 Recruiting Calendar</span>
              <span style={{ padding: "3px 10px", borderRadius: 20, background: T.m + "20", fontSize: 10, fontWeight: 700, color: T.m, letterSpacing: 0.5 }}>LOCKED</span>
            </div>
            <div style={{ fontSize: 13, color: T.s, lineHeight: 1.7, marginBottom: 16 }}>
              Give agents a direct way to book a call with you. Included on Recruiter plan and above.
            </div>
            <div style={{ padding: "10px 20px", borderRadius: 8, background: T.bl + "20", border: `1px solid ${T.bl}40`, color: T.bl, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-block" }}>
              Upgrade to Enable →
            </div>
          </>
        ) : bookingLoaded && bookingAvail ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: T.t }}>📅 Recruiting Calendar</span>
              {bookingAvail.is_active && <span style={{ padding: "3px 10px", borderRadius: 20, background: T.a + "20", border: `1px solid ${T.a}40`, fontSize: 10, fontWeight: 700, color: T.a }}>✅ Active</span>}
            </div>

            {/* Booking link */}
            {profile?.booking_slug && (
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>YOUR BOOKING LINK</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <code style={{ flex: 1, fontSize: 13, color: T.bl, background: "#0D1117", border: `1px solid ${T.b}`, borderRadius: 8, padding: "10px 14px", wordBreak: "break-all", fontFamily: "monospace" }}>
                    https://rkrt.in/book/{profile.booking_slug}
                  </code>
                  <div onClick={copyBookingUrl} style={{ padding: "8px 14px", borderRadius: 6, background: bookingCopied ? T.a + "20" : "transparent", border: `1px solid ${bookingCopied ? T.a : T.b}`, color: bookingCopied ? T.a : T.s, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {bookingCopied ? "✓ Copied" : "📋 Copy"}
                  </div>
                  <a href={`https://rkrt.in/book/${profile.booking_slug}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.bl, textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>Preview →</a>
                </div>
              </div>
            )}

            {/* Accept bookings toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, padding: "12px 16px", background: T.bg, border: `1px solid ${T.b}`, borderRadius: 8 }}>
              <span style={{ fontSize: 14, color: T.t, fontWeight: 600 }}>Accept bookings</span>
              <div onClick={toggleBookingActive} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <span style={{ fontSize: 12, color: bookingAvail.is_active ? T.a : T.s }}>{bookingAvail.is_active ? "On" : "Off"}</span>
                <div style={{ width: 40, height: 22, borderRadius: 11, background: bookingAvail.is_active ? T.a : "#374151", position: "relative", transition: "background 0.2s" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: bookingAvail.is_active ? 20 : 2, transition: "left 0.2s" }} />
                </div>
              </div>
            </div>

            {/* Availability settings */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 28px", marginBottom: 20 }}>
              {/* Slot duration */}
              <div>
                <label style={lbl}>SLOT DURATION</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[15, 30, 60].map(d => (
                    <div key={d} onClick={() => setBookingAvail(b => ({ ...b, slot_duration: d }))} style={{ padding: "8px 16px", borderRadius: 8, background: bookingAvail.slot_duration === d ? T.a + "20" : "transparent", border: `1px solid ${bookingAvail.slot_duration === d ? T.a : T.b}`, color: bookingAvail.slot_duration === d ? T.a : T.s, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      {d} min
                    </div>
                  ))}
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label style={lbl}>TIMEZONE</label>
                <select value={bookingAvail.timezone} onChange={e => setBookingAvail(b => ({ ...b, timezone: e.target.value }))} style={inp}>
                  {US_TIMEZONES.map(tz => <option key={tz} value={tz} style={{ background: T.card }}>{tz.replace("America/", "").replace("Pacific/", "").replace(/_/g, " ")}</option>)}
                </select>
              </div>

              {/* Start time */}
              <div>
                <label style={lbl}>START TIME</label>
                <select value={bookingAvail.start_hour} onChange={e => setBookingAvail(b => ({ ...b, start_hour: parseInt(e.target.value) }))} style={inp}>
                  {Array.from({ length: 16 }, (_, i) => i + 6).map(h => (
                    <option key={h} value={h} style={{ background: T.card }}>{h > 12 ? `${h - 12}:00 PM` : h === 12 ? "12:00 PM" : `${h}:00 AM`}</option>
                  ))}
                </select>
              </div>

              {/* End time */}
              <div>
                <label style={lbl}>END TIME</label>
                <select value={bookingAvail.end_hour} onChange={e => setBookingAvail(b => ({ ...b, end_hour: parseInt(e.target.value) }))} style={inp}>
                  {Array.from({ length: 16 }, (_, i) => i + 6).map(h => (
                    <option key={h} value={h} style={{ background: T.card }}>{h > 12 ? `${h - 12}:00 PM` : h === 12 ? "12:00 PM" : `${h}:00 AM`}</option>
                  ))}
                </select>
              </div>

              {/* Meeting type */}
              <div>
                <label style={lbl}>MEETING TYPE</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[{ v: "video", l: "Video Call" }, { v: "phone", l: "Phone" }, { v: "in_person", l: "In Person" }].map(({ v, l }) => (
                    <div key={v} onClick={() => setBookingAvail(b => ({ ...b, meeting_type: v }))} style={{ padding: "8px 14px", borderRadius: 8, background: bookingAvail.meeting_type === v ? T.a + "20" : "transparent", border: `1px solid ${bookingAvail.meeting_type === v ? T.a : T.b}`, color: bookingAvail.meeting_type === v ? T.a : T.s, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      {l}
                    </div>
                  ))}
                </div>
              </div>

              {/* Meeting link (only for video) */}
              {bookingAvail.meeting_type === "video" && (
                <div>
                  <label style={lbl}>MEETING LINK</label>
                  <input value={bookingAvail.meeting_link || ""} onChange={e => setBookingAvail(b => ({ ...b, meeting_link: e.target.value }))} placeholder="Zoom or Google Meet URL" style={inp} />
                </div>
              )}
            </div>

            {/* Available days */}
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>AVAILABLE DAYS</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[{ d: 1, l: "Mon" }, { d: 2, l: "Tue" }, { d: 3, l: "Wed" }, { d: 4, l: "Thu" }, { d: 5, l: "Fri" }, { d: 6, l: "Sat" }, { d: 0, l: "Sun" }].map(({ d, l }) => {
                  const active = (bookingAvail.available_days || []).includes(d);
                  return (
                    <div key={d} onClick={() => setBookingAvail(b => ({ ...b, available_days: active ? b.available_days.filter(x => x !== d) : [...(b.available_days || []), d] }))} style={{ padding: "8px 14px", borderRadius: 8, background: active ? T.a + "20" : "transparent", border: `1px solid ${active ? T.a : T.b}`, color: active ? T.a : T.s, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      {l}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Confirmation message */}
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>CONFIRMATION MESSAGE</label>
              <textarea value={bookingAvail.confirmation_message || ""} onChange={e => setBookingAvail(b => ({ ...b, confirmation_message: e.target.value }))} placeholder="Message shown after booking (optional)" rows={3} style={{ ...inp, resize: "vertical" }} />
            </div>

            {/* Save button */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div onClick={saveBookingAvail} style={{ padding: "10px 24px", borderRadius: 8, background: T.a, color: "#000", fontSize: 13, fontWeight: 700, cursor: bookingSaving ? "wait" : "pointer", opacity: bookingSaving ? 0.7 : 1 }}>
                {bookingSaving ? "Saving..." : "Save Settings"}
              </div>
              <div style={{ fontSize: 12, color: T.m, fontStyle: "italic" }}>✨ Rue automatically includes your booking link in recruiting emails</div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: 20, color: T.s, fontSize: 13 }}>Loading booking settings...</div>
        )}
      </div>
    </div>
  );
}
