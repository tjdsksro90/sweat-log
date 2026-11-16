-- 크루를 나간 동행자가 있는 예전 기록도 수정할 수 있게 한다.
--
-- 이전 save_workout은 수정할 때 모든 동행자를 같은 크루인지 다시 검사하고, 지운 뒤 다시 넣었다.
-- 동행자가 나와 같은 크루를 모두 나가면 메모만 바꿔도 invalid_companion으로 실패했다.
-- (다시 넣는 insert도 "Authors add companions" 정책의 shares_crew_with에 막힌다.)
--
-- 바뀐 규칙
--   - 이 기록에 이미 있던 동행자는 크루 검사 없이 그대로 둔다. 지우고 다시 넣지 않는다.
--   - 새로 추가하는 동행자만 같은 크루인지 검사한다. 정책도 새 행에만 걸린다.
--   - 입력에서 빠진 동행자는 지운다.
-- 함수 시그니처, security invoker, 입력 모양, 오류 코드는 그대로다(20261115050018_workout_rpc.sql 주석 참고).
create or replace function public.save_workout(p_input jsonb) returns uuid
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
  v_existing_companion_ids uuid[];
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

  -- 수정이면 이 기록에 이미 있는 동행자. 내 기록이 아니면 비워 두고, 아래 update에서 workout_not_found가 난다.
  select coalesce(array_agg(c.user_id), '{}')
  into v_existing_companion_ids
  from public.workout_companions c
  join public.workouts w on w.id = c.workout_id
  where v_id is not null
    and c.workout_id = v_id
    and w.user_id = current_user_id;

  if exists (
    select 1
    from unnest(v_companion_ids) as c(user_id)
    where c.user_id <> all (v_existing_companion_ids)
      and not private.shares_crew_with(c.user_id)
  ) then
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

    -- 종류가 바뀌었을 수 있으니 상세는 지우고 다시 넣는다.
    delete from public.run_details where workout_id = v_id;
    delete from public.strength_sets where workout_id = v_id;
    -- 동행자는 빠진 사람만 지운다. 남은 사람은 크루를 나갔어도 그대로 둔다.
    delete from public.workout_companions
    where workout_id = v_id
      and user_id <> all (v_companion_ids);
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

  -- 새로 추가된 동행자만 넣는다.
  insert into public.workout_companions (workout_id, user_id)
  select v_id, c.user_id
  from unnest(v_companion_ids) as c(user_id)
  where c.user_id <> all (v_existing_companion_ids);

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
