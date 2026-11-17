import { describe, expect, it, vi } from "vitest";

import { encodeWithinLimit, getResizedSize } from "./resize";

describe("getResizedSize", () => {
  it("긴 변을 기준으로 비율을 지켜 줄인다", () => {
    expect(getResizedSize({ width: 4032, height: 3024 }, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(getResizedSize({ width: 3024, height: 4032 }, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("작은 사진은 키우지 않는다", () => {
    expect(getResizedSize({ width: 800, height: 600 }, 1600)).toEqual({ width: 800, height: 600 });
    expect(getResizedSize({ width: 1600, height: 900 }, 1600)).toEqual({ width: 1600, height: 900 });
  });

  it("아주 긴 파노라마도 짧은 변이 0이 되지 않는다", () => {
    expect(getResizedSize({ width: 20000, height: 5 }, 1600)).toEqual({ width: 1600, height: 1 });
  });
});

const blobOf = (size: number) => new Blob([new Uint8Array(size)]);

describe("encodeWithinLimit", () => {
  it("첫 화질에서 한도 안이면 그대로 쓴다", async () => {
    const encode = vi.fn(async () => blobOf(100));
    const blob = await encodeWithinLimit(encode, 200, [0.8, 0.6]);
    expect(blob?.size).toBe(100);
    expect(encode).toHaveBeenCalledTimes(1);
  });

  it("한도를 넘으면 화질을 낮춰 다시 만든다", async () => {
    const encode = vi.fn(async (quality: number) => blobOf(quality > 0.7 ? 300 : 150));
    const blob = await encodeWithinLimit(encode, 200, [0.8, 0.6, 0.5]);
    expect(blob?.size).toBe(150);
    expect(encode.mock.calls.map(([quality]) => quality)).toEqual([0.8, 0.6]);
  });

  it("끝까지 크거나 만들지 못하면 null", async () => {
    expect(await encodeWithinLimit(async () => blobOf(300), 200, [0.8, 0.6])).toBeNull();
    expect(await encodeWithinLimit(async () => null, 200, [0.8])).toBeNull();
  });
});
