const mongoose = require('mongoose');

// One document = one product, in one city, for one duration (one row of the Cult.fit rate card).
const PACKAGE_NAMES = [
  'cultpass ELITE',
  'cultpass PRO',
  'cultpass ELITE + OnePass',
  'cultpass PRO + OnePass',
  'OnePass',
];
const TIERS = ['ELITE', 'PRO', 'ELITE_ONEPASS', 'PRO_ONEPASS', 'ONEPASS'];
const GYM_NETWORKS = ['ELITE', 'PRO', 'ONEPASS'];

const packageSchema = new mongoose.Schema(
  {
    packageName: { type: String, required: true, enum: PACKAGE_NAMES, trim: true },
    tier: { type: String, required: true, enum: TIERS },
    durationMonths: { type: Number, required: true, enum: [1, 3, 6, 12] },
    city: { type: String, required: true, trim: true },
    corporatePriceInclGst: { type: Number, required: true, min: 0 },
    mrp: { type: Number, default: null, min: 0 }, // rate card has no MRP yet
    platformFee: { type: Number, default: 80, min: 0 }, // ₹ per user, charged on top
    gymAccess: { type: [{ type: String, enum: GYM_NETWORKS }], default: [] },
    inclusions: { type: String, default: '', trim: true },
    b2bExclusive: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Same product + city + duration can exist only once (matches the seed script's key).
packageSchema.index({ tier: 1, city: 1, durationMonths: 1 }, { unique: true });

packageSchema.pre('validate', function () {
  if (this.mrp !== null && this.mrp !== undefined && this.mrp < this.corporatePriceInclGst) {
    this.invalidate('mrp', 'MRP cannot be lower than the corporate price');
  }
});

module.exports = mongoose.model('Package', packageSchema);
module.exports.PACKAGE_NAMES = PACKAGE_NAMES;
module.exports.TIERS = TIERS;
