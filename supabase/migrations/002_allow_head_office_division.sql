-- Migration 002 — SINEVERSE AI Headquarters
-- Allow 'Kantor Pusat' as a division on ai_agents.
-- Migration 001's CHECK only listed the 13 division names, but NARA (the
-- AI Executive Director) belongs to no division — it oversees all 13. Its
-- registry entry uses division 'Kantor Pusat', so the CHECK must accept it.
-- Applied live 26 Nov 2026.

ALTER TABLE public.ai_agents
  DROP CONSTRAINT ai_agents_division_check,
  ADD CONSTRAINT ai_agents_division_check CHECK (
    division = ANY (ARRAY[
      'Digital Product & Engineering'::text,
      'Academic & Curriculum'::text,
      'Marketing & Creative'::text,
      'Community & Partnership'::text,
      'UI/UX & Product Research'::text,
      'AI Innovation & Research'::text,
      'Quality Assurance & Security'::text,
      'Growth & Data Analytics'::text,
      'Customer Success & Helpdesk'::text,
      'Operations & Governance'::text,
      'Film Festival & Event'::text,
      'Talent & Mentor Development'::text,
      'Research & Industry Relations'::text,
      'Kantor Pusat'::text
    ])
  );
