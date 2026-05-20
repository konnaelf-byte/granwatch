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
  // Email
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? "noreply@granwatch.app",
  // Lemon Squeezy
  lemonSqueezyApiKey: process.env.LEMONSQUEEZY_API_KEY ?? "",
  lemonSqueezyWebhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "",
  // OpenAI (for LLM features — voice transcription, AI summaries, etc.)
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
};
