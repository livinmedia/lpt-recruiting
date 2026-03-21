import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY") || ""
const MODEL = "deepseek/deepseek-chat-v3-0324"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { system, messages, user_id, conversation_id } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Build OpenRouter messages array
    const orMessages: { role: string; content: string }[] = []

    if (system) {
      orMessages.push({ role: "system", content: String(system) })
    }

    for (const msg of messages) {
      orMessages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: String(msg.content || ""),
      })
    }

    // Call OpenRouter
    const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        messages: orMessages,
      }),
    })

    if (!orResponse.ok) {
      const errText = await orResponse.text()
      console.error("OpenRouter error:", orResponse.status, errText)
      return new Response(JSON.stringify({ error: `AI error: ${orResponse.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const orData = await orResponse.json()
    const content = orData.choices?.[0]?.message?.content || "I hit a snag — please try again."
    const model = orData.model || MODEL

    // Log conversation to Supabase (best-effort)
    let convId = conversation_id || null
    try {
      if (user_id) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )

        if (!convId) {
          const { data: newConv } = await supabase
            .from("rue_conversations")
            .insert({ user_id, started_at: new Date().toISOString() })
            .select("id")
            .single()
          if (newConv) convId = newConv.id
        }

        if (convId) {
          const lastUserMsg = messages.filter((m: any) => m.role === "user").pop()
          await supabase.from("rue_messages").insert([
            { conversation_id: convId, role: "user", content: lastUserMsg?.content || "", created_at: new Date().toISOString() },
            { conversation_id: convId, role: "assistant", content, created_at: new Date().toISOString() },
          ])
        }
      }
    } catch (logErr) {
      console.warn("Conversation logging failed:", logErr)
    }

    return new Response(JSON.stringify({ content, conversation_id: convId, model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("rue-chat error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
