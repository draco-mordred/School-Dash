import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, CircleHelp, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  hasCompletedStudentTourRoute,
  markStudentTourCompleted,
  markStudentTourRouteCompleted,
} from "@/components/onboarding/studentTour";

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string;
  route: string;
  actionLabel?: string;
}

const getGreetingSeenStorageKey = (userId?: string) =>
  userId ? `schooldash.onboarding.welcome:${userId}` : null;

const studentTourSteps: TourStep[] = [
  {
    id: "sidebar",
    title: "Main navigation",
    description:
      "Use this sidebar to jump between your portal, attendance, timetable, courses, and notifications.",
    target: "[data-tour='student-sidebar']",
    route: "/student-portal",
    actionLabel: "Next",
  },
  {
    id: "topbar",
    title: "Quick access",
    description:
      "The top bar lets you move around the app and keep track of your current page quickly.",
    target: "[data-tour='student-topbar']",
    route: "/student-portal",
    actionLabel: "Next",
  },
  {
    id: "attendance",
    title: "Attendance",
    description:
      "Check your attendance here to stay on top of your participation and progress.",
    target: "[data-tour='student-attendance']",
    route: "/attendance",
    actionLabel: "Continue",
  },
  {
    id: "timetable",
    title: "Timetable",
    description:
      "Open the timetable to see your class and lecture schedule for the week.",
    target: "[data-tour='student-timetable']",
    route: "/timetable",
    actionLabel: "Continue",
  },
  {
    id: "notifications",
    title: "Notifications",
    description:
      "Keep an eye on announcements, reminders, and updates from the school here.",
    target: "[data-tour='student-notifications']",
    route: "/notifications",
    actionLabel: "Finish",
  },
];

export default function StudentTourOverlay() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = studentTourSteps[currentStepIndex];

  const welcomeSeen = useMemo(() => {
    const storageKey = getGreetingSeenStorageKey(user?._id);
    return storageKey
      ? window.localStorage.getItem(storageKey) === "true"
      : false;
  }, [user?._id]);

  const shouldShowTour = useMemo(() => {
    if (!user || user.role !== "student") return false;
    if (!welcomeSeen) return false;
    if (!currentStep) return false;
    return !hasCompletedStudentTourRoute(user._id, currentStep.route);
  }, [currentStep, user, welcomeSeen]);

  useEffect(() => {
    if (!shouldShowTour) {
      setIsVisible(false);
      return;
    }

    const matchingStep = studentTourSteps.find(
      (step) => step.route === location.pathname,
    );
    if (!matchingStep) {
      setIsVisible(false);
      return;
    }

    const target = document.querySelector(
      matchingStep.target,
    ) as HTMLElement | null;
    if (!target) {
      setIsVisible(false);
      return;
    }

    const rect = target.getBoundingClientRect();
    setTargetRect(rect);
    setCurrentStepIndex(
      studentTourSteps.findIndex((step) => step.id === matchingStep.id),
    );
    setIsVisible(true);
  }, [location.pathname, shouldShowTour]);

  const closeTour = () => {
    if (user) {
      markStudentTourCompleted(user._id);
    }
    setIsVisible(false);
  };

  const handleNext = () => {
    const nextStep = studentTourSteps[currentStepIndex + 1];
    if (user && currentStep) {
      markStudentTourRouteCompleted(user._id, currentStep.route);
    }

    if (!nextStep) {
      closeTour();
      return;
    }

    if (nextStep.route !== currentStep?.route) {
      navigate(nextStep.route);
      return;
    }

    setCurrentStepIndex(currentStepIndex + 1);
  };

  const handleSkip = () => {
    closeTour();
  };

  if (!isVisible || !currentStep || !targetRect) {
    return null;
  }

  const tooltipWidth = 300;
  const tooltipHeight = 180;
  const margin = 12;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const topPosition = targetRect.top + window.scrollY;
  const leftPosition = targetRect.left + window.scrollX;

  const prefersBelow = topPosition + targetRect.height + tooltipHeight + margin < viewportHeight + window.scrollY;
  const tooltipTop = prefersBelow
    ? topPosition + targetRect.height + 10
    : Math.max(window.scrollY + margin, topPosition - tooltipHeight - 10);

  const tooltipLeft = Math.max(
    window.scrollX + margin,
    Math.min(window.scrollX + viewportWidth - tooltipWidth - margin, leftPosition + targetRect.width / 2 - tooltipWidth / 2),
  );

  const pointerTop = prefersBelow
    ? -8
    : tooltipHeight - 1;

  const pointerLeft = Math.min(
    tooltipWidth - 20,
    Math.max(20, leftPosition + targetRect.width / 2 - tooltipLeft),
  );

  return (
    <div className="fixed inset-0 z-[130] pointer-events-none">
      <div className="pointer-events-none absolute inset-0" />
      <div
        className="pointer-events-auto absolute rounded-[14px] border border-primary/20 bg-background/95 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_40px_rgba(15,23,42,0.22)] backdrop-blur transition-all duration-300 ease-out animate-in fade-in-0 zoom-in-95"
        style={{ top: tooltipTop, left: tooltipLeft, width: tooltipWidth, maxWidth: viewportWidth - 24 }}
      >
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-0" style={{ transform: `translateX(${pointerLeft}px)` }}>
          <div
            className={`absolute h-0 w-0 border-l-[8px] border-r-[8px] border-t-[8px] border-b-[8px] border-transparent ${prefersBelow ? "border-b-primary/30" : "border-t-primary/30"}`}
            style={{ top: prefersBelow ? -8 : undefined, bottom: prefersBelow ? undefined : -8, left: -8 }}
          />
        </div>
{/* 
        <div
          className="pointer-events-none absolute rounded-[12px]"
          style={{
            top: targetRect.top + window.scrollY - 6,
            left: targetRect.left + window.scrollX - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.16)",
          }}
        /> */}

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 rounded-full bg-primary/10 p-1.5 text-primary">
              <CircleHelp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Quick tip
              </p>
              <h3 className="text-sm font-semibold">{currentStep.title}</h3>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSkip}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">{currentStep.description}</p>

        <div className="mt-4 flex items-center gap-2">
          <Button variant="outline" onClick={handleSkip} className="flex-1">
            Skip
          </Button>
          <Button onClick={handleNext} className="flex-1">
            {currentStep.actionLabel ?? "Next"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
