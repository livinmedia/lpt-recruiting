// RKRT.in Content Tab
// Daily content, recruiting links, and blog management

import { useState, useEffect } from 'react';
import T from '../../lib/theme';
import { BROKERAGES, TARGET_BROKERAGES } from '../../lib/constants';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY, logActivity } from '../../lib/supabase';
import { ago } from '../../lib/utils';
import { CopyButton } from '../../components/ui/CopyButton';

const THEME_COLORS = {
  revenue_share: '#10B981',
  lifestyle: '#8B5CF6',
  commission: '#F59E0B',
  technology: '#3B82F6',
  support: '#EC4899',
  growth: '#06B6D4',
  default: T.a,
};

export default function ContentTab({ userId, userProfile }) {
  const [contentTab, setContentTab] = useState("links");
  const [dailyContent, setDailyContent] = useState([]);
  
  const [teamPosts, setTeamPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBrokerage, setSelectedBrokerage] = useState("");
  const [showWritePost, setShowWritePost] = useState(false);
  const [postSaving, setPostSaving] = useState(false);
  const [postStep, setPostStep] = useState("input"); // "input" | "review"
  const [postSubject, setPostSubject] = useState("");
  const [postContext, setPostContext] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [rueDrafting, setRueDrafting] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postExcerpt, setPostExcerpt] = useState("");
  const [postContent, setPostContent] = useState("");
  const isTeamLeader = (userProfile?.plan === "team_leader" || userProfile?.plan === "regional_operator" || userProfile?.plan === "enterprise" || userProfile?.role === "owner") && userProfile?.team_id;
  const isAdmin = userProfile?.role === "owner" || userProfile?.role === "admin";

  const [teamSlug, setTeamSlug] = useState("");
  const [blogTab, setBlogTab] = useState("published");
  const [editingPost, setEditingPost] = useState(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [decliningPost, setDecliningPost] = useState(null);
  const [postToast, setPostToast] = useState("");
  const [contentDate, setContentDate] = useState(new Date().toISOString().split('T')[0]);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [postingToFb, setPostingToFb] = useState(null); // content id currently posting
  const [fbDetailId, setFbDetailId] = useState(null); // content id showing FB details
  const [boostItem, setBoostItem] = useState(null); // content item for boost modal
  const [boostAudience, setBoostAudience] = useState("competing_agents");
  const [boostBudget, setBoostBudget] = useState(2500);
  const [boostZip, setBoostZip] = useState("");
  const [boostRadius, setBoostRadius] = useState(25);
  const [boostAudiences, setBoostAudiences] = useState([]);
  const [boostSubmitting, setBoostSubmitting] = useState(false);
  const [fbPosts, setFbPosts] = useState([]);
  const [recruitingPages, setRecruitingPages] = useState([]);
  const [rpLoading, setRpLoading] = useState(false);

  useEffect(() => {
    loadContent(contentDate);
    if (isTeamLeader) loadTeamPosts();
    if (userId) {
      supabase.from('user_fb_posts').select('page_slug, target_brokerage, created_at').eq('user_id', userId).eq('post_type', 'recruiting_link').then(({ data }) => { if (data) setFbPosts(data); });
    }
  }, [contentDate]);

  const loadContent = async (date) => {
    setLoading(true);
    try {
      const d = date || new Date().toISOString().split('T')[0];
      const { data } = await supabase.from('daily_content').select('*').eq('content_date', d).order('created_at', { ascending: false });
      let dailyData = data || [];
      if (dailyData.length === 0 && d === new Date().toISOString().split('T')[0]) {
        const recentRes = await supabase.from('daily_content').select('*').order('content_date', { ascending: false }).limit(6);
        dailyData = recentRes.data || [];
        if (dailyData.length > 0 && dailyData[0].content_date !== d) {
          setContentDate(dailyData[0].content_date);
        }
      }
      setDailyContent(dailyData);
    } catch (err) {
      console.error("loadContent error:", err);
      setDailyContent([]);
    }
    setLoading(false);
  };

  const loadTeamPosts = async () => {
    if (!userProfile?.team_id) return;
    try {
      const { data: team } = await supabase.from('teams').select('slug').eq('id', userProfile.team_id).single();
      if (team?.slug) setTeamSlug(team.slug);
      const { data } = await supabase.from('team_posts').select('*').eq('team_id', userProfile.team_id).order('created_at', { ascending: false });
      setTeamPosts(data || []);
    } catch (err) {
      console.error("loadTeamPosts error:", err);
    }
  };

  const showToast = (msg) => { setPostToast(msg); setTimeout(() => setPostToast(""), 3500); };

  const resetPostModal = () => {
    setShowWritePost(false);
    setPostStep("input");
    setPostSubject("");
    setPostContext("");
    setImageUrl(null);
    setRueDrafting(false);
    setPostTitle("");
    setPostExcerpt("");
    setPostContent("");
    setEditingPost(null);
  };

  const handleImageUpload = async (file) => {
    if (!file || !userProfile?.team_id) return;
    setImageUploading(true);
    const ext = file.name.split('.').pop();
    const slug = teamSlug || userProfile.team_id;
    const path = `teams/${slug}/manual_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('content-images').upload(path, file, { upsert: true });
    if (error) { console.error('Image upload error:', error); setImageUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('content-images').getPublicUrl(path);
    setImageUrl(publicUrl);
    setImageUploading(false);
  };

  const draftWithRue = async () => {
    if (!postSubject.trim()) return;
    setRueDrafting(true);
    setPostStep("review");
    try {
      const res = await fetch('https://usknntguurefeyzusbdh.supabase.co/functions/v1/rue-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({
          system: "You are Rue, an AI content writer for a real estate recruiting team blog. Write engaging, professional blog posts that attract agents to join the team. Use markdown formatting. Write 400-600 words.",
          messages: [{ role: "user", content: `Write a blog post about: ${postSubject}\n\nContext from the team: ${postContext || "No additional context provided."}\n\nTeam name: ${teamSlug || 'our team'}. Make it compelling for real estate agents considering joining a team. Use a conversational but professional tone.` }],
          user_id: userId,
          save: false,
        }),
      });
      const data = await res.json();
      const draft = data.response || data.message || data.content || "";
      setPostTitle(postSubject);
      setPostContent(draft);
      setPostExcerpt(draft.replace(/#+\s[^\n]*/g, '').replace(/\*+/g, '').trim().substring(0, 150) + "…");
    } catch (e) {
      // leave fields empty so user can type manually
    }
    setRueDrafting(false);
  };

  const publishTeamPost = async (requestedStatus) => {
    if (!postTitle.trim() || !userProfile?.team_id) return;
    setPostSaving(true);
    try {
      const finalStatus = requestedStatus === 'published' && !isAdmin ? 'pending' : requestedStatus;
      const now = new Date().toISOString();
      if (editingPost) {
        const { error } = await supabase.from('team_posts').update({
          title: postTitle,
          excerpt: postExcerpt,
          content: postContent,
          image_url: imageUrl || editingPost.image_url || null,
          status: finalStatus,
          ...(finalStatus === 'published' ? { published_at: now } : {}),
        }).eq('id', editingPost.id);
        if (error) throw error;
      } else {
        const slug = postTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 80) + '-' + crypto.randomUUID().split('-')[0];
        const { error } = await supabase.from('team_posts').insert({
          team_id: userProfile.team_id,
          author_id: userId,
          title: postTitle,
          slug,
          excerpt: postExcerpt,
          content: postContent,
          image_url: imageUrl || null,
          status: finalStatus,
          ...(finalStatus === 'published' ? { published_at: now } : {}),
          content_source: 'rue_ai',
        }).select().single();
        if (error) throw error;
        if (!imageUrl) {
          fetch('https://usknntguurefeyzusbdh.supabase.co/functions/v1/generate-team-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team_id: userProfile.team_id, backfill_images: true }),
          }).catch(() => {});
        }
      }
      resetPostModal();
      loadTeamPosts();
      if (finalStatus === 'pending') showToast("Post submitted for approval!");
      else showToast("Post saved!");
    } catch (err) {
      showToast("Failed to save post. Please try again.");
    }
    setPostSaving(false);
  };

  const openEditPost = (post) => {
    setEditingPost(post);
    setPostTitle(post.title || "");
    setPostExcerpt(post.excerpt || "");
    setPostContent(post.content || "");
    setImageUrl(post.image_url || null);
    setPostSubject(post.title || "");
    setPostStep("review");
    setShowWritePost(true);
  };

  const approvePost = async (post) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('team_posts').update({ status: 'published', approved_by: userId, approved_at: now, published_at: now }).eq('id', post.id);
      if (error) throw error;
      loadTeamPosts();
      showToast("Post approved and published!");
    } catch (err) {
      showToast("Failed to approve post.");
    }
  };

  const unpublishPost = async (post) => {
    try {
      const { error } = await supabase.from('team_posts').update({ status: 'draft' }).eq('id', post.id);
      if (error) throw error;
      loadTeamPosts();
    } catch (err) {
      showToast("Failed to unpublish post.");
    }
  };

  const deletePost = async (post) => {
    try {
      const { error } = await supabase.from('team_posts').delete().eq('id', post.id);
      if (error) throw error;
      loadTeamPosts();
    } catch (err) {
      showToast("Failed to delete post.");
    }
  };

  const openDecline = (post) => { setDecliningPost(post); setDeclineReason(""); setDeclineOpen(true); };

  const submitDecline = async () => {
    if (!decliningPost) return;
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('team_posts').update({ status: 'declined', decline_reason: declineReason, declined_by: userId, declined_at: now }).eq('id', decliningPost.id);
      if (error) throw error;
      setDeclineOpen(false);
      setDecliningPost(null);
      loadTeamPosts();
    } catch (err) {
      showToast("Failed to decline post.");
    }
  };

  const postToFacebook = async (item) => {
    setPostingToFb(item.id);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/post-to-facebook?mode=post&id=${item.id}&user_id=${userId}`,
        { headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      const data = await res.json();
      if (res.ok && !data.error) {
        setDailyContent(prev => prev.map(c => c.id === item.id ? { ...c, is_posted: true, posted_at: new Date().toISOString(), engagement: data.engagement || data } : c));
        supabase.from('user_fb_posts').insert({ user_id: userId, post_type: 'daily_content', content_id: item.id, page_name: item.headline, fb_results: data.results || data.engagement, pages_posted: data.results?.filter(r => r.status === 'posted').map(r => r.page) || [] }).then(() => {});
        showToast("Posted to 2 pages!");
      } else {
        showToast("Error: " + (data.error || "Post failed"));
      }
    } catch (e) {
      showToast("Error: " + e.message);
    }
    setPostingToFb(null);
  };

  const submitBoost = async () => {
    if (!boostItem) return;
    setBoostSubmitting(true);
    try {
      const row = {
        user_id: userId,
        content_id: boostItem.id || null,
        audience_type: boostAudience,
        target_zip: boostZip,
        target_radius_miles: boostRadius,
        user_paid_amount: boostBudget,
        ad_spend_amount: Math.round(boostBudget * 0.70),
        platform_fee: Math.round(boostBudget * 0.30),
        status: 'pending_payment'
      };
      if (boostItem._boostUrl) row.notes = boostItem._boostUrl;
      const { error } = await supabase.from('boost_requests').insert(row);
      if (error) throw error;
      showToast("Boost request submitted!");
      setBoostItem(null);
    } catch (e) {
      showToast("Error: " + e.message);
    }
    setBoostSubmitting(false);
  };

  useEffect(() => {
    if (boostItem) {
      supabase.from('boost_audiences').select('*').neq('audience_type', '_config').order('audience_type').then(({ data }) => {
        if (data?.length) setBoostAudiences(data);
      });
    }
  }, [boostItem]);

  const buildContent = (item) => {
    let text = '';
    if (item.headline) text += item.headline + '\n\n';
    if (item.body) text += item.body;
    return text.trim();
  };

  const formatHashtags = (tags) => {
    if (!tags || !Array.isArray(tags) || tags.length === 0) return null;
    return tags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ');
  };

  const themeColor = (theme) => THEME_COLORS[theme] || THEME_COLORS.default;

  const downloadImage = async (url, filename) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Landing page URLs
  const landingPages = [
    { name: "Main Join Page", path: "join", desc: "Primary recruiting landing page", icon: "🤝", label: "Join", gradient: "linear-gradient(135deg, #059669, #10B981)", fbTitle: "Why Top Agents Are Switching to LPT Realty" },
    { name: "Commission Calculator", path: "calculator", desc: "Interactive commission comparison tool", icon: "🧮", label: "Calculator", gradient: "linear-gradient(135deg, #2563EB, #3B82F6)", fbTitle: "How Much More Could You Earn? Free Calculator" },
    { name: "New Agent Program", path: "new-agent", desc: "For newly licensed agents", icon: "🚀", label: "New Agent", gradient: "linear-gradient(135deg, #7C3AED, #8B5CF6)", fbTitle: "Launch Your Real Estate Career the Right Way" },
    { name: "Revenue Share", path: "revenue-share", desc: "Passive income opportunity", icon: "💰", label: "Revenue", gradient: "linear-gradient(135deg, #D97706, #F59E0B)", fbTitle: "Build Passive Income Up to 7 Tiers Deep" },
    { name: "Why Switch", path: "why-switch", desc: "For agents considering a move", icon: "🔄", label: "Switch", gradient: "linear-gradient(135deg, #DC2626, #F97316)", fbTitle: "The Real Numbers: Your Brokerage vs LPT Realty" },
  ];

  const personalizeLinks = (text) => {
    if (!userId) return text;
    return text.replace(/https:\/\/rkrt\.in\/[^\s)]+/g, (url) => {
      const u = new URL(url);
      u.searchParams.set('ref', userId);
      return u.toString();
    });
  };

  const getPageUrl = (path) => `https://rkrt.in/${path}?ref=${userId || ''}&target=${encodeURIComponent(selectedBrokerage)}`;

  // Display-friendly URL: strip query params so links don't look overwhelming
  const getDisplayUrl = (fullUrl) => {
    try {
      const u = new URL(fullUrl);
      return u.origin + u.pathname;
    } catch {
      return fullUrl;
    }
  };

  const userBrokerage = userProfile?.brokerage || "LPT Realty";
  const userBrokSlug = userBrokerage.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const userBlogUrl = `https://rkrt.in/${userBrokSlug}?ref=${userId || ''}`;

  return (
    <div>
      {/* Header */}
      <style>{`
        @keyframes glowPulse{0%,100%{box-shadow:0 0 8px rgba(0,229,160,0.3)}50%{box-shadow:0 0 20px rgba(0,229,160,0.6)}}
        @media (max-width: 768px) {
          .content-tabs { flex-wrap: wrap !important; }
          .content-tabs > div { flex: 1 1 45% !important; text-align: center !important; padding: 10px 12px !important; font-size: 13px !important; }
          .landing-page-row { flex-direction: column !important; }
          .landing-page-row > div:first-child { width: 100% !important; height: 120px !important; }
          .lp-actions { width: 100% !important; justify-content: flex-start !important; }
          .blog-link-row { flex-direction: column !important; gap: 10px !important; }
          .blog-link-actions { width: 100% !important; }
          .daily-content-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: T.t, marginBottom: 8 }}>Content Hub</div>
        <div style={{ fontSize: 14, color: T.s }}>Recruiting content, landing pages, and daily posts</div>
      </div>

      {/* Tabs */}
      <div className="content-tabs" style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[["links", "🔗 Recruiting Links"], ["daily", "📅 Daily Content"], ["pages", "📄 Recruiting Pages"], ...(isTeamLeader ? [["team_blog", "👥 Team Blog"]] : [])].map(([id, label]) => (
          <div
            key={id}
            onClick={() => setContentTab(id)}
            style={{ padding: "12px 20px", borderRadius: 8, background: contentTab === id ? T.a + "18" : T.card, color: contentTab === id ? T.a : T.s, fontSize: 14, fontWeight: 600, cursor: "pointer", border: `1px solid ${contentTab === id ? T.a + "40" : T.b}` }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Recruiting Links Tab */}
      {contentTab === "links" && (
        <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "28px" }}>
          <div className="content-links-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.t }}>🎯 Recruiting Links</div>
            <select
              value={selectedBrokerage}
              onChange={e => setSelectedBrokerage(e.target.value)}
              style={{ padding: "10px 16px", borderRadius: 8, background: T.d, border: `2px solid ${selectedBrokerage ? T.b : T.a}`, color: selectedBrokerage ? T.t : T.s, fontSize: 14, fontFamily: "inherit", cursor: "pointer", boxShadow: selectedBrokerage ? "none" : "0 0 12px rgba(0,229,160,0.3)", animation: selectedBrokerage ? "none" : "glowPulse 2s ease-in-out infinite", outline: "none" }}
            >
              <option value="">🎯 Select target brokerage...</option>
              {TARGET_BROKERAGES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {!selectedBrokerage ? (
            <div style={{ background: T.d, border: `1px solid ${T.a}30`, borderRadius: 12, padding: "40px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.t, marginBottom: 8 }}>Select your target brokerage above to generate personalized recruiting links</div>
              <div style={{ fontSize: 13, color: T.s }}>Each landing page will be customized for the brokerage you're targeting</div>
            </div>
          ) : (<>
          <div style={{ fontSize: 13, color: T.s, marginBottom: 20, padding: "12px 16px", background: T.d, borderRadius: 8 }}>
            Share these links to attract agents from <strong style={{ color: T.t }}>{selectedBrokerage}</strong>. Each link is optimized for different recruiting angles.
          </div>

          {/* Landing Pages */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, color: T.m, letterSpacing: 1.5, marginBottom: 12 }}>LANDING PAGES</div>
            {landingPages.map((lp, i) => (
              <div key={i} className="landing-page-row" style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: T.d, borderRadius: 8, marginBottom: 8 }}>
                {/* Thumbnail preview */}
                <div style={{ width: 120, height: 80, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "#0a0e1a", display: "flex", flexDirection: "column" }}>
                  <div style={{ flex: 1, background: lp.gradient, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <span style={{ fontSize: 22 }}>{lp.icon}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: 0.5, textTransform: "uppercase" }}>{lp.label}</span>
                  </div>
                  <div style={{ height: 16, background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>rkrt.in/{lp.path}</span>
                  </div>
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.t }}>{lp.name}</div>
                  <div style={{ fontSize: 13, color: T.s }}>{lp.desc}</div>
                </div>
                {/* URL + Copy */}
                <div className="lp-actions" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 13, color: T.bl, fontFamily: "monospace", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={getPageUrl(lp.path)}>{getDisplayUrl(getPageUrl(lp.path))}</span>
                  <CopyButton text={getPageUrl(lp.path)} label="Copy" />
                  {isAdmin && (() => { const posted = fbPosts.some(p => p.page_slug === lp.path && p.target_brokerage === selectedBrokerage); return posted ? <span style={{ padding: "6px 12px", fontSize: 11, color: "#22C55E", fontWeight: 700, whiteSpace: "nowrap" }}>✅ Posted</span> : <div onClick={async () => { try { const res = await fetch(`${SUPABASE_URL}/functions/v1/post-to-facebook?mode=link&url=${encodeURIComponent(getPageUrl(lp.path))}&title=${encodeURIComponent(lp.fbTitle || lp.name)}&message=${encodeURIComponent(selectedBrokerage ? `Are you leaving money on the table at ${selectedBrokerage}? Find out now.` : 'Are you leaving money on the table at your brokerage? Find out now.')}&user_id=${userId}`); const d = await res.json(); if (d.success) { await supabase.from('user_fb_posts').insert({ user_id: userId, post_type: 'recruiting_link', page_name: lp.name, page_slug: lp.path, target_brokerage: selectedBrokerage, link_url: getPageUrl(lp.path), fb_results: d.results, pages_posted: d.results?.filter(r => r.status === 'posted').map(r => r.page) || [] }); setFbPosts(prev => [...prev, { page_slug: lp.path, target_brokerage: selectedBrokerage, created_at: new Date().toISOString() }]); showToast('Posted to ' + (d.results?.length || 2) + ' FB pages!'); } else { showToast('Error: ' + (d.error || 'Unknown')); } } catch (e) { showToast('Error: ' + e.message); } }} style={{ padding: "6px 12px", borderRadius: 6, background: "transparent", color: "#1877F2", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid #1877F240", whiteSpace: "nowrap" }}>📘 Post to FB</div>; })()}
                  {isAdmin && <div onClick={() => setBoostItem({ id: null, headline: lp.name, image_url: null, _boostUrl: getPageUrl(lp.path) })} style={{ padding: "6px 12px", borderRadius: 6, background: "transparent", color: "#F59E0B", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid #F59E0B40", whiteSpace: "nowrap" }}>Boost</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Blog Link */}
          <div>
            <div style={{ fontSize: 14, color: T.m, letterSpacing: 1.5, marginBottom: 12 }}>YOUR BROKERAGE BLOG</div>
            <div className="blog-link-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: T.d, borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.t }}>{userBrokerage} Blog</div>
                <div style={{ fontSize: 13, color: T.s }}>AI-generated recruiting articles for your brokerage</div>
              </div>
              <div className="blog-link-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: T.bl, fontFamily: "monospace", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={userBlogUrl}>{getDisplayUrl(userBlogUrl)}</span>
                <CopyButton text={userBlogUrl} label="Copy" />
                <a href={userBlogUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 14px", borderRadius: 6, background: T.bl + "15", color: T.bl, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>View →</a>
              </div>
            </div>
          </div>
          </>)}
        </div>
      )}

      {/* Daily Content Tab */}
      {contentTab === "daily" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

          {/* ━━━ ROW 1: Social Posts ━━━ */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginRight: 8 }}>📱 Social Posts</div>
                {['all', 'facebook', 'instagram'].map(p => (
                  <div key={p} onClick={() => setPlatformFilter(p)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: platformFilter === p ? "1px solid #22C55E" : `1px solid ${T.b}`, background: platformFilter === p ? "rgba(34,197,94,0.1)" : "transparent", color: platformFilter === p ? "#22C55E" : T.m }}>
                    {p === 'all' ? 'All' : p === 'facebook' ? '📘 Facebook' : '📸 Instagram'}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div onClick={() => { const d = new Date(contentDate + 'T12:00:00'); d.setDate(d.getDate() - 1); setContentDate(d.toISOString().split('T')[0]); }} style={{ background: "transparent", border: `1px solid ${T.b}`, color: T.m, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>←</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.t, minWidth: 120, textAlign: "center" }}>
                  {new Date(contentDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
                <div onClick={() => { const d = new Date(contentDate + 'T12:00:00'); d.setDate(d.getDate() + 1); setContentDate(d.toISOString().split('T')[0]); }} style={{ background: "transparent", border: `1px solid ${T.b}`, color: T.m, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>→</div>
                <div onClick={() => setContentDate(new Date().toISOString().split('T')[0])} style={{ background: "transparent", border: "1px solid #22C55E", color: "#22C55E", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Today</div>
              </div>
            </div>

            {(() => {
              const filtered = dailyContent.filter(p => platformFilter === 'all' || p.platform === platformFilter);
              if (loading) return <div style={{ textAlign: "center", padding: "40px", color: T.m, background: T.card, borderRadius: 12, border: `1px solid ${T.b}` }}>Loading...</div>;
              return (
              <div className="daily-content-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {(filtered.length > 0 ? filtered : [null, null, null]).map((item, i) => {
                  if (!item) {
                    return (
                      <div key={i} style={{ background: T.card, borderRadius: 10, border: `2px dashed ${T.b}`, borderLeft: `4px solid ${T.b}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", minHeight: 280 }}>
                        <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>📝</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.m }}>Post {i + 1}</div>
                        <div style={{ fontSize: 12, color: T.m, opacity: 0.6, marginTop: 4 }}>No content yet</div>
                      </div>
                    );
                  }
                  const color = themeColor(item.theme);
                  const content = buildContent(item);
                  const hashtags = formatHashtags(item.hashtags);
                  return (
                    <div key={item.id || i} style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.b}`, borderLeft: `4px solid ${color}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                      <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: T.t }}>Post {i + 1}</span>
                          {item.theme && (
                            <span style={{ padding: "3px 10px", borderRadius: 20, background: color + "18", color: color, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>
                              {item.theme.replace(/_/g, ' ')}
                            </span>
                          )}
                          {item.is_posted ? (
                            <span onClick={() => setFbDetailId(fbDetailId === item.id ? null : item.id)} style={{ padding: "3px 10px", borderRadius: 20, background: T.a + "18", color: T.a, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                              Posted to FB · {ago(item.posted_at)}
                            </span>
                          ) : (
                            <span style={{ padding: "3px 10px", borderRadius: 20, background: T.m + "18", color: T.m, fontSize: 11, fontWeight: 600 }}>Not posted</span>
                          )}
                        </div>
                        {/* FB post details */}
                        {fbDetailId === item.id && item.engagement?.fb_results && (
                          <div style={{ background: T.d, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12 }}>
                            {item.engagement.fb_results.map((r, ri) => (
                              <div key={ri} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", color: r.status === "posted" ? T.a : T.r }}>
                                <span style={{ fontWeight: 600 }}>{r.page}</span>
                                <span style={{ fontSize: 11, color: T.m }}>{r.status === "posted" ? "Posted" : r.status}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Image (above content, like a social media preview) */}
                        {item.image_url && (
                          <div style={{ marginBottom: 12, marginLeft: -20, marginRight: -20 }}>
                            <img src={item.image_url} alt={item.theme} style={{ width: "100%", borderRadius: 8, objectFit: "cover", maxHeight: 280, display: "block" }} />
                          </div>
                        )}

                        {/* Content */}
                        <div style={{ fontSize: 13, color: T.t, lineHeight: 1.7, whiteSpace: "pre-wrap", flex: 1, marginBottom: 12, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 10, WebkitBoxOrient: "vertical" }}>
                          {content}
                        </div>

                        {/* Hashtags */}
                        {hashtags && (
                          <div style={{ fontSize: 12, color: T.bl, marginBottom: 12 }}>{hashtags}</div>
                        )}

                        {/* Action buttons */}
                        <div className="content-action-btns" style={{ marginTop: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <CopyButton text={(() => { const shareUrl = `https://rkrt.in/share?id=${item.id}&ref=${userId || ''}`; const withShare = content.replace(/https:\/\/rkrt\.in\/[^\s)]+/g, shareUrl); const final = withShare.includes(shareUrl) ? withShare : withShare + '\n\n' + shareUrl; return final + (hashtags ? '\n\n' + hashtags : ''); })()} label="Copy Post" style={{ padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, flex: 1, textAlign: "center" }} />
                          {item.image_url && (
                            <div onClick={() => downloadImage(item.image_url, `rkrt-post-${item.content_date || new Date().toISOString().split('T')[0]}.png`)} style={{ padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, flex: 1, textAlign: "center", background: T.bl + "18", color: T.bl, border: `1px solid ${T.bl}40`, cursor: "pointer" }}>
                              ⬇ Download Image
                            </div>
                          )}
                          {item.platform === 'facebook' && !item.is_posted && isAdmin && (
                            <div onClick={() => postingToFb !== item.id && postToFacebook(item)} style={{ padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, flex: 1, textAlign: "center", background: postingToFb === item.id ? T.m + "18" : "#1877F218", color: postingToFb === item.id ? T.m : "#1877F2", border: `1px solid ${postingToFb === item.id ? T.m : "#1877F2"}40`, cursor: postingToFb === item.id ? "wait" : "pointer" }}>
                              {postingToFb === item.id ? "Posting..." : "Post to FB"}
                            </div>
                          )}
                          {item.is_posted && isAdmin && (
                            <div onClick={() => setBoostItem(item)} style={{ padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, flex: 1, textAlign: "center", background: "#F9731818", color: "#F97318", border: "1px solid #F9731840", cursor: "pointer" }}>
                              Boost
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              );
            })()}

            {/* Platform pills */}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {["Facebook", "Instagram", "LinkedIn", "X"].map(p => (
                <div key={p} style={{ padding: "5px 12px", borderRadius: 20, background: T.d, border: `1px solid ${T.b}`, fontSize: 11, fontWeight: 600, color: T.m, display: "flex", alignItems: "center", gap: 6 }}>
                  {p} <span style={{ fontSize: 10, opacity: 0.5 }}>Soon</span>
                </div>
              ))}
            </div>
          </div>

          {/* ━━━ ROW 2: Video Content (2-column, natural aspect ratios) ━━━ */}
          <div className="video-row" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, alignItems: "start" }}>

            {/* Left: Reel / Short (9:16 portrait) */}
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 14 }}>🎬 Reel / Short</div>
              <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.b}`, overflow: "hidden" }}>
                {/* 9:16 cinematic preview */}
                <div style={{ position: "relative", width: "100%", paddingBottom: "177.78%", background: "linear-gradient(160deg, #0a0e1a 0%, #1a1040 35%, #0d2847 65%, #0a0e1a 100%)", borderBottom: `1px solid ${T.b}` }}>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                    {/* Coming Soon badge */}
                    <div style={{ position: "absolute", top: 14, right: 14, padding: "4px 12px", borderRadius: 20, background: "rgba(245,158,11,0.15)", backdropFilter: "blur(8px)", color: "#F59E0B", fontSize: 11, fontWeight: 700 }}>Coming Soon</div>
                    {/* Play button */}
                    <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
                      <span style={{ fontSize: 28, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>▶</span>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 0.5 }}>AI-Generated Reel</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Powered by HeyGen</span>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ padding: "16px" }}>
                  {/* Platform pills */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {["IG Reels", "FB Reels", "YT Shorts", "TikTok"].map(p => (
                      <div key={p} style={{ padding: "4px 10px", borderRadius: 20, background: T.d, border: `1px solid ${T.b}`, fontSize: 11, fontWeight: 600, color: T.m }}>{p}</div>
                    ))}
                  </div>
                  {/* Buttons */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: T.d, color: T.m, fontSize: 12, fontWeight: 700, textAlign: "center", opacity: 0.4, cursor: "not-allowed" }}>Generate Reel</div>
                    <div style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: T.d, color: T.m, fontSize: 12, fontWeight: 700, textAlign: "center", opacity: 0.4, cursor: "not-allowed" }}>Download</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Long-Form Video (16:9 landscape) */}
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 14 }}>🎥 Long-Form Video</div>
              <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.b}`, overflow: "hidden" }}>
                {/* 16:9 cinematic preview */}
                <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", background: "linear-gradient(135deg, #0a0e1a 0%, #1a0a2e 30%, #2d1a0a 60%, #0a0e1a 100%)", borderBottom: `1px solid ${T.b}` }}>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                    {/* Coming Soon badge */}
                    <div style={{ position: "absolute", top: 14, right: 14, padding: "4px 12px", borderRadius: 20, background: "rgba(245,158,11,0.15)", backdropFilter: "blur(8px)", color: "#F59E0B", fontSize: 11, fontWeight: 700 }}>Coming Soon</div>
                    {/* Play button */}
                    <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
                      <span style={{ fontSize: 32, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>▶</span>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 0.5 }}>AI-Generated Episode</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Full-length recruiting content for YouTube</span>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ padding: "16px 20px" }}>
                  {/* Platform pill */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                    <div style={{ padding: "4px 10px", borderRadius: 20, background: T.d, border: `1px solid ${T.b}`, fontSize: 11, fontWeight: 600, color: T.m }}>YouTube</div>
                  </div>
                  {/* Buttons */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ padding: "10px 20px", borderRadius: 8, background: T.d, color: T.m, fontSize: 12, fontWeight: 700, opacity: 0.4, cursor: "not-allowed" }}>Post to YouTube</div>
                    <div style={{ padding: "10px 20px", borderRadius: 8, background: T.d, color: T.m, fontSize: 12, fontWeight: 700, opacity: 0.4, cursor: "not-allowed" }}>Download</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Responsive: stack on mobile */}
          <style>{`@media (max-width: 768px) { .video-row { grid-template-columns: 1fr !important; } }`}</style>
        </div>
      )}

      {/* Recruiting Pages Tab */}
      {contentTab === "pages" && (() => {
        if (recruitingPages.length === 0 && !rpLoading) {
          setRpLoading(true);
          supabase.from('recruiting_pages').select('*').eq('user_id', userId).order('created_at', { ascending: false }).then(({ data }) => { setRecruitingPages(data || []); setRpLoading(false); });
        }
        return (
          <div>
            {rpLoading ? (
              <div style={{ textAlign: "center", padding: "60px", color: T.m, background: T.card, borderRadius: 12, border: `1px solid ${T.b}` }}>Loading recruiting pages...</div>
            ) : recruitingPages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: T.m, background: T.card, borderRadius: 12, border: `1px solid ${T.b}` }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.t, marginBottom: 8 }}>No recruiting pages yet</div>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>Pages are auto-generated weekly for paid plans. Upgrade to get personalized recruiting pages targeting specific brokerages in your market.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {recruitingPages.map(page => {
                  const slug = page.slug?.startsWith('r/') ? page.slug : `r/${page.slug}`;
                  return (
                    <div key={page.id} style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      {page.image_url ? <img src={page.image_url} alt="" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} /> : (
                        <div style={{ width: "100%", height: 160, background: "linear-gradient(135deg, #1a1a2e, #16213e)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 40, opacity: 0.3 }}>📄</span>
                        </div>
                      )}
                      <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                          {page.target_brokerage && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: T.a + "18", color: T.a, letterSpacing: 0.5 }}>{page.target_brokerage}</span>}
                          {page.target_market && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: T.bl + "18", color: T.bl }}>{page.target_market}</span>}
                          {page.is_active === false && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: T.m + "18", color: T.m }}>Inactive</span>}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.t, marginBottom: 8, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{page.title || "Recruiting Page"}</div>
                        <div style={{ display: "flex", gap: 16, fontSize: 12, color: T.m, marginBottom: 12 }}>
                          <span>{page.view_count || 0} views</span>
                          <span>{page.lead_count || 0} leads</span>
                        </div>
                        <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
                          <a href={`https://rkrt.in/${slug}`} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: "center", padding: "8px 12px", borderRadius: 8, background: T.a + "15", border: `1px solid ${T.a}30`, color: T.a, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>View Page</a>
                          {isAdmin && <div onClick={async () => { try { const res = await fetch(`${SUPABASE_URL}/functions/v1/post-to-facebook?mode=link&url=${encodeURIComponent('https://rkrt.in/' + slug)}&title=${encodeURIComponent(page.title || 'Recruiting Page')}&message=${encodeURIComponent(page.target_brokerage ? `Thinking about leaving ${page.target_brokerage}? See what LPT Realty offers.` : 'See what switching to LPT Realty means for your income.')}&user_id=${userId}`); const d = await res.json(); if (d.success) showToast('Posted to FB!'); else showToast('Error: ' + (d.error || 'Unknown')); } catch (e) { showToast('Error: ' + e.message); } }} style={{ padding: "8px 12px", borderRadius: 8, background: "#1877F218", border: "1px solid #1877F240", color: "#1877F2", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Post to FB</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Team Blog Tab */}
      {contentTab === "team_blog" && isTeamLeader && (
        <div>
          <style>{`
            .blog-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
            @media (max-width: 900px) { .blog-grid { grid-template-columns: repeat(2, 1fr) !important; } }
            @media (max-width: 600px) { .blog-grid { grid-template-columns: 1fr !important; } }
          `}</style>

          {/* Toast */}
          {postToast && (
            <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", background: T.a, color: "#000", padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>{postToast}</div>
          )}

          {/* Header */}
          <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "20px 24px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.t }}>👥 Team Blog</div>
              {teamSlug && <div style={{ fontSize: 13, color: T.s, marginTop: 4 }}>Published at <a href={`https://rkrt.in/${teamSlug}`} target="_blank" rel="noopener noreferrer" style={{ color: T.bl, textDecoration: "none", fontFamily: "monospace" }}>rkrt.in/{teamSlug}</a></div>}
            </div>
            <div onClick={() => { resetPostModal(); setShowWritePost(true); }} style={{ padding: "10px 20px", borderRadius: 8, background: T.a, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>✍️ Write Post</div>
          </div>

          {/* Approval tabs */}
          {(() => {
            const needsApproval = teamPosts.filter(p => p.status === 'pending' || p.status === 'draft');
            const published = teamPosts.filter(p => p.status === 'published');
            const declined = teamPosts.filter(p => p.status === 'declined');
            const tabPosts = blogTab === "needs_approval" ? needsApproval : blogTab === "published" ? published : declined;
            const statusColor = { published: T.a, pending: "#F59E0B", draft: "#F59E0B", declined: "#F85149" };
            const statusLabel = { published: "Published", pending: "Pending", draft: "Draft", declined: "Declined" };
            return (<>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {[
                  { id: "needs_approval", label: "📝 Needs Approval", count: needsApproval.length },
                  { id: "published", label: "✅ Published", count: published.length },
                  { id: "declined", label: "❌ Declined", count: declined.length },
                ].map(tab => (
                  <div key={tab.id} onClick={() => setBlogTab(tab.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 20, background: blogTab === tab.id ? T.a + "18" : T.card, border: `1px solid ${blogTab === tab.id ? T.a + "40" : T.b}`, color: blogTab === tab.id ? T.a : T.s, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {tab.label}
                    <span style={{ padding: "2px 7px", borderRadius: 10, background: blogTab === tab.id ? T.a + "30" : T.d, fontSize: 11, fontWeight: 800 }}>{tab.count}</span>
                  </div>
                ))}
              </div>

              {tabPosts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: T.m, background: T.card, borderRadius: 12, border: `1px solid ${T.b}` }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
                  <div>{blogTab === "needs_approval" ? "No posts pending approval" : blogTab === "published" ? "No published posts yet" : "No declined posts"}</div>
                </div>
              ) : (
                <div className="blog-grid">
                  {tabPosts.map((post) => (
                    <div key={post.id} style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      {/* Image */}
                      {post.image_url
                        ? <img src={post.image_url} alt="" style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
                        : <div style={{ width: "100%", height: 180, background: "linear-gradient(135deg, #1a1a2e, #16213e)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.4 }}>{post.title}</div>
                            </div>
                          </div>
                      }
                      {/* Body */}
                      <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.t, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{post.title}</div>
                        {post.excerpt && <div style={{ fontSize: 13, color: T.s, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.5 }}>{post.excerpt}</div>}
                        {post.status === "declined" && post.decline_reason && (
                          <div style={{ fontSize: 12, color: "#F85149", marginTop: 4, fontStyle: "italic" }}>"{post.decline_reason}"</div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 8 }}>
                          <div style={{ fontSize: 11, color: T.m }}>{new Date(post.created_at).toLocaleDateString()}</div>
                          <span style={{ padding: "3px 8px", borderRadius: 6, background: (statusColor[post.status] || T.m) + "18", color: statusColor[post.status] || T.m, fontSize: 11, fontWeight: 700 }}>{statusLabel[post.status] || post.status}</span>
                        </div>
                      </div>
                      {/* Actions */}
                      <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.b}`, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {blogTab === "needs_approval" && isAdmin && (<>
                          <div onClick={() => approvePost(post)} style={{ padding: "6px 12px", borderRadius: 6, background: T.a + "18", color: T.a, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✅ Approve</div>
                          <div onClick={() => openEditPost(post)} style={{ padding: "6px 12px", borderRadius: 6, background: T.bl + "18", color: T.bl, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✏️ Edit</div>
                          <div onClick={() => openDecline(post)} style={{ padding: "6px 12px", borderRadius: 6, background: "#F8514918", color: "#F85149", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>❌ Decline</div>
                        </>)}
                        {blogTab === "published" && (<>
                          {teamSlug && <a href={`https://rkrt.in/${teamSlug}/${post.slug}`} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 12px", borderRadius: 6, background: T.bl + "18", color: T.bl, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>👁️ View</a>}
                          {!post.is_posted_fb && isAdmin && (
                            <div onClick={async () => { try { const res = await fetch(`https://usknntguurefeyzusbdh.supabase.co/functions/v1/post-to-facebook?mode=post&id=${post.id}&source=team&user_id=${userId}`); const d = await res.json(); if (d.success || !d.error) { setTeamPosts(prev => prev.map(x => x.id === post.id ? { ...x, is_posted_fb: true, posted_fb_at: new Date().toISOString() } : x)); supabase.from('user_fb_posts').insert({ user_id: userId, post_type: 'team_post', content_id: post.id, page_name: post.title, fb_results: d.results, pages_posted: d.results?.filter(r => r.status === 'posted').map(r => r.page) || [] }).then(() => {}); showToast("Posted to FB!"); } else { showToast("Error: " + (d.error || "Unknown")); } } catch (e) { showToast("Error: " + e.message); } }} style={{ padding: "6px 12px", borderRadius: 6, background: "transparent", color: "#22C55E", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid #22C55E" }}>📘 Post to FB</div>
                          )}
                          {post.is_posted_fb && <span style={{ padding: "6px 12px", fontSize: 11, color: "#22C55E", fontWeight: 700 }}>✅ Posted to FB</span>}
                          {post.is_posted_fb && isAdmin && (
                            <div onClick={() => setBoostItem(post)} style={{ padding: "6px 12px", borderRadius: 6, background: "transparent", color: "#F59E0B", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid #F59E0B" }}>Boost</div>
                          )}
                          <div onClick={() => openEditPost(post)} style={{ padding: "6px 12px", borderRadius: 6, background: T.d, color: T.s, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✏️ Edit</div>
                          <div onClick={() => unpublishPost(post)} style={{ padding: "6px 12px", borderRadius: 6, background: T.d, color: T.m, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🗑️ Unpublish</div>
                        </>)}
                        {blogTab === "declined" && (<>
                          <div onClick={() => openEditPost(post)} style={{ padding: "6px 12px", borderRadius: 6, background: T.bl + "18", color: T.bl, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✏️ Edit & Resubmit</div>
                          <div onClick={() => deletePost(post)} style={{ padding: "6px 12px", borderRadius: 6, background: "#F8514918", color: "#F85149", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🗑️ Delete</div>
                        </>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>);
          })()}

          {/* Decline Modal */}
          {declineOpen && (
            <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "100%", maxWidth: 420, background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.t, marginBottom: 16 }}>Decline Post</div>
                <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} rows={3} placeholder="Reason for declining (optional)..." style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: T.d, border: `1px solid ${T.b}`, color: T.t, fontSize: 14, fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box" }} />
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                  <div onClick={() => setDeclineOpen(false)} style={{ padding: "10px 18px", borderRadius: 8, background: T.d, color: T.s, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</div>
                  <div onClick={submitDecline} style={{ padding: "10px 18px", borderRadius: 8, background: "#F85149", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Decline Post</div>
                </div>
              </div>
            </div>
          )}

          {/* Write Post Modal */}
          {showWritePost && (
            <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
              <div style={{ width: "100%", maxWidth: 700, maxHeight: "90vh", background: T.card, border: `1px solid ${T.b}`, borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.b}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: T.t }}>{editingPost ? "✏️ Edit Post" : "✨ Write Post with Rue"}</div>
                    <div style={{ fontSize: 12, color: T.m, marginTop: 2 }}>{editingPost ? "Update title, excerpt, or content then save" : postStep === "input" ? "Step 1 — Give Rue a subject and context" : "Step 2 — Review and edit Rue's draft"}</div>
                  </div>
                  <div onClick={resetPostModal} style={{ cursor: "pointer", color: T.m, fontSize: 18, padding: "4px 8px" }}>✕</div>
                </div>

                <div style={{ padding: 24, overflow: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* ── STEP 1: Input ── */}
                  {postStep === "input" && (<>
                    <div>
                      <div style={{ fontSize: 12, color: T.m, letterSpacing: 1.2, fontWeight: 700, marginBottom: 8 }}>WHAT'S THIS POST ABOUT? *</div>
                      <input
                        value={postSubject}
                        onChange={e => setPostSubject(e.target.value)}
                        placeholder="e.g. Why top agents are leaving big brokerages in 2025"
                        style={{ width: "100%", padding: "14px 16px", borderRadius: 8, background: T.d, border: `1px solid ${postSubject.trim() ? T.a + "40" : T.b}`, color: T.t, fontSize: 18, fontWeight: 700, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: T.m, letterSpacing: 1.2, fontWeight: 700, marginBottom: 8 }}>CONTEXT FOR RUE</div>
                      <textarea
                        value={postContext}
                        onChange={e => setPostContext(e.target.value)}
                        rows={4}
                        placeholder="Give Rue some context — key points, stats, stories, tone, what makes your team special..."
                        style={{ width: "100%", padding: "12px 14px", borderRadius: 8, background: T.d, border: `1px solid ${T.b}`, color: T.t, fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.6 }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: T.m, letterSpacing: 1.2, fontWeight: 700, marginBottom: 8 }}>FEATURED IMAGE (optional)</div>
                      {imageUrl ? (
                        <div style={{ position: "relative", display: "inline-block" }}>
                          <img src={imageUrl} alt="Featured" style={{ maxHeight: 160, borderRadius: 8, border: `1px solid ${T.b}`, display: "block" }} />
                          <div onClick={() => setImageUrl(null)} style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>✕</div>
                        </div>
                      ) : (
                        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "24px", borderRadius: 8, border: `2px dashed ${T.b}`, cursor: "pointer", color: T.m }}>
                          {imageUploading ? <span style={{ fontSize: 13 }}>Uploading...</span> : (<><span style={{ fontSize: 24 }}>📷</span><span style={{ fontSize: 13, fontWeight: 600 }}>Upload Image</span></>)}
                          <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                        </label>
                      )}
                    </div>
                    <div
                      onClick={() => postSubject.trim() && draftWithRue()}
                      style={{ padding: "16px", borderRadius: 10, background: postSubject.trim() ? T.a : "#333", color: postSubject.trim() ? "#000" : T.m, fontSize: 16, fontWeight: 800, textAlign: "center", cursor: postSubject.trim() ? "pointer" : "default", letterSpacing: 0.3 }}
                    >
                      ✨ Draft with Rue
                    </div>
                  </>)}

                  {/* ── STEP 2: Review/Edit ── */}
                  {postStep === "review" && (<>
                    {rueDrafting && (
                      <div style={{ textAlign: "center", padding: "40px 20px", color: T.a }}>
                        <div style={{ fontSize: 32, marginBottom: 12, animation: "glowPulse 1.5s ease-in-out infinite" }}>✨</div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>Rue is writing your post...</div>
                        <div style={{ fontSize: 13, color: T.m, marginTop: 6 }}>This usually takes 10-20 seconds</div>
                      </div>
                    )}
                    {!rueDrafting && (<>
                      <div>
                        <div style={{ fontSize: 12, color: T.m, letterSpacing: 1.2, fontWeight: 700, marginBottom: 8 }}>TITLE</div>
                        <input
                          value={postTitle}
                          onChange={e => setPostTitle(e.target.value)}
                          style={{ width: "100%", padding: "12px 14px", borderRadius: 8, background: T.d, border: `1px solid ${T.b}`, color: T.t, fontSize: 16, fontWeight: 700, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: T.m, letterSpacing: 1.2, fontWeight: 700, marginBottom: 8 }}>EXCERPT</div>
                        <textarea
                          value={postExcerpt}
                          onChange={e => setPostExcerpt(e.target.value)}
                          rows={2}
                          style={{ width: "100%", padding: "12px 14px", borderRadius: 8, background: T.d, border: `1px solid ${T.b}`, color: T.t, fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ fontSize: 12, color: T.m, letterSpacing: 1.2, fontWeight: 700 }}>CONTENT (Markdown)</div>
                          <div onClick={draftWithRue} style={{ fontSize: 12, fontWeight: 700, color: T.a, cursor: "pointer", padding: "4px 10px", borderRadius: 6, border: `1px solid ${T.a}30` }}>🔄 Regenerate</div>
                        </div>
                        <textarea
                          value={postContent}
                          onChange={e => setPostContent(e.target.value)}
                          rows={14}
                          style={{ width: "100%", padding: "12px 14px", borderRadius: 8, background: T.d, border: `1px solid ${T.b}`, color: T.t, fontSize: 13, fontFamily: "'SF Mono', monospace", resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.7, minHeight: 300 }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
                        <div onClick={() => setPostStep("input")} style={{ fontSize: 13, color: T.m, cursor: "pointer", padding: "4px 0" }}>← Back</div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <div onClick={() => !postSaving && publishTeamPost("draft")} style={{ padding: "12px 22px", borderRadius: 8, background: T.d, border: `1px solid ${T.b}`, color: T.s, fontSize: 14, fontWeight: 700, cursor: postSaving ? "default" : "pointer" }}>Save Draft</div>
                          <div onClick={() => !postSaving && postTitle.trim() && publishTeamPost("published")} style={{ padding: "12px 22px", borderRadius: 8, background: postTitle.trim() && !postSaving ? T.a : "#333", color: postTitle.trim() && !postSaving ? "#000" : T.m, fontSize: 14, fontWeight: 700, cursor: postTitle.trim() && !postSaving ? "pointer" : "default" }}>
                            {postSaving ? "Saving..." : editingPost ? "Update" : isAdmin ? "Publish" : "Submit for Approval"}
                          </div>
                        </div>
                      </div>
                    </>)}
                  </>)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Boost Modal */}
      {boostItem && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setBoostItem(null)}>
          <div style={{ width: "100%", maxWidth: 500, background: T.card, border: `1px solid ${T.b}`, borderRadius: 16, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.t }}>Boost Post</div>
              <div onClick={() => setBoostItem(null)} style={{ cursor: "pointer", color: T.m, fontSize: 18 }}>✕</div>
            </div>

            {/* Preview */}
            <div style={{ display: "flex", gap: 12, padding: 14, background: T.d, borderRadius: 10, marginBottom: 20 }}>
              {boostItem.image_url && <img src={boostItem.image_url} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover" }} />}
              <div style={{ fontSize: 13, color: T.t, fontWeight: 600, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{boostItem.headline || boostItem.body?.substring(0, 100)}</div>
            </div>

            {/* Audience */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>TARGET AUDIENCE</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(boostAudiences.length > 0 ? boostAudiences : [
                  { audience_type: "competing_agents", label: "Competing Agents" },
                  { audience_type: "new_agents", label: "New Agents" },
                  { audience_type: "team_builders", label: "Team Builders" },
                ]).map(a => (
                  <div key={a.audience_type} onClick={() => setBoostAudience(a.audience_type)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: boostAudience === a.audience_type ? T.a + "18" : T.d, color: boostAudience === a.audience_type ? T.a : T.s, border: `1px solid ${boostAudience === a.audience_type ? T.a + "40" : T.b}` }}>
                    {a.label || a.audience_type.replace(/_/g, ' ')}
                  </div>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>BUDGET</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[{ amount: 2500, label: "$25", days: "3 days" }, { amount: 5000, label: "$50", days: "5 days" }, { amount: 10000, label: "$100", days: "7 days" }, { amount: 25000, label: "$250", days: "14 days" }].map(b => (
                  <div key={b.amount} onClick={() => setBoostBudget(b.amount)} style={{ padding: "12px 16px", borderRadius: 8, cursor: "pointer", background: boostBudget === b.amount ? T.a + "18" : T.d, border: `1px solid ${boostBudget === b.amount ? T.a + "40" : T.b}`, textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: boostBudget === b.amount ? T.a : T.t }}>{b.label}</div>
                    <div style={{ fontSize: 11, color: T.m }}>{b.days}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Targeting */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>TARGET ZIP</div>
                <input value={boostZip} onChange={e => setBoostZip(e.target.value)} placeholder="e.g. 33139" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: T.d, border: `1px solid ${T.b}`, color: T.t, fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>RADIUS</div>
                <select value={boostRadius} onChange={e => setBoostRadius(Number(e.target.value))} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: T.d, border: `1px solid ${T.b}`, color: T.t, fontSize: 14, outline: "none", fontFamily: "inherit" }}>
                  <option value={10}>10 miles</option>
                  <option value={25}>25 miles</option>
                  <option value={50}>50 miles</option>
                </select>
              </div>
            </div>

            {/* Submit */}
            <div style={{ position: "relative" }}>
              <div onClick={submitBoost} style={{ padding: "14px", borderRadius: 10, background: boostSubmitting ? T.m : "#F97318", color: "#fff", fontSize: 15, fontWeight: 700, cursor: boostSubmitting ? "wait" : "pointer", textAlign: "center", opacity: 0.5 }}>
                {boostSubmitting ? "Submitting..." : "Boost This Post — Coming Soon"}
              </div>
              <div style={{ fontSize: 11, color: T.m, textAlign: "center", marginTop: 8 }}>Meta Ads integration coming soon. Request will be saved.</div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {postToast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "12px 24px", borderRadius: 10, background: postToast.startsWith("Error") ? "#F85149" : T.a, color: postToast.startsWith("Error") ? "#fff" : "#000", fontSize: 14, fontWeight: 700, zIndex: 10000, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
          {postToast}
        </div>
      )}
    </div>
  );
}
