import { timeRangeLabel } from "../../utils/time";
import ReservationActions from "./ReservationActions";

// Soonest-first list of a room's upcoming reservations. Edit/Cancel appear
// for the signed-in user's own reservations (matched by verified email), or
// for every reservation when the signed-in user is an admin — other users'
// reservations otherwise show read-only, not hidden. The RLS policies on
// `reservations` (supabase/schema.sql) are the real backstop for this, so a
// non-admin attempting the underlying update/delete call directly (bypassing
// this visibility check) is still rejected server-side.
export default function UpcomingList({
  upcoming,
  loaded,
  user,
  isAdmin,
  roomId,
  editingId,
  onEdit,
  onExitEditIfMatches,
  deleteReservationRow,
  refresh,
}) {
  return (
    <div className="upcoming">
      <h3>Upcoming reservations</h3>
      <ul className="upcoming-list" id="upcomingList">
        {upcoming.length === 0 && (
          <li className="upcoming-empty">{loaded ? "No upcoming reservations." : "Loading…"}</li>
        )}
        {upcoming.map((r) => (
          <li key={r.id} className="upcoming-item">
            <span>
              {r.date} · {timeRangeLabel(r.startHour, r.durationHours)} · Reserved by {r.name}
            </span>
            {user && (isAdmin || user.email === r.email) && (
              <ReservationActions
                reservation={r}
                roomLabel={roomId}
                onEdit={() => onEdit(r)}
                deleteReservationRow={deleteReservationRow}
                refresh={refresh}
                editingId={editingId}
                onExitEditIfMatches={onExitEditIfMatches}
                actionsClassName="upcoming-actions"
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
