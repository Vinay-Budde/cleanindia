import { Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';

// Permission definitions per role
const ROLE_PERMISSIONS: Record<string, string[]> = {
    super_admin: ['*'], // all permissions
    admin: ['*'],       // legacy admin = all
    state_admin: [
        'municipality:read', 'municipality:write',
        'zone:read', 'zone:write',
        'ward:read', 'ward:write',
        'officer:invite', 'officer:read',
        'complaint:read', 'complaint:assign',
        'analytics:read', 'audit:read',
    ],
    commissioner: [
        'zone:read', 'zone:write',
        'ward:read', 'ward:write',
        'officer:invite', 'officer:read',
        'complaint:read', 'complaint:assign', 'complaint:update',
        'analytics:read',
    ],
    zone_officer: [
        'zone:read', 'ward:read',
        'complaint:read', 'complaint:update', 'complaint:assign',
        'analytics:read',
    ],
    ward_officer: [
        'ward:read',
        'complaint:read', 'complaint:update',
        'analytics:read',
    ],
    field_inspector: [
        'complaint:read', 'complaint:update',
    ],
    worker: ['complaint:read', 'complaint:update'], // legacy
    citizen: ['complaint:create', 'complaint:read:own', 'complaint:rate'],
};

export const can = (permission: string) => {
    return (req: any, res: Response, next: NextFunction) => {
        if (!req.user) {
            return ApiResponse.error(res, 'Authentication required', 401);
        }

        const role = req.user.role;
        const perms = ROLE_PERMISSIONS[role] || [];

        if (perms.includes('*') || perms.includes(permission)) {
            return next();
        }

        return ApiResponse.error(
            res,
            `Permission denied: ${permission} required for this action`,
            403
        );
    };
};

// Helper: check if role is an officer (not citizen)
export const isOfficerRole = (role: string): boolean => {
    return ['super_admin','state_admin','commissioner','zone_officer','ward_officer','field_inspector','admin','worker'].includes(role);
};

export const OFFICER_ROLES = ['super_admin','state_admin','commissioner','zone_officer','ward_officer','field_inspector','admin','worker'];
export const ADMIN_ROLES = ['super_admin','state_admin','commissioner','admin'];
