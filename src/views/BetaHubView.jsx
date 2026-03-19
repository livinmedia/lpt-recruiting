import { useState, useEffect, useCallback } from "react";
import T from '../lib/theme';
import { ago } from '../lib/utils';

export default function BetaHubView({ supabase, authUser, profile }) {
  // ━━━ BETA HUB STATE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const [betaTab,setBetaTab]=useState("feedback");
  const [betaFeedback,setBetaFeedback]=useState([]);
  const [betaFbSort,setBetaFbSort]=useState("newest");
  const [betaFbFilterType,setBetaFbFilterType]=useState("all");
  const [betaFbFilterStatus,setBetaFbFilterStatus]=useState("all");
  const [betaFbDetail,setBetaFbDetail]=useState(null);
  const [betaFbComments,setBetaFbComments]=useState([]);
  const [betaFbNewComment,setBetaFbNewComment]=useState("");
  const [betaFbMyUpvotes,setBetaFbMyUpvotes]=useState(new Set());
  const [betaPolls,setBetaPolls]=useState([]);
  const [betaPollResponses,setBetaPollResponses]=useState({});
  const [betaPollForm,setBetaPollForm]=useState(null);
  const [betaChannels,setBetaChannels]=useState([]);
  const [betaSelChannel,setBetaSelChannel]=useState(null);
  const [betaPosts,setBetaPosts]=useState([]);
  const [betaNewPost,setBetaNewPost]=useState("");
  const [betaReplyTo,setBetaReplyTo]=useState(null);
  const [betaReplyText,setBetaReplyText]=useState("");
  const [betaMyReactions,setBetaMyReactions]=useState({});
  const [betaChannelReads,setBetaChannelReads]=useState({});
  const [betaAnnouncements,setBetaAnnouncements]=useState([]);
  const [betaAnnouncementReads,setBetaAnnouncementReads]=useState(new Set());
  const [betaNewAnnouncement,setBetaNewAnnouncement]=useState(null);
  const [betaRueTyping,setBetaRueTyping]=useState(false);
  const [betaAdminUsers,setBetaAdminUsers]=useState([]);
  const [betaAdminStats,setBetaAdminStats]=useState({feedback:0,openBugs:0,featureReqs:0,activePolls:0,postsToday:0});

  const isBeta = profile?.is_beta_tester === true;

  const loadBetaFeedback=useCallback(async()=>{
    if(!authUser)return;
    const{data}=await supabase.from("beta_feedback").select("*").order("created_at",{ascending:false});
    const rows=data||[];
    // Batch-fetch submitter profiles
    const userIds=[...new Set(rows.map(r=>r.user_id).filter(Boolean))];
    let profileMap={};
    if(userIds.length){
      const{data:profs}=await supabase.from("profiles").select("id,full_name,email").in("id",userIds);
      (profs||[]).forEach(p=>{profileMap[p.id]=p;});
    }
    setBetaFeedback(rows.map(r=>({...r,profiles:profileMap[r.user_id]||null})));
    const{data:ups}=await supabase.from("beta_feedback_upvotes").select("feedback_id").eq("user_id",authUser.id);
    setBetaFbMyUpvotes(new Set((ups||[]).map(u=>u.feedback_id)));
  },[authUser]);

  const loadBetaPolls=useCallback(async()=>{
    if(!authUser)return;
    const{data}=await supabase.from("beta_polls").select("*").eq("is_active",true).order("pinned",{ascending:false}).order("created_at",{ascending:false});
    setBetaPolls(data||[]);
    const{data:resp}=await supabase.from("beta_poll_responses").select("poll_id,selected_options,rating_value,text_response").eq("user_id",authUser.id);
    const map={};(resp||[]).forEach(r=>{map[r.poll_id]=r;});
    setBetaPollResponses(map);
  },[authUser]);

  const loadBetaChannels=useCallback(async()=>{
    if(!authUser)return;
    const{data}=await supabase.from("beta_channels").select("*").order("sort_order",{ascending:true});
    setBetaChannels(data||[]);
    if(data?.length&&!betaSelChannel)setBetaSelChannel(data[0]);
    const{data:reads}=await supabase.from("beta_channel_reads").select("channel_id,last_read_at").eq("user_id",authUser.id);
    const rmap={};(reads||[]).forEach(r=>{rmap[r.channel_id]=r.last_read_at;});
    setBetaChannelReads(rmap);
  },[authUser,betaSelChannel]);

  const loadBetaPosts=useCallback(async(channelId)=>{
    if(!channelId)return;
    const{data}=await supabase.from("beta_posts").select("*").eq("channel_id",channelId).is("parent_id",null).order("is_pinned",{ascending:false}).order("created_at",{ascending:false}).limit(100);
    setBetaPosts(data||[]);
    const postIds=(data||[]).map(p=>p.id);
    if(postIds.length){
      const{data:rx}=await supabase.from("beta_post_reactions").select("post_id,emoji").eq("user_id",authUser?.id).in("post_id",postIds);
      const rmap={};(rx||[]).forEach(r=>{if(!rmap[r.post_id])rmap[r.post_id]=new Set();rmap[r.post_id].add(r.emoji);});
      setBetaMyReactions(rmap);
    }
    await supabase.from("beta_channel_reads").upsert({user_id:authUser?.id,channel_id:channelId,last_read_at:new Date().toISOString()},{onConflict:"user_id,channel_id"});
  },[authUser]);

  const loadBetaAnnouncements=useCallback(async()=>{
    if(!authUser)return;
    const{data}=await supabase.from("beta_announcements").select("*").order("is_pinned",{ascending:false}).order("created_at",{ascending:false});
    setBetaAnnouncements(data||[]);
    const{data:reads}=await supabase.from("beta_announcement_reads").select("announcement_id").eq("user_id",authUser.id);
    setBetaAnnouncementReads(new Set((reads||[]).map(r=>r.announcement_id)));
  },[authUser]);

  useEffect(()=>{
    if(isBeta){
      if(betaTab==="feedback")loadBetaFeedback();
      if(betaTab==="polls")loadBetaPolls();
      if(betaTab==="forum")loadBetaChannels();
      if(betaTab==="announcements")loadBetaAnnouncements();
    }
  },[betaTab,isBeta,loadBetaFeedback,loadBetaPolls,loadBetaChannels,loadBetaAnnouncements]);

  useEffect(()=>{
    if(betaSelChannel&&betaTab==="forum")loadBetaPosts(betaSelChannel.id);
  },[betaSelChannel,betaTab,loadBetaPosts]);

  const toggleUpvote=async(feedbackId)=>{
    const has=betaFbMyUpvotes.has(feedbackId);
    if(has){
      await supabase.from("beta_feedback_upvotes").delete().eq("user_id",authUser.id).eq("feedback_id",feedbackId);
      setBetaFbMyUpvotes(p=>{const n=new Set(p);n.delete(feedbackId);return n;});
      setBetaFeedback(p=>p.map(f=>f.id===feedbackId?{...f,upvote_count:Math.max(0,(f.upvote_count||0)-1)}:f));
    }else{
      await supabase.from("beta_feedback_upvotes").insert({user_id:authUser.id,feedback_id:feedbackId});
      setBetaFbMyUpvotes(p=>new Set([...p,feedbackId]));
      setBetaFeedback(p=>p.map(f=>f.id===feedbackId?{...f,upvote_count:(f.upvote_count||0)+1}:f));
    }
  };

  const loadFbComments=async(feedbackId)=>{
    const{data}=await supabase.from("beta_feedback_comments").select("*").eq("feedback_id",feedbackId).order("created_at",{ascending:true});
    setBetaFbComments(data||[]);
  };

  const addFbComment=async(feedbackId)=>{
    if(!betaFbNewComment.trim())return;
    await supabase.from("beta_feedback_comments").insert({feedback_id:feedbackId,user_id:authUser.id,content:betaFbNewComment.trim(),is_admin:profile?.role==="owner"});
    setBetaFbNewComment("");loadFbComments(feedbackId);
  };

  const submitPollVote=async(pollId,type,value)=>{
    const payload={poll_id:pollId,user_id:authUser.id};
    if(type==="single"||type==="multi")payload.selected_options=Array.isArray(value)?value:[value];
    if(type==="rating")payload.rating_value=value;
    if(type==="open_text")payload.text_response=value;
    await supabase.from("beta_poll_responses").insert(payload);
    setBetaPollResponses(p=>({...p,[pollId]:payload}));
    await supabase.from("beta_polls").update({total_responses:((betaPolls.find(p=>p.id===pollId)?.total_responses)||0)+1}).eq("id",pollId);
    loadBetaPolls();
  };

  const sendForumPost=async(content,parentId=null)=>{
    if(!content.trim()||!betaSelChannel)return;
    const isAnnouncement=betaSelChannel.is_announcement;
    if(isAnnouncement&&profile?.role!=="owner")return;
    await supabase.from("beta_posts").insert({channel_id:betaSelChannel.id,user_id:authUser.id,content:content.trim(),is_admin:profile?.role==="owner",parent_id:parentId});
    setBetaNewPost("");setBetaReplyTo(null);setBetaReplyText("");
    loadBetaPosts(betaSelChannel.id);
    if(betaSelChannel.slug==="ask-rue"&&!parentId){
      setBetaRueTyping(true);
      try{
        const r=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+(import.meta.env.VITE_OPENROUTER_KEY||"")},body:JSON.stringify({model:"deepseek/deepseek-chat-v3-0324",max_tokens:1000,messages:[{role:"system",content:"You are Rue, an AI recruiting agent for RKRT.in. Answer questions about the platform, features, and real estate recruiting. Be helpful, concise, and friendly."},{role:"user",content:content.trim()}]})});
        const d=await r.json();
        const rueMsg=d.choices?.[0]?.message?.content||"Sorry, I couldn't process that.";
        const{data:userPost}=await supabase.from("beta_posts").select("id").eq("channel_id",betaSelChannel.id).eq("user_id",authUser.id).order("created_at",{ascending:false}).limit(1).single();
        await supabase.from("beta_posts").insert({channel_id:betaSelChannel.id,user_id:authUser.id,content:rueMsg,is_rue:true,parent_id:userPost?.id||null});
      }catch(e){console.error("Rue error:",e);}
      setBetaRueTyping(false);
      loadBetaPosts(betaSelChannel.id);
    }
  };

  const toggleReaction=async(postId,emoji)=>{
    const mySet=betaMyReactions[postId]||new Set();
    const has=mySet.has(emoji);
    if(has){
      await supabase.from("beta_post_reactions").delete().eq("user_id",authUser.id).eq("post_id",postId).eq("emoji",emoji);
      setBetaMyReactions(p=>{const n={...p};const s=new Set(n[postId]||[]);s.delete(emoji);n[postId]=s;return n;});
      setBetaPosts(p=>p.map(pp=>{if(pp.id!==postId)return pp;const rc={...(pp.reaction_counts||{})};rc[emoji]=Math.max(0,(rc[emoji]||0)-1);if(!rc[emoji])delete rc[emoji];return{...pp,reaction_counts:rc};}));
    }else{
      await supabase.from("beta_post_reactions").insert({user_id:authUser.id,post_id:postId,emoji});
      setBetaMyReactions(p=>{const n={...p};const s=new Set(n[postId]||[]);s.add(emoji);n[postId]=s;return n;});
      setBetaPosts(p=>p.map(pp=>{if(pp.id!==postId)return pp;const rc={...(pp.reaction_counts||{})};rc[emoji]=(rc[emoji]||0)+1;return{...pp,reaction_counts:rc};}));
    }
  };

  const markAnnouncementRead=async(aId)=>{
    if(betaAnnouncementReads.has(aId))return;
    await supabase.from("beta_announcement_reads").insert({user_id:authUser.id,announcement_id:aId}).catch(()=>{});
    setBetaAnnouncementReads(p=>new Set([...p,aId]));
  };

  const betaUnreadAnnouncements=betaAnnouncements.filter(a=>!betaAnnouncementReads.has(a.id)).length;

  const loadBetaAdmin=useCallback(async()=>{
    const[fbCount,bugCount,frCount,pollCount,users]=await Promise.all([
      supabase.from("beta_feedback").select("*",{count:"exact",head:true}),
      supabase.from("beta_feedback").select("*",{count:"exact",head:true}).in("type",["bug","ui_issue"]).in("status",["new","acknowledged","in_progress"]),
      supabase.from("beta_feedback").select("*",{count:"exact",head:true}).eq("type","feature_request"),
      supabase.from("beta_polls").select("*",{count:"exact",head:true}).eq("is_active",true),
      supabase.from("profiles").select("id,full_name,email,plan,is_beta_tester,beta_joined_at,created_at").order("created_at",{ascending:false}).limit(200),
    ]);
    setBetaAdminStats({feedback:fbCount.count||0,openBugs:bugCount.count||0,featureReqs:frCount.count||0,activePolls:pollCount.count||0,postsToday:0});
    setBetaAdminUsers(users.data||[]);
  },[]);

  // ━━━ BETA HUB VIEW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const BTYPES={bug:{l:"Bug",c:T.r},ui_issue:{l:"UI Issue",c:"#F97316"},feature_request:{l:"Feature",c:T.bl},suggestion:{l:"Suggestion",c:T.p},question:{l:"Question",c:T.s}};
  const BSEV={critical:{l:"Critical",c:T.r},high:{l:"High",c:"#F97316"},medium:{l:"Medium",c:T.y},low:{l:"Low",c:T.s}};
  const BSTAT={new:{l:"New",c:T.bl},acknowledged:{l:"Ack'd",c:T.y},in_progress:{l:"In Progress",c:"#F97316"},resolved:{l:"Resolved",c:T.a},wont_fix:{l:"Won't Fix",c:T.s},duplicate:{l:"Duplicate",c:T.p}};
  const ATYPE={update:{l:"Update",c:T.bl},new_feature:{l:"New Feature",c:T.a},bug_fix:{l:"Bug Fix",c:T.r},breaking_change:{l:"Breaking",c:"#F97316"},milestone:{l:"Milestone",c:T.p}};
  const REMOJIS=["👍","🔥","❤️","😂","🎯"];

  const filteredFb=betaFeedback.filter(f=>{
    if(betaFbFilterType!=="all"&&f.type!==betaFbFilterType)return false;
    if(betaFbFilterStatus!=="all"&&f.status!==betaFbFilterStatus)return false;
    return true;
  }).sort((a,b)=>{
    if(betaFbSort==="upvotes")return(b.upvote_count||0)-(a.upvote_count||0);
    if(betaFbSort==="comments")return(b.comment_count||0)-(a.comment_count||0);
    if(betaFbSort==="status")return(a.status||"").localeCompare(b.status||"");
    return new Date(b.created_at)-new Date(a.created_at);
  });

  const channelUnread=(ch)=>{
    const lastRead=betaChannelReads[ch.id];
    if(!lastRead)return true;
    return false;
  };

  if(betaFbDetail){
    const f=betaFbDetail;
    const bt=BTYPES[f.type]||BTYPES.bug;const bs=BSEV[f.severity]||BSEV.medium;const bst=BSTAT[f.status]||BSTAT.new;
    return(
      <div>
        <div onClick={()=>{setBetaFbDetail(null);setBetaFbComments([]);setBetaFbNewComment("");}} style={{fontSize:14,color:T.s,cursor:"pointer",marginBottom:16,display:"inline-flex",alignItems:"center",gap:6}}>← Back to Feedback</div>
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:24,marginBottom:16}}>
          <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
            <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:999,background:bt.c+"18",color:bt.c}}>{bt.l}</span>
            <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:999,background:bs.c+"18",color:bs.c}}>{bs.l}</span>
            <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:999,background:bst.c+"18",color:bst.c}}>{bst.l}</span>
            {f.category&&<span style={{fontSize:11,fontWeight:600,color:T.m}}>{f.category}</span>}
          </div>
          <div style={{fontSize:22,fontWeight:800,color:T.t,marginBottom:8}}>{f.title}</div>
          <div style={{fontSize:14,color:T.s,lineHeight:1.7,marginBottom:16,whiteSpace:"pre-wrap"}}>{f.description}</div>
          {f.steps_to_reproduce&&<div style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:700,color:T.m,letterSpacing:1,marginBottom:6}}>STEPS TO REPRODUCE</div><div style={{fontSize:13,color:T.s,lineHeight:1.6,whiteSpace:"pre-wrap",background:T.d,borderRadius:8,padding:12}}>{f.steps_to_reproduce}</div></div>}
          {f.expected_behavior&&<div style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:700,color:T.m,letterSpacing:1,marginBottom:6}}>EXPECTED BEHAVIOR</div><div style={{fontSize:13,color:T.s,lineHeight:1.6}}>{f.expected_behavior}</div></div>}
          {f.screenshots?.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:700,color:T.m,letterSpacing:1,marginBottom:6}}>SCREENSHOTS</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{f.screenshots.map((s,i)=><img key={i} src={s} alt="" style={{width:120,height:80,objectFit:"cover",borderRadius:8,border:`1px solid ${T.b}`,cursor:"pointer"}} onClick={()=>window.open(s,"_blank")}/>)}</div></div>}
          <div style={{display:"flex",gap:16,fontSize:12,color:T.m,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{display:"flex",alignItems:"center",gap:6,color:T.s,fontWeight:600}}>
              <span style={{width:20,height:20,borderRadius:"50%",background:T.a+"30",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:T.a}}>{(f.profiles?.full_name||f.profiles?.email||"?").charAt(0).toUpperCase()}</span>
              {f.profiles?.full_name||f.profiles?.email||"Unknown user"}
              {f.user_id===authUser?.id&&<span style={{color:T.a}}>(you)</span>}
            </span>
            {f.page_url&&<span>📍 {f.page_url}</span>}
            {f.screen_size&&<span>📐 {f.screen_size}</span>}
            <span>📅 {ago(f.created_at)}</span>
          </div>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <div onClick={()=>toggleUpvote(f.id)} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,cursor:"pointer",background:betaFbMyUpvotes.has(f.id)?T.a+"18":T.d,border:`1px solid ${betaFbMyUpvotes.has(f.id)?T.a+"40":T.b}`,color:betaFbMyUpvotes.has(f.id)?T.a:T.s,fontSize:13,fontWeight:700}}>👍 {f.upvote_count||0}</div>
            {f.user_id===authUser?.id&&<select value={f.status} onChange={async(e)=>{await supabase.from("beta_feedback").update({status:e.target.value}).eq("id",f.id);setBetaFbDetail({...f,status:e.target.value});loadBetaFeedback();}} style={{padding:"8px 12px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:13,fontFamily:"inherit"}}>{Object.entries(BSTAT).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}</select>}
            {profile?.role==="owner"&&f.user_id!==authUser?.id&&<select value={f.status} onChange={async(e)=>{await supabase.from("beta_feedback").update({status:e.target.value}).eq("id",f.id);setBetaFbDetail({...f,status:e.target.value});loadBetaFeedback();}} style={{padding:"8px 12px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:13,fontFamily:"inherit"}}>{Object.entries(BSTAT).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}</select>}
          </div>
        </div>
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:24}}>
          <div style={{fontSize:16,fontWeight:700,color:T.t,marginBottom:16}}>💬 Comments ({betaFbComments.length})</div>
          {betaFbComments.map(c=>(
            <div key={c.id} style={{padding:"12px 0",borderBottom:`1px solid ${T.b}`,fontSize:13}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                <span style={{fontWeight:700,color:c.is_admin?T.a:c.is_rue?T.bl:T.t}}>{c.is_admin?"Admin":c.is_rue?"Rue":"User"}</span>
                <span style={{color:T.m,fontSize:11}}>{ago(c.created_at)}</span>
              </div>
              <div style={{color:T.s,lineHeight:1.6}}>{c.content}</div>
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <input value={betaFbNewComment} onChange={e=>setBetaFbNewComment(e.target.value)} placeholder="Add a comment..." onKeyDown={e=>{if(e.key==="Enter")addFbComment(f.id);}} style={{flex:1,padding:"10px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
            <div onClick={()=>addFbComment(f.id)} style={{padding:"10px 18px",borderRadius:8,background:T.a,color:"#000",fontSize:13,fontWeight:700,cursor:"pointer"}}>Send</div>
          </div>
        </div>
      </div>
    );
  }

  return(
    <>
      {/* Sub-tabs */}
      <div style={{display:"flex",gap:6,marginBottom:24,flexWrap:"wrap"}}>
        {[["feedback","📋 Feedback"],["polls","📊 Polls"],["forum","💬 Forum"],["announcements","📢 Announcements"+(betaUnreadAnnouncements?" ("+betaUnreadAnnouncements+")":"")]].map(([id,label])=>
          <div key={id} onClick={()=>setBetaTab(id)} style={{padding:"10px 20px",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",background:betaTab===id?T.a+"18":T.card,color:betaTab===id?T.a:T.s,border:`1px solid ${betaTab===id?T.a+"40":T.b}`,transition:"all 0.15s"}}>{label}</div>
        )}
        {profile?.role==="owner"&&<div onClick={()=>{setBetaTab("admin");loadBetaAdmin();}} style={{padding:"10px 20px",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",background:betaTab==="admin"?T.r+"18":T.card,color:betaTab==="admin"?T.r:T.s,border:`1px solid ${betaTab==="admin"?T.r+"40":T.b}`,marginLeft:"auto"}}>⚙️ Admin</div>}
      </div>

      {/* ━━━ FEEDBACK BOARD ━━━ */}
      {betaTab==="feedback"&&<>
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
          <select value={betaFbSort} onChange={e=>setBetaFbSort(e.target.value)} style={{padding:"8px 12px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:12,fontFamily:"inherit"}}>
            <option value="newest">Newest</option><option value="upvotes">Most Upvoted</option><option value="comments">Most Comments</option><option value="status">By Status</option>
          </select>
          <select value={betaFbFilterType} onChange={e=>setBetaFbFilterType(e.target.value)} style={{padding:"8px 12px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:12,fontFamily:"inherit"}}>
            <option value="all">All Types</option>{Object.entries(BTYPES).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}
          </select>
          <select value={betaFbFilterStatus} onChange={e=>setBetaFbFilterStatus(e.target.value)} style={{padding:"8px 12px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:12,fontFamily:"inherit"}}>
            <option value="all">All Status</option>{Object.entries(BSTAT).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}
          </select>
          <span style={{fontSize:12,color:T.m,marginLeft:"auto"}}>{filteredFb.length} items</span>
        </div>
        {filteredFb.length===0?<div style={{textAlign:"center",padding:48,color:T.m}}>No feedback yet. Use the 🐛 button to submit!</div>:
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:12}}>
          {filteredFb.map(f=>{
            const bt=BTYPES[f.type]||BTYPES.bug;const bs=BSEV[f.severity]||BSEV.medium;const bst=BSTAT[f.status]||BSTAT.new;
            return(
              <div key={f.id} onClick={()=>{setBetaFbDetail(f);loadFbComments(f.id);}} style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"18px 20px",cursor:"pointer",transition:"border-color 0.15s"}} onMouseOver={e=>e.currentTarget.style.borderColor=T.a+"40"} onMouseOut={e=>e.currentTarget.style.borderColor=T.b}>
                <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:999,background:bt.c+"18",color:bt.c}}>{bt.l}</span>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:999,background:bs.c+"18",color:bs.c}}>{bs.l}</span>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:999,background:bst.c+"18",color:bst.c}}>{bst.l}</span>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:T.t,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.title}</div>
                <div style={{fontSize:12,color:T.s,lineHeight:1.5,marginBottom:10,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{f.description}</div>
                <div style={{fontSize:11,color:T.m,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                  <span style={{width:18,height:18,borderRadius:"50%",background:T.a+"30",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:T.a,flexShrink:0}}>{(f.profiles?.full_name||f.profiles?.email||"?").charAt(0).toUpperCase()}</span>
                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.profiles?.full_name||f.profiles?.email||"Unknown"}</span>
                  {f.user_id===authUser?.id&&<span style={{fontSize:10,fontWeight:700,color:T.a,flexShrink:0}}>· you</span>}
                </div>
                <div style={{display:"flex",gap:12,fontSize:12,color:T.m,alignItems:"center"}}>
                  <span style={{color:betaFbMyUpvotes.has(f.id)?T.a:T.m}}>👍 {f.upvote_count||0}</span>
                  <span>💬 {f.comment_count||0}</span>
                  <span style={{marginLeft:"auto"}}>{ago(f.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>}
      </>}

      {/* ━━━ POLLS ━━━ */}
      {betaTab==="polls"&&<>
        {profile?.role==="owner"&&!betaPollForm&&<div onClick={()=>setBetaPollForm({title:"",description:"",poll_type:"single",options:[{id:"1",text:""},{id:"2",text:""}]})} style={{padding:"10px 20px",borderRadius:8,background:T.a+"18",border:`1px solid ${T.a}40`,color:T.a,fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:16,display:"inline-block"}}>+ Create Poll</div>}
        {betaPollForm&&<div style={{background:T.card,border:`1px solid ${T.a}40`,borderRadius:12,padding:24,marginBottom:16}}>
          <div style={{fontSize:16,fontWeight:700,color:T.t,marginBottom:12}}>New Poll</div>
          <input value={betaPollForm.title} onChange={e=>setBetaPollForm(p=>({...p,title:e.target.value}))} placeholder="Poll title" style={{width:"100%",padding:"10px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:14,outline:"none",fontFamily:"inherit",marginBottom:8,boxSizing:"border-box"}}/>
          <textarea value={betaPollForm.description} onChange={e=>setBetaPollForm(p=>({...p,description:e.target.value}))} placeholder="Description (optional)" rows={2} style={{width:"100%",padding:"10px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:13,outline:"none",fontFamily:"inherit",resize:"none",marginBottom:8,boxSizing:"border-box"}}/>
          <select value={betaPollForm.poll_type} onChange={e=>setBetaPollForm(p=>({...p,poll_type:e.target.value}))} style={{padding:"8px 12px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:12,fontFamily:"inherit",marginBottom:10}}>
            <option value="single">Single Choice</option><option value="multi">Multiple Choice</option><option value="rating">Rating (1-5)</option><option value="open_text">Open Text</option>
          </select>
          {(betaPollForm.poll_type==="single"||betaPollForm.poll_type==="multi")&&<div style={{marginBottom:10}}>
            {betaPollForm.options.map((o,i)=><div key={o.id} style={{display:"flex",gap:6,marginBottom:6}}>
              <input value={o.text} onChange={e=>{const opts=[...betaPollForm.options];opts[i]={...opts[i],text:e.target.value};setBetaPollForm(p=>({...p,options:opts}));}} placeholder={`Option ${i+1}`} style={{flex:1,padding:"8px 12px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              {betaPollForm.options.length>2&&<div onClick={()=>setBetaPollForm(p=>({...p,options:p.options.filter((_,j)=>j!==i)}))} style={{padding:"8px",cursor:"pointer",color:T.r,fontSize:14}}>✕</div>}
            </div>)}
            <div onClick={()=>setBetaPollForm(p=>({...p,options:[...p.options,{id:String(p.options.length+1),text:""}]}))} style={{fontSize:12,color:T.a,cursor:"pointer",fontWeight:600}}>+ Add Option</div>
          </div>}
          <div style={{display:"flex",gap:8}}>
            <div onClick={async()=>{if(!betaPollForm.title.trim())return;await supabase.from("beta_polls").insert({created_by:authUser.id,title:betaPollForm.title.trim(),description:betaPollForm.description.trim()||null,poll_type:betaPollForm.poll_type,options:betaPollForm.poll_type==="rating"||betaPollForm.poll_type==="open_text"?null:betaPollForm.options.filter(o=>o.text.trim()),is_active:true});setBetaPollForm(null);loadBetaPolls();}} style={{padding:"10px 20px",borderRadius:8,background:T.a,color:"#000",fontSize:13,fontWeight:700,cursor:"pointer"}}>Create</div>
            <div onClick={()=>setBetaPollForm(null)} style={{padding:"10px 20px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.s,fontSize:13,fontWeight:700,cursor:"pointer"}}>Cancel</div>
          </div>
        </div>}
        {betaPolls.length===0?<div style={{textAlign:"center",padding:48,color:T.m}}>No active polls</div>:
        betaPolls.map(p=>{
          const voted=!!betaPollResponses[p.id];
          const PollInput=()=>{
            const[sel,setSel]=useState(p.poll_type==="multi"?[]:"");
            const[rating,setRating]=useState(3);
            const[txt,setTxt]=useState("");
            if(p.poll_type==="single")return(<div>{(p.options||[]).map(o=><label key={o.id} style={{display:"flex",gap:8,padding:"8px 0",cursor:"pointer",color:T.s,fontSize:13}}><input type="radio" name={`poll-${p.id}`} value={o.id} checked={sel===o.id} onChange={()=>setSel(o.id)}/>{o.text}</label>)}<div onClick={()=>sel&&submitPollVote(p.id,"single",sel)} style={{marginTop:8,padding:"8px 18px",borderRadius:8,background:sel?T.a:T.m,color:sel?"#000":T.s,fontSize:12,fontWeight:700,cursor:sel?"pointer":"default",display:"inline-block"}}>Vote</div></div>);
            if(p.poll_type==="multi")return(<div>{(p.options||[]).map(o=><label key={o.id} style={{display:"flex",gap:8,padding:"8px 0",cursor:"pointer",color:T.s,fontSize:13}}><input type="checkbox" checked={sel.includes(o.id)} onChange={e=>{if(e.target.checked)setSel(v=>[...v,o.id]);else setSel(v=>v.filter(x=>x!==o.id));}}/>{o.text}</label>)}<div onClick={()=>sel.length&&submitPollVote(p.id,"multi",sel)} style={{marginTop:8,padding:"8px 18px",borderRadius:8,background:sel.length?T.a:T.m,color:sel.length?"#000":T.s,fontSize:12,fontWeight:700,cursor:sel.length?"pointer":"default",display:"inline-block"}}>Vote</div></div>);
            if(p.poll_type==="rating")return(<div style={{display:"flex",gap:8,alignItems:"center"}}>{[1,2,3,4,5].map(n=><div key={n} onClick={()=>setRating(n)} style={{width:36,height:36,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:rating>=n?T.a+"25":T.d,color:rating>=n?T.a:T.m,fontSize:16,fontWeight:800,border:`1px solid ${rating>=n?T.a+"40":T.b}`}}>{n}</div>)}<div onClick={()=>submitPollVote(p.id,"rating",rating)} style={{padding:"8px 18px",borderRadius:8,background:T.a,color:"#000",fontSize:12,fontWeight:700,cursor:"pointer",marginLeft:8}}>Rate</div></div>);
            if(p.poll_type==="open_text")return(<div style={{display:"flex",gap:8}}><input value={txt} onChange={e=>setTxt(e.target.value)} placeholder="Your response..." style={{flex:1,padding:"10px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:13,outline:"none",fontFamily:"inherit"}}/><div onClick={()=>txt.trim()&&submitPollVote(p.id,"open_text",txt.trim())} style={{padding:"10px 18px",borderRadius:8,background:T.a,color:"#000",fontSize:13,fontWeight:700,cursor:"pointer"}}>Submit</div></div>);
            return null;
          };
          return(
            <div key={p.id} style={{background:T.card,border:`1px solid ${p.pinned?T.a+"40":T.b}`,borderRadius:12,padding:24,marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{fontSize:17,fontWeight:700,color:T.t}}>{p.pinned?"📌 ":""}{p.title}</div>
                <span style={{fontSize:11,color:T.m}}>{p.total_responses||0} responses</span>
              </div>
              {p.description&&<div style={{fontSize:13,color:T.s,marginBottom:12}}>{p.description}</div>}
              {voted?<div style={{padding:"12px 16px",borderRadius:8,background:T.a+"10",border:`1px solid ${T.a}20`,color:T.a,fontSize:13,fontWeight:600}}>✓ You've already voted</div>:<PollInput/>}
            </div>
          );
        })}
      </>}

      {/* ━━━ FORUM ━━━ */}
      {betaTab==="forum"&&<div style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:16,minHeight:400}}>
        {/* Channel sidebar */}
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:12}}>
          <div style={{fontSize:12,fontWeight:700,color:T.m,letterSpacing:1.5,marginBottom:8,padding:"0 4px"}}>CHANNELS</div>
          {betaChannels.map(ch=>(
            <div key={ch.id} onClick={()=>setBetaSelChannel(ch)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 8px",borderRadius:8,cursor:"pointer",background:betaSelChannel?.id===ch.id?T.am:"transparent",color:betaSelChannel?.id===ch.id?T.a:T.s,fontSize:13,fontWeight:betaSelChannel?.id===ch.id?700:500,transition:"all 0.12s"}}>
              <span>{ch.icon||"#"}</span><span>{ch.name}</span>
              {channelUnread(ch)&&<span style={{width:6,height:6,borderRadius:"50%",background:T.a,marginLeft:"auto",flexShrink:0}}/>}
            </div>
          ))}
        </div>
        {/* Posts area */}
        <div style={{display:"flex",flexDirection:"column",background:T.card,border:`1px solid ${T.b}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.b}`,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:18}}>{betaSelChannel?.icon||"#"}</span>
            <span style={{fontSize:16,fontWeight:700,color:T.t}}>{betaSelChannel?.name||"Select a channel"}</span>
            {betaSelChannel?.description&&<span style={{fontSize:12,color:T.m,marginLeft:8}}>{betaSelChannel.description}</span>}
          </div>
          <div style={{flex:1,overflow:"auto",padding:"12px 20px",display:"flex",flexDirection:"column",gap:8}}>
            {betaRueTyping&&<div style={{padding:"12px 16px",borderRadius:10,background:T.bl+"10",border:`1px solid ${T.bl}20`,fontSize:13,color:T.bl}}>🤖 Rue is typing...</div>}
            {betaPosts.length===0?<div style={{textAlign:"center",padding:32,color:T.m,fontSize:13}}>No posts yet. Start the conversation!</div>:
            betaPosts.map(post=>(
              <div key={post.id} style={{padding:"12px 16px",borderRadius:10,background:post.is_pinned?T.a+"08":post.is_rue?T.bl+"08":"transparent",border:`1px solid ${post.is_pinned?T.a+"20":T.b}`}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                  <span style={{fontWeight:700,fontSize:13,color:post.is_admin?T.a:post.is_rue?T.bl:post.is_livi?T.p:T.t}}>{post.is_admin?"Admin":post.is_rue?"🤖 Rue":post.is_livi?"Livi":"Member"}</span>
                  {post.is_pinned&&<span style={{fontSize:10,color:T.a}}>📌 Pinned</span>}
                  <span style={{fontSize:11,color:T.m,marginLeft:"auto"}}>{ago(post.created_at)}</span>
                </div>
                <div style={{fontSize:14,color:T.s,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{post.content}</div>
                <div style={{display:"flex",gap:4,marginTop:8,alignItems:"center",flexWrap:"wrap"}}>
                  {REMOJIS.map(em=>{
                    const cnt=(post.reaction_counts||{})[em]||0;
                    const mine=(betaMyReactions[post.id]||new Set()).has(em);
                    return(cnt>0||mine)?(
                      <div key={em} onClick={()=>toggleReaction(post.id,em)} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:999,cursor:"pointer",background:mine?T.a+"18":T.d,border:`1px solid ${mine?T.a+"30":T.b}`,fontSize:12}}><span>{em}</span><span style={{fontWeight:700,color:mine?T.a:T.m}}>{cnt}</span></div>
                    ):null;
                  })}
                  <div style={{display:"flex",gap:2,marginLeft:4}}>{REMOJIS.map(em=>{
                    const cnt=(post.reaction_counts||{})[em]||0;
                    const mine=(betaMyReactions[post.id]||new Set()).has(em);
                    return(!cnt&&!mine)?<div key={em} onClick={()=>toggleReaction(post.id,em)} style={{padding:"3px 6px",borderRadius:999,cursor:"pointer",fontSize:11,opacity:0.4,transition:"opacity 0.15s"}} onMouseOver={e=>e.currentTarget.style.opacity="1"} onMouseOut={e=>e.currentTarget.style.opacity="0.4"}>{em}</div>:null;
                  })}</div>
                  <div onClick={()=>setBetaReplyTo(betaReplyTo===post.id?null:post.id)} style={{fontSize:11,color:T.s,cursor:"pointer",marginLeft:"auto",fontWeight:600}}>↩ Reply{post.reply_count?` (${post.reply_count})`:""}</div>
                </div>
                {betaReplyTo===post.id&&<div style={{display:"flex",gap:8,marginTop:8}}>
                  <input value={betaReplyText} onChange={e=>setBetaReplyText(e.target.value)} placeholder="Reply..." onKeyDown={e=>{if(e.key==="Enter"&&betaReplyText.trim()){sendForumPost(betaReplyText,post.id);setBetaReplyText("");}}} style={{flex:1,padding:"8px 12px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                  <div onClick={()=>{if(betaReplyText.trim()){sendForumPost(betaReplyText,post.id);setBetaReplyText("");}}} style={{padding:"8px 14px",borderRadius:8,background:T.a,color:"#000",fontSize:12,fontWeight:700,cursor:"pointer"}}>Send</div>
                </div>}
              </div>
            ))}
          </div>
          {/* New post input */}
          {betaSelChannel&&!(betaSelChannel.is_announcement&&profile?.role!=="owner")&&<div style={{padding:"12px 20px",borderTop:`1px solid ${T.b}`,display:"flex",gap:8}}>
            <input value={betaNewPost} onChange={e=>setBetaNewPost(e.target.value)} placeholder={betaSelChannel?.slug==="ask-rue"?"Ask Rue a question...":"Write a message..."} onKeyDown={e=>{if(e.key==="Enter"&&betaNewPost.trim())sendForumPost(betaNewPost);}} style={{flex:1,padding:"10px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
            <div onClick={()=>{if(betaNewPost.trim())sendForumPost(betaNewPost);}} style={{padding:"10px 18px",borderRadius:8,background:T.a,color:"#000",fontSize:13,fontWeight:700,cursor:"pointer"}}>Send</div>
          </div>}
        </div>
      </div>}

      {/* ━━━ ANNOUNCEMENTS ━━━ */}
      {betaTab==="announcements"&&<>
        {profile?.role==="owner"&&!betaNewAnnouncement&&<div onClick={()=>setBetaNewAnnouncement({title:"",content:"",type:"update"})} style={{padding:"10px 20px",borderRadius:8,background:T.a+"18",border:`1px solid ${T.a}40`,color:T.a,fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:16,display:"inline-block"}}>+ New Announcement</div>}
        {betaNewAnnouncement&&<div style={{background:T.card,border:`1px solid ${T.a}40`,borderRadius:12,padding:24,marginBottom:16}}>
          <div style={{fontSize:16,fontWeight:700,color:T.t,marginBottom:12}}>New Announcement</div>
          <input value={betaNewAnnouncement.title} onChange={e=>setBetaNewAnnouncement(p=>({...p,title:e.target.value}))} placeholder="Title" style={{width:"100%",padding:"10px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:14,outline:"none",fontFamily:"inherit",marginBottom:8,boxSizing:"border-box"}}/>
          <textarea value={betaNewAnnouncement.content} onChange={e=>setBetaNewAnnouncement(p=>({...p,content:e.target.value}))} placeholder="Content" rows={4} style={{width:"100%",padding:"10px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:13,outline:"none",fontFamily:"inherit",resize:"none",marginBottom:8,boxSizing:"border-box"}}/>
          <select value={betaNewAnnouncement.type} onChange={e=>setBetaNewAnnouncement(p=>({...p,type:e.target.value}))} style={{padding:"8px 12px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:12,fontFamily:"inherit",marginBottom:10}}>
            {Object.entries(ATYPE).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}
          </select>
          <div style={{display:"flex",gap:8}}>
            <div onClick={async()=>{if(!betaNewAnnouncement.title.trim())return;await supabase.from("beta_announcements").insert({created_by:authUser.id,title:betaNewAnnouncement.title.trim(),content:betaNewAnnouncement.content.trim(),type:betaNewAnnouncement.type});setBetaNewAnnouncement(null);loadBetaAnnouncements();}} style={{padding:"10px 20px",borderRadius:8,background:T.a,color:"#000",fontSize:13,fontWeight:700,cursor:"pointer"}}>Publish</div>
            <div onClick={()=>setBetaNewAnnouncement(null)} style={{padding:"10px 20px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.s,fontSize:13,fontWeight:700,cursor:"pointer"}}>Cancel</div>
          </div>
        </div>}
        {betaAnnouncements.length===0?<div style={{textAlign:"center",padding:48,color:T.m}}>No announcements yet</div>:
        betaAnnouncements.map(a=>{
          const at=ATYPE[a.type]||ATYPE.update;
          const isRead=betaAnnouncementReads.has(a.id);
          return(
            <div key={a.id} onClick={()=>markAnnouncementRead(a.id)} style={{background:T.card,border:`1px solid ${isRead?T.b:at.c+"40"}`,borderRadius:12,padding:"20px 24px",marginBottom:12,borderLeft:`3px solid ${at.c}`,cursor:"pointer"}}>
              <div style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
                <span style={{fontSize:10,fontWeight:700,padding:"2px 10px",borderRadius:999,background:at.c+"18",color:at.c}}>{at.l}</span>
                {a.is_pinned&&<span style={{fontSize:10,color:T.a}}>📌</span>}
                {!isRead&&<span style={{width:6,height:6,borderRadius:"50%",background:T.a}}/>}
                <span style={{fontSize:11,color:T.m,marginLeft:"auto"}}>{ago(a.created_at)}</span>
              </div>
              <div style={{fontSize:17,fontWeight:700,color:T.t,marginBottom:6}}>{a.title}</div>
              <div style={{fontSize:13,color:T.s,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{a.content}</div>
            </div>
          );
        })}
      </>}

      {/* ━━━ ADMIN ━━━ */}
      {betaTab==="admin"&&profile?.role==="owner"&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:24}} className="kpi-grid">
          {[["📋","Feedback",betaAdminStats.feedback,T.bl],["🐛","Open Bugs",betaAdminStats.openBugs,T.r],["💡","Features",betaAdminStats.featureReqs,T.p],["📊","Polls",betaAdminStats.activePolls,T.y],["💬","Posts Today",betaAdminStats.postsToday,T.a]].map(([ic,l,v,c],i)=>
            <div key={i} style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"18px 16px",textAlign:"center"}}>
              <div style={{fontSize:22,marginBottom:4}}>{ic}</div>
              <div style={{fontSize:28,fontWeight:800,color:T.t}}>{v}</div>
              <div style={{fontSize:11,color:c,fontWeight:700}}>{l}</div>
            </div>
          )}
        </div>
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:24}}>
          <div style={{fontSize:16,fontWeight:700,color:T.t,marginBottom:16}}>👥 Beta Tester Management</div>
          <div style={{maxHeight:400,overflow:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{borderBottom:`1px solid ${T.b}`}}>
                <th style={{padding:"8px 12px",textAlign:"left",color:T.m,fontWeight:700,fontSize:11,letterSpacing:1}}>NAME</th>
                <th style={{padding:"8px 12px",textAlign:"left",color:T.m,fontWeight:700,fontSize:11,letterSpacing:1}}>EMAIL</th>
                <th style={{padding:"8px 12px",textAlign:"left",color:T.m,fontWeight:700,fontSize:11,letterSpacing:1}}>PLAN</th>
                <th style={{padding:"8px 12px",textAlign:"left",color:T.m,fontWeight:700,fontSize:11,letterSpacing:1}}>JOINED</th>
                <th style={{padding:"8px 12px",textAlign:"center",color:T.m,fontWeight:700,fontSize:11,letterSpacing:1}}>BETA</th>
              </tr></thead>
              <tbody>{betaAdminUsers.map(u=>(
                <tr key={u.id} style={{borderBottom:`1px solid ${T.b}20`}}>
                  <td style={{padding:"10px 12px",color:T.t,fontWeight:600}}>{u.full_name||"—"}</td>
                  <td style={{padding:"10px 12px",color:T.s}}>{u.email||"—"}</td>
                  <td style={{padding:"10px 12px"}}><span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:999,background:u.plan==="pro"?T.a+"18":T.m+"18",color:u.plan==="pro"?T.a:T.s}}>{(u.plan||"free").toUpperCase()}</span></td>
                  <td style={{padding:"10px 12px",color:T.m,fontSize:11}}>{u.beta_joined_at?new Date(u.beta_joined_at).toLocaleDateString():"—"}</td>
                  <td style={{padding:"10px 12px",textAlign:"center"}}>
                    <div onClick={async()=>{const next=!u.is_beta_tester;await supabase.from("profiles").update({is_beta_tester:next,beta_joined_at:next?new Date().toISOString():null}).eq("id",u.id);setBetaAdminUsers(p=>p.map(x=>x.id===u.id?{...x,is_beta_tester:next,beta_joined_at:next?new Date().toISOString():null}:x));}} style={{width:40,height:22,borderRadius:11,background:u.is_beta_tester?T.a:T.m,cursor:"pointer",position:"relative",transition:"background 0.2s"}}>
                      <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:u.is_beta_tester?20:2,transition:"left 0.2s"}}/>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </>}
    </>
  );
}

export function BugReporter({ supabase, authUser, profile }) {
  const [bugReporterOpen,setBugReporterOpen]=useState(false);
  const [bugForm,setBugForm]=useState({title:"",type:"bug",severity:"medium",category:"Dashboard",description:"",steps:"",screenshots:[]});
  const [bugSubmitting,setBugSubmitting]=useState(false);
  const [bugToast,setBugToast]=useState(null);
  const [screenshotCapturing,setScreenshotCapturing]=useState(false);

  const isBeta = profile?.is_beta_tester === true;

  const submitBugReport=async()=>{
    if(!bugForm.title.trim()||!bugForm.description.trim())return;
    setBugSubmitting(true);
    await supabase.from("beta_feedback").insert({
      user_id:authUser.id,type:bugForm.type,severity:bugForm.severity,category:bugForm.category,
      title:bugForm.title.trim(),description:bugForm.description.trim(),
      steps_to_reproduce:bugForm.steps.trim()||null,
      screenshots:bugForm.screenshots.length?bugForm.screenshots:null,
      page_url:window.location.href,browser:navigator.userAgent,
      screen_size:`${window.innerWidth}x${window.innerHeight}`,os:navigator.platform,current_view:window.location.hash.replace("#",""),session_duration_seconds:Math.round((Date.now()-window._sessionStart||0)/1000),
      user_plan:profile?.plan||"free",status:"new"
    });
    setBugForm({title:"",type:"bug",severity:"medium",category:"Dashboard",description:"",steps:"",screenshots:[]});
    setBugReporterOpen(false);setBugSubmitting(false);
    setBugToast("Feedback submitted! We'll look at this shortly.");
    setTimeout(()=>setBugToast(null),3000);
  };

  const captureScreenshot=async()=>{
    setScreenshotCapturing(true);
    try{
      const html2canvas=(await import("html2canvas")).default;
      const canvas=await html2canvas(document.body,{useCORS:true,scale:0.5});
      const blob=await new Promise(r=>canvas.toBlob(r,"image/png"));
      const path=`${authUser.id}/${Date.now()}.png`;
      const{error}=await supabase.storage.from("beta-screenshots").upload(path,blob,{contentType:"image/png"});
      if(!error){
        const{data:{publicUrl}}=supabase.storage.from("beta-screenshots").getPublicUrl(path);
        setBugForm(p=>({...p,screenshots:[...p.screenshots,publicUrl]}));
      }
    }catch(e){console.error("Screenshot error:",e);}
    setScreenshotCapturing(false);
  };

  return(
    <>
      {/* ━━━ BUG REPORTER FLOATING WIDGET ━━━ */}
      {isBeta&&<>
        <div onClick={()=>setBugReporterOpen(o=>!o)} style={{position:"fixed",bottom:24,left:24,width:52,height:52,borderRadius:"50%",background:"#1a1a2e",border:`2px solid ${bugReporterOpen?T.a:T.b}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",zIndex:1200,fontSize:22,boxShadow:"0 4px 20px rgba(0,0,0,0.5)",transition:"border-color 0.2s"}} onMouseOver={e=>e.currentTarget.style.borderColor=T.a} onMouseOut={e=>{if(!bugReporterOpen)e.currentTarget.style.borderColor=T.b;}}>🐛</div>
        {bugReporterOpen&&<div style={{position:"fixed",bottom:88,left:24,width:400,maxHeight:"70vh",background:T.card,border:`1px solid ${T.b}`,borderRadius:16,zIndex:1200,boxShadow:"0 8px 40px rgba(0,0,0,0.6)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.b}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <span style={{fontSize:16,fontWeight:700,color:T.t}}>🐛 Submit Feedback</span>
            <div onClick={()=>setBugReporterOpen(false)} style={{cursor:"pointer",color:T.m,fontSize:18}}>✕</div>
          </div>
          <div style={{padding:20,overflow:"auto",display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <div style={{fontSize:11,color:T.m,letterSpacing:1.2,fontWeight:700,marginBottom:4}}>TITLE *</div>
              <input value={bugForm.title} onChange={e=>setBugForm(p=>({...p,title:e.target.value}))} placeholder="Brief summary" style={{width:"100%",padding:"10px 12px",borderRadius:8,background:T.d,border:`1px solid ${bugForm.title.trim()?T.a+"30":T.b}`,color:T.t,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div>
                <div style={{fontSize:11,color:T.m,letterSpacing:1.2,fontWeight:700,marginBottom:4}}>TYPE</div>
                <select value={bugForm.type} onChange={e=>setBugForm(p=>({...p,type:e.target.value}))} style={{width:"100%",padding:"10px 12px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}>
                  <option value="bug">Bug</option><option value="ui_issue">UI Issue</option><option value="feature_request">Feature Request</option><option value="suggestion">Suggestion</option><option value="question">Question</option>
                </select>
              </div>
              <div>
                <div style={{fontSize:11,color:T.m,letterSpacing:1.2,fontWeight:700,marginBottom:4}}>CATEGORY</div>
                <select value={bugForm.category} onChange={e=>setBugForm(p=>({...p,category:e.target.value}))} style={{width:"100%",padding:"10px 12px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}>
                  {["Pipeline","Directory","Content","Tasks","Dashboard","Landing Page","Blog","Auth","Billing","Other"].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div style={{fontSize:11,color:T.m,letterSpacing:1.2,fontWeight:700,marginBottom:4}}>SEVERITY</div>
              <div style={{display:"flex",gap:6}}>
                {[["critical","Critical",T.r],["high","High","#F97316"],["medium","Medium",T.y],["low","Low",T.s]].map(([v,l,c])=>
                  <div key={v} onClick={()=>setBugForm(p=>({...p,severity:v}))} style={{flex:1,padding:"8px 0",borderRadius:8,textAlign:"center",cursor:"pointer",fontSize:11,fontWeight:700,background:bugForm.severity===v?c+"20":"transparent",border:`1px solid ${bugForm.severity===v?c+"40":T.b}`,color:bugForm.severity===v?c:T.m}}>{l}</div>
                )}
              </div>
            </div>
            <div>
              <div style={{fontSize:11,color:T.m,letterSpacing:1.2,fontWeight:700,marginBottom:4}}>DESCRIPTION *</div>
              <textarea value={bugForm.description} onChange={e=>setBugForm(p=>({...p,description:e.target.value}))} placeholder="What happened?" rows={3} style={{width:"100%",padding:"10px 12px",borderRadius:8,background:T.d,border:`1px solid ${bugForm.description.trim()?T.a+"30":T.b}`,color:T.t,fontSize:13,outline:"none",fontFamily:"inherit",resize:"none",boxSizing:"border-box",lineHeight:1.5}}/>
            </div>
            {(bugForm.type==="bug"||bugForm.type==="ui_issue")&&<div>
              <div style={{fontSize:11,color:T.m,letterSpacing:1.2,fontWeight:700,marginBottom:4}}>STEPS TO REPRODUCE</div>
              <textarea value={bugForm.steps} onChange={e=>setBugForm(p=>({...p,steps:e.target.value}))} placeholder="1. Go to...\n2. Click on...\n3. See error" rows={2} style={{width:"100%",padding:"10px 12px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:13,outline:"none",fontFamily:"inherit",resize:"none",boxSizing:"border-box",lineHeight:1.5}}/>
            </div>}
            <div>
              <div onClick={captureScreenshot} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.s,fontSize:12,fontWeight:600,cursor:"pointer"}}>{screenshotCapturing?"⏳ Capturing...":"📸 Capture Screenshot"}</div>
              {bugForm.screenshots.length>0&&<div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                {bugForm.screenshots.map((s,i)=><div key={i} style={{position:"relative"}}>
                  <img src={s} alt="" style={{width:60,height:40,objectFit:"cover",borderRadius:6,border:`1px solid ${T.b}`}}/>
                  <div onClick={()=>setBugForm(p=>({...p,screenshots:p.screenshots.filter((_,j)=>j!==i)}))} style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:T.r,color:"#fff",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>✕</div>
                </div>)}
              </div>}
            </div>
          </div>
          <div style={{padding:"12px 20px",borderTop:`1px solid ${T.b}`,flexShrink:0}}>
            <div onClick={submitBugReport} style={{width:"100%",padding:"12px",borderRadius:8,textAlign:"center",background:bugForm.title.trim()&&bugForm.description.trim()?T.a:"#333",color:bugForm.title.trim()&&bugForm.description.trim()?"#000":T.m,fontSize:14,fontWeight:700,cursor:bugForm.title.trim()&&bugForm.description.trim()?"pointer":"default",boxSizing:"border-box"}}>{bugSubmitting?"Submitting...":"Submit Feedback"}</div>
          </div>
        </div>}
      </>}

      {/* Bug report toast */}
      {bugToast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",padding:"12px 24px",borderRadius:10,background:T.a,color:"#000",fontSize:14,fontWeight:700,zIndex:9999,boxShadow:"0 4px 20px rgba(0,229,160,0.3)"}}>{bugToast}</div>}
    </>
  );
}
