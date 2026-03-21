import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured")

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("No auth header")

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))
    if (authError || !user) throw new Error("Not authenticated")

    const { priceId, plan, mode } = await req.json()
    if (!priceId) throw new Error("No priceId provided")

    const params = new URLSearchParams()
    params.append("customer_email", user.email!)
    params.append("line_items[0][price]", priceId)
    params.append("line_items[0][quantity]", "1")
    params.append("mode", mode || "subscription")
    params.append("subscription_data[trial_period_days]", "7")
    params.append("payment_method_collection", "always")
    params.append("success_url", `${req.headers.get("origin") || "https://app.rkrt.in"}/?upgraded=true`)
    params.append("cancel_url", `${req.headers.get("origin") || "https://app.rkrt.in"}/?canceled=true`)
    params.append("metadata[user_id]", user.id)
    params.append("metadata[plan]", plan || "recruiter")

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    })

    const session = await response.json()

    if (!response.ok) {
      console.error("Stripe error:", JSON.stringify(session))
      throw new Error(session.error?.message || "Stripe checkout failed")
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("Checkout error:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
