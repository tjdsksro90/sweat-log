-- 러닝 통계 함수
--
-- 대상은 "내 러닝"이다. 내가 작성했거나 함께한 친구로 들어간 러닝 기록만 센다(list_workouts의 내 기록과 같은 범위).
-- 크루에 공유돼 볼 수는 있지만 내가 뛰지 않은 친구의 러닝은 넣지 않는다.
-- 앱에서 기록을 받아 합산하면 PostgREST 행 제한(max_rows)에 잘리므로 DB에서 집계한다.
-- 둘 다 security invoker라서 RLS가 그대로 적용된다. 위 범위 조건은 RLS 위에 한 번 더 거는 필터다.
-- p_today는 한국 시간 오늘이다(DB의 current_date는 UTC라서 앱이 넘긴다). 그 뒤 날짜의 기록(미리 적어 둔 계획)은 세지 않는다.
-- 페이스는 저장하지 않는다. 함수는 정렬에만 쓰고, 화면 표시는 앱의 pace.ts가 거리와 시간으로 계산한다.

-- 최근 p_months개월(이번 달 포함)의 월별 누적 거리. 러닝이 없는 달도 0으로 돌려준다.
-- month는 그 달 1일, 오래된 달부터 정렬한다. p_months는 1~24로 자른다.
create function public.get_running_monthly_distance(p_today date, p_months integer default 12)
  returns table (month date, distance_meters bigint, run_count integer)
  language sql
  stable
  security invoker
  set search_path to ''
as $$
  with bounds as (
    select
      date_trunc('month', p_today)::date as last_month,
      (date_trunc('month', p_today) - make_interval(months => least(greatest(coalesce(p_months, 12), 1), 24) - 1))::date
        as first_month
  ),
  months as (
    select m::date as month
    from bounds b, generate_series(b.first_month, b.last_month, interval '1 month') as m
  ),
  my_runs as (
    select date_trunc('month', w.workout_date)::date as month, r.distance_meters
    from public.workouts w
    join public.run_details r on r.workout_id = w.id
    cross join bounds b
    where w.kind = 'run'
      and w.workout_date >= b.first_month
      and w.workout_date <= p_today
      and (
        w.user_id = (select auth.uid())
        or exists (
          select 1
          from public.workout_companions c
          where c.workout_id = w.id
            and c.user_id = (select auth.uid())
        )
      )
  )
  select m.month, coalesce(sum(r.distance_meters), 0)::bigint, count(r.distance_meters)::integer
  from months m
  left join my_runs r on r.month = m.month
  group by m.month
  order by m.month;
$$;

-- 기간 제한 없는 개인 기록. 기록 종류마다 한 행이고, 해당하는 러닝이 없으면 그 종류의 행이 없다.
--   best_pace         1km 이상 러닝 중 평균 페이스가 가장 빠른 기록(짧은 질주가 최고 기록이 되지 않게)
--   best_pace_5k      5km 이상 러닝 중 가장 빠른 기록
--   best_pace_10k     10km 이상 러닝 중 가장 빠른 기록
--   longest_distance  가장 멀리 달린 기록
--   longest_duration  가장 오래 달린 기록
-- 같은 값이면 먼저 세운 기록(날짜, 작성 시각, id 순)을 고른다.
create function public.get_running_records(p_today date)
  returns table (
    record_type text,
    workout_id uuid,
    workout_date date,
    distance_meters integer,
    duration_seconds integer
  )
  language sql
  stable
  security invoker
  set search_path to ''
as $$
  with my_runs as (
    select w.id, w.workout_date, w.created_at, r.distance_meters, r.duration_seconds,
      r.duration_seconds::numeric / r.distance_meters as seconds_per_meter
    from public.workouts w
    join public.run_details r on r.workout_id = w.id
    where w.kind = 'run'
      and w.workout_date <= p_today
      and r.distance_meters > 0
      and r.duration_seconds > 0
      and (
        w.user_id = (select auth.uid())
        or exists (
          select 1
          from public.workout_companions c
          where c.workout_id = w.id
            and c.user_id = (select auth.uid())
        )
      )
  ),
  ranked as (
    select 'best_pace' as record_type, x.*
    from (
      select * from my_runs where distance_meters >= 1000
      order by seconds_per_meter, workout_date, created_at, id limit 1
    ) x
    union all
    select 'best_pace_5k', x.*
    from (
      select * from my_runs where distance_meters >= 5000
      order by seconds_per_meter, workout_date, created_at, id limit 1
    ) x
    union all
    select 'best_pace_10k', x.*
    from (
      select * from my_runs where distance_meters >= 10000
      order by seconds_per_meter, workout_date, created_at, id limit 1
    ) x
    union all
    select 'longest_distance', x.*
    from (select * from my_runs order by distance_meters desc, workout_date, created_at, id limit 1) x
    union all
    select 'longest_duration', x.*
    from (select * from my_runs order by duration_seconds desc, workout_date, created_at, id limit 1) x
  )
  select record_type, id, workout_date, distance_meters, duration_seconds
  from ranked;
$$;

revoke all on function public.get_running_monthly_distance(date, integer) from public, anon;
grant execute on function public.get_running_monthly_distance(date, integer) to authenticated;
revoke all on function public.get_running_records(date) from public, anon;
grant execute on function public.get_running_records(date) to authenticated;
