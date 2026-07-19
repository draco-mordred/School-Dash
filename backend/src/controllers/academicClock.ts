import { type Request, type Response } from "express";
import AcademicClock, {
  buildPhaseConfigForClassLevel,
  resolveClassLevelFromName,
} from "../models/academicClock";
import AcademicYear from "../models/academicYear";
import ClassModel from "../models/classes";
import { logActivity } from "../utils/activitieslog";

export const createAcademicClock = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      academicYearId,
      classId,
      clockStartDate,
      clockIsPaused,
      clockPausedAt,
      clockPhase,
      classLevel,
      phaseConfig,
    } = req.body;

    if (!academicYearId || !classId) {
      res.status(400).json({ message: "academicYearId and classId are required" });
      return;
    }

    const [academicYear, classDoc] = await Promise.all([
      AcademicYear.findById(academicYearId),
      ClassModel.findById(classId),
    ]);

    if (!academicYear) {
      res.status(404).json({ message: "Academic year not found" });
      return;
    }

    if (!classDoc) {
      res.status(404).json({ message: "Class not found" });
      return;
    }

    const existingClock = await AcademicClock.findOne({ academicYear: academicYearId, classId });
    if (existingClock) {
      res.status(409).json({ message: "Academic clock already exists for this class and academic year" });
      return;
    }

    const resolvedClassLevel = classLevel ?? resolveClassLevelFromName(classDoc?.name ?? "");
    const useTemplatePhaseConfig = Boolean(req.body?.useTemplatePhaseConfig);
    const resolvedPhaseConfig = phaseConfig ?? (useTemplatePhaseConfig ? buildPhaseConfigForClassLevel(resolvedClassLevel) : {});

    const academicClock = await AcademicClock.create({
      academicYear: academicYearId,
      classId,
      clockStartDate: clockStartDate ?? null,
      clockIsPaused: clockIsPaused ?? false,
      clockPausedAt: clockPausedAt ?? null,
      clockPhase: clockPhase ?? null,
      classLevel: resolvedClassLevel ?? null,
      phaseConfig: resolvedPhaseConfig,
    });

    await AcademicYear.findByIdAndUpdate(
      academicYearId,
      {
        $set: {
          [`classClockData.${String(classId)}`]: {
            classId,
            classLevel: academicClock.classLevel ?? null,
            clockStartDate: academicClock.clockStartDate,
            clockIsPaused: academicClock.clockIsPaused,
            clockPausedAt: academicClock.clockPausedAt,
            clockPhase: academicClock.clockPhase,
            phaseConfig: academicClock.phaseConfig,
          },
        },
      },
      { returnDocument: 'after' }
    );

    await logActivity({
      userId: (req as any).user?._id,
      action: `Created academic clock for class ${classId} on academic year ${academicYear.name}`,
    });

    res.status(201).json(academicClock);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: `${error}` });
  }
};

export const getAcademicClocks = async (req: Request, res: Response): Promise<void> => {
  try {
    const query: any = {};
    if (req.query.academicYearId) query.academicYear = req.query.academicYearId;
    if (req.query.classId) query.classId = req.query.classId;

    const clocks = await AcademicClock.find(query)
      .populate("academicYear", "name fromYear toYear isCurrent")
      .populate("classId", "name academicYear");

    res.json({ clocks });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const getAcademicClockById = async (req: Request, res: Response): Promise<void> => {
  try {
    const academicClock = await AcademicClock.findById(req.params.id)
      .populate("academicYear", "name fromYear toYear isCurrent")
      .populate("classId", "name academicYear");

    if (!academicClock) {
      res.status(404).json({ message: "Academic clock not found" });
      return;
    }

    res.json(academicClock);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const updateAcademicClock = async (req: Request, res: Response): Promise<void> => {
  try {
    const allowedUpdates = [
      "clockStartDate",
      "clockIsPaused",
      "clockPausedAt",
      "clockPhase",
      "classLevel",
      "phaseConfig",
      "academicYear",
      "classId",
    ];
    const updateData: any = {};
    allowedUpdates.forEach((field) => {
      if (field in req.body) {
        updateData[field] = req.body[field];
      }
    });

    const academicClock = await AcademicClock.findById(req.params.id);

    if (!academicClock) {
      res.status(404).json({ message: "Academic clock not found" });
      return;
    }

    const classDoc = await ClassModel.findById(academicClock.classId);
    const resolvedClassLevel =
      typeof req.body.classLevel === "string" && req.body.classLevel
        ? req.body.classLevel
        : academicClock.classLevel ?? resolveClassLevelFromName(classDoc?.name ?? "");

    if (resolvedClassLevel && !Object.prototype.hasOwnProperty.call(req.body, "phaseConfig")) {
      updateData.phaseConfig = req.body?.useTemplatePhaseConfig
        ? buildPhaseConfigForClassLevel(resolvedClassLevel)
        : {};
    }

    if (resolvedClassLevel && !Object.prototype.hasOwnProperty.call(req.body, "classLevel")) {
      updateData.classLevel = resolvedClassLevel;
    }

    const updatedClock = await AcademicClock.findByIdAndUpdate(req.params.id, updateData, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!updatedClock) {
      res.status(404).json({ message: "Academic clock not found" });
      return;
    }

    await AcademicYear.findByIdAndUpdate(
      updatedClock.academicYear,
      {
        $set: {
          [`classClockData.${String(updatedClock.classId)}`]: {
            classId: updatedClock.classId,
            classLevel: updatedClock.classLevel ?? null,
            clockStartDate: updatedClock.clockStartDate,
            clockIsPaused: updatedClock.clockIsPaused,
            clockPausedAt: updatedClock.clockPausedAt,
            clockPhase: updatedClock.clockPhase,
            phaseConfig: updatedClock.phaseConfig,
          },
        },
      },
      { returnDocument: 'after' }
    );

    await logActivity({
      userId: (req as any).user?._id,
      action: `Updated academic clock ${updatedClock._id}`,
    });

    res.status(200).json(updatedClock);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const deleteAcademicClock = async (req: Request, res: Response): Promise<void> => {
  try {
    const academicClock = await AcademicClock.findById(req.params.id);
    if (!academicClock) {
      res.status(404).json({ message: "Academic clock not found" });
      return;
    }

    await AcademicYear.findByIdAndUpdate(
      academicClock.academicYear,
      {
        $unset: {
          [`classClockData.${String(academicClock.classId)}`]: "",
        },
      },
      { returnDocument: 'after' }
    );

    await academicClock.deleteOne();

    await logActivity({
      userId: (req as any).user?._id,
      action: `Deleted academic clock ${academicClock._id}`,
    });

    res.status(200).json({ message: "Academic clock deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const deleteAcademicClockByClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const academicYearId = req.query.academicYearId as string | undefined;
    const classId = req.query.classId as string | undefined;

    if (!academicYearId || !classId) {
      res.status(400).json({ message: "academicYearId and classId are required" });
      return;
    }

    const academicClock = await AcademicClock.findOne({ academicYear: academicYearId, classId });
    if (!academicClock) {
      res.status(404).json({ message: "Academic clock not found for this class" });
      return;
    }

    await AcademicYear.findByIdAndUpdate(
      academicYearId,
      {
        $unset: {
          [`classClockData.${String(classId)}`]: "",
        },
      },
      { returnDocument: 'after' }
    );

    await academicClock.deleteOne();

    await logActivity({
      userId: (req as any).user?._id,
      action: `Deleted academic clock for class ${classId}`,
    });

    res.status(200).json({ message: "Academic clock deleted for class" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
