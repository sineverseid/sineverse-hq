// command-center — SINEVERSE AI Headquarters Edge Function.
// DEPLOYED. Required env vars (Deno.env only, auto-injected by the
// platform): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
// Optional (project-level secrets, shared with platform-api-client):
// PLATFORM_API_URL, PLATFORM_API_KEY — the live platform catalog.
// Execution v1 (wired 26 Nov 2026): validates the instruction, creates a
// backlog task-plan, then asks NARA (Groq GPT-OSS 120B via the groq-proxy
// function) for a reply and stores it as a task_logs agent_reply row.
// The reply is a single NARA answer, not division-lead orchestration —
// that was unwired until v8.
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
// Execution v8 (26 Nov 2026): division-lead routing. Before the reply,
// the function fetches the live division + Lead roster, classifies the
// instruction to ONE division (one small Groq call, keyword fallback),
// fetches that division's live tasks, and — for Quality Assurance &
// Security — the static security-incident history + the latest audit log.
// The main reply is then written AS the division Lead, and the backlog
// task carries the routing + a follow-up plan (description +
// owner_agent_id). Code fixes and deploys are NOT done here — that stays
// with Nara in chat.
// Execution v9 (26 Nov 2026): HQ knowledge base + new answer policy.
// The function fetches the knowledge_base table (published docs) and adds
// it as a PENGETAHUAN HQ block, so answers can draw on verified HQ
// knowledge. The v7/v8 "belum tersedia" rule is REPLACED: never reply with
// only "Data tentang X belum tersedia di HQ." — always answer from the
// nearest verified data (catalog, DATA HQ, knowledge base, division tasks),
// state honestly what is missing, and offer ONE concrete next step; for
// ambiguous or mistyped questions, answer the most likely reading first,
// then ask ONE clarifying question. Anti-hallucination guard stays:
// never invent courses, numbers, or incidents; general knowledge outside
// HQ data must be labelled "di luar data HQ".

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient, getUserFromRequest } from "../_shared/auth.ts";

const MAX_INSTRUCTION_LENGTH = 4000;
const MAX_TITLE_LENGTH = 120;
const GROQ_TIMEOUT_MS = 50000;
const CLASSIFY_TIMEOUT_MS = 20000;
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
  "KEBIJAKAN MENJAWAB: jawab SELALU dari data terverifikasi terdekat yang ada — " +
  "daftar course di atas, blok DATA KATALOG PLATFORM, blok DATA HQ, blok PENGETAHUAN HQ, " +
  "dan blok DATA DIVISI. Bila datum persisnya tidak ada, jangan berhenti di situ: berikan " +
  "data terdekat yang nyata, sebutkan dengan jujur apa yang tidak ada di HQ, dan tawarkan " +
  "SATU langkah berikutnya yang konkret (misalnya 'mau saya buatkan risetnya?'). Bila " +
  "pertanyaan ambigu atau ada salah ketik, jawab dulu bacaan yang paling mungkin dari data " +
  "yang ada, lalu ajukan SATU pertanyaan klarifikasi. DILARANG membalas HANYA dengan " +
  "'Data tentang X belum tersedia di HQ.' sebagai keseluruhan jawaban. Jangan mengarang " +
  "nama course, modul, materi, angka, atau insiden, dan jangan menjawab dengan daftar " +
  "generik tentang AI. Bila memakai pengetahuan umum di luar data HQ, beri label jelas " +
  "'di luar data HQ'. Pertanyaan tentang jumlah atau angka HQ (agen, tugas, laporan, " +
  "pemakaian AI, persetujuan) jawab HANYA dari blok DATA HQ. " +
  "FORMAT JAWABAN: teks polos saja, supaya enak dibaca di HP. Dilarang memakai simbol Markdown " +
  "(tanpa **, tanpa ###, tanpa ---, tanpa tabel |). Pisahkan bagian dengan baris kosong. " +
  "Pakai poin bernomor pendek. Jawab ringkas.";

// Riwayat insiden keamanan platform SINEVERSE — fakta yang terverifikasi,
// diperbarui manual bila ada insiden baru. Dipakai HANYA untuk divisi
// Quality Assurance & Security.
const SECURITY_HISTORY =
  "RIWAYAT INSIDEN KEAMANAN PLATFORM SINEVERSE (terakhir diperiksa 26 Nov 2026):\n" +
  "1. Kebocoran profil — data profil bisa dibaca pihak tak berhak sejak migrasi 001; diperbaiki 24 Nov 2026 (migrasi 056 + hardening RLS).\n" +
  "2. Kebocoran aplikasi mentor — data aplikasi mentor bisa dibaca pihak tak berhak; diperbaiki 25 Nov 2026 (policy 029).\n" +
  "Tidak ada kebocoran aktif yang diketahui per 26 Nov 2026.\n" +
  "ATURAN: untuk pertanyaan tentang kebocoran data, jawab dari riwayat di atas dan log audit di bawah — jangan jawab 'belum tersedia'. Sebut tanggal terakhir diperiksa (26 Nov 2026).";

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

// ---- v9: HQ knowledge base ----

const MAX_KB_DOC_CHARS = 2000;
const MAX_KB_TOTAL_CHARS = 8000;

// Knowledge base (migration 003): title + content of published docs,
// as a PENGETAHUAN HQ block. Best effort — never blocks the reply.
async function fetchKnowledgeBlock(
  supabase: HqClient,
): Promise<string | null> {
  try {
    const res = await supabase
      .from("knowledge_base")
      .select("title, category, content")
      .eq("status", "published")
      .order("created_at", { ascending: true });
    if (res.error) {
      console.error("command-center: knowledge_base fetch failed");
      return null;
    }
    const docs = Array.isArray(res.data) ? res.data : [];
    if (docs.length === 0) return null;
    const lines: string[] = [];
    let total = 0;
    for (const d of docs) {
      const title = String(d.title ?? "Tanpa judul");
      const category = String(d.category ?? "");
      const content = String(d.content ?? "").slice(0, MAX_KB_DOC_CHARS);
      const entry = `[${category}] ${title}\n${content}`;
      if (total + entry.length > MAX_KB_TOTAL_CHARS) break;
      total += entry.length;
      lines.push(entry);
    }
    return lines.length > 0 ? lines.join("\n\n") : null;
  } catch {
    console.error("command-center: knowledge_base fetch failed");
    return null;
  }
}

// ---- v8: division-lead routing ----

type DivisionLead = {
  id: string;
  name: string;
  leadId: string;
  leadName: string;
  leadRole: string;
  leadJob: string;
};

type Routing = {
  division: DivisionLead;
  reason: string;
  via: "groq" | "keyword";
};

// Live roster: every department with its Lead agent. Returns null when the
// roster cannot be read (caller then answers as NARA, unrouted).
async function fetchRoster(
  supabase: HqClient,
): Promise<DivisionLead[] | null> {
  try {
    const [deptsRes, agentsRes] = await Promise.all([
      supabase.from("departments").select("id, name"),
      supabase.from("ai_agents").select(
        "id, name, department_id, role, job_description",
      ),
    ]);
    if (deptsRes.error || agentsRes.error) {
      console.error("command-center: roster fetch failed");
      return null;
    }
    const depts = Array.isArray(deptsRes.data) ? deptsRes.data : [];
    const agents = Array.isArray(agentsRes.data) ? agentsRes.data : [];
    const roster: DivisionLead[] = [];
    for (const d of depts) {
      const lead = agents.find(
        (a) => String(a.department_id) === String(d.id),
      );
      if (!lead) continue;
      roster.push({
        id: String(d.id),
        name: String(d.name),
        leadId: String(lead.id),
        leadName: String(lead.name),
        leadRole: String(lead.role ?? ""),
        leadJob: String(lead.job_description ?? ""),
      });
    }
    return roster.length > 0 ? roster : null;
  } catch {
    console.error("command-center: roster fetch failed");
    return null;
  }
}

// Keyword fallback for routing, used only when the Groq classifier fails
// or returns no division. Order matters: the first matching route wins.
const KEYWORD_ROUTES: Array<{ keywords: string[]; division: string }> = [
  { keywords: ["kebocoran", "keamanan", "rls", "audit"], division: "Quality Assurance & Security" },
  { keywords: ["course", "lesson", "materi", "soal", "tugas"], division: "Academic & Curriculum" },
  { keywords: ["mentor"], division: "Talent & Mentor Development" },
  { keywords: ["event", "festival", "lomba"], division: "Film Festival & Event" },
  { keywords: ["komunitas"], division: "Community & Partnership" },
  { keywords: ["pemasaran", "konten"], division: "Marketing & Creative" },
  { keywords: ["laporan", "analitik"], division: "Growth & Data Analytics" },
  { keywords: ["operasional", "tata kelola"], division: "Operations & Governance" },
  { keywords: ["produk", "fitur", "aplikasi", "web"], division: "Digital Product & Engineering" },
  { keywords: ["ui", "desain"], division: "UI/UX & Product Research" },
  { keywords: ["riset", "industri"], division: "Research & Industry Relations" },
  { keywords: ["bantuan", "pengguna"], division: "Customer Success & Helpdesk" },
  { keywords: ["ai"], division: "AI Innovation & Research" },
];

function hasKeyword(text: string, kw: string): boolean {
  if (kw.length <= 3) {
    return new RegExp(`\\b${kw}\\b`, "i").test(text);
  }
  return text.toLowerCase().includes(kw);
}

function classifyByKeywords(
  instruction: string,
  roster: DivisionLead[],
): DivisionLead | null {
  for (const route of KEYWORD_ROUTES) {
    if (route.keywords.some((kw) => hasKeyword(instruction, kw))) {
      const hit = roster.find(
        (d) => d.name.toLowerCase() === route.division.toLowerCase(),
      );
      if (hit) return hit;
    }
  }
  return null;
}

// One small Groq call that picks ONE division for the instruction.
// Returns null on any failure or when no division clearly fits.
async function classifyDivision(
  instruction: string,
  roster: DivisionLead[],
  supabaseUrl: string,
  anonKey: string,
  authHeader: string,
): Promise<{ division: DivisionLead; reason: string } | null> {
  const rosterText = roster
    .map((d) => `- ${d.name} — Lead ${d.leadName} — ${d.leadJob || d.leadRole}`)
    .join("\n");
  const system =
    "Kamu pengarah tugas SINEVERSE AI Headquarters. " +
    "Tentukan SATU divisi yang paling tepat untuk instruksi Founder dari daftar di bawah. " +
    "Balas HANYA dengan satu objek JSON, tanpa teks lain: " +
    '{"division_name": "<nama divisi persis dari daftar atau null>", "alasan_singkat": "<satu kalimat alasan>"}. ' +
    "Bila tidak ada divisi yang jelas cocok (misalnya pertanyaan umum tentang HQ), isi division_name dengan null.\n\n" +
    "DAFTAR DIVISI:\n" + rosterText;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CLASSIFY_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${supabaseUrl}/functions/v1/groq-proxy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: authHeader,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: system },
            { role: "user", content: instruction },
          ],
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) {
      console.error(
        `command-center: classify groq-proxy HTTP ${res.status}`,
      );
      return null;
    }
    const providerJson: unknown = await res.json();
    const content = extractReply(providerJson);
    if (!content) return null;
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const name = typeof parsed.division_name === "string"
      ? parsed.division_name.trim()
      : "";
    const reason = typeof parsed.alasan_singkat === "string"
      ? parsed.alasan_singkat.trim()
      : "";
    if (!name) return null;
    const hit = roster.find(
      (d) => d.name.toLowerCase() === name.toLowerCase(),
    );
    if (!hit) return null;
    return {
      division: hit,
      reason: reason || `Instruksi terkait ${hit.name}.`,
    };
  } catch {
    console.error("command-center: classify call failed");
    return null;
  }
}

// Live data for the routed division: its tasks per status + 5 latest.
// For Quality Assurance & Security, also the security-incident history
// and the 8 latest audit-log entries, so leak questions are answered
// from real records instead of "belum tersedia".
async function fetchDivisionSummary(
  supabase: HqClient,
  division: DivisionLead,
): Promise<string | null> {
  try {
    const tasksRes = await supabase
      .from("tasks")
      .select("status, title, created_at")
      .eq("department_id", division.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (tasksRes.error) {
      console.error("command-center: division tasks fetch failed");
      return null;
    }
    const tasks = Array.isArray(tasksRes.data) ? tasksRes.data : [];
    const count = (status: string) =>
      tasks.filter((t) => String(t.status) === status).length;
    const lines: string[] = [
      `Divisi: ${division.name} — Lead ${division.leadName} (${division.leadRole}).`,
      `Tugas divisi: ${count("completed")} selesai, ${count("backlog")} backlog, ${count("in_review")} in review, ${count("in_progress")} berjalan, ${count("awaiting_approval")} menunggu persetujuan, ${count("blocked")} diblokir, ${count("cancelled")} dibatalkan.`,
    ];
    const latest = tasks.slice(0, 5);
    if (latest.length > 0) {
      lines.push("Tugas terbaru divisi:");
      for (const t of latest) {
        lines.push(
          `- ${String(t.title)} (${String(t.status)}, ${formatWibShort(String(t.created_at))}).`,
        );
      }
    } else {
      lines.push("Tugas terbaru divisi: belum ada.");
    }
    if (division.name === "Quality Assurance & Security") {
      lines.push("");
      lines.push(SECURITY_HISTORY);
      const auditRes = await supabase
        .from("audit_logs")
        .select("action, actor, created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      if (!auditRes.error && Array.isArray(auditRes.data)) {
        lines.push("Log audit terbaru (8 entri):");
        for (const row of auditRes.data as Array<Record<string, unknown>>) {
          lines.push(
            `- ${String(row.action)} — ${String(row.actor)} (${formatWibShort(String(row.created_at))}).`,
          );
        }
      }
    }
    return lines.join("\n");
  } catch {
    console.error("command-center: division summary failed");
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
  const authHeader = req.headers.get("Authorization");

  // 1. Live roster, then classify the instruction to ONE division
  // (small Groq call; keyword fallback when it fails or is unclear).
  // Unrouted instructions stay with NARA.
  let routing: Routing | null = null;
  const roster = await fetchRoster(supabase);
  if (roster) {
    if (authHeader) {
      const classified = await classifyDivision(
        instruction.trim(),
        roster,
        supabaseUrl,
        anonKey,
        authHeader,
      );
      if (classified) {
        routing = {
          division: classified.division,
          reason: classified.reason,
          via: "groq",
        };
      }
    }
    if (!routing) {
      const kw = classifyByKeywords(instruction.trim(), roster);
      if (kw) {
        routing = {
          division: kw,
          reason: `Instruksi mengandung kata kunci terkait ${kw.name}.`,
          via: "keyword",
        };
      }
    }
  }

  // 2. Live platform catalog summary for the reply (best effort).
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

  // 3. Live HQ data summary for the reply (best effort).
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

  // 4. HQ knowledge base for the reply (best effort).
  const knowledgeBlock = await fetchKnowledgeBlock(supabase);
  if (knowledgeBlock) {
    systemPrompt +=
      "\n\nPENGETAHUAN HQ (dokumen knowledge base, dibaca saat menjawab):\n" +
      knowledgeBlock +
      "\nGunakan dokumen ini untuk menjawab pertanyaan tentang HQ, akademi, " +
      "dan platform — ini data terverifikasi, bukan karangan.";
  } else {
    warnings.push("knowledge_unavailable");
  }

  // 5. Live data for the routed division (best effort).
  let divisionSummary: string | null = null;
  if (routing) {
    divisionSummary = await fetchDivisionSummary(supabase, routing.division);
  }

  // 6. Routing instruction + division data on top of the base prompt.
  if (routing) {
    systemPrompt +=
      `\n\nPENGARAHAN: Jawablah sebagai ${routing.division.leadName}, Lead ${routing.division.name}. ` +
      "Awali jawaban dengan nama dan divisimu. " +
      "Ikuti KEBIJAKAN MENJAWAB di atas: bila datum persisnya tidak ada, beri data terdekat " +
      "yang nyata, sebutkan apa yang tidak ada, dan tawarkan satu langkah berikutnya — jangan " +
      "pernah membalas hanya dengan 'belum tersedia'.";
    if (divisionSummary) {
      systemPrompt +=
        `\n\nDATA DIVISI ${routing.division.name} (live, dibaca saat menjawab):\n` +
        divisionSummary;
    }
  }

  // 7. Lead reply via groq-proxy (forward the caller's JWT).
  let reply: string | null = null;
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

  // 8. Task-plan: one backlog task, carrying the routing + follow-up plan.
  // (Created after the reply attempt, like v7 the plan still exists when
  // the reply fails — only the task insert itself can fail this step.)
  const rencana = routing
    ? `${routing.division.leadName} menindaklanjuti — ${routing.reason}`
    : "Jawab pertanyaan Founder dan pantau bila perlu tindak lanjut.";
  const description = routing
    ? `Divisi: ${routing.division.name} | Lead: ${routing.division.leadName} | Asal: NARA Command Center | Rencana: ${rencana}`
    : `Divisi: - | Lead: NARA | Asal: NARA Command Center | Rencana: ${rencana}`;
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      title,
      status: "backlog",
      description,
      department_id: routing ? routing.division.id : null,
      owner_agent_id: routing ? routing.division.leadId : null,
    })
    .select("id, title, status")
    .single();

  if (taskError || !task) {
    // Never log the request body / instruction.
    console.error("command-center: tasks insert failed");
    return jsonResponse({ error: "Failed to create task plan" }, 500);
  }

  // 9. Plan log (real task_logs columns: event_type + note).
  const { error: planLogError } = await supabase.from("task_logs").insert({
    task_id: task.id,
    event_type: "plan_created",
    note: routing
      ? `Plan created from a founder instruction. Routed to ${routing.division.name} (${routing.division.leadName}) via ${routing.via}.`
      : "Plan created from a founder instruction.",
  });
  if (planLogError) {
    console.error("command-center: plan task_logs insert failed");
    warnings.push("task_log_not_recorded");
  }

  // 10. Store the reply so the conversation history can show it.
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
    routing: routing
      ? {
        division_id: routing.division.id,
        division_name: routing.division.name,
        lead_id: routing.division.leadId,
        lead_name: routing.division.leadName,
        via: routing.via,
      }
      : null,
    reply,
    message: reply
      ? (routing
        ? `Plan created. ${routing.division.leadName} replied.`
        : "Plan created. NARA replied.")
      : "Plan created. NARA could not reply yet.",
    ...(warnings.length > 0 ? { warnings } : {}),
  }, 200);
});
