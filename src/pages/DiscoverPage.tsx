import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Employer, Internship, CompanyTarget, InternshipTarget } from '@/types/database';
import { formatDeadline, formatCompensation, priorityColor } from '@/lib/format';
import { Logo } from '@/components/Logo';
import { Modal } from '@/components/Modal';
import { Search, MapPin, DollarSign, Briefcase, Filter, Star, Building2, X, ExternalLink, Target as TargetIcon, FileText } from 'lucide-react';

type Tab = 'internships' | 'companies';
type SortBy = 'newest' | 'deadline' | 'compensation';

export function DiscoverPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('internships');
  const [loading, setLoading] = useState(true);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [companyTargets, setCompanyTargets] = useState<Set<string>>(new Set());
  const [internshipTargets, setInternshipTargets] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const [internshipsRes, employersRes] = await Promise.all([
        supabase
          .from('internships')
          .select('*, employer:employers(*)')
          .eq('status', 'OPEN')
          .order('date_posted', { ascending: false }),
        supabase
          .from('employers')
          .select('*')
          .order('name'),
      ]);

      setInternships(internshipsRes.data as unknown as Internship[] || []);
      setEmployers(employersRes.data as Employer[] || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [ctRes, itRes] = await Promise.all([
        supabase.from('company_targets').select('employer_id').eq('student_id', user.id),
        supabase.from('internship_targets').select('internship_id').eq('student_id', user.id),
      ]);
      setCompanyTargets(new Set((ctRes.data || []).map(r => (r as any).employer_id)));
      setInternshipTargets(new Set((itRes.data || []).map(r => (r as any).internship_id)));
    })();
  }, [user]);

  const roleFamilies = [...new Set(internships.map(i => i.role_family).filter(Boolean))] as string[];
  const locations = [...new Set(internships.map(i => i.location_text).filter(Boolean))] as string[];

  const filteredInternships = internships
    .filter(i => {
      if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.employer?.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter && i.role_family !== roleFilter) return false;
      if (locationFilter && i.location_text !== locationFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'deadline') {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (sortBy === 'compensation') {
        return (b.compensation_max || 0) - (a.compensation_max || 0);
      }
      return new Date(b.date_posted || 0).getTime() - new Date(a.date_posted || 0).getTime();
    });

  const filteredEmployers = employers.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.industry?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleCompanyTarget = async (employerId: string) => {
    if (!user) return;
    if (companyTargets.has(employerId)) {
      await supabase.from('company_targets').delete().eq('student_id', user.id).eq('employer_id', employerId);
      setCompanyTargets(prev => { const n = new Set(prev); n.delete(employerId); return n; });
    } else {
      await supabase.from('company_targets').insert({ student_id: user.id, employer_id: employerId, priority: 'MEDIUM' });
      setCompanyTargets(prev => new Set(prev).add(employerId));
    }
  };

  const toggleInternshipTarget = async (internshipId: string) => {
    if (!user) return;
    if (internshipTargets.has(internshipId)) {
      await supabase.from('internship_targets').delete().eq('student_id', user.id).eq('internship_id', internshipId);
      setInternshipTargets(prev => { const n = new Set(prev); n.delete(internshipId); return n; });
    } else {
      await supabase.from('internship_targets').insert({ student_id: user.id, internship_id: internshipId, priority: 'MEDIUM' });
      setInternshipTargets(prev => new Set(prev).add(internshipId));
    }
  };

  const startApplication = async (internship: Internship) => {
    if (!user) return;
    await supabase.from('applications').insert({
      student_id: user.id,
      internship_id: internship.id,
      status: 'SAVED',
    });
    toggleInternshipTarget(internship.id);
    setSelectedInternship(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink-900">Discover</h1>
        <p className="text-ink-500 mt-1">Search internships and companies. Track what interests you.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-ink-100 rounded-lg w-fit mb-4">
        {[
          { id: 'internships' as Tab, label: 'Internships', icon: Briefcase },
          { id: 'companies' as Tab, label: 'Companies', icon: Building2 },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input pl-10"
            placeholder={`Search ${tab}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {tab === 'internships' && (
          <>
            <select className="input sm:w-40" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">All roles</option>
              {roleFamilies.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select className="input sm:w-40" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
              <option value="">All locations</option>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select className="input sm:w-36" value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}>
              <option value="newest">Newest</option>
              <option value="deadline">Deadline</option>
              <option value="compensation">Compensation</option>
            </select>
          </>
        )}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-ink-200 rounded-xl animate-pulse" />)}
        </div>
      ) : tab === 'internships' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInternships.map(intern => (
            <div key={intern.id} className="card-hover p-4 cursor-pointer flex flex-col" onClick={() => setSelectedInternship(intern)}>
              <div className="flex items-start gap-3 mb-3">
                <Logo name={intern.employer?.name || '?'} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink-900 truncate">{intern.title}</div>
                  <div className="text-xs text-ink-500 truncate">{intern.employer?.name}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleInternshipTarget(intern.id); }}
                  className="p-1.5 rounded-lg hover:bg-ink-100 transition-colors shrink-0"
                >
                  <Star className={`w-4 h-4 ${internshipTargets.has(intern.id) ? 'fill-accent-400 text-accent-400' : 'text-ink-300'}`} />
                </button>
              </div>
              <div className="space-y-1.5 mb-3 flex-1">
                <div className="flex items-center gap-1.5 text-xs text-ink-500">
                  <MapPin className="w-3.5 h-3.5" /> {intern.location_text || 'Location TBD'}
                  {intern.work_mode && <span className="badge-neutral ml-1">{intern.work_mode}</span>}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-500">
                  <DollarSign className="w-3.5 h-3.5" /> {formatCompensation(intern.compensation_min, intern.compensation_max, intern.compensation_unit)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                {intern.deadline ? (() => {
                  const dl = formatDeadline(intern.deadline);
                  return <span className={`badge-${dl.urgency === 'critical' ? 'danger' : dl.urgency === 'soon' ? 'warning' : 'neutral'}`}>{dl.text}</span>;
                })() : <span className="badge-neutral">No deadline</span>}
                <span className="badge-brand">{intern.role_family}</span>
              </div>
            </div>
          ))}
          {filteredInternships.length === 0 && (
            <div className="col-span-full card p-8 text-center">
              <p className="text-ink-500">No internships match your filters. Try adjusting your search.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployers.map(employer => (
            <div key={employer.id} className="card-hover p-4 cursor-pointer flex flex-col" onClick={() => setSelectedEmployer(employer)}>
              <div className="flex items-start gap-3 mb-3">
                <Logo name={employer.name} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink-900 truncate">{employer.name}</div>
                  <div className="text-xs text-ink-500 truncate">{employer.industry}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCompanyTarget(employer.id); }}
                  className="p-1.5 rounded-lg hover:bg-ink-100 transition-colors shrink-0"
                >
                  <TargetIcon className={`w-4 h-4 ${companyTargets.has(employer.id) ? 'text-brand-600 fill-brand-100' : 'text-ink-300'}`} />
                </button>
              </div>
              <p className="text-xs text-ink-500 line-clamp-2 mb-3 flex-1">{employer.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge-neutral">{employer.size_band}</span>
                <span className="badge-ocean">{employer.hq_location}</span>
                {employer.verified && <span className="badge-success">Verified</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Internship detail modal */}
      {selectedInternship && (
        <Modal open={true} onClose={() => setSelectedInternship(null)} title="Internship Details" size="lg">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <Logo name={selectedInternship.employer?.name || '?'} size="lg" />
              <div>
                <h3 className="text-xl font-display font-bold text-ink-900">{selectedInternship.title}</h3>
                <p className="text-ink-500">{selectedInternship.employer?.name} · {selectedInternship.employer?.industry}</p>
              </div>
            </div>

            {selectedInternship.description && (
              <p className="text-sm text-ink-600 leading-relaxed">{selectedInternship.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <InfoRow icon={MapPin} label="Location" value={selectedInternship.location_text || 'TBD'} />
              <InfoRow icon={Briefcase} label="Work mode" value={selectedInternship.work_mode || 'TBD'} />
              <InfoRow icon={DollarSign} label="Compensation" value={formatCompensation(selectedInternship.compensation_min, selectedInternship.compensation_max, selectedInternship.compensation_unit)} />
              <InfoRow icon={TargetIcon} label="Role family" value={selectedInternship.role_family || 'General'} />
            </div>

            {selectedInternship.deadline && (() => {
              const dl = formatDeadline(selectedInternship.deadline);
              return (
                <div className={`card p-3 ${dl.urgency === 'critical' ? 'border-danger-200 bg-danger-50' : dl.urgency === 'soon' ? 'border-warning-200 bg-warning-50' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className={`badge-${dl.urgency === 'critical' ? 'danger' : dl.urgency === 'soon' ? 'warning' : 'neutral'}`}>{dl.text}</span>
                    <span className="text-xs text-ink-500">Application deadline</span>
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-3 pt-2">
              {selectedInternship.apply_url && (
                <a href={selectedInternship.apply_url} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1">
                  <ExternalLink className="w-4 h-4" /> Apply on site
                </a>
              )}
              <button onClick={() => startApplication(selectedInternship)} className="btn-primary flex-1">
                <FileText className="w-4 h-4" /> Start tracking
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Employer detail modal */}
      {selectedEmployer && (
        <Modal open={true} onClose={() => setSelectedEmployer(null)} title="Company Profile" size="lg">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <Logo name={selectedEmployer.name} size="lg" />
              <div>
                <h3 className="text-xl font-display font-bold text-ink-900">{selectedEmployer.name}</h3>
                <p className="text-ink-500">{selectedEmployer.industry} · {selectedEmployer.size_band}</p>
              </div>
            </div>

            {selectedEmployer.description && (
              <p className="text-sm text-ink-600 leading-relaxed">{selectedEmployer.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <InfoRow icon={MapPin} label="HQ" value={selectedEmployer.hq_location || 'Unknown'} />
              <InfoRow icon={Building2} label="Industry" value={selectedEmployer.industry || 'Unknown'} />
            </div>

            <button
              onClick={() => { toggleCompanyTarget(selectedEmployer.id); setSelectedEmployer(null); }}
              className={companyTargets.has(selectedEmployer.id) ? 'btn-secondary w-full' : 'btn-primary w-full'}
            >
              <TargetIcon className="w-4 h-4" />
              {companyTargets.has(selectedEmployer.id) ? 'Untrack company' : 'Track this company'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-ink-100 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-ink-500" />
      </div>
      <div>
        <div className="text-xs text-ink-400">{label}</div>
        <div className="text-sm font-medium text-ink-900">{value}</div>
      </div>
    </div>
  );
}
