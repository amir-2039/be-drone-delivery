import { DroneStatus } from '@prisma/client';

export interface Location {
  lat: number;
  lng: number;
}

export interface CreateDroneRequest {
  currentLat: number;
  currentLng: number;
}

export interface DroneResponse {
  id: string;
  status: DroneStatus;
  currentLat: number;
  currentLng: number;
  lastHeartbeat: Date;
  isBroken: boolean;
  assignedOrderId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateDroneLocationRequest {
  latitude: number;
  longitude: number;
}

export interface DroneStatusUpdateResponse {
  status: 'ok' | 'warning' | 'error';
  drone_status: DroneStatus;
  assigned_order?: {
    id: string;
    destination: Location;
    eta: string | null;
    progress: string;
  } | null;
  available_jobs_count?: number;
}
