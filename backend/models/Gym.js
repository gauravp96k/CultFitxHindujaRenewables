const mongoose = require('mongoose');

const gymSchema = new mongoose.Schema(
  {
    gymName: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ['ELITE', 'PRO', 'ONEPASS'] }, // business_line in the Cult.fit sheet
    centerType: { type: String, default: '', trim: true }, // 'GYM' or 'Cult Center'
    area: { type: String, default: '', trim: true }, // 5 centres have no locality
    city: { type: String, required: true, trim: true },
    address: { type: String, default: '', trim: true }, // 12 centres have no address
    timings: { type: String, default: '', trim: true }, // not in the Cult.fit file
    googleMapsLink: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

gymSchema.index({ city: 1, type: 1 });

module.exports = mongoose.model('Gym', gymSchema);
