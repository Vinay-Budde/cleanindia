import { MunicipalCorporation } from '../models/MunicipalCorporation';
import { Complaint } from '../models/Complaint';

export interface AssignmentResult {
    municipalityId: string;
    municipalityName: string;
    district: string;
    state: string;
    assignmentMethod: 'polygon' | 'nearest' | 'none';
}

/**
 * Reusable service to assign a complaint location to the correct Municipal Corporation.
 *
 * Step 1: Check if the point is INSIDE any MC boundary using $geoIntersects (polygon match).
 * Step 2: If no polygon match, find the NEAREST MC office using $near (fallback).
 *
 * This mirrors how Uber/Swiggy/Rapido determine service zones using geofencing.
 */
export class MunicipalityService {
    static async assignMunicipality(
        longitude: number,
        latitude: number
    ): Promise<AssignmentResult> {
        const point = {
            type: 'Point',
            coordinates: [longitude, latitude],
        };

        // --- Step 1: Polygon-based assignment (geofencing) ---
        const polygonMatch = await MunicipalCorporation.findOne({
            active: true,
            jurisdictionBoundary: {
                $geoIntersects: {
                    $geometry: point,
                },
            },
        }).lean();

        if (polygonMatch) {
            return {
                municipalityId: (polygonMatch._id as any).toString(),
                municipalityName: polygonMatch.name,
                district: polygonMatch.district,
                state: polygonMatch.state,
                assignmentMethod: 'polygon',
            };
        }

        // --- Step 2: Nearest office fallback ---
        const nearest = await MunicipalCorporation.findOne({
            active: true,
            officeLocation: {
                $near: {
                    $geometry: point,
                    $maxDistance: 500000, // 500km max radius
                },
            },
        }).lean();

        if (nearest) {
            return {
                municipalityId: (nearest._id as any).toString(),
                municipalityName: nearest.name,
                district: nearest.district,
                state: nearest.state,
                assignmentMethod: 'nearest',
            };
        }

        // --- No municipality found ---
        return {
            municipalityId: '',
            municipalityName: '',
            district: '',
            state: '',
            assignmentMethod: 'none',
        };
    }

    static async getAll(filter: any = {}) {
        const query: any = {};
        if (filter.active !== undefined) query.active = filter.active === 'true';
        if (filter.state) query.state = new RegExp(filter.state, 'i');
        if (filter.district) query.district = new RegExp(filter.district, 'i');
        return MunicipalCorporation.find(query).sort({ name: 1 }).lean();
    }

    static async getById(id: string) {
        return MunicipalCorporation.findById(id).lean();
    }

    static async create(data: any) {
        const mc = new MunicipalCorporation(data);
        return mc.save();
    }

    static async update(id: string, data: any) {
        return MunicipalCorporation.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true,
        }).lean();
    }

    static async softDelete(id: string) {
        return MunicipalCorporation.findByIdAndUpdate(
            id,
            { active: false },
            { new: true }
        ).lean();
    }

    static async uploadBoundary(id: string, geojson: any) {
        // Accept either a FeatureCollection, Feature, or raw Polygon geometry
        let polygonGeometry: any = null;

        if (geojson.type === 'FeatureCollection' && geojson.features?.length > 0) {
            const feature = geojson.features[0];
            polygonGeometry = feature.geometry;
        } else if (geojson.type === 'Feature') {
            polygonGeometry = geojson.geometry;
        } else if (geojson.type === 'Polygon') {
            polygonGeometry = geojson;
        }

        if (!polygonGeometry || polygonGeometry.type !== 'Polygon') {
            throw new Error('Invalid GeoJSON: expected a Polygon geometry');
        }

        return MunicipalCorporation.findByIdAndUpdate(
            id,
            { jurisdictionBoundary: polygonGeometry },
            { new: true, runValidators: true }
        ).lean();
    }

    static async getMapData() {
        // Returns all active MCs with boundary + basic info for Leaflet rendering
        return MunicipalCorporation.find({ active: true })
            .select('name state district contactEmail phone jurisdictionBoundary officeLocation jurisdictionLevel')
            .lean();
    }

    static async getStats() {
        // Aggregates complaint counts per municipality

        const stats = await Complaint.aggregate([
            {
                $match: {
                    assignedMunicipality: { $exists: true, $ne: null },
                },
            },
            {
                $group: {
                    _id: '$assignedMunicipality',
                    total: { $sum: 1 },
                    resolved: {
                        $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
                    },
                    pending: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['submitted', 'verified']] },
                                1,
                                0,
                            ],
                        },
                    },
                    critical: {
                        $sum: {
                            $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0],
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: 'municipalcorporations',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'municipality',
                },
            },
            {
                $unwind: { path: '$municipality', preserveNullAndEmptyArrays: true },
            },
            {
                $project: {
                    _id: 1,
                    name: '$municipality.name',
                    district: '$municipality.district',
                    state: '$municipality.state',
                    total: 1,
                    resolved: 1,
                    pending: 1,
                    critical: 1,
                },
            },
            { $sort: { total: -1 } },
        ]);

        return stats;
    }
}
