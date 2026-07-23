import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController';
import { authenticate, authorizeOfficer } from '../middleware/auth';

const router = Router();

router.get('/stats', authenticate, authorizeOfficer, analyticsController.getOverallStats);
router.get('/trends', authenticate, authorizeOfficer, analyticsController.getMonthlyTrends);
router.get('/municipalities', authenticate, authorizeOfficer, analyticsController.getMunicipalityStats);
router.get('/resolution-time', authenticate, authorizeOfficer, analyticsController.getResolutionTime);
router.get('/heatmap', authenticate, authorizeOfficer, analyticsController.getHeatmapData);
router.get('/heatmap-category', authenticate, authorizeOfficer, analyticsController.getCategoryHeatmap);
router.get('/predictive', authenticate, authorizeOfficer, analyticsController.getPredictiveAnalytics);
router.get('/officer-performance', authenticate, authorizeOfficer, analyticsController.getOfficerPerformance);
router.get('/ward-recommendations', authenticate, authorizeOfficer, analyticsController.getWardRecommendations);

export default router;

