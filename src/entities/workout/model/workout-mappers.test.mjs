import { SAMPLE_STRENGTH_DETAIL, SAMPLE_WORKOUTS } from "@/entities/workout/model/fixtures";
import {
  toExercises,
  toSaveWorkoutPayload,
  toStrengthSummary,
  toWorkoutDetail,
  toWorkoutListItem,
} from "@/entities/workout/model/workout-mappers";

import assert from "node:assert/strict";
import { test } from "node:test";

const MINSU = { id: "00000000-0000-0000-0000-00000000000a", nickname: "민수" };
const JIEUN = { id: "00000000-0000-0000-0000-00000000000b", nickname: "지은" };
const CREW = { id: "00000000-0000-0000-0000-0000000000c1", name: "새벽러닝" };

const runRow = {
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
  companions: [{ profile: JIEUN }],
  run: { distance_meters: 7200, duration_seconds: 2430 },
  sets: [],
  comments: [{ count: 2 }],
};

// DB는 순서를 보장하지 않으므로 일부러 섞어 둔다.
const strengthSets = [
  { exercise_name: "런지", exercise_order: 1, set_order: 2, weight_kg: null, reps: 15 },
  { exercise_name: "스쿼트", exercise_order: 0, set_order: 1, weight_kg: 70, reps: 8 },
  { exercise_name: "런지", exercise_order: 1, set_order: 0, weight_kg: 20, reps: 12 },
  { exercise_name: "스쿼트", exercise_order: 0, set_order: 0, weight_kg: 60, reps: 10 },
  { exercise_name: "스쿼트", exercise_order: 0, set_order: 2, weight_kg: 80, reps: 6 },
  { exercise_name: "런지", exercise_order: 1, set_order: 1, weight_kg: 20, reps: 12 },
];

const strengthRow = {
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

test("러닝 행을 목록 카드로 바꾼다", () => {
  assert.deepEqual(toWorkoutListItem(runRow), SAMPLE_WORKOUTS[0]);
});

test("헬스 행은 종목 수·세트 수·총 볼륨으로 요약한다", () => {
  // fixtures의 3720은 상세 세트와 맞지 않는 임의 값이라 실제 합계(2120)로 비교한다.
  assert.deepEqual(toWorkoutListItem(strengthRow), {
    ...SAMPLE_WORKOUTS[1],
    strengthSummary: { exerciseCount: 2, setCount: 6, totalVolumeKg: 2120 },
  });
});

test("헬스 상세는 종목별로 세트를 순서대로 묶고, 작성자면 isMine이다", () => {
  // fixtures의 상세는 목록 항목을 펼쳐 만들어서 WorkoutDetail에 없는 strengthSummary가 섞여 있다.
  const { strengthSummary: _summary, ...expected } = SAMPLE_STRENGTH_DETAIL;
  assert.deepEqual(toWorkoutDetail(strengthRow, MINSU.id), expected);
  assert.equal(toWorkoutDetail(strengthRow, JIEUN.id).isMine, false);
});

test("헬스가 아니면 세트가 있어도 exercises는 빈 배열, strengthSummary는 null이다", () => {
  const otherRow = { ...strengthRow, kind: "other", memo: null };
  assert.deepEqual(toWorkoutDetail(otherRow, MINSU.id).exercises, []);
  assert.equal(toWorkoutListItem(otherRow).strengthSummary, null);
});

test("볼 수 없는 프로필: 작성자는 '알 수 없음', 동행자는 뺀다", () => {
  const item = toWorkoutListItem({ ...runRow, author: null, companions: [{ profile: null }, { profile: JIEUN }] });
  assert.deepEqual(item.author, { id: MINSU.id, nickname: "알 수 없음" });
  assert.deepEqual(item.companions, [JIEUN]);
});

test("댓글이 없으면 0, 모르는 종류면 오류", () => {
  assert.equal(toWorkoutListItem({ ...runRow, comments: [] }).commentCount, 0);
  assert.throws(() => toWorkoutListItem({ ...runRow, kind: "swim" }));
});

test("볼륨은 소수 둘째 자리로 반올림하고 맨몸 세트는 0kg로 센다", () => {
  const sets = [
    { exercise_name: "벤치", exercise_order: 0, set_order: 0, weight_kg: 70.1, reps: 3 },
    { exercise_name: "푸시업", exercise_order: 1, set_order: 0, weight_kg: null, reps: 20 },
  ];
  assert.deepEqual(toStrengthSummary(sets), { exerciseCount: 2, setCount: 2, totalVolumeKg: 210.3 });
});

test("같은 이름이라도 순서가 다르면 다른 종목이다", () => {
  const sets = [
    { exercise_name: "스쿼트", exercise_order: 0, set_order: 0, weight_kg: 60, reps: 10 },
    { exercise_name: "스쿼트", exercise_order: 1, set_order: 0, weight_kg: 40, reps: 20 },
  ];
  assert.equal(toExercises(sets).length, 2);
});

test("WorkoutInput을 save_workout 입력(snake_case)으로 바꾼다", () => {
  assert.deepEqual(
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
    {
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
    },
  );

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
  assert.equal(payload.id, runRow.id);
  assert.deepEqual(payload.run, { distance_meters: 5000, duration_seconds: 1650 });
});
