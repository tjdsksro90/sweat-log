-- 푸시 알림 구독
--
-- 브라우저(정확히는 브라우저 프로필) 하나가 구독 하나다. endpoint는 푸시 서비스가 그 브라우저에 준 주소이고,
-- p256dh·auth는 알림 내용을 암호화할 때 쓰는 그 브라우저의 공개 키다.
--
-- 권한
--   - 사용자는 자기 구독만 읽고 지운다(RLS). 저장은 save_push_subscription으로만 한다.
--     직접 insert·update를 막아야 endpoint 검사와 사용자당 개수 상한을 건너뛸 수 없다.
--   - 다른 사람의 구독은 어떤 사용자 요청으로도 읽을 수 없다. 발송은 서버 전용 service role만 읽는다.
--     service role은 RLS를 건너뛰므로 받는 사람은 서버 코드가 보낸 사람의 세션으로 다시 계산한다.
--   - 같은 브라우저에서 다른 계정으로 알림을 켜면 save_push_subscription이 구독 주인을 바꾼다.
--     이전 계정의 알림이 이 브라우저로 계속 오지 않게 하려는 것이다.
--
-- endpoint 제한
--   발송 서버가 endpoint로 직접 POST를 보내므로, 아무 주소나 받으면 서버를 다른 호스트를 두드리는 데 쓸 수 있다.
--   그래서 주요 브라우저의 푸시 서비스 호스트만 받는다.
--     Chrome·Android·Samsung 등 fcm.googleapis.com, Firefox updates.push.services.mozilla.com,
--     Edge *.notify.windows.com, Safari web.push.apple.com
--   호스트 바로 뒤에 /가 와야 해서 fcm.googleapis.com.evil.test나 사용자 정보(@)·포트가 붙은 주소는 걸러진다.
--   앱의 model/subscription.ts에도 같은 정규식이 있다.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint text not null unique check (
    char_length(endpoint) <= 1000
    and endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+(\.[a-z0-9-]+)*\.notify\.windows\.com)/'
  ),
  p256dh text not null check (char_length(p256dh) between 1 and 200),
  auth text not null check (char_length(auth) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function private.set_updated_at();

alter table public.push_subscriptions enable row level security;

create policy "Users view own push subscriptions" on public.push_subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users delete own push subscriptions" on public.push_subscriptions
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.push_subscriptions from anon;
revoke insert, update on public.push_subscriptions from authenticated;

-- 내 브라우저의 구독을 저장한다. endpoint가 이미 있으면 키를 갱신하고 주인을 나로 바꾼다.
-- 다른 계정의 행은 RLS 때문에 보이지도 고쳐지지도 않아서 security definer로 한 번에 처리한다.
-- endpoint는 그 브라우저 안에서만 얻을 수 있는 값이라, 이 함수로 남의 구독을 가로챌 수 없다.
-- 한 사람이 구독을 무한정 늘려 발송을 부풀리지 못하게, 최근에 저장한 10개만 남기고 오래된 것부터 지운다.
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void
  language plpgsql
  security definer
  set search_path to ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (current_user_id, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth;

  delete from public.push_subscriptions
  where user_id = current_user_id
    and id not in (
      select id from public.push_subscriptions
      where user_id = current_user_id
      order by updated_at desc, created_at desc
      limit 10
    );
exception
  when check_violation or not_null_violation then
    raise exception 'invalid_push_subscription';
end;
$$;

revoke all on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
