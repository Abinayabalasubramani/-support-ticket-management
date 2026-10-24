const service = require('../services/auth.service');
const streamTickets = require('../events/streamTickets');
const asyncHandler = require('../utils/asyncHandler');

const login = asyncHandler(async (req, res) => {
  res.json(await service.login(req.body.email, req.body.password));
});

const me = asyncHandler(async (req, res) => {
  res.json(await service.getCurrentUser(req.user.id));
});

// A one-time pass for opening the live-update stream (see events/streamTickets.js).
const streamTicket = asyncHandler(async (req, res) => {
  res.json({ ticket: streamTickets.issue(req.user.id), expiresInSeconds: streamTickets.TTL_SECONDS });
});

module.exports = { login, me, streamTicket };
