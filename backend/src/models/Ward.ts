import mongoose, { Document, Schema } from 'mongoose';

export interface IWard extends Document {
    name: string;
    wardNumber?: string;
    zoneId: mongoose.Types.ObjectId;
    municipalityId: mongoose.Types.ObjectId;
    boundary?: {
        type: 'Polygon';
        coordinates: number[][][];
    };
    officeLocation?: {
        type: 'Point';
        coordinates: [number, number];
    };
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const wardSchema = new Schema<IWard>({
    name: { type: String, required: true, trim: true },
    wardNumber: { type: String, trim: true },
    zoneId: { type: Schema.Types.ObjectId, ref: 'Zone', required: true },
    municipalityId: { type: Schema.Types.ObjectId, ref: 'MunicipalCorporation', required: true },
    boundary: {
        type: {
            type: String,
            enum: ['Polygon'],
        },
        coordinates: { type: [[[Number]]] },
    },
    officeLocation: {
        type: {
            type: String,
            enum: ['Point'],
        },
        coordinates: { type: [Number] },
    },
    active: { type: Boolean, default: true },
}, { timestamps: true });

wardSchema.index({ boundary: '2dsphere' }, { sparse: true });
wardSchema.index({ officeLocation: '2dsphere' }, { sparse: true });
wardSchema.index({ zoneId: 1 });
wardSchema.index({ municipalityId: 1 });

export const Ward = mongoose.model<IWard>('Ward', wardSchema);
