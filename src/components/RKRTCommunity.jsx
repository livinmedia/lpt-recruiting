import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://usknntguurefeyzusbdh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVza25udGd1dXJlZmV5enVzYmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MTcwODAsImV4cCI6MjA4Nzk5MzA4MH0.pxexo90zyugIA4pPzLonGo3E1frr8bSZvz-XT7BmuqQ"
);

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  bg:"#04060A", side:"#070A10", card:"#0B0F17", d:"#0F1520",
  b:"rgba(255,255,255,0.05)", bh:"rgba(255,255,255,0.10)",
  a:"#00E5A0", am:"rgba(0,229,160,0.12)", as:"rgba(0,229,160,0.05)",
  r:"#F43F5E", y:"#F59E0B", bl:"#3B82F6", p:"#8B5CF6", c:"#06B6D4",
  t:"#E4E8F1", s:"#7B8BA3", m:"#1E2A3A", dim:"#161C28",
};

const TYPE_META = {
  win:       { label:"WIN",       color:"#00E5A0", bg:"rgba(0,229,160,0.10)",   icon:"🏆" },
  challenge: { label:"CHECK-IN",  color:"#F59E0B", bg:"rgba(245,158,11,0.10)",  icon:"📋" },
  question:  { label:"QUESTION",  color:"#3B82F6", bg:"rgba(59,130,246,0.10)",  icon:"❓" },
  tip:       { label:"TIP",       color:"#8B5CF6", bg:"rgba(139,92,246,0.10)",  icon:"💡" },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

function getInitials(name) {
  if (!name) return "??";
  return name.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase();
}

function colorFromId(id) {
  const colors = ["#00E5A0","#3B82F6","#8B5CF6","#F59E0B","#F43F5E","#06B6D4","#EC4899","#10B981"];
  if (!id) return colors[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ─── AVATAR ──────────────────────────────────────────────────────────────────
function Avatar({ profile, size=36 }) {
  const name = profile?.full_name || profile?.email || "?";
  const color = colorFromId(profile?.id);
  const initials = getInitials(name);
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%", flexShrink:0,
      background:`linear-gradient(135deg, ${color}, ${color}88)`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.33, fontWeight:800, color:"#000",
      border:`2px solid ${color}30`, letterSpacing:-0.5,
    }}>{initials}</div>
  );
}

// ─── POST CARD ────────────────────────────────────────────────────────────────
function PostCard({ post, currentUserId, onLikeToggle, onCommentSubmit }) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const meta = TYPE_META[post.type] || TYPE_META.tip;
  const author = post.profiles;
  const color = colorFromId(author?.id);

  async function loadComments() {
    const { data } = await supabase
      .from("community_comments")
      .select("*, profiles(id, full_name, email, brokerage)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    if (data) setComments(data);
  }

  async function handleOpenComments() {
    if (!open) await loadComments();
    setOpen(!open);
  }

  async function submitReply() {
    if (!reply.trim() || !currentUserId) return;
    setSubmitting(true);
    await supabase.from("community_comments").insert({
      post_id: post.id,
      user_id: currentUserId,
      content: reply.trim(),
    });
    await supabase.from("community_posts")
      .update({ comments_count: (post.comments_count || 0) + 1 })
      .eq("id", post.id);
    setReply("");
    await loadComments();
    if (onCommentSubmit) onCommentSubmit(post.id);
    setSubmitting(false);
  }

  return (
    <div style={{
      background:T.card, borderRadius:14,
      border:`1px solid ${post.pinned ? T.a+"30" : T.b}`,
      overflow:"hidden", transition:"border-color 0.2s",
    }}
    onMouseEnter={e=>e.currentTarget.style.borderColor = post.pinned ? T.a+"50" : T.bh}
    onMouseLeave={e=>e.currentTarget.style.borderColor = post.pinned ? T.a+"30" : T.b}
    >
      {post.pinned && (
        <div style={{ background:T.am, borderBottom:`1px solid ${T.a}20`, padding:"6px 20px", display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:11 }}>📌</span>
          <span style={{ fontSize:11, color:T.a, fontWeight:700, letterSpacing:0.5 }}>PINNED</span>
        </div>
      )}
      <div style={{ padding:"18px 20px" }}>
        <div style={{ display:"flex", gap:12, marginBottom:14 }}>
          <Avatar profile={author} size={42} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontSize:14, fontWeight:700, color:T.t }}>{author?.full_name || author?.email || "Unknown"}</span>
              <span style={{
                fontSize:10, fontWeight:800, letterSpacing:0.8,
                color:meta.color, background:meta.bg,
                padding:"2px 9px", borderRadius:20,
              }}>{meta.icon} {meta.label}</span>
              {author?.role === "owner" && (
                <span style={{ fontSize:10, fontWeight:700, color:"#F59E0B", background:"rgba(245,158,11,0.12)", padding:"2px 8px", borderRadius:20 }}>👑 ADMIN</span>
              )}
            </div>
            <div style={{ fontSize:12, color:T.s, marginTop:2 }}>
              {author?.brokerage && <span>{author.brokerage} · </span>}
              {timeAgo(post.created_at)}
            </div>
          </div>
        </div>

        <p style={{ fontSize:14, color:T.t, lineHeight:1.75, margin:"0 0 16px", whiteSpace:"pre-wrap" }}>{post.content}</p>

        <div style={{ display:"flex", alignItems:"center", gap:4, paddingTop:12, borderTop:`1px solid ${T.b}` }}>
          <button onClick={()=>onLikeToggle(post)} style={{
            display:"flex", alignItems:"center", gap:6,
            padding:"7px 14px", borderRadius:8, border:"none",
            background: post.liked ? T.am : "transparent",
            color: post.liked ? T.a : T.s,
            fontSize:13, fontWeight:600, cursor:"pointer", transition:"all 0.15s",
          }}>
            <span>{post.liked?"♥":"♡"}</span> {post.likes_count || 0}
          </button>
          <button onClick={handleOpenComments} style={{
            display:"flex", alignItems:"center", gap:6,
            padding:"7px 14px", borderRadius:8, border:"none",
            background: open ? "rgba(59,130,246,0.10)" : "transparent",
            color: open ? T.bl : T.s,
            fontSize:13, fontWeight:600, cursor:"pointer", transition:"all 0.15s",
          }}>
            💬 {post.comments_count || 0}
          </button>
        </div>
      </div>

      {open && (
        <div style={{ borderTop:`1px solid ${T.b}`, background:T.dim, padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
          {comments.length === 0 && (
            <div style={{ fontSize:13, color:T.s, textAlign:"center", padding:"8px 0" }}>No comments yet. Be first.</div>
          )}
          {comments.map((c,i) => (
            <div key={i} style={{ display:"flex", gap:10 }}>
              <Avatar profile={c.profiles} size={30} />
              <div style={{ flex:1, background:T.card, borderRadius:10, padding:"10px 14px", border:`1px solid ${T.b}` }}>
                <div style={{ display:"flex", gap:8, marginBottom:4, alignItems:"center" }}>
                  <span style={{ fontSize:12, fontWeight:700, color:T.t }}>{c.profiles?.full_name || c.profiles?.email || "User"}</span>
                  <span style={{ fontSize:11, color:T.s }}>{timeAgo(c.created_at)}</span>
                </div>
                <p style={{ fontSize:13, color:T.t, margin:0, lineHeight:1.6 }}>{c.content}</p>
              </div>
            </div>
          ))}
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:T.m, flexShrink:0 }}/>
            <div style={{ flex:1, display:"flex", gap:8 }}>
              <input
                value={reply} onChange={e=>setReply(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&submitReply()}
                placeholder="Write a reply..."
                style={{
                  flex:1, background:T.card, border:`1px solid ${T.b}`,
                  borderRadius:8, padding:"8px 14px", color:T.t,
                  fontSize:13, outline:"none", fontFamily:"inherit",
                }}
              />
              <button onClick={submitReply} disabled={!reply.trim()||submitting} style={{
                padding:"8px 16px", borderRadius:8,
                background: reply.trim() ? T.a : T.m,
                color: reply.trim() ? "#000" : T.s,
                border:"none", fontSize:13, fontWeight:700,
                cursor: reply.trim() ? "pointer" : "default", transition:"all 0.15s",
              }}>↵</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── COMPOSE ─────────────────────────────────────────────────────────────────
function Compose({ currentUser, onPost }) {
  const [text, setText] = useState("");
  const [type, setType] = useState("win");
  const [posting, setPosting] = useState(false);

  async function submit() {
    if (!text.trim() || !currentUser?.id) return;
    setPosting(true);
    const { error } = await supabase.from("community_posts").insert({
      user_id: currentUser.id,
      type,
      content: text.trim(),
      pinned: false,
      likes_count: 0,
      comments_count: 0,
    });
    if (!error) {
      setText("");
      setType("win");
      if (onPost) onPost();
    }
    setPosting(false);
  }

  return (
    <div style={{ background:T.card, border:`1px solid ${T.b}`, borderRadius:14, padding:20 }}>
      <div style={{ display:"flex", gap:12, marginBottom:14 }}>
        <Avatar profile={currentUser} size={40} />
        <textarea
          value={text} onChange={e=>setText(e.target.value)}
          placeholder="Share a win, drop a tip, ask the group..."
          rows={3}
          style={{
            flex:1, background:T.dim, border:`1px solid ${T.b}`,
            borderRadius:10, padding:"12px 16px", color:T.t,
            fontSize:14, outline:"none", fontFamily:"inherit",
            resize:"none", lineHeight:1.7,
          }}
        />
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ display:"flex", gap:6 }}>
          {Object.entries(TYPE_META).map(([key,meta])=>(
            <button key={key} onClick={()=>setType(key)} style={{
              padding:"5px 12px", borderRadius:20, border:`1px solid ${type===key ? meta.color : T.b}`,
              background: type===key ? meta.bg : "transparent",
              color: type===key ? meta.color : T.s,
              fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.15s",
            }}>{meta.icon} {meta.label}</button>
          ))}
        </div>
        <button onClick={submit} disabled={!text.trim()||posting} style={{
          marginLeft:"auto", padding:"8px 22px", borderRadius:9, border:"none",
          background: text.trim() ? T.a : T.m,
          color: text.trim() ? "#000" : T.s,
          fontSize:13, fontWeight:800, cursor: text.trim() ? "pointer" : "default",
          transition:"all 0.15s",
        }}>{posting ? "Posting..." : "Post"}</button>
      </div>
    </div>
  );
}

// ─── FEED TAB ────────────────────────────────────────────────────────────────
function FeedTab({ currentUser }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const loadPosts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("community_posts")
      .select("*, profiles(id, full_name, email, brokerage, role)")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter !== "all") query = query.eq("type", filter);

    const { data: postsData } = await query;
    if (!postsData) { setLoading(false); return; }

    // Check which posts current user has liked
    if (currentUser?.id && postsData.length > 0) {
      const ids = postsData.map(p=>p.id);
      const { data: likes } = await supabase
        .from("community_likes")
        .select("post_id")
        .eq("user_id", currentUser.id)
        .in("post_id", ids);
      const likedSet = new Set((likes||[]).map(l=>l.post_id));
      setPosts(postsData.map(p=>({ ...p, liked: likedSet.has(p.id) })));
    } else {
      setPosts(postsData.map(p=>({ ...p, liked: false })));
    }
    setLoading(false);
  }, [filter, currentUser?.id]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  async function handleLikeToggle(post) {
    if (!currentUser?.id) return;
    const nowLiked = !post.liked;
    // Optimistic update
    setPosts(ps => ps.map(p => p.id===post.id ? { ...p, liked:nowLiked, likes_count:(p.likes_count||0)+(nowLiked?1:-1) } : p));

    if (nowLiked) {
      await supabase.from("community_likes").insert({ post_id:post.id, user_id:currentUser.id });
      await supabase.from("community_posts").update({ likes_count: (post.likes_count||0)+1 }).eq("id", post.id);
    } else {
      await supabase.from("community_likes").delete().eq("post_id", post.id).eq("user_id", currentUser.id);
      await supabase.from("community_posts").update({ likes_count: Math.max(0,(post.likes_count||1)-1) }).eq("id", post.id);
    }
  }

  const FILTERS = [
    { id:"all", label:"All" },
    { id:"win", label:"🏆 Wins" },
    { id:"question", label:"❓ Questions" },
    { id:"challenge", label:"📋 Check-ins" },
    { id:"tip", label:"💡 Tips" },
  ];

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:24, alignItems:"start" }}>
      <div>
        <Compose currentUser={currentUser} onPost={loadPosts} />
        {/* Filters */}
        <div style={{ display:"flex", gap:8, margin:"20px 0 16px" }}>
          {FILTERS.map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)} style={{
              padding:"6px 16px", borderRadius:20, border:`1px solid ${filter===f.id ? T.a : T.b}`,
              background: filter===f.id ? T.am : "transparent",
              color: filter===f.id ? T.a : T.s,
              fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.15s",
            }}>{f.label}</button>
          ))}
        </div>
        {loading ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:T.s, fontSize:14 }}>Loading feed...</div>
        ) : posts.length === 0 ? (
          <div style={{
            background:T.card, border:`1px solid ${T.b}`, borderRadius:14,
            padding:"60px 40px", textAlign:"center",
          }}>
            <div style={{ fontSize:40, marginBottom:16 }}>🌱</div>
            <div style={{ fontSize:18, fontWeight:700, color:T.t, marginBottom:8 }}>No posts yet</div>
            <div style={{ fontSize:14, color:T.s }}>Be the first to share a win or ask a question.</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {posts.map(p=>(
              <PostCard key={p.id} post={p} currentUserId={currentUser?.id}
                onLikeToggle={handleLikeToggle}
                onCommentSubmit={loadPosts}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <ActivityRules />
      </div>
    </div>
  );
}

function ActivityRules() {
  return (
    <div style={{ background:T.card, border:`1px solid ${T.b}`, borderRadius:14, padding:20 }}>
      <div style={{ fontSize:13, fontWeight:800, color:T.t, marginBottom:14 }}>Community Guidelines</div>
      {[
        ["🏆","Share your wins — big or small"],
        ["❓","Ask questions, get real answers"],
        ["💡","Drop tips that actually work"],
        ["🤝","Lift each other up"],
        ["🚫","No spam, no negativity"],
      ].map(([icon,text])=>(
        <div key={text} style={{ display:"flex", gap:10, marginBottom:10 }}>
          <span style={{ fontSize:14 }}>{icon}</span>
          <span style={{ fontSize:13, color:T.s, lineHeight:1.5 }}>{text}</span>
        </div>
      ))}
    </div>
  );
}

// ─── COURSES TAB ─────────────────────────────────────────────────────────────
function CoursesTab({ currentUser }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: courseData } = await supabase
        .from("community_courses")
        .select("*")
        .eq("published", true)
        .order("sort_order", { ascending: true });

      if (!courseData) { setLoading(false); return; }

      if (currentUser?.id && courseData.length > 0) {
        const ids = courseData.map(c=>c.id);
        const { data: progress } = await supabase
          .from("community_course_progress")
          .select("course_id, progress_pct")
          .eq("user_id", currentUser.id)
          .in("course_id", ids);
        const progMap = {};
        (progress||[]).forEach(p => progMap[p.course_id] = p.progress_pct);
        setCourses(courseData.map(c => ({ ...c, progress: progMap[c.id] ?? 0 })));
      } else {
        setCourses(courseData.map(c => ({ ...c, progress: 0 })));
      }
      setLoading(false);
    }
    load();
  }, [currentUser?.id]);

  if (loading) return <div style={{ textAlign:"center", padding:"60px 0", color:T.s }}>Loading courses...</div>;

  if (courses.length === 0) return (
    <div style={{ textAlign:"center", padding:"60px 0" }}>
      <div style={{ fontSize:40, marginBottom:16 }}>📚</div>
      <div style={{ fontSize:18, fontWeight:700, color:T.t, marginBottom:8 }}>Courses coming soon</div>
      <div style={{ fontSize:14, color:T.s }}>Check back shortly.</div>
    </div>
  );

  const inProgress = courses.filter(c=>c.progress>0 && c.progress<100);
  const notStarted = courses.filter(c=>c.progress===0);
  const completed  = courses.filter(c=>c.progress===100);

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <h2 style={{ fontSize:22, fontWeight:800, color:T.t, margin:"0 0 4px" }}>Courses</h2>
        <p style={{ fontSize:13, color:T.s, margin:0 }}>{courses.length} courses · {completed.length} completed</p>
      </div>

      {inProgress.length > 0 && (
        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.a, marginBottom:14, letterSpacing:0.5 }}>▶ IN PROGRESS</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:16 }}>
            {inProgress.map(c=><CourseCard key={c.id} course={c}/>)}
          </div>
        </div>
      )}

      {notStarted.length > 0 && (
        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.s, marginBottom:14, letterSpacing:0.5 }}>ALL COURSES</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:16 }}>
            {notStarted.map(c=><CourseCard key={c.id} course={c}/>)}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:T.s, marginBottom:14, letterSpacing:0.5 }}>✓ COMPLETED</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:16 }}>
            {completed.map(c=><CourseCard key={c.id} course={c}/>)}
          </div>
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }) {
  const pct = course.progress || 0;
  const done = pct === 100;
  return (
    <div style={{
      background:T.card, border:`1px solid ${T.b}`, borderRadius:14,
      padding:24, cursor:"pointer", transition:"all 0.2s", position:"relative",
    }}
    onMouseEnter={e=>{e.currentTarget.style.borderColor=T.bh; e.currentTarget.style.transform="translateY(-2px)";}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.b; e.currentTarget.style.transform="translateY(0)";}}
    >
      {course.is_new && (
        <div style={{
          position:"absolute", top:16, right:16,
          background:"rgba(0,229,160,0.15)", color:T.a,
          fontSize:10, fontWeight:800, padding:"2px 9px", borderRadius:20, letterSpacing:0.5,
        }}>NEW</div>
      )}
      {done && (
        <div style={{
          position:"absolute", top:16, right:16,
          background:"rgba(0,229,160,0.15)", color:T.a,
          fontSize:10, fontWeight:800, padding:"2px 9px", borderRadius:20,
        }}>✓ DONE</div>
      )}
      <div style={{ fontSize:32, marginBottom:12 }}>{course.emoji || "📚"}</div>
      <div style={{ fontSize:15, fontWeight:800, color:T.t, marginBottom:6, lineHeight:1.3 }}>{course.title}</div>
      <p style={{ fontSize:13, color:T.s, lineHeight:1.6, margin:"0 0 16px" }}>{course.description}</p>
      <div style={{ display:"flex", gap:16, marginBottom:16 }}>
        <span style={{ fontSize:12, color:T.s }}>📖 {course.lessons} lessons</span>
        <span style={{ fontSize:12, color:T.s }}>⏱ {course.duration}</span>
      </div>
      {pct > 0 && (
        <div style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ fontSize:11, color:T.s }}>Progress</span>
            <span style={{ fontSize:11, color:done?T.a:T.t, fontWeight:700 }}>{pct}%</span>
          </div>
          <div style={{ background:T.dim, borderRadius:4, height:6 }}>
            <div style={{ width:`${pct}%`, height:"100%", borderRadius:4, background:`linear-gradient(90deg, ${T.a}, #00c8ff)`, transition:"width 0.5s" }}/>
          </div>
        </div>
      )}
      <button style={{
        width:"100%", padding:"10px 0", borderRadius:9,
        border:`1px solid ${done ? T.b : T.a}`,
        background: done ? "transparent" : T.am,
        color: done ? T.s : T.a,
        fontSize:13, fontWeight:800, cursor:"pointer", transition:"all 0.15s",
      }}>{pct===0?"Start Course":done?"Review":"Continue"}</button>
    </div>
  );
}

// ─── CHALLENGES TAB ──────────────────────────────────────────────────────────
function ChallengesTab({ currentUser }) {
  const [challenges, setChallenges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const now = new Date().toISOString();
      const { data: cData } = await supabase
        .from("community_challenges")
        .select("*")
        .eq("active", true)
        .gte("ends_at", now)
        .order("ends_at", { ascending: true });

      const { data: lbData } = await supabase
        .from("user_scores")
        .select("*, profiles(id, full_name, email, brokerage)")
        .order("activity_score", { ascending: false })
        .limit(10);

      if (cData && currentUser?.id) {
        const ids = cData.map(c=>c.id);
        const { data: prog } = await supabase
          .from("community_challenge_progress")
          .select("challenge_id, progress, completed")
          .eq("user_id", currentUser.id)
          .in("challenge_id", ids);
        const progMap = {};
        (prog||[]).forEach(p => progMap[p.challenge_id] = p);
        setChallenges(cData.map(c => ({ ...c, myProgress: progMap[c.id]?.progress || 0, myCompleted: progMap[c.id]?.completed || false })));
      } else {
        setChallenges(cData || []);
      }

      setLeaderboard(lbData || []);
      setLoading(false);
    }
    load();
  }, [currentUser?.id]);

  if (loading) return <div style={{ textAlign:"center", padding:"60px 0", color:T.s }}>Loading challenges...</div>;

  const monthName = new Date().toLocaleString("default", { month:"long" });

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:24, alignItems:"start" }}>
      <div>
        <div style={{ marginBottom:24 }}>
          <h2 style={{ fontSize:22, fontWeight:800, color:T.t, margin:"0 0 4px" }}>Active Challenges</h2>
          <p style={{ fontSize:13, color:T.s, margin:0 }}>{challenges.length} challenges running this week</p>
        </div>
        {challenges.length === 0 ? (
          <div style={{ background:T.card, border:`1px solid ${T.b}`, borderRadius:14, padding:"60px 40px", textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:16 }}>🏁</div>
            <div style={{ fontSize:16, fontWeight:700, color:T.t, marginBottom:8 }}>No active challenges right now</div>
            <div style={{ fontSize:13, color:T.s }}>New challenges drop every Monday.</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {challenges.map(c => <ChallengeCard key={c.id} challenge={c} />)}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div style={{ background:T.card, border:`1px solid ${T.b}`, borderRadius:14, padding:24 }}>
        <div style={{ fontSize:14, fontWeight:800, color:T.t, marginBottom:4 }}>{monthName} Leaderboard</div>
        <div style={{ fontSize:12, color:T.s, marginBottom:18 }}>By activity score</div>
        {leaderboard.length === 0 ? (
          <div style={{ fontSize:13, color:T.s, textAlign:"center", padding:"20px 0" }}>No scores yet</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {leaderboard.map((entry,i)=>(
              <div key={entry.id} style={{
                display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                borderRadius:10, background: entry.user_id===currentUser?.id ? T.am : T.dim,
                border:`1px solid ${entry.user_id===currentUser?.id ? T.a+"30" : "transparent"}`,
              }}>
                <span style={{ fontSize:15, width:22, textAlign:"center" }}>
                  {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`}
                </span>
                <Avatar profile={entry.profiles} size={32} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:T.t, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {entry.profiles?.full_name || entry.profiles?.email || "User"}
                    {entry.user_id===currentUser?.id && <span style={{ fontSize:10, color:T.a }}> (you)</span>}
                  </div>
                  <div style={{ fontSize:11, color:T.s }}>🔥 {entry.streak_days}d streak</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:14, fontWeight:800, color:i===0?T.a:T.t }}>{(entry.activity_score||0).toLocaleString()}</div>
                  <div style={{ fontSize:10, color:T.s }}>pts</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChallengeCard({ challenge }) {
  const pct = challenge.goal > 0 ? Math.min(100, Math.round((challenge.myProgress/challenge.goal)*100)) : 0;
  const endsAt = new Date(challenge.ends_at);
  const daysLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / 86400000));

  return (
    <div style={{ background:T.card, border:`1px solid ${challenge.myCompleted ? T.a+"30" : T.b}`, borderRadius:14, padding:24 }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
        <div style={{
          width:48, height:48, borderRadius:12,
          background: challenge.myCompleted ? T.am : "rgba(139,92,246,0.12)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:22, flexShrink:0,
        }}>{challenge.emoji || "🏆"}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:800, color:T.t, marginBottom:2 }}>{challenge.title}</div>
          <div style={{ fontSize:12, color:T.s }}>Ends in {daysLeft} day{daysLeft!==1?"s":""} · +{challenge.points} pts</div>
        </div>
        {challenge.myCompleted && (
          <div style={{ background:T.am, color:T.a, fontSize:11, fontWeight:800, padding:"3px 10px", borderRadius:20 }}>✓ DONE</div>
        )}
      </div>
      {challenge.description && (
        <p style={{ fontSize:13, color:T.s, lineHeight:1.6, margin:"0 0 16px" }}>{challenge.description}</p>
      )}
      <div style={{ marginBottom:8 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ fontSize:12, color:T.s }}>Your progress</span>
          <span style={{ fontSize:12, fontWeight:700, color:T.t }}>{challenge.myProgress}/{challenge.goal}</span>
        </div>
        <div style={{ background:T.dim, borderRadius:8, height:8 }}>
          <div style={{
            width:`${pct}%`, height:"100%", borderRadius:8,
            background: challenge.myCompleted ? T.a : `linear-gradient(90deg, ${T.p}, ${T.a})`,
            transition:"width 0.5s",
          }}/>
        </div>
      </div>
    </div>
  );
}

// ─── MEMBERS TAB ──────────────────────────────────────────────────────────────
function MembersTab({ currentUser }) {
  const [members, setMembers] = useState([]);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, brokerage, role, created_at")
        .order("created_at", { ascending: true });

      const { data: scoreData } = await supabase
        .from("user_scores")
        .select("user_id, activity_score, streak_days, recruits_closed");

      const scoreMap = {};
      (scoreData||[]).forEach(s => scoreMap[s.user_id] = s);
      setScores(scoreMap);
      setMembers(profiles || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = members.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (m.full_name||"").toLowerCase().includes(q) || (m.email||"").toLowerCase().includes(q) || (m.brokerage||"").toLowerCase().includes(q);
  });

  if (loading) return <div style={{ textAlign:"center", padding:"60px 0", color:T.s }}>Loading members...</div>;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, color:T.t, margin:"0 0 4px" }}>Members</h2>
          <p style={{ fontSize:13, color:T.s, margin:0 }}>{members.length} active recruiter{members.length!==1?"s":""}</p>
        </div>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search members..."
          style={{
            background:T.card, border:`1px solid ${T.b}`, borderRadius:9,
            padding:"9px 16px", color:T.t, fontSize:13, outline:"none",
            fontFamily:"inherit", width:220,
          }}
        />
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"40px 0", color:T.s, fontSize:13 }}>No members found</div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:16 }}>
          {filtered.map(m=>{
            const s = scores[m.id] || {};
            const isYou = m.id === currentUser?.id;
            return (
              <div key={m.id} style={{
                background:T.card, border:`1px solid ${isYou ? T.a+"30" : T.b}`,
                borderRadius:14, padding:24, textAlign:"center",
                cursor:"pointer", transition:"all 0.2s", position:"relative",
              }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=isYou?T.a+"50":T.bh; e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=isYou?T.a+"30":T.b; e.currentTarget.style.transform="translateY(0)";}}
              >
                {isYou && <div style={{ position:"absolute", top:12, right:12, fontSize:10, color:T.a, fontWeight:700, background:T.am, padding:"2px 8px", borderRadius:20 }}>YOU</div>}
                {m.role==="owner" && <div style={{ position:"absolute", top:12, left:12, fontSize:10, color:"#F59E0B", fontWeight:700, background:"rgba(245,158,11,0.12)", padding:"2px 8px", borderRadius:20 }}>👑</div>}
                <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}>
                  <Avatar profile={m} size={56} />
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:T.t, marginBottom:2 }}>{m.full_name || m.email}</div>
                {m.brokerage && <div style={{ fontSize:12, color:T.s, marginBottom:14 }}>{m.brokerage}</div>}
                <div style={{ display:"flex", justifyContent:"center", gap:16, marginBottom:16 }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:15, fontWeight:800, color:T.a }}>{s.recruits_closed || 0}</div>
                    <div style={{ fontSize:11, color:T.s }}>recruits</div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:15, fontWeight:800, color:T.y }}>{s.streak_days || 0}d</div>
                    <div style={{ fontSize:11, color:T.s }}>streak</div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:15, fontWeight:800, color:T.p }}>{(s.activity_score||0).toLocaleString()}</div>
                    <div style={{ fontSize:11, color:T.s }}>pts</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id:"feed",       label:"Feed",        icon:"📡" },
  { id:"courses",    label:"Courses",     icon:"📚" },
  { id:"challenges", label:"Challenges",  icon:"🏆" },
  { id:"members",    label:"Members",     icon:"👥" },
];

export default function RKRTCommunity({ userId, profile }) {
  const [tab, setTab] = useState("feed");
  const [userScore, setUserScore] = useState(null);

  useEffect(() => {
    if (!userId) return;
    supabase.from("user_scores").select("streak_days, activity_score").eq("user_id", userId).single()
      .then(({ data }) => { if (data) setUserScore(data); });
  }, [userId]);

  const currentUser = profile ? { ...profile, id: userId } : null;

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.t, fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      {/* Top nav */}
      <div style={{
        height:56, borderBottom:`1px solid ${T.b}`,
        background:T.side, display:"flex", alignItems:"center",
        padding:"0 28px", gap:0, position:"sticky", top:0, zIndex:100,
      }}>
        <div style={{ fontSize:14, fontWeight:800, color:T.a, marginRight:36, letterSpacing:0.5 }}>
          RKRT <span style={{ color:T.s, fontWeight:400 }}>Community</span>
        </div>
        <div style={{ display:"flex", height:"100%" }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              height:"100%", padding:"0 20px", border:"none",
              background:"transparent",
              borderBottom:`2px solid ${tab===t.id ? T.a : "transparent"}`,
              color: tab===t.id ? T.a : T.s,
              fontSize:13, fontWeight:600, cursor:"pointer",
              display:"flex", alignItems:"center", gap:7,
              transition:"all 0.15s",
            }}>
              <span style={{ fontSize:14 }}>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12 }}>
          {userScore && <div style={{ fontSize:12, color:T.s }}>🔥 {userScore.streak_days} day streak</div>}
          {currentUser && <Avatar profile={currentUser} size={32} />}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:1180, margin:"0 auto", padding:"28px 24px" }}>
        {tab==="feed"       && <FeedTab currentUser={currentUser} />}
        {tab==="courses"    && <CoursesTab currentUser={currentUser} />}
        {tab==="challenges" && <ChallengesTab currentUser={currentUser} />}
        {tab==="members"    && <MembersTab currentUser={currentUser} />}
      </div>
    </div>
  );
}