import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type UploadPublicObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
};

let _client: S3Client | undefined;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getR2Client(): S3Client {
  if (_client) return _client;

  const accountId = getRequiredEnv("CLOUDFLARE_R2_ACCOUNT_ID");
  const accessKeyId = getRequiredEnv("CLOUDFLARE_R2_ACCESS_KEY_ID");
  const secretAccessKey = getRequiredEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY");

  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    // R2 不支援 AWS SDK v3 預設的 flexible checksum（會在 presigned URL
    // 塞 x-amz-checksum-crc32 佔位值，browser 上傳時無法補正確值 → 403）。
    // 改為僅在 API 必填時才送 checksum。
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  return _client;
}

function toPublicObjectUrl(key: string): string {
  const baseUrl = getRequiredEnv("CLOUDFLARE_R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
  const encodedPath = key
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${baseUrl}/${encodedPath}`;
}

export async function uploadPublicObjectToR2(input: UploadPublicObjectInput): Promise<string> {
  const bucket = getRequiredEnv("CLOUDFLARE_R2_BUCKET");
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: input.cacheControl,
    }),
  );

  return toPublicObjectUrl(input.key);
}

export type PresignPutOptions = {
  key: string;
  contentType: string;
  /** Cache-Control to apply when the client uploads. */
  cacheControl?: string;
  /** Maximum object size in bytes — enforced via Content-Length checksum hint. */
  maxSizeBytes?: number;
  /** URL TTL in seconds (default 300). */
  expiresInSeconds?: number;
};

export type PresignPutResult = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresInSeconds: number;
  headers: Record<string, string>;
};

/**
 * Returns a short-lived presigned PUT URL the browser can use to upload
 * directly to R2. Image bytes never traverse the Vercel function.
 */
export async function presignPublicObjectPut(
  input: PresignPutOptions,
): Promise<PresignPutResult> {
  const bucket = getRequiredEnv("CLOUDFLARE_R2_BUCKET");
  const client = getR2Client();
  const expiresInSeconds = input.expiresInSeconds ?? 300;
  const cacheControl =
    input.cacheControl ?? "public, max-age=31536000, immutable";

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: input.key,
    ContentType: input.contentType,
    CacheControl: cacheControl,
    ...(input.maxSizeBytes ? { ContentLength: input.maxSizeBytes } : {}),
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });

  return {
    uploadUrl,
    publicUrl: toPublicObjectUrl(input.key),
    key: input.key,
    expiresInSeconds,
    headers: {
      "Content-Type": input.contentType,
      "Cache-Control": cacheControl,
    },
  };
}