const { Router } = require('express');
const controller = require('../controllers/ticket.controller');
const validate = require('../middleware/validate');
const v = require('../validators/ticket.validators');
const { listTicketsQuery } = require('../validators/list.validators');

const router = Router();

router.get('/', validate({ query: listTicketsQuery }), controller.list);
router.post('/', validate({ body: v.createTicketBody }), controller.create);
router.get('/:id', validate({ params: v.idParams }), controller.getOne);
router.put('/:id', validate({ params: v.idParams, body: v.updateTicketBody }), controller.update);
router.patch('/:id/status', validate({ params: v.idParams, body: v.statusBody }), controller.changeStatus);
router.patch('/:id/assignee', validate({ params: v.idParams, body: v.assigneeBody }), controller.assign);
router.delete('/:id', validate({ params: v.idParams }), controller.remove);
router.get('/:id/history', validate({ params: v.idParams }), controller.history);

module.exports = router;
