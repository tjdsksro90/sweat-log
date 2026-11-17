-- 기록 사진 권한 검증(workout_photos 행과 storage.objects 파일). 로컬 DB에서 실행하고 마지막에 롤백한다.
-- 실행: docker exec -i supabase_db_sweat-log psql -U postgres -v ON_ERROR_STOP=1 -q < supabase/tests/workout-photos.sql
--
-- 등장인물
--   A(민수): 크루 '새벽러닝'을 만들고 공유 기록과 비공개 기록에 사진을 붙인다
--   B(지은): 같은 크루 구성원
--   C(태호): 크루 밖 사람
--
-- 파일 행은 Storage API 대신 storage.objects에 직접 넣어 정책만 확인한다.
-- 직접 삭제는 storage.protect_delete가 막으므로 이 트랜잭션에서만 storage.allow_delete_query를 켠다.

begin;

select set_config('storage.allow_delete_query', 'true', true);

insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.dev', '{"nickname":"민수"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.dev', '{"nickname":"지은"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.dev', '{"nickname":"태호"}', 'authenticated', 'authenticated');

create temporary table ctx (crew_id uuid, invite_code text, crew_workout uuid, private_workout uuid);
grant all on ctx to authenticated;

-- 경로: {작성자}/{기록}/{파일}
create function pg_temp.photo_path(p_workout uuid, p_file text, p_owner text default '00000000-0000-0000-0000-00000000000a')
  returns text language sql immutable as $$ select p_owner || '/' || p_workout::text || '/' || p_file $$;

do $$
begin
  assert (select public from storage.buckets where id = 'workout-photos') = false, '사진 버킷은 비공개다';
end $$;

-- A로 로그인: 크루 공유 기록과 비공개 기록을 만들고 사진을 붙인다
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

insert into ctx (crew_id, invite_code) select id, invite_code from public.create_crew('새벽러닝');

with w as (insert into public.workouts (kind, workout_date, crew_id) select 'other', current_date, crew_id from ctx returning id)
update ctx set crew_workout = (select id from w);

with w as (insert into public.workouts (kind, workout_date) values ('other', current_date) returning id)
update ctx set private_workout = (select id from w);

insert into storage.objects (bucket_id, name)
select 'workout-photos', pg_temp.photo_path(crew_workout, 'crew-1.jpg') from ctx
union all
select 'workout-photos', pg_temp.photo_path(private_workout, 'private-1.jpg') from ctx
-- 행 없이 남은 파일(업로드 뒤 행 저장이 실패한 경우)
union all
select 'workout-photos', pg_temp.photo_path(crew_workout, 'orphan.jpg') from ctx;

insert into public.workout_photos (workout_id, path, position, width, height)
select crew_workout, pg_temp.photo_path(crew_workout, 'crew-1.jpg'), 0, 1600, 1200 from ctx
union all
select private_workout, pg_temp.photo_path(private_workout, 'private-1.jpg'), 0, 1200, 1600 from ctx;

do $$
begin
  assert (select count(*) from public.workout_photos) = 2, 'A는 자기 사진 2장을 본다';
  assert (select count(*) from storage.objects where bucket_id = 'workout-photos') = 3, 'A는 자기 폴더 파일을 모두 본다';
end $$;

-- 순서는 트리거가 매기고, 4장을 넘을 수 없다
insert into public.workout_photos (workout_id, path, position, width, height)
select crew_workout, pg_temp.photo_path(crew_workout, n || '.jpg'), 0, 100, 100
from ctx, generate_series(2, 4) as n;

do $$
begin
  assert (
    select array_agg(position order by position) from public.workout_photos where workout_id = (select crew_workout from ctx)
  ) = array[0, 1, 2, 3]::smallint[], '사진 순서는 0부터 차례로 매겨진다';

  begin
    insert into public.workout_photos (workout_id, path, position, width, height)
    select crew_workout, pg_temp.photo_path(crew_workout, '5.jpg'), 0, 100, 100 from ctx;
    raise exception '5번째 사진이 막히지 않았다';
  exception when raise_exception then
    if sqlerrm <> 'too_many_photos' then
      raise;
    end if;
  end;
end $$;

-- 사진 행의 경로는 내 폴더의 그 기록 폴더여야 한다
do $$
begin
  begin
    insert into public.workout_photos (workout_id, path, position, width, height)
    select private_workout, pg_temp.photo_path(crew_workout, 'crew-1.jpg'), 0, 100, 100 from ctx;
    raise exception '다른 기록 폴더의 경로를 붙일 수 있었다';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into storage.objects (bucket_id, name)
    select 'workout-photos', pg_temp.photo_path(crew_workout, 'x.jpg', '00000000-0000-0000-0000-00000000000b') from ctx;
    raise exception '남의 폴더에 파일을 올릴 수 있었다';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into storage.objects (bucket_id, name) values ('workout-photos', '00000000-0000-0000-0000-00000000000a/not-a-uuid/x.jpg');
    raise exception '기록이 아닌 폴더에 파일을 올릴 수 있었다';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- B로 로그인: 크루에 들어가기 전에는 아무 사진도 못 본다
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

do $$
begin
  assert (select count(*) from public.workout_photos) = 0, '크루 가입 전 B는 사진 행을 못 본다';
  assert (select count(*) from storage.objects where bucket_id = 'workout-photos') = 0, '크루 가입 전 B는 파일을 못 본다';
end $$;

select public.join_crew_by_code((select invite_code from ctx));

do $$
declare
  changed integer;
begin
  assert (select count(*) from public.workout_photos) = 4, 'B는 크루 공유 기록의 사진 4장만 본다';
  assert (select count(*) from public.workout_photos where workout_id = (select private_workout from ctx)) = 0,
    'B는 비공개 기록의 사진 행을 못 본다';
  assert (select count(*) from storage.objects where bucket_id = 'workout-photos') = 1,
    'B는 행이 있는 크루 사진 파일만 본다(2~4.jpg는 파일이 없고 orphan.jpg는 행이 없다)';
  assert (
    select count(*) from storage.objects where name = pg_temp.photo_path((select private_workout from ctx), 'private-1.jpg')
  ) = 0, 'B는 비공개 기록의 파일을 못 본다';
  assert (
    select count(*) from storage.objects where name = pg_temp.photo_path((select crew_workout from ctx), 'orphan.jpg')
  ) = 0, 'B는 행이 없는 파일을 못 본다';

  -- 볼 수 있는 기록이라도 남의 기록에는 사진을 올리지 못한다
  begin
    insert into storage.objects (bucket_id, name)
    select 'workout-photos', pg_temp.photo_path(crew_workout, 'b.jpg', '00000000-0000-0000-0000-00000000000b') from ctx;
    raise exception 'B가 A의 기록 폴더(자기 이름)에 파일을 올렸다';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into storage.objects (bucket_id, name)
    select 'workout-photos', pg_temp.photo_path(crew_workout, 'b.jpg') from ctx;
    raise exception 'B가 A의 폴더에 파일을 올렸다';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.workout_photos (workout_id, path, position, width, height)
    select crew_workout, pg_temp.photo_path(crew_workout, 'b.jpg', '00000000-0000-0000-0000-00000000000b'), 0, 100, 100 from ctx;
    raise exception 'B가 A의 기록에 사진 행을 붙였다';
  exception when insufficient_privilege then
    null;
  end;

  -- 지우기는 조용히 0건
  delete from public.workout_photos;
  get diagnostics changed = row_count;
  assert changed = 0, 'B는 A의 사진 행을 못 지운다';

  delete from storage.objects where bucket_id = 'workout-photos';
  get diagnostics changed = row_count;
  assert changed = 0, 'B는 A의 사진 파일을 못 지운다';

  update public.workout_photos set width = 1;
  get diagnostics changed = row_count;
  assert changed = 0, 'B는 사진 행을 고치지 못한다';
end $$;

-- C로 로그인: 크루 밖 사람은 아무것도 못 본다
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);

do $$
declare
  changed integer;
begin
  assert (select count(*) from public.workout_photos) = 0, 'C는 사진 행을 못 본다';
  assert (select count(*) from storage.objects where bucket_id = 'workout-photos') = 0, 'C는 사진 파일을 못 본다';

  begin
    insert into storage.objects (bucket_id, name)
    select 'workout-photos', pg_temp.photo_path(private_workout, 'c.jpg', '00000000-0000-0000-0000-00000000000c') from ctx;
    raise exception 'C가 A의 비공개 기록에 파일을 올렸다';
  exception when insufficient_privilege then
    null;
  end;

  delete from storage.objects where bucket_id = 'workout-photos';
  get diagnostics changed = row_count;
  assert changed = 0, 'C는 사진 파일을 못 지운다';
end $$;

-- 다시 A: 사진 하나를 지우고, 기록을 지우면 행이 함께 사라진다
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
declare
  changed integer;
begin
  delete from public.workout_photos where path = pg_temp.photo_path((select crew_workout from ctx), '4.jpg');
  get diagnostics changed = row_count;
  assert changed = 1, 'A는 자기 사진 행을 지운다';

  insert into public.workout_photos (workout_id, path, position, width, height)
  select crew_workout, pg_temp.photo_path(crew_workout, '5.jpg'), 0, 100, 100 from ctx;
  assert (
    select path from public.workout_photos where workout_id = (select crew_workout from ctx) order by position desc limit 1
  ) = pg_temp.photo_path((select crew_workout from ctx), '5.jpg'), '지운 뒤 새 사진은 맨 뒤에 붙는다';

  delete from storage.objects where name = pg_temp.photo_path((select private_workout from ctx), 'private-1.jpg');
  get diagnostics changed = row_count;
  assert changed = 1, 'A는 자기 사진 파일을 지운다';

  delete from public.workouts where id = (select crew_workout from ctx);
  assert (select count(*) from public.workout_photos where workout_id = (select crew_workout from ctx)) = 0,
    '기록을 지우면 사진 행도 지워진다';
end $$;

-- 기록이 지워진 뒤 B는 남은 파일을 볼 수 없다(파일은 앱이 Storage API로 지운다)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

do $$
begin
  assert (select count(*) from storage.objects where bucket_id = 'workout-photos') = 0, '지운 기록의 파일은 B에게 안 보인다';
end $$;

-- 기록을 지운 뒤에도 A는 자기 폴더의 남은 파일을 지울 수 있다
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
declare
  changed integer;
begin
  delete from storage.objects where name like '00000000-0000-0000-0000-00000000000a/' || (select crew_workout from ctx)::text || '/%';
  get diagnostics changed = row_count;
  assert changed = 2, 'A는 지운 기록 폴더에 남은 파일을 지운다';
end $$;

-- 익명은 아무것도 못 한다
set local role anon;

do $$
begin
  begin
    perform 1 from public.workout_photos;
    raise exception '익명 사용자가 사진 테이블에 접근했다';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;
select 'workout-photos: all checks passed' as result;

rollback;
