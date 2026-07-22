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
    role: z.enum(['citizen']).optional(),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email format'),
});

export const resetPasswordSchema = z.object({
    email: z.string().email('Invalid email format'),
    newPassword: strongPassword,
});

export const inviteSchema = z.object({
    email: z.string().email('Invalid email format'),
    role: z.enum(['state_admin','commissioner','zone_officer','ward_officer','field_inspector']),
    municipalityId: z.string().optional(),
    zoneId: z.string().optional(),
    wardId: z.string().optional(),
    municipalityName: z.string().optional(),
});

export const acceptInviteSchema = z.object({
    name: z.string().min(2, 'Name required'),
    phone: z.string().length(10).regex(/^[0-9]+$/),
    password: strongPassword,
});
