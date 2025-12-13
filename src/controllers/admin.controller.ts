import { Response, NextFunction } from 'express';
import { orderService } from '../services/order.service';
import { droneService } from '../services/drone.service';
import { OrderResponse } from '../types/order.types';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AdminController {
  /**
   * GET /api/admin/orders
   * Bulk get orders with filters
   * Auth: Admin only
   */
  async getBulkOrders(req: AuthenticatedRequest, res: Response<OrderResponse[]>, next: NextFunction) {
    try {
      const filters = {
        status: req.query.status as any,
        assignedDroneId: req.query.assignedDroneId as string | undefined,
        createdBy: req.query.createdBy as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      };

      const orders = await orderService.getBulkOrders(filters);
      res.json(orders);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/orders/:id/origin
   * Change order origin
   * Auth: Admin only
   */
  async updateOrderOrigin(
    req: AuthenticatedRequest,
    res: Response<OrderResponse>,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const { lat, lng } = req.body;

      const order = await orderService.updateOrderOrigin(id, lat, lng);
      res.json(order);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/orders/:id/destination
   * Change order destination
   * Auth: Admin only
   */
  async updateOrderDestination(
    req: AuthenticatedRequest,
    res: Response<OrderResponse>,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const { lat, lng } = req.body;

      const order = await orderService.updateOrderDestination(id, lat, lng);
      res.json(order);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/drones
   * List all drones
   * Auth: Admin only
   */
  async getAllDrones(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const filters: { status?: any; isBroken?: boolean } = {};

      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.isBroken !== undefined) {
        filters.isBroken = req.query.isBroken === 'true';
      }

      const drones = await droneService.getAllDrones(filters);
      res.json(drones);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/drones/:id/broken
   * Mark drone as broken
   * Auth: Admin only
   */
  async markDroneBroken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id: droneId } = req.params;

      await droneService.markDroneBrokenByAdmin(droneId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/drones/:id/fixed
   * Mark drone as fixed (handoff job remains active)
   * Auth: Admin only
   */
  async markDroneFixed(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id: droneId } = req.params;

      await droneService.markDroneFixed(droneId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();

