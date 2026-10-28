const mongoose = require('mongoose');

/**
 * One-time password store, keyed by corporate email.
 *
 * The auth controller upserts a single document per email: it stores the HMAC
 * hash of the current OTP (never the code itself), its expiry, the number of
 * verification attempts, and send-throttling counters. `cleanupAt` carries a
 * TTL index so stale documents are removed automatically by MongoDB.
 */
const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },

    // HMAC-SHA256 of `${email}:${code}` (see utils/otp.js). Null once consumed/expired.
    otpHash: { type: String, default: null },
    expiresAt: { type: Date, default: null },

    // Wrong-attempt counter for the current OTP (reset on each new send).
    attempts: { type: Number, default: 0 },

    // Send throttling: cooldown (lastSentAt) and per-hour window (windowStart/sendCount).
    lastSentAt: { type: Date, default: null },
    sendCount: { type: Number, default: 0 },
    windowStart: { type: Date, default: null },

    // TTL anchor: Mongo removes the document ~at this time.
    cleanupAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-expire stale OTP docs. `expireAfterSeconds: 0` means "remove when cleanupAt passes".
otpSchema.index({ cleanupAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
