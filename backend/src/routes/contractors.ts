import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { Contractor } from '../models/Contractor';
import { ApiResponse } from '../utils/ApiResponse';

const router = express.Router();

router.get('/', authenticate, async (req: any, res, next) => {
    try {
        const query: any = { isActive: true };
        if (req.query.municipalityId) query.municipalityId = req.query.municipalityId;
        const items = await Contractor.find(query).sort({ rating: -1 });
        ApiResponse.success(res, items);
    } catch (e) { next(e); }
});

router.post('/', authenticate, authorize(['super_admin','state_admin','commissioner','admin']), async (req: any, res, next) => {
    try {
        const item = await new Contractor(req.body).save();
        ApiResponse.success(res, item, 'Contractor added', 201);
    } catch (e) { next(e); }
});

router.patch('/:id', authenticate, authorize(['super_admin','state_admin','commissioner','admin']), async (req, res, next) => {
    try {
        const item = await Contractor.findByIdAndUpdate(req.params.id, req.body, { new: true });
        ApiResponse.success(res, item, 'Contractor updated');
    } catch (e) { next(e); }
});

export default router;
