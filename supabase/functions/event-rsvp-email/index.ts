import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SEND_EMAIL_URL = `${SUPABASE_URL}/functions/v1/send-email`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { rsvp_id } = await req.json();
    if (!rsvp_id) return new Response(JSON.stringify({ error: "rsvp_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    };

    // Fetch RSVP
    const rsvpRes = await fetch(`${SUPABASE_URL}/rest/v1/event_rsvps?id=eq.${rsvp_id}&select=*`, { headers });
    const rsvps = await rsvpRes.json();
    if (!rsvps?.length) return new Response(JSON.stringify({ error: "RSVP not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const rsvp = rsvps[0];

    // Fetch event
    const eventRes = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${rsvp.event_id}&select=*`, { headers });
    const events = await eventRes.json();
    if (!events?.length) return new Response(JSON.stringify({ error: "Event not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const event = events[0];

    // Fetch host team
    let hostName = "RKRT Intel";
    if (event.team_id) {
      const teamRes = await fetch(`${SUPABASE_URL}/rest/v1/team_blogs?team_id=eq.${event.team_id}&select=name`, { headers });
      const teams = await teamRes.json();
      if (teams?.length) hostName = teams[0].name;
    }

    // Format date/time
    const tz = event.timezone || "America/Los_Angeles";
    const startDate = new Date(event.start_time);
    const dateStr = startDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: tz });
    const timeStr = startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
    let endTimeStr = "";
    if (event.end_time) {
      endTimeStr = " – " + new Date(event.end_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
    }
    const tzLabel = tz.split("/").pop()?.replace(/_/g, " ") || tz;

    // Location
    const isVirtual = event.location_type === "virtual";
    const locationStr = isVirtual ? "Virtual Event" : (event.location_address || `${event.city || ""}, ${event.state || ""}`);
    const meetingLink = isVirtual ? (event.virtual_link || "") : "";

    // Google Calendar link
    const toGcal = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const gcalStart = toGcal(event.start_time);
    const gcalEnd = event.end_time ? toGcal(event.end_time) : gcalStart;
    const gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${gcalStart}/${gcalEnd}&details=${encodeURIComponent((event.description || "").replace(/<[^>]+>/g, "").substring(0, 500))}&location=${encodeURIComponent(locationStr)}`;

    const eventUrl = `https://rkrt.in/events/${event.city || "virtual"}/${event.slug}`;

    // Build email HTML
    const emailHtml = `
<div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#333;">
  <div style="background:#0B1120;padding:32px 30px;text-align:center;border-radius:12px 12px 0 0;">
    <div style="color:#10B981;font-size:28px;margin-bottom:4px;">✓</div>
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">You're registered!</h1>
    <p style="color:#94A3B8;margin:8px 0 0;font-size:14px;">Hosted by ${hostName}</p>
  </div>
  <div style="background:#ffffff;padding:28px 30px;border:1px solid #e5e7eb;border-top:none;">
    <h2 style="margin:0 0 18px;font-size:19px;color:#111;line-height:1.3;">${event.title}</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:6px 0;font-size:14px;color:#666;width:30px;vertical-align:top;">📅</td><td style="padding:6px 0;font-size:14px;color:#111;"><strong>${dateStr}</strong></td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#666;vertical-align:top;">🕐</td><td style="padding:6px 0;font-size:14px;color:#111;"><strong>${timeStr}${endTimeStr}</strong> ${tzLabel}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#666;vertical-align:top;">${isVirtual ? "📹" : "📍"}</td><td style="padding:6px 0;font-size:14px;color:#111;">${locationStr}</td></tr>
    </table>
    ${meetingLink ? `
    <div style="background:#064E3B;padding:18px 20px;border-radius:8px;margin:20px 0;text-align:center;">
      <div style="color:#94A3B8;font-size:12px;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Your meeting link</div>
      <a href="${meetingLink}" style="color:#10B981;font-size:15px;font-weight:700;text-decoration:none;word-break:break-all;">${meetingLink}</a>
      <div style="color:#64748B;font-size:11px;margin-top:6px;">This link will be active at event start time.</div>
    </div>
    ` : ""}
    <div style="margin:22px 0;text-align:center;">
      <a href="${gcalLink}" style="display:inline-block;background:#10B981;color:#fff;padding:12px 28px;border-radius:7px;text-decoration:none;font-weight:700;font-size:14px;">Add to Google Calendar</a>
    </div>
    <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:20px;text-align:center;">
      <a href="${eventUrl}" style="color:#10B981;font-size:13px;text-decoration:none;font-weight:600;">View event page →</a>
      <span style="color:#ccc;margin:0 8px;">·</span>
      <a href="https://rkrt.in/events" style="color:#10B981;font-size:13px;text-decoration:none;">Browse more events</a>
    </div>
  </div>
  <div style="text-align:center;padding:16px;font-size:11px;color:#999;">
    Powered by <a href="https://rkrt.in" style="color:#10B981;text-decoration:none;">RKRT.in</a> · Real Estate Recruiting Intelligence
  </div>
</div>`;

    // Send via existing send-email function
    const sendRes = await fetch(SEND_EMAIL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "event_confirmation",
        to: rsvp.email,
        subject: `You're registered: ${event.title}`,
        body: emailHtml,
        is_html: true,
      }),
    });

    let sendResult: Record<string, unknown> = {};
    try { sendResult = await sendRes.json(); } catch { /* ignore */ }

    // Update RSVP status
    await fetch(`${SUPABASE_URL}/rest/v1/event_rsvps?id=eq.${rsvp_id}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ status: "confirmed" }),
    });

    console.log(`✅ Event RSVP email sent to ${rsvp.email} for "${event.title}"`);

    return new Response(JSON.stringify({ success: true, email: rsvp.email, ...sendResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Event RSVP email error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
