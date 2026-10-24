const { Router } = require('express');
const controller = require('../controllers/analytics.controller');
const validate = require('../middleware/validate');
const { analyticsQuery } = require('../validators/list.validators');

const router = Router();
const withRange = validate({ query: analyticsQuery });

router.get('/summary', withRange, controller.summary);
router.get('/by-status', withRange, controller.byStatus);
router.get('/by-priority', withRange, controller.byPriority);

module.exports = router;
