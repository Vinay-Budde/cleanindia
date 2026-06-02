import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

// ── Helpers ──────────────────────────────────────────────────────────────

const signToken = (user: IUser): string => {
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';
    return jwt.sign(
        { user: { id: user._id, email: user.email, role: user.role } },
        JWT_SECRET,
        { expiresIn: '5h' }
    );
};

// ── AuthService ───────────────────────────────────────────────────────────
export class AuthService {

    static async register(userData: any) {
        const { name, email, phone, password, role } = userData;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            throw new Error('An account with this email already exists. Please log in instead.');
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

        const user = new User({
            name,
            email,
            phone,
            passwordHash,
            role: assignedRole,
            isVerified: true, // Auto-verify users immediately without OTP
        });
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

    static async login(credentials: any) {
        const { email, password } = credentials;

        const user = await User.findOne({ email });
        if (!user) throw new Error('Invalid credentials');

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
        const user = await User.findOne({ email });

        if (!user) {
            throw new Error('No account found with this email.');
        }

        return { message: 'Account found. You can now reset your password.' };
    }

    static async resetPasswordDirectly(email: string, newPassword: string) {
        const user = await User.findOne({ email });

        if (!user) {
            throw new Error('No account found with this email.');
        }

        const salt = await bcrypt.genSalt(8);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        
        // Clear any old reset tokens
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        return { message: 'Password has been reset successfully.' };
    }
}
