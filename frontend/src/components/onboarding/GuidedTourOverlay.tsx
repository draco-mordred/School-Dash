import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, CircleHelp, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  getGuidedTourProgress,
  markGuidedTourCompleted,
  markGuidedTourStepCompleted,
  type GuidedTourProgress,
} from "@/components/onboarding/guidedTour";
import { getTourSteps } from "@/components/onboarding/tourConfig";

const getGreetingSeenStorageKey = (userId?: string) =>
  userId ? `schooldash.onboarding.welcome:${userId}` : null;

/**
 * Role-aware, page-by-page first-launch tour.
 * - Starts after the welcome greeting card is completed (Continue clicked).
 * - Each step either anchors to a [data-tour] target or shows a centered card.
 * - "Next" marks the current step done and navigates to the next page.
 * - "Skip" (or the X) marks the whole tour complete.
 * - Progress lives in localStorage, so the tour never reopens on this
 *   device/browser unless the user signs in from a new one.
 */
export default function GuidedTourOverlay() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<GuidedTourProgress | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps = useMemo(() => getTourSteps(user?.role ?? ""), [user?.role]);

  const welcomeSeen = useMemo(() => {
    const storageKey = getGreetingSeenStorageKey(user?._id);
    return storageKey
      ? window.localStorage.getItem(storageKey) === "true"
      : false;
  }, [user?._id]);

  useEffect(() => {
    if (user?._id) {
      setProgress(getGuidedTourProgress(user._id));
    }
  }, [user?._id]);

  const activeIndex =
    progress && !progress.completed
      ? steps.findIndex((step) => !progress.completedSteps.includes(step.id))
      : -1;
  const currentStep = activeIndex >= 0 ? steps[activeIndex] : null;
  const isLastStep = activeIndex === steps.length - 1;

  const routeMatches = currentStep
    ? currentStep.route === "*" || currentStep.route === location.pathname
    : false;

  const shouldShowTour = Boolean(
    user &&
      welcomeSeen &&
      progress &&
      !progress.completed &&
      currentStep &&
      routeMatches,
  );

  // Resolve & measure the anchor target (if any) whenever the active step or route changes.
  useEffect(() => {
    if (!shouldShowTour || !currentStep) {
      setTargetRect(null);
      return;
    }

    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      if (!currentStep.target) {
        setTargetRect(null);
        return;
      }
      const target = document.querySelector(currentStep.target) as HTMLElement | null;
      if (!target) {
        setTargetRect(null);
        return;
      }
      setTargetRect(target.getBoundingClientRect());
    };

    // Small delay so page transitions finish rendering before measuring.
    const timer = window.setTimeout(measure, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [currentStep?.id, location.pathname, shouldShowTour]);

  if (!shouldShowTour || !currentStep || !user) {
    return null;
  }

  const closeTour = () => {
    markGuidedTourCompleted(user._id);
    setProgress((prev) =>
      prev ? { ...prev, completed: true } : { completed: true, completedSteps: [] },
    );
  };

  const handleNext = () => {
    markGuidedTourStepCompleted(user._id, currentStep.id);
    setProgress((prev) =>
      prev
        ? { ...prev, completedSteps: [...prev.completedSteps, currentStep.id] }
        : { completed: false, completedSteps: [currentStep.id] },
    );

    const nextStep = steps[activeIndex + 1];
    if (!nextStep) {
      closeTour();
      return;
    }

    if (nextStep.route !== "*" && nextStep.route !== location.pathname) {
      navigate(nextStep.route);
    }
  };

  const handleSkip = () => {
    closeTour();
  };

  const cardContent = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 rounded-full bg-primary/10 p-1.5 text-primary">
            <CircleHelp className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              {isLastStep ? "Last step" : `Step ${activeIndex + 1} of ${steps.length}`}
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
          {currentStep.actionLabel ?? (isLastStep ? "Finish" : "Next")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </>
  );

  // Centered card (no anchor target on this page).
  if (!targetRect) {
    return (
      <div className="fixed inset-0 z-[130] flex items-center justify-center bg-foreground/10 p-4 backdrop-blur-[1px]">
        <div className="pointer-events-auto w-full max-w-sm rounded-[14px] border border-primary/20 bg-background/95 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_40px_rgba(15,23,42,0.22)] backdrop-blur transition-all duration-300 ease-out animate-in fade-in-0 zoom-in-95">
          {cardContent}
        </div>
      </div>
    );
  }

  // Anchored tooltip next to the highlighted element.
  const tooltipWidth = 300;
  const tooltipHeight = 180;
  const margin = 12;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const topPosition = targetRect.top + window.scrollY;
  const leftPosition = targetRect.left + window.scrollX;

  const prefersBelow =
    topPosition + targetRect.height + tooltipHeight + margin <
    viewportHeight + window.scrollY;
  const tooltipTop = prefersBelow
    ? topPosition + targetRect.height + 10
    : Math.max(window.scrollY + margin, topPosition - tooltipHeight - 10);

  const tooltipLeft = Math.max(
    window.scrollX + margin,
    Math.min(
      window.scrollX + viewportWidth - tooltipWidth - margin,
      leftPosition + targetRect.width / 2 - tooltipWidth / 2,
    ),
  );

  return (
    <div className="fixed inset-0 z-[130] pointer-events-none">
      <div className="pointer-events-none absolute inset-0" />
      <div
        className="pointer-events-auto absolute rounded-[14px] border border-primary/20 bg-background/95 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_40px_rgba(15,23,42,0.22)] backdrop-blur transition-all duration-300 ease-out animate-in fade-in-0 zoom-in-95"
        style={{
          top: tooltipTop,
          left: tooltipLeft,
          width: tooltipWidth,
          maxWidth: viewportWidth - 24,
        }}
      >
        {cardContent}
      </div>
    </div>
  );
}
