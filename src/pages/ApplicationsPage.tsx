import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Application, ApplicationStatus, Internship } from '@/types/database';
import { applicationStatusColor, formatDeadline, formatRelativeTime } from '@/lib/format';
import { Logo } from '@/components/Logo';
import { Modal } from '@/components/Modal';
import { FileText, Layout, List, Plus, X, ExternalLink, Calendar, StickyNote } from 'lucide-react';

const COLUMNS: { status: ApplicationStatus; label: string; color: string }[] = [
  { status: 'SAVED', label: 'Saved', color: 'border-ink-300' },
  { status: 'PREPARING', label: 'Preparing', color: 'border-ocean-300' },
  { status: 'APPLIED', label: 'Applied', color: 'border-brand-300' },
  { status: 'ASSESSMENT', label: 'Assessment', color: 'border-accent-300' },
  { status: 'INTERVIEW', label: 'Interview', color: 'border-accent-400' },
  { status: 'FINAL_INTERVIEW', label: 'Final Round', color: 'border-warning-300' },
  { status: 'OFFER', label: 'Offer', color: 'border-success-300' },
  { status: 'REJECTED', label: 'Rejected', color: 'border-danger-300' },
];

const ALL_STATUSES: ApplicationStatus[] = ['SAVED', 'PREPARING', 'APPLIED', 'ASSESSMENT', 'INTERVIEW', 'FINAL_INTERVIEW', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED'];

export function ApplicationsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [availableInternships, setAvailableInternships] = useState<Internship[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('applications')
        .select('*, internship:internships(*, employer:employers(*))')
        .eq('student_id', user.id)
        .order('updated_at', { ascending: false });
      setApplications(data as unknown as Application[] || []);
      setLoading(false);
    })();
  }, [user]);

  const loadAvailableInternships = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('internships')
      .select('*, employer:employers(*)')
      .eq('status', 'OPEN')
      .order('title');
    setAvailableInternships(data as unknown as Internship[] || []);
  };

  const updateApplication = async (id: string, updates: Partial<Application>) => {
    await supabase.from('applications').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    setApplications(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    if (selectedApp?.id === id) setSelectedApp({ ...selectedApp, ...updates });
  };

  const moveApplication = async (id: string, status: ApplicationStatus) => {
    const updates: Partial<Application> = { status };
    if (status === 'APPLIED' && !applications.find(a => a.id === id)?.applied_at) {
      updates.applied_at = new Date().toISOString();
    }
    await updateApplication(id, updates);
  };

  const addApplication = async (internshipId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('applications')
      .insert({ student_id: user.id, internship_id: internshipId, status: 'SAVED' })
      .select('*, internship:internships(*, employer:employers(*))')
      .single();
    if (data) {
      setApplications(prev => [data as unknown as Application, ...prev]);
      setShowAdd(false);
    }
  };

  const filteredApps = applications.filter(a => {
    if (search && !a.internship?.title.toLowerCase().includes(search.toLowerCase()) && !a.internship?.employer?.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink-900">Applications</h1>
          <p className="text-ink-500 mt-1">Track every application from saved to offer.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 bg-ink-100 rounded-lg">
            <button onClick={() => setView('kanban')} className={`p-1.5 rounded-md transition-all ${view === 'kanban' ? 'bg-white shadow-sm text-ink-900' : 'text-ink-500'}`}>
              <Layout className="w-4 h-4" />
            </button>
            <button onClick={() => setView('table')} className={`p-1.5 rounded-md transition-all ${view === 'table' ? 'bg-white shadow-sm text-ink-900' : 'text-ink-500'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => { loadAvailableInternships(); setShowAdd(true); }} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 sm:max-w-xs">
        <input className="input" placeholder="Search applications..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="h-64 bg-ink-200 rounded-xl animate-pulse" />
      ) : applications.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-ink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-ink-400" />
          </div>
          <h3 className="text-lg font-display font-bold text-ink-900 mb-2">No applications yet</h3>
          <p className="text-sm text-ink-500 mb-4">Start tracking an internship to build your pipeline.</p>
          <button onClick={() => { loadAvailableInternships(); setShowAdd(true); }} className="btn-primary">
            <Plus className="w-4 h-4" /> Add your first application
          </button>
        </div>
      ) : view === 'kanban' ? (
        <div className="overflow-x-auto scrollbar-thin -mx-4 px-4">
          <div className="flex gap-4 min-w-max pb-4">
            {COLUMNS.map(col => {
              const colApps = filteredApps.filter(a => a.status === col.status);
              return (
                <div key={col.status} className="w-72 shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${col.color.replace('border-', 'bg-')}`} />
                      <span className="text-sm font-semibold text-ink-700">{col.label}</span>
                    </div>
                    <span className="text-xs text-ink-400 font-medium">{colApps.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[60px]">
                    {colApps.map(app => (
                      <div key={app.id} className="card-hover p-3 cursor-pointer" onClick={() => setSelectedApp(app)}>
                        <div className="flex items-start gap-2 mb-2">
                          <Logo name={app.internship?.employer?.name || '?'} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-ink-900 truncate">{app.internship?.title}</div>
                            <div className="text-xs text-ink-500 truncate">{app.internship?.employer?.name}</div>
                          </div>
                        </div>
                        {app.internship?.deadline && (() => {
                          const dl = formatDeadline(app.internship.deadline);
                          return <span className={`badge-${dl.urgency === 'critical' ? 'danger' : dl.urgency === 'soon' ? 'warning' : 'neutral'} text-[10px]`}>{dl.text}</span>;
                        })()}
                        {app.next_action && (
                          <div className="mt-2 text-[10px] text-ink-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {app.next_action}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider px-4 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Company</th>
                <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Deadline</th>
                <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filteredApps.map(app => (
                <tr key={app.id} className="hover:bg-ink-50 cursor-pointer transition-colors" onClick={() => setSelectedApp(app)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Logo name={app.internship?.employer?.name || '?'} size="sm" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-ink-900 truncate">{app.internship?.title}</div>
                        <div className="text-xs text-ink-500 truncate sm:hidden">{app.internship?.employer?.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-sm text-ink-600">{app.internship?.employer?.name}</td>
                  <td className="px-4 py-3">
                    <select
                      value={app.status}
                      onClick={e => e.stopPropagation()}
                      onChange={e => moveApplication(app.id, e.target.value as ApplicationStatus)}
                      className={`text-xs font-medium rounded-full border-0 cursor-pointer py-1 px-2.5 ${applicationStatusColor(app.status)}`}
                    >
                      {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {app.internship?.deadline ? (() => {
                      const dl = formatDeadline(app.internship.deadline);
                      return <span className={`badge-${dl.urgency === 'critical' ? 'danger' : dl.urgency === 'soon' ? 'warning' : 'neutral'}`}>{dl.text}</span>;
                    })() : <span className="text-ink-400 text-sm">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-ink-500">{formatRelativeTime(app.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Application detail modal */}
      {selectedApp && (
        <Modal open={true} onClose={() => setSelectedApp(null)} title="Application Details" size="md">
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <Logo name={selectedApp.internship?.employer?.name || '?'} size="md" />
              <div>
                <h3 className="text-lg font-display font-bold text-ink-900">{selectedApp.internship?.title}</h3>
                <p className="text-sm text-ink-500">{selectedApp.internship?.employer?.name} · {selectedApp.internship?.location_text}</p>
              </div>
            </div>

            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={selectedApp.status}
                onChange={e => moveApplication(selectedApp.id, e.target.value as ApplicationStatus)}
              >
                {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Next action</label>
              <input
                className="input"
                value={selectedApp.next_action || ''}
                onChange={e => updateApplication(selectedApp.id, { next_action: e.target.value })}
                placeholder="e.g. Submit application by Friday"
              />
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                className="input min-h-[100px] resize-none"
                value={selectedApp.notes || ''}
                onChange={e => updateApplication(selectedApp.id, { notes: e.target.value })}
                placeholder="Add notes about this application..."
              />
            </div>

            {selectedApp.internship?.apply_url && (
              <a href={selectedApp.internship.apply_url} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full">
                <ExternalLink className="w-4 h-4" /> Apply on company site
              </a>
            )}
          </div>
        </Modal>
      )}

      {/* Add application modal */}
      {showAdd && (
        <Modal open={true} onClose={() => setShowAdd(false)} title="Add Application" size="md">
          <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-thin">
            {availableInternships.length === 0 ? (
              <p className="text-sm text-ink-500 text-center py-4">No open internships available.</p>
            ) : availableInternships.map(intern => (
              <div key={intern.id} className="card-hover p-3 flex items-center gap-3 cursor-pointer" onClick={() => addApplication(intern.id)}>
                <Logo name={intern.employer?.name || '?'} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink-900 truncate">{intern.title}</div>
                  <div className="text-xs text-ink-500 truncate">{intern.employer?.name} · {intern.location_text}</div>
                </div>
                <Plus className="w-4 h-4 text-brand-600 shrink-0" />
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
