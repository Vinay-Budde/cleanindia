import { Router } from 'express';
import * as complaintController from '../controllers/complaintController';
import { validate } from '../middleware/validate';
import { createComplaintSchema, updateStatusSchema, rateComplaintSchema } from '../schemas/complaintSchema';
import upload from '../middleware/upload';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const OFFICER_ROLES = ['super_admin','admin','state_admin','commissioner','zone_officer','ward_officer','field_inspector','worker'];

router.post('/', authenticate, authorize(['citizen','admin','super_admin','commissioner','zone_officer','ward_officer','field_inspector']), upload.single('image'), validate(createComplaintSchema), complaintController.createComplaint);
router.get('/', authenticate, complaintController.getComplaints);
router.patch('/:id/status', authenticate, authorize(OFFICER_ROLES), upload.single('resolvedImage'), validate(updateStatusSchema), complaintController.updateStatus);
router.patch('/:id/assign', authenticate, authorize(['super_admin','admin','state_admin','commissioner','zone_officer']), complaintController.assignComplaint);
router.post('/:id/rate', authenticate, authorize(['citizen']), validate(rateComplaintSchema), complaintController.rateComplaint);
router.post('/:id/support', authenticate, complaintController.supportComplaint);
router.get('/:id/timeline', authenticate, complaintController.getTimeline);
router.post('/sla/check', authenticate, authorize(['super_admin','admin']), complaintController.triggerSLACheck);

export default router;
