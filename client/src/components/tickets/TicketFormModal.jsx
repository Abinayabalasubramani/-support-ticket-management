import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateTicketMutation, useGetMetaQuery, useUpdateTicketMutation } from '../../api/apiSlice';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';
import { PRIORITY_LABELS } from '../../utils/labels';
import ErrorState from '../common/ErrorState';
import FormField, { inputClass } from '../common/FormField';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';
import { useToast } from '../common/Toast';

// Mirrors the server's rules so mistakes are caught before a request is sent.
// The server still validates everything, and its messages are shown if it disagrees.
const schema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  description: z.string().trim().min(1, 'Description is required').max(5000, 'Description must be at most 5000 characters'),
  priority: z.enum(Object.keys(PRIORITY_LABELS)),
  categoryId: z.string().min(1, 'Choose a category'),
  assigneeId: z.string().optional(),
});

const FORM_FIELDS = ['title', 'description', 'priority', 'categoryId', 'assigneeId'];

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
      <div className="space-y-4 px-6 py-5">
        {formError && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        )}

        <FormField id="title" label="Title" required error={errors.title?.message}>
          <input id="title" type="text" maxLength={220} placeholder="Short summary of the problem" aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'title-error' : undefined} className={inputClass(errors.title)} {...register('title')} />
        </FormField>

        <FormField id="description" label="Description" required error={errors.description?.message}>
          <textarea id="description" rows={4} placeholder="What happened? What did the customer expect?" aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'description-error' : undefined} className={inputClass(errors.description)} {...register('description')} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="priority" label="Priority" required error={errors.priority?.message}>
            <select id="priority" className={inputClass(errors.priority)} {...register('priority')}>
              {meta.priorities.map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p] ?? p}</option>
              ))}
            </select>
          </FormField>

          <FormField id="categoryId" label="Category" required error={errors.categoryId?.message}>
            <select id="categoryId" aria-invalid={Boolean(errors.categoryId)} aria-describedby={errors.categoryId ? 'categoryId-error' : undefined} className={inputClass(errors.categoryId)} {...register('categoryId')}>
              <option value="">Select a category…</option>
              {meta.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </FormField>
        </div>

        {!isEdit && (
          <FormField id="assigneeId" label="Assignee" hint="Optional. You can assign later from the ticket page." error={errors.assigneeId?.message}>
            <select id="assigneeId" className={inputClass(errors.assigneeId)} {...register('assigneeId')}>
              <option value="">Unassigned</option>
              {meta.users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </FormField>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
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

  return (
    <Modal title={ticket ? `Edit ticket #${ticket.id}` : 'New ticket'} onClose={onClose}>
      {isLoading && <Spinner />}
      {isError && <ErrorState error={error} onRetry={refetch} title="Could not load form options" />}
      {meta && <TicketForm ticket={ticket} meta={meta} onClose={onClose} />}
    </Modal>
  );
}
