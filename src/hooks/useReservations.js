import { useCallback, useEffect, useState } from "react";
import {
  fetchReservations,
  subscribeToReservationChanges,
  insertReservation,
  updateReservation,
  deleteReservation,
} from "../services/reservationsService";

// In-memory mirror of the `reservations` table, kept in sync via
// services/reservationsService.js's Realtime subscription (with its own
// polling fallback). This hook owns only React state/lifecycle — all
// actual Supabase calls live in the service module.
export function useReservations() {
  const [reservations, setReservations] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await fetchReservations();
    if (error) return false;
    setReservations(data);
    setLoaded(true);
    return true;
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToReservationChanges(refresh);
    return unsubscribe;
  }, [refresh]);

  return {
    reservations,
    loaded,
    refresh,
    insertReservation,
    updateReservationRow: updateReservation,
    deleteReservationRow: deleteReservation,
  };
}
