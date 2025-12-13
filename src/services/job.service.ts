import { JobType } from '@prisma/client';
import { jobRepository } from '../repositories/job.repository';
import { ReserveJobResponse } from '../types/job.types';
import { orderRepository } from '../repositories/order.repository';

export class JobService {
  /**
   * Reserve a job for a drone
   * Returns the first available job (prioritizes HANDOFF jobs)
   * Uses repository's transactional locking to prevent race conditions
   */
  async reserveJob(droneId: string): Promise<ReserveJobResponse | null> {
    // Get pending jobs (HANDOFF jobs are prioritized by repository)
    const pendingJobs = await jobRepository.findPendingJobs();

    if (pendingJobs.length === 0) {
      return null; // No jobs available
    }

    // Try to reserve each job until one succeeds
    // This handles the case where a job was reserved by another drone between query and reservation
    for (const job of pendingJobs) {
      try {
        const reservedJob = await jobRepository.reserveJob(job.id, droneId);

        // Get order details if this is a delivery_order job
        let order = null;
        if (reservedJob.orderId) {
          const orderData = await orderRepository.findById(reservedJob.orderId);
          if (orderData) {
            order = {
              id: orderData.id,
              origin: {
                lat: orderData.originLat,
                lng: orderData.originLng,
              },
              destination: {
                lat: orderData.destinationLat,
                lng: orderData.destinationLng,
              },
              createdBy: orderData.createdBy,
            };
          }
        }

        return {
          job: {
            id: reservedJob.id,
            type: reservedJob.type,
            orderId: reservedJob.orderId,
            originLat: reservedJob.originLat,
            originLng: reservedJob.originLng,
            destinationLat: reservedJob.destinationLat,
            destinationLng: reservedJob.destinationLng,
            brokenDroneId: reservedJob.brokenDroneId,
            status: reservedJob.status,
            assignedDroneId: reservedJob.assignedDroneId,
            createdAt: reservedJob.createdAt,
          },
          order,
        };
      } catch (error) {
        // Job was already reserved, try next one
        continue;
      }
    }

    // All jobs were reserved by other drones
    return null;
  }

  /**
   * Get count of available jobs
   */
  async getAvailableJobsCount(type?: JobType): Promise<number> {
    return jobRepository.countPending(type);
  }
}

export const jobService = new JobService();

