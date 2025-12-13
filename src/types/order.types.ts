import { OrderStatus } from '@prisma/client';

export interface Location {
  lat: number;
  lng: number;
}

export interface CreateOrderRequest {
  origin: Location;
  destination: Location;
}

export interface OrderResponse {
  id: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  status: OrderStatus;
  createdBy: string;
  assignedDroneId?: string | null;
  currentLat?: number | null;
  currentLng?: number | null;
  eta?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderWithProgress extends OrderResponse {
  currentLocation?: Location | null;
  progress: string;
  estimatedTimeRemaining?: number | null; // in minutes
}

export interface UpdateOrderOriginRequest {
  lat: number;
  lng: number;
}

export interface UpdateOrderDestinationRequest {
  lat: number;
  lng: number;
}

export interface BulkOrdersQuery {
  status?: OrderStatus;
  assignedDroneId?: string;
  createdBy?: string;
  limit?: number;
  offset?: number;
}
