import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, RUE_SUPA, RUE_KEY } from '../lib/supabase';
import { trackActivity } from '../lib/track';

export default function useLeads(authUser, impersonating) {
  const [leads, setLeads] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentLeads, setRecentLeads] = useState([]);
  const [selLead, setSelLead] = useState(null);
  const [pendingLeadId, setPendingLeadId] = useState(null);
  const selLeadRef = useRef(null);

  const effectiveUserId = (impersonating && impersonating.id) ? impersonating.id : authUser?.id;

  const load = useCallback(async () => {
    const uid = (impersonating && impersonating.id) ? impersonating.id : authUser?.id;
    if (!uid) return;
    setLoading(true);
    try {
      const [leadsRes, actRes] = await Promise.all([
        fetch(`${RUE_SUPA}/leads?user_id=eq.${uid}&order=created_at.desc&limit=100`, { headers: { "apikey": RUE_KEY, "Authorization": `Bearer ${RUE_KEY}` } }),
        fetch(`${RUE_SUPA}/user_activity?user_id=eq.${uid}&order=created_at.desc&limit=50`, { headers: { "apikey": RUE_KEY, "Authorization": `Bearer ${RUE_KEY}` } })
      ]);
      const leadsData = leadsRes.ok ? await leadsRes.json() : [];
      const actData = actRes.ok ? await actRes.json() : [];
      setLeads(Array.isArray(leadsData) ? leadsData : []);
      setRecentLeads((Array.isArray(leadsData) ? leadsData : []).slice(0, 6));
      setActivity(Array.isArray(actData) ? actData : []);
    } catch (e) { console.error("Load error:", e); }
    setLoading(false);
  }, [authUser, impersonating]);

  // Realtime subscription
  useEffect(() => {
    load();
    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leads',
        filter: `user_id=eq.${(impersonating && impersonating.id) ? impersonating.id : authUser?.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setLeads(p => [payload.new, ...p]);
        } else if (payload.eventType === 'UPDATE') {
          setLeads(p => p.map(l => l.id === payload.new.id ? payload.new : l));
        } else if (payload.eventType === 'DELETE') {
          setLeads(p => p.filter(l => l.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [load]);

  // Resolve pending lead ID from URL hash once leads are loaded
  useEffect(() => {
    if (!pendingLeadId) return;
    const found = leads.find(l => l.id === pendingLeadId);
    if (found) {
      setSelLead(found); selLeadRef.current = found;
      setPendingLeadId(null);
    } else if (leads.length > 0) {
      // Lead not in local list — fetch directly by ID
      (async () => {
        try {
          const r = await fetch(`${RUE_SUPA}/leads?id=eq.${pendingLeadId}&limit=1`, { headers: { "apikey": RUE_KEY, "Authorization": `Bearer ${RUE_KEY}` } });
          if (r.ok) { const data = await r.json(); const lead = Array.isArray(data) ? data[0] : data; if (lead) { setSelLead(lead); selLeadRef.current = lead; } }
        } catch (e) { console.error("Failed to load lead from URL:", e); }
        setPendingLeadId(null);
      })();
    }
  }, [pendingLeadId, leads]);

  const handleSelectLead = useCallback((lead) => {
    setSelLead(lead);
    selLeadRef.current = lead;
    if (lead?.id) trackActivity(effectiveUserId, 'view_lead', { lead_id: lead.id, lead_name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() });
  }, [effectiveUserId]);

  const handleDeleteLead = useCallback((leadId) => {
    setLeads(p => p.filter(l => l.id !== leadId));
    trackActivity(effectiveUserId, 'delete_lead', { lead_id: leadId });
  }, [effectiveUserId]);

  return {
    leads, setLeads, activity, loading, recentLeads, load,
    selLead, setSelLead, selLeadRef,
    pendingLeadId, setPendingLeadId,
    handleSelectLead, handleDeleteLead
  };
}
