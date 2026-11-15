-- get_workout_streak 검증. 로컬 DB에서 실행하고 마지막에 롤백하므로 데이터가 남지 않는다.
-- 실행: docker exec -i supabase_db_sweat-log psql -U postgres -v ON_ERROR_STOP=1 -q < supabase/tests/workout-streak.sql

begin;

insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.dev', '{"nickname":"민수"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.dev', '{"nickname":"지은"}', 'authenticated', 'authenticated');

set local role authenticated;

-- B: 2026-11-14까지 날마다 운동했다. A의 연속 일수에 섞이면 안 된다.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
insert into public.workouts (kind, workout_date)
select 'other', day::date from generate_series('2026-10-01'::date, '2026-11-14'::date, interval '1 day') as day;

-- A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
begin
  assert public.get_workout_streak('2026-11-14') = 0, '기록이 없으면 0';
end $$;

-- 2025-10-10 ~ 2026-11-13 하루도 안 빠짐(400일). 하루 세 건씩이라 1,200행이다.
insert into public.workouts (kind, workout_date)
select 'other', day::date
from generate_series('2025-10-10'::date, '2026-11-13'::date, interval '1 day') as day,
  generate_series(1, 3);

-- 그 앞은 하루 비고(2025-10-09) 다시 운동한 날
insert into public.workouts (kind, workout_date) values ('other', '2025-10-08');

-- 기준일 뒤의 기록(미리 적어 둔 계획)은 세지 않는다.
insert into public.workouts (kind, workout_date) values ('other', '2026-11-20');

do $$
begin
  assert public.get_workout_streak('2026-11-13') = 400, '오늘 운동했으면 오늘부터 센다(조회 기간·행 제한에 잘리지 않는다)';
  assert public.get_workout_streak('2026-11-14') = 400, '오늘 아직 안 했으면 어제부터 센다';
  assert public.get_workout_streak('2026-11-15') = 0, '어제도 안 했으면 끊겼다';
  assert public.get_workout_streak('2025-10-09') = 1, '빈 날 다음 날 기준이면 전날 하루만 이어진다';
  assert public.get_workout_streak('2026-11-20') = 1, '기준일 당일 기록만 있으면 1';
end $$;

-- 오늘 운동하면 하루 늘어난다.
insert into public.workouts (kind, workout_date) values ('other', '2026-11-14');

do $$
begin
  assert public.get_workout_streak('2026-11-14') = 401, '오늘 기록이 더해진다';
end $$;

-- 익명 사용자는 부를 수 없다.
reset role;
set local role anon;

do $$
begin
  begin
    perform public.get_workout_streak('2026-11-14');
    raise exception '익명 사용자가 get_workout_streak을 불렀다';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;
select 'workout-streak: all checks passed' as result;

rollback;
