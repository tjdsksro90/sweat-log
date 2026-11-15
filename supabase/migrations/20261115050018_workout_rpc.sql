-- 운동 기록 저장·목록 함수
--
-- save_workout: 공통 정보와 종류별 상세, 함께한 친구를 한 트랜잭션으로 저장한다.
-- list_workouts: 목록 화면이 보는 범위(내 기록 또는 크루 피드)를 고르고 커서로 이어 본다.
-- 둘 다 security invoker라서 RLS가 그대로 적용된다. 권한은 정책이 판단하고, 함수는 입력 모양과
-- 화면에 돌려줄 오류 코드만 책임진다.

-- 입력은 contracts.ts의 WorkoutInput을 snake_case로 바꾼 JSON이다.
-- {
--   "id": uuid | null,            -- 있으면 수정, 없으면 생성
--   "kind": "run" | "strength" | "other",
--   "workout_date": "YYYY-MM-DD",
--   "title", "memo", "place_name": text | null,
--   "crew_id": uuid | null,
--   "companion_ids": uuid[],
--   "duration_seconds": int | null,   -- 헬스·기타만. 러닝은 run.duration_seconds
--   "run": { "distance_meters": int, "duration_seconds": int } | null,
--   "exercises": [{ "name": text, "sets": [{ "weight_kg": number | null, "reps": int }] }]
-- }
--
-- 오류 코드(raise exception의 message):
--   not_authenticated       로그인하지 않음
--   invalid_workout_input   필수 값(kind, workout_date)이 없거나, uuid·날짜·숫자 형식이 틀리거나,
--                           숫자가 컬럼 타입 범위를 넘음(reps 99999 등)
--   invalid_workout_detail  종류와 상세가 맞지 않거나(러닝인데 run이 없음, 헬스인데 종목이 없음 등)
--                           상세의 필수 값이 빠짐(run의 거리·시간, 종목 이름, 세트 횟수)
--   workout_not_found       수정할 기록이 없거나 내 기록이 아님
--   invalid_crew            내가 속하지 않은 크루에 공유
--   invalid_companion       크루 친구가 아닌 사람을 함께한 친구로 지정
-- 타입 범위 안에서 길이·값 범위(제목 50자, 횟수 1~1000 등)는 테이블 check 제약이 맡고, 원래 오류(23514)가 그대로 나간다.
create function public.save_workout(p_input jsonb) returns uuid
  language plpgsql
  security invoker
  set search_path to ''
as $$
declare
  current_user_id uuid := auth.uid();
  v_id uuid;
  v_kind text;
  v_crew_id uuid;
  v_duration integer;
  v_run jsonb;
  v_exercises jsonb;
  v_companion_ids uuid[];
  v_exercise record;
  v_set record;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_input is null or jsonb_typeof(p_input) <> 'object' then
    raise exception 'invalid_workout_input';
  end if;

  v_id := nullif(p_input ->> 'id', '')::uuid;
  v_kind := p_input ->> 'kind';
  v_crew_id := nullif(p_input ->> 'crew_id', '')::uuid;
  v_duration := (p_input ->> 'duration_seconds')::integer;
  v_run := nullif(p_input -> 'run', 'null'::jsonb);
  v_exercises := coalesce(nullif(p_input -> 'exercises', 'null'::jsonb), '[]'::jsonb);

  if v_kind is null or v_kind not in ('run', 'strength', 'other') or p_input ->> 'workout_date' is null then
    raise exception 'invalid_workout_input';
  end if;

  if jsonb_typeof(v_exercises) <> 'array'
    or (v_run is not null and jsonb_typeof(v_run) <> 'object')
    or jsonb_typeof(coalesce(p_input -> 'companion_ids', '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_workout_input';
  end if;

  -- 종류와 상세가 서로 맞아야 한다. 다른 종류의 상세가 같이 오면 화면 버그라서 조용히 버리지 않는다.
  if v_kind = 'run' then
    if v_run is null or jsonb_array_length(v_exercises) > 0 or v_duration is not null then
      raise exception 'invalid_workout_detail';
    end if;
  elsif v_kind = 'strength' then
    if v_run is not null or jsonb_array_length(v_exercises) = 0 then
      raise exception 'invalid_workout_detail';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(v_exercises) e
      where jsonb_typeof(e -> 'sets') is distinct from 'array'
        or jsonb_array_length(e -> 'sets') = 0
    ) then
      raise exception 'invalid_workout_detail';
    end if;
  else
    if v_run is not null or jsonb_array_length(v_exercises) > 0 then
      raise exception 'invalid_workout_detail';
    end if;
  end if;

  -- 정책도 막지만, 화면이 알아들을 오류 코드를 주려고 먼저 확인한다.
  if v_crew_id is not null and not private.is_crew_member(v_crew_id) then
    raise exception 'invalid_crew';
  end if;

  -- 중복과 나 자신은 뺀다. 나는 이미 작성자다.
  select coalesce(array_agg(distinct value::uuid), '{}')
  into v_companion_ids
  from jsonb_array_elements_text(coalesce(p_input -> 'companion_ids', '[]'::jsonb))
  where value::uuid <> current_user_id;

  if exists (select 1 from unnest(v_companion_ids) as c(user_id) where not private.shares_crew_with(c.user_id)) then
    raise exception 'invalid_companion';
  end if;

  if v_id is null then
    insert into public.workouts (user_id, crew_id, kind, workout_date, duration_seconds, title, memo, place_name)
    values (
      current_user_id,
      v_crew_id,
      v_kind,
      (p_input ->> 'workout_date')::date,
      v_duration,
      p_input ->> 'title',
      p_input ->> 'memo',
      p_input ->> 'place_name'
    )
    returning id into v_id;
  else
    -- 남의 기록은 RLS 때문에 0건이 갱신된다.
    update public.workouts
    set crew_id = v_crew_id,
        kind = v_kind,
        workout_date = (p_input ->> 'workout_date')::date,
        duration_seconds = v_duration,
        title = p_input ->> 'title',
        memo = p_input ->> 'memo',
        place_name = p_input ->> 'place_name'
    where id = v_id
      and user_id = current_user_id;

    if not found then
      raise exception 'workout_not_found';
    end if;

    -- 종류가 바뀌었을 수 있으니 상세와 동행자는 지우고 다시 넣는다.
    delete from public.run_details where workout_id = v_id;
    delete from public.strength_sets where workout_id = v_id;
    delete from public.workout_companions where workout_id = v_id;
  end if;

  if v_kind = 'run' then
    insert into public.run_details (workout_id, distance_meters, duration_seconds)
    values (v_id, (v_run ->> 'distance_meters')::integer, (v_run ->> 'duration_seconds')::integer);
  elsif v_kind = 'strength' then
    for v_exercise in
      select e.value as exercise, e.ordinality - 1 as exercise_order
      from jsonb_array_elements(v_exercises) with ordinality as e
    loop
      for v_set in
        select s.value as item, s.ordinality - 1 as set_order
        from jsonb_array_elements(v_exercise.exercise -> 'sets') with ordinality as s
      loop
        insert into public.strength_sets (workout_id, exercise_name, exercise_order, set_order, weight_kg, reps)
        values (
          v_id,
          btrim(v_exercise.exercise ->> 'name'),
          v_exercise.exercise_order,
          v_set.set_order,
          (v_set.item ->> 'weight_kg')::numeric,
          (v_set.item ->> 'reps')::smallint
        );
      end loop;
    end loop;
  end if;

  insert into public.workout_companions (workout_id, user_id)
  select v_id, c.user_id
  from unnest(v_companion_ids) as c(user_id);

  return v_id;
exception
  -- 잘못된 uuid·날짜·숫자 문자열, smallint·integer 범위를 넘는 숫자
  when invalid_text_representation or invalid_datetime_format or datetime_field_overflow
    or numeric_value_out_of_range then
    raise exception 'invalid_workout_input';
  -- 공통 정보의 필수 값은 위에서 먼저 확인하므로, not null 위반은 상세(run, 종목, 세트)에서만 난다.
  when not_null_violation then
    raise exception 'invalid_workout_detail';
end;
$$;

-- 목록 화면이 보는 범위. RLS로 볼 수 있는 기록 중에서
--   p_crew_id가 없으면 내 기록(내가 쓴 것 + 함께한 친구로 지정된 것),
--   있으면 그 크루에 공유된 기록(크루 피드).
-- 커서는 (workout_date, created_at, id) 내림차순 기준 마지막 항목이다. 정렬과 개수 제한은 호출하는 쪽이
-- 같은 순서로 건다. setof workouts를 돌려주므로 PostgREST에서 관계(상세, 프로필)를 함께 select할 수 있다.
create function public.list_workouts(
  p_crew_id uuid default null,
  p_from date default null,
  p_to date default null,
  p_kind text default null,
  p_cursor_date date default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
) returns setof public.workouts
  language sql
  stable
  security invoker
  set search_path to ''
as $$
  select w.*
  from public.workouts w
  where (
      case
        when p_crew_id is null then
          w.user_id = (select auth.uid())
          or exists (
            select 1
            from public.workout_companions c
            where c.workout_id = w.id
              and c.user_id = (select auth.uid())
          )
        else w.crew_id = p_crew_id
      end
    )
    and (p_from is null or w.workout_date >= p_from)
    and (p_to is null or w.workout_date <= p_to)
    and (p_kind is null or w.kind = p_kind)
    and (
      p_cursor_id is null
      or (w.workout_date, w.created_at, w.id) < (p_cursor_date, p_cursor_created_at, p_cursor_id)
    );
$$;

revoke all on function public.save_workout(jsonb) from public, anon;
revoke all on function public.list_workouts(uuid, date, date, text, date, timestamptz, uuid) from public, anon;
grant execute on function public.save_workout(jsonb) to authenticated;
grant execute on function public.list_workouts(uuid, date, date, text, date, timestamptz, uuid) to authenticated;
