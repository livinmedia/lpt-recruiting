// RKRT.in Shared Components - ProGate
// Upgrade wall component for pro features

import T from '../../lib/theme';
import { getPlanLimits, isTrialExpired } from '../../lib/utils';
import { startCheckout } from '../../lib/supabase';
import { STRIPE_PRICES } from '../../lib/constants';

export function ProGate({ feature, userId, userProfile, children }) {
  const limits = getPlanLimits(userProfile);

  // If user has pro access, show the content
  if (limits.isPro) return children;

  const trialExpired = isTrialExpired(userProfile);

  const tiers = [
    {
      name: 'Recruiter',
      price: '$97',
      period: '/mo',
      color: T.card,
      textColor: T.t,
      badge: 'MOST POPULAR',
      features: [
        '1.7M+ agent directory',
        'Unlimited leads',
        'AI daily content',
        'All 5 landing pages',
        'Commission calculator',
        'Revenue share projections',
        'Rue AI recruiting agent',
      ],
      cta: trialExpired ? 'Subscribe Now →' : 'Start Free Trial →',
      trialLine: trialExpired ? null : '7-day free trial · Cancel anytime',
      ctaAction: () => startCheckout({ priceId: STRIPE_PRICES.recruiter, plan: 'recruiter' }),
      ctaStyle: { background: T.a, color: '#000', cursor: 'pointer', fontWeight: 800 },
    },
    {
      name: 'Team Leader',
      price: '$297',
      period: '/mo',
      color: '#0f1a2e',
      textColor: T.t,
      badge: '5 SEATS',
      features: [
        'Everything in Recruiter',
        '5 team member seats',
        'Shared pipeline view',
        'Team admin dashboard',
        'Blog CMS',
        'HeyGen video content',
      ],
      cta: trialExpired ? 'Subscribe Now →' : 'Try Team Leader Free →',
      trialLine: trialExpired ? null : '7-day free trial · Cancel anytime',
      ctaAction: () => startCheckout({ priceId: STRIPE_PRICES.team_leader, plan: 'team_leader' }),
      ctaStyle: { background: '#F59E0B', color: '#000', cursor: 'pointer', fontWeight: 800 },
    },
    {
      name: 'Regional Operator',
      price: '$997',
      period: '/mo',
      color: '#070d1a',
      textColor: '#fff',
      badge: '10 SEATS',
      features: [
        'Everything in Team Leader',
        '10 seats',
        'Custom domain + branding',
        'Priority support',
        'API access',
        'Dedicated onboarding',
      ],
      cta: trialExpired ? 'Subscribe Now →' : 'Try Regional Free →',
      trialLine: trialExpired ? null : '7-day free trial · Cancel anytime',
      ctaAction: () => startCheckout({ priceId: STRIPE_PRICES.regional_operator, plan: 'regional_operator' }),
      ctaStyle: { background: '#1B4FFF', color: '#fff', cursor: 'pointer', fontWeight: 800 },
    },
  ];

  return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>{trialExpired ? '⏰' : '🔒'}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.t, marginBottom: 8 }}>
        {trialExpired
          ? 'Your 7-day trial has ended'
          : `Start your free trial to unlock the full ${feature}`}
      </div>
      <div
        style={{
          fontSize: 14,
          color: T.s,
          marginBottom: 36,
          maxWidth: 520,
          margin: '0 auto 36px',
          lineHeight: 1.6,
        }}
      >
        {trialExpired
          ? 'Subscribe to keep recruiting with Rue, your pipeline, and 1.7M+ agents.'
          : 'Try any plan free for 7 days. Cancel anytime.'}
      </div>

      <div
        className="progate-tiers"
        style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          flexWrap: 'wrap',
          maxWidth: 800,
          margin: '0 auto 24px',
        }}
      >
        {tiers.map((tier) => (
          <div
            key={tier.name}
            style={{
              background: tier.color,
              border: `1px solid ${tier.name === 'Recruiter' ? T.a : T.b}`,
              borderRadius: 16,
              padding: '24px 20px',
              width: 230,
              textAlign: 'left',
              position: 'relative',
              boxShadow: tier.name === 'Recruiter' ? `0 0 24px ${T.a}30` : 'none',
            }}
          >
            {tier.badge && (
              <div
                style={{
                  position: 'absolute',
                  top: -10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: tier.name === 'Recruiter' ? T.a : '#1B4FFF',
                  color: tier.name === 'Recruiter' ? '#000' : '#fff',
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: 1.5,
                  padding: '3px 10px',
                  borderRadius: 20,
                  whiteSpace: 'nowrap',
                }}
              >
                {tier.badge}
              </div>
            )}
            <div style={{ fontSize: 13, fontWeight: 700, color: T.a, marginBottom: 4 }}>
              {tier.name.toUpperCase()}
            </div>
            <div style={{ fontSize: 34, fontWeight: 900, color: tier.textColor, lineHeight: 1 }}>
              {tier.price}
              <span style={{ fontSize: 13, fontWeight: 400, color: T.s }}>{tier.period}</span>
            </div>
            <div style={{ height: 1, background: T.b, margin: '14px 0' }} />
            {tier.features.map((f) => (
              <div key={f} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'flex-start' }}>
                <span style={{ color: T.a, fontSize: 11, marginTop: 2 }}>✓</span>
                <span style={{ fontSize: 12, color: T.s, lineHeight: 1.4 }}>{f}</span>
              </div>
            ))}
            <div
              onClick={tier.ctaAction}
              style={{
                ...tier.ctaStyle,
                marginTop: 16,
                padding: '10px 0',
                borderRadius: 8,
                fontSize: 12,
                textAlign: 'center',
              }}
            >
              {tier.cta}
            </div>
            {tier.trialLine && (
              <div style={{ fontSize: 11, color: T.a, textAlign: 'center', marginTop: 8, fontWeight: 600 }}>
                {tier.trialLine}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: '#4A5568' }}>
        Powered by Stripe · Secure checkout · Cancel anytime
      </div>
    </div>
  );
}

export default ProGate;
