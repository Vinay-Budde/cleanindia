import mongoose, { Document, Schema } from 'mongoose';

export type JurisdictionLevel =
    | 'municipal_corporation'
    | 'municipality'
    | 'gram_panchayat'
    | 'ward'
    | 'zone'
    | 'sub_zone';

export interface IMunicipalCorporation extends Document {
    name: string;
    state: string;
    district: string;
    contactEmail?: string;
    phone?: string;
    officeLocation: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude]
    };
    jurisdictionBoundary: {
        type: 'Polygon';
        coordinates: number[][][];
    };
    jurisdictionLevel: JurisdictionLevel;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const municipalCorporationSchema = new Schema<IMunicipalCorporation>(
    {
        name: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        district: { type: String, required: true, trim: true },
        contactEmail: { type: String, trim: true },
        phone: { type: String, trim: true },
        officeLocation: {
            type: {
                type: String,
                enum: ['Point'],
                required: true,
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true,
            },
        },
        jurisdictionBoundary: {
            type: {
                type: String,
                enum: ['Polygon'],
                required: true,
                default: 'Polygon',
            },
            coordinates: {
                type: [[[Number]]],
                required: true,
            },
        },
        jurisdictionLevel: {
            type: String,
            enum: [
                'municipal_corporation',
                'municipality',
                'gram_panchayat',
                'ward',
                'zone',
                'sub_zone',
            ],
            default: 'municipal_corporation',
        },
        active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// 2dsphere indexes for geospatial queries
municipalCorporationSchema.index({ officeLocation: '2dsphere' });
municipalCorporationSchema.index({ jurisdictionBoundary: '2dsphere' });

export const MunicipalCorporation = mongoose.model<IMunicipalCorporation>(
    'MunicipalCorporation',
    municipalCorporationSchema
);
