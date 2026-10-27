/**
 * Department Routes
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const departmentController = require('../controllers/departmentController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

const deptValidation = [
  body('name').trim().notEmpty().withMessage('Department name is required.').isLength({ max: 100 }),
  body('code').trim().notEmpty().withMessage('Department code is required.').isLength({ max: 20 })
];

router.get('/', requireAuth, departmentController.getDepartments);
router.get('/:id', requireAuth, departmentController.getDepartmentById);
router.post('/', requireAuth, requireRole('admin'), deptValidation, validate, departmentController.createDepartment);
router.put('/:id', requireAuth, requireRole('admin'), deptValidation, validate, departmentController.updateDepartment);
router.delete('/:id', requireAuth, requireRole('admin'), departmentController.deleteDepartment);

module.exports = router;
