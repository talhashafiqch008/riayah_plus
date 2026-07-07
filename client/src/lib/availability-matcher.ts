/**
 * Availability Matcher
 * Schedule overlap detection and availability scoring
 */

import { AvailabilitySlot } from '@/types/care-intent';

export class AvailabilityMatcher {
    /**
     * Calculate overlap between careseeker and provider availability
     * Returns percentage overlap (0-100)
     */
    static calculateOverlap(
        careseekerSlots: AvailabilitySlot[],
        providerSlots: AvailabilitySlot[]
    ): number {
        if (careseekerSlots.length === 0 || providerSlots.length === 0) {
            return 0;
        }

        let matchedSlots = 0;

        for (const csSlot of careseekerSlots) {
            for (const pSlot of providerSlots) {
                if (this.slotsOverlap(csSlot, pSlot)) {
                    matchedSlots++;
                    break; // Count each careseeker slot only once
                }
            }
        }

        const overlapPercentage = (matchedSlots / careseekerSlots.length) * 100;
        return Math.round(overlapPercentage);
    }

    /**
     * Check if two time slots overlap
     */
    static slotsOverlap(slot1: AvailabilitySlot, slot2: AvailabilitySlot): boolean {
        // Must be same day
        if (slot1.day_of_week !== slot2.day_of_week) {
            return false;
        }

        const start1 = this.timeToMinutes(slot1.start_time);
        const end1 = this.timeToMinutes(slot1.end_time);
        const start2 = this.timeToMinutes(slot2.start_time);
        const end2 = this.timeToMinutes(slot2.end_time);

        // Check for any overlap
        return start1 < end2 && start2 < end1;
    }

    /**
     * Convert HH:mm time to minutes since midnight
     */
    private static timeToMinutes(time: string): number {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * Calculate availability score based on overlap and urgency
     */
    static calculateAvailabilityScore(
        overlapPercentage: number,
        urgency: string,
        nextAvailableHours: number
    ): number {
        let score = overlapPercentage * 0.6; // 60% weight for schedule overlap

        // Urgency matching (30% weight)
        let urgencyScore = 0;
        switch (urgency) {
            case 'IMMEDIATE':
                urgencyScore = nextAvailableHours <= 24 ? 100 : 0;
                break;
            case 'WITHIN_WEEK':
                urgencyScore = nextAvailableHours <= 168 ? 100 : 50;
                break;
            case 'WITHIN_MONTH':
                urgencyScore = nextAvailableHours <= 720 ? 100 : 75;
                break;
            case 'FLEXIBLE':
                urgencyScore = 100;
                break;
        }
        score += urgencyScore * 0.3;

        // Flexibility bonus (10% weight)
        const flexibilityScore = overlapPercentage > 50 ? 100 : overlapPercentage * 2;
        score += flexibilityScore * 0.1;

        return Math.round(score);
    }

    /**
     * Find matching time slots
     */
    static findMatchingSlots(
        careseekerSlots: AvailabilitySlot[],
        providerSlots: AvailabilitySlot[]
    ): AvailabilitySlot[] {
        const matches: AvailabilitySlot[] = [];

        for (const csSlot of careseekerSlots) {
            for (const pSlot of providerSlots) {
                if (this.slotsOverlap(csSlot, pSlot)) {
                    matches.push(csSlot);
                    break;
                }
            }
        }

        return matches;
    }

    /**
     * Get day name from day number
     */
    static getDayName(dayOfWeek: number): string {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[dayOfWeek] || 'Unknown';
    }
}
