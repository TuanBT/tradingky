import { uploadToDrive, deleteFromDrive, isGDriveUrl, extractFileId } from "../gdrive";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];

export async function uploadChartImage(accessToken: string, file: File): Promise<string> {
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("File quá lớn (tối đa 5MB).");
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Chỉ hỗ trợ file ảnh (JPG, PNG, WebP, GIF).");
  }
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error("Đuôi file không hợp lệ.");
  }

  try {
    const result = await uploadToDrive(accessToken, file);
    return result.url; // "gdrive:{fileId}"
  } catch (error) {
    console.error("Lỗi upload ảnh:", error);
    throw new Error((error as Error).message || "Không thể upload ảnh. Vui lòng thử lại.");
  }
}

export async function deleteChartImage(accessToken: string, imageUrl: string): Promise<void> {
  if (!imageUrl) return;

  try {
    if (isGDriveUrl(imageUrl)) {
      const fileId = extractFileId(imageUrl);
      await deleteFromDrive(accessToken, fileId);
    }
  } catch (err) {
    console.error("Lỗi xoá ảnh:", imageUrl, err);
  }
}
