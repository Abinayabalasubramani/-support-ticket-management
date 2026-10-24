const service = require('../services/analytics.service');
const asyncHandler = require('../utils/asyncHandler');

const summary = asyncHandler(async (req, res) => {
  res.json(await service.getSummary(req.query));
});

const byStatus = asyncHandler(async (req, res) => {
  res.json(await service.getByStatus(req.query));
});

const byPriority = asyncHandler(async (req, res) => {
  res.json(await service.getByPriority(req.query));
});

const volume = asyncHandler(async (req, res) => {
  res.json(await service.getVolume(req.query));
});

module.exports = { summary, byStatus, byPriority, volume };
