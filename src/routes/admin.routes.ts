import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/authorization.middleware';
import {
  validateUpdateLocation,
  validateBulkOrdersQuery,
  validateAdminDronesQuery,
  validateUUIDParam,
} from '../middleware/validation.middleware';

const router = Router();

/**
 * All admin routes require authentication and Admin role
 */
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/orders
 * Bulk get orders with filters
 */
router.get('/orders', validateBulkOrdersQuery, (req, res, next) => {
  adminController.getBulkOrders(req, res, next);
});

/**
 * PUT /api/admin/orders/:id/origin
 * Change order origin
 */
router.put('/orders/:id/origin', validateUUIDParam, validateUpdateLocation, (req, res, next) => {
  adminController.updateOrderOrigin(req, res, next);
});

/**
 * PUT /api/admin/orders/:id/destination
 * Change order destination
 */
router.put(
  '/orders/:id/destination',
  validateUUIDParam,
  validateUpdateLocation,
  (req, res, next) => {
    adminController.updateOrderDestination(req, res, next);
  }
);

/**
 * GET /api/admin/drones
 * List all drones
 */
router.get('/drones', validateAdminDronesQuery, (req, res, next) => {
  adminController.getAllDrones(req, res, next);
});

/**
 * PUT /api/admin/drones/:id/broken
 * Mark drone as broken
 */
router.put('/drones/:id/broken', validateUUIDParam, (req, res, next) => {
  adminController.markDroneBroken(req, res, next);
});

/**
 * PUT /api/admin/drones/:id/fixed
 * Mark drone as fixed (handoff job remains active)
 */
router.put('/drones/:id/fixed', validateUUIDParam, (req, res, next) => {
  adminController.markDroneFixed(req, res, next);
});

export default router;
