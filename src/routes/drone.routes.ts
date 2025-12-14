import { Router } from 'express';
import { droneController } from '../controllers/drone.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireDrone } from '../middleware/authorization.middleware';
import {
  validateUpdateDroneLocation,
  validateUUIDParam,
} from '../middleware/validation.middleware';

const router = Router();

/**
 * All drone routes require authentication and Drone role
 */
router.use(authenticate);
router.use(requireDrone);

/**
 * POST /api/drones/jobs/reserve
 * Reserve a job
 */
router.post('/jobs/reserve', (req, res, next) => {
  droneController.reserveJob(req, res, next);
});

/**
 * GET /api/drones/orders/current
 * Get currently assigned order
 */
router.get('/orders/current', (req, res, next) => {
  droneController.getCurrentOrder(req, res, next);
});

/**
 * POST /api/drones/orders/:id/grab
 * Grab order from origin/broken drone
 */
router.post('/orders/:id/grab', validateUUIDParam, (req, res, next) => {
  droneController.grabOrder(req, res, next);
});

/**
 * PUT /api/drones/orders/:id/delivered
 * Mark order as delivered
 */
router.put('/orders/:id/delivered', validateUUIDParam, (req, res, next) => {
  droneController.markOrderDelivered(req, res, next);
});

/**
 * PUT /api/drones/orders/:id/failed
 * Mark order as failed
 */
router.put('/orders/:id/failed', validateUUIDParam, (req, res, next) => {
  droneController.markOrderFailed(req, res, next);
});

/**
 * PUT /api/drones/status/broken
 * Mark self as broken (creates handoff job if needed)
 */
router.put('/status/broken', (req, res, next) => {
  droneController.markBroken(req, res, next);
});

/**
 * PUT /api/drones/location
 * Update location and get status update
 */
router.put('/location', validateUpdateDroneLocation, (req, res, next) => {
  droneController.updateLocation(req, res, next);
});

export default router;
