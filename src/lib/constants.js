// RKRT.in Constants
// All business logic constants in one place

import T from './theme';

// Pipeline Stages
export const STAGES = [
  { id: "new", l: "New", c: T.s },
  { id: "researched", l: "Researched", c: T.bl },
  { id: "outreach_sent", l: "Outreach", c: T.y },
  { id: "meeting_booked", l: "Meeting", c: T.p },
  { id: "in_conversation", l: "Talking", c: T.c },
  { id: "recruited", l: "Recruited", c: T.a },
];

// Brokerages for dropdowns
export const BROKERAGES = [
  "Keller Williams",
  "RE/MAX",
  "eXp Realty",
  "Coldwell Banker",
  "Century 21",
  "Berkshire Hathaway HomeServices",
  "Compass",
  "Sotheby's International Realty",
  "Better Homes & Gardens Real Estate",
  "ERA Real Estate",
  "Engel & Völkers",
  "HomeSmart",
  "Redfin",
  "Side",
  "LPT Realty",
  "Independent",
  "Other",
];

// Target brokerages for recruiting
export const TARGET_BROKERAGES = [
  "LPT Realty",
  "Keller Williams",
  "eXp Realty",
  "RE/MAX",
  "Compass",
  "Coldwell Banker",
  "Century 21",
  "Berkshire Hathaway HomeServices",
  "HomeSmart",
  "Sotheby's International Realty",
  "Better Homes & Gardens Real Estate",
  "ERA Real Estate",
  "Engel & Völkers",
  "Redfin",
  "Side",
  "Independent",
  "Other",
];

// Pie chart colors
export const CHART_COLORS = [T.a, T.bl, T.y, T.p, T.r, T.c];

// Communication types
export const COMM_TYPES = {
  call: { icon: "📞", label: "Call" },
  text: { icon: "💬", label: "Text" },
  email: { icon: "📧", label: "Email" },
  meeting: { icon: "🤝", label: "Meeting" },
  dm: { icon: "📱", label: "DM" },
  linkedin: { icon: "💼", label: "LinkedIn" },
};

// Task types
export const TASK_TYPES = {
  call: { icon: "📞", label: "Call" },
  email: { icon: "📧", label: "Email" },
  text: { icon: "💬", label: "Text" },
  research: { icon: "🔍", label: "Research" },
  follow_up: { icon: "📋", label: "Follow Up" },
  meeting: { icon: "🤝", label: "Meeting" },
};

// Priority colors
export const PRIORITY_COLORS = {
  high: T.r,
  medium: T.y,
  low: T.s,
};

// Stripe Price IDs
export const STRIPE_PRICES = {
  recruiter: 'price_1T7KWqLUyw8VkDG8LGq23UWH',
  team_leader: 'price_1TBzqwLUyw8VkDG8QdUDNo9L',
  regional_operator: 'price_1TBzqwLUyw8VkDG8dvxzP3ZX',
  credits_50: 'price_1TBzqwLUyw8VkDG8ybG9deHo',
  credits_200: 'price_1TBzqxLUyw8VkDG8RDQNXLj6',
  credits_500: 'price_1TBzqxLUyw8VkDG8hODfUyyk',
};

// Pricing tiers
export const PRICING_TIERS = [
  {
    key: 'recruiter',
    name: 'Recruiter',
    price: '$97',
    period: '/mo',
    badge: 'MOST POPULAR',
    priceId: STRIPE_PRICES.recruiter,
    features: [
      '1.2M+ agent directory',
      'Unlimited leads',
      'AI daily content',
      'All 5 landing pages',
      'Commission calculator',
      'Revenue share projections',
      'Rue AI recruiting agent',
    ],
  },
  {
    key: 'team_leader',
    name: 'Team Leader',
    price: '$297',
    period: '/mo',
    badge: '5 SEATS',
    priceId: STRIPE_PRICES.team_leader,
    features: [
      'Everything in Recruiter',
      '5 team member seats',
      'Shared pipeline view',
      'Team admin dashboard',
      'Blog CMS',
      'HeyGen video content',
    ],
  },
  {
    key: 'regional_operator',
    name: 'Regional Operator',
    price: '$997',
    period: '/mo',
    badge: '10 SEATS',
    priceId: STRIPE_PRICES.regional_operator,
    features: [
      'Everything in Team Leader',
      '10 seats',
      'Custom domain + branding',
      'Priority support',
      'API access',
      'Dedicated onboarding',
    ],
  },
];

// Credit packs for enrichment
export const CREDIT_PACKS = [
  { key: 'credits_50', credits: 50, price: '$25', perCredit: '$0.50', priceId: STRIPE_PRICES.credits_50 },
  { key: 'credits_200', credits: 200, price: '$75', perCredit: '$0.38', priceId: STRIPE_PRICES.credits_200 },
  { key: 'credits_500', credits: 500, price: '$150', perCredit: '$0.30', priceId: STRIPE_PRICES.credits_500 },
];

// Landing page configs
export const LANDING_PAGES = {
  join: { img: "/og/join.png", title: "Join LPT Realty", desc: "Keep More of What You Earn" },
  calculator: { img: "/og/calculator.png", title: "Commission Calculator", desc: "See What You Could Earn" },
  "new-agent": { img: "/og/new-agent.png", title: "New Agent Launch", desc: "Start Your Career Right" },
  "revenue-share": { img: "/og/revenue-share.png", title: "Revenue Share", desc: "Build Passive Income" },
  "why-switch": { img: "/og/why-switch.png", title: "Why Agents Switch", desc: "Better Splits, Better Tools" },
};

// Brokerage slugs for blog URLs
export const BROKERAGE_SLUGS = {
  "LPT Realty": "lpt-realty",
  "eXp Realty": "exp-realty",
  "Keller Williams": "keller-williams",
  "RE/MAX": "remax",
};

// Daily content limit for free users
export const DAILY_CONTENT_LIMIT = 3;

// Lead limits by plan
export const PLAN_LIMITS = {
  free: { leads: 0, content: 0 },
  recruiter: { leads: Infinity, content: Infinity },
  team_leader: { leads: Infinity, content: Infinity },
  regional_operator: { leads: Infinity, content: Infinity },
};
