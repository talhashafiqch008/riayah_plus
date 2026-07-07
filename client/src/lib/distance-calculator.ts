/**
 * Distance Calculator
 * Haversine formula for accurate distance calculation
 */

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export class DistanceCalculator {
    /**
     * Calculate distance between two points using Haversine formula
     * Returns distance in kilometers
     */
    static calculateDistance(
        point1: Coordinates,
        point2: Coordinates
    ): number {
        const R = 6371; // Earth's radius in kilometers

        const lat1 = this.toRadians(point1.latitude);
        const lat2 = this.toRadians(point2.latitude);
        const deltaLat = this.toRadians(point2.latitude - point1.latitude);
        const deltaLon = this.toRadians(point2.longitude - point1.longitude);

        const a =
            Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const distance = R * c;

        return Math.round(distance * 10) / 10; // Round to 1 decimal place
    }

    /**
     * Calculate location score based on distance
     * 0-5km: 100 points
     * 5-10km: 80 points
     * 10-15km: 60 points
     * 15-20km: 40 points
     * 20-25km: 20 points
     * 25km+: 0 points
     */
    static calculateLocationScore(distanceKm: number): number {
        if (distanceKm <= 5) return 100;
        if (distanceKm <= 10) return 80;
        if (distanceKm <= 15) return 60;
        if (distanceKm <= 20) return 40;
        if (distanceKm <= 25) return 20;
        return 0;
    }

    /**
     * Check if location is within service radius
     */
    static isWithinRadius(
        point1: Coordinates,
        point2: Coordinates,
        maxDistanceKm: number
    ): boolean {
        const distance = this.calculateDistance(point1, point2);
        return distance <= maxDistanceKm;
    }

    /**
     * Convert degrees to radians
     */
    private static toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    /**
     * Get distance category for display
     */
    static getDistanceCategory(distanceKm: number): string {
        if (distanceKm < 2) return 'Very close';
        if (distanceKm < 5) return 'Nearby';
        if (distanceKm < 10) return 'Close';
        if (distanceKm < 20) return 'Moderate distance';
        return 'Far';
    }
}
