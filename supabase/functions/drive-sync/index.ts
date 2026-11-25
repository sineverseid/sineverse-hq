// drive-sync — SINEVERSE AI Headquarters Edge Function.
// STUB — NOT DEPLOYED. No HQ Supabase project exists yet.
// Required env vars (Deno.env only): SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY. (Google Drive credentials are NOT configured —
// see below.)
// What remains: the entire Drive upload. This function only records a
// "pending" sync log and returns 501. It must NOT claim an upload succeeded.
//
// Google Drive is the HQ archive. Folder naming:
//   YYYY-MM-DD_DIVISION_TASK-NAME_VERSION
// Uploads must be verified by reading the file back from Drive before the
// deliverable is marked synced. That verification requires the founder's
// Google OAuth token in Supabase secrets — it is NOT configured, and no
// token, credential, or refresh flow is stored anywhere in this repo.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient, getUserFromRequest } from "../_shared/auth.ts";

serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const deliverable_id = (body as Record<string, unknown>)?.deliverable_id;
  if (typeof deliverable_id !== "string" || deliverable_id.length === 0) {
    return jsonResponse(
      { error: "deliverable_id must be a non-empty string" },
      400,
    );
  }

  const supabase = getServiceClient();
  if (!supabase) {
    // Generic message only — do not echo which env var is missing.
    return jsonResponse({ error: "server misconfigured" }, 500);
  }

  const { data: deliverable, error: loadError } = await supabase
    .from("deliverables")
    .select("id")
    .eq("id", deliverable_id)
    .single();

  if (loadError || !deliverable) {
    return jsonResponse({ error: "Deliverable not found" }, 404);
  }

  // Record the attempt honestly as pending — Drive is not configured.
  const { error: logError } = await supabase.from("drive_sync_logs").insert({
    deliverable_id,
    status: "pending",
    detail:
      "Drive upload verification requires the founder OAuth token in secrets — not configured",
    actor: user.id,
  });
  if (logError) {
    console.error("drive-sync: drive_sync_logs insert failed");
    return jsonResponse({ error: "Failed to record sync attempt" }, 500);
  }

  // 501: not implemented. Do NOT claim an upload succeeded.
  return jsonResponse(
    { status: "pending", reason: "drive_not_configured" },
    501,
  );
});
