// backend/server.js
const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const { sequelize, connectDB } = require('./config/db');
const logger        = require('./config/logger');
const requestLogger = require('./middleware/requestLogger');
const errorHandler  = require('./middleware/errorHandler');

const authRoutes       = require('./routes/authRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const menuRoutes       = require('./routes/menuRoutes');
const cartRoutes       = require('./routes/cartRoutes');
const orderRoutes      = require('./routes/orderRoutes');
const paymentRoutes    = require('./routes/paymentRoutes');
const driverRoutes     = require('./routes/driverRoutes');
const addressRoutes    = require('./routes/addressRoutes');

const app = express();

// 1. FRONT DOOR LOGGER
app.use(requestLogger);   // Must be the first middleware

app.use(cors());
app.use(express.json());

// 2. MOUNT ALL ROUTES
app.use('/api/auth',        authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu-items',  menuRoutes);
app.use('/api/cart',        cartRoutes);
app.use('/api/orders',      orderRoutes);
app.use('/api/payments',    paymentRoutes);
app.use('/api/drivers',     driverRoutes);
app.use('/api/addresses',   addressRoutes);

// 3. HEALTH CHECK
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({ status: 'OK', db: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', db: 'disconnected' });
  }
});

// 4. SAFETY NET ERROR HANDLER
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    logger.info({
      port: PORT,
      env:  process.env.NODE_ENV ?? 'development',
    }, 'SaporiVivi backend running');
  });
};

startServer();