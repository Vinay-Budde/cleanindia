import { Complaint } from '../models/Complaint';

const EARTH_RADIUS_M = 6371000;
const DUPLICATE_RADIUS_M = 20;
const DUPLICATE_DAYS = 7;

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    existingComplaint?: any;
}

export class DuplicateDetectionService {
    /**
     * Check if a similar complaint exists within 20m radius in last 7 days.
     * Uses MongoDB $geoWithin $centerSphere for efficient geospatial query.
     */
    static async checkDuplicate(
        category: string,
        longitude: number,
        latitude: number
    ): Promise<DuplicateCheckResult> {
        const sevenDaysAgo = new Date(Date.now() - DUPLICATE_DAYS * 24 * 60 * 60 * 1000);
        const radiusInRadians = DUPLICATE_RADIUS_M / EARTH_RADIUS_M;

        const existing = await Complaint.findOne({
            category,
            isDuplicate: { $ne: true },
            status: { $nin: ['resolved', 'closed'] },
            reportedAt: { $gte: sevenDaysAgo },
            geoPoint: {
                $geoWithin: {
                    $centerSphere: [[longitude, latitude], radiusInRadians],
                },
            },
        })
            .select('_id complaintId title category location status reportedAt supportCount')
            .lean();

        if (existing) {
            return { isDuplicate: true, existingComplaint: existing };
        }

        return { isDuplicate: false };
    }

    /**
     * Increment support count on parent complaint when citizen joins.
     */
    static async supportComplaint(complaintId: string, userId: string): Promise<void> {
        await Complaint.findByIdAndUpdate(complaintId, {
            $inc: { supportCount: 1 },
        });
    }
}
