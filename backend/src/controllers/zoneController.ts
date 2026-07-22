import { Request, Response, NextFunction } from 'express';
import { Zone } from '../models/Zone';
import { ApiResponse } from '../utils/ApiResponse';

export const getZones = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const query: any = {};
        if (req.query.municipalityId) query.municipalityId = req.query.municipalityId;
        if (req.query.active !== undefined) query.active = req.query.active === 'true';
        const zones = await Zone.find(query).sort({ name: 1 }).lean();
        return ApiResponse.success(res, zones);
    } catch (error) { next(error); }
};

export const getZoneById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const zone = await Zone.findById(String(req.params.id)).populate('municipalityId', 'name').lean();
        if (!zone) return ApiResponse.error(res, 'Zone not found', 404);
        return ApiResponse.success(res, zone);
    } catch (error) { next(error); }
};

export const createZone = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const zone = new Zone(req.body);
        await zone.save();
        return ApiResponse.success(res, zone, 'Zone created', 201);
    } catch (error) { next(error); }
};

export const updateZone = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const zone = await Zone.findByIdAndUpdate(String(req.params.id), req.body, { new: true, runValidators: true }).lean();
        if (!zone) return ApiResponse.error(res, 'Zone not found', 404);
        return ApiResponse.success(res, zone, 'Zone updated');
    } catch (error) { next(error); }
};

export const deleteZone = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const zone = await Zone.findByIdAndUpdate(String(req.params.id), { active: false }, { new: true }).lean();
        if (!zone) return ApiResponse.error(res, 'Zone not found', 404);
        return ApiResponse.success(res, zone, 'Zone deactivated');
    } catch (error) { next(error); }
};

export const uploadZoneBoundary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body.geojson) return ApiResponse.error(res, 'No GeoJSON provided', 400);
        let geo: any;
        try { geo = typeof req.body.geojson === 'string' ? JSON.parse(req.body.geojson) : req.body.geojson; } catch { return ApiResponse.error(res, 'Invalid JSON', 400); }
        let boundary: any = null;
        if (geo.type === 'FeatureCollection') boundary = geo.features?.[0]?.geometry;
        else if (geo.type === 'Feature') boundary = geo.geometry;
        else if (geo.type === 'Polygon') boundary = geo;
        if (!boundary || boundary.type !== 'Polygon') return ApiResponse.error(res, 'Expected Polygon GeoJSON', 400);
        const zone = await Zone.findByIdAndUpdate(String(req.params.id), { boundary }, { new: true }).lean();
        if (!zone) return ApiResponse.error(res, 'Zone not found', 404);
        return ApiResponse.success(res, zone, 'Boundary uploaded');
    } catch (error) { next(error); }
};
