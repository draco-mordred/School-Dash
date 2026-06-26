"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

export type UserRole = "lecturer" | "consultant" | "resident" | "course_coordinator" | "unit_coordinator";

export interface RoleConfig {
  id: UserRole;
  label: string;
  description: string;
}

const AVAILABLE_ROLES: RoleConfig[] = [
  {
    id: "lecturer",
    label: "Lecturer",
    description: "Teaches courses and manages class sessions",
  },
  {
    id: "consultant",
    label: "Clinical Consultant",
    description: "Oversees clinical rotations and provides clinical guidance",
  },
  {
    id: "resident",
    label: "Resident",
    description: "Participates in clinical training and research",
  },
  {
    id: "course_coordinator",
    label: "Course Coordinator",
    description: "Coordinates course content and assessments",
  },
  {
    id: "unit_coordinator",
    label: "Unit Coordinator",
    description: "Manages clinical units and student postings",
  },
];

interface RoleAssignmentDialogProps {
  open: boolean;
  userName: string;
  currentRoles: UserRole[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (roles: UserRole[]) => void;
  loading?: boolean;
}

export function RoleAssignmentDialog({
  open,
  userName,
  currentRoles,
  onOpenChange,
  onConfirm,
  loading = false,
}: RoleAssignmentDialogProps) {
  const [selectedRoles, setSelectedRoles] = useState<Set<UserRole>>(new Set(currentRoles));

  const handleRoleToggle = (roleId: UserRole) => {
    const newRoles = new Set(selectedRoles);
    if (newRoles.has(roleId)) {
      newRoles.delete(roleId);
    } else {
      newRoles.add(roleId);
    }
    setSelectedRoles(newRoles);
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedRoles));
    onOpenChange(false);
  };

  const hasChanges = selectedRoles.size !== currentRoles.length || 
    Array.from(selectedRoles).some(r => !currentRoles.includes(r));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Roles</DialogTitle>
          <DialogDescription>
            Assign one or more roles to {userName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {selectedRoles.size > 0 && (
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedRoles).map((roleId) => {
                const role = AVAILABLE_ROLES.find((r) => r.id === roleId);
                return (
                  <Badge key={roleId} variant="secondary">
                    {role?.label}
                  </Badge>
                );
              })}
            </div>
          )}

          <div className="space-y-3">
            {AVAILABLE_ROLES.map((role) => (
              <div key={role.id} className="flex items-start space-x-3">
                <Checkbox
                  id={role.id}
                  checked={selectedRoles.has(role.id)}
                  onCheckedChange={() => handleRoleToggle(role.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor={role.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {role.label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
                </div>
              </div>
            ))}
          </div>

          {selectedRoles.size === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Select at least one role for this user
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedRoles.size === 0 || loading}
          >
            {loading ? "Saving..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
