import { ValidationError } from './errors.util';

export interface Location {
  lat: number;
  lng: number;
}

/**
 * Validate latitude and longitude coordinates
 */
export function validateCoordinates(lat: number, lng: number): void {
  if (typeof lat !== 'number' || isNaN(lat)) {
    throw new ValidationError('Latitude must be a valid number');
  }

  if (typeof lng !== 'number' || isNaN(lng)) {
    throw new ValidationError('Longitude must be a valid number');
  }

  if (lat < -90 || lat > 90) {
    throw new ValidationError('Latitude must be between -90 and 90 degrees');
  }

  if (lng < -180 || lng > 180) {
    throw new ValidationError('Longitude must be between -180 and 180 degrees');
  }
}

/**
 * Validate location object
 */
export function validateLocation(location: Location): void {
  validateCoordinates(location.lat, location.lng);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  validateCoordinates(lat1, lng1);
  validateCoordinates(lat2, lng2);

  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate ETA (Estimated Time of Arrival) based on distance and speed
 * @param distanceKm - Distance in kilometers
 * @param speedKmh - Average speed in kilometers per hour (default: 50 km/h)
 * @returns Date object representing the ETA
 */
export function calculateETA(distanceKm: number, speedKmh: number = 50): Date {
  if (distanceKm < 0) {
    throw new ValidationError('Distance cannot be negative');
  }

  if (speedKmh <= 0) {
    throw new ValidationError('Speed must be greater than 0');
  }

  const hours = distanceKm / speedKmh;
  const milliseconds = hours * 60 * 60 * 1000;
  const eta = new Date(Date.now() + milliseconds);

  return eta;
}

/**
 * Calculate ETA from current location to destination
 */
export function calculateETAFromLocation(
  currentLat: number,
  currentLng: number,
  destinationLat: number,
  destinationLng: number,
  speedKmh: number = 50
): Date {
  const distance = calculateDistance(currentLat, currentLng, destinationLat, destinationLng);
  return calculateETA(distance, speedKmh);
}

/**
 * Calculate estimated time remaining in minutes
 */
export function calculateTimeRemainingMinutes(eta: Date): number {
  const now = new Date();
  const diffMs = eta.getTime() - now.getTime();
  const diffMinutes = Math.ceil(diffMs / (1000 * 60));

  return Math.max(0, diffMinutes); // Don't return negative values
}
