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

// Pills: tinted background that reads on both the light and the dark theme.
export const STATUS_STYLES = {
  OPEN: 'bg-blue-500/15 text-blue-700 ring-blue-500/30 dark:text-blue-300',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-300',
  RESOLVED: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300',
  CLOSED: 'bg-slate-500/15 text-slate-600 ring-slate-500/30 dark:text-slate-300',
};

// Hex colours (SVG charts and small dots can't use Tailwind classes).
export const STATUS_COLORS = {
  OPEN: '#3d7bff',
  IN_PROGRESS: '#f5a524',
  RESOLVED: '#2fd3a0',
  CLOSED: '#7f8fb8',
};

export const PRIORITY_COLORS = {
  LOW: '#7f8fb8',
  MEDIUM: '#3d7bff',
  HIGH: '#f5a524',
  CRITICAL: '#f0566b',
};
