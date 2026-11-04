require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/db');
const registerSocketHandlers = require('./sockets/socketHandler');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const driverRoutes = require('./routes/driverRoutes');
const adminRoutes = require('./routes/adminRoutes');
const geocodeRoutes = require('./routes/geocodeRoutes');

connectDB();

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
});

app.set('io', io);

app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is running' }));

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/geocode', geocodeRoutes);

registerSocketHandlers(io);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

module.exports = { app, server, io };
