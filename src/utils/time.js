// Date/time helpers — ported 1:1 from the vanilla app.js so behavior stays
// identical (elapsed-hour omission, "upcoming" filtering, label formatting).
import { OPEN_HOUR, CLOSE_HOUR } from "../data/roomsData";

export function formatDateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr(now = new Date()) {
  return formatDateLocal(now);
}

// The earliest hour that's still bookable/viewable for a given date: the
// full OPEN_HOUR..CLOSE_HOUR-1 range for any future date, but for today
// only the current (still in-progress) hour onward — anything earlier has
// already fully elapsed. `now` defaults to a fresh Date() at call time,
// same as the original (only recomputed when explicitly called, not on a
// ticking timer).
export function earliestRelevantHour(date, now = new Date()) {
  if (date !== todayStr(now)) return OPEN_HOUR;
  return Math.max(OPEN_HOUR, now.getHours());
}

// A reservation is still "upcoming" (worth showing) if it's on a future
// date, or on today and its end time hasn't passed yet.
export function isReservationUpcoming(r, now = new Date()) {
  const today = todayStr(now);
  if (r.date > today) return true;
  if (r.date < today) return false;
  return now.getHours() < r.startHour + r.durationHours;
}

export function hourLabel(h) {
  const period = h >= 12 ? "PM" : "AM";
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return `${hh}:00 ${period}`;
}

export function timeRangeLabel(startHour, durationHours) {
  return `${hourLabel(startHour)} – ${hourLabel(startHour + durationHours)}`;
}

export function getReservationsFor(reservations, floor, roomId, date) {
  return reservations.filter((r) => r.floor === floor && r.roomId === roomId && r.date === date);
}

// Returns the reservation covering "now" for this room, or null if free.
export function currentReservation(reservations, floor, roomId, now = new Date()) {
  const date = formatDateLocal(now);
  const hour = now.getHours();
  const list = getReservationsFor(reservations, floor, roomId, date);
  for (const r of list) {
    if (hour >= r.startHour && hour < r.startHour + r.durationHours) return r;
  }
  return null;
}

// Bookable start-hour options for the reserve form: respects the chosen
// duration (can't push past CLOSE_HOUR) and, for today, excludes hours
// that have already started/passed. `now` is captured fresh at call time
// (only recomputed on open/date-change/duration-change, matching the
// original — not on every 30s tick).
export function computeStartOptions(date, duration, now = new Date()) {
  const options = [];
  const maxStart = CLOSE_HOUR - duration;
  const minStart = earliestRelevantHour(date, now);
  for (let h = minStart; h <= maxStart; h++) {
    options.push({ value: String(h), label: hourLabel(h) });
  }
  return options;
}

export { OPEN_HOUR, CLOSE_HOUR };
