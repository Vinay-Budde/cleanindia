import { Router } from 'express';
import * as zoneController from '../controllers/zoneController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const ADMIN_ROLES = ['super_admin','admin','state_admin','commissioner'];

router.get('/', authenticate, zoneController.getZones);
router.get('/:id', authenticate, zoneController.getZoneById);
router.post('/', authenticate, authorize(ADMIN_ROLES), zoneController.createZone);
router.patch('/:id', authenticate, authorize(ADMIN_ROLES), zoneController.updateZone);
router.delete('/:id', authenticate, authorize(ADMIN_ROLES), zoneController.deleteZone);
router.post('/:id/geojson', authenticate, authorize(ADMIN_ROLES), zoneController.uploadZoneBoundary);

export default router;
