import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const SUPA = "https://zuwvovjhrkzlpdxcpsud.supabase.co/rest/v1";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1d3Zvdmpocmt6bHBkeGNwc3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNTMyOTAsImV4cCI6MjA4NzcyOTI5MH0.SmOAe8yeEa79hrSkwMLLq5z70Fmoxznvhs0YNOxa-no";

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
function LeadPage({lead,onBack,onAsk}){
  const [tab,setTab]=useState("overview");
  const [notes,setNotes]=useState(lead._notes||[]);
  const [newNote,setNewNote]=useState("");
  const [commLog,setCommLog]=useState(lead._comms||[]);
  const [commType,setCommType]=useState("call");
  const [commNote,setCommNote]=useState("");

  if(!lead)return null;

  const addNote=()=>{
    if(!newNote.trim())return;
    setNotes(p=>[{text:newNote.trim(),date:new Date().toISOString(),id:Date.now()},...p]);
    setNewNote("");
  };

  const addComm=()=>{
    if(!commNote.trim())return;
    setCommLog(p=>[{type:commType,note:commNote.trim(),date:new Date().toISOString(),id:Date.now()},...p]);
    setCommNote("");
  };

  const commIcons={call:"📞",text:"💬",email:"📧",meeting:"🤝",dm:"📱",linkedin:"💼"};
  const F=({l,v,link})=>v?<div style={{marginBottom:16}}><div style={{fontSize:12,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:4}}>{l}</div>{link?<a href={link} style={{fontSize:16,color:T.bl,textDecoration:"none"}}>{v}</a>:<div style={{fontSize:16,color:T.t}}>{v}</div>}</div>:null;

  const tabs=[["overview","Overview"],["notes","Notes"],["comms","Communication"],["dossier","Intel"],["livi","Ask LIVI"]];

  return(
    <div style={{flex:1,overflow:"auto",padding:"24px 32px"}}>
      {/* Header */}
      <div onClick={onBack} style={{display:"inline-flex",alignItems:"center",gap:8,fontSize:15,color:T.s,cursor:"pointer",marginBottom:20}}>← Back to Pipeline</div>
      
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:32,fontWeight:800,margin:"0 0 6px"}}>{lead.first_name} {lead.last_name}</h1>
          <div style={{display:"flex",alignItems:"center",gap:12,fontSize:16,color:T.s}}>
            <span>{lead.market||"Unknown Market"}</span>
            <span style={{color:T.m}}>·</span>
            <span>{lead.brokerage||"Unknown Brokerage"}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <TPill t={lead.tier}/>
          <UPill u={lead.urgency}/>
        </div>
      </div>

      {/* Pipeline Stage Bar */}
      <div style={{display:"flex",gap:6,marginBottom:24}}>{STAGES.map(s=>
        <div key={s.id} style={{flex:1,padding:"10px 0",borderRadius:6,textAlign:"center",fontSize:13,fontWeight:700,background:lead.pipeline_stage===s.id?s.c+"20":T.d,color:lead.pipeline_stage===s.id?s.c:T.m,border:`1px solid ${lead.pipeline_stage===s.id?s.c+"30":T.b}`,cursor:"pointer"}}>{s.l}</div>
      )}</div>

      {/* Tabs */}
      <div className="lead-tabs" style={{display:"flex",gap:4,marginBottom:24,borderBottom:`1px solid ${T.b}`,paddingBottom:0}}>
        {tabs.map(([id,label])=>
          <div key={id} onClick={()=>setTab(id)} style={{padding:"12px 20px",fontSize:15,fontWeight:tab===id?700:500,color:tab===id?T.a:T.s,borderBottom:tab===id?`2px solid ${T.a}`:"2px solid transparent",cursor:"pointer",marginBottom:-1}}>{label}</div>
        )}
      </div>

      {/* ━━━ OVERVIEW TAB ━━━ */}
      {tab==="overview"&&(
        <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          {/* Contact Info */}
          <div style={{background:T.card,borderRadius:12,padding:"24px 26px",border:`1px solid ${T.b}`}}>
            <div style={{fontSize:16,fontWeight:700,color:T.t,marginBottom:16}}>📇 Contact Info</div>
            <F l="EMAIL" v={lead.email} link={lead.email?`mailto:${lead.email}`:null}/>
            <F l="PHONE" v={lead.phone} link={lead.phone?`tel:${lead.phone}`:null}/>
            <F l="BROKERAGE" v={lead.brokerage}/>
            <F l="MARKET" v={lead.market}/>
            <F l="LICENSE" v={lead.license_number}/>
            <F l="SOURCE" v={lead.source}/>
          </div>

          {/* Quick Stats */}
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              {[["TIER",lead.tier,T.p],["URGENCY",lead.urgency,{HIGH:T.r,MEDIUM:T.y,LOW:T.a}[lead.urgency]||T.s],["TREND",lead.trend||"—",T.bl]].map(([l,v,c])=>
                <div key={l} style={{background:T.card,borderRadius:10,padding:"16px 18px",border:`1px solid ${T.b}`,textAlign:"center"}}>
                  <div style={{fontSize:11,color:T.m,letterSpacing:2,marginBottom:6}}>{l}</div>
                  <div style={{fontSize:20,fontWeight:800,color:c}}>{v||"—"}</div>
                </div>
              )}
            </div>

            {lead.outreach_angle&&<div style={{background:T.as,borderRadius:10,padding:"20px 22px",border:`1px solid ${T.a}20`}}>
              <div style={{fontSize:13,color:T.a,letterSpacing:1.5,fontWeight:700,marginBottom:8}}>🎯 OUTREACH ANGLE</div>
              <div style={{fontSize:15,color:T.t,lineHeight:1.7}}>{lead.outreach_angle}</div>
            </div>}

            {lead.urgency_reason&&<div style={{background:T.y+"08",borderRadius:10,padding:"20px 22px",border:`1px solid ${T.y}20`}}>
              <div style={{fontSize:13,color:T.y,letterSpacing:1.5,fontWeight:700,marginBottom:8}}>⚡ URGENCY REASON</div>
              <div style={{fontSize:15,color:T.t,lineHeight:1.7}}>{lead.urgency_reason}</div>
            </div>}

            {/* Social Links */}
            {(lead.linkedin_url||lead.instagram_handle||lead.facebook_url||lead.youtube_channel||lead.website_url)&&(
              <div style={{background:T.card,borderRadius:10,padding:"20px 22px",border:`1px solid ${T.b}`}}>
                <div style={{fontSize:13,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:12}}>🔗 LINKS</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {lead.linkedin_url&&<a href={lead.linkedin_url} target="_blank" rel="noreferrer" style={{padding:"8px 14px",borderRadius:6,background:T.bl+"15",color:T.bl,fontSize:13,fontWeight:600,textDecoration:"none"}}>LinkedIn</a>}
                  {lead.instagram_handle&&<span style={{padding:"8px 14px",borderRadius:6,background:T.p+"15",color:T.p,fontSize:13,fontWeight:600}}>@{lead.instagram_handle}</span>}
                  {lead.facebook_url&&<a href={lead.facebook_url} target="_blank" rel="noreferrer" style={{padding:"8px 14px",borderRadius:6,background:T.bl+"15",color:T.bl,fontSize:13,fontWeight:600,textDecoration:"none"}}>Facebook</a>}
                  {lead.youtube_channel&&<a href={lead.youtube_channel} target="_blank" rel="noreferrer" style={{padding:"8px 14px",borderRadius:6,background:T.r+"15",color:T.r,fontSize:13,fontWeight:600,textDecoration:"none"}}>YouTube</a>}
                  {lead.website_url&&<a href={lead.website_url} target="_blank" rel="noreferrer" style={{padding:"8px 14px",borderRadius:6,background:T.a+"15",color:T.a,fontSize:13,fontWeight:600,textDecoration:"none"}}>Website</a>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ━━━ NOTES TAB ━━━ */}
      {tab==="notes"&&(
        <div>
          <div style={{display:"flex",gap:10,marginBottom:20}}>
            <textarea value={newNote} onChange={ev=>setNewNote(ev.target.value)} placeholder="Add a note about this lead..." rows={2} style={{flex:1,padding:"14px 18px",borderRadius:10,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:15,fontFamily:"inherit",outline:"none",resize:"none",lineHeight:1.5}}/>
            <div onClick={addNote} style={{padding:"14px 24px",borderRadius:10,background:newNote.trim()?T.am:T.d,color:newNote.trim()?T.a:T.m,fontSize:15,fontWeight:700,cursor:newNote.trim()?"pointer":"default",display:"flex",alignItems:"center"}}>Save</div>
          </div>
          {notes.length>0?notes.map(n=>
            <div key={n.id} style={{background:T.card,borderRadius:10,padding:"16px 20px",border:`1px solid ${T.b}`,marginBottom:10}}>
              <div style={{fontSize:15,color:T.t,lineHeight:1.6,marginBottom:6}}>{n.text}</div>
              <div style={{fontSize:12,color:T.m}}>{new Date(n.date).toLocaleString()}</div>
            </div>
          ):(
            <div style={{textAlign:"center",padding:"40px",color:T.m}}>
              <div style={{fontSize:28,marginBottom:8}}>📝</div>
              <div style={{fontSize:16}}>No notes yet — add your first note above</div>
            </div>
          )}
        </div>
      )}

      {/* ━━━ COMMUNICATION TAB ━━━ */}
      {tab==="comms"&&(
        <div>
          <div style={{background:T.card,borderRadius:12,padding:"20px 22px",border:`1px solid ${T.b}`,marginBottom:20}}>
            <div style={{display:"flex",gap:6,marginBottom:12}}>
              {Object.entries(commIcons).map(([k,v])=>
                <div key={k} onClick={()=>setCommType(k)} style={{padding:"8px 14px",borderRadius:6,background:commType===k?T.am:T.d,color:commType===k?T.a:T.s,fontSize:14,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>{v} {k.charAt(0).toUpperCase()+k.slice(1)}</div>
              )}
            </div>
            <div style={{display:"flex",gap:10}}>
              <input value={commNote} onChange={ev=>setCommNote(ev.target.value)} onKeyDown={ev=>{if(ev.key==="Enter")addComm();}} placeholder={`Log ${commType}...`} style={{flex:1,padding:"12px 18px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:15,fontFamily:"inherit",outline:"none"}}/>
              <div onClick={addComm} style={{padding:"12px 24px",borderRadius:8,background:commNote.trim()?T.am:T.d,color:commNote.trim()?T.a:T.m,fontSize:15,fontWeight:700,cursor:commNote.trim()?"pointer":"default"}}>Log</div>
            </div>
          </div>
          {commLog.length>0?commLog.map(c=>
            <div key={c.id} style={{display:"flex",gap:14,padding:"14px 0",borderBottom:`1px solid ${T.b}`}}>
              <div style={{width:40,height:40,borderRadius:10,background:T.card,border:`1px solid ${T.b}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{commIcons[c.type]||"📌"}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:14,fontWeight:700,color:T.t,textTransform:"capitalize"}}>{c.type}</span>
                  <span style={{fontSize:12,color:T.m}}>{new Date(c.date).toLocaleString()}</span>
                </div>
                <div style={{fontSize:15,color:T.s,lineHeight:1.5}}>{c.note}</div>
              </div>
            </div>
          ):(
            <div style={{textAlign:"center",padding:"40px",color:T.m}}>
              <div style={{fontSize:28,marginBottom:8}}>📞</div>
              <div style={{fontSize:16}}>No communication logged — log your first call, text, or email above</div>
            </div>
          )}
        </div>
      )}

      {/* ━━━ DOSSIER TAB ━━━ */}
      {tab==="dossier"&&(
        <div>
          {lead.raw_dossier?(
            <div style={{background:T.card,borderRadius:12,padding:"24px 26px",border:`1px solid ${T.b}`}}>
              <div style={{fontSize:16,fontWeight:700,color:T.t,marginBottom:16}}>🔍 Research Dossier</div>
              <pre style={{fontSize:14,color:T.s,lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0}}>{lead.raw_dossier}</pre>
            </div>
          ):(
            <div style={{textAlign:"center",padding:"40px",color:T.m}}>
              <div style={{fontSize:28,marginBottom:8}}>🔍</div>
              <div style={{fontSize:16,marginBottom:12}}>No dossier yet</div>
              <div onClick={()=>{onAsk(`Research ${lead.first_name} ${lead.last_name} in ${lead.market||"their market"}. Find their production, reviews, social media, and give me an outreach angle.`);}} style={{display:"inline-block",padding:"12px 24px",borderRadius:8,background:T.am,color:T.a,fontSize:15,fontWeight:700,cursor:"pointer"}}>🔍 Ask LIVI to Research</div>
            </div>
          )}
        </div>
      )}

      {/* ━━━ ASK LIVI TAB ━━━ */}
      {tab==="livi"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[
            ["📱","Draft outreach message",`Draft a personalized recruiting message to ${lead.first_name} ${lead.last_name}. They're at ${lead.brokerage||"unknown brokerage"} in ${lead.market||"unknown market"}.${lead.outreach_angle?" Angle: "+lead.outreach_angle:""}`],
            ["🔄","Write follow-up",`Write a follow-up message to ${lead.first_name} ${lead.last_name}. I already sent initial outreach. Make it casual and value-driven.`],
            ["📋","Create meeting prep",`Create a meeting prep sheet for my call with ${lead.first_name} ${lead.last_name}. They're at ${lead.brokerage||"unknown"} in ${lead.market||"unknown"}. Include talking points, objections, and how to close.`],
            ["🎯","Closing script",`Give me a closing script for ${lead.first_name} ${lead.last_name}. We've been talking and I need to move them to a decision.`],
            ["🔍","Deep research",`Research ${lead.first_name} ${lead.last_name} in ${lead.market||"their market"}. Find their production volume, reviews, social media, and give me an outreach angle.`],
            ["🎨","Create recruiting post",`Write a recruiting-focused social media post targeting agents in ${lead.market||"this market"} who might be looking to switch from ${lead.brokerage||"their brokerage"}.`],
            ["💡","Objection handlers",`What objections will ${lead.first_name} ${lead.last_name} likely have about switching from ${lead.brokerage||"their brokerage"} to LPT Realty? Give me responses for each.`],
            ["📊","Competitive analysis",`Compare LPT Realty vs ${lead.brokerage||"their current brokerage"} for an agent in ${lead.market||"this market"}. What's our advantage?`]
          ].map(([icon,label,q],i)=>
            <div key={i} onClick={()=>onAsk(q)} style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:10,padding:"18px 20px",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}
              onMouseOver={ev=>ev.currentTarget.style.borderColor=T.bh} onMouseOut={ev=>ev.currentTarget.style.borderColor=T.b}>
              <span style={{fontSize:22}}>{icon}</span>
              <span style={{fontSize:15,color:T.s,fontWeight:600}}>{label}</span>
            </div>
          )}
        </div>
      )}
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
          ["➕","Add Lead",()=>setShowAdd(true),T.a],
          ["📱","Draft Outreach",()=>askLivi("Who should I reach out to next? Pick my best lead and draft me a message."),T.bl],
          ["🔍","Find Agents",()=>askLivi("Find me 5 real estate agents in my target markets who might be looking to switch brokerages. Focus on agents showing frustration or high production at competing brokerages."),T.p],
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
                <div key={`m${i}`} onClick={()=>{setSelLead(l);setView("lead");}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:8,background:T.p+"08",border:`1px solid ${T.p}15`,marginBottom:8,cursor:"pointer"}}>
                  <span style={{fontSize:18}}>🤝</span>
                  <div style={{flex:1}}><div style={{fontSize:15,fontWeight:600,color:T.t}}>Prep for {l.first_name} {l.last_name}</div><div style={{fontSize:13,color:T.s}}>Meeting booked — prep your talking points</div></div>
                  <span style={{fontSize:13,color:T.p,fontWeight:600}}>Prep →</span>
                </div>
              )}
              {needsFollowUp.slice(0,3).map((l,i)=>
                <div key={`f${i}`} onClick={()=>{setSelLead(l);setView("lead");}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:8,background:T.r+"08",border:`1px solid ${T.r}15`,marginBottom:8,cursor:"pointer"}}>
                  <span style={{fontSize:18}}>🔄</span>
                  <div style={{flex:1}}><div style={{fontSize:15,fontWeight:600,color:T.t}}>Follow up with {l.first_name} {l.last_name}</div><div style={{fontSize:13,color:T.s}}>{l.market} · {ago(l.created_at)} since last touch</div></div>
                  <span style={{fontSize:13,color:T.r,fontWeight:600}}>Overdue</span>
                </div>
              )}
              {needsResearch.slice(0,3).map((l,i)=>
                <div key={`r${i}`} onClick={()=>{setSelLead(l);setView("lead");}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:8,background:T.bl+"08",border:`1px solid ${T.bl}15`,marginBottom:8,cursor:"pointer"}}>
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
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><span style={{fontSize:18,fontWeight:700,color:T.t}}>🔥 Hot Leads</span><span onClick={()=>setView("pipeline")} style={{fontSize:14,color:T.s,cursor:"pointer"}}>All →</span></div>
          {leads.filter(l=>l.urgency==="HIGH"||l.urgency==="MEDIUM").sort((a,b)=>({HIGH:0,MEDIUM:1}[a.urgency]||2)-({HIGH:0,MEDIUM:1}[b.urgency]||2)).slice(0,5).map((l,i)=>
            <div key={i} onClick={()=>{setSelLead(l);setView("lead");}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,marginBottom:8,cursor:"pointer"}}
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
          <span onClick={()=>setView("pipeline")} style={{fontSize:14,color:T.s,cursor:"pointer"}}>View All →</span>
        </div>
        {leads.length>0 ? (
          <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Name","Market","Brokerage","Tier","Urgency","Stage","Added"].map(h=>
              <th key={h} style={{textAlign:"left",padding:"12px 14px",fontSize:12,fontWeight:700,color:T.m,letterSpacing:1.5,borderBottom:`1px solid ${T.b}`}}>{h}</th>
            )}</tr></thead>
            <tbody>{leads.slice(0,6).map((l,i)=>
              <tr key={i} onClick={()=>{setSelLead(l);setView("lead");}} style={{borderBottom:`1px solid ${T.b}`,cursor:"pointer"}} onMouseOver={ev=>ev.currentTarget.style.background=T.d} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
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
        <div onClick={()=>{setSelLead(l);setView("lead");}} style={{cursor:"pointer"}}>
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
              <td onClick={()=>{setSelLead(l);setView("lead");}} style={{padding:"14px",fontSize:16,fontWeight:600,color:T.t,cursor:"pointer"}}>{l.first_name} {l.last_name}</td>
              <td style={{padding:"14px",fontSize:15,color:T.s}}>{l.market}</td>
              <td style={{padding:"14px",fontSize:15,color:l.brokerage?.includes("LPT")?T.a:T.t}}>{l.brokerage?.substring(0,22)}</td>
              <td style={{padding:"14px"}}><TPill t={l.tier}/></td>
              <td style={{padding:"14px"}}><UPill u={l.urgency}/></td>
              <td style={{padding:"14px"}}><Pill text={l.pipeline_stage?.replace(/_/g," ")||"—"} color={STAGES.find(s=>s.id===l.pipeline_stage)?.c||T.s}/></td>
              <td style={{padding:"14px",fontSize:14,color:contactColor,fontWeight:daysSince>7?700:400}}>{daysSince!==null?`${daysSince}d ago`:"Never"}</td>
              <td style={{padding:"14px"}}>{act&&<span onClick={()=>askLivi(act.q)} style={{fontSize:14,color:T.a,cursor:"pointer",fontWeight:600}}>{act.icon} {act.label}</span>}</td>
            </tr>
          );
        })}</tbody></table></div>
      )}

      {/* ━━━ FULL CRM TABLE ━━━ Always visible */}
      <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px",marginTop:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontSize:18,fontWeight:700,color:T.t}}>📋 All Leads</span>
          <span style={{fontSize:14,color:T.s}}>{pipeLeads.length} total</span>
        </div>
        {pipeLeads.length>0 ? (
          <div style={{overflowX:"auto"}}>
          <table className="crm-table" style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
            <thead><tr>{["Name","Email","Phone","Market","Brokerage","Tier","Urgency","Stage","Added","Action"].map(h=>
              <th key={h} style={{textAlign:"left",padding:"12px 14px",fontSize:12,fontWeight:700,color:T.m,letterSpacing:1.5,borderBottom:`1px solid ${T.b}`,whiteSpace:"nowrap"}}>{h}</th>
            )}</tr></thead>
            <tbody>{pipeLeads.map((l,i)=>{
              const act=stageAction(l);
              return(
                <tr key={i} style={{borderBottom:`1px solid ${T.b}`}} onMouseOver={ev=>ev.currentTarget.style.background=T.d} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
                  <td onClick={()=>{setSelLead(l);setView("lead");}} style={{padding:"14px",fontSize:15,fontWeight:600,color:T.t,cursor:"pointer",whiteSpace:"nowrap"}}>{l.first_name} {l.last_name}</td>
                  <td style={{padding:"14px",fontSize:13,color:T.bl}}>{l.email?<a href={`mailto:${l.email}`} style={{color:T.bl,textDecoration:"none"}}>{l.email.length>24?l.email.substring(0,24)+"…":l.email}</a>:"—"}</td>
                  <td style={{padding:"14px",fontSize:14,color:T.s,whiteSpace:"nowrap"}}>{l.phone||"—"}</td>
                  <td style={{padding:"14px",fontSize:14,color:T.s}}>{l.market||"—"}</td>
                  <td style={{padding:"14px",fontSize:14,color:l.brokerage?.includes("LPT")?T.a:T.t}}>{l.brokerage?.substring(0,20)||"—"}</td>
                  <td style={{padding:"14px"}}><TPill t={l.tier}/></td>
                  <td style={{padding:"14px"}}><UPill u={l.urgency}/></td>
                  <td style={{padding:"14px"}}><Pill text={l.pipeline_stage?.replace(/_/g," ")||"—"} color={STAGES.find(s=>s.id===l.pipeline_stage)?.c||T.s}/></td>
                  <td style={{padding:"14px",fontSize:13,color:T.m,whiteSpace:"nowrap"}}>{ago(l.created_at)}</td>
                  <td style={{padding:"14px"}}>{act&&<span onClick={()=>askLivi(act.q)} style={{fontSize:13,color:T.a,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>{act.icon} {act.label}</span>}</td>
                </tr>
              );
            })}</tbody>
          </table>
          </div>
        ) : (
          <div style={{textAlign:"center",padding:"40px 20px"}}>
            <div style={{fontSize:28,marginBottom:8}}>📭</div>
            <div style={{fontSize:16,color:T.s}}>No leads match your filters</div>
          </div>
        )}
      </div>

      {/* Quick Add Modal */}
      {showAdd&&(
        <div style={{position:"fixed",inset:0,zIndex:90,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={()=>setShowAdd(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}}/>
          <div className="modal-box" style={{position:"relative",width:420,background:T.side,borderRadius:12,border:`1px solid ${T.b}`,padding:"20px 22px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
              <span style={{fontSize:19,fontWeight:800,color:T.t}}>Quick Add Lead</span>
              <span onClick={()=>setShowAdd(false)} style={{cursor:"pointer",color:T.s}}>✕</span>
            </div>
            <div className="form-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <input autoComplete="off" value={newLead.first_name} onChange={ev=>setNewLead(p=>({...p,first_name:ev.target.value}))} placeholder="First Name" style={{padding:"14px 16px",borderRadius:8,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit"}}/>
              <input autoComplete="off" value={newLead.last_name} onChange={ev=>setNewLead(p=>({...p,last_name:ev.target.value}))} placeholder="Last Name" style={{padding:"14px 16px",borderRadius:8,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit"}}/>
              <input autoComplete="off" value={newLead.phone} onChange={ev=>setNewLead(p=>({...p,phone:ev.target.value}))} placeholder="Phone" style={{padding:"14px 16px",borderRadius:8,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit"}}/>
              <input autoComplete="off" value={newLead.email} onChange={ev=>setNewLead(p=>({...p,email:ev.target.value}))} placeholder="Email" style={{padding:"14px 16px",borderRadius:8,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit"}}/>
              <input autoComplete="off" value={newLead.market} onChange={ev=>setNewLead(p=>({...p,market:ev.target.value}))} placeholder="Market" style={{padding:"14px 16px",borderRadius:8,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit"}}/>
              <input autoComplete="off" value={newLead.brokerage} onChange={ev=>setNewLead(p=>({...p,brokerage:ev.target.value}))} placeholder="Current Brokerage" style={{padding:"14px 16px",borderRadius:8,background:T.card,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit"}}/>
            </div>
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
  };

  // ━━━ RENDER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return(
    <div style={{minHeight:"100vh",background:T.bg,color:T.t,fontFamily:"'SF Pro Display',-apple-system,sans-serif",display:"flex"}}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}textarea::placeholder,input::placeholder{color:${T.m}}
@media(max-width:768px){
.chat-sidebar{display:none!important}
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
        {[["home","⬡"],["pipeline","◎"],["chat","💬"]].map(([id,ic])=>
          <div key={id} onClick={()=>{setView(id);if(id==="chat")setChatWide(true);else setChatWide(false);}} title={id} className="nav-btn" style={{width:48,height:48,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:20,background:view===id?T.am:"transparent",color:view===id?T.a:T.m,transition:"all 0.12s"}}>{ic}</div>
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
          {/* Dashboard / Pipeline / Lead Detail */}
          <div className="main-scroll" style={{flex:1,overflow:"auto",padding:view==="lead"?"0":"24px 32px"}}>
            {view!=="lead"&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,padding:view==="lead"?"24px 32px 0":0}}>
              <h1 className="page-title" style={{fontSize:32,fontWeight:800,margin:0}}>{view==="home"?"Command Center":"Lead Pipeline"}</h1>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                {view==="home"&&<div onClick={()=>setShowAdd(true)} style={{padding:"12px 20px",borderRadius:8,background:T.am,fontSize:15,fontWeight:700,color:T.a,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>+ New Lead</div>}
                <div style={{fontSize:14,color:leads.length>0?T.a:T.r,fontWeight:600}}>{loading?"⟳ Loading...":leads.length>0?`✓ ${leads.length} leads`:"✕ No data"}</div>
              </div>
            </div>}
            {view==="home"&&<Dash/>}
            {view==="pipeline"&&<Pipeline/>}
            {view==="lead"&&selLead&&<LeadPage lead={selLead} onBack={()=>{setSelLead(null);setView("pipeline");}} onAsk={(q)=>{askLivi(q);setView("home");}}/>}
          </div>

          {/* Chat Sidebar */}
          <div className="chat-sidebar" style={{width:420,borderLeft:`1px solid ${T.b}`,display:"flex",flexDirection:"column",background:T.bg,flexShrink:0}}>
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

    </div>
  );
}
