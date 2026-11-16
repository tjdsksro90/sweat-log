-- get_running_monthly_distance, get_running_records 검증. 로컬 DB에서 실행하고 마지막에 롤백하므로 데이터가 남지 않는다.
-- 실행: docker exec -i supabase_db_sweat-log psql -U postgres -v ON_ERROR_STOP=1 -q < supabase/tests/running-stats.sql
--
-- A와 B는 같은 크루, C는 A와 크루가 없다.
-- 통계에 들어가는 것: A가 쓴 러닝, B가 A를 동행자로 넣은 러닝
-- 들어가면 안 되는 것: B가 크루에 공유만 한 러닝(A가 볼 수는 있음), B의 비공유 러닝, C의 러닝, A의 다른 종류 기록,
--                      기준일 뒤의 러닝

begin;

insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.dev', '{"nickname":"민수"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.dev', '{"nickname":"지은"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.dev', '{"nickname":"도윤"}', 'authenticated', 'authenticated');

set local role authenticated;

-- A가 크루를 만들고 B가 들어온다.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
begin
  assert (select count(*) from public.get_running_monthly_distance('2026-11-16', 12) where distance_meters > 0) = 0,
    '기록이 없으면 모든 달이 0';
  assert (select count(*) from public.get_running_monthly_distance('2026-11-16', 12)) = 12, '빈 달도 12개월을 채운다';
  assert (select count(*) from public.get_running_records('2026-11-16')) = 0, '기록이 없으면 개인 기록도 없다';
end $$;

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;

create temp table crew_ctx (id uuid, invite_code text) on commit drop;
grant all on crew_ctx to authenticated;
insert into crew_ctx select id, invite_code from public.create_crew('러닝크루');
insert into ids select 'crew', id from crew_ctx;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select public.join_crew_by_code((select invite_code from crew_ctx));

-- B의 러닝
-- 1) 크루 공유, A가 동행자: 들어간다. 10월 31일(월 경계 바로 앞) 12km 62분(페이스 5:10) → 10km 기록 후보
insert into ids select 'b_with_a', public.save_workout(jsonb_build_object(
  'kind', 'run', 'workout_date', '2026-10-31', 'crew_id', (select id from ids where name = 'crew'),
  'companion_ids', jsonb_build_array('00000000-0000-0000-0000-00000000000a'),
  'run', jsonb_build_object('distance_meters', 12000, 'duration_seconds', 3720)));
-- 2) 크루 공유만: A가 볼 수 있지만 A의 러닝이 아니다. 아주 빠르고 길다.
insert into ids select 'b_shared', public.save_workout(jsonb_build_object(
  'kind', 'run', 'workout_date', '2026-11-02', 'crew_id', (select id from ids where name = 'crew'),
  'run', jsonb_build_object('distance_meters', 42195, 'duration_seconds', 7200)));
-- 3) 비공유: A는 볼 수도 없다.
insert into ids select 'b_private', public.save_workout(jsonb_build_object(
  'kind', 'run', 'workout_date', '2026-11-03',
  'run', jsonb_build_object('distance_meters', 30000, 'duration_seconds', 6000)));

-- C의 러닝(A와 크루 없음)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
select public.save_workout(jsonb_build_object(
  'kind', 'run', 'workout_date', '2026-11-04',
  'run', jsonb_build_object('distance_meters', 20000, 'duration_seconds', 4000)));

-- A의 기록
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

-- 11월 1일(월 경계 바로 뒤) 5km 25분 → 페이스 5:00, 5km 기록
insert into ids select 'a_5k', public.save_workout(jsonb_build_object(
  'kind', 'run', 'workout_date', '2026-11-01',
  'run', jsonb_build_object('distance_meters', 5000, 'duration_seconds', 1500)));
-- 같은 페이스 5km를 나중에 또: 먼저 세운 기록이 남는다.
insert into ids select 'a_5k_tie', public.save_workout(jsonb_build_object(
  'kind', 'run', 'workout_date', '2026-11-10',
  'run', jsonb_build_object('distance_meters', 5000, 'duration_seconds', 1500)));
-- 800m 질주(페이스 3:45): 1km가 안 돼 최고 페이스 후보가 아니다. 월 거리에는 들어간다.
insert into ids select 'a_sprint', public.save_workout(jsonb_build_object(
  'kind', 'run', 'workout_date', '2026-11-05',
  'run', jsonb_build_object('distance_meters', 800, 'duration_seconds', 180)));
-- 3km 14분(페이스 4:40): 1km 이상 최고 페이스. 5km 기록 후보는 아니다.
insert into ids select 'a_3k', public.save_workout(jsonb_build_object(
  'kind', 'run', 'workout_date', '2026-11-06',
  'run', jsonb_build_object('distance_meters', 3000, 'duration_seconds', 840)));
-- 천천히 오래 걷듯 뛴 날: 최장 시간
insert into ids select 'a_long_time', public.save_workout(jsonb_build_object(
  'kind', 'run', 'workout_date', '2025-12-01',
  'run', jsonb_build_object('distance_meters', 8000, 'duration_seconds', 5400)));
-- 12개월 창 밖(2025-11-30): 월별에는 없고 개인 기록에는 들어간다.
insert into ids select 'a_old', public.save_workout(jsonb_build_object(
  'kind', 'run', 'workout_date', '2025-11-30',
  'run', jsonb_build_object('distance_meters', 1000, 'duration_seconds', 400)));
-- 기준일 뒤(계획): 어디에도 안 들어간다.
select public.save_workout(jsonb_build_object(
  'kind', 'run', 'workout_date', '2026-11-17',
  'run', jsonb_build_object('distance_meters', 50000, 'duration_seconds', 1)));
-- 다른 종류: 안 들어간다.
select public.save_workout(jsonb_build_object('kind', 'other', 'workout_date', '2026-11-07', 'duration_seconds', 9000));

do $$
declare
  v_ids jsonb := (select jsonb_object_agg(name, id) from ids);
begin
  assert (select count(*) from public.workouts where id = (v_ids ->> 'b_shared')::uuid) = 1,
    '전제: A는 크루에 공유된 B의 러닝을 볼 수 있다';
  assert (select count(*) from public.workouts where id = (v_ids ->> 'b_private')::uuid) = 0,
    '전제: A는 B의 비공유 러닝을 볼 수 없다';

  -- 월별 누적
  assert (select count(*) from public.get_running_monthly_distance('2026-11-16', 12)) = 12, '12개월';
  assert (select min(month) from public.get_running_monthly_distance('2026-11-16', 12)) = '2025-12-01', '첫 달';
  assert (select max(month) from public.get_running_monthly_distance('2026-11-16', 12)) = '2026-11-01', '이번 달';
  assert (select distance_meters from public.get_running_monthly_distance('2026-11-16', 12) where month = '2026-11-01')
    = 5000 + 5000 + 800 + 3000, '11월: A의 러닝만(공유만 된 B 러닝, 남의 비공유 러닝, 기준일 뒤 러닝 제외)';
  assert (select run_count from public.get_running_monthly_distance('2026-11-16', 12) where month = '2026-11-01') = 4,
    '11월 러닝 횟수';
  assert (select distance_meters from public.get_running_monthly_distance('2026-11-16', 12) where month = '2026-10-01')
    = 12000, '10월 31일 동행 러닝은 10월';
  assert (select distance_meters from public.get_running_monthly_distance('2026-11-16', 12) where month = '2025-12-01')
    = 8000, '12개월 전 달의 1일은 들어간다';
  assert (select sum(distance_meters) from public.get_running_monthly_distance('2026-11-16', 12)) = 33800,
    '창 밖(2025-11-30)은 빠진다';
  assert (select count(*) from public.get_running_monthly_distance('2026-11-16', 0)) = 1, '개월 수는 1 이상';
  assert (select count(*) from public.get_running_monthly_distance('2026-11-16', 100)) = 24, '개월 수는 24 이하';
  assert (select count(*) from public.get_running_monthly_distance('2026-11-16', null)) = 12, '기본 12개월';
  assert (select distance_meters from public.get_running_monthly_distance('2026-10-31', 1)) = 12000,
    '기준일이 10월 31일이면 이번 달은 10월';

  -- 개인 기록
  assert (select workout_id from public.get_running_records('2026-11-16') where record_type = 'best_pace')
    = (v_ids ->> 'a_3k')::uuid, '최고 페이스는 1km 이상 중에서(800m 질주 제외)';
  assert (select workout_id from public.get_running_records('2026-11-16') where record_type = 'best_pace_5k')
    = (v_ids ->> 'a_5k')::uuid, '5km 이상 최고 페이스, 같은 페이스면 먼저 세운 기록';
  assert (select workout_id from public.get_running_records('2026-11-16') where record_type = 'best_pace_10k')
    = (v_ids ->> 'b_with_a')::uuid, '10km 기록은 동행으로 함께 뛴 러닝';
  assert (select workout_id from public.get_running_records('2026-11-16') where record_type = 'longest_distance')
    = (v_ids ->> 'b_with_a')::uuid, '최장 거리(공유만 된 42km, 남의 30km 제외)';
  assert (select workout_id from public.get_running_records('2026-11-16') where record_type = 'longest_duration')
    = (v_ids ->> 'a_long_time')::uuid, '최장 시간';
  assert (select distance_meters from public.get_running_records('2026-11-16') where record_type = 'longest_distance')
    = 12000, '거리와 시간을 함께 돌려준다';
  assert (select distance_meters from public.get_running_records('2026-11-16') where record_type = 'longest_distance')
    = 12000, '기준일 뒤 50km 계획은 아직 기록이 아니다';
  assert (select distance_meters from public.get_running_records('2026-11-17') where record_type = 'longest_distance')
    = 50000, '기준일 당일 러닝은 들어간다';
  assert not exists (select 1 from public.get_running_records('2026-10-30') where record_type = 'best_pace_10k'),
    '해당 러닝이 없으면 그 종류의 행이 없다';
end $$;

-- B 입장: B는 자기가 쓴 러닝(동행 포함 여부와 무관)을 모두 센다. A의 기록은 섞이지 않는다.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

do $$
begin
  assert (select sum(distance_meters) from public.get_running_monthly_distance('2026-11-16', 12))
    = 12000 + 42195 + 30000, 'B는 자기 러닝 세 건';
  assert (select distance_meters from public.get_running_records('2026-11-16') where record_type = 'longest_distance')
    = 42195, 'B의 최장 거리';
end $$;

-- C 입장: A·B의 러닝은 보이지도 세지지도 않는다.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);

do $$
begin
  assert (select sum(distance_meters) from public.get_running_monthly_distance('2026-11-16', 12)) = 20000, 'C는 자기 러닝만';
  assert (select count(*) from public.get_running_records('2026-11-16')) = 5, 'C의 20km 러닝이 모든 기록';
end $$;

-- 익명 사용자는 부를 수 없다.
reset role;
set local role anon;

do $$
begin
  begin
    perform public.get_running_monthly_distance('2026-11-16', 12);
    raise exception '익명 사용자가 get_running_monthly_distance를 불렀다';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.get_running_records('2026-11-16');
    raise exception '익명 사용자가 get_running_records를 불렀다';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;
select 'running-stats: all checks passed' as result;

rollback;
