// RKRT Events Management — for team_leader and regional_operator users
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const T = {
  bg:"#04060A",card:"#0B0F17",d:"#161C28",
  b:"rgba(255,255,255,0.04)",bh:"rgba(255,255,255,0.08)",
  a:"#00E5A0",am:"rgba(0,229,160,0.14)",as:"rgba(0,229,160,0.06)",
  r:"#F43F5E",y:"#F59E0B",bl:"#3B82F6",p:"#8B5CF6",
  t:"#E4E8F1",s:"#7B8BA3",m:"#2A3345",side:"#070A10",
};

const TYPE_COLORS = { webinar: '#3B82F6', workshop: '#8B5CF6', networking: '#10B981', lunch_learn: '#F59E0B', other: '#6B7280' };
const TYPE_LABELS = { webinar: 'Webinar', workshop: 'Workshop', networking: 'Networking', lunch_learn: 'Lunch & Learn', other: 'Other' };
const TIMEZONES = ['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Phoenix','Pacific/Honolulu'];

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' +
    dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function makeSlug(title) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '').substring(0, 60);
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'long' }).toLowerCase();
  return `${base}-${month}-${now.getFullYear()}`;
}

export default function Events({ userId, profile }) {
  const [view, setView] = useState('list'); // list | create | edit | rsvps
  const [events, setEvents] = useState([]);
  const [rsvpCounts, setRsvpCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [editEvent, setEditEvent] = useState(null);
  const [rsvpEvent, setRsvpEvent] = useState(null);
  const [rsvps, setRsvps] = useState([]);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '', event_type: 'webinar', description: '',
    start_date: '', start_time: '18:00', end_date: '', end_time: '19:00',
    timezone: 'America/Los_Angeles',
    location_type: 'virtual', virtual_link: '', location_address: '', city: '', state: '',
    max_attendees: '', registration_required: true, published: false,
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => { loadEvents(); }, [userId]);

  async function loadEvents() {
    setLoading(true);
    const { data } = await supabase.from('events').select('*').eq('owner_id', userId).order('start_time', { ascending: false });
    setEvents(data || []);
    // Fetch RSVP counts
    if (data?.length) {
      const counts = {};
      for (const ev of data) {
        const { count } = await supabase.from('event_rsvps').select('id', { count: 'exact', head: true }).eq('event_id', ev.id);
        counts[ev.id] = count || 0;
      }
      setRsvpCounts(counts);
    }
    setLoading(false);
  }

  async function loadRsvps(event) {
    setRsvpEvent(event);
    setRsvpLoading(true);
    setView('rsvps');
    const { data } = await supabase.from('event_rsvps').select('*').eq('event_id', event.id).order('created_at', { ascending: false });
    setRsvps(data || []);
    setRsvpLoading(false);
  }

  function resetForm() {
    setForm({ title: '', event_type: 'webinar', description: '', start_date: '', start_time: '18:00', end_date: '', end_time: '19:00', timezone: 'America/Los_Angeles', location_type: 'virtual', virtual_link: '', location_address: '', city: '', state: '', max_attendees: '', registration_required: true, published: false });
    setSaveMsg('');
  }

  function openCreate() { resetForm(); setEditEvent(null); setView('create'); }

  function openEdit(ev) {
    const sd = ev.start_time ? new Date(ev.start_time) : null;
    const ed = ev.end_time ? new Date(ev.end_time) : null;
    setForm({
      title: ev.title || '', event_type: ev.event_type || 'webinar', description: ev.description || '',
      start_date: sd ? sd.toISOString().split('T')[0] : '', start_time: sd ? sd.toTimeString().substring(0, 5) : '18:00',
      end_date: ed ? ed.toISOString().split('T')[0] : '', end_time: ed ? ed.toTimeString().substring(0, 5) : '19:00',
      timezone: ev.timezone || 'America/Los_Angeles',
      location_type: ev.location_type || 'virtual', virtual_link: ev.virtual_link || '',
      location_address: ev.location_address || '', city: ev.city || '', state: ev.state || '',
      max_attendees: ev.max_attendees || '', registration_required: ev.registration_required !== false, published: ev.published || false,
    });
    setEditEvent(ev);
    setSaveMsg('');
    setView('create');
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.title || !form.start_date || !form.start_time) return;
    const endDate = form.end_date || form.start_date;
    const startDT = new Date(`${form.start_date}T${form.start_time}`);
    const endDT = new Date(`${endDate}T${form.end_time || form.start_time}`);
    if (endDT < startDT) { setSaveMsg('End time must be after start time.'); return; }
    if (form.location_type !== 'in_person' && !form.virtual_link?.trim()) { setSaveMsg('Please add a virtual meeting link.'); return; }
    if (form.location_type !== 'virtual' && !form.location_address?.trim()) { setSaveMsg('Please add a location address.'); return; }
    setSaving(true); setSaveMsg('');

    const startISO = `${form.start_date}T${form.start_time}:00`;
    const endDate = form.end_date || form.start_date;
    const endISO = `${endDate}T${form.end_time}:00`;
    const city = form.location_type === 'virtual' ? 'virtual' : (form.city || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const slug = editEvent?.slug || makeSlug(form.title);

    const payload = {
      title: form.title,
      slug,
      event_type: form.event_type,
      description: form.description,
      start_time: startISO,
      end_time: endISO,
      timezone: form.timezone,
      location_type: form.location_type,
      virtual_link: form.location_type !== 'in_person' ? form.virtual_link : null,
      location_address: form.location_type !== 'virtual' ? form.location_address : null,
      city: form.location_type === 'virtual' ? 'virtual' : form.city,
      state: form.location_type === 'virtual' ? null : form.state,
      max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
      registration_required: form.registration_required,
      published: form.published,
      owner_id: userId,
      team_id: profile?.team_id || null,
    };

    let error;
    if (editEvent) {
      ({ error } = await supabase.from('events').update(payload).eq('id', editEvent.id));
    } else {
      ({ error } = await supabase.from('events').insert(payload));
    }

    setSaving(false);
    if (error) { setSaveMsg('Error: ' + error.message); return; }
    setSaveMsg(editEvent ? 'Event updated!' : 'Event created!');
    loadEvents();
    setTimeout(() => setView('list'), 1500);
  }

  function exportCSV() {
    if (!rsvps.length) return;
    const headers = ['Name', 'Email', 'Phone', 'Brokerage', 'Market', 'Registered'];
    const rows = rsvps.map(r => [r.name, r.email, r.phone || '', r.brokerage || '', r.market || '', new Date(r.created_at).toLocaleDateString()]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `rsvps-${rsvpEvent?.slug || 'event'}.csv`; a.click();
  }

  const inp = { width: '100%', padding: '12px 14px', borderRadius: 8, background: T.d, border: `1px solid ${T.b}`, color: T.t, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
  const lbl = { fontSize: 11, color: T.m, fontWeight: 700, letterSpacing: 1, marginBottom: 5, display: 'block' };

  // ===== RSVP VIEW =====
  if (view === 'rsvps' && rsvpEvent) {
    return (
      <div>
        <div onClick={() => setView('list')} style={{ fontSize: 14, color: T.s, cursor: 'pointer', marginBottom: 16 }}>← Back to events</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.t }}>{rsvpEvent.title}</div>
            <div style={{ fontSize: 14, color: T.s }}>{rsvpCounts[rsvpEvent.id] || 0} registrations</div>
          </div>
          <div onClick={exportCSV} style={{ padding: '8px 18px', borderRadius: 8, background: T.a, color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Export CSV</div>
        </div>
        {rsvpLoading ? <div style={{ padding: 40, textAlign: 'center', color: T.s }}>Loading...</div> : rsvps.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: T.m }}>No registrations yet.</div>
        ) : (
          <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr>{['Name', 'Email', 'Phone', 'Brokerage', 'Market', 'Registered'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontSize: 12, fontWeight: 700, color: T.m, letterSpacing: 1, borderBottom: `1px solid ${T.b}`, background: T.side }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {rsvps.map((r, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.b}` }}>
                      <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 600, color: T.t }}>{r.name}</td>
                      <td style={{ padding: '12px 14px', fontSize: 14, color: T.bl }}>{r.email}</td>
                      <td style={{ padding: '12px 14px', fontSize: 14, color: T.s }}>{r.phone || '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 14, color: T.s }}>{r.brokerage || '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 14, color: T.s }}>{r.market || '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: T.m }}>{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== CREATE/EDIT VIEW =====
  if (view === 'create') {
    return (
      <div style={{ maxWidth: 640 }}>
        <div onClick={() => setView('list')} style={{ fontSize: 14, color: T.s, cursor: 'pointer', marginBottom: 16 }}>← Back to events</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.t, marginBottom: 24 }}>{editEvent ? 'Edit Event' : 'Create Event'}</div>

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>EVENT TITLE</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Commission Breakdown Webinar" required style={inp} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={lbl}>EVENT TYPE</label>
              <select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>TIMEZONE</label>
              <select value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace('America/', '').replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>DESCRIPTION</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What will attendees learn or experience?" rows={5} style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div><label style={lbl}>START DATE</label><input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value, end_date: f.end_date || e.target.value }))} required style={inp} /></div>
            <div><label style={lbl}>START TIME</label><input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} required style={inp} /></div>
            <div><label style={lbl}>END DATE</label><input type="date" value={form.end_date || form.start_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} style={inp} /></div>
            <div><label style={lbl}>END TIME</label><input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} style={inp} /></div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>LOCATION TYPE</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['virtual', 'in_person', 'hybrid'].map(lt => (
                <div key={lt} onClick={() => setForm(f => ({ ...f, location_type: lt }))} style={{ padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: form.location_type === lt ? T.am : T.d, color: form.location_type === lt ? T.a : T.s, border: `1px solid ${form.location_type === lt ? T.a + '40' : T.b}` }}>
                  {lt === 'virtual' ? '📹 Virtual' : lt === 'in_person' ? '📍 In-Person' : '🔀 Hybrid'}
                </div>
              ))}
            </div>
          </div>

          {form.location_type !== 'in_person' && (
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>VIRTUAL MEETING LINK</label>
              <input value={form.virtual_link} onChange={e => setForm(f => ({ ...f, virtual_link: e.target.value }))} placeholder="Zoom or Google Meet link" style={inp} />
            </div>
          )}

          {form.location_type !== 'virtual' && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.5fr', gap: 12, marginBottom: 16 }}>
              <div><label style={lbl}>ADDRESS</label><input value={form.location_address} onChange={e => setForm(f => ({ ...f, location_address: e.target.value }))} placeholder="1234 Main St" style={inp} /></div>
              <div><label style={lbl}>CITY</label><input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Fresno" style={inp} /></div>
              <div><label style={lbl}>STATE</label><input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} placeholder="CA" maxLength={2} style={inp} /></div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>MAX ATTENDEES</label>
            <input type="number" value={form.max_attendees} onChange={e => setForm(f => ({ ...f, max_attendees: e.target.value }))} placeholder="Leave blank for unlimited" style={{ ...inp, maxWidth: 200 }} />
          </div>

          <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: T.t }}>
              <input type="checkbox" checked={form.registration_required} onChange={e => setForm(f => ({ ...f, registration_required: e.target.checked }))} style={{ accentColor: T.a, width: 16, height: 16 }} />
              Registration required
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: T.t }}>
              <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} style={{ accentColor: T.a, width: 16, height: 16 }} />
              Published (visible on rkrt.in)
            </label>
          </div>

          {saveMsg && <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14, fontWeight: 600, background: saveMsg.startsWith('Error') ? T.r + '15' : T.a + '15', color: saveMsg.startsWith('Error') ? T.r : T.a }}>{saveMsg}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} style={{ padding: '14px 28px', borderRadius: 10, background: T.a, color: '#000', fontSize: 15, fontWeight: 700, border: 'none', cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : editEvent ? 'Update Event' : 'Create Event'}
            </button>
            <div onClick={() => setView('list')} style={{ padding: '14px 28px', borderRadius: 10, background: T.d, border: `1px solid ${T.b}`, color: T.s, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancel</div>
          </div>
        </form>
      </div>
    );
  }

  // ===== LIST VIEW =====
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.t }}>📅 Your Events</div>
        <div onClick={openCreate} style={{ padding: '10px 20px', borderRadius: 8, background: T.a, color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+ Create Event</div>
      </div>

      {loading ? <div style={{ padding: 60, textAlign: 'center', color: T.s }}>Loading events...</div> : events.length === 0 ? (
        <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 14, padding: '60px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📅</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 8 }}>No events yet</div>
          <div style={{ fontSize: 14, color: T.s, marginBottom: 20 }}>Create your first recruiting event — webinars, networking, workshops.</div>
          <div onClick={openCreate} style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 8, background: T.a, color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Create Event</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {events.map(ev => {
            const color = TYPE_COLORS[ev.event_type] || '#6B7280';
            const isPast = new Date(ev.start_time) < new Date();
            const count = rsvpCounts[ev.id] || 0;
            return (
              <div key={ev.id} style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: '18px 20px', opacity: isPast ? 0.6 : 1 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {ev.event_type === 'webinar' ? '📹' : ev.event_type === 'workshop' ? '🛠️' : ev.event_type === 'networking' ? '🤝' : ev.event_type === 'lunch_learn' ? '☕' : '📅'}
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: T.t }}>{ev.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: color + '18', color, letterSpacing: 0.5 }}>{(TYPE_LABELS[ev.event_type] || 'Event').toUpperCase()}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: ev.published ? T.a + '18' : T.m + '30', color: ev.published ? T.a : T.s }}>{ev.published ? 'PUBLISHED' : 'DRAFT'}</span>
                    </div>
                    <div style={{ fontSize: 13, color: T.s }}>{fmtDate(ev.start_time)}</div>
                    <div style={{ fontSize: 12, color: T.m, marginTop: 2 }}>{ev.location_type === 'virtual' ? '📹 Virtual' : `📍 ${ev.city || ''}, ${ev.state || ''}`} · {count} RSVP{count !== 1 ? 's' : ''}{ev.max_attendees ? ` / ${ev.max_attendees}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                    <div onClick={() => openEdit(ev)} style={{ padding: '7px 14px', borderRadius: 7, background: T.d, border: `1px solid ${T.b}`, color: T.s, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</div>
                    <div onClick={() => loadRsvps(ev)} style={{ padding: '7px 14px', borderRadius: 7, background: T.bl + '15', border: `1px solid ${T.bl}20`, color: T.bl, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>RSVPs ({count})</div>
                    {ev.published && <div onClick={() => window.open(`https://rkrt.in/events/${ev.city || 'virtual'}/${ev.slug}`, '_blank')} style={{ padding: '7px 14px', borderRadius: 7, background: T.a + '15', border: `1px solid ${T.a}20`, color: T.a, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View Page →</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
