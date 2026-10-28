const express = require('express');
const router = express.Router();
const {
  createOptInRequest,
  getMyRequests,
  getAllOptIns,
  updateRequestStatus,
} = require('../controllers/requestController');
const { protect } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/rbacMiddleware');

// Employee Routes
router.post('/', protect, createOptInRequest);
router.get('/my-requests', protect, getMyRequests);

// HR Admin Routes
// Reports and service tracking work from the same list, so any of those modules can read it.
router.get('/hr/all', protect, checkPermission('viewOptIns', 'reports', 'serviceTracking'), getAllOptIns);
// Approve / reject needs approveOptIns; marking sent / active with member ID needs serviceTracking.
router.patch('/:id/status', protect, checkPermission('approveOptIns', 'serviceTracking'), updateRequestStatus);

module.exports = router;
