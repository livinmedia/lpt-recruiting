// RKRT.in Supabase Client
// Centralized Supabase configuration

import { createClient } from "@supabase/supabase-js";

// Supabase configuration
export const SUPABASE_URL = "https://usknntguurefeyzusbdh.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVza25udGd1dXJlZmV5enVzYmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MTcwODAsImV4cCI6MjA4Nzk5MzA4MH0.pxexo90zyugIA4pPzLonGo3E1frr8bSZvz-XT7BmuqQ";

// REST API endpoint for direct queries
export const RUE_SUPA = `${SUPABASE_URL}/rest/v1`;
export const RUE_KEY = SUPABASE_ANON_KEY;

// Create the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper for REST API calls with headers
export const supabaseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

/**
 * Log user activity
 */
export async function logActivity(userId, action, metadata = {}) {
  if (!userId) return;
  try {
    await supabase.from("user_activity").insert({
      user_id: userId,
      action,
      metadata,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    // Silent fail - activity logging shouldn't break the app
    console.warn("Activity log failed:", e);
  }
}

/**
 * Start Stripe checkout
 */
export async function startCheckout(userId, email) {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        email: email,
        success_url: `${window.location.origin}?upgraded=true`,
        cancel_url: `${window.location.origin}?cancelled=true`,
      }),
    });
    const data = await r.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Could not start checkout. Please try again.");
    }
  } catch (e) {
    alert("Checkout error. Please try again.");
  }
}

/**
 * Search agents in directory
 */
export async function agentSearch({
  state,
  brokerage,
  name,
  city,
  newDays,
  limit = 50,
  offset = 0,
} = {}) {
  let params = [];

  if (state) params.push(`state=eq.${state}`);
  if (brokerage) params.push(`brokerage_name=ilike.%25${encodeURIComponent(brokerage)}%25`);
  if (name) params.push(`full_name=ilike.%25${encodeURIComponent(name)}%25`);
  if (city) params.push(`city=ilike.%25${encodeURIComponent(city)}%25`);

  if (newDays) {
    const d = new Date();
    d.setDate(d.getDate() - newDays);
    params.push(`original_license_date=gte.${d.toISOString().split("T")[0]}`);
    params.push(`order=original_license_date.desc`);
  } else {
    params.push(`order=full_name.asc`);
  }

  params.push(`limit=${limit}`);
  params.push(`offset=${offset}`);
  params.push(
    `select=id,state,license_number,license_type,full_name,first_name,last_name,license_status,brokerage_name,brokerage_license,city,county,address,license_expiration,original_license_date,phone,email`
  );

  try {
    const url = `${RUE_SUPA}/agent_directory?${params.join("&")}`;
    const r = await fetch(url, {
      headers: {
        ...supabaseHeaders,
        Prefer: "count=exact",
      },
    });

    if (!r.ok) {
      console.error("Agent search HTTP error:", r.status, await r.text());
      return { data: [], total: 0 };
    }

    const total = parseInt(r.headers.get("content-range")?.split("/")?.[1] || "0");
    const data = await r.json();
    return { data: Array.isArray(data) ? data : [], total };
  } catch (e) {
    console.error("Agent search error:", e);
    return { data: [], total: 0 };
  }
}

export default supabase;
