import { Order, OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface CreateOrderData {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  createdBy: string;
}

export interface UpdateOrderData {
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  status?: OrderStatus;
  assignedDroneId?: string | null;
  currentLat?: number | null;
  currentLng?: number | null;
  eta?: Date | null;
}

export interface BulkOrdersFilters {
  status?: OrderStatus;
  assignedDroneId?: string;
  createdBy?: string;
}

export class OrderRepository {
  /**
   * Create a new order
   */
  async create(data: CreateOrderData): Promise<Order> {
    return prisma.order.create({
      data: {
        originLat: data.originLat,
        originLng: data.originLng,
        destinationLat: data.destinationLat,
        destinationLng: data.destinationLng,
        createdBy: data.createdBy,
      },
    });
  }

  /**
   * Find order by ID
   */
  async findById(id: string): Promise<Order | null> {
    return prisma.order.findUnique({
      where: { id },
      include: {
        assignedDrone: true,
        creator: true,
      },
    });
  }

  /**
   * Find orders by creator (user ID)
   */
  async findByCreator(createdBy: string): Promise<Order[]> {
    return prisma.order.findMany({
      where: { createdBy },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find orders with filters (for bulk/admin queries)
   */
  async findMany(
    filters: BulkOrdersFilters = {},
    options: { limit?: number; offset?: number } = {}
  ): Promise<Order[]> {
    const where: Prisma.OrderWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.assignedDroneId) {
      where.assignedDroneId = filters.assignedDroneId;
    }

    if (filters.createdBy) {
      where.createdBy = filters.createdBy;
    }

    return prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit,
      skip: options.offset,
    });
  }

  /**
   * Update order by ID
   */
  async update(id: string, data: UpdateOrderData): Promise<Order> {
    return prisma.order.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete order by ID (for withdrawal)
   */
  async delete(id: string): Promise<Order> {
    return prisma.order.delete({
      where: { id },
    });
  }

  /**
   * Find order by ID and verify it exists
   */
  async findByIdOrThrow(id: string): Promise<Order> {
    const order = await this.findById(id);
    if (!order) {
      throw new Error(`Order with id ${id} not found`);
    }
    return order;
  }

  /**
   * Count orders with filters
   */
  async count(filters: BulkOrdersFilters = {}): Promise<number> {
    const where: Prisma.OrderWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.assignedDroneId) {
      where.assignedDroneId = filters.assignedDroneId;
    }

    if (filters.createdBy) {
      where.createdBy = filters.createdBy;
    }

    return prisma.order.count({ where });
  }
}

export const orderRepository = new OrderRepository();
