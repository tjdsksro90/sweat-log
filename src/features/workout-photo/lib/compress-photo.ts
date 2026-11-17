import { PHOTO_MAX_BYTES, PHOTO_MAX_SIDE, readImageInfo } from "../model/image-file";
import { encodeWithinLimit, getDecodeWidth, getResizedSize } from "../model/resize";

export type CompressedPhoto = { blob: Blob; width: number; height: number };

export const COMPRESS_ERROR_MESSAGES = {
  unreadable: "이 사진은 읽을 수 없어요. JPG, PNG, WebP 사진을 골라 주세요.",
  tooLarge: "사진을 충분히 줄이지 못했어요. 다른 사진을 골라 주세요.",
} as const;

// JPEG는 EXIF(썸네일 포함)가 앞에 있어 크기 정보(SOF)가 수십 KB 뒤에 올 수 있다.
const HEADER_BYTES = 256 * 1024;

// 헤더에서 가로·세로를 읽어 디코딩할 때 바로 줄일 폭을 정한다. 못 읽으면 줄이지 않고 디코딩한다.
const readDecodeWidth = async (file: Blob) => {
  try {
    const info = readImageInfo(new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer()));
    return info ? getDecodeWidth(info, PHOTO_MAX_SIDE) : null;
  } catch {
    return null;
  }
};

/**
 * 1200만 화소 원본을 그대로 펼치면 수십 MB를 쓴다. 디코딩할 때 바로 줄여(resizeWidth) 메모리를 아끼고,
 * 그 옵션을 모르는 브라우저에서는 원래 크기로 디코딩한다.
 */
const decodePhoto = async (file: Blob) => {
  const decodeWidth = await readDecodeWidth(file);
  if (decodeWidth) {
    try {
      return await createImageBitmap(file, {
        imageOrientation: "from-image",
        resizeWidth: decodeWidth,
        resizeQuality: "high",
      });
    } catch {
      // 아래에서 줄이지 않고 다시 디코딩한다.
    }
  }
  return createImageBitmap(file, { imageOrientation: "from-image" });
};

/**
 * 휴대폰 원본(수 MB)을 긴 변 1600px JPEG로 다시 그린다. 다시 그리면 EXIF(촬영 위치 등)도 빠진다.
 * createImageBitmap은 EXIF 회전을 반영해서 세로 사진도 바로 선다.
 */
export const compressPhoto = async (file: Blob): Promise<CompressedPhoto | { error: string }> => {
  let bitmap: ImageBitmap;
  try {
    bitmap = await decodePhoto(file);
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
