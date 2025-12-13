import { JobType, JobStatus } from '@prisma/client';

export interface Location {
  lat: number;
  lng: number;
}

export interface JobResponse {
  id: string;
  type: JobType;
  orderId?: string | null;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  brokenDroneId?: string | null;
  status: JobStatus;
  assignedDroneId?: string | null;
  createdAt: Date;
}

export interface ReserveJobResponse {
  job: JobResponse;
  order?: {
    id: string;
    origin: Location;
    destination: Location;
    createdBy: string;
  } | null;
}
