const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { canTransition, allowedNext } = require('../utils/statusTransitions');

const ticketInclude = {
  category: true,
  assignee: { select: { id: true, name: true, email: true } },
};

const withTransitions = (ticket) => ({ ...ticket, allowedTransitions: allowedNext(ticket.status) });

const getTicketOrThrow = async (id, db = prisma) => {
  const ticket = await db.ticket.findUnique({ where: { id }, include: ticketInclude });
  if (!ticket) throw AppError.notFound(`Ticket ${id} not found`);
  return ticket;
};

const assertCategoryExists = async (categoryId) => {
  const found = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!found) throw AppError.notFound(`Category ${categoryId} not found`);
};

const assertUserExists = async (userId) => {
  const found = await prisma.user.findUnique({ where: { id: userId } });
  if (!found) throw AppError.notFound(`User ${userId} not found`);
};

async function createTicket({ title, description, priority, categoryId, assigneeId }) {
  await assertCategoryExists(categoryId);
  if (assigneeId != null) await assertUserExists(assigneeId);

  // The ticket and its first history row are written together or not at all.
  const ticket = await prisma.ticket.create({
    data: {
      title,
      description,
      priority,
      categoryId,
      assigneeId: assigneeId ?? null,
      history: { create: { fromStatus: null, toStatus: 'OPEN' } },
    },
    include: ticketInclude,
  });
  return withTransitions(ticket);
}

async function getTicket(id) {
  return withTransitions(await getTicketOrThrow(id));
}

async function updateTicket(id, changes) {
  await getTicketOrThrow(id);
  if (changes.categoryId !== undefined) await assertCategoryExists(changes.categoryId);

  const ticket = await prisma.ticket.update({
    where: { id },
    data: changes,
    include: ticketInclude,
  });
  return withTransitions(ticket);
}

// Prisma closes an interactive transaction after 5 s by default. Be explicit, with room for
// a slow database connection (the work inside is only a few small queries).
const TX_OPTIONS = { maxWait: 10000, timeout: 30000 };

async function changeStatus(id, newStatus) {
  return prisma.$transaction(async (tx) => {
    const current = await getTicketOrThrow(id, tx);

    if (!canTransition(current.status, newStatus)) {
      const allowed = allowedNext(current.status);
      throw AppError.conflict(
        'INVALID_STATUS_TRANSITION',
        allowed.length
          ? `Cannot change status from ${current.status} to ${newStatus}. Allowed: ${allowed.join(', ')}`
          : `Cannot change status from ${current.status}: it is a final status`
      );
    }

    // Compare-and-set: if another request changed the status meanwhile, nothing is updated.
    const { count } = await tx.ticket.updateMany({
      where: { id, status: current.status },
      data: { status: newStatus },
    });
    if (count === 0) {
      throw AppError.conflict('STATUS_CHANGED', 'Ticket status was changed by someone else. Reload and retry');
    }

    await tx.statusHistory.create({
      data: { ticketId: id, fromStatus: current.status, toStatus: newStatus },
    });

    return withTransitions(await getTicketOrThrow(id, tx));
  }, TX_OPTIONS);
}

async function assignTicket(id, assigneeId) {
  await getTicketOrThrow(id);
  if (assigneeId !== null) await assertUserExists(assigneeId);

  const ticket = await prisma.ticket.update({
    where: { id },
    data: { assigneeId },
    include: ticketInclude,
  });
  return withTransitions(ticket);
}

const failure = (id, code, message) => ({ id, ok: false, code, message });

// Change the status or the assignee of many tickets at once.
// Every ticket is judged on its own: the ones that can be updated are, the others are
// reported with the reason, so one bad ticket never blocks the rest.
async function bulkUpdate({ ids, status, assigneeId }) {
  if (assigneeId != null) await assertUserExists(assigneeId); // a wrong assignee is a request error, not a per-ticket one

  const found = await prisma.ticket.findMany({ where: { id: { in: ids } }, select: { id: true, status: true } });
  const byId = new Map(found.map((t) => [t.id, t]));

  const results = new Map();
  const eligible = [];

  for (const id of ids) {
    const ticket = byId.get(id);
    if (!ticket) {
      results.set(id, failure(id, 'NOT_FOUND', `Ticket ${id} not found`));
    } else if (status !== undefined && !canTransition(ticket.status, status)) {
      const allowed = allowedNext(ticket.status);
      results.set(
        id,
        failure(
          id,
          'INVALID_STATUS_TRANSITION',
          allowed.length
            ? `Cannot change status from ${ticket.status} to ${status}. Allowed: ${allowed.join(', ')}`
            : `Cannot change status from ${ticket.status}: it is a final status`
        )
      );
    } else {
      eligible.push(ticket);
    }
  }

  if (eligible.length > 0) {
    await prisma.$transaction(async (tx) => {
      if (status !== undefined) {
        // One UPDATE per starting status (at most 3), instead of one per ticket.
        const groups = new Map();
        for (const t of eligible) groups.set(t.status, [...(groups.get(t.status) ?? []), t.id]);

        for (const [from, groupIds] of groups) {
          const { count } = await tx.ticket.updateMany({ where: { id: { in: groupIds }, status: from }, data: { status } });
          if (count !== groupIds.length) {
            // Someone changed a ticket after we read it. Undo everything and let the caller retry.
            throw AppError.conflict('STATUS_CHANGED', 'Some tickets were changed by someone else while updating. Reload and retry');
          }
          await tx.statusHistory.createMany({ data: groupIds.map((ticketId) => ({ ticketId, fromStatus: from, toStatus: status })) });
        }
      } else {
        await tx.ticket.updateMany({ where: { id: { in: eligible.map((t) => t.id) } }, data: { assigneeId } });
      }
    }, TX_OPTIONS);
    for (const t of eligible) results.set(t.id, { id: t.id, ok: true });
  }

  const ordered = ids.map((id) => results.get(id));
  const succeeded = ordered.filter((r) => r.ok).length;
  return { results: ordered, summary: { requested: ids.length, succeeded, failed: ids.length - succeeded } };
}

async function deleteTicket(id) {
  await getTicketOrThrow(id);
  await prisma.ticket.delete({ where: { id } });
}

async function getHistory(id) {
  await getTicketOrThrow(id);
  return prisma.statusHistory.findMany({
    where: { ticketId: id },
    orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
  });
}

async function listTickets({ page, limit, sortBy, order, search, status, priority, category, assignee }) {
  const and = [];

  if (status) and.push({ status: { in: status } });
  if (priority) and.push({ priority: { in: priority } });
  if (category) and.push({ categoryId: { in: category } });

  if (assignee) {
    const ids = assignee.filter((a) => a !== 'unassigned');
    const includeUnassigned = assignee.includes('unassigned');
    const options = [];
    if (ids.length) options.push({ assigneeId: { in: ids } });
    if (includeUnassigned) options.push({ assigneeId: null });
    and.push({ OR: options });
  }

  if (search) {
    // Prisma does not escape LIKE wildcards, so "%" and "_" would match everything.
    const term = search.replace(/[\\%_]/g, '\\$&');
    and.push({
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ],
    });
  }

  const where = and.length ? { AND: and } : {};

  // id is the tie-breaker so rows never repeat or vanish between pages.
  const orderBy = [{ [sortBy]: order }, { id: order }];

  // Rows and total use the same `where`, so pagination always matches the filters.
  const [rows, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: ticketInclude,
    }),
    prisma.ticket.count({ where }),
  ]);

  return {
    data: rows.map(withTransitions),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

module.exports = {
  listTickets,
  createTicket,
  getTicket,
  updateTicket,
  changeStatus,
  assignTicket,
  bulkUpdate,
  deleteTicket,
  getHistory,
};
