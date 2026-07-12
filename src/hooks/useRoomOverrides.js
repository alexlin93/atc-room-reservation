import { useCallback, useEffect, useState } from "react";
import {
  fetchRoomOverrides,
  subscribeToRoomOverrideChanges,
  setRoomReservable,
} from "../services/adminService";

// In-memory mirror of the `room_overrides` table, kept in sync via
// services/adminService.js's Realtime subscription (with its own polling
// fallback) — mirrors useReservations.js's shape exactly. This hook owns
// only React state/lifecycle; all actual Supabase calls live in the service
// module. Read by both the map (to grey out a disabled room for everyone)
// and the room modal's admin-only toggle control.
export function useRoomOverrides() {
  const [overrides, setOverrides] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await fetchRoomOverrides();
    if (error) return false;
    setOverrides(data);
    setLoaded(true);
    return true;
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToRoomOverrideChanges(refresh);
    return unsubscribe;
  }, [refresh]);

  // Absence of a row means "reservable" (a room only gets a row once an
  // admin has toggled it at least once).
  const isRoomReservable = useCallback(
    (floor, roomId) => {
      const row = overrides.find((o) => o.floor === floor && o.roomId === roomId);
      return row ? row.isReservable : true;
    },
    [overrides]
  );

  return {
    overrides,
    loaded,
    refresh,
    isRoomReservable,
    setRoomReservable,
  };
}
