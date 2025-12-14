import { validateLocation, calculateDistance, calculateETAFromLocation } from '../../src/utils/location.util';
import { ValidationError } from '../../src/utils/errors.util';

describe('Location Utilities', () => {
  describe('validateLocation', () => {
    it('should validate correct coordinates', () => {
      expect(() => validateLocation({ lat: 37.7749, lng: -122.4194 })).not.toThrow();
      expect(() => validateLocation({ lat: 0, lng: 0 })).not.toThrow();
      expect(() => validateLocation({ lat: -90, lng: -180 })).not.toThrow();
      expect(() => validateLocation({ lat: 90, lng: 180 })).not.toThrow();
    });

    it('should throw ValidationError for invalid latitude', () => {
      expect(() => validateLocation({ lat: 91, lng: 0 })).toThrow(ValidationError);
      expect(() => validateLocation({ lat: -91, lng: 0 })).toThrow(ValidationError);
      expect(() => validateLocation({ lat: 100, lng: 0 })).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid longitude', () => {
      expect(() => validateLocation({ lat: 0, lng: 181 })).toThrow(ValidationError);
      expect(() => validateLocation({ lat: 0, lng: -181 })).toThrow(ValidationError);
      expect(() => validateLocation({ lat: 0, lng: 200 })).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-numeric values', () => {
      expect(() => validateLocation({ lat: NaN, lng: 0 })).toThrow(ValidationError);
      expect(() => validateLocation({ lat: 0, lng: NaN })).toThrow(ValidationError);
      expect(() => validateLocation({ lat: Infinity, lng: 0 })).toThrow(ValidationError);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      // San Francisco to Los Angeles (approximately 560 km)
      const distance = calculateDistance(37.7749, -122.4194, 34.0522, -118.2437);
      expect(distance).toBeGreaterThan(550);
      expect(distance).toBeLessThan(570);
    });

    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(37.7749, -122.4194, 37.7749, -122.4194);
      expect(distance).toBe(0);
    });

    it('should calculate short distances correctly', () => {
      // Short distance (about 1 km)
      const distance = calculateDistance(37.7749, -122.4194, 37.7849, -122.4094);
      expect(distance).toBeGreaterThan(0.5);
      expect(distance).toBeLessThan(2);
    });
  });

  describe('calculateETA', () => {
    it('should calculate ETA correctly', () => {
      // Distance: ~1 km, Speed: 50 km/h
      const eta = calculateETAFromLocation(37.7749, -122.4194, 37.7849, -122.4094, 50);
      expect(eta).toBeInstanceOf(Date);
      expect(eta.getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle zero distance', () => {
      const eta = calculateETAFromLocation(37.7749, -122.4194, 37.7749, -122.4194, 50);
      expect(eta.getTime()).toBeGreaterThanOrEqual(Date.now());
    });

    it('should respect speed parameter', () => {
      const eta1 = calculateETAFromLocation(37.7749, -122.4194, 37.7849, -122.4094, 50);
      const eta2 = calculateETAFromLocation(37.7749, -122.4194, 37.7849, -122.4094, 100);

      // Faster speed should result in earlier ETA
      expect(eta2.getTime()).toBeLessThan(eta1.getTime());
    });
  });
});

