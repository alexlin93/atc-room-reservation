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

-- ---------------------------------------------------------------------
-- Guard: reject reservations whose entire slot has already fully elapsed
-- — enforced by Postgres itself so it holds even if a client bypasses the
-- app's own UI (which hides/rejects past dates and hours). Evaluated
-- against ends_at (not starts_at), which the reservations_set_range_trigger
-- above always derives from reservation_date/start_hour/duration_hours
-- before this CHECK runs (BEFORE ROW triggers modify NEW before
-- constraints are checked), so a client can't send a stale/mismatched
-- ends_at to dodge this. Checking ends_at rather than starts_at means the
-- whole current, in-progress hour slot stays bookable — e.g. at 2:30pm a
-- "2:00pm-3:00pm" booking is still allowed, since it hasn't elapsed yet;
-- only a slot whose end time has already passed is rejected. A small
-- 5-minute grace period further avoids rejecting a booking made right at
-- the boundary that takes a moment to submit.
--
-- Safe to re-run on both a fresh database (constraint never existed) and
-- an already-migrated one (old starts_at-based constraint already
-- exists): drop the old constraint by name if present, then re-add the
-- current definition, so re-running this whole file is always safe.
-- ---------------------------------------------------------------------
alter table reservations drop constraint if exists starts_not_in_past;

alter table reservations
  add constraint starts_not_in_past check (ends_at > now() - interval '5 minutes');
