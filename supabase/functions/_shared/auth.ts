// Shared auth helper for SINEVERSE AI Headquarters Edge Functions.
// Stub / shared helper — not deployed. No secrets in this file.
//
// Required env vars (read only from Deno.env at call time):
//   SUPABASE_URL, SUPABASE_ANON_KEY
// What remains: enforce an aal2 (MFA) check on sensitive routes once
// Auth MFA (TOTP) is configured for the founder account.
// FOUNDER_UID is set to the real founder account (sineverse.id@gmail.com),
// created 26 Nov 2026.

import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

// FOUNDER_UID — the real founder auth user id
// (auth.users.id for the founder account in the SEPARATE HQ Supabase project).
// Set 26 Nov 2026 to the founder account (sineverse.id@gmail.com).
// Founder-only routes refuse everyone whose id differs from this value.
export const FOUNDER_UID = "2161fd87-29ab-442e-8223-6d448c1aa7e5";

/** True only once FOUNDER_UID has been replaced with a real, non-zero UUID. */
export function isFounderUidConfigured(): boolean {
  return FOUNDER_UID !== "00000000-0000-0000-0000-000000000000" &&
    FOUNDER_UID.length > 0;
}

/**
 * Read the assurance level (aal) from the caller's Bearer JWT payload.
 * The token has already been validated by getUserFromRequest (auth.getUser),
 * so decoding the payload here is sound — this only reads the aal claim.
 * Returns 'aal1' | 'aal2' | null when the token or claim is absent.
 */
export function getAalFromRequest(req: Request): string | null {
  const header = req.headers.get("Authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    ) as Record<string, unknown>;
    return typeof payload.aal === "string" ? payload.aal : null;
  } catch {
    return null;
  }
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.get("Authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Validate the caller's Bearer JWT.
 * Creates a Supabase client from SUPABASE_URL + SUPABASE_ANON_KEY (env only),
 * calls auth.getUser(token), and returns the user, or null when there is no
 * token, the env vars are missing, or the token is invalid/expired.
 * Never logs the token or the request body.
 */
export async function getUserFromRequest(
  req: Request,
): Promise<User | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;

  const supabase: SupabaseClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

/**
 * Create an authenticated Supabase client for the caller (anon key + caller JWT).
 * Returns null when env vars are missing or there is no Bearer token.
 */
export function getAuthedClient(
  req: Request,
): SupabaseClient | null {
  const token = getBearerToken(req);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!token || !url || !anonKey) return null;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Create a service-role Supabase client (bypasses RLS — server-side only).
 * Returns null when SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.
 * The service-role key must come from Deno.env only; never hardcode it.
 */
export function getServiceClient(): SupabaseClient | null {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
