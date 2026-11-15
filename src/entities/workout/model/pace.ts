/**
 * 러닝 페이스(1km당 걸린 초). DB에는 거리와 시간만 저장하고 페이스는 항상 여기서 계산한다.
 */
export const getPaceSecondsPerKm = (distanceMeters: number, durationSeconds: number) => {
  if (distanceMeters <= 0 || durationSeconds <= 0) {
    return null;
  }

  return Math.round((durationSeconds / distanceMeters) * 1000);
};

// 5분 30초/km → "5'30\""
export const formatPace = (secondsPerKm: number | null) => {
  if (secondsPerKm === null) {
    return "-";
  }

  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = secondsPerKm % 60;

  return `${minutes}'${String(seconds).padStart(2, "0")}"`;
};
