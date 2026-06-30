import { type Request, type Response } from "express";
import { generate500LevelOgPaeJuniorPostingSchedule } from "../utils/clinicalPostingScheduler";
 import RotationPlan from '../models/rotationPlan'; 
//  import logActivity from "../utils/activitieslog";


 // ClinicalRotation model is loaded lazily to avoid module resolution errors during test bootstrapping
 async function loadClinicalRotation() {
   // import the ClinicalRotation model directly
   return (await import("../models/clinicalRotation")).default;
 }


// @desc    Generate 500-level O&G / Pediatrics clinical posting schedule
// @route   POST /api/og-ped-rotations/oGPeds-JuniorPosting-Schedule
// @access  Private (Admin/Teacher) 
 export const generate500LevelJuniorOgPaePostingSchedule = async (
  req: Request, 
  res: Response
) => {
   try {
     const { classId, postingName, postingStartDate } = req.body;
     const result = await generate500LevelOgPaeJuniorPostingSchedule({ classId, postingName, postingStartDate });
 
     if (!result.validation.valid) {
       return res.status(422).json({ message: "Schedule validation failed", validation: result.validation, schedule: result.schedule });
     }
     // Persist the generated schedule as a RotationPlan document
     try {
       const timeline = result.schedule.rotationTimeline || [];
       const postings = [
         {
           name: result.schedule.postingName,
           category: result.schedule.postingType,
           startDate: result.schedule.startDate,
           endDate: result.schedule.endDate,
           groups: (result.schedule.unitAssignments || []).map((u: any) => {
             // collect assigned ranges from timeline
             const assigned: Array<{ startDate?: string; endDate?: string }> = [];
             for (const t of timeline) {
               for (const unit of (t.units || [])) {
                 if (unit.unitId === u.unitId) assigned.push({ startDate: unit.startDate, endDate: unit.endDate });
               }
             }
             return {
               groupId: null,
               group: { name: u.unit, students: u.students || [] },
               assigned,
               supervisorName: u.consultant?.name || u.resident?.name || 'TBD - Assign Later',
               supervisor: u.consultant?._id || null,
             };
           }),
           meta: { generatedBy: (req as any).user?._id || null },
         },
       ];
 
       const doc = await RotationPlan.create({ name: result.schedule.postingName, class: classId, createdBy: (req as any).user?._id, postings, groups: [] });
       return res.status(200).json({ schedule: result.schedule, saved: doc });
     } catch (saveErr) {
       console.error('Failed to save generated schedule', saveErr);
       // return schedule even if saving fails
       return res.status(200).json({ schedule: result.schedule, saved: null, saveError: String(saveErr) });
     }
   } catch (error) {
     console.error(error);
     return res.status(500).json({ message: "Unable to generate posting schedule", error });
   }
 };

 export const update500LevelJuniorOgPaePostingSchedule = async (
  req: Request, 
  res: Response
) => {
  try {
    const { scheduleId, updates } = req.body;
    const ClinicalRotation = await loadClinicalRotation();
    const schedule = await ClinicalRotation.findById(scheduleId);
    if (!schedule) return res.status(404).json({ message: "Schedule not found" });

    const updatedSchedule = await ClinicalRotation.findByIdAndUpdate(scheduleId, updates, { returnDocument: 'after' });
    return res.status(200).json(updatedSchedule);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const edit500LevelJuniorOgPaePostingSchedule = async (  
  req: Request, 
  res: Response
) => {

}