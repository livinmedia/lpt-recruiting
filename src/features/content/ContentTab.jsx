// RKRT.in Content Tab
// Daily content, recruiting links, and blog management

import { useState, useEffect } from 'react';
import T from '../../lib/theme';
import { BROKERAGES, TARGET_BROKERAGES } from '../../lib/constants';
import { supabase, logActivity } from '../../lib/supabase';
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
  const [blogPosts, setBlogPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBrokerage, setSelectedBrokerage] = useState(userProfile?.brokerage || "LPT Realty");

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const [contentRes, blogRes] = await Promise.all([
      supabase.from('daily_content').select('*').eq('content_date', today).order('created_at', { ascending: false }),
      supabase.from('brokerage_posts').select('*').eq('status', 'approved').order('created_at', { ascending: false }).limit(20),
    ]);
    let dailyData = contentRes.data || [];
    if (dailyData.length === 0) {
      const recentRes = await supabase.from('daily_content').select('*').order('content_date', { ascending: false }).limit(6);
      dailyData = recentRes.data || [];
    }
    setDailyContent(dailyData);
    setBlogPosts(blogRes.data || []);
    setLoading(false);
  };

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

  // Landing page URLs
  const landingPages = [
    { name: "Main Join Page", path: "join", desc: "Primary recruiting landing page" },
    { name: "Commission Calculator", path: "calculator", desc: "Interactive commission comparison tool" },
    { name: "New Agent Program", path: "new-agent", desc: "For newly licensed agents" },
    { name: "Revenue Share", path: "revenue-share", desc: "Passive income opportunity" },
    { name: "Why Switch", path: "why-switch", desc: "For agents considering a move" },
  ];

  const getBaseUrl = () => {
    const brokSlug = selectedBrokerage.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    return `https://rkrt.in`;
  };

  const getBlogUrl = () => {
    const brokSlug = selectedBrokerage.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    return `https://rkrt.in/blog/${brokSlug}`;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: T.t, marginBottom: 8 }}>Content Hub</div>
        <div style={{ fontSize: 14, color: T.s }}>Recruiting content, landing pages, and daily posts</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[["links", "🔗 Recruiting Links"], ["daily", "📅 Daily Content"], ["blog", "📝 Blog Posts"]].map(([id, label]) => (
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.t }}>🎯 Recruiting Links</div>
            <select
              value={selectedBrokerage}
              onChange={e => setSelectedBrokerage(e.target.value)}
              style={{ padding: "10px 16px", borderRadius: 8, background: T.d, border: `1px solid ${T.b}`, color: T.t, fontSize: 14, fontFamily: "inherit" }}
            >
              {TARGET_BROKERAGES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div style={{ fontSize: 13, color: T.s, marginBottom: 20, padding: "12px 16px", background: T.d, borderRadius: 8 }}>
            Share these links to attract agents from <strong style={{ color: T.t }}>{selectedBrokerage}</strong>. Each link is optimized for different recruiting angles.
          </div>

          {/* Landing Pages */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, color: T.m, letterSpacing: 1.5, marginBottom: 12 }}>LANDING PAGES</div>
            {landingPages.map((lp, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: T.d, borderRadius: 8, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.t }}>{lp.name}</div>
                  <div style={{ fontSize: 13, color: T.s }}>{lp.desc}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, color: T.bl, fontFamily: "monospace" }}>{getBaseUrl()}/{lp.path}</span>
                  <CopyButton text={`${getBaseUrl()}/${lp.path}`} label="Copy" />
                </div>
              </div>
            ))}
          </div>

          {/* Blog Link */}
          <div>
            <div style={{ fontSize: 14, color: T.m, letterSpacing: 1.5, marginBottom: 12 }}>BROKERAGE BLOG</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: T.d, borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.t }}>{selectedBrokerage} Blog</div>
                <div style={{ fontSize: 13, color: T.s }}>AI-generated recruiting articles for {selectedBrokerage}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: T.bl, fontFamily: "monospace" }}>{getBlogUrl()}</span>
                <CopyButton text={getBlogUrl()} label="Copy" />
                <a href={getBlogUrl()} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 14px", borderRadius: 6, background: T.bl + "15", color: T.bl, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>View →</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Content Tab */}
      {contentTab === "daily" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

          {/* ━━━ ROW 1: Social Posts ━━━ */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.t }}>📱 Social Posts</div>
              {dailyContent.length > 0 && (
                <div style={{ fontSize: 12, color: T.m }}>{new Date(dailyContent[0].content_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: T.m, background: T.card, borderRadius: 12, border: `1px solid ${T.b}` }}>Loading...</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {[0, 1, 2].map(i => {
                  const item = dailyContent[i];
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
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: T.t }}>Post {i + 1}</span>
                          {item.theme && (
                            <span style={{ padding: "3px 10px", borderRadius: 20, background: color + "18", color: color, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>
                              {item.theme.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>

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

                        {/* Copy button */}
                        <div style={{ marginTop: "auto" }}>
                          <CopyButton text={content + (hashtags ? '\n\n' + hashtags : '') + (item.image_url ? '\n\n📸 Image: ' + item.image_url : '')} label="Copy Post" style={{ padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, width: "100%", textAlign: "center" }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

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

      {/* Blog Posts Tab */}
      {contentTab === "blog" && (
        <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "28px" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 20 }}>📝 Published Blog Posts</div>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: T.m }}>Loading...</div>
          ) : blogPosts.length > 0 ? (
            <div style={{ display: "grid", gap: 12 }}>
              {blogPosts.map((post, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: T.d, borderRadius: 10, border: `1px solid ${T.b}` }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: T.t }}>{post.title}</div>
                    <div style={{ fontSize: 13, color: T.s, marginTop: 4 }}>{post.brokerage} • {new Date(post.created_at).toLocaleDateString()}</div>
                  </div>
                  <a href={`https://rkrt.in/blog/${post.brokerage?.toLowerCase().replace(/[^a-z0-9]/g, '-')}/${post.slug}`} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 14px", borderRadius: 6, background: T.bl + "15", color: T.bl, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                    View →
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 20px", color: T.m }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📝</div>
              <div>No published blog posts yet.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
