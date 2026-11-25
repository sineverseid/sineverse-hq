// command-center — SINEVERSE AI Headquarters Edge Function.
// STUB — NOT DEPLOYED. No HQ Supabase project exists yet.
// Required env vars (Deno.env only): SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY.
// What remains: agent execution / orchestration (NARA replies, division-lead
// routing, task planning beyond the skeleton) is NOT wired yet. This function
// only validates the instruction and creates a backlog task-plan skeleton.
// It must NOT simulate NARA replies or agent work.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient, getUserFromRequest } from "../_shared/auth.ts";

const MAX_INSTRUCTION_LENGTH = 4000;
const MAX_TITLE_LENGTH = 120;

serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Authenticate the caller on every route.
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

  const instruction = (body as Record<string, unknown>)?.instruction;
  if (typeof instruction !== "string" || instruction.trim().length === 0) {
    return jsonResponse(
      { error: "instruction must be a non-empty string" },
      400,
    );
  }
  if (instruction.length > MAX_INSTRUCTION_LENGTH) {
    return jsonResponse(
      { error: "instruction exceeds the maximum length" },
      400,
    );
  }

  const supabase = getServiceClient();
  if (!supabase) {
    // Generic message only — do not echo which env var is missing.
    return jsonResponse({ error: "server misconfigured" }, 500);
  }

  const title = instruction.trim().slice(0, MAX_TITLE_LENGTH);

  // Task-plan skeleton only: one backlog task + one log row.
  // NOTE: No agent execution happens here. Do not invent a plan beyond this.
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({ title, status: "backlog" })
    .select("id, title, status")
    .single();

  if (taskError || !task) {
    // Never log the request body / instruction.
    console.error("command-center: tasks insert failed");
    return jsonResponse({ error: "Failed to create task plan" }, 500);
  }

  const { error: logError } = await supabase.from("task_logs").insert({
    task_id: task.id,
    actor: user.id,
    action: "plan_created",
    // Never store the instruction / prompt text in logs.
    detail: "Plan created from a founder instruction.",
  });
  if (logError) {
    console.error("command-center: task_logs insert failed");
    // The plan itself was created; report that, but do not claim full success.
    return jsonResponse({
      plan: { task_id: task.id, title: task.title, status: "backlog" },
      message: "Plan created. Agent execution is not wired yet.",
      warning: "task_log_not_recorded",
    }, 200);
  }

  return jsonResponse({
    plan: { task_id: task.id, title: task.title, status: "backlog" },
    message: "Plan created. Agent execution is not wired yet.",
  }, 200);
});
