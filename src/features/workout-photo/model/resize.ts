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

/**
 * 디코딩하면서 바로 줄일 가로 폭(createImageBitmap의 resizeWidth). 한쪽만 주어 비율은 브라우저가 지킨다.
 * 헤더의 가로·세로는 EXIF 회전 전 값이라, 브라우저가 회전 뒤 폭으로 해석하면 짧은 변이 maxSide가 된다.
 * 짧은 변도 maxSide 이상인 사진에만 써서 어느 쪽으로 해석해도 키우지 않게 한다. 최종 크기는 캔버스가 다시 맞춘다.
 */
export const getDecodeWidth = ({ width, height }: Size, maxSide: number): number | null => {
  if (Math.min(width, height) < maxSide) return null;
  return getResizedSize({ width, height }, maxSide).width;
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
