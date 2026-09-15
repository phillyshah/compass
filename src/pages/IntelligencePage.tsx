import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { CompanyEvent, CompanyTarget } from '@/types/database';
import { eventTypeLabel, formatRelativeTime, eventRelevanceColor } from '@/lib/format';
import { Logo } from '@/components/Logo';
import { Brain, TrendingUp, Filter, Zap, Target as TargetIcon } from 'lucide-react';

type EventTypeFilter = 'ALL' | 'HIRING_EXPANSION' | 'FUNDING' | 'EARNINGS' | 'EXPANSION' | 'PRODUCT_LAUNCH' | 'EXECUTIVE_CHANGE' | 'STRATEGY';

export function IntelligencePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<(CompanyEvent & { isTargeted?: boolean; targetPriority?: string })[]>([]);
  const [filter, setFilter] = useState<EventTypeFilter>('ALL');
  const [showTargetsOnly, setShowTargetsOnly] = useState(false);
  const [targets, setTargets] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      let eventsQuery = supabase
        .from('company_events')
        .select('*, employer:employers(*)')
        .order('event_date', { ascending: false })
        .limit(50);

      const { data: eventsData } = await eventsQuery;
      let events = (eventsData as unknown as CompanyEvent[]) || [];

      if (user) {
        const { data: targetsData } = await supabase
          .from('company_targets')
          .select('employer_id, priority')
          .eq('student_id', user.id);
        const targetMap = new Map((targetsData || []).map((t: any) => [t.employer_id, t.priority]));
        setTargets(new Set(targetMap.keys()));
        events = events.map(e => ({
          ...e,
          isTargeted: targetMap.has(e.employer_id),
          targetPriority: targetMap.get(e.employer_id) || null,
        }));
      }

      setEvents(events);
      setLoading(false);
    })();
  }, [user]);

  const filteredEvents = events
    .filter(e => filter === 'ALL' || e.event_type === filter)
    .filter(e => !showTargetsOnly || e.isTargeted);

  const filterOptions: { value: EventTypeFilter; label: string }[] = [
    { value: 'ALL', label: 'All signals' },
    { value: 'HIRING_EXPANSION', label: 'Hiring' },
    { value: 'FUNDING', label: 'Funding' },
    { value: 'EARNINGS', label: 'Earnings' },
    { value: 'EXPANSION', label: 'Expansion' },
    { value: 'PRODUCT_LAUNCH', label: 'Product' },
    { value: 'EXECUTIVE_CHANGE', label: 'Leadership' },
    { value: 'STRATEGY', label: 'Strategy' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink-900">Intelligence</h1>
        <p className="text-ink-500 mt-1">Real-time company signals — funding, hiring, leadership changes, and more.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-ink-400" />
          <select className="input py-2 text-sm" value={filter} onChange={e => setFilter(e.target.value as EventTypeFilter)}>
            {filterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showTargetsOnly} onChange={e => setShowTargetsOnly(e.target.checked)} className="w-4 h-4 rounded accent-brand-600" />
          <span className="text-sm text-ink-600">Tracked companies only</span>
        </label>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-ink-200 rounded-xl animate-pulse" />)}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-ink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-ink-400" />
          </div>
          <h3 className="text-lg font-display font-bold text-ink-900 mb-2">No signals found</h3>
          <p className="text-sm text-ink-500">
            {showTargetsOnly ? 'No signals for your tracked companies. Try showing all signals.' : 'No signals match your filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map(event => (
            <div key={event.id} className={`card-hover p-4 ${event.isTargeted ? 'border-brand-200 bg-brand-50/30' : ''}`}>
              <div className="flex items-start gap-3">
                <Logo name={event.employer?.name || '?'} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="badge-brand">{eventTypeLabel(event.event_type)}</span>
                    {event.isTargeted && (
                      <span className="badge-accent">
                        <TargetIcon className="w-3 h-3" /> Tracked
                      </span>
                    )}
                    <span className="text-xs text-ink-400">{formatRelativeTime(event.event_date)}</span>
                  </div>
                  <div className="text-sm font-semibold text-ink-900">{event.headline}</div>
                  {event.summary && <p className="text-sm text-ink-500 mt-1 leading-relaxed">{event.summary}</p>}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-ink-500 font-medium">{event.employer?.name}</span>
                    <span className="text-ink-300">·</span>
                    <span className="text-xs text-ink-400">{event.employer?.industry}</span>
                  </div>
                </div>
                <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${event.isTargeted ? 'bg-brand-100 text-brand-600' : 'bg-ink-100 text-ink-400'}`}>
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


