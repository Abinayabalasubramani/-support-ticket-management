const service = require('../services/ticket.service');
const events = require('../events/ticketEvents');
const asyncHandler = require('../utils/asyncHandler');

// Tell every open browser that tickets changed. Called only after the change succeeded.
const announce = (req, type, ids) => events.publish({ type, ids, origin: req.get('x-client-id') || null });

const list = asyncHandler(async (req, res) => {
  res.json(await service.listTickets(req.query));
});

const create = asyncHandler(async (req, res) => {
  const ticket = await service.createTicket(req.body);
  announce(req, 'ticket.created', [ticket.id]);
  res.status(201).json(ticket);
});

const getOne = asyncHandler(async (req, res) => {
  res.json(await service.getTicket(req.params.id));
});

const update = asyncHandler(async (req, res) => {
  const ticket = await service.updateTicket(req.params.id, req.body);
  announce(req, 'ticket.updated', [ticket.id]);
  res.json(ticket);
});

const changeStatus = asyncHandler(async (req, res) => {
  const ticket = await service.changeStatus(req.params.id, req.body.status);
  announce(req, 'ticket.updated', [ticket.id]);
  res.json(ticket);
});

const assign = asyncHandler(async (req, res) => {
  const ticket = await service.assignTicket(req.params.id, req.body.assigneeId);
  announce(req, 'ticket.updated', [ticket.id]);
  res.json(ticket);
});

const bulk = asyncHandler(async (req, res) => {
  const result = await service.bulkUpdate(req.body);
  const changed = result.results.filter((r) => r.ok).map((r) => r.id);
  if (changed.length > 0) announce(req, 'tickets.bulk', changed);
  res.json(result);
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteTicket(req.params.id);
  announce(req, 'ticket.deleted', [req.params.id]);
  res.status(204).send();
});

const history = asyncHandler(async (req, res) => {
  res.json(await service.getHistory(req.params.id));
});

const activity = asyncHandler(async (req, res) => {
  res.json(await service.getActivity(req.params.id));
});

module.exports = { list, create, getOne, update, changeStatus, assign, bulk, remove, history, activity };
