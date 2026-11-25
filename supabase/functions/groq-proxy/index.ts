// groq-proxy — SINEVERSE AI Headquarters Edge Function.
// STUB — NOT DEPLOYED. No HQ Supabase project exists yet.
// Required env vars (Deno.env only): SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY. Optional: GROQ_DAILY_REQUEST_LIMIT
// (default 900 requests/day, free-tier guard).
// What remains: model allowlisting / per-division quotas, retry + timeout
// policy, and verification against live Groq usage. The proxy itself is
// implemented (validation, cap check, upstream call, usage logging), but it
// has NOT been deployed or tested against a live HQ project.
//
// PRIVACY — prompts must never contain personal data (names, emails, phones,
// NIK, addresses, application content). The caller is responsible for
// stripping personal data before calling this proxy, and this proxy does NOT
// log prompts: it never stores prompt or response text, and never logs
// request bodies. Usage rows record token counts and cost only.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient, getUserFromRequest } from "../_shared/auth.ts";

const DEFAULT_MODEL = "openai/gpt-oss-120b";
const DEFAULT_DAILY_LIMIT = 900;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

type ChatMessage = { role: string; content: string };

function startOfTodayIso(): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
}

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

  const record = body as Record<string, unknown>;
  const messages = record.messages as unknown;
  const model = typeof record.model === "string" && record.model.length > 0
    ? record.model
    : DEFAULT_MODEL;

  if (
    !Array.isArray(messages) || messages.length === 0 ||
    !messages.every((m) =>
      m && typeof m === "object" &&
      typeof (m as ChatMessage).role === "string" &&
      typeof (m as ChatMessage).content === "string" &&
      (m as ChatMessage).content.trim().length > 0
    )
  ) {
    return jsonResponse(
      { error: "messages must be a non-empty array of {role, content}" },
      400,
    );
  }

  const groqKey = Deno.env.get("GROQ_API_KEY");
  const supabase = getServiceClient();
  if (!groqKey || !supabase) {
    // Generic message only — do not echo which env var is missing.
    return jsonResponse({ error: "server misconfigured" }, 500);
  }

  // Free-tier guard: count today's rows in ai_usage_logs; refuse with 429
  // when the daily request cap would be exceeded.
  const limitRaw = Deno.env.get("GROQ_DAILY_REQUEST_LIMIT");
  const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : NaN;
  const dailyLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? parsedLimit
    : DEFAULT_DAILY_LIMIT;

  const { count, error: countError } = await supabase
    .from("ai_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("provider", "groq")
    .gte("created_at", startOfTodayIso());

  if (countError) {
    console.error("groq-proxy: ai_usage_logs count failed");
    return jsonResponse({ error: "Failed to check usage cap" }, 500);
  }
  if ((count ?? 0) >= dailyLimit) {
    return jsonResponse(
      { error: "Daily Groq request limit reached" },
      429,
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      // Forward only messages + model. Never log this payload.
      body: JSON.stringify({ model, messages }),
    });
  } catch {
    console.error("groq-proxy: upstream request failed");
    return jsonResponse({ error: "Upstream provider unavailable" }, 502);
  }

  let providerJson: Record<string, unknown>;
  try {
    providerJson = await upstream.json() as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Invalid provider response" }, 502);
  }

  if (!upstream.ok) {
    // Pass the provider's status through without echoing prompt content.
    return jsonResponse(
      { error: "Provider request failed", provider_status: upstream.status },
      upstream.status === 429 ? 429 : 502,
    );
  }

  // Usage row WITHOUT storing the prompt or response text.
  const usage = (providerJson.usage ?? {}) as Record<string, unknown>;
  const promptTokens = typeof usage.prompt_tokens === "number"
    ? usage.prompt_tokens
    : null;
  const completionTokens = typeof usage.completion_tokens === "number"
    ? usage.completion_tokens
    : null;

  const { error: usageError } = await supabase.from("ai_usage_logs").insert({
    provider: "groq",
    model,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    cost: 0, // Groq free tier.
    actor: user.id,
  });
  if (usageError) {
    console.error("groq-proxy: ai_usage_logs insert failed");
    // The provider call succeeded; return it, but flag the missing usage row.
    return jsonResponse(
      { ...providerJson, warning: "usage_log_not_recorded" },
      200,
    );
  }

  return jsonResponse(providerJson, 200);
});
