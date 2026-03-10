// RKRT.in Content Tab
// Daily content, recruiting links, and blog management

import { useState, useEffect } from 'react';
import T from '../../lib/theme';
import { BROKERAGES, TARGET_BROKERAGES } from '../../lib/constants';
import { supabase, logActivity } from '../../lib/supabase';
import { CopyButton } from '../../components/ui/CopyButton';

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
        <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "28px" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 20 }}>📅 Daily Social Content</div>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: T.m }}>Loading...</div>
          ) : dailyContent.length > 0 ? (
            <div style={{ display: "grid", gap: 16 }}>
              {dailyContent.map((item, i) => (
                <div key={i} style={{ padding: "20px", background: T.d, borderRadius: 10, border: `1px solid ${T.b}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{item.platform === "facebook" ? "📘" : item.platform === "instagram" ? "📸" : "📱"}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: T.t, textTransform: "capitalize" }}>{item.platform}</span>
                      <span style={{ fontSize: 12, color: T.m }}>• {item.theme && `[${item.theme}]`} • {new Date(item.content_date).toLocaleDateString()}</span>
                    </div>
                    <CopyButton text={buildContent(item)} label="Copy" />
                  </div>
                  <div style={{ fontSize: 14, color: T.t, lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 12 }}>{buildContent(item)}</div>
                  {formatHashtags(item.hashtags) && (
                    <div style={{ marginTop: 8, fontSize: 13, color: T.bl }}>{formatHashtags(item.hashtags)}</div>
                  )}
                  {item.image_url && (
                    <div style={{ marginTop: 12 }}>
                      <img src={item.image_url} alt={item.theme} style={{ maxWidth: "100%", height: "auto", borderRadius: 8, maxHeight: 300 }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 20px", color: T.m }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📅</div>
              <div>No daily content yet. Content is generated automatically each morning.</div>
            </div>
          )}
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
