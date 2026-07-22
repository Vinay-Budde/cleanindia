import { MunicipalCorporation } from '../models/MunicipalCorporation';
import { Complaint } from '../models/Complaint';
import { Zone } from '../models/Zone';
import { Ward } from '../models/Ward';
import { User } from '../models/User';

export interface AssignmentResult {
    municipalityId: string;
    municipalityName: string;
    district: string;
    state: string;
    zoneId?: string;
    zoneName?: string;
    wardId?: string;
    wardName?: string;
    officerId?: string;
    officerName?: string;
    assignmentMethod: 'polygon' | 'nearest' | 'none';
}

export class MunicipalityService {
    static async assignMunicipality(
        longitude: number,
        latitude: number
    ): Promise<AssignmentResult> {
        const point = { type: 'Point', coordinates: [longitude, latitude] };

        // Step 1: Polygon-based municipality assignment
        let polygonMatch: any = await MunicipalCorporation.findOne({
            active: true,
            jurisdictionBoundary: { $geoIntersects: { $geometry: point } },
        }).lean();

        let assignmentMethod: 'polygon' | 'nearest' | 'none' = 'none';

        if (polygonMatch) {
            assignmentMethod = 'polygon';
        } else {
            // Fallback: nearest office
            polygonMatch = await MunicipalCorporation.findOne({
                active: true,
                officeLocation: { $near: { $geometry: point, $maxDistance: 500000 } },
            }).lean();
            if (polygonMatch) assignmentMethod = 'nearest';
        }

        if (!polygonMatch || assignmentMethod === 'none') {
            return { municipalityId: '', municipalityName: '', district: '', state: '', assignmentMethod: 'none' };
        }

        const result: AssignmentResult = {
            municipalityId: polygonMatch._id.toString(),
            municipalityName: polygonMatch.name,
            district: polygonMatch.district,
            state: polygonMatch.state,
            assignmentMethod,
        };

        // Step 2: Zone assignment
        const zone = await Zone.findOne({
            municipalityId: polygonMatch._id,
            active: true,
            boundary: { $geoIntersects: { $geometry: point } },
        }).lean();

        if (zone) {
            result.zoneId = zone._id.toString();
            result.zoneName = zone.name;

            // Step 3: Ward assignment
            const ward = await Ward.findOne({
                zoneId: zone._id,
                active: true,
                boundary: { $geoIntersects: { $geometry: point } },
            }).lean();

            if (ward) {
                result.wardId = ward._id.toString();
                result.wardName = ward.name;

                // Step 4: Find field inspector in this ward
                const officer = await User.findOne({
                    wardId: ward._id,
                    role: 'field_inspector',
                    isActive: true,
                }).lean();

                if (officer) {
                    result.officerId = officer._id.toString();
                    result.officerName = (officer as any).name;
                } else {
                    // Fallback to zone officer
                    const zoneOfficer = await User.findOne({
                        zoneId: zone._id,
                        role: 'zone_officer',
                        isActive: true,
                    }).lean();
                    if (zoneOfficer) {
                        result.officerId = zoneOfficer._id.toString();
                        result.officerName = (zoneOfficer as any).name;
                    }
                }
            }
        }

        return result;
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
        return MunicipalCorporation.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    }

    static async softDelete(id: string) {
        return MunicipalCorporation.findByIdAndUpdate(id, { active: false }, { new: true }).lean();
    }

    static async uploadBoundary(id: string, geojson: any) {
        let polygonGeometry: any = null;
        if (geojson.type === 'FeatureCollection' && geojson.features?.length > 0) {
            polygonGeometry = geojson.features[0].geometry;
        } else if (geojson.type === 'Feature') {
            polygonGeometry = geojson.geometry;
        } else if (geojson.type === 'Polygon') {
            polygonGeometry = geojson;
        }
        if (!polygonGeometry || polygonGeometry.type !== 'Polygon') {
            throw new Error('Invalid GeoJSON: expected a Polygon geometry');
        }
        return MunicipalCorporation.findByIdAndUpdate(id, { jurisdictionBoundary: polygonGeometry }, { new: true, runValidators: true }).lean();
    }

    static async getMapData() {
        return MunicipalCorporation.find({ active: true })
            .select('name state district contactEmail phone jurisdictionBoundary officeLocation jurisdictionLevel')
            .lean();
    }

    static async getStats() {
        const stats = await Complaint.aggregate([
            { $match: { assignedMunicipality: { $exists: true, $ne: null } } },
            { $group: {
                _id: '$assignedMunicipality',
                total: { $sum: 1 },
                resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
                pending: { $sum: { $cond: [{ $in: ['$status', ['submitted','verified']] }, 1, 0] } },
                critical: { $sum: { $cond: [{ $in: ['$priority', ['emergency','critical']] }, 1, 0] } },
            }},
            { $lookup: { from: 'municipalcorporations', localField: '_id', foreignField: '_id', as: 'municipality' } },
            { $unwind: { path: '$municipality', preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, name: '$municipality.name', district: '$municipality.district', state: '$municipality.state', total: 1, resolved: 1, pending: 1, critical: 1 } },
            { $sort: { total: -1 } },
        ]);
        return stats;
    }
}
