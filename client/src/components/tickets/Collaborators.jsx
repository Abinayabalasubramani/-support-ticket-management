import { ChevronDown, X } from 'lucide-react';
import Avatar from '../common/Avatar';
import { inputClass } from '../common/FormField';

// The people on a ticket besides its assignee: removable chips and an "Add collaborator" list.
// `onChange` receives the complete new list of user ids (the API replaces the whole list).
export default function Collaborators({ ticket, users, onChange, disabled }) {
  const collaborators = ticket.collaborators ?? [];
  const taken = new Set([ticket.assigneeId, ...collaborators.map((c) => c.id)]);
  const available = users.filter((u) => !taken.has(u.id));
  const ids = collaborators.map((c) => c.id);

  return (
    <div className="space-y-3">
      {collaborators.length === 0 ? (
        <p className="text-sm text-faint">No collaborators yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label="Collaborators">
          {collaborators.map((person) => (
            <li key={person.id} className="flex items-center gap-2 rounded-full border border-line bg-surface-2 py-1 pl-1 pr-2 text-sm text-fg">
              <Avatar name={person.name} size="h-6 w-6 text-[10px]" />
              {person.name}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(ids.filter((id) => id !== person.id))}
                className="rounded-full p-0.5 text-muted hover:text-fg disabled:opacity-50"
                aria-label={`Remove ${person.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        {/* value is always "" so the control resets after each choice */}
        <select
          value=""
          disabled={disabled || available.length === 0}
          onChange={(e) => e.target.value && onChange([...ids, Number(e.target.value)])}
          aria-label="Add a collaborator"
          className={`${inputClass(false)} appearance-none pr-10 disabled:opacity-60`}
        >
          <option value="" className="bg-surface-solid text-fg">{available.length === 0 ? 'Everyone is already on this ticket' : 'Add collaborator…'}</option>
          {available.map((u) => (
            <option key={u.id} value={u.id} className="bg-surface-solid text-fg">
              {u.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      </div>
    </div>
  );
}
