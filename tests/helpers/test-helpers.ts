import { UserType } from '../../src/types/user.types';
import { generateToken } from '../../src/utils/jwt.util';
import { prisma } from '../setup';
import { DroneStatus, OrderStatus } from '@prisma/client';


/**
 * Create a test user and return user data with JWT token
 */
export async function createTestUser(
  name: string,
  type: UserType
): Promise<{ user: { id: string; name: string; type: UserType }; token: string }> {
  // Try to find existing user first
  let user = await prisma.user.findFirst({
    where: { name, type },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { name, type },
    });
  }

  // Defensive check - if user was deleted between find and use, recreate
  const userCheck = await prisma.user.findUnique({ where: { id: user.id } });
  if (!userCheck) {
    user = await prisma.user.create({
      data: { name, type },
    });
  }

  const token = generateToken({
    userId: user.id,
    name: user.name,
    type: user.type as UserType,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      type: user.type as UserType,
    },
    token,
  };
}

/**
 * Create a test drone
 */
export async function createTestDrone(
  data: {
    currentLat?: number;
    currentLng?: number;
    status?: DroneStatus;
    isBroken?: boolean;
  } = {}
) {
  return prisma.drone.create({
    data: {
      currentLat: data.currentLat || 37.7749,
      currentLng: data.currentLng || -122.4194,
      status: data.status || DroneStatus.AVAILABLE,
      isBroken: data.isBroken || false,
    },
  });
}

/**
 * Create a test order
 * Note: createdBy must be a valid UUID of an existing user
 * The function will ensure the user exists before creating the order
 */
export async function createTestOrder(data: {
  createdBy: string; // Must be valid UUID
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  status?: OrderStatus;
  assignedDroneId?: string | null;
}) {
  // Always ensure user exists before creating order
  // Check if user exists by ID first
  let user = await prisma.user.findUnique({ where: { id: data.createdBy } });
  
  if (!user) {
    // User doesn't exist, try to create with a unique name
    const userName = `test-user-${data.createdBy.substring(0, 8)}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    try {
      user = await prisma.user.create({
        data: { id: data.createdBy, name: userName, type: UserType.ENDUSER },
      });
    } catch (error: any) {
      // If creation fails (e.g., ID already exists), try to find by ID again
      user = await prisma.user.findUnique({ where: { id: data.createdBy } });
      if (!user) {
        // Last resort: create without specifying ID
        user = await prisma.user.create({
          data: { name: userName, type: UserType.ENDUSER },
        });
      }
    }
  }

  // If assignedDroneId is provided, ensure drone exists
  if (data.assignedDroneId) {
    const drone = await prisma.drone.findUnique({ where: { id: data.assignedDroneId } });
    if (!drone) {
      // Create drone if it doesn't exist
      await prisma.drone.create({
        data: {
          id: data.assignedDroneId,
          currentLat: 0,
          currentLng: 0,
          status: DroneStatus.AVAILABLE,
        },
      });
    }
  }

  // Create order - status defaults to PENDING, so we always update if needed
  const order = await prisma.order.create({
    data: {
      createdBy: data.createdBy,
      originLat: data.originLat || 37.7749,
      originLng: data.originLng || -122.4194,
      destinationLat: data.destinationLat || 37.7849,
      destinationLng: data.destinationLng || -122.4094,
      // Status and assignedDroneId will be updated below if needed
    },
  });

  // Update status and/or assignedDroneId if provided (after initial creation)
  const updateData: any = {};
  if (data.status && data.status !== OrderStatus.PENDING) {
    updateData.status = data.status;
  }
  if (data.assignedDroneId !== undefined && data.assignedDroneId !== null) {
    updateData.assignedDroneId = data.assignedDroneId;
  }

  if (Object.keys(updateData).length > 0) {
    return prisma.order.update({
      where: { id: order.id },
      data: updateData,
    });
  }

  return order;
}

/**
 * Create a test job
 * Validates foreign key constraints before creation
 */
export async function createTestJob(data: {
  type: 'DELIVERY_ORDER' | 'HANDOFF';
  orderId?: string | null;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  brokenDroneId?: string | null;
  assignedDroneId?: string | null;
  status?: 'PENDING' | 'RESERVED' | 'COMPLETED';
}) {
  // If orderId is provided, ensure order exists (or create a placeholder)
  if (data.orderId) {
    const order = await prisma.order.findUnique({ where: { id: data.orderId } });
    if (!order) {
      // Create a placeholder order - we'll need a user first
      // Use a unique user ID based on the orderId to avoid conflicts
      const tempUserId = `temp-user-${data.orderId.substring(0, 8)}`;
      const tempUserName = `temp-user-${data.orderId.substring(0, 8)}`;
      
      // Ensure user exists with upsert to handle unique constraint
      await prisma.user.upsert({
        where: { name_type: { name: tempUserName, type: UserType.ENDUSER } },
        update: { id: tempUserId }, // Update ID if name exists
        create: { id: tempUserId, name: tempUserName, type: UserType.ENDUSER },
      });
      
      await prisma.order.create({
        data: {
          id: data.orderId,
          createdBy: tempUserId,
          originLat: data.originLat,
          originLng: data.originLng,
          destinationLat: data.destinationLat,
          destinationLng: data.destinationLng,
          status: OrderStatus.PENDING,
        },
      });
    }
  }

  // If brokenDroneId is provided, ensure drone exists (or create it)
  if (data.brokenDroneId) {
    const drone = await prisma.drone.findUnique({ where: { id: data.brokenDroneId } });
    if (!drone) {
      await prisma.drone.create({
        data: {
          id: data.brokenDroneId,
          currentLat: 0,
          currentLng: 0,
          status: DroneStatus.BROKEN,
          isBroken: true,
        },
      });
    }
  }

  // If assignedDroneId is provided, ensure drone exists (or create it)
  if (data.assignedDroneId) {
    const drone = await prisma.drone.findUnique({ where: { id: data.assignedDroneId } });
    if (!drone) {
      await prisma.drone.create({
        data: {
          id: data.assignedDroneId,
          currentLat: 0,
          currentLng: 0,
          status: DroneStatus.AVAILABLE,
        },
      });
    }
  }

  return prisma.job.create({
    data: {
      type: data.type,
      orderId: data.orderId || null,
      originLat: data.originLat,
      originLng: data.originLng,
      destinationLat: data.destinationLat,
      destinationLng: data.destinationLng,
      brokenDroneId: data.brokenDroneId || null,
      assignedDroneId: data.assignedDroneId || null,
      status: data.status || 'PENDING',
    },
  });
}

/**
 * Wait for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

