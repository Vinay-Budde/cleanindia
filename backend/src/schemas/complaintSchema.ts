import { z } from 'zod';

export const createComplaintSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    category: z.string().min(1, 'Category is required'),
    priority: z.enum(['emergency','critical','high','medium','low']).optional(),
    location: z.string().min(1, 'Location is required'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    reportedBy: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    severity: z.string().optional(),
    trafficLevel: z.string().optional(),
    populationDensity: z.string().optional(),
});

export const updateStatusSchema = z.object({
    status: z.enum(['submitted','verified','assigned','accepted','in_progress','waiting_citizen_review','resolved','closed','reopened']),
    comment: z.string().optional(),
    updatedBy: z.string().optional(),
    updatedByRole: z.string().optional(),
});

export const rateComplaintSchema = z.object({
    stars: z.number().min(1).max(5),
    review: z.string().optional(),
    approvedResolution: z.boolean(),
});
