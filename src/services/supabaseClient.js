import { createClient } from "@supabase/supabase-js";

// Supabase project connection info. The anon/public key is safe to embed
// client-side (same trust level as the old Google OAuth Client ID) — it
// only grants whatever access this project's Row Level Security policies
// allow (see supabase/schema.sql). Real authorization happens via Postgres
// RLS, keyed off the caller's verified JWT, not off this key. Kept as a
// plain constant (not a Vite env var/.env) since this value is already
// public-safe and already committed to git today — no need for
// environment-variable indirection for a value that doesn't require it.
const SUPABASE_URL = "https://fkpbxgfbspwrxoptlcqc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGJ4Z2Zic3B3cnhvcHRsY3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MDYxMDMsImV4cCI6MjA5OTM4MjEwM30.nT1tYoHrUNg7l-4UgSN8aNztCtmTg04zivtJpXjYTbU";

// auth options are explicit (rather than relying on this library version's
// defaults) for two reasons:
//   - flowType: "pkce" — PKCE only ever puts a short-lived, single-use
//     authorization `code` (and `state`) in the redirect URL, never a live
//     access/refresh token. That's a real security improvement over the
//     implicit flow, which returns the tokens themselves in the URL hash.
//   - detectSessionInUrl: true — required for either flow so the client
//     parses the auth params out of the URL on load; see
//     stripAuthParamsFromUrl() in features/auth/useAuth.js for the
//     matching cleanup step (this option alone does not remove the params
//     from the address bar).
//
// This is the only place a Supabase client is constructed. Every other
// module that needs to talk to Supabase (auth or data) imports this
// instance rather than creating its own.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});
