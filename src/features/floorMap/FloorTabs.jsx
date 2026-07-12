// Floor 3 / Floor 4 toggle. Reused both by the main app header and by the
// My Reservations page's own floor-plan visual — each passes its own
// container id/class and (for the header) a visibility style, since the
// two call sites render this at different places in the DOM with slightly
// different chrome around it.
export default function FloorTabs({ floor, onChange, containerId, containerClassName = "floor-tabs", style }) {
  return (
    <div className={containerClassName} id={containerId} style={style}>
      <button
        type="button"
        className={"floor-tab" + (floor === 3 ? " active" : "")}
        onClick={() => onChange(3)}
      >
        Floor 3
      </button>
      <button
        type="button"
        className={"floor-tab" + (floor === 4 ? " active" : "")}
        onClick={() => onChange(4)}
      >
        Floor 4
      </button>
    </div>
  );
}
