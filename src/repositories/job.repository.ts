import { Job, JobType, JobStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface CreateJobData {
  type: JobType;
  orderId?: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  brokenDroneId?: string;
}

export interface UpdateJobData {
  status?: JobStatus;
  assignedDroneId?: string | null;
}

export class JobRepository {
  /**
   * Create a new job
   */
  async create(data: CreateJobData): Promise<Job> {
    return prisma.job.create({
      data: {
        type: data.type,
        orderId: data.orderId || null,
        originLat: data.originLat,
        originLng: data.originLng,
        destinationLat: data.destinationLat,
        destinationLng: data.destinationLng,
        brokenDroneId: data.brokenDroneId || null,
        status: JobStatus.PENDING,
      },
    });
  }

  /**
   * Find job by ID
   */
  async findById(id: string): Promise<Job | null> {
    return prisma.job.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });
  }

  /**
   * Find pending jobs (available for reservation)
   */
  async findPendingJobs(type?: JobType): Promise<Job[]> {
    const where: Prisma.JobWhereInput = {
      status: JobStatus.PENDING,
    };

    if (type) {
      where.type = type;
    }

    return prisma.job.findMany({
      where,
      orderBy: [
        { type: 'desc' }, // HANDOFF jobs first (priority)
        { createdAt: 'asc' }, // Then by creation time
      ],
    });
  }

  /**
   * Reserve a job (with transaction for atomic operation)
   * Uses SELECT FOR UPDATE to prevent race conditions
   */
  async reserveJob(jobId: string, droneId: string): Promise<Job> {
    // Use a transaction to ensure atomicity
    return prisma.$transaction(async (tx) => {
      // Lock the job row for update
      const job = await tx.job.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error(`Job with id ${jobId} not found`);
      }

      if (job.status !== JobStatus.PENDING) {
        throw new Error(`Job ${jobId} is not available for reservation`);
      }

      // Update job status and assign drone
      return tx.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.RESERVED,
          assignedDroneId: droneId,
        },
        include: {
          order: true,
        },
      });
    });
  }

  /**
   * Update job by ID
   */
  async update(id: string, data: UpdateJobData): Promise<Job> {
    return prisma.job.update({
      where: { id },
      data,
    });
  }

  /**
   * Mark job as completed
   */
  async completeJob(id: string): Promise<Job> {
    return prisma.job.update({
      where: { id },
      data: {
        status: JobStatus.COMPLETED,
      },
    });
  }

  /**
   * Find job by ID and verify it exists
   */
  async findByIdOrThrow(id: string): Promise<Job> {
    const job = await this.findById(id);
    if (!job) {
      throw new Error(`Job with id ${id} not found`);
    }
    return job;
  }

  /**
   * Count pending jobs
   */
  async countPending(type?: JobType): Promise<number> {
    const where: Prisma.JobWhereInput = {
      status: JobStatus.PENDING,
    };

    if (type) {
      where.type = type;
    }

    return prisma.job.count({ where });
  }

  /**
   * Find jobs by assigned drone
   */
  async findByAssignedDrone(droneId: string): Promise<Job[]> {
    return prisma.job.findMany({
      where: {
        assignedDroneId: droneId,
        status: {
          in: [JobStatus.PENDING, JobStatus.RESERVED],
        },
      },
      include: {
        order: true,
      },
    });
  }
}

export const jobRepository = new JobRepository();
