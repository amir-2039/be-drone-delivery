import { Drone, DroneStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface CreateDroneData {
  currentLat: number;
  currentLng: number;
  status?: DroneStatus;
}

export interface UpdateDroneData {
  status?: DroneStatus;
  currentLat?: number;
  currentLng?: number;
  lastHeartbeat?: Date;
  isBroken?: boolean;
}

export class DroneRepository {
  /**
   * Create a new drone
   */
  async create(data: CreateDroneData): Promise<Drone> {
    return prisma.drone.create({
      data: {
        currentLat: data.currentLat,
        currentLng: data.currentLng,
        status: data.status || DroneStatus.AVAILABLE,
      },
    });
  }

  /**
   * Find drone by ID
   */
  async findById(id: string): Promise<Drone | null> {
    return prisma.drone.findUnique({
      where: { id },
      include: {
        assignedOrder: true,
      },
    });
  }

  /**
   * Find all drones
   */
  async findMany(filters?: { status?: DroneStatus; isBroken?: boolean }): Promise<Drone[]> {
    const where: Prisma.DroneWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.isBroken !== undefined) {
      where.isBroken = filters.isBroken;
    }

    return prisma.drone.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find available drones (not broken, not busy)
   */
  async findAvailable(): Promise<Drone[]> {
    return prisma.drone.findMany({
      where: {
        status: DroneStatus.AVAILABLE,
        isBroken: false,
      },
      orderBy: { lastHeartbeat: 'desc' },
    });
  }

  /**
   * Update drone by ID
   */
  async update(id: string, data: UpdateDroneData): Promise<Drone> {
    return prisma.drone.update({
      where: { id },
      data,
    });
  }

  /**
   * Find drone by ID and verify it exists
   */
  async findByIdOrThrow(id: string): Promise<Drone> {
    const drone = await this.findById(id);
    if (!drone) {
      throw new Error(`Drone with id ${id} not found`);
    }
    return drone;
  }

  /**
   * Count drones
   */
  async count(filters?: { status?: DroneStatus; isBroken?: boolean }): Promise<number> {
    const where: Prisma.DroneWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.isBroken !== undefined) {
      where.isBroken = filters.isBroken;
    }

    return prisma.drone.count({ where });
  }
}

export const droneRepository = new DroneRepository();
