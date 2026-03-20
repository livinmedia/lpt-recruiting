import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() })
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const body = await req.text()
    const sig = req.headers.get("stripe-signature")
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")

    let event
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } else {
      event = JSON.parse(body)
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object
      const userId = session.metadata?.user_id
      const plan = session.metadata?.plan
      const mode = session.metadata?.mode || "subscription"

      if (userId && mode === "subscription" && plan) {
        const { error } = await supabase
          .from("profiles")
          .update({
            plan: plan,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            plan_activated_at: new Date().toISOString(),
          })
          .eq("id", userId)

        if (error) console.error("Profile update error:", error)
        else console.log(`Activated ${plan} for user ${userId}`)
      }

      if (userId && mode === "payment") {
        // Credit pack purchase — add credits based on price
        const CREDIT_AMOUNTS: Record<string, number> = {
          "price_1TBzqwLUyw8VkDG8ybG9deHo": 50,
          "price_1TBzqxLUyw8VkDG8RDQNXLj6": 200,
          "price_1TBzqxLUyw8VkDG8hODfUyyk": 500,
        }
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 })
        const priceId = lineItems.data[0]?.price?.id
        const creditsToAdd = priceId ? (CREDIT_AMOUNTS[priceId] || 0) : 0

        if (creditsToAdd > 0) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("enrichment_credits")
            .eq("id", userId)
            .single()
          const current = profile?.enrichment_credits || 0
          const { error } = await supabase
            .from("profiles")
            .update({
              enrichment_credits: current + creditsToAdd,
              stripe_customer_id: session.customer,
            })
            .eq("id", userId)
          if (error) console.error("Credit update error:", error)
          else console.log(`Added ${creditsToAdd} credits for user ${userId}`)
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
    console.error("Webhook error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }
})
