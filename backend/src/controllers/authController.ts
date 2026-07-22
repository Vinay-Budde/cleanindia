import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { ApiResponse } from '../utils/ApiResponse';

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await AuthService.register(req.body);
        return ApiResponse.success(res, result, 'Registration successful. Welcome to Clean India!', 201);
    } catch (error) { next(error); }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await AuthService.login(req.body);
        return ApiResponse.success(res, data, 'Login successful');
    } catch (error) { next(error); }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;
        const result = await AuthService.forgotPassword(email);
        return ApiResponse.success(res, null, result.message);
    } catch (error) { next(error); }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, newPassword } = req.body;
        const result = await AuthService.resetPasswordDirectly(email, newPassword);
        return ApiResponse.success(res, null, result.message);
    } catch (error) { next(error); }
};

export const inviteOfficer = async (req: any, res: Response, next: NextFunction) => {
    try {
        const result = await AuthService.inviteOfficer(req.body, req.user.id);
        return ApiResponse.success(res, result, 'Invitation sent successfully', 201);
    } catch (error) { next(error); }
};

export const getInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const invite = await AuthService.getInvite(String(req.params.token));
        return ApiResponse.success(res, invite, 'Invitation valid');
    } catch (error) { next(error); }
};

export const acceptInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, phone, password } = req.body;
        const result = await AuthService.acceptInvite(String(req.params.token), name, phone, password);
        return ApiResponse.success(res, result, 'Account activated successfully!', 201);
    } catch (error) { next(error); }
};
