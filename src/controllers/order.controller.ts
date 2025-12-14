import { Response, NextFunction } from 'express';
import { orderService } from '../services/order.service';
import { OrderResponse, OrderWithProgress } from '../types/order.types';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class OrderController {
  /**
   * POST /api/orders
   * Submit a new order
   * Auth: EndUser only
   */
  async submitOrder(req: AuthenticatedRequest, res: Response<OrderResponse>, next: NextFunction) {
    try {
      const userId = req.userId!;
      const { origin, destination } = req.body;

      const order = await orderService.submitOrder({ origin, destination }, userId);
      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/orders/:id
   * Withdraw an order (only if pending and not assigned)
   * Auth: EndUser only (own orders)
   */
  async withdrawOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      await orderService.withdrawOrder(id, userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/orders/:id
   * Get order details with progress and ETA
   * Auth: EndUser only (own orders)
   */
  async getOrderDetails(
    req: AuthenticatedRequest,
    res: Response<OrderWithProgress>,
    next: NextFunction
  ) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const order = await orderService.getOrderDetails(id, userId);
      res.json(order);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/orders
   * List user's own orders
   * Auth: EndUser only
   */
  async getUserOrders(
    req: AuthenticatedRequest,
    res: Response<OrderResponse[]>,
    next: NextFunction
  ) {
    try {
      const userId = req.userId!;

      const orders = await orderService.getUserOrders(userId);
      res.json(orders);
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();
