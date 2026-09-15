import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { CompanyTarget, TargetPriority, CompanyTargetStatus, Internship, CompanyEvent } from '@/types/database';
import { priorityColor, companyTargetStatusColor, eventTypeLabel, formatRelativeTime } from '@/lib/format';
import { Logo } from '@/components/Logo';
import { Modal } from '@/components/Modal';
import { Target as TargetIcon, Plus, TrendingUp, Brain, ExternalLink, Star } from 'lucide-react';

const PRIORITIES: TargetPriority[] = ['DREAM', 'HIGH', 'MEDIUM', 'LOW'];
const STATUSES: CompanyTargetStatus[] = ['DISCOVERED', 'WATCHING', 'RESEARCHING', 'OUTREACH', 'ACTIVE_OPPORTUNITY', 'PAUSED', 'CLOSED'];

export function TargetsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<CompanyTarget[]>([]);
  const [events, setEvents] = useState<Record<string, CompanyEvent[]>>({});
  const [selectedTarget, setSelectedTarget] = useState<CompanyTarget | null>(null);
  const [selectedInternships, setSelectedInternships] = useState<Internship[]>([]);
  const [editingPriority, setEditingPriority] = useState<Record<string, TargetPriority>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('company_targets')
        .select('*, employer:employers(*)')
        .eq('student_id', user.id)
        .order('updated_at', { ascending: false });
      const targetsData = data as unknown as CompanyTarget[] || [];
      setTargets(targetsData);

      // Fetch events for each target's employer
      const eventsMap: Record<string, CompanyEvent[]> = {};
      await Promise.all(targetsData.map(async t => {
        const { data: evData } = await supabase
          .from('company_events')
          .select('*, employer:employers(*)')
          .eq('employer_id', t.employer_id)
          .order('event_date', { ascending: false })
          .limit(5);
        eventsMap[t.employer_id] = evData as unknown as CompanyEvent[] || [];
      }));
      setEvents(eventsMap);
      setLoading(false);
    })();
  }, [user]);

  const updateTarget = async (id: string, updates: Partial<CompanyTarget>) => {
    await supabase.from('company_targets').update(updates).eq('id', id);
    setTargets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const openTarget = async (target: CompanyTarget) => {
    setSelectedTarget(target);
    const { data } = await supabase
      .from('internships')
      .select('*, employer:employers(*)')
      .eq('employer_id', target.employer_id)
      .eq('status', 'OPEN')
      .order('deadline', { ascending: true });
    setSelectedInternships(data as unknown as Internship[] || []);
  };

  const grouped = PRIORITIES.map(p => ({ priority: p, items: targets.filter(t => t.priority === p) }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink-900">Targets</h1>
        <p className="text-ink-500 mt-1">Companies you're tracking. Compass monitors them for relevant signals.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-ink-200 rounded-xl animate-pulse" />)}
        </div>
      ) : targets.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-ink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TargetIcon className="w-8 h-8 text-ink-400" />
          </div>
          <h3 className="text-lg font-display font-bold text-ink-900 mb-2">No targets yet</h3>
          <p className="text-sm text-ink-500 mb-4 max-w-sm mx-auto">
            Track companies you're interested in. Compass will monitor them and alert you when something relevant happens.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => group.items.length > 0 && (
            <div key={group.priority}>
              <div className="flex items-center gap-2 mb-3">
                <span className={priorityColor(group.priority)}>{group.priority}</span>
                <span className="text-sm text-ink-400">{group.items.length} {group.items.length === 1 ? 'company' : 'companies'}</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map(target => (
                  <div key={target.id} className="card-hover p-4 cursor-pointer" onClick={() => openTarget(target)}>
                    <div className="flex items-start gap-3 mb-3">
                      <Logo name={target.employer?.name || '?'} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-ink-900 truncate">{target.employer?.name}</div>
                        <div className="text-xs text-ink-500 truncate">{target.employer?.industry}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={companyTargetStatusColor(target.status)}>{target.status.replace(/_/g, ' ')}</span>
                      {events[target.employer_id]?.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-brand-600 font-medium">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {events[target.employer_id].length} signals
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Target detail modal */}
      {selectedTarget && (
        <Modal open={true} onClose={() => { setSelectedTarget(null); setSelectedInternships([]); }} title={selectedTarget.employer?.name || 'Company'} size="lg">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Logo name={selectedTarget.employer?.name || '?'} size="lg" />
              <div className="flex-1">
                <h3 className="text-xl font-display font-bold text-ink-900">{selectedTarget.employer?.name}</h3>
                <p className="text-ink-500">{selectedTarget.employer?.industry} · {selectedTarget.employer?.hq_location}</p>
              </div>
            </div>

            {selectedTarget.employer?.description && (
              <p className="text-sm text-ink-600 leading-relaxed">{selectedTarget.employer.description}</p>
            )}

            {/* Priority & status controls */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Priority</label>
                <select
                  className="input"
                  value={selectedTarget.priority}
                  onChange={e => {
                    const p = e.target.value as TargetPriority;
                    updateTarget(selectedTarget.id, { priority: p });
                    setSelectedTarget({ ...selectedTarget, priority: p });
                  }}
                >
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  className="input"
                  value={selectedTarget.status}
                  onChange={e => {
                    const s = e.target.value as CompanyTargetStatus;
                    updateTarget(selectedTarget.id, { status: s });
                    setSelectedTarget({ ...selectedTarget, status: s });
                  }}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>

            {/* Open internships */}
            {selectedInternships.length > 0 && (
              <div>
                <h4 className="text-sm font-display font-bold text-ink-900 mb-3">Open internships ({selectedInternships.length})</h4>
                <div className="space-y-2">
                  {selectedInternships.map(intern => (
                    <div key={intern.id} className="card p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink-900 truncate">{intern.title}</div>
                        <div className="text-xs text-ink-500">{intern.location_text} · {intern.work_mode}</div>
                      </div>
                      {intern.apply_url && (
                        <a href={intern.apply_url} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Company signals */}
            {events[selectedTarget.employer_id]?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-brand-600" />
                  <h4 className="text-sm font-display font-bold text-ink-900">Recent signals</h4>
                </div>
                <div className="space-y-2">
                  {events[selectedTarget.employer_id].map(ev => (
                    <div key={ev.id} className="card p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge-brand">{eventTypeLabel(ev.event_type)}</span>
                        <span className="text-xs text-ink-400">{formatRelativeTime(ev.event_date)}</span>
                      </div>
                      <div className="text-sm font-medium text-ink-900">{ev.headline}</div>
                      {ev.summary && <p className="text-xs text-ink-500 mt-1">{ev.summary}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTarget.employer?.website_url && (
              <a href={selectedTarget.employer.website_url} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full">
                <ExternalLink className="w-4 h-4" /> Visit website
              </a>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
