const mongoose = require('mongoose');

const auditTrailSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: { type: String, required: true },
  action: { type: String, required: true },
  recordReference: { type: String, required: true },
  oldToNewState: { type: String, required: true }
}, { timestamps: false });

module.exports = mongoose.model('AuditTrail', auditTrailSchema);