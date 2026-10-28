const express = require('express');
const router = express.Router();
const {
  getDashboardKPIs,
  getAuditLogs,
  createSubAdmin,
  getUsersAccessList,
  updateUserAccess,
  searchUsers,
  logExport,
} = require('../controllers/hrController');
const { protect } = require('../middleware/authMiddleware');
const { checkPermission, superAdminOnly } = require('../middleware/rbacMiddleware');

// HR Console dashboards & reports
router.get('/dashboard-kpis', protect, checkPermission('viewOptIns', 'reports', 'serviceTracking'), getDashboardKPIs);
router.get('/audit-logs', protect, checkPermission('reports'), getAuditLogs);
router.post('/exports', protect, checkPermission('viewOptIns', 'reports', 'serviceTracking'), logExport);

// User access management (Super Admin only)
router.get('/users-access', protect, superAdminOnly, getUsersAccessList);
router.get('/users/search', protect, superAdminOnly, searchUsers);
router.patch('/users/:id', protect, superAdminOnly, updateUserAccess);
router.post('/sub-admin', protect, superAdminOnly, createSubAdmin);

module.exports = router;
