import { describe, expect, it } from "vitest";

import { buildPhotoPath, checkPhotoBytes, PHOTO_ERROR_MESSAGES, PHOTO_MAX_BYTES, readImageInfo } from "./image-file";

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((part) => (typeof part === "string" ? [...part].map((c) => c.charCodeAt(0)) : part)));

const u16be = (value: number) => [(value >> 8) & 0xff, value & 0xff];
const u32be = (value: number) => [(value >>> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
const u24le = (value: number) => [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff];

// SOI, APP0(길이 16), SOF0(높이·너비), EOI
const jpeg = (width: number, height: number) =>
  bytes(
    [0xff, 0xd8],
    [0xff, 0xe0, ...u16be(16)],
    "JFIF",
    [0, 1, 1, 0, 0, 1, 0, 1, 0, 0],
    [0xff, 0xc0, ...u16be(17), 8, ...u16be(height), ...u16be(width), 3],
    new Array(9).fill(0),
    [0xff, 0xd9],
  );

const png = (width: number, height: number) =>
  bytes(
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    u32be(13),
    "IHDR",
    u32be(width),
    u32be(height),
    [8, 6, 0, 0, 0],
  );

const webpVp8x = (width: number, height: number) =>
  bytes("RIFF", u32be(0), "WEBP", "VP8X", [10, 0, 0, 0], [0, 0, 0, 0], u24le(width - 1), u24le(height - 1));

const webpVp8 = (width: number, height: number) =>
  bytes(
    "RIFF",
    u32be(0),
    "WEBP",
    "VP8 ",
    [0, 0, 0, 0],
    [0, 0, 0, 0x9d, 0x01, 0x2a],
    [width & 0xff, width >> 8, height & 0xff, height >> 8],
  );

// 14비트 너비-1, 14비트 높이-1이 이어 붙은 비트열
const webpVp8l = (width: number, height: number) => {
  const packed = (width - 1) | ((height - 1) << 14);
  return bytes(
    "RIFF",
    u32be(0),
    "WEBP",
    "VP8L",
    [0, 0, 0, 0],
    [0x2f],
    [packed & 0xff, (packed >> 8) & 0xff, (packed >> 16) & 0xff, (packed >> 24) & 0xff],
  );
};

describe("readImageInfo", () => {
  it("JPEG의 SOF에서 크기를 읽는다", () => {
    expect(readImageInfo(jpeg(1600, 1200))).toEqual({ type: "image/jpeg", width: 1600, height: 1200 });
  });

  it("PNG의 IHDR에서 크기를 읽는다", () => {
    expect(readImageInfo(png(800, 600))).toEqual({ type: "image/png", width: 800, height: 600 });
  });

  it("WebP의 세 가지 형식에서 크기를 읽는다", () => {
    expect(readImageInfo(webpVp8x(1600, 900))).toEqual({ type: "image/webp", width: 1600, height: 900 });
    expect(readImageInfo(webpVp8(640, 480))).toEqual({ type: "image/webp", width: 640, height: 480 });
    expect(readImageInfo(webpVp8l(300, 2000))).toEqual({ type: "image/webp", width: 300, height: 2000 });
  });

  it("확장자만 바꾼 다른 파일이나 잘린 이미지는 거른다", () => {
    expect(readImageInfo(bytes("GIF89a", [1, 0, 1, 0]))).toBeNull();
    expect(readImageInfo(bytes("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(readImageInfo(bytes([0xff, 0xd8, 0xff, 0xe0, 0, 16]))).toBeNull();
    expect(readImageInfo(png(800, 600).subarray(0, 18))).toBeNull();
  });

  it("크기가 0인 이미지는 거른다", () => {
    expect(readImageInfo(png(0, 600))).toBeNull();
  });
});

describe("checkPhotoBytes", () => {
  it("올릴 수 있는 사진이면 형식과 크기를 돌려준다", () => {
    expect(checkPhotoBytes(jpeg(1200, 1600))).toEqual({
      ok: true,
      info: { type: "image/jpeg", width: 1200, height: 1600 },
    });
  });

  it("빈 파일, 큰 파일, 모르는 형식, 너무 큰 해상도를 거른다", () => {
    expect(checkPhotoBytes(new Uint8Array())).toEqual({ ok: false, error: PHOTO_ERROR_MESSAGES.empty });

    const large = new Uint8Array(PHOTO_MAX_BYTES + 1);
    large.set(jpeg(100, 100));
    expect(checkPhotoBytes(large)).toEqual({ ok: false, error: PHOTO_ERROR_MESSAGES.tooLarge });

    expect(checkPhotoBytes(bytes("hello"))).toEqual({ ok: false, error: PHOTO_ERROR_MESSAGES.unsupported });
    expect(checkPhotoBytes(jpeg(4000, 3000))).toEqual({ ok: false, error: PHOTO_ERROR_MESSAGES.tooManyPixels });
  });
});

describe("buildPhotoPath", () => {
  it("작성자/기록/파일 경로를 만들고 확장자는 실제 형식을 따른다", () => {
    expect(buildPhotoPath("user", "workout", "file", "image/webp")).toBe("user/workout/file.webp");
    expect(buildPhotoPath("user", "workout", "file", "image/jpeg")).toBe("user/workout/file.jpg");
  });
});
