-- 기록 사진
--
-- 파일은 비공개 Storage 버킷 workout-photos에, 순서·크기 같은 메타는 workout_photos 테이블에 둔다.
-- 파일 경로는 "{작성자 id}/{기록 id}/{임의 uuid}.{확장자}"다. 경로 첫 폴더로 소유자를, 둘째 폴더로 기록을 안다.
--
-- 권한
--   - 사진 행과 파일은 그 기록을 볼 수 있는 사람(작성자, 함께한 친구, 공유 크루 구성원)만 읽는다.
--     파일은 workout_photos에 행이 있는 경로만 남에게 보인다. 행 없이 남은 파일(업로드 뒤 행 저장 실패 등)은
--     작성자 말고는 읽을 수 없다.
--   - 올리기·지우기는 작성자만 한다. 공개 URL은 쓰지 않고 앱 서버가 서명 URL을 만든다.
--   - 기록을 지우면 사진 행은 cascade로 지워진다. Storage는 SQL로 파일을 지우지 못하게 막아 두었으므로
--     (storage.protect_delete) 파일은 앱의 기록 삭제 Server Action이 Storage API로 기록 폴더째 지운다.
--
-- 오류 코드(raise exception의 message):
--   too_many_photos   기록 하나에 사진이 이미 4장

create table public.workout_photos (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  path text not null unique,
  -- 보여 주는 순서. 넣을 때 트리거가 마지막 다음 번호로 덮어쓴다. 중간 사진을 지우면 번호가 비어도 순서는 그대로다.
  position smallint not null default 0 check (position >= 0),
  -- 화면이 사진을 받기 전에 자리를 잡아 두려고(CLS) 저장한다. 서버가 파일 헤더에서 읽은 값이다.
  width integer not null check (width between 1 and 4096),
  height integer not null check (height between 1 and 4096),
  created_at timestamptz not null default now(),
  unique (workout_id, position)
);

-- 기록 하나에 4장까지. 동시에 올려도 넘지 않도록 기록 행을 잠그고 센다.
-- 작성자가 아니면 아무것도 하지 않고 넘겨서 insert 정책이 막게 한다(남의 기록 행을 잠그지 않는다).
create function private.assign_workout_photo_position() returns trigger
  language plpgsql
  security definer
  set search_path to ''
as $$
declare
  photo_count integer;
  last_position smallint;
begin
  if not private.owns_workout(new.workout_id) then
    return new;
  end if;

  perform 1 from public.workouts where id = new.workout_id for update;

  select count(*), max(position)
  into photo_count, last_position
  from public.workout_photos
  where workout_id = new.workout_id;

  if photo_count >= 4 then
    raise exception 'too_many_photos';
  end if;

  new.position := coalesce(last_position + 1, 0);
  return new;
end;
$$;

create trigger workout_photos_assign_position
  before insert on public.workout_photos
  for each row execute function private.assign_workout_photo_position();

-- 파일 경로가 내가 쓴 기록의 폴더인지. 경로의 기록 id를 uuid로 바꾸지 않고 글자로 비교해서
-- 이상한 경로가 와도 오류 없이 false가 된다.
create function private.owns_workout_path(p_path text) returns boolean
  language sql
  stable
  security definer
  set search_path to ''
as $$
  select exists (
    select 1
    from public.workouts w
    where w.id::text = (storage.foldername(p_path))[2]
      and w.user_id = (select auth.uid())
      and (storage.foldername(p_path))[1] = (select auth.uid())::text
  );
$$;

-- 사진 행이 있고 그 기록을 볼 수 있는지. 행이 없는 파일은 남에게 보이지 않는다.
create function private.can_view_workout_photo(p_path text) returns boolean
  language sql
  stable
  security definer
  set search_path to ''
as $$
  select exists (
    select 1
    from public.workout_photos p
    where p.path = p_path
      and private.can_view_workout(p.workout_id)
  );
$$;

alter table public.workout_photos enable row level security;

create policy "Viewers see workout photos" on public.workout_photos
  for select to authenticated
  using (private.can_view_workout(workout_id));

-- 경로가 내 폴더의 이 기록 폴더여야 한다. 남의 파일 경로를 내 기록에 붙여 읽는 것을 막는다.
create policy "Authors add workout photos" on public.workout_photos
  for insert to authenticated
  with check (
    private.owns_workout(workout_id)
    and starts_with(path, (select auth.uid())::text || '/' || workout_id::text || '/')
  );

create policy "Authors delete workout photos" on public.workout_photos
  for delete to authenticated
  using (private.owns_workout(workout_id));

revoke all on public.workout_photos from anon;
revoke all on function private.assign_workout_photo_position() from public, anon, authenticated;
revoke all on function private.owns_workout_path(text) from public, anon;
revoke all on function private.can_view_workout_photo(text) from public, anon;
grant execute on function private.owns_workout_path(text) to authenticated;
grant execute on function private.can_view_workout_photo(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

-- 앱이 긴 변 1600px JPEG로 줄여 올리므로 보통 수백 KB다. 1MB는 Server Action 본문 기본 한도와 같다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('workout-photos', 'workout-photos', false, 1048576, array['image/jpeg', 'image/png', 'image/webp']);

-- 작성자는 자기 폴더의 파일을 모두 본다(기록을 지울 때 폴더째 지우려면 목록이 필요하다).
-- 다른 사람은 사진 행이 있고 그 기록을 볼 수 있을 때만 본다(서명 URL 발급도 이 권한을 따른다).
create policy "Viewers read workout photo files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'workout-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or private.can_view_workout_photo(name)
    )
  );

create policy "Authors upload workout photo files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'workout-photos' and private.owns_workout_path(name));

-- 기록을 지운 뒤에도 남은 파일을 지울 수 있어야 해서 기록 존재 여부가 아니라 내 폴더인지로 본다.
create policy "Authors delete workout photo files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'workout-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
