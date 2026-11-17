-- 헬스 루틴 권한·제약 검증. 로컬 DB에서 실행하고 마지막에 롤백하므로 데이터가 남지 않는다.
-- 실행: docker exec -i supabase_db_sweat-log psql -U postgres -v ON_ERROR_STOP=1 -q < supabase/tests/workout-routines.sql
--
-- 등장인물
--   A(민수): 루틴 주인. 크루를 만든다
--   B(지은): A와 같은 크루. 기록은 서로 보지만 루틴은 못 본다
--   C(태호): 크루 밖 사람

begin;

insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('00000000-0000-0000-0000-00000000002a', 'routine-a@test.dev', '{"nickname":"민수"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000002b', 'routine-b@test.dev', '{"nickname":"지은"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000002c', 'routine-c@test.dev', '{"nickname":"태호"}', 'authenticated', 'authenticated');

create temporary table ctx (invite_code text, routine_id uuid, workout_id uuid);
grant all on ctx to authenticated;
insert into ctx default values;

-- 넣었을 때 check 제약으로 거절돼야 하는 exercises
create function pg_temp.expect_invalid(p_name text, p_exercises jsonb) returns void
  language plpgsql
as $$
begin
  insert into public.workout_routines (name, exercises) values (p_name, p_exercises);
  raise exception '거절돼야 하는데 저장됐다: % %', p_name, p_exercises;
exception when check_violation then
  null;
end;
$$;

set local role authenticated;

-- A가 크루를 만들고 B가 들어온다
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000002a","role":"authenticated"}', true);
update ctx set invite_code = (select invite_code from public.create_crew('루틴크루'));

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000002b","role":"authenticated"}', true);
select public.join_crew_by_code((select invite_code from ctx));

-- ---------------------------------------------------------------------------
-- A: 만들기·읽기·고치기
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000002a","role":"authenticated"}', true);

with created as (
  insert into public.workout_routines (name, exercises)
  values ('하체 데이', '[
    {"name":"스쿼트","sets":[{"weight_kg":60,"reps":10},{"weight_kg":70.5,"reps":8}]},
    {"name":"런지","sets":[{"weight_kg":null,"reps":15}]}
  ]')
  returning id
)
update ctx set routine_id = (select id from created);

do $$
begin
  assert (select count(*) from public.workout_routines) = 1, 'A는 자기 루틴을 본다';
  assert (select user_id from public.workout_routines) = '00000000-0000-0000-0000-00000000002a',
    '주인은 로그인한 사람이다';
  assert (select exercises -> 0 -> 'sets' -> 1 ->> 'weight_kg' from public.workout_routines) = '70.5',
    '무게는 소수 그대로 남는다';
end $$;

-- 루틴으로 채운 헬스 기록을 저장한다. 기록은 루틴과 따로 저장된다.
update ctx set workout_id = public.save_workout(
  '{"kind":"strength","workout_date":"2026-11-13","title":null,"memo":null,"place_name":null,
    "crew_id":null,"companion_ids":[],"duration_seconds":null,"run":null,
    "exercises":[{"name":"스쿼트","sets":[{"weight_kg":60,"reps":10},{"weight_kg":70.5,"reps":8}]},
                 {"name":"런지","sets":[{"weight_kg":null,"reps":15}]}]}'
);

update public.workout_routines
set name = '하체 데이 (증량)', exercises = '[{"name":"스쿼트","sets":[{"weight_kg":80,"reps":5}]}]'
where id = (select routine_id from ctx);

do $$
begin
  assert (select name from public.workout_routines) = '하체 데이 (증량)', 'A는 자기 루틴을 고친다';
  assert (select count(*) from public.strength_sets where workout_id = (select workout_id from ctx)) = 3,
    '루틴을 고쳐도 이미 저장한 기록의 세트는 그대로다';
  assert (select max(weight_kg) from public.strength_sets where workout_id = (select workout_id from ctx)) = 70.5,
    '루틴을 고쳐도 이미 저장한 기록의 무게는 그대로다';
end $$;

-- 넣을 때 정할 수 있는 칸은 이름과 구성뿐이다. id·주인·시각은 기본값이 정한다.
do $$
begin
  begin
    insert into public.workout_routines (id, name, exercises)
    values ('00000000-0000-4000-8000-0000000000ff', 'id 지정', '[{"name":"스쿼트","sets":[{"weight_kg":1,"reps":1}]}]');
    raise exception 'id를 직접 넣었다';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.workout_routines (user_id, name, exercises)
    values ('00000000-0000-0000-0000-00000000002a', '내 id라도', '[{"name":"스쿼트","sets":[{"weight_kg":1,"reps":1}]}]');
    raise exception 'user_id를 직접 넣었다';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.workout_routines (name, exercises, created_at, updated_at)
    values ('시각 지정', '[{"name":"스쿼트","sets":[{"weight_kg":1,"reps":1}]}]', '2000-01-01', '2000-01-01');
    raise exception '만든 시각을 직접 넣었다';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- 주인·id·만든 시각은 바꿀 수 없다
do $$
begin
  begin
    update public.workout_routines set id = gen_random_uuid();
    raise exception '루틴 id를 바꿨다';
  exception when insufficient_privilege then
    null;
  end;
  begin
    update public.workout_routines set user_id = '00000000-0000-0000-0000-00000000002b';
    raise exception '루틴 주인을 남으로 바꿨다';
  exception when insufficient_privilege then
    null;
  end;
  begin
    update public.workout_routines set created_at = now() - interval '1 day';
    raise exception '만든 시각을 바꿨다';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 상한과 모양
-- ---------------------------------------------------------------------------
select pg_temp.expect_invalid('', '[{"name":"스쿼트","sets":[{"weight_kg":60,"reps":10}]}]');
select pg_temp.expect_invalid('   ', '[{"name":"스쿼트","sets":[{"weight_kg":60,"reps":10}]}]');
select pg_temp.expect_invalid(' 앞뒤 공백 ', '[{"name":"스쿼트","sets":[{"weight_kg":60,"reps":10}]}]');
select pg_temp.expect_invalid(repeat('가', 41), '[{"name":"스쿼트","sets":[{"weight_kg":60,"reps":10}]}]');
select pg_temp.expect_invalid('빈 루틴', '[]');
select pg_temp.expect_invalid('배열 아님', '{"name":"스쿼트"}');
select pg_temp.expect_invalid('종목 21개', (
  select jsonb_agg(jsonb_build_object('name', '종목' || n, 'sets', '[{"weight_kg":10,"reps":10}]'::jsonb))
  from generate_series(1, 21) as n
));
select pg_temp.expect_invalid('세트 31개', jsonb_build_array(jsonb_build_object('name', '스쿼트', 'sets', (
  select jsonb_agg('{"weight_kg":10,"reps":10}'::jsonb) from generate_series(1, 31)
))));
select pg_temp.expect_invalid('세트 없음', '[{"name":"스쿼트","sets":[]}]');
select pg_temp.expect_invalid('이름 없음', '[{"name":" ","sets":[{"weight_kg":60,"reps":10}]}]');
select pg_temp.expect_invalid('이름 51자', jsonb_build_array(jsonb_build_object('name', repeat('가', 51),
  'sets', '[{"weight_kg":60,"reps":10}]'::jsonb)));
select pg_temp.expect_invalid('이름 숫자', '[{"name":1,"sets":[{"weight_kg":60,"reps":10}]}]');
select pg_temp.expect_invalid('횟수 0', '[{"name":"스쿼트","sets":[{"weight_kg":60,"reps":0}]}]');
select pg_temp.expect_invalid('횟수 소수', '[{"name":"스쿼트","sets":[{"weight_kg":60,"reps":1.5}]}]');
select pg_temp.expect_invalid('횟수 1001', '[{"name":"스쿼트","sets":[{"weight_kg":60,"reps":1001}]}]');
select pg_temp.expect_invalid('횟수 문자', '[{"name":"스쿼트","sets":[{"weight_kg":60,"reps":"10"}]}]');
select pg_temp.expect_invalid('무게 음수', '[{"name":"스쿼트","sets":[{"weight_kg":-1,"reps":10}]}]');
select pg_temp.expect_invalid('무게 1000 초과', '[{"name":"스쿼트","sets":[{"weight_kg":1000.01,"reps":10}]}]');
select pg_temp.expect_invalid('무게 셋째 자리', '[{"name":"스쿼트","sets":[{"weight_kg":1.234,"reps":10}]}]');
select pg_temp.expect_invalid('무게 키 없음', '[{"name":"스쿼트","sets":[{"reps":10}]}]');
select pg_temp.expect_invalid('모르는 키', '[{"name":"스쿼트","sets":[{"weight_kg":60,"reps":10,"rpe":8}]}]');
select pg_temp.expect_invalid('모르는 종목 키', '[{"name":"스쿼트","memo":"x","sets":[{"weight_kg":60,"reps":10}]}]');

select pg_temp.expect_invalid(repeat('💪', 41), '[{"name":"스쿼트","sets":[{"weight_kg":60,"reps":10}]}]');

-- 경계값은 받는다. 이름 길이는 코드 포인트(char_length)로 세서 이모지 40개도 된다.
insert into public.workout_routines (name, exercises)
values (repeat('💪', 40), '[{"name":"스쿼트","sets":[{"weight_kg":60,"reps":10}]}]');

insert into public.workout_routines (name, exercises)
select repeat('가', 40), jsonb_agg(jsonb_build_object('name', repeat('나', 50), 'sets', (
  select jsonb_agg(jsonb_build_object('weight_kg', 1000, 'reps', 1000)) from generate_series(1, 30)
)))
from generate_series(1, 20);

-- 개수 상한 트리거는 profiles 행을 FOR NO KEY UPDATE로 잠근다(FK가 거는 KEY SHARE와 부딪히지 않는 세기).
do $$
begin
  assert (
    select prosrc like '%for no key update%' from pg_proc where proname = 'limit_workout_routines'
  ), '개수 상한 잠금은 for no key update다';
end $$;

-- 한 사람당 30개까지
insert into public.workout_routines (name, exercises)
select '루틴' || n, '[{"name":"푸시업","sets":[{"weight_kg":null,"reps":20}]}]'
from generate_series(1, 27) as n;

do $$
begin
  assert (select count(*) from public.workout_routines) = 30, 'A는 루틴 30개를 가진다';
  begin
    insert into public.workout_routines (name, exercises)
    values ('31번째', '[{"name":"푸시업","sets":[{"weight_kg":null,"reps":20}]}]');
    raise exception '31번째 루틴이 저장됐다';
  exception when check_violation then
    assert sqlerrm = 'too_many_routines', '개수 상한 오류는 too_many_routines다';
  end;
end $$;

-- ---------------------------------------------------------------------------
-- B(같은 크루), C(크루 밖): 남의 루틴은 읽지도 고치지도 지우지도 못한다
-- ---------------------------------------------------------------------------
create function pg_temp.expect_no_access(p_label text) returns void
  language plpgsql
as $$
declare
  changed integer;
begin
  assert (select count(*) from public.workout_routines) = 0, p_label || '는 남의 루틴을 못 본다';
  assert (select count(*) from public.workout_routines where id = (select routine_id from ctx)) = 0,
    p_label || '는 id로도 남의 루틴을 못 본다';

  update public.workout_routines set name = '빼앗음' where id = (select routine_id from ctx);
  get diagnostics changed = row_count;
  assert changed = 0, p_label || '는 남의 루틴을 고치지 못한다';

  delete from public.workout_routines where id = (select routine_id from ctx);
  get diagnostics changed = row_count;
  assert changed = 0, p_label || '는 남의 루틴을 지우지 못한다';

  begin
    insert into public.workout_routines (user_id, name, exercises)
    values ('00000000-0000-0000-0000-00000000002a', '끼워 넣기', '[{"name":"스쿼트","sets":[{"weight_kg":1,"reps":1}]}]');
    raise exception '% 가 남의 이름으로 루틴을 넣었다', p_label;
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000002b","role":"authenticated"}', true);
select pg_temp.expect_no_access('B');

-- B는 자기 루틴을 만들 수 있고, A의 30개 상한과 상관없다
insert into public.workout_routines (name, exercises)
values ('상체', '[{"name":"벤치프레스","sets":[{"weight_kg":40,"reps":10}]}]');

do $$
begin
  assert (select count(*) from public.workout_routines) = 1, 'B는 자기 루틴만 본다';
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000002c","role":"authenticated"}', true);
select pg_temp.expect_no_access('C');

-- A가 지운다
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000002a","role":"authenticated"}', true);
delete from public.workout_routines where id = (select routine_id from ctx);

do $$
begin
  assert (select count(*) from public.workout_routines where id = (select routine_id from ctx)) = 0, 'A는 자기 루틴을 지운다';
  assert (select count(*) from public.strength_sets where workout_id = (select workout_id from ctx)) = 3,
    '루틴을 지워도 기록은 그대로다';
end $$;

-- ---------------------------------------------------------------------------
-- 로그인하지 않은 사람
-- ---------------------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
begin
  begin
    perform 1 from public.workout_routines;
    raise exception '익명이 루틴 테이블을 읽었다';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;
select 'workout-routines: all checks passed' as result;

rollback;
