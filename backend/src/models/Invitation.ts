import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from './User';

export interface IInvitation extends Document {
    email: string;
    role: UserRole;
    municipalityId?: mongoose.Types.ObjectId;
    zoneId?: mongoose.Types.ObjectId;
    wardId?: mongoose.Types.ObjectId;
    token: string;
    expiresAt: Date;
    usedAt?: Date;
    invitedBy: mongoose.Types.ObjectId;
    municipalityName?: string;
}

const invitationSchema = new Schema<IInvitation>({
    email: { type: String, required: true },
    role: { type: String, required: true },
    municipalityId: { type: Schema.Types.ObjectId, ref: 'MunicipalCorporation' },
    zoneId: { type: Schema.Types.ObjectId, ref: 'Zone' },
    wardId: { type: Schema.Types.ObjectId, ref: 'Ward' },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    municipalityName: { type: String },
}, { timestamps: true });

// TTL index: auto-delete expired unused invitations after 7 days
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Invitation = mongoose.model<IInvitation>('Invitation', invitationSchema);
