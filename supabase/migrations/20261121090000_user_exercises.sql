-- 내 종목
--
-- 헬스 종목 사전(앱 코드의 EXERCISES)에 없는 운동을 사람마다 부위와 함께 등록해 둔다.
-- 등록한 종목은 기록 폼의 종목 자동완성에 사전 종목처럼 뜬다.
--
-- - 이름: 1~50자(strength_sets.exercise_name과 같은 길이). 앱의 String.prototype.trim·\s와 같은 공백 문자로
--   앞뒤가 시작·끝나면 안 되고, 공백을 모두 뺀 이름이 비면 안 된다. btrim은 일반 공백만 지워서
--   전각 공백·탭만 있는 이름을 막지 못하므로 정규식으로 본다.
-- - 부위: 사전과 같은 6개(가슴·등·어깨·하체·팔·코어) 중 하나.
-- - 같은 사람 안에서 공백을 모두 뺀 이름이 겹치면 안 된다. 앱의 normalizeExerciseName(\s 제거),
--   종목별 최고 무게 집계(get_strength_records)와 같은 규칙이다. 대소문자는 구분한다.
--   사전 종목과 겹치는지는 사전이 앱 코드에 있어서 앱이 본다.
-- - 한 사람당 100개까지(트리거가 profiles 행을 잠그고 센다).
-- - 기록(strength_sets)은 이름을 그대로 복사해 둔 그날의 스냅숏이다. 내 종목을 고치거나 지워도 지난 기록은 바뀌지 않는다.
--
-- 권한: 본인만 보고 만들고 고치고 지운다. 크루와 공유하지 않는다.

create table public.user_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (
    char_length(name) between 1 and 50
    and name !~ ('^' || U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]' || '|' || U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]$')
    and regexp_replace(name, U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+', '', 'g') <> ''
  ),
  body_part text not null check (body_part in ('가슴', '등', '어깨', '하체', '팔', '코어')),
  bodyweight boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 공백 문자 목록은 get_strength_records와 같다(JS \s).
create unique index user_exercises_user_id_normalized_name_key on public.user_exercises (
  user_id,
  regexp_replace(name, U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+', '', 'g')
);

create trigger user_exercises_set_updated_at
  before update on public.user_exercises
  for each row execute function private.set_updated_at();

-- 한 사람당 100개. 방식은 workout_routines의 30개 상한(private.limit_workout_routines)과 같다.
-- 남의 user_id면 세지 않고 넘겨 RLS가 막게 한다. 남의 종목 개수를 오류로 엿볼 수 없게 하려는 것이다.
create function private.limit_user_exercises() returns trigger
  language plpgsql
  security definer
  set search_path to ''
as $$
begin
  if new.user_id is distinct from auth.uid() then
    return new;
  end if;

  -- for no key update: 같은 사람의 insert끼리는 줄 세우되, FK가 profiles에 거는 KEY SHARE와는 부딪히지 않는다.
  perform 1 from public.profiles where id = new.user_id for no key update;

  if (select count(*) from public.user_exercises where user_id = new.user_id) >= 100 then
    raise exception 'too_many_exercises' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger user_exercises_limit
  before insert on public.user_exercises
  for each row execute function private.limit_user_exercises();

alter table public.user_exercises enable row level security;

create policy "Users view own exercises" on public.user_exercises
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users create own exercises" on public.user_exercises
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users update own exercises" on public.user_exercises
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users delete own exercises" on public.user_exercises
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.user_exercises from anon;
-- 사용자가 정하는 칸은 이름·부위·맨몸 여부뿐이다. id·주인·시각은 기본값과 트리거가 정한다.
revoke insert, update on public.user_exercises from authenticated;
grant insert (name, body_part, bodyweight) on public.user_exercises to authenticated;
grant update (name, body_part, bodyweight) on public.user_exercises to authenticated;

revoke execute on function private.limit_user_exercises() from public, anon, authenticated;

-- 내가 쓴 헬스 기록의 종목 이름 가운데 사전·내 종목에 없는 것을 공백을 뺀 이름으로 묶어 돌려준다.
-- "기록에만 있는 종목"을 찾는 데 쓴다. 사전은 앱 코드에 있어서 앱이 공백을 뺀 사전 이름을 p_exclude로 넘긴다.
-- 내 종목은 여기서 뺀다. limit보다 먼저 빼서, 이름이 많은 사람도 등록할 이름이 뒤로 밀려 잘리지 않는다.
-- 표시 이름은 가장 최근 기록에 쓴 그대로(앞뒤 공백만 뺀다). 동행으로만 붙은 기록은 남이 쓴 이름이라 뺀다.
-- security invoker이므로 workouts / strength_sets의 RLS를 그대로 따른다. 원본 세트를 가져오지 않아 max_rows에 잘리지 않는다.
create function public.get_my_exercise_names(p_exclude text[] default '{}')
  returns table (exercise_name text, workout_count integer, last_workout_date date)
  language sql
  stable
  security invoker
  set search_path to ''
as $$
  with my_names as (
    select
      regexp_replace(s.exercise_name, U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+', '', 'g') as key,
      btrim(s.exercise_name) as name,
      w.id, w.workout_date, w.created_at
    from public.workouts w
    join public.strength_sets s on s.workout_id = w.id
    where w.kind = 'strength' and w.user_id = (select auth.uid())
  ),
  candidates as (
    select * from my_names n
    where n.key <> ''
      and not (n.key = any (coalesce(p_exclude, '{}')))
      and not exists (
        select 1 from public.user_exercises e
        where e.user_id = (select auth.uid())
          and regexp_replace(e.name, U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+', '', 'g') = n.key
      )
  ),
  latest as (
    select distinct on (key collate "C") key, name, workout_date
    from candidates
    order by key collate "C", workout_date desc, created_at desc, id desc
  ),
  counts as (
    select key, count(distinct id)::integer as workout_count from candidates group by key
  )
  select l.name, c.workout_count, l.workout_date
  from latest l join counts c on c.key = l.key
  order by c.workout_count desc, l.workout_date desc, l.name collate "C"
  limit 500;
$$;

revoke all on function public.get_my_exercise_names(text[]) from public, anon;
grant execute on function public.get_my_exercise_names(text[]) to authenticated;
