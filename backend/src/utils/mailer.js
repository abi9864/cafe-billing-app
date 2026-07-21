const nodemailer = require('nodemailer');

// All SMTP settings come from env vars — see backend/.env.example.
// If they're not set, alerts are skipped with a console warning instead of
// crashing anything that calls sendLowStockAlert.
let transporter = null;
const isConfigured = () =>
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.ALERT_EMAIL_TO;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
};

// Called when an inventory item's stock crosses at-or-below its reorder
// level. Fire-and-forget — callers don't await this in a way that blocks
// the actual stock update from completing.
const sendLowStockAlert = async (item) => {
  if (!isConfigured()) {
    console.warn(`⚠️  Low stock on "${item.item_name}" (${item.quantity_on_hand} ${item.unit_of_measure || ''} left) — SMTP not configured, skipping email. See backend/.env.example`);
    return;
  }
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.ALERT_EMAIL_TO,
      subject: `Low stock: ${item.item_name}`,
      text: `${item.item_name} is at ${item.quantity_on_hand} ${item.unit_of_measure || ''}, at or below its reorder level of ${item.reorder_level} ${item.unit_of_measure || ''}.\n\nReorder quantity suggested: ${item.reorder_quantity || 'not set'}.`,
      html: `<p><strong>${item.item_name}</strong> is at <strong>${item.quantity_on_hand} ${item.unit_of_measure || ''}</strong>, at or below its reorder level of ${item.reorder_level} ${item.unit_of_measure || ''}.</p><p>Reorder quantity suggested: ${item.reorder_quantity || 'not set'}.</p>`
    });
    console.log(`✅ Low-stock alert email sent for "${item.item_name}" to ${process.env.ALERT_EMAIL_TO}`);
  } catch (err) {
    // Never let a failed email break the stock update / order completion that triggered it
    console.error('Failed to send low-stock alert email:', err.message);
  }
};

module.exports = { sendLowStockAlert };
