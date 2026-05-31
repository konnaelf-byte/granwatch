// Cloudflare R2 storage helpers (S3-compatible API)
// Replaces the old Manus Forge storage proxy.

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

let _s3: S3Client | null = null;

function getS3Client(): S3Client {
  if (_s3) return _s3;

  if (!ENV.r2AccountId || !ENV.r2AccessKeyId || !ENV.r2SecretAccessKey) {
    throw new Error(
      "R2 credentials missing: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY"
    );
  }

  _s3 = new S3Client({
    region: "auto",
    endpoint: `https://${ENV.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ENV.r2AccessKeyId,
      secretAccessKey: ENV.r2SecretAccessKey,
    },
  });

  return _s3;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const segmentStart = relKey.lastIndexOf("/");
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1 || lastDot <= segmentStart) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

/**
 * Upload a file to R2. Returns the storage key and a permanent public URL.
 *
 * Requires R2_PUBLIC_URL to be set (e.g. https://pub-xxxx.r2.dev or a custom domain).
 * Enable public access on the granwatch-media bucket in the Cloudflare R2 dashboard,
 * then copy the public URL and set it as R2_PUBLIC_URL in Railway env vars.
 *
 * Falls back to a 7-day presigned URL if R2_PUBLIC_URL is not configured — but this
 * causes photos to expire after 7 days, so always set R2_PUBLIC_URL in production.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const s3 = getS3Client();
  const key = appendHashSuffix(normalizeKey(relKey));

  const body =
    typeof data === "string" ? Buffer.from(data, "utf-8") : Buffer.from(data as Uint8Array);

  await s3.send(
    new PutObjectCommand({
      Bucket: ENV.r2BucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  // Use a permanent public URL if the bucket has public access configured.
  if (ENV.r2PublicUrl) {
    const publicBase = ENV.r2PublicUrl.replace(/\/$/, "");
    return { key, url: `${publicBase}/${key}` };
  }

  // Fallback: presigned URL (expires in 7 days — photos will break after expiry).
  // Set R2_PUBLIC_URL in Railway to fix this permanently.
  console.warn("[storage] R2_PUBLIC_URL not set — falling back to presigned URL (expires in 7 days)");
  const signedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: ENV.r2BucketName, Key: key }),
    { expiresIn: 60 * 60 * 24 * 7 }
  );

  return { key, url: signedUrl };
}

/**
 * Generate a fresh signed download URL for an existing R2 object.
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const s3 = getS3Client();
  const key = normalizeKey(relKey);

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: ENV.r2BucketName, Key: key }),
    { expiresIn: 60 * 60 * 24 * 7 }
  );

  return { key, url };
}

/**
 * Delete an object from R2.
 */
export async function storageDelete(relKey: string): Promise<void> {
  const s3 = getS3Client();
  const key = normalizeKey(relKey);

  await s3.send(
    new DeleteObjectCommand({
      Bucket: ENV.r2BucketName,
      Key: key,
    })
  );
}
