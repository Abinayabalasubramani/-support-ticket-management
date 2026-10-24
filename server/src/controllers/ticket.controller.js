const service = require('../services/ticket.service');
const asyncHandler = require('../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createTicket(req.body));
});

const getOne = asyncHandler(async (req, res) => {
  res.json(await service.getTicket(req.params.id));
});

const update = asyncHandler(async (req, res) => {
  res.json(await service.updateTicket(req.params.id, req.body));
});

const changeStatus = asyncHandler(async (req, res) => {
  res.json(await service.changeStatus(req.params.id, req.body.status));
});

const assign = asyncHandler(async (req, res) => {
  res.json(await service.assignTicket(req.params.id, req.body.assigneeId));
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteTicket(req.params.id);
  res.status(204).send();
});

const history = asyncHandler(async (req, res) => {
  res.json(await service.getHistory(req.params.id));
});

module.exports = { create, getOne, update, changeStatus, assign, remove, history };
