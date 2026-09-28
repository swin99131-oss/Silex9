-- شغّل هذا الملف كاملاً في Supabase → SQL Editor

-- ========== الجداول ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  full_name text,
  bio text,
  avatar_url text,
  whatsapp text,
  role text not null default 'customer' check (role in ('customer','merchant')),
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  hashtags text[] not null default '{}',
  price numeric,
  cover_url text,
  promoted boolean not null default false,
  views integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.product_likes (
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (product_id, user_id)
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 40),
  bg_color text not null default '#111111',
  product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create table public.story_likes (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (story_id, user_id)
);

create table public.story_hides (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (story_id, user_id)
);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, merchant_id),
  check (follower_id <> merchant_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null default ('#' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  merchant_id uuid references public.profiles(id) on delete set null,
  status text not null default 'قيد المعالجة' check (status in ('قيد المعالجة','في الطريق','تم التسليم')),
  total numeric not null default 0,
  items jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index on public.products (merchant_id, created_at desc);
create index on public.stories (expires_at);
create index on public.stories (merchant_id);
create index on public.follows (merchant_id);
create index on public.orders (customer_id, created_at desc);

-- ========== دوال ==========
create or replace function public.is_merchant()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'merchant');
$$;

create or replace function public.increment_product_views(pid uuid)
returns void language sql security definer set search_path = public as $$
  update public.products set views = views + 1 where id = pid;
$$;
grant execute on function public.increment_product_views(uuid) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ========== RLS ==========
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_likes enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.story_likes enable row level security;
alter table public.story_hides enable row level security;
alter table public.follows enable row level security;
alter table public.orders enable row level security;

-- profiles
create policy "profiles_read" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- products
create policy "products_read" on public.products for select using (true);
create policy "products_insert_own" on public.products for insert with check (auth.uid() = merchant_id and public.is_merchant());
create policy "products_update_own" on public.products for update using (auth.uid() = merchant_id) with check (auth.uid() = merchant_id);
create policy "products_delete_own" on public.products for delete using (auth.uid() = merchant_id);

-- product_likes
create policy "product_likes_read" on public.product_likes for select using (true);
create policy "product_likes_insert_own" on public.product_likes for insert with check (auth.uid() = user_id);
create policy "product_likes_delete_own" on public.product_likes for delete using (auth.uid() = user_id);

-- stories
create policy "stories_read" on public.stories for select using (expires_at > now() or merchant_id = auth.uid());
create policy "stories_insert_own" on public.stories for insert with check (auth.uid() = merchant_id and public.is_merchant());
create policy "stories_delete_own" on public.stories for delete using (auth.uid() = merchant_id);

-- story_views: المشاهد يسجّل مشاهدته، والتاجر يرى مشاهدي قصصه
create policy "story_views_insert_own" on public.story_views for insert with check (auth.uid() = viewer_id);
create policy "story_views_read" on public.story_views for select using (
  viewer_id = auth.uid()
  or exists (select 1 from public.stories s where s.id = story_id and s.merchant_id = auth.uid())
);

-- story_likes
create policy "story_likes_read" on public.story_likes for select using (
  user_id = auth.uid()
  or exists (select 1 from public.stories s where s.id = story_id and s.merchant_id = auth.uid())
);
create policy "story_likes_insert_own" on public.story_likes for insert with check (auth.uid() = user_id);
create policy "story_likes_delete_own" on public.story_likes for delete using (auth.uid() = user_id);

-- story_hides
create policy "story_hides_own" on public.story_hides for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- follows
create policy "follows_read" on public.follows for select using (follower_id = auth.uid() or merchant_id = auth.uid());
create policy "follows_insert_own" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_own" on public.follows for delete using (auth.uid() = follower_id);

-- orders
create policy "orders_read" on public.orders for select using (customer_id = auth.uid() or merchant_id = auth.uid());
create policy "orders_insert_own" on public.orders for insert with check (customer_id = auth.uid());
create policy "orders_update_merchant" on public.orders for update using (merchant_id = auth.uid());

-- ========== التخزين (أغلفة المنتجات) ==========
insert into storage.buckets (id, name, public) values ('covers', 'covers', true) on conflict (id) do nothing;

create policy "covers_read" on storage.objects for select using (bucket_id = 'covers');
create policy "covers_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "covers_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "covers_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
