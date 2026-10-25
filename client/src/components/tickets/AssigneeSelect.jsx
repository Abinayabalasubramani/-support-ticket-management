import { ChevronDown } from 'lucide-react';
import { inputClass } from '../common/FormField';

// `current` is the ticket's assignee as the server sent it. It is always shown, even when the
// people list in the cache is older than the assignment (for example a team member who was
// added a moment ago), so the box never claims "Unassigned" for an assigned ticket.
export default function AssigneeSelect({ id, value, current, users, disabled, onChange }) {
  const options = current && !users.some((u) => u.id === current.id) ? [...users, current] : users;

  return (
    <div className="relative">
      <select
        id={id}
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={`${inputClass(false)} appearance-none pr-10 disabled:opacity-60`}
      >
        <option value="" className="bg-surface-solid text-fg">Unassigned</option>
        {options.map((u) => (
          <option key={u.id} value={u.id} className="bg-surface-solid text-fg">
            {u.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
    </div>
  );
}
