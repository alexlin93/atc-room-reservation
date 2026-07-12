export default function WelcomeScreen({ visible, onSignIn }) {
  return (
    <div className="welcome-screen" id="welcomeScreen" style={{ display: visible ? "flex" : "none" }}>
      <div className="welcome-card">
        <h1>ATC Room Reservations</h1>
        <p>Sign in with your Google account to view the floor plan and reserve a room.</p>
        <button
          type="button"
          id="welcomeSignInButton"
          className="btn-google-signin btn-google-signin-large"
          onClick={onSignIn}
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
