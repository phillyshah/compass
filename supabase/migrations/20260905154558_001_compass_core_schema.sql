/*
# Project Compass - Core Database Schema

## Overview
Creates the foundational schema for Project Compass, an internship discovery and intelligence platform for college students.

## New Tables
1. **universities** - University entities with branding and domain info
2. **employers** - Company/employer profiles with industry, size, location
3. **employer_locations** - Office locations for employers
4. **internships** - Internship postings with full metadata, deadlines, compensation
5. **job_source_records** - Provenance records for internship postings (multi-source)
6. **sources** - Generic source records for events and data (news, press releases, etc.)
7. **student_profiles** - Student-specific profile data (graduation, major, preferences)
8. **student_preferences** - Student preference signals (industries, roles, locations)
9. **resumes** - Resume file metadata and parsed data
10. **contacts** - Networking contacts per student (must come before applications due to FK)
11. **company_targets** - Student's tracked companies with priority and status
12. **internship_targets** - Student's saved internships
13. **applications** - Application pipeline tracking (references contacts)
14. **company_events** - Company intelligence events
15. **student_event_relevance** - Per-student relevance scoring of events
16. **recommendations** - AI-generated action recommendations
17. **notifications** - User notifications
18. **audit_logs** - Audit trail for platform actions

## Enums
- user_role, target_priority, company_target_status, application_status
- confidence_label, verification_status, event_relevance, event_type

## Security
- RLS enabled on ALL tables
- Student-owned tables: owner-scoped CRUD via auth.uid()
- Public reference tables (employers, internships, etc.): readable by all authenticated users
- All policies use auth.uid() for ownership checks

## Notes
1. Users table is Supabase auth.users (built-in) - no custom users table needed
2. All student-owned tables use student_id which maps to auth.uid()
3. Reference data (employers, internships, events) is shared across all authenticated users
4. UUID primary keys throughout
*/

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('STUDENT','UNIVERSITY_ADMIN','EMPLOYER_ADMIN','PLATFORM_ADMIN','PLATFORM_ANALYST');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE target_priority AS ENUM ('DREAM','HIGH','MEDIUM','LOW');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE company_target_status AS ENUM ('DISCOVERED','WATCHING','RESEARCHING','OUTREACH','ACTIVE_OPPORTUNITY','PAUSED','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('SAVED','PREPARING','APPLIED','ASSESSMENT','INTERVIEW','FINAL_INTERVIEW','OFFER','ACCEPTED','REJECTED','WITHDRAWN','EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE confidence_label AS ENUM ('CONFIRMED','ESTIMATED','SUGGESTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('VERIFIED','OBSERVED','INFERRED','USER_REPORTED','STALE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE event_relevance AS ENUM ('CRITICAL','HIGH','MEDIUM','BACKGROUND','IRRELEVANT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE event_type AS ENUM ('FUNDING','M_AND_A','PRODUCT_LAUNCH','PARTNERSHIP','EXECUTIVE_CHANGE','EXPANSION','EARNINGS','STRATEGY','LAYOFF','HIRING_EXPANSION','REGULATORY','RECRUITING_EVENT','INTERNSHIP_OPENED','INTERNSHIP_UPDATED','INTERNSHIP_CLOSED','OTHER_MATERIAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- UNIVERSITIES
-- ============================================

CREATE TABLE IF NOT EXISTS universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text,
  slug text UNIQUE,
  logo_url text,
  branding_json jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE universities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_universities" ON universities;
CREATE POLICY "authenticated_read_universities" ON universities FOR SELECT
  TO authenticated USING (true);

-- ============================================
-- EMPLOYERS
-- ============================================

CREATE TABLE IF NOT EXISTS employers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  canonical_name text,
  domain text,
  website_url text,
  logo_url text,
  industry text,
  subindustry text,
  size_band text,
  hq_location text,
  description text,
  verified boolean DEFAULT false,
  verification_source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_employers" ON employers;
CREATE POLICY "authenticated_read_employers" ON employers FOR SELECT
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_employers_canonical_name ON employers (canonical_name);
CREATE INDEX IF NOT EXISTS idx_employers_industry ON employers (industry);

-- ============================================
-- EMPLOYER LOCATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS employer_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  city text,
  region text,
  country text,
  is_hq boolean DEFAULT false
);

ALTER TABLE employer_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_employer_locations" ON employer_locations;
CREATE POLICY "authenticated_read_employer_locations" ON employer_locations FOR SELECT
  TO authenticated USING (true);

-- ============================================
-- INTERNSHIPS
-- ============================================

CREATE TABLE IF NOT EXISTS internships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  title text NOT NULL,
  normalized_title text,
  role_family text,
  description text,
  location_text text,
  city text,
  region text,
  country text,
  work_mode text,
  employment_type text DEFAULT 'INTERNSHIP',
  summer_year int,
  paid_status text,
  compensation_min numeric,
  compensation_max numeric,
  compensation_unit text,
  currency text DEFAULT 'USD',
  date_posted timestamptz,
  deadline timestamptz,
  deadline_type confidence_label,
  deadline_source_id uuid,
  eligibility_json jsonb DEFAULT '{}'::jsonb,
  apply_url text,
  canonical_url text,
  status text DEFAULT 'OPEN',
  first_seen_at timestamptz DEFAULT now(),
  last_verified_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE internships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_internships" ON internships;
CREATE POLICY "authenticated_read_internships" ON internships FOR SELECT
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_internships_employer ON internships (employer_id);
CREATE INDEX IF NOT EXISTS idx_internships_role_family ON internships (role_family);
CREATE INDEX IF NOT EXISTS idx_internships_status ON internships (status);
CREATE INDEX IF NOT EXISTS idx_internships_summer_year ON internships (summer_year);

-- ============================================
-- JOB SOURCE RECORDS
-- ============================================

CREATE TABLE IF NOT EXISTS job_source_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id uuid NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  external_id text,
  source_url text,
  raw_payload jsonb,
  content_hash text,
  observed_at timestamptz DEFAULT now(),
  last_checked_at timestamptz DEFAULT now(),
  verification_status verification_status DEFAULT 'OBSERVED',
  is_primary boolean DEFAULT false
);

ALTER TABLE job_source_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_job_sources" ON job_source_records;
CREATE POLICY "authenticated_read_job_sources" ON job_source_records FOR SELECT
  TO authenticated USING (true);

-- ============================================
-- SOURCES (generic, for events)
-- ============================================

CREATE TABLE IF NOT EXISTS sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  publisher text,
  title text,
  url text NOT NULL,
  published_at timestamptz,
  observed_at timestamptz DEFAULT now(),
  content_excerpt text,
  content_hash text,
  verification_status verification_status DEFAULT 'OBSERVED'
);

ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_sources" ON sources;
CREATE POLICY "authenticated_read_sources" ON sources FOR SELECT
  TO authenticated USING (true);

-- ============================================
-- STUDENT PROFILES
-- ============================================

CREATE TABLE IF NOT EXISTS student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  university_id uuid REFERENCES universities(id),
  graduation_year int,
  academic_year text,
  major text,
  minor text,
  gpa numeric,
  work_authorization text,
  requires_sponsorship boolean DEFAULT false,
  target_summer_year int,
  compensation_requirement text,
  remote_preference text,
  relocation_willing boolean DEFAULT false,
  profile_completion int DEFAULT 0,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_student_profile" ON student_profiles;
CREATE POLICY "select_own_student_profile" ON student_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_student_profile" ON student_profiles;
CREATE POLICY "insert_own_student_profile" ON student_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_student_profile" ON student_profiles;
CREATE POLICY "update_own_student_profile" ON student_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_student_profile" ON student_profiles;
CREATE POLICY "delete_own_student_profile" ON student_profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- STUDENT PREFERENCES
-- ============================================

CREATE TABLE IF NOT EXISTS student_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_type text NOT NULL,
  value text NOT NULL,
  weight numeric DEFAULT 1,
  is_hard_constraint boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE student_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_preferences" ON student_preferences;
CREATE POLICY "select_own_preferences" ON student_preferences FOR SELECT
  TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "insert_own_preferences" ON student_preferences;
CREATE POLICY "insert_own_preferences" ON student_preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "update_own_preferences" ON student_preferences;
CREATE POLICY "update_own_preferences" ON student_preferences FOR UPDATE
  TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "delete_own_preferences" ON student_preferences;
CREATE POLICY "delete_own_preferences" ON student_preferences FOR DELETE
  TO authenticated USING (auth.uid() = student_id);

-- ============================================
-- RESUMES
-- ============================================

CREATE TABLE IF NOT EXISTS resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text,
  original_filename text,
  mime_type text,
  parsed_json jsonb,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_resumes" ON resumes;
CREATE POLICY "select_own_resumes" ON resumes FOR SELECT
  TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "insert_own_resumes" ON resumes;
CREATE POLICY "insert_own_resumes" ON resumes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "update_own_resumes" ON resumes;
CREATE POLICY "update_own_resumes" ON resumes FOR UPDATE
  TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "delete_own_resumes" ON resumes;
CREATE POLICY "delete_own_resumes" ON resumes FOR DELETE
  TO authenticated USING (auth.uid() = student_id);

-- ============================================
-- CONTACTS (before applications - FK dependency)
-- ============================================

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employer_id uuid REFERENCES employers(id) ON DELETE SET NULL,
  name text NOT NULL,
  title text,
  email text,
  linkedin_url text,
  relationship_type text,
  university_connection text,
  source_type text,
  source_url text,
  last_contact_at timestamptz,
  next_followup_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_contacts" ON contacts;
CREATE POLICY "select_own_contacts" ON contacts FOR SELECT
  TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "insert_own_contacts" ON contacts;
CREATE POLICY "insert_own_contacts" ON contacts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "update_own_contacts" ON contacts;
CREATE POLICY "update_own_contacts" ON contacts FOR UPDATE
  TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "delete_own_contacts" ON contacts;
CREATE POLICY "delete_own_contacts" ON contacts FOR DELETE
  TO authenticated USING (auth.uid() = student_id);

-- ============================================
-- COMPANY TARGETS
-- ============================================

CREATE TABLE IF NOT EXISTS company_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employer_id uuid NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  priority target_priority DEFAULT 'MEDIUM',
  status company_target_status DEFAULT 'DISCOVERED',
  student_reason text,
  match_score numeric,
  monitoring_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, employer_id)
);

ALTER TABLE company_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_company_targets" ON company_targets;
CREATE POLICY "select_own_company_targets" ON company_targets FOR SELECT
  TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "insert_own_company_targets" ON company_targets;
CREATE POLICY "insert_own_company_targets" ON company_targets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "update_own_company_targets" ON company_targets;
CREATE POLICY "update_own_company_targets" ON company_targets FOR UPDATE
  TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "delete_own_company_targets" ON company_targets;
CREATE POLICY "delete_own_company_targets" ON company_targets FOR DELETE
  TO authenticated USING (auth.uid() = student_id);

-- ============================================
-- INTERNSHIP TARGETS
-- ============================================

CREATE TABLE IF NOT EXISTS internship_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  internship_id uuid NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  priority target_priority DEFAULT 'MEDIUM',
  match_score numeric,
  saved_at timestamptz DEFAULT now(),
  monitoring_enabled boolean DEFAULT true,
  UNIQUE(student_id, internship_id)
);

ALTER TABLE internship_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_internship_targets" ON internship_targets;
CREATE POLICY "select_own_internship_targets" ON internship_targets FOR SELECT
  TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "insert_own_internship_targets" ON internship_targets;
CREATE POLICY "insert_own_internship_targets" ON internship_targets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "update_own_internship_targets" ON internship_targets;
CREATE POLICY "update_own_internship_targets" ON internship_targets FOR UPDATE
  TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "delete_own_internship_targets" ON internship_targets;
CREATE POLICY "delete_own_internship_targets" ON internship_targets FOR DELETE
  TO authenticated USING (auth.uid() = student_id);

-- ============================================
-- APPLICATIONS (after contacts - FK dependency)
-- ============================================

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  internship_id uuid NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  status application_status DEFAULT 'SAVED',
  applied_at timestamptz,
  next_action text,
  next_action_at timestamptz,
  resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL,
  cover_letter_storage_path text,
  referral_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  interview_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_applications" ON applications;
CREATE POLICY "select_own_applications" ON applications FOR SELECT
  TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "insert_own_applications" ON applications;
CREATE POLICY "insert_own_applications" ON applications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "update_own_applications" ON applications;
CREATE POLICY "update_own_applications" ON applications FOR UPDATE
  TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "delete_own_applications" ON applications;
CREATE POLICY "delete_own_applications" ON applications FOR DELETE
  TO authenticated USING (auth.uid() = student_id);

-- ============================================
-- COMPANY EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS company_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  event_type event_type NOT NULL,
  headline text NOT NULL,
  summary text,
  event_date timestamptz,
  source_id uuid REFERENCES sources(id) ON DELETE SET NULL,
  content_hash text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE company_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_company_events" ON company_events;
CREATE POLICY "authenticated_read_company_events" ON company_events FOR SELECT
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_company_events_employer ON company_events (employer_id);
CREATE INDEX IF NOT EXISTS idx_company_events_date ON company_events (event_date);

-- ============================================
-- STUDENT EVENT RELEVANCE
-- ============================================

CREATE TABLE IF NOT EXISTS student_event_relevance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_event_id uuid NOT NULL REFERENCES company_events(id) ON DELETE CASCADE,
  company_target_id uuid REFERENCES company_targets(id) ON DELETE SET NULL,
  internship_id uuid REFERENCES internships(id) ON DELETE SET NULL,
  relevance event_relevance DEFAULT 'BACKGROUND',
  reason text,
  recommended_action text,
  action_type text,
  confidence numeric,
  model_version text,
  generated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, company_event_id)
);

ALTER TABLE student_event_relevance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_event_relevance" ON student_event_relevance;
CREATE POLICY "select_own_event_relevance" ON student_event_relevance FOR SELECT
  TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "insert_own_event_relevance" ON student_event_relevance;
CREATE POLICY "insert_own_event_relevance" ON student_event_relevance FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "update_own_event_relevance" ON student_event_relevance;
CREATE POLICY "update_own_event_relevance" ON student_event_relevance FOR UPDATE
  TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "delete_own_event_relevance" ON student_event_relevance;
CREATE POLICY "delete_own_event_relevance" ON student_event_relevance FOR DELETE
  TO authenticated USING (auth.uid() = student_id);

-- ============================================
-- RECOMMENDATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES employers(id) ON DELETE SET NULL,
  internship_id uuid REFERENCES internships(id) ON DELETE SET NULL,
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  recommendation_type text NOT NULL,
  priority_score numeric DEFAULT 50,
  reason text,
  action_text text,
  due_at timestamptz,
  confidence confidence_label DEFAULT 'SUGGESTED',
  evidence_refs jsonb DEFAULT '[]'::jsonb,
  model_version text,
  prompt_version text,
  generated_at timestamptz DEFAULT now(),
  dismissed_at timestamptz,
  dismissed_reason text,
  completed_at timestamptz,
  snoozed_until timestamptz
);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_recommendations" ON recommendations;
CREATE POLICY "select_own_recommendations" ON recommendations FOR SELECT
  TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "insert_own_recommendations" ON recommendations;
CREATE POLICY "insert_own_recommendations" ON recommendations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "update_own_recommendations" ON recommendations;
CREATE POLICY "update_own_recommendations" ON recommendations FOR UPDATE
  TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "delete_own_recommendations" ON recommendations;
CREATE POLICY "delete_own_recommendations" ON recommendations FOR DELETE
  TO authenticated USING (auth.uid() = student_id);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text,
  title text NOT NULL,
  body text,
  deep_link text,
  priority text DEFAULT 'NORMAL',
  sent_email_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- AUDIT LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_audit_logs" ON audit_logs;
CREATE POLICY "select_own_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (auth.uid() = actor_user_id);

DROP POLICY IF EXISTS "insert_own_audit_logs" ON audit_logs;
CREATE POLICY "insert_own_audit_logs" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = actor_user_id);
