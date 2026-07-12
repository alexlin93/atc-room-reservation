import { timeRangeLabel } from "../../utils/time";
import ReservationActions from "../reservationModal/ReservationActions";

// Floor/Room/Date/Time/Edit/Cancel table of the signed-in user's own
// upcoming reservations. Edit/Cancel reuse the exact same
// ReservationActions component (and so the exact same cancel logic) as the
// room modal's own upcoming list.
export default function MyReservationsTable({ myUpcoming, onEditReservation, deleteReservationRow, refresh }) {
  return (
    <div className="myres-table-wrap">
      <table className="myres-table">
        <thead>
          <tr>
            <th>Floor</th>
            <th>Room</th>
            <th>Date</th>
            <th>Time</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="myResTableBody">
          {myUpcoming.map((r) => (
            <tr key={r.id}>
              <td>Floor {r.floor}</td>
              <td>{r.roomId}</td>
              <td>{r.date}</td>
              <td>{timeRangeLabel(r.startHour, r.durationHours)}</td>
              <td>
                <ReservationActions
                  reservation={r}
                  roomLabel={r.roomId}
                  onEdit={() => onEditReservation(r)}
                  deleteReservationRow={deleteReservationRow}
                  refresh={refresh}
                  editingId={null}
                  onExitEditIfMatches={() => {}}
                  actionsClassName="myres-row-actions"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {myUpcoming.length === 0 && (
        <div className="myres-empty" id="myResEmpty" style={{ display: "block" }}>
          You have no upcoming reservations.
        </div>
      )}
    </div>
  );
}
