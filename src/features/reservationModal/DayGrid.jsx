import { timeRangeLabel } from "../../utils/time";

// A day-grid row per bookable hour (OPEN_HOUR..CLOSE_HOUR-1 for the
// selected date, omitting already-elapsed hours for today): time range +
// either "Free" (clickable, to prefill the reserve form's start time) or
// the reserving name (read-only).
export default function DayGrid({ rows, onRowClick }) {
  return (
    <div className="day-grid" id="dayGrid">
      {rows.map(({ hour, reservation }) => (
        <div
          key={hour}
          className={"day-grid-row" + (!reservation ? " clickable" : "")}
          onClick={!reservation ? () => onRowClick(hour) : undefined}
        >
          <div className="day-grid-time">{timeRangeLabel(hour, 1)}</div>
          <div className={"day-grid-status " + (reservation ? "booked" : "free")}>
            {reservation ? `Reserved by ${reservation.name}` : "Free"}
          </div>
        </div>
      ))}
    </div>
  );
}
