const { query } = require('../config/db');

const auditLog = (action, entityType) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    if (res.statusCode < 400 && req.user) {
      query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user.id,
          action,
          entityType,
          data?.id || req.params?.id || null,
          JSON.stringify(data),
          req.ip,
          req.headers['user-agent']
        ]
      ).catch(err => console.error('Audit log error:', err.message));
    }
    return originalJson(data);
  };
  next();
};

module.exports = { auditLog };
