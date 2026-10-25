import { type Request, type Response } from "express";
import { getAttendanceFor } from "../services/attendanceReader";

const requestUser = (req: Request) => (req as any).user;

// Phase K — GET /api/attendance/unified
// Central read accessor endpoint (D16): one normalized view across lecture
// (LATIFAH) and clinical (KRYSTA) attendance. Students always see their own
// data; other roles must scope the query with studentId or classId.
export const getUnifiedAttendance = async (req: Request, res: Response) => {
  try {
    const user = requestUser(req);
    const role = String(user?.role ?? "").toLowerCase();
    const { studentId, classId, scope, startDate, endDate } = req.query;

    let targetStudent: string | undefined = studentId ? String(studentId) : undefined;

    if (role === "student") {
      targetStudent = String(user?._id ?? "");
      if (studentId && String(studentId) !== targetStudent) {
        return res.status(403).json({
          success: false,
          message: "Students can only view their own attendance",
        });
      }
    } else if (!targetStudent && !classId) {
      return res.status(400).json({
        success: false,
        message: "Provide studentId or classId to scope the query",
      });
    }

    const normalizedScope = ["all", "lecture", "clinical"].includes(String(scope))
      ? (String(scope) as "all" | "lecture" | "clinical")
      : "all";

    const result = await getAttendanceFor({
      studentId: targetStudent,
      classId: classId ? String(classId) : undefined,
      startDate: startDate ? new Date(String(startDate)) : undefined,
      endDate: endDate ? new Date(String(endDate)) : undefined,
      scope: normalizedScope,
    });

    return res.status(200).json({
      success: true,
      data: result.records,
      summary: result.summary,
      period: {
        start: startDate ? new Date(String(startDate)).toISOString() : null,
        end: endDate ? new Date(String(endDate)).toISOString() : null,
      },
    });
  } catch (error: any) {
    console.error("Error fetching unified attendance:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching unified attendance",
      error: error.message,
    });
  }
};
