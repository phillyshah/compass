export function formatDeadline(deadline: string | null): { text: string; urgency: 'past' | 'critical' | 'soon' | 'normal' | 'none' } {
  if (!deadline) return { text: 'No deadline', urgency: 'none' };
  const date = new Date(deadline);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `${Math.abs(diffDays)}d ago`, urgency: 'past' };
  if (diffDays === 0) return { text: 'Today', urgency: 'critical' };
  if (diffDays === 1) return { text: 'Tomorrow', urgency: 'critical' };
  if (diffDays <= 7) return { text: `${diffDays}d left`, urgency: 'soon' };
  if (diffDays <= 30) return { text: `${diffDays}d left`, urgency: 'normal' };
  return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), urgency: 'normal' };
}

export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatCompensation(min: number | null, max: number | null, unit: string | null): string {
  if (!min && !max) return 'Unspecified';
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`;
  const unitLabel = unit === 'MONTHLY' ? '/mo' : unit === 'HOURLY' ? '/hr' : '';
  if (min && max && min !== max) return `${fmt(min)}–${fmt(max)}${unitLabel}`;
  return `${fmt((min || max) as number)}${unitLabel}`;
}

export function priorityColor(priority: string): string {
  switch (priority) {
    case 'DREAM': return 'badge-accent';
    case 'HIGH': return 'badge-brand';
    case 'MEDIUM': return 'badge-ocean';
    case 'LOW': return 'badge-neutral';
    default: return 'badge-neutral';
  }
}

export function applicationStatusColor(status: string): string {
  switch (status) {
    case 'SAVED': return 'badge-neutral';
    case 'PREPARING': return 'badge-ocean';
    case 'APPLIED': return 'badge-brand';
    case 'ASSESSMENT': return 'badge-accent';
    case 'INTERVIEW': return 'badge-accent';
    case 'FINAL_INTERVIEW': return 'badge-warning';
    case 'OFFER': return 'badge-success';
    case 'ACCEPTED': return 'badge-success';
    case 'REJECTED': return 'badge-danger';
    case 'WITHDRAWN': return 'badge-neutral';
    case 'EXPIRED': return 'badge-neutral';
    default: return 'badge-neutral';
  }
}

export function companyTargetStatusColor(status: string): string {
  switch (status) {
    case 'DISCOVERED': return 'badge-neutral';
    case 'WATCHING': return 'badge-ocean';
    case 'RESEARCHING': return 'badge-ocean';
    case 'OUTREACH': return 'badge-accent';
    case 'ACTIVE_OPPORTUNITY': return 'badge-brand';
    case 'PAUSED': return 'badge-neutral';
    case 'CLOSED': return 'badge-neutral';
    default: return 'badge-neutral';
  }
}

export function eventRelevanceColor(relevance: string): string {
  switch (relevance) {
    case 'CRITICAL': return 'badge-danger';
    case 'HIGH': return 'badge-warning';
    case 'MEDIUM': return 'badge-ocean';
    case 'BACKGROUND': return 'badge-neutral';
    default: return 'badge-neutral';
  }
}

export function eventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    FUNDING: 'Funding',
    M_AND_A: 'M&A',
    PRODUCT_LAUNCH: 'Product Launch',
    PARTNERSHIP: 'Partnership',
    EXECUTIVE_CHANGE: 'Leadership Change',
    EXPANSION: 'Expansion',
    EARNINGS: 'Earnings',
    STRATEGY: 'Strategy',
    LAYOFF: 'Layoffs',
    HIRING_EXPANSION: 'Hiring Expansion',
    REGULATORY: 'Regulatory',
    RECRUITING_EVENT: 'Recruiting Event',
    INTERNSHIP_OPENED: 'Internship Opened',
    INTERNSHIP_UPDATED: 'Internship Updated',
    INTERNSHIP_CLOSED: 'Internship Closed',
    OTHER_MATERIAL: 'Other',
  };
  return labels[type] || type;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function getLogoColor(name: string): string {
  const colors = [
    'bg-brand-500', 'bg-ocean-500', 'bg-accent-500', 'bg-danger-500',
    'bg-success-500', 'bg-warning-500', 'bg-ink-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
