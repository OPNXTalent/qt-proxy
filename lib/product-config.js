export const PRISM_PRODUCT = Object.freeze({
  explorer: Object.freeze({ credits: 5, windowHours: 24 }),
  primaryCost: 2,
  followUpCost: 1,
  registration: Object.freeze({ finalTrialCredits: 5, welcomeCredits: 3 }),
  subscription: Object.freeze({ monthlyCredits: 350, monthlyPriceCents: 4999 }),
  queryBanks: Object.freeze({
    1999: 125,
  }),
});

export function queryBankCreditsForAmount(amount) {
  return PRISM_PRODUCT.queryBanks[Number(amount)] || 0;
}

export function publicProductConfig(env = process.env) {
  return {
    explorer: PRISM_PRODUCT.explorer,
    primaryCost: PRISM_PRODUCT.primaryCost,
    followUpCost: PRISM_PRODUCT.followUpCost,
    registration: PRISM_PRODUCT.registration,
    subscription: PRISM_PRODUCT.subscription,
    queryBanks: PRISM_PRODUCT.queryBanks,
    checkoutUrls: {
      subscription: env.STRIPE_PRISM_SUBSCRIPTION_URL || null,
      bank125: env.STRIPE_PRISM_BANK_125_URL || null,
    },
  };
}
