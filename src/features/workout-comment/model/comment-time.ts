const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const kstDateParts = (date: Date) => {
  // en-CA는 YYYY-MM-DD로 쓴다.
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  })
    .format(date)
    .split("-")
    .map(Number);
  return { year, month, day };
};

/** 하루 안의 댓글은 상대 시간, 그보다 오래된 댓글은 한국 날짜로 보여 준다. */
export const formatCommentTime = (createdAt: string, now: Date = new Date()) => {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return "";
  const elapsed = now.getTime() - created.getTime();
  // 기기 시계가 조금 느려 미래 시각이 되어도 "방금 전"으로 둔다.
  if (elapsed < MINUTE_MS) return "방금 전";
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}분 전`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}시간 전`;
  const date = kstDateParts(created);
  const monthDay = `${date.month}월 ${date.day}일`;
  return date.year === kstDateParts(now).year ? monthDay : `${date.year}년 ${monthDay}`;
};
