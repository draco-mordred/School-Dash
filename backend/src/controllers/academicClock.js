import AcademicClock, { buildPhaseConfigForClassLevel, resolveClassLevelFromName, } from "../models/academicClock";
import AcademicYear from "../models/academicYear";
import ClassModel from "../models/classes";
import { logActivity } from "../utils/activitieslog";
import { resolveAcademicClockPhase } from "../utils/academicClockPhase";
export const createAcademicClock = async (req, res) => {
    try {
        const { academicYearId, classId, clockStartDate, clockIsPaused, clockPausedAt, clockPhase, classLevel, phaseConfig, } = req.body;
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
            // Idempotent create: a clock already exists for this class + year, so
            // apply the submitted updates instead of failing with a 409. This keeps
            // saves from being lost when the client could not resolve the clock id.
            const idempotentUpdates = [
                "clockStartDate",
                "clockIsPaused",
                "clockPausedAt",
                "clockPhase",
                "classLevel",
                "phaseConfig",
            ];
            const updateData = {};
            idempotentUpdates.forEach((field) => {
                if (field in req.body) {
                    updateData[field] = req.body[field];
                }
            });
            const idempotentClassLevel = classLevel ?? existingClock.classLevel ?? resolveClassLevelFromName(classDoc?.name ?? "");
            if (idempotentClassLevel) {
                updateData.classLevel = idempotentClassLevel;
            }
            const updatedExistingClock = await AcademicClock.findByIdAndUpdate(existingClock._id, updateData, { returnDocument: 'after', runValidators: true });
            await AcademicYear.findByIdAndUpdate(academicYearId, {
                $set: {
                    [`classClockData.${String(classId)}`]: {
                        classId,
                        classLevel: updatedExistingClock?.classLevel ?? null,
                        clockStartDate: updatedExistingClock?.clockStartDate ?? null,
                        clockIsPaused: updatedExistingClock?.clockIsPaused ?? false,
                        clockPausedAt: updatedExistingClock?.clockPausedAt ?? null,
                        clockPhase: updatedExistingClock?.clockPhase ?? null,
                        phaseConfig: updatedExistingClock?.phaseConfig ?? {},
                    },
                },
            }, { returnDocument: 'after' });
            await logActivity({
                userId: req.user?._id,
                action: `Updated existing academic clock for class ${classId} on academic year ${academicYear.name}`,
            });
            res.status(200).json(updatedExistingClock);
            return;
        }
        const resolvedClassLevel = classLevel ?? resolveClassLevelFromName(classDoc?.name ?? "");
        const resolvedPhaseConfig = phaseConfig ?? buildPhaseConfigForClassLevel(resolvedClassLevel);
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
        await AcademicYear.findByIdAndUpdate(academicYearId, {
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
        }, { returnDocument: 'after' });
        await logActivity({
            userId: req.user?._id,
            action: `Created academic clock for class ${classId} on academic year ${academicYear.name}`,
        });
        res.status(201).json(academicClock);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: `${error}` });
    }
};
export const getAcademicClocks = async (req, res) => {
    try {
        const query = {};
        if (req.query.academicYearId)
            query.academicYear = req.query.academicYearId;
        if (req.query.classId)
            query.classId = req.query.classId;
        const clocks = await AcademicClock.find(query)
            .populate("academicYear", "name fromYear toYear isCurrent")
            .populate("classId", "name academicYear");
        res.json({ clocks });
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};
export const getActiveAcademicClockForClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const classDoc = await ClassModel.findById(classId)
            .select("name academicYear")
            .populate("academicYear", "name fromYear toYear isCurrent")
            .lean();
        if (!classDoc) {
            res.status(404).json({ message: "Class not found" });
            return;
        }
        // Honor an explicit academicYearId query param first (the admin UI always
        // sends the active year). Only fall back to the class's own academicYear
        // when no param was provided, so reads match where writes are stored.
        const requestedAcademicYearId = req.query.academicYearId
            ? String(req.query.academicYearId)
            : (typeof classDoc.academicYear === "object" && classDoc.academicYear
                ? String(classDoc.academicYear?._id)
                : String(classDoc.academicYear));
        const clock = await AcademicClock.findOne({
            classId,
            academicYear: requestedAcademicYearId,
        }).lean();
        if (!clock) {
            res.status(404).json({ message: "Academic clock not found for this class and year" });
            return;
        }
        const resolved = resolveAcademicClockPhase(clock);
        const phase = resolved.phase
            ? {
                id: resolved.phaseId,
                name: resolved.phase?.name ?? resolved.phaseId,
                duration: Number(resolved.phase?.duration ?? resolved.phase?.durationMonths ?? 0),
                startsAt: resolved.startsAt,
                endsAt: resolved.endsAt,
                config: resolved.phase,
            }
            : null;
        res.json({
            _id: clock._id,
            classId: String(clock.classId),
            className: classDoc.name,
            academicYearId: requestedAcademicYearId,
            academicYear: classDoc.academicYear,
            clockStartDate: clock.clockStartDate ?? null,
            clockPausedAt: clock.clockPausedAt ?? null,
            clockIsPaused: Boolean(clock.clockIsPaused),
            storedClockPhase: clock.clockPhase ?? null,
            classLevel: clock.classLevel ?? null,
            phaseConfig: clock.phaseConfig ?? {},
            activePhase: phase,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};
export const getAcademicClockById = async (req, res) => {
    try {
        const academicClock = await AcademicClock.findById(req.params.id)
            .populate("academicYear", "name fromYear toYear isCurrent")
            .populate("classId", "name academicYear");
        if (!academicClock) {
            res.status(404).json({ message: "Academic clock not found" });
            return;
        }
        res.json(academicClock);
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};
export const updateAcademicClock = async (req, res) => {
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
        const updateData = {};
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
        const resolvedClassLevel = typeof req.body.classLevel === "string" && req.body.classLevel
            ? req.body.classLevel
            : academicClock.classLevel ?? resolveClassLevelFromName(classDoc?.name ?? "");
        if (resolvedClassLevel && req.body?.useTemplatePhaseConfig && !Object.prototype.hasOwnProperty.call(req.body, "phaseConfig")) {
            updateData.phaseConfig = buildPhaseConfigForClassLevel(resolvedClassLevel);
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
        await AcademicYear.findByIdAndUpdate(updatedClock.academicYear, {
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
        }, { returnDocument: 'after' });
        await logActivity({
            userId: req.user?._id,
            action: `Updated academic clock ${updatedClock._id}`,
        });
        res.status(200).json(updatedClock);
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};
export const deleteAcademicClock = async (req, res) => {
    try {
        const academicClock = await AcademicClock.findById(req.params.id);
        if (!academicClock) {
            res.status(404).json({ message: "Academic clock not found" });
            return;
        }
        await AcademicYear.findByIdAndUpdate(academicClock.academicYear, {
            $unset: {
                [`classClockData.${String(academicClock.classId)}`]: "",
            },
        }, { returnDocument: 'after' });
        await academicClock.deleteOne();
        await logActivity({
            userId: req.user?._id,
            action: `Deleted academic clock ${academicClock._id}`,
        });
        res.status(200).json({ message: "Academic clock deleted" });
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};
export const deleteAcademicClockByClass = async (req, res) => {
    try {
        const academicYearId = req.query.academicYearId;
        const classId = req.query.classId;
        if (!academicYearId || !classId) {
            res.status(400).json({ message: "academicYearId and classId are required" });
            return;
        }
        const academicClock = await AcademicClock.findOne({ academicYear: academicYearId, classId });
        if (!academicClock) {
            res.status(404).json({ message: "Academic clock not found for this class" });
            return;
        }
        await AcademicYear.findByIdAndUpdate(academicYearId, {
            $unset: {
                [`classClockData.${String(classId)}`]: "",
            },
        }, { returnDocument: 'after' });
        await academicClock.deleteOne();
        await logActivity({
            userId: req.user?._id,
            action: `Deleted academic clock for class ${classId}`,
        });
        res.status(200).json({ message: "Academic clock deleted for class" });
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};
