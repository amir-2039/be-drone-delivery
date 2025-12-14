import { DroneStatus, OrderStatus, JobType } from '@prisma/client';
import { droneRepository } from '../repositories/drone.repository';
import { orderRepository } from '../repositories/order.repository';
import { NotFoundError, ConflictError } from '../utils/errors.util';
import { DroneStatusUpdateResponse, UpdateDroneLocationRequest } from '../types/drone.types';
import { validateLocation, calculateETAFromLocation } from '../utils/location.util';
import { prisma } from '../lib/prisma';

const DRONE_AVERAGE_SPEED_KMH = parseInt(process.env.DRONE_AVERAGE_SPEED_KMH || '50', 10);

export class DroneService {
  /**
   * Reserve a job for the drone
   * Delegates to JobService
   */
  async reserveJob(droneId: string) {
    // Verify drone exists and is available
    const drone = await droneRepository.findById(droneId);
    if (!drone) {
      throw new NotFoundError(`Drone with id ${droneId} not found`);
    }

    if (drone.isBroken) {
      throw new ConflictError('Broken drones cannot reserve jobs', 'DRONE_BROKEN');
    }

    if (drone.status === DroneStatus.BUSY) {
      throw new ConflictError('Drone is already busy with an order', 'DRONE_BUSY');
    }

    // Job reservation is handled by JobService
    const { jobService } = await import('./job.service');
    const result = await jobService.reserveJob(droneId);

    // If job was reserved, update order (relationship is maintained on Order side)
    if (result && result.job.orderId) {
      // Update order status to ASSIGNED and assign to drone
      await orderRepository.update(result.job.orderId, {
        status: OrderStatus.ASSIGNED,
        assignedDroneId: droneId,
      });

      // Update drone status to BUSY
      await droneRepository.update(droneId, {
        status: DroneStatus.BUSY,
      });
    }

    return result;
  }

  /**
   * Grab an order from its origin or from a broken drone
   * Updates order status and assigns it to the drone
   */
  async grabOrder(orderId: string, droneId: string): Promise<void> {
    const drone = await droneRepository.findByIdOrThrow(droneId);

    if (drone.isBroken) {
      throw new ConflictError('Broken drones cannot grab orders', 'DRONE_BROKEN');
    }

    const order = await orderRepository.findByIdOrThrow(orderId);

    // Verify order is assigned to this drone (via job reservation)
    if (order.assignedDroneId !== droneId) {
      throw new ConflictError(
        'Order is not assigned to this drone. Reserve the job first.',
        'ORDER_NOT_ASSIGNED'
      );
    }

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.ASSIGNED) {
      throw new ConflictError(
        `Cannot grab order with status ${order.status}`,
        'INVALID_ORDER_STATUS'
      );
    }

    // Calculate ETA based on drone's current location to order destination
    const eta = calculateETAFromLocation(
      drone.currentLat,
      drone.currentLng,
      order.destinationLat,
      order.destinationLng,
      DRONE_AVERAGE_SPEED_KMH
    );

    // Update order and drone in transaction
    await prisma.$transaction(async (tx) => {
      // Update order status and set current location to origin
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.IN_TRANSIT,
          currentLat: order.originLat,
          currentLng: order.originLng,
          eta,
        },
      });

      // Update drone status
      await tx.drone.update({
        where: { id: droneId },
        data: {
          status: DroneStatus.BUSY,
        },
      });
    });
  }

  /**
   * Mark order as delivered
   */
  async markOrderDelivered(orderId: string, droneId: string): Promise<void> {
    await droneRepository.findByIdOrThrow(droneId);
    const order = await orderRepository.findByIdOrThrow(orderId);

    // Verify order is assigned to this drone
    if (order.assignedDroneId !== droneId) {
      throw new NotFoundError(`Order with id ${orderId} not found`);
    }

    // Update order and drone in transaction
    await prisma.$transaction(async (tx) => {
      // Mark order as delivered
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.DELIVERED,
          currentLat: order.destinationLat,
          currentLng: order.destinationLng,
          eta: null,
        },
      });

      // Complete any associated job
      await tx.job.updateMany({
        where: { orderId: orderId, assignedDroneId: droneId },
        data: { status: 'COMPLETED' },
      });

      // Mark drone as available (relationship is maintained on Order side)
      await tx.drone.update({
        where: { id: droneId },
        data: {
          status: DroneStatus.AVAILABLE,
        },
      });
    });
  }

  /**
   * Mark order as failed
   */
  async markOrderFailed(orderId: string, droneId: string): Promise<void> {
    await droneRepository.findByIdOrThrow(droneId);
    const order = await orderRepository.findByIdOrThrow(orderId);

    // Verify order is assigned to this drone
    if (order.assignedDroneId !== droneId) {
      throw new NotFoundError(`Order with id ${orderId} not found`);
    }

    // Update order and drone in transaction
    await prisma.$transaction(async (tx) => {
      // Mark order as failed
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.FAILED,
          eta: null,
        },
      });

      // Mark drone as available (relationship is maintained on Order side)
      await tx.drone.update({
        where: { id: droneId },
        data: {
          status: DroneStatus.AVAILABLE,
        },
      });
    });
  }

  /**
   * Mark drone as broken
   * If drone has an assigned order, creates a handoff job
   */
  async markDroneBroken(droneId: string): Promise<void> {
    const drone = await droneRepository.findByIdOrThrow(droneId);

    if (drone.isBroken) {
      return; // Already broken
    }

    await prisma.$transaction(async (tx) => {
      // Get assigned order through relation
      const droneWithOrder = await tx.drone.findUnique({
        where: { id: droneId },
        include: { assignedOrder: true },
      });

      const assignedOrder = droneWithOrder?.assignedOrder;

      // If drone has assigned order, create handoff job
      if (assignedOrder) {
        // Create handoff job
        await tx.job.create({
          data: {
            type: JobType.HANDOFF,
            orderId: assignedOrder.id,
            originLat: drone.currentLat,
            originLng: drone.currentLng,
            destinationLat: assignedOrder.destinationLat,
            destinationLng: assignedOrder.destinationLng,
            brokenDroneId: droneId,
            status: 'PENDING',
          },
        });

        // Reset order (make it available for reassignment)
        await tx.order.update({
          where: { id: assignedOrder.id },
          data: {
            status: OrderStatus.PENDING,
            assignedDroneId: null,
            currentLat: drone.currentLat,
            currentLng: drone.currentLng,
            eta: null,
          },
        });
      }

      // Mark drone as broken
      await tx.drone.update({
        where: { id: droneId },
        data: {
          status: DroneStatus.BROKEN,
          isBroken: true,
        },
      });
    });
  }

  /**
   * Update drone location and get status update
   * Recalculates ETA if drone has assigned order
   */
  async updateLocation(
    droneId: string,
    location: UpdateDroneLocationRequest
  ): Promise<DroneStatusUpdateResponse> {
    validateLocation({ lat: location.latitude, lng: location.longitude });

    let order = null;
    let eta: Date | null = null;

    // Get assigned order through relation
    const droneWithOrder = await prisma.drone.findUnique({
      where: { id: droneId },
      include: { assignedOrder: true },
    });

    if (!droneWithOrder) {
      throw new NotFoundError(`Drone with id ${droneId} not found`);
    }

    // If drone has assigned order, recalculate ETA
    const assignedOrderData = droneWithOrder.assignedOrder;
    if (assignedOrderData) {
      const orderData = await orderRepository.findById(assignedOrderData.id);
      if (orderData && orderData.status === OrderStatus.IN_TRANSIT) {
        eta = calculateETAFromLocation(
          location.latitude,
          location.longitude,
          orderData.destinationLat,
          orderData.destinationLng,
          DRONE_AVERAGE_SPEED_KMH
        );

        // Update order's current location and ETA
        await orderRepository.update(orderData.id, {
          currentLat: location.latitude,
          currentLng: location.longitude,
          eta,
        });

        order = {
          id: orderData.id,
          destination: {
            lat: orderData.destinationLat,
            lng: orderData.destinationLng,
          },
          eta: eta.toISOString(),
          progress: 'in_transit',
        };
      }
    }

    // Update drone location and heartbeat
    const updatedDrone = await droneRepository.update(droneId, {
      currentLat: location.latitude,
      currentLng: location.longitude,
      lastHeartbeat: new Date(),
    });

    // Get available jobs count
    const { jobService } = await import('./job.service');
    const availableJobsCount = await jobService.getAvailableJobsCount();

    // Determine status
    let status: 'ok' | 'warning' | 'error' = 'ok';
    if (updatedDrone.isBroken) {
      status = 'error';
    } else if (updatedDrone.status === DroneStatus.BUSY && !order) {
      status = 'warning';
    }

    return {
      status,
      drone_status: updatedDrone.status,
      assigned_order: order,
      available_jobs_count: availableJobsCount,
    };
  }

  /**
   * Get drone's currently assigned order details
   */
  async getCurrentOrder(droneId: string) {
    const droneWithOrder = await prisma.drone.findUnique({
      where: { id: droneId },
      include: { assignedOrder: true },
    });

    if (!droneWithOrder) {
      throw new NotFoundError(`Drone with id ${droneId} not found`);
    }

    if (!droneWithOrder.assignedOrder) {
      return null;
    }

    const order = droneWithOrder.assignedOrder;
    if (!order) {
      return null;
    }

    return {
      id: order.id,
      origin: {
        lat: order.originLat,
        lng: order.originLng,
      },
      destination: {
        lat: order.destinationLat,
        lng: order.destinationLng,
      },
      status: order.status,
      currentLocation:
        order.currentLat !== null && order.currentLng !== null
          ? {
              lat: order.currentLat,
              lng: order.currentLng,
            }
          : null,
      eta: order.eta,
    };
  }

  /**
   * Get all drones (for admin)
   */
  async getAllDrones(filters?: { status?: DroneStatus; isBroken?: boolean }) {
    const drones = await prisma.drone.findMany({
      where: filters ? { ...filters } : undefined,
      include: { assignedOrder: true },
      orderBy: { createdAt: 'desc' },
    });

    return drones.map((drone) => ({
      id: drone.id,
      status: drone.status,
      currentLat: drone.currentLat,
      currentLng: drone.currentLng,
      lastHeartbeat: drone.lastHeartbeat,
      isBroken: drone.isBroken,
      assignedOrderId: drone.assignedOrder?.id || null,
      createdAt: drone.createdAt,
      updatedAt: drone.updatedAt,
    }));
  }

  /**
   * Mark drone as fixed (admin operation)
   * Note: Handoff jobs remain active even after drone is marked fixed
   */
  async markDroneFixed(droneId: string): Promise<void> {
    await droneRepository.findByIdOrThrow(droneId);

    await droneRepository.update(droneId, {
      status: DroneStatus.AVAILABLE,
      isBroken: false,
    });
  }

  /**
   * Mark drone as broken (admin operation)
   * Same logic as drone marking itself broken
   */
  async markDroneBrokenByAdmin(droneId: string): Promise<void> {
    await this.markDroneBroken(droneId);
  }
}

export const droneService = new DroneService();
