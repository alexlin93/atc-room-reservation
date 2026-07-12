import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import { checkIsAdmin } from "../../services/adminService";

// Query/hash param names that either OAuth flow (implicit or PKCE) or a
// provider error can leave in the URL after the redirect back from Google.
// Checked defensively as a set, rather than assuming exactly one flow type,
// since Supabase (or a future config change) could hand back either shape
// and leaving any of them visible in the address bar is the bug.
const AUTH_URL_PARAM_KEYS = [
  "access_token",
  "refresh_token",
  "expires_in",
  "expires_at",
  "token_type",
  "provider_token",
  "provider_refresh_token",
  "code",
  "state",
  "error",
  "error_code",
  "error_description",
  "type",
];

function urlHasAuthParams(paramsString) {
  if (!paramsString) return false;
  const params = new URLSearchParams(paramsString);
  return AUTH_URL_PARAM_KEYS.some((key) => params.has(key));
}

// Strips any leftover OAuth params from the URL hash and/or query string
// (however Supabase's client just consumed them from) so the address bar
// never keeps showing a token/code after sign-in — and so a *later*
// sign-in's redirectTo (computed fresh each time from origin+pathname, see
// signIn() below) never has to account for stale state either way.
function stripAuthParamsFromUrl() {
  const hasHashAuthParams = urlHasAuthParams(
    window.location.hash ? window.location.hash.slice(1) : ""
  );
  const hasQueryAuthParams = urlHasAuthParams(window.location.search);
  if (!hasHashAuthParams && !hasQueryAuthParams) return;
  const cleanUrl = window.location.origin + window.location.pathname;
  window.history.replaceState(null, "", cleanUrl);
}

// The signed-in identity's email is verified server-side by Supabase (it
// issued/verified the session).
export function getCurrentUser(session) {
  const user = session && session.user;
  if (!user || !user.email) return null;
  const meta = user.user_metadata || {};
  const name = meta.full_name || meta.name || user.email;
  return { email: user.email, name };
}

// Session persisted/restored via getSession() on load; onAuthStateChange
// drives the signed-in/signed-out UI gate. Defaults to signed-out (session
// = null) until the first of getSession()/onAuthStateChange resolves, so
// there's no flash of the map before the auth check resolves.
export function useAuth() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      // Fires after Supabase's client has parsed (or attempted to parse)
      // any auth params out of the URL for this event, so it's safe to
      // scrub them from the address bar here.
      stripAuthParamsFromUrl();
    });

    // Restores state on load — including right after the OAuth redirect
    // back from Google completes and Supabase parses the session out of
    // the URL.
    supabase.auth.getSession().then((result) => {
      setSession((result.data && result.data.session) || null);
      stripAuthParamsFromUrl();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(() => {
    supabase.auth.signInWithOAuth({
      provider: "google",
      // A canonical clean URL, not window.location.href — reusing the
      // current href would bake in whatever hash/query happens to be
      // sitting in the address bar (e.g. a previous login's leftover auth
      // params), breaking the OAuth round-trip on repeated sign-in cycles.
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
  }, []);

  const signOut = useCallback(() => {
    supabase.auth.signOut();
    // signOut() doesn't touch the URL itself, but run the same defensive
    // cleanup here for symmetry — onAuthStateChange's SIGNED_OUT event also
    // triggers it, so this is a harmless no-op in practice.
    stripAuthParamsFromUrl();
  }, []);

  const user = getCurrentUser(session);
  const userEmail = user ? user.email : null;

  // Re-checks admin status whenever the signed-in email changes (including
  // signing out, which clears it back to false). Guarded with a `cancelled`
  // flag so a slow check for a since-replaced email (fast sign-out/sign-in
  // of a different account) can't clobber isAdmin with a stale result.
  useEffect(() => {
    if (!userEmail) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    checkIsAdmin(userEmail).then((result) => {
      if (!cancelled) setIsAdmin(result);
    });
    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  return { session, user, isAdmin, signIn, signOut };
}
