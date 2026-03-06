import { useState, useEffect, useCallback } from "react";
let BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell;
const rechartsReady = import("recharts").then(m => {
  BarChart = m.BarChart; Bar = m.Bar; XAxis = m.XAxis; YAxis = m.YAxis;
  Tooltip = m.Tooltip; ResponsiveContainer = m.ResponsiveContainer;
  PieChart = m.PieChart; Pie = m.Pie; Cell = m.Cell;
});
import { createClient } from "@supabase/supabase-js";

// rkrt.in Platform — LIVI AI Recruiting Intelligence
const LIVI_SUPA = "https://usknntguurefeyzusbdh.supabase.co/rest/v1";
const LIVI_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVza25udGd1dXJlZmV5enVzYmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MTcwODAsImV4cCI6MjA4Nzk5MzA4MH0.pxexo90zyugIA4pPzLonGo3E1frr8bSZvz-XT7BmuqQ";
const supabase = createClient('https://usknntguurefeyzusbdh.supabase.co', LIVI_KEY);

// Brokerage list for dropdown
const BROKERAGES = [
  "Keller Williams","RE/MAX","eXp Realty","Coldwell Banker","Century 21",
  "Berkshire Hathaway HomeServices","Compass","Sotheby's International Realty",
  "Better Homes & Gardens Real Estate","ERA Real Estate","Engel & Völkers",
  "HomeSmart","Redfin","Side","LPT Realty","Independent","Other"
];

async function logActivity(userId, action, metadata = {}) {
  if (!userId) return;
  try {
    await supabase.from('user_activity').insert({ user_id: userId, action, metadata, created_at: new Date().toISOString() });
  } catch (e) { /* silent fail */ }
}

const startCheckout = async (userId, email) => {
  try {
    const r = await fetch('https://usknntguurefeyzusbdh.supabase.co/functions/v1/create-checkout', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        user_id: userId,
        email: email,
        success_url: `${window.location.origin}?upgraded=true`,
        cancel_url: `${window.location.origin}?cancelled=true`
      })
    });
    const data = await r.json();
    if (data.url) window.location.href = data.url;
    else alert('Could not start checkout. Please try again.');
  } catch(e) { alert('Checkout error. Please try again.'); }
};

async function agentSearch({state,brokerage,name,city,newDays,limit=50,offset=0}={}) {
  let params = [];
  if(state) params.push(`state=eq.${state}`);
  if(brokerage) params.push(`brokerage_name=ilike.%25${encodeURIComponent(brokerage)}%25`);
  if(name) params.push(`full_name=ilike.*${encodeURIComponent(name)}*`);
  if(city) params.push(`city=ilike.*${encodeURIComponent(city)}*`);
  if(newDays) {
    const d = new Date(); d.setDate(d.getDate() - newDays);
    params.push(`original_license_date=gte.${d.toISOString().split("T")[0]}`);
    params.push(`order=original_license_date.desc`);
  } else {
    params.push(`order=full_name.asc`);
  }
  params.push(`limit=${limit}`);
  params.push(`offset=${offset}`);
  params.push(`select=id,state,license_number,license_type,full_name,first_name,last_name,license_status,brokerage_name,brokerage_license,city,county,address,license_expiration,original_license_date,personal_email,work_email,mobile_phone,linkedin_url,enriched_at`);
  try {
    const url = `${LIVI_SUPA}/agent_directory?${params.join("&")}`;
    console.log('Agent search URL:', url);
    const r = await fetch(url,{
      headers:{"apikey":LIVI_KEY,"Authorization":`Bearer ${LIVI_KEY}`,"Prefer":"count=exact"}
    });
    if(!r.ok) { console.error("Agent search HTTP error:", r.status, await r.text()); return { data: [], total: 0 }; }
    const total = parseInt(r.headers.get("content-range")?.split("/")?.[1] || "0");
    const data = await r.json();
    return { data: Array.isArray(data) ? data : [], total };
  } catch(e) { console.error("Agent search error:", e); return { data: [], total: 0 }; }
}

const T = {
  bg:"#04060A",side:"#070A10",card:"#0B0F17",hover:"#101520",
  b:"rgba(255,255,255,0.04)",bh:"rgba(255,255,255,0.08)",
  a:"#00E5A0",am:"rgba(0,229,160,0.14)",as:"rgba(0,229,160,0.06)",
  r:"#F43F5E",y:"#F59E0B",bl:"#3B82F6",p:"#8B5CF6",c:"#06B6D4",
  t:"#E4E8F1",s:"#7B8BA3",m:"#2A3345",d:"#161C28",
};

const SYSTEM = `You are LIVI, an elite AI recruiting assistant for real estate team leaders and brokers, powered by LIVIN.

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

const getPlanLimits = (profile) => {
  const isPro = profile?.plan === 'pro' || profile?.plan === 'enterprise' || profile?.role === 'owner';
  return {
    isPro,
    canGenerateContent: isPro,
    canAccessAgents: isPro,
    canEnrichContacts: isPro,
    canAccessCalculator: isPro,
    canAccessRevenueShare: isPro,
    leadLimit: isPro ? Infinity : 10,
    landingPageCount: isPro ? 5 : 1,
    hasUTMTracking: isPro,
  };
};

const ProGate = ({feature, userId, userProfile, children}) => {
  const limits = getPlanLimits(userProfile);
  if (limits.isPro) return children;
  const tiers = [
    {
      name:'Free', price:'$0', period:'forever', color:T.card, textColor:T.t, badge:null,
      features:['Agent search (limited)','5 pipeline leads','Basic dashboard'],
      cta:'Current Plan', ctaAction:null, ctaStyle:{background:T.b,color:T.s,cursor:'default'}
    },
    {
      name:'Recruiter', price:'$97', period:'/mo', color:T.card, textColor:T.t, badge:'MOST POPULAR',
      features:['1.2M+ agent directory','Unlimited leads','AI daily content','All 5 landing pages','Commission calculator','Revenue share projections','Rue AI recruiting agent'],
      cta:'Upgrade to Recruiter →', ctaAction:()=>startCheckout(userId,userProfile?.email),
      ctaStyle:{background:T.a,color:'#000',cursor:'pointer',fontWeight:800}
    },
    {
      name:'Team Leader', price:'$297', period:'/mo', color:'#0f1a2e', textColor:T.t, badge:'5 SEATS',
      features:['Everything in Recruiter','5 team member seats','Shared pipeline view','Team admin dashboard','Blog CMS','HeyGen video content'],
      cta:'Coming Soon', ctaAction:null, ctaStyle:{background:T.b,color:T.s,cursor:'default'}
    },
    {
      name:'Enterprise', price:'$4,797', period:'/mo', color:'#070d1a', textColor:'#fff', badge:'WHITE LABEL',
      features:['Everything in Team Leader','10 seats','Custom domain + branding','Priority support','API access','Dedicated onboarding'],
      cta:'Contact Us', ctaAction:()=>window.open('mailto:anthony@rkrt.in'),
      ctaStyle:{background:'#1B4FFF',color:'#fff',cursor:'pointer',fontWeight:800}
    },
  ];
  return (
    <div style={{padding:'40px 20px',textAlign:'center'}}>
      <div style={{fontSize:36,marginBottom:8}}>🔒</div>
      <div style={{fontSize:22,fontWeight:800,color:T.t,marginBottom:8}}>{feature} requires an upgrade</div>
      <div style={{fontSize:14,color:T.s,marginBottom:36,maxWidth:480,margin:'0 auto 36px'}}>
        Choose the plan that fits your recruiting goals. Cancel anytime.
      </div>
      <div style={{display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap',maxWidth:1000,margin:'0 auto 24px'}}>
        {tiers.map(tier=>(
          <div key={tier.name} style={{background:tier.color,border:`1px solid ${tier.name==='Recruiter'?T.a:T.b}`,borderRadius:16,padding:'24px 20px',width:210,textAlign:'left',position:'relative',boxShadow:tier.name==='Recruiter'?`0 0 24px ${T.a}30`:'none'}}>
            {tier.badge&&<div style={{position:'absolute',top:-10,left:'50%',transform:'translateX(-50%)',background:tier.name==='Recruiter'?T.a:'#1B4FFF',color:tier.name==='Recruiter'?'#000':'#fff',fontSize:9,fontWeight:800,letterSpacing:1.5,padding:'3px 10px',borderRadius:20,whiteSpace:'nowrap'}}>{tier.badge}</div>}
            <div style={{fontSize:13,fontWeight:700,color:tier.name==='Enterprise'?'#818cf8':T.a,marginBottom:4}}>{tier.name.toUpperCase()}</div>
            <div style={{fontSize:34,fontWeight:900,color:tier.textColor,lineHeight:1}}>{tier.price}<span style={{fontSize:13,fontWeight:400,color:T.s}}>{tier.period}</span></div>
            <div style={{height:1,background:T.b,margin:'14px 0'}}/>
            {tier.features.map(f=>(
              <div key={f} style={{display:'flex',gap:6,marginBottom:6,alignItems:'flex-start'}}>
                <span style={{color:T.a,fontSize:11,marginTop:2}}>✓</span>
                <span style={{fontSize:12,color:tier.name==='Enterprise'?'#c7d2fe':T.s,lineHeight:1.4}}>{f}</span>
              </div>
            ))}
            <div onClick={tier.ctaAction||undefined} style={{...tier.ctaStyle,marginTop:16,padding:'10px 0',borderRadius:8,fontSize:12,textAlign:'center'}}>
              {tier.cta}
            </div>
          </div>
        ))}
      </div>
      <div style={{fontSize:11,color:T.m}}>Powered by Stripe · Secure checkout · Cancel anytime</div>
    </div>
  );
};

const STAGES = [{id:"new",l:"New",c:T.s},{id:"researched",l:"Researched",c:T.bl},{id:"outreach_sent",l:"Outreach",c:T.y},{id:"meeting_booked",l:"Meeting",c:T.p},{id:"in_conversation",l:"Talking",c:T.c},{id:"recruited",l:"Recruited",c:T.a}];
const PC = [T.a,T.bl,T.y,T.p,T.r,T.c];

function ago(d){if(!d)return"";const s=Math.floor((Date.now()-new Date(d))/1000);if(s<60)return"now";if(s<3600)return Math.floor(s/60)+"m";if(s<86400)return Math.floor(s/3600)+"h";return Math.floor(s/86400)+"d";}

function Pill({text,color}){return <span style={{fontSize:14,fontWeight:700,padding:"4px 10px",borderRadius:4,background:color+"18",color,letterSpacing:0.4}}>{text}</span>;}
function UPill({u}){return <Pill text={u||"—"} color={{HIGH:T.r,MEDIUM:T.y,LOW:T.a}[u]||T.s}/>;}
function TPill({t}){return <span style={{fontSize:15,fontWeight:600,color:{Elite:T.p,Strong:T.a,Mid:T.bl,Building:T.y,New:T.s}[t]||T.s}}>{t||"—"}</span>;}
function Dot({c}){return <span style={{width:8,height:8,borderRadius:"50%",background:c,boxShadow:`0 0 5px ${c}`,display:"inline-block",flexShrink:0}}/>;}

function Gauge({score}){
  const r=44,c=Math.PI*r,o=c-(score/100)*c,col=score>=70?T.a:score>=40?T.y:T.r;
  return <div style={{textAlign:"center"}}><svg width="160" height="96" viewBox="0 0 100 60"><path d="M 6 56 A 44 44 0 0 1 94 56" fill="none" stroke={T.m} strokeWidth="5" strokeLinecap="round"/><path d="M 6 56 A 44 44 0 0 1 94 56" fill="none" stroke={col} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={o} style={{transition:"all 0.8s"}}/><text x="50" y="44" textAnchor="middle" fill={T.t} fontSize="20" fontWeight="800">{score}</text><text x="50" y="56" textAnchor="middle" fill={col} fontSize="7" fontWeight="700">{score>=70?"STRONG":score>=40?"BUILDING":"WEAK"}</text></svg></div>;
}

// ━━━ ONBOARDING FLOW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function OnboardingFlow({ userId, email, onComplete }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    full_name: "",
    phone: "",
    brokerage: "",
    brokerage_other: "",
    license_state: "",
    license_number: "",
    market: "",
  });

  const update = (k, v) => setData(p => ({ ...p, [k]: v }));

  const brokerageValue = data.brokerage === "Other" ? data.brokerage_other : data.brokerage;

  const canNext1 = data.full_name.trim().length > 1;
  const canNext2 = data.brokerage.trim().length > 0 && (data.brokerage !== "Other" || data.brokerage_other.trim().length > 0);
  const canFinish = data.market.trim().length > 0;

  const finish = async () => {
    setSaving(true);
    const payload = {
      full_name: data.full_name.trim(),
      phone: data.phone.trim() || null,
      brokerage: brokerageValue.trim() || null,
      license_state: data.license_state.trim() || null,
      license_number: data.license_number.trim() || null,
      market: data.market.trim() || null,
      onboarded: true,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
    if (!error) {
      logActivity(userId, "onboarding_complete", { brokerage: brokerageValue });
      onComplete(payload);
    }
    setSaving(false);
  };

  const inp = { width:"100%",padding:"14px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box" };
  const sel = { ...inp, cursor:"pointer" };

  const steps = [
    { n:1, label:"About You" },
    { n:2, label:"Your Brokerage" },
    { n:3, label:"Your Market" },
  ];

  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'SF Pro Display',-apple-system,sans-serif"}}>
      <div style={{width:"100%",maxWidth:520}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,marginBottom:12}}>
            <div style={{width:44,height:44,borderRadius:10,background:"linear-gradient(135deg,#00E5A0,#3B82F6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:13,color:"#fff"}}>rkrt</div>
            <span style={{fontSize:22,fontWeight:800,color:T.t}}>.in</span>
          </div>
          <div style={{fontSize:24,fontWeight:800,color:T.t,marginBottom:6}}>Welcome to LIVI AI</div>
          <div style={{fontSize:15,color:T.s}}>Let's set up your recruiting command center</div>
        </div>

        {/* Progress */}
        <div style={{display:"flex",gap:8,marginBottom:32,alignItems:"center"}}>
          {steps.map((s,i) => (
            <div key={s.n} style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:step>=s.n?T.a:T.m+"30",color:step>=s.n?"#000":T.m,fontSize:13,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.3s"}}>
                  {step>s.n?"✓":s.n}
                </div>
                <span style={{fontSize:13,fontWeight:600,color:step>=s.n?T.t:T.m,transition:"all 0.3s"}}>{s.label}</span>
              </div>
              {i<steps.length-1&&<div style={{height:1,flex:1,background:step>s.n?T.a:T.b,transition:"all 0.3s",marginLeft:8}}/>}
            </div>
          ))}
        </div>

        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:16,padding:"32px"}}>
          {/* Step 1: About You */}
          {step===1&&(
            <>
              <div style={{fontSize:20,fontWeight:800,color:T.t,marginBottom:6}}>Tell us about yourself</div>
              <div style={{fontSize:14,color:T.s,marginBottom:24}}>This personalizes your entire LIVI experience</div>
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                <div>
                  <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>FULL NAME *</div>
                  <input value={data.full_name} onChange={e=>update("full_name",e.target.value)} placeholder="Your name" style={{...inp,border:`1px solid ${data.full_name.trim()?T.a+"40":T.b}`}} autoFocus/>
                </div>
                <div>
                  <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>PHONE</div>
                  <input value={data.phone} onChange={e=>update("phone",e.target.value)} placeholder="(555) 123-4567" style={inp}/>
                </div>
              </div>
              <div style={{marginTop:24,display:"flex",justifyContent:"flex-end"}}>
                <div onClick={canNext1?()=>setStep(2):null} style={{padding:"13px 32px",borderRadius:8,background:canNext1?T.a:"#333",color:canNext1?"#000":T.m,fontSize:15,fontWeight:700,cursor:canNext1?"pointer":"default",transition:"all 0.2s"}}>
                  Continue →
                </div>
              </div>
            </>
          )}

          {/* Step 2: Brokerage */}
          {step===2&&(
            <>
              <div style={{fontSize:20,fontWeight:800,color:T.t,marginBottom:6}}>Your current brokerage</div>
              <div style={{fontSize:14,color:T.s,marginBottom:24}}>LIVI uses this to personalize content, outreach, and landing pages</div>
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                <div>
                  <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>BROKERAGE *</div>
                  <select value={data.brokerage} onChange={e=>update("brokerage",e.target.value)} style={{...sel,border:`1px solid ${data.brokerage?T.a+"40":T.b}`}}>
                    <option value="" style={{background:T.card}}>Select your brokerage...</option>
                    {BROKERAGES.map(b=><option key={b} value={b} style={{background:T.card}}>{b}</option>)}
                  </select>
                </div>
                {data.brokerage==="Other"&&(
                  <div>
                    <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>BROKERAGE NAME</div>
                    <input value={data.brokerage_other} onChange={e=>update("brokerage_other",e.target.value)} placeholder="Enter your brokerage name" style={{...inp,border:`1px solid ${data.brokerage_other.trim()?T.a+"40":T.b}`}} autoFocus/>
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div>
                    <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>LICENSE STATE</div>
                    <input value={data.license_state} onChange={e=>update("license_state",e.target.value.toUpperCase())} placeholder="TX" maxLength={2} style={inp}/>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>LICENSE NUMBER</div>
                    <input value={data.license_number} onChange={e=>update("license_number",e.target.value)} placeholder="RE123456" style={inp}/>
                  </div>
                </div>
              </div>
              <div style={{marginTop:24,display:"flex",justifyContent:"space-between"}}>
                <div onClick={()=>setStep(1)} style={{padding:"13px 24px",borderRadius:8,background:T.d,color:T.s,fontSize:15,fontWeight:700,cursor:"pointer"}}>← Back</div>
                <div onClick={canNext2?()=>setStep(3):null} style={{padding:"13px 32px",borderRadius:8,background:canNext2?T.a:"#333",color:canNext2?"#000":T.m,fontSize:15,fontWeight:700,cursor:canNext2?"pointer":"default",transition:"all 0.2s"}}>
                  Continue →
                </div>
              </div>
            </>
          )}

          {/* Step 3: Market */}
          {step===3&&(
            <>
              <div style={{fontSize:20,fontWeight:800,color:T.t,marginBottom:6}}>Your target market</div>
              <div style={{fontSize:14,color:T.s,marginBottom:24}}>Where are you recruiting agents? LIVI will focus intelligence here</div>
              <div>
                <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>PRIMARY MARKET *</div>
                <input value={data.market} onChange={e=>update("market",e.target.value)} placeholder="Austin, TX" style={{...inp,border:`1px solid ${data.market.trim()?T.a+"40":T.b}`}} autoFocus/>
                <div style={{fontSize:12,color:T.m,marginTop:6}}>e.g. "Austin, TX" or "Dallas-Fort Worth"</div>
              </div>

              {/* Preview of what gets personalized */}
              {brokerageValue&&(
                <div style={{marginTop:20,padding:"16px 18px",borderRadius:10,background:T.as,border:`1px solid ${T.a}20`}}>
                  <div style={{fontSize:12,color:T.a,fontWeight:700,letterSpacing:1,marginBottom:8}}>🎯 LIVI WILL PERSONALIZE</div>
                  <div style={{fontSize:13,color:T.s,lineHeight:1.7}}>
                    • Landing pages: "Why top <strong style={{color:T.t}}>{brokerageValue}</strong> agents are switching"<br/>
                    • Content angles: Targeting {brokerageValue} agents in {data.market||"your market"}<br/>
                    • Outreach: Competitor-aware messaging vs {brokerageValue}
                  </div>
                </div>
              )}

              <div style={{marginTop:24,display:"flex",justifyContent:"space-between"}}>
                <div onClick={()=>setStep(2)} style={{padding:"13px 24px",borderRadius:8,background:T.d,color:T.s,fontSize:15,fontWeight:700,cursor:"pointer"}}>← Back</div>
                <div onClick={canFinish&&!saving?finish:null} style={{padding:"13px 32px",borderRadius:8,background:canFinish&&!saving?T.a:"#333",color:canFinish&&!saving?"#000":T.m,fontSize:15,fontWeight:700,cursor:canFinish&&!saving?"pointer":"default",transition:"all 0.2s",display:"flex",alignItems:"center",gap:8}}>
                  {saving?"Setting up…":"🚀 Launch LIVI"}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{textAlign:"center",marginTop:16,fontSize:13,color:T.m}}>Signed in as {email}</div>
      </div>
    </div>
  );
}

// ━━━ DELETE CONFIRM MODAL ━━━━━━━━━━━━━━━━━━━━━━━━
function DeleteModal({ lead, onConfirm, onCancel, deleting }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(4px)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:T.card,border:`1px solid ${T.r}30`,borderRadius:16,padding:"32px 28px",maxWidth:400,width:"100%"}}>
        <div style={{fontSize:24,marginBottom:12,textAlign:"center"}}>🗑️</div>
        <div style={{fontSize:20,fontWeight:800,color:T.t,textAlign:"center",marginBottom:8}}>Delete Lead?</div>
        <div style={{fontSize:15,color:T.s,textAlign:"center",marginBottom:24,lineHeight:1.6}}>
          This will permanently delete <strong style={{color:T.t}}>{lead.first_name} {lead.last_name}</strong> and all their data. This cannot be undone.
        </div>
        <div style={{display:"flex",gap:12}}>
          <div onClick={onCancel} style={{flex:1,padding:"13px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.s,fontSize:15,fontWeight:700,cursor:"pointer",textAlign:"center"}}>Cancel</div>
          <div onClick={!deleting?onConfirm:null} style={{flex:1,padding:"13px",borderRadius:8,background:T.r,color:"#fff",fontSize:15,fontWeight:700,cursor:deleting?"wait":"pointer",textAlign:"center",opacity:deleting?0.6:1}}>
            {deleting?"Deleting…":"Delete Forever"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ━━━ LEAD DETAIL PAGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function LeadPage({lead,onBack,onAskInline,inlineResponse,inlineLoading,userId,onDelete}){
  const [editing,setEditing]=useState(false);
  const [info,setInfo]=useState({first_name:lead.first_name||"",last_name:lead.last_name||"",email:lead.email||"",phone:lead.phone||"",market:lead.market||"",brokerage:lead.brokerage||""});
  const [notes,setNotes]=useState(lead._notes||[]);
  const [newNote,setNewNote]=useState("");
  const [commLog,setCommLog]=useState(lead._comms||[]);
  const [commType,setCommType]=useState("call");
  const [commNote,setCommNote]=useState("");
  const [showDelete,setShowDelete]=useState(false);
  const [deleting,setDeleting]=useState(false);
  const [saving,setSaving]=useState(false);

  if(!lead)return null;

  const addNote=()=>{if(!newNote.trim())return;setNotes(p=>[{text:newNote.trim(),date:new Date().toISOString(),id:Date.now()},...p]);setNewNote("");};
  const addComm=()=>{if(!commNote.trim())return;setCommLog(p=>[{type:commType,note:commNote.trim(),date:new Date().toISOString(),id:Date.now()},...p]);setCommNote("");};
  const commIcons={call:"📞",text:"💬",email:"📧",meeting:"🤝",dm:"📱",linkedin:"💼"};

  const saveEdits = async () => {
    setSaving(true);
    try {
      await fetch(`${LIVI_SUPA}/leads?id=eq.${lead.id}`, {
        method:"PATCH",
        headers:{"apikey":LIVI_KEY,"Authorization":`Bearer ${LIVI_KEY}`,"Content-Type":"application/json","Prefer":"return=representation"},
        body:JSON.stringify(info)
      });
      setEditing(false);
    } catch(e) { console.error("Save lead edits error:", e); }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const r = await fetch(`${LIVI_SUPA}/leads?id=eq.${lead.id}`, {
        method:"DELETE",
        headers:{"apikey":LIVI_KEY,"Authorization":`Bearer ${LIVI_KEY}`}
      });
      if(r.ok) {
        logActivity(userId, 'delete_lead', {lead_name:`${lead.first_name} ${lead.last_name}`});
        onDelete(lead.id);
        onBack();
      }
    } catch(e) { console.error("Delete lead error:", e); }
    setDeleting(false);
  };

  const EF=({label,field})=>(<div style={{marginBottom:14}}><div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:4}}>{label}</div>{editing?<input value={info[field]} onChange={ev=>setInfo(p=>({...p,[field]:ev.target.value}))} style={{width:"100%",padding:"10px 14px",borderRadius:6,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:15,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>:<div style={{fontSize:16,color:T.t}}>{info[field]||"—"}</div>}</div>);

  return(
    <div style={{flex:1,overflow:"auto",padding:"24px 32px"}}>
      {showDelete&&<DeleteModal lead={lead} onConfirm={handleDelete} onCancel={()=>setShowDelete(false)} deleting={deleting}/>}
      <div onClick={onBack} style={{display:"inline-flex",alignItems:"center",gap:8,fontSize:15,color:T.s,cursor:"pointer",marginBottom:16}}>← Back to Pipeline</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:12}}>
        <div><h1 style={{fontSize:32,fontWeight:800,margin:"0 0 6px"}}>{info.first_name} {info.last_name}</h1><div style={{fontSize:16,color:T.s}}>{info.market||"Unknown Market"} · {info.brokerage||"Unknown Brokerage"}</div></div>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          {editing?(
            <div onClick={saving?null:saveEdits} style={{padding:"10px 18px",borderRadius:8,background:T.a,color:"#000",fontSize:14,fontWeight:700,cursor:saving?"wait":"pointer"}}>
              {saving?"Saving…":"✓ Save"}
            </div>
          ):(
            <div onClick={()=>setEditing(true)} style={{padding:"10px 18px",borderRadius:8,background:T.card,color:T.s,fontSize:14,fontWeight:700,cursor:"pointer",border:`1px solid ${T.b}`}}>✏️ Edit</div>
          )}
          {editing&&<div onClick={()=>setEditing(false)} style={{padding:"10px 18px",borderRadius:8,background:T.d,color:T.m,fontSize:14,fontWeight:700,cursor:"pointer",border:`1px solid ${T.b}`}}>Cancel</div>}
          <TPill t={lead.tier}/><UPill u={lead.urgency}/>
          <div onClick={()=>setShowDelete(true)} style={{padding:"10px 14px",borderRadius:8,background:T.r+"15",color:T.r,fontSize:14,fontWeight:700,cursor:"pointer",border:`1px solid ${T.r}20`}}>🗑️</div>
        </div>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:28,flexWrap:"wrap"}}>{STAGES.map(s=><div key={s.id} style={{flex:1,minWidth:80,padding:"10px 0",borderRadius:6,textAlign:"center",fontSize:13,fontWeight:700,background:lead.pipeline_stage===s.id?s.c+"20":T.d,color:lead.pipeline_stage===s.id?s.c:T.m,border:`1px solid ${lead.pipeline_stage===s.id?s.c+"30":T.b}`,cursor:"pointer"}}>{s.l}</div>)}</div>

      <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
        <div style={{background:T.card,borderRadius:12,padding:"24px 26px",border:`1px solid ${T.b}`}}>
          <div style={{fontSize:17,fontWeight:700,color:T.t,marginBottom:16}}>📇 Contact Info</div>
          <EF label="EMAIL" field="email"/><EF label="PHONE" field="phone"/><EF label="BROKERAGE" field="brokerage"/><EF label="MARKET" field="market"/>
          {lead.license_number&&<div style={{marginBottom:14}}><div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:4}}>LICENSE</div><div style={{fontSize:16,color:T.t}}>{lead.license_number}</div></div>}
          <div style={{marginBottom:14}}><div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:4}}>SOURCE</div><div style={{fontSize:16,color:T.t}}>{lead.source||"Ad"}</div></div>
          {(lead.youtube_channel||lead.linkedin_url||lead.website_url)&&<div style={{marginTop:8}}><div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:8}}>LINKS</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{lead.youtube_channel&&<a href={lead.youtube_channel} target="_blank" rel="noreferrer" style={{padding:"6px 12px",borderRadius:6,background:T.r+"15",color:T.r,fontSize:13,fontWeight:600,textDecoration:"none"}}>YouTube</a>}{lead.linkedin_url&&<a href={lead.linkedin_url} target="_blank" rel="noreferrer" style={{padding:"6px 12px",borderRadius:6,background:T.bl+"15",color:T.bl,fontSize:13,fontWeight:600,textDecoration:"none"}}>LinkedIn</a>}{lead.website_url&&<a href={lead.website_url} target="_blank" rel="noreferrer" style={{padding:"6px 12px",borderRadius:6,background:T.a+"15",color:T.a,fontSize:13,fontWeight:600,textDecoration:"none"}}>Website</a>}</div></div>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>{[["TIER",lead.tier,T.p],["URGENCY",lead.urgency,{HIGH:T.r,MEDIUM:T.y,LOW:T.a}[lead.urgency]||T.s],["TREND",lead.trend||"—",T.bl]].map(([l,v,c])=><div key={l} style={{background:T.card,borderRadius:10,padding:"16px",border:`1px solid ${T.b}`,textAlign:"center"}}><div style={{fontSize:11,color:T.m,letterSpacing:2,marginBottom:4}}>{l}</div><div style={{fontSize:20,fontWeight:800,color:c}}>{v||"—"}</div></div>)}</div>
          {lead.outreach_angle&&<div style={{background:T.as,borderRadius:10,padding:"18px 20px",border:`1px solid ${T.a}20`}}><div style={{fontSize:12,color:T.a,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>🎯 OUTREACH ANGLE</div><div style={{fontSize:15,color:T.t,lineHeight:1.6}}>{lead.outreach_angle}</div></div>}
          {lead.urgency_reason&&<div style={{background:T.y+"08",borderRadius:10,padding:"18px 20px",border:`1px solid ${T.y}20`}}><div style={{fontSize:12,color:T.y,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>⚡ URGENCY REASON</div><div style={{fontSize:15,color:T.t,lineHeight:1.6}}>{lead.urgency_reason}</div></div>}
        </div>
      </div>

      <div style={{background:T.card,borderRadius:12,padding:"24px 26px",border:`1px solid ${T.b}`,marginBottom:24}}><div style={{fontSize:17,fontWeight:700,color:T.t,marginBottom:14}}>🤖 Ask LIVI</div><div className="quick-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>{[["📱","Draft Outreach",`Draft a personalized recruiting message to ${lead.first_name} ${lead.last_name}. They're at ${lead.brokerage||"unknown"} in ${lead.market||"unknown"}.${lead.outreach_angle?" Angle: "+lead.outreach_angle:""}`],["🔄","Follow Up",`Write a follow-up to ${lead.first_name} ${lead.last_name}. Casual and value-driven.`],["📋","Meeting Prep",`Meeting prep for ${lead.first_name} ${lead.last_name} at ${lead.brokerage||"unknown"}. Talking points, objections, close.`],["🎯","Close Script",`Closing script for ${lead.first_name} ${lead.last_name}.`],["🔍","Research",`Research ${lead.first_name} ${lead.last_name} in ${lead.market||"their market"}.`],["💡","Objections",`Objections ${lead.first_name} will have about switching from ${lead.brokerage||"their brokerage"} to LPT?`],["📊","Compare",`Compare LPT vs ${lead.brokerage||"their brokerage"} in ${lead.market||"this market"}.`],["🎨","Recruit Post",`Recruiting post for ${lead.market||"this market"} agents.`]].map(([icon,label,q],i)=><div key={i} onClick={()=>{onAskInline(q);if(label==="Draft Outreach"||label==="Research")logActivity(userId,label==="Research"?"research_lead":"draft_outreach",{lead_name:`${lead.first_name} ${lead.last_name}`})}} style={{background:T.d,border:`1px solid ${T.b}`,borderRadius:8,padding:"12px 14px",cursor:inlineLoading?"wait":"pointer",display:"flex",alignItems:"center",gap:10,opacity:inlineLoading?0.5:1}} onMouseOver={ev=>{if(!inlineLoading)ev.currentTarget.style.borderColor=T.bh}} onMouseOut={ev=>ev.currentTarget.style.borderColor=T.b}><span style={{fontSize:18}}>{icon}</span><span style={{fontSize:14,color:T.s,fontWeight:600}}>{label}</span></div>)}</div>
      {inlineLoading&&<div style={{marginTop:16,padding:"16px 20px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:8,height:8,borderRadius:"50%",background:T.a,animation:"pulse 1s infinite"}}/><span style={{fontSize:14,color:T.s}}>LIVI is thinking...</span></div></div>}
      {inlineResponse&&!inlineLoading&&<div style={{marginTop:16,padding:"20px 24px",borderRadius:10,background:T.as,border:`1px solid ${T.a}20`}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:13,color:T.a,fontWeight:700,letterSpacing:1.5}}>LIVI RESPONSE</span><span onClick={()=>{navigator.clipboard?.writeText(inlineResponse);}} style={{fontSize:12,color:T.s,cursor:"pointer"}}>📋 Copy</span></div><pre style={{fontSize:14,color:T.t,lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0}}>{inlineResponse}</pre></div>}
      </div>

      <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
        <div style={{background:T.card,borderRadius:12,padding:"24px 26px",border:`1px solid ${T.b}`}}><div style={{fontSize:17,fontWeight:700,color:T.t,marginBottom:14}}>📝 Notes</div><div style={{display:"flex",gap:8,marginBottom:14}}><textarea value={newNote} onChange={ev=>setNewNote(ev.target.value)} onKeyDown={ev=>{if(ev.key==="Enter"&&!ev.shiftKey){ev.preventDefault();addNote();}}} placeholder="Add a note..." rows={2} style={{flex:1,padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:14,fontFamily:"inherit",outline:"none",resize:"none",lineHeight:1.5}}/><div onClick={addNote} style={{padding:"12px 18px",borderRadius:8,background:newNote.trim()?T.am:T.d,color:newNote.trim()?T.a:T.m,fontSize:14,fontWeight:700,cursor:newNote.trim()?"pointer":"default",display:"flex",alignItems:"center"}}>Save</div></div><div style={{maxHeight:300,overflow:"auto"}}>{notes.length>0?notes.map(n=><div key={n.id} style={{padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,marginBottom:6}}><div style={{fontSize:14,color:T.t,lineHeight:1.5}}>{n.text}</div><div style={{fontSize:11,color:T.m,marginTop:4}}>{new Date(n.date).toLocaleString()}</div></div>):<div style={{fontSize:14,color:T.m,textAlign:"center",padding:"20px"}}>No notes yet</div>}</div></div>
        <div style={{background:T.card,borderRadius:12,padding:"24px 26px",border:`1px solid ${T.b}`}}><div style={{fontSize:17,fontWeight:700,color:T.t,marginBottom:14}}>📞 Communication</div><div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>{Object.entries(commIcons).map(([k,v])=><div key={k} onClick={()=>setCommType(k)} style={{padding:"6px 12px",borderRadius:6,background:commType===k?T.am:T.d,color:commType===k?T.a:T.s,fontSize:13,fontWeight:600,cursor:"pointer"}}>{v} {k.charAt(0).toUpperCase()+k.slice(1)}</div>)}</div><div style={{display:"flex",gap:8,marginBottom:14}}><input value={commNote} onChange={ev=>setCommNote(ev.target.value)} onKeyDown={ev=>{if(ev.key==="Enter")addComm();}} placeholder={`Log ${commType}...`} style={{flex:1,padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:14,fontFamily:"inherit",outline:"none"}}/><div onClick={addComm} style={{padding:"12px 18px",borderRadius:8,background:commNote.trim()?T.am:T.d,color:commNote.trim()?T.a:T.m,fontSize:14,fontWeight:700,cursor:commNote.trim()?"pointer":"default"}}>Log</div></div><div style={{maxHeight:300,overflow:"auto"}}>{commLog.length>0?commLog.map(c=><div key={c.id} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:`1px solid ${T.b}`}}><span style={{fontSize:18}}>{commIcons[c.type]||"📌"}</span><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:700,color:T.t,textTransform:"capitalize"}}>{c.type}</span><span style={{fontSize:11,color:T.m}}>{new Date(c.date).toLocaleString()}</span></div><div style={{fontSize:14,color:T.s,lineHeight:1.5,marginTop:2}}>{c.note}</div></div></div>):<div style={{fontSize:14,color:T.m,textAlign:"center",padding:"20px"}}>No communication logged</div>}</div></div>
      </div>

      <div style={{background:T.card,borderRadius:12,padding:"24px 26px",border:`1px solid ${T.b}`}}><div style={{fontSize:17,fontWeight:700,color:T.t,marginBottom:14}}>🔍 Intel Dossier</div>{lead.raw_dossier?<pre style={{fontSize:14,color:T.s,lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0,maxHeight:400,overflow:"auto"}}>{lead.raw_dossier}</pre>:<div style={{textAlign:"center",padding:"24px"}}><div style={{fontSize:14,color:T.m,marginBottom:12}}>No intel yet</div><div onClick={()=>onAskInline(`Research ${lead.first_name} ${lead.last_name} in ${lead.market||"their market"}. Find production, reviews, social media, outreach angle.`)} style={{display:"inline-block",padding:"10px 20px",borderRadius:8,background:T.am,color:T.a,fontSize:14,fontWeight:700,cursor:"pointer"}}>🔍 Ask LIVI to Research</div></div>}</div>
    </div>
  );
}

// ━━━ AGENT DIRECTORY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AgentDirectory({userId,userProfile,onAddLead}){
  const [results,setResults]=useState([]);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(false);
  const [searched,setSearched]=useState(false);
  const [filters,setFilters]=useState({state:"",brokerage:"",name:"",city:"",newDays:""});
  const [page,setPage]=useState(0);
  const [added,setAdded]=useState({});
  const [error,setError]=useState(null);
  const [selectedAgent,setSelectedAgent]=useState(null);
  const [enriching,setEnriching]=useState(false);
  const PER=50;

  const doSearch=async(filtersOverride,pg=0)=>{
    const f = filtersOverride || filters;
    if(!f.state&&!f.brokerage&&!f.name&&!f.city&&!f.newDays) return;
    setLoading(true); setPage(pg); setError(null);
    try {
      const {data,total:t}=await agentSearch({...f,limit:PER,offset:pg*PER});
      setResults(data||[]); setTotal(t); setSearched(true);
      logActivity(userId,'search_agents',{state:f.state,brokerage:f.brokerage,name:f.name,results:t});
    } catch(e) {
      setError("Search failed. Please try again.");
      setResults([]); setTotal(0);
    }
    setLoading(false);
  };

  const updateAndSearch=(newFilters)=>{
    const f = {...filters,...newFilters};
    setFilters(f);
    doSearch(f,0);
  };

  const addAsNewLead=(agent)=>{
    if(!onAddLead)return;
    const fn=(agent.first_name||agent.full_name?.split(" ")[0]||"").replace(/\b(LLC|PA|PL|PLLC|INC|CORP|LTD)\b\.?/gi,'').trim().toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
    const ln=(agent.last_name||agent.full_name?.split(" ").slice(1).join(" ")||"").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
    setSelectedAgent(null);
    onAddLead({
      first_name:fn,
      last_name:ln,
      email:agent.personal_email||"",
      phone:agent.mobile_phone||"",
      brokerage:agent.brokerage_name||"",
      market:agent.city||"",
      source:"Agent Directory",
      notes:"",
    });
  };

  const saveEnrichedData=async(enrichedData)=>{
    if(!selectedAgent) return;
    const updates={enriched_at:enrichedData.enriched_at||new Date().toISOString()};
    if(enrichedData.personal_email)updates.personal_email=enrichedData.personal_email;
    if(enrichedData.work_email)updates.work_email=enrichedData.work_email;
    if(enrichedData.mobile_phone)updates.mobile_phone=enrichedData.mobile_phone;
    if(enrichedData.linkedin_url)updates.linkedin_url=enrichedData.linkedin_url;
    if(enrichedData.zillow_url)updates.zillow_url=enrichedData.zillow_url;
    if(enrichedData.zillow_rating)updates.zillow_rating=enrichedData.zillow_rating;
    if(enrichedData.zillow_reviews)updates.zillow_reviews=enrichedData.zillow_reviews;
    if(enrichedData.recent_sales_count)updates.recent_sales_count=enrichedData.recent_sales_count;
    if(enrichedData.sales_volume)updates.sales_volume=enrichedData.sales_volume;
    await supabase.from('agent_directory').update(updates).eq('id',selectedAgent.id);
    if(updates.personal_email||updates.mobile_phone){
      const leadUpdate={};
      if(updates.personal_email)leadUpdate.email=updates.personal_email;
      if(updates.mobile_phone)leadUpdate.phone=updates.mobile_phone;
      if(updates.linkedin_url)leadUpdate.linkedin=updates.linkedin_url;
      if(updates.zillow_url)leadUpdate.zillow=updates.zillow_url;
      await supabase.from('leads').update(leadUpdate).eq('license_number',selectedAgent.license_number).eq('license_state',selectedAgent.state);
    }
    setSelectedAgent(prev=>({...prev,...updates}));
    setResults(prev=>prev.map(a=>a.id===selectedAgent.id?{...a,...updates}:a));
  };

  const cleanName=(n)=>(n||'').replace(/\b(LLC|PA|PL|PLLC|INC|CORP|LTD|JR|SR|II|III|IV)\b\.?/gi,'').trim();
  const getBrokerageSlug=(b)=>{const name=(b||'').toUpperCase();if(name.includes('LPT'))return'LPT';if(name.includes('EXP'))return'eXp';if(name.includes('KELLER'))return'KW';if(name.includes('REMAX')||name.includes('RE/MAX'))return'REMAX';if(name.includes('COMPASS'))return'Compass';if(name.includes('COLDWELL'))return'CB';return'';};

  const enrichAgent=async(agent)=>{
    setEnriching(true);
    try {
      const r=await fetch("https://usknntguurefeyzusbdh.supabase.co/functions/v1/enrich-agent",{
        method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${LIVI_KEY}`},
        body:JSON.stringify({agent_id:agent.id,first_name:cleanName(agent.first_name||agent.full_name?.split(" ")[0]||"").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()),last_name:cleanName(agent.last_name||agent.full_name?.split(" ").slice(1).join(" ")||"").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()),brokerage_name:(agent.brokerage_name||"").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()),brokerage_slug:getBrokerageSlug(agent.brokerage_name),state:agent.state||""})
      });
      const d=await r.json();
      console.log('enrich-agent raw response:',JSON.stringify(d));
      const e=d.enriched||d;
      const zillow_url_debug=e.zillow_url||d.profile?.zillow_url;
      console.log('zillow_url extracted:',zillow_url_debug);
      if(e.mobile_phone?.includes('555'))delete e.mobile_phone;
      if(e.personal_email?.match(/@(lptrealty|kwrealty|exprealty|coldwellbanker|remax)\.com/i))delete e.personal_email;
      if(e.linkedin_url?.match(/\d{6,}/))delete e.linkedin_url;
      if(e.enriched_at||e.personal_email||e.work_email||e.mobile_phone||e.linkedin_url||e.zillow_url||d.profile?.zillow_url){
        const zillow_url=e.zillow_url||d.profile?.zillow_url;
        const enrichedData={...e,enriched_at:e.enriched_at||new Date().toISOString(),...(zillow_url?{zillow_url}:{})};
        await saveEnrichedData(enrichedData);
      } else if(d.error){
        setSelectedAgent({...agent,_enrichError:d.error});
      } else {
        setSelectedAgent({...agent,_enrichError:"No match found"});
      }
    } catch(e) {
      setSelectedAgent({...agent,_enrichError:"Enrichment failed. Try again."});
    }
    setEnriching(false);
  };

  const topBrokerages=[
    {label:"eXp Realty",q:"EXP REALTY"},{label:"Compass",q:"COMPASS"},{label:"Real Broker",q:"REAL BROKER"},
    {label:"Fathom",q:"FATHOM"},{label:"Keller Williams",q:"KELLER WILLIAMS"},{label:"Coldwell Banker",q:"COLDWELL BANKER"},
    {label:"HomeSmart",q:"HOMESMART"},{label:"LPT Realty",q:"LPT REALTY"}
  ];

  const fmtDate=(d)=>{if(!d)return"";const dt=new Date(d+"T00:00:00");const now=new Date();const diff=Math.floor((now-dt)/(1000*86400));if(diff<1)return"Today";if(diff<7)return diff+"d ago";if(diff<30)return Math.floor(diff/7)+"w ago";return dt.toLocaleDateString("en-US",{month:"short",day:"numeric",year:dt.getFullYear()!==now.getFullYear()?"numeric":undefined});};

  return (
    <>
      <div style={{display:"flex",gap:16,marginBottom:20,flexWrap:"wrap"}}>
        {[["🇺🇸","1.2M+","Licensed Agents",T.a],["🏢","51K+","Brokerages",T.bl],["📍","4","States Live",T.p],["🆕","~1,000/mo","New TX Agents",T.y]].map(([ic,v,l,c],i)=>
          <div key={i} style={{flex:"1 1 140px",background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"18px 22px",display:"flex",alignItems:"center",gap:14}}>
            <div style={{fontSize:24}}>{ic}</div>
            <div><div style={{fontSize:22,fontWeight:800,color:T.t}}>{v}</div><div style={{fontSize:11,color:c,fontWeight:700,letterSpacing:1}}>{l.toUpperCase()}</div></div>
          </div>
        )}
      </div>

      <div className="newly-licensed-row" style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{fontSize:14,fontWeight:700,color:T.t,display:"flex",alignItems:"center",gap:6}}>🆕 Newly Licensed:</div>
        {[{l:"Last 7 days",d:"7"},{l:"Last 30 days",d:"30"},{l:"Last 90 days",d:"90"},{l:"Last 6 months",d:"180"},{l:"This year",d:"365"}].map(b=>
          <div key={b.d} onClick={()=>updateAndSearch({newDays:b.d,state:filters.state||""})} style={{padding:"7px 16px",borderRadius:7,background:filters.newDays===b.d?T.y+"25":T.d,border:`1px solid ${filters.newDays===b.d?T.y+"50":T.b}`,color:filters.newDays===b.d?T.y:T.s,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.12s"}}>{b.l}</div>
        )}
      </div>

      <div style={{background:T.card,borderRadius:12,padding:"24px 26px",border:`1px solid ${T.b}`,marginBottom:20}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr auto",gap:12,alignItems:"end"}} className="four-col">
          <div>
            <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>STATE</div>
            <select value={filters.state} onChange={e=>setFilters(p=>({...p,state:e.target.value}))} style={{width:"100%",padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:15,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}>
              <option value="" style={{background:T.card}}>All States</option>
              <option value="TX" style={{background:T.card}}>Texas</option>
              <option value="FL" style={{background:T.card}}>Florida</option>
              <option value="NY" style={{background:T.card}}>New York</option>
              <option value="CT" style={{background:T.card}}>Connecticut</option>
            </select>
          </div>
          <div>
            <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>BROKERAGE</div>
            <input value={filters.brokerage} onChange={e=>setFilters(p=>({...p,brokerage:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter")doSearch()}} placeholder="eXp, Compass, KW..." style={{width:"100%",padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:15,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
          </div>
          <div>
            <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>AGENT NAME</div>
            <input value={filters.name} onChange={e=>setFilters(p=>({...p,name:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter")doSearch()}} placeholder="Search by name..." style={{width:"100%",padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:15,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
          </div>
          <div>
            <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>CITY / COUNTY</div>
            <input value={filters.city} onChange={e=>setFilters(p=>({...p,city:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter")doSearch()}} placeholder="Austin, Brooklyn..." style={{width:"100%",padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:15,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
          </div>
          <div className="agent-search-btns" style={{display:"flex",gap:8}}>
            <div onClick={()=>doSearch()} style={{padding:"12px 28px",borderRadius:8,background:T.a,color:"#000",fontSize:15,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",height:"fit-content"}}>🔍 Search</div>
            {searched&&<div onClick={()=>{setFilters({state:"",brokerage:"",name:"",city:"",newDays:""});setSearched(false);setResults([]);setTotal(0);}} style={{padding:"12px 16px",borderRadius:8,background:T.d,color:T.s,fontSize:15,fontWeight:700,cursor:"pointer",height:"fit-content"}}>✕</div>}
          </div>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:14}}>
          {topBrokerages.map(b=>
            <div key={b.q} onClick={()=>updateAndSearch({brokerage:b.q})} style={{padding:"6px 14px",borderRadius:6,background:filters.brokerage===b.q?T.am:T.d,border:`1px solid ${filters.brokerage===b.q?T.a+"40":T.b}`,color:filters.brokerage===b.q?T.a:T.s,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.12s"}}>{b.label}</div>
          )}
        </div>
      </div>

      {error && <div style={{padding:"16px 20px",borderRadius:10,background:T.r+"15",border:`1px solid ${T.r}30`,color:T.r,marginBottom:16,fontSize:14}}>{error}</div>}

      {loading && <div style={{textAlign:"center",padding:40}}><div style={{fontSize:24,animation:"pulse 1s infinite"}}>🔍</div><div style={{color:T.s,marginTop:8}}>Searching 1.2M+ agents...</div></div>}

      {searched && !loading && (
        <div style={{background:T.card,borderRadius:12,border:`1px solid ${T.b}`,overflow:"hidden"}}>
          <div style={{padding:"16px 24px",borderBottom:`1px solid ${T.b}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
            <div style={{fontSize:14,color:T.s}}><span style={{fontWeight:700,color:T.t}}>{total.toLocaleString()}</span> agents found{filters.newDays?<span style={{color:T.y,fontWeight:600}}> · newly licensed (last {filters.newDays}d)</span>:""}</div>
            {total>PER && <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {page>0 && <div onClick={()=>doSearch(null,page-1)} style={{padding:"6px 14px",borderRadius:6,background:T.d,color:T.s,fontSize:13,cursor:"pointer"}}>← Prev</div>}
              <div style={{padding:"6px 14px",fontSize:13,color:T.t}}>Page {page+1} of {Math.ceil(total/PER)}</div>
              {(page+1)*PER<total && <div onClick={()=>doSearch(null,page+1)} style={{padding:"6px 14px",borderRadius:6,background:T.d,color:T.s,fontSize:13,cursor:"pointer"}}>Next →</div>}
            </div>}
          </div>
          {results.length===0 ? (
            <div style={{textAlign:"center",padding:40,color:T.m}}>No agents found. Try broadening your search.</div>
          ) : (
            <table className="crm-table" style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
              <thead><tr style={{borderBottom:`1px solid ${T.b}`}}>
                {["Agent","License","Brokerage","Location","Type",filters.newDays?"Licensed":"",""].map((h,i)=>
                  h!=null&&<th key={i} style={{padding:"12px 16px",textAlign:"left",fontSize:11,color:T.m,fontWeight:700,letterSpacing:1.5}}>{h}</th>
                )}
              </tr></thead>
              <tbody>
                {results.map((a,i)=>
                  <tr key={a.id||i} onClick={()=>setSelectedAgent(a)} style={{borderBottom:`1px solid ${T.b}`,transition:"background 0.1s",cursor:"pointer"}} onMouseOver={e=>e.currentTarget.style.background=T.hover} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{padding:"14px 16px"}}>
                      <div style={{fontWeight:700,color:T.t}}>{a.full_name||"—"}</div>
                      <div style={{fontSize:12,color:T.s}}>{a.state}</div>
                    </td>
                    <td style={{padding:"14px 16px",color:T.s,fontSize:13,fontFamily:"monospace"}}>{a.license_number||"—"}</td>
                    <td style={{padding:"14px 16px"}}>
                      <div style={{color:T.t,fontWeight:600,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.brokerage_name||"—"}</div>
                    </td>
                    <td style={{padding:"14px 16px",color:T.s}}>{a.city||a.county||"—"}</td>
                    <td style={{padding:"14px 16px"}}><span style={{fontSize:12,padding:"3px 8px",borderRadius:4,background:(a.license_type||"").includes("Broker")?T.p+"20":T.bl+"20",color:(a.license_type||"").includes("Broker")?T.p:T.bl,fontWeight:600}}>{(a.license_type||"").includes("Broker")?"Broker":"Agent"}</span></td>
                    {filters.newDays&&<td style={{padding:"14px 16px"}}>{a.original_license_date?<span style={{fontSize:12,padding:"3px 8px",borderRadius:4,background:T.y+"20",color:T.y,fontWeight:600}}>{fmtDate(a.original_license_date)}</span>:"—"}</td>}
                    <td style={{padding:"14px 16px",textAlign:"right"}}>
                      {added[a.license_number] ? (
                        <span style={{fontSize:13,color:T.a,fontWeight:600}}>✓ Added</span>
                      ) : (
                        <div onClick={(e)=>{e.stopPropagation();addAsNewLead(a);}} style={{padding:"6px 14px",borderRadius:6,background:T.am,color:T.a,fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",display:"inline-block"}}>+ Add Lead</div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {total>PER && <div style={{padding:"16px 24px",borderTop:`1px solid ${T.b}`,display:"flex",justifyContent:"center",gap:8}}>
            {page>0 && <div onClick={()=>doSearch(null,page-1)} style={{padding:"8px 18px",borderRadius:6,background:T.d,color:T.s,fontSize:13,cursor:"pointer"}}>← Previous</div>}
            <div style={{padding:"8px 18px",fontSize:13,color:T.t}}>Page {page+1} of {Math.ceil(total/PER)}</div>
            {(page+1)*PER<total && <div onClick={()=>doSearch(null,page+1)} style={{padding:"8px 18px",borderRadius:6,background:T.d,color:T.s,fontSize:13,cursor:"pointer"}}>Next →</div>}
          </div>}
        </div>
      )}

      {!searched && !loading && (
        <div style={{textAlign:"center",padding:"60px 20px"}}>
          <div style={{fontSize:48,marginBottom:16}}>🔍</div>
          <div style={{fontSize:20,fontWeight:700,color:T.t,marginBottom:8}}>1.2M+ Real Licensed Agents</div>
          <div style={{fontSize:15,color:T.s,maxWidth:500,margin:"0 auto",lineHeight:1.6}}>Search by state, brokerage, name, or city. Every record is from official state licensing boards. Add agents directly to your recruiting pipeline.</div>
          <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:10,marginTop:24}}>
            {[{l:"🆕 New TX agents (30d)",f:{state:"TX",brokerage:"",name:"",city:"",newDays:"30"}},{l:"eXp agents in TX",f:{state:"TX",brokerage:"EXP REALTY",name:"",city:"",newDays:""}},{l:"Compass in NY",f:{state:"NY",brokerage:"COMPASS",name:"",city:"",newDays:""}},{l:"All LPT Realty",f:{state:"",brokerage:"LPT REALTY",name:"",city:"",newDays:""}}].map((ex,i)=>
              <div key={i} onClick={()=>{setFilters(ex.f);doSearch(ex.f,0);}} style={{padding:"10px 18px",borderRadius:8,background:i===0?T.y+"20":T.am,color:i===0?T.y:T.a,fontSize:14,fontWeight:600,cursor:"pointer",border:`1px solid ${i===0?T.y+"30":T.a+"20"}`}}>{ex.l}</div>
            )}
          </div>
        </div>
      )}

      {selectedAgent && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>{setSelectedAgent(null);}}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:16,padding:"32px 28px",maxWidth:520,width:"100%",maxHeight:"85vh",overflowY:"auto",position:"relative"}}>
            <div onClick={()=>{setSelectedAgent(null);}} style={{position:"absolute",top:16,right:16,cursor:"pointer",color:T.s,fontSize:18,fontWeight:700}}>✕</div>
            <div style={{fontSize:22,fontWeight:800,color:T.t,marginBottom:4}}>{selectedAgent.full_name||"—"}</div>
            <div style={{fontSize:14,color:T.s,marginBottom:20}}>{selectedAgent.brokerage_name||"—"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
              {[["State",selectedAgent.state],["City",selectedAgent.city||selectedAgent.county||"—"],["License #",selectedAgent.license_number],["Type",(selectedAgent.license_type||"").includes("Broker")?"Broker":"Agent"],["Status",selectedAgent.license_status||"—"],["Licensed",selectedAgent.original_license_date||"—"],["Expires",selectedAgent.license_expiration||"—"],["Address",selectedAgent.address||"—"]].map(([label,val],i)=>
                <div key={i} style={{padding:"10px 14px",background:T.d,borderRadius:8,border:`1px solid ${T.b}`}}>
                  <div style={{fontSize:10,color:T.m,fontWeight:700,letterSpacing:1.2,marginBottom:4}}>{label.toUpperCase()}</div>
                  <div style={{fontSize:14,color:T.t,fontWeight:600}}>{val}</div>
                </div>
              )}
            </div>
            {selectedAgent.enriched_at ? (
              <div style={{background:T.d,borderRadius:12,border:`1px solid ${T.a}20`,padding:"20px 18px",marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.a,letterSpacing:1}}>ENRICHED DATA</div>
                  <div style={{fontSize:11,color:T.m}}>via RUE AI · {new Date(selectedAgent.enriched_at).toLocaleDateString()}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {selectedAgent.personal_email&&<div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:12,color:T.m,fontWeight:700,width:90}}>Personal</span><a href={`mailto:${selectedAgent.personal_email}`} style={{color:T.a,fontSize:14,textDecoration:"none",fontWeight:600}}>{selectedAgent.personal_email}</a></div>}
                  {selectedAgent.work_email&&<div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:12,color:T.m,fontWeight:700,width:90}}>Work</span><a href={`mailto:${selectedAgent.work_email}`} style={{color:T.a,fontSize:14,textDecoration:"none",fontWeight:600}}>{selectedAgent.work_email}</a></div>}
                  {selectedAgent.mobile_phone&&<div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:12,color:T.m,fontWeight:700,width:90}}>Mobile</span><a href={`tel:${selectedAgent.mobile_phone}`} style={{color:T.a,fontSize:14,textDecoration:"none",fontWeight:600}}>{selectedAgent.mobile_phone}</a></div>}
                  {selectedAgent.linkedin_url&&<div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:12,color:T.m,fontWeight:700,width:90}}>LinkedIn</span><a href={selectedAgent.linkedin_url} target="_blank" rel="noopener noreferrer" style={{color:T.bl,fontSize:14,textDecoration:"none",fontWeight:600}}>{selectedAgent.linkedin_url.replace(/https?:\/\/(www\.)?linkedin\.com\//,"")}</a></div>}
                  {selectedAgent.zillow_url&&<div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:12,color:T.m,fontWeight:700,width:90}}>Zillow</span><a href={selectedAgent.zillow_url} target="_blank" rel="noopener noreferrer" style={{color:T.bl,fontSize:14,textDecoration:"none",fontWeight:600}}>{selectedAgent.zillow_url.replace(/https?:\/\/(www\.)?zillow\.com\/profile\//,"")}</a></div>}
                  {!selectedAgent.personal_email&&!selectedAgent.work_email&&!selectedAgent.mobile_phone&&!selectedAgent.linkedin_url&&!selectedAgent.zillow_url&&<div style={{color:T.s,fontSize:13}}>No contact data found</div>}
                </div>
                <div onClick={()=>enrichAgent(selectedAgent)} style={{marginTop:14,padding:"10px 20px",borderRadius:8,background:T.am,color:T.a,fontSize:13,fontWeight:700,cursor:enriching?"not-allowed":"pointer",opacity:enriching?0.5:1,textAlign:"center",border:`1px solid ${T.a}30`}}>{enriching?"Enriching...":"Re-enrich"}</div>
              </div>
            ) : (
              <div style={{marginBottom:16}}>
                {selectedAgent._enrichError&&<div style={{padding:"12px 16px",borderRadius:8,background:T.m+"15",border:`1px solid ${T.m}30`,color:T.s,fontSize:13,marginBottom:12}}>😕 Rue couldn't find a match for this agent</div>}
                <div onClick={()=>!enriching&&enrichAgent(selectedAgent)} style={{padding:"14px 24px",borderRadius:10,background:"linear-gradient(135deg,#00E5A0,#3B82F6)",color:"#000",fontSize:15,fontWeight:700,cursor:enriching?"not-allowed":"pointer",opacity:enriching?0.5:1,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>{enriching?"⏳ Enriching...":"✨ Enrich with RUE AI"}</div>
              </div>
            )}
            <div style={{display:"flex",gap:10}}>
              {added[selectedAgent.license_number] ? (
                <div style={{flex:1,padding:"12px",borderRadius:8,background:T.am,color:T.a,fontSize:14,fontWeight:700,textAlign:"center"}}>✓ Added</div>
              ) : (
                <div onClick={()=>addAsNewLead(selectedAgent)} style={{flex:1,padding:"12px",borderRadius:8,background:T.am,color:T.a,fontSize:14,fontWeight:700,cursor:"pointer",textAlign:"center",border:`1px solid ${T.a}30`}}>+ Add as New Lead</div>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}

const TARGET_BROKERAGES=["Keller Williams","eXp Realty","RE/MAX","Compass","Coldwell Banker","Century 21","Berkshire Hathaway HomeServices","HomeSmart","Sotheby's International Realty","Better Homes & Gardens Real Estate","ERA Real Estate","Engel & Völkers","Redfin","Side","Independent","Other"];
const DAILY_LIMIT=3;

// ━━━ CONTENT TAB ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ContentTab({userId,userProfile}){
  const [dailyContent,setDailyContent]=useState([]);
  const [customContent,setCustomContent]=useState([]);
  const [loading,setLoading]=useState(true);
  const [generating,setGenerating]=useState(false);
  const [selectedDate,setSelectedDate]=useState(new Date().toISOString().split("T")[0]);
  const [copied,setCopied]=useState({});
  const [filter,setFilter]=useState("all");
  const [targetBrokerage,setTargetBrokerage]=useState(userProfile?.brokerage||"");
  const [usageToday,setUsageToday]=useState(0);
  const [showUpgrade,setShowUpgrade]=useState(false);
  const [recruitBrokerages,setRecruitBrokerages]=useState([]);
  const [recruitBrokerage,setRecruitBrokerage]=useState("");

  const isAdmin=userProfile?.role==="owner"||userProfile?.role==="admin";
  const contentLimits=getPlanLimits(userProfile);
  const trackingRef=userId?`?ref=${userId}`:"";
  const targetParam=targetBrokerage?`&target=${encodeURIComponent(targetBrokerage)}`:"";
  const BROKERAGE_SLUGS={"LPT Realty":"lpt-realty","eXp Realty":"exp-realty","Keller Williams":"keller-williams","RE/MAX":"remax"};
  const brokerageSlug=BROKERAGE_SLUGS[targetBrokerage]||null;
  const brokerageBlogUrl=brokerageSlug?`https://rkrt.in/${brokerageSlug}${trackingRef}`:null;
  const remaining=isAdmin?null:Math.max(0,DAILY_LIMIT-usageToday);

  const LP_PREVIEWS={
    "join":{img:"/og/join.png",title:"Join LPT Realty",desc:"Keep More of What You Earn"},
    "calculator":{img:"/og/calculator.png",title:"Commission Calculator",desc:"See What You Could Earn"},
    "new-agent":{img:"/og/new-agent.png",title:"New Agent Launch",desc:"Start Your Career Right"},
    "revenue-share":{img:"/og/revenue-share.png",title:"Revenue Share",desc:"Build Passive Income"},
    "why-switch":{img:"/og/why-switch.png",title:"Why Agents Switch",desc:"Better Splits, Better Tools"},
  };

  const loadContent=async(date)=>{
    setLoading(true);
    try{
      const r=await fetch(`${LIVI_SUPA}/daily_content?content_date=eq.${date}&order=content_source.asc,platform.asc,created_at.asc`,{
        headers:{"apikey":LIVI_KEY,"Authorization":`Bearer ${LIVI_KEY}`}
      });
      if(r.ok){
        const d=await r.json();
        setDailyContent(d.filter(p=>p.content_source==="daily"||!p.content_source));
        setCustomContent(d.filter(p=>p.content_source==="custom"&&p.user_id===userId));
      }
    }catch(e){console.error("Load error:",e);}
    setLoading(false);
  };

  const loadUsage=async()=>{
    if(!userId||isAdmin)return;
    try{
      const today=new Date().toISOString().split("T")[0];
      const r=await fetch(`${LIVI_SUPA}/content_generation_log?user_id=eq.${userId}&date=eq.${today}&select=id`,{
        headers:{"apikey":LIVI_KEY,"Authorization":`Bearer ${LIVI_KEY}`}
      });
      if(r.ok){const d=await r.json();setUsageToday(d.length);}
    }catch(e){}
  };

  useEffect(()=>{loadContent(selectedDate);loadUsage();},[selectedDate]);
  useEffect(()=>{supabase.from("brokerages").select("id,name,slug").order("name").then(({data})=>{if(data)setRecruitBrokerages(data);});},[]);

  const generateContent=async()=>{
    if(!isAdmin&&usageToday>=DAILY_LIMIT){setShowUpgrade(true);return;}
    setGenerating(true);
    setShowUpgrade(false);
    try{
      const r=await fetch("https://usknntguurefeyzusbdh.supabase.co/functions/v1/generate-content",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({date:selectedDate,force:true,images:false,user_id:userId,brokerage:userProfile?.brokerage||null,target_brokerage:targetBrokerage||null,content_source:"custom"})
      });
      const data=await r.json();
      if(r.status===429){setShowUpgrade(true);setGenerating(false);return;}
      if(r.ok){
        await loadContent(selectedDate);
        await loadUsage();
        logActivity(userId,"generate_content",{date:selectedDate,target:targetBrokerage});
      }
    }catch(e){console.error("Generate error:",e);}
    setGenerating(false);
  };

  const copyPost=(id,text)=>{
    const url=`https://rkrt.in/join${trackingRef}${targetParam}`;
    navigator.clipboard?.writeText(text).catch(()=>{
      const t=document.createElement("textarea");t.value=text;t.style.position="fixed";t.style.opacity="0";
      document.body.appendChild(t);t.focus();t.select();document.execCommand("copy");document.body.removeChild(t);
    });
    setCopied(p=>({...p,[id]:true}));
    setTimeout(()=>setCopied(p=>({...p,[id]:false})),2000);
  };

  const markPosted=async(id)=>{
    try{
      await fetch(`${LIVI_SUPA}/daily_content?id=eq.${id}`,{
        method:"PATCH",
        headers:{"apikey":LIVI_KEY,"Authorization":`Bearer ${LIVI_KEY}`,"Content-Type":"application/json","Prefer":"return=representation"},
        body:JSON.stringify({is_posted:true,posted_at:new Date().toISOString()})
      });
      const upd=p=>p.map(c=>c.id===id?{...c,is_posted:true}:c);
      setDailyContent(upd);setCustomContent(upd);
    }catch(e){}
  };

  const platformConfig={
    facebook:{icon:"📘",label:"Facebook",color:"#1877F2",bg:"#1877F210"},
    instagram:{icon:"📸",label:"Instagram",color:"#E1306C",bg:"#E1306C10"},
  };

  const filterPosts=(posts)=>filter==="all"?posts:posts.filter(c=>c.platform===filter);
  const dateObj=new Date(selectedDate+"T12:00:00");
  const dayLabel=dateObj.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
  const isToday=selectedDate===new Date().toISOString().split("T")[0];
  const hour=new Date().getHours();
  const greeting=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const firstName=userProfile?.full_name?.split(" ")[0]||"there";

  const PostCard=({post})=>{
    const cfg=platformConfig[post.platform]||{icon:"📄",label:post.platform,color:T.bl,bg:T.bl+"10"};
    const bodyClean=(post.body||"").split("\n\n").filter(p=>!p.trim().match(/^https?:\/\/[^\s]+$/)).join("\n\n").trim();
    const lp=post.landing_page_slug?LP_PREVIEWS[post.landing_page_slug]||null:null;
    const lpUrl=post.landing_page_slug?`https://rkrt.in/${post.landing_page_slug}${trackingRef}${targetParam}`:null;
    return(
      <div style={{background:T.card,border:`1px solid ${post.is_posted?T.a+"30":T.b}`,borderRadius:12,opacity:post.is_posted?0.7:1,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",flex:1}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:32,height:32,borderRadius:8,background:cfg.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{cfg.icon}</div>
              <span style={{fontSize:14,fontWeight:700,color:cfg.color}}>{cfg.label}</span>
            </div>
            {post.is_posted&&<span style={{fontSize:11,color:T.a,fontWeight:700,padding:"2px 8px",borderRadius:4,background:T.a+"15"}}>✓ Posted</span>}
          </div>
          {post.theme&&<div style={{fontSize:12,color:T.s,marginBottom:8,letterSpacing:0.5}}>{post.theme.replace(/_/g," ")}</div>}
          {post.headline&&<div style={{fontSize:14,fontWeight:800,color:T.t,marginBottom:10,lineHeight:1.4}}>{post.headline}</div>}
          <div style={{fontSize:13,color:T.s,lineHeight:1.6,marginBottom:12,whiteSpace:"pre-wrap",wordBreak:"break-word",padding:"12px 14px",background:T.d,borderRadius:8,border:`1px solid ${T.b}`}}>{bodyClean}</div>
          {lp&&lpUrl&&(
            <a href={lpUrl} target="_blank" rel="noreferrer" style={{display:"flex",borderRadius:10,overflow:"hidden",border:`1px solid ${T.b}`,marginBottom:12,textDecoration:"none",background:T.d}}>
              <img src={lp.img} alt={lp.title} style={{width:80,objectFit:"cover",flexShrink:0}}/>
              <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
                <div style={{fontSize:13,fontWeight:700,color:T.t,marginBottom:3}}>{lp.title}</div>
                <div style={{fontSize:12,color:T.s,marginBottom:4}}>{lp.desc}</div>
                <div style={{fontSize:11,color:T.a,fontFamily:"monospace"}}>rkrt.in/{post.landing_page_slug}{trackingRef}{targetParam}</div>
              </div>
            </a>
          )}
          <div style={{marginTop:"auto",display:"flex",gap:8}}>
            <div onClick={()=>{copyPost(post.id,post.body);logActivity(userId,"copy_content",{platform:post.platform});}} style={{flex:1,padding:"9px 10px",borderRadius:8,background:copied[post.id]?T.a+"20":T.am,color:T.a,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
              {copied[post.id]?"✓ Copied":"📋 Copy"}
            </div>
            {!post.is_posted&&(
              <div onClick={()=>{markPosted(post.id);logActivity(userId,"mark_posted",{platform:post.platform});}} style={{flex:1,padding:"9px 10px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.s,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                ✅ Posted
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const filtered_daily=filterPosts(dailyContent);
  const filtered_custom=filterPosts(customContent);

  return(
    <>
      {/* Target brokerage + tracking link */}
      {userId&&(
        <div style={{background:T.a+"10",border:`1px solid ${T.a}25`,borderRadius:10,padding:"16px 18px",marginBottom:20}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontSize:12,color:T.a,fontWeight:700,letterSpacing:1,marginBottom:3}}>🎯 TARGET BROKERAGE</div>
              <div style={{fontSize:13,color:T.s,marginBottom:8}}>Posts and landing pages personalized for agents at this brokerage</div>
              <select value={targetBrokerage} onChange={ev=>setTargetBrokerage(ev.target.value)} style={{width:"100%",maxWidth:280,padding:"10px 14px",borderRadius:8,background:T.d,border:`1px solid ${targetBrokerage?T.a+"50":T.b}`,color:targetBrokerage?T.t:T.s,fontSize:14,outline:"none",fontFamily:"inherit"}}>
                <option value="">— Generic (no target) —</option>
                {TARGET_BROKERAGES.map(b=><option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontSize:12,color:T.a,fontWeight:700,letterSpacing:1,marginBottom:3}}>🔗 YOUR TRACKING LINK</div>
              <div style={{fontSize:13,color:T.t,fontFamily:"monospace",wordBreak:"break-all",marginBottom:4}}>{`https://rkrt.in/join${trackingRef}${targetParam}`}</div>
              <div style={{fontSize:12,color:T.s}}>Leads route to your pipeline{targetBrokerage?` · Targeting ${targetBrokerage}`:""}</div>
            </div>
            <div onClick={()=>{const url=`https://rkrt.in/join${trackingRef}${targetParam}`;navigator.clipboard?.writeText(url).catch(()=>{const t=document.createElement("textarea");t.value=url;t.style.position="fixed";t.style.opacity="0";document.body.appendChild(t);t.focus();t.select();document.execCommand("copy");document.body.removeChild(t);});}} style={{padding:"10px 16px",borderRadius:8,background:T.am,color:T.a,fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0,alignSelf:"flex-end"}}>📋 Copy Link</div>
          </div>
          {brokerageBlogUrl&&<div style={{marginTop:12,display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,color:"#8B5CF6",fontWeight:700,letterSpacing:1,marginBottom:2}}>📄 BLOG TRACKING URL</div>
              <div style={{fontSize:13,color:T.t,fontFamily:"monospace",wordBreak:"break-all"}}>{brokerageBlogUrl}</div>
              <div style={{fontSize:11,color:T.s,marginTop:2}}>Share this — leads from the blog page route to your pipeline</div>
            </div>
            <div onClick={()=>{navigator.clipboard?.writeText(brokerageBlogUrl).catch(()=>{const t=document.createElement("textarea");t.value=brokerageBlogUrl;t.style.position="fixed";t.style.opacity="0";document.body.appendChild(t);t.focus();t.select();document.execCommand("copy");document.body.removeChild(t);});}} style={{padding:"8px 14px",borderRadius:8,background:"#8B5CF620",color:"#8B5CF6",fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0}}>📋 Copy</div>
          </div>}
          {targetBrokerage&&<div style={{marginTop:12,padding:"8px 12px",borderRadius:6,background:T.d,border:`1px solid ${T.b}`,fontSize:12,color:T.s}}>💡 Generate fresh content below to get posts targeting <strong style={{color:T.t}}>{targetBrokerage}</strong> agents</div>}
        </div>
      )}

      {/* Your Recruiting Link */}
      {userId&&recruitBrokerages.length>0&&(
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:10,padding:"16px 18px",marginBottom:20}}>
          <div style={{fontSize:12,color:T.a,fontWeight:700,letterSpacing:1,marginBottom:8}}>🔗 YOUR RECRUITING LINK</div>
          <select value={recruitBrokerage} onChange={ev=>setRecruitBrokerage(ev.target.value)} style={{width:"100%",maxWidth:300,padding:"10px 14px",borderRadius:8,background:T.d,border:`1px solid ${recruitBrokerage?T.a+"50":T.b}`,color:recruitBrokerage?T.t:T.s,fontSize:14,outline:"none",fontFamily:"inherit",marginBottom:10}}>
            <option value="">— Select a brokerage —</option>
            {recruitBrokerages.map(b=><option key={b.id} value={b.slug}>{b.name}</option>)}
          </select>
          {recruitBrokerage&&(()=>{const url=`https://rkrt.in/${recruitBrokerage}?ref=${userId}`;return(
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,marginBottom:8}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,color:T.t,fontFamily:"monospace",wordBreak:"break-all"}}>{url}</div>
              </div>
              <div onClick={()=>{navigator.clipboard?.writeText(url).catch(()=>{const t=document.createElement("textarea");t.value=url;t.style.position="fixed";t.style.opacity="0";document.body.appendChild(t);t.focus();t.select();document.execCommand("copy");document.body.removeChild(t);});setCopied(p=>({...p,recruitLink:true}));setTimeout(()=>setCopied(p=>({...p,recruitLink:false})),2000);}} style={{padding:"8px 14px",borderRadius:8,background:T.am,color:T.a,fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0}}>{copied.recruitLink?"✓ Copied!":"📋 Copy Link"}</div>
            </div>);})()}
          <div style={{fontSize:12,color:T.s}}>Share this link to attract agents from this brokerage. Leads will be assigned to you automatically.</div>
        </div>
      )}

      {/* Date nav + filter */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:13,color:T.a,fontWeight:700,letterSpacing:2,marginBottom:2}}>{isToday?"TODAY":"CONTENT FOR"}</div>
          <div style={{fontSize:16,color:T.s}}>{dayLabel}</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <input type="date" value={selectedDate} onChange={ev=>setSelectedDate(ev.target.value)} style={{padding:"8px 12px",borderRadius:8,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:14,outline:"none",fontFamily:"inherit"}}/>
          <div style={{display:"flex",gap:6}}>
            {[["all","All",T.t],["facebook","📘 FB","#1877F2"],["instagram","📸 IG","#E1306C"]].map(([id,label,c])=>(
              <div key={id} onClick={()=>setFilter(id)} style={{padding:"8px 14px",borderRadius:8,background:filter===id?c+"18":T.d,border:`1px solid ${filter===id?c+"40":T.b}`,color:filter===id?c:T.s,fontSize:13,fontWeight:600,cursor:"pointer"}}>{label}</div>
            ))}
          </div>
        </div>
      </div>

      {loading?(
        <div style={{textAlign:"center",padding:60}}><div style={{fontSize:32}}>📝</div><div style={{color:T.s,marginTop:12}}>Loading content...</div></div>
      ):(
        <>
          {/* ── SECTION 1: DAILY BRIEF ── */}
          <div style={{marginBottom:32}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{fontSize:11,color:T.a,fontWeight:700,letterSpacing:2,marginBottom:4}}>☀️ DAILY BRIEF</div>
                <div style={{fontSize:18,fontWeight:800,color:T.t}}>{greeting}, {firstName}! Here's your content for today.</div>
                <div style={{fontSize:13,color:T.s,marginTop:2}}>Auto-generated every morning · {dailyContent.length} posts ready</div>
              </div>
            </div>
            {filtered_daily.length===0?(
              <div style={{background:T.card,border:`1px dashed ${T.b}`,borderRadius:12,padding:"32px",textAlign:"center"}}>
                <div style={{fontSize:32,marginBottom:8}}>⏰</div>
                <div style={{color:T.s,fontSize:14}}>Daily content generates automatically at 5AM UTC. Check back tomorrow!</div>
              </div>
            ):(
              <div className="content-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:20}}>
                {filtered_daily.map((post,i)=><PostCard key={post.id||i} post={post}/>)}
              </div>
            )}
          </div>

          {/* ── SECTION 2: GENERATE CUSTOM ── */}
          <div style={{borderTop:`1px solid ${T.b}`,paddingTop:28,marginBottom:20}}>
            {!contentLimits.canGenerateContent?(
              <ProGate feature="Custom Content Generation" userId={userId} userProfile={userProfile}><div/></ProGate>
            ):(
            <>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:16}}>
              <div>
                <div style={{fontSize:11,color:"#8B5CF6",fontWeight:700,letterSpacing:2,marginBottom:4}}>✨ FRESH CONTENT</div>
                <div style={{fontSize:18,fontWeight:800,color:T.t}}>Generate Targeted Posts</div>
                <div style={{fontSize:13,color:T.s,marginTop:2}}>
                  {isAdmin?"Unlimited generations · Admin":`${remaining} of ${DAILY_LIMIT} generations remaining today`}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8}}>
                {!isAdmin&&(
                  <div style={{display:"flex",gap:6}}>
                    {[...Array(DAILY_LIMIT)].map((_,i)=>(
                      <div key={i} style={{width:10,height:10,borderRadius:"50%",background:i<usageToday?T.a+"40":T.a}}/>
                    ))}
                  </div>
                )}
                <div onClick={generating?null:generateContent} style={{padding:"12px 22px",borderRadius:8,background:generating?T.d:(!isAdmin&&usageToday>=DAILY_LIMIT)?"#8B5CF620":T.am,border:(!isAdmin&&usageToday>=DAILY_LIMIT)?`1px solid #8B5CF640`:"none",color:generating?T.m:(!isAdmin&&usageToday>=DAILY_LIMIT)?"#8B5CF6":T.a,fontSize:14,fontWeight:700,cursor:generating?"wait":"pointer",display:"flex",alignItems:"center",gap:8}}>
                  {generating?"⏳ Generating (~30s)...":(!isAdmin&&usageToday>=DAILY_LIMIT)?"🔒 Upgrade for More":"✨ Generate Fresh Content"}
                </div>
              </div>
            </div>

            {showUpgrade&&(
              <div style={{background:"#8B5CF610",border:"1px solid #8B5CF640",borderRadius:10,padding:"16px 20px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:"#8B5CF6",marginBottom:4}}>🚀 You've used all {DAILY_LIMIT} generations today</div>
                  <div style={{fontSize:13,color:T.s}}>Upgrade to Pro for unlimited daily content generation and advanced targeting.</div>
                </div>
                <div onClick={()=>startCheckout(userId,userProfile?.email)} style={{padding:"10px 20px",borderRadius:8,background:"#8B5CF6",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Upgrade to Pro →</div>
              </div>
            )}

            {filtered_custom.length===0?(
              <div style={{background:T.card,border:`1px dashed ${T.b}`,borderRadius:12,padding:"40px",textAlign:"center"}}>
                <div style={{fontSize:40,marginBottom:12}}>✨</div>
                <div style={{fontSize:16,fontWeight:700,color:T.t,marginBottom:8}}>Generate Posts for {targetBrokerage||"Your Target Brokerage"}</div>
                <div style={{fontSize:14,color:T.s,marginBottom:20,maxWidth:400,margin:"0 auto 20px",lineHeight:1.6}}>
                  {targetBrokerage?`Get 6 posts written specifically for ${targetBrokerage} agents with your tracking links baked in.`:"Select a target brokerage above, then generate posts tailored to those agents."}
                </div>
              </div>
            ):(
              <div className="content-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:20}}>
                {filtered_custom.map((post,i)=><PostCard key={post.id||i} post={post}/>)}
              </div>
            )}
            </>
            )}
          </div>
        </>
      )}
    </>
  );
}

// ━━━ MAIN APP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function Livi(){
  const [view,setView]=useState("home");
  const [leads,setLeads]=useState([]);
  const [activity,setActivity]=useState([]);
  const [selLead,setSelLead]=useState(null);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [authUser,setAuthUser]=useState(null);
  const [profile,setProfile]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [showOnboarding,setShowOnboarding]=useState(false);
  const [showUpgradeSuccess,setShowUpgradeSuccess]=useState(false);

  const load=useCallback(async()=>{
    if(!authUser) return;
    setLoading(true);
    try {
      const [leadsRes, actRes] = await Promise.all([
        fetch(`${LIVI_SUPA}/leads?user_id=eq.${authUser.id}&order=created_at.desc&limit=100`,{headers:{"apikey":LIVI_KEY,"Authorization":`Bearer ${LIVI_KEY}`}}),
        fetch(`${LIVI_SUPA}/user_activity?user_id=eq.${authUser.id}&order=created_at.desc&limit=50`,{headers:{"apikey":LIVI_KEY,"Authorization":`Bearer ${LIVI_KEY}`}})
      ]);
      const leadsData = leadsRes.ok ? await leadsRes.json() : [];
      const actData = actRes.ok ? await actRes.json() : [];
      setLeads(Array.isArray(leadsData)?leadsData:[]);
      setActivity(Array.isArray(actData)?actData:[]);
    } catch(e) { console.error("Load error:", e); }
    setLoading(false);
  },[authUser]);

  useEffect(()=>{
    load();
    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leads',
        filter: `user_id=eq.${authUser?.id}`
      }, (payload) => {
        if(payload.eventType === 'INSERT') {
          setLeads(p => [payload.new, ...p]);
        } else if(payload.eventType === 'UPDATE') {
          setLeads(p => p.map(l => l.id === payload.new.id ? payload.new : l));
        } else if(payload.eventType === 'DELETE') {
          setLeads(p => p.filter(l => l.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  },[load]);

  const [chartsReady,setChartsReady]=useState(false);
  useEffect(()=>{rechartsReady.then(()=>setChartsReady(true));},[]);
  const [inlineResponse,setInlineResponse]=useState(null);
  const [inlineLoading,setInlineLoading]=useState(false);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [profileMenuOpen,setProfileMenuOpen]=useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = notifications.filter(n=>!n.read).length;

  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(!session){window.location.href="/login";return;}
      setAuthUser(session.user);
      logActivity(session.user.id,'login');
      const {data:prof}=await supabase.from("profiles").select("*").eq("id",session.user.id).single();
      setProfile(prof||null);
      // Check if onboarding needed
      if(prof && !prof.onboarded) {
        setShowOnboarding(true);
      }
      setAuthLoading(false);
      // Check for Stripe upgrade success
      if(window.location.search.includes('upgraded=true')){
        const freshProf=await supabase.from("profiles").select("*").eq("id",session.user.id).single();
        if(freshProf.data) setProfile(freshProf.data);
        setShowUpgradeSuccess(true);
        setTimeout(()=>{setShowUpgradeSuccess(false);window.history.replaceState({},'',window.location.pathname);},5000);
      }
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(!session) window.location.href="/login";
    });
    return()=>subscription.unsubscribe();
  },[]);

  const loadNotifications = useCallback(async () => {
    if (!authUser?.id) return;
    const { data } = await supabase.from('notifications')
      .select('*')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data || []);
  }, [authUser]);

  // Load notifications and subscribe to realtime
  useEffect(() => {
    if (!authUser?.id) return;
    loadNotifications();
    const channel = supabase.channel('notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${authUser.id}` },
        (payload) => { setNotifications(prev => [payload.new, ...prev]); }
      ).subscribe();
    return () => supabase.removeChannel(channel);
  }, [authUser, loadNotifications]);

  const handleOnboardingComplete = (updatedData) => {
    setProfile(p => ({ ...p, ...updatedData }));
    setShowOnboarding(false);
    logActivity(authUser?.id, 'onboarding_complete');
  };

  const [profileEdit,setProfileEdit]=useState(null);
  const [profileSaving,setProfileSaving]=useState(false);
  useEffect(()=>{
    if(profile) setProfileEdit({
      full_name:profile.full_name||"",
      phone:profile.phone||"",
      brokerage:profile.brokerage||"",
      brokerage_other:"",
      license_number:profile.license_number||"",
      license_state:profile.license_state||"",
      market:profile.market||""
    });
  },[profile]);

  const saveProfile=async()=>{
    if(!profileEdit)return;
    setProfileSaving(true);
    const brokerageValue = profileEdit.brokerage === "Other" ? profileEdit.brokerage_other : profileEdit.brokerage;
    const payload = {
      full_name:profileEdit.full_name,
      phone:profileEdit.phone,
      brokerage:brokerageValue,
      license_number:profileEdit.license_number,
      license_state:profileEdit.license_state,
      market:profileEdit.market,
      updated_at: new Date().toISOString(),
    };
    const{error}=await supabase.from("profiles").update(payload).eq("id",authUser.id);
    if(!error){setProfile(p=>({...p,...payload}));logActivity(authUser.id,'update_profile');}
    setProfileSaving(false);
  };

  const askLiviInline=async(q)=>{
    setInlineLoading(true);setInlineResponse(null);
    try{
      let sys=SYSTEM;
      if(profile?.brokerage) sys+=`\n\nUser's brokerage: ${profile.brokerage}. Market: ${profile.market||"not set"}.`;
      if(leads.length>0){
        sys+=`\n\nPIPELINE (${leads.length} leads):\n`+leads.slice(0,10).map(l=>`- ${l.first_name} ${l.last_name} | ${l.market} | ${l.brokerage?.substring(0,20)||"?"} | ${l.tier} | ${l.urgency} | ${l.pipeline_stage}`).join("\n");
        sys+=`\n\nAd spend: $20/day Facebook/Instagram for recruiting.`;
      }
      const r=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+(import.meta.env.VITE_OPENROUTER_KEY||"")},body:JSON.stringify({model:"deepseek/deepseek-chat-v3-0324",max_tokens:1500,messages:[{role:"system",content:sys},{role:"user",content:q}]})});
      if(!r.ok){const err=await r.text();setInlineResponse(`API error ${r.status} — check your OpenRouter key in Vercel env vars.`);setInlineLoading(false);return;}
      const d=await r.json();
      setInlineResponse(d.choices?.[0]?.message?.content||"No response.");
    }catch{setInlineResponse("Connection error.");}
    setInlineLoading(false);
  };

  const setViewWithHistory=(v)=>{
    window.history.pushState({view:v},"",`#${v}`);
    setView(v);
  };
  useEffect(()=>{
    const onPop=(ev)=>{
      if(ev.state?.view){setView(ev.state.view);if(ev.state.view!=="lead")setSelLead(null);}
      else{setView("home");setSelLead(null);}
    };
    window.addEventListener("popstate",onPop);
    return()=>window.removeEventListener("popstate",onPop);
  },[]);

  const handleDeleteLead = (leadId) => {
    setLeads(p => p.filter(l => l.id !== leadId));
  };

  const total=leads.length,targets=leads.filter(l=>l.brokerage&&!l.brokerage.toLowerCase().includes("lpt")).length,urgent=leads.filter(l=>l.urgency==="HIGH").length;
  const today=leads.filter(l=>l.created_at&&new Date(l.created_at).toDateString()===new Date().toDateString()).length;
  const apiCost=activity.reduce((s,a)=>s+parseFloat(a.cost||0),0);
  const cpl=total>0?(20/total).toFixed(2):"—";
  const limits=getPlanLimits(profile);
  const isPro=limits.isPro;
  const pScore=Math.min(100,Math.round((total>0?25:0)+(targets>0?25:0)+(leads.some(l=>l.pipeline_stage==="outreach_sent")?25:0)+(leads.some(l=>l.pipeline_stage==="meeting_booked")?25:0)));
  const tierData=["Elite","Strong","Mid","Building","New"].map(t=>({name:t,value:leads.filter(l=>l.tier===t).length})).filter(d=>d.value>0);
  const stages=STAGES.map(s=>({...s,count:leads.filter(l=>l.pipeline_stage===s.id).length}));

  const AskLiviBar=({prompts})=>(
    <>
      <div className="ask-livi-grid" style={{display:"grid",gridTemplateColumns:`repeat(${prompts.length},1fr)`,gap:12,marginBottom:20}}>
        {prompts.map(([icon,label,q,c],i)=>
          <div key={i} onClick={()=>askLiviInline(q)} style={{background:(c||T.bl)+"10",border:`1px solid ${(c||T.bl)}20`,borderRadius:10,padding:"18px 20px",cursor:inlineLoading?"wait":"pointer",display:"flex",alignItems:"center",gap:12,opacity:inlineLoading?0.5:1,transition:"all 0.15s"}}
            onMouseOver={ev=>{if(!inlineLoading)ev.currentTarget.style.background=(c||T.bl)+"20"}} onMouseOut={ev=>ev.currentTarget.style.background=(c||T.bl)+"10"}>
            <span style={{fontSize:24}}>{icon}</span><span style={{fontSize:15,fontWeight:700,color:T.t}}>{label}</span>
          </div>
        )}
      </div>
      {inlineLoading&&<div style={{marginBottom:20,padding:"16px 20px",borderRadius:10,background:T.card,border:`1px solid ${T.b}`}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:8,height:8,borderRadius:"50%",background:T.a,animation:"pulse 1s infinite"}}/><span style={{fontSize:14,color:T.s}}>LIVI is thinking...</span></div></div>}
      {inlineResponse&&!inlineLoading&&<div style={{marginBottom:20,padding:"20px 24px",borderRadius:10,background:T.as,border:`1px solid ${T.a}20`}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:12,color:T.a,fontWeight:700,letterSpacing:1.5}}>🤖 LIVI RESPONSE</span><span onClick={()=>{navigator.clipboard?.writeText(inlineResponse);}} style={{fontSize:12,color:T.s,cursor:"pointer"}}>📋 Copy</span></div><pre style={{fontSize:14,color:T.t,lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0,maxHeight:400,overflow:"auto"}}>{inlineResponse}</pre></div>}
    </>
  );

  const [newLead,setNewLead]=useState({first_name:"",last_name:"",phone:"",email:"",market:"",brokerage:"",source:"",notes:""});

  const saveLead=async(doResearch)=>{
    if(!newLead.first_name.trim())return;
    try{
      const body={
        user_id:authUser.id,
        first_name:newLead.first_name.trim(),
        last_name:newLead.last_name.trim(),
        email:newLead.email.trim()||null,
        phone:newLead.phone.trim()||null,
        market:newLead.market.trim()||null,
        brokerage:newLead.brokerage.trim()||null,
        source:newLead.source.trim()||"Manual",
        pipeline_stage:"new",
        tier:"New",
        urgency:"LOW"
      };
      const r=await fetch(`${LIVI_SUPA}/leads`,{method:"POST",headers:{"apikey":LIVI_KEY,"Authorization":`Bearer ${LIVI_KEY}`,"Content-Type":"application/json","Prefer":"return=representation"},body:JSON.stringify(body)});
      if(!r.ok){console.error("Add lead error:",r.status,await r.text());return;}
      const saved=await r.json();
      const lead=Array.isArray(saved)?saved[0]:saved;
      await load();
      logActivity(authUser.id,'add_lead',{lead_name:`${newLead.first_name} ${newLead.last_name}`.trim()});
      if(doResearch){
        setSelLead(lead);
        setViewWithHistory("lead");
        askLiviInline(`I just met a new recruiting prospect: ${newLead.first_name} ${newLead.last_name}${newLead.brokerage?` from ${newLead.brokerage}`:""}${newLead.market?` in ${newLead.market}`:""}.${newLead.notes?` Notes: ${newLead.notes}`:""} Research them and give me an outreach strategy.`);
      }else{
        setViewWithHistory("crm");
      }
      setNewLead({first_name:"",last_name:"",phone:"",email:"",market:"",brokerage:"",source:"",notes:""});
    }catch(e){console.error("Save lead error:",e);}
  };

  const needsFollowUp=leads.filter(l=>l.pipeline_stage&&l.pipeline_stage!=="new"&&l.pipeline_stage!=="recruited"&&l.created_at&&(Date.now()-new Date(l.created_at))>3*86400000);
  const needsResearch=leads.filter(l=>l.pipeline_stage==="new");
  const hasMeeting=leads.filter(l=>l.pipeline_stage==="meeting_booked");
  const inOutreach=leads.filter(l=>l.pipeline_stage==="outreach_sent");

  const Dash=()=>(
    <>
      {/* Brokerage personalization banner — show if brokerage is set */}
      {profile?.brokerage&&profile.brokerage!=="LPT Realty"&&(
        <div style={{background:T.bl+"10",border:`1px solid ${T.bl}20`,borderRadius:10,padding:"12px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:18}}>🎯</span>
          <div style={{flex:1,fontSize:13,color:T.s}}>
            LIVI is targeting <strong style={{color:T.t}}>{profile.brokerage}</strong> agents in <strong style={{color:T.t}}>{profile.market||"your market"}</strong> — personalized content, outreach, and landing pages are active.
          </div>
          <div onClick={()=>setViewWithHistory("profile")} style={{fontSize:12,color:T.bl,fontWeight:700,cursor:"pointer",flexShrink:0}}>Edit →</div>
        </div>
      )}

      <div className="kpi-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:20}}>
        {[["◎","Leads",total,today>0?`+${today} today`:"",T.bl],["🎯","Targets",targets,urgent>0?`${urgent} hot`:"",T.a],["💰","CPL",`$${cpl}`,"$20/day",T.y],["📅","Meetings",hasMeeting.length,inOutreach.length>0?`${inOutreach.length} awaiting`:"",T.p]].map(([ic,l,v,s,c],i)=>
          <div key={i} className="kpi-card" style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"22px 24px",display:"flex",alignItems:"center",gap:16}}>
            <div className="kpi-icon" style={{width:52,height:52,borderRadius:10,background:c+"10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{ic}</div>
            <div><div className="kpi-label" style={{fontSize:13,color:T.s,letterSpacing:2,fontWeight:700}}>{l.toUpperCase()}</div><div style={{display:"flex",alignItems:"baseline",gap:6}}><span className="kpi-val" style={{fontSize:32,fontWeight:800,color:T.t}}>{v}</span>{s&&<span className="kpi-sub" style={{fontSize:14,color:c,fontWeight:600}}>{s}</span>}</div></div>
          </div>
        )}
      </div>

      <div className="quick-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[["➕","Add Lead",()=>setView("addlead"),T.a],["📱","Draft Outreach",()=>askLiviInline(`Who should I reach out to next? Pick my best lead and draft me a message.${profile?.brokerage?" I recruit for "+profile.brokerage:""}${profile?.market?" in "+profile.market:""}.`),T.bl],["🔍","Find Agents",()=>setViewWithHistory("agents"),T.p],["📊","Pipeline Review",()=>setView("pipeline"),T.y]].map(([ic,label,action,c],i)=>
          <div key={i} onClick={action} style={{background:c+"10",border:`1px solid ${c}20`,borderRadius:10,padding:"18px 20px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"all 0.15s"}}
            onMouseOver={ev=>ev.currentTarget.style.background=c+"20"} onMouseOut={ev=>ev.currentTarget.style.background=c+"10"}>
            <span style={{fontSize:24}}>{ic}</span>
            <span style={{fontSize:15,fontWeight:700,color:T.t}}>{label}</span>
          </div>
        )}
      </div>

      <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px"}}>
          <div style={{fontSize:18,fontWeight:700,color:T.t,marginBottom:16}}>📋 Today's Actions</div>
          {(needsFollowUp.length>0||needsResearch.length>0||hasMeeting.length>0)?(
            <div>
              {hasMeeting.map((l,i)=>
                <div key={`m${i}`} onClick={()=>{setSelLead(l);setViewWithHistory("lead");}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:8,background:T.p+"08",border:`1px solid ${T.p}15`,marginBottom:8,cursor:"pointer"}}>
                  <span style={{fontSize:18}}>🤝</span>
                  <div style={{flex:1}}><div style={{fontSize:15,fontWeight:600,color:T.t}}>Prep for {l.first_name} {l.last_name}</div><div style={{fontSize:13,color:T.s}}>Meeting booked — prep your talking points</div></div>
                  <span style={{fontSize:13,color:T.p,fontWeight:600}}>Prep →</span>
                </div>
              )}
              {needsFollowUp.slice(0,3).map((l,i)=>
                <div key={`f${i}`} onClick={()=>{setSelLead(l);setViewWithHistory("lead");}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:8,background:T.r+"08",border:`1px solid ${T.r}15`,marginBottom:8,cursor:"pointer"}}>
                  <span style={{fontSize:18}}>🔄</span>
                  <div style={{flex:1}}><div style={{fontSize:15,fontWeight:600,color:T.t}}>Follow up with {l.first_name} {l.last_name}</div><div style={{fontSize:13,color:T.s}}>{l.market} · {ago(l.created_at)} since last touch</div></div>
                  <span style={{fontSize:13,color:T.r,fontWeight:600}}>Overdue</span>
                </div>
              )}
              {needsResearch.slice(0,3).map((l,i)=>
                <div key={`r${i}`} onClick={()=>{setSelLead(l);setViewWithHistory("lead");}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:8,background:T.bl+"08",border:`1px solid ${T.bl}15`,marginBottom:8,cursor:"pointer"}}>
                  <span style={{fontSize:18}}>🔍</span>
                  <div style={{flex:1}}><div style={{fontSize:15,fontWeight:600,color:T.t}}>Research {l.first_name} {l.last_name}</div><div style={{fontSize:13,color:T.s}}>New lead — needs intel before outreach</div></div>
                  <span style={{fontSize:13,color:T.bl,fontWeight:600}}>Research →</span>
                </div>
              )}
            </div>
          ):(
            <div style={{textAlign:"center",padding:"24px",color:T.m}}>
              <div style={{fontSize:24,marginBottom:8}}>✅</div>
              <div style={{fontSize:15}}>All caught up! Add new leads or check pipeline.</div>
            </div>
          )}
        </div>

        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><span style={{fontSize:18,fontWeight:700,color:T.t}}>🔥 Hot Leads</span><span onClick={()=>setViewWithHistory("pipeline")} style={{fontSize:14,color:T.s,cursor:"pointer"}}>All →</span></div>
          {leads.filter(l=>l.urgency==="HIGH"||l.urgency==="MEDIUM").sort((a,b)=>({HIGH:0,MEDIUM:1}[a.urgency]||2)-({HIGH:0,MEDIUM:1}[b.urgency]||2)).slice(0,5).map((l,i)=>
            <div key={i} onClick={()=>{setSelLead(l);setViewWithHistory("lead");}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,marginBottom:8,cursor:"pointer"}}
              onMouseOver={ev=>ev.currentTarget.style.borderColor=T.bh} onMouseOut={ev=>ev.currentTarget.style.borderColor=T.b}>
              <div>
                <div style={{fontSize:15,fontWeight:600,color:T.t}}>{l.first_name} {l.last_name}</div>
                <div style={{fontSize:13,color:T.s}}>{l.brokerage?.substring(0,20)||"Unknown"} · {l.market}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}><TPill t={l.tier}/><UPill u={l.urgency}/></div>
            </div>
          )}
          {leads.filter(l=>l.urgency==="HIGH"||l.urgency==="MEDIUM").length===0&&(
            <div style={{textAlign:"center",padding:"24px",color:T.m}}><div style={{fontSize:24,marginBottom:8}}>🎯</div><div style={{fontSize:15}}>No hot leads yet.</div></div>
          )}
        </div>
      </div>

      <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px"}}><div style={{fontSize:18,fontWeight:700,color:T.t,marginBottom:16}}>📈 Pipeline</div><Gauge score={pScore}/><div style={{marginTop:12}}>{chartsReady&&ResponsiveContainer?<ResponsiveContainer width="100%" height={160}><BarChart data={stages} layout="vertical" barSize={14}><XAxis type="number" hide/><YAxis type="category" dataKey="l" tick={{fontSize:13,fill:T.s}} width={76} axisLine={false} tickLine={false}/><Bar dataKey="count" radius={[0,4,4,0]}>{stages.map((d,i)=><Cell key={i} fill={d.c}/>)}</Bar></BarChart></ResponsiveContainer>:<div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",color:T.m,fontSize:13}}>Loading chart...</div>}</div></div>
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px"}}>
          <div style={{fontSize:18,fontWeight:700,color:T.t,marginBottom:16}}>📋 Recent Activity</div>
          {activity.length>0?activity.slice(0,8).map((a,i)=>
            <div key={i} style={{display:"flex",gap:10,padding:"8px 0",alignItems:"flex-start",borderBottom:i<7?`1px solid ${T.b}`:"none"}}>
              <Dot c={T.a}/>
              <div style={{flex:1}}><div style={{fontSize:14,color:T.t,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.action?.replace(/_/g," ")}</div></div>
              <span style={{fontSize:12,color:T.m,flexShrink:0}}>{ago(a.created_at)}</span>
            </div>
          ):(
            <div style={{textAlign:"center",padding:"24px",color:T.m}}><div style={{fontSize:24,marginBottom:8}}>📋</div><div style={{fontSize:15}}>Activity will appear as you work</div></div>
          )}
        </div>
      </div>

      <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontSize:18,fontWeight:700,color:T.t}}>🆕 Recent Leads</span>
          <span onClick={()=>setViewWithHistory("pipeline")} style={{fontSize:14,color:T.s,cursor:"pointer"}}>View All →</span>
        </div>
        {leads.length>0 ? (
          <>
          <div className="leads-desktop" style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Name","Market","Brokerage","Tier","Urgency","Stage","Added"].map(h=>
              <th key={h} style={{textAlign:"left",padding:"12px 14px",fontSize:12,fontWeight:700,color:T.m,letterSpacing:1.5,borderBottom:`1px solid ${T.b}`}}>{h}</th>
            )}</tr></thead>
            <tbody>{leads.slice(0,6).map((l,i)=>
              <tr key={i} onClick={()=>{setSelLead(l);setViewWithHistory("lead");}} style={{borderBottom:`1px solid ${T.b}`,cursor:"pointer"}} onMouseOver={ev=>ev.currentTarget.style.background=T.d} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
                <td style={{padding:"14px",fontSize:15,fontWeight:600,color:T.t,whiteSpace:"nowrap"}}>{l.first_name} {l.last_name}</td>
                <td style={{padding:"14px",fontSize:14,color:T.s}}>{l.market||"—"}</td>
                <td style={{padding:"14px",fontSize:14,color:l.brokerage?.toLowerCase().includes("lpt")?T.a:T.t}}>{l.brokerage?.substring(0,22)||"—"}</td>
                <td style={{padding:"14px"}}><TPill t={l.tier}/></td>
                <td style={{padding:"14px"}}><UPill u={l.urgency}/></td>
                <td style={{padding:"14px"}}><Pill text={l.pipeline_stage?.replace(/_/g," ")||"—"} color={STAGES.find(s=>s.id===l.pipeline_stage)?.c||T.s}/></td>
                <td style={{padding:"14px",fontSize:13,color:T.m}}>{ago(l.created_at)}</td>
              </tr>
            )}</tbody>
          </table>
          </div>
          <div className="leads-mobile">
            {leads.slice(0,6).map((l,i)=>
              <div key={i} onClick={()=>{setSelLead(l);setViewWithHistory("lead");}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,marginBottom:8,cursor:"pointer"}}>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{fontSize:15,fontWeight:600,color:T.t}}>{l.first_name} {l.last_name}</div>
                  <div style={{fontSize:12,color:T.s,marginTop:2}}>{l.market||"—"} · {l.brokerage?.substring(0,18)||"—"}</div>
                  <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}><TPill t={l.tier}/><UPill u={l.urgency}/></div>
                </div>
                <span style={{fontSize:14,color:T.s,flexShrink:0,marginLeft:8}}>→</span>
              </div>
            )}
          </div>
          </>
        ) : (
          <div style={{textAlign:"center",padding:"40px 20px"}}>
            <div style={{fontSize:32,marginBottom:10}}>📭</div>
            <div style={{fontSize:16,color:T.s,marginBottom:6}}>No leads yet</div>
            <div style={{fontSize:14,color:T.m}}>Leads from your ads and manual adds will show up here</div>
          </div>
        )}
      </div>
    </>
  );

  const [pipeView,setPipeView]=useState("kanban");
  const [filters,setFilters]=useState({market:"",tier:"",urgency:"",brokerage:""});
  const [sortBy,setSortBy]=useState("urgency");
  const [dragLead,setDragLead]=useState(null);

  const allMarkets=[...new Set(leads.map(l=>l.market).filter(Boolean))].sort();
  const allBrokerages=[...new Set(leads.map(l=>l.brokerage).filter(Boolean))].sort();

  const sortFn=(a,b)=>{
    if(sortBy==="urgency"){const o={HIGH:0,MEDIUM:1,LOW:2};return(o[a.urgency]??3)-(o[b.urgency]??3);}
    if(sortBy==="tier"){const o={Elite:0,Strong:1,Mid:2,Building:3,New:4};return(o[a.tier]??5)-(o[b.tier]??5);}
    if(sortBy==="oldest")return new Date(a.created_at)-new Date(b.created_at);
    if(sortBy==="newest")return new Date(b.created_at)-new Date(a.created_at);
    return 0;
  };

  const pipeLeads=leads.filter(l=>{
    if(search&&!`${l.first_name} ${l.last_name} ${l.market} ${l.brokerage}`.toLowerCase().includes(search.toLowerCase()))return false;
    if(filters.market&&l.market!==filters.market)return false;
    if(filters.tier&&l.tier!==filters.tier)return false;
    if(filters.urgency&&l.urgency!==filters.urgency)return false;
    if(filters.brokerage&&l.brokerage!==filters.brokerage)return false;
    return true;
  }).sort(sortFn);

  const stageAction=(lead)=>{
    const s=lead.pipeline_stage;
    if(s==="researched")return{label:"Draft Outreach",icon:"📱",q:`Draft a personalized recruiting message to ${lead.first_name} ${lead.last_name}. They're at ${lead.brokerage||"unknown brokerage"} in ${lead.market||"unknown market"}.${lead.outreach_angle?" Angle: "+lead.outreach_angle:""}`};
    if(s==="outreach_sent")return{label:"Follow Up",icon:"🔄",q:`Write a follow-up message to ${lead.first_name} ${lead.last_name}. I already sent initial outreach. Make it casual and value-driven.`};
    if(s==="meeting_booked")return{label:"Prep Sheet",icon:"📋",q:`Create a meeting prep sheet for my call with ${lead.first_name} ${lead.last_name}. They're at ${lead.brokerage||"unknown"} in ${lead.market||"unknown"}. ${lead.tier||""} tier. Include talking points, their likely objections, and how to close.`};
    if(s==="in_conversation")return{label:"Close Script",icon:"🎯",q:`Give me a closing script for ${lead.first_name} ${lead.last_name}. We've been talking and I need to move them to a decision.`};
    if(s==="new")return{label:"Research",icon:"🔍",q:`Research ${lead.first_name} ${lead.last_name} in ${lead.market||"their market"}. Find their production, reviews, social media, and give me an outreach angle.`};
    return null;
  };

  const Sel=({value,onChange,options,placeholder})=>(
    <select value={value} onChange={ev=>onChange(ev.target.value)} style={{padding:"10px 14px",borderRadius:6,background:T.card,border:`1px solid ${T.b}`,color:value?T.t:T.m,fontSize:15,outline:"none",fontFamily:"inherit",cursor:"pointer",minWidth:0}}>
      <option value="" style={{background:T.card,color:T.m}}>{placeholder}</option>
      {options.map(o=><option key={o} value={o} style={{background:T.card,color:T.t}}>{o}</option>)}
    </select>
  );

  const KanbanCard=({lead:l})=>{
    const act=stageAction(l);
    return(
      <div draggable onDragStart={()=>setDragLead(l)} style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:8,padding:"14px 16px",marginBottom:18,cursor:"grab",transition:"border-color 0.12s"}}
        onMouseOver={ev=>ev.currentTarget.style.borderColor=T.bh} onMouseOut={ev=>ev.currentTarget.style.borderColor=T.b}>
        <div onClick={()=>{setSelLead(l);setViewWithHistory("lead");}} style={{cursor:"pointer"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
            <div style={{fontSize:16,fontWeight:700,color:T.t}}>{l.first_name} {l.last_name}</div>
            <UPill u={l.urgency}/>
          </div>
          <div style={{fontSize:14,color:T.s,marginBottom:2}}>{l.brokerage?.substring(0,22)||"Unknown"}</div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:14,color:T.s}}>{l.market}</span><TPill t={l.tier}/></div>
        </div>
        {act&&<div onClick={()=>askLiviInline(act.q)} style={{marginTop:6,padding:"10px 14px",borderRadius:5,background:T.as,border:`1px solid ${T.a}15`,fontSize:14,fontWeight:700,color:T.a,cursor:"pointer",display:"flex",alignItems:"center",gap:14,textAlign:"center",justifyContent:"center"}}>{act.icon} {act.label}</div>}
      </div>
    );
  };

  const Pipeline=()=>{
    const overdue=leads.filter(l=>l.pipeline_stage&&l.pipeline_stage!=="new"&&l.pipeline_stage!=="recruited"&&l.created_at&&(Date.now()-new Date(l.created_at))>7*86400000);
    return(
    <>
      <div className="pipe-stats" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[["Total Leads",pipeLeads.length,T.bl],["In Pipeline",pipeLeads.filter(l=>l.pipeline_stage!=="new"&&l.pipeline_stage!=="recruited").length,T.p],["Overdue (7d+)",overdue.length,overdue.length>0?T.r:T.s],["Recruited",pipeLeads.filter(l=>l.pipeline_stage==="recruited").length,T.a]].map(([l,v,c],i)=>
          <div key={i} style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:10,padding:"16px 20px",textAlign:"center"}}>
            <div style={{fontSize:28,fontWeight:800,color:c}}>{v}</div>
            <div style={{fontSize:13,color:T.s,marginTop:4}}>{l}</div>
          </div>
        )}
      </div>

      {overdue.length>0&&(
        <div style={{background:T.r+"10",border:`1px solid ${T.r}25`,borderRadius:10,padding:"14px 20px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>⚠️</span>
            <div><div style={{fontSize:16,fontWeight:700,color:T.r}}>{overdue.length} leads need follow-up</div><div style={{fontSize:14,color:T.s}}>Haven't been contacted in 7+ days</div></div>
          </div>
          <div onClick={()=>setSortBy("oldest")} style={{padding:"10px 16px",borderRadius:6,background:T.r+"20",fontSize:14,fontWeight:700,color:T.r,cursor:"pointer"}}>Show Overdue</div>
        </div>
      )}

      <div className="pipe-toolbar" style={{display:"flex",gap:10,marginBottom:16,alignItems:"center",flexWrap:"wrap"}}>
        <input value={search} onChange={ev=>setSearch(ev.target.value)} placeholder="Search..." style={{padding:"12px 18px",borderRadius:7,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",width:220}}/>
        <Sel value={filters.market} onChange={v=>setFilters(p=>({...p,market:v}))} options={allMarkets} placeholder="Market"/>
        <Sel value={filters.tier} onChange={v=>setFilters(p=>({...p,tier:v}))} options={["Elite","Strong","Mid","Building","New"]} placeholder="Tier"/>
        <Sel value={filters.urgency} onChange={v=>setFilters(p=>({...p,urgency:v}))} options={["HIGH","MEDIUM","LOW"]} placeholder="Urgency"/>
        <Sel value={filters.brokerage} onChange={v=>setFilters(p=>({...p,brokerage:v}))} options={allBrokerages} placeholder="Brokerage"/>
        <div className="pipe-spacer" style={{flex:1}}/>
        <select value={sortBy} onChange={ev=>setSortBy(ev.target.value)} style={{padding:"10px 14px",borderRadius:6,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:15,outline:"none",fontFamily:"inherit"}}>
          {[["urgency","🔥 Hot First"],["tier","🏆 Top Tier"],["newest","🕐 Newest"],["oldest","⏳ Oldest"]].map(([v,l])=><option key={v} value={v} style={{background:T.card}}>{l}</option>)}
        </select>
        <div onClick={()=>setPipeView(pipeView==="kanban"?"table":"kanban")} style={{padding:"10px 16px",borderRadius:6,background:T.card,border:`1px solid ${T.b}`,fontSize:15,color:T.s,cursor:"pointer"}}>{pipeView==="kanban"?"☰ Table":"▦ Board"}</div>
      </div>

      {Object.values(filters).some(Boolean)&&(
        <div style={{display:"flex",gap:14,marginBottom:14,alignItems:"center"}}>
          <span style={{fontSize:14,color:T.m}}>Filters:</span>
          {Object.entries(filters).filter(([,v])=>v).map(([k,v])=>(
            <div key={k} onClick={()=>setFilters(p=>({...p,[k]:""}))} style={{fontSize:14,padding:"4px 10px",borderRadius:4,background:T.bl+"18",color:T.bl,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>{v} <span style={{color:T.s}}>✕</span></div>
          ))}
          <div onClick={()=>setFilters({market:"",tier:"",urgency:"",brokerage:""})} style={{fontSize:14,color:T.s,cursor:"pointer",marginLeft:4}}>Clear all</div>
        </div>
      )}

      {pipeView==="kanban"&&(
        <div className="kanban-wrap" style={{display:"flex",gap:10,overflow:"auto",paddingBottom:8}}>
          {STAGES.map(stg=>{
            const colLeads=pipeLeads.filter(l=>l.pipeline_stage===stg.id);
            return(
              <div key={stg.id} style={{minWidth:220,flex:1}} onDragOver={ev=>ev.preventDefault()} onDrop={()=>{if(dragLead){setDragLead(null);}}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,padding:"0 2px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{width:12,height:12,borderRadius:3,background:stg.c}}/>
                    <span style={{fontSize:15,fontWeight:700,color:T.t}}>{stg.l}</span>
                  </div>
                  <span style={{fontSize:16,fontWeight:800,color:stg.c}}>{colLeads.length}</span>
                </div>
                <div style={{background:T.d,borderRadius:8,padding:10,minHeight:300,border:`1px solid ${T.b}`}}>
                  {colLeads.map(l=><KanbanCard key={l.id||l.first_name+l.last_name} lead={l}/>)}
                  {colLeads.length===0&&<div style={{fontSize:14,color:T.m,textAlign:"center",padding:"30px 8px"}}>No leads</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pipeView==="table"&&(
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:10,padding:"20px 22px"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Name","Market","Brokerage","Tier","Urgency","Stage","Last Contact","Action"].map(h=><th key={h} style={{textAlign:"left",padding:"12px 14px",fontSize:13,fontWeight:700,color:T.m,letterSpacing:1.5,borderBottom:`1px solid ${T.b}`}}>{h}</th>)}</tr></thead>
            <tbody>{pipeLeads.map((l,i)=>{
              const act=stageAction(l);
              const daysSince=l.outreach_sent_at?Math.floor((Date.now()-new Date(l.outreach_sent_at))/86400000):null;
              const contactColor=daysSince===null?T.m:daysSince>7?T.r:daysSince>3?T.y:T.a;
              return(
                <tr key={i} style={{borderBottom:`1px solid ${T.b}`}} onMouseOver={ev=>ev.currentTarget.style.background=T.d} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
                  <td onClick={()=>{setSelLead(l);setViewWithHistory("lead");}} style={{padding:"14px",fontSize:16,fontWeight:600,color:T.t,cursor:"pointer"}}>{l.first_name} {l.last_name}</td>
                  <td style={{padding:"14px",fontSize:15,color:T.s}}>{l.market}</td>
                  <td style={{padding:"14px",fontSize:15,color:l.brokerage?.toLowerCase().includes("lpt")?T.a:T.t}}>{l.brokerage?.substring(0,22)}</td>
                  <td style={{padding:"14px"}}><TPill t={l.tier}/></td>
                  <td style={{padding:"14px"}}><UPill u={l.urgency}/></td>
                  <td style={{padding:"14px"}}><Pill text={l.pipeline_stage?.replace(/_/g," ")||"—"} color={STAGES.find(s=>s.id===l.pipeline_stage)?.c||T.s}/></td>
                  <td style={{padding:"14px",fontSize:14,color:contactColor,fontWeight:daysSince>7?700:400}}>{daysSince!==null?`${daysSince}d ago`:"Never"}</td>
                  <td style={{padding:"14px"}}>{act&&<span onClick={()=>askLiviInline(act.q)} style={{fontSize:14,color:T.a,cursor:"pointer",fontWeight:600}}>{act.icon} {act.label}</span>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </>
    );
  };

  const [crmSearch,setCrmSearch]=useState("");
  const [crmSort,setCrmSort]=useState("newest");
  const crmLeads=leads.filter(l=>{
    if(crmSearch){const s=crmSearch.toLowerCase();if(!(l.first_name?.toLowerCase().includes(s)||l.last_name?.toLowerCase().includes(s)||l.email?.toLowerCase().includes(s)||l.phone?.includes(s)||l.market?.toLowerCase().includes(s)||l.brokerage?.toLowerCase().includes(s)))return false;}
    return true;
  }).sort((a,b)=>{
    if(crmSort==="newest")return new Date(b.created_at||0)-new Date(a.created_at||0);
    if(crmSort==="oldest")return new Date(a.created_at||0)-new Date(b.created_at||0);
    if(crmSort==="name")return(a.first_name||"").localeCompare(b.first_name||"");
    if(crmSort==="urgency")return({HIGH:0,MEDIUM:1,LOW:2}[a.urgency]||3)-({HIGH:0,MEDIUM:1,LOW:2}[b.urgency]||3);
    return 0;
  });

  const CRM=()=>(
    <>
      <div className="crm-toolbar" style={{display:"flex",gap:12,marginBottom:20,alignItems:"center",flexWrap:"wrap"}}>
        <input value={crmSearch} onChange={ev=>setCrmSearch(ev.target.value)} placeholder="Search leads..." style={{padding:"12px 18px",borderRadius:8,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:15,outline:"none",fontFamily:"inherit",width:280}}/>
        <select value={crmSort} onChange={ev=>setCrmSort(ev.target.value)} style={{padding:"10px 14px",borderRadius:6,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:14,outline:"none",fontFamily:"inherit"}}>
          {[["newest","🕐 Newest"],["oldest","⏳ Oldest"],["name","🔤 Name"],["urgency","🔥 Urgency"]].map(([v,l])=><option key={v} value={v} style={{background:T.card}}>{l}</option>)}
        </select>
        <div className="crm-spacer" style={{flex:1}}/>
        <span style={{fontSize:14,color:T.s}}>{crmLeads.length} leads</span>
      </div>
      <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
        <table className="crm-table" style={{width:"100%",borderCollapse:"collapse",minWidth:1000}}>
          <thead><tr>{["Name","Email","Phone","Market","Brokerage","Tier","Urgency","Stage","Source","Added"].map(h=>
            <th key={h} style={{textAlign:"left",padding:"14px 16px",fontSize:12,fontWeight:700,color:T.m,letterSpacing:1.5,borderBottom:`1px solid ${T.b}`,whiteSpace:"nowrap",background:T.side}}>{h}</th>
          )}</tr></thead>
          <tbody>{crmLeads.length>0?crmLeads.map((l,i)=>
            <tr key={i} style={{borderBottom:`1px solid ${T.b}`}} onMouseOver={ev=>ev.currentTarget.style.background=T.d} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
              <td onClick={()=>{setSelLead(l);setViewWithHistory("lead");}} style={{padding:"14px 16px",fontSize:15,fontWeight:600,color:T.t,cursor:"pointer",whiteSpace:"nowrap"}}>{l.first_name} {l.last_name}</td>
              <td style={{padding:"14px 16px",fontSize:14,color:T.bl}}>{l.email?<a href={`mailto:${l.email}`} style={{color:T.bl,textDecoration:"none"}}>{l.email.length>26?l.email.substring(0,26)+"…":l.email}</a>:"—"}</td>
              <td style={{padding:"14px 16px",fontSize:14,color:T.s,whiteSpace:"nowrap"}}>{l.phone||"—"}</td>
              <td style={{padding:"14px 16px",fontSize:14,color:T.s}}>{l.market||"—"}</td>
              <td style={{padding:"14px 16px",fontSize:14,color:l.brokerage?.toLowerCase().includes("lpt")?T.a:T.t}}>{l.brokerage?.substring(0,22)||"—"}</td>
              <td style={{padding:"14px 16px"}}><TPill t={l.tier}/></td>
              <td style={{padding:"14px 16px"}}><UPill u={l.urgency}/></td>
              <td style={{padding:"14px 16px"}}><Pill text={l.pipeline_stage?.replace(/_/g," ")||"—"} color={STAGES.find(s=>s.id===l.pipeline_stage)?.c||T.s}/></td>
              <td style={{padding:"14px 16px",fontSize:13,color:T.s}}>{l.source||"Ad"}</td>
              <td style={{padding:"14px 16px",fontSize:13,color:T.m,whiteSpace:"nowrap"}}>{ago(l.created_at)}</td>
            </tr>
          ):<tr><td colSpan={10} style={{textAlign:"center",padding:"60px 20px",color:T.m,fontSize:16}}>No leads found</td></tr>}</tbody>
        </table>
        </div>
      </div>
    </>
  );

  // ━━━ ADMIN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const [adminStats,setAdminStats]=useState({users:0,leads:0,contentToday:0,agents:0});
  const [adminUsers,setAdminUsers]=useState([]);
  const [adminActivity,setAdminActivity]=useState([]);
  const [adminContent,setAdminContent]=useState([]);
  const [newContent,setNewContent]=useState({title:"",body:"",type:"announcement"});
  const [adminLoading,setAdminLoading]=useState(false);
  const [adminUserLeadStats, setAdminUserLeadStats] = useState({});

  const loadAdmin=useCallback(async()=>{
    setAdminLoading(true);
    const today=new Date().toISOString().split("T")[0];
    const [usersCount,leadsCount,contentCount,agentsCount,usersRows,activityRows,contentRows,leadsRows,blogPendingCount,blogApprovedCount,blogRejectedCount,blogTotalCount]=await Promise.all([
      supabase.from("profiles").select("*",{count:"exact",head:true}),
      supabase.from("leads").select("*",{count:"exact",head:true}),
      supabase.from("daily_content").select("*",{count:"exact",head:true}).eq("content_date",today),
      supabase.from("agent_directory").select("*",{count:"exact",head:true}),
      supabase.from("profiles").select("*").order("created_at",{ascending:false}).limit(100),
      supabase.from("user_activity").select("*").order("created_at",{ascending:false}).limit(20),
      supabase.from("platform_content").select("*").order("created_at",{ascending:false}).limit(20),
      supabase.from("leads").select("user_id,pipeline_stage,volume,transaction_count"),
      supabase.from("brokerage_posts").select("*",{count:"exact",head:true}).eq("status","draft"),
      supabase.from("brokerage_posts").select("*",{count:"exact",head:true}).eq("status","approved"),
      supabase.from("brokerage_posts").select("*",{count:"exact",head:true}).eq("status","rejected"),
      supabase.from("brokerage_posts").select("*",{count:"exact",head:true}),
    ]);
    console.log("Blog stats debug:", {
      pending: { count: blogPendingCount.count, error: blogPendingCount.error },
      approved: { count: blogApprovedCount.count, error: blogApprovedCount.error },
      rejected: { count: blogRejectedCount.count, error: blogRejectedCount.error },
      total: { count: blogTotalCount.count, error: blogTotalCount.error },
    });
    // Build per-user lead stats
    const leadsData = leadsRows.data || [];
    const userLeadStats = {};
    leadsData.forEach(l => {
      if (!l.user_id) return;
      if (!userLeadStats[l.user_id]) userLeadStats[l.user_id] = {total:0,recruited:0,meeting:0,talking:0,volume:0,transactions:0};
      userLeadStats[l.user_id].total++;
      if (l.pipeline_stage === 'recruited') userLeadStats[l.user_id].recruited++;
      if (l.pipeline_stage === 'meeting_booked') userLeadStats[l.user_id].meeting++;
      if (l.pipeline_stage === 'in_conversation') userLeadStats[l.user_id].talking++;
      if (l.volume) userLeadStats[l.user_id].volume += parseFloat(l.volume)||0;
      if (l.transaction_count) userLeadStats[l.user_id].transactions += parseInt(l.transaction_count)||0;
    });
    const totalRecruited = leadsData.filter(l=>l.pipeline_stage==='recruited').length;
    const totalMeeting = leadsData.filter(l=>l.pipeline_stage==='meeting_booked').length;
    setAdminStats({
      users:usersCount.count||0,
      leads:leadsCount.count||0,
      contentToday:contentCount.count||0,
      agents:agentsCount.count||0,
      recruited:totalRecruited,
      meetings:totalMeeting,
      blogPending:blogPendingCount.count||0,
      blogPublished:blogApprovedCount.count||0,
      blogRejected:blogRejectedCount.count||0,
      blogTotal:blogTotalCount.count||0,
    });
    setAdminUsers(usersRows.data||[]);
    setAdminActivity(activityRows.data||[]);
    setAdminContent(contentRows.data||[]);
    setAdminUserLeadStats(userLeadStats);
    setAdminLoading(false);
  },[]);



  useEffect(()=>{if(view==="admin"){if(profile?.role!=="owner"){setView("home");return;}loadAdmin();}},[view,loadAdmin,profile]);

  const publishContent=async()=>{
    if(!newContent.title.trim())return;
    const {error}=await supabase.from("platform_content").insert({...newContent,is_published:true});
    if(!error){setNewContent({title:"",body:"",type:"announcement"});loadAdmin();}
  };

  const AdminView=()=>(
    <>
      <div className="kpi-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
        {[["👥","Total Users",adminStats.users,"Platform accounts",T.bl],["🎯","Total Leads",adminStats.leads,"Across all users",T.a],["📝","Content Today",adminStats.contentToday,"Posts generated",T.y],["🔍","Agent Directory",adminStats.agents?.toLocaleString(),"Licensed agents",T.p],["🏆","Recruited",adminStats.recruited||0,"Agents recruited",T.a],["📅","Meetings",adminStats.meetings||0,"Meetings booked",T.p],["📰","Blog Pending",adminStats.blogPending||0,"Awaiting review","#FBBF24"],["✅","Blog Published",adminStats.blogPublished||0,"Live on site",T.a]].map(([ic,l,v,s,c],i)=>
          <div key={i} className="kpi-card" style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"22px 24px",display:"flex",alignItems:"center",gap:16}}>
            <div className="kpi-icon" style={{width:52,height:52,borderRadius:10,background:c+"10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{ic}</div>
            <div>
              <div className="kpi-label" style={{fontSize:12,color:T.s,letterSpacing:2,fontWeight:700}}>{l.toUpperCase()}</div>
              <div className="kpi-val" style={{fontSize:32,fontWeight:800,color:T.t}}>{adminLoading?"…":v}</div>
              <div style={{fontSize:12,color:c,fontWeight:600}}>{s}</div>
            </div>
          </div>
        )}
      </div>

      <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px",marginBottom:24}}>
        <div style={{fontSize:18,fontWeight:700,color:T.t,marginBottom:16}}>📰 Blog Content Review</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
          {[["Pending Review",adminStats.blogPending||0,"#FBBF24"],["Approved",adminStats.blogPublished||0,T.a],["Rejected",adminStats.blogRejected||0,"#F56565"],["Total Posts",adminStats.blogTotal||0,T.t]].map(([label,val,color],i)=>
            <div key={i} onClick={()=>window.open("https://www.rkrt.in/admin/blog","_blank")} style={{background:T.d,border:`1px solid ${T.b}`,borderRadius:10,padding:"18px 20px",cursor:"pointer",transition:"border-color 0.15s"}}>
              <div style={{fontSize:28,fontWeight:800,color}}>{adminLoading?"…":val}</div>
              <div style={{fontSize:11,color:T.m,fontWeight:700,letterSpacing:1.2,marginTop:4}}>{label.toUpperCase()}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px",marginBottom:24}}>
        <div style={{fontSize:18,fontWeight:700,color:T.t,marginBottom:16}}>👥 Users ({adminUsers.length})</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
            <thead><tr>{["Name","Email","Brokerage","Role","Plan","Leads","Recruited","Meetings","Joined","Onboarded"].map(h=>
              <th key={h} style={{textAlign:"left",padding:"12px 14px",fontSize:12,fontWeight:700,color:T.m,letterSpacing:1.5,borderBottom:`1px solid ${T.b}`,whiteSpace:"nowrap",background:T.side}}>{h}</th>
            )}</tr></thead>
            <tbody>{adminUsers.length>0?adminUsers.map((u,i)=>
              <tr key={i} style={{borderBottom:`1px solid ${T.b}`}} onMouseOver={ev=>ev.currentTarget.style.background=T.d} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
                <td style={{padding:"13px 14px",fontSize:15,fontWeight:600,color:T.t,whiteSpace:"nowrap"}}>{u.full_name||"—"}</td>
                <td style={{padding:"13px 14px",fontSize:13,color:T.bl}}>{u.email||"—"}</td>
                <td style={{padding:"13px 14px",fontSize:13,color:T.s}}>{u.brokerage||"—"}</td>
                <td style={{padding:"13px 14px"}}><span style={{fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:4,background:u.role==="owner"?T.r+"20":u.role==="admin"?T.p+"20":T.s+"20",color:u.role==="owner"?T.r:u.role==="admin"?T.p:T.s}}>{u.role||"user"}</span></td>
                <td style={{padding:"13px 14px",fontSize:13,color:T.s}}>{u.plan||"free"}</td>
                <td style={{padding:"13px 14px",fontSize:13,fontWeight:600,color:T.t}}>{adminUserLeadStats[u.id]?.total||0}</td>
                <td style={{padding:"13px 14px",fontSize:13,fontWeight:700,color:adminUserLeadStats[u.id]?.recruited>0?T.a:T.m}}>{adminUserLeadStats[u.id]?.recruited||0}</td>
                <td style={{padding:"13px 14px",fontSize:13,fontWeight:700,color:adminUserLeadStats[u.id]?.meeting>0?T.p:T.m}}>{adminUserLeadStats[u.id]?.meeting||0}</td>
                <td style={{padding:"13px 14px",fontSize:13,color:T.m,whiteSpace:"nowrap"}}>{u.created_at?new Date(u.created_at).toLocaleDateString():"—"}</td>
                <td style={{padding:"13px 14px"}}><span style={{fontSize:12,fontWeight:700,color:u.onboarded?T.a:T.y}}>{u.onboarded?"✓ Yes":"— No"}</span></td>
              </tr>
            ):<tr><td colSpan={10} style={{textAlign:"center",padding:"40px",color:T.m,fontSize:15}}>No users found</td></tr>}</tbody>
          </table>
        </div>
      </div>

      <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px"}}>
          <div style={{fontSize:18,fontWeight:700,color:T.t,marginBottom:16}}>📊 Recent Activity</div>
          {adminActivity.length>0?adminActivity.map((a,i)=>{
            const u=adminUsers.find(x=>x.id===a.user_id);
            const AL={login:'Logged in',add_lead:'Added lead',add_lead_from_directory:'Added from directory',generate_content:'Generated content',copy_content:'Copied content',mark_posted:'Marked as posted',search_agents:'Searched agents',research_lead:'Researched lead',draft_outreach:'Drafted outreach',update_profile:'Updated profile',delete_lead:'Deleted lead',onboarding_complete:'Completed onboarding'};
            const AI={login:'🔑',add_lead:'➕',add_lead_from_directory:'🔍',generate_content:'✨',copy_content:'📋',mark_posted:'✅',search_agents:'🔎',research_lead:'🔬',draft_outreach:'📱',update_profile:'👤',delete_lead:'🗑️',onboarding_complete:'🚀'};
            const meta=a.metadata||{};
            const detail=meta.lead_name||meta.agent_name||(meta.platform?meta.platform:'')||(meta.date?meta.date:'');
            return(
            <div key={i} style={{display:"flex",gap:10,padding:"10px 0",alignItems:"flex-start",borderBottom:i<adminActivity.length-1?`1px solid ${T.b}`:"none"}}>
              <span style={{fontSize:16,flexShrink:0,marginTop:1}}>{AI[a.action]||'📌'}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,color:T.t,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u?.full_name||u?.email||a.user_id?.substring(0,8)||"—"}</div>
                <div style={{fontSize:12,color:T.s,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{AL[a.action]||a.action||"—"}{detail?` · ${detail}`:''}</div>
              </div>
              <span style={{fontSize:11,color:T.m,flexShrink:0}}>{ago(a.created_at)}</span>
            </div>);}):(<div style={{textAlign:"center",padding:"40px",color:T.m}}><div style={{fontSize:28,marginBottom:8}}>📋</div><div style={{fontSize:14}}>No activity logged yet</div></div>)}
        </div>

        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px"}}>
          <div style={{fontSize:18,fontWeight:700,color:T.t,marginBottom:16}}>⚡ System Status</div>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:10}}>EDGE FUNCTIONS</div>
            {[["sync-agents","Agent directory sync (FL/TX/NY/CT)","ok"],["generate-content","Daily AI content generation (6 posts)","ok"],["research-to-lead","AI agent research & dossier","ok"],["enrich-agent","Apollo.io contact enrichment","ok"],["parse-research","Parse research into lead fields","ok"],["migrate-leads","Lead data migration tool","ok"],["bulk-agent-load","Bulk agent directory loader","ok"],["load-fl-csv","Florida CSV agent loader","ok"],["lp","Landing page server (v3 - has bug)","warn"]].map(([name,desc,status])=>
              <div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderRadius:8,background:T.d,border:`1px solid ${status==="warn"?T.y+"30":T.b}`,marginBottom:6}}>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.t,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</div>
                  <div style={{fontSize:11,color:T.s}}>{desc}</div>
                </div>
                <span style={{fontSize:13,color:status==="warn"?T.y:T.a,fontWeight:700,flexShrink:0,marginLeft:8}}>{status==="warn"?"⚠️":"✅"}</span>
              </div>
            )}
          </div>
          <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:10}}>QUICK LINKS</div>
          {[["📰","Blog Admin","https://www.rkrt.in/admin/blog"],["🗄️","Supabase Dashboard","https://supabase.com/dashboard/project/usknntguurefeyzusbdh"],["▲","Vercel Dashboard","https://vercel.com/livinmedias-projects/lpt-recruiting"],["🐙","GitHub Repo","https://github.com/livinmedia/lpt-recruiting"]].map(([ic,label,url])=>
            <a key={label} href={url} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,marginBottom:6,textDecoration:"none",color:T.t}}>
              <span style={{fontSize:18}}>{ic}</span><span style={{fontSize:13,fontWeight:600}}>{label}</span><span style={{marginLeft:"auto",fontSize:12,color:T.s}}>→</span>
            </a>
          )}
        </div>
      </div>

      <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px"}}>
        <div style={{fontSize:18,fontWeight:700,color:T.t,marginBottom:16}}>📣 Platform Content Manager</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:14}} className="form-grid">
          <div>
            <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>TITLE</div>
            <input value={newContent.title} onChange={ev=>setNewContent(p=>({...p,title:ev.target.value}))} placeholder="Announcement title..." style={{width:"100%",padding:"12px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:15,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
          </div>
          <div>
            <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>TYPE</div>
            <select value={newContent.type} onChange={ev=>setNewContent(p=>({...p,type:ev.target.value}))} style={{width:"100%",padding:"12px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:15,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}>
              {["announcement","blog","changelog"].map(t=><option key={t} value={t} style={{background:T.card}}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
          <div style={{gridColumn:"1/3"}}>
            <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>BODY</div>
            <textarea value={newContent.body} onChange={ev=>setNewContent(p=>({...p,body:ev.target.value}))} placeholder="Write your content..." rows={4} style={{width:"100%",padding:"12px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:15,outline:"none",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box",lineHeight:1.5}}/>
          </div>
        </div>
        <div onClick={publishContent} style={{padding:"12px 24px",borderRadius:8,background:newContent.title.trim()?T.a:"#333",color:newContent.title.trim()?"#000":T.m,fontSize:15,fontWeight:700,cursor:newContent.title.trim()?"pointer":"default",display:"inline-flex",alignItems:"center",gap:8,marginBottom:24}}>📣 Publish</div>
        <div style={{fontSize:12,color:T.m,fontWeight:700,letterSpacing:1.5,marginBottom:10}}>PUBLISHED CONTENT</div>
        {adminContent.length>0?adminContent.map((c,i)=>
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"14px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,marginBottom:8}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                <span style={{fontSize:13,fontWeight:700,color:T.t}}>{c.title}</span>
                <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:4,background:T.bl+"20",color:T.bl}}>{c.type}</span>
              </div>
              {c.body&&<div style={{fontSize:13,color:T.s,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.body}</div>}
            </div>
            <div style={{flexShrink:0,marginLeft:16,textAlign:"right"}}>
              <div style={{fontSize:12,color:c.is_published?T.a:T.y,fontWeight:700}}>{c.is_published?"Published":"Draft"}</div>
              <div style={{fontSize:11,color:T.m}}>{c.created_at?new Date(c.created_at).toLocaleDateString():"—"}</div>
            </div>
          </div>
        ):<div style={{textAlign:"center",padding:"24px",color:T.m}}>No content published yet</div>}
      </div>
    </>
  );

  // ━━━ PROFILE VIEW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const ProfileView=()=>{
    if(!profileEdit)return null;
    const inSt={width:"100%",padding:"13px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:15,outline:"none",fontFamily:"inherit",boxSizing:"border-box"};
    const roSt={width:"100%",padding:"13px 16px",borderRadius:8,background:T.bg,border:`1px solid ${T.b}`,color:T.m,fontSize:15};

    // Determine if brokerage is in the known list
    const knownBrokerage = BROKERAGES.includes(profileEdit.brokerage);
    const displayBrokerage = knownBrokerage ? profileEdit.brokerage : (profileEdit.brokerage ? "Other" : "");

    return(
      <div style={{maxWidth:640,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:28}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,#3B82F6,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:800,flexShrink:0}}>{profile?.full_name?.charAt(0).toUpperCase()||authUser?.email?.charAt(0).toUpperCase()||"?"}</div>
          <div>
            <div style={{fontSize:22,fontWeight:800,color:T.t}}>{profile?.full_name||"Your Name"}</div>
            <div style={{fontSize:14,color:T.s,marginTop:2}}>{authUser?.email}</div>
            {profile?.brokerage&&<div style={{fontSize:13,color:T.a,marginTop:3,fontWeight:600}}>{profile.brokerage}</div>}
          </div>
        </div>

        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"28px 30px",marginBottom:20}}>
          <div style={{fontSize:17,fontWeight:700,color:T.t,marginBottom:20}}>Account Info</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}} className="form-grid">
            <div>
              <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>FULL NAME</div>
              <input value={profileEdit.full_name||""} onChange={ev=>setProfileEdit(p=>({...p,full_name:ev.target.value}))} placeholder="Your Name" style={inSt}/>
            </div>
            <div>
              <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>PHONE</div>
              <input value={profileEdit.phone||""} onChange={ev=>setProfileEdit(p=>({...p,phone:ev.target.value}))} placeholder="(555) 123-4567" style={inSt}/>
            </div>
            <div style={{gridColumn:"1/3"}}>
              <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>BROKERAGE</div>
              <select
                value={BROKERAGES.includes(profileEdit.brokerage)?profileEdit.brokerage:(profileEdit.brokerage?"Other":"")}
                onChange={ev=>{
                  if(ev.target.value!=="Other"){
                    setProfileEdit(p=>({...p,brokerage:ev.target.value,brokerage_other:""}));
                  } else {
                    setProfileEdit(p=>({...p,brokerage:"Other",brokerage_other:p.brokerage_other||""}));
                  }
                }}
                style={{...inSt,marginBottom:BROKERAGES.includes(profileEdit.brokerage)||!profileEdit.brokerage?0:8}}
              >
                <option value="" style={{background:T.card}}>Select your brokerage...</option>
                {BROKERAGES.map(b=><option key={b} value={b} style={{background:T.card}}>{b}</option>)}
              </select>
              {profileEdit.brokerage==="Other"&&(
                <input
                  value={profileEdit.brokerage_other||""}
                  onChange={ev=>setProfileEdit(p=>({...p,brokerage_other:ev.target.value}))}
                  placeholder="Enter your brokerage name"
                  style={{...inSt,marginTop:8}}
                />
              )}
              {/* If it was a custom value not in list, show it pre-filled in Other input */}
              {profileEdit.brokerage&&!BROKERAGES.includes(profileEdit.brokerage)&&profileEdit.brokerage!=="Other"&&(
                <input
                  value={profileEdit.brokerage}
                  onChange={ev=>setProfileEdit(p=>({...p,brokerage:ev.target.value}))}
                  placeholder="Enter your brokerage name"
                  style={{...inSt,marginTop:8}}
                />
              )}
            </div>
            <div>
              <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>LICENSE NUMBER</div>
              <input value={profileEdit.license_number||""} onChange={ev=>setProfileEdit(p=>({...p,license_number:ev.target.value}))} placeholder="RE123456" style={inSt}/>
            </div>
            <div>
              <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>LICENSE STATE</div>
              <input value={profileEdit.license_state||""} onChange={ev=>setProfileEdit(p=>({...p,license_state:ev.target.value.toUpperCase()}))} placeholder="TX" maxLength={2} style={inSt}/>
            </div>
            <div style={{gridColumn:"1/3"}}>
              <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>PRIMARY MARKET</div>
              <input value={profileEdit.market||""} onChange={ev=>setProfileEdit(p=>({...p,market:ev.target.value}))} placeholder="Austin, TX" style={inSt}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:24,opacity:0.6}} className="form-grid">
            {[["EMAIL (read-only)",authUser?.email],["ROLE",profile?.role],["PLAN",profile?.plan]].map(([label,value])=>(
              <div key={label}>
                <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>{label}</div>
                <div style={roSt}>{value||"—"}</div>
              </div>
            ))}
          </div>
          <div onClick={saveProfile} style={{padding:"13px 28px",borderRadius:8,background:profileSaving?"#333":T.a,color:profileSaving?T.m:"#000",fontSize:15,fontWeight:700,cursor:profileSaving?"default":"pointer",display:"inline-flex",alignItems:"center",gap:8}}>
            {profileSaving?"Saving…":"✓ Save Changes"}
          </div>
        </div>

        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px"}}>
          <div style={{fontSize:17,fontWeight:700,color:T.t,marginBottom:16}}>Session</div>
          <div onClick={()=>{supabase.auth.signOut().then(()=>{window.location.href="/login";});}} style={{padding:"12px 24px",borderRadius:8,background:T.r+"15",border:`1px solid ${T.r}30`,color:T.r,fontSize:15,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:8}}>⏻ Logout</div>
        </div>
      </div>
    );
  };

  // ━━━ RENDER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if(authLoading) return <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",color:T.s,fontSize:18,fontFamily:"'SF Pro Display',-apple-system,sans-serif"}}>Authenticating…</div>;

  // Show onboarding gate for new users
  if(showOnboarding && authUser) {
    return <OnboardingFlow userId={authUser.id} email={authUser.email} onComplete={handleOnboardingComplete}/>;
  }

  return(
    <div style={{minHeight:"100vh",background:T.bg,color:T.t,fontFamily:"'SF Pro Display',-apple-system,sans-serif",display:"flex",position:"relative"}}>
      {showUpgradeSuccess&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:T.a,color:"#000",padding:"14px 32px",borderRadius:10,fontSize:15,fontWeight:800,boxShadow:"0 4px 24px rgba(0,229,160,0.4)",display:"flex",alignItems:"center",gap:10}}>🎉 Welcome to RKRT.in Pro! All features unlocked.</div>}
      <style>{`
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
textarea::placeholder,input::placeholder{color:${T.m}}
html,body{overflow-x:hidden}
*{box-sizing:border-box}
.leads-desktop{display:block}
.leads-mobile{display:none}
select option{background:${T.card};color:${T.t}}

@media(min-width:769px) and (max-width:1200px){
  .content-grid{grid-template-columns:repeat(2,1fr)!important}
}

@media(max-width:768px){
.app-sidebar{position:fixed!important;left:0!important;top:0!important;bottom:0!important;transform:translateX(-100%);transition:transform 0.25s ease;z-index:1000;width:72px!important;height:100vh}
.app-sidebar.open{transform:translateX(0)!important}
.main-scroll{padding:14px 16px!important}
.hamburger-btn{display:flex!important}
.page-header{flex-direction:column!important;align-items:flex-start!important}
.kpi-grid{grid-template-columns:1fr 1fr!important;gap:10px!important}
.kpi-card{padding:12px!important;gap:8px!important;min-width:0!important}
.kpi-icon{width:36px!important;height:36px!important;font-size:16px!important;flex-shrink:0!important}
.kpi-val{font-size:22px!important}
.kpi-label{font-size:10px!important;letter-spacing:1px!important}
.quick-grid{grid-template-columns:1fr 1fr!important;gap:8px!important}
.content-grid{grid-template-columns:1fr!important}
.content-ctrl-row{flex-direction:column!important;align-items:stretch!important}
.content-ctrl-row input,.content-ctrl-row>div{width:100%!important;box-sizing:border-box!important}
.two-col{grid-template-columns:1fr!important}
.four-col{grid-template-columns:1fr!important}
.kanban-wrap{flex-direction:column!important}
.kanban-wrap>div{min-width:100%!important}
.crm-table{font-size:13px!important}
.crm-table td,.crm-table th{padding:10px 8px!important}
.pipe-toolbar{flex-direction:column!important;align-items:stretch!important;gap:8px!important}
.pipe-toolbar input,.pipe-toolbar select{width:100%!important}
.pipe-spacer{display:none!important}
.agent-search-btns{width:100%!important}
.crm-toolbar{flex-direction:column!important;align-items:stretch!important;gap:8px!important}
.crm-spacer{display:none!important}
.generate-btn{justify-content:center!important}
.content-filter-tabs{gap:0!important}
.content-filter-tabs>div{flex:1!important}
.newly-licensed-row>div:first-child{width:100%!important}
.leads-desktop{display:none!important}
.leads-mobile{display:block!important}
.content-header-outer{flex-direction:column!important;align-items:stretch!important;gap:10px!important}
.ask-livi-grid{grid-template-columns:1fr!important}
.pipe-stats{gap:4px!important}
.pipe-stats>div{padding:8px 4px!important}
.form-grid{grid-template-columns:1fr!important}
.form-grid>div[style*="grid-column"]{grid-column:1!important}
*{word-break:break-word;overflow-wrap:anywhere}
}`}</style>

      {sidebarOpen&&<div onClick={()=>{setSidebarOpen(false);setProfileMenuOpen(false);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:999}}/>}
      {profileMenuOpen&&<div onClick={()=>setProfileMenuOpen(false)} style={{position:"fixed",inset:0,zIndex:1099}}/>}

      {profileMenuOpen&&(
        <div style={{position:"fixed",bottom:80,left:8,width:210,background:T.card,border:`1px solid ${T.b}`,borderRadius:10,padding:"6px 0",zIndex:1100,boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
          {profile?.role==="owner"&&<>
            <div onClick={()=>{setViewWithHistory("admin");setSidebarOpen(false);setProfileMenuOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",cursor:"pointer",fontSize:14,fontWeight:600,color:T.r,borderRadius:6}} onMouseOver={ev=>ev.currentTarget.style.background=T.r+"15"} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
              <span>🛡️</span><span>Admin Dashboard</span>
            </div>
            <div style={{height:1,background:T.b,margin:"4px 0"}}/>
          </>}
          <div onClick={()=>{setViewWithHistory("profile");setSidebarOpen(false);setProfileMenuOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",cursor:"pointer",fontSize:14,fontWeight:600,color:T.t}} onMouseOver={ev=>ev.currentTarget.style.background=T.bh} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
            <span>👤</span><span>My Profile</span>
          </div>
          <div style={{height:1,background:T.b,margin:"4px 0"}}/>
          <div onClick={()=>{supabase.auth.signOut().then(()=>{window.location.href="/login";});}} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",cursor:"pointer",fontSize:14,fontWeight:600,color:T.r}} onMouseOver={ev=>ev.currentTarget.style.background=T.r+"15"} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
            <span>🚪</span><span>Logout</span>
          </div>
        </div>
      )}

      <div className={`app-sidebar${sidebarOpen?" open":""}`} style={{width:80,background:T.side,borderRight:`1px solid ${T.b}`,display:"flex",flexDirection:"column",alignItems:"center",padding:"14px 0",flexShrink:0,position:"sticky",top:0,height:"100vh",overflow:"hidden"}}>
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:14,width:"100%",overflow:"auto"}}>
          <div style={{width:44,height:44,borderRadius:9,marginBottom:6,background:"linear-gradient(135deg,#00E5A0,#3B82F6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:11,letterSpacing:"-0.5px",lineHeight:1,flexShrink:0}}><span style={{color:"#fff"}}>rkrt</span><span style={{color:"#000"}}>.in</span></div>
          {[["home","⬡"],["pipeline","◎"],["crm","📋"],["agents","🔍"],["content","📝"],["calculator","🧮"],["revenue","💰"]].map(([id,ic])=>
            <div key={id} onClick={()=>{setViewWithHistory(id);setSidebarOpen(false);setProfileMenuOpen(false);}} title={id} className="nav-btn" style={{width:48,height:48,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:20,background:view===id?T.am:"transparent",color:view===id?T.a:T.m,transition:"all 0.12s",flexShrink:0}}>{ic}</div>
          )}
          {(profile?.role==="owner"||profile?.role==="admin")&&<div onClick={()=>window.open("https://www.rkrt.in/admin/blog","_blank")} title="Blog Admin" className="nav-btn" style={{width:48,height:48,borderRadius:8,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",background:"transparent",color:T.m,transition:"all 0.12s",flexShrink:0,gap:2}}><span style={{fontSize:18}}>📰</span><span style={{fontSize:8,fontWeight:700,letterSpacing:0.5}}>Blog</span></div>}
        </div>
        <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:8,paddingTop:14,paddingBottom:4}}>
          <div onClick={load} style={{width:44,height:44,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:17,color:loading?T.a:T.m}}>{loading?"⟳":"↻"}</div>
          <div style={{position:'relative',cursor:'pointer'}} onClick={()=>setNotifOpen(o=>!o)}>
            <span style={{fontSize:20}}>🔔</span>
            {unreadCount > 0 && (
              <div style={{position:'absolute',top:-4,right:-4,background:'#EF4444',color:'#fff',borderRadius:'50%',width:16,height:16,fontSize:9,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
            {notifOpen && (
              <div style={{position:'absolute',bottom:32,left:50,width:320,background:T.card,border:`1px solid ${T.b}`,borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,0.4)',zIndex:1000,overflow:'hidden'}}>
                <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.b}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontWeight:700,color:T.t,fontSize:14}}>Notifications</span>
                  {unreadCount > 0 && <span onClick={async(e)=>{e.stopPropagation();await supabase.from('notifications').update({read:true}).eq('user_id',authUser?.id).eq('read',false);loadNotifications();}} style={{fontSize:11,color:T.a,cursor:'pointer'}}>Mark all read</span>}
                </div>
                {notifications.length === 0
                  ? <div style={{padding:24,textAlign:'center',color:T.s,fontSize:13}}>No notifications yet</div>
                  : notifications.map(n=>(
                    <div key={n.id} onClick={()=>{supabase.from('notifications').update({read:true}).eq('id',n.id);setNotifOpen(false);}} style={{padding:'12px 16px',borderBottom:`1px solid ${T.b}20`,background:n.read?'transparent':T.a+'10',cursor:'pointer'}}>
                      <div style={{fontSize:13,fontWeight:n.read?400:700,color:T.t,marginBottom:2}}>{n.title}</div>
                      <div style={{fontSize:11,color:T.s,lineHeight:1.4}}>{n.body}</div>
                      <div style={{fontSize:10,color:T.m,marginTop:4}}>{new Date(n.created_at).toLocaleDateString()}</div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
          <div onClick={()=>setProfileMenuOpen(v=>!v)} title="Account" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer",padding:"8px 4px",borderRadius:8,background:profileMenuOpen?T.bh:"transparent",transition:"background 0.12s",width:64}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:T.a,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#000"}}>{profile?.full_name?.charAt(0).toUpperCase()||authUser?.email?.charAt(0).toUpperCase()||"?"}</div>
            <div style={{fontSize:9,color:T.m,maxWidth:56,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"center",letterSpacing:0.3}}>{profile?.full_name?.split(" ")[0]||"Account"}</div>
          </div>
        </div>
      </div>

      <div className="main-scroll" style={{flex:1,overflow:"auto",padding:(view==="lead"||view==="addlead")?"0":"24px 32px"}}>
        {view!=="lead"&&view!=="addlead"&&<div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div className="hamburger-btn" onClick={()=>setSidebarOpen(v=>!v)} style={{display:"none",width:44,height:44,borderRadius:8,alignItems:"center",justifyContent:"center",fontSize:22,cursor:"pointer",background:T.card,border:`1px solid ${T.b}`,color:T.t,flexShrink:0}}>☰</div>
            <h1 className="page-title" style={{fontSize:32,fontWeight:800,margin:0}}>{view==="home"?"Command Center":view==="pipeline"?"Lead Pipeline":view==="crm"?"Leads CRM":view==="agents"?"Agent Directory":view==="content"?"Today's Content":view==="calculator"?"Commission Calculator":view==="revenue"?"Revenue Share":view==="admin"?"Admin":view==="profile"?"My Profile":"rkrt.in"}</h1>
          </div>
          {/* Brokerage chip in header */}
          {profile?.brokerage&&view==="home"&&(
            <div style={{fontSize:13,color:T.s,padding:"6px 12px",borderRadius:6,background:T.card,border:`1px solid ${T.b}`}}>
              🏢 <span style={{color:T.t,fontWeight:600}}>{profile.brokerage}</span> · {profile.market||"No market set"}
            </div>
          )}
        </div>}
        {view==="home"&&<><AskLiviBar prompts={[["🎯","Who to Call",`Who should I call first today? Look at my pipeline and tell me the highest priority lead.${profile?.brokerage?" I recruit for "+profile.brokerage:""}`,T.a],["📱","Draft Outreach",`Draft a recruiting DM for my hottest lead in the pipeline.${profile?.brokerage?" Context: I'm at "+profile.brokerage:""}`,T.bl],["🔍","Find Agents",`Find me 5 real estate agents${profile?.market?" in "+profile.market:""} who might be looking to switch brokerages.`,T.p],["📋","Game Plan",`Create my recruiting game plan for this week based on my current pipeline.${profile?.brokerage?" I'm at "+profile.brokerage:""}`,T.y]]}/><Dash/></>}
        {view==="pipeline"&&<><AskLiviBar prompts={[["📱","Draft Outreach",`Look at my pipeline and draft outreach for my highest priority lead.`,T.a],["🔄","Follow-ups",`Which leads need follow-up? Draft messages for each.`,T.bl],["🎯","Strategy",`Analyze my pipeline and suggest what I should focus on.`,T.p],["📊","Conversion Tips",`Based on my pipeline, what can I do to improve conversion?`,T.y]]}/>{!isPro&&<div style={{background:'#F59E0B15',border:'1px solid #F59E0B40',borderRadius:10,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}><div><span style={{fontSize:13,fontWeight:700,color:'#F59E0B'}}>⚠️ Free Plan: </span><span style={{fontSize:13,color:T.s}}>{leads.length} of {limits.leadLimit} leads used · Upgrade for unlimited</span></div><div onClick={()=>startCheckout(authUser?.id,profile?.email)} style={{padding:'8px 16px',borderRadius:8,background:'#F59E0B',color:'#000',fontSize:13,fontWeight:700,cursor:'pointer'}}>Upgrade →</div></div>}<Pipeline/></>}
        {view==="crm"&&<><AskLiviBar prompts={[["🔍","Find Prospects",`Find me 5 real estate agents who might be looking to switch brokerages.`,T.a],["📊","Score Leads",`Score my current leads and tell me who to prioritize.`,T.bl],["📱","Outreach Plan",`Create an outreach plan for all my new and researched leads.`,T.p],["🎯","Market Analysis",`Which markets should I be targeting for recruiting?`,T.y]]}/>{!isPro&&<div style={{background:'#F59E0B15',border:'1px solid #F59E0B40',borderRadius:10,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}><div><span style={{fontSize:13,fontWeight:700,color:'#F59E0B'}}>⚠️ Free Plan: </span><span style={{fontSize:13,color:T.s}}>{leads.length} of {limits.leadLimit} leads used · Upgrade for unlimited</span></div><div onClick={()=>startCheckout(authUser?.id,profile?.email)} style={{padding:'8px 16px',borderRadius:8,background:'#F59E0B',color:'#000',fontSize:13,fontWeight:700,cursor:'pointer'}}>Upgrade →</div></div>}<CRM/></>}
        {view==="agents"&&<ProGate feature="Agent Directory" userId={authUser?.id} userProfile={profile}><AgentDirectory userId={authUser?.id} userProfile={profile} onAddLead={(data)=>{setNewLead(prev=>({...prev,...data}));setView("addlead");}}/></ProGate>}
        {view==="calculator"&&<ProGate feature="Commission Calculator" userId={authUser?.id} userProfile={profile}><div style={{textAlign:"center",padding:60,color:T.s}}>Calculator coming soon</div></ProGate>}
        {view==="revenue"&&<ProGate feature="Revenue Share Projections" userId={authUser?.id} userProfile={profile}><div style={{textAlign:"center",padding:60,color:T.s}}>Revenue share projections coming soon</div></ProGate>}
        {view==="content"&&<ContentTab userId={authUser?.id} userProfile={profile}/>}
        {view==="admin"&&profile?.role==="owner"&&<AdminView/>}
        {view==="profile"&&<ProfileView/>}
        {view==="lead"&&selLead&&<LeadPage lead={selLead} onBack={()=>{setSelLead(null);setViewWithHistory("pipeline");}} onAskInline={askLiviInline} inlineResponse={inlineResponse} inlineLoading={inlineLoading} userId={authUser?.id} onDelete={handleDeleteLead}/>}
        {view==="addlead"&&(
          <div style={{padding:"24px 32px",maxWidth:640,margin:"0 auto"}}>
            <div onClick={()=>setViewWithHistory("home")} style={{display:"inline-flex",alignItems:"center",gap:8,fontSize:15,color:T.s,cursor:"pointer",marginBottom:16}}>← Back</div>
            <h1 style={{fontSize:28,fontWeight:800,margin:"0 0 24px"}}>Add New Lead</h1>
            <div style={{background:T.card,borderRadius:12,padding:"28px 30px",border:`1px solid ${T.b}`}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}} className="form-grid">
                <div><div style={{fontSize:12,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>FIRST NAME *</div><input autoComplete="off" value={newLead.first_name} onChange={ev=>setNewLead(p=>({...p,first_name:ev.target.value}))} placeholder="First Name" style={{width:"100%",padding:"14px 16px",borderRadius:8,background:T.d,border:`1px solid ${newLead.first_name.trim()?T.a+"30":T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
                <div><div style={{fontSize:12,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>LAST NAME</div><input autoComplete="off" value={newLead.last_name} onChange={ev=>setNewLead(p=>({...p,last_name:ev.target.value}))} placeholder="Last Name" style={{width:"100%",padding:"14px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
                <div><div style={{fontSize:12,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>PHONE</div><input autoComplete="off" value={newLead.phone} onChange={ev=>setNewLead(p=>({...p,phone:ev.target.value}))} placeholder="(555) 123-4567" style={{width:"100%",padding:"14px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
                <div><div style={{fontSize:12,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>EMAIL</div><input autoComplete="off" value={newLead.email} onChange={ev=>setNewLead(p=>({...p,email:ev.target.value}))} placeholder="agent@email.com" style={{width:"100%",padding:"14px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
                <div><div style={{fontSize:12,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>MARKET</div><input autoComplete="off" value={newLead.market} onChange={ev=>setNewLead(p=>({...p,market:ev.target.value}))} placeholder="Austin, TX" style={{width:"100%",padding:"14px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
                <div><div style={{fontSize:12,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>BROKERAGE</div><input autoComplete="off" value={newLead.brokerage} onChange={ev=>setNewLead(p=>({...p,brokerage:ev.target.value}))} placeholder="Current Brokerage" style={{width:"100%",padding:"14px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
                <div style={{gridColumn:"1/3"}}><div style={{fontSize:12,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>SOURCE</div><select value={newLead.source} onChange={ev=>setNewLead(p=>({...p,source:ev.target.value}))} style={{width:"100%",padding:"14px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}><option value="">Select source...</option>{["Manual","Referral","Facebook Ad","Instagram Ad","GHL Webhook","LinkedIn","Cold Outreach","Event","Open House","Other"].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
              </div>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:12,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>NOTES</div>
                <textarea value={newLead.notes} onChange={ev=>setNewLead(p=>({...p,notes:ev.target.value}))} placeholder="Where you met them, what they said, any context..." rows={3} style={{width:"100%",padding:"14px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",resize:"none",boxSizing:"border-box",lineHeight:1.5}}/>
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                <div onClick={()=>saveLead(true)} style={{padding:"14px 28px",borderRadius:8,background:newLead.first_name.trim()?T.a:"#333",color:newLead.first_name.trim()?"#000":T.m,fontSize:16,fontWeight:700,cursor:newLead.first_name.trim()?"pointer":"default",display:"flex",alignItems:"center",gap:8}}>🔍 Save & Research with LIVI</div>
                <div onClick={()=>saveLead(false)} style={{padding:"14px 28px",borderRadius:8,background:T.card,border:`1px solid ${T.b}`,color:T.s,fontSize:16,fontWeight:700,cursor:newLead.first_name.trim()?"pointer":"default",opacity:newLead.first_name.trim()?1:0.4}}>Save to CRM</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
