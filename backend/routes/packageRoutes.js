const express = require('express');
const router = express.Router();
const { createPackage, updatePackage } = require('../controllers/packageController');
const { getPackages } = require('../controllers/catalogController');
const { protect } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/rbacMiddleware');

// Catalog read (any logged-in employee). ?city=Mumbai → that city; no city → all cities.
// HR with Packages & gyms access can add ?includeInactive=1.
router.get('/', protect, getPackages);

// HR Packages & Pricing (Super Admin, or a sub-admin given "Packages & gyms")
router.post('/', protect, checkPermission('packagesGyms'), createPackage);
router.put('/:id', protect, checkPermission('packagesGyms'), updatePackage);

module.exports = router;
