import { useEffect, useMemo, useState } from "react";
import { CLOSE_HOUR } from "../../data/roomsData";
import {
  todayStr,
  hourLabel,
  timeRangeLabel,
  getReservationsFor,
  currentReservation,
  computeStartOptions,
  earliestRelevantHour,
  isReservationUpcoming,
} from "../../utils/time";
import { hasConflict, hasCrossRoomConflict, isExclusionViolation } from "../../utils/conflicts";
import DayGrid from "./DayGrid";
import ReserveForm from "./ReserveForm";
import UpcomingList from "./UpcomingList";

// The room modal: live status, a date picker + day grid, a reserve/edit
// form (gated on sign-in), and an upcoming-reservations list with
// Edit/Cancel for the signed-in user's own bookings. Mounted fresh (keyed
// by floor/roomId/editReservation in the parent page) each time a
// different room is opened, so its local state simply initializes from
// props — no remount-detection effects needed. Owns all the form
// validation/conflict-precheck/submit logic; DayGrid/ReserveForm/
// UpcomingList below are presentational.
export default function RoomModal({
  floor,
  roomId,
  editReservation,
  onClose,
  reservations,
  loaded,
  now,
  user,
  insertReservation,
  updateReservationRow,
  deleteReservationRow,
  refresh,
}) {
  const [date, setDate] = useState(() => (editReservation ? editReservation.date : todayStr()));
  const [duration, setDuration] = useState(() =>
    editReservation ? String(editReservation.durationHours) : "1"
  );
  const [startHour, setStartHour] = useState(() =>
    editReservation ? String(editReservation.startHour) : ""
  );
  const [editingId, setEditingId] = useState(() => (editReservation ? editReservation.id : null));
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const startOptions = useMemo(
    () => computeStartOptions(date, parseInt(duration, 10) || 1),
    [date, duration]
  );

  // Keep the selected start hour valid whenever the option list changes
  // (date/duration change) — preserve it if still offered, otherwise fall
  // back to the first available option (mirrors the vanilla app's
  // populateReserveStartOptions()).
  useEffect(() => {
    setStartHour((prev) => {
      const stillValid = startOptions.some((o) => o.value === prev);
      return stillValid ? prev : startOptions[0] ? startOptions[0].value : "";
    });
  }, [startOptions]);

  const status = currentReservation(reservations, floor, roomId, now);

  const dayGridRows = useMemo(() => {
    const list = getReservationsFor(reservations, floor, roomId, date);
    const minHour = earliestRelevantHour(date);
    const rows = [];
    for (let h = minHour; h < CLOSE_HOUR; h++) {
      const res = list.find((r) => h >= r.startHour && h < r.startHour + r.durationHours);
      rows.push({ hour: h, reservation: res || null });
    }
    return rows;
  }, [reservations, floor, roomId, date]);

  const upcoming = useMemo(() => {
    const today = todayStr();
    return reservations
      .filter((r) => r.floor === floor && r.roomId === roomId && r.date >= today && isReservationUpcoming(r))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return a.startHour - b.startHour;
      });
  }, [reservations, floor, roomId]);

  function enterEditMode(r) {
    setEditingId(r.id);
    setDate(r.date);
    setDuration(String(r.durationHours));
    setStartHour(String(r.startHour));
    setFormError("");
  }

  function exitEditMode() {
    setEditingId(null);
  }

  function handleDateChange(e) {
    let value = e.target.value;
    const today = todayStr();
    // Defensive clamp: the `min` attribute stops the date picker UI from
    // navigating to a past date, but a value could still be set another
    // way (typed directly, autofill, devtools), so reject that here too.
    if (value && value < today) value = today;
    setDate(value);
  }

  function handleDayGridRowClick(hour) {
    const optionsForCurrentDuration = computeStartOptions(date, parseInt(duration, 10) || 1);
    const hasOption = optionsForCurrentDuration.some((o) => o.value === String(hour));
    if (!hasOption) {
      // Current duration would run past closing from this hour; fall back
      // to a 1-hour duration so this slot is selectable.
      setDuration("1");
    }
    setStartHour(String(hour));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    if (!user) {
      setFormError("Please sign in with Google (top of page) to reserve this room.");
      return;
    }

    const chosenDate = date || todayStr();
    const chosenStart = parseInt(startHour, 10);
    const chosenDuration = parseInt(duration, 10);

    if (Number.isNaN(chosenStart) || Number.isNaN(chosenDuration)) {
      setFormError("Please choose a valid start time and duration.");
      return;
    }

    if (chosenStart + chosenDuration > CLOSE_HOUR) {
      setFormError(`That duration extends past closing time (${hourLabel(CLOSE_HOUR)}).`);
      return;
    }

    // Defensive re-check: the date input's `min` and the start-time
    // select's options already keep the UI from offering a past date/time,
    // but guard here too in case either was bypassed. The database's own
    // starts_not_in_past constraint is the real backstop that can't be
    // bypassed at all.
    const today = todayStr();
    if (chosenDate < today) {
      setFormError("You can't reserve a date in the past.");
      return;
    }
    if (chosenDate === today && chosenStart < new Date().getHours()) {
      setFormError("That start time has already passed today.");
      return;
    }

    // Fast client-side pre-checks, for a specific error message naming the
    // conflicting room/time. These are just a UX nicety — the database's
    // own EXCLUDE constraints are the real backstop (see the error handling
    // below), so a conflict that slips past this check (e.g. a race with
    // another request) is still rejected server-side.
    if (hasConflict(reservations, floor, roomId, chosenDate, chosenStart, chosenDuration, editingId)) {
      setFormError("That time conflicts with an existing reservation for this room. Please choose another time.");
      return;
    }

    const crossConflict = hasCrossRoomConflict(
      reservations,
      user.email,
      chosenDate,
      chosenStart,
      chosenDuration,
      editingId
    );
    if (crossConflict) {
      setFormError(
        `You already have ${crossConflict.roomId} booked ` +
          `${timeRangeLabel(crossConflict.startHour, crossConflict.durationHours)} that day, which overlaps this request.`
      );
      return;
    }

    const payload = {
      floor,
      room_id: roomId,
      reservation_date: chosenDate,
      start_hour: chosenStart,
      duration_hours: chosenDuration,
      email: user.email,
      name: user.name,
    };

    const wasEditing = editingId;
    setSubmitting(true);
    setFormError("Saving…");

    const result = wasEditing
      ? await updateReservationRow(wasEditing, payload)
      : await insertReservation(payload);

    setSubmitting(false);

    if (result.error) {
      if (isExclusionViolation(result.error)) {
        // The client-side pre-check above missed this — most likely
        // someone else's request landed in the moment between our check
        // and our insert/update. The database rejected it for real; make
        // sure the UI reflects the up-to-date state rather than looking
        // like the save silently worked.
        setFormError("That time is no longer available — it was just booked. Please pick another time.");
      } else {
        setFormError("Could not save this reservation: " + result.error.message);
      }
      refresh();
      return;
    }

    setEditingId(null);
    setFormError("");
    setDuration("1");
    refresh();
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <button className="modal-close" id="modalClose" aria-label="Close" onClick={onClose}>
        &times;
      </button>
      <h2 id="modalTitle">{roomId}</h2>
      <div id="modalStatus" className={"modal-status " + (status ? "occupied" : "free")}>
        {status
          ? `Reserved now by ${status.name} until ${hourLabel(status.startHour + status.durationHours)}`
          : "Free now"}
      </div>

      <div className="schedule-controls">
        <label>
          Date
          <input id="scheduleDate" type="date" value={date} min={todayStr()} onChange={handleDateChange} />
        </label>
      </div>

      <DayGrid rows={dayGridRows} onRowClick={handleDayGridRowClick} />

      <ReserveForm
        user={user}
        startHour={startHour}
        onStartHourChange={setStartHour}
        startOptions={startOptions}
        duration={duration}
        onDurationChange={setDuration}
        formError={formError}
        submitting={submitting}
        editingId={editingId}
        onSubmit={handleSubmit}
        onCancelEdit={() => {
          exitEditMode();
          setFormError("");
        }}
      />

      <UpcomingList
        upcoming={upcoming}
        loaded={loaded}
        user={user}
        roomId={roomId}
        editingId={editingId}
        onEdit={enterEditMode}
        onExitEditIfMatches={exitEditMode}
        deleteReservationRow={deleteReservationRow}
        refresh={refresh}
      />
    </div>
  );
}
