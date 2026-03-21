// RKRT.in Onboarding Flow
// New user onboarding wizard

import { useState } from 'react';
import T from '../../lib/theme';
import { BROKERAGES } from '../../lib/constants';
import { supabase, logActivity } from '../../lib/supabase';

export default function OnboardingFlow({ userId, email, onComplete }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    full_name: "",
    phone: "",
    brokerage: "",
    brokerage_other: "",
    license_state: "",
    license_number: "",
    market: "",
  });

  const update = (k, v) => setData(d => ({ ...d, [k]: v }));

  const finish = async () => {
    setSaving(true);
    const brokerageValue = data.brokerage === "Other" ? data.brokerage_other : data.brokerage;
    await supabase.from("profiles").update({
      full_name: data.full_name,
      phone: data.phone,
      brokerage: brokerageValue,
      license_state: data.license_state,
      license_number: data.license_number,
      market: data.market,
      onboarded: true,
      updated_at: new Date().toISOString(),
    }).eq("id", userId);
    logActivity(userId, 'complete_onboarding');
    setSaving(false);
    onComplete();
  };

  const inp = {
    width: "100%",
    padding: "16px 18px",
    borderRadius: 10,
    background: T.d,
    border: `1px solid ${T.b}`,
    color: T.t,
    fontSize: 17,
    outline: "none",
    fontFamily: "inherit",
    marginBottom: 18,
    boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: T.bg, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="onboard-card" style={{ background: T.card, borderRadius: 20, padding: "48px 44px", maxWidth: 480, width: "100%", border: `1px solid ${T.b}` }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: T.t, marginBottom: 6 }}>Welcome to RKRT</div>
          <div style={{ fontSize: 15, color: T.s }}>Let's set up your recruiting command center</div>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? T.a : T.m }} />
          ))}
        </div>

        {step === 1 && (
          <>
            <div style={{ fontSize: 11, color: T.m, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>YOUR NAME</div>
            <input value={data.full_name} onChange={e => update("full_name", e.target.value)} placeholder="Full name" style={inp} />
            <div style={{ fontSize: 11, color: T.m, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>PHONE</div>
            <input value={data.phone} onChange={e => update("phone", e.target.value)} placeholder="(555) 123-4567" style={inp} />
            <div
              onClick={() => data.full_name && setStep(2)}
              style={{ padding: "16px", borderRadius: 10, background: data.full_name ? T.a : T.m, color: data.full_name ? "#000" : T.s, fontSize: 16, fontWeight: 700, textAlign: "center", cursor: data.full_name ? "pointer" : "not-allowed", marginTop: 8 }}
            >
              Continue →
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ fontSize: 11, color: T.m, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>YOUR BROKERAGE</div>
            <select value={data.brokerage} onChange={e => update("brokerage", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              <option value="">Select brokerage...</option>
              {BROKERAGES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            {data.brokerage === "Other" && (
              <input value={data.brokerage_other} onChange={e => update("brokerage_other", e.target.value)} placeholder="Enter brokerage name" style={inp} />
            )}
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: T.m, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>LICENSE STATE</div>
                <input value={data.license_state} onChange={e => update("license_state", e.target.value.toUpperCase())} placeholder="TX" maxLength={2} style={inp} />
              </div>
              <div style={{ flex: 2 }}>
                <div style={{ fontSize: 11, color: T.m, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>LICENSE #</div>
                <input value={data.license_number} onChange={e => update("license_number", e.target.value)} placeholder="Optional" style={inp} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <div onClick={() => setStep(1)} style={{ padding: "16px", borderRadius: 10, background: T.d, color: T.s, fontSize: 16, fontWeight: 700, textAlign: "center", cursor: "pointer", flex: 1 }}>← Back</div>
              <div onClick={() => data.brokerage && setStep(3)} style={{ padding: "16px", borderRadius: 10, background: data.brokerage ? T.a : T.m, color: data.brokerage ? "#000" : T.s, fontSize: 16, fontWeight: 700, textAlign: "center", cursor: data.brokerage ? "pointer" : "not-allowed", flex: 2 }}>Continue →</div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div style={{ fontSize: 11, color: T.m, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>PRIMARY MARKET</div>
            <input value={data.market} onChange={e => update("market", e.target.value)} placeholder="e.g. Austin, TX" style={inp} />
            <div style={{ background: T.d, borderRadius: 10, padding: "16px 18px", marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: T.s, lineHeight: 1.6 }}>
                🎯 RUE will focus on recruiting agents from <strong style={{ color: T.t }}>{data.brokerage === "Other" ? data.brokerage_other : data.brokerage}</strong> in <strong style={{ color: T.t }}>{data.market || "your market"}</strong>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div onClick={() => setStep(2)} style={{ padding: "16px", borderRadius: 10, background: T.d, color: T.s, fontSize: 16, fontWeight: 700, textAlign: "center", cursor: "pointer", flex: 1 }}>← Back</div>
              <div onClick={finish} style={{ padding: "16px", borderRadius: 10, background: saving ? T.m : T.a, color: saving ? T.s : "#000", fontSize: 16, fontWeight: 700, textAlign: "center", cursor: saving ? "wait" : "pointer", flex: 2 }}>
                {saving ? "Saving..." : "Launch Command Center 🚀"}
              </div>
            </div>
          </>
        )}

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: T.m }}>
          Signed in as {email}
        </div>
      </div>
    </div>
  );
}
