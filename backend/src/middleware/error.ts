import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('SERVER ERROR:', err);

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map((val: any) => val.message).join(', ');
        return ApiResponse.error(res, message, 400);
    }

    // MongoDB duplicate key error (e.g. unique email constraint)
    if (err.code === 11000 || err.name === 'MongoServerError') {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        return ApiResponse.error(res, `An account with this ${field} already exists. Please log in instead.`, 409);
    }

    // Mongoose cast error (invalid ID)
    if (err.name === 'CastError') {
        return ApiResponse.error(res, 'Resource not found', 404);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return ApiResponse.error(res, 'Invalid token. Please log in again.', 401);
    }

    if (err.name === 'TokenExpiredError') {
        return ApiResponse.error(res, 'Token expired. Please log in again.', 401);
    }

    // Default server error
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    return ApiResponse.error(res, message, statusCode, err);
};
