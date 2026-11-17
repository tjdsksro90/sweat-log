-- 푸시 구독 권한 검증. 로컬 DB에서 실행하고 마지막에 롤백하므로 데이터가 남지 않는다.
-- 실행: docker exec -i supabase_db_sweat-log psql -U postgres -v ON_ERROR_STOP=1 -q < supabase/tests/push-subscriptions.sql
--
-- 등장인물
--   A(민수), B(지은): 같은 크루. 서로 기록은 보지만 구독은 못 본다.

begin;

insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('00000000-0000-0000-0000-00000000001a', 'push-a@test.dev', '{"nickname":"민수"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000001b', 'push-b@test.dev', '{"nickname":"지은"}', 'authenticated', 'authenticated');

create temporary table ctx (invite_code text);
grant all on ctx to authenticated;

-- A: 크루를 만들고 구독을 저장한다
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000001a","role":"authenticated"}', true);

insert into ctx (invite_code) select invite_code from public.create_crew('푸시크루');

select public.save_push_subscription('https://push.test/a-phone', 'a-key', 'a-auth');
select public.save_push_subscription('https://push.test/shared-laptop', 'laptop-key', 'laptop-auth');

-- 같은 endpoint를 다시 저장하면 새 행이 아니라 키만 바뀐다
select public.save_push_subscription('https://push.test/a-phone', 'a-key-2', 'a-auth-2');

do $$
begin
  assert (select count(*) from public.push_subscriptions) = 2, 'A는 자기 구독 2개를 본다';
  assert (select p256dh from public.push_subscriptions where endpoint = 'https://push.test/a-phone') = 'a-key-2',
    '같은 endpoint는 키를 갱신한다';
end $$;

-- 남의 이름으로 직접 넣을 수 없다
do $$
begin
  begin
    insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
    values ('00000000-0000-0000-0000-00000000001b', 'https://push.test/fake', 'k', 'a');
    raise exception '다른 사용자 이름으로 구독을 넣었다';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- https가 아닌 주소는 거절한다
do $$
begin
  begin
    perform public.save_push_subscription('http://push.test/plain', 'k', 'a');
    raise exception 'https가 아닌 endpoint가 저장됐다';
  exception when raise_exception then
    if sqlerrm <> 'invalid_push_subscription' then
      raise;
    end if;
  end;
end $$;

-- B: 같은 크루에 들어온다
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000001b","role":"authenticated"}', true);
select public.join_crew_by_code(invite_code) from ctx;

do $$
begin
  assert (select count(*) from public.push_subscriptions) = 0, '같은 크루여도 A의 구독은 보이지 않는다';
end $$;

-- B는 A의 구독을 고치거나 지울 수 없다(0건 처리)
update public.push_subscriptions set p256dh = 'stolen' where endpoint = 'https://push.test/a-phone';
delete from public.push_subscriptions where endpoint = 'https://push.test/a-phone';

-- B가 A가 쓰던 노트북에서 알림을 켜면 그 브라우저의 구독 주인이 B로 바뀐다
select public.save_push_subscription('https://push.test/shared-laptop', 'laptop-key-b', 'laptop-auth-b');

do $$
begin
  assert (select count(*) from public.push_subscriptions) = 1, 'B는 노트북 구독 하나만 본다';
end $$;

delete from public.push_subscriptions where endpoint = 'https://push.test/shared-laptop';

do $$
begin
  assert (select count(*) from public.push_subscriptions) = 0, 'B는 자기 구독을 지운다';
end $$;

-- A로 돌아와 확인: 휴대폰 구독은 그대로, 노트북은 B에게 넘어갔다가 지워졌다
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000001a","role":"authenticated"}', true);

do $$
begin
  assert (select count(*) from public.push_subscriptions) = 1, 'A에게는 휴대폰 구독만 남는다';
  assert (select p256dh from public.push_subscriptions) = 'a-key-2', 'B가 A의 구독을 바꾸지 못했다';
end $$;

-- 로그인하지 않으면 함수도 테이블도 못 쓴다
reset role;
set local role anon;

do $$
begin
  begin
    perform 1 from public.push_subscriptions;
    raise exception '익명 사용자가 구독 테이블에 접근했다';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.save_push_subscription('https://push.test/anon', 'k', 'a');
    raise exception '익명 사용자가 구독을 저장했다';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- 발송 서버(service role)는 모든 구독을 읽고 410·404 응답을 받은 구독을 지운다
reset role;
set local role service_role;

do $$
begin
  assert (select count(*) from public.push_subscriptions where endpoint like 'https://push.test/%') = 1,
    'service role은 RLS 없이 구독을 읽는다';
end $$;

delete from public.push_subscriptions where endpoint = 'https://push.test/a-phone';

do $$
begin
  assert (select count(*) from public.push_subscriptions where endpoint like 'https://push.test/%') = 0,
    'service role이 만료된 구독을 지운다';
end $$;

reset role;
select 'push-subscriptions: all checks passed' as result;

rollback;
