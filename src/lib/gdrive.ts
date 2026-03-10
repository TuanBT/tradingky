// Google Drive API helpers for image storage
// Uses drive.file scope — can only access files created by this app

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const APP_FOLDER_NAME = "TradingKy";

// ==================== FOLDER ====================

/** Find or create the "TradingKy" folder in user's Drive root */
export async function getOrCreateAppFolder(accessToken: string): Promise<string> {
  // Search for existing folder
  const q = `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchRes = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!searchRes.ok) {
    throw new Error("Không thể tìm folder trên Google Drive.");
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder
  const createRes = await fetch(`${DRIVE_API}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: APP_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!createRes.ok) {
    throw new Error("Không thể tạo folder trên Google Drive.");
  }

  const folder = await createRes.json();
  return folder.id;
}

// ==================== UPLOAD ====================

/** Upload an image file to the TradingKy folder and make it publicly viewable */
export async function uploadToDrive(
  accessToken: string,
  file: File
): Promise<{ fileId: string; url: string }> {
  const folderId = await getOrCreateAppFolder(accessToken);

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${
    (file.name.split(".").pop() || "png").toLowerCase()
  }`;

  // Multipart upload: metadata + file content
  const metadata = {
    name: filename,
    parents: [folderId],
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", file);

  const uploadRes = await fetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.error?.message || "Upload lên Google Drive thất bại.");
  }

  const uploaded = await uploadRes.json();
  const fileId = uploaded.id;

  // Make file publicly viewable (anyone with link)
  await fetch(`${DRIVE_API}/files/${fileId}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role: "reader",
      type: "anyone",
    }),
  });

  return {
    fileId,
    url: `gdrive:${fileId}`,
  };
}

// ==================== DELETE ====================

/** Delete a file from Google Drive by file ID */
export async function deleteFromDrive(
  accessToken: string,
  fileId: string
): Promise<void> {
  const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // 204 = deleted, 404 = already gone — both are fine
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    console.warn("Xoá file Drive thất bại:", fileId, res.status);
  }
}

// ==================== URL HELPERS ====================

/** Check if a stored URL is a Google Drive reference */
export function isGDriveUrl(url: string): boolean {
  return url.startsWith("gdrive:");
}

/** Extract file ID from stored gdrive URL */
export function extractFileId(url: string): string {
  return url.replace("gdrive:", "");
}

/**
 * Convert a stored image URL to a displayable src for <img> tags.
 * - gdrive:{fileId} → Google Drive thumbnail URL
 * - /api/files/... → VPS proxy URL (backward compat)
 * - Other URLs → pass through as-is
 */
export function getImageSrc(storedUrl: string): string {
  if (!storedUrl) return "";
  if (isGDriveUrl(storedUrl)) {
    const fileId = extractFileId(storedUrl);
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`;
  }
  return storedUrl;
}

/**
 * Get a direct link for opening the image in a new tab.
 * - gdrive:{fileId} → Google Drive viewer
 * - Other URLs → pass through
 */
export function getImageLink(storedUrl: string): string {
  if (!storedUrl) return "";
  if (isGDriveUrl(storedUrl)) {
    const fileId = extractFileId(storedUrl);
    return `https://drive.google.com/file/d/${fileId}/view`;
  }
  return storedUrl;
}
