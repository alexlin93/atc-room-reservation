// Header auth UI: a "Sign in with Google" button when signed out, or the
// user's name (clickable -> My Reservations) + a Sign out control when
// signed in. Both states stay mounted; visibility is toggled via inline
// style (matching style.css's expectations) rather than mount/unmount, so
// there's no layout jump in the sticky header.
//
// The "Admin Dashboard" link sits next to the admin badge, following the
// exact same convention as "My Reservations" (a clickable text control that
// opens a full-page overlay) — it only renders at all when `isAdmin` is
// true, same as the badge right next to it. That's a UI convenience only:
// the real enforcement that a non-admin can't act on other users'
// reservations is the RLS policies at the database layer (already in
// place), not this conditional render.
export default function AuthArea({
  user,
  isAdmin,
  onSignIn,
  onSignOut,
  onOpenMyReservations,
  onOpenAdminDashboard,
}) {
  return (
    <div className="auth-area" id="authArea">
      <button
        type="button"
        id="googleSignInButton"
        className="btn-google-signin"
        style={{ display: user ? "none" : "" }}
        onClick={onSignIn}
      >
        Sign in with Google
      </button>
      <div className="signed-in-info" id="signedInInfo" style={{ display: user ? "flex" : "none" }}>
        <span
          id="signedInName"
          className="signed-in-name"
          tabIndex={0}
          role="button"
          title="View my reservations"
          onClick={onOpenMyReservations}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenMyReservations();
            }
          }}
        >
          {user ? `${user.name ? user.name + " " : ""}(${user.email})` : ""}
        </span>
        {isAdmin && (
          <span className="admin-badge" id="adminBadge" title="Admin">
            🛡️ Admin
          </span>
        )}
        {isAdmin && (
          <button
            type="button"
            id="adminDashboardLink"
            className="btn-link"
            onClick={onOpenAdminDashboard}
          >
            Admin Dashboard
          </button>
        )}
        <button type="button" id="signOutBtn" className="btn-link" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
