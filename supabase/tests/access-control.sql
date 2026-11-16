-- RLS 권한 검증. 로컬 DB에서 실행하고 마지막에 롤백하므로 데이터가 남지 않는다.
-- 실행: docker exec -i supabase_db_sweat-log psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/access-control.sql
--
-- 등장인물
--   A(민수): 크루 '새벽러닝' 만든 사람
--   B(지은): 초대 코드로 크루에 들어옴
--   C(태호): 크루 밖 사람

begin;

-- 가입하면 트리거가 프로필을 만든다.
insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.dev', '{"nickname":"민수"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.dev', '{"nickname":"지은"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.dev', '{}', 'authenticated', 'authenticated');

do $$
begin
  -- 로컬 DB에 직접 가입해 둔 계정이 있어도 통과하도록 테스트 계정만 센다.
  assert (
    select count(*) from public.profiles
    where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c')
  ) = 3, '가입한 3명의 프로필이 생겨야 한다';
  assert (select nickname from public.profiles where id = '00000000-0000-0000-0000-00000000000c') = 'c',
    '닉네임이 없으면 이메일 앞부분을 쓴다';
end $$;

create temporary table ctx (crew_id uuid, invite_code text, crew_workout uuid, private_workout uuid);
grant all on ctx to authenticated;

-- A로 로그인
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

insert into ctx (crew_id, invite_code)
select id, invite_code from public.create_crew('새벽러닝');

-- 크루에 공유한 러닝 기록, 나만 보는 헬스 기록
with w as (
  insert into public.workouts (kind, workout_date, crew_id)
  select 'run', current_date, crew_id from ctx
  returning id
)
update ctx set crew_workout = (select id from w);

insert into public.run_details (workout_id, distance_meters, duration_seconds)
select crew_workout, 5000, 1650 from ctx;

with w as (
  insert into public.workouts (kind, workout_date) values ('strength', current_date) returning id
)
update ctx set private_workout = (select id from w);

insert into public.strength_sets (workout_id, exercise_name, exercise_order, set_order, weight_kg, reps)
select private_workout, '스쿼트', 0, 0, 60, 10 from ctx;

do $$
begin
  assert (select count(*) from public.workouts) = 2, 'A는 자기 기록 2개를 본다';
  assert (select count(*) from public.crew_members) = 1, 'A는 크루의 owner로 들어가 있다';
end $$;

-- B로 로그인: 초대 코드 전에는 아무것도 못 본다
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

do $$
begin
  assert (select count(*) from public.workouts) = 0, '크루 가입 전 B는 기록을 못 본다';
  assert (select count(*) from public.crews) = 0, '크루 가입 전 B는 크루를 못 본다';
  assert (select count(*) from public.profiles) = 1, '크루 가입 전 B는 자기 프로필만 본다';
end $$;

select public.join_crew_by_code(lower((select invite_code from ctx)));

do $$
begin
  assert (select count(*) from public.workouts) = 1, 'B는 크루에 공유된 기록 1개만 본다';
  assert (select kind from public.workouts) = 'run', 'B가 보는 기록은 공유된 러닝이다';
  assert (select count(*) from public.run_details) = 1, 'B는 공유된 러닝의 상세를 본다';
  assert (select count(*) from public.strength_sets) = 0, 'B는 A의 비공개 헬스 세트를 못 본다';
  assert (select count(*) from public.profiles) = 2, 'B는 같은 크루인 A의 프로필을 본다';
end $$;

-- B는 A의 기록을 고칠 수 없다(조용히 0건 수정)
update public.workouts set memo = '해킹' where id = (select crew_workout from ctx);

-- B는 공유된 기록에 댓글을 쓴다
insert into public.workout_comments (workout_id, body) select crew_workout, '페이스 좋다!' from ctx;

-- B는 비공개 기록에 댓글을 못 쓴다
do $$
begin
  begin
    insert into public.workout_comments (workout_id, body) select private_workout, '몰래' from ctx;
    raise exception '비공개 기록 댓글이 막히지 않았다';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- C로 로그인: 크루 밖 사람
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);

do $$
begin
  assert (select count(*) from public.workouts) = 0, '크루 밖 C는 기록을 못 본다';
  assert (select count(*) from public.workout_comments) = 0, '크루 밖 C는 댓글을 못 본다';
  assert (select count(*) from public.profiles) = 1, '크루 밖 C는 자기 프로필만 본다';
end $$;

-- C는 크루를 모르면 기록을 그 크루에 공유할 수 없다
do $$
begin
  begin
    insert into public.workouts (kind, workout_date, crew_id) select 'run', current_date, crew_id from ctx;
    raise exception '남의 크루에 기록 공유가 막히지 않았다';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- 잘못된 초대 코드
do $$
begin
  begin
    perform public.join_crew_by_code('WRONG000');
    raise exception '잘못된 초대 코드가 통과했다';
  exception when raise_exception then
    if sqlerrm <> 'invalid_invite_code' then
      raise;
    end if;
  end;
end $$;

-- 다시 A: B의 수정 시도가 반영되지 않았는지, B의 댓글이 보이는지
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
begin
  assert (select memo from public.workouts where id = (select crew_workout from ctx)) is null, 'B의 수정은 반영되지 않는다';
  assert (select count(*) from public.workout_comments) = 1, 'A는 B의 댓글을 본다';
end $$;

-- A는 자기 기록에 달린 댓글이라도 B의 댓글은 지울 수 없다(조용히 0건 삭제)
insert into public.workout_comments (workout_id, body) select crew_workout, '고마워!' from ctx;

do $$
declare
  deleted integer;
begin
  delete from public.workout_comments where user_id = '00000000-0000-0000-0000-00000000000b';
  get diagnostics deleted = row_count;
  assert deleted = 0, 'A는 B의 댓글을 지울 수 없다';
  assert (select count(*) from public.workout_comments) = 2, 'B의 댓글은 그대로 남는다';
end $$;

-- 크루장 A는 크루를 나갈 수 없다(조용히 0건 삭제)
do $$
declare
  deleted integer;
begin
  delete from public.crew_members
  where crew_id = (select crew_id from ctx) and user_id = '00000000-0000-0000-0000-00000000000a';
  get diagnostics deleted = row_count;
  assert deleted = 0, '크루장은 크루를 나갈 수 없다';
  assert (select count(*) from public.crew_members where user_id = '00000000-0000-0000-0000-00000000000a') = 1,
    '크루장은 여전히 owner로 남아 있다';
end $$;

-- 다시 B: 자기 댓글은 지우고, 남의 댓글은 못 지운다
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

insert into public.workout_comments (workout_id, body) select crew_workout, '오타 났다' from ctx;

do $$
declare
  deleted integer;
begin
  delete from public.workout_comments where user_id = '00000000-0000-0000-0000-00000000000a';
  get diagnostics deleted = row_count;
  assert deleted = 0, 'B는 A의 댓글을 지울 수 없다';

  delete from public.workout_comments where body = '오타 났다';
  get diagnostics deleted = row_count;
  assert deleted = 1, 'B는 자기 댓글을 지울 수 있다';
  assert (select count(*) from public.workout_comments) = 2, '지운 댓글만 사라지고 A와 B의 댓글 2개가 남는다';
end $$;

-- B가 크루를 나가면 그 크루와 크루에 공유된 기록·댓글에 접근할 수 없다
do $$
declare
  deleted integer;
begin
  delete from public.crew_members
  where crew_id = (select crew_id from ctx) and user_id = '00000000-0000-0000-0000-00000000000b';
  get diagnostics deleted = row_count;
  assert deleted = 1, '일반 구성원은 크루를 나갈 수 있다';

  assert (select count(*) from public.crews) = 0, '나간 B는 크루를 못 본다';
  assert (select count(*) from public.crew_members) = 0, '나간 B는 크루 구성원을 못 본다';
  assert (select count(*) from public.workouts) = 0, '나간 B는 크루에 공유된 기록을 못 본다';
  assert (select count(*) from public.run_details) = 0, '나간 B는 공유된 러닝 상세를 못 본다';
  assert (select count(*) from public.workout_comments) = 0, '나간 B는 자기 것을 포함해 크루 기록의 댓글을 못 본다';
  assert (select count(*) from public.profiles) = 1, '나간 B는 자기 프로필만 본다';
end $$;

-- 나간 B는 크루 기록에 댓글을 쓸 수 없다
do $$
begin
  begin
    insert into public.workout_comments (workout_id, body) select crew_workout, '아직 있나?' from ctx;
    raise exception '나간 크루의 기록에 댓글이 막히지 않았다';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- 다시 A: B가 나가도 기록과 B가 남긴 댓글은 그대로다
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
begin
  assert (select count(*) from public.crew_members) = 1, 'B가 나가고 A만 남는다';
  assert (select count(*) from public.workout_comments) = 2, 'B가 나가도 남긴 댓글은 지워지지 않는다';
end $$;

-- 익명 사용자는 아무것도 못 본다
reset role;
set local role anon;

do $$
begin
  begin
    perform 1 from public.workouts;
    raise exception '익명 사용자가 기록 테이블에 접근했다';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;
select 'access-control: all checks passed' as result;

rollback;
