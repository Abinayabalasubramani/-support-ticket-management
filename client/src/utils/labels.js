// Display text and colours for the enum values the API returns.
export const STATUS_LABELS = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const PRIORITY_LABELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const STATUS_STYLES = {
  OPEN: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  CLOSED: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

export const PRIORITY_STYLES = {
  LOW: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  MEDIUM: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  HIGH: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  CRITICAL: 'bg-red-50 text-red-700 ring-red-600/20',
};

// Chart colours (hex, because SVG fills can't use Tailwind classes).
export const STATUS_COLORS = {
  OPEN: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  RESOLVED: '#10b981',
  CLOSED: '#94a3b8',
};

export const PRIORITY_COLORS = {
  LOW: '#94a3b8',
  MEDIUM: '#eab308',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};
