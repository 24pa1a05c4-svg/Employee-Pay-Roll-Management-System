/**
 * Designation Routes
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const designationController = require('../controllers/designationController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

const desigValidation = [
  body('department_id').isInt({ min: 1 }).withMessage('Valid department must be selected.'),
  body('title').trim().notEmpty().withMessage('Designation title is required.').isLength({ max: 100 }),
  body('code').trim().notEmpty().withMessage('Designation code is required.').isLength({ max: 20 })
];

router.get('/', requireAuth, designationController.getDesignations);
router.get('/:id', requireAuth, designationController.getDesignationById);
router.post('/', requireAuth, requireRole('admin'), desigValidation, validate, designationController.createDesignation);
router.put('/:id', requireAuth, requireRole('admin'), desigValidation, validate, designationController.updateDesignation);
router.delete('/:id', requireAuth, requireRole('admin'), designationController.deleteDesignation);

module.exports = router;
