import { Router } from 'express';
import * as municipalityController from '../controllers/municipalityController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public / read routes (authenticated)
router.get('/', authenticate, municipalityController.getAll);
router.get('/map', authenticate, municipalityController.getMap);
router.get('/stats', authenticate, municipalityController.getStats);
router.get('/:id', authenticate, municipalityController.getById);

// Admin-only write routes
router.post('/', authenticate, authorize(['admin']), municipalityController.create);
router.patch('/:id', authenticate, authorize(['admin']), municipalityController.update);
router.delete('/:id', authenticate, authorize(['admin']), municipalityController.deleteOne);
router.post('/:id/geojson', authenticate, authorize(['admin']), municipalityController.uploadGeoJSON);

export default router;
