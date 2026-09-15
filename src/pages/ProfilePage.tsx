import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { StudentProfile, University, StudentPreference, Resume } from '@/types/database';
import {
  CheckCircle2, User, GraduationCap, Sliders, Target,
  FileUp, Plus, X, Trash2, Star, FileText, Download,
} from 'lucide-react';

const ACADEMIC_YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Master\'s', 'PhD'];
const MAJORS = ['Computer Science', 'Economics', 'Business', 'Finance', 'Mechanical Engineering', 'Electrical Engineering', 'Mathematics', 'Statistics', 'Biology', 'Chemistry', 'Psychology', 'Political Science', 'Marketing', 'Accounting', 'Information Systems', 'Data Science', 'Other'];
const ROLE_FAMILIES = ['Engineering', 'Data Science', 'Product', 'Design', 'Finance', 'Consulting', 'Marketing', 'Operations', 'Accounting', 'Research', 'Sales', 'Other'];
const SUGGESTED_LOCATIONS = ['New York, NY', 'San Francisco, CA', 'Boston, MA', 'Chicago, IL', 'Seattle, WA', 'Los Angeles, CA', 'Austin, TX', 'Washington, DC', 'Atlanta, GA', 'Remote'];
const INDUSTRIES = ['Technology', 'Financial Services', 'Consulting', 'Healthcare', 'Consumer Goods', 'Media & Entertainment', 'E-Commerce', 'SaaS', 'Pharmaceuticals', 'Manufacturing', 'Retail', 'Other'];

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [universities, setUniversities] = useState<University[]>([]);

  const [form, setForm] = useState<Partial<StudentProfile>>({});
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [customLocation, setCustomLocation] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('universities').select('*').order('name').then(({ data }) => {
      if (data) setUniversities(data as University[]);
    });
  }, []);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase.from('student_preferences').select('*').eq('student_id', user.id).then(({ data }) => {
      if (data) {
        setSelectedRoles(data.filter(p => p.preference_type === 'role_family').map(p => p.value));
        setSelectedLocations(data.filter(p => p.preference_type === 'location').map(p => p.value));
        setSelectedIndustries(data.filter(p => p.preference_type === 'industry').map(p => p.value));
      }
    });
    loadResumes();
  }, [user]);

  const loadResumes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('resumes')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });
    setResumes((data as Resume[]) || []);
    setResumeLoading(false);
  };

  const toggle = (list: string[], value: string, setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const addCustomLocation = () => {
    const loc = customLocation.trim();
    if (loc && !selectedLocations.includes(loc)) {
      setSelectedLocations(prev => [...prev, loc]);
    }
    setCustomLocation('');
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);

    const completion = Math.min(100, 20 + selectedRoles.length * 5 + selectedLocations.length * 5 + selectedIndustries.length * 5 + (form.gpa ? 10 : 0) + (resumes.length > 0 ? 10 : 0) + 10);

    await supabase.from('student_profiles').upsert({
      user_id: user.id,
      first_name: form.first_name,
      last_name: form.last_name,
      university_id: form.university_id || null,
      graduation_year: form.graduation_year || null,
      academic_year: form.academic_year,
      major: form.major,
      gpa: form.gpa || null,
      work_authorization: form.work_authorization || 'US_CITIZEN',
      requires_sponsorship: form.requires_sponsorship || false,
      target_summer_year: form.target_summer_year || 2026,
      remote_preference: form.remote_preference || 'HYBRID',
      relocation_willing: form.relocation_willing || false,
      profile_completion: completion,
      onboarding_completed: true,
    });

    await supabase.from('student_preferences').delete().eq('student_id', user.id);
    const prefs: { student_id: string; preference_type: string; value: string }[] = [];
    selectedRoles.forEach(r => prefs.push({ student_id: user.id, preference_type: 'role_family', value: r }));
    selectedLocations.forEach(l => prefs.push({ student_id: user.id, preference_type: 'location', value: l }));
    selectedIndustries.forEach(i => prefs.push({ student_id: user.id, preference_type: 'industry', value: i }));
    if (prefs.length > 0) await supabase.from('student_preferences').insert(prefs);

    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) {
      alert('Please upload a PDF or Word document.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File must be under 5 MB.');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      alert('Upload failed. Please try again.');
      setUploading(false);
      return;
    }

    const isFirst = resumes.length === 0;
    await supabase.from('resumes').insert({
      student_id: user.id,
      storage_path: path,
      original_filename: file.name,
      mime_type: file.type,
      is_primary: isFirst,
      label: uploadLabel.trim() || null,
    });

    setUploadLabel('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    await loadResumes();
    setUploading(false);
  };

  const deleteResume = async (resume: Resume) => {
    if (!user) return;
    if (resume.storage_path) {
      await supabase.storage.from('resumes').remove([resume.storage_path]);
    }
    await supabase.from('resumes').delete().eq('id', resume.id);
    if (resume.is_primary) {
      const remaining = resumes.filter(r => r.id !== resume.id);
      if (remaining.length > 0) {
        await supabase.from('resumes').update({ is_primary: true }).eq('id', remaining[0].id);
      }
    }
    await loadResumes();
  };

  const setPrimary = async (resumeId: string) => {
    if (!user) return;
    await supabase.from('resumes').update({ is_primary: false }).eq('student_id', user.id);
    await supabase.from('resumes').update({ is_primary: true }).eq('id', resumeId);
    await loadResumes();
  };

  const updateResumeLabel = async (resumeId: string, label: string) => {
    await supabase.from('resumes').update({ label: label || null }).eq('id', resumeId);
    setResumes(prev => prev.map(r => r.id === resumeId ? { ...r, label: label || null } : r));
  };

  const downloadResume = async (resume: Resume) => {
    if (!resume.storage_path) return;
    const { data } = await supabase.storage.from('resumes').createSignedUrl(resume.storage_path, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const completion = profile?.profile_completion || 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink-900">Profile</h1>
        <p className="text-ink-500 mt-1">Keep your profile updated for better recommendations.</p>
      </div>

      {/* Completion bar */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-ink-700">Profile completion</span>
          <span className="text-sm font-bold text-brand-600">{completion}%</span>
        </div>
        <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${completion}%` }} />
        </div>
        {completion < 100 && (
          <p className="text-xs text-ink-400 mt-2">Complete your profile to improve match accuracy.</p>
        )}
      </div>

      {/* Personal info */}
      <Section icon={User} title="Personal Information">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">First name</label>
            <input className="input" value={form.first_name || ''} onChange={e => setForm({ ...form, first_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Last name</label>
            <input className="input" value={form.last_name || ''} onChange={e => setForm({ ...form, last_name: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">University</label>
          <select className="input" value={form.university_id || ''} onChange={e => setForm({ ...form, university_id: e.target.value })}>
            <option value="">Select university</option>
            {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </Section>

      {/* Academic info */}
      <Section icon={GraduationCap} title="Academic Information">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Academic year</label>
            <select className="input" value={form.academic_year || ''} onChange={e => setForm({ ...form, academic_year: e.target.value })}>
              <option value="">Select year</option>
              {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Graduation year</label>
            <input className="input" type="number" value={form.graduation_year || ''} onChange={e => setForm({ ...form, graduation_year: parseInt(e.target.value) || null })} placeholder="2027" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Major</label>
            <select className="input" value={form.major || ''} onChange={e => setForm({ ...form, major: e.target.value })}>
              <option value="">Select major</option>
              {MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">GPA</label>
            <input className="input" type="number" step="0.01" min="0" max="4" value={form.gpa || ''} onChange={e => setForm({ ...form, gpa: parseFloat(e.target.value) || null })} placeholder="3.7" />
          </div>
        </div>
        <div>
          <label className="label">Work authorization</label>
          <select className="input" value={form.work_authorization || 'US_CITIZEN'} onChange={e => setForm({ ...form, work_authorization: e.target.value })}>
            <option value="US_CITIZEN">US Citizen / Permanent Resident</option>
            <option value="F1_VISA">F-1 Student Visa</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.requires_sponsorship || false} onChange={e => setForm({ ...form, requires_sponsorship: e.target.checked })} className="w-4 h-4 rounded accent-brand-600" />
          <span className="text-sm text-ink-700">I require visa sponsorship for employment</span>
        </label>
      </Section>

      {/* Resumes */}
      <Section icon={FileUp} title="Resumes">
        {resumeLoading ? (
          <div className="h-20 bg-ink-100 rounded-lg animate-pulse" />
        ) : (
          <>
            {resumes.length > 0 && (
              <div className="space-y-3">
                {resumes.map(resume => (
                  <div key={resume.id} className={`card p-4 flex items-start gap-3 ${resume.is_primary ? 'border-brand-300 bg-brand-50/40' : ''}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${resume.is_primary ? 'bg-brand-100 text-brand-600' : 'bg-ink-100 text-ink-400'}`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          className="text-sm font-semibold text-ink-900 bg-transparent border-0 p-0 focus:outline-none focus:ring-0 w-full placeholder-ink-300"
                          value={resume.label || ''}
                          onChange={e => updateResumeLabel(resume.id, e.target.value)}
                          placeholder="Add a label (e.g. Engineering Resume)"
                        />
                        {resume.is_primary && (
                          <span className="badge-brand shrink-0"><Star className="w-3 h-3" /> Default</span>
                        )}
                      </div>
                      <div className="text-xs text-ink-500">{resume.original_filename}</div>
                      <div className="text-xs text-ink-400 mt-0.5">
                        Uploaded {new Date(resume.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!resume.is_primary && (
                        <button
                          onClick={() => setPrimary(resume.id)}
                          className="p-1.5 rounded-lg text-ink-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                          title="Set as default"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => downloadResume(resume)}
                        className="p-1.5 rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteResume(resume)}
                        className="p-1.5 rounded-lg text-ink-400 hover:bg-danger-50 hover:text-danger-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="card border-dashed border-2 border-ink-200 p-5 mt-3">
              <div className="text-center">
                <FileUp className="w-8 h-8 text-ink-300 mx-auto mb-2" />
                <p className="text-sm text-ink-500 mb-3">Upload a resume (PDF or Word, max 5 MB)</p>
                <div className="max-w-sm mx-auto space-y-3">
                  <input
                    className="input text-sm"
                    value={uploadLabel}
                    onChange={e => setUploadLabel(e.target.value)}
                    placeholder="Version label (e.g. Finance Resume, Tech Resume)"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="resume-upload"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="btn-primary w-full"
                  >
                    {uploading ? 'Uploading...' : <><Plus className="w-4 h-4" /> Choose file</>}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-ink-400 mt-2">
              Create different versions for different types of roles. Mark one as your default to use it automatically.
            </p>
          </>
        )}
      </Section>

      {/* Preferences */}
      <Section icon={Sliders} title="Search Preferences">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Target summer year</label>
            <select className="input" value={form.target_summer_year || 2026} onChange={e => setForm({ ...form, target_summer_year: parseInt(e.target.value) })}>
              <option value="2026">Summer 2026</option>
              <option value="2027">Summer 2027</option>
            </select>
          </div>
          <div>
            <label className="label">Work mode</label>
            <select className="input" value={form.remote_preference || 'HYBRID'} onChange={e => setForm({ ...form, remote_preference: e.target.value })}>
              <option value="ONSITE">On-site</option>
              <option value="HYBRID">Hybrid</option>
              <option value="REMOTE">Remote</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.relocation_willing || false} onChange={e => setForm({ ...form, relocation_willing: e.target.checked })} className="w-4 h-4 rounded accent-brand-600" />
          <span className="text-sm text-ink-700">I'm willing to relocate for the summer</span>
        </label>
      </Section>

      {/* Target roles, locations & industries */}
      <Section icon={Target} title="Target Roles, Locations & Industries">
        <div>
          <label className="label">Target roles</label>
          <div className="flex flex-wrap gap-2">
            {ROLE_FAMILIES.map(r => (
              <button key={r} onClick={() => toggle(selectedRoles, r, setSelectedRoles)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-all ${selectedRoles.includes(r) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-700 border-ink-200 hover:border-ink-300'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Preferred locations</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTED_LOCATIONS.map(l => (
              <button key={l} onClick={() => toggle(selectedLocations, l, setSelectedLocations)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-all ${selectedLocations.includes(l) ? 'bg-ocean-600 text-white border-ocean-600' : 'bg-white text-ink-700 border-ink-200 hover:border-ink-300'}`}>
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
                if (e.key === 'Enter') { e.preventDefault(); addCustomLocation(); }
              }}
            />
            <button type="button" onClick={addCustomLocation} disabled={!customLocation.trim()} className="btn-secondary shrink-0">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div>
          <label className="label">Target industries</label>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map(i => (
              <button key={i} onClick={() => toggle(selectedIndustries, i, setSelectedIndustries)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-all ${selectedIndustries.includes(i) ? 'bg-accent-500 text-white border-accent-500' : 'bg-white text-ink-700 border-ink-200 hover:border-ink-300'}`}>
                {i}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Save button */}
      <div className="flex items-center gap-3 mt-6 mb-8">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-brand-600 font-medium animate-fade-in">
            <CheckCircle2 className="w-4 h-4" /> Saved successfully
          </span>
        )}
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof User; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-ink-500" />
        <h2 className="text-sm font-display font-bold text-ink-900 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
