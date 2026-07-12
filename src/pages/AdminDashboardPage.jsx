import { useMemo } from "react";
import { isReservationUpcoming } from "../utils/time";
import AdminReservationsTable from "../features/admin/AdminReservationsTable";

// Admin Dashboard: a single consolidated table of EVERY reservation from
// EVERY user, across both floors, with Edit/Cancel per row — in addition
// to (not a replacement for) the existing per-room edit flow reachable by
// clicking a room on the floor map. Reuses the same modal-overlay/modal
// mechanics as MyReservationsPage.jsx (open/close, backdrop click,
// Escape-to-close is wired in App.jsx), just with an admin-wide dataset
// instead of "my own reservations".
//
// `isAdmin` is checked again right here, not just by the caller deciding
// whether to render this component at all: App.jsx already gates mounting
// this page on `isAdmin` (mirroring how it gates MyReservationsPage on
// `user`), but that's only a UI convenience — this internal check is
// defense in depth so that forcing the "open" view state some other way
// (e.g. React DevTools, or a future bug that keeps stale state around
// after an admin's role is revoked) still can't render admin content for a
// non-admin. The real, unbypassable enforcement is the `reservations`
// UPDATE/DELETE RLS policies (supabase/schema.sql), which already require
// the caller to actually be in the `admins` table — this is purely about
// not *displaying* other users' reservation data or admin controls in the
// UI to someone who isn't (or is no longer) an admin.
export default function AdminDashboardPage({
  isAdmin,
  reservations,
  onClose,
  onEditReservation,
  deleteReservationRow,
  refresh,
}) {
  // Soonest-first for everything still upcoming, then most-recent-first for
  // anything already past — so the rows an admin is most likely to act on
  // (today/this week) surface at the top, while past reservations stay
  // available below rather than disappearing entirely.
  const sortedRows = useMemo(() => {
    const upcoming = [];
    const past = [];
    for (const r of reservations) {
      (isReservationUpcoming(r) ? upcoming : past).push(r);
    }
    upcoming.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return a.startHour - b.startHour;
    });
    past.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return b.startHour - a.startHour;
    });
    return [...upcoming, ...past];
  }, [reservations]);

  if (!isAdmin) return null;

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-overlay admin-dash-overlay open" onClick={handleOverlayClick}>
      <div className="modal admin-dash-modal" role="dialog" aria-modal="true" aria-labelledby="adminDashTitle">
        <button className="modal-close" aria-label="Close" onClick={onClose}>
          &times;
        </button>
        <h2 id="adminDashTitle">Admin Dashboard</h2>
        <p className="admin-dash-subtitle">
          All reservations across every floor and room, from every user.
        </p>

        <AdminReservationsTable
          rows={sortedRows}
          onEditReservation={onEditReservation}
          deleteReservationRow={deleteReservationRow}
          refresh={refresh}
        />

        <div className="admin-dash-footer">
          <button type="button" className="btn-link" onClick={onClose}>
            ← Back to map
          </button>
        </div>
      </div>
    </div>
  );
}
