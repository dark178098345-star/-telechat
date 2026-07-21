-- TELECHAT V24: исправление отправки сообщений после включения модерации.
-- Старый общий trigger обращался к разным полям NEW для messages и polls.
-- Здесь проверки разделены, а муты и баны продолжают работать.

create or replace function public.telechat_assert_can_post_v24(p_nick text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users%rowtype;
  v_now bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  select * into v_user from public.users where lower(nick)=lower(trim(coalesce(p_nick,'')));
  if v_user.nick is null then raise exception 'Пользователь не найден'; end if;
  if coalesce(v_user.banned_forever,false) or coalesce(v_user.banned_until,0)>v_now then
    raise exception 'Аккаунт заблокирован';
  end if;
  if coalesce(v_user.muted_forever,false) or coalesce(v_user.muted_until,0)>v_now then
    raise exception 'Пользователь находится в муте';
  end if;
end;
$$;

create or replace function public.telechat_guard_message_v24()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.telechat_assert_can_post_v24(new.from_nick);
  return new;
end;
$$;

create or replace function public.telechat_guard_poll_v24()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.telechat_assert_can_post_v24(new.created_by);
  return new;
end;
$$;

drop trigger if exists telechat_guard_messages on public.messages;
drop trigger if exists telechat_guard_messages_v24 on public.messages;
create trigger telechat_guard_messages_v24
before insert on public.messages
for each row execute function public.telechat_guard_message_v24();

drop trigger if exists telechat_guard_polls on public.polls;
drop trigger if exists telechat_guard_polls_v24 on public.polls;
create trigger telechat_guard_polls_v24
before insert on public.polls
for each row execute function public.telechat_guard_poll_v24();

revoke all on function public.telechat_assert_can_post_v24(text) from public;
revoke all on function public.telechat_guard_message_v24() from public;
revoke all on function public.telechat_guard_poll_v24() from public;

notify pgrst, 'reload schema';
