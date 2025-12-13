import { OrderStatus } from '@prisma/client';
import { orderRepository } from '../repositories/order.repository';
import { jobRepository } from '../repositories/job.repository';
import {
  CreateOrderRequest,
  OrderResponse,
  OrderWithProgress,
  BulkOrdersQuery,
} from '../types/order.types';
import { validateLocation, calculateETAFromLocation } from '../utils/location.util';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.util';
import { prisma } from '../lib/prisma';

export class OrderService {
  /**
   * Submit a new order
   * Creates order and corresponding delivery job
   */
  async submitOrder(data: CreateOrderRequest, userId: string): Promise<OrderResponse> {
    // Validate coordinates
    validateLocation(data.origin);
    validateLocation(data.destination);

    // Origin and destination must be different
    if (
      data.origin.lat === data.destination.lat &&
      data.origin.lng === data.destination.lng
    ) {
      throw new ValidationError('Origin and destination cannot be the same');
    }

    // Create order
    const order = await orderRepository.create({
      originLat: data.origin.lat,
      originLng: data.origin.lng,
      destinationLat: data.destination.lat,
      destinationLng: data.destination.lng,
      createdBy: userId,
    });

    // Create corresponding delivery job
    await jobRepository.create({
      type: 'DELIVERY_ORDER',
      orderId: order.id,
      originLat: data.origin.lat,
      originLng: data.origin.lng,
      destinationLat: data.destination.lat,
      destinationLng: data.destination.lng,
    });

    return this.mapToOrderResponse(order);
  }

  /**
   * Withdraw an order
   * Only allowed if status is PENDING and not assigned to a drone
   */
  async withdrawOrder(orderId: string, userId: string): Promise<void> {
    const order = await orderRepository.findById(orderId);

    if (!order) {
      throw new NotFoundError(`Order with id ${orderId} not found`);
    }

    // Verify ownership
    if (order.createdBy !== userId) {
      throw new NotFoundError(`Order with id ${orderId} not found`); // Don't reveal existence to unauthorized users
    }

    // Check if order can be withdrawn
    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictError(
        `Cannot withdraw order with status ${order.status}. Only pending orders can be withdrawn.`,
        'ORDER_ALREADY_ASSIGNED'
      );
    }

    if (order.assignedDroneId !== null) {
      throw new ConflictError(
        'Cannot withdraw order that has been assigned to a drone',
        'ORDER_ALREADY_ASSIGNED'
      );
    }

    // Update order status to WITHDRAWN and delete corresponding job
    await prisma.$transaction(async (tx) => {
      // Mark order as withdrawn
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.WITHDRAWN },
      });

      // Delete corresponding job if it exists
      await tx.job.deleteMany({
        where: {
          orderId: orderId,
          type: 'DELIVERY_ORDER',
          status: 'PENDING',
        },
      });
    });
  }

  /**
   * Get order details with progress and ETA
   */
  async getOrderDetails(orderId: string, userId: string): Promise<OrderWithProgress> {
    const order = await orderRepository.findById(orderId);

    if (!order) {
      throw new NotFoundError(`Order with id ${orderId} not found`);
    }

    // Verify ownership (for endusers)
    if (order.createdBy !== userId) {
      throw new NotFoundError(`Order with id ${orderId} not found`);
    }

    const response: OrderWithProgress = {
      ...this.mapToOrderResponse(order),
      currentLocation:
        order.currentLat !== null && order.currentLng !== null
          ? { lat: order.currentLat, lng: order.currentLng }
          : null,
      progress: this.getOrderProgress(order.status),
      estimatedTimeRemaining: order.eta ? this.calculateTimeRemaining(order.eta) : null,
    };

    return response;
  }

  /**
   * Get user's orders
   */
  async getUserOrders(userId: string): Promise<OrderResponse[]> {
    const orders = await orderRepository.findByCreator(userId);
    return orders.map((order) => this.mapToOrderResponse(order));
  }

  /**
   * Get orders with filters (for admin bulk queries)
   */
  async getBulkOrders(filters: BulkOrdersQuery): Promise<OrderResponse[]> {
    const orders = await orderRepository.findMany(
      {
        status: filters.status,
        assignedDroneId: filters.assignedDroneId,
        createdBy: filters.createdBy,
      },
      {
        limit: filters.limit,
        offset: filters.offset,
      }
    );

    return orders.map((order) => this.mapToOrderResponse(order));
  }

  /**
   * Update order origin
   */
  async updateOrderOrigin(orderId: string, lat: number, lng: number): Promise<OrderResponse> {
    validateLocation({ lat, lng });

    const order = await orderRepository.findByIdOrThrow(orderId);

    // Recalculate ETA if order is assigned and in transit
    let eta = order.eta;
    if (
      order.assignedDroneId &&
      (order.status === OrderStatus.ASSIGNED || order.status === OrderStatus.IN_TRANSIT)
    ) {
      eta = calculateETAFromLocation(
        order.currentLat || order.originLat,
        order.currentLng || order.originLng,
        order.destinationLat,
        order.destinationLng
      );
    }

    const updated = await orderRepository.update(orderId, {
      originLat: lat,
      originLng: lng,
      eta,
    });

    return this.mapToOrderResponse(updated);
  }

  /**
   * Update order destination
   */
  async updateOrderDestination(
    orderId: string,
    lat: number,
    lng: number
  ): Promise<OrderResponse> {
    validateLocation({ lat, lng });

    const order = await orderRepository.findByIdOrThrow(orderId);

    // Recalculate ETA if order is assigned or in transit
    let eta = order.eta;
    if (
      order.assignedDroneId &&
      (order.status === OrderStatus.ASSIGNED || order.status === OrderStatus.IN_TRANSIT)
    ) {
      const currentLat = order.currentLat || order.originLat;
      const currentLng = order.currentLng || order.originLng;
      eta = calculateETAFromLocation(currentLat, currentLng, lat, lng);
    }

    const updated = await orderRepository.update(orderId, {
      destinationLat: lat,
      destinationLng: lng,
      eta,
    });

    return this.mapToOrderResponse(updated);
  }

  /**
   * Map database order to response DTO
   */
  private mapToOrderResponse(order: any): OrderResponse {
    return {
      id: order.id,
      originLat: order.originLat,
      originLng: order.originLng,
      destinationLat: order.destinationLat,
      destinationLng: order.destinationLng,
      status: order.status,
      createdBy: order.createdBy,
      assignedDroneId: order.assignedDroneId,
      currentLat: order.currentLat,
      currentLng: order.currentLng,
      eta: order.eta,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * Get human-readable progress string
   */
  private getOrderProgress(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING:
        return 'Waiting for drone assignment';
      case OrderStatus.ASSIGNED:
        return 'Assigned to drone, waiting to be picked up';
      case OrderStatus.IN_TRANSIT:
        return 'In transit to destination';
      case OrderStatus.DELIVERED:
        return 'Delivered';
      case OrderStatus.FAILED:
        return 'Delivery failed';
      case OrderStatus.WITHDRAWN:
        return 'Order withdrawn';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Calculate time remaining in minutes
   */
  private calculateTimeRemaining(eta: Date): number {
    const now = new Date();
    const diffMs = eta.getTime() - now.getTime();
    const diffMinutes = Math.ceil(diffMs / (1000 * 60));
    return Math.max(0, diffMinutes);
  }
}

export const orderService = new OrderService();

