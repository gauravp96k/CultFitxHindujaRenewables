const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const security = require('./config/security');
const startupCheck = require('./config/startupCheck');

// Load environment variables
dotenv.config();

// Validate critical configuration before doing anything else.
// In production this aborts the boot on unsafe config; in development it only warns.
startupCheck();

// Connect to MongoDB database
connectDB();

const app = express();

// Running behind Nginx: trust the one proxy hop so req.ip (and the rate limiter) see the real client IP.
app.set('trust proxy', 1);

// Apply Security Middlewares (OWASP Protection)
app.use(security.helmet);
app.use(security.cors);
app.use('/api', security.apiLimiter); // general per-IP rate limit across the API

// Gym bulk upload sends the whole centre list (~360 KB for 1,931 gyms), so only this route gets a bigger limit.
// It must be registered BEFORE the global parser; the global 10 KB limit still protects every other route.
app.use('/api/v1/gyms/bulk-upload', express.json({ limit: '1mb' }));
app.use(express.json({ limit: '10kb' })); // Body limit to prevent JSON payload attacks
app.use(security.mongoSanitize); // Sanitize data against NoSQL injection (OWASP A03)

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'Cult.fit Corporate Wellness Portal API is running securely.' });
});

// API Routes
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/packages', require('./routes/packageRoutes'));
app.use('/api/v1/gyms', require('./routes/gymRoutes'));
app.use('/api/v1/requests', require('./routes/requestRoutes'));
app.use('/api/v1/hr', require('./routes/hrRoutes'));

const PORT = process.env.PORT || 5000;

// Express 5 passes listen errors (e.g. port already in use) to this callback instead of
// throwing, so without this check the process keeps running without serving anything.
app.listen(PORT, (err) => {
  if (err) {
    if (err.code === 'EADDRINUSE') {
      console.error(`[startup] ERROR: Port ${PORT} is already in use. Stop the other backend (or change PORT in .env) and start again.`);
    } else {
      console.error('[startup] ERROR: Server could not start:', err.message);
    }
    process.exit(1);
  }
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
