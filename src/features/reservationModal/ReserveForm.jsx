// The reservation form (only rendered/enabled when signed in — a
// sign-in prompt takes its place otherwise): start-time + duration
// selects, a read-only "Reserving as" line, and the submit/cancel-edit
// actions. All form logic (validation, conflict pre-checks, submit)
// lives in the parent RoomModal — this component is purely presentational.
//
// `editingOriginal` is non-null only when an admin has this open in edit
// mode for someone ELSE's reservation (RoomModal computes that — see its
// isEditingSomeoneElse). The "Reserving as" line swaps to an explicit
// "Editing X's reservation ... — Admin" cue in that case, so the fact that
// the original owner's identity is being preserved (not transferred to the
// signed-in admin) on save is visible, not a silent decision.
export default function ReserveForm({
  user,
  editingOriginal,
  startHour,
  onStartHourChange,
  startOptions,
  duration,
  onDurationChange,
  formError,
  submitting,
  editingId,
  onSubmit,
  onCancelEdit,
}) {
  const showForm = !!user;

  return (
    <>
      <form id="reserveForm" className={"reserve-form" + (showForm ? "" : " hidden")} onSubmit={onSubmit}>
        <h3>Reserve this room</h3>
        <div className="form-row reserving-as-row">
          <span id="reservingAsText">
            {editingOriginal ? (
              <>
                Editing {editingOriginal.name}&rsquo;s reservation ({editingOriginal.email}){" "}
                <span
                  className="admin-badge admin-editing-badge"
                  title="You're an admin editing another user's reservation — it stays theirs on save"
                >
                  Admin
                </span>
              </>
            ) : user ? (
              `Reserving as: ${user.name ? user.name + " " : ""}(${user.email})`
            ) : (
              ""
            )}
          </span>
        </div>
        <div className="form-row">
          <label>
            Start time
            <select id="reserveStart" value={startHour} onChange={(e) => onStartHourChange(e.target.value)}>
              {startOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Duration
            <select id="reserveDuration" value={duration} onChange={(e) => onDurationChange(e.target.value)}>
              <option value="1">1 hour</option>
              <option value="2">2 hours</option>
              <option value="3">3 hours</option>
              <option value="4">4 hours</option>
            </select>
          </label>
        </div>
        <div className="form-error" id="formError">
          {formError}
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-reserve" id="reserveSubmitBtn" disabled={submitting}>
            {editingId ? "Save changes" : "Reserve room"}
          </button>
          <button
            type="button"
            className="btn-link"
            id="cancelEditBtn"
            style={{ display: editingId ? "" : "none" }}
            onClick={onCancelEdit}
          >
            Cancel edit
          </button>
        </div>
      </form>

      <div id="signInPrompt" className={"sign-in-prompt" + (showForm ? " hidden" : "")}>
        Sign in with Google (top of page) to reserve this room.
      </div>
    </>
  );
}
