const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');

// Rate limiter to prevent brute-force attacks on auth (OWASP A07)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Please try again later.' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300
});

const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Safe sanitizer wrapper to avoid modifying getter-only req.query on newer Node.js versions
const safeMongoSanitize = (req, res, next) => {
  if (req.body) req.body = mongoSanitize.sanitize(req.body);
  if (req.params) req.params = mongoSanitize.sanitize(req.params);
  if (req.headers) req.headers = mongoSanitize.sanitize(req.headers);
  next();
};

module.exports = {
  helmet: helmet(),
  cors: cors(corsOptions),
  authLimiter,
  apiLimiter,
  mongoSanitize: safeMongoSanitize
};