import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const SUPA = "https://zuwvovjhrkzlpdxcpsud.supabase.co/rest/v1";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1d3Zvdmpocmt6bHBkeGNwc3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNTMyOTAsImV4cCI6MjA4NzcyOTI5MH0.SmOAe8yeEa79hrSkwMLLq5z70Fmoxznvhs0YNOxa-no";

// LIVI AI Platform — Agent Directory (352K+ real agents)
const LIVI_SUPA = "https://usknntguurefeyzusbdh.supabase.co/rest/v1";
const LIVI_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVza25udGd1dXJlZmV5enVzYmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MTcwODAsImV4cCI6MjA4Nzk5MzA4MH0.pxexo90zyugIA4pPzLonGo3E1frr8bSZvz-XT7BmuqQ";

async function agentSearch({state,brokerage,name,city,newDays,limit=50,offset=0}={}) {
  let params = [];
  if(state) params.push(`state=eq.${state}`);
  if(brokerage) params.push(`brokerage_name=ilike.*${encodeURIComponent(brokerage)}*`);
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
  params.push(`select=id,state,license_number,license_type,full_name,first_name,last_name,license_status,brokerage_name,brokerage_license,city,county,address,license_expiration,original_license_date`);
  try {
    const url = `${LIVI_SUPA}/agent_directory?${params.join("&")}`;
    console.log("Agent search URL:", url);
    const r = await fetch(url,{
      headers:{"apikey":LIVI_KEY,"Authorization":`Bearer ${LIVI_KEY}`,"Prefer":"count=exact"}
    });
    if(!r.ok) { console.error("Agent search HTTP error:", r.status, await r.text()); return { data: [], total: 0 }; }
    const total = parseInt(r.headers.get("content-range")?.split("/")?.[1] || "0");
    const data = await r.json();
    console.log("Agent search results:", data.length, "total:", total);
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

const STAGES = [{id:"new",l:"New",c:T.s},{id:"researched",l:"Researched",c:T.bl},{id:"outreach_sent",l:"Outreach",c:T.y},{id:"meeting_booked",l:"Meeting",c:T.p},{id:"in_conversation",l:"Talking",c:T.c},{id:"recruited",l:"Recruited",c:T.a}];
const PC = [T.a,T.bl,T.y,T.p,T.r,T.c];

function ago(d){if(!d)return"";const s=Math.floor((Date.now()-new Date(d))/1000);if(s<60)return"now";if(s<3600)return Math.floor(s/60)+"m";if(s<86400)return Math.floor(s/3600)+"h";return Math.floor(s/86400)+"d";}

async function sq(tbl,p=""){
  try{
    const url=`${SUPA}/${tbl}?${p}`;
    const r=await fetch(url,{
      method:'GET',
      headers:{
        'apikey':KEY,
        'Authorization':`Bearer ${KEY}`,
        'Prefer':'return=representation'
      }
    });
    if(!r.ok){console.error(`Supabase ${tbl}:`,r.status,await r.text());return[];}
    const d=await r.json();
    console.log(`${tbl}:`,d.length,'rows');
    return d;
  }catch(e){console.error(`Fetch ${tbl} failed:`,e.message);return[];}
}

function Pill({text,color}){return <span style={{fontSize:14,fontWeight:700,padding:"4px 10px",borderRadius:4,background:color+"18",color,letterSpacing:0.4}}>{text}</span>;}
function UPill({u}){return <Pill text={u||"—"} color={{HIGH:T.r,MEDIUM:T.y,LOW:T.a}[u]||T.s}/>;}
function TPill({t}){return <span style={{fontSize:15,fontWeight:600,color:{Elite:T.p,Strong:T.a,Mid:T.bl,Building:T.y,New:T.s}[t]||T.s}}>{t||"—"}</span>;}
function Dot({c}){return <span style={{width:8,height:8,borderRadius:"50%",background:c,boxShadow:`0 0 5px ${c}`,display:"inline-block",flexShrink:0}}/>;}

function Gauge({score}){
  const r=44,c=Math.PI*r,o=c-(score/100)*c,col=score>=70?T.a:score>=40?T.y:T.r;
  return <div style={{textAlign:"center"}}><svg width="160" height="96" viewBox="0 0 100 60"><path d="M 6 56 A 44 44 0 0 1 94 56" fill="none" stroke={T.m} strokeWidth="5" strokeLinecap="round"/><path d="M 6 56 A 44 44 0 0 1 94 56" fill="none" stroke={col} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={o} style={{transition:"all 0.8s"}}/><text x="50" y="44" textAnchor="middle" fill={T.t} fontSize="20" fontWeight="800">{score}</text><text x="50" y="56" textAnchor="middle" fill={col} fontSize="7" fontWeight="700">{score>=70?"STRONG":score>=40?"BUILDING":"WEAK"}</text></svg></div>;
}

// ━━━ LEAD DETAIL PAGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function LeadPage({lead,onBack,onAskInline,inlineResponse,inlineLoading,onRefreshLead}){
  const [editing,setEditing]=useState(false);
  const [saving,setSaving]=useState(false);
  const [saveMsg,setSaveMsg]=useState("");
  const [info,setInfo]=useState({first_name:lead.first_name||"",last_name:lead.last_name||"",email:lead.email||"",phone:lead.phone||"",market:lead.market||"",brokerage:lead.brokerage||""});
  const [notes,setNotes]=useState(lead._notes||[]);
  const [newNote,setNewNote]=useState("");
  const [commLog,setCommLog]=useState(lead._comms||[]);
  const [commType,setCommType]=useState("call");
  const [commNote,setCommNote]=useState("");
  if(!lead)return null;
  const addNote=()=>{if(!newNote.trim())return;setNotes(p=>[{text:newNote.trim(),date:new Date().toISOString(),id:Date.now()},...p]);setNewNote("");};
  const addComm=()=>{if(!commNote.trim())return;setCommLog(p=>[{type:commType,note:commNote.trim(),date:new Date().toISOString(),id:Date.now()},...p]);setCommNote("");};
  const commIcons={call:"📞",text:"💬",email:"📧",meeting:"🤝",dm:"📱",linkedin:"💼"};

  const saveResearchToLead=async()=>{
    if(!inlineResponse||saving)return;
    setSaving(true);setSaveMsg("Parsing research with AI...");
    try{
      // Step 1: Use AI to parse unstructured research into structured fields
      const parsePrompt=`Extract structured recruiting intelligence from this research dossier about ${lead.first_name||""} ${lead.last_name||""}.

RESEARCH TEXT:
${inlineResponse}

Return ONLY a JSON object with these fields (use null for anything not found):
{
  "production_volume": number or null (annual $ volume),
  "transaction_count": number or null,
  "avg_sale_price": number or null,
  "tier": "Elite" or "Strong" or "Mid" or "Building" or "New" or null,
  "trend": "Growing" or "Stable" or "Declining" or null,
  "linkedin_url": string or null,
  "instagram_handle": string or null,
  "facebook_url": string or null,
  "youtube_channel": string or null,
  "website_url": string or null,
  "realtor_rating": number or null,
  "realtor_reviews": number or null,
  "zillow_rating": number or null,
  "zillow_reviews": number or null,
  "google_rating": number or null,
  "google_reviews": number or null,
  "pain_points": ["string",...] or [],
  "ambition_signals": ["string",...] or [],
  "retention_risks": ["string",...] or [],
  "outreach_angle": string or null (best recruiting angle),
  "urgency": "HIGH" or "MEDIUM" or "LOW" or null,
  "urgency_reason": string or null,
  "outreach_draft": string or null (suggested first message),
  "years_licensed": number or null
}
Return ONLY JSON. No markdown, no backticks.`;

      const pr=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+(import.meta.env.VITE_OPENROUTER_KEY||"")},body:JSON.stringify({model:"deepseek/deepseek-chat-v3-0324",max_tokens:800,messages:[{role:"user",content:parsePrompt}]})});
      
      let parsed={};
      if(pr.ok){
        const pd=await pr.json();
        const raw=pd.choices?.[0]?.message?.content||"";
        const clean=raw.replace(/```json|```/g,"").trim();
        try{parsed=JSON.parse(clean);}
        catch{const m=clean.match(/\{[\s\S]*\}/);if(m)parsed=JSON.parse(m[0]);}
      }

      // Step 2: Build update object — only include non-null parsed fields + raw_dossier
      const updates={raw_dossier:inlineResponse,pipeline_stage:lead.pipeline_stage==="new"?"researched":lead.pipeline_stage,updated_at:new Date().toISOString()};
      const fieldNames=[];
      const allowedFields=["production_volume","transaction_count","avg_sale_price","tier","trend","linkedin_url","instagram_handle","facebook_url","youtube_channel","website_url","realtor_rating","realtor_reviews","zillow_rating","zillow_reviews","google_rating","google_reviews","pain_points","ambition_signals","retention_risks","outreach_angle","urgency","urgency_reason","outreach_draft","years_licensed"];
      for(const f of allowedFields){
        if(parsed[f]!==null&&parsed[f]!==undefined&&parsed[f]!==""){
          updates[f]=parsed[f];
          fieldNames.push(f);
        }
      }

      // Step 3: PATCH to dazet_leads
      setSaveMsg(`Saving ${fieldNames.length+1} fields...`);
      const r=await fetch(`${SUPA}/dazet_leads?id=eq.${lead.id}`,{
        method:"PATCH",
        headers:{"apikey":KEY,"Authorization":`Bearer ${KEY}`,"Content-Type":"application/json","Prefer":"return=representation"},
        body:JSON.stringify(updates)
      });
      if(r.ok){
        setSaveMsg(`✓ Saved dossier + ${fieldNames.length} parsed fields`);
        if(onRefreshLead)onRefreshLead();
      }else{
        // Some fields might not exist on dazet_leads — fallback to just raw_dossier
        const r2=await fetch(`${SUPA}/dazet_leads?id=eq.${lead.id}`,{
          method:"PATCH",
          headers:{"apikey":KEY,"Authorization":`Bearer ${KEY}`,"Content-Type":"application/json","Prefer":"return=representation"},
          body:JSON.stringify({raw_dossier:inlineResponse,pipeline_stage:lead.pipeline_stage==="new"?"researched":lead.pipeline_stage,updated_at:new Date().toISOString()})
        });
        if(r2.ok)setSaveMsg("✓ Saved dossier (some fields not available on this table)");
        else setSaveMsg("✕ Error saving");
      }
    }catch(e){setSaveMsg("✕ "+e.message);}
    setSaving(false);
  };

  const EF=({label,field})=>(<div style={{marginBottom:14}}><div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:4}}>{label}</div>{editing?<input value={info[field]} onChange={ev=>setInfo(p=>({...p,[field]:ev.target.value}))} style={{width:"100%",padding:"10px 14px",borderRadius:6,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:15,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>:<div style={{fontSize:16,color:T.t}}>{info[field]||"—"}</div>}</div>);

  const SocialLinks=()=>{
    const links=[[lead.linkedin_url,"LinkedIn",T.bl],[lead.instagram_handle?`https://instagram.com/${lead.instagram_handle.replace("@","")}`:"","Instagram","#E1306C"],[lead.facebook_url,"Facebook","#1877F2"],[lead.youtube_channel,"YouTube",T.r],[lead.tiktok_handle?`https://tiktok.com/@${lead.tiktok_handle.replace("@","")}`:"","TikTok","#69C9D0"],[lead.twitter_handle?`https://x.com/${lead.twitter_handle.replace("@","")}`:"","X/Twitter",T.s],[lead.website_url,"Website",T.a]].filter(([url])=>url);
    if(!links.length)return null;
    return(<div style={{marginTop:12}}><div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:8}}>SOCIAL & WEB</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{links.map(([url,label,c])=><a key={label} href={url} target="_blank" rel="noreferrer" style={{padding:"6px 12px",borderRadius:6,background:c+"15",color:c,fontSize:13,fontWeight:600,textDecoration:"none"}}>{label}</a>)}</div></div>);
  };

  const ProductionCard=()=>{
    if(!lead.production_volume&&!lead.transaction_count&&!lead.avg_sale_price)return null;
    return(<div style={{background:T.card,borderRadius:12,padding:"20px 22px",border:`1px solid ${T.b}`,marginBottom:16}}><div style={{fontSize:15,fontWeight:700,color:T.t,marginBottom:12}}>📊 Production</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>{[["Volume",lead.production_volume?`$${Number(lead.production_volume).toLocaleString()}`:"—",T.a],["Transactions",lead.transaction_count||"—",T.bl],["Avg Sale",lead.avg_sale_price?`$${Number(lead.avg_sale_price).toLocaleString()}`:"—",T.y]].map(([l,v,c])=><div key={l} style={{textAlign:"center"}}><div style={{fontSize:11,color:T.m,letterSpacing:1.5,marginBottom:4}}>{l.toUpperCase()}</div><div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div></div>)}</div></div>);
  };

  const ReviewsCard=()=>{
    const revs=[[lead.realtor_rating,lead.realtor_reviews,"Realtor.com"],[lead.zillow_rating,lead.zillow_reviews,"Zillow"],[lead.google_rating,lead.google_reviews,"Google"]].filter(([r,c])=>r||c);
    if(!revs.length)return null;
    return(<div style={{background:T.card,borderRadius:12,padding:"20px 22px",border:`1px solid ${T.b}`,marginBottom:16}}><div style={{fontSize:15,fontWeight:700,color:T.t,marginBottom:12}}>⭐ Reviews</div><div style={{display:"grid",gridTemplateColumns:`repeat(${revs.length},1fr)`,gap:12}}>{revs.map(([rating,count,src])=><div key={src} style={{textAlign:"center"}}><div style={{fontSize:11,color:T.m,letterSpacing:1.5,marginBottom:4}}>{src.toUpperCase()}</div><div style={{fontSize:20,fontWeight:800,color:T.y}}>{rating||"—"}<span style={{fontSize:12,color:T.s,fontWeight:400}}>/5</span></div>{count&&<div style={{fontSize:12,color:T.s}}>{count} reviews</div>}</div>)}</div></div>);
  };

  const IntelCard=()=>{
    const pp=lead.pain_points&&(Array.isArray(lead.pain_points)?lead.pain_points:typeof lead.pain_points==="string"?JSON.parse(lead.pain_points||"[]"):[]);
    const as=lead.ambition_signals&&(Array.isArray(lead.ambition_signals)?lead.ambition_signals:typeof lead.ambition_signals==="string"?JSON.parse(lead.ambition_signals||"[]"):[]);
    const rr=lead.retention_risks&&(Array.isArray(lead.retention_risks)?lead.retention_risks:typeof lead.retention_risks==="string"?JSON.parse(lead.retention_risks||"[]"):[]);
    if((!pp||!pp.length)&&(!as||!as.length)&&(!rr||!rr.length))return null;
    return(<div style={{background:T.card,borderRadius:12,padding:"20px 22px",border:`1px solid ${T.b}`,marginBottom:16}}><div style={{fontSize:15,fontWeight:700,color:T.t,marginBottom:12}}>🧠 Intel</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>{pp&&pp.length>0&&<div><div style={{fontSize:11,color:T.r,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>PAIN POINTS</div>{pp.map((p,i)=><div key={i} style={{fontSize:13,color:T.t,lineHeight:1.6,padding:"4px 0"}}>• {typeof p==="string"?p:p.label||JSON.stringify(p)}</div>)}</div>}{as&&as.length>0&&<div><div style={{fontSize:11,color:T.a,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>AMBITION SIGNALS</div>{as.map((a,i)=><div key={i} style={{fontSize:13,color:T.t,lineHeight:1.6,padding:"4px 0"}}>• {typeof a==="string"?a:a.label||JSON.stringify(a)}</div>)}</div>}{rr&&rr.length>0&&<div><div style={{fontSize:11,color:T.y,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>RETENTION RISKS</div>{rr.map((r,i)=><div key={i} style={{fontSize:13,color:T.t,lineHeight:1.6,padding:"4px 0"}}>• {typeof r==="string"?r:r.label||JSON.stringify(r)}</div>)}</div>}</div></div>);
  };
  return(
    <div style={{flex:1,overflow:"auto",padding:"24px 32px"}}>
      <div onClick={onBack} style={{display:"inline-flex",alignItems:"center",gap:8,fontSize:15,color:T.s,cursor:"pointer",marginBottom:16}}>← Back to Pipeline</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:12}}>
        <div><h1 style={{fontSize:32,fontWeight:800,margin:"0 0 6px"}}>{info.first_name} {info.last_name}</h1><div style={{fontSize:16,color:T.s}}>{info.market||"Unknown Market"} · {info.brokerage||"Unknown Brokerage"}</div></div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}><div onClick={()=>setEditing(!editing)} style={{padding:"10px 18px",borderRadius:8,background:editing?T.a:T.card,color:editing?"#000":T.s,fontSize:14,fontWeight:700,cursor:"pointer",border:`1px solid ${editing?T.a:T.b}`}}>{editing?"✓ Save":"✏️ Edit"}</div><TPill t={lead.tier}/><UPill u={lead.urgency}/></div>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:28,flexWrap:"wrap"}}>{STAGES.map(s=><div key={s.id} style={{flex:1,minWidth:80,padding:"10px 0",borderRadius:6,textAlign:"center",fontSize:13,fontWeight:700,background:lead.pipeline_stage===s.id?s.c+"20":T.d,color:lead.pipeline_stage===s.id?s.c:T.m,border:`1px solid ${lead.pipeline_stage===s.id?s.c+"30":T.b}`,cursor:"pointer"}}>{s.l}</div>)}</div>

      <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
        <div style={{background:T.card,borderRadius:12,padding:"24px 26px",border:`1px solid ${T.b}`}}>
          <div style={{fontSize:17,fontWeight:700,color:T.t,marginBottom:16}}>📇 Contact Info</div>
          <EF label="EMAIL" field="email"/><EF label="PHONE" field="phone"/><EF label="BROKERAGE" field="brokerage"/><EF label="MARKET" field="market"/>
          {lead.license_number&&<div style={{marginBottom:14}}><div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:4}}>LICENSE</div><div style={{fontSize:16,color:T.t}}>{lead.license_number}</div></div>}
          <div style={{marginBottom:14}}><div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:4}}>SOURCE</div><div style={{fontSize:16,color:T.t}}>{lead.source||"Ad"}</div></div>
          {(lead.youtube_channel||lead.linkedin_url||lead.website_url||lead.instagram_handle||lead.facebook_url||lead.tiktok_handle||lead.twitter_handle)&&<SocialLinks/>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>{[["TIER",lead.tier,T.p],["URGENCY",lead.urgency,{HIGH:T.r,MEDIUM:T.y,LOW:T.a}[lead.urgency]||T.s],["TREND",lead.trend||"—",T.bl]].map(([l,v,c])=><div key={l} style={{background:T.card,borderRadius:10,padding:"16px",border:`1px solid ${T.b}`,textAlign:"center"}}><div style={{fontSize:11,color:T.m,letterSpacing:2,marginBottom:4}}>{l}</div><div style={{fontSize:20,fontWeight:800,color:c}}>{v||"—"}</div></div>)}</div>
          {lead.outreach_angle&&<div style={{background:T.as,borderRadius:10,padding:"18px 20px",border:`1px solid ${T.a}20`}}><div style={{fontSize:12,color:T.a,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>🎯 OUTREACH ANGLE</div><div style={{fontSize:15,color:T.t,lineHeight:1.6}}>{lead.outreach_angle}</div></div>}
          {lead.urgency_reason&&<div style={{background:T.y+"08",borderRadius:10,padding:"18px 20px",border:`1px solid ${T.y}20`}}><div style={{fontSize:12,color:T.y,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>⚡ URGENCY REASON</div><div style={{fontSize:15,color:T.t,lineHeight:1.6}}>{lead.urgency_reason}</div></div>}
        </div>
      </div>

      <ProductionCard/>
      <ReviewsCard/>
      <IntelCard/>

      <div style={{background:T.card,borderRadius:12,padding:"24px 26px",border:`1px solid ${T.b}`,marginBottom:24}}><div style={{fontSize:17,fontWeight:700,color:T.t,marginBottom:14}}>🤖 Ask LIVI</div><div className="quick-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>{[["📱","Draft Outreach",`Draft a personalized recruiting message to ${lead.first_name} ${lead.last_name}. They're at ${lead.brokerage||"unknown"} in ${lead.market||"unknown"}.${lead.outreach_angle?" Angle: "+lead.outreach_angle:""}`],["🔄","Follow Up",`Write a follow-up to ${lead.first_name} ${lead.last_name}. Casual and value-driven.`],["📋","Meeting Prep",`Meeting prep for ${lead.first_name} ${lead.last_name} at ${lead.brokerage||"unknown"}. Talking points, objections, close.`],["🎯","Close Script",`Closing script for ${lead.first_name} ${lead.last_name}.`],["💡","Objections",`Objections ${lead.first_name} will have about switching from ${lead.brokerage||"their brokerage"} to LPT?`],["📊","Compare",`Compare LPT vs ${lead.brokerage||"their brokerage"} in ${lead.market||"this market"}.`],["🎨","Recruit Post",`Recruiting post for ${lead.market||"this market"} agents.`]].map(([icon,label,q],i)=><div key={i} onClick={()=>onAskInline(q)} style={{background:T.d,border:`1px solid ${T.b}`,borderRadius:8,padding:"12px 14px",cursor:inlineLoading?"wait":"pointer",display:"flex",alignItems:"center",gap:10,opacity:inlineLoading?0.5:1}} onMouseOver={ev=>{if(!inlineLoading)ev.currentTarget.style.borderColor=T.bh}} onMouseOut={ev=>ev.currentTarget.style.borderColor=T.b}><span style={{fontSize:18}}>{icon}</span><span style={{fontSize:14,color:T.s,fontWeight:600}}>{label}</span></div>)}</div>
      <div onClick={()=>onAskInline(`Research ${lead.first_name} ${lead.last_name} in ${lead.market||"their market"}. Find production, reviews, social media, outreach angle.`)} style={{marginTop:10,padding:"14px 20px",borderRadius:8,background:T.am,border:`1px solid ${T.a}20`,cursor:inlineLoading?"wait":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:inlineLoading?0.5:1}}><span style={{fontSize:18}}>🔍</span><span style={{fontSize:15,color:T.a,fontWeight:700}}>Ask LIVI to Research</span></div>
      {inlineLoading&&<div style={{marginTop:16,padding:"16px 20px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:8,height:8,borderRadius:"50%",background:T.a,animation:"pulse 1s infinite"}}/><span style={{fontSize:14,color:T.s}}>LIVI is thinking...</span></div></div>}
      {inlineResponse&&!inlineLoading&&<div style={{marginTop:16,padding:"20px 24px",borderRadius:10,background:T.as,border:`1px solid ${T.a}20`}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:13,color:T.a,fontWeight:700,letterSpacing:1.5}}>LIVI RESPONSE</span><div style={{display:"flex",gap:10}}><span onClick={saveResearchToLead} style={{fontSize:12,color:saving?T.m:T.bl,cursor:saving?"wait":"pointer",fontWeight:600}}>{saving?"⏳ Saving...":"💾 Save to Lead"}</span><span onClick={()=>{navigator.clipboard?.writeText(inlineResponse);}} style={{fontSize:12,color:T.s,cursor:"pointer"}}>📋 Copy</span></div></div>{saveMsg&&<div style={{fontSize:12,color:saveMsg.startsWith("✓")?T.a:T.r,marginBottom:8,fontWeight:600}}>{saveMsg}</div>}<pre style={{fontSize:14,color:T.t,lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0}}>{inlineResponse}</pre></div>}
      </div>

      <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
        <div style={{background:T.card,borderRadius:12,padding:"24px 26px",border:`1px solid ${T.b}`}}><div style={{fontSize:17,fontWeight:700,color:T.t,marginBottom:14}}>📝 Notes</div><div style={{display:"flex",gap:8,marginBottom:14}}><textarea value={newNote} onChange={ev=>setNewNote(ev.target.value)} onKeyDown={ev=>{if(ev.key==="Enter"&&!ev.shiftKey){ev.preventDefault();addNote();}}} placeholder="Add a note..." rows={2} style={{flex:1,padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:14,fontFamily:"inherit",outline:"none",resize:"none",lineHeight:1.5}}/><div onClick={addNote} style={{padding:"12px 18px",borderRadius:8,background:newNote.trim()?T.am:T.d,color:newNote.trim()?T.a:T.m,fontSize:14,fontWeight:700,cursor:newNote.trim()?"pointer":"default",display:"flex",alignItems:"center"}}>Save</div></div><div style={{maxHeight:300,overflow:"auto"}}>{notes.length>0?notes.map(n=><div key={n.id} style={{padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,marginBottom:6}}><div style={{fontSize:14,color:T.t,lineHeight:1.5}}>{n.text}</div><div style={{fontSize:11,color:T.m,marginTop:4}}>{new Date(n.date).toLocaleString()}</div></div>):<div style={{fontSize:14,color:T.m,textAlign:"center",padding:"20px"}}>No notes yet</div>}</div></div>
        <div style={{background:T.card,borderRadius:12,padding:"24px 26px",border:`1px solid ${T.b}`}}><div style={{fontSize:17,fontWeight:700,color:T.t,marginBottom:14}}>📞 Communication</div><div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>{Object.entries(commIcons).map(([k,v])=><div key={k} onClick={()=>setCommType(k)} style={{padding:"6px 12px",borderRadius:6,background:commType===k?T.am:T.d,color:commType===k?T.a:T.s,fontSize:13,fontWeight:600,cursor:"pointer"}}>{v} {k.charAt(0).toUpperCase()+k.slice(1)}</div>)}</div><div style={{display:"flex",gap:8,marginBottom:14}}><input value={commNote} onChange={ev=>setCommNote(ev.target.value)} onKeyDown={ev=>{if(ev.key==="Enter")addComm();}} placeholder={`Log ${commType}...`} style={{flex:1,padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:14,fontFamily:"inherit",outline:"none"}}/><div onClick={addComm} style={{padding:"12px 18px",borderRadius:8,background:commNote.trim()?T.am:T.d,color:commNote.trim()?T.a:T.m,fontSize:14,fontWeight:700,cursor:commNote.trim()?"pointer":"default"}}>Log</div></div><div style={{maxHeight:300,overflow:"auto"}}>{commLog.length>0?commLog.map(c=><div key={c.id} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:`1px solid ${T.b}`}}><span style={{fontSize:18}}>{commIcons[c.type]||"📌"}</span><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:700,color:T.t,textTransform:"capitalize"}}>{c.type}</span><span style={{fontSize:11,color:T.m}}>{new Date(c.date).toLocaleString()}</span></div><div style={{fontSize:14,color:T.s,lineHeight:1.5,marginTop:2}}>{c.note}</div></div></div>):<div style={{fontSize:14,color:T.m,textAlign:"center",padding:"20px"}}>No communication logged</div>}</div></div>
      </div>

      <div style={{background:T.card,borderRadius:12,padding:"24px 26px",border:`1px solid ${T.b}`}}><div style={{fontSize:17,fontWeight:700,color:T.t,marginBottom:14}}>🔍 Intel Dossier</div>{lead.raw_dossier?<pre style={{fontSize:14,color:T.s,lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0,maxHeight:400,overflow:"auto"}}>{lead.raw_dossier}</pre>:<div style={{textAlign:"center",padding:"24px"}}><div style={{fontSize:14,color:T.m,marginBottom:12}}>No intel yet</div><div onClick={()=>onAskInline(`Research ${lead.first_name} ${lead.last_name} in ${lead.market||"their market"}. Find production, reviews, social media, outreach angle.`)} style={{display:"inline-block",padding:"10px 20px",borderRadius:8,background:T.am,color:T.a,fontSize:14,fontWeight:700,cursor:"pointer"}}>🔍 Ask LIVI to Research</div></div>}</div>
    </div>
  );
}

// ━━━ AGENT DIRECTORY (352K+ real agents) ━━━━━━━━━━━━━━
function AgentDirectory(){
  const [results,setResults]=useState([]);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(false);
  const [searched,setSearched]=useState(false);
  const [filters,setFilters]=useState({state:"",brokerage:"",name:"",city:"",newDays:""});
  const [page,setPage]=useState(0);
  const [added,setAdded]=useState({});
  const [error,setError]=useState(null);
  const PER=50;

  const doSearch=async(filtersOverride,pg=0)=>{
    const f = filtersOverride || filters;
    if(!f.state&&!f.brokerage&&!f.name&&!f.city&&!f.newDays) return;
    setLoading(true); setPage(pg); setError(null);
    try {
      const {data,total:t}=await agentSearch({...f,limit:PER,offset:pg*PER});
      setResults(data||[]); setTotal(t); setSearched(true);
    } catch(e) {
      console.error("Search failed:", e);
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

  const addToPipeline=async(agent)=>{
    try {
      const body={first_name:agent.first_name||agent.full_name?.split(" ")[0]||"",last_name:agent.last_name||agent.full_name?.split(" ").slice(1).join(" ")||"",brokerage:agent.brokerage_name||"",market:agent.city?`${agent.city}, ${agent.state}`:(agent.county?`${agent.county}, ${agent.state}`:agent.state),source:"Agent Directory",pipeline_stage:"new",tier:"New",urgency:"LOW",notes:`License: ${agent.license_number} (${agent.license_type||"Agent"})\nState: ${agent.state}\nBrokerage: ${agent.brokerage_name||"N/A"}${agent.original_license_date?`\nLicensed: ${agent.original_license_date}`:""}`};
      const r=await fetch(`${SUPA}/dazet_leads`,{method:"POST",headers:{"apikey":KEY,"Authorization":`Bearer ${KEY}`,"Content-Type":"application/json","Prefer":"return=representation"},body:JSON.stringify(body)});
      if(r.ok){setAdded(p=>({...p,[agent.license_number]:true}));}
    } catch(e) { console.error("Add to pipeline error:", e); }
  };

  const topBrokerages=[
    {label:"eXp Realty",q:"EXP REALTY"},{label:"Compass",q:"COMPASS"},{label:"Real Broker",q:"REAL BROKER"},
    {label:"Fathom",q:"FATHOM"},{label:"Keller Williams",q:"KELLER WILLIAMS"},{label:"Coldwell Banker",q:"COLDWELL BANKER"},
    {label:"HomeSmart",q:"HOMESMART"},{label:"LPT Realty",q:"LPT REALTY"}
  ];

  const fmtDate=(d)=>{if(!d)return"";const dt=new Date(d+"T00:00:00");const now=new Date();const diff=Math.floor((now-dt)/(1000*86400));if(diff<1)return"Today";if(diff<7)return diff+"d ago";if(diff<30)return Math.floor(diff/7)+"w ago";return dt.toLocaleDateString("en-US",{month:"short",day:"numeric",year:dt.getFullYear()!==now.getFullYear()?"numeric":undefined});};

  return (
    <>
      {/* Stats banner */}
      <div style={{display:"flex",gap:16,marginBottom:20,flexWrap:"wrap"}}>
        {[["🇺🇸","848,000+","Licensed Agents",T.a],["🏢","100K+","Brokerages",T.bl],["📍","4","States Live",T.p],["🆕","Auto-Sync","Weekly Updates",T.y]].map(([ic,v,l,c],i)=>
          <div key={i} style={{flex:"1 1 140px",background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"18px 22px",display:"flex",alignItems:"center",gap:14}}>
            <div style={{fontSize:24}}>{ic}</div>
            <div><div style={{fontSize:22,fontWeight:800,color:T.t}}>{v}</div><div style={{fontSize:11,color:c,fontWeight:700,letterSpacing:1}}>{l.toUpperCase()}</div></div>
          </div>
        )}
      </div>

      {/* New Agents quick filters */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{fontSize:14,fontWeight:700,color:T.t,display:"flex",alignItems:"center",gap:6}}>🆕 Newly Licensed:</div>
        {[{l:"Last 7 days",d:"7"},{l:"Last 30 days",d:"30"},{l:"Last 90 days",d:"90"},{l:"Last 6 months",d:"180"},{l:"This year",d:"365"}].map(b=>
          <div key={b.d} onClick={()=>updateAndSearch({newDays:b.d,state:filters.state||"TX"})} style={{padding:"7px 16px",borderRadius:7,background:filters.newDays===b.d?T.y+"25":T.d,border:`1px solid ${filters.newDays===b.d?T.y+"50":T.b}`,color:filters.newDays===b.d?T.y:T.s,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.12s"}}>{b.l}</div>
        )}
      </div>

      {/* Search bar */}
      <div style={{background:T.card,borderRadius:12,padding:"24px 26px",border:`1px solid ${T.b}`,marginBottom:20}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr auto",gap:12,alignItems:"end"}} className="four-col">
          <div>
            <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>STATE</div>
            <select value={filters.state} onChange={e=>setFilters(p=>({...p,state:e.target.value}))} style={{width:"100%",padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:15,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}>
              <option value="" style={{background:T.card}}>All States</option>
              <option value="FL" style={{background:T.card}}>Florida (496K)</option>
              <option value="TX" style={{background:T.card}}>Texas (189K)</option>
              <option value="NY" style={{background:T.card}}>New York (144K)</option>
              <option value="CT" style={{background:T.card}}>Connecticut (20K)</option>
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
          <div style={{display:"flex",gap:8}}>
            <div onClick={()=>doSearch()} style={{padding:"12px 28px",borderRadius:8,background:T.a,color:"#000",fontSize:15,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",height:"fit-content"}}>🔍 Search</div>
            {searched&&<div onClick={()=>{setFilters({state:"",brokerage:"",name:"",city:"",newDays:""});setSearched(false);setResults([]);setTotal(0);}} style={{padding:"12px 16px",borderRadius:8,background:T.d,color:T.s,fontSize:15,fontWeight:700,cursor:"pointer",height:"fit-content"}}>✕</div>}
          </div>
        </div>

        {/* Quick brokerage buttons */}
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:14}}>
          {topBrokerages.map(b=>
            <div key={b.q} onClick={()=>updateAndSearch({brokerage:b.q})} style={{padding:"6px 14px",borderRadius:6,background:filters.brokerage===b.q?T.am:T.d,border:`1px solid ${filters.brokerage===b.q?T.a+"40":T.b}`,color:filters.brokerage===b.q?T.a:T.s,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.12s"}}>{b.label}</div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && <div style={{padding:"16px 20px",borderRadius:10,background:T.r+"15",border:`1px solid ${T.r}30`,color:T.r,marginBottom:16,fontSize:14}}>{error}</div>}

      {/* Results */}
      {loading && <div style={{textAlign:"center",padding:40}}><div style={{fontSize:24,animation:"pulse 1s infinite"}}>🔍</div><div style={{color:T.s,marginTop:8}}>Searching 352K+ agents...</div></div>}

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
                  <tr key={a.id||i} style={{borderBottom:`1px solid ${T.b}`,transition:"background 0.1s"}} onMouseOver={e=>e.currentTarget.style.background=T.hover} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
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
                        <div onClick={()=>addToPipeline(a)} style={{padding:"6px 14px",borderRadius:6,background:T.am,color:T.a,fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",display:"inline-block"}}>+ Pipeline</div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {/* Bottom pagination */}
          {total>PER && <div style={{padding:"16px 24px",borderTop:`1px solid ${T.b}`,display:"flex",justifyContent:"center",gap:8}}>
            {page>0 && <div onClick={()=>doSearch(null,page-1)} style={{padding:"8px 18px",borderRadius:6,background:T.d,color:T.s,fontSize:13,cursor:"pointer"}}>← Previous</div>}
            <div style={{padding:"8px 18px",fontSize:13,color:T.t}}>Page {page+1} of {Math.ceil(total/PER)}</div>
            {(page+1)*PER<total && <div onClick={()=>doSearch(null,page+1)} style={{padding:"8px 18px",borderRadius:6,background:T.d,color:T.s,fontSize:13,cursor:"pointer"}}>Next →</div>}
          </div>}
        </div>
      )}

      {/* Pre-search state */}
      {!searched && !loading && (
        <div style={{textAlign:"center",padding:"60px 20px"}}>
          <div style={{fontSize:48,marginBottom:16}}>🔍</div>
          <div style={{fontSize:20,fontWeight:700,color:T.t,marginBottom:8}}>848,000+ Real Licensed Agents</div>
          <div style={{fontSize:15,color:T.s,maxWidth:500,margin:"0 auto",lineHeight:1.6}}>Search by state, brokerage, name, or city. Every record is from official state licensing boards — Florida DBPR, Texas TREC, New York DOS, Connecticut DCP. Auto-synced weekly. Add agents directly to your recruiting pipeline.</div>
          <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:10,marginTop:24}}>
            {[{l:"🆕 New TX agents (30d)",f:{state:"TX",brokerage:"",name:"",city:"",newDays:"30"}},{l:"eXp agents in TX",f:{state:"TX",brokerage:"EXP REALTY",name:"",city:"",newDays:""}},{l:"Compass in NY",f:{state:"NY",brokerage:"COMPASS",name:"",city:"",newDays:""}},{l:"All LPT Realty",f:{state:"",brokerage:"LPT REALTY",name:"",city:"",newDays:""}}].map((ex,i)=>
              <div key={i} onClick={()=>{setFilters(ex.f);doSearch(ex.f,0);}} style={{padding:"10px 18px",borderRadius:8,background:i===0?T.y+"20":T.am,color:i===0?T.y:T.a,fontSize:14,fontWeight:600,cursor:"pointer",border:`1px solid ${i===0?T.y+"30":T.a+"20"}`}}>{ex.l}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ━━━ MAIN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function Livi(){
  const [view,setView]=useState("home");
  const [leads,setLeads]=useState([]);
  const [activity,setActivity]=useState([]);
  const [selLead,setSelLead]=useState(null);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);
    const [l,a]=await Promise.all([sq("dazet_leads","order=created_at.desc&limit=100"),sq("dazet_agent_activity","order=created_at.desc&limit=50")]);
    setLeads(l||[]);setActivity(a||[]);setLoading(false);
  },[]);

  useEffect(()=>{load();const i=setInterval(load,45000);return()=>clearInterval(i);},[load]);

  // askLiviInline: scoped per page — response clears on navigation
  const [inlineResponse,setInlineResponse]=useState(null);
  const [inlineLoading,setInlineLoading]=useState(false);
  const [responseSource,setResponseSource]=useState(null); // tracks which view/lead triggered it
  const askLiviInline=async(q,source)=>{
    const src=source||view;
    setInlineLoading(true);setInlineResponse(null);setResponseSource(src);
    try{
      let sys=SYSTEM;
      if(leads.length>0){
        sys+=`\n\nPIPELINE (${leads.length} leads):\n`+leads.slice(0,10).map(l=>`- ${l.first_name} ${l.last_name} | ${l.market} | ${l.brokerage?.substring(0,20)||"?"} | ${l.tier} | ${l.urgency} | ${l.pipeline_stage}`).join("\n");
        sys+=`\n\nAd spend: $20/day Facebook/Instagram for LPT Realty recruiting.`;
      }
      if(leads.length>0){
        sys+=`\n\nPIPELINE (${leads.length} leads):\n`+leads.slice(0,10).map(l=>`- ${l.first_name} ${l.last_name} | ${l.market} | ${l.brokerage?.substring(0,20)||"?"} | ${l.tier} | ${l.urgency} | ${l.pipeline_stage}`).join("\n");
      }
      const r=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+(import.meta.env.VITE_OPENROUTER_KEY||"")},body:JSON.stringify({model:"deepseek/deepseek-chat-v3-0324",max_tokens:1500,messages:[{role:"system",content:sys},{role:"user",content:q}]})});
      if(!r.ok){const err=await r.text();console.error("LIVI inline error:",r.status,err);setInlineResponse(`API error ${r.status} — check your OpenRouter key in Vercel env vars.`);setInlineLoading(false);return;}
      const d=await r.json();
      console.log("LIVI inline response:",JSON.stringify(d).substring(0,500));
      setInlineResponse(d.choices?.[0]?.message?.content||"No response — check console for details.");
    }catch{setInlineResponse("Connection error.");}
    setInlineLoading(false);
  };

  // Browser history for back button
  const setViewWithHistory=(v)=>{
    window.history.pushState({view:v},"",`#${v}`);
    setView(v);
    // Clear LIVI response when navigating away
    if(v!==responseSource){setInlineResponse(null);setResponseSource(null);}
  };
  useEffect(()=>{
    const onPop=(ev)=>{
      if(ev.state?.view){setView(ev.state.view);if(ev.state.view!=="lead")setSelLead(null);}
      else{setView("home");setSelLead(null);}
    };
    window.addEventListener("popstate",onPop);
    return()=>window.removeEventListener("popstate",onPop);
  },[]);

  const total=leads.length,targets=leads.filter(l=>l.brokerage&&!l.brokerage.includes("LPT")).length,urgent=leads.filter(l=>l.urgency==="HIGH").length;
  const today=leads.filter(l=>l.created_at&&new Date(l.created_at).toDateString()===new Date().toDateString()).length;
  const apiCost=activity.reduce((s,a)=>s+parseFloat(a.cost||0),0),tokens=activity.reduce((s,a)=>s+(a.tokens_used||0),0);
  const cpl=total>0?(20/total).toFixed(2):"—";
  const pScore=Math.min(100,Math.round((total>0?25:0)+(targets>0?25:0)+(leads.some(l=>l.pipeline_stage==="outreach_sent")?25:0)+(leads.some(l=>l.pipeline_stage==="meeting_booked")?25:0)));
  const tierData=["Elite","Strong","Mid","Building","New"].map(t=>({name:t,value:leads.filter(l=>l.tier===t).length})).filter(d=>d.value>0);
  const stages=STAGES.map(s=>({...s,count:leads.filter(l=>l.pipeline_stage===s.id).length}));

  // ━━━ ASK LIVI BAR (top of page, scoped response) ━━━━━━━━━━━━
  const AskLiviBar=({prompts,source})=>{
    const isMyResponse=responseSource===source;
    return(
    <>
      <div className="quick-grid" style={{display:"grid",gridTemplateColumns:`repeat(${prompts.length},1fr)`,gap:12,marginBottom:20}}>
        {prompts.map(([icon,label,q,c],i)=>
          <div key={i} onClick={()=>askLiviInline(q,source)} style={{background:(c||T.bl)+"10",border:`1px solid ${(c||T.bl)}20`,borderRadius:10,padding:"18px 20px",cursor:inlineLoading?"wait":"pointer",display:"flex",alignItems:"center",gap:12,opacity:inlineLoading?0.5:1,transition:"all 0.15s"}}
            onMouseOver={ev=>{if(!inlineLoading)ev.currentTarget.style.background=(c||T.bl)+"20"}} onMouseOut={ev=>ev.currentTarget.style.background=(c||T.bl)+"10"}>
            <span style={{fontSize:24}}>{icon}</span><span style={{fontSize:15,fontWeight:700,color:T.t}}>{label}</span>
          </div>
        )}
      </div>
      {inlineLoading&&isMyResponse&&<div style={{marginBottom:20,padding:"16px 20px",borderRadius:10,background:T.card,border:`1px solid ${T.b}`}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:8,height:8,borderRadius:"50%",background:T.a,animation:"pulse 1s infinite"}}/><span style={{fontSize:14,color:T.s}}>LIVI is thinking...</span></div></div>}
      {inlineResponse&&!inlineLoading&&isMyResponse&&<div style={{marginBottom:20,padding:"20px 24px",borderRadius:10,background:T.as,border:`1px solid ${T.a}20`}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:12,color:T.a,fontWeight:700,letterSpacing:1.5}}>🤖 LIVI RESPONSE</span><div style={{display:"flex",gap:12}}><span onClick={()=>{setInlineResponse(null);setResponseSource(null);}} style={{fontSize:12,color:T.m,cursor:"pointer"}}>✕ Dismiss</span><span onClick={()=>{navigator.clipboard?.writeText(inlineResponse);}} style={{fontSize:12,color:T.s,cursor:"pointer"}}>📋 Copy</span></div></div><pre style={{fontSize:14,color:T.t,lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0,maxHeight:400,overflow:"auto"}}>{inlineResponse}</pre></div>}
    </>
  );};

  // ━━━ ADD LEAD TO SUPABASE ━━━━━━━━━━━━━━━━━━━━━━━
  const saveLead=async(doResearch)=>{
    if(!newLead.first_name.trim())return;
    try{
      const body={first_name:newLead.first_name.trim(),last_name:newLead.last_name.trim(),email:newLead.email.trim()||null,phone:newLead.phone.trim()||null,market:newLead.market.trim()||null,brokerage:newLead.brokerage.trim()||null,source:newLead.source.trim()||"Manual",pipeline_stage:"new",tier:"New",urgency:"LOW"};
      const r=await fetch(`${SUPA}/dazet_leads`,{method:"POST",headers:{"apikey":KEY,"Authorization":`Bearer ${KEY}`,"Content-Type":"application/json","Prefer":"return=representation"},body:JSON.stringify(body)});
      if(!r.ok){console.error("Add lead error:",r.status,await r.text());return;}
      const saved=await r.json();
      console.log("Lead saved:",saved);
      const lead=saved[0]||saved;
      await load();
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

  // ━━━ DASHBOARD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const needsFollowUp=leads.filter(l=>l.pipeline_stage&&l.pipeline_stage!=="new"&&l.pipeline_stage!=="recruited"&&l.created_at&&(Date.now()-new Date(l.created_at))>3*86400000);
  const needsResearch=leads.filter(l=>l.pipeline_stage==="new");
  const hasMeeting=leads.filter(l=>l.pipeline_stage==="meeting_booked");
  const inOutreach=leads.filter(l=>l.pipeline_stage==="outreach_sent");

  const Dash=()=>(
    <>
      {/* KPI Cards */}
      <div className="kpi-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:20}}>
        {[["◎","Leads",total,today>0?`+${today} today`:"",T.bl],["🎯","Targets",targets,urgent>0?`${urgent} hot`:"",T.a],["💰","CPL",`$${cpl}`,"$20/day",T.y],["📅","Meetings",hasMeeting.length,inOutreach.length>0?`${inOutreach.length} awaiting`:"",T.p]].map(([ic,l,v,s,c],i)=>
          <div key={i} className="kpi-card" style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"22px 24px",display:"flex",alignItems:"center",gap:16}}>
            <div className="kpi-icon" style={{width:52,height:52,borderRadius:10,background:c+"10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{ic}</div>
            <div><div className="kpi-label" style={{fontSize:13,color:T.s,letterSpacing:2,fontWeight:700}}>{l.toUpperCase()}</div><div style={{display:"flex",alignItems:"baseline",gap:6}}><span className="kpi-val" style={{fontSize:32,fontWeight:800,color:T.t}}>{v}</span>{s&&<span className="kpi-sub" style={{fontSize:14,color:c,fontWeight:600}}>{s}</span>}</div></div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          ["➕","Add Lead",()=>setView("addlead"),T.a],
          ["📱","Draft Outreach",()=>askLiviInline("Who should I reach out to next? Pick my best lead and draft me a message."),T.bl],
          ["🔍","Find Agents",()=>setViewWithHistory("agents"),T.p],
          ["📊","Pipeline Review",()=>setView("pipeline"),T.y]
        ].map(([ic,label,action,c],i)=>
          <div key={i} onClick={action} style={{background:c+"10",border:`1px solid ${c}20`,borderRadius:10,padding:"18px 20px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"all 0.15s"}}
            onMouseOver={ev=>ev.currentTarget.style.background=c+"20"} onMouseOut={ev=>ev.currentTarget.style.background=c+"10"}>
            <span style={{fontSize:24}}>{ic}</span>
            <span style={{fontSize:15,fontWeight:700,color:T.t}}>{label}</span>
          </div>
        )}
      </div>

      {/* Today's Actions + Hot Leads */}
      <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        {/* Today's Action List */}
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

        {/* Hot Leads */}
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><span style={{fontSize:18,fontWeight:700,color:T.t}}>🔥 Hot Leads</span><span onClick={()=>setViewWithHistory("pipeline")} style={{fontSize:14,color:T.s,cursor:"pointer"}}>All →</span></div>
          {leads.filter(l=>l.urgency==="HIGH"||l.urgency==="MEDIUM").sort((a,b)=>({HIGH:0,MEDIUM:1}[a.urgency]||2)-({HIGH:0,MEDIUM:1}[b.urgency]||2)).slice(0,5).map((l,i)=>
            <div key={i} onClick={()=>{setSelLead(l);setViewWithHistory("lead");}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,marginBottom:8,cursor:"pointer"}}
              onMouseOver={ev=>ev.currentTarget.style.borderColor=T.bh} onMouseOut={ev=>ev.currentTarget.style.borderColor=T.b}>
              <div>
                <div style={{fontSize:15,fontWeight:600,color:T.t}}>{l.first_name} {l.last_name}</div>
                <div style={{fontSize:13,color:T.s}}>{l.brokerage?.substring(0,20)||"Unknown"} · {l.market}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <TPill t={l.tier}/>
                <UPill u={l.urgency}/>
              </div>
            </div>
          )}
          {leads.filter(l=>l.urgency==="HIGH"||l.urgency==="MEDIUM").length===0&&(
            <div style={{textAlign:"center",padding:"24px",color:T.m}}>
              <div style={{fontSize:24,marginBottom:8}}>🎯</div>
              <div style={{fontSize:15}}>No hot leads yet. Run ads or add leads manually.</div>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline + Activity */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px"}}><div style={{fontSize:18,fontWeight:700,color:T.t,marginBottom:16}}>📈 Pipeline</div><Gauge score={pScore}/><div style={{marginTop:12}}><ResponsiveContainer width="100%" height={160}><BarChart data={stages} layout="vertical" barSize={14}><XAxis type="number" hide/><YAxis type="category" dataKey="l" tick={{fontSize:13,fill:T.s}} width={76} axisLine={false} tickLine={false}/><Bar dataKey="count" radius={[0,4,4,0]}>{stages.map((d,i)=><Cell key={i} fill={d.c}/>)}</Bar></BarChart></ResponsiveContainer></div></div>
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px"}}>
          <div style={{fontSize:18,fontWeight:700,color:T.t,marginBottom:16}}>📋 Recent Activity</div>
          {activity.length>0?activity.slice(0,8).map((a,i)=>
            <div key={i} style={{display:"flex",gap:10,padding:"8px 0",alignItems:"flex-start",borderBottom:i<7?`1px solid ${T.b}`:"none"}}>
              <Dot c={a.status==="success"?T.a:T.r}/>
              <div style={{flex:1}}><div style={{fontSize:14,color:T.t,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.description}</div></div>
              <span style={{fontSize:12,color:T.m,flexShrink:0}}>{ago(a.created_at)}</span>
            </div>
          ):(
            <div style={{textAlign:"center",padding:"24px",color:T.m}}>
              <div style={{fontSize:24,marginBottom:8}}>📋</div>
              <div style={{fontSize:15}}>Activity will appear as LIVI works</div>
            </div>
          )}
        </div>
      </div>

      {/* New Leads Table */}
      <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontSize:18,fontWeight:700,color:T.t}}>🆕 Recent Leads</span>
          <span onClick={()=>setViewWithHistory("pipeline")} style={{fontSize:14,color:T.s,cursor:"pointer"}}>View All →</span>
        </div>
        {leads.length>0 ? (
          <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Name","Market","Brokerage","Tier","Urgency","Stage","Added"].map(h=>
              <th key={h} style={{textAlign:"left",padding:"12px 14px",fontSize:12,fontWeight:700,color:T.m,letterSpacing:1.5,borderBottom:`1px solid ${T.b}`}}>{h}</th>
            )}</tr></thead>
            <tbody>{leads.slice(0,6).map((l,i)=>
              <tr key={i} onClick={()=>{setSelLead(l);setViewWithHistory("lead");}} style={{borderBottom:`1px solid ${T.b}`,cursor:"pointer"}} onMouseOver={ev=>ev.currentTarget.style.background=T.d} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
                <td style={{padding:"14px",fontSize:15,fontWeight:600,color:T.t,whiteSpace:"nowrap"}}>{l.first_name} {l.last_name}</td>
                <td style={{padding:"14px",fontSize:14,color:T.s}}>{l.market||"—"}</td>
                <td style={{padding:"14px",fontSize:14,color:l.brokerage?.includes("LPT")?T.a:T.t}}>{l.brokerage?.substring(0,22)||"—"}</td>
                <td style={{padding:"14px"}}><TPill t={l.tier}/></td>
                <td style={{padding:"14px"}}><UPill u={l.urgency}/></td>
                <td style={{padding:"14px"}}><Pill text={l.pipeline_stage?.replace(/_/g," ")||"—"} color={STAGES.find(s=>s.id===l.pipeline_stage)?.c||T.s}/></td>
                <td style={{padding:"14px",fontSize:13,color:T.m}}>{ago(l.created_at)}</td>
              </tr>
            )}</tbody>
          </table>
          </div>
        ) : (
          <div style={{textAlign:"center",padding:"40px 20px"}}>
            <div style={{fontSize:32,marginBottom:10}}>📭</div>
            <div style={{fontSize:16,color:T.s,marginBottom:6}}>No leads yet</div>
            <div style={{fontSize:14,color:T.m}}>Leads from your Facebook ads and manual adds will show up here</div>
          </div>
        )}
      </div>
    </>
  );
  const [pipeView,setPipeView]=useState("kanban");
  const [filters,setFilters]=useState({market:"",tier:"",urgency:"",brokerage:""});
  const [sortBy,setSortBy]=useState("urgency");
  const [newLead,setNewLead]=useState({first_name:"",last_name:"",phone:"",email:"",market:"",brokerage:"",source:"",notes:""});
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
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:14,color:T.s}}>{l.market}</span>
            <TPill t={l.tier}/>
          </div>
        </div>
        {act&&<div onClick={()=>{askLiviInline(act.q);}} style={{marginTop:6,padding:"10px 14px",borderRadius:5,background:T.as,border:`1px solid ${T.a}15`,fontSize:14,fontWeight:700,color:T.a,cursor:"pointer",display:"flex",alignItems:"center",gap:14,textAlign:"center",justifyContent:"center"}}>{act.icon} {act.label}</div>}
      </div>
    );
  };

  const Pipeline=()=>{
    const overdue=leads.filter(l=>l.pipeline_stage&&l.pipeline_stage!=="new"&&l.pipeline_stage!=="recruited"&&l.created_at&&(Date.now()-new Date(l.created_at))>7*86400000);
    const pipelineValue=leads.filter(l=>l.production_volume).reduce((s,l)=>s+parseFloat(l.production_volume||0),0);
    return(
    <>
      {/* CRM Summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[["Total Leads",pipeLeads.length,T.bl],["In Pipeline",pipeLeads.filter(l=>l.pipeline_stage!=="new"&&l.pipeline_stage!=="recruited").length,T.p],["Overdue (7d+)",overdue.length,overdue.length>0?T.r:T.s],["Recruited",pipeLeads.filter(l=>l.pipeline_stage==="recruited").length,T.a]].map(([l,v,c],i)=>
          <div key={i} style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:10,padding:"16px 20px",textAlign:"center"}}>
            <div style={{fontSize:28,fontWeight:800,color:c}}>{v}</div>
            <div style={{fontSize:13,color:T.s,marginTop:4}}>{l}</div>
          </div>
        )}
      </div>

      {/* Overdue Alert */}
      {overdue.length>0&&(
        <div style={{background:T.r+"10",border:`1px solid ${T.r}25`,borderRadius:10,padding:"14px 20px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>⚠️</span>
            <div><div style={{fontSize:16,fontWeight:700,color:T.r}}>{overdue.length} leads need follow-up</div><div style={{fontSize:14,color:T.s}}>Haven't been contacted in 7+ days</div></div>
          </div>
          <div onClick={()=>{setSortBy("oldest");setFilters({market:"",tier:"",urgency:"",brokerage:""});}} style={{padding:"10px 16px",borderRadius:6,background:T.r+"20",fontSize:14,fontWeight:700,color:T.r,cursor:"pointer"}}>Show Overdue</div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{display:"flex",gap:10,marginBottom:16,alignItems:"center",flexWrap:"wrap"}}>
        <input value={search} onChange={ev=>setSearch(ev.target.value)} placeholder="Search..." style={{padding:"12px 18px",borderRadius:7,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",width:220}}/>
        <Sel value={filters.market} onChange={v=>setFilters(p=>({...p,market:v}))} options={allMarkets} placeholder="Market"/>
        <Sel value={filters.tier} onChange={v=>setFilters(p=>({...p,tier:v}))} options={["Elite","Strong","Mid","Building","New"]} placeholder="Tier"/>
        <Sel value={filters.urgency} onChange={v=>setFilters(p=>({...p,urgency:v}))} options={["HIGH","MEDIUM","LOW"]} placeholder="Urgency"/>
        <Sel value={filters.brokerage} onChange={v=>setFilters(p=>({...p,brokerage:v}))} options={allBrokerages} placeholder="Brokerage"/>
        <div style={{flex:1}}/>
        <select value={sortBy} onChange={ev=>setSortBy(ev.target.value)} style={{padding:"10px 14px",borderRadius:6,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:15,outline:"none",fontFamily:"inherit"}}>
          {[["urgency","🔥 Hot First"],["tier","🏆 Top Tier"],["newest","🕐 Newest"],["oldest","⏳ Oldest"]].map(([v,l])=><option key={v} value={v} style={{background:T.card}}>{l}</option>)}
        </select>
        <div onClick={()=>setPipeView(pipeView==="kanban"?"table":"kanban")} style={{padding:"10px 16px",borderRadius:6,background:T.card,border:`1px solid ${T.b}`,fontSize:15,color:T.s,cursor:"pointer"}}>{pipeView==="kanban"?"☰ Table":"▦ Board"}</div>
      </div>

      {/* Active filters */}
      {Object.values(filters).some(Boolean)&&(
        <div style={{display:"flex",gap:14,marginBottom:14,alignItems:"center"}}>
          <span style={{fontSize:14,color:T.m}}>Filters:</span>
          {Object.entries(filters).filter(([,v])=>v).map(([k,v])=>(
            <div key={k} onClick={()=>setFilters(p=>({...p,[k]:""}))} style={{fontSize:14,padding:"4px 10px",borderRadius:4,background:T.bl+"18",color:T.bl,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>{v} <span style={{color:T.s}}>✕</span></div>
          ))}
          <div onClick={()=>setFilters({market:"",tier:"",urgency:"",brokerage:""})} style={{fontSize:14,color:T.s,cursor:"pointer",marginLeft:4}}>Clear all</div>
        </div>
      )}

      {/* Kanban View */}
      {pipeView==="kanban"&&(
        <div className="kanban-wrap" style={{display:"flex",gap:10,overflow:"auto",paddingBottom:8}}>
          {STAGES.map(stg=>{
            const colLeads=pipeLeads.filter(l=>l.pipeline_stage===stg.id);
            return(
              <div key={stg.id} style={{minWidth:220,flex:1}}
                onDragOver={ev=>ev.preventDefault()}
                onDrop={()=>{if(dragLead){/* In production: update Supabase stage */setDragLead(null);}}}>
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

      {/* Table View */}
      {pipeView==="table"&&(
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:10,padding:"20px 22px"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Name","Market","Brokerage","Tier","Urgency","Stage","Last Contact","Action"].map(h=><th key={h} style={{textAlign:"left",padding:"12px 14px",fontSize:13,fontWeight:700,color:T.m,letterSpacing:1.5,borderBottom:`1px solid ${T.b}`}}>{h}</th>)}</tr></thead><tbody>{pipeLeads.map((l,i)=>{
          const act=stageAction(l);
          const daysSince=l.outreach_sent_at?Math.floor((Date.now()-new Date(l.outreach_sent_at))/86400000):null;
          const contactColor=daysSince===null?T.m:daysSince>7?T.r:daysSince>3?T.y:T.a;
          return(
            <tr key={i} style={{borderBottom:`1px solid ${T.b}`}} onMouseOver={ev=>ev.currentTarget.style.background=T.d} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
              <td onClick={()=>{setSelLead(l);setViewWithHistory("lead");}} style={{padding:"14px",fontSize:16,fontWeight:600,color:T.t,cursor:"pointer"}}>{l.first_name} {l.last_name}</td>
              <td style={{padding:"14px",fontSize:15,color:T.s}}>{l.market}</td>
              <td style={{padding:"14px",fontSize:15,color:l.brokerage?.includes("LPT")?T.a:T.t}}>{l.brokerage?.substring(0,22)}</td>
              <td style={{padding:"14px"}}><TPill t={l.tier}/></td>
              <td style={{padding:"14px"}}><UPill u={l.urgency}/></td>
              <td style={{padding:"14px"}}><Pill text={l.pipeline_stage?.replace(/_/g," ")||"—"} color={STAGES.find(s=>s.id===l.pipeline_stage)?.c||T.s}/></td>
              <td style={{padding:"14px",fontSize:14,color:contactColor,fontWeight:daysSince>7?700:400}}>{daysSince!==null?`${daysSince}d ago`:"Never"}</td>
              <td style={{padding:"14px"}}>{act&&<span onClick={()=>askLiviInline(act.q)} style={{fontSize:14,color:T.a,cursor:"pointer",fontWeight:600}}>{act.icon} {act.label}</span>}</td>
            </tr>
          );
        })}</tbody></table></div>
      )}

    </>
    );
  };

  // ━━━ CRM VIEW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
      <div style={{display:"flex",gap:12,marginBottom:20,alignItems:"center",flexWrap:"wrap"}}>
        <input value={crmSearch} onChange={ev=>setCrmSearch(ev.target.value)} placeholder="Search leads..." style={{padding:"12px 18px",borderRadius:8,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:15,outline:"none",fontFamily:"inherit",width:280}}/>
        <select value={crmSort} onChange={ev=>setCrmSort(ev.target.value)} style={{padding:"10px 14px",borderRadius:6,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:14,outline:"none",fontFamily:"inherit"}}>
          {[["newest","🕐 Newest"],["oldest","⏳ Oldest"],["name","🔤 Name"],["urgency","🔥 Urgency"]].map(([v,l])=><option key={v} value={v} style={{background:T.card}}>{l}</option>)}
        </select>
        <div style={{flex:1}}/>
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
              <td style={{padding:"14px 16px",fontSize:14,color:l.brokerage?.includes("LPT")?T.a:T.t}}>{l.brokerage?.substring(0,22)||"—"}</td>
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

  // ━━━ RENDER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return(
    <div style={{minHeight:"100vh",background:T.bg,color:T.t,fontFamily:"'SF Pro Display',-apple-system,sans-serif",display:"flex"}}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}textarea::placeholder,input::placeholder{color:${T.m}}
@media(max-width:768px){

.app-sidebar{width:56px!important}
.app-sidebar .logo-btn{width:36px!important;height:36px!important;font-size:14px!important}
.app-sidebar .nav-btn{width:40px!important;height:40px!important;font-size:16px!important}
.main-scroll{padding:14px 12px!important}
.kpi-grid{grid-template-columns:1fr 1fr!important;gap:10px!important}
.kpi-card{padding:14px 16px!important}
.kpi-card .kpi-icon{width:40px!important;height:40px!important;font-size:18px!important}
.kpi-card .kpi-val{font-size:24px!important}
.kpi-card .kpi-label{font-size:11px!important}
.kpi-card .kpi-sub{font-size:12px!important}
.quick-grid{grid-template-columns:1fr 1fr!important;gap:8px!important}
.quick-grid>div{padding:14px 12px!important}
.quick-grid>div span:first-child{font-size:20px!important}
.quick-grid>div span:last-child{font-size:13px!important}
.two-col{grid-template-columns:1fr!important}
.three-col{grid-template-columns:1fr!important}
.four-col{grid-template-columns:1fr 1fr!important}
.section-card{padding:16px 18px!important}
.section-title{font-size:16px!important}
.page-title{font-size:24px!important}
.lead-header h1{font-size:24px!important}
.lead-tabs{overflow-x:auto}
.lead-tabs>div{padding:10px 14px!important;font-size:13px!important;white-space:nowrap}
.kanban-wrap{flex-direction:column!important}
.kanban-wrap>div{min-width:100%!important}
.crm-table{font-size:13px!important}
.crm-table td,.crm-table th{padding:10px 8px!important}
.modal-box{width:90vw!important;max-width:400px!important;padding:16px 18px!important}
.modal-box .form-grid{grid-template-columns:1fr!important}
}`}</style>

      {/* SIDEBAR */}
      <div className="app-sidebar" style={{width:80,background:T.side,borderRight:`1px solid ${T.b}`,display:"flex",flexDirection:"column",alignItems:"center",padding:"14px 0",gap:14,flexShrink:0}}>
        <div className="logo-btn" style={{width:44,height:44,borderRadius:9,background:"linear-gradient(135deg,#00E5A0,#3B82F6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:18,color:"#000",marginBottom:16}}>L</div>
        {[["home","⬡"],["pipeline","◎"],["crm","📋"],["agents","🔍"]].map(([id,ic])=>
          <div key={id} onClick={()=>setViewWithHistory(id)} title={id} className="nav-btn" style={{width:48,height:48,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:20,background:view===id?T.am:"transparent",color:view===id?T.a:T.m,transition:"all 0.12s"}}>{ic}</div>
        )}
        <div style={{flex:1}}/>
        <div onClick={load} style={{width:48,height:48,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:17,color:loading?T.a:T.m}}>{loading?"⟳":"↻"}</div>
        <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#3B82F6,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,marginTop:4}}>AD</div>
      </div>

      {/* MAIN AREA */}
      <div style={{flex:1,overflow:"auto",padding:(view==="lead"||view==="addlead")?"0":"24px 32px"}}>
        {view!=="lead"&&view!=="addlead"&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <h1 className="page-title" style={{fontSize:32,fontWeight:800,margin:0}}>{view==="home"?"Command Center":view==="pipeline"?"Lead Pipeline":view==="crm"?"Leads CRM":view==="agents"?"Agent Directory":"LIVI AI"}</h1>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {<div onClick={()=>setViewWithHistory("addlead")} style={{padding:"12px 20px",borderRadius:8,background:T.am,fontSize:15,fontWeight:700,color:T.a,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>+ New Lead</div>}
            <div style={{fontSize:14,color:leads.length>0?T.a:T.r,fontWeight:600}}>{loading?"⟳ Loading...":leads.length>0?`✓ ${leads.length} leads`:"✕ No data"}</div>
          </div>
        </div>}
        {view==="home"&&<><AskLiviBar source="home" prompts={[["🎯","Who to Call",`Who should I call first today? Look at my pipeline and tell me the highest priority lead.`,T.a],["📱","Draft Outreach",`Draft a recruiting DM for my hottest lead in the pipeline.`,T.bl],["🔍","Find Agents",`Find me 5 real estate agents in my target markets who might be looking to switch brokerages.`,T.p],["📋","Game Plan",`Create my recruiting game plan for this week based on my current pipeline.`,T.y]]}/><Dash/></>}
        {view==="pipeline"&&<><AskLiviBar source="pipeline" prompts={[["📱","Draft Outreach",`Look at my pipeline and draft outreach for my highest priority lead.`,T.a],["🔄","Follow-ups",`Which leads need follow-up? Draft messages for each.`,T.bl],["🎯","Strategy",`Analyze my pipeline and suggest what I should focus on.`,T.p],["📊","Conversion Tips",`Based on my pipeline, what can I do to improve conversion?`,T.y]]}/><Pipeline/></>}
        {view==="crm"&&<><AskLiviBar source="crm" prompts={[["🔍","Find Prospects",`Find me 5 real estate agents who might be looking to switch brokerages.`,T.a],["📊","Score Leads",`Score my current leads and tell me who to prioritize.`,T.bl],["📱","Outreach Plan",`Create an outreach plan for all my new and researched leads.`,T.p],["🎯","Market Analysis",`Which markets should I be targeting for recruiting?`,T.y]]}/><CRM/></>}
        {view==="agents"&&<AgentDirectory/>}
        {view==="lead"&&selLead&&<LeadPage lead={selLead} onBack={()=>{setSelLead(null);setInlineResponse(null);setResponseSource(null);setViewWithHistory("pipeline");}} onAskInline={(q)=>askLiviInline(q,"lead_"+selLead.id)} inlineResponse={responseSource===("lead_"+selLead.id)?inlineResponse:null} inlineLoading={inlineLoading&&responseSource===("lead_"+selLead.id)} onRefreshLead={async()=>{
          await load();
          // Refresh the selected lead with latest data
          try{
            const r=await fetch(`${SUPA}/dazet_leads?id=eq.${selLead.id}&select=*`,{headers:{"apikey":KEY,"Authorization":`Bearer ${KEY}`}});
            if(r.ok){const d=await r.json();if(d[0])setSelLead(d[0]);}
          }catch{}
        }}/>}
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
                <div style={{gridColumn:"1/3"}}><div style={{fontSize:12,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>SOURCE</div><select value={newLead.source} onChange={ev=>setNewLead(p=>({...p,source:ev.target.value}))} style={{width:"100%",padding:"14px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}><option value="" style={{background:T.card}}>Select source...</option>{["Manual","Referral","Facebook Ad","Instagram Ad","GHL Webhook","LinkedIn","Cold Outreach","Event","Open House","Other"].map(s=><option key={s} value={s} style={{background:T.card}}>{s}</option>)}</select></div>
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
