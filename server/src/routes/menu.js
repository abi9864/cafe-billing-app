const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { authenticate, authorize } = require('../middleware/auth');

// Public routes (for POS)
router.get('/categories', authenticate, menuController.getCategories);
router.get('/items', authenticate, menuController.getMenuItems);

// Admin routes
router.post('/categories', authenticate, authorize('admin', 'manager'), menuController.createCategory);
router.put('/categories/:id', authenticate, authorize('admin', 'manager'), menuController.updateCategory);
router.delete('/categories/:id', authenticate, authorize('admin', 'manager'), menuController.deleteCategory);

router.post('/items', authenticate, authorize('admin', 'manager'), menuController.createMenuItem);
router.put('/items/:id', authenticate, authorize('admin', 'manager'), menuController.updateMenuItem);
router.delete('/items/:id', authenticate, authorize('admin', 'manager'), menuController.deleteMenuItem);

module.exports = router;
