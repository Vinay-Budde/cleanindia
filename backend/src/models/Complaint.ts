import mongoose, { Document, Schema } from 'mongoose';

export interface IComplaint extends Document {
    complaintId: string;
    title: string;
    category: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    severity: number;
    trafficLevel: number;
    populationDensity: number;
    priorityScore: number;
    location: string;
    description: string;
    status: 'submitted' | 'verified' | 'assigned' | 'in progress' | 'resolved';
    aiScore?: number;
    imageUrl?: string;
    latitude?: number;
    longitude?: number;
    assignedTo?: string;
    assignedWorker?: mongoose.Types.ObjectId | string;
    reportedBy?: string;
    reportedAt: Date;
    history: Array<{
        status: string;
        updatedAt: Date;
        updatedBy: string;
        comment?: string;
    }>;
    resolvedAt?: Date;
    resolvedImageUrl?: string;
    // Municipality assignment fields
    assignedMunicipality?: mongoose.Types.ObjectId;
    assignedAt?: Date;
    assignmentMethod?: 'polygon' | 'nearest' | 'manual' | 'none';
}

const complaintSchema = new Schema<IComplaint>({
    complaintId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    priority: { type: String, required: true, enum: ['low', 'medium', 'high', 'critical'] },
    severity: { type: Number, default: 3 },
    trafficLevel: { type: Number, default: 3 },
    populationDensity: { type: Number, default: 3 },
    priorityScore: { type: Number, default: 9 },
    location: { type: String, required: true },
    description: { type: String, required: true },
    status: {
        type: String,
        default: 'submitted',
        enum: ['submitted', 'verified', 'assigned', 'in progress', 'resolved']
    },
    aiScore: { type: Number },
    imageUrl: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    assignedTo: { type: String, default: '—' },
    assignedWorker: { type: Schema.Types.ObjectId, ref: 'User' },
    reportedBy: { type: String, default: 'Anonymous' },
    reportedAt: { type: Date, default: Date.now },
    history: [{
        status: { type: String },
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: String },
        comment: { type: String }
    }],
    resolvedAt: { type: Date },
    resolvedImageUrl: { type: String },
    // Municipality assignment
    assignedMunicipality: { type: Schema.Types.ObjectId, ref: 'MunicipalCorporation' },
    assignedAt: { type: Date },
    assignmentMethod: {
        type: String,
        enum: ['polygon', 'nearest', 'manual', 'none'],
    }
});

export const Complaint = mongoose.model<IComplaint>('Complaint', complaintSchema);
