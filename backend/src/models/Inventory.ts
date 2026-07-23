import mongoose, { Document, Schema } from 'mongoose';

export type AssetType = 'vehicle' | 'equipment' | 'material' | 'staff';
export type AssetStatus = 'available' | 'deployed' | 'maintenance' | 'retired';

export interface IInventory extends Document {
    name: string;
    type: AssetType;
    assetId: string;
    description?: string;
    municipalityId?: mongoose.Types.ObjectId;
    status: AssetStatus;
    assignedTo?: mongoose.Types.ObjectId; // User/officer
    assignedComplaint?: mongoose.Types.ObjectId;
    location?: string;
    lastMaintenance?: Date;
    nextMaintenance?: Date;
    quantity: number;
    unit?: string;
    createdAt: Date;
}

const inventorySchema = new Schema<IInventory>({
    name: { type: String, required: true },
    type: { type: String, required: true, enum: ['vehicle','equipment','material','staff'] },
    assetId: { type: String, required: true, unique: true },
    description: { type: String },
    municipalityId: { type: Schema.Types.ObjectId, ref: 'MunicipalCorporation' },
    status: { type: String, default: 'available', enum: ['available','deployed','maintenance','retired'] },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedComplaint: { type: Schema.Types.ObjectId, ref: 'Complaint' },
    location: { type: String },
    lastMaintenance: { type: Date },
    nextMaintenance: { type: Date },
    quantity: { type: Number, default: 1 },
    unit: { type: String },
}, { timestamps: true });

export const Inventory = mongoose.model<IInventory>('Inventory', inventorySchema);
