const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', paymentController.processPayment);
router.get('/order/:orderId', paymentController.getPaymentByOrder);
router.post('/:id/refund', paymentController.refundPayment);

module.exports = router;
