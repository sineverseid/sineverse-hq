// scheduler — SINEVERSE AI Headquarters Edge Function.
// STUB — NOT DEPLOYED. No HQ Supabase project exists yet.
// Required env vars (Deno.env only): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// CRON_SECRET. (No JWT on this route — see below.)
// What remains: actual job execution. This stub only queues due jobs as
// "pending" rows in job_execution_logs; it generates NO reports, sends NO
// briefings, and runs NO downstream work. Execution logic must be added
// per job before any report is claimed to exist.
//
// Auth model: this route does NOT validate a caller JWT. It instead requires
// the header `x-cron-secret` to equal the CRON_SECRET env var (401 otherwise).
// Keep CRON_SECRET in Supabase secrets only; never put it in code or in a URL.
//
// Approved job names (from the HQ schedule; see the functions README):
//   07:45 System Check
//   08:00 Morning Briefing
//   12:00 Midday Progress Report
//   17:00 End-of-Day Report
//   Weekly — Friday (weekly report)
//   Monthly — 1st of the month (monthly report)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/auth.ts";

serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Cron-secret auth (NOT a JWT). Timing-safe comparison is not available in
  // this minimal stub; keep the secret long and random, and rotate on leak.
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!cronSecret || !provided || provided !== cronSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = getServiceClient();
  if (!supabase) {
    // Generic message only — do not echo which env var is missing.
    return jsonResponse({ error: "server misconfigured" }, 500);
  }

  // Read enabled scheduled jobs. "Due" is determined by the job row itself
  // (next_run_at / schedule fields) — this stub queues every enabled row
  // returned; refine the due-window query once the schema is final.
  // Approved jobs: 07:45 System Check, 08:00 Morning Briefing, 12:00 Midday
  // Progress Report, 17:00 End-of-Day Report, weekly Friday, monthly.
  const { data: jobs, error: jobsError } = await supabase
    .from("scheduled_jobs")
    .select("id, name")
    .eq("enabled", true);

  if (jobsError) {
    console.error("scheduler: scheduled_jobs read failed");
    return jsonResponse({ error: "Failed to read scheduled jobs" }, 500);
  }

  const dueJobs = jobs ?? [];
  let queued = 0;

  for (const job of dueJobs) {
    const { error } = await supabase.from("job_execution_logs").insert({
      scheduled_job_id: job.id,
      status: "pending",
      // Honest stub note: nothing was executed.
      detail:
        "Execution is a stub — job queued as pending; no report was generated.",
    });
    if (error) {
      console.error("scheduler: job_execution_logs insert failed");
      continue;
    }
    queued += 1;
  }

  // Do NOT pretend reports were generated.
  return jsonResponse({ jobs_queued: queued }, 200);
});
