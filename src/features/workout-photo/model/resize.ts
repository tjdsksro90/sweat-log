/**
 * 올리기 전에 사진을 줄이는 규칙. 브라우저 API(canvas)를 쓰는 부분은 lib/compress-photo.ts에 있고,
 * 여기는 크기 계산과 화질 고르기만 맡아 Node에서 테스트한다.
 */

export type Size = { width: number; height: number };

// 긴 변이 maxSide를 넘으면 비율을 지켜 줄인다. 작은 사진은 키우지 않는다.
export const getResizedSize = ({ width, height }: Size, maxSide: number): Size => {
  const longSide = Math.max(width, height);
  if (longSide <= maxSide) return { width, height };

  const scale = maxSide / longSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

// 대부분은 첫 화질에서 끝난다. 무늬가 많은 사진만 화질을 낮춰 용량을 맞춘다.
export const JPEG_QUALITIES = [0.82, 0.72, 0.6, 0.5] as const;

/**
 * 화질을 차례로 낮추며 maxBytes 이하가 되는 첫 결과를 고른다. 끝까지 크면 null.
 * encode는 브라우저에서는 canvas.toBlob, 테스트에서는 가짜 함수다.
 */
export const encodeWithinLimit = async (
  encode: (quality: number) => Promise<Blob | null>,
  maxBytes: number,
  qualities: readonly number[] = JPEG_QUALITIES,
): Promise<Blob | null> => {
  for (const quality of qualities) {
    const blob = await encode(quality);
    if (blob && blob.size <= maxBytes) return blob;
  }
  return null;
};
