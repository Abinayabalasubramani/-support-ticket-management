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

module.exports = { idParams, createTicketBody, updateTicketBody, statusBody, assigneeBody };
