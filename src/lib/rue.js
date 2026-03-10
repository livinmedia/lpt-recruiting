// RKRT.in Rue AI Configuration
// Rue system prompt and API helpers

export const RUE_SYSTEM_PROMPT = `You are RUE, an elite AI recruiting assistant for real estate team leaders and brokers, powered by RKRT.

You help them recruit real estate agents to their brokerage or team. You seamlessly handle all aspects of the recruiting process:

LEAD INTELLIGENCE: Research target agents — their production volume, brokerage history, social presence, reviews, license status. Identify who's likely to switch and why.

OUTREACH & FOLLOW-UP: Draft personalized recruiting messages (text, email, DM, LinkedIn, video scripts). Create multi-touch nurture sequences. Track who needs follow-up.

OBJECTION HANDLING: Handle common objections like "I'm happy where I am," "what's your split," "I don't want to pay fees." Provide scripts and role-play.

CONTENT & MARKETING: Create recruiting-focused social media content, video scripts for attracting agents, market reports, and value propositions. Make them look like the obvious choice.

PIPELINE MANAGEMENT: Track recruiting pipeline stages (new → researched → outreach → meeting → talking → recruited). Prioritize who to contact based on urgency and fit.

COMPETITIVE INTEL: Analyze competitor brokerages — their splits, fees, culture, weaknesses. Position our offer against theirs.

ACCOUNTABILITY: Daily recruiting activity check-ins. Track calls made, messages sent, meetings booked. Hold them to their recruiting goals.

PERSONALITY:
- Direct and actionable — no fluff
- Proactive — suggest who to call and what to say without being asked
- Confident like a top recruiter — you know how to close
- Short paragraphs, not walls of text
- 3-5 items max in any list
- Always end with a clear next action
- Reference their pipeline data when available
- When drafting messages, make them personal and specific — never generic

You are their unfair advantage in recruiting. Act like it.`;

/**
 * Build system prompt with user context
 */
export function buildRueSystemPrompt(profile, leads = []) {
  let sys = RUE_SYSTEM_PROMPT;

  if (profile?.brokerage) {
    sys += `\n\nUser's brokerage: ${profile.brokerage}. Market: ${profile.market || "not set"}.`;
  }

  if (leads.length > 0) {
    sys += `\n\nPIPELINE (${leads.length} leads):\n`;
    sys += leads
      .slice(0, 10)
      .map(
        (l) =>
          `- ${l.first_name} ${l.last_name} | ${l.market} | ${l.brokerage?.substring(0, 20) || "?"} | ${l.tier} | ${l.urgency} | ${l.pipeline_stage}`
      )
      .join("\n");
    sys += `\n\nAd spend: $20/day Facebook/Instagram for recruiting.`;
  }

  return sys;
}

/**
 * Call Rue AI via OpenRouter
 */
export async function askRue(question, profile, leads = []) {
  const sys = buildRueSystemPrompt(profile, leads);

  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_KEY || ""}`,
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat-v3-0324",
        max_tokens: 1500,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: question },
        ],
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("Rue API error:", r.status, err);
      return `API error ${r.status} — check your OpenRouter key in Vercel env vars.`;
    }

    const d = await r.json();
    return d.choices?.[0]?.message?.content || "No response.";
  } catch (e) {
    console.error("Rue connection error:", e);
    return "Connection error.";
  }
}

/**
 * Get suggested action for a lead based on stage
 */
export function getStageAction(lead) {
  const s = lead.pipeline_stage;

  if (s === "researched") {
    return {
      label: "Draft Outreach",
      icon: "📱",
      q: `Draft a personalized recruiting message to ${lead.first_name} ${lead.last_name}. They're at ${lead.brokerage || "unknown brokerage"} in ${lead.market || "unknown market"}.${lead.outreach_angle ? " Angle: " + lead.outreach_angle : ""}`,
    };
  }

  if (s === "outreach_sent") {
    return {
      label: "Follow Up",
      icon: "🔄",
      q: `Write a follow-up message to ${lead.first_name} ${lead.last_name}. I already sent initial outreach. Make it casual and value-driven.`,
    };
  }

  if (s === "meeting_booked") {
    return {
      label: "Prep Sheet",
      icon: "📋",
      q: `Create a meeting prep sheet for my call with ${lead.first_name} ${lead.last_name}. They're at ${lead.brokerage || "unknown"} in ${lead.market || "unknown"}. ${lead.tier || ""} tier. Include talking points, their likely objections, and how to close.`,
    };
  }

  if (s === "in_conversation") {
    return {
      label: "Close Script",
      icon: "🎯",
      q: `Give me a closing script for ${lead.first_name} ${lead.last_name}. We've been talking and I need to move them to a decision.`,
    };
  }

  if (s === "new") {
    return {
      label: "Research",
      icon: "🔍",
      q: `Research ${lead.first_name} ${lead.last_name} in ${lead.market || "their market"}. Find their production, reviews, social media, and give me an outreach angle.`,
    };
  }

  return null;
}

export default askRue;
