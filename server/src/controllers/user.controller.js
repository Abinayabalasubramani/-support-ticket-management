const service = require('../services/user.service');
const events = require('../events/ticketEvents');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  res.json(await service.listUsers());
});

const create = asyncHandler(async (req, res) => {
  const user = await service.createUser(req.body);
  // Other open sessions refresh their assignee lists.
  events.publish({ type: 'user.created', ids: [user.id], origin: req.get('x-client-id') || null });
  res.status(201).json(user);
});

module.exports = { list, create };
