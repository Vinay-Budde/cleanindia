import mongoose, { Document, Schema } from 'mongoose';

export type UserRole =
    | 'super_admin'
    | 'state_admin'
    | 'commissioner'
    | 'zone_officer'
    | 'ward_officer'
    | 'field_inspector'
    | 'citizen'
    // legacy roles kept for backward compat
    | 'admin'
    | 'worker';

export interface IUser extends Document {
    name: string;
    email: string;
    phone: string;
    passwordHash: string;
    role: UserRole;
    address?: string;
    createdAt: Date;
    isVerified: boolean;
    isActive: boolean;
    // Jurisdiction links
    municipalityId?: mongoose.Types.ObjectId;
    zoneId?: mongoose.Types.ObjectId;
    wardId?: mongoose.Types.ObjectId;
    // Invite system
    inviteToken?: string;
    inviteExpires?: Date;
    // Activity
    lastLogin?: Date;
    // OTP / password reset (existing)
    otpCode?: string;
    otpExpires?: Date;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
}

const userSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: {
        type: String,
        required: true,
        enum: ['super_admin','state_admin','commissioner','zone_officer','ward_officer','field_inspector','citizen','admin','worker'],
        default: 'citizen'
    },
    address: { type: String },
    createdAt: { type: Date, default: Date.now },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    municipalityId: { type: Schema.Types.ObjectId, ref: 'MunicipalCorporation' },
    zoneId: { type: Schema.Types.ObjectId, ref: 'Zone' },
    wardId: { type: Schema.Types.ObjectId, ref: 'Ward' },
    inviteToken: { type: String },
    inviteExpires: { type: Date },
    lastLogin: { type: Date },
    otpCode: { type: String },
    otpExpires: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
});

const OFFICER_ROLES: UserRole[] = ['super_admin','state_admin','commissioner','zone_officer','ward_officer','field_inspector','admin'];
export const isOfficer = (role: UserRole) => OFFICER_ROLES.includes(role);

export const User = mongoose.model<IUser>('User', userSchema);
