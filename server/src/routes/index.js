const { Router } = require('express');
const authRoutes = require('./auth.routes');
const ticketRoutes = require('./tickets.routes');
const analyticsRoutes = require('./analytics.routes');
const usersRoutes = require('./users.routes');
const eventsRoutes = require('./events.routes');
const authenticate = require('../middleware/authenticate');
const { getMeta } = require('../controllers/meta.controller');

const router = Router();

// Public: only the login itself (the other /auth routes check the token themselves), and the
// event stream, which proves who you are with a single-use ticket instead of a header.
router.use('/auth', authRoutes);
router.use('/events', eventsRoutes);

// Everything below requires a signed-in user.
router.use(authenticate);
router.use('/tickets', ticketRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/users', usersRoutes);
router.get('/meta', getMeta);

module.exports = router;
