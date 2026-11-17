-- 헬스 루틴 템플릿
--
-- 자주 하는 헬스 구성(종목 순서, 종목별 세트의 무게 × 횟수)을 이름 붙여 저장해 두고, 기록을 쓸 때 불러와 채운다.
--
-- 구조: 루틴 한 행에 구성 전체를 jsonb(exercises)로 둔다.
--   - 루틴은 늘 통째로 읽고 통째로 저장한다. 종목·세트 하나만 따로 조회하거나 집계할 일이 없다.
--     종목별 최고 무게 같은 통계는 실제로 한 운동(strength_sets)에서만 계산한다.
--   - 행을 나누면(routines + routine_exercises + routine_sets) 수정할 때 지우고 다시 넣는 과정을
--     한 트랜잭션으로 묶는 RPC가 따로 필요하다. 한 행이면 RLS가 걸린 insert·update 한 번으로 끝난다.
--   - 모양과 범위는 check 제약(private.is_valid_routine_exercises)이 strength_sets와 같은 규칙으로 막는다.
--   - 불러오기는 폼에 값을 복사하는 것이라, 루틴을 고치거나 지워도 이미 저장한 기록은 바뀌지 않는다.
--
-- exercises 모양
--   [{ "name": "스쿼트", "sets": [{ "weight_kg": 60, "reps": 10 }, { "weight_kg": null, "reps": 12 }] }, …]
--   - 종목 1~20개, 종목마다 세트 1~30개 (작성 폼의 MAX_EXERCISES, MAX_SETS_PER_EXERCISE와 같다)
--   - name: 앞뒤 공백을 뺀 1~50자. weight_kg: null(맨몸) 또는 0~1000, 소수 둘째 자리까지. reps: 1~1000 정수
--   - 위 키 말고 다른 키는 받지 않는다.
--
-- 이름은 1~40자, 한 사람당 루틴은 30개까지다(트리거가 profiles 행을 잠그고 센다).
--
-- 권한: 루틴은 본인만 보고 만들고 고치고 지운다. 크루 공유는 하지 않는다.

create function private.is_valid_routine_exercises(p_exercises jsonb) returns boolean
  language plpgsql
  immutable
  set search_path to ''
as $$
declare
  exercise jsonb;
  set_item jsonb;
  weight numeric;
  reps numeric;
begin
  if jsonb_typeof(p_exercises) is distinct from 'array'
    or jsonb_array_length(p_exercises) not between 1 and 20 then
    return false;
  end if;

  for exercise in select value from jsonb_array_elements(p_exercises) loop
    if jsonb_typeof(exercise) <> 'object'
      or exists (select 1 from jsonb_object_keys(exercise) as key where key not in ('name', 'sets'))
      or jsonb_typeof(exercise -> 'name') is distinct from 'string'
      or char_length(btrim(exercise ->> 'name')) not between 1 and 50
      or exercise ->> 'name' <> btrim(exercise ->> 'name')
      or jsonb_typeof(exercise -> 'sets') is distinct from 'array'
      or jsonb_array_length(exercise -> 'sets') not between 1 and 30 then
      return false;
    end if;

    for set_item in select value from jsonb_array_elements(exercise -> 'sets') loop
      if jsonb_typeof(set_item) <> 'object'
        or exists (select 1 from jsonb_object_keys(set_item) as key where key not in ('weight_kg', 'reps'))
        or jsonb_typeof(set_item -> 'reps') is distinct from 'number'
        or coalesce(jsonb_typeof(set_item -> 'weight_kg'), 'missing') not in ('number', 'null') then
        return false;
      end if;

      reps := (set_item ->> 'reps')::numeric;
      if reps <> trunc(reps) or reps not between 1 and 1000 then
        return false;
      end if;

      if jsonb_typeof(set_item -> 'weight_kg') = 'number' then
        weight := (set_item ->> 'weight_kg')::numeric;
        if weight not between 0 and 1000 or weight * 100 <> trunc(weight * 100) then
          return false;
        end if;
      end if;
    end loop;
  end loop;

  return true;
end;
$$;

create table public.workout_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40 and name = btrim(name)),
  exercises jsonb not null check (private.is_valid_routine_exercises(exercises)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_routines_user_id_idx on public.workout_routines (user_id, updated_at desc);

create trigger workout_routines_set_updated_at
  before update on public.workout_routines
  for each row execute function private.set_updated_at();

-- 한 사람당 30개. 동시에 여러 개를 넣어도 넘지 않도록 그 사람의 profiles 행을 잠그고 센다.
-- 트리거는 RLS(with check)보다 먼저 돈다. 남의 user_id로 넣는 요청은 세지 않고 넘겨서 RLS가 막게 한다.
-- 그래야 남의 루틴 개수를 오류로 엿볼 수 없다.
create function private.limit_workout_routines() returns trigger
  language plpgsql
  security definer
  set search_path to ''
as $$
begin
  if new.user_id is distinct from auth.uid() then
    return new;
  end if;

  perform 1 from public.profiles where id = new.user_id for update;

  if (select count(*) from public.workout_routines where user_id = new.user_id) >= 30 then
    raise exception 'too_many_routines' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger workout_routines_limit
  before insert on public.workout_routines
  for each row execute function private.limit_workout_routines();

alter table public.workout_routines enable row level security;

create policy "Users view own routines" on public.workout_routines
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users create own routines" on public.workout_routines
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- 주인을 남으로 바꾸지 못하게 with check도 본인이어야 한다.
create policy "Users update own routines" on public.workout_routines
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users delete own routines" on public.workout_routines
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.workout_routines from anon;
-- 만든 시각은 바꿀 일이 없다. 주인과 id도 고정이다.
revoke update on public.workout_routines from authenticated;
grant update (name, exercises) on public.workout_routines to authenticated;

-- check 제약의 검증 함수는 요청한 사용자 권한으로 실행된다.
grant execute on function private.is_valid_routine_exercises(jsonb) to authenticated;
revoke execute on function private.limit_workout_routines() from public, anon, authenticated;
