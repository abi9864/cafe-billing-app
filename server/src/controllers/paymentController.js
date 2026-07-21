const { Payment, Order } = require('../models');

exports.processPayment = async (req, res, next) => {
  try {
    const { order_id, method, amount, amount_received, reference, split_details } = req.body;

    const order = await Order.findByPk(order_id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.status === 'cancelled') return res.status(400).json({ error: 'Cannot pay for cancelled order.' });

    const existingPayment = await Payment.findOne({ where: { order_id } });
    if (existingPayment && existingPayment.status === 'completed') {
      return res.status(400).json({ error: 'Order already paid.' });
    }

    let changeAmount = 0;
    if (method === 'cash' && amount_received) {
      changeAmount = parseFloat(amount_received) - parseFloat(order.total);
    }

    const payment = await Payment.create({
      order_id,
      method,
      amount: order.total,
      amount_received: amount_received || null,
      change_amount: changeAmount > 0 ? changeAmount : 0,
      reference,
      status: 'completed',
      split_details: method === 'split' ? split_details : null,
    });

    await order.update({ status: 'completed' });

    res.status(201).json({ message: 'Payment processed.', payment, change: changeAmount > 0 ? changeAmount : 0 });
  } catch (error) {
    next(error);
  }
};

exports.getPaymentByOrder = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      where: { order_id: req.params.orderId },
      include: [{ model: Order }],
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found.' });
    res.json({ payment });
  } catch (error) {
    next(error);
  }
};

exports.refundPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found.' });
    if (payment.status === 'refunded') return res.status(400).json({ error: 'Already refunded.' });

    await payment.update({ status: 'refunded' });
    const order = await Order.findByPk(payment.order_id);
    if (order) await order.update({ status: 'cancelled' });

    res.json({ message: 'Payment refunded.', payment });
  } catch (error) {
    next(error);
  }
};
