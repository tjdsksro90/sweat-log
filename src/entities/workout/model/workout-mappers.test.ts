import { describe, expect, it } from "vitest";

import { SAMPLE_STRENGTH_DETAIL, SAMPLE_WORKOUTS } from "@/entities/workout/model/fixtures";
import {
  type StrengthSetRow,
  toExercises,
  toSaveWorkoutPayload,
  toStrengthSummary,
  toWorkoutDetail,
  toWorkoutListItem,
  type WorkoutDetailRow,
  type WorkoutListRow,
} from "@/entities/workout/model/workout-mappers";

const MINSU = { id: "00000000-0000-0000-0000-00000000000a", nickname: "민수" };
const JIEUN = { id: "00000000-0000-0000-0000-00000000000b", nickname: "지은" };
const CREW = { id: "00000000-0000-0000-0000-0000000000c1", name: "새벽러닝" };
// 크루를 나가서 프로필을 볼 수 없게 된 동행자
const HIDDEN_COMPANION = { user_id: "00000000-0000-0000-0000-00000000000d", profile: null };

const runRow: WorkoutListRow = {
  id: "00000000-0000-0000-0000-000000000101",
  kind: "run",
  workout_date: "2026-11-14",
  title: "한강 새벽 러닝",
  place_name: "반포한강공원",
  duration_seconds: null,
  created_at: "2026-11-14T06:10:00.123456+00:00",
  user_id: MINSU.id,
  author: MINSU,
  crew: CREW,
  companions: [{ user_id: JIEUN.id, profile: JIEUN }],
  run: { distance_meters: 7200, duration_seconds: 2430 },
  sets: [],
  comments: [{ count: 2 }],
  photos: [{ count: 2 }],
};

// DB는 순서를 보장하지 않으므로 일부러 섞어 둔다.
const strengthSets: StrengthSetRow[] = [
  { exercise_name: "런지", exercise_order: 1, set_order: 2, weight_kg: null, reps: 15 },
  { exercise_name: "스쿼트", exercise_order: 0, set_order: 1, weight_kg: 70, reps: 8 },
  { exercise_name: "런지", exercise_order: 1, set_order: 0, weight_kg: 20, reps: 12 },
  { exercise_name: "스쿼트", exercise_order: 0, set_order: 0, weight_kg: 60, reps: 10 },
  { exercise_name: "스쿼트", exercise_order: 0, set_order: 2, weight_kg: 80, reps: 6 },
  { exercise_name: "런지", exercise_order: 1, set_order: 1, weight_kg: 20, reps: 12 },
];

const strengthRow: WorkoutDetailRow = {
  id: "00000000-0000-0000-0000-000000000102",
  kind: "strength",
  workout_date: "2026-11-13",
  title: "하체 데이",
  place_name: "동네 헬스장",
  duration_seconds: 3900,
  created_at: "2026-11-13T12:30:00.000Z",
  user_id: MINSU.id,
  author: MINSU,
  crew: null,
  companions: [],
  run: null,
  sets: strengthSets,
  comments: [{ count: 0 }],
  memo: "스쿼트 무게 올림",
};

describe("toWorkoutListItem", () => {
  it("러닝 행을 목록 카드로 바꾼다", () => {
    expect(toWorkoutListItem(runRow)).toStrictEqual(SAMPLE_WORKOUTS[0]);
  });

  it("헬스 행은 종목 수·세트 수·총 볼륨으로 요약한다", () => {
    // fixtures의 3720은 상세 세트와 맞지 않는 임의 값이라 실제 합계(2120)로 비교한다.
    expect(toWorkoutListItem(strengthRow)).toStrictEqual({
      ...SAMPLE_WORKOUTS[1],
      strengthSummary: { exerciseCount: 2, setCount: 6, totalVolumeKg: 2120 },
    });
  });

  it("볼 수 없는 프로필: 작성자는 '알 수 없음', 동행자는 뺀다", () => {
    const item = toWorkoutListItem({
      ...runRow,
      author: null,
      companions: [HIDDEN_COMPANION, { user_id: JIEUN.id, profile: JIEUN }],
    });

    expect(item.author).toEqual({ id: MINSU.id, nickname: "알 수 없음" });
    expect(item.companions).toEqual([JIEUN]);
  });

  it("댓글이 없으면 0, 모르는 종류면 오류", () => {
    expect(toWorkoutListItem({ ...runRow, comments: [] }).commentCount).toBe(0);
    expect(() => toWorkoutListItem({ ...runRow, kind: "swim" })).toThrow();
  });
});

describe("toWorkoutDetail", () => {
  it("헬스 상세는 종목별로 세트를 순서대로 묶고, 작성자면 isMine이다", () => {
    // fixtures의 상세는 목록 항목을 펼쳐 만들어서 WorkoutDetail에 없는 strengthSummary가 섞여 있다.
    const { strengthSummary: _summary, ...expected } = SAMPLE_STRENGTH_DETAIL as typeof SAMPLE_STRENGTH_DETAIL & {
      strengthSummary?: unknown;
    };

    expect(toWorkoutDetail(strengthRow, MINSU.id)).toStrictEqual(expected);
    expect(toWorkoutDetail(strengthRow, JIEUN.id).isMine).toBe(false);
  });

  it("헬스가 아니면 세트가 있어도 exercises는 빈 배열, strengthSummary는 null이다", () => {
    const otherRow = { ...strengthRow, kind: "other", memo: null };

    expect(toWorkoutDetail(otherRow, MINSU.id).exercises).toEqual([]);
    expect(toWorkoutListItem(otherRow).strengthSummary).toBeNull();
  });

  it("프로필을 볼 수 없는 동행자는 작성자에게만 '알 수 없음'으로 남는다", () => {
    const row = { ...strengthRow, companions: [{ user_id: JIEUN.id, profile: JIEUN }, HIDDEN_COMPANION] };

    expect(toWorkoutDetail(row, MINSU.id).companions).toEqual([
      JIEUN,
      { id: HIDDEN_COMPANION.user_id, nickname: "알 수 없음" },
    ]);
    expect(toWorkoutDetail(row, JIEUN.id).companions).toEqual([JIEUN]);
  });

  it("사진은 순서대로 서명 URL을 붙이고, URL을 못 만든 사진은 뺀다", () => {
    const row = {
      ...strengthRow,
      photo_rows: [
        { id: "p2", path: "u/w/2.jpg", position: 3, width: 1200, height: 1600 },
        { id: "p1", path: "u/w/1.jpg", position: 0, width: 1600, height: 1200 },
        { id: "p3", path: "u/w/3.jpg", position: 5, width: 800, height: 800 },
      ],
    };

    expect(toWorkoutDetail(row, MINSU.id, { "u/w/1.jpg": "signed-1", "u/w/2.jpg": "signed-2" }).photos).toEqual([
      { id: "p1", url: "signed-1", width: 1600, height: 1200 },
      { id: "p2", url: "signed-2", width: 1200, height: 1600 },
    ]);
    expect(toWorkoutDetail(row, MINSU.id).photos).toEqual([]);
  });
});

describe("toStrengthSummary, toExercises", () => {
  it("볼륨은 소수 둘째 자리로 반올림하고 맨몸 세트는 0kg로 센다", () => {
    const sets: StrengthSetRow[] = [
      { exercise_name: "벤치", exercise_order: 0, set_order: 0, weight_kg: 70.1, reps: 3 },
      { exercise_name: "푸시업", exercise_order: 1, set_order: 0, weight_kg: null, reps: 20 },
    ];

    expect(toStrengthSummary(sets)).toEqual({ exerciseCount: 2, setCount: 2, totalVolumeKg: 210.3 });
  });

  it("같은 이름이라도 순서가 다르면 다른 종목이다", () => {
    const sets: StrengthSetRow[] = [
      { exercise_name: "스쿼트", exercise_order: 0, set_order: 0, weight_kg: 60, reps: 10 },
      { exercise_name: "스쿼트", exercise_order: 1, set_order: 0, weight_kg: 40, reps: 20 },
    ];

    expect(toExercises(sets)).toHaveLength(2);
  });
});

describe("toSaveWorkoutPayload", () => {
  it("WorkoutInput을 save_workout 입력(snake_case)으로 바꾼다", () => {
    expect(
      toSaveWorkoutPayload({
        kind: "strength",
        workoutDate: "2026-11-13",
        title: "하체 데이",
        memo: null,
        placeName: null,
        crewId: CREW.id,
        companionIds: [JIEUN.id],
        durationSeconds: 3900,
        run: null,
        exercises: [{ name: "스쿼트", sets: [{ weightKg: null, reps: 10 }] }],
      }),
    ).toStrictEqual({
      id: null,
      kind: "strength",
      workout_date: "2026-11-13",
      title: "하체 데이",
      memo: null,
      place_name: null,
      crew_id: CREW.id,
      companion_ids: [JIEUN.id],
      duration_seconds: 3900,
      run: null,
      exercises: [{ name: "스쿼트", sets: [{ weight_kg: null, reps: 10 }] }],
    });
  });

  it("수정이면 id를 넘기고 러닝 상세를 바꾼다", () => {
    const payload = toSaveWorkoutPayload({
      id: runRow.id,
      kind: "run",
      workoutDate: "2026-11-14",
      title: null,
      memo: null,
      placeName: null,
      crewId: null,
      companionIds: [],
      durationSeconds: null,
      run: { distanceMeters: 5000, durationSeconds: 1650 },
      exercises: [],
    });

    expect(payload.id).toBe(runRow.id);
    expect(payload.run).toEqual({ distance_meters: 5000, duration_seconds: 1650 });
  });
});
