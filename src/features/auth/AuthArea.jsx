// Header auth UI: a "Sign in with Google" button when signed out, or the
// user's name (clickable -> My Reservations) + a Sign out control when
// signed in. Both states stay mounted; visibility is toggled via inline
// style (matching style.css's expectations) rather than mount/unmount, so
// there's no layout jump in the sticky header.
export default function AuthArea({ user, isAdmin, onSignIn, onSignOut, onOpenMyReservations }) {
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
        <button type="button" id="signOutBtn" className="btn-link" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
