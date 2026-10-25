const { Router } = require('express');
const controller = require('../controllers/user.controller');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { createUserBody } = require('../validators/user.validators');

const router = Router();

// Managing the team is for admins only.
router.use(requireRole('ADMIN'));

router.get('/', controller.list);
router.post('/', validate({ body: createUserBody }), controller.create);

module.exports = router;
