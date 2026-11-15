# A. DB·서버 — Claude

브랜치: `feat/workout-db`

## 목표

운동 기록을 한 번에 저장하는 RPC와, 화면이 쓰는 조회 함수를 만든다. B와 C는 이 결과를 `contracts.ts` 모양으로 받는다.

## 만들 것

1. 새 마이그레이션 (`pnpm db:migration:new workout_rpc`)
   - `public.save_workout(p_input jsonb) returns uuid`
     - 입력은 `WorkoutInput`(contracts.ts)을 snake_case로 바꾼 JSON. `id`가 있으면 수정, 없으면 생성.
     - 공통 정보, `run_details` 또는 `strength_sets`, `workout_companions`를 한 트랜잭션에서 저장한다. 수정이면 상세와 동행자를 지우고 다시 넣는다.
     - 종류와 상세가 맞지 않으면(러닝인데 run이 없음 등) 예외를 던진다.
     - `security invoker`로 만들어 RLS가 그대로 적용되게 한다.
   - 주간 요약이 SQL로 더 쉬우면 `public.get_weekly_summary(p_week_start date)`를 만든다.
2. 조회 함수: `src/entities/workout/api/server-queries.ts` (`import "server-only"`)
   - `getWorkoutPage(filter: WorkoutListFilter): Promise<WorkoutPage>` — 날짜 내림차순, 커서 페이지(20개)
   - `getWorkoutDetail(id: string): Promise<WorkoutDetail | null>`
   - `getWeeklySummary(today?: string): Promise<WeeklySummary>` — 월요일 시작 주, 한국 시간 기준
   - DB 행 → 계약 타입 변환은 `src/entities/workout/model/`의 순수 함수로 두고 테스트한다.
3. SQL 테스트: `supabase/tests/save-workout.sql` (access-control.sql과 같은 방식, 롤백)
4. `pnpm db:types`로 타입 재생성

## 수정 가능

`supabase/`, `src/shared/api/supabase/`, `src/entities/workout/api/`, `src/entities/workout/model/`(contracts.ts는 필드 추가만)

## 하지 않을 것

화면, Server Action(B가 만든다), 크루 기능(D)

## 완료 조건

- `save-workout.sql`과 `access-control.sql`이 모두 통과
- 변환 함수 테스트 통과, tsc, biome
- PR 설명에 B·C가 쓸 함수 이름과 사용 예시를 적는다
