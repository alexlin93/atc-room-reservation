-- Elgin Campus room reservations schema.
-- Run this once in the Supabase project's SQL Editor (Dashboard > SQL Editor > New query).
--
-- Double-booking is prevented by the database itself via two EXCLUDE
-- constraints (not application code), so it holds even under concurrent
-- requests from many users:
--   1. The same room can't hold two overlapping time ranges.
--   2. The same person can't hold overlapping time ranges in different
--      rooms at once (the "one room at a time" rule).

create extension if not exists btree_gist;

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  floor smallint not null check (floor in (3, 4)),
  room_id text not null,
  reservation_date date not null,
  start_hour smallint not null check (start_hour between 0 and 23),
  duration_hours smallint not null check (duration_hours between 1 and 4),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  email text not null,
  name text not null,
  created_at timestamptz not null default now(),

  constraint ends_after_starts check (ends_at > starts_at),

  exclude using gist (
    floor with =,
    room_id with =,
    tsrange(starts_at, ends_at, '[)') with &&
  ),

  exclude using gist (
    email with =,
    tsrange(starts_at, ends_at, '[)') with &&
  )
);

create index if not exists reservations_email_date_idx
  on reservations (email, reservation_date);

-- starts_at/ends_at are always derived server-side from
-- reservation_date/start_hour/duration_hours, so a client can't send a
-- mismatched range while the exclusion constraints check something else.
create or replace function reservations_set_range()
returns trigger as $$
begin
  new.starts_at := new.reservation_date + make_interval(hours => new.start_hour);
  new.ends_at := new.reservation_date + make_interval(hours => new.start_hour + new.duration_hours);
  return new;
end;
$$ language plpgsql;

drop trigger if exists reservations_set_range_trigger on reservations;
create trigger reservations_set_range_trigger
  before insert or update on reservations
  for each row execute function reservations_set_range();

alter table reservations enable row level security;

-- Everyone (including signed-out visitors) can see the schedule, so the
-- map can show free/occupied and the day grid can show who booked what.
create policy "Anyone can view reservations"
  on reservations for select
  using (true);

-- A reservation's email must match the caller's own verified email —
-- enforced by Postgres, not by client-side JS.
create policy "Users can create their own reservations"
  on reservations for insert
  with check (email = auth.jwt() ->> 'email');

create policy "Users can update their own reservations"
  on reservations for update
  using (email = auth.jwt() ->> 'email')
  with check (email = auth.jwt() ->> 'email');

create policy "Users can delete their own reservations"
  on reservations for delete
  using (email = auth.jwt() ->> 'email');

-- ---------------------------------------------------------------------
-- Guard: reject reservations whose derived start time is already in the
-- past — enforced by Postgres itself so it holds even if a client bypasses
-- the app's own UI (which hides/rejects past dates and hours). Evaluated
-- against starts_at, which the reservations_set_range_trigger above always
-- derives from reservation_date/start_hour before this CHECK runs (BEFORE
-- ROW triggers modify NEW before constraints are checked), so a client
-- can't send a stale/mismatched starts_at to dodge this. A small 5-minute
-- grace window avoids rejecting a booking made for "right now" that takes
-- a moment to submit. Safe to re-run: only adds the constraint if it
-- doesn't already exist.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'starts_not_in_past') then
    alter table reservations
      add constraint starts_not_in_past check (starts_at >= now() - interval '5 minutes');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Admin role.
--
-- `admins` is the source of truth for who has elevated capabilities in the
-- app (edit/cancel any reservation, bypass the past-time restriction, and
-- toggle a room's reservable/unreservable status). It's deliberately just a
-- table of emails with RLS allowing anyone to read it (so the client can
-- check "am I an admin?") but no insert/update/delete policy at all — rows
-- can only be added or removed by the project owner directly via the
-- Supabase dashboard/SQL editor (e.g.
-- `insert into admins (email) values ('someone@example.com');`), not
-- through the app. There is intentionally no "promote to admin" UI.
-- ---------------------------------------------------------------------
create table if not exists admins (
  email text primary key
);
alter table admins enable row level security;

drop policy if exists "Anyone can check admin status" on admins;
create policy "Anyone can check admin status" on admins for select using (true);
-- Deliberately no insert/update/delete policy: admins can only be added/removed
-- by the project owner directly via the Supabase dashboard/SQL editor, matching
-- what the user asked for ("editable and added to in the supabase postgres db").

-- ---------------------------------------------------------------------
-- Per-room admin override: lets an admin mark a specific room as not
-- currently reservable (e.g. taken out of service), reflected live to every
-- visitor on the map. Only admins can write; anyone can read, same
-- visibility model as `reservations` and `admins` above.
-- ---------------------------------------------------------------------
create table if not exists room_overrides (
  floor smallint not null,
  room_id text not null,
  is_reservable boolean not null default true,
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (floor, room_id)
);
alter table room_overrides enable row level security;

drop policy if exists "Anyone can view room overrides" on room_overrides;
create policy "Anyone can view room overrides" on room_overrides for select using (true);

drop policy if exists "Admins can insert room overrides" on room_overrides;
create policy "Admins can insert room overrides" on room_overrides for insert
  with check (exists (select 1 from admins where admins.email = auth.jwt() ->> 'email'));

drop policy if exists "Admins can update room overrides" on room_overrides;
create policy "Admins can update room overrides" on room_overrides for update
  using (exists (select 1 from admins where admins.email = auth.jwt() ->> 'email'));

-- ---------------------------------------------------------------------
-- Broaden the existing "own reservation only" update/delete policies so an
-- admin can also edit/cancel *any* reservation, not just their own. Written
-- as drop-then-recreate (like the rest of this file) so re-running the
-- whole script is always safe, and appended down here — rather than edited
-- in place above — so `admins` already exists by the time these are
-- (re)created (CREATE POLICY validates the query, including the `admins`
-- reference, at creation time).
-- ---------------------------------------------------------------------
drop policy if exists "Users can update their own reservations" on reservations;
create policy "Users can update their own reservations"
  on reservations for update
  using (
    email = auth.jwt() ->> 'email'
    or exists (select 1 from admins where admins.email = auth.jwt() ->> 'email')
  )
  with check (
    email = auth.jwt() ->> 'email'
    or exists (select 1 from admins where admins.email = auth.jwt() ->> 'email')
  );

drop policy if exists "Users can delete their own reservations" on reservations;
create policy "Users can delete their own reservations"
  on reservations for delete
  using (
    email = auth.jwt() ->> 'email'
    or exists (select 1 from admins where admins.email = auth.jwt() ->> 'email')
  );

-- ---------------------------------------------------------------------
-- Let an admin bypass only the past-time restriction (starts_not_in_past),
-- not the open/close-hour bounds baked into start_hour's CHECK, and not
-- either EXCLUDE constraint (same-room double-booking, or the "one room at
-- a time" cross-room rule) — those apply to everyone, admins included. This
-- is the one CHECK the user specifically asked admins be able to skip
-- ("create a reservation without the time restriction"), so only this
-- constraint is touched.
-- ---------------------------------------------------------------------
alter table reservations drop constraint if exists starts_not_in_past;
alter table reservations
  add constraint starts_not_in_past check (
    starts_at >= now() - interval '5 minutes'
    or exists (select 1 from admins where admins.email = auth.jwt() ->> 'email')
  );
