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
      tagline: 'Perfect for small teams who want to stop the email chaos. Onboard new hires in 10 minutes instead of 3 hours.',
      benefits: [
        'Real-time tracking - see who viewed, who ignored',
        'Auto-reminders - stop manual follow-ups',
        'Instant proof - download receipts for audits',
      ],
      ctaLabel: 'Start free trial',
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
      tagline: 'Built for growing remote teams. Bulk send to entire company, track completion in real-time, eliminate spreadsheet tracking.',
      benefits: [
        'Bulk sending - 100 people in one click',
        'Dashboard view - see progress at a glance',
        'Priority support - get help when you need it',
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
      tagline: 'Perfect for multi-location companies. Handle hundreds of acknowledgments effortlessly with unlimited admins and priority support.',
      benefits: [
        'Unlimited admin seats - your entire HR team',
        'Handle 100+ staff with ease',
        '24/7 priority support for urgent needs',
      ],
      ctaLabel: 'Start free trial',
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
