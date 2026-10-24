const { z } = require('zod');
const { STATUSES, PRIORITIES } = require('../utils/statusTransitions');
const { id, blankToUndefined, csv, dateRangeFields, fromBeforeTo } = require('./common');

const SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'priority', 'status'];

const listTicketsQuery = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(SORT_FIELDS).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.preprocess(blankToUndefined, z.string().trim().max(100).optional()),
  status: csv(z.enum(STATUSES)),
  priority: csv(z.enum(PRIORITIES)),
  category: csv(id),
  // ids and/or the keyword "unassigned"
  assignee: csv(z.union([z.literal('unassigned'), id])),
});

const analyticsQuery = z.object(dateRangeFields).refine(fromBeforeTo, {
  message: '"from" must not be after "to"',
  path: ['from'],
});

module.exports = { listTicketsQuery, analyticsQuery, SORT_FIELDS };
