-- 내 작성·동행 헬스에서 종목별 최고 무게를 집계한다. 크루 공유만 받은 기록은 제외한다.
-- security invoker이므로 workouts / strength_sets / workout_companions의 RLS를 그대로 따른다.
-- 원본 세트를 클라이언트로 가져오지 않아 PostgREST max_rows=1000에 잘리지 않는다.
-- p_today: 한국 시간 기준 오늘. 미래 계획은 제외. p_limit: 많이 한 종목 수(기본 5, 1~20).
-- 횟수는 세트 수가 아닌 종목을 포함한 서로 다른 운동 기록 수다.
-- 이름은 JS normalizeExerciseName의 \s와 같은 공백을 모두 제거해 비교한다. 대소문자는 구분한다.
-- 같은 무게면 날짜, 작성 시각, workout id 순으로 먼저 달성한 기록을 택한다.
-- 무게가 전부 null인 종목도 반환하며, null을 0kg로 바꾸지 않는다(날짜는 첫 맨몸 기록).
create function public.get_strength_records(p_today date, p_limit integer default 5)
  returns table (
    exercise_name text,
    max_weight_kg numeric,
    workout_date date,
    workout_id uuid,
    workout_count integer
  )
  language sql
  stable
  security invoker
  set search_path to ''
as $$
  with my_sets as (
    select
      regexp_replace(s.exercise_name, U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+', '', 'g') as name,
      s.weight_kg, w.workout_date, w.created_at, w.id
    from public.workouts w
    join public.strength_sets s on s.workout_id = w.id
    where w.kind = 'strength'
      and w.workout_date <= p_today
      and (
        w.user_id = (select auth.uid())
        or exists (
          select 1 from public.workout_companions c
          where c.workout_id = w.id and c.user_id = (select auth.uid())
        )
      )
  ),
  counts as (
    select name, count(distinct id)::integer as workout_count
    from my_sets where name <> '' group by name
  ),
  best as (
    select distinct on (name collate "C") name, weight_kg, workout_date, id
    from my_sets where name <> ''
    order by name collate "C", weight_kg desc nulls last, workout_date, created_at, id
  )
  select b.name, b.weight_kg, b.workout_date, b.id, c.workout_count
  from best b join counts c on c.name = b.name
  order by c.workout_count desc, b.name collate "C"
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
$$;

revoke all on function public.get_strength_records(date, integer) from public, anon;
grant execute on function public.get_strength_records(date, integer) to authenticated;
