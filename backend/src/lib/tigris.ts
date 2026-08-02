import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const PRESIGN_EXPIRES_SEC = 15 * 60;
/** Görüntüleme URL'lerinin ömrü — sayfa açıkken resimler ölmemeli. */
const READ_URL_EXPIRES_SEC = 12 * 60 * 60;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} tanımlı değil. Railway Variables'a ekleyin.`);
  }
  return value;
}

export function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT?.trim() &&
      process.env.S3_BUCKET?.trim() &&
      process.env.S3_ACCESS_KEY_ID?.trim() &&
      process.env.S3_SECRET_ACCESS_KEY?.trim()
  );
}

function getBucket(): string {
  return requiredEnv("S3_BUCKET");
}

function getEndpoint(): string {
  return requiredEnv("S3_ENDPOINT").replace(/\/$/, "");
}

let client: S3Client | null = null;

function getS3Client(): S3Client {
  if (client) return client;
  client = new S3Client({
    region: process.env.S3_REGION?.trim() || "auto",
    endpoint: getEndpoint(),
    forcePathStyle: true,
    credentials: {
      accessKeyId: requiredEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("S3_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function extensionForContentType(contentType: string): string | null {
  return ALLOWED_MIME[contentType.toLowerCase().trim()] ?? null;
}

export function publicUrlForKey(objectKey: string): string {
  const base =
    process.env.S3_PUBLIC_BASE_URL?.trim().replace(/\/$/, "") ||
    `${getEndpoint()}/${getBucket()}`;
  return `${base}/${objectKey.replace(/^\//, "")}`;
}

/** Bucket herkese açık okunuyorsa true yapın; sabit URL'ler kullanılır.
 *  Varsayılan: private bucket varsayılır, görüntüleme presigned GET ile yapılır. */
export function isPublicReadEnabled(): boolean {
  return process.env.S3_PUBLIC_READ?.trim().toLowerCase() === "true";
}

/** Private bucket için süreli görüntüleme URL'i (yerel imzalama, ağ isteği yok). */
export async function presignedReadUrl(objectKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: objectKey,
  });
  return getSignedUrl(getS3Client(), command, {
    expiresIn: READ_URL_EXPIRES_SEC,
  });
}

export function sanitizeStockCodeForKey(stockCode: string): string {
  return stockCode
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 80);
}

export function buildProductImageKey(stockCode: string, contentType: string): string {
  const ext = extensionForContentType(contentType);
  if (!ext) {
    throw new Error("Desteklenen formatlar: JPEG, PNG, WebP, GIF.");
  }
  const safeCode = sanitizeStockCodeForKey(stockCode);
  if (!safeCode) {
    throw new Error("Stok kodu gerekli.");
  }
  const id = crypto.randomBytes(8).toString("hex");
  return `products/${safeCode}/${id}.${ext}`;
}

export async function createPresignedUpload(input: {
  stockCode: string;
  contentType: string;
}): Promise<{ uploadUrl: string; objectKey: string; publicUrl: string; expiresIn: number }> {
  if (!isS3Configured()) {
    throw new Error("Dosya deposu yapılandırılmamış (S3_* değişkenleri).");
  }
  const contentType = input.contentType.trim().toLowerCase();
  const objectKey = buildProductImageKey(input.stockCode, contentType);
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: objectKey,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: PRESIGN_EXPIRES_SEC,
  });
  return {
    uploadUrl,
    objectKey,
    publicUrl: publicUrlForKey(objectKey),
    expiresIn: PRESIGN_EXPIRES_SEC,
  };
}

export async function deleteObject(objectKey: string): Promise<void> {
  if (!isS3Configured()) return;
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: objectKey,
    })
  );
}
