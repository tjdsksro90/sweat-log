-- sweat-log 기본 스키마
--
-- 구조: 각자 계정(profiles) → 크루(crews, crew_members)로 친구와 묶임
--       운동 기록(workouts) 하나에 종류별 상세(run_details 또는 strength_sets)가 붙는다.
--
-- 공개 범위: 기록은 작성자 본인, 함께한 친구(workout_companions), 기록을 공유한 크루의 구성원만 본다.
-- 수정·삭제는 작성자만 한다. 권한 판단은 모두 RLS에서 하고, 앱 코드는 권한을 다시 흉내 내지 않는다.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- 공용 트리거
-- ---------------------------------------------------------------------------

create function private.set_updated_at() returns trigger
  language plpgsql
  set search_path to ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 프로필: auth.users와 1:1. 가입할 때 트리거가 만든다.
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create function private.handle_new_user() returns trigger
  language plpgsql
  security definer
  set search_path to ''
as $$
declare
  requested_nickname text := btrim(coalesce(new.raw_user_meta_data ->> 'nickname', ''));
begin
  if char_length(requested_nickname) not between 1 and 20 then
    requested_nickname := split_part(new.email, '@', 1);
  end if;

  insert into public.profiles (id, nickname)
  values (new.id, left(requested_nickname, 20));

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- 크루: 함께 운동하는 친구 묶음. 초대 코드로 들어온다.
-- ---------------------------------------------------------------------------

create table public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 30),
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger crews_set_updated_at
  before update on public.crews
  for each row execute function private.set_updated_at();

create table public.crew_members (
  crew_id uuid not null references public.crews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

create index crew_members_user_id_idx on public.crew_members (user_id);

-- RLS 정책 안에서 crew_members를 다시 조회하면 정책이 자기 자신을 부르는 재귀가 생긴다.
-- security definer 함수로 한 번만 확인한다.
create function private.is_crew_member(p_crew_id uuid) returns boolean
  language sql
  stable
  security definer
  set search_path to ''
as $$
  select exists (
    select 1
    from public.crew_members
    where crew_id = p_crew_id
      and user_id = (select auth.uid())
  );
$$;

-- 두 사용자가 같은 크루에 있는지. 크루 친구의 프로필(닉네임)을 볼 수 있게 한다.
create function private.shares_crew_with(p_user_id uuid) returns boolean
  language sql
  stable
  security definer
  set search_path to ''
as $$
  select exists (
    select 1
    from public.crew_members mine
    join public.crew_members theirs on theirs.crew_id = mine.crew_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = p_user_id
  );
$$;

-- 크루를 만들고 만든 사람을 owner로 넣는다. 두 insert가 함께 성공해야 해서 함수로 묶는다.
create function public.create_crew(p_name text) returns public.crews
  language plpgsql
  security definer
  set search_path to ''
as $$
declare
  current_user_id uuid := auth.uid();
  created public.crews;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.crews (name, owner_id)
  values (btrim(p_name), current_user_id)
  returning * into created;

  insert into public.crew_members (crew_id, user_id, role)
  values (created.id, current_user_id, 'owner');

  return created;
end;
$$;

-- 초대 코드로 크루에 들어간다. 코드를 모르는 크루는 조회조차 못 하므로 security definer가 필요하다.
create function public.join_crew_by_code(p_invite_code text) returns public.crews
  language plpgsql
  security definer
  set search_path to ''
as $$
declare
  current_user_id uuid := auth.uid();
  target public.crews;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select * into target
  from public.crews
  where invite_code = upper(btrim(p_invite_code));

  if target.id is null then
    raise exception 'invalid_invite_code';
  end if;

  insert into public.crew_members (crew_id, user_id)
  values (target.id, current_user_id)
  on conflict (crew_id, user_id) do nothing;

  return target;
end;
$$;

-- ---------------------------------------------------------------------------
-- 운동 기록
-- ---------------------------------------------------------------------------

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- 기록을 공유할 크루. 비우면 나와 함께한 친구만 본다.
  crew_id uuid references public.crews (id) on delete set null,
  kind text not null check (kind in ('run', 'strength', 'other')),
  workout_date date not null,
  -- 헬스·기타의 전체 운동 시간. 러닝은 run_details.duration_seconds가 기준이다.
  duration_seconds integer check (duration_seconds is null or duration_seconds between 1 and 86400),
  title text check (title is null or char_length(title) <= 50),
  memo text check (memo is null or char_length(memo) <= 2000),
  place_name text check (place_name is null or char_length(place_name) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workouts_user_id_date_idx on public.workouts (user_id, workout_date desc);
create index workouts_crew_id_date_idx on public.workouts (crew_id, workout_date desc) where crew_id is not null;

create trigger workouts_set_updated_at
  before update on public.workouts
  for each row execute function private.set_updated_at();

-- 그날 같이 운동한 친구. 같은 크루 구성원만 지정할 수 있다(정책에서 확인).
create table public.workout_companions (
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (workout_id, user_id)
);

create index workout_companions_user_id_idx on public.workout_companions (user_id);

-- 러닝 상세. 페이스는 저장하지 않고 duration / distance로 계산한다.
create table public.run_details (
  workout_id uuid primary key references public.workouts (id) on delete cascade,
  distance_meters integer not null check (distance_meters between 1 and 500000),
  duration_seconds integer not null check (duration_seconds between 1 and 86400)
);

-- 헬스 상세. 종목 하나에 세트가 여러 줄. 맨몸 운동은 weight_kg를 비운다.
create table public.strength_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_name text not null check (char_length(btrim(exercise_name)) between 1 and 50),
  exercise_order smallint not null check (exercise_order >= 0),
  set_order smallint not null check (set_order >= 0),
  weight_kg numeric(6, 2) check (weight_kg is null or weight_kg between 0 and 1000),
  reps smallint not null check (reps between 1 and 1000),
  unique (workout_id, exercise_order, set_order)
);

create table public.workout_comments (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index workout_comments_workout_id_idx on public.workout_comments (workout_id, created_at);

-- 기록을 볼 수 있는지: 작성자, 함께한 친구, 공유한 크루의 구성원.
create function private.can_view_workout(p_workout_id uuid) returns boolean
  language sql
  stable
  security definer
  set search_path to ''
as $$
  select exists (
    select 1
    from public.workouts w
    where w.id = p_workout_id
      and (
        w.user_id = (select auth.uid())
        or (w.crew_id is not null and private.is_crew_member(w.crew_id))
        or exists (
          select 1
          from public.workout_companions c
          where c.workout_id = w.id
            and c.user_id = (select auth.uid())
        )
      )
  );
$$;

create function private.owns_workout(p_workout_id uuid) returns boolean
  language sql
  stable
  security definer
  set search_path to ''
as $$
  select exists (
    select 1
    from public.workouts
    where id = p_workout_id
      and user_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_companions enable row level security;
alter table public.run_details enable row level security;
alter table public.strength_sets enable row level security;
alter table public.workout_comments enable row level security;

-- profiles: 나와 같은 크루 친구의 프로필만 본다. 수정은 본인만.
create policy "Users view own and crewmate profiles" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.shares_crew_with(id));

create policy "Users update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- crews: 구성원만 본다. 생성은 create_crew, 가입은 join_crew_by_code로만 한다.
create policy "Members view their crews" on public.crews
  for select to authenticated
  using (private.is_crew_member(id));

create policy "Owners update their crews" on public.crews
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Owners delete their crews" on public.crews
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- crew_members: 같은 크루 구성원 목록을 본다. 탈퇴는 본인이 한다.
create policy "Members view crew membership" on public.crew_members
  for select to authenticated
  using (private.is_crew_member(crew_id));

create policy "Members leave crews" on public.crew_members
  for delete to authenticated
  using (user_id = (select auth.uid()) and role <> 'owner');

-- workouts
create policy "Viewers see workouts" on public.workouts
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (crew_id is not null and private.is_crew_member(crew_id))
    or private.can_view_workout(id)
  );

create policy "Authors create workouts" on public.workouts
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (crew_id is null or private.is_crew_member(crew_id))
  );

create policy "Authors update workouts" on public.workouts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (crew_id is null or private.is_crew_member(crew_id))
  );

create policy "Authors delete workouts" on public.workouts
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- workout_companions: 작성자가 같은 크루 친구만 지정한다.
create policy "Viewers see companions" on public.workout_companions
  for select to authenticated
  using (private.can_view_workout(workout_id));

create policy "Authors add companions" on public.workout_companions
  for insert to authenticated
  with check (private.owns_workout(workout_id) and private.shares_crew_with(user_id));

create policy "Authors remove companions" on public.workout_companions
  for delete to authenticated
  using (private.owns_workout(workout_id));

-- run_details, strength_sets: 기록과 같은 권한
create policy "Viewers see run details" on public.run_details
  for select to authenticated
  using (private.can_view_workout(workout_id));

create policy "Authors manage run details" on public.run_details
  for all to authenticated
  using (private.owns_workout(workout_id))
  with check (private.owns_workout(workout_id));

create policy "Viewers see strength sets" on public.strength_sets
  for select to authenticated
  using (private.can_view_workout(workout_id));

create policy "Authors manage strength sets" on public.strength_sets
  for all to authenticated
  using (private.owns_workout(workout_id))
  with check (private.owns_workout(workout_id));

-- workout_comments: 기록을 볼 수 있으면 댓글을 쓴다. 삭제는 본인 댓글만.
create policy "Viewers see comments" on public.workout_comments
  for select to authenticated
  using (private.can_view_workout(workout_id));

create policy "Viewers write comments" on public.workout_comments
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_view_workout(workout_id));

create policy "Authors delete own comments" on public.workout_comments
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 권한: 익명 사용자는 아무것도 못 한다. 함수는 필요한 것만 연다.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

revoke all on function public.create_crew(text) from public, anon;
revoke all on function public.join_crew_by_code(text) from public, anon;
grant execute on function public.create_crew(text) to authenticated;
grant execute on function public.join_crew_by_code(text) to authenticated;
