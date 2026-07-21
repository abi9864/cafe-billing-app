const app = require('./app');
const config = require('./config/env');
const { sequelize } = require('./models');

const PORT = config.port;

const start = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connected successfully.');

    // Sync models (use migrations in production)
    if (config.nodeEnv === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Models synced.');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} in ${config.nodeEnv} mode`);
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error.message);
    process.exit(1);
  }
};

start();
