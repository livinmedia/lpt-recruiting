import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENROUTER_KEY = "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";
const GEMINI_KEY = "AIzaSyCJSj9oebEZLGkgn0HgyylbEmmoDxjC3wc";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BROKERAGE_PROFILES: Record<string, { strengths: string; culture: string; ideal_for: string }> = {
  "lpt-realty": {
    strengths: "90/10 commission splits with a $10k annual cap, $0 desk fees, $0 monthly fees, cutting-edge LIVI AI tools for lead gen and marketing, 5-tier revenue share program, cloud-based model available in all 50 states, stock incentive program, full broker support",
    culture: "Tech-forward, agent-centric cloud brokerage that prioritizes agent profitability and innovation. Founded by agents who were frustrated with traditional brokerage models.",
    ideal_for: "Tech-savvy agents who want maximum take-home pay, AI-powered tools, and a modern cloud brokerage with strong revenue share"
  },
  "exp-realty": {
    strengths: "80/20 commission splits with $16k annual cap, cloud-based model in all 50 states and 24 countries, innovative revenue share program, eXp stock awards and ESPP, eXp World virtual campus for collaboration, Virbela-powered metaverse office, mentor-mentee program",
    culture: "Pioneer of the cloud brokerage model with a collaborative agent community. Strong emphasis on agent ownership through stock and revenue share. Vibrant virtual culture with weekly masterminds and training events.",
    ideal_for: "Agents who value community, want equity in their brokerage, and thrive in a tech-enabled virtual environment with global reach"
  },
  "keller-williams": {
    strengths: "Industry-leading training programs (BOLD, MAPS coaching, KW LABS), profit share model, KW Command technology platform, massive agent network and referral opportunities, strong brand recognition, team-building infrastructure, wealth-building through profit share",
    culture: "Training-first culture built on Gary Keller's models and systems. Emphasis on agent education, productivity coaching, and building businesses within the business. Strong local market center communities.",
    ideal_for: "Agents who prioritize world-class training, proven systems, coaching culture, and want to build wealth through profit share and team building"
  },
  "remax": {
    strengths: "Strongest brand recognition in real estate (balloon logo known worldwide), 100% commission plans available, global referral network spanning 110+ countries, agent autonomy and entrepreneurial freedom, premium marketing tools and brand equity, established reputation with consumers",
    culture: "Entrepreneurial culture that attracts top-producing, self-motivated agents. RE/MAX agents consistently outproduce the industry average. The brand carries instant credibility with buyers and sellers.",
    ideal_for: "Top-producing agents who want maximum brand recognition, global reach, agent independence, and the credibility of the most recognized name in real estate"
  }
};

async function generateImage(prompt: string): Promise<string | null> {
  const p = `Professional real estate recruiting blog header image. ${prompt}. Photorealistic, modern, cinematic lighting, dark moody background, vibrant green accents. No text or words in the image.`;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: p }] }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`Gemini image ${res.status}:`, err.substring(0, 300));
      return null;
    }

    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
        console.log("Gemini image generated ok");
        return part.inlineData.data;
      }
    }
    console.error("Gemini no image in response:", JSON.stringify(data).substring(0, 300));
    return null;
  } catch (e) {
    console.error("Gemini image ex:", (e as Error).message);
    return null;
  }
}

async function uploadImage(supabase: any, b64: string, fname: string): Promise<string | null> {
  try {
    const bs = atob(b64);
    const bytes = new Uint8Array(bs.length);
    for (let i = 0; i < bs.length; i++) bytes[i] = bs.charCodeAt(i);

    const { error } = await supabase.storage
      .from("brokerage-images")
      .upload(fname, bytes.buffer, { contentType: "image/png", upsert: true });
    if (error) {
      console.error("upload:", error.message);
      return null;
    }
    return supabase.storage.from("brokerage-images").getPublicUrl(fname).data?.publicUrl || null;
  } catch (e) {
    console.error("upload ex:", (e as Error).message);
    return null;
  }
}

function buildPrompt(brokerage: { name: string; slug: string }): string {
  const profile = BROKERAGE_PROFILES[brokerage.slug];
  if (!profile) {
    return `You are a real estate content strategist. Generate 2 blog posts about ${brokerage.name} that highlight why agents thrive at this brokerage. The tone should be positive, educational, and informative — showcasing the brokerage's strengths, culture, and what makes it a great place for agents. NOT salesy, not comparing to other brokerages. Return ONLY valid JSON: {"posts":[{"title":"","excerpt":"","content":"","image_prompt":""}]}`;
  }

  return `You are a real estate content strategist writing for ${brokerage.name}'s blog.

Generate 2 blog posts that highlight why agents thrive at ${brokerage.name}. The angle is POSITIVE and brokerage-specific — showcasing what makes ${brokerage.name} a great place to build a real estate career.

About ${brokerage.name}:
- Key strengths: ${profile.strengths}
- Culture: ${profile.culture}
- Ideal for: ${profile.ideal_for}

IMPORTANT TONE GUIDELINES:
- Write as if you're a ${brokerage.name} insider sharing why agents love it here
- Focus on ${brokerage.name}'s specific strengths, NOT comparisons to other brokerages
- The soft-sell message is: "here's why agents thrive at ${brokerage.name}" — not "switch from X to Y"
- Be authentic, data-driven where possible, and empathetic to what agents care about (income, support, growth, tools, culture)
- Do NOT mention or promote any other specific brokerage as being better
- Do NOT frame the content as "why you should leave" — frame it as "why agents here are thriving"

Title ideas (pick or adapt 2, be creative):
- "Why Top Producers Choose ${brokerage.name}"
- "What ${brokerage.name} Agents Know That Others Don't"
- "Inside ${brokerage.name}: What's Driving Agent Success"
- "The ${brokerage.name} Advantage: What Agents Are Saying"
- "How ${brokerage.name} Agents Are Building Wealth in Real Estate"
- "5 Reasons Agents Are Thriving at ${brokerage.name}"

Internal linking: When you mention any of these brokerage names in the article content, wrap them in markdown links:
- LPT Realty → [LPT Realty](https://rkrt.in/lpt-realty)
- eXp Realty → [eXp Realty](https://rkrt.in/exp-realty)
- Keller Williams → [Keller Williams](https://rkrt.in/keller-williams)
- RE/MAX → [RE/MAX](https://rkrt.in/remax)
Use 2-3 internal links per article naturally.

For each post return:
- title: compelling headline specific to ${brokerage.name}
- excerpt: 2 sentences summarizing the post
- content: full article, 600-800 words, markdown formatted with ## subheadings. Professional, authentic tone. Include internal links as described above.
- image_prompt: one vivid sentence describing a professional real estate photo for the header image (no text in image)

Return ONLY valid JSON:
{"posts":[{"title":"","excerpt":"","content":"","image_prompt":""}]}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json().catch(() => ({}));
    let brokerages: any[] = [];

    if (body.brokerage_id) {
      brokerages = [{ id: body.brokerage_id, name: body.brokerage_name, slug: body.slug }];
    } else {
      const { data } = await supabase.from("brokerages").select("id, name, slug");
      brokerages = data || [];
    }

    if (!brokerages.length) {
      return new Response(JSON.stringify({ error: "No brokerages found" }), {
        status: 404, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const allPosts: any[] = [];

    for (const brokerage of brokerages) {
      console.log(`Generating content for ${brokerage.name}...`);

      const prompt = buildPrompt(brokerage);

      const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.8,
          max_tokens: 6000,
        }),
      });

      const aiData = await aiRes.json();
      const raw = aiData.choices?.[0]?.message?.content || "";

      let parsed;
      try {
        parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      } catch {
        console.error(`Parse failed for ${brokerage.name}:`, raw.substring(0, 200));
        continue;
      }

      const posts = parsed.posts || [];
      console.log(`Got ${posts.length} posts for ${brokerage.name}`);

      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        let imageUrl: string | null = null;

        if (post.image_prompt) {
          console.log(`Generating image ${i + 1}: ${post.image_prompt.substring(0, 60)}`);
          const b64 = await generateImage(post.image_prompt);
          if (b64) {
            const fname = `${brokerage.slug}/${Date.now()}_${i}.png`;
            imageUrl = await uploadImage(supabase, b64, fname);
            console.log(`Image ${i + 1}: ${imageUrl ? "ok" : "upload failed"}`);
          } else {
            console.error(`Image ${i + 1}: generation returned null`);
          }
        }

        const row = {
          brokerage_id: brokerage.id,
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          image_url: imageUrl,
          image_prompt: post.image_prompt,
          status: "draft",
          created_at: new Date().toISOString(),
        };

        const { data: ins, error: insErr } = await supabase
          .from("brokerage_posts")
          .insert(row)
          .select("id, title, image_url")
          .single();

        if (insErr) {
          console.error(`Insert failed for "${post.title}":`, insErr.message);
        } else {
          allPosts.push(ins);
          console.log(`Inserted: ${ins.title}`);
        }
      }
    }

    const imagesOk = allPosts.filter((p) => p.image_url).length;
    console.log(`Done: ${allPosts.length} posts, ${imagesOk} with images`);

    return new Response(
      JSON.stringify({
        success: true,
        total_posts: allPosts.length,
        images_generated: imagesOk,
        brokerages_processed: brokerages.length,
        posts: allPosts,
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
