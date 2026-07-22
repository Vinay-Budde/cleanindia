import { Router } from 'express';
import * as authController from '../controllers/authController';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import {
    registerSchema, loginSchema, forgotPasswordSchema,
    resetPasswordSchema, inviteSchema, acceptInviteSchema
} from '../schemas/authSchema';

const router = Router();
const INVITE_ROLES = ['super_admin','admin','state_admin','commissioner'];

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/invite', authenticate, authorize(INVITE_ROLES), validate(inviteSchema), authController.inviteOfficer);
router.get('/invite/:token', authController.getInvite);
router.post('/accept-invite/:token', validate(acceptInviteSchema), authController.acceptInvite);

export default router;
