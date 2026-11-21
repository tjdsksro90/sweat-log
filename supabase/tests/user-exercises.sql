-- 내 종목 권한·제약 검증. 로컬 DB에서 실행하고 마지막에 롤백하므로 데이터가 남지 않는다.
-- 실행: docker exec -i supabase_db_sweat-log psql -U postgres -v ON_ERROR_STOP=1 -q < supabase/tests/user-exercises.sql
--
-- 등장인물
--   A(민수): 종목 주인. 크루를 만든다
--   B(지은): A와 같은 크루. 기록은 서로 보지만 내 종목은 못 본다
--   C(태호): 크루 밖 사람

begin;

insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('00000000-0000-0000-0000-00000000003a', 'exercise-a@test.dev', '{"nickname":"민수"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000003b', 'exercise-b@test.dev', '{"nickname":"지은"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000003c', 'exercise-c@test.dev', '{"nickname":"태호"}', 'authenticated', 'authenticated');

create temporary table ctx (invite_code text, exercise_id uuid, workout_id uuid);
grant all on ctx to authenticated;
insert into ctx default values;

-- 넣었을 때 check 제약으로 거절돼야 하는 값
create function pg_temp.expect_invalid(p_name text, p_body_part text) returns void
  language plpgsql
as $$
begin
  insert into public.user_exercises (name, body_part) values (p_name, p_body_part);
  raise exception '거절돼야 하는데 저장됐다: % %', p_name, p_body_part;
exception when check_violation then
  null;
end;
$$;

-- 이름이 겹쳐 거절돼야 하는 값
create function pg_temp.expect_duplicate(p_name text) returns void
  language plpgsql
as $$
begin
  insert into public.user_exercises (name, body_part) values (p_name, '팔');
  raise exception '겹치는 이름이 저장됐다: %', p_name;
exception when unique_violation then
  null;
end;
$$;

set local role authenticated;

-- A가 크루를 만들고 B가 들어온다
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000003a","role":"authenticated"}', true);
update ctx set invite_code = (select invite_code from public.create_crew('종목크루'));

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000003b","role":"authenticated"}', true);
select public.join_crew_by_code((select invite_code from ctx));

-- ---------------------------------------------------------------------------
-- A: 만들기·읽기·고치기
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000003a","role":"authenticated"}', true);

with created as (
  insert into public.user_exercises (name, body_part, bodyweight)
  values ('케이블 킥백', '팔', false)
  returning id
)
update ctx set exercise_id = (select id from created);

do $$
begin
  assert (select count(*) from public.user_exercises) = 1, 'A는 자기 종목을 본다';
  assert (select user_id from public.user_exercises) = '00000000-0000-0000-0000-00000000003a',
    '주인은 로그인한 사람이다';
  assert (select bodyweight from public.user_exercises) = false, '맨몸 여부가 저장된다';
end $$;

-- 내 종목 이름으로 기록을 쓴 뒤 종목 이름을 바꿔도 기록은 그날 이름 그대로다
update ctx set workout_id = public.save_workout(
  '{"kind":"strength","workout_date":"2026-11-13","title":null,"memo":null,"place_name":null,
    "crew_id":null,"companion_ids":[],"duration_seconds":null,"run":null,
    "exercises":[{"name":"케이블 킥백","sets":[{"weight_kg":10,"reps":12}]},
                 {"name":"스쿼트","sets":[{"weight_kg":60,"reps":10}]}]}'
);

update public.user_exercises set name = '케이블 트라이셉스 킥백', body_part = '팔', bodyweight = true
where id = (select exercise_id from ctx);

do $$
begin
  assert (select name from public.user_exercises) = '케이블 트라이셉스 킥백', 'A는 자기 종목 이름을 고친다';
  assert (select bodyweight from public.user_exercises), 'A는 맨몸 여부를 고친다';
  assert exists (
    select 1 from public.strength_sets where workout_id = (select workout_id from ctx) and exercise_name = '케이블 킥백'
  ), '종목 이름을 바꿔도 지난 기록의 이름은 그대로다';
end $$;

-- 기록에만 있는 종목 찾기용 이름 목록: 내가 쓴 헬스 기록의 이름을 공백을 뺀 이름으로 묶는다
update ctx set workout_id = public.save_workout(
  '{"kind":"strength","workout_date":"2026-11-14","title":null,"memo":null,"place_name":null,
    "crew_id":null,"companion_ids":[],"duration_seconds":null,"run":null,
    "exercises":[{"name":"케이블킥백","sets":[{"weight_kg":12,"reps":10}]}]}'
);

do $$
begin
  assert (select count(*) from public.get_my_exercise_names()) = 2, '공백만 다른 이름은 하나로 묶인다';
  assert (select exercise_name from public.get_my_exercise_names() where workout_count = 2) = '케이블킥백',
    '표시 이름은 가장 최근 기록의 이름이다';
  assert (select array_agg(exercise_name) from public.get_my_exercise_names(array['스쿼트'])) = array['케이블킥백'],
    '앱이 넘긴 사전 이름(공백 뺀 이름)은 뺀다';
end $$;

-- 내 종목과 공백만 다른 기록 이름도 뺀다. limit보다 먼저 빼서 등록할 이름이 잘리지 않는다.
insert into public.user_exercises (name, body_part) values ('케이블 킥 백', '팔');
do $$
begin
  assert (select array_agg(exercise_name) from public.get_my_exercise_names()) = array['스쿼트'],
    '내 종목에 있는 이름은 기록에만 있는 종목에서 빠진다';
  assert (
    select prosrc ~ 'limit 500' and prosrc ~ 'candidates' from pg_proc where proname = 'get_my_exercise_names'
  ), 'limit은 사전·내 종목을 뺀 뒤에 건다';
end $$;
delete from public.user_exercises where name = '케이블 킥 백';

-- 넣을 때 정할 수 있는 칸은 이름·부위·맨몸뿐이다
do $$
begin
  begin
    insert into public.user_exercises (id, name, body_part)
    values ('00000000-0000-4000-8000-0000000000ff', 'id 지정', '팔');
    raise exception 'id를 직접 넣었다';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.user_exercises (user_id, name, body_part)
    values ('00000000-0000-0000-0000-00000000003a', '내 id라도', '팔');
    raise exception 'user_id를 직접 넣었다';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.user_exercises (name, body_part, created_at, updated_at)
    values ('시각 지정', '팔', '2000-01-01', '2000-01-01');
    raise exception '만든 시각을 직접 넣었다';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- 고칠 수 있는 칸도 이름·부위·맨몸뿐이다
do $$
begin
  begin
    update public.user_exercises set id = gen_random_uuid();
    raise exception '종목 id를 바꿨다';
  exception when insufficient_privilege then
    null;
  end;
  begin
    update public.user_exercises set user_id = '00000000-0000-0000-0000-00000000003b';
    raise exception '종목 주인을 남으로 바꿨다';
  exception when insufficient_privilege then
    null;
  end;
  begin
    update public.user_exercises set created_at = now() - interval '1 day';
    raise exception '만든 시각을 바꿨다';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 모양
-- ---------------------------------------------------------------------------
select pg_temp.expect_invalid('', '팔');
select pg_temp.expect_invalid('   ', '팔');
select pg_temp.expect_invalid(' 앞뒤 공백 ', '팔');
select pg_temp.expect_invalid(repeat('가', 51), '팔');
-- btrim은 일반 공백만 지운다. 앱 trim·\s와 같은 공백(탭·전각 공백 등)도 앞뒤에 오거나 그것만 있으면 안 된다.
select pg_temp.expect_invalid(chr(9), '팔');
select pg_temp.expect_invalid(chr(12288), '팔');
select pg_temp.expect_invalid(chr(12288) || chr(9) || chr(160), '팔');
select pg_temp.expect_invalid(chr(9) || '킥백', '팔');
select pg_temp.expect_invalid('킥백' || chr(12288), '팔');
select pg_temp.expect_invalid('킥백' || chr(10), '팔');
select pg_temp.expect_invalid(chr(65279) || '킥백', '팔');
select pg_temp.expect_invalid('부위 틀림', '엉덩이');
select pg_temp.expect_invalid('부위 영어', 'arm');

-- 경계값은 받는다. 길이는 코드 포인트로 센다.
insert into public.user_exercises (name, body_part) values (repeat('가', 50), '코어');
insert into public.user_exercises (name, body_part) values (repeat('💪', 50), '코어');

-- ---------------------------------------------------------------------------
-- 중복: 공백을 모두 뺀 이름이 같으면 안 된다(대소문자는 구분)
-- ---------------------------------------------------------------------------
select pg_temp.expect_duplicate('케이블 트라이셉스 킥백');
select pg_temp.expect_duplicate('케이블트라이셉스킥백');
select pg_temp.expect_duplicate('케이블  트라이셉스' || chr(12288) || '킥백'); -- 전각 공백
select pg_temp.expect_duplicate('케이블' || chr(9) || '트라이셉스 킥백'); -- 탭

insert into public.user_exercises (name, body_part) values ('Cable Kickback', '팔');
insert into public.user_exercises (name, body_part) values ('cable kickback', '팔');

do $$
begin
  begin
    update public.user_exercises set name = '케이블트라이셉스킥백' where name = 'Cable Kickback';
    raise exception '고칠 때 겹치는 이름으로 바꿨다';
  exception when unique_violation then
    null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 상한: 한 사람당 100개
-- ---------------------------------------------------------------------------
do $$
begin
  assert (
    select prosrc like '%for no key update%' from pg_proc where proname = 'limit_user_exercises'
  ), '개수 상한 잠금은 for no key update다';
end $$;

insert into public.user_exercises (name, body_part)
select '종목' || n, '하체' from generate_series(1, 100 - (select count(*) from public.user_exercises)) as n;

do $$
begin
  assert (select count(*) from public.user_exercises) = 100, 'A는 종목 100개를 가진다';
  begin
    insert into public.user_exercises (name, body_part) values ('101번째', '하체');
    raise exception '101번째 종목이 저장됐다';
  exception when check_violation then
    assert sqlerrm = 'too_many_exercises', '개수 상한 오류는 too_many_exercises다';
  end;
end $$;

-- ---------------------------------------------------------------------------
-- B(같은 크루), C(크루 밖): 남의 종목은 읽지도 고치지도 지우지도 못한다
-- ---------------------------------------------------------------------------
create function pg_temp.expect_no_access(p_label text) returns void
  language plpgsql
as $$
declare
  changed integer;
begin
  assert (select count(*) from public.user_exercises) = 0, p_label || '는 남의 종목을 못 본다';
  assert (select count(*) from public.user_exercises where id = (select exercise_id from ctx)) = 0,
    p_label || '는 id로도 남의 종목을 못 본다';
  assert (select count(*) from public.get_my_exercise_names()) = 0,
    p_label || '의 기록 이름 목록에 남의 기록 이름이 없다';

  update public.user_exercises set name = '빼앗음' where id = (select exercise_id from ctx);
  get diagnostics changed = row_count;
  assert changed = 0, p_label || '는 남의 종목을 고치지 못한다';

  delete from public.user_exercises where id = (select exercise_id from ctx);
  get diagnostics changed = row_count;
  assert changed = 0, p_label || '는 남의 종목을 지우지 못한다';

  begin
    insert into public.user_exercises (user_id, name, body_part)
    values ('00000000-0000-0000-0000-00000000003a', '끼워 넣기', '팔');
    raise exception '% 가 남의 이름으로 종목을 넣었다', p_label;
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000003b","role":"authenticated"}', true);
select pg_temp.expect_no_access('B');

-- B는 A와 같은 이름도 만들 수 있다. 유일 조건과 상한은 사람마다 따로다.
insert into public.user_exercises (name, body_part) values ('케이블 트라이셉스 킥백', '팔');

do $$
begin
  assert (select count(*) from public.user_exercises) = 1, 'B는 자기 종목만 본다';
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000003c","role":"authenticated"}', true);
select pg_temp.expect_no_access('C');

-- A가 지운다
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000003a","role":"authenticated"}', true);
delete from public.user_exercises where id = (select exercise_id from ctx);

do $$
begin
  assert (select count(*) from public.user_exercises where id = (select exercise_id from ctx)) = 0, 'A는 자기 종목을 지운다';
  assert exists (select 1 from public.strength_sets where exercise_name = '케이블 킥백'),
    '종목을 지워도 기록은 그대로다';
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
    perform 1 from public.user_exercises;
    raise exception '익명이 내 종목 테이블을 읽었다';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform 1 from public.get_my_exercise_names();
    raise exception '익명이 기록 이름 목록을 읽었다';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;
select 'user-exercises: all checks passed' as result;

rollback;
