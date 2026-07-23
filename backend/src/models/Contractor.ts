import mongoose, { Document, Schema } from 'mongoose';

export interface IContractor extends Document {
    name: string;
    email: string;
    phone: string;
    companyName: string;
    specializations: string[]; // categories they handle
    municipalityId?: mongoose.Types.ObjectId;
    rating: number;
    activeContracts: number;
    completedContracts: number;
    isActive: boolean;
    contactPerson: string;
    address: string;
    createdAt: Date;
}

const contractorSchema = new Schema<IContractor>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    companyName: { type: String, required: true },
    specializations: [{ type: String }],
    municipalityId: { type: Schema.Types.ObjectId, ref: 'MunicipalCorporation' },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    activeContracts: { type: Number, default: 0 },
    completedContracts: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    contactPerson: { type: String, default: '' },
    address: { type: String, default: '' },
}, { timestamps: true });

export const Contractor = mongoose.model<IContractor>('Contractor', contractorSchema);
