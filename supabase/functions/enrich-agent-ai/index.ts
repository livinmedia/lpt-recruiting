import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENROUTER_KEY = "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";
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_SEARCH_API_KEY") || "";
const GOOGLE_CX = Deno.env.get("GOOGLE_SEARCH_CX") || "";
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const BROKERAGE_DOMAINS: Record<string, string> = { 'keller williams': 'kw.com', 'kw ': 'kw.com', 'coldwell banker': 'cbexchange.com', 'century 21': 'century21.com', 'berkshire hathaway': 'bhhsselect.com', 'sotheby': 'sothebysrealty.com', 'compass': 'compass.com', 'redfin': 'redfin.com', 'douglas elliman': 'elliman.com', 'corcoran': 'corcoran.com', 'weichert': 'weichert.com', 'howard hanna': 'howardhanna.com', 'long & foster': 'longandfoster.com', 'better homes': 'bhgre.com', 'united real estate': 'unitedrealestate.com', 'exp realty': 'exprealty.com', 'lpt realty': 'lptrealty.com', 're/max': 'remax.net', 'remax': 'remax.net' };
const JSON_SCHEMA = `{"email":"","phone":"","linkedin":"","facebook":"","instagram":"","youtube":"","tiktok":"","website":"","zillow_url":"","realtor_url":"","recent_sales":null,"bio":""}`;
const PROFILE_SCHEMA = `{"rating":null,"review_count":null,"recent_sales":null,"avg_sale_price":null,"years_experience":null,"specialties":[],"service_areas":[],"bio":""}`;

const LPT_PATTERNS = ['lpt realty', 'lpt', 'listing power', 'livin media'];
function isLPTAgent(brokerage: string): boolean {
  if (!brokerage) return false;
  const b = brokerage.toLowerCase();
  return LPT_PATTERNS.some(p => b.includes(p));
}

function stripCitations(s: string): string {
  return (s || '').replace(/\[\d+\]/g, '').trim();
}

function cleanName(f:string,l:string,full?:string):string{const sx=/\b(PA|P\.A\.|PLLC|PLC|LLC|INC|CORP|JR|SR|II|III|IV|ESQ|CPA|MBA|GRI|CRS|ABR|SRES|SFR|CDPE|CLHMS|CNE|MRP|PSA|RENE|RSPS|TRC)\b/gi;let first=(f||'').replace(sx,'').replace(/,/g,'').trim(),last=(l||'').replace(sx,'').replace(/,/g,'').trim();if(!first&&full){if(full.includes(',')){const p=full.split(',');last=p[0].replace(sx,'').trim();first=(p[1]||'').replace(sx,'').trim();}else{const p=full.replace(sx,'').trim().split(/\s+/);first=p[0];last=p.slice(1).join(' ');}}return`${first.split(/\s+/)[0]} ${last.split(/\s+/)[0]}`.trim();}
function findBrokerageDomain(bn:string,url?:string|null):string|null{if(url){try{const h=new URL(url).hostname.replace('www.','');if(h&&!h.includes('zillow')&&!h.includes('realtor.com'))return h;}catch{}}if(!bn)return null;const l=bn.toLowerCase();for(const[k,d]of Object.entries(BROKERAGE_DOMAINS)){if(l.includes(k))return d;}return null;}

async function aiSearch(model:string,msgs:any[],maxTok:number):Promise<any>{try{const r=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${OPENROUTER_KEY}`},body:JSON.stringify({model,max_tokens:maxTok,messages:msgs})});if(!r.ok)return null;const d=await r.json();const t=d.choices?.[0]?.message?.content||"";try{let c=t.replace(/```json\s*/gi,'').replace(/```\s*/gi,'').trim();const s=c.indexOf('{'),e=c.lastIndexOf('}');if(s>=0&&e>s)c=c.substring(s,e+1);const p=JSON.parse(c);return p;}catch{return null;}}catch{return null;}}

// --- NEW: Realtor.com direct scrape ---
async function enrichFromRealtorCom(name: string, city: string, state: string): Promise<any> {
  try {
    // Build search URL: realtor.com/realestateagents/{first-last}_{city}_{state}
    const cleanN = name.toLowerCase().replace(/[^a-z\s]/g, '').trim().replace(/\s+/g, '-');
    const cleanC = (city || '').toLowerCase().replace(/[^a-z\s]/g, '').trim().replace(/\s+/g, '-');
    const st = (state || '').toUpperCase();

    // Try the agent search page
    const searchUrl = `https://www.realtor.com/realestateagents/${encodeURIComponent(cleanN)}/${cleanC}_${st}`;
    console.log(`[Realtor.com] Fetching: ${searchUrl}`);

    const resp = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!resp.ok) {
      console.log(`[Realtor.com] HTTP ${resp.status}`);
      return null;
    }

    const html = await resp.text();
    console.log(`[Realtor.com] Got ${(html.length/1024).toFixed(0)}KB HTML`);

    // Extract phone numbers from the HTML
    // Realtor.com embeds phone in various formats
    const result: any = { _source: 'realtor_com_scrape' };

    // Phone patterns: (559) 786-6196, 559-786-6196, 5597866196, href="tel:..."
    const telMatch = html.match(/href="tel:([+\d-]+)"/i);
    if (telMatch) {
      result.phone = telMatch[1].replace(/[^\d]/g, '');
      if (result.phone.length === 11 && result.phone.startsWith('1')) result.phone = result.phone.slice(1);
      if (result.phone.length === 10) {
        result.phone = `(${result.phone.slice(0,3)}) ${result.phone.slice(3,6)}-${result.phone.slice(6)}`;
      }
      console.log(`[Realtor.com] Found phone via tel: ${result.phone}`);
    }

    // Look for phone in JSON-LD structured data
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatch) {
      for (const block of jsonLdMatch) {
        try {
          const jsonStr = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
          const ld = JSON.parse(jsonStr);
          if (ld.telephone && !result.phone) {
            result.phone = ld.telephone;
            console.log(`[Realtor.com] Found phone via JSON-LD: ${result.phone}`);
          }
          if (ld.email && !result.email) result.email = ld.email;
          if (ld.url) result.realtor_url = ld.url;
          if (ld.name) result._matched_name = ld.name;
        } catch {}
      }
    }

    // Look for phone numbers in common HTML patterns
    if (!result.phone) {
      // Pattern: data-testid="phone" or class containing "phone"
      const phonePatterns = [
        /"phone"\s*:\s*"([^"]+)"/i,
        /"mobilePhone"\s*:\s*"([^"]+)"/i,
        /"officePhone"\s*:\s*"([^"]+)"/i,
        /class="[^"]*phone[^"]*"[^>]*>\s*[^<]*?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/i,
        /data-testid="[^"]*phone[^"]*"[^>]*>\s*[^<]*?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/i,
      ];
      for (const pat of phonePatterns) {
        const m = html.match(pat);
        if (m && m[1]) {
          const digits = m[1].replace(/\D/g, '');
          if (digits.length >= 10) {
            const d = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits.slice(0, 10);
            result.phone = `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
            console.log(`[Realtor.com] Found phone via pattern: ${result.phone}`);
            break;
          }
        }
      }
    }

    // Extract recent sales count
    const salesMatch = html.match(/(\d+)\s*recent\s*sale/i);
    if (salesMatch) result.recent_sales = parseInt(salesMatch[1]);

    // Extract realtor.com profile URL from canonical or og:url
    if (!result.realtor_url) {
      const canonMatch = html.match(/rel="canonical"\s+href="([^"]+)"/i) || html.match(/property="og:url"\s+content="([^"]+)"/i);
      if (canonMatch && canonMatch[1].includes('realtor.com')) result.realtor_url = canonMatch[1];
    }

    // Only return if we found something useful
    if (result.phone || result.email || result.realtor_url) {
      return result;
    }

    console.log('[Realtor.com] No useful data extracted');
    return null;
  } catch (e: any) {
    console.error('[Realtor.com] Error:', e.message);
    return null;
  }
}

async function enrichWithPerplexity(name:string,city:string,state:string,brokerage:string,license:string,licType:string):Promise<any>{const r=await aiSearch("perplexity/sonar",[{role:"user",content:`Find contact information and social media profiles for ${name}, a real estate ${licType||'agent'} in ${city||''}, ${state}. ${brokerage?'They work at '+brokerage+'.':''} ${license?'License: '+license+'.':''}\n\nReturn ONLY JSON: ${JSON_SCHEMA}`}],600);if(r)r._source="perplexity";return r;}
async function enrichWithSonarPro(name:string,city:string,state:string,brokerage:string):Promise<any>{const r=await aiSearch("perplexity/sonar-pro",[{role:"system",content:"Search the web for this real estate agent's contact info AND social media. Check Zillow, Realtor.com, brokerage websites, LinkedIn, Facebook, Instagram, YouTube, TikTok. Return ONLY JSON."},{role:"user",content:`Search: "${name}" real estate agent ${city||''} ${state} ${brokerage||''}\n\nReturn ONLY JSON: ${JSON_SCHEMA}`}],700);if(r)r._source="sonar_pro";return r;}
async function enrichWithDeepSeek(name:string,brokerage:string,city:string,state:string,ctx:string):Promise<any>{const r=await aiSearch("deepseek/deepseek-chat-v3-0324",[{role:"user",content:`Extract ALL contact info and social media.\nAgent: ${name}\nBrokerage: ${brokerage||'Unknown'}\nCity: ${city||'Unknown'}, ${state}\n\nResults:\n${ctx}\n\nReturn ONLY JSON: ${JSON_SCHEMA}`}],500);if(r)r._source="deepseek";return r;}
async function enrichWithGoogle(name:string,city:string,state:string,brokerage:string):Promise<any>{if(!GOOGLE_API_KEY||!GOOGLE_CX)return null;try{const r=await fetch(`https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(name+' real estate agent '+(city||'')+' '+state+' email phone')}&num=5`);if(!r.ok)return null;const d=await r.json();const s=(d.items||[]).map((i:any)=>`${i.title}: ${i.snippet} [${i.link}]`).join('\n');if(!s)return null;return await enrichWithDeepSeek(name,brokerage,city,state,s);}catch{return null;}}
async function guessEmail(name:string,brokerage:string,ws?:string|null):Promise<any>{const domain=findBrokerageDomain(brokerage||'',ws);if(!domain)return null;const n=name.toLowerCase().split(/\s+/);const first=(n[0]||'').replace(/[^a-z]/g,''),last=(n[n.length-1]||'').replace(/[^a-z]/g,'');if(!first||!last||first.length<2||last.length<2)return null;const c=[`${first}.${last}@${domain}`,`${first}@${domain}`,`${first[0]}${last}@${domain}`,`${first}${last}@${domain}`,`${first}.${last[0]}@${domain}`,`${last}.${first}@${domain}`];try{const mr=await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);const md=await mr.json();if(!md.Answer||md.Answer.length===0)return null;}catch{return null;}return{email:c[0],_email_candidates:c,_email_confidence:'pattern_guess',_source:'email_pattern'};}

async function scrapeProfileStats(profileUrl: string, agentName: string): Promise<any> {
  try {
    const prompt = `Go to this URL and extract the agent's profile data: ${profileUrl}\n\nFor agent ${agentName}, return ONLY this JSON:\n${PROFILE_SCHEMA}\n\nFields: rating, review_count, recent_sales, avg_sale_price (number), years_experience, specialties (array), service_areas (array), bio (max 300 chars). Return ONLY JSON, no markdown, no citations.`;
    const r = await aiSearch('perplexity/sonar-pro', [{ role: 'user', content: prompt }], 500);
    if (r) {
      if (r.bio) r.bio = stripCitations(r.bio);
      if (r.service_areas) r.service_areas = r.service_areas.map((a: string) => stripCitations(a));
      r._source = 'profile_stats';
    }
    return r;
  } catch(e: any) { return null; }
}

async function generateRueDossier(name: string, brokerage: string, stats: any, bio?: string): Promise<string> {
  if (isLPTAgent(brokerage)) {
    console.log(`[RueDossier] Skipping — ${name} is LPT agent`);
    return '';
  }
  try {
    const prompt = `You are Rue, an elite real estate recruiting AI. Write a sharp recruiting dossier.\n\nAgent: ${name}\nCurrent Brokerage: ${brokerage || 'Unknown'}\nRating: ${stats?.rating || 'N/A'} (${stats?.review_count || 0} reviews)\nRecent Sales (12mo): ${stats?.recent_sales || 'N/A'}\nAvg Sale Price: ${stats?.avg_sale_price ? '$' + Number(stats.avg_sale_price).toLocaleString() : 'N/A'}\nYears Experience: ${stats?.years_experience || 'N/A'}\nService Areas: ${JSON.stringify(stats?.service_areas || [])}\nSpecialties: ${JSON.stringify(stats?.specialties || [])}\nBio: ${(stats?.bio || bio || '').substring(0, 300)}\n\n## AGENT SNAPSHOT\n2-3 sentences: who they are, production level, market focus.\n\n## RECRUITING ANGLES\n2-3 specific hooks — what makes this agent recruitable? Reference their specific brokerage weaknesses, production level, market gaps.\n\n## OUTREACH OPENER\nOne personalized first sentence for a cold email. Human, specific, never generic.\n\nNo fluff. Data-driven.`;
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'deepseek/deepseek-chat-v3-0324', messages: [{ role: 'user', content: prompt }], max_tokens: 600, temperature: 0.4 }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch(e: any) { return ''; }
}

function mergeResults(R:any[]):any{const m:any={email:null,phone:null,linkedin:null,facebook:null,instagram:null,youtube:null,tiktok:null,website:null,zillow_url:null,realtor_url:null,recent_sales:null,bio:null,email_candidates:null,email_confidence:null,sources:[]};for(const r of R){if(!r)continue;m.sources.push(r._source||'unknown');if(!m.email&&r.email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)&&r.email!=='null'&&!r.email.includes('example')){m.email=r.email.toLowerCase();m.email_confidence=r._email_confidence||'ai_found';}if(!m.phone&&r.phone){const digits=(r.phone+'').replace(/\D/g,'');if(digits.length>=10)m.phone=stripCitations(r.phone+'');}if(!m.linkedin&&r.linkedin&&(r.linkedin+'').includes('linkedin.com'))m.linkedin=r.linkedin;if(!m.facebook&&r.facebook&&(r.facebook+'').includes('facebook.com'))m.facebook=r.facebook;if(!m.instagram&&r.instagram&&((r.instagram+'').includes('instagram.com')||(r.instagram+'').startsWith('@')))m.instagram=r.instagram;if(!m.youtube&&r.youtube&&(r.youtube+'').includes('youtube.com'))m.youtube=r.youtube;if(!m.tiktok&&r.tiktok&&((r.tiktok+'').includes('tiktok.com')||(r.tiktok+'').startsWith('@')))m.tiktok=r.tiktok;if(!m.website&&r.website&&(r.website+'').startsWith('http'))m.website=r.website;if(!m.zillow_url&&r.zillow_url&&(r.zillow_url+'').includes('zillow.com'))m.zillow_url=r.zillow_url;if(!m.realtor_url&&r.realtor_url&&(r.realtor_url+'').includes('realtor.com'))m.realtor_url=r.realtor_url;if(!m.recent_sales&&r.recent_sales&&typeof r.recent_sales==='number')m.recent_sales=r.recent_sales;if(!m.bio&&r.bio&&r.bio.length>10&&r.bio!=='null')m.bio=stripCitations(r.bio);if(!m.email_candidates&&r._email_candidates)m.email_candidates=r._email_candidates;}return m;}
function score(d:any):number{let s=0;if(d.email){s+=d.email_confidence==='ai_found'?30:20;}if(d.phone)s+=20;if(d.linkedin)s+=10;if(d.facebook)s+=5;if(d.instagram)s+=5;if(d.youtube)s+=3;if(d.tiktok)s+=3;if(d.website)s+=8;if(d.zillow_url)s+=8;if(d.bio)s+=5;if(d.recent_sales)s+=5;return Math.min(s,100);}

async function runEnrichment(name:string,city:string,state:string,brokerage:string,license:string,licType:string,cachedProfileUrl?:string){
  const t0=Date.now();
  // Run all sources in parallel — now includes Realtor.com scrape
  const[r1,r2,r4,rRealtor]=await Promise.all([
    enrichWithPerplexity(name,city,state,brokerage,license,licType),
    enrichWithSonarPro(name,city,state,brokerage),
    enrichWithGoogle(name,city,state,brokerage),
    enrichFromRealtorCom(name, city, state),
  ]);
  let results:any[]=[r1,r2,r4,rRealtor];
  let pre=mergeResults(results);
  if(!pre.email||pre.email_confidence!=='ai_found'){const ws=pre.website||r1?.website||r2?.website;const r5=await guessEmail(name,brokerage,ws);if(r5){results.push(r5);pre=mergeResults(results);}}
  if(score(pre)<50){const ctx=[r1?.bio,r2?.bio].filter(Boolean).join(' ');results.push(await enrichWithDeepSeek(name,brokerage,city,state,ctx||'No context'));}
  const merged=mergeResults(results);
  const profileUrl=merged.realtor_url||merged.zillow_url||cachedProfileUrl||null;
  if(profileUrl&&!merged.realtor_url){if(cachedProfileUrl?.includes('realtor.com'))merged.realtor_url=cachedProfileUrl;else if(cachedProfileUrl?.includes('zillow.com'))merged.zillow_url=cachedProfileUrl;}
  let profileStats:any=null,rueDossier:string='';
  if(profileUrl){
    profileStats=await scrapeProfileStats(profileUrl,name);
    if(profileStats){if(!merged.recent_sales&&profileStats.recent_sales)merged.recent_sales=profileStats.recent_sales;if(!merged.bio&&profileStats.bio)merged.bio=profileStats.bio;}
    rueDossier=await generateRueDossier(name,brokerage,profileStats||{},merged.bio||'');
  } else if(!isLPTAgent(brokerage)&&merged.bio){
    rueDossier=await generateRueDossier(name,brokerage,{},merged.bio);
  }
  return{merged,quality:score(merged),elapsed:Date.now()-t0,cost:results.filter(Boolean).length*0.005,profileStats,rueDossier};
}

function fireGenerateDrip(leadId: string, serviceRoleKey: string): void {
  fetch(`${SUPABASE_URL}/functions/v1/generate-drip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
    body: JSON.stringify({ lead_id: leadId }),
  }).catch(e => console.error('[generate-drip fire]', e.message));
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{headers:CORS});
  const supabase=createClient(SUPABASE_URL,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try{
    const body=await req.json();
    const{agent_id,lead_id,user_id,add_to_leads,lead_notes,override_email}=body;
    if(!agent_id&&!lead_id)return new Response(JSON.stringify({error:'agent_id or lead_id required'}),{status:400,headers:{...CORS,'Content-Type':'application/json'}});
    if(user_id){const{data:usage}=await supabase.from('v_enrichment_usage').select('*').eq('user_id',user_id).maybeSingle();if(usage&&usage.remaining<=0)return new Response(JSON.stringify({error:'enrichment_limit_reached',message:`You've used all enrichments this month.`,used:usage.used_this_month,limit:usage.monthly_limit,plan:usage.plan}),{status:429,headers:{...CORS,'Content-Type':'application/json'}});}

    if(agent_id){
      const{data:agent,error:ae}=await supabase.from('agent_directory').select('*').eq('id',agent_id).single();
      if(ae||!agent)return new Response(JSON.stringify({error:'Agent not found'}),{status:404,headers:{...CORS,'Content-Type':'application/json'}});
      if(agent.enriched_at&&agent.email){
        const days=(Date.now()-new Date(agent.enriched_at).getTime())/86400000;
        if(days<30){
          if(user_id)await supabase.from('enrichment_log').insert({user_id,agent_id,agent_name:agent.full_name,agent_brokerage:agent.brokerage_name,agent_state:agent.state,quality_score:100,sources_used:['cache'],data_found:{email:agent.email,phone:agent.phone},cost_estimate:0});
          const c=agent.raw_data||{};
          const result:any={status:'cached',quality:100,elapsed_ms:0,sources:['cache'],data:{email:agent.email,phone:agent.phone||agent.mobile_phone,linkedin:agent.linkedin_url,facebook:c.facebook,instagram:c.instagram,youtube:c.youtube,tiktok:c.tiktok,website:c.website,zillow_url:agent.zillow_url,realtor_url:c.realtor_url,recent_sales:agent.recent_sales_count,bio:c.ai_bio,rue_dossier:c.rue_dossier,profile_stats:c.profile_stats},agent:{id:agent.id,full_name:agent.full_name,brokerage_name:agent.brokerage_name,city:agent.city,state:agent.state,license_type:agent.license_type,license_number:agent.license_number}};
          if(add_to_leads&&user_id)result.lead=await addToLeads(supabase,agent,{...result.data,email:override_email||result.data.email,sources:['cache'],rue_dossier:c.rue_dossier},user_id,lead_notes,100);
          return new Response(JSON.stringify(result),{headers:{...CORS,'Content-Type':'application/json'}});
        }
      }
      const name=cleanName(agent.first_name,agent.last_name,agent.full_name);
      const cachedProfileUrl=agent.raw_data?.realtor_url||agent.raw_data?.zillow_url||agent.zillow_url||null;
      const{merged,quality,elapsed,cost,profileStats,rueDossier}=await runEnrichment(name,agent.city||'',agent.state||'',agent.brokerage_name||'',agent.license_number||'',agent.license_type||'',cachedProfileUrl);

      // FIX: Only update agent record and charge credit when enrichment found data (quality > 0)
      const shouldCharge = quality > 0;

      if(shouldCharge){
        const ud:any={enriched_at:new Date().toISOString(),enrichment_source:`ai_v17:${merged.sources.join('+')}` };
        if(merged.email)ud.email=merged.email;if(merged.phone)ud.phone=merged.phone;if(merged.linkedin)ud.linkedin_url=merged.linkedin;if(merged.zillow_url)ud.zillow_url=merged.zillow_url;if(merged.recent_sales)ud.recent_sales_count=merged.recent_sales;
        ud.raw_data={...(agent.raw_data||{}),ai_bio:merged.bio,ai_enrichment_quality:quality,email_confidence:merged.email_confidence,email_candidates:merged.email_candidates,facebook:merged.facebook,instagram:merged.instagram,youtube:merged.youtube,tiktok:merged.tiktok,website:merged.website,realtor_url:merged.realtor_url||cachedProfileUrl||null,profile_stats:profileStats,rue_dossier:rueDossier};
        await supabase.from('agent_directory').update(ud).eq('id',agent_id);
      }

      // Log the enrichment attempt — charged only when data was found
      if(user_id)await supabase.from('enrichment_log').insert({user_id,agent_id,agent_name:agent.full_name,agent_brokerage:agent.brokerage_name,agent_state:agent.state,quality_score:quality,sources_used:merged.sources,data_found:merged,cost_estimate:cost,charged:shouldCharge});

      const response:any={status:shouldCharge?'enriched':'no_data',quality,elapsed_ms:elapsed,sources:merged.sources,no_credit_charged:!shouldCharge,data:{email:merged.email,email_confidence:merged.email_confidence,email_candidates:merged.email_candidates,phone:merged.phone,linkedin:merged.linkedin,facebook:merged.facebook,instagram:merged.instagram,youtube:merged.youtube,tiktok:merged.tiktok,website:merged.website,zillow_url:merged.zillow_url,realtor_url:merged.realtor_url||cachedProfileUrl,recent_sales:merged.recent_sales,bio:merged.bio,profile_stats:profileStats,rue_dossier:rueDossier},agent:{id:agent.id,full_name:agent.full_name,brokerage_name:agent.brokerage_name,city:agent.city,state:agent.state,license_type:agent.license_type,license_number:agent.license_number}};
      if(add_to_leads&&user_id&&shouldCharge)response.lead=await addToLeads(supabase,agent,{...merged,email:override_email||merged.email,rue_dossier:rueDossier},user_id,lead_notes,quality);
      return new Response(JSON.stringify(response),{headers:{...CORS,'Content-Type':'application/json'}});
    }

    if(lead_id){
      const{data:lead,error:le}=await supabase.from('leads').select('*').eq('id',lead_id).single();
      if(le||!lead)return new Response(JSON.stringify({error:'Lead not found'}),{status:404,headers:{...CORS,'Content-Type':'application/json'}});
      const name=cleanName(lead.first_name,lead.last_name,'');
      const city=(lead.market||'').split(',')[0].trim();
      const state=(lead.market||'').split(',')[1]?.trim()||(lead.license_state||'');
      const cachedProfileUrl=lead.realtor_url||lead.zillow_url||null;
      const{merged,quality,elapsed,cost,profileStats,rueDossier}=await runEnrichment(name,city,state,lead.brokerage||'',lead.license_number||'','',cachedProfileUrl);

      // FIX: Only update lead record and charge credit when enrichment found data (quality > 0)
      const shouldCharge = quality > 0;

      if(shouldCharge){
        const upd:any={enrichment_quality:quality,enrichment_sources:merged.sources,updated_at:new Date().toISOString()};
        if(!lead.email&&merged.email)upd.email=merged.email;if(!lead.phone&&merged.phone)upd.phone=merged.phone;if(!lead.linkedin_url&&merged.linkedin)upd.linkedin_url=merged.linkedin;if(!lead.facebook_url&&merged.facebook)upd.facebook_url=merged.facebook;if(!lead.instagram_handle&&merged.instagram)upd.instagram_handle=merged.instagram;if(!lead.youtube_channel&&merged.youtube)upd.youtube_channel=merged.youtube;if(!lead.tiktok_handle&&merged.tiktok)upd.tiktok_handle=merged.tiktok;if(!lead.website_url&&merged.website)upd.website_url=merged.website;if(!lead.zillow_url&&merged.zillow_url)upd.zillow_url=merged.zillow_url;if(!lead.realtor_url&&merged.realtor_url)upd.realtor_url=merged.realtor_url;if(!lead.transaction_count&&merged.recent_sales)upd.transaction_count=merged.recent_sales;
        if(rueDossier){upd.raw_dossier=rueDossier;upd.outreach_angle=rueDossier.split('## OUTREACH OPENER')[1]?.replace(/[\n*#]+/g,' ').trim()?.substring(0,500)||merged.bio||null;}
        await supabase.from('leads').update(upd).eq('id',lead_id);
        await supabase.from('lead_events').insert({lead_id,user_id:lead.user_id,event_type:'agent_enriched',event_source:'crm_enrich',metadata:{quality,sources:merged.sources,has_dossier:!!rueDossier}});
      }

      // Log the enrichment attempt — charged only when data was found
      if(user_id)await supabase.from('enrichment_log').insert({user_id,agent_id:lead.agent_directory_id||0,agent_name:`${lead.first_name} ${lead.last_name}`,agent_brokerage:lead.brokerage,agent_state:state,quality_score:quality,sources_used:merged.sources,data_found:merged,cost_estimate:cost,charged:shouldCharge});

      return new Response(JSON.stringify({status:shouldCharge?'enriched':'no_data',quality,elapsed_ms:elapsed,sources:merged.sources,no_credit_charged:!shouldCharge,data:{email:merged.email,email_confidence:merged.email_confidence,email_candidates:merged.email_candidates,phone:merged.phone,linkedin:merged.linkedin,facebook:merged.facebook,instagram:merged.instagram,youtube:merged.youtube,tiktok:merged.tiktok,website:merged.website,zillow_url:merged.zillow_url,realtor_url:merged.realtor_url,recent_sales:merged.recent_sales,bio:merged.bio,profile_stats:profileStats,rue_dossier:rueDossier},lead:{id:lead_id,updated_fields:shouldCharge?['enrichment attempted']:[]}}}),{headers:{...CORS,'Content-Type':'application/json'}});
    }

    return new Response(JSON.stringify({error:'Invalid request'}),{status:400,headers:{...CORS,'Content-Type':'application/json'}});
  }catch(e:any){console.error('Enrichment error:',e);return new Response(JSON.stringify({error:e.message}),{status:500,headers:{...CORS,'Content-Type':'application/json'}});}
});

async function addToLeads(supabase:any,agent:any,data:any,userId:string,notes?:string,quality?:number){
  try{
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cn=cleanName(agent.first_name,agent.last_name,agent.full_name).split(/\s+/);let fn=(cn[0]||''),ln=(cn.slice(1).join(' ')||'');
    fn=fn.replace(/\b\w/g,(c:string)=>c.toUpperCase()).replace(/\B\w+/g,(w:string)=>w.toLowerCase());
    ln=ln.replace(/\b\w/g,(c:string)=>c.toUpperCase()).replace(/\B\w+/g,(w:string)=>w.toLowerCase());
    const{data:dupes}=await supabase.rpc('find_duplicate_lead',{p_user_id:userId,p_license_number:agent.license_number||null,p_email:data.email||null,p_phone:data.phone||null,p_first_name:fn,p_last_name:ln,p_brokerage:agent.brokerage_name||null});
    if(dupes&&dupes.length>0){
      const d=dupes[0];
      await supabase.rpc('merge_enrichment_into_lead',{p_lead_id:d.lead_id,p_email:data.email||null,p_phone:data.phone||null,p_linkedin:data.linkedin||null,p_facebook:data.facebook||null,p_instagram:data.instagram||null,p_youtube:data.youtube||null,p_tiktok:data.tiktok||null,p_website:data.website||null,p_zillow_url:data.zillow_url||null,p_realtor_url:data.realtor_url||null,p_bio:data.bio||null,p_recent_sales:data.recent_sales||null,p_quality:quality||null,p_sources:data.sources||null});
      if(data.rue_dossier)await supabase.from('leads').update({raw_dossier:data.rue_dossier}).eq('id',d.lead_id);
      if(agent.license_number)await supabase.from('leads').update({license_number:agent.license_number,license_state:agent.state,agent_directory_id:agent.id}).eq('id',d.lead_id).is('license_number',null);
      return{status:'merged',lead_id:d.lead_id,match_type:d.match_type,match_confidence:d.match_confidence,message:`Existing lead updated (${d.match_type} match)`};
    }
    let fullNotes=notes||'';
    if(data.email_confidence==='pattern_guess'&&data.email_candidates)fullNotes+='\nEmail candidates: '+data.email_candidates.join(', ');
    fullNotes=fullNotes.trim();
    const rueDossier = data.rue_dossier || null;
    const outreachAngle = rueDossier
      ? rueDossier.split('## OUTREACH OPENER')[1]?.replace(/[\n*#]+/g,' ').trim()?.substring(0,500) || data.bio || null
      : data.bio || null;
    const{data:lead,error}=await supabase.from('leads').insert({
      user_id:userId,first_name:fn,last_name:ln,
      email:data.email||null,phone:data.phone||null,
      brokerage:agent.brokerage_name||null,
      market:agent.city?(agent.city+', '+agent.state):agent.state,
      source:'agent_directory',pipeline_stage:'new',interest_score:0,heat_level:'cold',
      license_number:agent.license_number||null,license_state:agent.state||null,
      notes:fullNotes||null,
      outreach_angle:outreachAngle,
      raw_dossier:rueDossier,
      tags:['enriched','source:'+(agent.state||'')+'_directory'],
      linkedin_url:data.linkedin||null,facebook_url:data.facebook||null,
      instagram_handle:data.instagram||null,youtube_channel:data.youtube||null,
      tiktok_handle:data.tiktok||null,website_url:data.website||null,
      zillow_url:data.zillow_url||null,realtor_url:data.realtor_url||null,
      transaction_count:data.recent_sales||null,
      enrichment_quality:quality||null,enrichment_sources:data.sources||null,
      agent_directory_id:agent.id,
    }).select('id').single();
    if(error)return{status:'error',message:error.message};
    await supabase.from('enrichment_log').update({added_to_leads:true,lead_id:lead.id}).eq('user_id',userId).eq('agent_id',agent.id).order('created_at',{ascending:false}).limit(1);
    fireGenerateDrip(lead.id, serviceRoleKey);
    return{status:'created',lead_id:lead.id};
  }catch(e:any){return{status:'error',message:e.message};}
}
