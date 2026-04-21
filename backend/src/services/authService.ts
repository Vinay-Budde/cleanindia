import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { sendPasswordResetEmail, sendOtpEmail } from '../utils/emailService';

const generateOtp = (): string => {
    // 6-digit numeric OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashOtp = (otp: string): string => {
    return crypto.createHash('sha256').update(otp).digest('hex');
};

const signToken = (user: IUser): string => {
    const payload = {
        user: {
            id: user._id,
            email: user.email,
            role: user.role,
        }
    };
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '5h' });
};

export class AuthService {
    static async register(userData: any) {
        const { name, email, phone, password, role } = userData;

        // Check if a verified user already exists
        const existingVerified = await User.findOne({ email, isVerified: true });
        if (existingVerified) {
            throw new Error('User already exists with this email');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Assign roles, but check if they match the designated admin email
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@cleanindia.gov.in';
        let assignedRole: 'citizen' | 'admin' | 'worker' = 'citizen';

        if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            assignedRole = 'admin';
        } else {
            const allowedPublicRoles = ['citizen'];
            assignedRole = allowedPublicRoles.includes(role) ? role : 'citizen';
        }

        // Generate OTP
        const rawOtp = generateOtp();
        const hashedOtp = hashOtp(rawOtp);
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Upsert: if a pending (unverified) user exists with this email, update their OTP.
        // This handles the "resend OTP" case.
        let user = await User.findOne({ email, isVerified: false });
        if (user) {
            user.name = name;
            user.phone = phone;
            user.passwordHash = passwordHash;
            user.role = assignedRole;
            user.otpCode = hashedOtp;
            user.otpExpires = otpExpires;
            await user.save();
        } else {
            user = new User({
                name,
                email,
                phone,
                passwordHash,
                role: assignedRole,
                isVerified: false,
                otpCode: hashedOtp,
                otpExpires,
            });
            await user.save();
        }

        // Send OTP email — awaited so any delivery failure surfaces as an error to the user
        try {
            await sendOtpEmail(email, rawOtp, name);
        } catch (err: any) {
            console.error(`[EMAIL ERROR] Failed to send OTP to ${email}:`, err.message || err);
            throw new Error('Failed to send OTP email. Please check your email address and try again.');
        }

        return { requiresVerification: true, message: 'OTP sent to your email. Please verify to complete registration.' };
    }

    static async verifyOtp(email: string, otp: string) {
        const user = await User.findOne({ email, isVerified: false });

        if (!user) {
            throw new Error('No pending registration found for this email. Please register again.');
        }

        if (!user.otpCode || !user.otpExpires) {
            throw new Error('OTP not found. Please request a new one.');
        }

        if (new Date() > user.otpExpires) {
            throw new Error('OTP has expired. Please register again to get a new code.');
        }

        const hashedInput = hashOtp(otp);
        if (hashedInput !== user.otpCode) {
            throw new Error('Invalid OTP. Please check your email and try again.');
        }

        // Mark as verified and clear OTP
        user.isVerified = true;
        user.otpCode = undefined;
        user.otpExpires = undefined;
        await user.save();

        // Auto-login: return JWT token
        const token = signToken(user);
        return {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
            }
        };
    }

    static async resendOtp(email: string) {
        const user = await User.findOne({ email, isVerified: false });

        if (!user) {
            throw new Error('No pending registration found for this email.');
        }

        const rawOtp = generateOtp();
        user.otpCode = hashOtp(rawOtp);
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        // Send OTP email — awaited so failures surface as real errors
        try {
            await sendOtpEmail(email, rawOtp, user.name);
        } catch (err: any) {
            console.error(`[EMAIL ERROR] Failed to resend OTP to ${email}:`, err.message || err);
            throw new Error('Failed to send OTP email. Please try again in a moment.');
        }

        return { message: 'A new OTP has been sent to your email.' };
    }

    static async login(credentials: any) {
        const { email, password } = credentials;

        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Block unverified users
        if (!user.isVerified) {
            const err: any = new Error('Please verify your email before logging in. Check your inbox for the OTP.');
            err.statusCode = 403;
            err.requiresVerification = true;
            throw err;
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        const token = signToken(user);
        return {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
            }
        };
    }

    static async forgotPassword(email: string) {
        const user = await User.findOne({ email, isVerified: true });

        // Always respond with generic success to prevent user enumeration
        if (!user) {
            return { message: 'If a matching account is found, a reset link has been sent.' };
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

        sendPasswordResetEmail(user.email, resetUrl, user.name).catch(err => {
            console.error(`Failed to send password reset email to ${user.email}:`, err);
        });

        return { message: 'If a matching account is found, a reset link has been sent.' };
    }

    static async resetPassword(rawToken: string, newPassword: string) {
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            throw new Error('Password reset token is invalid or has expired.');
        }

        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        return { message: 'Password has been reset successfully.' };
    }
}
