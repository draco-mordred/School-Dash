import mongoose, { Schema, Document } from "mongoose";

// Admin-configured physical location used globally for lecture proximity checks.
// radiusMeters is the acceptance radius for GPS verification (default 150 m, D7).

export interface IVenue extends Document {
  name: string;
  code?: string;
  description?: string;
  room?: string;
  location: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  lat: number;
  lng: number;
  radiusMeters: number;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId | null;
  updatedBy?: mongoose.Types.ObjectId | null;
}

const venueSchema = new Schema<IVenue>(
  {
    name: {
      type: String,
      required: [true, "Venue name required"],
      trim: true,
    },
    code: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    room: {
      type: String,
      default: "",
      trim: true,
    },
    // GeoJSON point (stored for future $near queries) alongside plain lat/lng
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    radiusMeters: {
      type: Number,
      default: 150,
      min: 10,
      max: 2000,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

venueSchema.index({ name: 1, room: 1 }, { unique: true });
venueSchema.index({ location: "2dsphere" });

export default mongoose.model<IVenue>("Venue", venueSchema);
