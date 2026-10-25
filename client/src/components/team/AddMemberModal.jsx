import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, Eye, EyeOff, UserPlus, Wand2 } from 'lucide-react';
import { useCreateUserMutation } from '../../api/apiSlice';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';
import FormField, { inputClass } from '../common/FormField';
import Modal from '../common/Modal';
import { useToast } from '../common/Toast';

// Same rules as the server (which checks them again).
const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  role: z.enum(['AGENT', 'ADMIN']),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((value) => new TextEncoder().encode(value).length <= 72, 'Password is too long (72 bytes at most)'),
});

const FIELDS = ['name', 'email', 'role', 'password'];
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

// A random 14-character password (no look-alike characters), plus symbols that keep it varied.
function generatePassword() {
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  const body = Array.from(bytes, (n) => ALPHABET[n % ALPHABET.length]).join('');
  const symbols = '#@$%&*!';
  return `${body.slice(0, 7)}${symbols[bytes[0] % symbols.length]}${body.slice(7)}`;
}

export default function AddMemberModal({ onClose }) {
  const toast = useToast();
  const [createUser] = useCreateUserMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', role: 'AGENT', password: '' } });

  const onSubmit = async (values) => {
    setFormError('');
    try {
      const user = await createUser(values).unwrap();
      toast.success(`${user.name} was added to the team`);
      onClose();
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      const known = Object.entries(fieldErrors).filter(([field]) => FIELDS.includes(field));
      if (known.length) {
        known.forEach(([field, message]) => setError(field, { message }));
      } else if (err?.data?.error?.code === 'DUPLICATE_EMAIL') {
        setError('email', { message: err.data.error.message });
      } else {
        setFormError(getErrorMessage(err));
      }
    }
  };

  const generate = () => {
    setValue('password', generatePassword(), { shouldValidate: true });
    setShowPassword(true); // show it so the admin can pass it on
  };

  return (
    <Modal title="Add team member" subtitle="They can sign in straight away with the password you set." icon={UserPlus} onClose={onClose} locked={isSubmitting}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-5 px-6 py-5">
          {formError && (
            <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {formError}
            </p>
          )}

          <FormField id="member-name" label="Full name" required error={errors.name?.message}>
            <input id="member-name" type="text" autoFocus placeholder="e.g. Nora Patel" aria-invalid={Boolean(errors.name)} className={inputClass(errors.name)} {...register('name')} />
          </FormField>

          <FormField id="member-email" label="Email" required error={errors.email?.message}>
            <input id="member-email" type="email" autoComplete="off" placeholder="nora@company.com" aria-invalid={Boolean(errors.email)} className={inputClass(errors.email)} {...register('email')} />
          </FormField>

          <FormField id="member-role" label="Role" required hint="Admins can also delete tickets and manage the team." error={errors.role?.message}>
            <div className="relative">
              <select id="member-role" className={`${inputClass(errors.role)} appearance-none pr-10`} {...register('role')}>
                <option value="AGENT" className="bg-surface-solid text-fg">Agent</option>
                <option value="ADMIN" className="bg-surface-solid text-fg">Admin</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            </div>
          </FormField>

          <FormField id="member-password" label="Password" required hint="At least 8 characters. Share it with them securely." error={errors.password?.message}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input id="member-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" aria-invalid={Boolean(errors.password)} className={`${inputClass(errors.password)} pr-11`} {...register('password')} />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-fg" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button type="button" onClick={generate} className="btn-secondary shrink-0 px-3" title="Fill in a strong random password">
                <Wand2 className="h-4 w-4" />
                <span className="hidden sm:inline">Generate</span>
              </button>
            </div>
          </FormField>
        </div>

        <div className="mx-6 flex items-center justify-between gap-3 border-t border-line py-5">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="btn-secondary h-11 px-6">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary h-11 px-6">
            <UserPlus className="h-4 w-4" />
            {isSubmitting ? 'Adding…' : 'Add member'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
