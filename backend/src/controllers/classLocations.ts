import { type Request, type Response } from "express";
import ClassModel from "../models/classes";
import Venue from "../models/venue";
import { emitSystemEvent } from "../events";
import { logActivity } from "../utils/activitieslog";

// PR B — per-class default lecture locations.
// Each class gets one auto-named default venue ("<Class> Lecture Classroom")
// used as the GPS target for proximity checkins when a more specific
// period/session venue is not configured.

export const defaultVenueNameForClass = (className: string) =>
  `${className} Lecture Classroom`;

// GET /api/class-locations — admin/staff: list classes + default venues
export const getClassLocations = async (req: Request, res: Response) => {
  try {
    const classes = await ClassModel.find({})
      .sort({ name: 1 })
      .populate("defaultLectureVenue")
      .lean<any[]>();
    return res.json({
      status: "OK",
      classes: classes.map((cls) => ({
        _id: cls._id,
        name: cls.name,
        suggestedName: defaultVenueNameForClass(cls.name ?? ""),
        defaultVenue: cls.defaultLectureVenue ?? null,
      })),
    });
  } catch (error) {
    console.error("getClassLocations error", error);
    return res
      .status(500)
      .json({ status: "Error", message: "Failed to load class locations" });
  }
};

// PUT /api/class-locations/:classId — admin: create/update the class default
export const upsertClassLocation = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const { name, lat, lng, radiusMeters } = req.body;

    const cls: any = await ClassModel.findById(classId);
    if (!cls) {
      return res.status(404).json({ status: "Error", message: "Class not found" });
    }

    const numLat = Number(lat);
    const numLng = Number(lng);
    const numRadius =
      radiusMeters === undefined || radiusMeters === null || radiusMeters === ""
        ? 150
        : Number(radiusMeters);

    if (!Number.isFinite(numLat) || numLat < -90 || numLat > 90) {
      return res
        .status(400)
        .json({ status: "Error", message: "Valid lat (-90..90) is required" });
    }
    if (!Number.isFinite(numLng) || numLng < -180 || numLng > 180) {
      return res
        .status(400)
        .json({ status: "Error", message: "Valid lng (-180..180) is required" });
    }
    if (!Number.isFinite(numRadius) || numRadius < 10 || numRadius > 2000) {
      return res.status(400).json({
        status: "Error",
        message: "radiusMeters must be between 10 and 2000",
      });
    }

    const venueName =
      (typeof name === "string" && name.trim()) ||
      defaultVenueNameForClass(cls.name ?? "");

    let venue: any = cls.defaultLectureVenue
      ? await Venue.findById(cls.defaultLectureVenue)
      : null;
    if (!venue) {
      venue = await Venue.findOne({ name: venueName, room: "" });
    }
    if (!venue) {
      venue = new Venue({
        name: venueName,
        code: "",
        description: `Default lecture location for ${cls.name}`,
        room: "",
      } as any);
    }

    venue.name = venueName;
    venue.lat = numLat;
    venue.lng = numLng;
    venue.radiusMeters = numRadius;
    venue.isActive = true;
    venue.location = { type: "Point", coordinates: [numLng, numLat] };
    venue.updatedBy = (req as any).user?._id ?? null;
    await venue.save();

    if (String(cls.defaultLectureVenue ?? "") !== String(venue._id)) {
      cls.defaultLectureVenue = venue._id;
      await cls.save();
    }

    try {
      await emitSystemEvent("class.location.updated", {
        classId: cls._id,
        venueId: venue._id,
        name: venue.name,
      });
    } catch (eventError) {
      console.error("class.location.updated event emit failed", eventError);
    }

    try {
      await logActivity({
        userId: (req as any).user?._id,
        action: `Updated default lecture location for class ${cls.name}`,
      });
    } catch (logError) {
      console.warn("class location activity log failed", logError);
    }

    return res.json({ status: "OK", classId: cls._id, venue });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({
        status: "Error",
        message: "A venue with this name and room already exists",
      });
    }
    console.error("upsertClassLocation error", error);
    return res
      .status(500)
      .json({ status: "Error", message: "Failed to save class location" });
  }
};
