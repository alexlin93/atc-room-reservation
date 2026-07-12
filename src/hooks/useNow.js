import { useEffect, useState } from "react";

// Recomputes "now" periodically so anything depending on it (map/occupancy
// coloring, the modal's live status line) re-renders as time passes — e.g.
// a booking that started at 2pm should flip a room to "occupied" at 2pm
// even if no database row changed. Data changes themselves are picked up
// separately via the reservations Realtime subscription.
export function useNow(intervalMs) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
