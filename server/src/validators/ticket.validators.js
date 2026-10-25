const { z } = require('zod');
const { STATUSES, PRIORITIES } = require('../utils/statusTransitions');
const { id } = require('./common');

const title = z.string().trim().min(1, 'Title is required').max(200, 'Title must be at most 200 characters');
const description = z
  .string()
  .trim()
  .min(1, 'Description is required')
  .max(5000, 'Description must be at most 5000 characters');
const priority = z.enum(PRIORITIES);

const idParams = z.object({ id });

const createTicketBody = z.strictObject({
  title,
  description,
  priority: priority.default('MEDIUM'),
  categoryId: id,
  assigneeId: id.nullable().optional(),
});

const updateTicketBody = z
  .strictObject({
    title: title.optional(),
    description: description.optional(),
    priority: priority.optional(),
    categoryId: id.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

const statusBody = z.strictObject({ status: z.enum(STATUSES) });

const assigneeBody = z.strictObject({ assigneeId: id.nullable() });

// The complete list of collaborators (an empty list removes them all). Duplicates collapse.
const MAX_COLLABORATORS = 10;
const collaboratorsBody = z.strictObject({
  userIds: z
    .array(id)
    .max(MAX_COLLABORATORS, `At most ${MAX_COLLABORATORS} collaborators per ticket`)
    .transform((ids) => [...new Set(ids)]),
});

const MAX_BULK = 100;

// One action per request: change the status OR the assignee of every listed ticket.
// assigneeId: null means "unassign". Duplicate ids are collapsed.
const bulkBody = z
  .strictObject({
    ids: z
      .array(id)
      .min(1, 'Select at least one ticket')
      .max(MAX_BULK, `At most ${MAX_BULK} tickets per request`)
      .transform((ids) => [...new Set(ids)]),
    status: z.enum(STATUSES).optional(),
    assigneeId: id.nullable().optional(),
  })
  .refine((v) => (v.status !== undefined) !== (v.assigneeId !== undefined), {
    message: 'Provide exactly one of "status" or "assigneeId"',
    path: ['status'],
  });

module.exports = { idParams, createTicketBody, updateTicketBody, statusBody, assigneeBody, collaboratorsBody, bulkBody, MAX_BULK };
