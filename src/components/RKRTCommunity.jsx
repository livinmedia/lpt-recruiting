import { useState, useEffect, useCallback, useRef } from "react";

const T = {
  bg:"#04060A", side:"#070A10", card:"#0B0F17", d:"#0F1520",
  b:"rgba(255,255,255,0.05)", bh:"rgba(255,255,255,0.10)",
  a:"#00E5A0", am:"rgba(0,229,160,0.12)",
  r:"#F43F5E", y:"#F59E0B", bl:"#3B82F6", p:"#8B5CF6",
  t:"#E4E8F1", s:"#7B8BA3", m:"#1E2A3A", dim:"#161C28",
};

const TYPE_META = {
  win:       { label:"WIN",      color:"#00E5A0", bg:"rgba(0,229,160,0.10)",  icon:"🏆" },
  challenge: { label:"CHECK-IN", color:"#F59E0B", bg:"rgba(245,158,11,0.10)", icon:"📋" },
  question:  { label:"QUESTION", color:"#3B82F6", bg:"rgba(59,130,246,0.10)", icon:"❓" },
  tip:       { label:"TIP",      color:"#8B5CF6", bg:"rgba(139,92,246,0.10)", icon:"💡" },
};

function timeAgo(ts) {
  const d = (Date.now() - new Date(ts)) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}
function initials(name) {
  if (!name) return "?";
  return name.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase();
}
function colorFromId(id) {
  const c = ["#00E5A0","#3B82F6","#8B5CF6","#F59E0B","#F43F5E","#06B6D4","#EC4899","#10B981"];
  if (!id) return c[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
}
function Avatar({ profile, size=36 }) {
  const name = profile?.full_name || profile?.email || "?";
  const color = colorFromId(profile?.id);
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", flexShrink:0,
      background:`linear-gradient(135deg,${color},${color}88)`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.33, fontWeight:800, color:"#000", border:`2px solid ${color}30` }}>
      {initials(name)}
    </div>
  );
}

function MentionTextarea({ value, onChange, placeholder, rows=3, allMembers=[], style={}, onSubmit }) {
  const [suggestions, setSuggestions] = useState([]);
  const [mentionStart, setMentionStart] = useState(-1);
  const ref = useRef(null);
  function handleChange(e) {
    const val = e.target.value, pos = e.target.selectionStart;
    onChange(val);
    const before = val.slice(0, pos), at = before.lastIndexOf("@");
    if (at !== -1 && (at === 0 || /\s/.test(before[at-1]))) {
      const q = before.slice(at+1).toLowerCase();
      if (!q.includes(" ") && allMembers.length > 0) {
        const m = allMembers.filter(m =>
          (m.full_name||"").toLowerCase().includes(q) || (m.email||"").toLowerCase().includes(q)
        ).slice(0,5);
        setSuggestions(m); setMentionStart(at); return;
      }
    }
    setSuggestions([]);
  }
  function pick(member) {
    const name = member.full_name || member.email;
    const pos = ref.current?.selectionStart || value.length;
    onChange(`${value.slice(0, mentionStart)}@${name} ${value.slice(pos)}`);
    setSuggestions([]);
    setTimeout(() => ref.current?.focus(), 0);
  }
  return (
    <div style={{ flex:1, position:"relative" }}>
      <textarea ref={ref} value={value} onChange={handleChange} onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey && onSubmit) { e.preventDefault(); onSubmit(); } }} onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey && onSubmit) { e.preventDefault(); onSubmit(); } }}
        placeholder={placeholder} rows={rows}
        style={{ width:"100%", background:T.dim, border:`1px solid ${T.b}`,
          borderRadius:10, padding:"12px 16px", color:T.t, fontSize:14,
          outline:"none", fontFamily:"inherit", resize:"none", lineHeight:1.7,
          boxSizing:"border-box", ...style }} />
      {suggestions.length > 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:400,
          background:T.card, border:`1px solid ${T.b}`, borderRadius:10,
          boxShadow:"0 8px 24px rgba(0,0,0,0.5)", overflow:"hidden", marginTop:4 }}>
          {suggestions.map(m => (
            <div key={m.id} onMouseDown={e=>{e.preventDefault();pick(m);}}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", cursor:"pointer" }}
              onMouseEnter={e=>e.currentTarget.style.background=T.dim}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <Avatar profile={m} size={28}/>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:T.t}}>{m.full_name||m.email}</div>
                {m.brokerage && <div style={{fontSize:11,color:T.s}}>{m.brokerage}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RichText({ text }) {
  if (!text) return null;
  return text.split(/(@\S+)/g).map((part, i) =>
    part.startsWith("@") ? <span key={i} style={{color:T.a,fontWeight:700}}>{part}</span> : part
  );
}

function PostCard({ post, currentUserId, allMembers, supabase, onLikeToggle, onCommentSubmit }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const meta = TYPE_META[post.type] || TYPE_META.tip;
  const author = post.profiles;
  async function loadComments() {
    const { data } = await supabase.from("community_comments")
      .select("*, profiles(id,full_name,email,brokerage)")
      .eq("post_id", post.id).order("created_at", { ascending:true });
    if (data) setComments(data);
  }
  async function toggleComments() { if (!open) await loadComments(); setOpen(v => !v); }
  async function submitReply() {
    if (!reply.trim() || !currentUserId) return;
    setSubmitting(true);
    await supabase.from("community_comments").insert({ post_id:post.id, user_id:currentUserId, content:reply.trim() });
    await supabase.from("community_posts").update({ comments_count:(post.comments_count||0)+1 }).eq("id",post.id);
    setReply(""); await loadComments();
    if (onCommentSubmit) onCommentSubmit();
    setSubmitting(false);
  }
  return (
    <div style={{ background:T.card, borderRadius:14, border:`1px solid ${post.pinned?T.a+"30":T.b}`,
      overflow:"hidden", transition:"border-color 0.2s" }}
      onMouseEnter={e=>e.currentTarget.style.borderColor=post.pinned?T.a+"50":T.bh}
      onMouseLeave={e=>e.currentTarget.style.borderColor=post.pinned?T.a+"30":T.b}>
      {post.pinned && (
        <div style={{background:T.am,borderBottom:`1px solid ${T.a}20`,padding:"6px 20px",display:"flex",gap:6}}>
          <span>📌</span><span style={{fontSize:11,color:T.a,fontWeight:700}}>PINNED</span>
        </div>
      )}
      <div style={{padding:"18px 20px"}}>
        <div style={{display:"flex",gap:12,marginBottom:14}}>
          <Avatar profile={author} size={42}/>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{fontSize:14,fontWeight:700,color:T.t}}>{author?.full_name||author?.email||"Unknown"}</span>
              <span style={{fontSize:10,fontWeight:800,letterSpacing:0.8,color:meta.color,background:meta.bg,padding:"2px 9px",borderRadius:20}}>{meta.icon} {meta.label}</span>
              {author?.role==="owner" && <span style={{fontSize:10,fontWeight:700,color:"#F59E0B",background:"rgba(245,158,11,0.12)",padding:"2px 8px",borderRadius:20}}>👑 ADMIN</span>}
            </div>
            <div style={{fontSize:12,color:T.s,marginTop:2}}>
              {author?.brokerage && <span>{author.brokerage} · </span>}{timeAgo(post.created_at)}
            </div>
          </div>
        </div>
        <p style={{fontSize:14,color:T.t,lineHeight:1.75,margin:"0 0 16px",whiteSpace:"pre-wrap"}}><RichText text={post.content}/></p>
        <div style={{display:"flex",gap:4,paddingTop:12,borderTop:`1px solid ${T.b}`}}>
          <button onClick={()=>onLikeToggle(post)} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,border:"none",cursor:"pointer",background:post.liked?T.am:"transparent",color:post.liked?T.a:T.s,fontSize:13,fontWeight:600}}>{post.liked?"♥":"♡"} {post.likes_count||0}</button>
          <button onClick={toggleComments} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,border:"none",cursor:"pointer",background:open?"rgba(59,130,246,0.10)":"transparent",color:open?T.bl:T.s,fontSize:13,fontWeight:600}}>💬 {post.comments_count||0}</button>
        </div>
      </div>
      {open && (
        <div style={{borderTop:`1px solid ${T.b}`,background:T.dim,padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          {comments.length===0 && <div style={{fontSize:13,color:T.s,textAlign:"center",padding:"8px 0"}}>No comments yet.</div>}
          {comments.map((c,i) => (
            <div key={i} style={{display:"flex",gap:10}}>
              <Avatar profile={c.profiles} size={30}/>
              <div style={{flex:1,background:T.card,borderRadius:10,padding:"10px 14px",border:`1px solid ${T.b}`}}>
                <div style={{display:"flex",gap:8,marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:700,color:T.t}}>{c.profiles?.full_name||c.profiles?.email||"User"}</span>
                  <span style={{fontSize:11,color:T.s}}>{timeAgo(c.created_at)}</span>
                </div>
                <p style={{fontSize:13,color:T.t,margin:0,lineHeight:1.6}}><RichText text={c.content}/></p>
              </div>
            </div>
          ))}
          <div style={{display:"flex",gap:10,marginTop:4}}>
            <Avatar profile={{id:currentUserId}} size={30}/>
            <div style={{flex:1,display:"flex",gap:8}}>
              <MentionTextarea value={reply} onChange={setReply} placeholder="Reply... (@mention)" rows={1} allMembers={allMembers} style={{borderRadius:8,padding:"8px 14px",fontSize:13}}/>
              <button onClick={submitReply} disabled={!reply.trim()||submitting} style={{padding:"8px 16px",borderRadius:8,flexShrink:0,border:"none",background:reply.trim()?T.a:T.m,color:reply.trim()?"#000":T.s,fontSize:13,fontWeight:700,cursor:reply.trim()?"pointer":"default"}}>↵</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Compose({ currentUser, allMembers, supabase, onPost }) {
  const [text, setText] = useState("");
  const [type, setType] = useState("win");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);
  async function submit() {
    if (!text.trim() || !currentUser?.id) return;
    setPosting(true); setError(null);
    const { error:err } = await supabase.from("community_posts").insert({
      user_id:currentUser.id, type, content:text.trim(), pinned:false, likes_count:0, comments_count:0,
    });
    if (err) { setError(err.message); }
    else { setText(""); setType("win"); setTimeout(() => onPost && onPost(), 300); }
    setPosting(false);
  }
  return (
    <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:14,padding:20}}>
      <div style={{display:"flex",gap:12,marginBottom:14}}>
        <Avatar profile={currentUser} size={40}/>
        <MentionTextarea value={text} onChange={setText} allMembers={allMembers} placeholder="Share a win, drop a tip, ask the group... (type @ to mention someone)" rows={3} onSubmit={submit}/>
      </div>
      {error && <div style={{fontSize:12,color:T.r,marginBottom:10}}>⚠ {error}</div>}
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {Object.entries(TYPE_META).map(([key,meta]) => (
            <button key={key} onClick={()=>setType(key)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",border:`1px solid ${type===key?meta.color:T.b}`,background:type===key?meta.bg:"transparent",color:type===key?meta.color:T.s}}>{meta.icon} {meta.label}</button>
          ))}
        </div>
        <button onClick={submit} disabled={!text.trim()||posting} style={{marginLeft:"auto",padding:"8px 22px",borderRadius:9,border:"none",background:text.trim()?T.a:T.m,color:text.trim()?"#000":T.s,fontSize:13,fontWeight:800,cursor:text.trim()?"pointer":"default"}}>{posting?"Posting...":"Post"}</button>
      </div>
    </div>
  );
}

function FeedTab({ currentUser, allMembers, supabase }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const loadPosts = async () => {
    setLoading(true);
    let q = supabase.from("community_posts").select("*, profiles(id,full_name,email,brokerage,role)").order("pinned",{ascending:false}).order("created_at",{ascending:false}).limit(50);
    if (filter !== "all") q = q.eq("type", filter);
    const { data } = await q;
    if (!data) { setLoading(false); return; }
    if (currentUser?.id && data.length > 0) {
      const { data:likes } = await supabase.from("community_likes").select("post_id").eq("user_id",currentUser.id).in("post_id",data.map(p=>p.id));
      const liked = new Set((likes||[]).map(l=>l.post_id));
      setPosts(data.map(p=>({...p,liked:liked.has(p.id)})));
    } else { setPosts(data.map(p=>({...p,liked:false}))); }
    setLoading(false);
  };
  useEffect(() => { loadPosts(); }, [filter, currentUser?.id]);
  async function handleLike(post) {
    if (!currentUser?.id) return;
    const nowLiked = !post.liked;
    setPosts(ps => ps.map(p => p.id===post.id ? {...p,liked:nowLiked,likes_count:(p.likes_count||0)+(nowLiked?1:-1)} : p));
    if (nowLiked) {
      await supabase.from("community_likes").insert({post_id:post.id,user_id:currentUser.id});
      await supabase.from("community_posts").update({likes_count:(post.likes_count||0)+1}).eq("id",post.id);
    } else {
      await supabase.from("community_likes").delete().eq("post_id",post.id).eq("user_id",currentUser.id);
      await supabase.from("community_posts").update({likes_count:Math.max(0,(post.likes_count||1)-1)}).eq("id",post.id);
    }
  }
  const FILTERS = [{id:"all",label:"All"},{id:"win",label:"🏆 Wins"},{id:"question",label:"❓ Questions"},{id:"challenge",label:"📋 Check-ins"},{id:"tip",label:"💡 Tips"}];
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:24,alignItems:"start"}}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Compose currentUser={currentUser} allMembers={allMembers} supabase={supabase} onPost={loadPosts}/>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={()=>setFilter(f.id)} style={{padding:"6px 16px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",border:`1px solid ${filter===f.id?T.a:T.b}`,background:filter===f.id?T.am:"transparent",color:filter===f.id?T.a:T.s}}>{f.label}</button>
          ))}
        </div>
        {loading ? <div style={{textAlign:"center",padding:"60px 0",color:T.s}}>Loading feed...</div>
        : posts.length===0 ? (
          <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:14,padding:"60px 40px",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:16}}>🌱</div>
            <div style={{fontSize:18,fontWeight:700,color:T.t,marginBottom:8}}>No posts yet</div>
            <div style={{fontSize:14,color:T.s}}>Be the first to share a win or ask a question.</div>
          </div>
        ) : posts.map(p => <PostCard key={p.id} post={p} currentUserId={currentUser?.id} allMembers={allMembers} supabase={supabase} onLikeToggle={handleLike} onCommentSubmit={loadPosts}/>)}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:14,padding:20}}>
          <div style={{fontSize:13,fontWeight:800,color:T.t,marginBottom:14}}>👥 Members ({allMembers.length})</div>
          {allMembers.slice(0,8).map(m => (
            <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <Avatar profile={m} size={30}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:T.t,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.full_name||m.email}{m.id===currentUser?.id&&<span style={{fontSize:10,color:T.a}}> (you)</span>}</div>
                {m.brokerage && <div style={{fontSize:11,color:T.s}}>{m.brokerage}</div>}
              </div>
            </div>
          ))}
        </div>
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:14,padding:20}}>
          <div style={{fontSize:13,fontWeight:800,color:T.t,marginBottom:14}}>Community Guidelines</div>
          {[["🏆","Share your wins"],["❓","Ask questions"],["💡","Drop tips"],["🤝","Lift each other up"],["🚫","No spam"]].map(([icon,text]) => (
            <div key={text} style={{display:"flex",gap:10,marginBottom:10}}>
              <span>{icon}</span><span style={{fontSize:13,color:T.s}}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CoursesTab({ currentUser, supabase }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("community_courses").select("*").order("sort_order",{ascending:true});
      if (!data) { setLoading(false); return; }
      if (currentUser?.id) {
        const { data:prog } = await supabase.from("community_course_progress").select("course_id,progress_pct").eq("user_id",currentUser.id).in("course_id",data.map(c=>c.id));
        const pm = {}; (prog||[]).forEach(p => pm[p.course_id]=p.progress_pct);
        setCourses(data.map(c=>({...c,progress:pm[c.id]??0})));
      } else { setCourses(data.map(c=>({...c,progress:0}))); }
      setLoading(false);
    }
    load();
  }, [currentUser?.id]);
  if (loading) return <div style={{textAlign:"center",padding:"60px 0",color:T.s}}>Loading courses...</div>;
  if (courses.length===0) return <div style={{textAlign:"center",padding:"80px 0"}}><div style={{fontSize:40,marginBottom:16}}>📚</div><div style={{fontSize:18,fontWeight:700,color:T.t}}>Courses coming soon</div></div>;
  const inProgress=courses.filter(c=>c.progress>0&&c.progress<100), notStarted=courses.filter(c=>c.progress===0), completed=courses.filter(c=>c.progress===100);
  const Section = ({title,color,items}) => (
    <div style={{marginBottom:32}}>
      <div style={{fontSize:13,fontWeight:700,color,marginBottom:14}}>{title}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        {items.map(c => {
          const pct=c.progress||0, done=pct===100;
          return (
            <div key={c.id} style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:14,padding:24,cursor:"pointer",transition:"all 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=T.bh;e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=T.b;e.currentTarget.style.transform="translateY(0)";}}>
              <div style={{fontSize:32,marginBottom:12}}>{c.emoji||"📚"}</div>
              <div style={{fontSize:15,fontWeight:800,color:T.t,marginBottom:6}}>{c.title}</div>
              <p style={{fontSize:13,color:T.s,lineHeight:1.6,margin:"0 0 16px"}}>{c.description}</p>
              <div style={{display:"flex",gap:16,marginBottom:16}}>
                <span style={{fontSize:12,color:T.s}}>📖 {c.lessons} lessons</span>
                <span style={{fontSize:12,color:T.s}}>⏱ {c.duration}</span>
              </div>
              {pct>0 && <div style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:T.s}}>Progress</span><span style={{fontSize:11,fontWeight:700,color:done?T.a:T.t}}>{pct}%</span></div><div style={{background:T.dim,borderRadius:4,height:6}}><div style={{width:`${pct}%`,height:"100%",borderRadius:4,background:`linear-gradient(90deg,${T.a},#00c8ff)`}}/></div></div>}
              <button style={{width:"100%",padding:"10px 0",borderRadius:9,fontSize:13,fontWeight:800,cursor:"pointer",border:`1px solid ${done?T.b:T.a}`,background:done?"transparent":T.am,color:done?T.s:T.a}}>{pct===0?"Start Course":done?"Review":"Continue"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
  return (
    <div>
      <h2 style={{fontSize:22,fontWeight:800,color:T.t,margin:"0 0 24px"}}>{courses.length} Courses</h2>
      {inProgress.length>0 && <Section title="▶ IN PROGRESS" color={T.a} items={inProgress}/>}
      {notStarted.length>0 && <Section title="ALL COURSES" color={T.s} items={notStarted}/>}
      {completed.length>0 && <Section title="✓ COMPLETED" color={T.s} items={completed}/>}
    </div>
  );
}

function ChallengesTab({ currentUser, supabase }) {
  const [challenges, setChallenges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      const { data:cData } = await supabase.from("community_challenges").select("*").eq("active",true).order("ends_at",{ascending:true});
      const { data:lbData } = await supabase.from("user_scores").select("*,profiles(id,full_name,email,brokerage)").order("activity_score",{ascending:false}).limit(10);
      if (cData && currentUser?.id && cData.length>0) {
        const { data:prog } = await supabase.from("community_challenge_progress").select("challenge_id,progress,completed").eq("user_id",currentUser.id).in("challenge_id",cData.map(c=>c.id));
        const pm={}; (prog||[]).forEach(p => pm[p.challenge_id]=p);
        setChallenges(cData.map(c=>({...c,myProgress:pm[c.id]?.progress||0,myCompleted:pm[c.id]?.completed||false})));
      } else { setChallenges(cData||[]); }
      setLeaderboard(lbData||[]); setLoading(false);
    }
    load();
  }, [currentUser?.id]);
  if (loading) return <div style={{textAlign:"center",padding:"60px 0",color:T.s}}>Loading...</div>;
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:24,alignItems:"start"}}>
      <div>
        <h2 style={{fontSize:22,fontWeight:800,color:T.t,margin:"0 0 20px"}}>{challenges.length} Active Challenges</h2>
        {challenges.length===0 ? (
          <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:14,padding:"60px 40px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:16}}>🏁</div><div style={{fontSize:16,fontWeight:700,color:T.t}}>No active challenges right now</div></div>
        ) : challenges.map(c => {
          const pct = c.goal>0?Math.min(100,Math.round((c.myProgress/c.goal)*100)):0;
          const daysLeft = Math.max(0,Math.ceil((new Date(c.ends_at)-Date.now())/86400000));
          return (
            <div key={c.id} style={{background:T.card,border:`1px solid ${c.myCompleted?T.a+"30":T.b}`,borderRadius:14,padding:24,marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
                <div style={{width:48,height:48,borderRadius:12,fontSize:22,display:"flex",alignItems:"center",justifyContent:"center",background:c.myCompleted?T.am:"rgba(139,92,246,0.12)"}}>{c.emoji||"🏆"}</div>
                <div style={{flex:1}}><div style={{fontSize:15,fontWeight:800,color:T.t}}>{c.title}</div><div style={{fontSize:12,color:T.s}}>{daysLeft}d left · +{c.points} pts</div></div>
                {c.myCompleted && <div style={{background:T.am,color:T.a,fontSize:11,fontWeight:800,padding:"3px 10px",borderRadius:20}}>✓ DONE</div>}
              </div>
              {c.description && <p style={{fontSize:13,color:T.s,margin:"0 0 14px"}}>{c.description}</p>}
              <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,color:T.s}}>Progress</span><span style={{fontSize:12,fontWeight:700,color:T.t}}>{c.myProgress}/{c.goal}</span></div><div style={{background:T.dim,borderRadius:8,height:8}}><div style={{width:`${pct}%`,height:"100%",borderRadius:8,background:c.myCompleted?T.a:`linear-gradient(90deg,#8B5CF6,${T.a})`}}/></div></div>
            </div>
          );
        })}
      </div>
      <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:14,padding:24}}>
        <div style={{fontSize:14,fontWeight:800,color:T.t,marginBottom:4}}>{new Date().toLocaleString("default",{month:"long"})} Leaderboard</div>
        <div style={{fontSize:12,color:T.s,marginBottom:18}}>By activity score</div>
        {leaderboard.map((entry,i) => (
          <div key={entry.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,marginBottom:8,background:entry.user_id===currentUser?.id?T.am:T.dim,border:`1px solid ${entry.user_id===currentUser?.id?T.a+"30":"transparent"}`}}>
            <span style={{width:22,textAlign:"center"}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`}</span>
            <Avatar profile={entry.profiles} size={32}/>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:700,color:T.t,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{entry.profiles?.full_name||entry.profiles?.email||"User"}{entry.user_id===currentUser?.id&&<span style={{fontSize:10,color:T.a}}> (you)</span>}</div><div style={{fontSize:11,color:T.s}}>🔥 {entry.streak_days}d</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:800,color:i===0?T.a:T.t}}>{(entry.activity_score||0).toLocaleString()}</div><div style={{fontSize:10,color:T.s}}>pts</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MembersTab({ currentUser, allMembers, supabase }) {
  const [scores, setScores] = useState({});
  const [search, setSearch] = useState("");
  useEffect(() => {
    supabase.from("user_scores").select("user_id,activity_score,streak_days,recruits_closed")
      .then(({data}) => { const m={}; (data||[]).forEach(s=>m[s.user_id]=s); setScores(m); });
  }, []);
  const filtered = allMembers.filter(m => {
    if (!search) return true;
    const q=search.toLowerCase();
    return (m.full_name||"").toLowerCase().includes(q)||(m.email||"").toLowerCase().includes(q)||(m.brokerage||"").toLowerCase().includes(q);
  });
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div><h2 style={{fontSize:22,fontWeight:800,color:T.t,margin:"0 0 4px"}}>Members</h2><p style={{fontSize:13,color:T.s,margin:0}}>{allMembers.length} recruiters</p></div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search members..." style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:9,padding:"9px 16px",color:T.t,fontSize:13,outline:"none",fontFamily:"inherit",width:220}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:16}}>
        {filtered.map(m => {
          const s=scores[m.id]||{}, isYou=m.id===currentUser?.id;
          return (
            <div key={m.id} style={{background:T.card,border:`1px solid ${isYou?T.a+"30":T.b}`,borderRadius:14,padding:24,textAlign:"center",cursor:"pointer",transition:"all 0.2s",position:"relative"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=isYou?T.a+"50":T.bh;e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=isYou?T.a+"30":T.b;e.currentTarget.style.transform="translateY(0)";}}>
              {isYou&&<div style={{position:"absolute",top:12,right:12,fontSize:10,color:T.a,fontWeight:700,background:T.am,padding:"2px 8px",borderRadius:20}}>YOU</div>}
              {m.role==="owner"&&<div style={{position:"absolute",top:12,left:12,fontSize:10,color:"#F59E0B",fontWeight:700,background:"rgba(245,158,11,0.12)",padding:"2px 8px",borderRadius:20}}>👑</div>}
              <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><Avatar profile={m} size={52}/></div>
              <div style={{fontSize:14,fontWeight:700,color:T.t,marginBottom:2}}>{m.full_name||m.email}</div>
              {m.brokerage&&<div style={{fontSize:12,color:T.s,marginBottom:12}}>{m.brokerage}</div>}
              <div style={{display:"flex",justifyContent:"center",gap:12}}>
                <div><div style={{fontSize:14,fontWeight:800,color:T.a}}>{s.recruits_closed||0}</div><div style={{fontSize:11,color:T.s}}>recruits</div></div>
                <div><div style={{fontSize:14,fontWeight:800,color:T.y}}>{s.streak_days||0}d</div><div style={{fontSize:11,color:T.s}}>streak</div></div>
                <div><div style={{fontSize:14,fontWeight:800,color:T.p}}>{(s.activity_score||0).toLocaleString()}</div><div style={{fontSize:11,color:T.s}}>pts</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TABS = [{id:"feed",label:"Feed",icon:"📡"},{id:"courses",label:"Courses",icon:"📚"},{id:"challenges",label:"Challenges",icon:"🏆"},{id:"members",label:"Members",icon:"👥"}];

export default function RKRTCommunity({ userId, profile, supabase }) {
  const [tab, setTab] = useState("feed");
  const [userScore, setUserScore] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  useEffect(() => {
    if (!supabase) return;
    supabase.from("profiles").select("id,full_name,email,brokerage,role").order("full_name",{ascending:true})
      .then(({data}) => { if (data) setAllMembers(data); });
  }, [supabase]);
  useEffect(() => {
    if (!userId || !supabase) return;
    supabase.from("user_scores").select("streak_days,activity_score").eq("user_id",userId).single()
      .then(({data}) => { if (data) setUserScore(data); });
  }, [userId, supabase]);
  const currentUser = profile ? {...profile, id:userId} : (userId ? {id:userId} : null);
  if (!supabase) return <div style={{padding:40,color:T.s,textAlign:"center"}}>Loading...</div>;
  return (
    <div style={{color:T.t,fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <div style={{height:52,borderBottom:`1px solid ${T.b}`,background:T.side,display:"flex",alignItems:"center",padding:"0 4px",marginBottom:24,borderRadius:"12px 12px 0 0",position:"sticky",top:0,zIndex:100}}>
        <div style={{fontSize:13,fontWeight:800,color:T.a,marginRight:20,letterSpacing:0.5,paddingLeft:16,flexShrink:0}}>RKRT <span style={{color:T.s,fontWeight:400}}>Community</span></div>
        <div style={{display:"flex",height:"100%",flex:1,overflowX:"auto"}}>
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{height:"100%",padding:"0 18px",border:"none",background:"transparent",borderBottom:`2px solid ${tab===t.id?T.a:"transparent"}`,color:tab===t.id?T.a:T.s,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all 0.15s",whiteSpace:"nowrap",flexShrink:0}}>{t.icon} {t.label}</button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12,paddingRight:16,flexShrink:0}}>
          {userScore && <div style={{fontSize:12,color:T.s}}>🔥 {userScore.streak_days}d streak</div>}
          {currentUser && <Avatar profile={currentUser} size={30}/>}
        </div>
      </div>
      {tab==="feed"       && <FeedTab currentUser={currentUser} allMembers={allMembers} supabase={supabase}/>}
      {tab==="courses"    && <CoursesTab currentUser={currentUser} supabase={supabase}/>}
      {tab==="challenges" && <ChallengesTab currentUser={currentUser} supabase={supabase}/>}
      {tab==="members"    && <MembersTab currentUser={currentUser} allMembers={allMembers} supabase={supabase}/>}
    </div>
  );
}
