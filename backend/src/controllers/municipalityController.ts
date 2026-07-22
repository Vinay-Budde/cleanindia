import { Request, Response, NextFunction } from 'express';
import { MunicipalityService } from '../services/municipalityService';
import { ApiResponse } from '../utils/ApiResponse';

// GET /api/municipalities
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await MunicipalityService.getAll(req.query);
        return ApiResponse.success(res, data);
    } catch (error) {
        next(error);
    }
};

// GET /api/municipalities/map  — boundaries + basic info for Leaflet
export const getMap = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await MunicipalityService.getMapData();
        return ApiResponse.success(res, data);
    } catch (error) {
        next(error);
    }
};

// GET /api/municipalities/stats  — per-municipality complaint counts
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await MunicipalityService.getStats();
        return ApiResponse.success(res, data);
    } catch (error) {
        next(error);
    }
};

// GET /api/municipalities/:id
export const getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await MunicipalityService.getById(String(req.params.id));
        if (!data) return ApiResponse.error(res, 'Municipality not found', 404);
        return ApiResponse.success(res, data);
    } catch (error) {
        next(error);
    }
};

// POST /api/municipalities
export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await MunicipalityService.create(req.body);
        return ApiResponse.success(res, data, 'Municipality created successfully', 201);
    } catch (error) {
        next(error);
    }
};

// PATCH /api/municipalities/:id
export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await MunicipalityService.update(String(req.params.id), req.body);
        if (!data) return ApiResponse.error(res, 'Municipality not found', 404);
        return ApiResponse.success(res, data, 'Municipality updated successfully');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/municipalities/:id  (soft delete)
export const deleteOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await MunicipalityService.softDelete(String(req.params.id));
        if (!data) return ApiResponse.error(res, 'Municipality not found', 404);
        return ApiResponse.success(res, data, 'Municipality deactivated successfully');
    } catch (error) {
        next(error);
    }
};

// POST /api/municipalities/:id/geojson  — upload boundary
export const uploadGeoJSON = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body.geojson) {
            return ApiResponse.error(res, 'No GeoJSON data provided', 400);
        }

        let geojson: any;
        try {
            geojson = typeof req.body.geojson === 'string'
                ? JSON.parse(req.body.geojson)
                : req.body.geojson;
        } catch {
            return ApiResponse.error(res, 'Invalid JSON in geojson field', 400);
        }

        const data = await MunicipalityService.uploadBoundary(String(req.params.id), geojson);
        if (!data) return ApiResponse.error(res, 'Municipality not found', 404);
        return ApiResponse.success(res, data, 'Boundary updated successfully');
    } catch (error: any) {
        if (error.message?.includes('Invalid GeoJSON')) {
            return ApiResponse.error(res, error.message, 400);
        }
        next(error);
    }
};
