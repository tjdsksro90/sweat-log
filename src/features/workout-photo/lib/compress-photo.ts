import { PHOTO_MAX_BYTES, PHOTO_MAX_SIDE } from "../model/image-file";
import { encodeWithinLimit, getResizedSize } from "../model/resize";

export type CompressedPhoto = { blob: Blob; width: number; height: number };

export const COMPRESS_ERROR_MESSAGES = {
  unreadable: "이 사진은 읽을 수 없어요. JPG나 PNG 사진을 골라 주세요.",
  tooLarge: "사진을 충분히 줄이지 못했어요. 다른 사진을 골라 주세요.",
} as const;

/**
 * 휴대폰 원본(수 MB)을 긴 변 1600px JPEG로 다시 그린다. 다시 그리면 EXIF(촬영 위치 등)도 빠진다.
 * createImageBitmap은 EXIF 회전을 반영해서 세로 사진도 바로 선다.
 */
export const compressPhoto = async (file: Blob): Promise<CompressedPhoto | { error: string }> => {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return { error: COMPRESS_ERROR_MESSAGES.unreadable };
  }

  const size = getResizedSize(bitmap, PHOTO_MAX_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return { error: COMPRESS_ERROR_MESSAGES.unreadable };
  }
  // 투명한 PNG가 JPEG에서 검게 나오지 않게 흰 바탕을 깐다.
  context.fillStyle = "#fff";
  context.fillRect(0, 0, size.width, size.height);
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();

  const blob = await encodeWithinLimit(
    (quality) => new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality)),
    PHOTO_MAX_BYTES,
  );
  if (!blob) return { error: COMPRESS_ERROR_MESSAGES.tooLarge };
  return { blob, ...size };
};
