const mongoose = require('mongoose');

// Atomic sequence numbers (used for opt-in reference IDs).
const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } }, { versionKey: false });

module.exports = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
