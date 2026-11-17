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

select public.save_push_subscription('https://fcm.googleapis.com/fcm/send/a-phone', 'a-key', 'a-auth');
select public.save_push_subscription('https://fcm.googleapis.com/fcm/send/shared-laptop', 'laptop-key', 'laptop-auth');

-- 같은 endpoint를 다시 저장하면 새 행이 아니라 키만 바뀐다
select public.save_push_subscription('https://fcm.googleapis.com/fcm/send/a-phone', 'a-key-2', 'a-auth-2');

do $$
begin
  assert (select count(*) from public.push_subscriptions) = 2, 'A는 자기 구독 2개를 본다';
  assert (select p256dh from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/a-phone') = 'a-key-2',
    '같은 endpoint는 키를 갱신한다';
end $$;

-- 테이블에 직접 넣거나 고칠 수 없다. 저장은 endpoint 검사와 개수 상한이 있는 함수로만 한다.
do $$
begin
  begin
    insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
    values ('00000000-0000-0000-0000-00000000001b', 'https://fcm.googleapis.com/fcm/send/fake', 'k', 'a');
    raise exception '다른 사용자 이름으로 구독을 넣었다';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://evil.test/direct', 'k', 'a');
    raise exception '함수를 거치지 않고 구독을 넣었다';
  exception when insufficient_privilege then
    null;
  end;
  begin
    update public.push_subscriptions set endpoint = 'https://evil.test/a' where endpoint like '%a-phone';
    raise exception '함수를 거치지 않고 구독을 고쳤다';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- 주요 브라우저의 푸시 서비스 주소만 받는다
select public.save_push_subscription('https://updates.push.services.mozilla.com/wpush/v2/a-firefox', 'k', 'a');
select public.save_push_subscription('https://wns2-pn1p.notify.windows.com/w/?token=a-edge', 'k', 'a');
select public.save_push_subscription('https://web.push.apple.com/a-iphone', 'k', 'a');

do $$
declare
  endpoint text;
begin
  foreach endpoint in array array[
    'http://fcm.googleapis.com/fcm/send/plain',
    'https://push.test/a',
    'https://fcm.googleapis.com.evil.test/a',
    'https://fcm.googleapis.com@evil.test/a',
    'https://fcm.googleapis.com:8443/a',
    'https://notify.windows.com/a',
    'https://fcm.googleapis.com'
  ] loop
    begin
      perform public.save_push_subscription(endpoint, 'k', 'a');
      raise exception '허용하지 않은 endpoint가 저장됐다: %', endpoint;
    exception when raise_exception then
      if sqlerrm <> 'invalid_push_subscription' then
        raise;
      end if;
    end;
  end loop;

  assert (select count(*) from public.push_subscriptions) = 5, 'A는 허용된 구독 5개만 가진다';
end $$;

-- 한 사람의 구독은 최근 10개까지만 남는다. 시간 차이를 만들려고 저장 시각을 과거로 돌린다.
-- updated_at 트리거가 now()로 덮어쓰지 않게 이 동안만 트리거를 끈다.
reset role;
set local session_replication_role = replica;
update public.push_subscriptions set updated_at = now() - interval '1 day';
update public.push_subscriptions set updated_at = now() - interval '2 days'
where endpoint = 'https://web.push.apple.com/a-iphone';
set local session_replication_role = origin;
set local role authenticated;

select public.save_push_subscription('https://fcm.googleapis.com/fcm/send/a-extra-' || n, 'k', 'a')
from generate_series(1, 6) as n;

do $$
begin
  assert (select count(*) from public.push_subscriptions) = 10, '구독은 10개까지만 남는다';
  assert not exists (select 1 from public.push_subscriptions where endpoint = 'https://web.push.apple.com/a-iphone'),
    '가장 오래 저장하지 않은 구독부터 지운다';
  assert exists (select 1 from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/a-phone'),
    '나머지 구독은 남는다';
end $$;

-- 다시 저장한 구독은 최신이 되어 남는다
reset role;
set local session_replication_role = replica;
update public.push_subscriptions set updated_at = now() - interval '3 days'
where endpoint = 'https://fcm.googleapis.com/fcm/send/a-phone';
set local session_replication_role = origin;
set local role authenticated;
select public.save_push_subscription('https://fcm.googleapis.com/fcm/send/a-phone', 'a-key-2', 'a-auth-2');
select public.save_push_subscription('https://fcm.googleapis.com/fcm/send/a-extra-7', 'k', 'a');

do $$
begin
  assert (select count(*) from public.push_subscriptions) = 10, '상한은 계속 10개다';
  assert exists (select 1 from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/a-phone'),
    '방금 다시 저장한 구독은 지우지 않는다';
end $$;

-- 뒤 시나리오를 위해 휴대폰·노트북만 남긴다
delete from public.push_subscriptions
where endpoint not in ('https://fcm.googleapis.com/fcm/send/a-phone', 'https://fcm.googleapis.com/fcm/send/shared-laptop');

-- B: 같은 크루에 들어온다
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000001b","role":"authenticated"}', true);
select public.join_crew_by_code(invite_code) from ctx;

do $$
begin
  assert (select count(*) from public.push_subscriptions) = 0, '같은 크루여도 A의 구독은 보이지 않는다';
end $$;

-- B는 A의 구독을 지울 수 없다(0건 처리). 고치기는 위에서 본 것처럼 누구도 직접 못 한다.
delete from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/a-phone';

-- B가 A가 쓰던 노트북에서 알림을 켜면 그 브라우저의 구독 주인이 B로 바뀐다
select public.save_push_subscription('https://fcm.googleapis.com/fcm/send/shared-laptop', 'laptop-key-b', 'laptop-auth-b');

do $$
begin
  assert (select count(*) from public.push_subscriptions) = 1, 'B는 노트북 구독 하나만 본다';
end $$;

delete from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/shared-laptop';

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
    perform public.save_push_subscription('https://fcm.googleapis.com/fcm/send/anon', 'k', 'a');
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
  assert (select count(*) from public.push_subscriptions where endpoint like 'https://fcm.googleapis.com/fcm/send/%') = 1,
    'service role은 RLS 없이 구독을 읽는다';
end $$;

delete from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/a-phone';

do $$
begin
  assert (select count(*) from public.push_subscriptions where endpoint like 'https://fcm.googleapis.com/fcm/send/%') = 0,
    'service role이 만료된 구독을 지운다';
end $$;

reset role;
select 'push-subscriptions: all checks passed' as result;

rollback;
