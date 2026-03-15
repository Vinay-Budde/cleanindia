import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';


export class AuthService {
    static async register(userData: any) {
        const { name, email, phone, password, role } = userData;

        // Check if user already exists
        let existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error('User already exists with this email');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Sanitize role
        const allowedRoles = ['citizen', 'admin', 'worker'];
        const assignedRole = allowedRoles.includes(role) ? role : 'citizen';

        // Create user
        const newUser = new User({
            name,
            email,
            phone,
            passwordHash,
            role: assignedRole
        });

        return await newUser.save();
    }

    static async login(credentials: any) {
        const { email, password } = credentials;

        // Check for user
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        // Create JWT Payload
        const payload = {
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        };

        const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '5h' });

        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone
            }
        };
    }
}
