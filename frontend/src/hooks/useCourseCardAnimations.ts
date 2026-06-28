import { useRef, useState, useCallback } from "react";
import { calculateExpandedCardPosition } from "@/lib/courseCardPositioning";

export interface CourseCardAnimationState {
  hoveredCourseId: string | null;
  pulsingCourseId: string | null;
  expandedCourseId: string | null;
  showExpandedActions: boolean;
  subjectsPanelCourseId: string | null;
  subjectsPanelVisible: boolean;
  subjectsPanelPosition: { left: number; top: number; height: number } | null;
}

export interface CourseCardTransform {
  dx: number;
  dy: number;
  scale: number;
  anchorX: number;
  anchorY: number;
}

/**
 * Hook that manages all course card animation states and logic
 * Handles hover effects, pulsing, expansion, and subjects panel
 */
export const useCourseCardAnimations = () => {
  const [animationState, setAnimationState] = useState<CourseCardAnimationState>({
    hoveredCourseId: null,
    pulsingCourseId: null,
    expandedCourseId: null,
    showExpandedActions: false,
    subjectsPanelCourseId: null,
    subjectsPanelVisible: false,
    subjectsPanelPosition: null,
  });

  const hoverTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const cardTransforms = useRef<Record<string, CourseCardTransform>>({});
  const pointerRef = useRef<Record<string, { x: number; y: number }>>({});

  const updateAnimationState = useCallback((updates: Partial<CourseCardAnimationState>) => {
    setAnimationState((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearCourseHoverTimers = useCallback(() => {
    Object.values(hoverTimeoutRef.current).forEach((timeout) => clearTimeout(timeout));
    hoverTimeoutRef.current = {};
  }, []);

  const updateCardPointer = useCallback((courseId: string, pageX: number, pageY: number) => {
    pointerRef.current[courseId] = { x: pageX, y: pageY };
  }, []);

  const handleCourseHover = useCallback(
    (courseId: string, pageX?: number, pageY?: number) => {
      clearCourseHoverTimers();
      updateAnimationState({
        hoveredCourseId: courseId,
        expandedCourseId: null,
        pulsingCourseId: null,
        showExpandedActions: false,
        subjectsPanelVisible: false,
        subjectsPanelCourseId: null,
      });

      if (typeof pageX === "number" && typeof pageY === "number") {
        pointerRef.current[courseId] = { x: pageX, y: pageY };
      }

      const pulseTimer = window.setTimeout(() => {
        setAnimationState((prev) => ({ ...prev, pulsingCourseId: courseId }));
      }, 900);
      hoverTimeoutRef.current[`${courseId}-pulse`] = pulseTimer;

      // Expand after two pulses (pulse animation is 1.5s, started at 900ms)
      const expandTimer = window.setTimeout(() => {
        setAnimationState((prev) => ({ ...prev, pulsingCourseId: null }));
        startExpand(courseId);
      }, 3900);
      hoverTimeoutRef.current[`${courseId}-expand`] = expandTimer;
    },
    [clearCourseHoverTimers, updateAnimationState]
  );

  const startExpand = useCallback((courseId: string) => {
    const el = cardRefs.current[courseId];
    if (!el) {
      updateAnimationState({ expandedCourseId: courseId });
      return;
    }

    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const appMain = document.getElementById("app-main");
    const appMainRect = appMain?.getBoundingClientRect();
    const containerRect = appMainRect
      ? {
          left: appMainRect.left,
          top: appMainRect.top,
          width: appMainRect.width,
          height: appMainRect.height,
        }
      : {
          left: 0,
          top: 0,
          width: vw,
          height: vh,
        };
    const baseTargetWidth = vw < 768 ? Math.min(vw * 0.92, 680) : Math.min(containerRect.width * 0.72, 760);
    const baseTargetHeight = vh < 768 ? Math.min(vh * 0.88, 720) : Math.min(containerRect.height * 0.84, 720);
    const targetWidth = Math.max(rect.width * 1.18, baseTargetWidth);
    const targetHeight = Math.max(rect.height * 1.18, baseTargetHeight);

    const pointer = pointerRef.current[courseId];
    // Use viewport coordinates for placement, while the card hover events provide document coordinates.
    const pointerX = pointer ? pointer.x - window.scrollX : rect.left + rect.width / 2;
    const pointerY = pointer ? pointer.y - window.scrollY : rect.top + rect.height / 2;

    const { left: targetLeft, top: targetTop, width: resolvedWidth, height: resolvedHeight } = calculateExpandedCardPosition({
      rect,
      pointer: { x: pointerX, y: pointerY },
      container: {
        left: containerRect.left + 16,
        top: containerRect.top + 16,
        width: Math.max(containerRect.width - 32, 280),
        height: Math.max(containerRect.height - 32, 280),
      },
      targetWidth,
      targetHeight,
    });

    const scale = resolvedWidth / rect.width;
    const expandedHeight = resolvedHeight;

    const dx = targetLeft - rect.left;
    const dy = targetTop - rect.top;

    // Fix the element in place at its current position so it doesn't jump
    el.style.position = "fixed";
    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.top}px`;
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
    el.style.margin = "0";
    el.style.zIndex = "50";
    el.style.transformOrigin = "center center";

    // store measured transform for collapse
    cardTransforms.current[courseId] = { dx, dy, scale, anchorX: targetWidth / 2, anchorY: expandedHeight / 2 };

    // Use Web Animations API to create an overshooting, smooth animation (Windows Store-like)
    el.style.transform = `translate(0px, 0px) scale(1)`;
    el.style.boxShadow = "0 24px 60px rgba(2,6,23,0.28)";

    const anim = el.animate(
      [
        { transform: `translate(0px, 0px) scale(1)` },
        { transform: `translate(${dx * 0.85}px, ${dy * 0.85}px) scale(${scale * 1.03})` },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
      ],
      {
        duration: 600,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      }
    );

    anim.onfinish = () => {
      // keep final state and mark expanded
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      updateAnimationState({ expandedCourseId: courseId, showExpandedActions: true });
    };
  }, [updateAnimationState]);

  const startCollapse = useCallback((courseId?: string) => {
    const id = courseId ?? animationState.expandedCourseId;
    if (!id) {
      updateAnimationState({ expandedCourseId: null });
      return;
    }

    const el = cardRefs.current[id];
    if (!el) {
      updateAnimationState({ expandedCourseId: null });
      return;
    }

    // Smoothly animate back to original position using Web Animations API
    const transform = cardTransforms.current[id];
    if (!transform) {
      // fallback: just clear
      el.style.transition = "transform 300ms ease";
      el.style.transform = `translate(0px, 0px) scale(1)`;
      el.style.boxShadow = "";
      setTimeout(() => updateAnimationState({ expandedCourseId: null }), 320);
      return;
    }

    const { dx, dy, scale } = transform;
    // animate from current (dx,dy,scale) to identity with a gentle ease
    const anim = el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
        { transform: `translate(${dx * 0.3}px, ${dy * 0.3}px) scale(${1.02})` },
        { transform: `translate(0px, 0px) scale(1)` },
      ],
      {
        duration: 500,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      }
    );

    el.style.boxShadow = "";

    anim.onfinish = () => {
      // cleanup
      el.style.transition = "";
      el.style.position = "";
      el.style.left = "";
      el.style.top = "";
      el.style.width = "";
      el.style.height = "";
      el.style.margin = "";
      el.style.zIndex = "";
      el.style.transformOrigin = "";
      updateAnimationState({
        expandedCourseId: null,
        showExpandedActions: false,
        subjectsPanelVisible: false,
        subjectsPanelCourseId: null,
      });
    };
  }, [animationState.expandedCourseId, updateAnimationState]);

  const handleCourseHoverEnd = useCallback(() => {
    clearCourseHoverTimers();
    setAnimationState((prev) => ({ ...prev, hoveredCourseId: null, pulsingCourseId: null }));

    if (animationState.subjectsPanelCourseId) {
      updateAnimationState({ subjectsPanelVisible: false });
      window.setTimeout(() => {
        updateAnimationState({ subjectsPanelCourseId: null, showExpandedActions: false });
        startCollapse();
      }, 260);
      return;
    }

    updateAnimationState({ showExpandedActions: false });
    startCollapse();
  }, [clearCourseHoverTimers, animationState.subjectsPanelCourseId, updateAnimationState, startCollapse]);

  const applyExpandedCardTransform = useCallback((courseId: string, offsetX: number) => {
    const el = cardRefs.current[courseId];
    if (!el) return;

    const transform = cardTransforms.current[courseId];
    if (!transform) return;

    const { dx, dy, scale } = transform;
    el.style.transition = "transform 360ms cubic-bezier(0.22, 1, 0.36, 1)";
    el.style.transform = `translate(${dx + offsetX}px, ${dy}px) scale(${scale})`;
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    Object.values(hoverTimeoutRef.current).forEach((timeout) => clearTimeout(timeout));
    hoverTimeoutRef.current = {};
  }, []);

  return {
    animationState,
    hoverTimeoutRef,
    cardRefs,
    cardTransforms,
    pointerRef,
    updateCardPointer,
    handleCourseHover,
    handleCourseHoverEnd,
    startExpand,
    startCollapse,
    applyExpandedCardTransform,
    updateAnimationState,
    clearCourseHoverTimers,
    cleanup,
  };
};
