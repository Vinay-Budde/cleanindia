import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    phone: string;
    passwordHash: string;
    role: 'citizen' | 'admin' | 'worker';
    createdAt: Date;
    isVerified: boolean;
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
    role: { type: String, required: true, enum: ['citizen', 'admin', 'worker'], default: 'citizen' },
    createdAt: { type: Date, default: Date.now },
    isVerified: { type: Boolean, default: false },
    otpCode: { type: String },
    otpExpires: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
});

export const User = mongoose.model<IUser>('User', userSchema);
