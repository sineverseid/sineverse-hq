// command-center — SINEVERSE AI Headquarters Edge Function.
// DEPLOYED. Required env vars (Deno.env only, auto-injected by the
// platform): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
// Optional (project-level secrets, shared with platform-api-client):
// PLATFORM_API_URL, PLATFORM_API_KEY — the live platform catalog.
// Execution v1 (wired 26 Nov 2026): validates the instruction, creates a
// backlog task-plan, then asks NARA (Groq GPT-OSS 120B via the groq-proxy
// function) for a reply and stores it as a task_logs agent_reply row.
// The reply is a single NARA answer, not division-lead orchestration —
// that remains unwired. If the Groq call fails, the plan is still created
// and the response says so honestly (reply null + warning).
// Execution v6 (26 Nov 2026): before the Groq call, fetches a COMPACT
// summary of the live platform catalog (courses -> modules -> lessons,
// with per-lesson assignment/quiz/resource counts) and appends it to the
// system prompt, so NARA answers from REAL platform data instead of only
// the static RPS list. If the catalog fetch fails or the secrets are not
// set, the reply falls back to the static prompt (warning
// "catalog_unavailable") — never blocks the plan or the reply.
// Execution v7 (26 Nov 2026): like the catalog, fetches a COMPACT summary
// of live HQ data (tasks per status, agents total + active, pending
// approvals, latest reports, Groq usage today-in-WIB + all-time) and
// appends it to the system prompt, so NARA answers HQ data questions from
// REAL numbers instead of saying "Data belum tersedia di HQ". If the HQ
// fetch fails, the reply falls back to the static prompt (warning
// "hq_data_unavailable") — never blocks the plan or the reply.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient, getUserFromRequest } from "../_shared/auth.ts";

const MAX_INSTRUCTION_LENGTH = 4000;
const MAX_TITLE_LENGTH = 120;
const GROQ_TIMEOUT_MS = 50000;
const CATALOG_TIMEOUT_MS = 10000;
const NARA_SYSTEM_PROMPT =
  "Kamu NARA, Executive Director AI SINEVERSE AI Headquarters. " +
  "Jawab instruksi Founder dengan singkat dan jelas dalam Bahasa Indonesia. " +
  "SINEVERSE adalah platform filmmaking nasional untuk siswa SMA/SMK. " +
  "Kurikulum Semester 1 (RPS SVS-SEM1, 20 minggu) terdiri dari 10 course ini, dan HANYA ini: " +
  "1. Dasar Sinematografi (Minggu 1-2). 2. Penulisan Skenario (Minggu 3-4). " +
  "3. Pembuatan Storyboard (Minggu 5-6). 4. Penyutradaraan (Minggu 7-8). " +
  "5. Editing Film (Minggu 9-10). 6. Tata Suara & Musik Film (Minggu 11-12). " +
  "7. Film Dokumenter (Minggu 13-14). 8. Mengenal Jobdesk Crew Film (Minggu 15-16). " +
  "9. Produksi & Manajemen Film (Minggu 17-18). 10. Akting untuk Kamera (Minggu 19-20). " +
  "ATURAN: jawab hanya berdasarkan daftar di atas dan blok DATA HQ di bawah " +
  "(bila ada). Jangan mengarang nama course, modul, atau materi, " +
  "dan jangan menjawab dengan daftar generik tentang AI. Pertanyaan tentang " +
  "jumlah atau angka HQ (agen, tugas, laporan, pemakaian AI, persetujuan) " +
  "jawab HANYA dari blok DATA HQ. Bila data yang diminta tidak ada di daftar " +
  "ini DAN tidak ada di blok DATA HQ, katakan terus terang bahwa data itu " +
  "belum tersedia di HQ. " +
  "FORMAT JAWABAN: teks polos saja, supaya enak dibaca di HP. Dilarang memakai simbol Markdown " +
  "(tanpa **, tanpa ###, tanpa ---, tanpa tabel |). Pisahkan bagian dengan baris kosong. " +
  "Pakai poin bernomor pendek. Jawab ringkas.";

function extractReply(providerJson: unknown): string | null {
  if (!providerJson || typeof providerJson !== "object") return null;
  const choices = (providerJson as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const message = (choices[0] as Record<string, unknown>)?.message;
  if (!message || typeof message !== "object") return null;
  const content = (message as Record<string, unknown>).content;
  if (typeof content !== "string" || content.trim().length === 0) return null;
  return content.trim();
}

type CatalogRow = Record<string, unknown>;

function asArray(value: unknown): CatalogRow[] {
  return Array.isArray(value) ? (value as CatalogRow[]) : [];
}

// Compact plain-text summary of the live catalog. Titles and counts only —
// no lesson bodies, no content, no personal data (the upstream already
// allowlists; this keeps the prompt small).
function summarizeCatalog(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as Record<string, unknown>).data;
  const courses = asArray(data);
  if (courses.length === 0) return null;
  const lines: string[] = [];
  for (const course of courses) {
    const modules = asArray(course.modules);
    const lessons = modules.flatMap((m) => asArray(m.lessons));
    const assignments = lessons.reduce(
      (n, l) => n + asArray(l.assignments).length,
      0,
    );
    const quizzes = lessons.reduce(
      (n, l) => n + asArray(l.quizzes).length,
      0,
    );
    const resources = lessons.reduce(
      (n, l) => n + asArray(l.resources).length,
      0,
    );
    const exams = asArray(course.exams).length;
    lines.push(
      `Course: ${course.title} — ${modules.length} modul, ${lessons.length} lesson, ` +
        `${assignments} tugas, ${quizzes} kuis, ${resources} materi, ${exams} ujian.`,
    );
    for (const mod of modules) {
      lines.push(`  Modul: ${mod.title}`);
      for (const lesson of asArray(mod.lessons)) {
        const a = asArray(lesson.assignments).length;
        const q = asArray(lesson.quizzes).length;
        const r = asArray(lesson.resources);
        const resText = r.length > 0
          ? `, materi: ${r.map((x) => `${x.title} (${x.kind})`).join("; ")}`
          : "";
        lines.push(
          `    - ${lesson.title} (tugas: ${a}, kuis: ${q}${resText})`,
        );
      }
    }
  }
  return lines.join("\n");
}

async function fetchCatalogSummary(
  platformUrl: string,
  platformKey: string,
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CATALOG_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${platformUrl.replace(/\/$/, "")}/catalog`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${platformKey}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      console.error(`command-center: catalog fetch HTTP ${res.status}`);
      return null;
    }
    const payload: unknown = await res.json();
    return summarizeCatalog(payload);
  } catch {
    console.error("command-center: catalog fetch failed");
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Awal hari berjalan dalam WIB sebagai ISO UTC (00:00 WIB = 17:00 UTC sehari sebelumnya). */
function startOfTodayWibIso(): string {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  wib.setUTCHours(0, 0, 0, 0);
  return new Date(wib.getTime() - 7 * 60 * 60 * 1000).toISOString();
}

/** "26 Nov, 17:00" (WIB) untuk judul laporan; kembali ke ISO bila gagal. */
function formatWibShort(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type HqClient = NonNullable<ReturnType<typeof getServiceClient>>;

// Compact plain-text summary of live HQ data. Counts and titles only —
// no personal data, no instruction text, no prompt content.
async function fetchHqSummary(
  supabase: HqClient,
): Promise<string | null> {
  try {
    const [tasksRes, agentsRes, approvalsRes, reportsRes, usageRes] =
      await Promise.all([
        supabase.from("tasks").select("status"),
        supabase.from("ai_agents").select("name, status"),
        supabase.from("approval_requests").select("status"),
        supabase
          .from("reports")
          .select("title, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("ai_usage_logs")
          .select("prompt_tokens, completion_tokens, created_at")
          .eq("provider", "groq"),
      ]);
    if (
      tasksRes.error || agentsRes.error || approvalsRes.error ||
      reportsRes.error || usageRes.error
    ) {
      console.error("command-center: HQ data fetch failed");
      return null;
    }
    const tasks = Array.isArray(tasksRes.data) ? tasksRes.data : [];
    const agents = Array.isArray(agentsRes.data) ? agentsRes.data : [];
    const approvals = Array.isArray(approvalsRes.data)
      ? approvalsRes.data
      : [];
    const reports = Array.isArray(reportsRes.data) ? reportsRes.data : [];
    const usage = Array.isArray(usageRes.data) ? usageRes.data : [];

    const countTasks = (status: string) =>
      tasks.filter((t) => String(t.status) === status).length;
    const activeAgents = agents.filter((a) => String(a.status) === "active");
    const pendingApprovals = approvals.filter((a) => {
      const s = String(a.status);
      return s !== "approved" && s !== "rejected";
    }).length;

    const todayStart = new Date(startOfTodayWibIso()).getTime();
    let todayRequests = 0;
    let todayTokens = 0;
    let totalTokens = 0;
    for (const row of usage) {
      const tokens = Number(row.prompt_tokens ?? 0) +
        Number(row.completion_tokens ?? 0);
      totalTokens += tokens;
      const created = new Date(String(row.created_at ?? "")).getTime();
      if (!Number.isNaN(created) && created >= todayStart) {
        todayRequests += 1;
        todayTokens += tokens;
      }
    }

    const lines: string[] = [
      `Agen AI: ${agents.length} total, ${activeAgents.length} aktif (${activeAgents.map((a) => String(a.name)).join(", ") || "tidak ada"}).`,
      `Tugas: ${countTasks("completed")} selesai, ${countTasks("backlog")} backlog, ${countTasks("in_review")} in review, ${countTasks("in_progress")} berjalan, ${countTasks("awaiting_approval")} menunggu persetujuan, ${countTasks("blocked")} diblokir, ${countTasks("cancelled")} dibatalkan.`,
      `Persetujuan menunggu: ${pendingApprovals}.`,
      `Pemakaian Groq: hari ini ${todayRequests} request, ${todayTokens} token; total sejak awal ${usage.length} request, ${totalTokens} token.`,
    ];
    if (reports.length > 0) {
      lines.push("Laporan terbaru:");
      for (const r of reports) {
        lines.push(
          `- ${String(r.title)} (${formatWibShort(String(r.created_at))}).`,
        );
      }
    } else {
      lines.push("Laporan terbaru: belum ada.");
    }
    return lines.join("\n");
  } catch {
    console.error("command-center: HQ data fetch failed");
    return null;
  }
}

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabase = getServiceClient();
  if (!supabase || !supabaseUrl || !anonKey) {
    // Generic message only — do not echo which env var is missing.
    return jsonResponse({ error: "server misconfigured" }, 500);
  }

  const title = instruction.trim().slice(0, MAX_TITLE_LENGTH);
  const warnings: string[] = [];

  // 1. Task-plan skeleton: one backlog task.
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

  // 2. Plan log (real task_logs columns: event_type + note).
  const { error: planLogError } = await supabase.from("task_logs").insert({
    task_id: task.id,
    event_type: "plan_created",
    note: "Plan created from a founder instruction.",
  });
  if (planLogError) {
    console.error("command-center: plan task_logs insert failed");
    warnings.push("task_log_not_recorded");
  }

  // 2b. Live platform catalog summary for the reply (best effort).
  let systemPrompt = NARA_SYSTEM_PROMPT;
  const platformUrl = Deno.env.get("PLATFORM_API_URL");
  const platformKey = Deno.env.get("PLATFORM_API_KEY");
  if (platformUrl && platformKey) {
    const summary = await fetchCatalogSummary(platformUrl, platformKey);
    if (summary) {
      systemPrompt +=
        "\n\nDATA KATALOG PLATFORM (live, dibaca saat menjawab):\n" +
        summary +
        "\nGunakan data ini untuk menjawab. Bila suatu jumlah adalah 0 " +
        "(misalnya 0 tugas), katakan jumlahnya 0 — jangan mengarang isinya.";
    } else {
      warnings.push("catalog_unavailable");
    }
  } else {
    warnings.push("catalog_unavailable");
  }

  // 2c. Live HQ data summary for the reply (best effort).
  const hqSummary = await fetchHqSummary(supabase);
  if (hqSummary) {
    systemPrompt +=
      "\n\nDATA HQ (live, dibaca saat menjawab):\n" +
      hqSummary +
      "\nGunakan data ini untuk menjawab pertanyaan tentang HQ. " +
      "Angka di atas adalah angka sebenarnya saat ini — jangan diganti " +
      "dengan perkiraan.";
  } else {
    warnings.push("hq_data_unavailable");
  }

  // 3. NARA reply via groq-proxy (forward the caller's JWT).
  let reply: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    warnings.push("agent_reply_failed");
  } else {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);
      let groqRes: Response;
      try {
        groqRes = await fetch(`${supabaseUrl}/functions/v1/groq-proxy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: authHeader,
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: instruction.trim() },
            ],
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      if (groqRes.ok) {
        const providerJson: unknown = await groqRes.json();
        reply = extractReply(providerJson);
      } else {
        console.error(
          `command-center: groq-proxy returned HTTP ${groqRes.status}`,
        );
      }
    } catch {
      console.error("command-center: groq-proxy call failed");
    }
    if (!reply) {
      warnings.push("agent_reply_failed");
    }
  }

  // 4. Store the reply so the conversation history can show it.
  if (reply) {
    const { error: replyLogError } = await supabase.from("task_logs").insert({
      task_id: task.id,
      event_type: "agent_reply",
      note: reply,
    });
    if (replyLogError) {
      console.error("command-center: reply task_logs insert failed");
      warnings.push("agent_reply_not_recorded");
      reply = null;
    }
  }

  return jsonResponse({
    plan: { task_id: task.id, title: task.title, status: "backlog" },
    reply,
    message: reply
      ? "Plan created. NARA replied."
      : "Plan created. NARA could not reply yet.",
    ...(warnings.length > 0 ? { warnings } : {}),
  }, 200);
});
