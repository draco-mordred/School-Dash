"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Users,
  Briefcase,
  Stethoscope,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  variant?: VariantProps<typeof buttonVariants>["variant"];
}

interface QuickActionsProps {
  onCreateStudent?: () => void;
  onCreateStaff?: () => void;
  onCreatePosting?: () => void;
  onCreateTimetable?: () => void;
  onCreateAnnouncement?: () => void;
}

/**
 * Quick Actions Component
 * 
 * Provides easy access to common admin tasks:
 * - Create Student
 * - Create Staff
 * - Create Posting
 * - Create Timetable
 * - Send Announcement
 */
export const QuickActions = ({
  onCreateStudent,
  onCreateStaff,
  onCreatePosting,
  onCreateTimetable,
  onCreateAnnouncement,
}: QuickActionsProps) => {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      id: "create-student",
      label: "Create Student",
      icon: <Users className="h-4 w-4" />,
      action: onCreateStudent || (() => navigate("/admin/users/students")),
      variant: "default",
    },
    {
      id: "create-staff",
      label: "Create Staff",
      icon: <Briefcase className="h-4 w-4" />,
      action: onCreateStaff || (() => navigate("/admin/users/teachers")),
      variant: "default",
    },
    {
      id: "create-posting",
      label: "Create Posting",
      icon: <Stethoscope className="h-4 w-4" />,
      action: onCreatePosting || (() => navigate("/admin/clinicals/postings")),
      variant: "outline",
    },
    {
      id: "create-timetable",
      label: "Create Timetable",
      icon: <Calendar className="h-4 w-4" />,
      action: onCreateTimetable || (() => navigate("/admin/timetables/builder")),
      variant: "outline",
    },
    {
      id: "create-announcement",
      label: "Send Announcement",
      icon: <MessageSquare className="h-4 w-4" />,
      action: onCreateAnnouncement || (() => navigate("/admin/announcements/create")),
      variant: "secondary",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              onClick={action.action}
              variant={action.variant || "default"}
              className="w-full justify-start gap-2"
            >
              <Plus className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
