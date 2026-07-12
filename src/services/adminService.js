// The ONLY module that talks to the `admins` and `room_overrides` tables
// (select / upsert / realtime subscription), same convention as
// reservationsService.js — every other part of the app goes through this
// service rather than importing `supabase` directly for admin concerns.
import { supabase } from "./supabaseClient";

const ADMINS_TABLE = "admins";
const OVERRIDES_TABLE = "room_overrides";
const POLL_FALLBACK_MS = 45000; // only used if the Realtime channel fails to (re)connect — mirrors reservationsService.js

// Maps a `room_overrides` row (snake_case, as Postgres returns it) to the
// camelCase shape the rest of the app works with.
function mapOverrideRow(row) {
  return {
    floor: row.floor,
    roomId: row.room_id,
    isReservable: row.is_reservable,
  };
}

// Queries `admins` for this email. Relies on the table's "anyone can select"
// RLS policy — no admins row for this email means a real "select succeeded,
// zero rows" result, not an error, so a signed-in non-admin just gets false.
export async function checkIsAdmin(email) {
  if (!email) return false;
  const res = await supabase.from(ADMINS_TABLE).select("email").eq("email", email).maybeSingle();
  if (res.error) {
    console.error("Failed to check admin status:", res.error);
    return false;
  }
  return !!res.data;
}

// Fetches every room_overrides row, returned as an array of
// { floor, roomId, isReservable }. Only rooms that have ever been toggled
// have a row at all — anything absent is implicitly reservable (the map/
// modal treat "no override row" the same as isReservable: true).
export async function fetchRoomOverrides() {
  const res = await supabase.from(OVERRIDES_TABLE).select("*");
  if (res.error) {
    console.error("Failed to load room overrides:", res.error);
    return { data: null, error: res.error };
  }
  return { data: (res.data || []).map(mapOverrideRow), error: null };
}

// Upserts a room's reservable/unreservable status. RLS on room_overrides
// only allows this for a caller whose email is in `admins` — a non-admin's
// insert/update is rejected server-side regardless of what the UI shows.
export function setRoomReservable(floor, roomId, isReservable, adminEmail) {
  return supabase
    .from(OVERRIDES_TABLE)
    .upsert(
      {
        floor,
        room_id: roomId,
        is_reservable: isReservable,
        updated_by: adminEmail,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "floor,room_id" }
    )
    .select();
}

// Subscribes to live changes on the `room_overrides` table via Supabase
// Realtime, calling `onChange` whenever a row might have changed so the
// caller can refetch. Falls back to polling every POLL_FALLBACK_MS if the
// realtime channel errors, times out, or closes — mirrors
// subscribeToReservationChanges in reservationsService.js exactly, just
// pointed at a different table/channel name. Returns an unsubscribe
// function that tears down both the channel and any poll timer.
export function subscribeToRoomOverrideChanges(onChange) {
  let pollTimer = null;

  function startPollFallback() {
    if (pollTimer) return;
    pollTimer = setInterval(onChange, POLL_FALLBACK_MS);
  }
  function stopPollFallback() {
    if (!pollTimer) return;
    clearInterval(pollTimer);
    pollTimer = null;
  }

  const channel = supabase
    .channel("room-overrides-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: OVERRIDES_TABLE }, () => {
      onChange();
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        stopPollFallback();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        startPollFallback();
      }
    });

  return function unsubscribe() {
    stopPollFallback();
    supabase.removeChannel(channel);
  };
}
