// backend/config/db.js
//
// Phase 1 — SSL now driven by DB_SSL env var instead of NODE_ENV check.
// Set DB_SSL=true in your Aiven .env; leave unset or false for local dev.

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host:    process.env.DB_HOST,
    port:    process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    },
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('MySQL connection working via Sequelize');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
