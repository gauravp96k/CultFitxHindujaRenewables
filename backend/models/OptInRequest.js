const mongoose = require('mongoose');

const STATUSES = ['Submitted', 'HR Approved', 'Sent to Cult.fit', 'Active', 'Expiring', 'Issue', 'To cancel', 'Rejected'];
// An employee can have only one request in these states at a time.
const OPEN_STATUSES = ['Submitted', 'HR Approved', 'Sent to Cult.fit', 'Active', 'Expiring', 'Issue'];

const optInSchema = new mongoose.Schema(
  {
    referenceId: { type: String, required: true, unique: true }, // e.g. CF-2026-00127
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Snapshot of the employee at submission (from the login session, never from the form).
    employeeSnapshot: {
      employeeId: { type: String, default: '' },
      fullName: { type: String, default: '' },
      email: { type: String, default: '' },
      location: { type: String, default: '' },
    },

    // Snapshot of the package at submission, so later price changes don't alter it.
    packageDetails: {
      package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
      packageName: { type: String, required: true },
      tier: { type: String, default: '' },
      durationMonths: { type: Number, required: true },
      city: { type: String, required: true },
      corporatePrice: { type: Number, required: true },
      platformFee: { type: Number, default: 0 },
      gymAccess: { type: [String], default: [] },
      monthlyPayrollDeduction: { type: Number, required: true },
      deductionPeriodMonths: { type: Number, default: 3 },
    },

    formData: {
      workLocation: { type: String, default: '' },
      mobileOnCultApp: { type: String, required: true },
      gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
      dateOfBirth: { type: Date, required: true },
      isExistingMember: { type: String, required: true, enum: ['Yes', 'No'] },
      emergencyContactName: { type: String, default: '' }, // optional
      emergencyContactNumber: { type: String, default: '' }, // optional
      preferredCentre: { type: String, default: '' },
      preferredStartDate: { type: Date, required: true },
      healthCondition: { type: String, default: '' },
      remarks: { type: String, default: '' },
    },

    declarationsAccepted: { type: Boolean, required: true },
    declarationsAcceptedAt: { type: Date },
    cultFitMemberId: { type: String, default: null },
    activationStatus: { type: String, enum: STATUSES, default: 'Submitted', index: true },

    // Service tracking (HR Console)
    activatedAt: { type: Date, default: null }, // set when the status first becomes Active
    serviceNote: { type: String, default: '', trim: true, maxlength: 300 }, // e.g. "Mobile mismatch"
  },
  { timestamps: true }
);

module.exports = mongoose.model('OptInRequest', optInSchema);
module.exports.STATUSES = STATUSES;
module.exports.OPEN_STATUSES = OPEN_STATUSES;
