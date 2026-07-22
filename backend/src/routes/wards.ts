import { Router } from 'express';
import * as wardController from '../controllers/wardController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const ADMIN_ROLES = ['super_admin','admin','state_admin','commissioner','zone_officer'];

router.get('/', authenticate, wardController.getWards);
router.get('/:id', authenticate, wardController.getWardById);
router.post('/', authenticate, authorize(ADMIN_ROLES), wardController.createWard);
router.patch('/:id', authenticate, authorize(ADMIN_ROLES), wardController.updateWard);
router.delete('/:id', authenticate, authorize(ADMIN_ROLES), wardController.deleteWard);
router.post('/:id/geojson', authenticate, authorize(ADMIN_ROLES), wardController.uploadWardBoundary);

export default router;
