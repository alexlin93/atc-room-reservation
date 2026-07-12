// The ONLY module that talks to the `reservations` table (select / insert /
// update / delete / realtime subscription). Every other part of the app —
// hooks, features, pages — goes through this service rather than importing
// `supabase` directly, so there's exactly one place that knows the table
// name, row shape, and realtime/poll-fallback wiring.
import { supabase } from "./supabaseClient";

const TABLE = "reservations";
const POLL_FALLBACK_MS = 45000; // only used if the Realtime channel fails to (re)connect

// Maps a `reservations` row (snake_case, as Postgres returns it) to the
// camelCase shape the rest of the app works with.
function mapRow(row) {
  return {
    id: row.id,
    floor: row.floor,
    roomId: row.room_id,
    date: row.reservation_date,
    startHour: row.start_hour,
    durationHours: row.duration_hours,
    email: row.email,
    name: row.name,
  };
}

export async function fetchReservations() {
  const res = await supabase.from(TABLE).select("*");
  if (res.error) {
    console.error("Failed to load reservations:", res.error);
    return { data: null, error: res.error };
  }
  return { data: (res.data || []).map(mapRow), error: null };
}

export function insertReservation(payload) {
  return supabase.from(TABLE).insert(payload).select();
}

export function updateReservation(id, payload) {
  return supabase.from(TABLE).update(payload).eq("id", id).select();
}

export function deleteReservation(id) {
  return supabase.from(TABLE).delete().eq("id", id);
}

// Subscribes to live changes on the `reservations` table via Supabase
// Realtime, calling `onChange` whenever a row might have changed so the
// caller can refetch. Falls back to polling every POLL_FALLBACK_MS if the
// realtime channel errors, times out, or closes (e.g. a blocked network
// path) — so the app stays in sync either way. Returns an unsubscribe
// function that tears down both the channel and any poll timer.
export function subscribeToReservationChanges(onChange) {
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
    .channel("reservations-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => {
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
