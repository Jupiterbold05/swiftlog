-- ============================================================
-- SwiftLogistics — Supabase Database Setup
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- ── 1. PROFILES (extends auth.users) ──────────────────────
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  name        text,
  phone       text,
  role        text not null default 'user',   -- 'user' | 'admin'
  status      text not null default 'active', -- 'active' | 'suspended' | 'sanctioned'
  sanctioned  boolean not null default false,
  joined      date default now()
);

alter table public.profiles enable row level security;

-- Users can read/update their own profile
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Admins can read and update all profiles
create policy "Admins can view all profiles"
  on profiles for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can update all profiles"
  on profiles for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Allow insert during signup (service role / trigger handles this)
create policy "Allow insert on signup"
  on profiles for insert with check (auth.uid() = id);


-- ── 2. AUTO-CREATE PROFILE ON SIGNUP (trigger) ────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, phone, role, status, sanctioned)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    'user',
    'active',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── 3. DELIVERIES ──────────────────────────────────────────
create table if not exists public.deliveries (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  package_desc text not null,
  pickup_addr  text not null,
  dropoff_addr text not null,
  weight       text,
  urgency      text not null default 'standard', -- 'standard' | 'express'
  status       text not null default 'pending',  -- 'pending' | 'in-transit' | 'delivered' | 'cancelled'
  rider_name   text,
  notes        text,
  created_at   timestamptz default now()
);

alter table public.deliveries enable row level security;

-- Users can view/insert their own deliveries
create policy "Users can view own deliveries"
  on deliveries for select using (auth.uid() = user_id);

create policy "Users can create deliveries"
  on deliveries for insert with check (auth.uid() = user_id);

-- Admins can do everything
create policy "Admins can view all deliveries"
  on deliveries for select
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can update deliveries"
  on deliveries for update
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can delete deliveries"
  on deliveries for delete
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );


-- ── 4. MESSAGES ────────────────────────────────────────────
-- from_id and to_id are either a user UUID or the string 'admin'
-- We use text so the admin side can send as 'admin' without a user row.
create table if not exists public.messages (
  id         uuid default gen_random_uuid() primary key,
  from_id    text not null,  -- uuid string or 'admin'
  to_id      text not null,  -- uuid string or 'admin'
  text       text not null,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

-- Users can read messages they are part of
create policy "Users can read own messages"
  on messages for select
  using (
    auth.uid()::text = from_id
    or auth.uid()::text = to_id
  );

-- Users can insert messages where they are the sender
create policy "Users can send messages"
  on messages for insert
  with check (auth.uid()::text = from_id);

-- Admins can read all messages
create policy "Admins can read all messages"
  on messages for select
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Admins can insert messages as 'admin'
create policy "Admins can send messages"
  on messages for insert
  with check (
    from_id = 'admin'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );


-- ── 5. REALTIME — enable for live updates ─────────────────
-- Run these in the Supabase dashboard under Database > Replication
-- OR just enable replication for these tables in the UI.
-- Programmatically:
alter publication supabase_realtime add table public.deliveries;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.profiles;


-- ── 6. SEED AN ADMIN ACCOUNT ───────────────────────────────
-- After running this schema, sign up normally with:
--   email: admin@swiftlog.com
--   password: (your choice)
-- Then run this to promote that account to admin:
--
-- update public.profiles
-- set role = 'admin'
-- where id = (
--   select id from auth.users where email = 'admin@swiftlog.com'
-- );
--
-- Uncomment and run the above after creating the account.
