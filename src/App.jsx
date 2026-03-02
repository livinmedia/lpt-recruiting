import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const SUPA = "https://zuwvovjhrkzlpdxcpsud.supabase.co/rest/v1";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1d3Zvdmpocmt6bHBkeGNwc3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2MTI4OTAsImV4cCI6MjA1NjE4ODg5MH0.V4GsJyyMnOHaEwSsfGgttX3JqgTRwMFJNOxOeOSYdJM";

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

async function sq(tbl,p=""){try{const r=await fetch(`${SUPA}/${tbl}?${p}`,{headers:{apikey:KEY,Authorization:`Bearer ${KEY}`}});return r.ok?await r.json():[];}catch{return[];}}

function Pill({text,color}){return <span style={{fontSize:14,fontWeight:700,padding:"4px 10px",borderRadius:4,background:color+"18",color,letterSpacing:0.4}}>{text}</span>;}
function UPill({u}){return <Pill text={u||"—"} color={{HIGH:T.r,MEDIUM:T.y,LOW:T.a}[u]||T.s}/>;}
function TPill({t}){return <span style={{fontSize:15,fontWeight:600,color:{Elite:T.p,Strong:T.a,Mid:T.bl,Building:T.y,New:T.s}[t]||T.s}}>{t||"—"}</span>;}
function Dot({c}){return <span style={{width:8,height:8,borderRadius:"50%",background:c,boxShadow:`0 0 5px ${c}`,display:"inline-block",flexShrink:0}}/>;}

function Gauge({score}){
  const r=44,c=Math.PI*r,o=c-(score/100)*c,col=score>=70?T.a:score>=40?T.y:T.r;
  return <div style={{textAlign:"center"}}><svg width="160" height="96" viewBox="0 0 100 60"><path d="M 6 56 A 44 44 0 0 1 94 56" fill="none" stroke={T.m} strokeWidth="5" strokeLinecap="round"/><path d="M 6 56 A 44 44 0 0 1 94 56" fill="none" stroke={col} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={o} style={{transition:"all 0.8s"}}/><text x="50" y="44" textAnchor="middle" fill={T.t} fontSize="20" fontWeight="800">{score}</text><text x="50" y="56" textAnchor="middle" fill={col} fontSize="7" fontWeight="700">{score>=70?"STRONG":score>=40?"BUILDING":"WEAK"}</text></svg></div>;
}

// ━━━ LEAD PANEL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function LeadPanel({lead,onClose,onAsk}){
  if(!lead)return null;
  const F=({l,v})=>v?<div style={{marginBottom:14}}><div style={{fontSize:12,color:T.m,letterSpacing:1}}>{l}</div><div style={{fontSize:16,color:T.t}}>{v}</div></div>:null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:100,display:"flex"}}>
      <div onClick={onClose} style={{flex:1,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}}/>
      <div style={{width:480,background:T.side,borderLeft:`1px solid ${T.b}`,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"22px 24px",borderBottom:`1px solid ${T.b}`}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <div><div style={{fontSize:22,fontWeight:800,color:T.t}}>{lead.first_name} {lead.last_name}</div><div style={{fontSize:15,color:T.s}}>{lead.market} · {lead.brokerage?.substring(0,28)}</div></div>
            <div onClick={onClose} style={{cursor:"pointer",color:T.s}}>✕</div>
          </div>
          <div style={{display:"flex",gap:10,marginTop:10}}>{STAGES.map(s=><div key={s.id} style={{flex:1,padding:"6px 0",borderRadius:3,textAlign:"center",fontSize:12,fontWeight:700,background:lead.pipeline_stage===s.id?s.c+"20":T.d,color:lead.pipeline_stage===s.id?s.c:T.m}}>{s.l.toUpperCase()}</div>)}</div>
        </div>
        <div style={{flex:1,overflow:"auto",padding:"24px 32px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
            {[["TIER",lead.tier],["URGENCY",lead.urgency],["TREND",lead.trend]].map(([l,v])=><div key={l} style={{background:T.card,borderRadius:6,padding:"10px 14px",border:`1px solid ${T.b}`}}><div style={{fontSize:12,color:T.m,letterSpacing:1}}>{l}</div><div style={{fontSize:17,fontWeight:800,color:T.t}}>{v||"—"}</div></div>)}
          </div>
          <div style={{background:T.card,borderRadius:7,padding:"14px 18px",border:`1px solid ${T.b}`,marginBottom:18,display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
            <F l="EMAIL" v={lead.email}/><F l="PHONE" v={lead.phone}/><F l="BROKERAGE" v={lead.brokerage}/><F l="LICENSE" v={lead.license_number}/>
          </div>
          {lead.outreach_angle&&<div style={{background:T.as,borderRadius:7,padding:"14px 18px",border:`1px solid ${T.a}15`,marginBottom:18}}><div style={{fontSize:13,color:T.a,letterSpacing:1.5,fontWeight:700,marginBottom:20}}>🎯 OUTREACH ANGLE</div><div style={{fontSize:16,color:T.t,lineHeight:1.6}}>{lead.outreach_angle}</div></div>}
          {lead.urgency_reason&&<div style={{background:T.y+"08",borderRadius:7,padding:"14px 18px",border:`1px solid ${T.y}15`,marginBottom:18}}><div style={{fontSize:13,color:T.y,letterSpacing:1.5,fontWeight:700,marginBottom:20}}>⚡ URGENCY</div><div style={{fontSize:16,color:T.t,lineHeight:1.6}}>{lead.urgency_reason}</div></div>}
          <div style={{fontSize:13,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:20}}>ASK LIVI ABOUT THIS LEAD</div>
          {[`Draft outreach to ${lead.first_name}`,`Research ${lead.first_name}'s production in ${lead.market}`,`Write a post targeting ${lead.market} agents`].map((q,i)=>(
            <div key={i} onClick={()=>{onAsk(q);onClose();}} style={{padding:"12px 16px",borderRadius:6,background:T.card,border:`1px solid ${T.b}`,fontSize:15,color:T.s,cursor:"pointer",marginBottom:20,display:"flex",gap:6}}
              onMouseOver={ev=>ev.currentTarget.style.borderColor=T.bh} onMouseOut={ev=>ev.currentTarget.style.borderColor=T.b}>
              <span style={{color:T.a}}>→</span>{q}
            </div>
          ))}
          {lead.raw_dossier&&<details style={{marginTop:8}}><summary style={{fontSize:14,color:T.s,cursor:"pointer"}}>📄 Full Dossier</summary><pre style={{fontSize:14,color:T.s,lineHeight:1.5,whiteSpace:"pre-wrap",margin:"6px 0 0",background:T.card,padding:10,borderRadius:7,border:`1px solid ${T.b}`,maxHeight:250,overflow:"auto"}}>{lead.raw_dossier}</pre></details>}
        </div>
      </div>
    </div>
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
  const [msgs,setMsgs]=useState([]);
  const [inp,setInp]=useState("");
  const [busy,setBusy]=useState(false);
  const [chatWide,setChatWide]=useState(false);
  const endRef=useRef(null);

  const load=useCallback(async()=>{
    setLoading(true);
    const [l,a]=await Promise.all([sq("dazet_leads","order=created_at.desc&limit=100"),sq("dazet_agent_activity","order=created_at.desc&limit=50")]);
    setLeads(l||[]);setActivity(a||[]);setLoading(false);
  },[]);

  useEffect(()=>{load();const i=setInterval(load,45000);return()=>clearInterval(i);},[load]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const send=async()=>{
    if(!inp.trim()||busy)return;
    const txt=inp.trim();setInp("");
    const next=[...msgs,{role:"user",content:txt}];
    setMsgs(next);setBusy(true);
    try{
      let sys=SYSTEM;
      if(leads.length>0){
        sys+=`\n\nPIPELINE (${leads.length} leads):\n`+leads.slice(0,10).map(l=>`- ${l.first_name} ${l.last_name} | ${l.market} | ${l.brokerage?.substring(0,20)||"?"} | ${l.tier} | ${l.urgency} | ${l.pipeline_stage}`).join("\n");
        sys+=`\n\nAd spend: $20/day Facebook/Instagram for LPT Realty recruiting.`;
      }
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:sys,messages:next.map(m=>({role:m.role,content:m.content}))})});
      const d=await r.json();
      setMsgs(p=>[...p,{role:"assistant",content:d.content?.map(c=>c.text||"").join("\n")||"Try again."}]);
    }catch{setMsgs(p=>[...p,{role:"assistant",content:"Connection error. Try again."}]);}
    setBusy(false);
  };

  const askLivi=(q)=>{setInp(q);setView("home");};

  const total=leads.length,targets=leads.filter(l=>l.brokerage&&!l.brokerage.includes("LPT")).length,urgent=leads.filter(l=>l.urgency==="HIGH").length;
  const today=leads.filter(l=>l.created_at&&new Date(l.created_at).toDateString()===new Date().toDateString()).length;
  const apiCost=activity.reduce((s,a)=>s+parseFloat(a.cost||0),0),tokens=activity.reduce((s,a)=>s+(a.tokens_used||0),0);
  const cpl=total>0?(20/total).toFixed(2):"—";
  const pScore=Math.min(100,Math.round((total>0?25:0)+(targets>0?25:0)+(leads.some(l=>l.pipeline_stage==="outreach_sent")?25:0)+(leads.some(l=>l.pipeline_stage==="meeting_booked")?25:0)));
  const tierData=["Elite","Strong","Mid","Building","New"].map(t=>({name:t,value:leads.filter(l=>l.tier===t).length})).filter(d=>d.value>0);
  const stages=STAGES.map(s=>({...s,count:leads.filter(l=>l.pipeline_stage===s.id).length}));

  // ━━━ CHAT AREA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const ChatPanel=({wide})=>(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:T.bg}}>
      <div style={{flex:1,overflow:"auto",padding:wide?"16px 20px":"10px 14px"}}>
        {msgs.length===0&&(
          <div style={{textAlign:"center",padding:wide?"40px 20px":"20px 10px"}}>
            <div style={{width:80,height:56,borderRadius:16,background:"linear-gradient(135deg,#00E5A0,#3B82F6)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:30,marginBottom:18}}>L</div>
            <div style={{fontSize:wide?15:12,fontWeight:800,color:T.t,marginBottom:14}}>Hey, I'm LIVI</div>
            <div style={{fontSize:wide?11:10,color:T.s,maxWidth:420,margin:"0 auto",lineHeight:1.5}}>Your AI business partner. Leads, marketing, deals, goals — I handle it all.</div>
            {wide&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:16,maxWidth:500,margin:"16px auto 0"}}>
              {[["🎯","Who should I call first today?"],["🔍","Find agents leaving Keller Williams"],["📱","Draft a DM for my hottest lead"],["🎨","Write a recruiting reel script"],["💰","What's my cost per recruit so far?"],["📋","Give me 3 outreach angles for expired agents"]].map(([e,t],i)=>
                <div key={i} onClick={()=>{setInp(t);setTimeout(()=>{const el=document.querySelector('textarea');if(el){el.focus();}},50);}} style={{padding:"12px 16px",borderRadius:7,background:T.card,border:`1px solid ${T.b}`,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}
                  onMouseOver={ev=>ev.currentTarget.style.borderColor=T.bh} onMouseOut={ev=>ev.currentTarget.style.borderColor=T.b}>
                  <span style={{fontSize:19}}>{e}</span><span style={{fontSize:15,color:T.s}}>{t}</span>
                </div>
              )}
            </div>}
          </div>
        )}
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",gap:14,justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:14}}>
            {m.role==="assistant"&&<div style={{width:wide?26:22,height:wide?26:22,borderRadius:6,background:"linear-gradient(135deg,#00E5A0,#3B82F6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:wide?11:9,fontWeight:900,color:"#000",flexShrink:0,marginTop:2}}>L</div>}
            <div style={{maxWidth:wide?"75%":"85%",padding:wide?"10px 14px":"7px 10px",borderRadius:10,fontSize:wide?13:11,lineHeight:1.65,whiteSpace:"pre-wrap",background:m.role==="user"?T.am:T.card,border:`1px solid ${m.role==="user"?T.a+"20":T.b}`,color:T.t}}>{m.content}</div>
          </div>
        ))}
        {busy&&<div style={{display:"flex",gap:14,marginBottom:14}}><div style={{width:wide?26:22,height:wide?26:22,borderRadius:6,background:"linear-gradient(135deg,#00E5A0,#3B82F6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:wide?11:9,fontWeight:900,color:"#000",flexShrink:0}}>L</div><div style={{padding:"12px 18px",borderRadius:10,background:T.card,border:`1px solid ${T.b}`,fontSize:16,color:T.s}}><span style={{animation:"pulse 1.5s infinite"}}>Thinking...</span></div></div>}
        <div ref={endRef}/>
      </div>
      <div style={{padding:wide?"10px 20px 14px":"8px 14px 10px",borderTop:`1px solid ${T.b}`}}>
        <div style={{display:"flex",gap:6}}>
          <textarea value={inp} onChange={ev=>setInp(ev.target.value)} onKeyDown={ev=>{if(ev.key==="Enter"&&!ev.shiftKey){ev.preventDefault();send();}}} placeholder="Ask LIVI anything..." rows={1}
            style={{flex:1,padding:"14px 18px",borderRadius:8,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:wide?13:11,fontFamily:"inherit",outline:"none",resize:"none",lineHeight:1.4,minHeight:48,maxHeight:120}}/>
          <div onClick={send} style={{width:48,height:48,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",background:inp.trim()?T.a:T.d,color:inp.trim()?"#000":T.m,cursor:inp.trim()?"pointer":"default",fontSize:19,fontWeight:800,flexShrink:0}}>↑</div>
        </div>
      </div>
    </div>
  );

  // ━━━ DASHBOARD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const Dash=()=>(
    <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
        {[["◎","Leads",total,today>0?`+${today}`:"",T.bl],["🎯","Targets",targets,urgent>0?`${urgent} hot`:"",T.a],["💰","CPL",`$${cpl}`,"$20/day",T.y],["⚡","AI",`$${apiCost.toFixed(3)}`,`${(tokens/1000).toFixed(1)}K`,T.p]].map(([ic,l,v,s,c],i)=>
          <div key={i} style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:10,padding:"18px 20px",display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:44,height:44,borderRadius:7,background:c+"10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{ic}</div>
            <div><div style={{fontSize:13,color:T.s,letterSpacing:1.5,fontWeight:700}}>{l.toUpperCase()}</div><div style={{display:"flex",alignItems:"baseline",gap:3}}><span style={{fontSize:26,fontWeight:800,color:T.t}}>{v}</span>{s&&<span style={{fontSize:14,color:c,fontWeight:600}}>{s}</span>}</div></div>
          </div>
        )}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:14}}>
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:10,padding:"20px 22px"}}><div style={{fontSize:16,fontWeight:700,color:T.t,marginBottom:20}}>📊 Pipeline</div><Gauge score={pScore}/></div>
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:10,padding:"20px 22px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}><span style={{fontSize:16,fontWeight:700,color:T.t}}>🎯 Hot Leads</span><span onClick={()=>setView("pipeline")} style={{fontSize:14,color:T.s,cursor:"pointer"}}>All →</span></div>
          {leads.filter(l=>l.brokerage&&!l.brokerage.includes("LPT")&&l.urgency).sort((a,b)=>({HIGH:0,MEDIUM:1,LOW:2}[a.urgency]||3)-({HIGH:0,MEDIUM:1,LOW:2}[b.urgency]||3)).slice(0,3).map((l,i)=>
            <div key={i} onClick={()=>setSelLead(l)} style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",borderRadius:5,background:T.d,border:`1px solid ${T.b}`,marginBottom:20,cursor:"pointer"}}>
              <div><div style={{fontSize:15,fontWeight:600,color:T.t}}>{l.first_name} {l.last_name}</div><div style={{fontSize:13,color:T.s}}>{l.brokerage?.substring(0,18)}</div></div>
              <UPill u={l.urgency}/>
            </div>
          )}
        </div>
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:10,padding:"20px 22px"}}>
          <div style={{fontSize:16,fontWeight:700,color:T.t,marginBottom:20}}>📋 Activity</div>
          {activity.slice(0,5).map((a,i)=><div key={i} style={{display:"flex",gap:10,padding:"5px 0",alignItems:"flex-start"}}><Dot c={a.status==="success"?T.a:T.r}/><div style={{fontSize:14,color:T.t,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.description}</div><span style={{fontSize:12,color:T.m}}>{ago(a.created_at)}</span></div>)}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:10,padding:"20px 22px"}}><div style={{fontSize:16,fontWeight:700,color:T.t,marginBottom:20}}>📈 Funnel</div><ResponsiveContainer width="100%" height={150}><BarChart data={stages} layout="vertical" barSize={14}><XAxis type="number" hide/><YAxis type="category" dataKey="l" tick={{fontSize:13,fill:T.s}} width={70} axisLine={false} tickLine={false}/><Bar dataKey="count" radius={[0,4,4,0]}>{stages.map((d,i)=><Cell key={i} fill={d.c}/>)}</Bar></BarChart></ResponsiveContainer></div>
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:10,padding:"20px 22px"}}><div style={{fontSize:16,fontWeight:700,color:T.t,marginBottom:20}}>🏆 Tiers</div>{tierData.length>0?<div style={{display:"flex",alignItems:"center",gap:14}}><ResponsiveContainer width={120} height={120}><PieChart><Pie data={tierData} cx="50%" cy="50%" innerRadius={28} outerRadius={48} dataKey="value" strokeWidth={0}>{tierData.map((_,i)=><Cell key={i} fill={PC[i%PC.length]}/>)}</Pie></PieChart></ResponsiveContainer><div>{tierData.map((d,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:14,marginBottom:2}}><div style={{width:8,height:8,borderRadius:3,background:PC[i%PC.length]}}/><span style={{fontSize:14,color:T.t}}>{d.name} <span style={{color:T.s}}>{d.value}</span></span></div>)}</div></div>:<div style={{fontSize:15,color:T.m,textAlign:"center",padding:14}}>Building...</div>}</div>
      </div>

      {/* New Leads */}
      <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:10,padding:"20px 22px",marginTop:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={{fontSize:16,fontWeight:700,color:T.t}}>🆕 New Leads</span>
          <span onClick={()=>setView("pipeline")} style={{fontSize:14,color:T.s,cursor:"pointer"}}>View Pipeline →</span>
        </div>
        {leads.length>0 ? (
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Name","Market","Brokerage","Source","Tier","Urgency","Added"].map(h=>
              <th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:12,fontWeight:700,color:T.m,letterSpacing:1.5,borderBottom:`1px solid ${T.b}`}}>{h}</th>
            )}</tr></thead>
            <tbody>{leads.slice(0,8).map((l,i)=>
              <tr key={i} onClick={()=>setSelLead(l)} style={{borderBottom:`1px solid ${T.b}`,cursor:"pointer"}} onMouseOver={ev=>ev.currentTarget.style.background=T.d} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
                <td style={{padding:"12px",fontSize:15,fontWeight:600,color:T.t}}>{l.first_name} {l.last_name}</td>
                <td style={{padding:"12px",fontSize:14,color:T.s}}>{l.market||"—"}</td>
                <td style={{padding:"12px",fontSize:14,color:l.brokerage?.includes("LPT")?T.a:T.t}}>{l.brokerage?.substring(0,24)||"—"}</td>
                <td style={{padding:"12px",fontSize:14,color:T.s}}>{l.source||"Ad"}</td>
                <td style={{padding:"12px"}}><TPill t={l.tier}/></td>
                <td style={{padding:"12px"}}><UPill u={l.urgency}/></td>
                <td style={{padding:"12px",fontSize:13,color:T.m}}>{ago(l.created_at)}</td>
              </tr>
            )}</tbody>
          </table>
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
  const [showAdd,setShowAdd]=useState(false);
  const [newLead,setNewLead]=useState({first_name:"",last_name:"",phone:"",email:"",market:"",brokerage:"",notes:""});
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
        <div onClick={()=>setSelLead(l)} style={{cursor:"pointer"}}>
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
        {act&&<div onClick={()=>{askLivi(act.q);}} style={{marginTop:6,padding:"10px 14px",borderRadius:5,background:T.as,border:`1px solid ${T.a}15`,fontSize:14,fontWeight:700,color:T.a,cursor:"pointer",display:"flex",alignItems:"center",gap:14,textAlign:"center",justifyContent:"center"}}>{act.icon} {act.label}</div>}
      </div>
    );
  };

  const Pipeline=()=>(
    <>
      {/* Toolbar */}
      <div style={{display:"flex",gap:10,marginBottom:18,alignItems:"center",flexWrap:"wrap"}}>
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
        <div onClick={()=>setShowAdd(true)} style={{padding:"10px 16px",borderRadius:6,background:T.am,fontSize:15,fontWeight:700,color:T.a,cursor:"pointer"}}>+ Add Lead</div>
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
        <div style={{display:"flex",gap:10,overflow:"auto",paddingBottom:8}}>
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
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:10,padding:"20px 22px"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Name","Market","Brokerage","Tier","Urgency","Stage","Action"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 14px",fontSize:13,fontWeight:700,color:T.m,letterSpacing:1.5,borderBottom:`1px solid ${T.b}`}}>{h}</th>)}</tr></thead><tbody>{pipeLeads.map((l,i)=>{
          const act=stageAction(l);
          return(
            <tr key={i} style={{borderBottom:`1px solid ${T.b}`}} onMouseOver={ev=>ev.currentTarget.style.background=T.d} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
              <td onClick={()=>setSelLead(l)} style={{padding:"12px",fontSize:16,fontWeight:600,color:T.t,cursor:"pointer"}}>{l.first_name} {l.last_name}</td>
              <td style={{padding:"12px",fontSize:15,color:T.s}}>{l.market}</td>
              <td style={{padding:"12px",fontSize:15,color:l.brokerage?.includes("LPT")?T.a:T.t}}>{l.brokerage?.substring(0,22)}</td>
              <td style={{padding:"12px"}}><TPill t={l.tier}/></td>
              <td style={{padding:"12px"}}><UPill u={l.urgency}/></td>
              <td style={{padding:"12px"}}><Pill text={l.pipeline_stage?.replace(/_/g," ")||"—"} color={STAGES.find(s=>s.id===l.pipeline_stage)?.c||T.s}/></td>
              <td style={{padding:"12px"}}>{act&&<span onClick={()=>askLivi(act.q)} style={{fontSize:14,color:T.a,cursor:"pointer",fontWeight:600}}>{act.icon} {act.label}</span>}</td>
            </tr>
          );
        })}</tbody></table></div>
      )}

      {/* Quick Add Modal */}
      {showAdd&&(
        <div style={{position:"fixed",inset:0,zIndex:90,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={()=>setShowAdd(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}}/>
          <div style={{position:"relative",width:420,background:T.side,borderRadius:12,border:`1px solid ${T.b}`,padding:"20px 22px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
              <span style={{fontSize:19,fontWeight:800,color:T.t}}>Quick Add Lead</span>
              <span onClick={()=>setShowAdd(false)} style={{cursor:"pointer",color:T.s}}>✕</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              {[["first_name","First Name"],["last_name","Last Name"],["phone","Phone"],["email","Email"],["market","Market"],["brokerage","Current Brokerage"]].map(([k,p])=>
                <input key={k} value={newLead[k]} onChange={ev=>setNewLead(pr=>({...pr,[k]:ev.target.value}))} placeholder={p} style={{padding:"12px 16px",borderRadius:6,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit"}}/>
              )}
            </div>
            <textarea value={newLead.notes} onChange={ev=>setNewLead(pr=>({...pr,notes:ev.target.value}))} placeholder="Notes (where you met them, etc.)" rows={2} style={{width:"100%",padding:"12px 16px",borderRadius:6,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",resize:"none",marginBottom:18,boxSizing:"border-box"}}/>
            <div style={{display:"flex",gap:14,justifyContent:"flex-end"}}>
              <div onClick={()=>setShowAdd(false)} style={{padding:"12px 22px",borderRadius:7,fontSize:16,color:T.s,cursor:"pointer"}}>Cancel</div>
              <div onClick={()=>{askLivi(`I just met a new recruiting prospect: ${newLead.first_name} ${newLead.last_name}${newLead.brokerage?` from ${newLead.brokerage}`:""}${newLead.market?` in ${newLead.market}`:""}.${newLead.notes?` Notes: ${newLead.notes}`:""} Research them and give me an outreach strategy.`);setShowAdd(false);setNewLead({first_name:"",last_name:"",phone:"",email:"",market:"",brokerage:"",notes:""});}} style={{padding:"12px 22px",borderRadius:7,background:T.am,fontSize:16,fontWeight:700,color:T.a,cursor:"pointer"}}>Add & Research with LIVI</div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ━━━ RENDER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return(
    <div style={{minHeight:"100vh",background:T.bg,color:T.t,fontFamily:"'SF Pro Display',-apple-system,sans-serif",display:"flex"}}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}textarea::placeholder,input::placeholder{color:${T.m}}`}</style>

      {/* SIDEBAR */}
      <div style={{width:80,background:T.side,borderRight:`1px solid ${T.b}`,display:"flex",flexDirection:"column",alignItems:"center",padding:"14px 0",gap:14,flexShrink:0}}>
        <div style={{width:44,height:44,borderRadius:9,background:"linear-gradient(135deg,#00E5A0,#3B82F6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:18,color:"#000",marginBottom:16}}>L</div>
        {[["home","⬡"],["pipeline","◎"],["chat","💬"]].map(([id,ic])=>
          <div key={id} onClick={()=>{setView(id);if(id==="chat")setChatWide(true);else setChatWide(false);}} title={id} style={{width:48,height:48,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:20,background:view===id?T.am:"transparent",color:view===id?T.a:T.m,transition:"all 0.12s"}}>{ic}</div>
        )}
        <div style={{flex:1}}/>
        <div onClick={load} style={{width:48,height:48,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:17,color:loading?T.a:T.m}}>{loading?"⟳":"↻"}</div>
        <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#3B82F6,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,marginTop:4}}>AD</div>
      </div>

      {/* MAIN AREA */}
      {view==="chat"?(
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"18px 28px",borderBottom:`1px solid ${T.b}`,display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:32,height:32,borderRadius:7,background:"linear-gradient(135deg,#00E5A0,#3B82F6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#000"}}>L</div>
            <div><div style={{fontSize:19,fontWeight:800}}>LIVI</div><div style={{fontSize:14,color:T.s}}>Your AI business partner</div></div>
          </div>
          <ChatPanel wide={true}/>
        </div>
      ):(
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          {/* Dashboard / Pipeline */}
          <div style={{flex:1,overflow:"auto",padding:"24px 32px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h1 style={{fontSize:28,fontWeight:800,margin:0}}>{view==="home"?"Command Center":"Lead Pipeline"}</h1>
              <div style={{fontSize:13,color:T.m}}>LIVI AI · by LIVIN</div>
            </div>
            {view==="home"&&<Dash/>}
            {view==="pipeline"&&<Pipeline/>}
          </div>

          {/* Chat Sidebar */}
          <div style={{width:420,borderLeft:`1px solid ${T.b}`,display:"flex",flexDirection:"column",background:T.bg,flexShrink:0}}>
            <div style={{padding:"20px 28px",borderBottom:`1px solid ${T.b}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:36,height:36,borderRadius:5,background:"linear-gradient(135deg,#00E5A0,#3B82F6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#000"}}>L</div>
                <span style={{fontSize:17,fontWeight:700}}>LIVI</span>
              </div>
              <div onClick={()=>{setView("chat");setChatWide(true);}} style={{fontSize:14,color:T.s,cursor:"pointer"}}>Expand ↗</div>
            </div>
            <ChatPanel wide={false}/>
          </div>
        </div>
      )}

      {selLead&&<LeadPanel lead={selLead} onClose={()=>setSelLead(null)} onAsk={askLivi}/>}
    </div>
  );
}
