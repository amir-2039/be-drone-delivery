import { Response, NextFunction } from 'express';
import { droneService } from '../services/drone.service';
import { ReserveJobResponse } from '../types/job.types';
import { DroneStatusUpdateResponse } from '../types/drone.types';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class DroneController {
  /**
   * POST /api/drones/jobs/reserve
   * Reserve a job for the drone
   * Auth: Drone only
   */
  async reserveJob(
    req: AuthenticatedRequest,
    res: Response<ReserveJobResponse | { message: string }>,
    next: NextFunction
  ): Promise<void> {
    try {
      const droneId = req.userId!;

      const result = await droneService.reserveJob(droneId);

      if (!result) {
        res.status(200).json({ message: 'No jobs available' });
        return;
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/drones/orders/:id/grab
   * Grab an order from its origin or from a broken drone
   * Auth: Drone only
   */
  async grabOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const droneId = req.userId!;
      const { id: orderId } = req.params;

      await droneService.grabOrder(orderId, droneId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/drones/orders/:id/delivered
   * Mark order as delivered
   * Auth: Drone only
   */
  async markOrderDelivered(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const droneId = req.userId!;
      const { id: orderId } = req.params;

      await droneService.markOrderDelivered(orderId, droneId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/drones/orders/:id/failed
   * Mark order as failed
   * Auth: Drone only
   */
  async markOrderFailed(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const droneId = req.userId!;
      const { id: orderId } = req.params;

      await droneService.markOrderFailed(orderId, droneId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/drones/status/broken
   * Mark self as broken (creates handoff job if needed)
   * Auth: Drone only
   */
  async markBroken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const droneId = req.userId!;

      await droneService.markDroneBroken(droneId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/drones/location
   * Update location and get status update
   * Auth: Drone only
   */
  async updateLocation(
    req: AuthenticatedRequest,
    res: Response<DroneStatusUpdateResponse>,
    next: NextFunction
  ) {
    try {
      const droneId = req.userId!;
      const { latitude, longitude } = req.body;

      const statusUpdate = await droneService.updateLocation(droneId, {
        latitude,
        longitude,
      });

      res.json(statusUpdate);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/drones/orders/current
   * Get currently assigned order details
   * Auth: Drone only
   */
  async getCurrentOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const droneId = req.userId!;

      const order = await droneService.getCurrentOrder(droneId);

      if (!order) {
        res.status(200).json({ message: 'No assigned order' });
        return;
      }

      res.json(order);
    } catch (error) {
      next(error);
    }
  }
}

export const droneController = new DroneController();

