export type TargetPriority = 'DREAM' | 'HIGH' | 'MEDIUM' | 'LOW';

export type CompanyTargetStatus =
  | 'DISCOVERED'
  | 'WATCHING'
  | 'RESEARCHING'
  | 'OUTREACH'
  | 'ACTIVE_OPPORTUNITY'
  | 'PAUSED'
  | 'CLOSED';

export type ApplicationStatus =
  | 'SAVED'
  | 'PREPARING'
  | 'APPLIED'
  | 'ASSESSMENT'
  | 'INTERVIEW'
  | 'FINAL_INTERVIEW'
  | 'OFFER'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED';

export type ConfidenceLabel = 'CONFIRMED' | 'ESTIMATED' | 'SUGGESTED';

export type EventRelevance = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'BACKGROUND' | 'IRRELEVANT';

export type EventType =
  | 'FUNDING'
  | 'M_AND_A'
  | 'PRODUCT_LAUNCH'
  | 'PARTNERSHIP'
  | 'EXECUTIVE_CHANGE'
  | 'EXPANSION'
  | 'EARNINGS'
  | 'STRATEGY'
  | 'LAYOFF'
  | 'HIRING_EXPANSION'
  | 'REGULATORY'
  | 'RECRUITING_EVENT'
  | 'INTERNSHIP_OPENED'
  | 'INTERNSHIP_UPDATED'
  | 'INTERNSHIP_CLOSED'
  | 'OTHER_MATERIAL';

export interface Employer {
  id: string;
  name: string;
  canonical_name: string | null;
  domain: string | null;
  website_url: string | null;
  logo_url: string | null;
  industry: string | null;
  subindustry: string | null;
  size_band: string | null;
  hq_location: string | null;
  description: string | null;
  verified: boolean;
}

export interface Internship {
  id: string;
  employer_id: string;
  title: string;
  normalized_title: string | null;
  role_family: string | null;
  description: string | null;
  location_text: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  work_mode: string | null;
  summer_year: number | null;
  paid_status: string | null;
  compensation_min: number | null;
  compensation_max: number | null;
  compensation_unit: string | null;
  date_posted: string | null;
  deadline: string | null;
  deadline_type: ConfidenceLabel | null;
  apply_url: string | null;
  status: string;
  employer?: Employer;
}

export interface CompanyTarget {
  id: string;
  student_id: string;
  employer_id: string;
  priority: TargetPriority;
  status: CompanyTargetStatus;
  student_reason: string | null;
  match_score: number | null;
  monitoring_enabled: boolean;
  created_at: string;
  updated_at: string;
  employer?: Employer;
}

export interface InternshipTarget {
  id: string;
  student_id: string;
  internship_id: string;
  priority: TargetPriority;
  match_score: number | null;
  saved_at: string;
  monitoring_enabled: boolean;
  internship?: Internship;
}

export interface Application {
  id: string;
  student_id: string;
  internship_id: string;
  status: ApplicationStatus;
  applied_at: string | null;
  next_action: string | null;
  next_action_at: string | null;
  notes: string | null;
  interview_at: string | null;
  created_at: string;
  updated_at: string;
  internship?: Internship;
}

export interface Contact {
  id: string;
  student_id: string;
  employer_id: string | null;
  name: string;
  title: string | null;
  email: string | null;
  linkedin_url: string | null;
  relationship_type: string | null;
  university_connection: string | null;
  source_type: string | null;
  source_url: string | null;
  last_contact_at: string | null;
  next_followup_at: string | null;
  notes: string | null;
  created_at: string;
  employer?: Employer;
}

export interface CompanyEvent {
  id: string;
  employer_id: string;
  event_type: EventType;
  headline: string;
  summary: string | null;
  event_date: string | null;
  source_id: string | null;
  created_at: string;
  employer?: Employer;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  university_id: string | null;
  graduation_year: number | null;
  academic_year: string | null;
  major: string | null;
  minor: string | null;
  gpa: number | null;
  work_authorization: string | null;
  requires_sponsorship: boolean;
  target_summer_year: number | null;
  compensation_requirement: string | null;
  remote_preference: string | null;
  relocation_willing: boolean;
  profile_completion: number;
  onboarding_completed: boolean;
}

export interface StudentPreference {
  id: string;
  student_id: string;
  preference_type: string;
  value: string;
  weight: number;
  is_hard_constraint: boolean;
}

export interface Recommendation {
  id: string;
  student_id: string;
  company_id: string | null;
  internship_id: string | null;
  application_id: string | null;
  recommendation_type: string;
  priority_score: number;
  reason: string | null;
  action_text: string | null;
  due_at: string | null;
  confidence: ConfidenceLabel;
  evidence_refs: any[];
  generated_at: string;
  dismissed_at: string | null;
  completed_at: string | null;
  snoozed_until: string | null;
  employer?: Employer;
  internship?: Internship;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string | null;
  title: string;
  body: string | null;
  deep_link: string | null;
  priority: string;
  read_at: string | null;
  created_at: string;
}

export interface Resume {
  id: string;
  student_id: string;
  storage_path: string | null;
  original_filename: string | null;
  mime_type: string | null;
  parsed_json: any;
  is_primary: boolean;
  label: string | null;
  created_at: string;
}

export interface University {
  id: string;
  name: string;
  domain: string | null;
  slug: string | null;
}
