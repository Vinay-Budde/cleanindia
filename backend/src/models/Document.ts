import mongoose, { Document as MongoDoc, Schema } from 'mongoose';

export interface IGovDocument extends MongoDoc {
    title: string;
    type: 'circular' | 'report' | 'certificate' | 'tender' | 'other';
    fileUrl: string;
    fileType: string;
    fileSize: number;
    municipalityId?: mongoose.Types.ObjectId;
    complaintId?: mongoose.Types.ObjectId;
    uploadedBy: mongoose.Types.ObjectId;
    tags: string[];
    isPublic: boolean;
    expiresAt?: Date;
    createdAt: Date;
}

const docSchema = new Schema<IGovDocument>({
    title: { type: String, required: true },
    type: { type: String, required: true, enum: ['circular','report','certificate','tender','other'], default: 'other' },
    fileUrl: { type: String, required: true },
    fileType: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    municipalityId: { type: Schema.Types.ObjectId, ref: 'MunicipalCorporation' },
    complaintId: { type: Schema.Types.ObjectId, ref: 'Complaint' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tags: [{ type: String }],
    isPublic: { type: Boolean, default: false },
    expiresAt: { type: Date },
}, { timestamps: true });

export const GovDocument = mongoose.model<IGovDocument>('GovDocument', docSchema);
