// RKRT.in Profile Page
// Rich profile management with photo upload, editable sections, stats

import { useState, useEffect, useRef } from 'react';
import T from '../../lib/theme';
import { supabase } from '../../lib/supabase';

const US_TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu",
];
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];
const PLAN_INFO = {
  regional_operator: { label: "Regional Operator", color: "#F59E0B" },
  team_leader:       { label: "Team Leader",        color: "#8B5CF6" },
  recruiter:         { label: "Recruiter",           color: "#3B82F6" },
};

const labelStyle = { fontSize: 11, color: T.m, fontWeight: 700, letterSpacing: 1.2, marginBottom: 5, display: "block" };
const baseInput  = { width: "100%", background: T.d, border: `1px solid ${T.b}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: T.t, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };

export default function ProfilePage({
  profile = {},
  userId = null,
  leads = [],
  onProfileUpdate = () => {},
}) {
  const fileRef = useRef(null);
  const [form, setForm] = useState({});
  const [editSection, setEditSection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [rueConvCount, setRueConvCount] = useState(0);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (!profile) return;
    const rawSpecialties = profile.specialties;
    const specialties = Array.isArray(rawSpecialties)
      ? rawSpecialties
      : rawSpecialties ? rawSpecialties.split(",").map(s => s.trim()).filter(Boolean) : [];
    setForm({
      full_name:               profile.full_name || "",
      title:                   profile.title || "",
      bio:                     profile.bio || "",
      phone:                   profile.phone || "",
      timezone:                profile.timezone || "America/New_York",
      preferred_contact:       profile.preferred_contact || "email",
      brokerage:               profile.brokerage || "",
      market:                  profile.market || "",
      license_number:          profile.license_number || "",
      license_state:           profile.license_state || "",
      years_of_experience:     profile.years_of_experience || "",
      specialties,
      monthly_recruiting_goal: profile.monthly_recruiting_goal || "",
      linkedin_url:            profile.linkedin_url || "",
      instagram_handle:        profile.instagram_handle || "",
      facebook_url:            profile.facebook_url || "",
      youtube_channel:         profile.youtube_channel || "",
      tiktok_handle:           profile.tiktok_handle || "",
      cal_booking_url:         profile.cal_booking_url || "",
      rkrt_phone:              profile.rkrt_phone || "",
      rkrt_email:              profile.rkrt_email || "",
      avatar_url:              profile.avatar_url || "",
    });
  }, [profile]);

  useEffect(() => {
    if (!userId) return;
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('user_id', userId)
      .then(({ count }) => { if (count !== null) setRueConvCount(count); });
  }, [userId]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setAvatarLoading(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    try {
      await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
      setForm(f => ({ ...f, avatar_url: publicUrl }));
      showToast("Photo updated!");
      onProfileUpdate();
    } catch {
      showToast("Upload failed, try again.");
    }
    setAvatarLoading(false);
  };

  const SECTION_FIELDS = {
    personal:     ['full_name', 'title', 'bio', 'phone', 'timezone', 'preferred_contact'],
    professional: ['brokerage', 'market', 'license_number', 'license_state', 'years_of_experience', 'specialties', 'monthly_recruiting_goal'],
    social:       ['linkedin_url', 'instagram_handle', 'facebook_url', 'youtube_channel', 'tiktok_handle', 'cal_booking_url'],
    rkrt:         ['rkrt_phone', 'rkrt_email'],
  };

  const saveSection = async (sectionId) => {
    if (!userId) return;
    setSaving(true);
    const payload = {};
    for (const field of SECTION_FIELDS[sectionId]) {
      payload[field] = field === 'specialties'
        ? (form.specialties || []).join(",")
        : form[field];
    }
    await supabase.from('profiles').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', userId);
    setSaving(false);
    setEditSection(null);
    showToast("Profile updated!");
    onProfileUpdate();
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !(form.specialties || []).includes(t)) set('specialties', [...(form.specialties || []), t]);
    setTagInput("");
  };
  const removeTag = (tag) => set('specialties', (form.specialties || []).filter(s => s !== tag));

  const hottest = [...leads].sort((a, b) => (b.interest_score || 0) - (a.interest_score || 0))[0];
  const daysActive = profile?.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at)) / 86400000)
    : 0;
  const planInfo = PLAN_INFO[profile?.plan]
    || (profile?.role === "owner" ? { label: "Owner", color: "#F59E0B" } : { label: "Free", color: T.m });
  const initials = ((form.full_name || profile?.email || "?")
    .split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase());

  // Section card wrapper
  const SectionCard = ({ title, id, children }) => {
    const isEditing = editSection === id;
    return (
      <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "24px 26px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.t }}>{title}</span>
          {isEditing ? (
            <div style={{ display: "flex", gap: 8 }}>
              <div onClick={() => setEditSection(null)} style={{ padding: "7px 16px", borderRadius: 7, background: T.d, border: `1px solid ${T.b}`, color: T.s, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</div>
              <div onClick={() => saveSection(id)} style={{ padding: "7px 16px", borderRadius: 7, background: T.a, color: "#000", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : "Save"}
              </div>
            </div>
          ) : (
            <div onClick={() => setEditSection(id)} style={{ padding: "7px 16px", borderRadius: 7, background: T.d, border: `1px solid ${T.b}`, color: T.s, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Edit</div>
          )}
        </div>
        {children(isEditing)}
      </div>
    );
  };

  // Reusable field row
  const Field = ({ label, value, editing, input }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {editing ? input : <div style={{ fontSize: 14, color: value ? T.t : T.m, padding: "2px 0" }}>{value || "—"}</div>}
    </div>
  );

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 2000, padding: "12px 20px", borderRadius: 10, background: T.a, color: "#000", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 20px rgba(0,0,0,0.5)", pointerEvents: "none" }}>
          ✓ {toast}
        </div>
      )}

      {/* Header Card */}
      <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "32px 36px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 32, flexWrap: "wrap" }}>
        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{ width: 120, height: 120, borderRadius: "50%", border: `3px solid ${T.a}`, overflow: "hidden", position: "relative", cursor: "pointer", background: `linear-gradient(135deg, ${T.a}40, ${T.p}40)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 800, color: T.a }}
            onClick={() => fileRef.current?.click()}
          >
            {avatarLoading ? (
              <div style={{ width: 32, height: 32, border: `3px solid ${T.a}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            ) : form.avatar_url ? (
              <img src={form.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : initials}
            <div
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", transition: "background 0.2s", fontSize: 26 }}
              onMouseOver={e => { e.currentTarget.style.background = "rgba(0,0,0,0.55)"; e.currentTarget.textContent = "📷"; }}
              onMouseOut={e => { e.currentTarget.style.background = "rgba(0,0,0,0)"; e.currentTarget.textContent = ""; }}
            />
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
          <div style={{ textAlign: "center", marginTop: 6, fontSize: 11, color: T.m }}>Click to change</div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: T.t }}>{form.full_name || profile?.email || "Your Profile"}</span>
            <span style={{ padding: "3px 12px", borderRadius: 20, background: planInfo.color + "20", border: `1px solid ${planInfo.color}40`, fontSize: 12, fontWeight: 700, color: planInfo.color }}>{planInfo.label}</span>
          </div>
          {form.title && <div style={{ fontSize: 15, color: T.s, marginBottom: 6 }}>{form.title}</div>}
          <div style={{ fontSize: 13, color: T.m, marginBottom: 10, display: "flex", flexWrap: "wrap", gap: "0 8px" }}>
            {form.brokerage && <span>{form.brokerage}</span>}
            {form.brokerage && form.market && <span>·</span>}
            {form.market && <span>{form.market}</span>}
            {profile?.created_at && (
              <span style={{ marginLeft: 4 }}>
                · Member since {new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
            )}
          </div>
          {form.bio && <div style={{ fontSize: 13, color: T.s, lineHeight: 1.6, maxWidth: 480 }}>{form.bio}</div>}
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { icon: "◎",  label: "Total Leads",  value: leads.length,    sub: "",                                                                          color: T.bl },
          { icon: "🔥", label: "Hottest Lead", value: hottest ? `${hottest.first_name} ${hottest.last_name?.charAt(0)}.` : "—", sub: hottest ? `Score ${hottest.interest_score}` : "", color: "#FF4444" },
          { icon: "🤖", label: "Rue Chats",    value: rueConvCount,    sub: "",                                                                          color: T.a  },
          { icon: "📅", label: "Days Active",  value: daysActive,      sub: "",                                                                          color: T.p  },
        ].map(({ icon, label, value, sub, color }) => (
          <div key={label} style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{icon}</div>
              <span style={{ fontSize: 10, color: T.m, fontWeight: 700, letterSpacing: 1 }}>{label.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1, wordBreak: "break-word" }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: T.m, marginTop: 4 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Section 1: Personal Info ── */}
      <SectionCard title="👤 Personal Info" id="personal">
        {(editing) => (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 28px" }}>
            <Field label="FULL NAME" value={form.full_name} editing={editing}
              input={<input value={form.full_name} onChange={e => set('full_name', e.target.value)} style={baseInput} />} />
            <Field label="TITLE / ROLE" value={form.title} editing={editing}
              input={<input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Senior Recruiter" style={baseInput} />} />
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>BIO</label>
              {editing ? (
                <div>
                  <textarea value={form.bio} onChange={e => set('bio', e.target.value.substring(0, 500))} rows={3} style={{ ...baseInput, resize: "vertical" }} />
                  <div style={{ fontSize: 11, color: T.m, textAlign: "right", marginTop: 2 }}>{(form.bio || "").length}/500</div>
                </div>
              ) : (
                <div style={{ fontSize: 14, color: form.bio ? T.t : T.m, lineHeight: 1.6 }}>{form.bio || "—"}</div>
              )}
            </div>
            <div style={{ marginBottom: 16 }} />
            <Field label="PHONE" value={form.phone} editing={editing}
              input={<input value={form.phone} onChange={e => set('phone', e.target.value)} style={baseInput} />} />
            <div>
              <label style={labelStyle}>EMAIL</label>
              <div style={{ fontSize: 14, color: T.m, padding: "2px 0" }}>{profile?.email || "—"}</div>
            </div>
            <Field label="TIMEZONE" value={form.timezone} editing={editing}
              input={
                <select value={form.timezone} onChange={e => set('timezone', e.target.value)} style={baseInput}>
                  {US_TIMEZONES.map(tz => <option key={tz} value={tz} style={{ background: T.card }}>{tz}</option>)}
                </select>
              } />
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>PREFERRED CONTACT</label>
              {editing ? (
                <div style={{ display: "flex", gap: 20, marginTop: 6 }}>
                  {["email", "phone", "text"].map(opt => (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: T.t, cursor: "pointer" }}>
                      <input type="radio" name="pref_contact" value={opt} checked={form.preferred_contact === opt} onChange={() => set('preferred_contact', opt)} style={{ accentColor: T.a }} />
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 14, color: T.t, padding: "2px 0" }}>
                  {form.preferred_contact ? form.preferred_contact.charAt(0).toUpperCase() + form.preferred_contact.slice(1) : "—"}
                </div>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Section 2: Professional ── */}
      <SectionCard title="🏢 Professional" id="professional">
        {(editing) => (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 28px" }}>
            <Field label="BROKERAGE" value={form.brokerage} editing={editing}
              input={<input value={form.brokerage} onChange={e => set('brokerage', e.target.value)} style={baseInput} />} />
            <Field label="MARKET" value={form.market} editing={editing}
              input={<input value={form.market} onChange={e => set('market', e.target.value)} style={baseInput} />} />
            <Field label="LICENSE NUMBER" value={form.license_number} editing={editing}
              input={<input value={form.license_number} onChange={e => set('license_number', e.target.value)} style={baseInput} />} />
            <Field label="LICENSE STATE" value={form.license_state} editing={editing}
              input={
                <select value={form.license_state} onChange={e => set('license_state', e.target.value)} style={baseInput}>
                  <option value="">Select state</option>
                  {US_STATES.map(s => <option key={s} value={s} style={{ background: T.card }}>{s}</option>)}
                </select>
              } />
            <Field label="YEARS OF EXPERIENCE" value={form.years_of_experience ? `${form.years_of_experience} years` : ""} editing={editing}
              input={<input type="number" min="0" max="50" value={form.years_of_experience} onChange={e => set('years_of_experience', e.target.value)} style={baseInput} />} />
            <Field label="MONTHLY RECRUITING GOAL" value={form.monthly_recruiting_goal ? `${form.monthly_recruiting_goal} leads/mo` : ""} editing={editing}
              input={<input type="number" min="0" value={form.monthly_recruiting_goal} onChange={e => set('monthly_recruiting_goal', e.target.value)} style={baseInput} />} />
            <div style={{ gridColumn: "1 / -1", marginBottom: 16 }}>
              <label style={labelStyle}>SPECIALTIES</label>
              {editing ? (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {(form.specialties || []).map(tag => (
                      <span key={tag} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: T.a + "20", border: `1px solid ${T.a}40`, fontSize: 13, color: T.a, fontWeight: 600 }}>
                        {tag}
                        <span onClick={() => removeTag(tag)} style={{ cursor: "pointer", fontSize: 12, color: T.m }}>✕</span>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                      placeholder="Type specialty and press Enter..."
                      style={{ ...baseInput, flex: 1 }}
                    />
                    <div onClick={addTag} style={{ padding: "10px 16px", borderRadius: 8, background: T.a + "20", border: `1px solid ${T.a}40`, color: T.a, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ Add</div>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(form.specialties || []).length > 0
                    ? (form.specialties || []).map(tag => <span key={tag} style={{ padding: "4px 10px", borderRadius: 20, background: T.a + "15", border: `1px solid ${T.a}30`, fontSize: 13, color: T.a, fontWeight: 600 }}>{tag}</span>)
                    : <span style={{ fontSize: 14, color: T.m }}>—</span>}
                </div>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Section 3: Social & Links ── */}
      <SectionCard title="🔗 Social & Links" id="social">
        {(editing) => (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 28px" }}>
            {[
              { label: "LINKEDIN URL",        key: "linkedin_url",      prefix: "linkedin.com/in/" },
              { label: "INSTAGRAM",           key: "instagram_handle",  prefix: "@" },
              { label: "FACEBOOK URL",        key: "facebook_url",      prefix: "facebook.com/" },
              { label: "YOUTUBE",             key: "youtube_channel",   prefix: "youtube.com/" },
              { label: "TIKTOK",              key: "tiktok_handle",     prefix: "@" },
              { label: "CAL.COM BOOKING URL", key: "cal_booking_url",   prefix: "cal.com/" },
            ].map(({ label, key, prefix }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={labelStyle}>{label}</label>
                {editing ? (
                  <div style={{ display: "flex" }}>
                    <span style={{ padding: "10px 12px", background: T.side, border: `1px solid ${T.b}`, borderRight: "none", borderRadius: "8px 0 0 8px", fontSize: 13, color: T.m, whiteSpace: "nowrap" }}>{prefix}</span>
                    <input value={form[key]} onChange={e => set(key, e.target.value)} style={{ ...baseInput, borderRadius: "0 8px 8px 0", flex: 1 }} />
                  </div>
                ) : (
                  <div style={{ fontSize: 14, color: form[key] ? T.bl : T.m }}>
                    {form[key]
                      ? <a href={key.includes("url") ? form[key] : `#`} target="_blank" rel="noreferrer" style={{ color: T.bl, textDecoration: "none" }}>{prefix}{form[key]}</a>
                      : "—"}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Section 4: RKRT Settings ── */}
      <SectionCard title="⚡ RKRT Settings" id="rkrt">
        {(editing) => (
          <div>
            <div style={{ fontSize: 13, color: T.m, marginBottom: 20, lineHeight: 1.6, padding: "10px 14px", borderRadius: 8, background: T.d, border: `1px solid ${T.b}` }}>
              These contact details are displayed on your RKRT recruiting landing pages.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 28px" }}>
              <Field label="RKRT PHONE" value={form.rkrt_phone} editing={editing}
                input={<input value={form.rkrt_phone} onChange={e => set('rkrt_phone', e.target.value)} style={baseInput} />} />
              <Field label="RKRT EMAIL" value={form.rkrt_email} editing={editing}
                input={<input value={form.rkrt_email} onChange={e => set('rkrt_email', e.target.value)} style={baseInput} />} />
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
