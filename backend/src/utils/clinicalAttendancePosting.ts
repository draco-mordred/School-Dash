import RotationPlan from "../models/rotationPlan";
import ClinicalRotationModel from "../models/clinicalRotation";

export interface ClinicalAttendancePostingResolutionResult {
  postingId: string;
  source: "clinical-rotation" | "rotation-plan-posting";
}

interface ClinicalAttendancePostingResolutionDeps {
  findClinicalRotationById?: (id: string) => Promise<any>;
  findRotationPlans?: (classId?: string) => Promise<any[]>;
}

export const resolveClinicalSessionPosting = async (
  postingId: string,
  classId?: string,
  deps: ClinicalAttendancePostingResolutionDeps = {}
): Promise<ClinicalAttendancePostingResolutionResult | null> => {
  if (!postingId) {
    return null;
  }

  const findClinicalRotationById = deps.findClinicalRotationById ?? ((id: string) => ClinicalRotationModel.findById(id).select("_id").lean());
  const findRotationPlans = deps.findRotationPlans ?? (async (id?: string) => {
    if (id) {
      return RotationPlan.find({ class: id }).select("postings _id").lean();
    }

    return RotationPlan.find({}).select("postings _id").lean();
  });

  const clinicalRotation = await findClinicalRotationById(postingId);
  if (clinicalRotation) {
    return { postingId, source: "clinical-rotation" };
  }

  const normalizedPostingId = String(postingId).trim();
  const rotationPlans = await findRotationPlans(classId);

  for (const rotationPlan of rotationPlans) {
    if (String(rotationPlan?._id) === normalizedPostingId) {
      return { postingId, source: "rotation-plan-posting" };
    }

    const match = (rotationPlan?.postings || []).find((posting: any) => String(posting?._id) === normalizedPostingId);
    if (match) {
      return { postingId, source: "rotation-plan-posting" };
    }
  }

  return null;
};
