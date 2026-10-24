const { Router } = require('express');
const ticketRoutes = require('./tickets.routes');
const analyticsRoutes = require('./analytics.routes');
const eventsRoutes = require('./events.routes');
const { getMeta } = require('../controllers/meta.controller');

const router = Router();

router.use('/tickets', ticketRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/events', eventsRoutes);
router.get('/meta', getMeta);

module.exports = router;
