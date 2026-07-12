import { timeRangeLabel } from "../../utils/time";
import ReservationActions from "../reservationModal/ReservationActions";

// Floor/Room/Date/Time/Reserved-by/Edit/Cancel table of EVERY reservation
// from EVERY user (not just the signed-in admin's own) — the admin
// dashboard's consolidated view. Edit/Cancel reuse the exact same
// ReservationActions component (and so the exact same cancel-confirm ->
// delete -> shared-refresh logic) as the room modal's upcoming list and the
// My Reservations table, rather than a parallel reimplementation. This
// component itself does no admin-vs-non-admin gating of *who* sees these
// actions — the page that renders it (AdminDashboardPage) only ever mounts
// it for a confirmed admin, and the real backstop is the `reservations`
// UPDATE/DELETE RLS policies (supabase/schema.sql), which already grant an
// admin caller the ability to edit/delete any row.
export default function AdminReservationsTable({ rows, onEditReservation, deleteReservationRow, refresh }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Floor</th>
            <th>Room</th>
            <th>Reserved by</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.date}</td>
              <td>{timeRangeLabel(r.startHour, r.durationHours)}</td>
              <td>Floor {r.floor}</td>
              <td>{r.roomId}</td>
              <td>
                {r.name} <span className="admin-table-email">({r.email})</span>
              </td>
              <td>
                <ReservationActions
                  reservation={r}
                  roomLabel={`${r.roomId} (Floor ${r.floor})`}
                  onEdit={() => onEditReservation(r)}
                  deleteReservationRow={deleteReservationRow}
                  refresh={refresh}
                  editingId={null}
                  onExitEditIfMatches={() => {}}
                  actionsClassName="admin-row-actions"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="admin-table-empty">There are no reservations yet.</div>
      )}
    </div>
  );
}
