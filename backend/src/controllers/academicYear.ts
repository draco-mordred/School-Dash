import { type Request, type Response } from "express";
import AcademicYear from "../models/academicYear"
import { logActivity } from "../utils/activitieslog";
import academicYear from "../routes/academicYear";

// @desc Create a new Academic Year
// @route POST /api/academic-years
// @access Private/Admin
export const createAcademicYear = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, fromYear, toYear, isCurrent, clockPhase } = req.body;
    const existingYear = await AcademicYear.findOne({
      fromYear,
      toYear,
    });
    if (existingYear) {
      res.status(400).json({
        message: "Academic Year already exists!",
      });
      return;
    }

    // if isCurrent is true, set all other academic years to false
    if (isCurrent) {
      await AcademicYear.updateMany(
        { _id: { $ne: null } },
        { isCurrent: false },
      );
    }

    const academicYear = await AcademicYear.create({
      name,
      fromYear,
      toYear,
      isCurrent: isCurrent || false,
      clockStartDate: fromYear,
      clockIsPaused: false,
      clockPausedAt: null,
      clockPhase: clockPhase ?? null,
    });

    await logActivity({
      userId: (req as any).user._id,
      action: `Created academic year ${name}, with ID: ${academicYear._id} and it's ${(isCurrent ? "current" : "not current")}`,
    });
    res.status(201).json(academicYear);
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: `${error}`,
    });
  }
}
// @ desc Get all Academic Year (Paginated and Searchable)
// @ route Get /api/academic-year
// @ access Private/Admin
export const getAllAcademicYears = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // 1.
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    // 2. Biuld Search Query (Search by Name)
    const query: any = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const [total, years] = await Promise.all([
      AcademicYear.countDocuments(query),
      AcademicYear.find(query)
      .sort({ createdAt: -1 }) //Newest fisrt
      .skip((page - 1) * limit)
      .limit(limit),
    ]);

    res.json({
      years,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    res.status(500).json({ message: `Server error`, error});
  }
}

// @ desc Get the current active Academic Year
// @ route Get /api/academic-year/current
// @ access Public or Protected
export const getCurrentAcademicYear = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const currentYear = await AcademicYear.findOne({ isCurrent: true });
    if (!currentYear) {
      res.status(200).json({ year: null, message: "No current academic year set" });
      return;
    }
    res.status(200).json({ year: currentYear });
  } catch (error) {
    res.status(500).json({
      message: "Server Error", error: `${error}`
    })
  }
}

// @ desc Update Academic Year
// @ route PUT /api/academic-year/:id
// @ access Private/Admin
export const updateAcademicYear = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { isCurrent } = req.body;
    if (isCurrent) {
      await AcademicYear.updateMany(
        {_id: { $ne: req.params.id}},
        { isCurrent: false}
      );
    }
    const updatedYear = await AcademicYear.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: 'after', runValidators: true }
    );
    await logActivity({ 
      userId: (req as any).user._id, 
      action: `Updated academic year ${updatedYear?.name} with ID: ${updatedYear?._id} and it's ${(isCurrent ? "current" : "not current")}` 
    });
    if (!updatedYear) {
      res.status(404).json({
        message: "Academic Year not found!"
      })
    }
    res.status(200).json(updatedYear);
  } catch (error) {
    res.status(500).json({
      message: "Server Error", error: `${error}`
    })
  }
}

// @desc    Delete Academic Year
// @route   DELETE /api/academic-year/:id
// @access  Private/Admin
export const deleteAcedemicYear = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) {
      res.status(404).json({ message: "Academic Year not found!" }); 
      return;
    }

    // Prevent deletion if it's the current academic year to prevent system breakage.
    if (year.isCurrent) {
      res.status(404).json({ message: "Cannot delete the current active academic year!" });
      return;
    }

    await year!.deleteOne();

    await logActivity({ 
      userId: (req as any).user._id,
      action: `Deleted academic year ${year!.name} with ID: ${year!._id} and it's ${(year!.isCurrent ? "current" : "not current")}`
    })
  } catch (error) {
    res.status(500).json({
      message: "Server Error", error: `${error}`
    })
  }
}