export default function Legend({ style }) {
  return (
    <div className="legend" id="legend" style={style}>
      <span className="legend-item">
        <span className="swatch free" /> Free
      </span>
      <span className="legend-item">
        <span className="swatch occupied" /> Reserved now
      </span>
      <span className="legend-item">
        <span className="swatch na" /> Not reservable
      </span>
    </div>
  );
}
