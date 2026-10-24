import { inputClass } from '../common/FormField';

export default function AssigneeSelect({ id, value, users, disabled, onChange }) {
  return (
    <select
      id={id}
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className={`${inputClass(false)} disabled:opacity-60`}
    >
      <option value="">Unassigned</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name}
        </option>
      ))}
    </select>
  );
}
