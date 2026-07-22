import { Request, Response, NextFunction } from 'express';
import { Ward } from '../models/Ward';
import { ApiResponse } from '../utils/ApiResponse';

export const getWards = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const query: any = {};
        if (req.query.zoneId) query.zoneId = req.query.zoneId;
        if (req.query.municipalityId) query.municipalityId = req.query.municipalityId;
        if (req.query.active !== undefined) query.active = req.query.active === 'true';
        const wards = await Ward.find(query).sort({ name: 1 }).lean();
        return ApiResponse.success(res, wards);
    } catch (error) { next(error); }
};

export const getWardById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ward = await Ward.findById(String(req.params.id)).populate('zoneId', 'name').populate('municipalityId', 'name').lean();
        if (!ward) return ApiResponse.error(res, 'Ward not found', 404);
        return ApiResponse.success(res, ward);
    } catch (error) { next(error); }
};

export const createWard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ward = new Ward(req.body);
        await ward.save();
        return ApiResponse.success(res, ward, 'Ward created', 201);
    } catch (error) { next(error); }
};

export const updateWard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ward = await Ward.findByIdAndUpdate(String(req.params.id), req.body, { new: true, runValidators: true }).lean();
        if (!ward) return ApiResponse.error(res, 'Ward not found', 404);
        return ApiResponse.success(res, ward, 'Ward updated');
    } catch (error) { next(error); }
};

export const deleteWard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ward = await Ward.findByIdAndUpdate(String(req.params.id), { active: false }, { new: true }).lean();
        if (!ward) return ApiResponse.error(res, 'Ward not found', 404);
        return ApiResponse.success(res, ward, 'Ward deactivated');
    } catch (error) { next(error); }
};

export const uploadWardBoundary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body.geojson) return ApiResponse.error(res, 'No GeoJSON provided', 400);
        let geo: any;
        try { geo = typeof req.body.geojson === 'string' ? JSON.parse(req.body.geojson) : req.body.geojson; } catch { return ApiResponse.error(res, 'Invalid JSON', 400); }
        let boundary: any = null;
        if (geo.type === 'FeatureCollection') boundary = geo.features?.[0]?.geometry;
        else if (geo.type === 'Feature') boundary = geo.geometry;
        else if (geo.type === 'Polygon') boundary = geo;
        if (!boundary || boundary.type !== 'Polygon') return ApiResponse.error(res, 'Expected Polygon GeoJSON', 400);
        const ward = await Ward.findByIdAndUpdate(String(req.params.id), { boundary }, { new: true }).lean();
        if (!ward) return ApiResponse.error(res, 'Ward not found', 404);
        return ApiResponse.success(res, ward, 'Boundary uploaded');
    } catch (error) { next(error); }
};
