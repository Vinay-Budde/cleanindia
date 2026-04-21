import { Router } from 'express';
import * as complaintController from '../controllers/complaintController';
import { validate } from '../middleware/validate';
import { createComplaintSchema, updateStatusSchema } from '../schemas/complaintSchema';
import upload from '../middleware/upload';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// @route   POST /api/complaints
// @desc    Create a new complaint (citizen & admin). reportedBy is taken from JWT.
router.post(
    '/',
    authenticate,
    authorize(['citizen', 'admin']),
    upload.single('image'),
    validate(createComplaintSchema),
    complaintController.createComplaint
);

// @route   GET /api/complaints
// @desc    Get complaints (admins see all; citizens see only their own)
router.get('/', authenticate, complaintController.getComplaints);

// @route   PATCH /api/complaints/:id/status
// @desc    Update status and add to history
router.patch(
    '/:id/status',
    authenticate,
    authorize(['worker', 'admin']),
    upload.single('resolvedImage'),
    validate(updateStatusSchema),
    complaintController.updateStatus
);

// @route   PATCH /api/complaints/:id/assign
// @desc    Assign a complaint to a worker/dept (admin only)
router.patch(
    '/:id/assign',
    authenticate,
    authorize(['admin']),
    complaintController.assignComplaint
);

export default router;
