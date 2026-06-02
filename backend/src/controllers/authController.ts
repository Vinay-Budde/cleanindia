import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { ApiResponse } from '../utils/ApiResponse';

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await AuthService.register(req.body);
        return ApiResponse.success(res, result, 'Registration successful. Welcome to Clean India!', 201);
    } catch (error) {
        next(error);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await AuthService.login(req.body);
        return ApiResponse.success(res, data, 'Login successful');
    } catch (error) {
        next(error);
    }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;
        const result = await AuthService.forgotPassword(email);
        return ApiResponse.success(res, null, result.message);
    } catch (error) {
        next(error);
    }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, newPassword } = req.body;
        const result = await AuthService.resetPasswordDirectly(email, newPassword);
        return ApiResponse.success(res, null, result.message);
    } catch (error) {
        next(error);
    }
};
