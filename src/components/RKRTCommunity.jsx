import { useState } from "react";

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  bg:"#04060A", side:"#070A10", card:"#0B0F17", d:"#0F1520",
  b:"rgba(255,255,255,0.05)", bh:"rgba(255,255,255,0.10)",
  a:"#00E5A0", am:"rgba(0,229,160,0.12)", as:"rgba(0,229,160,0.05)",
  r:"#F43F5E", y:"#F59E0B", bl:"#3B82F6", p:"#8B5CF6", c:"#06B6D4",
  t:"#E4E8F1", s:"#7B8BA3", m:"#1E2A3A", dim:"#161C28",
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const ME = { id:1, name:"Anthony Dazet", initials:"AD", color:"#00E5A0", role:"owner", brokerage:"LPT Realty", streak:30, points:9420 };

const MEMBERS = [
  { id:1, name:"Anthony Dazet",   initials:"AD", color:"#00E5A0", role:"owner",     brokerage:"LPT Realty", streak:30, points:9420, recruits:12, online:true  },
  { id:2, name:"Joe Martinez",    initials:"JM", color:"#3B82F6", role:"recruiter",  brokerage:"LPT Realty", streak:14, points:2840, recruits:3,  online:true  },
  { id:3, name:"Hima Patel",      initials:"HP", color:"#8B5CF6", role:"recruiter",  brokerage:"eXp Realty", streak:6,  points:1890, recruits:1,  online:false },
  { id:4, name:"Sarah Chen",      initials:"SC", color:"#F59E0B", role:"recruiter",  brokerage:"KW",         streak:9,  points:2210, recruits:2,  online:true  },
  { id:5, name:"Marcus Webb",     initials:"MW", color:"#F43F5E", role:"recruiter",  brokerage:"RE/MAX",     streak:3,  points:980,  recruits:0,  online:false },
];

const POSTS = [
  {
    id:1, authorId:2, type:"win", ts:"2h ago",
    content:"Closed Marcus Williams from KW after 3 months of follow-up. The key? Stopped pitching splits and started asking about his retirement plan. RKRT flagged him as at-risk 6 weeks ago — trusted the signal and stayed patient. 🎯",
    likes:14, liked:false, pinned:true,
    comments:[
      { authorId:1, text:"This is exactly the move. Pain over features every time.", ts:"1h ago" },
      { authorId:3, text:"What was his biggest objection going in?", ts:"45m ago" },
      { authorId:2, text:"He thought profit share was too complicated. 10 minutes on a whiteboard. Done.", ts:"30m ago" },
    ]
  },
  {
    id:2, authorId:4, type:"challenge", ts:"5h ago",
    content:"Week 3 check-in — hit 15 outreach messages, booked 2 discovery calls. Behind my goal of 20 but the quality of convos is way up. Focusing on KW agents whose team leaders just posted job listings (scaling pain = open door). Anyone else tracking this signal?",
    likes:9, liked:false, pinned:false,
    comments:[
      { authorId:2, text:"15 outreach, 3 calls, 1 offer extended. Let's go!", ts:"4h ago" },
      { authorId:1, text:"Job posting signal is underrated. Add it to your weekly scan.", ts:"3h ago" },
    ]
  },
  {
    id:3, authorId:3, type:"question", ts:"8h ago",
    content:"When an agent says 'I need to talk to my spouse first' — what's your next move? Going silent for a week or sending resources right away? Getting mixed results with both approaches and want to hear what's actually working.",
    likes:11, liked:false, pinned:false,
    comments:[
      { authorId:4, text:"Send ONE thing. A 90-second video of a recruited agent talking about how their spouse reacted after the switch. Social proof kills hesitation.", ts:"7h ago" },
      { authorId:1, text:"Rue can draft that follow-up for you. Ask her to write a spouse approval sequence.", ts:"6h ago" },
      { authorId:2, text:"Also — find out if the spouse is also in real estate. Changes everything.", ts:"5h ago" },
    ]
  },
  {
    id:4, authorId:5, type:"win", ts:"1d ago",
    content:"First recruit in the pipeline after 3 weeks on the platform. Small win but it counts. The agent directory + Rue combo is genuinely different — found someone I never would have cold-called who had been quietly looking to switch for months.",
    likes:18, liked:false, pinned:false,
    comments:[
      { authorId:1, text:"That's the whole game. The agents who are ready to move rarely broadcast it.", ts:"23h ago" },
    ]
  },
];

const COURSES = [
  { id:1, emoji:"🎯", title:"90-Day Conversion Sequence",    lessons:6, duration:"~2h", progress:0,   isNew:true,  desc:"The exact framework behind 80%+ close rates on warm leads. Timing, channel switching, and when to go silent." },
  { id:2, emoji:"🛡️", title:"Objection Mastery Playbook",    lessons:8, duration:"~3h", progress:62,  isNew:false, desc:"Handle every objection cold. Splits, fees, culture, timing. Role-play included." },
  { id:3, emoji:"📱", title:"Social Recruiting Blueprint",   lessons:5, duration:"~1.5h",progress:100, isNew:false, desc:"Build a pipeline from Instagram and Facebook without paying for ads." },
  { id:4, emoji:"💰", title:"Revenue Share Math for Agents", lessons:4, duration:"~1h", progress:25,  isNew:false, desc:"Teach agents to sell revenue share for you. Scripts and visuals included." },
  { id:5, emoji:"🔍", title:"Agent Intelligence Playbook",   lessons:7, duration:"~2.5h",progress:0,  isNew:true,  desc:"How to research any agent — production signals, exit signals, timing windows." },
  { id:6, emoji:"🤝", title:"The Discovery Call Formula",    lessons:5, duration:"~1.5h",progress:0,  isNew:false, desc:"Structure every call to uncover pain, plant urgency, and set a follow-up with teeth." },
];

const CHALLENGES = [
  { id:1, title:"20 Outreach Messages",  emoji:"📬", ends:"Friday",    goal:20, groupAvg:13, myProgress:8,  pts:500,  active:true  },
  { id:2, title:"Book 3 Discovery Calls",emoji:"📞", ends:"Sunday",    goal:3,  groupAvg:1,  myProgress:1,  pts:750,  active:true  },
  { id:3, title:"Post 1 Win This Week",  emoji:"🏆", ends:"Friday",    goal:1,  groupAvg:0,  myProgress:0,  pts:300,  active:true  },
  { id:4, title:"Complete a Course",     emoji:"📚", ends:"Mar 15",    goal:1,  groupAvg:0,  myProgress:0,  pts:1000, active:false },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getMember(id) { return MEMBERS.find(m => m.id === id) || MEMBERS[0]; }

function Avatar({ member, size=36, showOnline=false }) {
  return (
    <div style={{ position:"relative", flexShrink:0 }}>
      <div style={{
        width:size, height:size, borderRadius:"50%",
        background:`linear-gradient(135deg, ${member.color}, ${member.color}88)`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:size*0.33, fontWeight:800, color:"#000",
        border:`2px solid ${member.color}30`,
        letterSpacing:-0.5,
      }}>{member.initials}</div>
      {showOnline && member.online && (
        <div style={{
          position:"absolute", bottom:1, right:1,
          width:size*0.28, height:size*0.28, borderRadius:"50%",
          background:"#22C55E", border:`2px solid ${T.bg}`,
        }}/>
      )}
    </div>
  );
}

const TYPE_META = {
  win:       { label:"WIN",       color:"#00E5A0", bg:"rgba(0,229,160,0.10)",   icon:"🏆" },
  challenge: { label:"CHECK-IN",  color:"#F59E0B", bg:"rgba(245,158,11,0.10)",  icon:"📋" },
  question:  { label:"QUESTION",  color:"#3B82F6", bg:"rgba(59,130,246,0.10)",  icon:"❓" },
  tip:       { label:"TIP",       color:"#8B5CF6", bg:"rgba(139,92,246,0.10)",  icon:"💡" },
};

// ─── POST CARD ────────────────────────────────────────────────────────────────
function PostCard({ post }) {
  const [likes, setLikes] = useState(post.likes);
  const [liked, setLiked] = useState(post.liked);
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const author = getMember(post.authorId);
  const meta = TYPE_META[post.type];

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
        {/* Header */}
        <div style={{ display:"flex", gap:12, marginBottom:14 }}>
          <Avatar member={author} size={42} showOnline />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontSize:14, fontWeight:700, color:T.t }}>{author.name}</span>
              <span style={{
                fontSize:10, fontWeight:800, letterSpacing:0.8,
                color:meta.color, background:meta.bg,
                padding:"2px 9px", borderRadius:20,
              }}>{meta.icon} {meta.label}</span>
              {author.role === "owner" && (
                <span style={{ fontSize:10, fontWeight:700, color:"#F59E0B", background:"rgba(245,158,11,0.12)", padding:"2px 8px", borderRadius:20 }}>👑 ADMIN</span>
              )}
            </div>
            <div style={{ fontSize:12, color:T.s, marginTop:2 }}>{author.brokerage} · {post.ts}</div>
          </div>
        </div>

        {/* Content */}
        <p style={{ fontSize:14, color:T.t, lineHeight:1.75, margin:"0 0 16px", whiteSpace:"pre-wrap" }}>{post.content}</p>

        {/* Actions */}
        <div style={{ display:"flex", alignItems:"center", gap:4, paddingTop:12, borderTop:`1px solid ${T.b}` }}>
          <button onClick={()=>{ setLiked(!liked); setLikes(l=>liked?l-1:l+1); }} style={{
            display:"flex", alignItems:"center", gap:6,
            padding:"7px 14px", borderRadius:8, border:"none",
            background: liked ? T.am : "transparent",
            color: liked ? T.a : T.s,
            fontSize:13, fontWeight:600, cursor:"pointer", transition:"all 0.15s",
          }}>
            <span>{liked?"♥":"♡"}</span> {likes}
          </button>
          <button onClick={()=>setOpen(!open)} style={{
            display:"flex", alignItems:"center", gap:6,
            padding:"7px 14px", borderRadius:8, border:"none",
            background: open ? "rgba(59,130,246,0.10)" : "transparent",
            color: open ? T.bl : T.s,
            fontSize:13, fontWeight:600, cursor:"pointer", transition:"all 0.15s",
          }}>
            💬 {post.comments.length}
          </button>
          <button style={{
            marginLeft:"auto", display:"flex", alignItems:"center", gap:6,
            padding:"7px 14px", borderRadius:8, border:"none",
            background:"transparent", color:T.s,
            fontSize:13, fontWeight:600, cursor:"pointer",
          }}>↗ Share</button>
        </div>
      </div>

      {/* Comments */}
      {open && (
        <div style={{ borderTop:`1px solid ${T.b}`, background:T.dim, padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
          {post.comments.map((c,i) => {
            const cm = getMember(c.authorId);
            return (
              <div key={i} style={{ display:"flex", gap:10 }}>
                <Avatar member={cm} size={30} />
                <div style={{ flex:1, background:T.card, borderRadius:10, padding:"10px 14px", border:`1px solid ${T.b}` }}>
                  <div style={{ display:"flex", gap:8, marginBottom:4, alignItems:"center" }}>
                    <span style={{ fontSize:12, fontWeight:700, color:T.t }}>{cm.name}</span>
                    <span style={{ fontSize:11, color:T.s }}>{c.ts}</span>
                  </div>
                  <p style={{ fontSize:13, color:T.t, margin:0, lineHeight:1.6 }}>{c.text}</p>
                </div>
              </div>
            );
          })}
          {/* Reply input */}
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <Avatar member={ME} size={30} />
            <div style={{ flex:1, display:"flex", gap:8 }}>
              <input
                value={reply} onChange={e=>setReply(e.target.value)}
                placeholder="Write a reply..."
                style={{
                  flex:1, background:T.card, border:`1px solid ${T.b}`,
                  borderRadius:8, padding:"8px 14px", color:T.t,
                  fontSize:13, outline:"none", fontFamily:"inherit",
                }}
              />
              <button style={{
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

// ─── COMPOSE ──────────────────────────────────────────────────────────────────
function Compose() {
  const [text, setText] = useState("");
  const [type, setType] = useState("win");
  return (
    <div style={{ background:T.card, border:`1px solid ${T.b}`, borderRadius:14, padding:20 }}>
      <div style={{ display:"flex", gap:12, marginBottom:14 }}>
        <Avatar member={ME} size={40} />
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
      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        {Object.entries(TYPE_META).map(([k,v])=>(
          <button key={k} onClick={()=>setType(k)} style={{
            padding:"5px 13px", borderRadius:20, border:`1px solid ${type===k ? v.color+"50" : T.b}`,
            background: type===k ? v.bg : "transparent",
            color: type===k ? v.color : T.s,
            fontSize:11, fontWeight:700, cursor:"pointer", letterSpacing:0.5,
            transition:"all 0.15s",
          }}>{v.icon} {v.label}</button>
        ))}
        <button style={{
          marginLeft:"auto", padding:"9px 22px", borderRadius:9,
          background: text.trim() ? T.a : T.m,
          color: text.trim() ? "#000" : T.s,
          border:"none", fontSize:13, fontWeight:800,
          cursor: text.trim() ? "pointer" : "default", transition:"all 0.15s",
        }}>Post</button>
      </div>
    </div>
  );
}

// ─── SIDEBAR WIDGETS ──────────────────────────────────────────────────────────
function OnlineNow() {
  const online = MEMBERS.filter(m=>m.online && m.id !== ME.id);
  return (
    <div style={{ background:T.card, border:`1px solid ${T.b}`, borderRadius:14, padding:18 }}>
      <div style={{ fontSize:11, fontWeight:800, color:T.s, letterSpacing:1, marginBottom:14 }}>ONLINE NOW · {online.length}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {online.map(m=>(
          <div key={m.id} style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Avatar member={m} size={34} showOnline />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.t, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{m.name.split(" ")[0]}</div>
              <div style={{ fontSize:11, color:T.s }}>{m.brokerage}</div>
            </div>
            <button style={{
              padding:"4px 12px", borderRadius:6, border:`1px solid ${T.b}`,
              background:"transparent", color:T.a, fontSize:11, fontWeight:700,
              cursor:"pointer",
            }}>DM</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyChallenges() {
  return (
    <div style={{ background:T.card, border:`1px solid ${T.p}25`, borderRadius:14, padding:18 }}>
      <div style={{ fontSize:11, fontWeight:800, color:T.p, letterSpacing:1, marginBottom:14 }}>ACTIVE CHALLENGES</div>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {CHALLENGES.filter(c=>c.active).map(c=>(
          <div key={c.id}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:13, fontWeight:600, color:T.t }}>{c.emoji} {c.title}</span>
              <span style={{ fontSize:11, fontWeight:700, color:T.p }}>{c.pts}pts</span>
            </div>
            <div style={{ background:T.dim, borderRadius:6, height:5, marginBottom:5 }}>
              <div style={{ width:`${Math.min(100,(c.myProgress/c.goal)*100)}%`, height:"100%", borderRadius:6, background:T.p, transition:"width 0.5s" }}/>
            </div>
            <div style={{ fontSize:11, color:T.s }}>{c.myProgress}/{c.goal} · ends {c.ends}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniLeaderboard() {
  const sorted = [...MEMBERS].sort((a,b)=>b.points-a.points).slice(0,4);
  const medals = ["🥇","🥈","🥉","4️⃣"];
  return (
    <div style={{ background:T.card, border:`1px solid ${T.b}`, borderRadius:14, padding:18 }}>
      <div style={{ fontSize:11, fontWeight:800, color:T.s, letterSpacing:1, marginBottom:14 }}>LEADERBOARD</div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {sorted.map((m,i)=>(
          <div key={m.id} style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:14, width:20, textAlign:"center" }}>{medals[i]}</span>
            <Avatar member={m} size={28} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:600, color:T.t }}>{m.name.split(" ")[0]}</div>
              <div style={{ fontSize:11, color:T.s }}>🔥{m.streak}d</div>
            </div>
            <span style={{ fontSize:12, fontWeight:800, color: i===0?T.a:T.t }}>{m.points.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
function FeedTab() {
  return (
    <div style={{ display:"flex", gap:24, alignItems:"flex-start" }}>
      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:14, minWidth:0 }}>
        <Compose/>
        {POSTS.map(p=><PostCard key={p.id} post={p}/>)}
      </div>
      {/* Sidebar */}
      <div style={{ width:270, flexShrink:0, display:"flex", flexDirection:"column", gap:14 }}>
        <OnlineNow/>
        <WeeklyChallenges/>
        <MiniLeaderboard/>
      </div>
    </div>
  );
}

function CoursesTab() {
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, color:T.t, margin:"0 0 4px" }}>Training Library</h2>
          <p style={{ fontSize:13, color:T.s, margin:0 }}>6 courses · All free for RKRT members</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {["All","In Progress","Completed","New"].map(f=>(
            <button key={f} style={{
              padding:"6px 14px", borderRadius:8, border:`1px solid ${T.b}`,
              background:"transparent", color:T.s, fontSize:12, fontWeight:600,
              cursor:"pointer",
            }}>{f}</button>
          ))}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
        {COURSES.map(c=>(
          <div key={c.id} style={{
            background:T.card, border:`1px solid ${c.isNew ? T.a+"35" : T.b}`,
            borderRadius:14, padding:24, cursor:"pointer",
            display:"flex", flexDirection:"column", gap:10,
            transition:"all 0.2s",
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.a+"50"; e.currentTarget.style.transform="translateY(-2px)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=c.isNew?T.a+"35":T.b; e.currentTarget.style.transform="translateY(0)";}}
          >
            {c.isNew && (
              <span style={{ fontSize:10, fontWeight:800, color:T.a, background:T.am, padding:"2px 10px", borderRadius:20, alignSelf:"flex-start", letterSpacing:0.5 }}>✦ NEW</span>
            )}
            <div style={{ fontSize:36 }}>{c.emoji}</div>
            <div style={{ fontSize:15, fontWeight:700, color:T.t, lineHeight:1.3 }}>{c.title}</div>
            <div style={{ fontSize:12, color:T.s, lineHeight:1.6, flex:1 }}>{c.desc}</div>
            <div style={{ fontSize:12, color:T.s }}>{c.lessons} lessons · {c.duration}</div>
            {c.progress > 0 && c.progress < 100 && (
              <div>
                <div style={{ background:T.dim, borderRadius:6, height:4, marginBottom:6 }}>
                  <div style={{ width:`${c.progress}%`, height:"100%", borderRadius:6, background:T.bl }}/>
                </div>
                <div style={{ fontSize:11, color:T.s }}>{c.progress}% complete</div>
              </div>
            )}
            {c.progress === 100 && (
              <div style={{ fontSize:12, color:T.a, fontWeight:700 }}>✓ Completed</div>
            )}
            {c.progress === 0 && (
              <button style={{
                padding:"9px 0", borderRadius:9, border:"none",
                background:T.a, color:"#000", fontSize:13, fontWeight:800,
                cursor:"pointer", width:"100%",
              }}>Start Course →</button>
            )}
            {c.progress > 0 && c.progress < 100 && (
              <button style={{
                padding:"9px 0", borderRadius:9, border:`1px solid ${T.bl}50`,
                background:"rgba(59,130,246,0.10)", color:T.bl,
                fontSize:13, fontWeight:800, cursor:"pointer", width:"100%",
              }}>Continue →</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChallengesTab() {
  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:22, fontWeight:800, color:T.t, margin:"0 0 4px" }}>Accountability Challenges</h2>
        <p style={{ fontSize:13, color:T.s, margin:0 }}>Weekly goals, group accountability, points for progress</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {CHALLENGES.map(c=>(
          <div key={c.id} style={{
            background:T.card, border:`1px solid ${c.active ? T.p+"30" : T.b}`,
            borderRadius:14, padding:24,
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <div style={{ fontSize:28, marginBottom:8 }}>{c.emoji}</div>
                <div style={{ fontSize:16, fontWeight:700, color:T.t }}>{c.title}</div>
                <div style={{ fontSize:12, color:T.s, marginTop:2 }}>Ends {c.ends}</div>
              </div>
              <div style={{
                padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:800,
                background: c.active ? "rgba(139,92,246,0.12)" : T.dim,
                color: c.active ? T.p : T.s,
                border:`1px solid ${c.active ? T.p+"30" : T.b}`,
              }}>{c.active ? "ACTIVE" : "UPCOMING"}</div>
            </div>
            {/* My progress */}
            <div style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:12, color:T.s }}>My progress</span>
                <span style={{ fontSize:12, fontWeight:700, color:T.t }}>{c.myProgress}/{c.goal}</span>
              </div>
              <div style={{ background:T.dim, borderRadius:8, height:8 }}>
                <div style={{
                  width:`${Math.min(100,(c.myProgress/c.goal)*100)}%`,
                  height:"100%", borderRadius:8,
                  background:`linear-gradient(90deg, ${T.p}, ${T.a})`,
                  transition:"width 0.5s",
                }}/>
              </div>
            </div>
            {/* Group progress */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <span style={{ fontSize:12, color:T.s }}>Group avg: {c.groupAvg}/{c.goal}</span>
              <span style={{ fontSize:13, fontWeight:800, color:T.p }}>+{c.pts} pts</span>
            </div>
            {/* Member avatars */}
            <div style={{ display:"flex", gap:-4 }}>
              {MEMBERS.slice(0,4).map((m,i)=>(
                <div key={m.id} style={{ marginLeft: i===0?0:-8 }}>
                  <Avatar member={m} size={26}/>
                </div>
              ))}
              <div style={{ marginLeft:-8, width:26, height:26, borderRadius:"50%", background:T.m, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:T.s, fontWeight:700, border:`2px solid ${T.card}` }}>+1</div>
            </div>
          </div>
        ))}
      </div>
      {/* Leaderboard */}
      <div style={{ marginTop:24, background:T.card, border:`1px solid ${T.b}`, borderRadius:14, padding:24 }}>
        <div style={{ fontSize:14, fontWeight:800, color:T.t, marginBottom:16 }}>March Points Leaderboard</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[...MEMBERS].sort((a,b)=>b.points-a.points).map((m,i)=>(
            <div key={m.id} style={{
              display:"flex", alignItems:"center", gap:14, padding:"12px 16px",
              borderRadius:10, background: m.id===ME.id ? T.am : T.dim,
              border:`1px solid ${m.id===ME.id ? T.a+"30" : "transparent"}`,
            }}>
              <span style={{ fontSize:16, width:24, textAlign:"center" }}>
                {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`}
              </span>
              <Avatar member={m} size={36}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.t }}>{m.name} {m.id===ME.id&&<span style={{fontSize:11,color:T.a}}>(you)</span>}</div>
                <div style={{ fontSize:11, color:T.s }}>🔥 {m.streak} day streak · {m.recruits} recruits</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:16, fontWeight:800, color:i===0?T.a:T.t }}>{m.points.toLocaleString()}</div>
                <div style={{ fontSize:11, color:T.s }}>points</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MembersTab() {
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, color:T.t, margin:"0 0 4px" }}>Members</h2>
          <p style={{ fontSize:13, color:T.s, margin:0 }}>{MEMBERS.length} active recruiters</p>
        </div>
        <input placeholder="Search members..." style={{
          background:T.card, border:`1px solid ${T.b}`, borderRadius:9,
          padding:"9px 16px", color:T.t, fontSize:13, outline:"none",
          fontFamily:"inherit", width:220,
        }}/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
        {MEMBERS.map(m=>(
          <div key={m.id} style={{
            background:T.card, border:`1px solid ${T.b}`,
            borderRadius:14, padding:24, textAlign:"center",
            cursor:"pointer", transition:"all 0.2s",
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.bh; e.currentTarget.style.transform="translateY(-2px)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=T.b; e.currentTarget.style.transform="translateY(0)";}}
          >
            <div style={{ display:"flex", justifyContent:"center", marginBottom:12, position:"relative" }}>
              <Avatar member={m} size={56} showOnline/>
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:T.t, marginBottom:2 }}>{m.name}</div>
            <div style={{ fontSize:12, color:T.s, marginBottom:2 }}>{m.brokerage}</div>
            <div style={{ fontSize:12, color:m.online ? "#22C55E" : T.s, marginBottom:14 }}>{m.online?"● Online":"○ Offline"}</div>
            <div style={{ display:"flex", justifyContent:"center", gap:16, marginBottom:16 }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:15, fontWeight:800, color:T.a }}>{m.recruits}</div>
                <div style={{ fontSize:11, color:T.s }}>recruits</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:15, fontWeight:800, color:T.y }}>{m.streak}d</div>
                <div style={{ fontSize:11, color:T.s }}>streak</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:15, fontWeight:800, color:T.p }}>{m.points.toLocaleString()}</div>
                <div style={{ fontSize:11, color:T.s }}>pts</div>
              </div>
            </div>
            <button style={{
              width:"100%", padding:"8px 0", borderRadius:8,
              border:`1px solid ${T.b}`, background:"transparent",
              color:T.s, fontSize:12, fontWeight:700, cursor:"pointer",
            }}>View Profile</button>
          </div>
        ))}
      </div>
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

export default function RKRTCommunity() {
  const [tab, setTab] = useState("feed");

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
          <div style={{ fontSize:12, color:T.s }}>🔥 {ME.streak} day streak</div>
          <button style={{
            padding:"7px 18px", borderRadius:8, border:"none",
            background:T.a, color:"#000", fontSize:12, fontWeight:800,
            cursor:"pointer",
          }}>+ Post</button>
          <Avatar member={ME} size={32} showOnline/>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:1180, margin:"0 auto", padding:"28px 24px" }}>
        {tab==="feed"       && <FeedTab/>}
        {tab==="courses"    && <CoursesTab/>}
        {tab==="challenges" && <ChallengesTab/>}
        {tab==="members"    && <MembersTab/>}
      </div>
    </div>
  );
}
