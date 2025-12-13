import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireEndUser } from '../middleware/authorization.middleware';
import { validateCreateOrder, validateUUIDParam } from '../middleware/validation.middleware';

const router = Router();

/**
 * All order routes require authentication and EndUser role
 */
router.use(authenticate);
router.use(requireEndUser);

/**
 * POST /api/orders
 * Submit a new order
 */
router.post('/', validateCreateOrder, (req, res, next) => {
  orderController.submitOrder(req, res, next);
});

/**
 * GET /api/orders
 * List user's own orders
 */
router.get('/', (req, res, next) => {
  orderController.getUserOrders(req, res, next);
});

/**
 * GET /api/orders/:id
 * Get order details with progress and ETA
 */
router.get('/:id', validateUUIDParam, (req, res, next) => {
  orderController.getOrderDetails(req, res, next);
});

/**
 * DELETE /api/orders/:id
 * Withdraw order (if not picked up)
 */
router.delete('/:id', validateUUIDParam, (req, res, next) => {
  orderController.withdrawOrder(req, res, next);
});

export default router;

