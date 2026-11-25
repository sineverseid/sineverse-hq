// platform-api-client — SINEVERSE AI Headquarters Edge Function.
// DEPLOYED v1 (26 Nov 2026). Returns 501 by design until the platform
// exposes its read-only API (see below).
// Required env vars (Deno.env only): SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY, PLATFORM_API_URL, PLATFORM_API_KEY.
// What remains: the platform side. The platform read-only API endpoints
// (overview, tasks, certificates) DO NOT EXIST YET — this client will
// return 501 "platform_api_not_built" until PLATFORM_API_URL is set AND the
// platform exposes them. Do not treat a 501 here as a platform outage; it
// means the endpoint has not been built.
//
// Privacy contract (§3A / minimum access): HQ reads AGGREGATES and status
// only. Personal data must never be copied into the HQ database. This client
// allowlists ONLY the fields below and strips everything else before
// returning; if the upstream returns personal-data fields (name, email,
// phone, etc.), they are dropped and the response is flagged with
// "dropped_non_allowlisted_fields: true".

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient, getUserFromRequest } from "../_shared/auth.ts";

const ALLOWED_ENDPOINTS = ["overview", "tasks", "certificates"] as const;
type AllowedEndpoint = (typeof ALLOWED_ENDPOINTS)[number];

// Allowlist ONLY — aggregate counts, task title/status/deadline,
// certificate status/serial. Everything else is stripped.
const OVERVIEW_FIELDS = ["students", "mentors", "courses", "enrollments"];
const TASK_FIELDS = ["title", "status", "deadline"];
const CERTIFICATE_FIELDS = ["status", "serial"];

// Personal-data field names that must never pass through (non-exhaustive).
const PERSONAL_FIELD_NAMES = new Set([
  "name", "full_name", "first_name", "last_name", "email", "phone",
  "phone_number", "address", "nik", "date_of_birth", "dob", "school",
  "user_id", "student_id", "mentor_id", "avatar_url", "photo_url",
]);

function pickAllowed(
  row: Record<string, unknown>,
  allowed: string[],
): { picked: Record<string, unknown>; droppedPersonal: boolean } {
  const picked: Record<string, unknown> = {};
  let droppedPersonal = false;
  for (const [key, value] of Object.entries(row)) {
    if (allowed.includes(key)) {
      picked[key] = value;
    } else if (PERSONAL_FIELD_NAMES.has(key.toLowerCase())) {
      droppedPersonal = true;
    }
    // Any other non-allowlisted field is silently dropped.
  }
  return { picked, droppedPersonal };
}

function stripPayload(
  endpoint: AllowedEndpoint,
  payload: unknown,
): { data: unknown; droppedNonAllowlistedFields: boolean } {
  const allowed = endpoint === "overview"
    ? OVERVIEW_FIELDS
    : endpoint === "tasks"
    ? TASK_FIELDS
    : CERTIFICATE_FIELDS;

  let dropped = false;
  const stripOne = (row: unknown) => {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      const { picked, droppedPersonal } = pickAllowed(
        row as Record<string, unknown>,
        allowed,
      );
      if (droppedPersonal) dropped = true;
      return picked;
    }
    return row;
  };

  if (Array.isArray(payload)) {
    return { data: payload.map(stripOne), droppedNonAllowlistedFields: dropped };
  }
  if (payload && typeof payload === "object") {
    // A top-level object may itself hold personal fields, or hold an array
    // under a key such as "tasks" / "certificates" / "items" / "data".
    const obj = payload as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        out[key] = value.map(stripOne);
      } else if (allowed.includes(key)) {
        out[key] = value;
      } else if (PERSONAL_FIELD_NAMES.has(key.toLowerCase())) {
        dropped = true;
      }
      // Other non-allowlisted top-level keys are dropped.
    }
    return { data: out, droppedNonAllowlistedFields: dropped };
  }
  return { data: payload, droppedNonAllowlistedFields: false };
}

serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const endpoint = new URL(req.url).searchParams.get("endpoint");
  if (
    !endpoint ||
    !(ALLOWED_ENDPOINTS as readonly string[]).includes(endpoint)
  ) {
    return jsonResponse(
      { error: "endpoint must be one of: overview, tasks, certificates" },
      400,
    );
  }
  const allowedEndpoint = endpoint as AllowedEndpoint;

  const platformUrl = Deno.env.get("PLATFORM_API_URL");
  const platformKey = Deno.env.get("PLATFORM_API_KEY");
  const supabase = getServiceClient();
  if (!supabase) {
    // Generic message only — do not echo which env var is missing.
    return jsonResponse({ error: "server misconfigured" }, 500);
  }
  if (!platformUrl || !platformKey) {
    // The platform endpoints do not exist yet in any case (see header).
    return jsonResponse(
      { error: "platform_api_not_built", status: "pending" },
      501,
    );
  }

  // Log every call to audit_logs (actor is the function, not a person).
  // Never log the platform key or response bodies.
  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor: "hq-platform-api-client",
    action: "platform_api_read",
    entity_type: "platform_endpoint",
    entity_id: allowedEndpoint,
    detail: `Platform API read: ${allowedEndpoint}.`,
  });
  if (auditError) {
    console.error("platform-api-client: audit_logs insert failed");
    return jsonResponse({ error: "Failed to record audit log" }, 500);
  }

  let upstream: Response;
  try {
    const url = `${platformUrl.replace(/\/$/, "")}/${allowedEndpoint}`;
    upstream = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${platformKey}`,
        Accept: "application/json",
      },
    });
  } catch {
    console.error("platform-api-client: upstream request failed");
    return jsonResponse({ error: "Platform API unavailable" }, 502);
  }

  if (!upstream.ok) {
    // A 404/501 from upstream most likely means the endpoint is not built yet.
    if (upstream.status === 404 || upstream.status === 501) {
      return jsonResponse(
        { error: "platform_api_not_built", status: "pending" },
        501,
      );
    }
    return jsonResponse(
      { error: "Platform API request failed", provider_status: upstream.status },
      502,
    );
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch {
    return jsonResponse({ error: "Invalid platform API response" }, 502);
  }

  const { data, droppedNonAllowlistedFields } = stripPayload(
    allowedEndpoint,
    payload,
  );

  return jsonResponse({
    endpoint: allowedEndpoint,
    data,
    dropped_non_allowlisted_fields: droppedNonAllowlistedFields,
  }, 200);
});
