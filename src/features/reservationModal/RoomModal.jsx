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
  isAdmin,
  isRoomReservable,
  setRoomReservable,
  refreshRoomOverrides,
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
  const [togglingReservable, setTogglingReservable] = useState(false);

  // Admins can pick a past date/hour (the "create a reservation without the
  // time restriction" capability); everyone else keeps the existing
  // elapsed-hour/past-date UI conveniences. The database's own
  // starts_not_in_past CHECK (supabase/schema.sql) is the real backstop for
  // non-admins either way.
  const startOptions = useMemo(
    () => computeStartOptions(date, parseInt(duration, 10) || 1, undefined, { allowPast: isAdmin }),
    [date, duration, isAdmin]
  );

  const roomReservable = isRoomReservable ? isRoomReservable(floor, roomId) : true;

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
    const minHour = earliestRelevantHour(date, undefined, { allowPast: isAdmin });
    const rows = [];
    for (let h = minHour; h < CLOSE_HOUR; h++) {
      const res = list.find((r) => h >= r.startHour && h < r.startHour + r.durationHours);
      rows.push({ hour: h, reservation: res || null });
    }
    return rows;
  }, [reservations, floor, roomId, date, isAdmin]);

  const upcoming = useMemo(() => {
    const today = todayStr();
    return reservations
      .filter((r) => r.floor === floor && r.roomId === roomId && r.date >= today && isReservationUpcoming(r))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return a.startHour - b.startHour;
      });
  }, [reservations, floor, roomId]);

  // The reservation currently being edited (looked up live from
  // `reservations`, not just the `editReservation` prop this modal mounted
  // with — enterEditMode() below can switch editingId to a *different*
  // reservation without remounting, e.g. an admin editing several rooms'
  // bookings from this same modal instance). Null while creating a new
  // reservation (editingId === null) or if the row was deleted out from
  // under us mid-edit.
  const editingOriginal = useMemo(
    () => (editingId ? reservations.find((r) => r.id === editingId) || null : null),
    [editingId, reservations]
  );

  // True only when an admin has opened someone ELSE's existing reservation
  // in edit mode — never true for a self-edit or for a brand-new
  // reservation, so those two paths keep stamping the signed-in user's own
  // identity exactly as before. Gates both the submit payload (below, so an
  // edit doesn't silently reassign the reservation to the admin who touched
  // it) and the "Editing X's reservation" UI cue in ReserveForm.
  const isEditingSomeoneElse = !!(user && editingOriginal && editingOriginal.email !== user.email);

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
    // Skipped for admins, who are allowed to pick a past date on purpose.
    if (!isAdmin && value && value < today) value = today;
    setDate(value);
  }

  async function handleToggleReservable() {
    if (!isAdmin || !user || togglingReservable) return;
    setTogglingReservable(true);
    const result = await setRoomReservable(floor, roomId, !roomReservable, user.email);
    setTogglingReservable(false);
    if (result.error) {
      window.alert("Could not update this room's status: " + result.error.message);
      return;
    }
    if (refreshRoomOverrides) refreshRoomOverrides();
  }

  function handleDayGridRowClick(hour) {
    const optionsForCurrentDuration = computeStartOptions(date, parseInt(duration, 10) || 1, undefined, {
      allowPast: isAdmin,
    });
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

    // Re-checked at submit time (not just reflected in the map's styling)
    // so a non-admin who already had this modal open when an admin marked
    // the room unreservable can't still slip a booking through. roomReservable
    // itself is live — isRoomReservable reads from useRoomOverrides, which is
    // kept current via realtime/poll — so this reflects the latest known
    // status as of this click, not just whatever it was when the modal opened.
    // This is a UX nicety, not the real backstop: the reservations table's
    // own INSERT/UPDATE policies (supabase/schema.sql) independently require
    // the target room to be reservable-or-caller-is-admin, so a non-admin
    // calling the Supabase insert/update directly (bypassing this check
    // entirely) is still rejected server-side — verified against a real
    // Postgres instance, see supabase/schema.sql's comments.
    if (!roomReservable && !isAdmin) {
      setFormError("This room has been marked unreservable by an admin.");
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
    // bypassed at all. Admins are allowed to make a past-dated/past-time
    // reservation on purpose (the schema's starts_not_in_past CHECK grants
    // them the same bypass server-side), so this client-side check is
    // skipped entirely for isAdmin rather than just not blocking the submit
    // button — the date input's `min` and the day grid/start-time options
    // above are also unrestricted for admins, so this is only ever reached
    // with a past value here when an admin genuinely chose one.
    if (!isAdmin) {
      const today = todayStr();
      if (chosenDate < today) {
        setFormError("You can't reserve a date in the past.");
        return;
      }
      if (chosenDate === today && chosenStart < new Date().getHours()) {
        setFormError("That start time has already passed today.");
        return;
      }
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

    // Must be checked against the reservation's actual (post-save) owner,
    // not always the signed-in user — otherwise, when an admin is editing
    // SOMEONE ELSE's reservation, this would incorrectly check the ADMIN's
    // own schedule for a conflict instead of the original owner's. That
    // false positive could block a legitimate edit (the admin happens to
    // have an unrelated booking that overlaps) with a confusing error
    // naming a room the target owner has never heard of, and — the other
    // direction — could miss a real conflict against the owner's other
    // bookings (falling through to the server's EXCLUDE constraint instead,
    // which still catches it, just without this nicer client-side message).
    // Mirrors the same isEditingSomeoneElse branch used for the submit
    // payload below.
    const crossConflictEmail = isEditingSomeoneElse ? editingOriginal.email : user.email;
    const crossConflict = hasCrossRoomConflict(
      reservations,
      crossConflictEmail,
      chosenDate,
      chosenStart,
      chosenDuration,
      editingId
    );
    if (crossConflict) {
      const whose = isEditingSomeoneElse ? `${editingOriginal.name} already has` : "You already have";
      setFormError(
        `${whose} ${crossConflict.roomId} booked ` +
          `${timeRangeLabel(crossConflict.startHour, crossConflict.durationHours)} that day, which overlaps this request.`
      );
      return;
    }

    // Creating a new reservation, or editing your own, stamps the
    // signed-in user's identity (unchanged behavior). Editing SOMEONE
    // ELSE's existing reservation (only reachable at all when isAdmin,
    // since that's the only case UpcomingList/the admin dashboard render
    // Edit for a non-owned row) preserves the ORIGINAL owner's email/name
    // instead — the RLS "own reservation" policies (and My Reservations'
    // own `r.email === user.email` filter) key off this column, so
    // overwriting it here would silently strip the original owner's
    // ability to see or cancel their own booking after an admin merely
    // fixed a typo'd time for them.
    const payload = {
      floor,
      room_id: roomId,
      reservation_date: chosenDate,
      start_hour: chosenStart,
      duration_hours: chosenDuration,
      email: isEditingSomeoneElse ? editingOriginal.email : user.email,
      name: isEditingSomeoneElse ? editingOriginal.name : user.name,
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

      {isAdmin && (
        <div className="admin-room-toggle" id="adminRoomToggle">
          <span>Room status: {roomReservable ? "Reservable" : "Unreservable"}</span>
          <button type="button" className="btn-link" disabled={togglingReservable} onClick={handleToggleReservable}>
            {roomReservable ? "Mark unreservable" : "Mark reservable"}
          </button>
        </div>
      )}

      {!roomReservable && !isAdmin && (
        <div className="room-unreservable-notice" id="roomUnreservableNotice">
          This room has been marked unreservable by an admin.
        </div>
      )}

      <div className="schedule-controls">
        <label>
          Date
          <input
            id="scheduleDate"
            type="date"
            value={date}
            min={isAdmin ? undefined : todayStr()}
            onChange={handleDateChange}
          />
        </label>
      </div>

      <DayGrid rows={dayGridRows} onRowClick={handleDayGridRowClick} />

      <ReserveForm
        user={user}
        editingOriginal={isEditingSomeoneElse ? editingOriginal : null}
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
        isAdmin={isAdmin}
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
