import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Application, CompanyTarget, Internship, Recommendation } from '@/types/database';
import { formatDeadline, formatRelativeTime, applicationStatusColor, priorityColor } from '@/lib/format';
import { Logo } from '@/components/Logo';
import type { Page } from '@/components/AppShell';
import {
  Calendar, TrendingUp, Target as TargetIcon, FileText,
  ArrowRight, AlertCircle, Clock, CheckCircle2, Zap, Brain,
} from 'lucide-react';

export function TodayPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [targets, setTargets] = useState<CompanyTarget[]>([]);
  const [newInternships, setNewInternships] = useState<Internship[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [appsRes, targetsRes, internshipsRes] = await Promise.all([
        supabase
          .from('applications')
          .select('*, internship:internships(*, employer:employers(*))')
          .eq('student_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(5),
        supabase
          .from('company_targets')
          .select('*, employer:employers(*)')
          .eq('student_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(5),
        supabase
          .from('internships')
          .select('*, employer:employers(*)')
          .eq('status', 'OPEN')
          .order('date_posted', { ascending: false })
          .limit(6),
      ]);

      setApplications(appsRes.data as unknown as Application[] || []);
      setTargets(targetsRes.data as unknown as CompanyTarget[] || []);
      setNewInternships(internshipsRes.data as unknown as Internship[] || []);
      setLoading(false);
    })();
  }, [user]);

  const firstName = profile?.first_name || 'there';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const upcomingDeadlines = applications
    .filter(a => a.internship?.deadline)
    .map(a => ({ app: a, deadline: a.internship!.deadline! }))
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 3);

  const activeApps = applications.filter(a => !['REJECTED', 'WITHDRAWN', 'EXPIRED', 'ACCEPTED'].includes(a.status));

  // Generate smart recommendations based on data
  useEffect(() => {
    if (!user || loading) return;
    const recs: Recommendation[] = [];

    // Deadline recommendations
    upcomingDeadlines.forEach(({ app }) => {
      const dl = formatDeadline(app.internship?.deadline ?? null);
      if (dl.urgency === 'critical' || dl.urgency === 'soon') {
        recs.push({
          id: `rec-dl-${app.id}`,
          student_id: user.id,
          company_id: null,
          internship_id: app.internship_id,
          application_id: app.id,
          recommendation_type: 'DEADLINE',
          priority_score: dl.urgency === 'critical' ? 95 : 75,
          reason: `${app.internship?.employer?.name} ${app.internship?.title} deadline is ${dl.text}`,
          action_text: app.status === 'SAVED' ? 'Prepare and submit your application' : 'Follow up on your application',
          due_at: app.internship?.deadline ?? null,
          confidence: 'CONFIRMED',
          evidence_refs: [],
          generated_at: new Date().toISOString(),
          dismissed_at: null,
          completed_at: null,
          snoozed_until: null,
          internship: app.internship,
        });
      }
    });

    // Target monitoring recommendation
    if (targets.length > 0 && targets.length < 5) {
      recs.push({
        id: `rec-target-more`,
        student_id: user.id,
        company_id: null,
        internship_id: null,
        application_id: null,
        recommendation_type: 'TARGET_EXPANSION',
        priority_score: 60,
        reason: `You're tracking ${targets.length} companies. Students who track 8+ companies receive 3x more relevant signals.`,
        action_text: 'Add more target companies in Discover',
        due_at: null,
        confidence: 'SUGGESTED',
        evidence_refs: [],
        generated_at: new Date().toISOString(),
        dismissed_at: null,
        completed_at: null,
        snoozed_until: null,
      });
    }

    // Application pipeline recommendation
    if (activeApps.length === 0 && newInternships.length > 0) {
      recs.push({
        id: `rec-first-app`,
        student_id: user.id,
        company_id: null,
        internship_id: null,
        application_id: null,
        recommendation_type: 'FIRST_APPLICATION',
        priority_score: 80,
        reason: 'You haven\'t started any applications yet. Getting your first application in early increases your chances.',
        action_text: 'Browse internships and save your first target',
        due_at: null,
        confidence: 'SUGGESTED',
        evidence_refs: [],
        generated_at: new Date().toISOString(),
        dismissed_at: null,
        completed_at: null,
        snoozed_until: null,
      });
    }

    setRecommendations(recs.sort((a, b) => b.priority_score - a.priority_score));
  }, [user, loading, applications, targets, newInternships, upcomingDeadlines, activeApps.length]);

  if (loading) {
    return (
      <div className="p-6 sm:p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-ink-200 rounded w-1/3" />
          <div className="grid md:grid-cols-3 gap-4">
            <div className="h-28 bg-ink-200 rounded-xl" />
            <div className="h-28 bg-ink-200 rounded-xl" />
            <div className="h-28 bg-ink-200 rounded-xl" />
          </div>
          <div className="h-64 bg-ink-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="text-sm text-ink-400 font-medium">{today}</div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink-900 mt-0.5">
          Good morning, {firstName}
        </h1>
        <p className="text-ink-500 mt-1">Here's your personalized action plan for today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Active applications', value: activeApps.length, icon: FileText, color: 'text-brand-600 bg-brand-50', page: 'applications' as Page },
          { label: 'Tracked companies', value: targets.length, icon: TargetIcon, color: 'text-ocean-600 bg-ocean-50', page: 'targets' as Page },
          { label: 'New opportunities', value: newInternships.length, icon: TrendingUp, color: 'text-accent-600 bg-accent-50', page: 'discover' as Page },
          { label: 'Profile completion', value: `${profile?.profile_completion || 0}%`, icon: CheckCircle2, color: 'text-success-600 bg-success-50', page: 'profile' as Page },
        ].map(stat => (
          <div key={stat.label} className="card-hover p-4 cursor-pointer group" onClick={() => onNavigate(stat.page)}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xl font-display font-bold text-ink-900">{stat.value}</div>
                <div className="text-xs text-ink-500 truncate">{stat.label}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-ink-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Recommendations */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-display font-bold text-ink-900">Recommended actions</h2>
            </div>
            {recommendations.length === 0 ? (
              <div className="card p-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-brand-500 mx-auto mb-2" />
                <p className="text-sm text-ink-500">You're all caught up! Check back tomorrow for new recommendations.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map(rec => (
                  <div key={rec.id} className="card-hover p-4 flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      rec.priority_score >= 80 ? 'bg-danger-100 text-danger-600' :
                      rec.priority_score >= 60 ? 'bg-warning-100 text-warning-600' :
                      'bg-ocean-100 text-ocean-600'
                    }`}>
                      {rec.recommendation_type === 'DEADLINE' ? <Clock className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge ${
                          rec.priority_score >= 80 ? 'badge-danger' :
                          rec.priority_score >= 60 ? 'badge-warning' :
                          'badge-ocean'
                        }`}>
                          {rec.priority_score >= 80 ? 'Urgent' : rec.priority_score >= 60 ? 'Important' : 'Suggested'}
                        </span>
                        {rec.internship?.employer && (
                          <span className="text-xs text-ink-400">{rec.internship.employer.name}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-ink-900">{rec.action_text}</p>
                      <p className="text-xs text-ink-500 mt-1">{rec.reason}</p>
                    </div>
                    {rec.recommendation_type === 'TARGET_EXPANSION' || rec.recommendation_type === 'FIRST_APPLICATION' ? (
                      <button onClick={() => onNavigate('discover')} className="btn-ghost text-xs shrink-0">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={() => onNavigate('applications')} className="btn-ghost text-xs shrink-0">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New opportunities */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-600" />
                <h2 className="text-lg font-display font-bold text-ink-900">New opportunities</h2>
              </div>
              <button onClick={() => onNavigate('discover')} className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {newInternships.slice(0, 4).map(intern => (
                <div key={intern.id} className="card-hover p-4 cursor-pointer" onClick={() => onNavigate('discover')}>
                  <div className="flex items-start gap-3 mb-2">
                    <Logo name={intern.employer?.name || '?'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-ink-900 truncate">{intern.title}</div>
                      <div className="text-xs text-ink-500 truncate">{intern.employer?.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge-neutral">{intern.location_text || 'Location TBD'}</span>
                    {intern.deadline && (() => {
                      const dl = formatDeadline(intern.deadline);
                      return <span className={`badge-${dl.urgency === 'critical' ? 'danger' : dl.urgency === 'soon' ? 'warning' : 'neutral'}`}>{dl.text}</span>;
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Deadlines & targets */}
        <div className="space-y-6">
          {/* Upcoming deadlines */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-danger-600" />
              <h2 className="text-lg font-display font-bold text-ink-900">Upcoming deadlines</h2>
            </div>
            {upcomingDeadlines.length === 0 ? (
              <div className="card p-4 text-center">
                <p className="text-sm text-ink-500">No upcoming deadlines. You're on track!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingDeadlines.map(({ app }) => {
                  const dl = formatDeadline(app.internship?.deadline ?? null);
                  return (
                    <div key={app.id} className="card p-3 flex items-center gap-3 cursor-pointer hover:border-ink-300 transition-colors" onClick={() => onNavigate('applications')}>
                      <div className={`w-1 h-10 rounded-full ${dl.urgency === 'critical' ? 'bg-danger-500' : dl.urgency === 'soon' ? 'bg-warning-500' : 'bg-ink-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink-900 truncate">{app.internship?.title}</div>
                        <div className="text-xs text-ink-500 truncate">{app.internship?.employer?.name}</div>
                      </div>
                      <span className={`badge-${dl.urgency === 'critical' ? 'danger' : dl.urgency === 'soon' ? 'warning' : 'neutral'} shrink-0`}>{dl.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tracked companies */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TargetIcon className="w-5 h-5 text-ocean-600" />
                <h2 className="text-lg font-display font-bold text-ink-900">Your targets</h2>
              </div>
              <button onClick={() => onNavigate('targets')} className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {targets.length === 0 ? (
              <div className="card p-4 text-center">
                <AlertCircle className="w-6 h-6 text-ink-400 mx-auto mb-2" />
                <p className="text-sm text-ink-500 mb-3">No companies tracked yet.</p>
                <button onClick={() => onNavigate('discover')} className="btn-primary text-xs">Start tracking</button>
              </div>
            ) : (
              <div className="space-y-2">
                {targets.map(t => (
                  <div key={t.id} className="card p-3 flex items-center gap-3 cursor-pointer hover:border-ink-300 transition-colors" onClick={() => onNavigate('targets')}>
                    <Logo name={t.employer?.name || '?'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink-900 truncate">{t.employer?.name}</div>
                      <div className="text-xs text-ink-500">{t.employer?.industry}</div>
                    </div>
                    <span className={priorityColor(t.priority)}>{t.priority}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent applications */}
          {applications.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-ink-600" />
                  <h2 className="text-lg font-display font-bold text-ink-900">Recent applications</h2>
                </div>
                <button onClick={() => onNavigate('applications')} className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                  All <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {applications.slice(0, 4).map(app => (
                  <div key={app.id} className="card p-3 flex items-center gap-3 cursor-pointer hover:border-ink-300 transition-colors" onClick={() => onNavigate('applications')}>
                    <Logo name={app.internship?.employer?.name || '?'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink-900 truncate">{app.internship?.title}</div>
                      <div className="text-xs text-ink-500">{formatRelativeTime(app.updated_at)}</div>
                    </div>
                    <span className={applicationStatusColor(app.status)}>{app.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
