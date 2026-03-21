import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts"

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const body = await req.text()
    const sig = req.headers.get("stripe-signature")
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")

    // Simple signature verification
    if (webhookSecret && sig) {
      const elements = sig.split(",")
      const timestamp = elements.find(e => e.startsWith("t="))?.split("=")[1]
      const signature = elements.find(e => e.startsWith("v1="))?.split("=")[1]
      if (timestamp && signature) {
        const payload = `${timestamp}.${body}`
        const expected = hmac("sha256", webhookSecret, payload, "utf8", "hex")
        if (expected !== signature) {
          console.error("Webhook signature mismatch")
          return new Response("Invalid signature", { status: 400 })
        }
      }
    }

    const event = JSON.parse(body)

    if (event.type === "checkout.session.completed") {
      const session = event.data.object
      const userId = session.metadata?.user_id
      const plan = session.metadata?.plan || "recruiter"

      if (userId) {
        // Check if this is a credit purchase (mode=payment) or subscription
        if (session.mode === "payment") {
          // Credit pack fulfillment
          const creditMap: Record<string, number> = {
            "price_1TBzqwLUyw8VkDG8ybG9deHo": 50,
            "price_1TBzqxLUyw8VkDG8RDQNXLj6": 200,
            "price_1TBzqxLUyw8VkDG8hODfUyyk": 500,
          }
          const lineItem = session.line_items?.data?.[0]?.price?.id || session.metadata?.priceId
          const credits = creditMap[lineItem] || 0
          if (credits > 0) {
            await supabase.rpc("increment_credits", { user_id_param: userId, amount: credits })
            console.log(`Added ${credits} credits for user ${userId}`)
          }
        } else {
          // Subscription activation
          const { error } = await supabase
            .from("profiles")
            .update({
              plan: plan,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              plan_activated_at: new Date().toISOString(),
              is_trial: true,
              trial_started_at: new Date().toISOString(),
              trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq("id", userId)

          if (error) console.error("Profile update error:", error)
          else console.log(`Activated ${plan} for user ${userId}`)
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_subscription_id", subscription.id)
        .limit(1)

      if (profiles && profiles.length > 0) {
        await supabase
          .from("profiles")
          .update({ plan: "free", stripe_subscription_id: null })
          .eq("id", profiles[0].id)
        console.log(`Downgraded user ${profiles[0].id} to free`)
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("Webhook error:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }
})
