# CapeXtreme Leaderboard

A dual-portal setup:
- `/user` shows the public leaderboard.
- `/admin` provides login + tools for adding games and scores.

## 1) Supabase schema
Create the tables below in Supabase SQL editor:

```sql
create table public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  total_marks integer not null,
  created_at timestamptz default now()
);

create table public.game_scores (
  id uuid primary key default gen_random_uuid(),
  user_name text not null,
  game_id uuid references public.games(id) on delete cascade,
  marks integer not null,
  created_at timestamptz default now()
);

create table public.admin_users (
  email text primary key,
  created_at timestamptz default now()
);
```

## 2) Supabase Auth + RLS
Enable email/password auth in Supabase, then create an admin user in the Auth UI.

Add the admin email to `admin_users`:

```sql
insert into public.admin_users (email)
values ('admin@capextreme.in');
```

Enable RLS and add policies:

```sql
alter table public.games enable row level security;
alter table public.game_scores enable row level security;
alter table public.admin_users enable row level security;

create policy "Public read games" on public.games
for select using (true);

create policy "Public read scores" on public.game_scores
for select using (true);

create policy "Admins can insert games" on public.games
for insert with check (
  exists (select 1 from public.admin_users where email = auth.email())
);

create policy "Admins can update games" on public.games
for update using (
  exists (select 1 from public.admin_users where email = auth.email())
);

create policy "Admins can delete games" on public.games
for delete using (
  exists (select 1 from public.admin_users where email = auth.email())
);

create policy "Admins can insert scores" on public.game_scores
for insert with check (
  exists (select 1 from public.admin_users where email = auth.email())
);

create policy "Admins can delete scores" on public.game_scores
for delete using (
  exists (select 1 from public.admin_users where email = auth.email())
);

create policy "Authenticated can read admins" on public.admin_users
for select using (auth.role() = 'authenticated');
```

## 3) Frontend (Vite)

```bash
npm install
cp .env.example .env
npm run dev
```

Update `.env` with your Supabase project URL and anon public key.

## Routes
- `/user` - public leaderboard
- `/admin` - admin login
- `/admin/dashboard` - admin tools
