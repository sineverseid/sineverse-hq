// approval-engine — SINEVERSE AI Headquarters Edge Function.
// DEPLOYED v2 (26 Nov 2026). Decides approval requests (approve/reject),
// founder-only, MFA (aal2) required.
// Required env vars (Deno.env only): SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY. FOUNDER_UID lives in ../_shared/auth.ts.
// Fixes v2: founder check (isFounderUidConfigured compared against the real
// UID, so it always returned false and every decision got 403); aal2
// enforcement (a session that only completed the password step is rejected);
// approval_actions insert used columns decided_by/decided_at, which do not
// exist on that table (it has actor + created_at); audit_logs insert used
// entity_type (the column is entity) and a plain string for detail (jsonb).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";
import {
  FOUNDER_UID,
  getAalFromRequest,
  getServiceClient,
  getUserFromRequest,
  isFounderUidConfigured,
} from "../_shared/auth.ts";

type Action = "approve" | "reject";

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

  // Founder-only: compare the auth user id to FOUNDER_UID.
  if (!isFounderUidConfigured() || user.id !== FOUNDER_UID) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  // MFA required: the session must have completed the second factor (aal2).
  // A password-only session (aal1) cannot decide approvals.
  if (getAalFromRequest(req) !== "aal2") {
    return jsonResponse({ error: "MFA required" }, 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const record = body as Record<string, unknown>;
  const approval_request_id = record.approval_request_id;
  const action = record.action as Action | unknown;
  const note = typeof record.note === "string" ? record.note : null;

  if (typeof approval_request_id !== "string" || approval_request_id.length === 0) {
    return jsonResponse(
      { error: "approval_request_id must be a non-empty string" },
      400,
    );
  }
  if (action !== "approve" && action !== "reject") {
    return jsonResponse(
      { error: 'action must be "approve" or "reject"' },
      400,
    );
  }

  const supabase = getServiceClient();
  if (!supabase) {
    // Generic message only — do not echo which env var is missing.
    return jsonResponse({ error: "server misconfigured" }, 500);
  }

  const { data: requestRow, error: loadError } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("id", approval_request_id)
    .single();

  if (loadError || !requestRow) {
    return jsonResponse({ error: "Approval request not found" }, 404);
  }

  if (requestRow.status && requestRow.status !== "pending") {
    // Already decided — do not decide twice.
    return jsonResponse(
      { error: "Approval request already decided", request: requestRow },
      409,
    );
  }

  // Level 3 requests require a special authorization flag on the request row.
  // Enforced server-side: never approve a level-3 request without it.
  // level is the approval_level enum: 'level_1' | 'level_2' | 'level_3'.
  const isLevel3 = requestRow.level === "level_3";
  const hasSpecialAuthorization = requestRow.special_authorization === true;
  if (isLevel3 && action === "approve" && !hasSpecialAuthorization) {
    return jsonResponse(
      { error: "Level 3 approval requires special authorization" },
      403,
    );
  }

  const newStatus = action === "approve" ? "approved" : "rejected";
  const decidedAt = new Date().toISOString();

  const { error: actionError } = await supabase.from("approval_actions").insert({
    approval_request_id,
    action,
    actor: user.id,
    note,
  });
  if (actionError) {
    console.error("approval-engine: approval_actions insert failed");
    return jsonResponse({ error: "Failed to record approval action" }, 500);
  }

  const { data: updated, error: updateError } = await supabase
    .from("approval_requests")
    .update({
      status: newStatus,
      decided_at: decidedAt,
      decided_by: user.id,
    })
    .eq("id", approval_request_id)
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("approval-engine: approval_requests update failed");
    return jsonResponse({ error: "Failed to update approval request" }, 500);
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor: user.id,
    action: `approval_${action}`,
    entity: "approval_request",
    entity_id: approval_request_id,
    // detail is jsonb — store a small object, never the full payload.
    detail: { status: newStatus },
  });
  if (auditError) {
    console.error("approval-engine: audit_logs insert failed");
    // Decision is recorded; surface the audit gap honestly rather than
    // claiming a fully clean success.
    return jsonResponse({ request: updated, warning: "audit_log_not_recorded" }, 200);
  }

  return jsonResponse({ request: updated }, 200);
});
