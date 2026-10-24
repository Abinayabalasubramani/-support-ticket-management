const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

export default function Avatar({ name, size = 'h-8 w-8 text-xs' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-primary-soft font-semibold text-primary ${size}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
