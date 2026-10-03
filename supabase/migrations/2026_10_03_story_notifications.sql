-- Create internal notifications for story interactions using the existing notifications table.
-- This migration creates no tables and never trusts a client-supplied recipient.

create or replace function public.notify_story_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_story_text text;
  v_actor_name text;
begin
  select s.merchant_id, s.text
    into v_owner_id, v_story_text
    from public.stories s
    where s.id = new.story_id;

  if not found or v_owner_id = new.user_id then
    return new;
  end if;

  select coalesce(nullif(trim(p.store_name), ''), nullif(trim(p.full_name), ''), nullif(trim(p.username), ''), 'مستخدم')
    into v_actor_name
    from public.profiles p
    where p.id = new.user_id;

  insert into public.notifications (user_id, title, body, type)
  values (
    v_owner_id,
    'إعجاب جديد بقصتك',
    coalesce(v_actor_name, 'مستخدم') || ' أعجب بقصتك' || case when nullif(trim(v_story_text), '') is null then '' else ': ' || left(trim(v_story_text), 120) end,
    'story_like'
  );

  return new;
end;
$$;

create or replace function public.notify_story_share()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_story_text text;
  v_actor_name text;
begin
  select s.merchant_id, s.text
    into v_owner_id, v_story_text
    from public.stories s
    where s.id = new.story_id;

  if not found or v_owner_id = new.user_id then
    return new;
  end if;

  select coalesce(nullif(trim(p.store_name), ''), nullif(trim(p.full_name), ''), nullif(trim(p.username), ''), 'مستخدم')
    into v_actor_name
    from public.profiles p
    where p.id = new.user_id;

  insert into public.notifications (user_id, title, body, type)
  values (
    v_owner_id,
    'تمت مشاركة قصتك',
    coalesce(v_actor_name, 'مستخدم') || ' شارك قصتك' || case when nullif(trim(v_story_text), '') is null then '' else ': ' || left(trim(v_story_text), 120) end,
    'story_share'
  );

  return new;
end;
$$;

create or replace function public.notify_story_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_story_id uuid;
  v_owner_id uuid;
  v_story_text text;
  v_merchant_id uuid;
  v_customer_id uuid;
  v_actor_name text;
begin
  if coalesce(new.meta->>'type', '') <> 'story' or coalesce(new.meta->>'id', '') = '' then
    return new;
  end if;

  begin
    v_story_id := (new.meta->>'id')::uuid;
  exception when invalid_text_representation then
    return new;
  end;

  select c.customer_id, c.merchant_id
    into v_customer_id, v_merchant_id
    from public.conversations c
    where c.id = new.conversation_id;

  if not found or new.sender_id <> v_customer_id then
    return new;
  end if;

  select s.merchant_id, s.text
    into v_owner_id, v_story_text
    from public.stories s
    where s.id = v_story_id;

  if not found or v_owner_id <> v_merchant_id then
    return new;
  end if;

  select coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.username), ''), 'مستخدم')
    into v_actor_name
    from public.profiles p
    where p.id = new.sender_id;

  insert into public.notifications (user_id, title, body, type)
  values (
    v_owner_id,
    'رد جديد على قصتك',
    coalesce(v_actor_name, 'مستخدم') || ' رد على قصتك' || case when nullif(trim(new.content), '') is null then '' else ': ' || left(trim(new.content), 160) end,
    'story_reply'
  );

  return new;
end;
$$;

drop trigger if exists story_likes_notify_owner on public.story_likes;
create trigger story_likes_notify_owner
after insert on public.story_likes
for each row execute function public.notify_story_like();

drop trigger if exists story_shares_notify_owner on public.story_shares;
create trigger story_shares_notify_owner
after insert on public.story_shares
for each row execute function public.notify_story_share();

drop trigger if exists messages_notify_story_owner on public.messages;
create trigger messages_notify_story_owner
after insert on public.messages
for each row execute function public.notify_story_reply();
