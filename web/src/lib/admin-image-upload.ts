export type AdminImageUploadResult = {
  url: string;
  path?: string;
  contentType?: string;
  size?: number;
};

// Mirror the server-side cap; we additionally compress before upload.
const MAX_CLIENT_UPLOAD_SIZE_BYTES = 4 * 1024 * 1024;
const TARGET_MAX_WIDTH = 1920;
const TARGET_QUALITY = 0.82;

type PresignResponse = {
  uploadUrl?: string;
  publicUrl?: string;
  key?: string;
  headers?: Record<string, string>;
  error?: string;
};

async function compressToWebp(file: File): Promise<File> {
  // Run-time only import to keep this out of any server bundle.
  const imageCompression = (await import("browser-image-compression")).default;
  const compressed = await imageCompression(file, {
    maxSizeMB: MAX_CLIENT_UPLOAD_SIZE_BYTES / (1024 * 1024),
    maxWidthOrHeight: TARGET_MAX_WIDTH,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: TARGET_QUALITY,
    alwaysKeepResolution: false,
  });
  // browser-image-compression returns a Blob in some versions; normalize to File.
  if (compressed instanceof File) return compressed;
  return new File([compressed], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
    type: "image/webp",
  });
}

/**
 * Compresses the image in-browser and uploads it directly to R2 via a
 * presigned PUT URL. The image bytes never traverse Vercel.
 */
export async function uploadAdminImage(file: File): Promise<AdminImageUploadResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error("僅支援圖片檔案");
  }

  const compressed = await compressToWebp(file);
  if (compressed.size > MAX_CLIENT_UPLOAD_SIZE_BYTES) {
    throw new Error("圖片壓縮後仍超過 4MB，請改用較小的原圖");
  }

  const signRes = await fetch("/api/admin/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: "image/webp",
      size: compressed.size,
    }),
  });

  const signData = (await signRes.json().catch(() => ({}))) as PresignResponse;
  if (!signRes.ok || !signData.uploadUrl || !signData.publicUrl) {
    throw new Error(signData.error || "簽發上傳網址失敗");
  }

  const putRes = await fetch(signData.uploadUrl, {
    method: "PUT",
    headers: signData.headers ?? { "Content-Type": "image/webp" },
    body: compressed,
  });

  if (!putRes.ok) {
    const text = await putRes.text().catch(() => "");
    throw new Error(text || `R2 上傳失敗：HTTP ${putRes.status}`);
  }

  return {
    url: signData.publicUrl,
    path: signData.key,
    contentType: "image/webp",
    size: compressed.size,
  };
}
