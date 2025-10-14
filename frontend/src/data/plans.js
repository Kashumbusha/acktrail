export const ANNUAL_DISCOUNT = 0.15; // 15% discount for annual billing
export const SSO_MONTHLY_PRICE = 50;

export const PLANS = [
  {
    id: 'small',
    name: 'Small Business',
    basePrice: 49,
    perStaffPrice: 5,
    minStaff: 1,
    maxStaff: 10,
    guestInvites: 5,
    admins: 1,
    features: ['Email support', 'Basic analytics', '5 guest invites/mo'],
    marketing: {
      tagline: 'Launch policy acknowledgments in under 15 minutes with passwordless access and cryptographic receipts.',
      benefits: [
        'Magic-link access for staff and guests',
        'Audit-ready PDF receipts & CSV exports',
      ],
      ctaLabel: 'Start small',
      highlighted: false,
    },
  },
  {
    id: 'medium',
    name: 'Medium Team',
    basePrice: 149,
    perStaffPrice: 1,
    minStaff: 11,
    maxStaff: 49,
    guestInvites: 50,
    admins: 2,
    features: ['Priority support', 'Advanced analytics', '50 guest invites/mo', 'API access'],
    popular: true,
    marketing: {
      tagline: 'Scale compliance for growing teams with analytics, reminders, and seat management controls.',
      benefits: [
        'Priority support during audits',
        'Seat capacity insights & reminder automation',
      ],
      ctaLabel: 'Start free trial',
      highlighted: true,
    },
  },
  {
    id: 'large',
    name: 'Large',
    basePrice: 299,
    perStaffPrice: 2,
    minStaff: 50,
    maxStaff: 100,
    guestInvites: 100,
    admins: 5,
    features: ['24/7 phone support', 'Advanced security', '100 guest invites/mo', 'Custom integrations'],
    marketing: {
      tagline: 'Enterprise readiness with SSO, enhanced security, and early access to Slack notifications.',
      benefits: [
        'SSO add-on and advanced security controls',
        'Slack notifications & HRIS sync (beta access)',
      ],
      ctaLabel: 'Scale up',
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
