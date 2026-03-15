// RKRT.in Public Booking Page
// No auth required — accessible at /book/:slug

import { useState, useEffect } from 'react';

const T = {
  bg: "#0D1117", card: "#161B22", b: "#21262D", t: "#F0F6FC",
  s: "#8B949E", m: "#6E7681", a: "#00B386", d: "#0D1117",
  bl: "#58A6FF", r: "#F85149",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function BookingPage({ slug }) {
  const [avail, setAvail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // Booking form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookError, setBookError] = useState("");

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://usknntguurefeyzusbdh.supabase.co/functions/v1/get-availability?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) { setError("Booking page not found."); setLoading(false); return; }
        const data = await res.json();
        setAvail(data);
      } catch {
        setError("Unable to load booking page.");
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", color: T.s, fontSize: 16, fontFamily: "'SF Pro Display',-apple-system,sans-serif" }}>
        Loading...
      </div>
    );
  }

  if (error || !avail) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'SF Pro Display',-apple-system,sans-serif" }}>
        <div style={{ textAlign: "center", color: T.s }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.t, marginBottom: 8 }}>{error || "Page not found"}</div>
          <div style={{ fontSize: 14 }}>This booking link may be invalid or inactive.</div>
        </div>
      </div>
    );
  }

  const recruiter = avail.recruiter || {};
  const availability = avail.availability || {};
  const availableDays = availability.available_days || [1, 2, 3, 4, 5];
  const startHour = availability.start_hour || 9;
  const endHour = availability.end_hour || 17;
  const slotDuration = availability.slot_duration || 30;
  const meetingType = availability.meeting_type || "video";
  const bookedSlots = avail.booked_slots || [];

  // Calendar generation
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isAvailableDate = (day) => {
    const date = new Date(calYear, calMonth, day);
    if (date < today) return false;
    return availableDays.includes(date.getDay());
  };

  // Generate time slots for selected date
  const getTimeSlots = () => {
    if (!selectedDate) return [];
    const slots = [];
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`;
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += slotDuration) {
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const slotKey = `${dateStr}T${timeStr}`;
        const isBooked = bookedSlots.some(b => b.startsWith(slotKey));
        if (!isBooked) {
          const label = `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
          slots.push({ time: timeStr, label, key: slotKey });
        }
      }
    }
    return slots;
  };

  const handleBook = async () => {
    if (!name.trim() || !email.trim() || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    setBookError("");
    try {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`;
      const res = await fetch("https://usknntguurefeyzusbdh.supabase.co/functions/v1/book-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          date: dateStr,
          time: selectedTime,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          notes: notes.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setBookError(err.error || "Booking failed. Please try again.");
      } else {
        setBooked(true);
      }
    } catch {
      setBookError("Network error. Please try again.");
    }
    setSubmitting(false);
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
    setSelectedDate(null); setSelectedTime(null);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
    setSelectedDate(null); setSelectedTime(null);
  };

  const timeSlots = getTimeSlots();

  // Booked confirmation
  if (booked) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'SF Pro Display',-apple-system,sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 500, padding: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.t, marginBottom: 12 }}>You're booked!</div>
          <div style={{ fontSize: 15, color: T.s, lineHeight: 1.7, marginBottom: 20 }}>
            Your meeting with <strong style={{ color: T.t }}>{recruiter.display_name || recruiter.full_name}</strong> is confirmed.
            You'll receive a confirmation email at <strong style={{ color: T.t }}>{email}</strong>.
          </div>
          {availability.confirmation_message && (
            <div style={{ padding: "16px 20px", background: T.card, border: `1px solid ${T.b}`, borderRadius: 10, fontSize: 14, color: T.s, lineHeight: 1.7 }}>
              {availability.confirmation_message}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'SF Pro Display',-apple-system,sans-serif", color: T.t }}>
      <style>{`input:focus { border-color: ${T.a} !important; outline: none; } textarea:focus { border-color: ${T.a} !important; outline: none; }`}</style>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${T.b}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.a }}>RKRT<span style={{ color: T.t }}>.in</span></div>
        <div style={{ fontSize: 12, color: T.m }}>Powered by RKRT</div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px", display: "flex", gap: 32, flexWrap: "wrap" }}>
        {/* Left — Recruiter Info */}
        <div style={{ flex: "0 0 280px", minWidth: 260 }}>
          <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: 24, position: "sticky", top: 24 }}>
            {recruiter.avatar_url && (
              <img src={recruiter.avatar_url} alt="" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: `3px solid ${T.a}`, marginBottom: 16 }} />
            )}
            <div style={{ fontSize: 20, fontWeight: 800, color: T.t, marginBottom: 4 }}>{recruiter.display_name || recruiter.full_name || "Recruiter"}</div>
            {recruiter.title && <div style={{ fontSize: 13, color: T.s, marginBottom: 4 }}>{recruiter.title}</div>}
            {recruiter.brokerage && <div style={{ fontSize: 13, color: T.m, marginBottom: 16 }}>{recruiter.brokerage}</div>}

            <div style={{ padding: "12px 16px", background: T.bg, borderRadius: 8, border: `1px solid ${T.b}` }}>
              <div style={{ fontSize: 11, color: T.m, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>MEETING DETAILS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 13, color: T.s }}>⏱ {slotDuration} minutes</div>
                <div style={{ fontSize: 13, color: T.s }}>
                  {meetingType === "video" ? "📹 Video Call" : meetingType === "phone" ? "📞 Phone Call" : "🏢 In Person"}
                </div>
                {availability.timezone && <div style={{ fontSize: 13, color: T.s }}>🌍 {availability.timezone.replace("America/", "").replace("Pacific/", "").replace(/_/g, " ")}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Right — Calendar + Form */}
        <div style={{ flex: 1, minWidth: 300 }}>
          {/* Calendar */}
          <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div onClick={prevMonth} style={{ cursor: "pointer", color: T.s, fontSize: 18, padding: "4px 8px" }}>‹</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.t }}>{MONTHS[calMonth]} {calYear}</div>
              <div onClick={nextMonth} style={{ cursor: "pointer", color: T.s, fontSize: 18, padding: "4px 8px" }}>›</div>
            </div>

            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
              {DAYS.map(d => (
                <div key={d} style={{ textAlign: "center", fontSize: 11, color: T.m, fontWeight: 700, padding: 6 }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const available = isAvailableDate(day);
                const selected = selectedDate === day;
                return (
                  <div
                    key={day}
                    onClick={() => { if (available) { setSelectedDate(day); setSelectedTime(null); } }}
                    style={{
                      textAlign: "center", padding: "10px 0", borderRadius: 8, fontSize: 14, fontWeight: 600,
                      cursor: available ? "pointer" : "default",
                      background: selected ? T.a : available ? "transparent" : "transparent",
                      color: selected ? "#000" : available ? T.t : T.m + "60",
                      border: selected ? `2px solid ${T.a}` : available ? `1px solid ${T.b}` : "1px solid transparent",
                    }}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.t, marginBottom: 14 }}>
                {MONTHS[calMonth]} {selectedDate}, {calYear}
              </div>
              {timeSlots.length === 0 ? (
                <div style={{ fontSize: 13, color: T.m }}>No available slots on this date.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
                  {timeSlots.map(slot => (
                    <div
                      key={slot.key}
                      onClick={() => setSelectedTime(slot.time)}
                      style={{
                        padding: "10px 8px", borderRadius: 8, textAlign: "center", fontSize: 13, fontWeight: 600, cursor: "pointer",
                        background: selectedTime === slot.time ? T.a + "20" : "transparent",
                        border: `1px solid ${selectedTime === slot.time ? T.a : T.b}`,
                        color: selectedTime === slot.time ? T.a : T.s,
                      }}
                    >
                      {slot.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Booking Form */}
          {selectedTime && (
            <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.t, marginBottom: 16 }}>Your Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: T.m, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>NAME *</div>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: T.bg, border: `1px solid ${T.b}`, color: T.t, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.m, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>EMAIL *</div>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="your@email.com" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: T.bg, border: `1px solid ${T.b}`, color: T.t, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.m, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>PHONE</div>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(optional)" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: T.bg, border: `1px solid ${T.b}`, color: T.t, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.m, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>NOTES</div>
                  <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything to share (optional)" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: T.bg, border: `1px solid ${T.b}`, color: T.t, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              </div>
              {bookError && <div style={{ marginTop: 12, fontSize: 13, color: T.r, fontWeight: 600 }}>{bookError}</div>}
              <div
                onClick={() => !submitting && name.trim() && email.trim() && handleBook()}
                style={{
                  marginTop: 20, padding: "14px 24px", borderRadius: 10, textAlign: "center", fontSize: 15, fontWeight: 800, cursor: name.trim() && email.trim() && !submitting ? "pointer" : "default",
                  background: name.trim() && email.trim() && !submitting ? T.a : "#333",
                  color: name.trim() && email.trim() && !submitting ? "#000" : T.m,
                }}
              >
                {submitting ? "Booking..." : "Confirm Booking"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
