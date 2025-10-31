export const ANNUAL_DISCOUNT = 0.20; // 20% discount for annual billing
export const SSO_MONTHLY_PRICE = 0; // SSO now included in all plans

export const PLANS = [
  {
    id: 'small',
    name: 'Small Business',
    basePrice: 99,
    perStaffPrice: 0, // Flat rate - no per-staff charges
    minStaff: 1,
    maxStaff: 10,
    guestInvites: 50,
    admins: 1,
    features: ['Email support', 'Basic analytics', '50 guest invites/mo', 'Microsoft 365 SSO + Slack included'],
    marketing: {
      tagline: 'Perfect for small teams who want to stop the email chaos. Onboard new hires in 10 minutes instead of 3 hours.',
      benefits: [
        'Up to 10 staff members - flat rate',
        'Real-time tracking - see who viewed, who ignored',
        'Auto-reminders - stop manual follow-ups',
        'Microsoft 365 SSO + Slack integration',
      ],
      ctaLabel: 'Start 7-day free trial',
      highlighted: false,
    },
  },
  {
    id: 'medium',
    name: 'Medium Team',
    basePrice: 249,
    perStaffPrice: 0, // Flat rate - no per-staff charges
    minStaff: 11,
    maxStaff: 49,
    guestInvites: 250,
    admins: 3,
    features: ['Priority support', 'Advanced analytics', '250 guest invites/mo', 'API access', 'Microsoft 365 SSO + Slack included'],
    popular: true,
    marketing: {
      tagline: 'Built for growing remote teams. Bulk send to entire company, track completion in real-time, eliminate spreadsheet tracking.',
      benefits: [
        'Up to 49 staff members - flat rate',
        'Bulk sending - 100 people in one click',
        'Dashboard view - see progress at a glance',
        'Microsoft 365 SSO + Slack integration',
      ],
      ctaLabel: 'Start 7-day free trial',
      highlighted: true,
    },
  },
  {
    id: 'large',
    name: 'Large',
    basePrice: 699,
    perStaffPrice: 0, // Flat rate - no per-staff charges
    minStaff: 50,
    maxStaff: null, // No upper limit
    guestInvites: 1000,
    admins: null, // Unlimited admins
    features: ['24/7 phone support', 'Advanced security', '1,000 guest invites/mo', 'Custom integrations', 'Microsoft 365 SSO + Slack included', 'Free process automation - we build custom workflows for your team'],
    marketing: {
      tagline: 'Perfect for multi-location companies. Handle hundreds of acknowledgments effortlessly with unlimited admins and priority support.',
      benefits: [
        '50+ staff members - flat rate',
        'Unlimited admin seats - your entire HR team',
        'Handle 100+ staff with ease',
        'Microsoft 365 SSO + Slack integration',
        'Custom process automation included - we build workflows for free',
      ],
      ctaLabel: 'Start 7-day free trial',
      highlighted: false,
    },
  },
];

export const PLAN_MAP = PLANS.reduce((acc, plan) => {
  acc[plan.id] = plan;
  return acc;
}, {});

export function calculatePlanPrice(planId, staffCount, billingInterval = 'month', includeSSO = false) {
  const plan = PLAN_MAP[planId];
  if (!plan) {
    return {
      monthly: 0,
      annual: 0,
      discountedMonthly: 0,
      baseMonthly: 0,
      staffMonthly: 0,
      ssoMonthly: includeSSO ? SSO_MONTHLY_PRICE : 0,
      baseAnnual: 0,
      staffAnnual: 0,
      ssoAnnual: includeSSO ? Math.round(SSO_MONTHLY_PRICE * 12 * (1 - ANNUAL_DISCOUNT)) : 0,
      undiscountedMonthly: 0,
    };
  }

  const baseMonthly = plan.basePrice;
  const staffMonthly = plan.perStaffPrice * staffCount;
  const ssoMonthly = includeSSO ? SSO_MONTHLY_PRICE : 0;
  const subtotalMonthly = baseMonthly + staffMonthly + ssoMonthly;

  const annualMultiplier = 12 * (1 - ANNUAL_DISCOUNT);
  const baseAnnual = Math.round(baseMonthly * annualMultiplier);
  const staffAnnual = Math.round(staffMonthly * annualMultiplier);
  const ssoAnnual = includeSSO ? Math.round(SSO_MONTHLY_PRICE * annualMultiplier) : 0;
  const annualTotal = baseAnnual + staffAnnual + ssoAnnual;
  const discountedMonthly = Math.round(annualTotal / 12);
  const monthlyTotal = subtotalMonthly;

  return {
    monthly: monthlyTotal,
    annual: annualTotal,
    discountedMonthly,
    baseMonthly,
    staffMonthly,
    ssoMonthly,
    baseAnnual,
    staffAnnual,
    ssoAnnual,
    intervalTotal: billingInterval === 'year' ? annualTotal : monthlyTotal,
    undiscountedMonthly: subtotalMonthly,
  };
}
