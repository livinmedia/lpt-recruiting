import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { createClient } from "@supabase/supabase-js";

const SUPA = "https://zuwvovjhrkzlpdxcpsud.supabase.co/rest/v1";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1d3Zvdmpocmt6bHBkeGNwc3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNTMyOTAsImV4cCI6MjA4NzcyOTI5MH0.SmOAe8yeEa79hrSkwMLLq5z70Fmoxznvhs0YNOxa-no";

// rkrt.in Platform — Agent Directory (352K+ real agents)
const LIVI_SUPA = "https://usknntguurefeyzusbdh.supabase.co/rest/v1";
const LIVI_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVza25udGd1dXJlZmV5enVzYmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MTcwODAsImV4cCI6MjA4Nzk5MzA4MH0.pxexo90zyugIA4pPzLonGo3E1frr8bSZvz-XT7BmuqQ";

const supabase = createClient('https://usknntguurefeyzusbdh.supabase.co', LIVI_KEY);

async function logActivity(userId, action, metadata = {}) {
  if (!userId) return;
  try {
    await supabase.from('user_activity').insert({ user_id: userId, action, metadata, created_at: new Date().toISOString() });
  } catch (e) { /* silent fail */ }
}

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
  params.push(`select=id,state,license_number,license_type,full_name,first_name,last_name,license_status,brokerage_name,brokerage_license,city,county,address,license_expiration,original_license_date,personal_email,work_email,mobile_phone,linkedin_url,enriched_at`);
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
function LeadPage({lead,onBack,onAskInline,inlineResponse,inlineLoading,userId}){
  const [editing,setEditing]=useState(false);
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
  const EF=({label,field})=>(<div style={{marginBottom:14}}><div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:4}}>{label}</div>{editing?<input value={info[field]} onChange={ev=>setInfo(p=>({...p,[field]:ev.target.value}))} style={{width:"100%",padding:"10px 14px",borderRadius:6,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:15,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>:<div style={{fontSize:16,color:T.t}}>{info[field]||"—"}</div>}</div>);
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

// ━━━ AGENT DIRECTORY (352K+ real agents) ━━━━━━━━━━━━━━
function AgentDirectory({userId}){
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
      const body={user_id:userId,first_name:agent.first_name||agent.full_name?.split(" ")[0]||"",last_name:agent.last_name||agent.full_name?.split(" ").slice(1).join(" ")||"",brokerage:agent.brokerage_name||"",market:agent.city?`${agent.city}, ${agent.state}`:(agent.county?`${agent.county}, ${agent.state}`:agent.state),source:"Agent Directory",pipeline_stage:"new",tier:"New",urgency:"LOW",notes:`License: ${agent.license_number} (${agent.license_type||"Agent"})\nState: ${agent.state}\nBrokerage: ${agent.brokerage_name||"N/A"}${agent.original_license_date?`\nLicensed: ${agent.original_license_date}`:""}`};
      const r=await fetch(`${SUPA}/dazet_leads`,{method:"POST",headers:{"apikey":KEY,"Authorization":`Bearer ${KEY}`,"Content-Type":"application/json","Prefer":"return=representation"},body:JSON.stringify(body)});
      if(r.ok){setAdded(p=>({...p,[agent.license_number]:true}));logActivity(userId,'add_lead_from_directory',{agent_name:agent.full_name});}
    } catch(e) { console.error("Add to pipeline error:", e); }
  };

  const enrichAgent=async(agent)=>{
    setEnriching(true);
    try {
      const r=await fetch("https://usknntguurefeyzusbdh.supabase.co/functions/v1/enrich-agent",{
        method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${LIVI_KEY}`},
        body:JSON.stringify({agent_id:agent.id,first_name:agent.first_name||agent.full_name?.split(" ")[0]||"",last_name:agent.last_name||agent.full_name?.split(" ").slice(1).join(" ")||"",brokerage_name:agent.brokerage_name||"",state:agent.state||""})
      });
      const d=await r.json();
      if(d.enriched||d.personal_email||d.work_email||d.mobile_phone||d.linkedin_url||d.enriched_at){
        const updated={...agent,...d,enriched_at:d.enriched_at||new Date().toISOString()};
        setSelectedAgent(updated);
        setResults(prev=>prev.map(a=>a.id===agent.id?updated:a));
      } else if(d.error){
        setSelectedAgent({...agent,_enrichError:d.error});
      } else {
        setSelectedAgent({...agent,_enrichError:"No match found on Apollo"});
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
      {/* Stats banner */}
      <div style={{display:"flex",gap:16,marginBottom:20,flexWrap:"wrap"}}>
        {[["🇺🇸","352,338","Licensed Agents",T.a],["🏢","51,057","Brokerages",T.bl],["📍","3","States Live",T.p],["🆕","~1,000/mo","New TX Agents",T.y]].map(([ic,v,l,c],i)=>
          <div key={i} style={{flex:"1 1 140px",background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"18px 22px",display:"flex",alignItems:"center",gap:14}}>
            <div style={{fontSize:24}}>{ic}</div>
            <div><div style={{fontSize:22,fontWeight:800,color:T.t}}>{v}</div><div style={{fontSize:11,color:c,fontWeight:700,letterSpacing:1}}>{l.toUpperCase()}</div></div>
          </div>
        )}
      </div>

      {/* New Agents quick filters */}
      <div className="newly-licensed-row" style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
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
          <div className="agent-search-btns" style={{display:"flex",gap:8}}>
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
          <div style={{fontSize:20,fontWeight:700,color:T.t,marginBottom:8}}>352,338 Real Licensed Agents</div>
          <div style={{fontSize:15,color:T.s,maxWidth:500,margin:"0 auto",lineHeight:1.6}}>Search by state, brokerage, name, or city. Every record is from official state licensing boards — Texas TREC, New York DOS, Connecticut DCP. Add agents directly to your recruiting pipeline.</div>
          <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:10,marginTop:24}}>
            {[{l:"🆕 New TX agents (30d)",f:{state:"TX",brokerage:"",name:"",city:"",newDays:"30"}},{l:"eXp agents in TX",f:{state:"TX",brokerage:"EXP REALTY",name:"",city:"",newDays:""}},{l:"Compass in NY",f:{state:"NY",brokerage:"COMPASS",name:"",city:"",newDays:""}},{l:"All LPT Realty",f:{state:"",brokerage:"LPT REALTY",name:"",city:"",newDays:""}}].map((ex,i)=>
              <div key={i} onClick={()=>{setFilters(ex.f);doSearch(ex.f,0);}} style={{padding:"10px 18px",borderRadius:8,background:i===0?T.y+"20":T.am,color:i===0?T.y:T.a,fontSize:14,fontWeight:600,cursor:"pointer",border:`1px solid ${i===0?T.y+"30":T.a+"20"}`}}>{ex.l}</div>
            )}
          </div>
        </div>
      )}

      {/* Agent Detail Panel */}
      {selectedAgent && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setSelectedAgent(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:16,padding:"32px 28px",maxWidth:520,width:"100%",maxHeight:"85vh",overflowY:"auto",position:"relative"}}>
            <div onClick={()=>setSelectedAgent(null)} style={{position:"absolute",top:16,right:16,cursor:"pointer",color:T.s,fontSize:18,fontWeight:700}}>✕</div>

            <div style={{fontSize:22,fontWeight:800,color:T.t,marginBottom:4}}>{selectedAgent.full_name||"—"}</div>
            <div style={{fontSize:14,color:T.s,marginBottom:20}}>{selectedAgent.brokerage_name||"—"}</div>

            {/* Agent Info Grid */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
              {[
                ["State",selectedAgent.state],
                ["City",selectedAgent.city||selectedAgent.county||"—"],
                ["License #",selectedAgent.license_number],
                ["Type",(selectedAgent.license_type||"").includes("Broker")?"Broker":"Agent"],
                ["Status",selectedAgent.license_status||"—"],
                ["Licensed",selectedAgent.original_license_date||"—"],
                ["Expires",selectedAgent.license_expiration||"—"],
                ["Address",selectedAgent.address||"—"],
              ].map(([label,val],i)=>
                <div key={i} style={{padding:"10px 14px",background:T.d,borderRadius:8,border:`1px solid ${T.b}`}}>
                  <div style={{fontSize:10,color:T.m,fontWeight:700,letterSpacing:1.2,marginBottom:4}}>{label.toUpperCase()}</div>
                  <div style={{fontSize:14,color:T.t,fontWeight:600}}>{val}</div>
                </div>
              )}
            </div>

            {/* Enrichment Section */}
            {selectedAgent.enriched_at ? (
              <div style={{background:T.d,borderRadius:12,border:`1px solid ${T.a}20`,padding:"20px 18px",marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.a,letterSpacing:1}}>ENRICHED DATA</div>
                  <div style={{fontSize:11,color:T.m}}>via Apollo · {new Date(selectedAgent.enriched_at).toLocaleDateString()}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {selectedAgent.personal_email && (
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:12,color:T.m,fontWeight:700,width:90}}>Personal</span>
                      <a href={`mailto:${selectedAgent.personal_email}`} style={{color:T.a,fontSize:14,textDecoration:"none",fontWeight:600}}>{selectedAgent.personal_email}</a>
                    </div>
                  )}
                  {selectedAgent.work_email && (
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:12,color:T.m,fontWeight:700,width:90}}>Work</span>
                      <a href={`mailto:${selectedAgent.work_email}`} style={{color:T.a,fontSize:14,textDecoration:"none",fontWeight:600}}>{selectedAgent.work_email}</a>
                    </div>
                  )}
                  {selectedAgent.mobile_phone && (
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:12,color:T.m,fontWeight:700,width:90}}>Mobile</span>
                      <a href={`tel:${selectedAgent.mobile_phone}`} style={{color:T.a,fontSize:14,textDecoration:"none",fontWeight:600}}>{selectedAgent.mobile_phone}</a>
                    </div>
                  )}
                  {selectedAgent.linkedin_url && (
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:12,color:T.m,fontWeight:700,width:90}}>LinkedIn</span>
                      <a href={selectedAgent.linkedin_url} target="_blank" rel="noopener noreferrer" style={{color:T.bl,fontSize:14,textDecoration:"none",fontWeight:600}}>{selectedAgent.linkedin_url.replace(/https?:\/\/(www\.)?linkedin\.com\//,"")}</a>
                    </div>
                  )}
                  {!selectedAgent.personal_email && !selectedAgent.work_email && !selectedAgent.mobile_phone && !selectedAgent.linkedin_url && (
                    <div style={{color:T.s,fontSize:13}}>No contact data found on Apollo</div>
                  )}
                </div>
                <div onClick={()=>enrichAgent(selectedAgent)} style={{marginTop:14,padding:"10px 20px",borderRadius:8,background:T.am,color:T.a,fontSize:13,fontWeight:700,cursor:enriching?"not-allowed":"pointer",opacity:enriching?0.5:1,textAlign:"center",border:`1px solid ${T.a}30`}}>
                  {enriching?"Enriching...":"Re-enrich"}
                </div>
              </div>
            ) : (
              <div style={{marginBottom:16}}>
                {selectedAgent._enrichError && (
                  <div style={{padding:"12px 16px",borderRadius:8,background:T.r+"15",border:`1px solid ${T.r}30`,color:T.r,fontSize:13,marginBottom:12}}>{selectedAgent._enrichError}</div>
                )}
                <div onClick={()=>!enriching&&enrichAgent(selectedAgent)} style={{padding:"14px 24px",borderRadius:10,background:T.a,color:"#000",fontSize:15,fontWeight:700,cursor:enriching?"not-allowed":"pointer",opacity:enriching?0.5:1,textAlign:"center"}}>
                  {enriching?"Enriching...":"Enrich with Apollo"}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{display:"flex",gap:10}}>
              {added[selectedAgent.license_number] ? (
                <div style={{flex:1,padding:"12px",borderRadius:8,background:T.am,color:T.a,fontSize:14,fontWeight:700,textAlign:"center"}}>✓ In Pipeline</div>
              ) : (
                <div onClick={()=>addToPipeline(selectedAgent)} style={{flex:1,padding:"12px",borderRadius:8,background:T.am,color:T.a,fontSize:14,fontWeight:700,cursor:"pointer",textAlign:"center",border:`1px solid ${T.a}30`}}>+ Add to Pipeline</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// ━━━ CONTENT TAB (Today's Content Menu) ━━━━━━━━━━━━━━
function ContentTab({userId}){
  const [content,setContent]=useState([]);
  const [loading,setLoading]=useState(true);
  const [generating,setGenerating]=useState(false);
  const [selectedDate,setSelectedDate]=useState(new Date().toISOString().split("T")[0]);
  const [copied,setCopied]=useState({});
  const [filter,setFilter]=useState("all");

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
      const r=await fetch(`${LIVI_SUPA}/daily_content?content_date=eq.${date}&user_id=eq.${userId}&order=platform.asc,created_at.asc`,{
        headers:{"apikey":LIVI_KEY,"Authorization":`Bearer ${LIVI_KEY}`}
      });
      if(r.ok){const d=await r.json();setContent(d);}
    }catch(e){console.error("Load content error:",e);}
    setLoading(false);
  };

  useEffect(()=>{loadContent(selectedDate);},[selectedDate]);

  const generateContent=async()=>{
    setGenerating(true);
    try{
      const r=await fetch("https://usknntguurefeyzusbdh.supabase.co/functions/v1/generate-content",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({date:selectedDate,force:true,images:true,user_id:userId})
      });
      if(r.ok){
        await loadContent(selectedDate);
        logActivity(userId,'generate_content',{date:selectedDate});
      }
    }catch(e){console.error("Generate error:",e);}
    setGenerating(false);
  };

  const copyPost=(id,text)=>{
    navigator.clipboard?.writeText(text);
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
      setContent(p=>p.map(c=>c.id===id?{...c,is_posted:true,posted_at:new Date().toISOString()}:c));
    }catch(e){console.error("Mark posted error:",e);}
  };

  const platformConfig={
    facebook:{icon:"📘",label:"Facebook",color:"#1877F2",bg:"#1877F210"},
    instagram:{icon:"📸",label:"Instagram",color:"#E1306C",bg:"#E1306C10"},
    youtube:{icon:"🎬",label:"YouTube",color:"#FF0000",bg:"#FF000010"}
  };

  const filtered=filter==="all"?content:content.filter(c=>c.platform===filter);
  const posted=content.filter(c=>c.is_posted).length;
  const totalPosts=content.length;

  const dateObj=new Date(selectedDate+"T12:00:00");
  const dayLabel=dateObj.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
  const isToday=selectedDate===new Date().toISOString().split("T")[0];

  return(
    <>
      <div className="content-header-outer" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:14,color:T.a,fontWeight:700,letterSpacing:2,marginBottom:4}}>
            {isToday?"TODAY'S CONTENT MENU":"CONTENT FOR"}
          </div>
          <div style={{fontSize:18,color:T.s}}>{dayLabel}</div>
        </div>
        <div className="content-ctrl-row" style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <input type="date" value={selectedDate} onChange={ev=>setSelectedDate(ev.target.value)} style={{padding:"10px 14px",borderRadius:8,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:14,outline:"none",fontFamily:"inherit"}}/>
          <div className="generate-btn" onClick={generating?null:generateContent} style={{padding:"12px 20px",borderRadius:8,background:generating?T.d:T.am,color:generating?T.m:T.a,fontSize:14,fontWeight:700,cursor:generating?"wait":"pointer",display:"flex",alignItems:"center",gap:8}}>
            {generating?"⏳ Generating (~30s)...":"✨ Generate Fresh Content"}
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}} className="kpi-grid">
        {[
          ["📝","Total Posts",totalPosts,T.bl],
          ["📘","Facebook",content.filter(c=>c.platform==="facebook").length,"#1877F2"],
          ["📸","Instagram",content.filter(c=>c.platform==="instagram").length,"#E1306C"],
          ["✅","Posted",posted,T.a]
        ].map(([ic,l,v,c],i)=>
          <div key={i} style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:10,padding:"16px 20px",textAlign:"center"}}>
            <div style={{fontSize:20,marginBottom:4}}>{ic}</div>
            <div style={{fontSize:24,fontWeight:800,color:c}}>{v}</div>
            <div style={{fontSize:11,color:T.s,letterSpacing:1,marginTop:2}}>{l.toUpperCase()}</div>
          </div>
        )}
      </div>

      <div className="content-filter-tabs" style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {[["all","All",T.t],["facebook","📘 Facebook","#1877F2"],["instagram","📸 Instagram","#E1306C"]].map(([id,label,c])=>
          <div key={id} onClick={()=>setFilter(id)} style={{padding:"10px 18px",borderRadius:8,background:filter===id?c+"18":T.d,border:`1px solid ${filter===id?c+"40":T.b}`,color:filter===id?c:T.s,fontSize:14,fontWeight:600,cursor:"pointer",transition:"all 0.12s",display:"flex",alignItems:"center",justifyContent:"center"}}>{label}</div>
        )}
      </div>

      {loading?(
        <div style={{textAlign:"center",padding:60}}>
          <div style={{fontSize:32,animation:"pulse 1s infinite"}}>📝</div>
          <div style={{color:T.s,marginTop:12}}>Loading content...</div>
        </div>
      ):filtered.length===0?(
        <div style={{textAlign:"center",padding:60}}>
          <div style={{fontSize:48,marginBottom:16}}>✨</div>
          <div style={{fontSize:20,fontWeight:700,color:T.t,marginBottom:8}}>No Content for This Date</div>
          <div style={{fontSize:15,color:T.s,marginBottom:20,maxWidth:400,margin:"0 auto 20px",lineHeight:1.6}}>Generate AI-powered social content for Facebook, Instagram, and YouTube. Each post links to your landing pages with UTM tracking.</div>
          <div onClick={generating?null:generateContent} style={{display:"inline-block",padding:"14px 28px",borderRadius:8,background:T.am,color:T.a,fontSize:16,fontWeight:700,cursor:generating?"wait":"pointer"}}>
            {generating?"⏳ Generating (~30s)...":"✨ Generate Today's Content"}
          </div>
        </div>
      ):(
        <div className="content-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(340px, 1fr))",gap:24,alignItems:"start"}}>
          {filtered.map((post,i)=>{
            const cfg=platformConfig[post.platform]||{icon:"📄",label:post.platform,color:T.bl,bg:T.bl+"10"};
            const bodyText=post.body||"";
            const bodyClean=bodyText.split("\n\n").filter(p=>!p.trim().match(/^https?:\/\/[^\s]+$/)).join("\n\n").trim();
            const lp=post.landing_page_slug?LP_PREVIEWS[post.landing_page_slug]||null:null;
            return(
              <div key={post.id||i} style={{background:T.card,border:`1px solid ${post.is_posted?T.a+"30":T.b}`,borderRadius:12,opacity:post.is_posted?0.7:1,transition:"all 0.15s",display:"flex",flexDirection:"column"}}>

                <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",flex:1}}>

                {/* Platform icon + type badge + posted status */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:32,height:32,borderRadius:8,background:cfg.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{cfg.icon}</div>
                    <span style={{fontSize:14,fontWeight:700,color:cfg.color}}>{cfg.label}</span>
                    {post.content_type&&post.content_type!=="post"&&<span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:T.p+"18",color:T.p,fontWeight:600,textTransform:"uppercase"}}>{post.content_type}</span>}
                  </div>
                  {post.is_posted&&<span style={{fontSize:11,color:T.a,fontWeight:700,padding:"2px 8px",borderRadius:4,background:T.a+"15"}}>✓ Posted</span>}
                </div>

                {/* Theme tag */}
                {post.theme&&<div style={{fontSize:12,color:T.s,marginBottom:8,letterSpacing:0.5}}>{post.theme.replace(/_/g," ")}</div>}

                {/* Headline */}
                {post.headline&&<div style={{fontSize:14,fontWeight:800,color:T.t,marginBottom:10,lineHeight:1.4}}>{post.headline}</div>}

                {/* Full body text */}
                <div style={{fontSize:13,color:T.s,lineHeight:1.6,marginBottom:12,whiteSpace:"pre-wrap",wordBreak:"break-word",padding:"12px 14px",background:T.d,borderRadius:8,border:`1px solid ${T.b}`}}>{bodyClean}</div>

                {/* Landing page preview card */}
                {lp&&(
                  <a href={`https://lpt-recruiting.vercel.app/${post.landing_page_slug}`} target="_blank" rel="noreferrer"
                    style={{display:"flex",borderRadius:10,overflow:"hidden",border:`1px solid ${T.b}`,marginBottom:12,textDecoration:"none",background:T.d,transition:"border-color 0.15s"}}
                    onMouseOver={ev=>ev.currentTarget.style.borderColor=T.bh}
                    onMouseOut={ev=>ev.currentTarget.style.borderColor=T.b}>
                    <img src={lp.img} alt={lp.title} style={{width:80,objectFit:"cover",flexShrink:0}}/>
                    <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",justifyContent:"center",minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:T.t,marginBottom:3}}>{lp.title}</div>
                      <div style={{fontSize:12,color:T.s,marginBottom:4}}>{lp.desc}</div>
                      <div style={{fontSize:11,color:T.m}}>lpt-recruiting.vercel.app</div>
                    </div>
                  </a>
                )}

                {/* Buttons pinned to bottom */}
                <div style={{marginTop:"auto",display:"flex",gap:8}}>
                  <div onClick={()=>{copyPost(post.id,post.body);logActivity(userId,'copy_content',{platform:post.platform,theme:post.theme})}} style={{flex:1,padding:"9px 10px",borderRadius:8,background:copied[post.id]?T.a+"20":T.am,color:T.a,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                    {copied[post.id]?"✓ Copied":"📋 Copy"}
                  </div>
                  {!post.is_posted&&(
                    <div onClick={()=>{markPosted(post.id);logActivity(userId,'mark_posted',{platform:post.platform,theme:post.theme})}} style={{flex:1,padding:"9px 10px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.s,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      ✅ Posted
                    </div>
                  )}
                </div>
                </div>
              </div>
            );
          })}
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

  // ━━━ AUTH (declared early so load can reference authUser) ━━━
  const [authUser,setAuthUser]=useState(null);
  const [profile,setProfile]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);

  const load=useCallback(async()=>{
    if(!authUser) return;
    setLoading(true);
    const [l,a]=await Promise.all([sq("dazet_leads","user_id=eq."+authUser.id+"&order=created_at.desc&limit=100"),sq("dazet_agent_activity","user_id=eq."+authUser.id+"&order=created_at.desc&limit=50")]);
    setLeads(l||[]);setActivity(a||[]);setLoading(false);
  },[authUser]);

  useEffect(()=>{load();const i=setInterval(load,45000);return()=>clearInterval(i);},[load]);

  // askLiviInline: inline AI on every page
  const [inlineResponse,setInlineResponse]=useState(null);
  const [inlineLoading,setInlineLoading]=useState(false);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [profileMenuOpen,setProfileMenuOpen]=useState(false);

  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(!session){window.location.href="/login";return;}
      setAuthUser(session.user);
      logActivity(session.user.id,'login');
      const {data:prof}=await supabase.from("profiles").select("*").eq("id",session.user.id).single();
      setProfile(prof||null);
      setAuthLoading(false);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(!session) window.location.href="/login";
    });
    return()=>subscription.unsubscribe();
  },[]);

  const [profileEdit,setProfileEdit]=useState(null);
  const [profileSaving,setProfileSaving]=useState(false);
  useEffect(()=>{
    if(profile) setProfileEdit({full_name:profile.full_name||"",phone:profile.phone||"",brokerage:profile.brokerage||"",license_number:profile.license_number||"",license_state:profile.license_state||"",market:profile.market||""});
  },[profile]);
  const saveProfile=async()=>{
    if(!profileEdit)return;
    setProfileSaving(true);
    const{error}=await supabase.from("profiles").update(profileEdit).eq("id",authUser.id);
    if(!error){setProfile(p=>({...p,...profileEdit}));logActivity(authUser.id,'update_profile');}
    setProfileSaving(false);
  };

  const askLiviInline=async(q)=>{
    setInlineLoading(true);setInlineResponse(null);
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

  // ━━━ ASK LIVI BAR (top of every page) ━━━━━━━━━━━━
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

  // ━━━ ADD LEAD TO SUPABASE ━━━━━━━━━━━━━━━━━━━━━━━
  const saveLead=async(doResearch)=>{
    if(!newLead.first_name.trim())return;
    try{
      const body={user_id:authUser.id,first_name:newLead.first_name.trim(),last_name:newLead.last_name.trim(),email:newLead.email.trim()||null,phone:newLead.phone.trim()||null,market:newLead.market.trim()||null,brokerage:newLead.brokerage.trim()||null,source:newLead.source.trim()||"Manual",pipeline_stage:"new",tier:"New",urgency:"LOW"};
      const r=await fetch(`${SUPA}/dazet_leads`,{method:"POST",headers:{"apikey":KEY,"Authorization":`Bearer ${KEY}`,"Content-Type":"application/json","Prefer":"return=representation"},body:JSON.stringify(body)});
      if(!r.ok){console.error("Add lead error:",r.status,await r.text());return;}
      const saved=await r.json();
      console.log("Lead saved:",saved);
      const lead=saved[0]||saved;
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
      <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
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
          <>
          {/* Desktop table */}
          <div className="leads-desktop" style={{overflowX:"auto"}}>
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
          {/* Mobile cards */}
          <div className="leads-mobile">
            {leads.slice(0,6).map((l,i)=>
              <div key={i} onClick={()=>{setSelLead(l);setViewWithHistory("lead");}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,marginBottom:8,cursor:"pointer"}}
                onMouseOver={ev=>ev.currentTarget.style.borderColor=T.bh} onMouseOut={ev=>ev.currentTarget.style.borderColor=T.b}>
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
      <div className="pipe-stats" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
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

  // ━━━ ADMIN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const [adminStats,setAdminStats]=useState({users:0,leads:0,contentToday:0,agents:0});
  const [adminUsers,setAdminUsers]=useState([]);
  const [adminActivity,setAdminActivity]=useState([]);
  const [adminContent,setAdminContent]=useState([]);
  const [newContent,setNewContent]=useState({title:"",body:"",type:"announcement"});
  const [adminLoading,setAdminLoading]=useState(false);

  const loadAdmin=useCallback(async()=>{
    setAdminLoading(true);
    const today=new Date().toISOString().split("T")[0];
    const [usersCount,leadsCount,contentCount,agentsCount,usersRows,activityRows,contentRows]=await Promise.all([
      supabase.from("profiles").select("*",{count:"exact",head:true}),
      supabase.from("leads").select("*",{count:"exact",head:true}),
      supabase.from("daily_content").select("*",{count:"exact",head:true}).gte("created_at",today).lt("created_at",new Date(Date.now()+86400000).toISOString().split("T")[0]),
      supabase.from("agent_directory").select("*",{count:"exact",head:true}),
      supabase.from("profiles").select("*").order("created_at",{ascending:false}).limit(100),
      supabase.from("user_activity").select("*").order("created_at",{ascending:false}).limit(20),
      supabase.from("platform_content").select("*").order("created_at",{ascending:false}).limit(20),
    ]);
    setAdminStats({users:usersCount.count||0,leads:leadsCount.count||0,contentToday:contentCount.count||0,agents:agentsCount.count||0});
    setAdminUsers(usersRows.data||[]);
    setAdminActivity(activityRows.data||[]);
    setAdminContent(contentRows.data||[]);
    setAdminLoading(false);
  },[]);

  useEffect(()=>{if(view==="admin"){if(profile?.role!=="owner"){setView("home");return;}loadAdmin();}},[view,loadAdmin,profile]);

  const publishContent=async()=>{
    if(!newContent.title.trim())return;
    const {error}=await supabase.from("platform_content").insert({...newContent,published:true});
    if(!error){setNewContent({title:"",body:"",type:"announcement"});loadAdmin();}
  };

  const AdminView=()=>(
    <>
      {/* A) PLATFORM STATS */}
      <div className="kpi-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
        {[
          ["👥","Total Users",adminStats.users,"Platform accounts",T.bl],
          ["🎯","Total Leads",adminStats.leads,"Across all users",T.a],
          ["📝","Content Today",adminStats.contentToday,"Posts generated",T.y],
          ["🔍","Agent Directory",adminStats.agents?.toLocaleString(),"Licensed agents",T.p],
        ].map(([ic,l,v,s,c],i)=>
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

      {/* B) USER CRM TABLE */}
      <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px",marginBottom:24}}>
        <div style={{fontSize:18,fontWeight:700,color:T.t,marginBottom:16}}>👥 Users ({adminUsers.length})</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
            <thead><tr>{["Name","Email","Role","Plan","Joined","Onboarded"].map(h=>
              <th key={h} style={{textAlign:"left",padding:"12px 14px",fontSize:12,fontWeight:700,color:T.m,letterSpacing:1.5,borderBottom:`1px solid ${T.b}`,whiteSpace:"nowrap",background:T.side}}>{h}</th>
            )}</tr></thead>
            <tbody>{adminUsers.length>0?adminUsers.map((u,i)=>
              <tr key={i} style={{borderBottom:`1px solid ${T.b}`}} onMouseOver={ev=>ev.currentTarget.style.background=T.d} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
                <td style={{padding:"13px 14px",fontSize:15,fontWeight:600,color:T.t,whiteSpace:"nowrap"}}>{u.full_name||"—"}</td>
                <td style={{padding:"13px 14px",fontSize:13,color:T.bl}}>{u.email||"—"}</td>
                <td style={{padding:"13px 14px"}}>
                  <span style={{fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:4,background:u.role==="owner"?T.r+"20":u.role==="admin"?T.p+"20":T.s+"20",color:u.role==="owner"?T.r:u.role==="admin"?T.p:T.s}}>{u.role||"user"}</span>
                </td>
                <td style={{padding:"13px 14px",fontSize:13,color:T.s}}>{u.plan||"free"}</td>
                <td style={{padding:"13px 14px",fontSize:13,color:T.m,whiteSpace:"nowrap"}}>{u.created_at?new Date(u.created_at).toLocaleDateString():"—"}</td>
                <td style={{padding:"13px 14px"}}>
                  <span style={{fontSize:12,fontWeight:700,color:u.onboarded?T.a:T.y}}>{u.onboarded?"✓ Yes":"— No"}</span>
                </td>
              </tr>
            ):<tr><td colSpan={6} style={{textAlign:"center",padding:"40px",color:T.m,fontSize:15}}>No users found</td></tr>}</tbody>
          </table>
        </div>
      </div>

      <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
        {/* C) RECENT ACTIVITY */}
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px"}}>
          <div style={{fontSize:18,fontWeight:700,color:T.t,marginBottom:16}}>📊 Recent Activity</div>
          {adminActivity.length>0?adminActivity.map((a,i)=>{
            const u=adminUsers.find(x=>x.id===a.user_id);
            const AL={login:'Logged in',add_lead:'Added lead',add_lead_from_directory:'Added from directory',generate_content:'Generated content',copy_content:'Copied content',mark_posted:'Marked as posted',search_agents:'Searched agents',research_lead:'Researched lead',draft_outreach:'Drafted outreach',update_profile:'Updated profile'};
            const AI={login:'🔑',add_lead:'➕',add_lead_from_directory:'🔍',generate_content:'✨',copy_content:'📋',mark_posted:'✅',search_agents:'🔎',research_lead:'🔬',draft_outreach:'📱',update_profile:'👤'};
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
            </div>);}):(
            <div style={{textAlign:"center",padding:"40px",color:T.m}}>
              <div style={{fontSize:28,marginBottom:8}}>📋</div>
              <div style={{fontSize:14}}>No activity logged yet</div>
            </div>
          )}
        </div>

        {/* E) SYSTEM STATUS */}
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px"}}>
          <div style={{fontSize:18,fontWeight:700,color:T.t,marginBottom:16}}>⚡ System Status</div>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:10}}>EDGE FUNCTIONS</div>
            {[
              ["sync-agents","Agent directory sync (FL/TX/NY/CT)","ok"],
              ["generate-content","Daily AI content generation (6 posts)","ok"],
              ["research-to-lead","AI agent research & dossier","ok"],
              ["parse-research","Parse research into lead fields","ok"],
              ["migrate-leads","Lead data migration tool","ok"],
              ["bulk-agent-load","Bulk agent directory loader","ok"],
              ["load-fl-csv","Florida CSV agent loader","ok"],
              ["parse-fl-csv","Florida CSV parser","ok"],
              ["upload-pages","Landing page uploader","ok"],
              ["lp","Landing page server (v3 - has bug)","warn"],
            ].map(([name,desc,status])=>
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
          {[
            ["🗄️","Supabase Dashboard","https://supabase.com/dashboard/project/usknntguurefeyzusbdh"],
            ["▲","Vercel Dashboard","https://vercel.com/livinmedias-projects/lpt-recruiting"],
            ["🐙","GitHub Repo","https://github.com/livinmedia/lpt-recruiting"],
          ].map(([ic,label,url])=>
            <a key={label} href={url} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,marginBottom:6,textDecoration:"none",color:T.t}}>
              <span style={{fontSize:18}}>{ic}</span>
              <span style={{fontSize:13,fontWeight:600}}>{label}</span>
              <span style={{marginLeft:"auto",fontSize:12,color:T.s}}>→</span>
            </a>
          )}
        </div>
      </div>

      {/* D) PLATFORM CONTENT MANAGER */}
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
              <div style={{fontSize:12,color:c.published?T.a:T.y,fontWeight:700}}>{c.published?"Published":"Draft"}</div>
              <div style={{fontSize:11,color:T.m}}>{c.created_at?new Date(c.created_at).toLocaleDateString():"—"}</div>
            </div>
          </div>
        ):(
          <div style={{textAlign:"center",padding:"24px",color:T.m}}>No content published yet</div>
        )}
      </div>
    </>
  );

  // ━━━ PROFILE VIEW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const ProfileView=()=>{
    if(!profileEdit)return null;
    const inSt={width:"100%",padding:"13px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:15,outline:"none",fontFamily:"inherit",boxSizing:"border-box"};
    const roSt={width:"100%",padding:"13px 16px",borderRadius:8,background:T.bg,border:`1px solid ${T.b}`,color:T.m,fontSize:15};
    const FI=({label,field,placeholder})=>(
      <div>
        <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>{label}</div>
        <input value={profileEdit[field]||""} onChange={ev=>setProfileEdit(p=>({...p,[field]:ev.target.value}))} placeholder={placeholder||""} style={inSt}/>
      </div>
    );
    const FD=({label,value})=>(
      <div>
        <div style={{fontSize:11,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>{label}</div>
        <div style={roSt}>{value||"—"}</div>
      </div>
    );
    return(
      <div style={{maxWidth:640,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:28}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,#3B82F6,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:800,flexShrink:0}}>{profile?.full_name?.charAt(0).toUpperCase()||authUser?.email?.charAt(0).toUpperCase()||"?"}</div>
          <div>
            <div style={{fontSize:22,fontWeight:800,color:T.t}}>{profile?.full_name||"Your Name"}</div>
            <div style={{fontSize:14,color:T.s,marginTop:2}}>{authUser?.email}</div>
          </div>
        </div>

        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"28px 30px",marginBottom:20}}>
          <div style={{fontSize:17,fontWeight:700,color:T.t,marginBottom:20}}>Account Info</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}} className="form-grid">
            <FI label="FULL NAME" field="full_name" placeholder="Your Name"/>
            <FI label="PHONE" field="phone" placeholder="(555) 123-4567"/>
            <FI label="BROKERAGE" field="brokerage" placeholder="LPT Realty"/>
            <FI label="LICENSE NUMBER" field="license_number" placeholder="RE123456"/>
            <FI label="LICENSE STATE" field="license_state" placeholder="TX"/>
            <FI label="MARKET" field="market" placeholder="Austin, TX"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24,opacity:0.6}} className="form-grid">
            <FD label="EMAIL (read-only)" value={authUser?.email}/>
            <FD label="ROLE" value={profile?.role}/>
            <FD label="PLAN" value={profile?.plan}/>
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
  return(
    <div style={{minHeight:"100vh",background:T.bg,color:T.t,fontFamily:"'SF Pro Display',-apple-system,sans-serif",display:"flex"}}>
      <style>{`
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
textarea::placeholder,input::placeholder{color:${T.m}}
html,body{overflow-x:hidden}
*{box-sizing:border-box}
.leads-desktop{display:block}
.leads-mobile{display:none}

@media(min-width:769px) and (max-width:1200px){
  .content-grid{grid-template-columns:repeat(2,1fr)!important}
}

@media(max-width:768px){

/* ── Sidebar becomes fixed overlay ── */
.app-sidebar{
  position:fixed!important;left:0!important;top:0!important;bottom:0!important;
  transform:translateX(-100%);transition:transform 0.25s ease;
  z-index:1000;width:72px!important;height:100vh
}
.app-sidebar.open{transform:translateX(0)!important}
.app-sidebar .logo-btn{width:36px!important;height:36px!important;font-size:14px!important}
.app-sidebar .nav-btn{width:44px!important;height:44px!important;font-size:18px!important}

/* ── Main area fills full width ── */
.main-scroll{padding:14px 16px!important}

/* ── Show hamburger button ── */
.hamburger-btn{display:flex!important}

/* ── Page header stacks ── */
.page-header{flex-direction:column!important;align-items:flex-start!important}
.page-header-actions{width:100%!important;justify-content:flex-start!important;flex-wrap:wrap!important}

/* ── KPI cards 2×2 ── */
.kpi-grid{grid-template-columns:1fr 1fr!important;gap:10px!important}
.kpi-card{padding:12px!important;gap:8px!important;min-width:0!important}
.kpi-icon{width:36px!important;height:36px!important;font-size:16px!important;flex-shrink:0!important}
.kpi-val{font-size:22px!important}
.kpi-label{font-size:10px!important;letter-spacing:1px!important}
.kpi-sub{font-size:11px!important}

/* ── Quick actions 2×2 ── */
.quick-grid{grid-template-columns:1fr 1fr!important;gap:8px!important}
.quick-grid>div{padding:12px 10px!important;gap:8px!important}
.quick-grid>div span:first-child{font-size:20px!important}
.quick-grid>div span:last-child{font-size:13px!important}

/* ── Content grid single column ── */
.content-grid{grid-template-columns:1fr!important}

/* ── Content header controls ── */
.content-ctrl-row{flex-direction:column!important;align-items:stretch!important}
.content-ctrl-row input,.content-ctrl-row>div{width:100%!important;box-sizing:border-box!important}

/* ── Layout grids ── */
.two-col{grid-template-columns:1fr!important}
.three-col{grid-template-columns:1fr!important}
.four-col{grid-template-columns:1fr!important}
.section-card{padding:16px 18px!important}
.section-title{font-size:16px!important}
.page-title{font-size:22px!important}

/* ── Lead views ── */
.lead-header h1{font-size:22px!important}
.lead-tabs{overflow-x:auto}
.lead-tabs>div{padding:10px 14px!important;font-size:13px!important;white-space:nowrap}

/* ── Pipeline kanban ── */
.kanban-wrap{flex-direction:column!important}
.kanban-wrap>div{min-width:100%!important}

/* ── CRM table ── */
.crm-table{font-size:13px!important}
.crm-table td,.crm-table th{padding:10px 8px!important}

/* ── Modals ── */
.modal-box{width:90vw!important;max-width:400px!important;padding:16px 18px!important}
.modal-box .form-grid{grid-template-columns:1fr!important}

/* ── Touch targets ── */
.nav-btn,.hamburger-btn{min-height:44px!important;min-width:44px!important}

/* ── Recent leads: show cards, hide table ── */
.leads-desktop{display:none!important}
.leads-mobile{display:block!important}

/* ── Content header: stack title + controls vertically ── */
.content-header-outer{flex-direction:column!important;align-items:stretch!important;gap:10px!important}
.content-ctrl-row{width:100%!important}

/* ── Hide new-lead button + lead count on mobile ── */
.page-header-actions{display:none!important}

/* ── AskLivi bar: single column ── */
.ask-livi-grid{grid-template-columns:1fr!important}

/* ── Pipeline stats: stay 4-across but tighter ── */
.pipe-stats{gap:4px!important}
.pipe-stats>div{padding:8px 4px!important}
.pipe-stats>div>div:first-child{font-size:18px!important}
.pipe-stats>div>div:last-child{font-size:9px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}

/* ── Pipeline toolbar: full-width stack ── */
.pipe-toolbar{flex-direction:column!important;align-items:stretch!important;gap:8px!important}
.pipe-toolbar input,.pipe-toolbar select{width:100%!important}
.pipe-spacer{display:none!important}

/* ── Agent directory: search button full-width ── */
.agent-search-btns{width:100%!important}
.agent-search-btns>div:first-child{flex:1!important}

/* ── CRM toolbar: full-width stack ── */
.crm-toolbar{flex-direction:column!important;align-items:stretch!important;gap:8px!important}
.crm-toolbar input,.crm-toolbar select{width:100%!important}
.crm-spacer{display:none!important}

/* ── Generate button: center content ── */
.generate-btn{justify-content:center!important}

/* ── Content stats: equal column widths ── */
.kpi-grid>div{min-width:0!important}

/* ── Content filter tabs: fill row equally ── */
.content-filter-tabs{gap:0!important}
.content-filter-tabs>div{flex:1!important}

/* ── Agent directory: Newly Licensed label on its own line ── */
.newly-licensed-row>div:first-child{width:100%!important}

/* ── Word wrap ── */
*{word-break:break-word;overflow-wrap:anywhere}

}`}</style>

      {/* MOBILE BACKDROP */}
      {sidebarOpen&&<div className="sidebar-backdrop" onClick={()=>{setSidebarOpen(false);setProfileMenuOpen(false);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:999}}/>}

      {/* PROFILE MENU BACKDROP (transparent, closes menu when clicking outside) */}
      {profileMenuOpen&&<div onClick={()=>setProfileMenuOpen(false)} style={{position:"fixed",inset:0,zIndex:1099}}/>}

      {/* PROFILE POPUP MENU */}
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
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",cursor:"pointer",fontSize:14,fontWeight:600,color:T.s}} onMouseOver={ev=>ev.currentTarget.style.background=T.bh} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
            <span>⚙️</span><span>Settings</span>
          </div>
          <div style={{height:1,background:T.b,margin:"4px 0"}}/>
          <div onClick={()=>{supabase.auth.signOut().then(()=>{window.location.href="/login";});}} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",cursor:"pointer",fontSize:14,fontWeight:600,color:T.r}} onMouseOver={ev=>ev.currentTarget.style.background=T.r+"15"} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
            <span>🚪</span><span>Logout</span>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className={`app-sidebar${sidebarOpen?" open":""}`} style={{width:80,background:T.side,borderRight:`1px solid ${T.b}`,display:"flex",flexDirection:"column",alignItems:"center",padding:"14px 0",flexShrink:0}}>
        {/* Top: logo + nav */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,width:"100%"}}>
          <div style={{width:44,height:44,borderRadius:9,marginBottom:6,background:"linear-gradient(135deg,#00E5A0,#3B82F6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:11,letterSpacing:"-0.5px",lineHeight:1}}><span style={{color:"#fff"}}>rkrt</span><span style={{color:"#000"}}>.in</span></div>
          {[["home","⬡"],["pipeline","◎"],["crm","📋"],["agents","🔍"],["content","📝"]].map(([id,ic])=>
            <div key={id} onClick={()=>{setViewWithHistory(id);setSidebarOpen(false);setProfileMenuOpen(false);}} title={id} className="nav-btn" style={{width:48,height:48,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:20,background:view===id?T.am:"transparent",color:view===id?T.a:T.m,transition:"all 0.12s"}}>{ic}</div>
          )}
        </div>
        {/* Bottom: refresh + profile (pinned) */}
        <div style={{marginTop:"auto",display:"flex",flexDirection:"column",alignItems:"center",gap:8,paddingTop:14}}>
          <div onClick={load} style={{width:44,height:44,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:17,color:loading?T.a:T.m}}>{loading?"⟳":"↻"}</div>
          <div onClick={()=>setProfileMenuOpen(v=>!v)} title="Account" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer",padding:"8px 4px",borderRadius:8,background:profileMenuOpen?T.bh:"transparent",transition:"background 0.12s",width:64}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:T.a,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#000"}}>{profile?.full_name?.charAt(0).toUpperCase()||authUser?.email?.charAt(0).toUpperCase()||"?"}</div>
            <div style={{fontSize:9,color:T.m,maxWidth:56,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"center",letterSpacing:0.3}}>{profile?.full_name?.split(" ")[0]||"Account"}</div>
          </div>
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="main-scroll" style={{flex:1,overflow:"auto",padding:(view==="lead"||view==="addlead")?"0":"24px 32px"}}>
        {view!=="lead"&&view!=="addlead"&&<div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div className="hamburger-btn" onClick={()=>setSidebarOpen(v=>!v)} style={{display:"none",width:44,height:44,borderRadius:8,alignItems:"center",justifyContent:"center",fontSize:22,cursor:"pointer",background:T.card,border:`1px solid ${T.b}`,color:T.t,flexShrink:0}}>☰</div>
            <h1 className="page-title" style={{fontSize:32,fontWeight:800,margin:0}}>{view==="home"?"Command Center":view==="pipeline"?"Lead Pipeline":view==="crm"?"Leads CRM":view==="agents"?"Agent Directory":view==="content"?"Today's Content":view==="admin"?"Admin":view==="profile"?"My Profile":"rkrt.in"}</h1>
          </div>
        </div>}
        {view==="home"&&<><AskLiviBar prompts={[["🎯","Who to Call",`Who should I call first today? Look at my pipeline and tell me the highest priority lead.`,T.a],["📱","Draft Outreach",`Draft a recruiting DM for my hottest lead in the pipeline.`,T.bl],["🔍","Find Agents",`Find me 5 real estate agents in my target markets who might be looking to switch brokerages.`,T.p],["📋","Game Plan",`Create my recruiting game plan for this week based on my current pipeline.`,T.y]]}/><Dash/></>}
        {view==="pipeline"&&<><AskLiviBar prompts={[["📱","Draft Outreach",`Look at my pipeline and draft outreach for my highest priority lead.`,T.a],["🔄","Follow-ups",`Which leads need follow-up? Draft messages for each.`,T.bl],["🎯","Strategy",`Analyze my pipeline and suggest what I should focus on.`,T.p],["📊","Conversion Tips",`Based on my pipeline, what can I do to improve conversion?`,T.y]]}/><Pipeline/></>}
        {view==="crm"&&<><AskLiviBar prompts={[["🔍","Find Prospects",`Find me 5 real estate agents who might be looking to switch brokerages.`,T.a],["📊","Score Leads",`Score my current leads and tell me who to prioritize.`,T.bl],["📱","Outreach Plan",`Create an outreach plan for all my new and researched leads.`,T.p],["🎯","Market Analysis",`Which markets should I be targeting for recruiting?`,T.y]]}/><CRM/></>}
        {view==="agents"&&<AgentDirectory userId={authUser?.id}/>}
        {view==="content"&&<ContentTab userId={authUser?.id}/>}
        {view==="admin"&&profile?.role==="owner"&&<AdminView/>}
        {view==="profile"&&<ProfileView/>}
        {view==="lead"&&selLead&&<LeadPage lead={selLead} onBack={()=>{setSelLead(null);setViewWithHistory("pipeline");}} onAskInline={askLiviInline} inlineResponse={inlineResponse} inlineLoading={inlineLoading} userId={authUser?.id}/>}
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
