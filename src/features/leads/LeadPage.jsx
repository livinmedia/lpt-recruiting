// RKRT.in Lead Page
// Individual lead detail view

import { useState, useEffect } from 'react';
import T from '../../lib/theme';
import { STAGES } from '../../lib/constants';
import { ago } from '../../lib/utils';
import { supabase, logActivity } from '../../lib/supabase';
import { Pill, UPill, TPill } from '../../components/ui/Pill';
import { CopyButton } from '../../components/ui/CopyButton';

export default function LeadPage({ lead, onBack, onAskInline, inlineResponse, inlineLoading, userId, onDelete, userProfile }) {
  const [tab, setTab] = useState("overview");
  const [notes, setNotes] = useState(lead.notes || "");
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (lead?.id) {
      loadTasks();
    }
  }, [lead?.id]);

  const loadTasks = async () => {
    const { data, error } = await supabase.from('lead_tasks').select('*').eq('lead_id', lead.id).order('created_at', { ascending: true });
    if (error) console.error('loadTasks error:', error);
    setTasks(data || []);
  };

  const saveNotes = async () => {
    setSaving(true);
    await supabase.from("leads").update({ notes }).eq("id", lead.id);
    logActivity(userId, 'update_lead_notes', { lead_id: lead.id });
    setSaving(false);
  };

  const updateStage = async (newStage) => {
    await supabase.from("leads").update({ pipeline_stage: newStage }).eq("id", lead.id);
    logActivity(userId, 'update_lead_stage', { lead_id: lead.id, stage: newStage });
    lead.pipeline_stage = newStage;
  };

  const completeTask = async (taskId) => {
    await supabase.from('lead_tasks').update({ completed_at: new Date().toISOString() }).eq('id', taskId);
    loadTasks();
  };

  const interestLevel = (score) => {
    if (score <= 20) return { label: "Cold", color: T.m, emoji: "🥶" };
    if (score <= 40) return { label: "Warming", color: T.bl, emoji: "🌡️" };
    if (score <= 60) return { label: "Interested", color: T.y, emoji: "👀" };
    if (score <= 80) return { label: "Hot", color: "#f97316", emoji: "🔥" };
    return { label: "On Fire", color: T.r, emoji: "🔥🔥" };
  };

  const interest = interestLevel(lead.interest_score || 0);

  // Rue prompts for this lead
  const ruePrompts = [
    ["🔍", "Research", `Research ${lead.first_name} ${lead.last_name} at ${lead.brokerage || "their brokerage"} in ${lead.market || "their market"}. Find production, reviews, social media, and give me an outreach angle.`],
    ["📱", "Draft Outreach", `Draft a personalized recruiting message to ${lead.first_name} ${lead.last_name}. They're at ${lead.brokerage || "unknown"} in ${lead.market || "unknown"}.${lead.outreach_angle ? " Angle: " + lead.outreach_angle : ""}`],
    ["🎯", "Objection Prep", `What objections might ${lead.first_name} ${lead.last_name} have about switching from ${lead.brokerage || "their brokerage"}? Give me responses for each.`],
    ["📋", "Meeting Prep", `Create a meeting prep sheet for ${lead.first_name} ${lead.last_name}. They're ${lead.tier || "unknown"} tier at ${lead.brokerage || "unknown"}. Include talking points and how to close.`],
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div onClick={onBack} style={{ fontSize: 14, color: T.s, cursor: "pointer", marginBottom: 8 }}>← Back to Pipeline</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.t }}>{lead.first_name} {lead.last_name}</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
            <TPill t={lead.tier} />
            <UPill u={lead.urgency} />
            <Pill text={lead.pipeline_stage?.replace(/_/g, " ") || "new"} color={STAGES.find(s => s.id === lead.pipeline_stage)?.c || T.s} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div onClick={() => setShowDeleteConfirm(true)} style={{ padding: "10px 16px", borderRadius: 8, background: T.r + "15", color: T.r, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>🗑️ Delete</div>
        </div>
      </div>

      {/* Rue Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        {ruePrompts.map(([icon, label, q], i) => (
          <div
            key={i}
            onClick={() => onAskInline(q)}
            style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 8, padding: "14px 16px", cursor: inlineLoading ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 10, opacity: inlineLoading ? 0.5 : 1 }}
            onMouseOver={e => e.currentTarget.style.borderColor = T.bh}
            onMouseOut={e => e.currentTarget.style.borderColor = T.b}
          >
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: T.t }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Inline Response */}
      {inlineLoading && (
        <div style={{ marginBottom: 20, padding: "16px 20px", borderRadius: 10, background: T.card, border: `1px solid ${T.b}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.a, animation: "pulse 1s infinite" }} />
            <span style={{ fontSize: 14, color: T.s }}>RUE is thinking...</span>
          </div>
        </div>
      )}

      {inlineResponse && !inlineLoading && (
        <div style={{ marginBottom: 20, padding: "20px 24px", borderRadius: 10, background: T.as, border: `1px solid ${T.a}20` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: T.a, fontWeight: 700 }}>🤖 RUE RESPONSE</span>
            <CopyButton text={inlineResponse} label="Copy" />
          </div>
          <pre style={{ fontSize: 14, color: T.t, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, maxHeight: 300, overflow: "auto" }}>{inlineResponse}</pre>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["overview", "tasks", "notes", "activity"].map(t => (
          <div key={t} onClick={() => setTab(t)} style={{ padding: "10px 18px", borderRadius: 8, background: tab === t ? T.a + "18" : T.card, color: tab === t ? T.a : T.s, fontSize: 14, fontWeight: 600, cursor: "pointer", border: `1px solid ${tab === t ? T.a + "40" : T.b}` }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        {/* Main Content */}
        <div>
          {tab === "overview" && (
            <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "24px" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 20 }}>Contact Info</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 4 }}>EMAIL</div>
                  <div style={{ fontSize: 15, color: lead.email ? T.bl : T.m }}>{lead.email || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 4 }}>PHONE</div>
                  <div style={{ fontSize: 15, color: T.t }}>{lead.phone || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 4 }}>MARKET</div>
                  <div style={{ fontSize: 15, color: T.t }}>{lead.market || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 4 }}>BROKERAGE</div>
                  <div style={{ fontSize: 15, color: lead.brokerage?.toLowerCase().includes("lpt") ? T.a : T.t }}>{lead.brokerage || "—"}</div>
                </div>
              </div>

              {lead.outreach_angle && (
                <div style={{ marginTop: 20, padding: "16px", borderRadius: 8, background: T.d }}>
                  <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 4 }}>OUTREACH ANGLE</div>
                  <div style={{ fontSize: 14, color: T.t, lineHeight: 1.6 }}>{lead.outreach_angle}</div>
                </div>
              )}

              {/* Stage Selector */}
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 11, color: T.m, letterSpacing: 1.5, marginBottom: 8 }}>PIPELINE STAGE</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {STAGES.map(s => (
                    <div
                      key={s.id}
                      onClick={() => updateStage(s.id)}
                      style={{ padding: "8px 14px", borderRadius: 6, background: lead.pipeline_stage === s.id ? s.c + "20" : T.d, border: `1px solid ${lead.pipeline_stage === s.id ? s.c : T.b}`, color: lead.pipeline_stage === s.id ? s.c : T.s, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      {s.l}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "tasks" && (
            <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "24px" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 20 }}>Tasks</div>
              {tasks.length > 0 ? tasks.map(task => (
                <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${T.b}` }}>
                  <div onClick={() => !task.completed_at && completeTask(task.id)} style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${task.completed_at ? T.a : T.m}`, background: task.completed_at ? T.a : "transparent", cursor: task.completed_at ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12 }}>
                    {task.completed_at && "✓"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, color: task.completed_at ? T.m : T.t, textDecoration: task.completed_at ? "line-through" : "none" }}>{task.title}</div>
                    <div style={{ fontSize: 12, color: T.m }}>{ago(task.due_date)}</div>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: "center", padding: "40px", color: T.m }}>No tasks yet</div>
              )}
            </div>
          )}

          {tab === "notes" && (
            <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "24px" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 16 }}>Notes</div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes about this lead..."
                style={{ width: "100%", minHeight: 200, padding: "16px", borderRadius: 8, background: T.d, border: `1px solid ${T.b}`, color: T.t, fontSize: 15, outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
              />
              <div onClick={saveNotes} style={{ marginTop: 12, padding: "12px 20px", borderRadius: 8, background: saving ? T.m : T.a, color: saving ? T.s : "#000", fontSize: 14, fontWeight: 700, cursor: saving ? "wait" : "pointer", textAlign: "center", width: "fit-content" }}>
                {saving ? "Saving..." : "Save Notes"}
              </div>
            </div>
          )}

          {tab === "activity" && (
            <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "24px" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 16 }}>Activity</div>
              <div style={{ textAlign: "center", padding: "40px", color: T.m }}>Activity log coming soon</div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          {/* Interest Score */}
          <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "20px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: T.m, letterSpacing: 1.5, marginBottom: 12 }}>INTEREST SCORE</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: interest.color }}>{lead.interest_score || 0}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: interest.color }}>{interest.emoji} {interest.label}</div>
                <div style={{ fontSize: 12, color: T.s }}>Based on engagement</div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ background: T.card, border: `1px solid ${T.b}`, borderRadius: 12, padding: "20px" }}>
            <div style={{ fontSize: 13, color: T.m, letterSpacing: 1.5, marginBottom: 12 }}>QUICK STATS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, color: T.s }}>Added</span>
                <span style={{ fontSize: 14, color: T.t }}>{ago(lead.created_at)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, color: T.s }}>Source</span>
                <span style={{ fontSize: 14, color: T.t }}>{lead.source || "Ad"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, color: T.s }}>License</span>
                <span style={{ fontSize: 14, color: T.t }}>{lead.license_number || "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowDeleteConfirm(false)}>
          <div style={{ background: T.card, borderRadius: 16, padding: "32px", maxWidth: 400, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.t, marginBottom: 8 }}>Delete {lead.first_name}?</div>
            <div style={{ fontSize: 15, color: T.s, marginBottom: 24 }}>This will permanently remove this lead from your pipeline.</div>
            <div style={{ display: "flex", gap: 12 }}>
              <div onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: "13px", borderRadius: 8, background: T.d, color: T.s, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Cancel</div>
              <div onClick={() => { onDelete(lead); setShowDeleteConfirm(false); }} style={{ flex: 1, padding: "13px", borderRadius: 8, background: T.r, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Delete</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
