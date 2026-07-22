import mongoose, { Document, Schema } from 'mongoose';

export interface IZone extends Document {
    name: string;
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

const zoneSchema = new Schema<IZone>({
    name: { type: String, required: true, trim: true },
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

zoneSchema.index({ boundary: '2dsphere' }, { sparse: true });
zoneSchema.index({ officeLocation: '2dsphere' }, { sparse: true });
zoneSchema.index({ municipalityId: 1 });

export const Zone = mongoose.model<IZone>('Zone', zoneSchema);
