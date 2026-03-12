import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    console.log("📧 Resend webhook received:", JSON.stringify(body).slice(0, 500));

    // Resend sends events in this format:
    // { type: "email.delivered", created_at: "...", data: { email_id: "...", to: [...], subject: "...", ... } }
    const eventType = body.type;       // e.g. "email.delivered", "email.opened", "email.clicked"
    const data = body.data || {};
    const resendEmailId = data.email_id;
    const toEmail = Array.isArray(data.to) ? data.to[0] : data.to;
    const subject = data.subject || null;
    const clickUrl = data.click?.url || null;
    const createdAt = body.created_at || data.created_at || new Date().toISOString();

    if (!resendEmailId) {
      console.log("⚠️ No email_id in webhook payload, skipping");
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map Resend event types to our internal types
    const eventMap = {
      "email.sent": "email_sent",
      "email.delivered": "email_delivered",
      "email.delivery_delayed": "email_delayed",
      "email.bounced": "email_bounced",
      "email.complained": "email_complained",
      "email.opened": "email_opened",
      "email.clicked": "email_clicked",
    };

    const internalEventType = eventMap[eventType] || eventType;

    // Look up the email_log record by resend_id to get email_log_id, user_id, lead_id
    const { data: emailLog } = await supabase
      .from("email_log")
      .select("id, user_id, lead_id, email_type")
      .eq("resend_id", resendEmailId)
      .maybeSingle();

    const emailLogId = emailLog?.id || null;
    const userId = emailLog?.user_id || null;
    const leadId = emailLog?.lead_id || null;

    // Insert tracking record
    const { error: trackError } = await supabase.from("email_tracking").insert({
      resend_id: resendEmailId,
      email_log_id: emailLogId,
      lead_id: leadId,
      user_id: userId,
      event_type: internalEventType,
      metadata: {
        to: toEmail,
        subject: subject,
        click_url: clickUrl,
        raw_event: eventType,
        created_at_resend: createdAt,
        email_type: emailLog?.email_type || null,
      },
    });

    if (trackError) {
      console.error("❌ Insert email_tracking error:", trackError);
    } else {
      console.log(`✅ Tracked: ${internalEventType} for ${toEmail} (resend: ${resendEmailId})`);
    }

    // Update email_log status based on event
    if (emailLogId) {
      const statusMap = {
        "email_delivered": "delivered",
        "email_bounced": "bounced",
        "email_complained": "complained",
        "email_opened": "opened",
        "email_clicked": "clicked",
      };
      const newStatus = statusMap[internalEventType];
      if (newStatus) {
        // Only upgrade status, never downgrade (clicked > opened > delivered > sent)
        const statusRank = { sent: 0, delivered: 1, opened: 2, clicked: 3, bounced: -1, complained: -2 };
        const { data: currentLog } = await supabase
          .from("email_log")
          .select("status")
          .eq("id", emailLogId)
          .single();
        
        const currentRank = statusRank[currentLog?.status] ?? -99;
        const newRank = statusRank[newStatus] ?? -99;
        
        if (newRank > currentRank || newRank < 0) {
          await supabase
            .from("email_log")
            .update({ status: newStatus })
            .eq("id", emailLogId);
          console.log(`📝 Updated email_log ${emailLogId} status: ${newStatus}`);
        }
      }
    }

    // Feed into lead scoring for engagement events
    if (leadId && userId) {
      const scoreMap = {
        "email_opened": { event: "email_open", score: 5 },
        "email_clicked": { event: "email_click", score: 15 },
      };
      const scoreEntry = scoreMap[internalEventType];
      if (scoreEntry) {
        // Insert lead event for scoring
        const { error: eventError } = await supabase.from("lead_events").insert({
          lead_id: leadId,
          user_id: userId,
          event_type: scoreEntry.event,
          score_delta: scoreEntry.score,
          metadata: {
            resend_id: resendEmailId,
            subject: subject,
            click_url: clickUrl,
          },
        });

        if (!eventError) {
          // Update lead interest_score
          const { data: lead } = await supabase
            .from("leads")
            .select("interest_score, heat_level, peak_score")
            .eq("id", leadId)
            .single();

          if (lead) {
            const newScore = (lead.interest_score || 0) + scoreEntry.score;
            const newHeatLevel = newScore >= 80 ? "on_fire" 
              : newScore >= 60 ? "hot" 
              : newScore >= 40 ? "interested" 
              : newScore >= 20 ? "warming" 
              : "cold";
            
            const oldHeatLevel = lead.heat_level;
            const peakScore = Math.max(lead.peak_score || 0, newScore);

            await supabase
              .from("leads")
              .update({ 
                interest_score: newScore, 
                heat_level: newHeatLevel,
                peak_score: peakScore,
              })
              .eq("id", leadId);

            console.log(`🔥 Lead ${leadId} score: ${lead.interest_score} → ${newScore} (${newHeatLevel})`);

            // If heat level jumped, create an alert
            const heatRank = { cold: 0, warming: 1, interested: 2, hot: 3, on_fire: 4 };
            if ((heatRank[newHeatLevel] || 0) > (heatRank[oldHeatLevel] || 0)) {
              await supabase.from("lead_events").insert({
                lead_id: leadId,
                user_id: userId,
                event_type: "heat_level_jump",
                score_delta: 0,
                metadata: {
                  from: oldHeatLevel,
                  to: newHeatLevel,
                  trigger: internalEventType,
                },
              });
              console.log(`⚡ Heat level jump: ${oldHeatLevel} → ${newHeatLevel}`);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, event: internalEventType, resend_id: resendEmailId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
