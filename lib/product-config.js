export const PRISM_PRODUCT = Object.freeze({
  explorer: Object.freeze({ queries: 1, windowHours: 24 }),
  subscription: Object.freeze({ monthlyQueries: 35, monthlyPriceCents: 1999 }),
  queryBanks: Object.freeze({
    999: 10,
    1999: 25,
  }),
});

export function queryBankCreditsForAmount(amount) {
  return PRISM_PRODUCT.queryBanks[Number(amount)] || 0;
}

export function publicProductConfig(env = process.env) {
  return {
    explorer: PRISM_PRODUCT.explorer,
    subscription: PRISM_PRODUCT.subscription,
    queryBanks: PRISM_PRODUCT.queryBanks,
    checkoutUrls: {
      subscription: env.STRIPE_PRISM_SUBSCRIPTION_URL || null,
      bank10: env.STRIPE_PRISM_BANK_10_URL || null,
      bank25: env.STRIPE_PRISM_BANK_25_URL || null,
    },
  };
}
