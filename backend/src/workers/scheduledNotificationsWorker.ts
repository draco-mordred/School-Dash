import ScheduledNotification from "../models/scheduledNotification";
import mongoose from "mongoose";

export async function processDueScheduledNotifications(limit = 100) {
  const now = new Date();
  const due = await ScheduledNotification.find({ processed: false, sendAt: { $lte: now } }).limit(limit);
  if (!due || due.length === 0) return { processed: 0 };

  const { Notification } = await import("../models/notification");
  let processedCount = 0;

  for (const s of due) {
    try {
      await Notification.create({
        userId: s.userId,
        role: 'student',
        title: s.title,
        message: s.message,
        type: 'timetable',
        isRead: false,
        link: s.metadata?.link || null,
        metadata: s.metadata || {},
      });
      await ScheduledNotification.updateOne({ _id: s._id }, { $set: { processed: true } });
      processedCount++;
    } catch (err) {
      console.error("Failed to process scheduled notification", s._id, err);
    }
  }

  return { processed: processedCount };
}

export default processDueScheduledNotifications;

export async function updateRotationStatuses() {
  const now = new Date();
  const { default: ClinicalRotation } = await import("../models/clinicalRotation");
  const { Notification } = await import("../models/notification");

  // Promote upcoming -> active when current date overlaps start/end
  const toActivate = await ClinicalRotation.find({ rotationStatus: 'upcoming', rotationStartDate: { $lte: now }, rotationEndDate: { $gte: now } });
  const toComplete = await ClinicalRotation.find({ rotationStatus: 'active', rotationEndDate: { $lt: now } });

  const notifications: any[] = [];

  for (const r of toActivate) {
    try {
      await ClinicalRotation.updateOne({ _id: r._id }, { $set: { rotationStatus: 'active' } });
      // Notify student
      notifications.push({ userId: r.student, role: 'student', title: `Rotation started: ${r.rotationName}`, message: `Your rotation ${r.rotationName} has started. Check your groups and schedule.`, type: 'timetable', isRead: false, link: `/clinical-rotations/${r._id}`, metadata: { rotationId: r._id }, createdAt: new Date(), updatedAt: new Date() });
      // Notify supervisor if present
      if (r.rotationSupervisor) {
        notifications.push({ userId: r.rotationSupervisor, role: 'teacher', title: `Rotation started: ${r.rotationName}`, message: `Rotation ${r.rotationName} for student ${r.studentName || ''} has started.`, type: 'timetable', isRead: false, link: `/clinical-rotations/${r._id}`, metadata: { rotationId: r._id }, createdAt: new Date(), updatedAt: new Date() });
      }
    } catch (err) {
      console.error('Failed to activate rotation', r._id, err);
    }
  }

  for (const r of toComplete) {
    try {
      await ClinicalRotation.updateOne({ _id: r._id }, { $set: { rotationStatus: 'completed' } });
      // Optionally notify student/supervisor of completion
      notifications.push({ userId: r.student, role: 'student', title: `Rotation completed: ${r.rotationName}`, message: `Your rotation ${r.rotationName} has completed.`, type: 'timetable', isRead: false, link: `/clinical-rotations/${r._id}`, metadata: { rotationId: r._id }, createdAt: new Date(), updatedAt: new Date() });
      if (r.rotationSupervisor) {
        notifications.push({ userId: r.rotationSupervisor, role: 'teacher', title: `Rotation completed: ${r.rotationName}`, message: `Rotation ${r.rotationName} for student ${r.studentName || ''} has completed.`, type: 'timetable', isRead: false, link: `/clinical-rotations/${r._id}`, metadata: { rotationId: r._id }, createdAt: new Date(), updatedAt: new Date() });
      }
    } catch (err) {
      console.error('Failed to complete rotation', r._id, err);
    }
  }

  if (notifications.length) {
    try {
      await Notification.insertMany(notifications);
    } catch (err) {
      console.error('Failed to insert rotation status notifications', err);
    }
  }

  return { activated: toActivate.length, completed: toComplete.length };
}
