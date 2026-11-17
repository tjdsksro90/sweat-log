-- 로컬 Supabase 전용. 모든 테스트 데이터는 마지막에 롤백한다.
begin;
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
 ('00000000-0000-0000-0000-00000000000a', 'exercise-a@test.dev', '{"nickname":"A"}', 'authenticated', 'authenticated'),
 ('00000000-0000-0000-0000-00000000000b', 'exercise-b@test.dev', '{"nickname":"B"}', 'authenticated', 'authenticated'),
 ('00000000-0000-0000-0000-00000000000c', 'exercise-c@test.dev', '{"nickname":"C"}', 'authenticated', 'authenticated'),
 ('00000000-0000-0000-0000-00000000000d', 'exercise-d@test.dev', '{"nickname":"D"}', 'authenticated', 'authenticated');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}',true);
create temp table crew_ctx on commit drop as select id, invite_code from public.create_crew('헬스 테스트');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}',true);
select public.join_crew_by_code((select invite_code from crew_ctx));
reset role;

-- fixture 삽입은 관리자로, 모든 검증은 authenticated + 실제 JWT 사용자로 실행한다.
create temp table fixture (name text, id uuid default gen_random_uuid(), author uuid, day date, crew boolean, kind text, exercise text, weight numeric) on commit drop;
insert into fixture (name,author,day,crew,kind,exercise,weight) values
 ('own','00000000-0000-0000-0000-00000000000a','2026-11-01',false,'strength',' 벤치 프레스 ',90),
 ('tie','00000000-0000-0000-0000-00000000000a','2026-11-03',false,'strength',E'벤치\t프레스',90),
 ('with_a','00000000-0000-0000-0000-00000000000b','2026-10-31',true,'strength',U&'벤치\00A0프레스',90),
 ('shared','00000000-0000-0000-0000-00000000000b','2026-11-01',true,'strength','벤치프레스',999),
 ('private_b','00000000-0000-0000-0000-00000000000b','2026-11-01',false,'strength','벤치프레스',998),
 ('private_c','00000000-0000-0000-0000-00000000000c','2026-11-01',false,'strength','벤치프레스',997),
 ('future','00000000-0000-0000-0000-00000000000a','2026-11-18',false,'strength','벤치프레스',1000),
 ('other','00000000-0000-0000-0000-00000000000a','2026-11-01',false,'other','벤치프레스',1000),
 ('body','00000000-0000-0000-0000-00000000000a','2026-11-01',false,'strength','풀업',null),
 ('zero','00000000-0000-0000-0000-00000000000a','2026-11-01',false,'strength','제로종목',0);
insert into public.workouts(id,user_id,kind,workout_date,crew_id)
 select id,author,kind,day,case when crew then (select id from crew_ctx) else null end from fixture;
insert into public.strength_sets(workout_id,exercise_name,exercise_order,set_order,weight_kg,reps)
 select id,exercise,0,0,weight,5 from fixture;
insert into public.strength_sets(workout_id,exercise_name,exercise_order,set_order,weight_kg,reps)
 select id,'벤치프레스',0,1,80,5 from fixture where name='own';
insert into public.workout_companions(workout_id,user_id)
 select id,'00000000-0000-0000-0000-00000000000a' from fixture where name='with_a';

-- 1000행을 넘은 뒤의 최고 무게도 빠짐없이 집계해야 한다.
insert into public.workouts(id,user_id,kind,workout_date)
 select md5('strength-bulk-'||n)::uuid,'00000000-0000-0000-0000-00000000000a','strength','2026-09-01'
 from generate_series(1,1001) n;
insert into public.strength_sets(workout_id,exercise_name,exercise_order,set_order,weight_kg,reps)
 select md5('strength-bulk-'||n)::uuid,'대량종목',0,0,case when n=1001 then 321.25 else 1 end,5
 from generate_series(1,1001) n;
grant select on fixture to authenticated;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}',true);
do $$
begin
 assert (select count(*) from public.workouts where id=(select id from fixture where name='shared'))=1, '공유만 받은 기록은 보인다';
 assert (select count(*) from public.workouts where id=(select id from fixture where name='private_b'))=0, 'B 비공유는 RLS 차단';
 assert (select count(*) from public.strength_sets where workout_id=(select id from fixture where name='private_c'))=0, 'C 비공유 세트도 RLS 차단';
 assert (select count(*) from public.get_strength_records('2026-11-17'))=4, '공백을 제거해 종목을 합친다';
 assert (select max_weight_kg from public.get_strength_records('2026-11-17') where exercise_name='벤치프레스')=90, '공유만/남의 비공유/다른 종류/미래 제외';
 assert (select workout_count from public.get_strength_records('2026-11-17') where exercise_name='벤치프레스')=3, '동행 포함, 세트 중복 제외';
 assert (select workout_id from public.get_strength_records('2026-11-17') where exercise_name='벤치프레스')=(select id from fixture where name='with_a'), '동점은 최초 달성 날짜';
 assert (select workout_date from public.get_strength_records('2026-11-17') where exercise_name='벤치프레스')='2026-10-31', '최고 무게 날짜';
 assert (select max_weight_kg is null from public.get_strength_records('2026-11-17') where exercise_name='풀업'), '맨몸 null 유지';
 assert (select max_weight_kg from public.get_strength_records('2026-11-17') where exercise_name='제로종목')=0, '명시한 0은 null이 아니다';
 assert (select workout_count from public.get_strength_records('2026-11-17') where exercise_name='대량종목')=1001, '1000행 제한 없이 횟수 집계';
 assert (select max_weight_kg from public.get_strength_records('2026-11-17') where exercise_name='대량종목')=321.25, '1001번째 최고 무게 포함';
 assert (select exercise_name from public.get_strength_records('2026-11-17',1))='대량종목', '많이 한 종목 우선';
 assert (select count(*) from public.get_strength_records('2026-11-17',0))=1, 'limit 최소 1';
 assert (select count(*) from public.get_strength_records('2026-11-17',null))=4, 'null limit 기본값';
 assert (select count(*) from public.get_strength_records('2020-01-01'))=0, '기준일 이전 기록 없음';
 assert (select max_weight_kg from public.get_strength_records('2026-11-18') where exercise_name='벤치프레스')=1000, '기준일 당일 포함';
 assert not (select prosecdef from pg_proc where oid='public.get_strength_records(date,integer)'::regprocedure), 'security invoker';
end $$;

-- 맨몸과 추가 중량이 섞인 종목은 숫자 무게가 우선한다.
update public.strength_sets set exercise_name='풀업' where workout_id=(select id from fixture where name='zero');
do $$ begin
 assert (select max_weight_kg from public.get_strength_records('2026-11-17') where exercise_name='풀업')=0, 'null보다 명시적 0kg 우선';
end $$;
update public.strength_sets set weight_kg=12.5 where workout_id=(select id from fixture where name='zero');
do $$ begin
 assert (select max_weight_kg from public.get_strength_records('2026-11-17') where exercise_name='풀업')=12.5, '맨몸과 추가 중량 혼합';
end $$;
insert into public.strength_sets(workout_id,exercise_name,exercise_order,set_order,weight_kg,reps)
 select (select id from fixture where name='own'),'추가종목'||n,n,0,10,5 from generate_series(1,25) n;
do $$ begin
 assert (select count(*) from public.get_strength_records('2026-11-17',100))=20, 'limit 최대 20';
 assert (select count(*) from public.get_strength_records('2026-11-17',null))=5, 'limit 기본 5';
end $$;

-- 각 사용자는 자신의 기록만 집계한다.
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}',true);
do $$ begin
 assert (select max_weight_kg from public.get_strength_records('2026-11-17'))=999, 'B 최고 무게';
 assert (select workout_count from public.get_strength_records('2026-11-17'))=3, 'B 기록만 세 건';
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}',true);
do $$ begin assert (select max_weight_kg from public.get_strength_records('2026-11-17'))=997, 'C 자기 기록만'; end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}',true);
do $$ begin assert (select count(*) from public.get_strength_records('2026-11-17'))=0, '빈 계정'; end $$;

reset role;
set local role anon;
do $$ begin
 begin
  perform public.get_strength_records('2026-11-17');
  raise exception '익명 호출 허용됨';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
select 'strength-records: all checks passed' as result;
rollback;
