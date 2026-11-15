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

// 5230m → "5.23km"
export const formatDistance = (distanceMeters: number) => `${(distanceMeters / 1000).toFixed(2)}km`;

// 3725초 → "1:02:05", 330초 → "5:30"
export const formatDuration = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
  }

  return `${minutes}:${paddedSeconds}`;
};
