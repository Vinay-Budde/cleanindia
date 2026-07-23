import { Router } from 'express';
import * as complaintController from '../controllers/complaintController';
import { validate } from '../middleware/validate';
import { createComplaintSchema, updateStatusSchema, rateComplaintSchema } from '../schemas/complaintSchema';
import upload from '../middleware/upload';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const OFFICER_ROLES = ['super_admin','admin','state_admin','commissioner','zone_officer','ward_officer','field_inspector','worker'];

// Public routes (no auth needed)
router.get('/public-feed', complaintController.getPublicFeed);
router.get('/search', complaintController.searchComplaints);
router.get('/leaderboard', complaintController.getLeaderboard);

// Protected routes (auth required)
router.post('/analyze-ai', authenticate, complaintController.analyzeComplaintAI);
router.get('/officer-route', authenticate, complaintController.getOfficerRoute);
router.post('/officer-location', authenticate, complaintController.updateOfficerLocation);
router.get('/workload-balancing', authenticate, complaintController.getWorkloadBalancing);

router.post('/', authenticate, authorize(['citizen','admin','super_admin','commissioner','zone_officer','ward_officer','field_inspector']), upload.single('image'), validate(createComplaintSchema), complaintController.createComplaint);
router.get('/', authenticate, complaintController.getComplaints);
router.patch('/:id/status', authenticate, authorize(OFFICER_ROLES), upload.single('resolvedImage'), validate(updateStatusSchema), complaintController.updateStatus);
router.patch('/:id/assign', authenticate, authorize(['super_admin','admin','state_admin','commissioner','zone_officer']), complaintController.assignComplaint);
router.post('/:id/rate', authenticate, authorize(['citizen']), validate(rateComplaintSchema), complaintController.rateComplaint);
router.post('/:id/support', authenticate, complaintController.supportComplaint);
router.get('/:id/timeline', authenticate, complaintController.getTimeline);
router.post('/:id/verify', authenticate, complaintController.verifyComplaint);
router.post('/sla/check', authenticate, authorize(['super_admin','admin']), complaintController.triggerSLACheck);

export default router;
