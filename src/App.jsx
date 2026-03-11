import { RUE_SYSTEM_PROMPT } from "./lib/rue";
import OnboardingFlow from './features/onboarding';
import LeadPage from './features/leads';
import AgentDirectory from './features/agents';
import ContentTab from './features/content';

// Feature components
import Dash from './features/dashboard';
import Pipeline from './features/pipeline';
import CRM from './features/crm';

// Shared lib
import T from './lib/theme';
import { STAGES, BROKERAGES, TARGET_BROKERAGES } from './lib/constants';
import { ago, formatDate, truncate, isPro, getPlanLimits, copyToClipboard } from './lib/utils';
import { supabase, SUPABASE_URL, RUE_SUPA, RUE_KEY, logActivity, agentSearch } from './lib/supabase';

// UI Components
import { Pill, UPill, TPill, Dot } from './components/ui';
import { CopyButton } from './components/ui';
import { Gauge } from './components/ui';
import { Modal, DeleteModal } from './components/ui';

// Shared Components  
import { AskRueBar } from './components/shared';
import { ProGate } from './components/shared';
import RKRTCommunity from './components/RKRTCommunity';
import BetaIntakeFlow from './components/BetaIntakeFlow';
import RueDrawer from "./components/RueDrawer";
import { useState, useEffect, useCallback, useRef } from "react";
let BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell;
const rechartsReady = import("recharts").then(m => {
  BarChart = m.BarChart; Bar = m.Bar; XAxis = m.XAxis; YAxis = m.YAxis;
  Tooltip = m.Tooltip; ResponsiveContainer = m.ResponsiveContainer;
  PieChart = m.PieChart; Pie = m.Pie; Cell = m.Cell;
});

// rkrt.in Platform — RUE AI Recruiting Intelligence


// ━━━ MAIN APP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function App(){
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
  const [showBetaIntake,setShowBetaIntake]=useState(false);
  const [showUpgradeSuccess,setShowUpgradeSuccess]=useState(false);
  const [previewUrl,setPreviewUrl]=useState(null);
  const [recentLeads,setRecentLeads]=useState([]);
  const [showRueIntake,setShowRueIntake]=useState(false);
  const [rueConversation,setRueConversation]=useState([]);
  const [rueLoading,setRueLoading]=useState(false);
  const [rueIntakeInput,setRueIntakeInput]=useState("");
  const [rueIntakeToast,setRueIntakeToast]=useState(false);
  const rueIntakeScrollRef=useRef(null);
  const [impersonating,setImpersonating]=useState(null);
  const [realUser,setRealUser]=useState(null);
  const [impersonateLoading,setImpersonateLoading]=useState(false);

  // ━━━ IMPERSONATION DERIVED VALUES ━━━━━━━━━━━━━━━━━
  const effectiveUserId = (impersonating && impersonating.id) ? impersonating.id : authUser?.id;
  const effectiveProfile = (impersonating && impersonating.id) ? impersonating : profile;
  console.log('EFFECTIVE:', effectiveProfile?.role, effectiveProfile?.plan, 'impersonating:', !!(impersonating && impersonating.id));

  const sendRueIntake=useCallback(async(msg)=>{
    if(rueLoading) return;
    setRueLoading(true);
    try {
      const body=msg?{user_id:authUser?.id,message:msg}:{user_id:authUser?.id,plan:profile?.plan||"free"};
      const res=await fetch("https://usknntguurefeyzusbdh.supabase.co/functions/v1/rue-intake",{method:"POST",headers:{"Content-Type":"application/json","apikey":RUE_KEY,"Authorization":`Bearer ${RUE_KEY}`},body:JSON.stringify(body)});
      const data=await res.json();
      if(data.conversation) setRueConversation(data.conversation);
      else if(data.message) setRueConversation(prev=>[...prev,{role:"assistant",content:data.message}]);
      if(data.completed){
        setTimeout(()=>{setShowRueIntake(false);setRueIntakeToast(true);setTimeout(()=>setRueIntakeToast(false),4000);},3000);
      }
    } catch(e){ console.error("Rue intake error:",e); }
    setRueLoading(false);
  },[authUser,profile,rueLoading]);

  const load=useCallback(async()=>{
    const uid = (impersonating && impersonating.id) ? impersonating.id : authUser?.id;
    if(!uid) return;
    setLoading(true);
    try {
      const [leadsRes, actRes] = await Promise.all([
        fetch(`${RUE_SUPA}/leads?user_id=eq.${uid}&order=created_at.desc&limit=100`,{headers:{"apikey":RUE_KEY,"Authorization":`Bearer ${RUE_KEY}`}}),
        fetch(`${RUE_SUPA}/user_activity?user_id=eq.${uid}&order=created_at.desc&limit=50`,{headers:{"apikey":RUE_KEY,"Authorization":`Bearer ${RUE_KEY}`}})
      ]);
      const leadsData = leadsRes.ok ? await leadsRes.json() : [];
      const actData = actRes.ok ? await actRes.json() : [];
      setLeads(Array.isArray(leadsData)?leadsData:[]);
      setRecentLeads((Array.isArray(leadsData)?leadsData:[]).slice(0,6));
      setActivity(Array.isArray(actData)?actData:[]);
    } catch(e) { console.error("Load error:", e); }
    setLoading(false);
  },[authUser,impersonating]);

  useEffect(()=>{
    load();
    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leads',
        filter: `user_id=eq.${(impersonating && impersonating.id) ? impersonating.id : authUser?.id}`
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
  const [inlineChatHistory,setInlineChatHistory]=useState([]);
  const [rueConvId,setRueConvId]=useState(null);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [profileMenuOpen,setProfileMenuOpen]=useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [rueDrawerOpen, setRueDrawerOpen] = useState(false);
  const unreadCount = notifications.filter(n=>!n.read).length;

  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      try {
        if(!session){setAuthLoading(false);return;}
        setAuthUser(prev => (!prev || prev.id !== session.user.id) ? session.user : prev);
        const {data:prof}=await supabase.from("profiles").select("*").eq("id",session.user.id).single();
        console.log('PROFILE LOADED:', prof?.role, prof?.plan, prof?.email);
        setProfile(prof||null);
        // Check if onboarding needed
        // Check intake status — rue_intake (new) takes priority over beta_intake (legacy)
        if(prof && prof.is_beta_tester) {
          const {data:rueCheck} = await supabase.from('rue_intake').select('completed').eq('user_id',prof.id).single();
          if(!rueCheck || !rueCheck.completed) {
            const {data:intake} = await supabase.from('beta_intake').select('completed').eq('user_id',prof.id).single();
            if(!intake || !intake.completed) {
              setShowBetaIntake(true);
            }
          }
        } else if(prof && !prof.onboarded) {
          setShowOnboarding(true);
        }
        // Check Rue intake (skip for owner/admin, skip if already completed or dismissed)
        if(prof && prof.onboarded && prof.role!=="owner" && prof.role!=="admin" && !sessionStorage.getItem('rue_intake_skipped')){
          const {data:rueIntake}=await supabase.from('rue_intake').select('completed').eq('user_id',prof.id).single();
          if(!rueIntake || !rueIntake.completed) setShowRueIntake(true);
        }
        const initialView = window.location.hash.replace("#","");
        if (initialView && initialView !== "home") setView(initialView);
        // Check for Stripe upgrade success
        if(window.location.search.includes('upgraded=true')){
          const freshProf=await supabase.from("profiles").select("*").eq("id",session.user.id).single();
          if(freshProf.data) setProfile(freshProf.data);
          setShowUpgradeSuccess(true);
          setTimeout(()=>{setShowUpgradeSuccess(false);window.history.replaceState({},'',window.location.pathname);},5000);
        }
      } catch(err) {
        console.error('Auth setup error:', err);
      } finally {
        setAuthLoading(false);
      }
    }).catch((err)=>{
      console.error('Auth session error:', err);
      setAuthLoading(false);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(_event === 'SIGNED_OUT') { setAuthUser(null); setProfile(null); setAuthLoading(false); return; }
      if(!session) return;
      setAuthUser(prev => (!prev || prev.id !== session.user.id) ? session.user : prev);
    });
    return()=>subscription.unsubscribe();
  },[]);

  const loadNotifications = useCallback(async () => {
    if (!effectiveUserId) return;
    const { data } = await supabase.from('notifications')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data || []);
  }, [effectiveUserId]);

  // Load notifications and subscribe to realtime
  useEffect(() => {
    if (!effectiveUserId) return;
    loadNotifications();
    const channel = supabase.channel('notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${effectiveUserId}` },
        (payload) => { setNotifications(prev => [payload.new, ...prev]); }
      ).subscribe();
    return () => supabase.removeChannel(channel);
  }, [effectiveUserId, loadNotifications]);

  const handleOnboardingComplete = (updatedData) => {
    setProfile(p => ({ ...p, ...updatedData }));
    setShowOnboarding(false);
    logActivity(authUser?.id, 'onboarding_complete');
  };

  // ━━━ BETA HUB STATE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const [bugReporterOpen,setBugReporterOpen]=useState(false);
  const [bugForm,setBugForm]=useState({title:"",type:"bug",severity:"medium",category:"Dashboard",description:"",steps:"",screenshots:[]});
  const [bugSubmitting,setBugSubmitting]=useState(false);
  const [bugToast,setBugToast]=useState(null);
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
  const [screenshotCapturing,setScreenshotCapturing]=useState(false);

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
    if(view==="beta"&&isBeta){
      if(betaTab==="feedback")loadBetaFeedback();
      if(betaTab==="polls")loadBetaPolls();
      if(betaTab==="forum")loadBetaChannels();
      if(betaTab==="announcements")loadBetaAnnouncements();
    }
  },[view,betaTab,isBeta,loadBetaFeedback,loadBetaPolls,loadBetaChannels,loadBetaAnnouncements]);

  useEffect(()=>{
    if(betaSelChannel&&betaTab==="forum")loadBetaPosts(betaSelChannel.id);
  },[betaSelChannel,betaTab,loadBetaPosts]);

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

  const buildRueSys=()=>{
    let sys=RUE_SYSTEM_PROMPT;
    if(effectiveProfile?.brokerage) sys+=`\n\nUser's brokerage: ${effectiveProfile.brokerage}. Market: ${effectiveProfile.market||"not set"}.`;
    if(leads.length>0){
      sys+=`\n\nPIPELINE (${leads.length} leads):\n`+leads.slice(0,10).map(l=>`- ${l.first_name} ${l.last_name} | ${l.market} | ${l.brokerage?.substring(0,20)||"?"} | ${l.tier} | ${l.urgency} | ${l.pipeline_stage}`).join("\n");
      sys+=`\n\nAd spend: $20/day Facebook/Instagram for recruiting.`;
    }
    return sys;
  };

  const askRueInline=async(q)=>{
    setInlineLoading(true);setInlineResponse(null);setRueConvId(null);
    const userMsg={role:"user",content:q};
    const newHistory=[userMsg];
    setInlineChatHistory(newHistory);
    try{
      const r=await fetch("https://usknntguurefeyzusbdh.supabase.co/functions/v1/rue-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system:buildRueSys(),messages:newHistory,user_id:effectiveUserId})});
      if(!r.ok){const err=await r.text();setInlineResponse(`Error ${r.status} — ${err}`);setInlineLoading(false);return;}
      const d=await r.json();
      const reply=d.content||"No response.";
      if(d.conversation_id) setRueConvId(d.conversation_id);
      setInlineResponse(reply);
      setInlineChatHistory([userMsg,{role:"assistant",content:reply}]);
    }catch(e){setInlineResponse("Connection error: "+e.message);}
    setInlineLoading(false);
  };

  const sendRueChatReply=async(text)=>{
    if(!text.trim()||inlineLoading) return;
    setInlineLoading(true);
    const newHistory=[...inlineChatHistory,{role:"user",content:text}];
    setInlineChatHistory(newHistory);
    try{
      const body={system:buildRueSys(),messages:newHistory,user_id:effectiveUserId};
      if(rueConvId) body.conversation_id=rueConvId;
      const r=await fetch("https://usknntguurefeyzusbdh.supabase.co/functions/v1/rue-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(!r.ok){const err=await r.text();setInlineResponse(`Error ${r.status} — ${err}`);setInlineLoading(false);return;}
      const d=await r.json();
      const reply=d.content||"No response.";
      if(d.conversation_id) setRueConvId(d.conversation_id);
      setInlineResponse(reply);
      setInlineChatHistory([...newHistory,{role:"assistant",content:reply}]);
    }catch(e){setInlineResponse("Connection error: "+e.message);}
    setInlineLoading(false);
  };

  const setViewWithHistory=(v)=>{
    window.history.pushState({view:v},"",`#${v}`);
    setView(v);
    setInlineResponse(null);
    setInlineChatHistory([]);
    setRueConvId(null);
  };
  useEffect(()=>{
    const onPop=(ev)=>{
      if(ev.state?.view){setView(ev.state.view);if(ev.state.view!=="lead")setSelLead(null);}
      else{const h=window.location.hash.replace("#","");setView(h||"home");setSelLead(null);}
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
  const limits=getPlanLimits(effectiveProfile);
  const isPro=limits.isPro;
  const pScore=Math.min(100,Math.round((total>0?25:0)+(targets>0?25:0)+(leads.some(l=>l.pipeline_stage==="outreach_sent")?25:0)+(leads.some(l=>l.pipeline_stage==="meeting_booked")?25:0)));
  const tierData=["Elite","Strong","Mid","Building","New"].map(t=>({name:t,value:leads.filter(l=>l.tier===t).length})).filter(d=>d.value>0);
  const stages=STAGES.map(s=>({...s,count:leads.filter(l=>l.pipeline_stage===s.id).length}));


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
      const r=await fetch(`${RUE_SUPA}/leads`,{method:"POST",headers:{"apikey":RUE_KEY,"Authorization":`Bearer ${RUE_KEY}`,"Content-Type":"application/json","Prefer":"return=representation"},body:JSON.stringify(body)});
      if(!r.ok){console.error("Add lead error:",r.status,await r.text());return;}
      const saved=await r.json();
      const lead=Array.isArray(saved)?saved[0]:saved;
      await load();
      logActivity(authUser.id,'add_lead',{lead_name:`${newLead.first_name} ${newLead.last_name}`.trim()});
      if(doResearch){
        setSelLead(lead);
        setViewWithHistory("lead");
        askRueInline(`I just met a new recruiting prospect: ${newLead.first_name} ${newLead.last_name}${newLead.brokerage?` from ${newLead.brokerage}`:""}${newLead.market?` in ${newLead.market}`:""}.${newLead.notes?` Notes: ${newLead.notes}`:""} Research them and give me an outreach strategy.`);
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

  // ━━━ ADMIN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const [adminStats,setAdminStats]=useState({users:0,leads:0,contentToday:0,agents:0});
  const [adminUsers,setAdminUsers]=useState([]);
  const [adminActivity,setAdminActivity]=useState([]);
  const [adminContent,setAdminContent]=useState([]);
  const [newContent,setNewContent]=useState({title:"",body:"",type:"announcement"});
  const [adminLoading,setAdminLoading]=useState(false);
  const [adminUserLeadStats, setAdminUserLeadStats] = useState({});
  const [leaderboard,setLeaderboard]=useState([]);
  const [lbRefreshing,setLbRefreshing]=useState(false);
  const [blogTab,setBlogTab]=useState("brokerage");
  const [dailyContent,setDailyContent]=useState([]);
  const [dcExpanded,setDcExpanded]=useState({});
  const [rkrtContent,setRkrtContent]=useState([]);
  const [rkrtContentTab,setRkrtContentTab]=useState("social");
  const [rkrtGenerating,setRkrtGenerating]=useState(false);
  const [brokeragePosts,setBrokeragePosts]=useState([]);
  const [bpFilter,setBpFilter]=useState("all");
  const [bpApproving,setBpApproving]=useState({});

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



  useEffect(()=>{if(view==="admin"){if(authLoading)return;if(profile?.role!=="owner"){setView("home");return;}loadAdmin();}},[view,loadAdmin,profile,authLoading]);

  const publishContent=async()=>{
    if(!newContent.title.trim())return;
    const {error}=await supabase.from("platform_content").insert({...newContent,is_published:true});
    if(!error){setNewContent({title:"",body:"",type:"announcement"});loadAdmin();}
  };

  const TeamView=({userId:uid,profile:prof})=>{
    const [teamData,setTeamData]=useState(null);
    const [teamLoading,setTeamLoading]=useState(true);
    const [teamDesc,setTeamDesc]=useState("");
    const [teamValueProp,setTeamValueProp]=useState("");
    const [teamGrowthGoal,setTeamGrowthGoal]=useState("");
    const [contentPrefs,setContentPrefs]=useState({success_stories:false,culture:false,training:false,commission_info:false,recruiting_tips:false});
    const [teamSaving,setTeamSaving]=useState(false);
    const [teamSaved,setTeamSaved]=useState(false);
    useEffect(()=>{
      if(!prof?.team_id) return;
      (async()=>{
        setTeamLoading(true);
        const {data}=await supabase.from('teams').select('*').eq('id',prof.team_id).single();
        if(data){
          const {data:mbrs}=await supabase.from('team_members').select('*').eq('team_id',data.id);
          const mIds=(mbrs||[]).map(m=>m.user_id);
          let mProfs=[];
          if(mIds.length>0){const {data:pp}=await supabase.from('profiles').select('id,full_name,email').in('id',mIds);mProfs=pp||[];}
          data.team_members=(mbrs||[]).map(m=>({...m,profiles:mProfs.find(p=>p.id===m.user_id)||{}}));
          setTeamData(data);
          setTeamDesc(data.description||"");
          setTeamValueProp(data.team_info?.value_prop||"");
          setTeamGrowthGoal(data.team_info?.growth_goal||"");
          if(data.team_info?.content_preferences){
            setContentPrefs(prev=>({...prev,...data.team_info.content_preferences}));
          }
        }
        setTeamLoading(false);
      })();
    },[prof?.team_id]);
    const saveTeamInfo=async()=>{
      if(!teamData) return;
      setTeamSaving(true);
      await supabase.from('teams').update({description:teamDesc,team_info:{...teamData.team_info,value_prop:teamValueProp,content_preferences:contentPrefs,growth_goal:teamGrowthGoal}}).eq('id',teamData.id);
      setTeamSaving(false);setTeamSaved(true);setTimeout(()=>setTeamSaved(false),3000);
    };
    if(teamLoading) return <div style={{textAlign:"center",padding:60,color:T.m}}>Loading team...</div>;
    if(!teamData) return <div style={{textAlign:"center",padding:60,color:T.m}}>No team found. Contact support to set up your team.</div>;
    const members=teamData.team_members||[];
    return (
      <div style={{maxWidth:800,margin:"0 auto"}}>
        {/* Team Header */}
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:24,marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <div style={{fontSize:22,fontWeight:800,color:T.t}}>{teamData.name}</div>
              <div style={{fontSize:13,color:T.s,marginTop:4}}>{teamData.brokerage||""} {teamData.market?"· "+teamData.market:""}</div>
            </div>
            <div style={{padding:"6px 14px",borderRadius:8,background:T.a+"15",color:T.a,fontSize:13,fontWeight:700}}>{members.length}/5 seats</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:T.d,borderRadius:8}}>
            <span style={{fontSize:13,color:T.s}}>Team Blog:</span>
            <a href={`https://rkrt.in/${teamData.slug}`} target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:T.bl,fontWeight:600,textDecoration:"none",fontFamily:"monospace"}}>rkrt.in/{teamData.slug}</a>
            <CopyButton text={`https://rkrt.in/${teamData.slug}`} label="Copy"/>
          </div>
        </div>

        {/* Team Info */}
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:24,marginBottom:20}}>
          <div style={{fontSize:16,fontWeight:700,color:T.t,marginBottom:16}}>Team Info</div>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div>
              <div style={{fontSize:12,color:T.m,letterSpacing:1.2,fontWeight:700,marginBottom:6}}>DESCRIPTION</div>
              <textarea value={teamDesc} onChange={e=>setTeamDesc(e.target.value)} rows={3} placeholder="Describe your team..." style={{width:"100%",padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:14,fontFamily:"inherit",resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <div style={{fontSize:12,color:T.m,letterSpacing:1.2,fontWeight:700,marginBottom:6}}>WHAT MAKES YOUR TEAM SPECIAL</div>
              <textarea value={teamValueProp} onChange={e=>setTeamValueProp(e.target.value)} rows={3} placeholder="Your team's value proposition..." style={{width:"100%",padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:14,fontFamily:"inherit",resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <div style={{fontSize:12,color:T.m,letterSpacing:1.2,fontWeight:700,marginBottom:6}}>CONTENT PREFERENCES</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {[["success_stories","Success Stories"],["culture","Team Culture"],["training","Training"],["commission_info","Commission Info"],["recruiting_tips","Recruiting Tips"]].map(([k,label])=>(
                  <div key={k} onClick={()=>setContentPrefs(p=>({...p,[k]:!p[k]}))} style={{padding:"8px 14px",borderRadius:8,background:contentPrefs[k]?T.a+"18":T.d,border:`1px solid ${contentPrefs[k]?T.a+"40":T.b}`,color:contentPrefs[k]?T.a:T.m,fontSize:13,fontWeight:600,cursor:"pointer"}}>{label}</div>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:12,color:T.m,letterSpacing:1.2,fontWeight:700,marginBottom:6}}>GROWTH GOAL</div>
              <input value={teamGrowthGoal} onChange={e=>setTeamGrowthGoal(e.target.value)} placeholder="e.g., Recruit 10 agents this quarter" style={{width:"100%",padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div onClick={saveTeamInfo} style={{padding:"12px 24px",borderRadius:8,background:teamSaving?T.m:T.a,color:"#000",fontSize:14,fontWeight:700,cursor:teamSaving?"default":"pointer"}}>{teamSaving?"Saving...":"Save Team Info"}</div>
              {teamSaved&&<span style={{fontSize:13,color:T.a,fontWeight:600}}>Saved!</span>}
            </div>
          </div>
        </div>

        {/* Members */}
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:16,fontWeight:700,color:T.t}}>Members</div>
            <div style={{padding:"8px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.m,fontSize:13,fontWeight:600,cursor:"not-allowed",opacity:0.5}}>Invite Member</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {members.map((m,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:T.d,borderRadius:8}}>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:T.t}}>{m.profiles?.full_name||"Unknown"}</div>
                  <div style={{fontSize:12,color:T.s}}>{m.profiles?.email||""}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <span style={{padding:"4px 10px",borderRadius:6,background:m.role==="leader"?T.a+"18":T.d,color:m.role==="leader"?T.a:T.m,fontSize:11,fontWeight:700,textTransform:"capitalize"}}>{m.role||"member"}</span>
                  <span style={{fontSize:11,color:T.m}}>{m.joined_at?new Date(m.joined_at).toLocaleDateString():""}</span>
                </div>
              </div>
            ))}
            {members.length===0&&<div style={{textAlign:"center",padding:20,color:T.m,fontSize:13}}>No members yet</div>}
          </div>
        </div>
      </div>
    );
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
          {dailyContent.length>0?dailyContent.map((dc,i)=>{
            const expanded=dcExpanded[dc.id];
            const platformColor=dc.platform==="facebook"?"#3B82F6":dc.platform==="instagram"?"#E040FB":"#F59E0B";
            return(
            <div key={dc.id||i} style={{background:T.d,border:`1px solid ${T.b}`,borderRadius:10,padding:"16px 18px",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:4,background:platformColor+"20",color:platformColor,textTransform:"capitalize"}}>{dc.platform||"post"}</span>
                <span style={{fontSize:12,color:T.m}}>{dc.content_date||new Date(dc.created_at).toLocaleDateString()}</span>
                {dc.is_posted&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:4,background:T.a+"20",color:T.a}}>Posted</span>}
              </div>
              <div style={{fontSize:14,color:T.t,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{expanded?(dc.body||dc.content||""):(dc.body||dc.content||"").substring(0,150)}{!expanded&&(dc.body||dc.content||"").length>150?"…":""}</div>
              {(dc.body||dc.content||"").length>150&&<div onClick={()=>setDcExpanded(p=>({...p,[dc.id]:!expanded}))} style={{fontSize:12,color:T.a,fontWeight:600,cursor:"pointer",marginTop:6}}>{expanded?"Show less":"Show more"}</div>}
            </div>);
          }):<div style={{textAlign:"center",padding:"24px",color:T.m,fontSize:14}}>No daily content yet</div>}
        </div>}
      </div>

      <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:"24px 26px",marginBottom:24}}>
        <div style={{fontSize:18,fontWeight:700,color:T.t,marginBottom:16}}>👥 Users ({adminUsers.length})</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
            <thead><tr>{["Name","Email","Brokerage","Role","Plan","Leads","Recruited","Meetings","Joined","Onboarded",""].map(h=>
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
                <td style={{padding:"13px 14px"}}>{u.role!=="owner"&&<span onClick={async()=>{setImpersonateLoading(u.id);try{const res=await fetch('https://usknntguurefeyzusbdh.supabase.co/functions/v1/admin-impersonate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({admin_id:authUser.id,target_user_id:u.id})});const data=await res.json();if(data.error){alert(data.error);setImpersonateLoading(false);return;}setRealUser({authUser,profile});setImpersonating(data.impersonate||{id:u.id,full_name:u.full_name||u.email,email:u.email,plan:u.plan||'free',role:u.role||'user'});setViewWithHistory('home');}catch(e){console.error('Impersonate error:',e);alert('Failed to connect to impersonate service');}setImpersonateLoading(false);}} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${T.bl}30`,background:"transparent",color:T.bl,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{impersonateLoading===u.id?"Loading...":"👁 View As"}</span>}</td>
              </tr>
            ):<tr><td colSpan={11} style={{textAlign:"center",padding:"40px",color:T.m,fontSize:15}}>No users found</td></tr>}</tbody>
          </table>
        </div>
      </div>

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
        const rest=leaderboard.slice(3);
        const podiumColors=["#FFD700","#C0C0C0","#CD7F32"];
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
              <div key={u.id} style={{background:T.d,borderRadius:14,padding:"24px 20px",border:`2px solid ${podiumColors[i]}30`,textAlign:"center",position:"relative"}}>
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
                <tr key={u.id} style={{borderBottom:`1px solid ${T.b}`,borderLeft:`3px solid ${scoreBorder(sc)}`}} onMouseOver={ev=>ev.currentTarget.style.background=T.d} onMouseOut={ev=>ev.currentTarget.style.background="transparent"}>
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

          {atRisk.length>0&&<div style={{background:T.r+"08",borderRadius:12,padding:"20px 22px",border:`1px solid ${T.r}20`}}>
            <div style={{fontSize:15,fontWeight:700,color:T.r,marginBottom:12}}>⚠️ At Risk ({atRisk.length} users)</div>
            <div style={{fontSize:12,color:T.m,marginBottom:12}}>Score below 20, inactive 14+ days, or fewer than 3 active days in last 30</div>
            {atRisk.map(u=>{const p=u.profiles||{};const sc=u.accountability_score||0;const la=u.last_active_at?new Date(u.last_active_at):null;const daysInactive=la?Math.floor((now-la)/(1000*60*60*24)):999;return(
              <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,marginBottom:6}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.t}}>{p.full_name||p.email||"—"}</div>
                  <div style={{fontSize:11,color:T.s}}>{p.email||""}</div>
                </div>
                <span style={{fontSize:13,fontWeight:700,color:scoreBorder(sc)}}>{sc}</span>
                {daysInactive>14&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:T.r+"20",color:T.r,fontWeight:700}}>{daysInactive}d inactive</span>}
                {(u.days_active_last_30d!=null&&u.days_active_last_30d<3)&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:T.y+"20",color:T.y,fontWeight:700}}>{u.days_active_last_30d}d active/30</span>}
              </div>);})}
          </div>}

          {leaderboard.length===0&&!adminLoading&&<div style={{textAlign:"center",padding:"40px",color:T.m}}><div style={{fontSize:28,marginBottom:8}}>🏆</div><div style={{fontSize:14}}>No score data yet</div></div>}
        </div>);
      })()}

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
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div>
            <div style={{fontSize:18,fontWeight:700,color:T.t}}>🏢 Brokerage Blogs</div>
            <div style={{fontSize:12,color:T.m,marginTop:2}}>AI-generated recruiting content for affiliated brokerages</div>
          </div>
        </div>
        {/* Stats row */}
        {(()=>{
          const total=brokeragePosts.length;
          const pending=brokeragePosts.filter(p=>p.status==="draft").length;
          const approved=brokeragePosts.filter(p=>p.status==="approved").length;
          const published=brokeragePosts.filter(p=>p.status==="published").length;
          const rejected=brokeragePosts.filter(p=>p.status==="rejected").length;
          const brokerages=[...new Set(brokeragePosts.map(p=>p.brokerage_name||p.brokerage).filter(Boolean))];
          return(<>
            <div style={{display:"flex",gap:10,margin:"14px 0",flexWrap:"wrap"}}>
              {[["Total",total,T.t],["Pending",pending,"#FBBF24"],["Approved",approved,T.a],["Published",published,T.bl],["Rejected",rejected,T.r]].map(([l,v,c])=>
                <div key={l} style={{background:T.d,borderRadius:8,padding:"10px 16px",border:`1px solid ${T.b}`,textAlign:"center",minWidth:70}}>
                  <div style={{fontSize:22,fontWeight:800,color:c}}>{adminLoading?"…":v}</div>
                  <div style={{fontSize:10,color:T.m,fontWeight:700,letterSpacing:1}}>{l.toUpperCase()}</div>
                </div>
              )}
              <select value={bpFilter} onChange={e=>setBpFilter(e.target.value)} style={{padding:"8px 12px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:13,fontFamily:"inherit",marginLeft:"auto"}}>
                <option value="all">All Brokerages</option>
                {brokerages.map(b=><option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div style={{height:1,background:T.b,marginBottom:12}}/>
            {(()=>{
              const filtered=brokeragePosts.filter(p=>bpFilter==="all"||(p.brokerage_name||p.brokerage)===bpFilter);
              const statColor=(s)=>s==="draft"?"#FBBF24":s==="approved"?T.a:s==="published"?T.bl:s==="rejected"?T.r:T.m;
              return filtered.length===0?<div style={{textAlign:"center",padding:"32px",color:T.m}}>No brokerage posts yet.</div>:(
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {filtered.map((p,i)=>(
                    <div key={p.id||i} style={{display:"flex",gap:12,background:T.d,border:`1px solid ${T.b}`,borderRadius:10,padding:"12px 16px",alignItems:"center"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:T.t,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title||"Untitled"}</div>
                        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                          {(p.brokerage_name||p.brokerage)&&<span style={{fontSize:11,color:T.s,fontWeight:600}}>🏢 {p.brokerage_name||p.brokerage}</span>}
                          <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:999,background:statColor(p.status)+"20",color:statColor(p.status),textTransform:"capitalize"}}>{p.status||"draft"}</span>
                          <span style={{fontSize:11,color:T.m}}>{p.created_at?new Date(p.created_at).toLocaleDateString():"—"}</span>
                        </div>
                      </div>
                      {p.status==="draft"&&<div style={{display:"flex",gap:6,flexShrink:0}}>
                        <div onClick={async()=>{if(bpApproving[p.id])return;setBpApproving(prev=>({...prev,[p.id]:"approving"}));await supabase.from("brokerage_posts").update({status:"approved",approved_by:authUser.id,approved_at:new Date().toISOString()}).eq("id",p.id);setBrokeragePosts(prev=>prev.map(x=>x.id===p.id?{...x,status:"approved",approved_by:authUser.id}:x));setBpApproving(prev=>({...prev,[p.id]:null}));}} style={{padding:"6px 14px",borderRadius:7,background:bpApproving[p.id]==="approving"?T.d:T.a+"18",color:bpApproving[p.id]==="approving"?T.m:T.a,fontSize:12,fontWeight:700,cursor:bpApproving[p.id]?"wait":"pointer",border:`1px solid ${T.a}40`}}>{bpApproving[p.id]==="approving"?"…":"✓ Approve"}</div>
                        <div onClick={async()=>{if(bpApproving[p.id])return;setBpApproving(prev=>({...prev,[p.id]:"rejecting"}));await supabase.from("brokerage_posts").update({status:"rejected"}).eq("id",p.id);setBrokeragePosts(prev=>prev.map(x=>x.id===p.id?{...x,status:"rejected"}:x));setBpApproving(prev=>({...prev,[p.id]:null}));}} style={{padding:"6px 14px",borderRadius:7,background:bpApproving[p.id]==="rejecting"?T.d:T.r+"18",color:bpApproving[p.id]==="rejecting"?T.m:T.r,fontSize:12,fontWeight:700,cursor:bpApproving[p.id]?"wait":"pointer",border:`1px solid ${T.r}40`}}>{bpApproving[p.id]==="rejecting"?"…":"✗ Reject"}</div>
                      </div>}
                      {p.slug&&<a href={`https://rkrt.in/blog/${p.slug}`} target="_blank" rel="noreferrer" style={{fontSize:12,color:T.bl,fontWeight:600,textDecoration:"none",flexShrink:0}}>View →</a>}
                    </div>
                  ))}
                </div>
              );
            })()}
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
    </>
  );

  // ━━━ BETA HUB VIEW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const BetaHubView=()=>{
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
  };


  // ━━━ RENDER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if(authLoading) return <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",color:T.s,fontSize:18,fontFamily:"'SF Pro Display',-apple-system,sans-serif"}}>Authenticating…</div>;
  if(!authUser){window.location.href="/login";return null;}

  // Show beta intake for beta testers
  if(showBetaIntake && authUser) {
    return <BetaIntakeFlow userId={authUser.id} profile={profile} supabase={supabase} onComplete={(data) => {
      setProfile(p => ({ ...p, ...data }));
      setShowBetaIntake(false);
      logActivity(authUser.id, 'onboarding_complete');
    }}/>;
  }

  // Show onboarding gate for new users
  if(showOnboarding && authUser) {
    return <OnboardingFlow userId={authUser.id} email={authUser.email} onComplete={handleOnboardingComplete}/>;
  }

  return(
    <div style={{minHeight:"100vh",background:T.bg,color:T.t,fontFamily:"'SF Pro Display',-apple-system,sans-serif",display:"flex",position:"relative",paddingTop:impersonating?42:0}}>
      {showUpgradeSuccess&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:T.a,color:"#000",padding:"14px 32px",borderRadius:10,fontSize:15,fontWeight:800,boxShadow:"0 4px 24px rgba(0,229,160,0.4)",display:"flex",alignItems:"center",gap:10}}>🎉 Welcome to RKRT.in Pro! All features unlocked.</div>}
      {rueIntakeToast&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:T.a,color:"#000",padding:"14px 32px",borderRadius:10,fontSize:15,fontWeight:800,boxShadow:"0 4px 24px rgba(0,229,160,0.4)",display:"flex",alignItems:"center",gap:10}}>🤖 Rue is ready to coach you!</div>}
      {impersonating&&<div style={{position:"fixed",top:0,left:0,right:0,zIndex:9999,background:"#F59E0B",color:"#000",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"center",gap:12,fontSize:14,fontWeight:700,boxShadow:"0 2px 12px rgba(245,158,11,0.4)"}}>
        <span>👁 Viewing as {impersonating.full_name} ({impersonating.email}) — {impersonating.plan} plan</span>
        <span onClick={()=>{setImpersonating(null);setRealUser(null);setViewWithHistory("admin");}} style={{padding:"4px 14px",borderRadius:6,background:"rgba(0,0,0,0.2)",cursor:"pointer",fontSize:13,fontWeight:700}}>✕ Exit</span>
      </div>}
      {showRueIntake&&<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.8)",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
        <div style={{width:"100%",maxWidth:520,maxHeight:"80vh",background:T.card,border:`1px solid ${T.b}`,borderRadius:20,display:"flex",flexDirection:"column",boxShadow:"0 16px 60px rgba(0,0,0,0.7)",overflow:"hidden"}}>
          <div style={{padding:"20px 24px",borderBottom:`1px solid ${T.b}`,flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontSize:22,fontWeight:800,color:T.t}}>Meet Rue</div><span onClick={()=>{sessionStorage.setItem('rue_intake_skipped','1');setShowRueIntake(false);}} style={{fontSize:20,color:T.m,cursor:"pointer",padding:"4px 8px",borderRadius:6,lineHeight:1}}>✕</span></div>
            <div style={{fontSize:13,color:T.s,marginTop:2}}>Your AI recruiting coach</div>
          </div>
          <div ref={el=>{rueIntakeScrollRef.current=el;}} style={{flex:1,overflow:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:12}}>
            {rueConversation.length===0&&!rueLoading&&(
              <div style={{textAlign:"center",padding:"40px 20px"}}>
                <div style={{fontSize:40,marginBottom:12}}>🤖</div>
                <div style={{fontSize:15,color:T.s,marginBottom:20}}>Rue wants to learn about your recruiting goals so she can coach you better.</div>
                <div onClick={()=>sendRueIntake(null)} style={{display:"inline-block",padding:"12px 28px",borderRadius:10,background:T.a,color:"#000",fontSize:15,fontWeight:700,cursor:"pointer"}}>Start Conversation</div>
              </div>
            )}
            {rueConversation.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"85%",padding:"12px 16px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?T.d:T.a+"15",border:`1px solid ${m.role==="user"?T.b:T.a+"30"}`,color:T.t,fontSize:14,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{m.content}</div>
              </div>
            ))}
            {rueLoading&&<div style={{display:"flex",justifyContent:"flex-start"}}><div style={{padding:"12px 16px",borderRadius:"16px 16px 16px 4px",background:T.a+"15",border:`1px solid ${T.a}30`,color:T.s,fontSize:14}}>Rue is typing<span style={{animation:"pulse 1.5s infinite"}}>...</span></div></div>}
          </div>
          {rueConversation.length>0&&<div style={{padding:"12px 16px",borderTop:`1px solid ${T.b}`,display:"flex",gap:8,flexShrink:0}}>
            <input value={rueIntakeInput} onChange={e=>setRueIntakeInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&rueIntakeInput.trim()&&!rueLoading){const msg=rueIntakeInput.trim();setRueConversation(prev=>[...prev,{role:"user",content:msg}]);setRueIntakeInput("");sendRueIntake(msg);setTimeout(()=>{if(rueIntakeScrollRef.current)rueIntakeScrollRef.current.scrollTop=rueIntakeScrollRef.current.scrollHeight;},100);}}} placeholder="Type your reply..." style={{flex:1,padding:"12px 16px",borderRadius:10,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:14,outline:"none",fontFamily:"inherit"}}/>
            <div onClick={()=>{if(rueIntakeInput.trim()&&!rueLoading){const msg=rueIntakeInput.trim();setRueConversation(prev=>[...prev,{role:"user",content:msg}]);setRueIntakeInput("");sendRueIntake(msg);setTimeout(()=>{if(rueIntakeScrollRef.current)rueIntakeScrollRef.current.scrollTop=rueIntakeScrollRef.current.scrollHeight;},100);}}} style={{padding:"12px 20px",borderRadius:10,background:rueIntakeInput.trim()&&!rueLoading?T.a:"#333",color:rueIntakeInput.trim()&&!rueLoading?"#000":T.m,fontSize:14,fontWeight:700,cursor:rueIntakeInput.trim()&&!rueLoading?"pointer":"default",flexShrink:0}}>Send</div>
          </div>}
          <div style={{padding:"8px 16px 12px",textAlign:"center",flexShrink:0}}>
            <span onClick={()=>{sessionStorage.setItem('rue_intake_skipped','1');setShowRueIntake(false);}} style={{fontSize:12,color:T.m,cursor:"pointer",textDecoration:"underline"}}>Skip for now</span>
          </div>
        </div>
      </div>}
      <style>{`
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes rueGlow{0%,100%{filter:drop-shadow(0 0 4px #00E5A0) drop-shadow(0 0 8px #00E5A060)}50%{filter:drop-shadow(0 0 8px #00E5A0) drop-shadow(0 0 16px #00E5A080)}}
.ftb-item:hover .ftb-label{max-width:120px!important;opacity:1!important;margin-left:10px!important}
.ftb-item:hover{background:rgba(255,255,255,0.06)!important;padding-right:16px!important}
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
.ask-rue-grid{grid-template-columns:1fr!important}
.pipe-stats{gap:4px!important}
.pipe-stats>div{padding:8px 4px!important}
.form-grid{grid-template-columns:1fr!important}
.form-grid>div[style*="grid-column"]{grid-column:1!important}
*{word-break:break-word;overflow-wrap:anywhere}
}`}</style>

      {sidebarOpen&&<div onClick={()=>{setSidebarOpen(false);setProfileMenuOpen(false);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:999}}/>}
      {notifOpen&&<div onClick={()=>setNotifOpen(false)} style={{position:"fixed",inset:0,zIndex:1099}}/>}
      {profileMenuOpen&&<div onClick={()=>setProfileMenuOpen(false)} style={{position:"fixed",inset:0,zIndex:1099}}/>}

      {profileMenuOpen&&(
        <div style={{position:"fixed",bottom:80,left:90,width:210,background:T.card,border:`1px solid ${T.b}`,borderRadius:10,padding:"6px 0",zIndex:1100,boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
          {profile?.role==="owner"&&!impersonating&&<>
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
          {[["home","⬡"],["pipeline","◎"],["crm","📋"],["agents","🔍"],["content","📝"],["community","💬"],...(effectiveProfile?.team_id?[["team","👥"]]:[])].map(([id,ic])=>
            <div key={id} onClick={()=>{setViewWithHistory(id);setSidebarOpen(false);setProfileMenuOpen(false);}} title={id} className="nav-btn" style={{width:48,height:48,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:20,background:view===id?T.am:"transparent",color:view===id?T.a:T.m,transition:"all 0.12s",flexShrink:0}}>{ic}</div>
          )}
          {isBeta&&<div onClick={()=>{setViewWithHistory("beta");setSidebarOpen(false);setProfileMenuOpen(false);}} title="Beta Hub" className="nav-btn" style={{width:48,height:48,borderRadius:8,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",background:view==="beta"?T.am:"transparent",color:view==="beta"?T.a:T.m,transition:"all 0.12s",flexShrink:0,gap:2}}><span style={{fontSize:18}}>🧪</span><span style={{fontSize:8,fontWeight:700,letterSpacing:0.5}}>Beta</span></div>}
        </div>
        <div style={{flexShrink:0,height:20}}/>
      </div>

      <div className="main-scroll" style={{flex:1,overflow:"auto",padding:(view==="lead"||view==="addlead")?"0 0 80px 0":"24px 32px 80px 32px"}}>
        {view!=="lead"&&view!=="addlead"&&<div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div className="hamburger-btn" onClick={()=>setSidebarOpen(v=>!v)} style={{display:"none",width:44,height:44,borderRadius:8,alignItems:"center",justifyContent:"center",fontSize:22,cursor:"pointer",background:T.card,border:`1px solid ${T.b}`,color:T.t,flexShrink:0}}>☰</div>
          </div>
          {/* Brokerage chip in header */}
          {effectiveProfile?.brokerage&&view==="home"&&(
            <div style={{fontSize:13,color:T.s,padding:"6px 12px",borderRadius:6,background:T.card,border:`1px solid ${T.b}`}}>
              🏢 <span style={{color:T.t,fontWeight:600}}>{effectiveProfile.brokerage}</span> · {effectiveProfile.market||"No market set"}
            </div>
          )}
        </div>}
        {view==="home"&&<>
<Dash leads={leads} profile={effectiveProfile} activity={activity} recentLeads={leads.slice(0,5)} userId={effectiveUserId} onNavigate={setViewWithHistory} onSelectLead={setSelLead} askRueInline={askRueInline} inlineResponse={inlineResponse} inlineLoading={inlineLoading} inlineChatHistory={inlineChatHistory} onRueChatReply={sendRueChatReply} onCloseInline={()=>{setInlineResponse(null);setInlineChatHistory([]);setRueConvId(null);}} isPro={isPro} chartsReady={chartsReady} BarChart={BarChart} Bar={Bar} XAxis={XAxis} YAxis={YAxis} ResponsiveContainer={ResponsiveContainer} Cell={Cell}/></>}
        {view==="pipeline"&&<>{!authLoading&&!isPro&&<div style={{background:'#F59E0B15',border:'1px solid #F59E0B40',borderRadius:10,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}><div><span style={{fontSize:13,fontWeight:700,color:'#F59E0B'}}>⚠️ Free Plan: </span><span style={{fontSize:13,color:T.s}}>{leads.length} of {limits.leadLimit} leads used · Upgrade for unlimited</span></div><div onClick={()=>startCheckout(authUser?.id,profile?.email)} style={{padding:'8px 16px',borderRadius:8,background:'#F59E0B',color:'#000',fontSize:13,fontWeight:700,cursor:'pointer'}}>Upgrade →</div></div>}<Pipeline leads={leads} onSelectLead={setSelLead} onNavigate={setViewWithHistory} askRueInline={askRueInline} inlineResponse={inlineResponse} inlineLoading={inlineLoading} search={search} setSearch={setSearch}/></>}
        {view==="crm"&&<>{!authLoading&&!isPro&&<div style={{background:'#F59E0B15',border:'1px solid #F59E0B40',borderRadius:10,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}><div><span style={{fontSize:13,fontWeight:700,color:'#F59E0B'}}>⚠️ Free Plan: </span><span style={{fontSize:13,color:T.s}}>{leads.length} of {limits.leadLimit} leads used · Upgrade for unlimited</span></div><div onClick={()=>startCheckout(authUser?.id,profile?.email)} style={{padding:'8px 16px',borderRadius:8,background:'#F59E0B',color:'#000',fontSize:13,fontWeight:700,cursor:'pointer'}}>Upgrade →</div></div>}<CRM leads={leads} onSelectLead={setSelLead} onNavigate={setViewWithHistory} askRueInline={askRueInline} inlineResponse={inlineResponse} inlineLoading={inlineLoading}/></>}
        {view==="agents"&&<ProGate feature="Agent Directory" userId={effectiveUserId} userProfile={effectiveProfile}><AgentDirectory userId={effectiveUserId} userProfile={effectiveProfile} onAddLead={(data)=>{setNewLead(prev=>({...prev,...data}));setView("addlead");}}/></ProGate>}
        {view==="content"&&<ContentTab userId={effectiveUserId} userProfile={effectiveProfile}/>}
        {view==="community"&&<RKRTCommunity userId={effectiveUserId} profile={effectiveProfile} supabase={supabase}/>}
        {view==="team"&&effectiveProfile?.team_id&&<TeamView userId={effectiveUserId} profile={effectiveProfile}/>}
        {view==="admin"&&!impersonating&&profile?.role==="owner"&&<AdminView/>}
        {view==="beta"&&isBeta&&<BetaHubView/>}
        {view==="profile"&&<ProfileView/>}
        {view==="lead"&&selLead&&<LeadPage lead={selLead} onBack={()=>{setSelLead(null);setViewWithHistory("pipeline");}} onAskInline={askRueInline} inlineResponse={inlineResponse} inlineLoading={inlineLoading} userId={effectiveUserId} onDelete={handleDeleteLead} userProfile={effectiveProfile}/>}
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
                <div onClick={()=>saveLead(true)} style={{padding:"14px 28px",borderRadius:8,background:newLead.first_name.trim()?T.a:"#333",color:newLead.first_name.trim()?"#000":T.m,fontSize:16,fontWeight:700,cursor:newLead.first_name.trim()?"pointer":"default",display:"flex",alignItems:"center",gap:8}}>🔍 Save & Research with RUE</div>
                <div onClick={()=>saveLead(false)} style={{padding:"14px 28px",borderRadius:8,background:T.card,border:`1px solid ${T.b}`,color:T.s,fontSize:16,fontWeight:700,cursor:newLead.first_name.trim()?"pointer":"default",opacity:newLead.first_name.trim()?1:0.4}}>Save to CRM</div>
              </div>
            </div>
          </div>
        )}
      </div>
{/* ━━━ FLOATING BOTTOM TOOLBAR ━━━ */}
<div className="floating-toolbar" style={{position:"fixed",bottom:20,left:20,zIndex:1100,display:"flex",flexDirection:"column",gap:4,background:"rgba(7,10,16,0.92)",border:`1px solid ${T.b}`,borderRadius:14,padding:"8px",boxShadow:"0 8px 32px rgba(0,0,0,0.6)",backdropFilter:"blur(12px)"}}>
  {[
    {icon:loading?"⟳":"↻",label:"Refresh",color:loading?T.a:T.s,bg:loading?T.am:"transparent",action:()=>load()},
    {icon:"🔔",label:"Notifications",color:notifOpen?T.a:T.s,bg:notifOpen?T.am:"transparent",action:(e)=>{e.stopPropagation();setNotifOpen(o=>!o);},badge:unreadCount>0?unreadCount:null},
    {icon:null,label:"Profile",color:profileMenuOpen?T.a:T.s,bg:profileMenuOpen?T.am:"transparent",action:()=>setProfileMenuOpen(v=>!v),avatar:true},
    {icon:"🤖",label:"Ask Rue",color:T.a,bg:rueDrawerOpen?T.am:T.as,action:()=>setRueDrawerOpen(true),rueBtn:true},
    {icon:"🚪",label:"Logout",color:T.r,bg:"transparent",action:()=>supabase.auth.signOut().then(()=>{window.location.href="/login";})},
  ].map((item,i)=>(
    <div key={i} onClick={item.action} className="ftb-item" style={{display:"flex",alignItems:"center",gap:0,height:42,borderRadius:10,cursor:"pointer",background:item.bg,transition:"all 0.2s",overflow:"hidden",position:"relative",whiteSpace:"nowrap",padding:"0 10px",boxShadow:item.rueBtn&&!rueDrawerOpen?`0 0 10px ${T.a}40,0 0 20px ${T.a}20`:undefined}}>
      <div style={{width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,position:"relative"}}>
        {item.avatar?<div style={{width:24,height:24,borderRadius:"50%",background:impersonating?"#F59E0B":T.a,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#000"}}>{effectiveProfile?.full_name?.charAt(0).toUpperCase()||"?"}</div>:<span style={{animation:item.rueBtn&&!rueDrawerOpen?"rueGlow 2s ease-in-out infinite":undefined}}>{item.icon}</span>}
        {item.badge&&<div style={{position:'absolute',top:-4,right:-6,background:'#EF4444',color:'#fff',borderRadius:'50%',width:14,height:14,fontSize:8,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center'}}>{item.badge>9?'9+':item.badge}</div>}
      </div>
      <span className="ftb-label" style={{fontSize:13,fontWeight:600,color:item.color,marginLeft:0,maxWidth:0,opacity:0,transition:"all 0.25s ease",overflow:"hidden"}}>{item.label}</span>
    </div>
  ))}
  {notifOpen && <div style={{position:'absolute',bottom:0,left:60,width:320,background:T.card,border:`1px solid ${T.b}`,borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,0.4)',zIndex:1200,overflow:'hidden'}}>
    <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.b}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span style={{fontWeight:700,color:T.t,fontSize:14}}>Notifications</span>
      {unreadCount > 0 && <span onClick={async(e)=>{e.stopPropagation();await supabase.from('notifications').update({read:true}).eq('user_id',effectiveUserId).eq('read',false);loadNotifications();}} style={{fontSize:11,color:T.a,cursor:'pointer'}}>Mark all read</span>}
    </div>
    {notifications.length === 0
      ? <div style={{padding:24,textAlign:'center',color:T.s,fontSize:13}}>No notifications yet</div>
      : notifications.slice(0,8).map(n=>(
        <div key={n.id} onClick={()=>{supabase.from('notifications').update({read:true}).eq('id',n.id);setNotifOpen(false);}} style={{padding:'12px 16px',borderBottom:`1px solid ${T.b}20`,background:n.read?'transparent':T.a+'10',cursor:'pointer'}}>
          <div style={{fontSize:13,fontWeight:n.read?400:700,color:T.t,marginBottom:2}}>{n.title}</div>
          <div style={{fontSize:11,color:T.s,lineHeight:1.4}}>{n.body}</div>
          <div style={{fontSize:10,color:T.m,marginTop:4}}>{new Date(n.created_at).toLocaleDateString()}</div>
        </div>
      ))
    }
  </div>}
  </div>
  <RueDrawer open={rueDrawerOpen} onClose={()=>setRueDrawerOpen(false)} profile={effectiveProfile} leads={leads} userId={effectiveUserId}/>
        {previewUrl&&<div style={{position:"fixed",top:0,right:0,width:"60%",height:"100vh",zIndex:1000,background:T.card,borderLeft:`1px solid ${T.b}`,display:"flex",flexDirection:"column",boxShadow:"-4px 0 30px rgba(0,0,0,0.5)"}}>


        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",borderBottom:`1px solid ${T.b}`,flexShrink:0}}>
          <div style={{fontSize:14,fontWeight:700,color:T.t,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,marginRight:12}}>{previewUrl}</div>
          <div style={{display:"flex",gap:8}}>
            <div onClick={()=>{window.open(previewUrl,"_blank");}} style={{padding:"6px 14px",borderRadius:6,background:T.d,border:`1px solid ${T.b}`,color:T.s,fontSize:12,fontWeight:700,cursor:"pointer"}}>↗ Open in Tab</div>
            <div onClick={()=>setPreviewUrl(null)} style={{padding:"6px 14px",borderRadius:6,background:T.r+"15",border:`1px solid ${T.r}20`,color:T.r,fontSize:12,fontWeight:700,cursor:"pointer"}}>✕ Close</div>
          </div>
        </div>
        <iframe src={previewUrl} style={{width:"100%",flex:1,border:"none",background:"#fff"}}/>
      </div>}

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
    </div>
  );
}
