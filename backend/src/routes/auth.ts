import { Router } from 'express';
import * as authController from '../controllers/authController';
import { validate } from '../middleware/validate';
import {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyOtpSchema
} from '../schemas/authSchema';

const router = Router();

// @route   POST /api/auth/register
// @desc    Register a new user — sends OTP to email
router.post('/register', validate(registerSchema), authController.register);

// @route   POST /api/auth/verify-otp
// @desc    Verify email OTP and complete registration
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP to pending user's email
router.post('/resend-otp', authController.resendOtp);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', validate(loginSchema), authController.login);

// @route   POST /api/auth/forgot-password
// @desc    Request a password reset link via email
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset password using token from email
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

export default router;
