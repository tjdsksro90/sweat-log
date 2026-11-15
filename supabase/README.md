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
```

## 기록 저장·목록 함수

- `save_workout(p_input jsonb) returns uuid`: 공통 정보, 러닝 상세 또는 헬스 세트, 함께한 친구를 한 트랜잭션으로 저장한다. `id`가 있으면 수정이다. 입력 모양과 오류 코드(`invalid_workout_detail` 등)는 마이그레이션 주석에 있다. 앱에서는 `toSaveWorkoutPayload`(`src/entities/workout/model/workout-mappers.ts`)로 입력을 만든다.
- `list_workouts(...) returns setof workouts`: 내 기록(작성 + 함께한) 또는 크루 피드를 고르고 커서로 이어 본다. 앱에서는 `getWorkoutPage`(`src/entities/workout/api/server-queries.ts`)로 부른다.
- 둘 다 `security invoker`라서 권한은 RLS가 판단한다. 기록 삭제는 함수 없이 `workouts`를 지우면 상세가 cascade로 지워진다.
