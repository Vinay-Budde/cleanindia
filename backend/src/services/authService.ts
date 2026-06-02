import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { sendPasswordResetEmail, sendOtpEmail } from '../utils/emailService';

// ── Helpers ──────────────────────────────────────────────────────────────

/** Cryptographically random 6-digit numeric OTP */
const generateOtp = (): string => {
    // Use crypto for better randomness than Math.random()
    const num = crypto.randomInt(100_000, 1_000_000);
    return num.toString();
};

const hashOtp = (otp: string): string =>
    crypto.createHash('sha256').update(otp).digest('hex');

const signToken = (user: IUser): string => {
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';
    return jwt.sign(
        { user: { id: user._id, email: user.email, role: user.role } },
        JWT_SECRET,
        { expiresIn: '5h' }
    );
};

/**
 * Fire-and-forget OTP send with background retry logging.
 * The API response is returned to the user IMMEDIATELY after saving to DB;
 * the email arrives in their inbox within ~2–5 s.
 */
const dispatchOtpEmail = (email: string, otp: string, name: string): void => {
    sendOtpEmail(email, otp, name).catch(err => {
        console.error(`[EMAIL] ❌ OTP delivery failed for ${email}:`, err?.message ?? err);
    });
};

// ── AuthService ───────────────────────────────────────────────────────────
export class AuthService {

    static async register(userData: any) {
        const { name, email, phone, password, role } = userData;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            if (existingUser.isVerified) {
                throw new Error('An account with this email already exists. Please log in instead.');
            }

            // Unverified user re-registering — refresh credentials + OTP
            // bcrypt cost 8: ~85 ms on a standard server (vs ~350 ms at cost 10)
            const salt = await bcrypt.genSalt(8);
            const passwordHash = await bcrypt.hash(password, salt);
            const rawOtp = generateOtp();

            existingUser.name = name;
            existingUser.phone = phone;
            existingUser.passwordHash = passwordHash;
            existingUser.otpCode = hashOtp(rawOtp);
            existingUser.otpExpires = new Date(Date.now() + 10 * 60 * 1_000);
            await existingUser.save();

            // Dispatch email in background — response is already sent to the browser
            dispatchOtpEmail(email, rawOtp, name);

            return {
                requiresVerification: true,
                message: 'A new OTP has been sent to your email. Please verify to complete registration.',
            };
        }

        // New user ─ hash password + assign role
        const salt = await bcrypt.genSalt(8);
        const passwordHash = await bcrypt.hash(password, salt);

        const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@cleanindia.gov.in').toLowerCase();
        let assignedRole: 'citizen' | 'admin' | 'worker' = 'citizen';
        if (email.toLowerCase() === ADMIN_EMAIL) {
            assignedRole = 'admin';
        } else {
            assignedRole = role === 'citizen' ? 'citizen' : 'citizen'; // only citizen allowed via signup
        }

        const rawOtp = generateOtp();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1_000);

        const user = new User({
            name,
            email,
            phone,
            passwordHash,
            role: assignedRole,
            isVerified: false,
            otpCode: hashOtp(rawOtp),
            otpExpires,
        });
        await user.save();

        // Dispatch email in background — user sees the OTP screen instantly
        dispatchOtpEmail(email, rawOtp, name);

        return {
            requiresVerification: true,
            message: 'OTP sent to your email. Please verify to complete registration.',
        };
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

        // Mark verified and clear OTP fields
        user.isVerified = true;
        user.otpCode = undefined;
        user.otpExpires = undefined;
        await user.save();

        const token = signToken(user);
        return {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
            },
        };
    }

    static async resendOtp(email: string) {
        const user = await User.findOne({ email, isVerified: false });

        if (!user) {
            throw new Error('No pending registration found for this email.');
        }

        const rawOtp = generateOtp();
        user.otpCode = hashOtp(rawOtp);
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1_000);
        await user.save();

        // Dispatch in background so the API responds immediately
        dispatchOtpEmail(email, rawOtp, user.name);

        return { message: 'A new OTP has been sent to your email.' };
    }

    static async login(credentials: any) {
        const { email, password } = credentials;

        const user = await User.findOne({ email });
        if (!user) throw new Error('Invalid credentials');

        if (!user.isVerified) {
            const err: any = new Error(
                'Please verify your email before logging in. Check your inbox for the OTP.'
            );
            err.statusCode = 403;
            err.requiresVerification = true;
            throw err;
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) throw new Error('Invalid credentials');

        const token = signToken(user);
        return {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
            },
        };
    }

    static async forgotPassword(email: string) {
        const user = await User.findOne({ email, isVerified: true });

        // Always respond generically to prevent email enumeration
        if (!user) {
            return { message: 'If a matching account is found, a reset link has been sent.' };
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1_000); // 1 hour
        await user.save();

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

        // Await the password reset email (user expects the link before they can proceed)
        try {
            await sendPasswordResetEmail(user.email, resetUrl, user.name);
        } catch (err: any) {
            console.error(`[EMAIL] ❌ Password reset email failed for ${user.email}:`, err?.message ?? err);
        }

        return { message: 'If a matching account is found, a reset link has been sent.' };
    }

    static async resetPassword(rawToken: string, newPassword: string) {
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: new Date() },
        });

        if (!user) {
            throw new Error('Password reset token is invalid or has expired.');
        }

        const salt = await bcrypt.genSalt(8);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        return { message: 'Password has been reset successfully.' };
    }
}
