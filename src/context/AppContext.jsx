import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import useAuth from '../hooks/useAuth';
import useLeads from '../hooks/useLeads';
import { supabase, RUE_SUPA, RUE_KEY, logActivity } from '../lib/supabase';
import { RUE_SYSTEM_PROMPT } from '../lib/rue';
import { trackActivity, trackPageView } from '../lib/track';
import { getPlanLimits } from '../lib/utils';
import { STAGES } from '../lib/constants';
import T from '../lib/theme';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const auth = useAuth();
  const { authUser, profile, authLoading, setProfile, showUpgradeSuccess, setShowUpgradeSuccess, initialHash } = auth;

  const [impersonating, setImpersonating] = useState(null);
  const [realUser, setRealUser] = useState(null);
  const [impersonateLoading, setImpersonateLoading] = useState(false);

  const effectiveUserId = (impersonating?.id) ? impersonating.id : authUser?.id;
  const effectiveProfile = (impersonating?.id) ? impersonating : profile;
  console.log('EFFECTIVE:', effectiveProfile?.role, effectiveProfile?.plan, 'impersonating:', !!(impersonating && impersonating.id));

  const leadState = useLeads(authUser, impersonating);
  const { leads, activity, loading, load, selLead, setSelLead, selLeadRef, pendingLeadId, setPendingLeadId, handleSelectLead, handleDeleteLead, recentLeads } = leadState;

  // View routing
  const [view, setView] = useState("home");
  const [search, setSearch] = useState("");
  const [autoDraftEmail, setAutoDraftEmail] = useState(false);

  // Inline Rue state (declared before setViewWithHistory which references them)
  const [inlineResponse, setInlineResponse] = useState(null);
  const [inlineLoading, setInlineLoading] = useState(false);
  const [inlineChatHistory, setInlineChatHistory] = useState([]);
  const [rueConvId, setRueConvId] = useState(null);
  const [rueChatInput, setRueChatInput] = useState("");
  const [rueCopySaved, setRueCopySaved] = useState(false);
  const rueMessagesRef = useRef(null);

  const setViewWithHistory = useCallback((v) => {
    const lid = v === "lead" && selLeadRef.current?.id ? selLeadRef.current.id : null;
    const hash = lid ? `lead/${lid}` : v;
    window.history.pushState({ view: v, leadId: lid }, "", `#${hash}`);
    setView(v);
    setInlineResponse(null);
    setInlineChatHistory([]);
    setRueConvId(null);
  }, []);

  // Initial hash routing (after auth loads)
  useEffect(() => {
    if (authLoading || !authUser) return;
    if (!initialHash) return;
    const leadMatch = initialHash.match(/^lead\/(.+)$/);
    if (leadMatch) {
      setView("lead");
      setPendingLeadId(leadMatch[1]);
    } else if (initialHash && initialHash !== "home") {
      setView(initialHash);
    }
  }, [authLoading, authUser, initialHash]);

  // Check for Stripe upgrade success (handled in useAuth, but UI toast is managed there too)

  // Popstate handler
  useEffect(() => {
    const onPop = (ev) => {
      if (ev.state?.view) {
        setView(ev.state.view);
        if (ev.state.view === "lead" && ev.state.leadId) {
          const found = leads.find(l => l.id === ev.state.leadId);
          if (found) { setSelLead(found); selLeadRef.current = found; } else { setPendingLeadId(ev.state.leadId); }
        } else if (ev.state.view !== "lead") setSelLead(null);
      } else {
        const h = window.location.hash.replace("#", "");
        const leadMatch = h.match(/^lead\/(.+)$/);
        if (leadMatch) {
          setView("lead");
          const found = leads.find(l => l.id === leadMatch[1]);
          if (found) { setSelLead(found); selLeadRef.current = found; } else { setPendingLeadId(leadMatch[1]); }
        } else { setView(h || "home"); setSelLead(null); }
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [leads]);

  // Track page views on navigation
  useEffect(() => {
    if (effectiveUserId && view) trackPageView(effectiveUserId, view);
  }, [view, effectiveUserId]);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

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

  // Rue inline chat
  const buildRueSys = useCallback(() => {
    let sys = RUE_SYSTEM_PROMPT;
    if (effectiveProfile?.brokerage) sys += `\n\nUser's brokerage: ${effectiveProfile.brokerage}. Market: ${effectiveProfile.market || "not set"}.`;
    if (leads.length > 0) {
      sys += `\n\nPIPELINE (${leads.length} leads):\n` + leads.slice(0, 10).map(l => `- ${l.first_name} ${l.last_name} | ${l.market} | ${l.brokerage?.substring(0, 20) || "?"} | ${l.tier} | ${l.urgency} | ${l.pipeline_stage}`).join("\n");
      sys += `\n\nAd spend: $20/day Facebook/Instagram for recruiting.`;
    }
    return sys;
  }, [effectiveProfile, leads]);

  const askRueInline = useCallback(async (q) => {
    trackActivity(effectiveUserId, 'rue_chat', { prompt: q.substring(0, 100) });
    setInlineLoading(true); setInlineResponse(null); setRueConvId(null);
    const userMsg = { role: "user", content: q };
    const newHistory = [userMsg];
    setInlineChatHistory(newHistory);
    try {
      const r = await fetch("https://usknntguurefeyzusbdh.supabase.co/functions/v1/rue-chat", { method: "POST", headers: { "Content-Type": "application/json", "apikey": RUE_KEY }, body: JSON.stringify({ system: buildRueSys(), messages: newHistory, user_id: effectiveUserId }) });
      if (!r.ok) { const err = await r.text(); setInlineResponse(`Error ${r.status} — ${err}`); setInlineLoading(false); return; }
      const d = await r.json();
      const reply = d.content || "No response.";
      if (d.conversation_id) setRueConvId(d.conversation_id);
      setInlineResponse(reply);
      setInlineChatHistory([userMsg, { role: "assistant", content: reply }]);
    } catch (e) { setInlineResponse("Connection error: " + e.message); }
    setInlineLoading(false);
  }, [effectiveUserId, buildRueSys]);

  const sendRueChatReply = useCallback(async (text) => {
    if (!text.trim() || inlineLoading) return;
    setInlineLoading(true);
    const newHistory = [...inlineChatHistory, { role: "user", content: text }];
    setInlineChatHistory(newHistory);
    try {
      const body = { system: buildRueSys(), messages: newHistory, user_id: effectiveUserId };
      if (rueConvId) body.conversation_id = rueConvId;
      const r = await fetch("https://usknntguurefeyzusbdh.supabase.co/functions/v1/rue-chat", { method: "POST", headers: { "Content-Type": "application/json", "apikey": RUE_KEY }, body: JSON.stringify(body) });
      if (!r.ok) { const err = await r.text(); setInlineResponse(`Error ${r.status} — ${err}`); setInlineLoading(false); return; }
      const d = await r.json();
      const reply = d.content || "No response.";
      if (d.conversation_id) setRueConvId(d.conversation_id);
      setInlineResponse(reply);
      setInlineChatHistory([...newHistory, { role: "assistant", content: reply }]);
    } catch (e) { setInlineResponse("Connection error: " + e.message); }
    setInlineLoading(false);
  }, [inlineChatHistory, inlineLoading, rueConvId, effectiveUserId, buildRueSys]);

  useEffect(() => { if (rueMessagesRef.current) rueMessagesRef.current.scrollTop = rueMessagesRef.current.scrollHeight; }, [inlineChatHistory, inlineLoading]);

  const copyRueResponse = useCallback(() => {
    if (!inlineResponse) return;
    navigator.clipboard.writeText(inlineResponse).catch(() => {});
    setRueCopySaved(true);
    setTimeout(() => setRueCopySaved(false), 2000);
  }, [inlineResponse]);

  // Rue intake (the modal conversation)
  const [rueConversation, setRueConversation] = useState([]);
  const [rueLoading, setRueLoading] = useState(false);
  const [rueIntakeInput, setRueIntakeInput] = useState("");
  const [rueIntakeToast, setRueIntakeToast] = useState(false);
  const rueIntakeScrollRef = useRef(null);

  const sendRueIntake = useCallback(async (msg) => {
    if (rueLoading) return;
    setRueLoading(true);
    try {
      const body = msg ? { user_id: authUser?.id, message: msg } : { user_id: authUser?.id, plan: profile?.plan || "free" };
      const res = await fetch("https://usknntguurefeyzusbdh.supabase.co/functions/v1/rue-intake", { method: "POST", headers: { "Content-Type": "application/json", "apikey": RUE_KEY, "Authorization": `Bearer ${RUE_KEY}` }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.conversation) setRueConversation(data.conversation);
      else if (data.message) setRueConversation(prev => [...prev, { role: "assistant", content: data.message }]);
      if (data.completed) {
        setTimeout(() => { auth.setShowRueIntake(false); setRueIntakeToast(true); setTimeout(() => setRueIntakeToast(false), 4000); }, 3000);
      }
    } catch (e) { console.error("Rue intake error:", e); }
    setRueLoading(false);
  }, [authUser, profile, rueLoading]);

  // Derived values
  const limits = getPlanLimits(effectiveProfile);
  const isPro = limits.isPro;
  const isBeta = profile?.is_beta_tester === true;

  // Charts
  const [chartsReady, setChartsReady] = useState(false);

  // New lead form state
  const [newLead, setNewLead] = useState({ first_name: "", last_name: "", phone: "", email: "", market: "", brokerage: "", source: "", notes: "" });
  const [savingLead, setSavingLead] = useState(false);
  const canSaveLead = newLead.first_name.trim() && (newLead.phone.trim() || newLead.email.trim());

  const saveLead = useCallback(async (doResearch) => {
    if (!canSaveLead || savingLead) return;
    setSavingLead(true);
    try {
      const body = {
        user_id: authUser.id,
        first_name: newLead.first_name.trim(),
        last_name: newLead.last_name.trim(),
        email: newLead.email.trim() || null,
        phone: newLead.phone.trim() || null,
        market: newLead.market.trim() || null,
        brokerage: newLead.brokerage.trim() || null,
        source: newLead.source.trim() || "Manual",
        pipeline_stage: "new",
        tier: "New",
        urgency: "LOW"
      };
      const r = await fetch(`${RUE_SUPA}/leads`, { method: "POST", headers: { "apikey": RUE_KEY, "Authorization": `Bearer ${RUE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" }, body: JSON.stringify(body) });
      if (!r.ok) { console.error("Add lead error:", r.status, await r.text()); alert("Failed to save lead. Please try again."); setSavingLead(false); return; }
      const saved = await r.json();
      const lead = Array.isArray(saved) ? saved[0] : saved;
      await load();
      logActivity(authUser.id, 'add_lead', { lead_name: `${newLead.first_name} ${newLead.last_name}`.trim() });
      trackActivity(authUser.id, 'add_lead', { source: newLead.source || 'Manual' });
      if (doResearch) {
        setSelLead(lead);
        setViewWithHistory("lead");
        askRueInline(`I just met a new recruiting prospect: ${newLead.first_name} ${newLead.last_name}${newLead.brokerage ? ` from ${newLead.brokerage}` : ""}${newLead.market ? ` in ${newLead.market}` : ""}.${newLead.notes ? ` Notes: ${newLead.notes}` : ""} Research them and give me an outreach strategy.`);
      } else {
        setViewWithHistory("crm");
      }
      setNewLead({ first_name: "", last_name: "", phone: "", email: "", market: "", brokerage: "", source: "", notes: "" });
      setSavingLead(false);
    } catch (e) { console.error("Save lead error:", e); alert("Failed to save lead. Please try again."); setSavingLead(false); }
  }, [canSaveLead, savingLead, authUser, newLead, load, setViewWithHistory, askRueInline]);

  // UI state
  const [enrichAgent, setEnrichAgent] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [rueDrawerOpen, setRueDrawerOpen] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(0);

  // Auto-open Rue drawer for first-time users (0 leads, no prior Rue conversations)
  const [rueAutoOpened, setRueAutoOpened] = useState(false);
  useEffect(() => {
    if (!authUser || !profile || rueAutoOpened || rueDrawerOpen) return;
    if (leads.length > 0) return;
    // Check if user has any prior rue conversations
    const checkFirstTime = async () => {
      const { count } = await supabase.from('rue_conversations').select('id', { count: 'exact', head: true }).eq('user_id', authUser.id);
      if (count === 0 || count === null) {
        setTimeout(() => {
          setRueDrawerOpen(true);
          setRueAutoOpened(true);
        }, 2000);
      }
    };
    checkFirstTime().catch(() => {});
  }, [authUser, profile, leads, rueAutoOpened, rueDrawerOpen]);

  // Inbox unread count
  useEffect(() => {
    if (!authUser) return;
    const loadUnread = async () => {
      const { data } = await supabase.from('v_unread_count').select('unread').eq('user_id', authUser.id).maybeSingle();
      setInboxUnread(data?.unread || 0);
    };
    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, [authUser]);

  const value = {
    // Auth
    ...auth,
    // Impersonation
    impersonating, setImpersonating, realUser, setRealUser, impersonateLoading, setImpersonateLoading,
    effectiveUserId, effectiveProfile,
    // Leads
    ...leadState, load,
    // View routing
    view, setView, setViewWithHistory, search, setSearch,
    autoDraftEmail, setAutoDraftEmail,
    // Rue inline
    inlineResponse, setInlineResponse, inlineLoading, inlineChatHistory, setInlineChatHistory,
    rueConvId, setRueConvId, rueChatInput, setRueChatInput, rueCopySaved, rueMessagesRef,
    askRueInline, sendRueChatReply, copyRueResponse, buildRueSys,
    // Rue intake
    rueConversation, rueLoading, rueIntakeInput, setRueIntakeInput, rueIntakeToast, rueIntakeScrollRef, sendRueIntake,
    // Notifications
    notifications, loadNotifications, notifOpen, setNotifOpen, unreadCount,
    // Derived
    isPro, limits, isBeta, chartsReady, setChartsReady,
    // New lead
    newLead, setNewLead, saveLead, savingLead, canSaveLead,
    // UI
    enrichAgent, setEnrichAgent, previewUrl, setPreviewUrl,
    sidebarOpen, setSidebarOpen, profileMenuOpen, setProfileMenuOpen,
    rueDrawerOpen, setRueDrawerOpen, inboxUnread,
    // Supabase (for child components that need it)
    supabase,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export default AppContext;
