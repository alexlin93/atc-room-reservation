// Client-side conflict pre-checks — a UX nicety only. The real backstop is
// the database's own EXCLUDE constraints (supabase/schema.sql), which is
// what actually prevents races; see isExclusionViolation() below for that
// error-handling path.

export function hasConflict(reservations, floor, roomId, date, startHour, durationHours, excludeId) {
  const proposedEnd = startHour + durationHours;
  return reservations.some((r) => {
    if (excludeId && r.id === excludeId) return false;
    if (r.floor !== floor || r.roomId !== roomId || r.date !== date) return false;
    const existingEnd = r.startHour + r.durationHours;
    return startHour < existingEnd && r.startHour < proposedEnd;
  });
}

// Building-wide "one room at a time" rule: does this user already have a
// different reservation (any floor/room) whose time range overlaps the
// requested one on the same date? Returns the conflicting reservation, or
// null. excludeId lets an in-progress edit ignore its own prior booking.
export function hasCrossRoomConflict(reservations, email, date, startHour, durationHours, excludeId) {
  const proposedEnd = startHour + durationHours;
  for (const r of reservations) {
    if (excludeId && r.id === excludeId) continue;
    if (r.email !== email || r.date !== date) continue;
    const existingEnd = r.startHour + r.durationHours;
    if (startHour < existingEnd && r.startHour < proposedEnd) return r;
  }
  return null;
}

// Postgres reports an EXCLUDE constraint violation as SQLSTATE 23P01.
// PostgREST (Supabase's REST layer) surfaces that as error.code === "23P01".
export function isExclusionViolation(error) {
  if (!error) return false;
  if (error.code === "23P01") return true;
  const text = `${error.message || ""} ${error.details || ""}`.toLowerCase();
  return text.indexOf("exclusion") !== -1;
}
