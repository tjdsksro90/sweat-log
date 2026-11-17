# DB

## 구조

```text
auth.users ─1:1─ profiles
profiles ─< crew_members >─ crews            (초대 코드로 가입)
profiles ─< workouts ─┬─ run_details         (러닝: 거리, 시간)
                      ├─< strength_sets      (헬스: 종목, 세트, 무게, 횟수)
                      ├─< workout_companions (함께한 크루 친구)
                      └─< workout_comments
```

## 권한 (RLS)

- 기록, 상세, 댓글은 작성자, 함께한 친구, 기록을 공유한 크루(`workouts.crew_id`)의 구성원만 본다.
- 기록과 상세의 추가·수정·삭제는 작성자만 한다. 함께한 친구는 같은 크루 구성원만 지정할 수 있다.
- 프로필은 본인과 같은 크루 친구의 것만 본다.
- 크루 생성과 가입은 `create_crew`, `join_crew_by_code` 함수로만 한다.
- 권한 확인 함수는 노출되지 않는 `private` 스키마에 둔다.

## 로컬 개발

Docker Desktop을 켠 뒤 실행한다.

```sh
pnpm db:start     # 로컬 Supabase 시작. 출력된 API URL과 publishable key를 .env.local에 넣는다
pnpm db:reset     # 마이그레이션을 처음부터 다시 적용
pnpm db:types     # src/shared/api/supabase/database.types.ts 재생성
```

## 변경 적용

- 새 변경은 `pnpm db:migration:new <이름>`으로 새 파일을 만든다. 이미 적용한 마이그레이션 파일은 고치지 않는다.
- 스키마를 바꾸면 같은 PR에서 `pnpm db:types`로 타입을 다시 만든다.
- 클라우드 프로젝트 반영: `pnpm db:push:dry-run`으로 확인한 뒤 `pnpm db:push`.

## 권한 검증

권한을 바꾸면 아래 검증을 다시 돌린다. 트랜잭션을 롤백하므로 데이터가 남지 않는다.

```sh
docker exec -i supabase_db_sweat-log psql -U postgres -v ON_ERROR_STOP=1 -q < supabase/tests/access-control.sql
docker exec -i supabase_db_sweat-log psql -U postgres -v ON_ERROR_STOP=1 -q < supabase/tests/save-workout.sql
docker exec -i supabase_db_sweat-log psql -U postgres -v ON_ERROR_STOP=1 -q < supabase/tests/workout-streak.sql
docker exec -i supabase_db_sweat-log psql -U postgres -v ON_ERROR_STOP=1 -q < supabase/tests/running-stats.sql
docker exec -i supabase_db_sweat-log psql -U postgres -v ON_ERROR_STOP=1 -q < supabase/tests/strength-records.sql
```

## 기록 저장·목록 함수

- `save_workout(p_input jsonb) returns uuid`: 공통 정보, 러닝 상세 또는 헬스 세트, 함께한 친구를 한 트랜잭션으로 저장한다. `id`가 있으면 수정이다. 입력 모양과 오류 코드(`invalid_workout_detail` 등)는 마이그레이션 주석에 있다. 앱에서는 `toSaveWorkoutPayload`(`src/entities/workout/model/workout-mappers.ts`)로 입력을 만든다.
- `list_workouts(...) returns setof workouts`: 내 기록(작성 + 함께한) 또는 크루 피드를 고르고 커서로 이어 본다. 앱에서는 `getWorkoutPage`(`src/entities/workout/api/server-queries.ts`)로 부른다.
- `get_workout_streak(p_today date) returns integer`: 내가 작성한 기록의 연속 운동 일수. 오늘 안 했으면 어제부터 센다. 앱에서는 `getWeeklySummary`가 부른다.
- `get_running_monthly_distance(p_today date, p_months integer default 12)`: 최근 n개월(이번 달 포함, 1~24) 월별 러닝 거리·횟수. 빈 달도 0으로 준다.
- `get_running_records(p_today date)`: 최고 페이스(1km 이상), 5km·10km 이상 최고 페이스, 최장 거리·시간. 해당 러닝이 없으면 그 행이 없다.
- 러닝 통계 두 함수는 내가 작성했거나 함께한 친구로 들어간 러닝만 센다. 크루에 공유만 된 친구의 러닝은 넣지 않는다. 앱에서는 `getRunningStats`가 부르고, 체험은 같은 규칙의 `buildRunningStats`(`src/entities/workout/model/running-stats.ts`)로 집계한다.
- `get_strength_records(p_today date, p_limit integer default 5)`: 내가 작성했거나 동행자로 포함된 헬스의 종목별 최고 무게·최초 달성 날짜·기록 ID·운동 횟수를 반환한다. 기준일 뒤의 기록과 크루 공유만 받은 기록은 제외한다. 이름의 공백을 모두 제거해 합치고, 서로 다른 운동 기록 수가 많은 순으로 최대 `p_limit`개(1~20)를 반환한다. 같은 무게는 날짜·작성 시각·ID 순으로 처음 기록을 택한다. 무게가 모두 비어 있으면 `max_weight_kg`는 null이고 날짜는 첫 맨몸 기록 날짜다. 실제 앱은 RPC로 집계하며, 데모만 `entities/exercise/model/build-strength-records.ts`의 같은 규칙을 사용한다.
- 모두 `security invoker`라서 권한은 RLS가 판단한다. 기록 삭제는 함수 없이 `workouts`를 지우면 상세가 cascade로 지워진다.
