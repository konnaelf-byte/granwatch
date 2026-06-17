export const ENV = {
  // Clerk auth
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  // Database
  databaseUrl: process.env.DATABASE_URL ?? "",
  // Owner (Konstand's Clerk userId — set after first login, see OWNER_CLERK_ID in Railway vars)
  ownerClerkId: process.env.OWNER_CLERK_ID ?? "",
  // Environment
  isProduction: process.env.NODE_ENV === "production",
  // Cloudflare R2 storage
  r2AccountId: process.env.R2_ACCOUNT_ID ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  r2BucketName: process.env.R2_BUCKET_NAME ?? "granwatch-media",
  // Public base URL for R2 bucket (e.g. https://pub-xxxx.r2.dev or https://media.granwatch.app)
  // Enable public access on the bucket in Cloudflare dashboard, then paste the URL here.
  r2PublicUrl: process.env.R2_PUBLIC_URL ?? "",
  // Email
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? "noreply@granwatch.app",
  // Lemon Squeezy
  lemonSqueezyApiKey: process.env.LEMONSQUEEZY_API_KEY ?? "",
  lemonSqueezyWebhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "",
  // Regional pricing variant IDs (set after creating variants in LS dashboard)
  // Falls back to the default ZAR variant until each one is configured.
  lsVariantZar: process.env.LS_VARIANT_ID         ?? "1681701",
  lsVariantUsd: process.env.LS_VARIANT_ID_USD     ?? "",
  lsVariantGbp: process.env.LS_VARIANT_ID_GBP     ?? "",
  lsVariantEur: process.env.LS_VARIANT_ID_EUR     ?? "",
  lsVariantBrl: process.env.LS_VARIANT_ID_BRL     ?? "",
  lsVariantInr: process.env.LS_VARIANT_ID_INR     ?? "",
  lsVariantLow: process.env.LS_VARIANT_ID_LOW     ?? "",
  // OpenAI (for LLM features — voice transcription, AI summaries, etc.)
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  // Firebase Admin SDK — paste the service account JSON as a single-line string
  // Get it from: Firebase Console → Project Settings → Service Accounts → Generate new private key
  firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? "",
};
