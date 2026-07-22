import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User, IUser, UserRole } from '../models/User';
import { Invitation } from '../models/Invitation';

const JWT_SECRET = () => process.env.JWT_SECRET || 'fallback_secret_for_development';

const signToken = (user: IUser): string => {
    return jwt.sign(
        { user: { id: user._id, email: user.email, role: user.role, municipalityId: (user as any).municipalityId } },
        JWT_SECRET(),
        { expiresIn: '8h' }
    );
};

export class AuthService {
    static async register(userData: any) {
        const { name, email, phone, password } = userData;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error('An account with this email already exists. Please log in instead.');
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@cleanindia.gov.in').toLowerCase();
        let assignedRole: UserRole = 'citizen';
        if (email.toLowerCase() === SUPER_ADMIN_EMAIL) assignedRole = 'super_admin';

        const user = new User({ name, email, phone, passwordHash, role: assignedRole, isVerified: true, isActive: true });
        await user.save();

        const token = signToken(user);
        return { token, user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone } };
    }

    static async login(credentials: any) {
        const { email, password } = credentials;
        const user = await User.findOne({ email });
        if (!user) throw new Error('Invalid credentials');
        if (!user.isActive) throw new Error('Account is deactivated. Contact your administrator.');

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) throw new Error('Invalid credentials');

        user.lastLogin = new Date();
        await user.save();

        const token = signToken(user);
        return {
            token,
            user: {
                id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone,
                municipalityId: user.municipalityId, zoneId: user.zoneId, wardId: user.wardId,
            }
        };
    }

    /**
     * Invite an officer. Only super_admin / admin / commissioner can do this.
     */
    static async inviteOfficer(data: any, invitedByUserId: string) {
        const { email, role, municipalityId, zoneId, wardId, municipalityName } = data;

        // Prevent duplicate active invites
        await Invitation.deleteMany({ email, usedAt: { $exists: false } });

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const invite = new Invitation({
            email, role, municipalityId, zoneId, wardId, municipalityName,
            token, expiresAt,
            invitedBy: invitedByUserId,
        });
        await invite.save();

        // Try to send email (non-fatal if fails)
        const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accept-invite/${token}`;
        console.log('INVITE URL:', inviteUrl);

        return { inviteUrl, token, expiresAt, email };
    }

    /**
     * Validate invite token (GET endpoint).
     */
    static async getInvite(token: string) {
        const invite = await Invitation.findOne({ token, usedAt: { $exists: false } }).lean();
        if (!invite) throw new Error('Invalid or expired invitation link.');
        if (new Date(invite.expiresAt) < new Date()) throw new Error('Invitation has expired.');
        return invite;
    }

    /**
     * Accept invite: set password, activate account.
     */
    static async acceptInvite(token: string, name: string, phone: string, password: string) {
        const invite = await Invitation.findOne({ token, usedAt: { $exists: false } });
        if (!invite) throw new Error('Invalid or expired invitation link.');
        if (new Date(invite.expiresAt) < new Date()) throw new Error('Invitation has expired.');

        const existingUser = await User.findOne({ email: invite.email });
        if (existingUser) throw new Error('An account with this email already exists.');

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = new User({
            name, phone,
            email: invite.email,
            passwordHash,
            role: invite.role as UserRole,
            municipalityId: invite.municipalityId,
            zoneId: invite.zoneId,
            wardId: invite.wardId,
            isVerified: true,
            isActive: true,
        });
        await user.save();

        invite.usedAt = new Date();
        await invite.save();

        const jwtToken = signToken(user);
        return { token: jwtToken, user: { id: user._id, name: user.name, email: user.email, role: user.role } };
    }

    static async forgotPassword(email: string) {
        const user = await User.findOne({ email });
        if (!user) throw new Error('No account found with this email.');
        return { message: 'Account found. You can now reset your password.' };
    }

    static async resetPasswordDirectly(email: string, newPassword: string) {
        const user = await User.findOne({ email });
        if (!user) throw new Error('No account found with this email.');
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        return { message: 'Password has been reset successfully.' };
    }
}
