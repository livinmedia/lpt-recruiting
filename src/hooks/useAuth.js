import { useState, useEffect, useCallback } from "react";
import { supabase, RUE_KEY } from '../lib/supabase';
import { logActivity } from '../lib/supabase';

export default function useAuth() {
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBetaIntake, setShowBetaIntake] = useState(false);
  const [showUpgradeSuccess, setShowUpgradeSuccess] = useState(false);
  const [showRueIntake, setShowRueIntake] = useState(false);
  const [initialHash, setInitialHash] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (!session) { setAuthLoading(false); return; }
        setAuthUser(prev => (!prev || prev.id !== session.user.id) ? session.user : prev);
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        console.log('PROFILE LOADED:', prof?.role, prof?.plan, prof?.email);
        setProfile(prof || null);
        // Check if onboarding needed
        // Check intake status — rue_intake (new) takes priority over beta_intake (legacy)
        if (prof && prof.is_beta_tester) {
          const { data: rueCheck } = await supabase.from('rue_intake').select('completed').eq('user_id', prof.id).single();
          if (!rueCheck || !rueCheck.completed) {
            const { data: intake } = await supabase.from('beta_intake').select('completed').eq('user_id', prof.id).single();
            if (!intake || !intake.completed) {
              setShowBetaIntake(true);
            }
          }
        } else if (prof && !prof.onboarded) {
          setShowOnboarding(true);
        }
        // Check Rue intake (skip for owner/admin, skip if already completed or dismissed)
        if (prof && prof.onboarded && prof.role !== "owner" && prof.role !== "admin" && !sessionStorage.getItem('rue_intake_skipped')) {
          const { data: rueIntake } = await supabase.from('rue_intake').select('completed').eq('user_id', prof.id).single();
          if (!rueIntake || !rueIntake.completed) setShowRueIntake(true);
        }
        // Parse initial hash for routing
        const hash = window.location.hash.replace("#", "");
        if (hash) setInitialHash(hash);
        // Check for Stripe upgrade success
        if (window.location.search.includes('upgraded=true')) {
          const freshProf = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
          if (freshProf.data) setProfile(freshProf.data);
          setShowUpgradeSuccess(true);
          setTimeout(() => { setShowUpgradeSuccess(false); window.history.replaceState({}, '', window.location.pathname); }, 5000);
        }
      } catch (err) {
        console.error('Auth setup error:', err);
      } finally {
        setAuthLoading(false);
      }
    }).catch((err) => {
      console.error('Auth session error:', err);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_OUT') { setAuthUser(null); setProfile(null); setAuthLoading(false); return; }
      if (!session) return;
      setAuthUser(prev => (!prev || prev.id !== session.user.id) ? session.user : prev);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async () => {
    if (!authUser?.id) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();
    if (data) setProfile(data);
  }, [authUser]);

  const handleOnboardingComplete = useCallback((updatedData) => {
    setProfile(p => ({ ...p, ...updatedData }));
    setShowOnboarding(false);
    logActivity(authUser?.id, 'onboarding_complete');
  }, [authUser]);

  return {
    authUser, setAuthUser, profile, setProfile, authLoading,
    showOnboarding, setShowOnboarding, showBetaIntake, setShowBetaIntake,
    showUpgradeSuccess, setShowUpgradeSuccess, showRueIntake, setShowRueIntake,
    initialHash,
    loadProfile, handleOnboardingComplete
  };
}
