// Gran+ subscription product definition
// R27.00/month per gran profile
// Price is in ZAR cents: 2700 = R27.00

export const GRAN_PLUS_PRICE = {
  // This will be created dynamically via Stripe API on first use
  // or you can create it in Stripe Dashboard and paste the price ID here
  amount: 2700, // R27.00 in cents
  currency: "zar",
  interval: "month" as const,
  name: "Gran+",
  description: "Wellbeing check-ins, visit photos, care notes, SMS alerts, and more.",
};

// Monthly cost in cents
export const MONTHLY_COST_CENTS = 2700;
export const MONTHLY_COST_DISPLAY = "R27";
