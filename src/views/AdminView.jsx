import { useState, useEffect, useCallback } from "react"
import T from '../lib/theme'
import { ago } from '../lib/utils'
import { CopyButton } from '../components/ui'
import AnalyticsDashboard from '../components/AnalyticsDashboard'

export default function AdminView({ supabase, authUser, profile, impersonating, setImpersonating, setRealUser, impersonateLoading, setImpersonateLoading, setViewWithHistory, setProfile, setPreviewUrl, SUPABASE_URL, SUPABASE_ANON_KEY }) {
  // ━━━ ADMIN STATE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const [adminStats,setAdminStats]=useState({users:0,leads:0,contentToday:0,agents:0});
  const [adminTab,setAdminTab]=useState("users");
  const [adminUsers,setAdminUsers]=useState([]);
  const [adminActivity,setAdminActivity]=useState([]);
  const [adminContent,setAdminContent]=useState([]);
  const [newContent,setNewContent]=useState({title:"",body:"",type:"announcement"});
  const [adminLoading,setAdminLoading]=useState(false);
  const [adminUserLeadStats, setAdminUserLeadStats] = useState({});
  const [leaderboard,setLeaderboard]=useState([]);
  const [lbRefreshing,setLbRefreshing]=useState(false);
  const [adminDetailUser,setAdminDetailUser]=useState(null);
  const [adminDetailStats,setAdminDetailStats]=useState(null);
  const [adminDetailActivity,setAdminDetailActivity]=useState([]);
  const [adminDetailLeads,setAdminDetailLeads]=useState([]);
  const [adminDetailLoading,setAdminDetailLoading]=useState(false);
  const [socialAccounts,setSocialAccounts]=useState([]);
  const [socialPosts,setSocialPosts]=useState([]);
  const [socialLoading,setSocialLoading]=useState(false);
  const [socialPostingAll,setSocialPostingAll]=useState(false);
  const [blogTab,setBlogTab]=useState("brokerage");
  const [dailyContent,setDailyContent]=useState([]);
  const [dcExpanded,setDcExpanded]=useState({});
  const [dcDate,setDcDate]=useState(new Date().toISOString().split('T')[0]);
  const [dcPlatform,setDcPlatform]=useState("All");
  const [rkrtContent,setRkrtContent]=useState([]);
  const [rkrtContentTab,setRkrtContentTab]=useState("social");
  const [rkrtGenerating,setRkrtGenerating]=useState(false);
  const [brokeragePosts,setBrokeragePosts]=useState([]);
  const [bpFilter,setBpFilter]=useState("all");
  const [bpApproving,setBpApproving]=useState({});
  const [bpTab,setBpTab]=useState("pending");
  const [bpRejectOpen,setBpRejectOpen]=useState(false);
  const [bpRejectReason,setBpRejectReason]=useState("");
  const [bpRejectingPost,setBpRejectingPost]=useState(null);

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
    const lbRes=await supabase.from('user_scores').select('*,profiles(full_name,email,avatar_url,plan,created_at)').order('activity_score',{ascending:false}).limit(20);
    setLeaderboard(lbRes.data||[]);
    const dcRes=await supabase.from('daily_content').select('*').order('content_date',{ascending:false}).limit(30);
    setDailyContent(dcRes.data||[]);
    const rkrtRes=await supabase.from('rkrt_content').select('*').order('created_at',{ascending:false}).limit(50);
    setRkrtContent(rkrtRes.data||[]);
    const bpRes=await supabase.from('brokerage_posts').select('*').order('created_at',{ascending:false}).limit(100);
    setBrokeragePosts(bpRes.data||[]);
    setAdminLoading(false);
  },[]);

  useEffect(()=>{loadAdmin();},[loadAdmin]);

  const publishContent=async()=>{
    if(!newContent.title.trim())return;
    const {error}=await supabase.from("platform_content").insert({...newContent,is_published:true});
    if(!error){setNewContent({title:"",body:"",type:"announcement"});loadAdmin();}
  };

    const tabStyle=(id)=>({padding:"10px 24px",borderRadius:20,fontSize:14,fontWeight:700,cursor:"pointer",border:"none",transition:"all 0.15s",background:adminTab===id?T.a:"transparent",color:adminTab===id?"#000":T.m});
    return(<>
      {/* Tab bar */}
      <div style={{display:"flex",gap:8,marginBottom:24,background:T.card,padding:"8px",borderRadius:24,border:`1px solid ${T.b}`,width:"fit-content"}}>
        {[["users","👥 Users"],["content","📰 Content"],["social","📱 Social"],["system","⚡ System"],["analytics","📊 Analytics"]].map(([id,label])=>
          <button key={id} onClick={()=>setAdminTab(id)} style={tabStyle(id)}>{label}</button>
        )}
      </div>

      {adminTab==="users"&&<>
      <div className="kpi-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
        {[["👥","Total Users",adminStats.users,"Platform accounts",T.bl],["🎯","Total Leads",adminStats.leads,"Across all users",T.a],["📝","Content Hub",adminStats.contentToday,"Posts generated",T.y],["🔍","Agent Directory",adminStats.agents?.toLocaleString(),"Licensed agents",T.p],["🏆","Recruited",adminStats.recruited||0,"Agents recruited",T.a],["📅","Meetings",adminStats.meetings||0,"Meetings booked",T.p],["📰","Blog Pending",adminStats.blogPending||0,"Awaiting review","#FBBF24"],["✅","Blog Published",adminStats.blogPublished||0,"Live on site",T.a]].map(([ic,l,v,s,c],i)=>
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
      </>}

      {adminTab==="content"&&<>
      <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px",marginBottom:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:18,fontWeight:700,color:T.t}}>📰 Blog & Content</div>
          <div style={{display:"flex",gap:6}}>
            {[["brokerage","Brokerage Posts"],["daily","Daily Content"]].map(([id,label])=>
              <div key={id} onClick={()=>setBlogTab(id)} style={{padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",background:blogTab===id?T.a+"18":T.d,color:blogTab===id?T.a:T.s,border:`1px solid ${blogTab===id?T.a+"40":T.b}`}}>{label}</div>
            )}
          </div>
        </div>
        {blogTab==="brokerage"&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
          {[["Pending Review",adminStats.blogPending||0,"#FBBF24"],["Approved",adminStats.blogPublished||0,T.a],["Rejected",adminStats.blogRejected||0,"#F56565"],["Total Posts",adminStats.blogTotal||0,T.t]].map(([label,val,color],i)=>
            <div key={i} onClick={()=>setPreviewUrl("https://www.rkrt.in/admin/blog")} style={{background:T.d,border:`1px solid ${T.b}`,borderRadius:10,padding:"18px 20px",cursor:"pointer",transition:"border-color 0.15s"}}>
              <div style={{fontSize:28,fontWeight:800,color}}>{adminLoading?"…":val}</div>
              <div style={{fontSize:11,color:T.m,fontWeight:700,letterSpacing:1.2,marginTop:4}}>{label.toUpperCase()}</div>
            </div>
          )}
        </div>}
        {blogTab==="daily"&&<div>
          {/* Date Navigation */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:16}}>
            <div onClick={()=>{const d=new Date(dcDate+'T12:00:00');d.setDate(d.getDate()-1);setDcDate(d.toISOString().split('T')[0]);}} style={{background:T.d,border:`1px solid ${T.b}`,borderRadius:8,color:T.s,padding:"6px 12px",cursor:"pointer",fontSize:16}}>←</div>
            <span style={{fontSize:15,fontWeight:700,color:T.t,minWidth:200,textAlign:"center"}}>{new Date(dcDate+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric',year:'numeric'})}</span>
            <div onClick={()=>{const d=new Date(dcDate+'T12:00:00');d.setDate(d.getDate()+1);setDcDate(d.toISOString().split('T')[0]);}} style={{background:T.d,border:`1px solid ${T.b}`,borderRadius:8,color:T.s,padding:"6px 12px",cursor:"pointer",fontSize:16}}>→</div>
            <div onClick={()=>setDcDate(new Date().toISOString().split('T')[0])} style={{background:T.a+"15",border:`1px solid ${T.a}30`,borderRadius:8,color:T.a,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:700}}>Today</div>
          </div>
          {/* Platform Filter */}
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            {["All","Facebook","Instagram"].map(p=>(
              <div key={p} onClick={()=>setDcPlatform(p)} style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",background:dcPlatform===p?T.a+"15":T.d,border:`1px solid ${dcPlatform===p?T.a+"30":T.b}`,color:dcPlatform===p?T.a:T.m}}>{p}</div>
            ))}
          </div>
          {/* Filtered Content */}
          {(()=>{
            const filtered=dailyContent.filter(dc=>dc.content_date===dcDate&&(dcPlatform==="All"||dc.platform===dcPlatform.toLowerCase()));
            return filtered.length>0?filtered.map((dc,i)=>{
              const expanded=dcExpanded[dc.id];
              const platformColor=dc.platform==="facebook"?"#3B82F6":dc.platform==="instagram"?"#E040FB":"#F59E0B";
              return(
              <div key={dc.id||i} style={{background:T.d,border:`1px solid ${T.b}`,borderRadius:10,padding:"16px 18px",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:4,background:platformColor+"20",color:platformColor,textTransform:"capitalize"}}>{dc.platform||"post"}</span>
                  <span style={{fontSize:12,color:T.m}}>{dc.content_date}</span>
                  {dc.is_posted&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:4,background:T.a+"20",color:T.a}}>Posted</span>}
                  {dc.theme&&<span style={{fontSize:11,color:T.s,textTransform:"capitalize"}}>{dc.theme.replace(/_/g," ")}</span>}
                </div>
                {dc.headline&&<div style={{fontSize:15,fontWeight:700,color:T.t,marginBottom:6}}>{dc.headline}</div>}
                <div style={{fontSize:13,color:T.s,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{expanded?(dc.body||dc.content||""):(dc.body||dc.content||"").substring(0,150)}{!expanded&&(dc.body||dc.content||"").length>150?"…":""}</div>
                {(dc.body||dc.content||"").length>150&&<div onClick={()=>setDcExpanded(p=>({...p,[dc.id]:!expanded}))} style={{fontSize:12,color:T.a,fontWeight:600,cursor:"pointer",marginTop:6}}>{expanded?"Show less":"Show more"}</div>}
              </div>);
            }):<div style={{textAlign:"center",padding:"40px",color:T.m}}><div style={{fontSize:28,marginBottom:8}}>📭</div>No content for this date{dcPlatform!=="All"?` on ${dcPlatform}`:""}</div>;
          })()}
        </div>}
      </div>
      </>}

      {adminTab==="users"&&<>

      {(()=>{
        const now=new Date();
        const d7=new Date(now);d7.setDate(d7.getDate()-7);
        const d14=new Date(now);d14.setDate(d14.getDate()-14);
        const d30Start=new Date(now.getFullYear(),now.getMonth(),1);
        const activeUsers=leaderboard.filter(u=>u.last_active_at&&new Date(u.last_active_at)>d7).length;
        const avgScore=leaderboard.length>0?Math.round(leaderboard.reduce((s,u)=>s+(u.accountability_score||0),0)/leaderboard.length):0;
        const totalLeadsMonth=leaderboard.reduce((s,u)=>s+(u.leads_added||0),0);
        const totalRecruits=leaderboard.reduce((s,u)=>s+(u.recruits_closed||0),0);
        const atRisk=leaderboard.filter(u=>(u.accountability_score||0)<20||(u.last_active_at&&new Date(u.last_active_at)<d14)||(u.days_active_last_30d!=null&&u.days_active_last_30d<3));
        const top3=leaderboard.slice(0,3);
        const rest=leaderboard.slice(3,10);
        const podiumColors=["#FFD700","#C0C0C0","#CD7F32"];
        const openUserDash=async(lbUser)=>{
          const prof=adminUsers.find(x=>x.id===lbUser.user_id)||(lbUser.profiles?{id:lbUser.user_id,...lbUser.profiles}:{id:lbUser.user_id});
          setAdminDetailUser(prof);setAdminDetailLoading(true);setAdminDetailStats(null);setAdminDetailActivity([]);setAdminDetailLeads([]);
          const [leads,activity,fbPosts,topLeads]=await Promise.all([
            supabase.from("leads").select("*",{count:"exact",head:true}).eq("user_id",prof.id),
            supabase.from("user_activity").select("*").eq("user_id",prof.id).order("created_at",{ascending:false}).limit(30),
            supabase.from("user_fb_posts").select("*",{count:"exact",head:true}).eq("user_id",prof.id),
            supabase.from("leads").select("first_name,last_name,brokerage,brokerage_name,interest_score").eq("user_id",prof.id).order("interest_score",{ascending:false}).limit(10),
          ]);
          setAdminDetailStats({leads:leads.count||0,enrichUsed:prof.enrichment_credits_used||0,enrichRemaining:(prof.enrichment_credits||0)-(prof.enrichment_credits_used||0),fbPosts:fbPosts.count||0,daysActive:lbUser.days_active_last_30d||0,score:lbUser.accountability_score||0});
          setAdminDetailActivity(activity.data||[]);setAdminDetailLeads(topLeads.data||[]);setAdminDetailLoading(false);
        };
        const scoreBorder=(s)=>s>=80?T.a:s>=50?T.y:s>=20?"#f97316":T.r;
        const refreshScores=async()=>{
          setLbRefreshing(true);
          for(const u of leaderboard){
            try{await supabase.rpc('recalculate_user_score',{p_user_id:u.user_id});}catch(e){console.error('Refresh score error:',u.user_id,e);}
          }
          await loadAdmin();
          setLbRefreshing(false);
        };
        return(
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px",marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <div style={{fontSize:18,fontWeight:700,color:T.t}}>🏆 User Performance Leaderboard</div>
            <div onClick={lbRefreshing?null:refreshScores} style={{padding:"8px 16px",borderRadius:8,background:lbRefreshing?T.d:T.bl+"18",color:lbRefreshing?T.m:T.bl,fontSize:13,fontWeight:700,cursor:lbRefreshing?"wait":"pointer",border:`1px solid ${lbRefreshing?T.b:T.bl+"40"}`}}>{lbRefreshing?"⏳ Refreshing…":"🔄 Refresh Scores"}</div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
            {[["👥","Active Users (7d)",activeUsers,T.bl],["📊","Avg Score",avgScore,T.a],["🎯","Leads This Month",totalLeadsMonth,T.y],["🏆","Total Recruits",totalRecruits,T.p]].map(([ic,l,v,c],i)=>
              <div key={i} style={{background:T.d,borderRadius:10,padding:"16px 18px",border:`1px solid ${T.b}`,textAlign:"center"}}>
                <div style={{fontSize:20,marginBottom:4}}>{ic}</div>
                <div style={{fontSize:24,fontWeight:800,color:c}}>{adminLoading?"…":v}</div>
                <div style={{fontSize:11,color:T.m,fontWeight:600,letterSpacing:1}}>{l.toUpperCase()}</div>
              </div>)}
          </div>

          {top3.length>0&&<div style={{display:"grid",gridTemplateColumns:top3.length===1?"1fr":top3.length===2?"1fr 1fr":"1fr 1fr 1fr",gap:16,marginBottom:24}}>
            {top3.map((u,i)=>{const sc=u.accountability_score||0;const p=u.profiles||{};return(
              <div key={u.id} onClick={()=>openUserDash(u)} style={{background:T.d,borderRadius:14,padding:"24px 20px",border:`2px solid ${podiumColors[i]}30`,textAlign:"center",position:"relative",cursor:"pointer",transition:"transform 0.15s"}} onMouseOver={ev=>ev.currentTarget.style.transform="translateY(-2px)"} onMouseOut={ev=>ev.currentTarget.style.transform="translateY(0)"}>
                <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:podiumColors[i],color:"#000",fontWeight:800,fontSize:14,padding:"4px 14px",borderRadius:20}}>#{i+1}</div>
                <div style={{fontSize:18,fontWeight:700,color:T.t,marginTop:12}}>{p.full_name||p.email||"—"}</div>
                <div style={{fontSize:12,color:T.s,marginTop:2}}>{p.email||""}</div>
                <div style={{fontSize:42,fontWeight:800,color:podiumColors[i],marginTop:12}}>{sc}</div>
                <div style={{fontSize:12,color:T.m,fontWeight:600}}>Accountability Score</div>
                {u.streak_days>0&&<div style={{marginTop:8,fontSize:13,fontWeight:700,color:T.r}}>🔥 {u.streak_days} day streak</div>}
                {u.rank_change!=null&&u.rank_change!==0&&<div style={{marginTop:6,fontSize:12,fontWeight:700,color:u.rank_change>0?T.a:T.r}}>{u.rank_change>0?`+${u.rank_change} ↑`:`${u.rank_change} ↓`}</div>}
                <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",marginTop:10}}>
                  <span style={{fontSize:11,padding:"3px 8px",borderRadius:4,background:T.bl+"15",color:T.bl,fontWeight:600}}>{u.leads_added||0} leads</span>
                  <span style={{fontSize:11,padding:"3px 8px",borderRadius:4,background:T.a+"15",color:T.a,fontWeight:600}}>{u.recruits_closed||0} recruits</span>
                </div>
              </div>);})}
          </div>}

          {rest.length>0&&<div style={{overflowX:"auto",marginBottom:24}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
              <thead><tr>{["Rank","User","Score","Leads","Tasks Done","Emails Sent","Pipeline Moves","Recruits","Days Active","Streak","Last Active"].map(h=>
                <th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:11,fontWeight:700,color:T.m,letterSpacing:1.2,borderBottom:`1px solid ${T.b}`,whiteSpace:"nowrap",background:T.side}}>{h}</th>
              )}</tr></thead>
              <tbody>{rest.map((u,i)=>{const sc=u.accountability_score||0;const p=u.profiles||{};const la=u.last_active_at?new Date(u.last_active_at):null;return(
                <tr key={u.id} onClick={()=>openUserDash(u)} style={{borderBottom:`1px solid ${T.b}`,borderLeft:`3px solid ${scoreBorder(sc)}`,cursor:"pointer"}} onMouseOver={ev=>ev.currentTarget.style.background=T.d} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
                  <td style={{padding:"10px 12px",fontSize:14,fontWeight:700,color:T.m}}>#{i+4}</td>
                  <td style={{padding:"10px 12px"}}><div style={{fontSize:13,fontWeight:600,color:T.t}}>{p.full_name||"—"}</div><div style={{fontSize:11,color:T.s}}>{p.email||""}</div></td>
                  <td style={{padding:"10px 12px",fontSize:16,fontWeight:800,color:scoreBorder(sc)}}>{sc}</td>
                  <td style={{padding:"10px 12px",fontSize:13,color:T.t}}>{u.leads_added||0}</td>
                  <td style={{padding:"10px 12px",fontSize:13,color:T.t}}>{u.tasks_completed||0}</td>
                  <td style={{padding:"10px 12px",fontSize:13,color:T.t}}>{u.emails_sent||0}</td>
                  <td style={{padding:"10px 12px",fontSize:13,color:T.t}}>{u.pipeline_moves||0}</td>
                  <td style={{padding:"10px 12px",fontSize:13,fontWeight:700,color:u.recruits_closed>0?T.a:T.m}}>{u.recruits_closed||0}</td>
                  <td style={{padding:"10px 12px",fontSize:13,color:T.t}}>{u.days_active_last_30d||0}</td>
                  <td style={{padding:"10px 12px",fontSize:13,color:u.streak_days>0?T.r:T.m,fontWeight:u.streak_days>0?700:400}}>{u.streak_days>0?`🔥 ${u.streak_days}`:"—"}</td>
                  <td style={{padding:"10px 12px",fontSize:12,color:T.m,whiteSpace:"nowrap"}}>{la?la.toLocaleDateString():"—"}</td>
                </tr>);})}</tbody>
            </table>
          </div>}

          {leaderboard.length===0&&!adminLoading&&<div style={{textAlign:"center",padding:"40px",color:T.m}}><div style={{fontSize:28,marginBottom:8}}>🏆</div><div style={{fontSize:14}}>No score data yet</div></div>}
        </div>);
      })()}

      {/* Users List or User Dashboard */}
      {adminDetailUser?(()=>{
        const u=adminDetailUser;const planColors={regional_operator:"#F59E0B",team_leader:"#BC8CFF",recruiter:"#58A6FF",free:T.m};
        return(<div>
          {/* Back + Header */}
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20}}>
            <div onClick={()=>setAdminDetailUser(null)} style={{padding:"8px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.s,fontSize:13,fontWeight:600,cursor:"pointer"}}>← Back</div>
            <div style={{flex:1}}>
              <div style={{fontSize:22,fontWeight:800,color:T.t}}>{u.full_name||u.email||"—"}</div>
              <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontSize:13,color:T.s}}>{u.email}</span>
                <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:4,background:(planColors[u.plan]||T.m)+"20",color:planColors[u.plan]||T.m}}>{u.plan||"free"}</span>
                <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:4,background:u.role==="owner"?T.r+"20":T.s+"20",color:u.role==="owner"?T.r:T.s}}>{u.role||"user"}</span>
                {u.brokerage&&<span style={{fontSize:11,color:T.bl,fontWeight:600}}>{u.brokerage}</span>}
                <span style={{fontSize:11,color:T.m}}>Joined {u.created_at?new Date(u.created_at).toLocaleDateString():"—"}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"14px 20px",marginBottom:20,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:12,color:T.m,fontWeight:600}}>Plan:</span>
              <select value={u.plan||"free"} onChange={async(ev)=>{const np=ev.target.value;await supabase.from("profiles").update({plan:np}).eq("id",u.id);setAdminDetailUser({...u,plan:np});setAdminUsers(prev=>prev.map(x=>x.id===u.id?{...x,plan:np}:x));}} style={{padding:"6px 10px",borderRadius:6,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:12,fontFamily:"inherit"}}>
                {["free","recruiter","team_leader","regional_operator"].map(p=><option key={p} value={p}>{p.replace(/_/g," ")}</option>)}
              </select>
            </div>
            <div onClick={async()=>{const val=!u.is_beta_tester;await supabase.from("profiles").update({is_beta_tester:val}).eq("id",u.id);setAdminDetailUser({...u,is_beta_tester:val});setAdminUsers(prev=>prev.map(x=>x.id===u.id?{...x,is_beta_tester:val}:x));}} style={{padding:"6px 14px",borderRadius:6,background:u.is_beta_tester?T.a+"18":T.d,color:u.is_beta_tester?T.a:T.m,fontSize:12,fontWeight:600,cursor:"pointer",border:`1px solid ${u.is_beta_tester?T.a+"40":T.b}`}}>
              {u.is_beta_tester?"✓ Beta Tester":"Toggle Beta"}
            </div>
            {u.role!=="owner"&&<div onClick={async()=>{setImpersonateLoading(u.id);try{const res=await fetch('https://usknntguurefeyzusbdh.supabase.co/functions/v1/admin-impersonate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({admin_id:authUser.id,target_user_id:u.id})});const data=await res.json();if(data.error){alert(data.error);setImpersonateLoading(false);return;}setRealUser({authUser,profile});setImpersonating(data.impersonate||{id:u.id,full_name:u.full_name||u.email,email:u.email,plan:u.plan||'free',role:u.role||'user'});setAdminDetailUser(null);setViewWithHistory('home');}catch(e){alert('Failed to connect');}setImpersonateLoading(false);}} style={{padding:"6px 16px",borderRadius:6,background:T.bl+"18",border:`1px solid ${T.bl}40`,color:T.bl,fontSize:12,fontWeight:700,cursor:"pointer"}}>{impersonateLoading===u.id?"Loading...":"👁 Log In As"}</div>}
          </div>

          {adminDetailLoading?<div style={{textAlign:"center",padding:60,color:T.m,fontSize:15}}>Loading user data...</div>:adminDetailStats&&(<>
            {/* Stat Cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:20}}>
              {[["Total Leads",adminDetailStats.leads,T.a],["Credits Used",adminDetailStats.enrichUsed,T.bl],["Credits Left",adminDetailStats.enrichRemaining,adminDetailStats.enrichRemaining>10?T.a:T.r],["FB Posts",adminDetailStats.fbPosts,"#1877F2"],["Days Active",adminDetailStats.daysActive||0,T.y],["Score",adminDetailStats.score||0,T.p]].map(([l,v,c])=>
                <div key={l} style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:10,padding:"16px 12px",textAlign:"center"}}>
                  <div style={{fontSize:26,fontWeight:800,color:c}}>{v}</div>
                  <div style={{fontSize:10,color:T.m,fontWeight:600,letterSpacing:0.5,marginTop:3}}>{l}</div>
                </div>
              )}
            </div>

            {/* Two columns: Activity + Top Leads */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
              <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"20px 22px"}}>
                <div style={{fontSize:15,fontWeight:700,color:T.t,marginBottom:14}}>Recent Activity</div>
                {adminDetailActivity.length===0?<div style={{padding:20,textAlign:"center",color:T.m,fontSize:13}}>No activity</div>:
                <div style={{maxHeight:320,overflowY:"auto"}}>
                  {adminDetailActivity.map((a,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderRadius:6,marginBottom:2,fontSize:13}} onMouseOver={ev=>ev.currentTarget.style.background=T.d} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
                      <span style={{color:T.t,fontWeight:500}}>{(a.action||a.event_type||"activity").replace(/_/g," ")}</span>
                      <span style={{fontSize:11,color:T.m,flexShrink:0,marginLeft:12}}>{ago(a.created_at)}</span>
                    </div>
                  ))}
                </div>}
              </div>
              <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"20px 22px"}}>
                <div style={{fontSize:15,fontWeight:700,color:T.t,marginBottom:14}}>Top Leads by Score</div>
                {adminDetailLeads.length===0?<div style={{padding:20,textAlign:"center",color:T.m,fontSize:13}}>No leads</div>:
                <div>
                  {adminDetailLeads.slice(0,10).map((l,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:6,marginBottom:2}} onMouseOver={ev=>ev.currentTarget.style.background=T.d} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
                      <span style={{fontSize:12,color:T.m,fontWeight:800,minWidth:18}}>#{i+1}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:T.t,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.first_name} {l.last_name}</div>
                        <div style={{fontSize:11,color:T.s}}>{(l.brokerage||l.brokerage_name||"—").substring(0,24)}</div>
                      </div>
                      <span style={{fontSize:13,fontWeight:800,color:l.interest_score>=60?T.a:l.interest_score>=30?T.y:T.m}}>{l.interest_score||0}</span>
                    </div>
                  ))}
                </div>}
              </div>
            </div>
          </>)}
        </div>);
      })():(
      <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px",marginBottom:24}}>
        <div style={{fontSize:18,fontWeight:700,color:T.t,marginBottom:16}}>👥 Users ({adminUsers.length})</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
            <thead><tr>{["Name","Email","Plan","Leads","Last Active",""].map(h=>
              <th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:11,fontWeight:700,color:T.m,letterSpacing:1.2,borderBottom:`1px solid ${T.b}`,whiteSpace:"nowrap",background:T.side}}>{h}</th>
            )}</tr></thead>
            <tbody>{adminUsers.map(u=>{
              const pc={regional_operator:"#F59E0B",team_leader:"#BC8CFF",recruiter:"#58A6FF",free:T.m};
              return(
              <tr key={u.id} onClick={async()=>{
                setAdminDetailUser(u);setAdminDetailLoading(true);setAdminDetailStats(null);setAdminDetailActivity([]);setAdminDetailLeads([]);
                const [leads,activity,fbPosts,topLeads]=await Promise.all([
                  supabase.from("leads").select("*",{count:"exact",head:true}).eq("user_id",u.id),
                  supabase.from("user_activity").select("*").eq("user_id",u.id).order("created_at",{ascending:false}).limit(30),
                  supabase.from("user_fb_posts").select("*",{count:"exact",head:true}).eq("user_id",u.id),
                  supabase.from("leads").select("first_name,last_name,brokerage,brokerage_name,interest_score").eq("user_id",u.id).order("interest_score",{ascending:false}).limit(10),
                ]);
                const lbEntry=leaderboard.find(l=>l.user_id===u.id);
                setAdminDetailStats({leads:leads.count||0,enrichUsed:u.enrichment_credits_used||0,enrichRemaining:(u.enrichment_credits||0)-(u.enrichment_credits_used||0),fbPosts:fbPosts.count||0,daysActive:lbEntry?.days_active_last_30d||0,score:lbEntry?.accountability_score||0});
                setAdminDetailActivity(activity.data||[]);
                setAdminDetailLeads(topLeads.data||[]);
                setAdminDetailLoading(false);
              }} style={{borderBottom:`1px solid ${T.b}`,cursor:"pointer"}} onMouseOver={ev=>ev.currentTarget.style.background=T.d} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
                <td style={{padding:"10px 12px",fontSize:14,fontWeight:600,color:T.t,whiteSpace:"nowrap"}}>{u.full_name||"—"}</td>
                <td style={{padding:"10px 12px",fontSize:13,color:T.bl}}>{u.email||"—"}</td>
                <td style={{padding:"10px 12px"}}><span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:4,background:(pc[u.plan]||T.m)+"20",color:pc[u.plan]||T.m}}>{u.plan||"free"}</span></td>
                <td style={{padding:"10px 12px",fontSize:13,fontWeight:600,color:T.t}}>{adminUserLeadStats[u.id]?.total||0}</td>
                <td style={{padding:"10px 12px",fontSize:12,color:T.m}}>{u.last_active_at?ago(u.last_active_at):"—"}</td>
                <td style={{padding:"10px 12px"}}><span style={{fontSize:11,color:T.bl,fontWeight:600}}>View →</span></td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      </div>
      )}

      </>}

      {adminTab==="content"&&<>
      {/* ━━━ RKRT MARKETING ━━━ */}
      <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px",marginBottom:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div>
            <div style={{fontSize:18,fontWeight:700,color:T.t}}>📢 RKRT Marketing</div>
            <div style={{fontSize:12,color:T.m,marginTop:2}}>Brand content for RKRT social channels &amp; blog</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {[["social","Social Posts"],["blog","Blog Posts"]].map(([id,label])=>
              <div key={id} onClick={()=>setRkrtContentTab(id)} style={{padding:"7px 14px",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",background:rkrtContentTab===id?T.a+"18":T.d,color:rkrtContentTab===id?T.a:T.s,border:`1px solid ${rkrtContentTab===id?T.a+"40":T.b}`}}>{label}</div>
            )}
            <div onClick={async()=>{if(rkrtGenerating)return;setRkrtGenerating(true);try{await fetch('https://usknntguurefeyzusbdh.supabase.co/functions/v1/generate-rkrt-content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({images:true,type:'both',force:true})});const r=await supabase.from('rkrt_content').select('*').order('created_at',{ascending:false}).limit(50);setRkrtContent(r.data||[]);}catch(e){console.error('Generate error:',e);}setRkrtGenerating(false);}} style={{padding:"7px 16px",borderRadius:8,background:rkrtGenerating?T.d:T.bl+"18",color:rkrtGenerating?T.m:T.bl,fontSize:13,fontWeight:700,cursor:rkrtGenerating?"wait":"pointer",border:`1px solid ${rkrtGenerating?T.b:T.bl+"40"}`,flexShrink:0}}>{rkrtGenerating?"⏳ Generating…":"✨ Generate Content"}</div>
          </div>
        </div>
        <div style={{height:1,background:T.b,margin:"14px 0"}}/>
        {rkrtContentTab==="social"&&(()=>{
          const posts=rkrtContent.filter(c=>c.content_type==="social"||!c.content_type);
          const platColor=(p)=>p==="facebook"||p==="fb"?"#3B82F6":p==="instagram"||p==="ig"?"#A855F7":p==="linkedin"?"#0A66C2":"#6B7280";
          return posts.length===0?<div style={{textAlign:"center",padding:"32px",color:T.m}}>No social content yet. Click Generate Content to create some.</div>:(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
              {posts.map((c,i)=>(
                <div key={c.id||i} style={{background:T.d,border:`1px solid ${T.b}`,borderRadius:10,padding:"16px 18px",display:"flex",flexDirection:"column",gap:10}}>
                  {c.image_url&&<img src={c.image_url} alt="" style={{width:"100%",height:140,objectFit:"cover",borderRadius:8,border:`1px solid ${T.b}`}} onError={e=>e.target.style.display='none'}/>}
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                    {c.platform&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:999,background:platColor(c.platform)+"20",color:platColor(c.platform),textTransform:"uppercase"}}>{c.platform}</span>}
                    {c.status&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:999,background:c.status==="published"?T.a+"20":c.status==="draft"?T.y+"20":T.s+"20",color:c.status==="published"?T.a:c.status==="draft"?T.y:T.s,textTransform:"capitalize"}}>{c.status||"draft"}</span>}
                  </div>
                  {c.title&&<div style={{fontSize:14,fontWeight:700,color:T.t}}>{c.title}</div>}
                  <div style={{fontSize:12,color:T.s,lineHeight:1.5,flex:1,display:"-webkit-box",WebkitLineClamp:4,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{c.body||c.content||c.caption||""}</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,color:T.m}}>{c.created_at?new Date(c.created_at).toLocaleDateString():"—"}</span>
                    <CopyButton text={c.body||c.content||c.caption||""} label="Copy"/>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
        {rkrtContentTab==="blog"&&(()=>{
          const posts=rkrtContent.filter(c=>c.content_type==="blog");
          return posts.length===0?<div style={{textAlign:"center",padding:"32px",color:T.m}}>No blog content yet. Click Generate Content to create some.</div>:(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {posts.map((c,i)=>(
                <div key={c.id||i} style={{display:"flex",gap:14,background:T.d,border:`1px solid ${T.b}`,borderRadius:10,padding:"14px 16px",alignItems:"flex-start"}}>
                  {c.image_url&&<img src={c.image_url} alt="" style={{width:72,height:56,objectFit:"cover",borderRadius:6,border:`1px solid ${T.b}`,flexShrink:0}} onError={e=>e.target.style.display='none'}/>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:T.t,marginBottom:4}}>{c.title||"Untitled"}</div>
                    <div style={{fontSize:12,color:T.s,lineHeight:1.5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.excerpt||c.body||""}</div>
                  </div>
                  <div style={{flexShrink:0,textAlign:"right",display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}>
                    <span style={{fontSize:11,color:T.m}}>{c.created_at?new Date(c.created_at).toLocaleDateString():"—"}</span>
                    {c.slug&&<a href={`https://rkrt.in/blog/${c.slug}`} target="_blank" rel="noreferrer" style={{fontSize:12,color:T.bl,fontWeight:600,textDecoration:"none"}}>View →</a>}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ━━━ BROKERAGE BLOGS ━━━ */}
      <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px",marginBottom:24}}>
        <style>{`.bp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}@media(max-width:900px){.bp-grid{grid-template-columns:repeat(2,1fr)!important}}@media(max-width:600px){.bp-grid{grid-template-columns:1fr!important}}`}</style>
        {/* Reject modal */}
        {bpRejectOpen&&(
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:"100%",maxWidth:420,background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:24}}>
              <div style={{fontSize:16,fontWeight:700,color:T.t,marginBottom:16}}>Reject Post</div>
              <textarea value={bpRejectReason} onChange={e=>setBpRejectReason(e.target.value)} rows={3} placeholder="Reason for rejection (optional)..." style={{width:"100%",padding:"10px 12px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:14,fontFamily:"inherit",resize:"none",outline:"none",boxSizing:"border-box"}}/>
              <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
                <div onClick={()=>setBpRejectOpen(false)} style={{padding:"10px 18px",borderRadius:8,background:T.d,color:T.s,fontSize:13,fontWeight:700,cursor:"pointer"}}>Cancel</div>
                <div onClick={async()=>{if(!bpRejectingPost)return;await supabase.from("brokerage_posts").update({status:"rejected",rejection_reason:bpRejectReason}).eq("id",bpRejectingPost.id);setBrokeragePosts(prev=>prev.map(x=>x.id===bpRejectingPost.id?{...x,status:"rejected",rejection_reason:bpRejectReason}:x));setBpRejectOpen(false);setBpRejectingPost(null);setBpRejectReason("");}} style={{padding:"10px 18px",borderRadius:8,background:"#F85149",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Reject Post</div>
              </div>
            </div>
          </div>
        )}
        {(()=>{
          const total=brokeragePosts.length;
          const pendingPosts=brokeragePosts.filter(p=>p.status==="draft"||p.status==="pending");
          const approvedPosts=brokeragePosts.filter(p=>p.status==="approved");
          const publishedPosts=brokeragePosts.filter(p=>p.status==="published");
          const rejectedPosts=brokeragePosts.filter(p=>p.status==="rejected");
          const brokerages=[...new Set(brokeragePosts.map(p=>p.brokerage_name||p.brokerage).filter(Boolean))];
          const statusColor={draft:"#F59E0B",pending:"#F59E0B",approved:T.bl,published:T.a,rejected:"#F85149"};
          const statusLabel={draft:"Pending",pending:"Pending",approved:"Approved",published:"Published",rejected:"Rejected"};
          const tabPosts=(bpTab==="pending"?pendingPosts:bpTab==="approved"?approvedPosts:bpTab==="published"?publishedPosts:rejectedPosts)
            .filter(p=>bpFilter==="all"||(p.brokerage_name||p.brokerage)===bpFilter);
          const bpUpdate=async(post,updates)=>{await supabase.from("brokerage_posts").update(updates).eq("id",post.id);setBrokeragePosts(prev=>prev.map(x=>x.id===post.id?{...x,...updates}:x));};
          return(<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div style={{fontSize:18,fontWeight:700,color:T.t}}>🏢 Brokerage Blogs</div>
                <div style={{fontSize:12,color:T.m,marginTop:2}}>AI-generated recruiting content for affiliated brokerages</div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div onClick={async()=>{if(!confirm("Generate fresh blog posts for all brokerages? This takes 2-3 minutes."))return;try{const res=await fetch("https://usknntguurefeyzusbdh.supabase.co/functions/v1/generate-brokerage-content",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});const d=await res.json();alert("Generated "+(d.total_posts||"new")+" posts!");const bpRes2=await supabase.from("brokerage_posts").select("*").order("created_at",{ascending:false}).limit(100);setBrokeragePosts(bpRes2.data||[]);}catch(e){alert("Error: "+e.message);}}} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"#1E293B",color:T.a,fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>🔄 Generate Fresh Posts</div>
                <select value={bpFilter} onChange={e=>setBpFilter(e.target.value)} style={{padding:"8px 12px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:13,fontFamily:"inherit"}}>
                  <option value="all">All Brokerages</option>
                  {brokerages.map(b=><option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            {/* Stats row */}
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              {[["Total",total,T.t],["Pending",pendingPosts.length,"#F59E0B"],["Approved",approvedPosts.length,T.bl],["Published",publishedPosts.length,T.a],["Rejected",rejectedPosts.length,"#F85149"]].map(([l,v,c])=>
                <div key={l} style={{background:T.d,borderRadius:8,padding:"8px 14px",border:`1px solid ${T.b}`,textAlign:"center",minWidth:64}}>
                  <div style={{fontSize:20,fontWeight:800,color:c}}>{adminLoading?"…":v}</div>
                  <div style={{fontSize:10,color:T.m,fontWeight:700,letterSpacing:1}}>{l.toUpperCase()}</div>
                </div>
              )}
            </div>
            {/* Tab bar */}
            <div style={{display:"flex",gap:8,marginBottom:20}}>
              {[{id:"pending",label:"📝 Pending",count:pendingPosts.length},{id:"approved",label:"✅ Approved",count:approvedPosts.length},{id:"published",label:"📰 Published",count:publishedPosts.length},{id:"rejected",label:"❌ Rejected",count:rejectedPosts.length}].map(tab=>(
                <div key={tab.id} onClick={()=>setBpTab(tab.id)} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:20,background:bpTab===tab.id?T.a+"18":T.d,border:`1px solid ${bpTab===tab.id?T.a+"40":T.b}`,color:bpTab===tab.id?T.a:T.s,fontSize:13,fontWeight:700,cursor:"pointer"}}>
                  {tab.label}
                  <span style={{padding:"2px 7px",borderRadius:10,background:bpTab===tab.id?T.a+"30":T.card,fontSize:11,fontWeight:800}}>{tab.count}</span>
                </div>
              ))}
            </div>
            {/* Card grid */}
            {tabPosts.length===0
              ?<div style={{textAlign:"center",padding:"48px 20px",color:T.m,background:T.d,borderRadius:12,border:`1px solid ${T.b}`}}><div style={{fontSize:32,marginBottom:8}}>📝</div>No posts in this category.</div>
              :<div className="bp-grid">
                {tabPosts.map(p=>{
                  const brk=p.brokerage_name||p.brokerage||"";
                  const sc=statusColor[p.status]||T.m;
                  return(
                    <div key={p.id} style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,overflow:"hidden",display:"flex",flexDirection:"column"}}>
                      {p.image_url
                        ?<img src={p.image_url} alt="" style={{width:"100%",height:180,objectFit:"cover",display:"block"}}/>
                        :<div style={{width:"100%",height:180,background:"linear-gradient(135deg,#1a1a2e,#16213e)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,boxSizing:"border-box"}}>
                          <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.35)",textAlign:"center",lineHeight:1.4}}>{p.title||brk||"Blog Post"}</div>
                        </div>
                      }
                      <div style={{padding:"12px 14px",flex:1,display:"flex",flexDirection:"column",gap:6}}>
                        {brk&&<span style={{padding:"2px 8px",borderRadius:20,background:T.bl+"18",color:T.bl,fontSize:11,fontWeight:700,alignSelf:"flex-start"}}>🏢 {brk}</span>}
                        <div style={{fontSize:14,fontWeight:700,color:T.t,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{p.title||"Untitled"}</div>
                        {p.excerpt&&<div style={{fontSize:12,color:T.s,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",lineHeight:1.5}}>{p.excerpt}</div>}
                        {p.status==="rejected"&&p.rejection_reason&&<div style={{fontSize:11,color:"#F85149",fontStyle:"italic"}}>"{p.rejection_reason}"</div>}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"auto",paddingTop:6}}>
                          <div style={{fontSize:11,color:T.m}}>{p.created_at?new Date(p.created_at).toLocaleDateString():"—"}</div>
                          <span style={{padding:"3px 8px",borderRadius:6,background:sc+"18",color:sc,fontSize:11,fontWeight:700}}>{statusLabel[p.status]||p.status}</span>
                        </div>
                      </div>
                      <div style={{padding:"10px 14px",borderTop:`1px solid ${T.b}`,display:"flex",gap:6,flexWrap:"wrap"}}>
                        {bpTab==="pending"&&<>
                          <div onClick={()=>bpUpdate(p,{status:"approved",approved_by:authUser.id,approved_at:new Date().toISOString()})} style={{padding:"5px 10px",borderRadius:6,background:T.a+"18",color:T.a,fontSize:12,fontWeight:700,cursor:"pointer"}}>✅ Approve</div>
                          {p.slug&&<a href={`https://rkrt.in/blog/${p.slug}`} target="_blank" rel="noreferrer" style={{padding:"5px 10px",borderRadius:6,background:T.bl+"18",color:T.bl,fontSize:12,fontWeight:700,textDecoration:"none"}}>👁️ Preview</a>}
                          <div onClick={()=>{setBpRejectingPost(p);setBpRejectReason("");setBpRejectOpen(true);}} style={{padding:"5px 10px",borderRadius:6,background:"#F8514918",color:"#F85149",fontSize:12,fontWeight:700,cursor:"pointer"}}>❌ Reject</div>
                        </>}
                        {bpTab==="approved"&&<>
                          <div onClick={()=>bpUpdate(p,{status:"published",published_at:new Date().toISOString()})} style={{padding:"5px 10px",borderRadius:6,background:T.a+"18",color:T.a,fontSize:12,fontWeight:700,cursor:"pointer"}}>📰 Publish</div>
                          {p.slug&&<a href={`https://rkrt.in/blog/${p.slug}`} target="_blank" rel="noreferrer" style={{padding:"5px 10px",borderRadius:6,background:T.bl+"18",color:T.bl,fontSize:12,fontWeight:700,textDecoration:"none"}}>👁️ Preview</a>}
                          {!p.is_posted_fb&&<div onClick={async()=>{try{const res=await fetch(`https://usknntguurefeyzusbdh.supabase.co/functions/v1/post-to-facebook?mode=post&id=${p.id}&source=brokerage&user_id=${authUser?.id}`);const d=await res.json();if(d.success||!d.error){bpUpdate(p,{is_posted_fb:true,posted_fb_at:new Date().toISOString()});supabase.from('user_fb_posts').insert({user_id:authUser?.id,post_type:'brokerage_post',content_id:p.id,page_name:p.title,fb_results:d.results,pages_posted:d.results?.filter(r=>r.status==='posted').map(r=>r.page)||[]});alert("Posted to FB!");}else{alert("Error: "+(d.error||"Unknown"));}}catch(e){alert("Error: "+e.message);}}} style={{padding:"5px 10px",borderRadius:6,background:"transparent",color:"#22C55E",fontSize:12,fontWeight:700,cursor:"pointer",border:"1px solid #22C55E"}}>📘 Post to FB</div>}
                          {p.is_posted_fb&&<span style={{padding:"5px 10px",fontSize:11,color:"#22C55E",fontWeight:700}}>✅ Posted to FB</span>}
                          <div onClick={()=>bpUpdate(p,{status:"draft"})} style={{padding:"5px 10px",borderRadius:6,background:T.d,color:T.m,fontSize:12,fontWeight:700,cursor:"pointer"}}>↩️ Unpublish</div>
                        </>}
                        {bpTab==="published"&&<>
                          {p.slug&&<a href={`https://rkrt.in/blog/${p.slug}`} target="_blank" rel="noreferrer" style={{padding:"5px 10px",borderRadius:6,background:T.bl+"18",color:T.bl,fontSize:12,fontWeight:700,textDecoration:"none"}}>👁️ View →</a>}
                          {!p.is_posted_fb&&<div onClick={async()=>{try{const res=await fetch(`https://usknntguurefeyzusbdh.supabase.co/functions/v1/post-to-facebook?mode=post&id=${p.id}&source=brokerage&user_id=${authUser?.id}`);const d=await res.json();if(d.success||!d.error){bpUpdate(p,{is_posted_fb:true,posted_fb_at:new Date().toISOString()});supabase.from('user_fb_posts').insert({user_id:authUser?.id,post_type:'brokerage_post',content_id:p.id,page_name:p.title,fb_results:d.results,pages_posted:d.results?.filter(r=>r.status==='posted').map(r=>r.page)||[]});alert("Posted to FB!");}else{alert("Error: "+(d.error||"Unknown"));}}catch(e){alert("Error: "+e.message);}}} style={{padding:"5px 10px",borderRadius:6,background:"transparent",color:"#22C55E",fontSize:12,fontWeight:700,cursor:"pointer",border:"1px solid #22C55E"}}>📘 Post to FB</div>}
                          {p.is_posted_fb&&<span style={{padding:"5px 10px",fontSize:11,color:"#22C55E",fontWeight:700}}>✅ Posted to FB</span>}
                          <div onClick={()=>bpUpdate(p,{status:"approved"})} style={{padding:"5px 10px",borderRadius:6,background:T.d,color:T.m,fontSize:12,fontWeight:700,cursor:"pointer"}}>↩️ Unpublish</div>
                        </>}
                        {bpTab==="rejected"&&<>
                          <div onClick={()=>bpUpdate(p,{status:"draft",rejection_reason:null})} style={{padding:"5px 10px",borderRadius:6,background:T.bl+"18",color:T.bl,fontSize:12,fontWeight:700,cursor:"pointer"}}>↩️ Move to Pending</div>
                        </>}
                      </div>
                    </div>
                  );
                })}
              </div>
            }
          </>);
        })()}
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
      </>}

      {adminTab==="social"&&<>
      {(()=>{
        const loadSocial=async()=>{
          setSocialLoading(true);
          const [accts,posts]=await Promise.all([
            supabase.from("social_accounts").select("id,page_name,page_id,platform,is_active,auto_post,follower_count,last_synced_at,created_at").order("created_at"),
            supabase.from("daily_content").select("id,headline,platform,posted_at,engagement").eq("is_posted",true).order("posted_at",{ascending:false}).limit(20)
          ]);
          setSocialAccounts(accts.data||[]);
          setSocialPosts(posts.data||[]);
          setSocialLoading(false);
        };
        if(socialAccounts.length===0&&!socialLoading)loadSocial();
        const testToken=async(pageId)=>{
          try{
            const res=await fetch(`${SUPABASE_URL}/functions/v1/post-to-facebook?mode=test&page_id=${pageId}`,{headers:{'Authorization':`Bearer ${SUPABASE_ANON_KEY}`}});
            const d=await res.json();
            alert(d.error?"Token error: "+d.error:"Token valid for: "+(d.page_name||pageId));
          }catch(e){alert("Test failed: "+e.message);}
        };
        const toggleAutoPost=async(id,val)=>{
          await supabase.from("social_accounts").update({auto_post:val}).eq("id",id);
          setSocialAccounts(prev=>prev.map(a=>a.id===id?{...a,auto_post:val}:a));
        };
        const postAllUnposted=async()=>{
          setSocialPostingAll(true);
          try{
            const res=await fetch(`${SUPABASE_URL}/functions/v1/post-to-facebook?mode=auto`,{headers:{'Authorization':`Bearer ${SUPABASE_ANON_KEY}`}});
            const d=await res.json();
            alert(d.error?"Error: "+d.error:JSON.stringify(d,null,2));
            const posts2=await supabase.from("daily_content").select("id,headline,platform,posted_at,engagement").eq("is_posted",true).order("posted_at",{ascending:false}).limit(20);
            setSocialPosts(posts2.data||[]);
          }catch(e){alert("Error: "+e.message);}
          setSocialPostingAll(false);
        };
        return(<>
          {/* Connected Pages */}
          <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px",marginBottom:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:18,fontWeight:700,color:T.t}}>Connected Pages</div>
              <div onClick={postAllUnposted} style={{padding:"8px 16px",borderRadius:8,background:socialPostingAll?T.m+"18":"#1877F218",color:socialPostingAll?T.m:"#1877F2",fontSize:13,fontWeight:700,cursor:socialPostingAll?"wait":"pointer",border:`1px solid ${socialPostingAll?T.m:"#1877F2"}40`}}>
                {socialPostingAll?"Posting...":"Post All Unposted"}
              </div>
            </div>
            {socialLoading?<div style={{textAlign:"center",padding:"40px",color:T.m}}>Loading...</div>:
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {socialAccounts.map(a=>(
                <div key={a.id} style={{background:T.d,border:`1px solid ${T.b}`,borderRadius:10,padding:"18px 20px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                    <span style={{fontSize:20}}>📘</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:700,color:T.t}}>{a.page_name}</div>
                      <div style={{fontSize:11,color:T.m,fontFamily:"monospace"}}>{a.page_id}</div>
                    </div>
                    <span style={{width:8,height:8,borderRadius:4,background:a.is_active?T.a:T.m}}/>
                    <span style={{fontSize:12,color:a.is_active?T.a:T.m,fontWeight:600}}>{a.is_active?"Active":"Inactive"}</span>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <div onClick={()=>toggleAutoPost(a.id,!a.auto_post)} style={{padding:"6px 14px",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",background:a.auto_post?T.a+"18":T.d,color:a.auto_post?T.a:T.m,border:`1px solid ${a.auto_post?T.a+"40":T.b}`}}>
                      Auto-post: {a.auto_post?"ON":"OFF"}
                    </div>
                    <div onClick={()=>testToken(a.page_id)} style={{padding:"6px 14px",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",background:T.bl+"18",color:T.bl,border:`1px solid ${T.bl}40`}}>
                      Test Token
                    </div>
                    {a.last_synced_at&&<span style={{fontSize:11,color:T.m,marginLeft:"auto"}}>Synced {ago(a.last_synced_at)}</span>}
                  </div>
                </div>
              ))}
            </div>}
          </div>

          {/* Recent Posts Log */}
          <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px"}}>
            <div style={{fontSize:18,fontWeight:700,color:T.t,marginBottom:16}}>Recent FB Posts</div>
            {socialPosts.length===0?<div style={{textAlign:"center",padding:"40px",color:T.m}}>No posts yet</div>:
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr>
                    {["Date","Headline","Pages","Status"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 14px",fontSize:11,fontWeight:700,color:T.m,letterSpacing:1.5,borderBottom:`1px solid ${T.b}`}}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {socialPosts.map(p=>{
                    const results=p.engagement?.fb_results||[];
                    return(
                      <tr key={p.id} style={{borderBottom:`1px solid ${T.b}`}}>
                        <td style={{padding:"10px 14px",fontSize:13,color:T.s}}>{p.posted_at?new Date(p.posted_at).toLocaleDateString():"—"}</td>
                        <td style={{padding:"10px 14px",fontSize:13,color:T.t,fontWeight:600,maxWidth:250,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.headline||"—"}</td>
                        <td style={{padding:"10px 14px",fontSize:12,color:T.s}}>{results.length>0?results.map(r=>r.page).join(", "):"—"}</td>
                        <td style={{padding:"10px 14px"}}><span style={{fontSize:11,padding:"3px 8px",borderRadius:4,background:T.a+"18",color:T.a,fontWeight:700}}>Posted</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>}
          </div>
        </>);
      })()}
      </>}

      {adminTab==="system"&&<>
      <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px",marginBottom:24}}>
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
      </>}

      {adminTab==="analytics"&&<AnalyticsDashboard supabase={supabase} isAdmin={true} />}
    </>);
}
