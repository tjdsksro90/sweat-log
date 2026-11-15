-- save_workout, list_workouts 검증. 로컬 DB에서 실행하고 마지막에 롤백하므로 데이터가 남지 않는다.
-- 실행: docker exec -i supabase_db_sweat-log psql -U postgres -v ON_ERROR_STOP=1 -q < supabase/tests/save-workout.sql
--
-- 등장인물
--   A(민수): 크루 '새벽러닝' 만든 사람
--   B(지은): 같은 크루
--   C(태호): 크루 밖 사람

begin;

insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.dev', '{"nickname":"민수"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.dev', '{"nickname":"지은"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.dev', '{"nickname":"태호"}', 'authenticated', 'authenticated');

create temporary table ctx (crew_id uuid, invite_code text, run_id uuid, strength_id uuid, other_id uuid, c_workout uuid);
grant all on ctx to authenticated;
insert into ctx default values;

-- 오류 코드를 확인하는 도우미. 기대한 message로 실패해야 통과한다.
create function pg_temp.expect_error(p_input jsonb, p_code text) returns void
  language plpgsql
as $$
begin
  perform public.save_workout(p_input);
  raise exception '% 이어야 하는데 저장되었다: %', p_code, p_input;
exception when raise_exception then
  if sqlerrm <> p_code then
    raise exception '% 이어야 하는데 % 로 실패했다', p_code, sqlerrm;
  end if;
end;
$$;

set local role authenticated;

-- A가 크루를 만들고 B가 들어온다
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
update ctx set (crew_id, invite_code) = (select id, invite_code from public.create_crew('새벽러닝'));

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select public.join_crew_by_code((select invite_code from ctx));

-- C는 크루 밖에서 자기 기록을 하나 남긴다
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
update ctx set c_workout = public.save_workout(
  '{"kind":"other","workout_date":"2026-11-10","duration_seconds":1800,"title":null,"memo":null,"place_name":null,
    "crew_id":null,"companion_ids":[],"run":null,"exercises":[]}'
);

-- ---------------------------------------------------------------------------
-- A: 생성
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

update ctx set run_id = public.save_workout(jsonb_build_object(
  'kind', 'run', 'workout_date', '2026-11-14', 'title', '한강 새벽 러닝', 'memo', null, 'place_name', '반포한강공원',
  'crew_id', (select crew_id from ctx),
  'companion_ids', jsonb_build_array('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b',
    '00000000-0000-0000-0000-00000000000a'),
  'duration_seconds', null,
  'run', jsonb_build_object('distance_meters', 7200, 'duration_seconds', 2430),
  'exercises', '[]'::jsonb
));

update ctx set strength_id = public.save_workout(
  '{"kind":"strength","workout_date":"2026-11-13","title":"하체 데이","memo":"스쿼트 무게 올림","place_name":null,
    "crew_id":null,"companion_ids":[],"duration_seconds":3900,"run":null,
    "exercises":[
      {"name":" 스쿼트 ","sets":[{"weight_kg":60,"reps":10},{"weight_kg":70.5,"reps":8}]},
      {"name":"런지","sets":[{"weight_kg":null,"reps":15}]}
    ]}'
);

do $$
declare
  v ctx;
begin
  select * into v from ctx;

  assert (select count(*) from public.workouts where user_id = '00000000-0000-0000-0000-00000000000a') = 2,
    'A의 기록 2개가 생긴다';
  assert (select user_id from public.workouts where id = v.run_id) = '00000000-0000-0000-0000-00000000000a',
    '작성자는 로그인한 사람이다';
  assert (select duration_seconds from public.workouts where id = v.run_id) is null,
    '러닝의 전체 시간은 비워 둔다';
  assert (select (distance_meters, duration_seconds) = (7200, 2430) from public.run_details where workout_id = v.run_id),
    '러닝 상세가 저장된다';
  assert (select array_agg(user_id) from public.workout_companions where workout_id = v.run_id)
    = array['00000000-0000-0000-0000-00000000000b'::uuid],
    '동행자는 중복과 작성자 본인을 빼고 저장된다';

  assert (select count(*) from public.strength_sets where workout_id = v.strength_id) = 3, '세트 3줄이 저장된다';
  assert (
    select array_agg(exercise_name || ':' || exercise_order || ':' || set_order || ':' || coalesce(weight_kg::text, '-') || 'x' || reps
      order by exercise_order, set_order)
    from public.strength_sets where workout_id = v.strength_id
  ) = array['스쿼트:0:0:60.00x10', '스쿼트:0:1:70.50x8', '런지:1:0:-x15'],
    '종목 이름은 다듬고, 종목·세트 순서와 맨몸 운동(무게 없음)이 저장된다';
  assert not exists (select 1 from public.run_details where workout_id = v.strength_id), '헬스에는 러닝 상세가 없다';
end $$;

-- ---------------------------------------------------------------------------
-- A: 수정. 헬스를 기타로 바꾸면 세트가 지워진다. 러닝 세부와 동행자는 다시 넣는다.
-- ---------------------------------------------------------------------------
select public.save_workout(jsonb_build_object(
  'id', (select strength_id from ctx),
  'kind', 'other', 'workout_date', '2026-11-12', 'title', '등산으로 바꿈', 'memo', null, 'place_name', '북한산',
  'crew_id', (select crew_id from ctx), 'companion_ids', jsonb_build_array('00000000-0000-0000-0000-00000000000b'),
  'duration_seconds', 10800, 'run', null, 'exercises', '[]'::jsonb
)) = (select strength_id from ctx) as same_id \gset
\if :same_id
\else
  \echo '수정하면 같은 id를 돌려줘야 한다'
  select 1 / 0;
\endif

select public.save_workout(jsonb_build_object(
  'id', (select run_id from ctx),
  'kind', 'run', 'workout_date', '2026-11-14', 'title', '한강 새벽 러닝', 'memo', '조금 더 뛰었다', 'place_name', null,
  'crew_id', null, 'companion_ids', '[]'::jsonb, 'duration_seconds', null,
  'run', jsonb_build_object('distance_meters', 8000, 'duration_seconds', 2700), 'exercises', '[]'::jsonb
));

do $$
declare
  v ctx;
begin
  select * into v from ctx;

  assert (select (kind, workout_date, duration_seconds, place_name) = ('other', '2026-11-12'::date, 10800, '북한산')
    from public.workouts where id = v.strength_id), '공통 정보가 수정된다';
  assert (select count(*) from public.strength_sets where workout_id = v.strength_id) = 0, '종류가 바뀌면 세트가 지워진다';
  assert (select count(*) from public.workout_companions where workout_id = v.strength_id) = 1, '수정에서 동행자가 들어간다';

  assert (select distance_meters from public.run_details where workout_id = v.run_id) = 8000, '러닝 상세가 바뀐다';
  assert (select count(*) from public.run_details where workout_id = v.run_id) = 1, '러닝 상세는 한 줄이다';
  assert (select count(*) from public.workout_companions where workout_id = v.run_id) = 0, '빠진 동행자는 지워진다';
  assert (select crew_id from public.workouts where id = v.run_id) is null, '크루 공유를 끌 수 있다';
  assert (select count(*) from public.workouts) = 2, '수정은 새 기록을 만들지 않는다';
end $$;

-- ---------------------------------------------------------------------------
-- 잘못된 입력
-- ---------------------------------------------------------------------------
select pg_temp.expect_error('{"kind":"run","workout_date":"2026-11-14","run":null,"exercises":[]}', 'invalid_workout_detail');
select pg_temp.expect_error(
  '{"kind":"run","workout_date":"2026-11-14","run":{"distance_meters":5000,"duration_seconds":1500},
    "exercises":[{"name":"스쿼트","sets":[{"weight_kg":60,"reps":10}]}]}', 'invalid_workout_detail');
select pg_temp.expect_error(
  '{"kind":"run","workout_date":"2026-11-14","duration_seconds":1500,"run":{"distance_meters":5000,"duration_seconds":1500}}',
  'invalid_workout_detail');
select pg_temp.expect_error('{"kind":"strength","workout_date":"2026-11-14","exercises":[]}', 'invalid_workout_detail');
select pg_temp.expect_error('{"kind":"strength","workout_date":"2026-11-14","exercises":[{"name":"스쿼트","sets":[]}]}',
  'invalid_workout_detail');
select pg_temp.expect_error(
  '{"kind":"other","workout_date":"2026-11-14","run":{"distance_meters":5000,"duration_seconds":1500}}', 'invalid_workout_detail');
select pg_temp.expect_error('{"kind":"swim","workout_date":"2026-11-14"}', 'invalid_workout_input');
select pg_temp.expect_error('{"kind":"other"}', 'invalid_workout_input');
select pg_temp.expect_error('{"kind":"other","workout_date":"어제"}', 'invalid_workout_input');
select pg_temp.expect_error('{"kind":"other","workout_date":"2026-11-14","companion_ids":["not-a-uuid"]}', 'invalid_workout_input');
select pg_temp.expect_error('"run"', 'invalid_workout_input');

-- 크루 밖 C를 함께한 친구로, 모르는 크루에 공유
select pg_temp.expect_error(
  '{"kind":"other","workout_date":"2026-11-14","companion_ids":["00000000-0000-0000-0000-00000000000c"]}', 'invalid_companion');
select pg_temp.expect_error(
  '{"kind":"other","workout_date":"2026-11-14","crew_id":"00000000-0000-0000-0000-0000000000ff"}', 'invalid_crew');

-- C의 기록을 A가 고치려 하면 없는 기록처럼 보인다
select pg_temp.expect_error(
  jsonb_build_object('id', (select c_workout from ctx), 'kind', 'other', 'workout_date', '2026-11-14'), 'workout_not_found');

-- 값 범위는 테이블 check 제약이 막는다. 실패하면 앞서 저장한 공통 정보도 남지 않는다.
do $$
declare
  before_count bigint := (select count(*) from public.workouts);
begin
  begin
    perform public.save_workout(
      '{"kind":"strength","workout_date":"2026-11-14","exercises":[{"name":"스쿼트","sets":[{"weight_kg":60,"reps":0}]}]}');
    raise exception '횟수 0이 저장되었다';
  exception when check_violation then
    null;
  end;

  assert (select count(*) from public.workouts) = before_count, '상세 저장이 실패하면 기록도 남지 않는다';
end $$;

-- ---------------------------------------------------------------------------
-- B: 남의 기록 수정 불가, 함께한 기록은 내 목록에 보인다
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

select pg_temp.expect_error(
  jsonb_build_object('id', (select strength_id from ctx), 'kind', 'other', 'workout_date', '2026-11-14'), 'workout_not_found');

update ctx set other_id = public.save_workout(jsonb_build_object(
  'kind', 'other', 'workout_date', '2026-11-12', 'duration_seconds', 600,
  'crew_id', (select crew_id from ctx), 'companion_ids', '[]'::jsonb
));

do $$
declare
  v ctx;
begin
  select * into v from ctx;

  -- B의 내 기록: 내가 쓴 것(other_id) + 함께한 것(strength_id). A의 러닝은 크루 공유를 껐으니 안 보인다.
  assert (select array_agg(id order by id) from public.list_workouts())
    = (select array_agg(id order by id) from unnest(array[v.other_id, v.strength_id]) as id),
    'B의 내 기록은 작성 + 함께한 기록이다';

  -- 크루 피드: 크루에 공유된 기록
  assert (select count(*) from public.list_workouts(p_crew_id => v.crew_id)) = 2, '크루 피드에는 공유된 기록 2개';
  assert (select count(*) from public.list_workouts(p_kind => 'run')) = 0, '종류 필터';
  assert (select count(*) from public.list_workouts(p_from => '2026-11-13')) = 0, '기간 필터';
end $$;

-- ---------------------------------------------------------------------------
-- A: 목록 커서. (날짜, 작성 시각, id) 내림차순으로 끊김 없이 이어진다.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
declare
  first_page uuid[];
  last_row public.workouts;
  rest uuid[];
  everything uuid[];
begin
  select array_agg(id order by workout_date desc, created_at desc, id desc) into everything from public.list_workouts();
  assert array_length(everything, 1) = 2, 'A의 내 기록은 2개다(B가 쓴 기록에는 함께하지 않았다)';

  select * into last_row from public.list_workouts() order by workout_date desc, created_at desc, id desc limit 1;
  select array_agg(id order by workout_date desc, created_at desc, id desc) into rest
  from public.list_workouts(
    p_cursor_date => last_row.workout_date, p_cursor_created_at => last_row.created_at, p_cursor_id => last_row.id);

  assert array[last_row.id] || rest = everything, '첫 페이지 다음은 커서 뒤의 기록이다';
end $$;

-- C는 크루 피드를 넘겨봐도 아무것도 못 본다
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);

do $$
begin
  assert (select count(*) from public.list_workouts(p_crew_id => (select crew_id from ctx))) = 0, 'C는 남의 크루 피드를 못 본다';
  assert (select count(*) from public.list_workouts()) = 1, 'C는 자기 기록만 본다';
end $$;

-- 익명 사용자는 함수를 부를 수 없다
reset role;
set local role anon;

do $$
begin
  begin
    perform public.save_workout('{}');
    raise exception '익명 사용자가 save_workout을 불렀다';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;
select 'save-workout: all checks passed' as result;

rollback;
