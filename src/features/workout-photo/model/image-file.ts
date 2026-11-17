/**
 * 서버가 올라온 사진을 믿지 않고 다시 확인한다. 파일 이름·Content-Type 대신 바이트 앞부분(시그니처)으로
 * 형식을 알아내고, 헤더에서 가로·세로를 읽는다. 화면이 자리를 잡는 크기도 여기서 읽은 값을 쓴다.
 */

export type PhotoMimeType = "image/jpeg" | "image/png" | "image/webp";

export type ImageInfo = { type: PhotoMimeType; width: number; height: number };

// 앱이 긴 변 1600px로 줄여 올린다. 1MB는 Server Action 본문 기본 한도라 그보다 조금 작게 둔다.
export const PHOTO_MAX_SIDE = 1600;
export const PHOTO_MAX_BYTES = 900 * 1024;
// 다른 클라이언트가 줄이지 않고 보낸 경우를 위해 서버는 조금 여유를 둔다(DB check는 4096).
export const PHOTO_SERVER_MAX_SIDE = 2048;

export const PHOTO_EXTENSIONS: Record<PhotoMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const readUint16BE = (bytes: Uint8Array, offset: number) => (bytes[offset] << 8) | bytes[offset + 1];
const readUint32BE = (bytes: Uint8Array, offset: number) =>
  ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
const readUint24LE = (bytes: Uint8Array, offset: number) =>
  bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((value, index) => bytes[offset + index] === value);
const ascii = (bytes: Uint8Array, offset: number, length: number) =>
  String.fromCharCode(...bytes.subarray(offset, offset + length));

// SOF 마커(프레임 시작)에 높이·너비가 있다. C4(DHT)·C8(JPG 확장)·CC(DAC)는 SOF가 아니다.
const isStartOfFrame = (marker: number) =>
  marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

const readJpegSize = (bytes: Uint8Array) => {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    // 채움 바이트(FF FF …)
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (isStartOfFrame(marker)) {
      return { height: readUint16BE(bytes, offset + 5), width: readUint16BE(bytes, offset + 7) };
    }
    // 길이가 없는 마커
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      offset += 2;
      continue;
    }
    // 이미지 데이터 시작(SOS)이나 끝(EOI)까지 SOF가 없으면 읽을 수 없는 파일이다.
    if (marker === 0xda || marker === 0xd9) return null;
    offset += 2 + readUint16BE(bytes, offset + 2);
  }
  return null;
};

const readWebpSize = (bytes: Uint8Array) => {
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8 " && bytes.length >= 30) {
    return {
      width: (bytes[26] | (bytes[27] << 8)) & 0x3fff,
      height: (bytes[28] | (bytes[29] << 8)) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    const [b0, b1, b2, b3] = [bytes[21], bytes[22], bytes[23], bytes[24]];
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  if (chunk === "VP8X" && bytes.length >= 30) {
    return { width: 1 + readUint24LE(bytes, 24), height: 1 + readUint24LE(bytes, 27) };
  }
  return null;
};

export const readImageInfo = (bytes: Uint8Array): ImageInfo | null => {
  let type: PhotoMimeType | null = null;
  let size: { width: number; height: number } | null = null;

  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    type = "image/jpeg";
    size = readJpegSize(bytes);
  } else if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) && ascii(bytes, 12, 4) === "IHDR") {
    type = "image/png";
    size = bytes.length >= 24 ? { width: readUint32BE(bytes, 16), height: readUint32BE(bytes, 20) } : null;
  } else if (bytes.length >= 16 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    type = "image/webp";
    size = readWebpSize(bytes);
  }

  if (!type || !size || size.width < 1 || size.height < 1) return null;
  return { type, ...size };
};

export const PHOTO_ERROR_MESSAGES = {
  empty: "사진 파일을 찾지 못했어요.",
  tooLarge: "사진 용량이 너무 커요. 다른 사진을 골라 주세요.",
  unsupported: "JPG, PNG, WebP 사진만 올릴 수 있어요.",
  tooManyPixels: "사진 크기가 너무 커요. 다른 사진을 골라 주세요.",
} as const;

export type PhotoCheckResult = { ok: true; info: ImageInfo } | { ok: false; error: string };

export const checkPhotoBytes = (bytes: Uint8Array): PhotoCheckResult => {
  if (bytes.length === 0) return { ok: false, error: PHOTO_ERROR_MESSAGES.empty };
  if (bytes.length > PHOTO_MAX_BYTES) return { ok: false, error: PHOTO_ERROR_MESSAGES.tooLarge };

  const info = readImageInfo(bytes);
  if (!info) return { ok: false, error: PHOTO_ERROR_MESSAGES.unsupported };
  if (Math.max(info.width, info.height) > PHOTO_SERVER_MAX_SIDE) {
    return { ok: false, error: PHOTO_ERROR_MESSAGES.tooManyPixels };
  }
  return { ok: true, info };
};

// Storage 경로: {작성자}/{기록}/{임의 id}.{확장자}. 정책이 앞 두 폴더로 소유자와 기록을 확인한다.
export const buildPhotoPath = (userId: string, workoutId: string, fileId: string, type: PhotoMimeType) =>
  `${userId}/${workoutId}/${fileId}.${PHOTO_EXTENSIONS[type]}`;
