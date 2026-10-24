import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, Flag, FolderOpen, Pencil, Plus, Ticket, User } from 'lucide-react';
import { useCreateTicketMutation, useGetMetaQuery, useUpdateTicketMutation } from '../../api/apiSlice';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../utils/labels';
import ErrorState from '../common/ErrorState';
import FormField, { inputClass } from '../common/FormField';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';
import { useToast } from '../common/Toast';

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5000;

// Mirrors the server's rules so mistakes are caught before a request is sent.
// The server still validates everything, and its messages are shown if it disagrees.
const schema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(TITLE_MAX, `Title must be at most ${TITLE_MAX} characters`),
  description: z.string().trim().min(1, 'Description is required').max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`),
  priority: z.enum(Object.keys(PRIORITY_LABELS)),
  categoryId: z.string().min(1, 'Choose a category'),
  assigneeId: z.string().optional(),
});

const FORM_FIELDS = ['title', 'description', 'priority', 'categoryId', 'assigneeId'];

// Wraps a native <select> so it looks like the design (custom chevron, optional colour dot).
function SelectBox({ dotColor, children, ...props }) {
  return (
    <div className="relative">
      {dotColor && <span className="pointer-events-none absolute left-3.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full" style={{ backgroundColor: dotColor }} aria-hidden="true" />}
      <select {...props} className={`${props.className} appearance-none pr-10 ${dotColor ? 'pl-9' : ''}`}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
    </div>
  );
}

function TicketForm({ ticket, meta, onClose }) {
  const toast = useToast();
  const isEdit = Boolean(ticket);
  const [createTicket] = useCreateTicketMutation();
  const [updateTicket] = useUpdateTicketMutation();
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: ticket?.title ?? '',
      description: ticket?.description ?? '',
      priority: ticket?.priority ?? 'MEDIUM',
      categoryId: ticket ? String(ticket.categoryId) : '',
      assigneeId: '',
    },
  });

  useEffect(() => setFocus('title'), [setFocus]);

  const titleLength = watch('title').length;
  const descriptionLength = watch('description').length;
  const priority = watch('priority');

  const onSubmit = async (values) => {
    setFormError('');
    const body = {
      title: values.title,
      description: values.description,
      priority: values.priority,
      categoryId: Number(values.categoryId),
    };

    try {
      if (isEdit) {
        await updateTicket({ id: ticket.id, ...body }).unwrap();
        toast.success(`Ticket #${ticket.id} updated`);
      } else {
        if (values.assigneeId) body.assigneeId = Number(values.assigneeId);
        const created = await createTicket(body).unwrap();
        toast.success(`Ticket #${created.id} created`);
      }
      onClose();
    } catch (err) {
      // Show the server's field-level messages next to the right inputs.
      const fieldErrors = getFieldErrors(err);
      const known = Object.entries(fieldErrors).filter(([field]) => FORM_FIELDS.includes(field));
      if (known.length) {
        known.forEach(([field, message]) => setError(field, { message }));
      } else {
        setFormError(getErrorMessage(err));
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-5 px-6 py-5">
        {formError && (
          <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {formError}
          </p>
        )}

        <FormField id="title" label="Title" required error={errors.title?.message} counter={`${titleLength}/${TITLE_MAX}`}>
          <input id="title" type="text" placeholder="Enter ticket title…" aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'title-error' : undefined} className={inputClass(errors.title)} {...register('title')} />
        </FormField>

        <FormField id="description" label="Description" required error={errors.description?.message} counter={`${descriptionLength}/${DESCRIPTION_MAX}`}>
          <textarea id="description" rows={4} placeholder="Describe the issue in detail…" aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'description-error' : undefined} className={`${inputClass(errors.description)} resize-y`} {...register('description')} />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="priority" label="Priority" icon={Flag} required error={errors.priority?.message}>
            <SelectBox id="priority" dotColor={PRIORITY_COLORS[priority]} className={inputClass(errors.priority)} {...register('priority')}>
              {meta.priorities.map((p) => (
                <option key={p} value={p} className="bg-surface-solid text-fg">
                  {PRIORITY_LABELS[p] ?? p}
                </option>
              ))}
            </SelectBox>
          </FormField>

          <FormField id="categoryId" label="Category" icon={FolderOpen} required error={errors.categoryId?.message}>
            <SelectBox id="categoryId" aria-invalid={Boolean(errors.categoryId)} aria-describedby={errors.categoryId ? 'categoryId-error' : undefined} className={inputClass(errors.categoryId)} {...register('categoryId')}>
              <option value="" className="bg-surface-solid text-fg">Select category…</option>
              {meta.categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-surface-solid text-fg">
                  {c.name}
                </option>
              ))}
            </SelectBox>
          </FormField>
        </div>

        {!isEdit && (
          <FormField id="assigneeId" label="Assignee" icon={User} hint="Optional. You can also assign later from the ticket page." error={errors.assigneeId?.message}>
            <SelectBox id="assigneeId" className={inputClass(errors.assigneeId)} {...register('assigneeId')}>
              <option value="" className="bg-surface-solid text-fg">Unassigned</option>
              {meta.users.map((u) => (
                <option key={u.id} value={u.id} className="bg-surface-solid text-fg">
                  {u.name}
                </option>
              ))}
            </SelectBox>
          </FormField>
        )}
      </div>

      <div className="mx-6 flex items-center justify-between gap-3 border-t border-line py-5">
        <button type="button" onClick={onClose} disabled={isSubmitting} className="btn-secondary h-11 px-6">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn-primary h-11 px-6">
          {!isSubmitting && (isEdit ? null : <Plus className="h-4 w-4" />)}
          {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create ticket'}
        </button>
      </div>
    </form>
  );
}

// Create when `ticket` is null, edit otherwise. Rendered only while open, so the form
// starts fresh every time it is shown.
export default function TicketFormModal({ open, ticket = null, onClose }) {
  const { data: meta, isLoading, isError, error, refetch } = useGetMetaQuery(undefined, { skip: !open });

  if (!open) return null;

  const isEdit = Boolean(ticket);

  return (
    <Modal
      title={isEdit ? `Edit ticket #${ticket.id}` : 'Create new ticket'}
      subtitle={isEdit ? 'Update the ticket details.' : 'Add a new support ticket to the system.'}
      icon={isEdit ? Pencil : Ticket}
      onClose={onClose}
    >
      {isLoading && <Spinner />}
      {isError && <ErrorState error={error} onRetry={refetch} title="Could not load form options" />}
      {meta && <TicketForm ticket={ticket} meta={meta} onClose={onClose} />}
    </Modal>
  );
}
