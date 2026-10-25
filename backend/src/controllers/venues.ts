import { Request, Response } from "express";
import Venue from "../models/venue";
import { emitSystemEvent } from "../events";

// Validation helpers
const isValidLat = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= -90 && v <= 90;
const isValidLng = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= -180 && v <= 180;
const isValidRadius = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 2000;

const buildVenueBody = (body: any) => ({
  name: typeof body?.name === "string" ? body.name.trim() : "",
  code: typeof body?.code === "string" ? body.code.trim() : "",
  description: typeof body?.description === "string" ? body.description.trim() : "",
  room: typeof body?.room === "string" ? body.room.trim() : "",
  lat: Number(body?.lat),
  lng: Number(body?.lng),
  radiusMeters: body?.radiusMeters === undefined ? 150 : Number(body?.radiusMeters),
  isActive: body?.isActive === undefined ? true : Boolean(body?.isActive),
});

// POST /venues — admin only
export const createVenue = async (req: Request, res: Response) => {
  try {
    const data = buildVenueBody(req.body);
    if (!data.name) {
      return res.status(400).json({ status: "Error", message: "Venue name is required" });
    }
    if (!isValidLat(data.lat) || !isValidLng(data.lng)) {
      return res
        .status(400)
        .json({ status: "Error", message: "Valid lat (-90..90) and lng (-180..180) are required" });
    }
    if (!isValidRadius(data.radiusMeters)) {
      return res
        .status(400)
        .json({ status: "Error", message: "radiusMeters must be between 10 and 2000" });
    }

    const venue = await Venue.create({
      ...data,
      location: { type: "Point", coordinates: [data.lng, data.lat] },
      createdBy: (req as any).user?._id ?? null,
      updatedBy: (req as any).user?._id ?? null,
    });

    try {
      await emitSystemEvent("venue.created", {
        venueId: venue._id,
        name: venue.name,
      });
    } catch (eventError) {
      console.error("venue.created event emit failed", eventError);
    }

    return res.status(201).json({ status: "OK", venue });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ status: "Error", message: "A venue with this name and room already exists" });
    }
    console.error("createVenue error", error);
    return res.status(500).json({ status: "Error", message: "Failed to create venue" });
  }
};

// GET /venues — staff
export const getAllVenues = async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const filter = includeInactive ? {} : { isActive: true };
    const venues = await Venue.find(filter).sort({ name: 1 }).lean();
    return res.json({ status: "OK", count: venues.length, venues });
  } catch (error) {
    console.error("getAllVenues error", error);
    return res.status(500).json({ status: "Error", message: "Failed to load venues" });
  }
};

// GET /venues/:id — staff
export const getVenueById = async (req: Request, res: Response) => {
  try {
    const venue = await Venue.findById(req.params.id).lean();
    if (!venue) {
      return res.status(404).json({ status: "Error", message: "Venue not found" });
    }
    return res.json({ status: "OK", venue });
  } catch (error) {
    console.error("getVenueById error", error);
    return res.status(500).json({ status: "Error", message: "Failed to load venue" });
  }
};

// PATCH /venues/:id — admin only
export const updateVenue = async (req: Request, res: Response) => {
  try {
    const existing = await Venue.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ status: "Error", message: "Venue not found" });
    }

    const data = buildVenueBody({ ...existing.toObject(), ...req.body });
    if (!data.name) {
      return res.status(400).json({ status: "Error", message: "Venue name is required" });
    }
    if (!isValidLat(data.lat) || !isValidLng(data.lng)) {
      return res
        .status(400)
        .json({ status: "Error", message: "Valid lat (-90..90) and lng (-180..180) are required" });
    }
    if (!isValidRadius(data.radiusMeters)) {
      return res
        .status(400)
        .json({ status: "Error", message: "radiusMeters must be between 10 and 2000" });
    }

    existing.name = data.name;
    existing.code = data.code;
    existing.description = data.description;
    existing.room = data.room;
    existing.lat = data.lat;
    existing.lng = data.lng;
    existing.radiusMeters = data.radiusMeters;
    existing.isActive = data.isActive;
    existing.location = { type: "Point", coordinates: [data.lng, data.lat] };
    existing.updatedBy = (req as any).user?._id ?? null;

    await existing.save();

    try {
      await emitSystemEvent("venue.updated", {
        venueId: existing._id,
        name: existing.name,
      });
    } catch (eventError) {
      console.error("venue.updated event emit failed", eventError);
    }

    return res.json({ status: "OK", venue: existing });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ status: "Error", message: "A venue with this name and room already exists" });
    }
    console.error("updateVenue error", error);
    return res.status(500).json({ status: "Error", message: "Failed to update venue" });
  }
};

// DELETE /venues/:id — admin only (soft delete)
export const deleteVenue = async (req: Request, res: Response) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) {
      return res.status(404).json({ status: "Error", message: "Venue not found" });
    }
    venue.isActive = false;
    venue.updatedBy = (req as any).user?._id ?? null;
    await venue.save();
    return res.json({ status: "OK", message: "Venue deactivated" });
  } catch (error) {
    console.error("deleteVenue error", error);
    return res.status(500).json({ status: "Error", message: "Failed to deactivate venue" });
  }
};
