const { Router } = require('express');
const ticketRoutes = require('./tickets.routes');
const { getMeta } = require('../controllers/meta.controller');

const router = Router();

router.use('/tickets', ticketRoutes);
router.get('/meta', getMeta);

module.exports = router;
