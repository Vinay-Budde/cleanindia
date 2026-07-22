import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController';
import { authenticate, authorizeOfficer } from '../middleware/auth';

const router = Router();

router.get('/stats', authenticate, authorizeOfficer, analyticsController.getOverallStats);
router.get('/trends', authenticate, authorizeOfficer, analyticsController.getMonthlyTrends);
router.get('/municipalities', authenticate, authorizeOfficer, analyticsController.getMunicipalityStats);
router.get('/resolution-time', authenticate, authorizeOfficer, analyticsController.getResolutionTime);
router.get('/heatmap', authenticate, authorizeOfficer, analyticsController.getHeatmapData);

export default router;
