import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../utils/ApiResponse';

const OFFICER_ROLES = ['super_admin','state_admin','commissioner','zone_officer','ward_officer','field_inspector','admin','worker'];

export const authenticate = (req: any, res: Response, next: NextFunction) => {
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return ApiResponse.error(res, 'No token, authorization denied', 401);
    }

    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        ApiResponse.error(res, 'Token is not valid', 401);
    }
};

export const authorize = (roles: string[]) => {
    return (req: any, res: Response, next: NextFunction) => {
        if (!req.user) {
            return ApiResponse.error(res, 'Authorization required', 401);
        }

        if (!roles.includes(req.user.role)) {
            return ApiResponse.error(res, `Role ${req.user.role} is not authorized to access this route`, 403);
        }

        next();
    };
};

// Shorthand: any officer role
export const authorizeOfficer = (req: any, res: Response, next: NextFunction) => {
    if (!req.user) return ApiResponse.error(res, 'Authorization required', 401);
    if (!OFFICER_ROLES.includes(req.user.role)) {
        return ApiResponse.error(res, 'Officer access required', 403);
    }
    next();
};

// Shorthand: super_admin or admin only
export const authorizeAdmin = (req: any, res: Response, next: NextFunction) => {
    if (!req.user) return ApiResponse.error(res, 'Authorization required', 401);
    if (!['super_admin','admin'].includes(req.user.role)) {
        return ApiResponse.error(res, 'Super admin access required', 403);
    }
    next();
};
