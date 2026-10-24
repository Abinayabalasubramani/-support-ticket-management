const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { createLoginLimiter } = require('../middleware/rateLimiter');
const { loginBody } = require('../validators/auth.validators');
const { NODE_ENV } = require('../config/env');

const router = Router();

// Tests make many logins on purpose; the limit itself is tested on a small app.
const loginLimiter = createLoginLimiter({ skip: () => NODE_ENV === 'test' });

router.post('/login', loginLimiter, validate({ body: loginBody }), controller.login); // the only public API route
router.get('/me', authenticate, controller.me);
router.post('/stream-ticket', authenticate, controller.streamTicket);

module.exports = router;
