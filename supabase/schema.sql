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
    tstzrange(starts_at, ends_at, '[)') with &&
  ),

  exclude using gist (
    email with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
);

create index if not exists reservations_email_date_idx
  on reservations (email, reservation_date);

-- starts_at/ends_at are always derived server-side from
-- reservation_date/start_hour/duration_hours, so a client can't send a
-- mismatched range while the exclusion constraints check something else.
--
-- The building (Elgin Campus) is a single physical location in the
-- America/Chicago timezone, so reservation_date/start_hour represent
-- wall-clock hours *at the building*, not in whatever timezone the
-- browser or DB session happens to be in. `date + interval` produces a
-- plain (zone-less) timestamp; assigning that straight into a timestamptz
-- column implicitly interprets it using the session's `timezone` GUC
-- (UTC on Supabase), silently shifting every reservation by several
-- hours. Instead, explicitly interpret the naive timestamp as wall-clock
-- time `at time zone 'America/Chicago'`, which converts it to the correct
-- UTC instant regardless of the session's timezone setting. This zone is
-- intentionally hardcoded (not derived from the client) because the room
-- only exists in one place — a visitor browsing from another timezone
-- must still have "2pm" mean 2pm Chicago time.
create or replace function reservations_set_range()
returns trigger as $$
begin
  new.starts_at := (new.reservation_date + make_interval(hours => new.start_hour)) at time zone 'America/Chicago';
  new.ends_at := (new.reservation_date + make_interval(hours => new.start_hour + new.duration_hours)) at time zone 'America/Chicago';
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

-- The "reject already-elapsed reservations" rule lives further down this
-- file as a trigger, not a CHECK constraint — see
-- reservations_check_starts_not_in_past() below. It needs to look up the
-- `admins` table (for the admin bypass), and Postgres CHECK constraints
-- cannot contain subqueries at all, so it can't be expressed as a CHECK.
-- The trigger is created after `admins` exists, later in this file.
alter table reservations drop constraint if exists starts_not_in_past;

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
--
-- The insert/update policies are ALSO re-created here (not just
-- update/delete) to add a second condition: the target room (the NEW row's
-- floor/room_id) must not be marked unreservable in `room_overrides`,
-- unless the caller is an admin. This is what actually stops a non-admin
-- from booking a disabled room by calling the API directly — the map's
-- greyed-out styling and the client's submit-time check
-- (RoomModal.jsx) are UX, this is the real backstop, same as every other
-- rule in this file. `not exists (... is_reservable = false)` means a room
-- with NO row in room_overrides at all (the common case — only rooms an
-- admin has actually toggled ever get a row) still passes, i.e. defaults to
-- reservable; only an explicit `is_reservable = false` row blocks it. This
-- needs to be re-created down here (not left as the original policy
-- earlier in this file) so `room_overrides` and `admins` already exist by
-- the time it's (re)created.
-- ---------------------------------------------------------------------
drop policy if exists "Users can create their own reservations" on reservations;
create policy "Users can create their own reservations"
  on reservations for insert
  with check (
    email = auth.jwt() ->> 'email'
    and (
      not exists (
        select 1 from room_overrides ro
        where ro.floor = reservations.floor
          and ro.room_id = reservations.room_id
          and ro.is_reservable = false
      )
      or exists (select 1 from admins where admins.email = auth.jwt() ->> 'email')
    )
  );

drop policy if exists "Users can update their own reservations" on reservations;
create policy "Users can update their own reservations"
  on reservations for update
  using (
    email = auth.jwt() ->> 'email'
    or exists (select 1 from admins where admins.email = auth.jwt() ->> 'email')
  )
  with check (
    (
      email = auth.jwt() ->> 'email'
      or exists (select 1 from admins where admins.email = auth.jwt() ->> 'email')
    )
    and (
      -- Blocks a non-admin from editing a reservation so its new
      -- floor/room_id lands in a room that's since been marked
      -- unreservable (e.g. changing rooms, or re-saving after an admin
      -- disabled the room mid-edit) — same room-reservable rule as insert
      -- above, just evaluated against the row's post-edit values.
      not exists (
        select 1 from room_overrides ro
        where ro.floor = reservations.floor
          and ro.room_id = reservations.room_id
          and ro.is_reservable = false
      )
      or exists (select 1 from admins where admins.email = auth.jwt() ->> 'email')
    )
  );

drop policy if exists "Users can delete their own reservations" on reservations;
create policy "Users can delete their own reservations"
  on reservations for delete
  using (
    email = auth.jwt() ->> 'email'
    or exists (select 1 from admins where admins.email = auth.jwt() ->> 'email')
  );

-- ---------------------------------------------------------------------
-- Guard: reject reservations whose entire slot has already fully elapsed,
-- unless the caller is an admin (admins can bypass the past-time
-- restriction entirely, per the admin-role feature) — enforced by Postgres
-- itself so it holds even if a client bypasses the app's own UI. Evaluated
-- against ends_at (not starts_at), which reservations_set_range_trigger
-- above always derives from reservation_date/start_hour/duration_hours
-- before this trigger runs, so a client can't send a stale/mismatched
-- ends_at to dodge this. Checking ends_at rather than starts_at means the
-- whole current, in-progress hour slot stays bookable for everyone — e.g.
-- at 2:30pm a "2:00pm-3:00pm" booking is still allowed, since it hasn't
-- elapsed yet; only a slot whose end time has already passed is rejected
-- (for a non-admin). A small 5-minute grace period further avoids
-- rejecting a booking made right at the boundary that takes a moment to
-- submit.
--
-- This MUST be a trigger, not a CHECK constraint: Postgres CHECK
-- constraints cannot contain subqueries at all ("ERROR: cannot use
-- subquery in check constraint", confirmed against a real Postgres 16
-- instance), and the admin bypass needs to look up the `admins` table.
-- The trigger raises SQLSTATE 23514 (check_violation), the same error
-- class a CHECK constraint would raise, so it still reads as a constraint
-- violation to callers/clients.
-- ---------------------------------------------------------------------
create or replace function reservations_check_starts_not_in_past()
returns trigger as $$
begin
  if new.ends_at <= now() - interval '5 minutes'
     and not exists (select 1 from admins where admins.email = auth.jwt() ->> 'email')
  then
    raise exception 'new row for relation "reservations" violates check constraint "starts_not_in_past"'
      using errcode = '23514';
  end if;
  return new;
end;
$$ language plpgsql;

-- Deliberately named to sort alphabetically after
-- reservations_set_range_trigger ("...s_set_range..." < "...s_starts_not...",
-- 'e' < 't'): Postgres fires same-event BEFORE ROW triggers on one table in
-- alphabetical order by trigger name, and this must run second so it checks
-- the starts_at/ends_at that reservations_set_range_trigger has already
-- derived from reservation_date/start_hour/duration_hours, not a
-- stale/absent value.
drop trigger if exists reservations_starts_not_in_past_trigger on reservations;
create trigger reservations_starts_not_in_past_trigger
  before insert or update on reservations
  for each row execute function reservations_check_starts_not_in_past();
