// Turns the dashboard's range choice into the { from, to } the API expects (YYYY-MM-DD, UTC).
// "All time" sends no dates at all.
const isoDay = (date) => date.toISOString().slice(0, 10);

export const today = () => isoDay(new Date());

const daysAgo = (days) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (days - 1)); // "last 7 days" includes today
  return isoDay(d);
};

export const RANGE_OPTIONS = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'all', label: 'All time' },
  { key: 'custom', label: 'Custom' },
];

export function rangeFor(key, custom) {
  if (key === '7d') return { from: daysAgo(7), to: today() };
  if (key === '30d') return { from: daysAgo(30), to: today() };
  if (key === 'custom') return { from: custom.from, to: custom.to };
  return { from: '', to: '' };
}

export const RANGE_PHRASE = {
  '7d': 'over the last 7 days',
  '30d': 'over the last 30 days',
  all: 'since the first ticket',
  custom: 'in the selected range',
};
