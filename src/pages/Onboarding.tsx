import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Compass, ArrowRight, ArrowLeft, CheckCircle2, Plus, X } from 'lucide-react';
import type { University } from '@/types/database';

const ACADEMIC_YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Master\'s', 'PhD'];
const MAJORS = ['Computer Science', 'Economics', 'Business', 'Finance', 'Mechanical Engineering', 'Electrical Engineering', 'Mathematics', 'Statistics', 'Biology', 'Chemistry', 'Psychology', 'Political Science', 'Marketing', 'Accounting', 'Information Systems', 'Data Science', 'Other'];
const ROLE_FAMILIES = ['Engineering', 'Data Science', 'Product', 'Design', 'Finance', 'Consulting', 'Marketing', 'Operations', 'Accounting', 'Research', 'Sales', 'Other'];
const SUGGESTED_LOCATIONS = ['New York, NY', 'San Francisco, CA', 'Boston, MA', 'Chicago, IL', 'Seattle, WA', 'Los Angeles, CA', 'Austin, TX', 'Washington, DC', 'Atlanta, GA', 'Remote'];
const INDUSTRIES = ['Technology', 'Financial Services', 'Consulting', 'Healthcare', 'Consumer Goods', 'Media & Entertainment', 'E-Commerce', 'SaaS', 'Pharmaceuticals', 'Manufacturing', 'Retail', 'Other'];

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [major, setMajor] = useState('');
  const [gpa, setGpa] = useState('');
  const [workAuthorization, setWorkAuthorization] = useState('US_CITIZEN');
  const [requiresSponsorship, setRequiresSponsorship] = useState(false);
  const [targetSummerYear, setTargetSummerYear] = useState('2026');
  const [remotePref, setRemotePref] = useState('HYBRID');
  const [relocation, setRelocation] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [customLocation, setCustomLocation] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);

  const [universities, setUniversities] = useState<University[]>([]);

  useEffect(() => {
    supabase.from('universities').select('*').order('name').then(({ data }) => {
      if (data) setUniversities(data as University[]);
    });
  }, []);

  const toggle = (list: string[], value: string, setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const steps = ['Profile', 'Academics', 'Preferences', 'Targets'];
  const canProceed = () => {
    if (step === 0) return firstName.trim() && lastName.trim();
    if (step === 1) return academicYear && major && graduationYear;
    if (step === 2) return selectedRoles.length > 0;
    return true;
  };

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const completion = Math.min(100, 20 + selectedRoles.length * 5 + selectedLocations.length * 5 + selectedIndustries.length * 5 + (gpa ? 10 : 0) + 15);

    const { error: profileError } = await supabase.from('student_profiles').upsert({
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      university_id: universityId || null,
      graduation_year: parseInt(graduationYear) || null,
      academic_year: academicYear,
      major,
      gpa: gpa ? parseFloat(gpa) : null,
      work_authorization: workAuthorization,
      requires_sponsorship: requiresSponsorship,
      target_summer_year: parseInt(targetSummerYear),
      remote_preference: remotePref,
      relocation_willing: relocation,
      profile_completion: completion,
      onboarding_completed: true,
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    // Save preferences
    const prefs: { preference_type: string; value: string }[] = [];
    selectedRoles.forEach(r => prefs.push({ preference_type: 'role_family', value: r }));
    selectedLocations.forEach(l => prefs.push({ preference_type: 'location', value: l }));
    selectedIndustries.forEach(i => prefs.push({ preference_type: 'industry', value: i }));

    if (prefs.length > 0) {
      await supabase.from('student_preferences').upsert(
        prefs.map(p => ({ student_id: user.id, ...p })),
        { onConflict: 'student_id,preference_type,value' }
      );
    }

    await refreshProfile();
    setLoading(false);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-ink-900 text-xl">Compass</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-brand-500' : 'bg-ink-200'}`} />
            </div>
          ))}
        </div>

        <div className="card p-6 sm:p-8">
          <div className="text-sm text-ink-400 font-medium mb-1">Step {step + 1} of {steps.length}</div>
          <h1 className="text-2xl font-display font-bold text-ink-900 mb-6">{steps[step]}</h1>

          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">First name</label>
                  <input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Alex" />
                </div>
                <div>
                  <label className="label">Last name</label>
                  <input className="input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Chen" />
                </div>
              </div>
              <div>
                <label className="label">University</label>
                <select className="input" value={universityId} onChange={e => setUniversityId(e.target.value)}>
                  <option value="">Select your university</option>
                  {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Target summer year</label>
                <select className="input" value={targetSummerYear} onChange={e => setTargetSummerYear(e.target.value)}>
                  <option value="2026">Summer 2026</option>
                  <option value="2027">Summer 2027</option>
                </select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Academic year</label>
                  <select className="input" value={academicYear} onChange={e => setAcademicYear(e.target.value)}>
                    <option value="">Select year</option>
                    {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Graduation year</label>
                  <input className="input" type="number" value={graduationYear} onChange={e => setGraduationYear(e.target.value)} placeholder="2027" />
                </div>
              </div>
              <div>
                <label className="label">Major</label>
                <select className="input" value={major} onChange={e => setMajor(e.target.value)}>
                  <option value="">Select major</option>
                  {MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">GPA (optional)</label>
                <input className="input" type="number" step="0.01" min="0" max="4" value={gpa} onChange={e => setGpa(e.target.value)} placeholder="3.7" />
              </div>
              <div>
                <label className="label">Work authorization</label>
                <select className="input" value={workAuthorization} onChange={e => setWorkAuthorization(e.target.value)}>
                  <option value="US_CITIZEN">US Citizen / Permanent Resident</option>
                  <option value="F1_VISA">F-1 Student Visa</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={requiresSponsorship} onChange={e => setRequiresSponsorship(e.target.checked)} className="w-4 h-4 rounded accent-brand-600" />
                <span className="text-sm text-ink-700">I require visa sponsorship for employment</span>
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <label className="label">What roles are you targeting?</label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_FAMILIES.map(r => (
                    <button
                      key={r}
                      onClick={() => toggle(selectedRoles, r, setSelectedRoles)}
                      className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-all ${selectedRoles.includes(r) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-700 border-ink-200 hover:border-ink-300'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Preferred locations</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {SUGGESTED_LOCATIONS.map(l => (
                    <button
                      key={l}
                      onClick={() => toggle(selectedLocations, l, setSelectedLocations)}
                      className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-all ${selectedLocations.includes(l) ? 'bg-ocean-600 text-white border-ocean-600' : 'bg-white text-ink-700 border-ink-200 hover:border-ink-300'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                {selectedLocations.filter(l => !SUGGESTED_LOCATIONS.includes(l)).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedLocations.filter(l => !SUGGESTED_LOCATIONS.includes(l)).map(l => (
                      <span key={l} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-ocean-600 text-white">
                        {l}
                        <button onClick={() => setSelectedLocations(prev => prev.filter(v => v !== l))} className="hover:bg-ocean-700 rounded p-0.5">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    value={customLocation}
                    onChange={e => setCustomLocation(e.target.value)}
                    placeholder="Add your own location (e.g. Denver, CO)"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && customLocation.trim()) {
                        e.preventDefault();
                        if (!selectedLocations.includes(customLocation.trim())) {
                          setSelectedLocations(prev => [...prev, customLocation.trim()]);
                        }
                        setCustomLocation('');
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customLocation.trim() && !selectedLocations.includes(customLocation.trim())) {
                        setSelectedLocations(prev => [...prev, customLocation.trim()]);
                      }
                      setCustomLocation('');
                    }}
                    disabled={!customLocation.trim()}
                    className="btn-secondary shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Work mode preference</label>
                <div className="flex gap-2">
                  {[
                    { v: 'ONSITE', l: 'On-site' },
                    { v: 'HYBRID', l: 'Hybrid' },
                    { v: 'REMOTE', l: 'Remote' },
                  ].map(o => (
                    <button
                      key={o.v}
                      onClick={() => setRemotePref(o.v)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${remotePref === o.v ? 'bg-ink-900 text-white border-ink-900' : 'bg-white text-ink-700 border-ink-200 hover:border-ink-300'}`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={relocation} onChange={e => setRelocation(e.target.checked)} className="w-4 h-4 rounded accent-brand-600" />
                <span className="text-sm text-ink-700">I'm willing to relocate for the summer</span>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="label">Target industries</label>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map(i => (
                    <button
                      key={i}
                      onClick={() => toggle(selectedIndustries, i, setSelectedIndustries)}
                      className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-all ${selectedIndustries.includes(i) ? 'bg-accent-500 text-white border-accent-500' : 'bg-white text-ink-700 border-ink-200 hover:border-ink-300'}`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
              <div className="card bg-brand-50 border-brand-200 p-4 mt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-brand-900">You're all set!</div>
                    <p className="text-sm text-brand-700 mt-1">
                      Compass will use these preferences to match you with internships and generate your daily action plan. You can update these anytime in your Profile.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && <div className="text-sm text-danger-600 bg-danger-50 px-3 py-2 rounded-lg mt-4">{error}</div>}

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="btn-secondary"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            {step < steps.length - 1 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="btn-primary">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleFinish} disabled={loading} className="btn-primary">
                {loading ? 'Setting up...' : 'Start exploring'} <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
