const mongoose = require('mongoose');
const OptInRequest = require('../models/OptInRequest');
const Package = require('../models/Package');
const Counter = require('../models/Counter');
const { logAudit } = require('../middleware/auditMiddleware');

const { STATUSES, OPEN_STATUSES } = OptInRequest;
const DEDUCTION_MONTHS = 3;
const IS_PROD = process.env.NODE_ENV === 'production';

const MOBILE_RX = /^[6-9]\d{9}$/;
const NAME_RX = /^[A-Za-z][A-Za-z .'-]{1,49}$/;
const MEMBER_ID_RX = /^[A-Za-z0-9-]{3,40}$/;
const EMP_ID_RX = /^[A-Z0-9][A-Z0-9-]{1,19}$/; // same rule as the opt-in form
const User = require('../models/User');

// Statuses an approver (approveOptIns) can set; every other status is service tracking.
const APPROVAL_STATUSES = ['Submitted', 'HR Approved', 'Rejected'];
const can = (user, perm) =>
  User.canonicalRole(user && user.role) === 'Super Admin' || Boolean(user && user.permissions && user.permissions[perm] === true);
const EMPLOYEE_FIELDS = 'employeeId fullName email location';

const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const phone = (v) => {
  let d = str(v, 20).replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
};
const fail = (res, status, msg, errors) => res.status(status).json({ error: msg, message: msg, ...(errors ? { errors } : {}) });
const toDate = (v) => {
  if (typeof v !== 'string' && !(v instanceof Date)) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

/** Audit must never break the main action: if it fails, log it and carry on. */
async function safeAudit(...args) {
  try {
    await logAudit(...args);
  } catch (e) {
    console.error('[audit] failed to write entry:', e.message);
  }
}

/** Atomic, race-safe reference ID: CF-2026-00127, CF-2026-00128, ... */
async function nextReferenceId() {
  const year = new Date().getFullYear();
  const key = `optin-${year}`;
  let c = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  if (c.seq === 1) {
    const existing = await OptInRequest.countDocuments({ referenceId: new RegExp(`^CF-${year}-`) });
    if (existing) c = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: existing } }, { new: true });
  }
  return `CF-${year}-${String(c.seq + 126).padStart(5, '0')}`;
}

function validateForm(f) {
  const e = {};
  const mobile = phone(f.mobileOnCultApp);
  const emergency = phone(f.emergencyContactNumber);
  const dob = toDate(f.dateOfBirth);
  const start = toDate(f.preferredStartDate);
  const workLocation = str(f.workLocation, 80);
  const emergencyName = str(f.emergencyContactName, 50);
  const employeeId = str(f.employeeId, 20).toUpperCase();

  if (!EMP_ID_RX.test(employeeId)) e.employeeId = 'Enter a valid employee ID (2–20 letters, numbers or hyphens)';
  if (!workLocation) e.workLocation = 'Select your work location';
  if (!MOBILE_RX.test(mobile)) e.mobileOnCultApp = 'Enter a valid 10-digit mobile number';
  if (!['Male', 'Female', 'Other'].includes(f.gender)) e.gender = 'Select gender';
  if (!dob) e.dateOfBirth = 'Enter date of birth';
  else if ((Date.now() - dob.getTime()) / (365.25 * 864e5) < 18) e.dateOfBirth = 'You must be at least 18 years old';
  if (!['Yes', 'No'].includes(f.isExistingMember)) e.isExistingMember = 'Select Yes or No';
  // Emergency contact is optional; if given it must be valid.
  if (emergencyName && !NAME_RX.test(emergencyName)) e.emergencyContactName = 'Use letters only for the emergency contact name';
  if (emergency && !MOBILE_RX.test(emergency)) e.emergencyContactNumber = 'Enter a valid 10-digit mobile number';
  else if (emergency && emergency === mobile) e.emergencyContactNumber = 'Must be different from your own number';
  if (!start) e.preferredStartDate = 'Select a start date';
  else if (start < startOfToday()) e.preferredStartDate = 'Start date cannot be in the past';

  return {
    errors: e,
    employeeId,
    clean: {
      workLocation,
      mobileOnCultApp: mobile,
      gender: f.gender,
      dateOfBirth: dob,
      isExistingMember: f.isExistingMember,
      emergencyContactName: emergencyName,
      emergencyContactNumber: emergency,
      preferredCentre: str(f.preferredCentre, 150),
      preferredStartDate: start,
      healthCondition: str(f.healthCondition, 500),
      remarks: str(f.remarks, 500),
    },
  };
}

// 1. Submit Opt-In Request (Employee)
exports.createOptInRequest = async (req, res) => {
  try {
    const body = req.body || {};
    const formData = body.formData && typeof body.formData === 'object' ? body.formData : {};

    if (body.declarationsAccepted !== true) return fail(res, 400, 'All 4 declarations must be accepted.');
    if (typeof body.packageId !== 'string' || !mongoose.isValidObjectId(body.packageId)) {
      return fail(res, 400, 'Please choose a package from the Packages page.');
    }

    const { errors, clean, employeeId } = validateForm(formData);
    if (Object.keys(errors).length) return fail(res, 400, 'Please fix the highlighted fields.', errors);

    // Employee IDs are unique per user: refuse an ID that already belongs to someone else.
    const owner = await User.findOne({ employeeId, _id: { $ne: req.user._id } }).select('_id').lean();
    if (owner) {
      return fail(res, 409, 'This employee ID is registered to another user. Please check it or contact HR.', {
        employeeId: 'This employee ID belongs to another user',
      });
    }

    const existing = await OptInRequest.findOne({ employee: req.user._id, activationStatus: { $in: OPEN_STATUSES } })
      .select('referenceId activationStatus');
    if (existing) {
      return fail(res, 409, `You already have request ${existing.referenceId} (${existing.activationStatus}). Contact HR to change it.`);
    }

    const pkg = await Package.findById(body.packageId).lean();
    if (!pkg || pkg.isActive === false) return fail(res, 404, 'Selected wellness package was not found or is no longer available.');

    const price = Number(pkg.corporatePriceInclGst ?? pkg.corporatePrice) || 0;
    if (!price) return fail(res, 400, 'This package has no price set. Please contact HR.');
    const city = pkg.city || str(body.city, 60);
    if (!city) return fail(res, 400, 'City is missing for this package.');

    const u = req.user;

    // Save the employee ID on the profile if it is new or changed, so the next form is pre-filled.
    if (u.employeeId !== employeeId) {
      const previous = u.employeeId || '';
      await User.updateOne({ _id: u._id }, { $set: { employeeId } });
      u.employeeId = employeeId;
      await safeAudit(req.user, 'Employee ID updated (opt-in form)', employeeId, `${previous || '—'} → ${employeeId}`);
    }

    const referenceId = await nextReferenceId();
    const optIn = await OptInRequest.create({
      referenceId,
      employee: u._id, // from the JWT session, never from the form (OWASP A04)
      employeeSnapshot: {
        employeeId: u.employeeId || '',
        fullName: u.fullName || '',
        email: u.email || u.officialEmail || '',
        location: clean.workLocation || u.location || u.workLocation || '',
      },
      packageDetails: {
        package: pkg._id,
        packageName: pkg.packageName,
        tier: pkg.tier || '',
        durationMonths: pkg.durationMonths,
        city,
        corporatePrice: price,
        platformFee: Number(pkg.platformFee) || 0,
        gymAccess: Array.isArray(pkg.gymAccess) ? pkg.gymAccess : [],
        monthlyPayrollDeduction: Math.round(price / DEDUCTION_MONTHS),
        deductionPeriodMonths: DEDUCTION_MONTHS,
      },
      formData: clean,
      declarationsAccepted: true,
      declarationsAcceptedAt: new Date(),
      activationStatus: 'Submitted',
    });

    await safeAudit(req.user, 'Submitted opt-in (4 declarations accepted)', referenceId, '— → Submitted');

    return res.status(201).json({ message: 'Opt-in request submitted successfully', referenceId: optIn.referenceId, optIn });
  } catch (error) {
    console.error('Error submitting opt-in request:', error);
    if (error && error.name === 'ValidationError') {
      const errors = Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [k.split('.').pop(), v.message]));
      return fail(res, 400, 'Please fix the highlighted fields.', errors);
    }
    if (error && error.code === 11000) return fail(res, 409, 'Please try submitting again.');
    return fail(res, 500, IS_PROD ? 'Failed to submit opt-in request.' : `Failed to submit opt-in request: ${error.message}`);
  }
};

// 2. Get Logged-In Employee Requests (My Requests View)
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await OptInRequest.find({ employee: req.user._id })
      .populate('employee', EMPLOYEE_FIELDS)
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json(requests);
  } catch (error) {
    console.error('Error fetching employee requests:', error);
    res.status(500).json({ error: 'Failed to fetch your requests.' });
  }
};

// 3. Get All Employee Opt-ins (HR Admin Console)
exports.getAllOptIns = async (req, res) => {
  try {
    const search = str(req.query.search, 80).toLowerCase();
    const city = str(req.query.city, 60);
    const packageName = str(req.query.packageName, 60);
    const duration = Number(str(req.query.duration, 3));
    const status = str(req.query.status, 30);
    const query = {};

    if (city && city !== 'All cities') query['packageDetails.city'] = city;
    if (packageName && packageName !== 'All packages') query['packageDetails.packageName'] = packageName;
    if (duration) query['packageDetails.durationMonths'] = duration;
    if (status && STATUSES.includes(status)) query.activationStatus = status;

    let requests = await OptInRequest.find(query).populate('employee', EMPLOYEE_FIELDS).sort({ createdAt: -1 }).lean();

    if (search) {
      const has = (v) => String(v || '').toLowerCase().includes(search);
      requests = requests.filter((r) => {
        const e = r.employee || {};
        const s = r.employeeSnapshot || {};
        return [r.referenceId, r.cultFitMemberId, e.employeeId, e.fullName, e.email, s.employeeId, s.fullName, s.email].some(has);
      });
    }

    res.status(200).json(requests);
  } catch (error) {
    console.error('Error fetching all opt-ins:', error);
    res.status(500).json({ error: 'Failed to retrieve opt-ins list.' });
  }
};

// 4. Update Status (HR Approvals, Rejections, Activation Updates)
exports.updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const status = str(req.body && req.body.status, 30);
    const memberId = str(req.body && req.body.cultFitMemberId, 40).toUpperCase();

    if (!mongoose.isValidObjectId(id)) return fail(res, 404, 'Opt-in request not found.');
    if (status && !STATUSES.includes(status)) return fail(res, 400, 'Invalid status.');
    if (memberId && !MEMBER_ID_RX.test(memberId)) return fail(res, 400, 'Invalid Cult.fit member ID.');

    const rawNote = req.body && req.body.serviceNote;
    const note = typeof rawNote === 'string' ? rawNote.trim().slice(0, 300) : undefined;

    const requestItem = await OptInRequest.findById(id);
    if (!requestItem) return fail(res, 404, 'Opt-in request not found.');

    const oldStatus = requestItem.activationStatus;
    const next = status || oldStatus;

    // Approve / reject needs approveOptIns; activation, member IDs and service notes need serviceTracking.
    if (next !== oldStatus) {
      const needed = APPROVAL_STATUSES.includes(next) ? 'approveOptIns' : 'serviceTracking';
      if (!can(req.user, needed)) return fail(res, 403, 'You do not have access to make this change.');
    }
    if ((memberId || note !== undefined) && !can(req.user, 'serviceTracking')) {
      return fail(res, 403, 'You do not have access to service tracking.');
    }
    if (next === 'Active' && !memberId && !requestItem.cultFitMemberId) {
      return fail(res, 400, 'Enter the Cult.fit member ID to mark the membership Active.');
    }

    requestItem.activationStatus = next;
    if (memberId) requestItem.cultFitMemberId = memberId;
    if (next === 'Active' && !requestItem.activatedAt) requestItem.activatedAt = new Date();
    const oldNote = requestItem.serviceNote || '';
    if (note !== undefined) requestItem.serviceNote = note;
    await requestItem.save();

    const changes = [];
    if (next !== oldStatus) changes.push(`${oldStatus} → ${next}`);
    if (memberId) changes.push(`member ID ${memberId}`);
    if (note !== undefined && note !== oldNote) changes.push(`note: ${oldNote || '—'} → ${note || '—'}`);
    await safeAudit(
      req.user,
      next !== oldStatus ? `Status changed to ${next}` : memberId ? 'Cult.fit member ID updated' : 'Service note updated',
      requestItem.referenceId,
      changes.join(' · ') || 'No change'
    );

    res.status(200).json({ message: 'Request status updated successfully', requestItem });
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({ error: 'Failed to update request status.' });
  }
};
