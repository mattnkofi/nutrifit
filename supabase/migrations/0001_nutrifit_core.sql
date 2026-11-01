-- NutriFit core schema.
--
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New
-- query) or with `supabase db push`. It is written to be idempotent, so it is
-- safe to run again after an update.
--
-- Every table is scoped to auth.uid() through row level security, so the
-- browser anon key can only ever read or write the signed-in person's rows.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  age integer,
  height_cm numeric(6, 2),
  weight_kg numeric(6, 2),
  target_weight_kg numeric(6, 2),
  goal text not null default '',
  experience text not null default '',
  activity_level text not null default '',
  equipment text not null default '',
  daily_calories integer,
  daily_protein integer,
  water_target integer not null default 8,
  training_target integer not null default 4,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.water_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  glasses integer not null default 0 check (glasses >= 0 and glasses <= 40),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table if not exists public.meals (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null default 'Meal',
  meal_type text,
  calories integer not null default 0,
  protein numeric(7, 2) not null default 0,
  carbs numeric(7, 2) not null default 0,
  fat numeric(7, 2) not null default 0,
  serving_size text,
  items jsonb not null default '[]'::jsonb,
  day date not null default current_date,
  eaten_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.workouts (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  title text not null default 'Workout',
  exercises integer not null default 0,
  sets integer not null default 0,
  minutes integer not null default 0,
  focus jsonb not null default '[]'::jsonb,
  items jsonb not null default '[]'::jsonb,
  day date not null default current_date,
  performed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.workout_sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  exercises jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  workouts jsonb not null default '[]'::jsonb,
  meals jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  notifications jsonb not null default '{"daily":true,"hydration":true,"streak":true,"weekly":false}'::jsonb,
  theme text not null default 'dark',
  language text not null default 'en',
  units text not null default 'metric',
  updated_at timestamptz not null default now()
);

create index if not exists meals_user_day_idx on public.meals (user_id, day desc);
create index if not exists meals_user_eaten_idx on public.meals (user_id, eaten_at desc);
create index if not exists workouts_user_day_idx on public.workouts (user_id, day desc);
create index if not exists workouts_user_performed_idx on public.workouts (user_id, performed_at desc);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.water_logs enable row level security;
alter table public.meals enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.plans enable row level security;
alter table public.user_settings enable row level security;

do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('profiles', 'id'),
      ('water_logs', 'user_id'),
      ('meals', 'user_id'),
      ('workouts', 'user_id'),
      ('workout_sessions', 'user_id'),
      ('plans', 'user_id'),
      ('user_settings', 'user_id')
    ) as t(table_name, owner_column)
  loop
    execute format('drop policy if exists "Own rows select" on public.%I', spec.table_name);
    execute format('drop policy if exists "Own rows insert" on public.%I', spec.table_name);
    execute format('drop policy if exists "Own rows update" on public.%I', spec.table_name);
    execute format('drop policy if exists "Own rows delete" on public.%I', spec.table_name);

    execute format(
      'create policy "Own rows select" on public.%I for select to authenticated using ((select auth.uid()) = %I)',
      spec.table_name, spec.owner_column
    );
    execute format(
      'create policy "Own rows insert" on public.%I for insert to authenticated with check ((select auth.uid()) = %I)',
      spec.table_name, spec.owner_column
    );
    execute format(
      'create policy "Own rows update" on public.%I for update to authenticated using ((select auth.uid()) = %I) with check ((select auth.uid()) = %I)',
      spec.table_name, spec.owner_column, spec.owner_column
    );
    execute format(
      'create policy "Own rows delete" on public.%I for delete to authenticated using ((select auth.uid()) = %I)',
      spec.table_name, spec.owner_column
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Signup bootstrap
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill rows for accounts created before this migration ran.
insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do nothing;

insert into public.user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Account deletion (called from Profile -> Privacy & security)
-- ---------------------------------------------------------------------------

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_id uuid := auth.uid();
begin
  if current_id is null then
    raise exception 'Not signed in';
  end if;

  delete from auth.users where id = current_id;
end;
$$;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Grants (RLS still restricts every row)
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.water_logs,
  public.meals,
  public.workouts,
  public.workout_sessions,
  public.plans,
  public.user_settings
to authenticated;
