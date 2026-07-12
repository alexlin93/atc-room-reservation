// Supabase project connection info. The anon/public key is safe to embed
// client-side (same trust level as the old Google OAuth Client ID) — it only
// grants whatever access this project's Row Level Security policies allow
// (see supabase/schema.sql). Real authorization happens via Postgres RLS,
// keyed off the caller's verified JWT, not off this key.
const SUPABASE_URL = "https://fkpbxgfbspwrxoptlcqc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGJ4Z2Zic3B3cnhvcHRsY3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MDYxMDMsImV4cCI6MjA5OTM4MjEwM30.nT1tYoHrUNg7l-4UgSN8aNztCtmTg04zivtJpXjYTbU";
