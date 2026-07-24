-- ==============================================
-- سیستەمی کتێبخانەی Al-Shifah Bookshop
-- ئەم فایلە لە Supabase > SQL Editor جێبەجێی بکە
-- ==============================================

create extension if not exists "uuid-ossp";

-- ---------- جۆرەکانی کتێب ----------
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz default now()
);

-- ---------- کتێبەکان ----------
create table if not exists books (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  category_id uuid references categories(id) on delete set null,
  sell_price numeric not null default 0,
  wholesale_price numeric not null default 0,
  image_url text,
  quantity int not null default 999,
  created_at timestamptz default now()
);

-- ---------- فرۆشتنەکان ----------
create table if not exists sales (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid references books(id) on delete cascade,
  book_title text not null,
  quantity int not null default 1,
  sell_price numeric not null,
  wholesale_price numeric not null,
  total numeric generated always as (quantity * sell_price) stored,
  profit numeric generated always as (quantity * (sell_price - wholesale_price)) stored,
  sale_date date not null default current_date,
  created_at timestamptz default now()
);

-- ---------- زانیاری ئەدمین ----------
create table if not exists admin_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text
);

-- ==============================================
-- Row Level Security
-- تەنها بەکارهێنەرانی چوونەژوورەوو (ئەدمین) دەتوانن
-- کارەکان بکەن. سیستەمەکە تایبەتە بە یەک/چەند ئەدمین
-- ==============================================
alter table categories enable row level security;
alter table books enable row level security;
alter table sales enable row level security;
alter table admin_profile enable row level security;

create policy "authenticated full access categories" on categories
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated full access books" on books
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated full access sales" on sales
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated full access admin_profile" on admin_profile
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ==============================================
-- Storage buckets بۆ وێنەی کتێب و وێنەی ئەکاونت
-- ==============================================
insert into storage.buckets (id, name, public)
values ('book-images', 'book-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "public read book-images" on storage.objects
  for select using (bucket_id = 'book-images');

create policy "authenticated upload book-images" on storage.objects
  for insert with check (bucket_id = 'book-images' and auth.role() = 'authenticated');

create policy "authenticated update book-images" on storage.objects
  for update using (bucket_id = 'book-images' and auth.role() = 'authenticated');

create policy "public read avatars" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "authenticated upload avatars" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "authenticated update avatars" on storage.objects
  for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');
