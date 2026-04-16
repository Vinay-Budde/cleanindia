import { z } from 'zod';

const strongPassword = z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email format'),
    phone: z.string().length(10, 'Phone number must be exactly 10 digits').regex(/^[0-9]+$/, 'Phone must be numeric'),
    password: strongPassword,
    role: z.enum(['citizen', 'admin', 'worker']).optional()
});

export const verifyOtpSchema = z.object({
    email: z.string().email('Invalid email format'),
    otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^[0-9]+$/, 'OTP must be numeric'),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
});

export const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email format')
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: strongPassword,
});
