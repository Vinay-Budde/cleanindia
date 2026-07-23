import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { Inventory } from '../models/Inventory';
import { ApiResponse } from '../utils/ApiResponse';

const router = express.Router();

router.get('/', authenticate, async (req: any, res, next) => {
    try {
        const query: any = {};
        if (req.query.municipalityId) query.municipalityId = req.query.municipalityId;
        if (req.query.type) query.type = req.query.type;
        if (req.query.status) query.status = req.query.status;
        const items = await Inventory.find(query).populate('assignedTo', 'name').sort({ createdAt: -1 });
        ApiResponse.success(res, items);
    } catch (e) { next(e); }
});

router.post('/', authenticate, authorize(['super_admin','state_admin','commissioner','admin']), async (req: any, res, next) => {
    try {
        const item = await new Inventory({ ...req.body, assetId: `ASSET-${Date.now()}` }).save();
        ApiResponse.success(res, item, 'Asset created', 201);
    } catch (e) { next(e); }
});

router.patch('/:id', authenticate, authorize(['super_admin','state_admin','commissioner','admin']), async (req, res, next) => {
    try {
        const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
        ApiResponse.success(res, item, 'Asset updated');
    } catch (e) { next(e); }
});

router.delete('/:id', authenticate, authorize(['super_admin','state_admin','commissioner','admin']), async (req, res, next) => {
    try {
        await Inventory.findByIdAndDelete(req.params.id);
        ApiResponse.success(res, null, 'Asset deleted');
    } catch (e) { next(e); }
});

export default router;
