-- ============================================================================
-- SINEVERSE AI HEADQUARTERS — Migration 001: create HQ tables
-- File: supabase/migrations/001_create_hq_tables.sql
-- Postgres 17 syntax. Apply with the Supabase SQL Editor / supabase db push
-- against the HQ project ONLY.
--
-- THIS IS THE HQ DATABASE IN ITS OWN, SEPARATE SUPABASE PROJECT.
-- It is NOT the SINEVERSE platform database. There are no foreign keys,
-- views, or references to any platform table in this file, and no data is
-- ever copied from the platform database into this database.
--
-- DEPLOY CHECKLIST (do before / at deploy time):
--   1. FOUNDER UID: the literal placeholder
--      '00000000-0000-0000-0000-000000000000' used in every RLS policy below
--      MUST be replaced with the real Founder UID from the HQ Supabase
--      project's Auth > Users list. Do NOT deploy with the placeholder.
--      (Search this file for FOUNDER_UID_PLACEHOLDER / the all-zero UUID.)
--   2. SIGN-UP MUST BE DISABLED in the HQ Supabase project
--      (Auth > Providers > Email > "Allow new users to sign up" OFF).
--      No self-registration is permitted; the Founder account is created
--      by the project owner only.
--   3. RLS IS DENY-ALL BY DEFAULT. Every table has RLS enabled. The only
--      access granted is to the Founder UID (plus service_role INSERT on
--      audit_logs via Edge Functions — see the audit_logs section). There
--      is no anon access and no permissive "all users" policy anywhere.
--   4. No credentials of any kind belong in this file or in this database:
--      no API keys, no service keys, no passwords, no tokens. Provider
--      credentials live only in Supabase Vault / Edge Function secrets.
--
-- DELIBERATELY NOT IN THIS MIGRATION:
--   - No platform tables, views, foreign keys, or references to the
--     SINEVERSE platform database (separate project, integrated only via
--     an allowlisted API with aggregate/status data, never PII).
--   - No PII columns: no student or mentor personal data — no names,
--     emails, phone numbers, NIK, addresses, application content,
--     message content, or grades. Agent display names in ai_agents are
--     internal HQ role labels, not student/mentor personal data.
--     ai_usage_logs never stores prompt text or any personal data.
--   - No seed data beyond reference data: the 13 departments, the
--     3 approval policies, and the 6 scheduled jobs. Those seeds are
--     reference data, not activity data. No tasks, logs, reports,
--     users, or other activity rows are seeded.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------

CREATE TYPE task_status AS ENUM (
    'backlog', 'planned', 'in_progress', 'in_review',
    'awaiting_approval', 'testing', 'completed', 'blocked', 'cancelled'
);

CREATE TYPE approval_level AS ENUM ('level_1', 'level_2', 'level_3');

CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE agent_status AS ENUM (
    'active', 'idle', 'working', 'waiting_approval', 'blocked', 'offline', 'error'
);

CREATE TYPE job_status AS ENUM ('pending', 'running', 'succeeded', 'failed');

CREATE TYPE sync_status AS ENUM ('pending', 'synced', 'failed');

CREATE TYPE report_type AS ENUM ('daily', 'weekly', 'monthly');

-- ----------------------------------------------------------------------------
-- HELPER FUNCTIONS
-- ----------------------------------------------------------------------------

-- Bumps updated_at on UPDATE. Attached only to mutable tables.
CREATE OR REPLACE FUNCTION public.hq_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Second layer of append-only enforcement for audit_logs.
-- Raises on any UPDATE or DELETE, even for the table owner / founder.
CREATE OR REPLACE FUNCTION public.hq_audit_logs_block_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only: % is not permitted', TG_OP;
END;
$$;

-- ============================================================================
-- 1. IDENTITY & ORGANIZATION
-- ============================================================================

CREATE TABLE public.hq_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid NOT NULL UNIQUE,
    role text NOT NULL DEFAULT 'founder'
        CHECK (role IN ('founder', 'admin', 'viewer')),
    is_founder boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    last_sign_in_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.hq_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hq_user_id uuid NOT NULL REFERENCES public.hq_users (id) ON DELETE CASCADE,
    auth_session_id uuid,
    started_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    slug text NOT NULL UNIQUE,
    description text,
    -- Lead agent for the division. FK added after ai_agents exists (see below).
    lead_agent_id uuid,
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.department_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id uuid NOT NULL REFERENCES public.departments (id) ON DELETE CASCADE,
    -- Member agent. FK added after ai_agents exists (see below).
    agent_id uuid NOT NULL,
    hq_user_id uuid REFERENCES public.hq_users (id) ON DELETE SET NULL,
    member_role text,
    joined_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT department_members_unique_agent UNIQUE (department_id, agent_id)
);

-- Single-row settings table. The singleton key enforces exactly one row:
-- singleton is always 'hq' and unique, so a second row cannot be inserted.
CREATE TABLE public.organization_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    singleton text NOT NULL DEFAULT 'hq' UNIQUE CHECK (singleton = 'hq'),
    timezone text NOT NULL DEFAULT 'Asia/Jakarta',
    language text NOT NULL DEFAULT 'id',
    maintenance_mode boolean NOT NULL DEFAULT false,
    daily_briefing_enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. AI AGENT MANAGEMENT
-- ============================================================================

CREATE TABLE public.ai_agents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    division text NOT NULL CHECK (division IN (
        'Digital Product & Engineering',
        'Academic & Curriculum',
        'Marketing & Creative',
        'Community & Partnership',
        'UI/UX & Product Research',
        'AI Innovation & Research',
        'Quality Assurance & Security',
        'Growth & Data Analytics',
        'Customer Success & Helpdesk',
        'Operations & Governance',
        'Film Festival & Event',
        'Talent & Mentor Development',
        'Research & Industry Relations'
    )),
    role text,
    job_description text,
    status agent_status NOT NULL DEFAULT 'offline',
    model text,
    token_usage bigint NOT NULL DEFAULT 0,
    cost numeric NOT NULL DEFAULT 0,
    department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL,
    last_active_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.agent_skills (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id uuid NOT NULL REFERENCES public.ai_agents (id) ON DELETE CASCADE,
    skill_name text NOT NULL,
    skill_level text CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT agent_skills_unique_skill UNIQUE (agent_id, skill_name)
);

CREATE TABLE public.agent_tools (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id uuid NOT NULL REFERENCES public.ai_agents (id) ON DELETE CASCADE,
    tool_name text NOT NULL,
    tool_type text,
    configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT agent_tools_unique_tool UNIQUE (agent_id, tool_name)
);

CREATE TABLE public.agent_models (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id uuid NOT NULL REFERENCES public.ai_agents (id) ON DELETE CASCADE,
    provider text,
    model_name text NOT NULL,
    is_default boolean NOT NULL DEFAULT false,
    max_tokens integer,
    temperature numeric,
    configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.agent_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id uuid NOT NULL REFERENCES public.ai_agents (id) ON DELETE CASCADE,
    -- Task FK added after tasks exists (see below).
    task_id uuid,
    department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL,
    assignment_role text,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    unassigned_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Execution log: append-only record, no updated_at.
CREATE TABLE public.agent_execution_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id uuid NOT NULL REFERENCES public.ai_agents (id) ON DELETE CASCADE,
    -- task_id and workflow_run_id FKs added after those tables exist (see below).
    task_id uuid,
    workflow_run_id uuid,
    action text,
    status text,
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    duration_ms integer,
    tokens_used integer,
    cost numeric NOT NULL DEFAULT 0,
    error_message text,
    log_detail jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. TASK MANAGEMENT
-- ============================================================================

CREATE TABLE public.tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    objective text,
    description text,
    department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL,
    priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status task_status NOT NULL DEFAULT 'backlog',
    deadline timestamptz,
    acceptance_criteria text,
    drive_link text,
    owner_agent_id uuid REFERENCES public.ai_agents (id) ON DELETE SET NULL,
    created_by uuid,
    estimated_hours numeric,
    actual_hours numeric,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.task_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
    agent_id uuid REFERENCES public.ai_agents (id) ON DELETE SET NULL,
    hq_user_id uuid REFERENCES public.hq_users (id) ON DELETE SET NULL,
    assignment_role text,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    unassigned_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT task_assignments_unique_agent UNIQUE (task_id, agent_id)
);

CREATE TABLE public.task_dependencies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
    depends_on_task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
    dependency_type text CHECK (dependency_type IN ('blocks', 'blocked_by', 'related')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT task_dependencies_unique_pair UNIQUE (task_id, depends_on_task_id),
    CONSTRAINT task_dependencies_no_self_ref CHECK (task_id <> depends_on_task_id)
);

CREATE TABLE public.task_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
    author_agent_id uuid REFERENCES public.ai_agents (id) ON DELETE SET NULL,
    author_user_id uuid REFERENCES public.hq_users (id) ON DELETE SET NULL,
    comment_text text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Task event log: append-only record, no updated_at.
CREATE TABLE public.task_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
    agent_id uuid REFERENCES public.ai_agents (id) ON DELETE SET NULL,
    event_type text NOT NULL,
    old_status task_status,
    new_status task_status,
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.task_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
    file_name text NOT NULL,
    file_type text,
    file_size_bytes bigint,
    drive_file_id text,
    drive_link text,
    uploaded_by_agent_id uuid REFERENCES public.ai_agents (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. WORKFLOW & AUTOMATION
-- ============================================================================

CREATE TABLE public.workflows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL,
    trigger_type text,
    is_active boolean NOT NULL DEFAULT true,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.workflow_steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id uuid NOT NULL REFERENCES public.workflows (id) ON DELETE CASCADE,
    step_order integer NOT NULL,
    step_name text NOT NULL,
    step_type text,
    agent_id uuid REFERENCES public.ai_agents (id) ON DELETE SET NULL,
    configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT workflow_steps_unique_order UNIQUE (workflow_id, step_order)
);

CREATE TABLE public.workflow_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id uuid NOT NULL REFERENCES public.workflows (id) ON DELETE CASCADE,
    task_id uuid REFERENCES public.tasks (id) ON DELETE SET NULL,
    status job_status NOT NULL DEFAULT 'pending',
    started_at timestamptz,
    finished_at timestamptz,
    triggered_by text,
    result_summary text,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.automation_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    trigger_event text NOT NULL,
    condition jsonb NOT NULL DEFAULT '{}'::jsonb,
    action jsonb NOT NULL DEFAULT '{}'::jsonb,
    workflow_id uuid REFERENCES public.workflows (id) ON DELETE SET NULL,
    is_enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.scheduled_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    cron_expression text NOT NULL,
    job_type text,
    description text,
    enabled boolean NOT NULL DEFAULT true,
    last_run_at timestamptz,
    next_run_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Job execution log: append-only record, no updated_at.
CREATE TABLE public.job_execution_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_job_id uuid NOT NULL REFERENCES public.scheduled_jobs (id) ON DELETE CASCADE,
    status job_status NOT NULL DEFAULT 'pending',
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    duration_ms integer,
    output_summary text,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. APPROVAL MANAGEMENT
-- ============================================================================

CREATE TABLE public.approval_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action_name text NOT NULL,
    requesting_agent_id uuid REFERENCES public.ai_agents (id) ON DELETE SET NULL,
    level approval_level NOT NULL,
    reason text,
    target text,
    impact text,
    risk text,
    cost numeric,
    status approval_status NOT NULL DEFAULT 'pending',
    -- Otorisasi khusus per kejadian untuk Level 3. Hanya Founder yang boleh
    -- menyetelnya true, lewat jalur khusus, dan setiap penyetelan tercatat
    -- di audit_logs. Default false: tanpa flag ini Level 3 tidak bisa di-approve.
    special_authorization boolean NOT NULL DEFAULT false,
    decided_at timestamptz,
    decided_by uuid,
    task_id uuid REFERENCES public.tasks (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Approval decision record: append-only, no updated_at.
CREATE TABLE public.approval_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_request_id uuid NOT NULL REFERENCES public.approval_requests (id) ON DELETE CASCADE,
    action text CHECK (action IN ('approve', 'reject')),
    actor uuid,
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.approval_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    level approval_level NOT NULL UNIQUE,
    description text,
    requires_founder boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 6. REPORTING & ANALYTICS
-- ============================================================================

CREATE TABLE public.reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type report_type NOT NULL,
    title text NOT NULL,
    period_start timestamptz,
    period_end timestamptz,
    generated_by_agent_id uuid REFERENCES public.ai_agents (id) ON DELETE SET NULL,
    department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL,
    summary text,
    drive_link text,
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.report_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id uuid NOT NULL REFERENCES public.reports (id) ON DELETE CASCADE,
    item_type text,
    title text,
    content text,
    metric_value numeric,
    metric_unit text,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.department_kpis (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id uuid NOT NULL REFERENCES public.departments (id) ON DELETE CASCADE,
    kpi_name text NOT NULL,
    kpi_value numeric,
    kpi_unit text,
    target_value numeric,
    period_start date,
    period_end date,
    measured_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT department_kpis_unique_period UNIQUE (department_id, kpi_name, period_start)
);

-- Periodic snapshot: append-only record, no updated_at.
CREATE TABLE public.performance_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date date NOT NULL UNIQUE,
    total_tasks integer NOT NULL DEFAULT 0,
    completed_tasks integer NOT NULL DEFAULT 0,
    active_agents integer NOT NULL DEFAULT 0,
    total_token_usage bigint NOT NULL DEFAULT 0,
    total_cost numeric NOT NULL DEFAULT 0,
    snapshot_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Founder auth UID (plain uuid; no FK into auth.users).
    user_id uuid NOT NULL,
    title text NOT NULL,
    body text,
    notification_type text,
    related_entity text,
    related_entity_id uuid,
    is_read boolean NOT NULL DEFAULT false,
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 7. GOOGLE DRIVE & ARCHIVE
-- ============================================================================

CREATE TABLE public.drive_folders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_name text NOT NULL,
    drive_folder_id text UNIQUE,
    parent_folder_id uuid REFERENCES public.drive_folders (id) ON DELETE SET NULL,
    department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL,
    folder_path text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.drive_archives (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    archive_name text NOT NULL,
    drive_folder_id uuid REFERENCES public.drive_folders (id) ON DELETE SET NULL,
    archive_type text,
    archived_at timestamptz NOT NULL DEFAULT now(),
    archived_by_agent_id uuid REFERENCES public.ai_agents (id) ON DELETE SET NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.deliverables (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    task_id uuid REFERENCES public.tasks (id) ON DELETE SET NULL,
    department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL,
    owner_agent_id uuid REFERENCES public.ai_agents (id) ON DELETE SET NULL,
    drive_link text,
    drive_file_id text,
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'in_review', 'approved', 'published', 'archived')),
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Deliverable version record: append-only, no updated_at.
CREATE TABLE public.deliverable_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deliverable_id uuid NOT NULL REFERENCES public.deliverables (id) ON DELETE CASCADE,
    version_number integer NOT NULL,
    drive_file_id text,
    drive_link text,
    change_note text,
    created_by_agent_id uuid REFERENCES public.ai_agents (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT deliverable_versions_unique_version UNIQUE (deliverable_id, version_number)
);

-- Drive sync log: append-only record, no updated_at.
CREATE TABLE public.drive_sync_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_folder_id uuid REFERENCES public.drive_folders (id) ON DELETE SET NULL,
    sync_status sync_status NOT NULL DEFAULT 'pending',
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    files_synced integer NOT NULL DEFAULT 0,
    files_failed integer NOT NULL DEFAULT 0,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.master_drive_index (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    indexed_path text NOT NULL UNIQUE,
    drive_file_id text,
    drive_folder_id uuid REFERENCES public.drive_folders (id) ON DELETE SET NULL,
    item_type text CHECK (item_type IN ('folder', 'file')),
    title text,
    indexed_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 8. AI PROVIDER & SECURITY
-- ============================================================================

-- NOTE: no credential columns in this table (no API keys, no secrets).
-- Provider credentials live only in Supabase Vault / Edge Function secrets.
CREATE TABLE public.ai_providers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name text NOT NULL UNIQUE,
    base_url text,
    is_enabled boolean NOT NULL DEFAULT true,
    is_free_tier boolean NOT NULL DEFAULT true,
    monthly_cost numeric NOT NULL DEFAULT 0,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_model_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL REFERENCES public.ai_providers (id) ON DELETE CASCADE,
    model_name text NOT NULL,
    is_default boolean NOT NULL DEFAULT false,
    max_tokens integer,
    context_window integer,
    cost_per_1k_tokens numeric,
    configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ai_model_configs_unique_model UNIQUE (provider_id, model_name)
);

-- Usage log: token counts and cost ONLY. Never store prompt text or any
-- personal data in this table.
CREATE TABLE public.ai_usage_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text,
    model text,
    prompt_tokens integer,
    completion_tokens integer,
    cost numeric,
    agent_id uuid REFERENCES public.ai_agents (id) ON DELETE SET NULL,
    task_id uuid REFERENCES public.tasks (id) ON DELETE SET NULL,
    called_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- NOTE: no credential columns in this table (no tokens, no secrets).
-- Integration credentials live only in Supabase Vault / Edge Function secrets.
CREATE TABLE public.system_integrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_name text NOT NULL UNIQUE,
    integration_type text,
    status text NOT NULL DEFAULT 'disconnected'
        CHECK (status IN ('connected', 'disconnected', 'error', 'disabled')),
    last_sync_at timestamptz,
    configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- APPEND-ONLY audit log. See RLS section below: SELECT for the Founder only,
-- INSERT only via service_role (Edge Functions with the service key); there
-- is NO update policy and NO delete policy for any role, and the trigger
-- below raises an exception on any UPDATE or DELETE as a second layer.
CREATE TABLE public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor text,
    action text NOT NULL,
    entity text,
    entity_id uuid,
    detail jsonb,
    ip_address text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- System health log: append-only record, no updated_at.
CREATE TABLE public.system_health_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name text NOT NULL,
    status text CHECK (status IN ('healthy', 'degraded', 'down')),
    checked_at timestamptz NOT NULL DEFAULT now(),
    response_time_ms integer,
    detail jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Backup log: append-only record, no updated_at.
CREATE TABLE public.backup_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type text NOT NULL,
    backup_location text,
    file_size_bytes bigint,
    status sync_status NOT NULL DEFAULT 'pending',
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    sha256_checksum text,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- FORWARD FOREIGN KEYS (tables referenced before they were created)
-- ----------------------------------------------------------------------------

ALTER TABLE public.departments
    ADD CONSTRAINT departments_lead_agent_fk
    FOREIGN KEY (lead_agent_id) REFERENCES public.ai_agents (id) ON DELETE SET NULL;

ALTER TABLE public.department_members
    ADD CONSTRAINT department_members_agent_fk
    FOREIGN KEY (agent_id) REFERENCES public.ai_agents (id) ON DELETE CASCADE;

ALTER TABLE public.agent_assignments
    ADD CONSTRAINT agent_assignments_task_fk
    FOREIGN KEY (task_id) REFERENCES public.tasks (id) ON DELETE CASCADE;

ALTER TABLE public.agent_execution_logs
    ADD CONSTRAINT agent_execution_logs_task_fk
    FOREIGN KEY (task_id) REFERENCES public.tasks (id) ON DELETE SET NULL;

ALTER TABLE public.agent_execution_logs
    ADD CONSTRAINT agent_execution_logs_workflow_run_fk
    FOREIGN KEY (workflow_run_id) REFERENCES public.workflow_runs (id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------------------

-- Required indexes.
CREATE INDEX tasks_status_department_idx ON public.tasks (status, department_id);
CREATE INDEX tasks_deadline_idx ON public.tasks (deadline);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at);
CREATE INDEX ai_usage_logs_called_at_idx ON public.ai_usage_logs (called_at);
CREATE INDEX job_execution_logs_job_started_idx ON public.job_execution_logs (scheduled_job_id, started_at);
CREATE INDEX notifications_user_read_idx ON public.notifications (user_id, is_read);

-- Additional sensible indexes.
CREATE INDEX ai_agents_status_idx ON public.ai_agents (status);
CREATE INDEX ai_agents_division_idx ON public.ai_agents (division);
CREATE INDEX tasks_owner_agent_idx ON public.tasks (owner_agent_id);
CREATE INDEX approval_requests_status_idx ON public.approval_requests (status);
CREATE INDEX approval_requests_level_idx ON public.approval_requests (level);
CREATE INDEX agent_execution_logs_agent_idx ON public.agent_execution_logs (agent_id, created_at);
CREATE INDEX task_logs_task_idx ON public.task_logs (task_id, created_at);
CREATE INDEX workflow_runs_workflow_idx ON public.workflow_runs (workflow_id, created_at);
CREATE INDEX reports_type_idx ON public.reports (report_type, created_at);
CREATE INDEX department_kpis_department_idx ON public.department_kpis (department_id, measured_at);
CREATE INDEX deliverables_task_idx ON public.deliverables (task_id);
CREATE INDEX drive_sync_logs_folder_idx ON public.drive_sync_logs (drive_folder_id, started_at);
CREATE INDEX system_health_logs_service_idx ON public.system_health_logs (service_name, checked_at);
CREATE INDEX backup_logs_started_idx ON public.backup_logs (started_at);

-- ----------------------------------------------------------------------------
-- updated_at TRIGGERS (mutable tables only; log / snapshot / version /
-- append-only tables have no updated_at column and no trigger)
-- ----------------------------------------------------------------------------

CREATE TRIGGER trg_hq_users_updated_at
    BEFORE UPDATE ON public.hq_users
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_hq_sessions_updated_at
    BEFORE UPDATE ON public.hq_sessions
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_department_members_updated_at
    BEFORE UPDATE ON public.department_members
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_organization_settings_updated_at
    BEFORE UPDATE ON public.organization_settings
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_ai_agents_updated_at
    BEFORE UPDATE ON public.ai_agents
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_agent_skills_updated_at
    BEFORE UPDATE ON public.agent_skills
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_agent_tools_updated_at
    BEFORE UPDATE ON public.agent_tools
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_agent_models_updated_at
    BEFORE UPDATE ON public.agent_models
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_agent_assignments_updated_at
    BEFORE UPDATE ON public.agent_assignments
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_task_assignments_updated_at
    BEFORE UPDATE ON public.task_assignments
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_task_dependencies_updated_at
    BEFORE UPDATE ON public.task_dependencies
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_task_comments_updated_at
    BEFORE UPDATE ON public.task_comments
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_task_attachments_updated_at
    BEFORE UPDATE ON public.task_attachments
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_workflows_updated_at
    BEFORE UPDATE ON public.workflows
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_workflow_steps_updated_at
    BEFORE UPDATE ON public.workflow_steps
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_workflow_runs_updated_at
    BEFORE UPDATE ON public.workflow_runs
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_automation_rules_updated_at
    BEFORE UPDATE ON public.automation_rules
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_scheduled_jobs_updated_at
    BEFORE UPDATE ON public.scheduled_jobs
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_approval_requests_updated_at
    BEFORE UPDATE ON public.approval_requests
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_approval_policies_updated_at
    BEFORE UPDATE ON public.approval_policies
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_report_items_updated_at
    BEFORE UPDATE ON public.report_items
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_department_kpis_updated_at
    BEFORE UPDATE ON public.department_kpis
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_drive_folders_updated_at
    BEFORE UPDATE ON public.drive_folders
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_drive_archives_updated_at
    BEFORE UPDATE ON public.drive_archives
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_deliverables_updated_at
    BEFORE UPDATE ON public.deliverables
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_master_drive_index_updated_at
    BEFORE UPDATE ON public.master_drive_index
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_ai_providers_updated_at
    BEFORE UPDATE ON public.ai_providers
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_ai_model_configs_updated_at
    BEFORE UPDATE ON public.ai_model_configs
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();
CREATE TRIGGER trg_system_integrations_updated_at
    BEFORE UPDATE ON public.system_integrations
    FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();

-- Append-only enforcement for audit_logs (second layer; no update/delete
-- policy exists either — see RLS section below).
CREATE TRIGGER trg_audit_logs_append_only
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.hq_audit_logs_block_write();

-- ============================================================================
-- ROW LEVEL SECURITY — STRICT, DENY-ALL BY DEFAULT
-- ============================================================================
-- Every table has RLS enabled. No policy grants anything to anon.
-- The only client access is the Founder UID below. The placeholder
-- '00000000-0000-0000-0000-000000000000' MUST be replaced at deploy time
-- with the real Founder UID from the HQ Supabase project Auth users.
-- audit_logs is hardened further: SELECT for the Founder only, INSERT only
-- via service_role (Edge Functions with the service key), and NO update or
-- delete policy for any role, including the Founder.

ALTER TABLE public.hq_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverable_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_drive_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

-- Founder full-access policies: one per table (audit_logs excepted, below).
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY hq_users_founder_all ON public.hq_users FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY hq_sessions_founder_all ON public.hq_sessions FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY departments_founder_all ON public.departments FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY department_members_founder_all ON public.department_members FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY organization_settings_founder_all ON public.organization_settings FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY ai_agents_founder_all ON public.ai_agents FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY agent_skills_founder_all ON public.agent_skills FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY agent_tools_founder_all ON public.agent_tools FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY agent_models_founder_all ON public.agent_models FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY agent_assignments_founder_all ON public.agent_assignments FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY agent_execution_logs_founder_all ON public.agent_execution_logs FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY tasks_founder_all ON public.tasks FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY task_assignments_founder_all ON public.task_assignments FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY task_dependencies_founder_all ON public.task_dependencies FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY task_comments_founder_all ON public.task_comments FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY task_logs_founder_all ON public.task_logs FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY task_attachments_founder_all ON public.task_attachments FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY workflows_founder_all ON public.workflows FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY workflow_steps_founder_all ON public.workflow_steps FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY workflow_runs_founder_all ON public.workflow_runs FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY automation_rules_founder_all ON public.automation_rules FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY scheduled_jobs_founder_all ON public.scheduled_jobs FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY job_execution_logs_founder_all ON public.job_execution_logs FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY approval_requests_founder_all ON public.approval_requests FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY approval_actions_founder_all ON public.approval_actions FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY approval_policies_founder_all ON public.approval_policies FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY reports_founder_all ON public.reports FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY report_items_founder_all ON public.report_items FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY department_kpis_founder_all ON public.department_kpis FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY performance_snapshots_founder_all ON public.performance_snapshots FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY notifications_founder_all ON public.notifications FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY drive_folders_founder_all ON public.drive_folders FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY drive_archives_founder_all ON public.drive_archives FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY deliverables_founder_all ON public.deliverables FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY deliverable_versions_founder_all ON public.deliverable_versions FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY drive_sync_logs_founder_all ON public.drive_sync_logs FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY master_drive_index_founder_all ON public.master_drive_index FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY ai_providers_founder_all ON public.ai_providers FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY ai_model_configs_founder_all ON public.ai_model_configs FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY ai_usage_logs_founder_all ON public.ai_usage_logs FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY system_integrations_founder_all ON public.system_integrations FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY system_health_logs_founder_all ON public.system_health_logs FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY backup_logs_founder_all ON public.backup_logs FOR ALL TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);

-- audit_logs hardening (no FOR ALL policy, no UPDATE policy, no DELETE policy
-- for any role, including the Founder):
--   * SELECT: Founder UID only.
--   * INSERT: service_role only. NOTE: in Supabase, service_role BYPASSES
--     RLS entirely, so inserts must go through Edge Functions using the
--     service key; no client insert policy exists. This policy is declared
--     explicitly for defence-in-depth / documentation and does not grant
--     any client role insert access.
-- TODO (deploy): replace with the Founder UID from the HQ Supabase project Auth users
CREATE POLICY audit_logs_founder_select ON public.audit_logs FOR SELECT TO authenticated
    USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
CREATE POLICY audit_logs_service_insert ON public.audit_logs FOR INSERT TO service_role
    WITH CHECK (true);

-- ============================================================================
-- SEED DATA — REFERENCE DATA ONLY (no activity data)
-- ============================================================================

-- 13 divisions (departments).
INSERT INTO public.departments (name, slug, description, sort_order) VALUES
    ('Digital Product & Engineering', 'digital-product-engineering', 'Product engineering and platform development.', 1),
    ('Academic & Curriculum', 'academic-curriculum', 'Curriculum, courses, and academic content.', 2),
    ('Marketing & Creative', 'marketing-creative', 'Marketing, branding, and creative production.', 3),
    ('Community & Partnership', 'community-partnership', 'Community engagement and partnerships.', 4),
    ('UI/UX & Product Research', 'ui-ux-product-research', 'Product research, UX design, and usability.', 5),
    ('AI Innovation & Research', 'ai-innovation-research', 'AI research, experimentation, and innovation.', 6),
    ('Quality Assurance & Security', 'quality-assurance-security', 'Quality assurance, testing, and security.', 7),
    ('Growth & Data Analytics', 'growth-data-analytics', 'Growth strategy and data analytics.', 8),
    ('Customer Success & Helpdesk', 'customer-success-helpdesk', 'Customer success and helpdesk operations.', 9),
    ('Operations & Governance', 'operations-governance', 'Operations, governance, and administration.', 10),
    ('Film Festival & Event', 'film-festival-event', 'Film festivals and events.', 11),
    ('Talent & Mentor Development', 'talent-mentor-development', 'Talent and mentor development.', 12),
    ('Research & Industry Relations', 'research-industry-relations', 'Industry research and relations.', 13)
ON CONFLICT (name) DO NOTHING;

-- 3 approval policy levels.
INSERT INTO public.approval_policies (level, description, requires_founder) VALUES
    ('level_1', 'Level 1 — routine work runs automatically and is logged.', false),
    ('level_2', 'Level 2 — needs Founder approval before execution.', true),
    ('level_3', 'Level 3 — prohibited without special authorization per case.', true)
ON CONFLICT (level) DO NOTHING;

-- 6 scheduled jobs (approved HQ schedule).
-- Cron expressions are written in Asia/Jakarta local time.
-- NOTE: pg_cron availability on the free tier must be verified at Foundation;
-- these rows are the schedule of record, and the actual scheduler (pg_cron
-- or an external scheduler) must be confirmed before relying on them.
INSERT INTO public.scheduled_jobs (name, cron_expression, job_type, description, enabled) VALUES
    ('System Check', '45 7 * * *', 'system_check', 'Daily system check at 07:45 WIB.', true),
    ('Morning Briefing', '0 8 * * *', 'morning_briefing', 'Daily morning briefing at 08:00 WIB.', true),
    ('Midday Progress Report', '0 12 * * *', 'midday_report', 'Daily midday progress report at 12:00 WIB.', true),
    ('End-of-Day Report', '0 17 * * *', 'end_of_day_report', 'Daily end-of-day report at 17:00 WIB.', true),
    ('Weekly Executive Report', '0 17 * * 5', 'weekly_executive_report', 'Weekly executive report, Fridays at 17:00 WIB.', true),
    ('Monthly Performance Report', '0 9 1 * *', 'monthly_performance_report', 'Monthly performance report on the 1st at 09:00 WIB.', true)
ON CONFLICT (name) DO NOTHING;

-- End of migration 001.
