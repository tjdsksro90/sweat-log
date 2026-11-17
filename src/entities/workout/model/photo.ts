/**
 * 기록 사진 규칙. DB 마이그레이션(20261117120000_workout_photos.sql)의 버킷 설정·트리거와 같은 값이다.
 */
export const WORKOUT_PHOTO_BUCKET = "workout-photos";

export const MAX_WORKOUT_PHOTOS = 4;

// 서명 URL 유효 시간(초). 상세 화면은 열 때마다 새로 만든다.
export const PHOTO_URL_EXPIRES_IN = 60 * 60;
