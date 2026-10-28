const express = require('express');
const router = express.Router();
const { createGym, updateGym, bulkUploadGyms } = require('../controllers/gymController');
const { getGyms } = require('../controllers/catalogController');
const { protect } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/rbacMiddleware');

// Gym Locator read (any logged-in employee). Optional ?city=&type=ELITE|PRO|ONEPASS&q=
// HR with Packages & gyms access can add ?includeInactive=1.
router.get('/', protect, getGyms);

// HR Gym Master
router.post('/', protect, checkPermission('packagesGyms'), createGym);
router.post('/bulk-upload', protect, checkPermission('packagesGyms'), bulkUploadGyms);
router.put('/:id', protect, checkPermission('packagesGyms'), updateGym);

module.exports = router;
