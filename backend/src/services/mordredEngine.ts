import User from "../models/user"; // Path to your User model
import mongoose from "mongoose";

import { Chat } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createRedisState } from "@chat-adapter/state-redis";

export async function routeTaskToStaff(departmentName: string, taskType: string, referenceId: string) {
  try {
    const permissionKey = `mordred_rules.${taskType}`;

    const queryFilter = {
      // 1. Target only active personnel roles from your UserRole enum
      role: { $in: ["teacher", "unitconsultant", "unitresident"] }, 
      
      // 2. Match the exact string name from your UserDepartmentName mapping
      department: departmentName, 
      isActive: true,
      
      // 3. Ensure the individual is permitted for this type of task
      [permissionKey]: true,
      
      // 4. Load checking logic
      $expr: {
        $lt: ["$mordred_rules.current_active_load", "$mordred_rules.max_ticket_capacity"]
      }
    } as any;

    const assignedStaff = await User.findOneAndUpdate(
      queryFilter,
      {
        $inc: { "mordred_rules.current_active_load": 1 },
        $push: {
          mordred_assigned_tasks: {
            task_type: taskType.toUpperCase(),
            reference_id: new mongoose.Types.ObjectId(referenceId),
            assigned_at: new Date()
          }
        }
      },
      { returnDocument: 'after' }
    );

    return assignedStaff; // Returns the updated staff User document or null if full
  } catch (error) {
    console.error("MORDRED Automation Core Error:", error);
    throw error;
  }
}
