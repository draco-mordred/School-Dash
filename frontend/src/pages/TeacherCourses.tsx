import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, BookOpen, Search as SearchIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";








interface Course {
  _id: string;
  name: string;
  code: string;
  courseID: string;
  unit?: { _id: string; name: string };
  semester?: string;
  department?: {
    _id: string;
    name?: string;
    code?: string;
    head?: { _id: string; name?: string };
  };
  subjects?: Subject[];
}

interface Subject {
  _id: string;
  name: string;
  code: string;
}

interface Class {
  _id: string;
  name: string;
}

interface TimetablePeriod {
  subject: { _id: string; name?: string; code?: string } | string | null;
  lecturer?: { _id: string; name?: string } | null;
  startTime: string;
  endTime: string;
  displayLabel?: string | null;
}




interface TimetableSchedule {
  day: string;
  periods: TimetablePeriod[];
}

export default function TeacherCourses() {
  const [courseEditDialogOpen, setCourseEditDialogOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
  const [addSubjectDialogOpen, setAddSubjectDialogOpen] = useState(false);
  const [courseToAddSubject, setCourseToAddSubject] = useState<Course | null>(null);
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [classSchedule, setClassSchedule] = useState<TimetableSchedule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "subjects-high" | "subjects-low">("name-asc");

  // Hover and expand animations
  const [hoveredCourseId, setHoveredCourseId] = useState<string | null>(null);
  const [pulsingCourseId, setPulsingCourseId] = useState<string | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [showExpandedActions, setShowExpandedActions] = useState(false);
  const [subjectsPanelCourseId, setSubjectsPanelCourseId] = useState<string | null>(null);
  const [subjectsPanelVisible, setSubjectsPanelVisible] = useState(false);
  const [subjectsPanelPosition, setSubjectsPanelPosition] = useState<{ left: number; top: number; height: number } | null>(null);
  const hoverTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const cardTransforms = useRef<Record<string, { dx: number; dy: number; scale: number; anchorX: number; anchorY: number }>>({});
  const pointerRef = useRef<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    return () => {
      Object.values(hoverTimeoutRef.current).forEach((timeout) => clearTimeout(timeout));
      hoverTimeoutRef.current = {};
    };
  }, []);

    useEffect(() => {
      if (!subjectsPanelCourseId || !expandedCourseId) {
        setSubjectsPanelPosition(null);
        return;
      }
  
      const updatePanelPosition = () => {
        const el = cardRefs.current[subjectsPanelCourseId];
        if (!el) {
          return;
        }
  
        const rect = el.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const panelWidth = Math.min(viewportWidth * 0.3, 320);
        const left = Math.min(rect.right + 24, viewportWidth - panelWidth - 24);
        setSubjectsPanelPosition({ left, top: rect.top, height: rect.height });
      };
  
      updatePanelPosition();
      window.addEventListener("resize", updatePanelPosition);
      window.addEventListener("scroll", updatePanelPosition, true);
  
      return () => {
        window.removeEventListener("resize", updatePanelPosition);
        window.removeEventListener("scroll", updatePanelPosition, true);
      };
    }, [subjectsPanelCourseId, expandedCourseId, subjectsPanelVisible]);

  // Fetch classes for this unit resident
  useEffect(() => {
    const fetchUnitResidentClasses = async () => {
      try {
        setLoadingClasses(true);
        if (!user?._id) {
          setError("User not authenticated");
          return;
        }

        // Fetch all classes - can be expanded based on how backend links unit residents to classes
        const response = await api.get("/classes");
        const allClasses = Array.isArray(response.data.classes) ? response.data.classes : [];
        
        setClasses(allClasses);
        if (allClasses.length > 0) {
          setSelectedClassId(allClasses[0]._id);
        }
      } catch (err: unknown) {
        console.error("Failed to fetch classes:", err);
        setError("Failed to load classes");
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchUnitResidentClasses();
  }, [user?._id]);

  // Fetch courses for selected class
  useEffect(() => {
    const fetchCoursesForClass = async () => {
      if (!selectedClassId) return;

      try {
        setLoadingCourses(true);
        setError(null);
        setSelectedCourse(null);
        setSubjects([]);

        const [courseResponse, timetableResponse] = await Promise.allSettled([
          api.get(`/courses?class=${selectedClassId}&topLevel=true`),
          api.get(`/timetables/${selectedClassId}`),
        ]);

        if (courseResponse.status === "fulfilled") {
          setCourses(Array.isArray(courseResponse.value.data.courses) ? courseResponse.value.data.courses : []);
        } else {
          console.error("Failed to fetch courses:", courseResponse.reason);
          setCourses([]);
        }

        if (timetableResponse.status === "fulfilled") {
          setClassSchedule(Array.isArray(timetableResponse.value.data.schedule) ? timetableResponse.value.data.schedule : []);
        } else {
          console.warn("Unable to load class timetable:", timetableResponse.reason);
          setClassSchedule([]);
        }
      } catch (err: unknown) {
        console.error("Failed to fetch courses or timetable:", err);
        setCourses([]);
        setClassSchedule([]);
      } finally {
        setLoadingCourses(false);
        setLoadingSchedule(false);
      }
    };

    fetchCoursesForClass();
  }, [selectedClassId]);

  const getCourseSchedule = (courseId: string) => {
    return classSchedule.flatMap((schedule) =>
      (schedule.periods ?? [])
        .filter((period) => {
          const subjectId =
            typeof period.subject === "string"
              ? period.subject
              : period.subject?._id;
          return String(subjectId) === courseId;
        })
        .map((period) => ({
          ...period,
          day: schedule.day,
        }))
    );
  };

  const filteredAndSortedCourses = courses
    .filter((course) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        course.name.toLowerCase().includes(query) ||
        course.code.toLowerCase().includes(query) ||
        course.courseID.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "subjects-high":
          return (b.subjects?.length ?? 0) - (a.subjects?.length ?? 0);
        case "subjects-low":
          return (a.subjects?.length ?? 0) - (b.subjects?.length ?? 0);
        default:
          return 0;
      }
    });

  const clearCourseHoverTimers = () => {
    Object.values(hoverTimeoutRef.current).forEach((timeout) => clearTimeout(timeout));
    hoverTimeoutRef.current = {};
  };

  const updateCardPointer = (courseId: string, pageX: number, pageY: number) => {
    pointerRef.current[courseId] = { x: pageX, y: pageY };
  };

  const handleCourseHover = (courseId: string, pageX?: number, pageY?: number) => {
    clearCourseHoverTimers();
    setHoveredCourseId(courseId);
    setExpandedCourseId(null);
    setPulsingCourseId(null);
    setShowExpandedActions(false);
    setSubjectsPanelVisible(false);
    setSubjectsPanelCourseId(null);

    if (typeof pageX === "number" && typeof pageY === "number") {
      pointerRef.current[courseId] = { x: pageX, y: pageY };
    }

    const pulseTimer = window.setTimeout(() => {
      setPulsingCourseId(courseId);
    }, 900);
    hoverTimeoutRef.current[`${courseId}-pulse`] = pulseTimer;

    // Expand after two pulses (pulse animation is 1.5s, started at 900ms)
    const expandTimer = window.setTimeout(() => {
      setPulsingCourseId(null);
      startExpand(courseId);
    }, 3900);
    hoverTimeoutRef.current[`${courseId}-expand`] = expandTimer;
  };

  const handleCourseHoverEnd = () => {
    clearCourseHoverTimers();
    setHoveredCourseId(null);
    setPulsingCourseId(null);

    if (subjectsPanelCourseId) {
      setSubjectsPanelVisible(false);
      window.setTimeout(() => {
        setSubjectsPanelCourseId(null);
        setShowExpandedActions(false);
        startCollapse();
      }, 260);
      return;
    }

    setShowExpandedActions(false);
    startCollapse();
  };

  // Start expand animation by measuring the card and animating it to right-side center
  const startExpand = (courseId: string) => {
    const el = cardRefs.current[courseId];
    if (!el) {
      setExpandedCourseId(courseId);
      return;
    }

    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const baseTargetWidth = vw < 768 ? Math.min(vw * 0.92, 560) : Math.min(vw * 0.42, 640);
    const targetWidth = Math.max(rect.width * 1.16, baseTargetWidth);
    const pointer = pointerRef.current[courseId];
    // Use page coordinates if available, otherwise fall back to viewport center of card
    const pointerX = pointer ? pointer.x : window.scrollX + rect.left + rect.width / 2;
    const pointerY = pointer ? pointer.y : window.scrollY + rect.top + rect.height / 2;
    const scale = targetWidth / rect.width;
    const expandedHeight = rect.height * scale;
    const minLeft = vw - targetWidth - 32;
    
    // Position card so pointer ends up in center of expanded card, but keep on right side
    // Convert to viewport coordinates since we're using getBoundingClientRect
    let targetLeft = pointerX - window.scrollX - targetWidth / 2;
    let targetTop = pointerY - window.scrollY - expandedHeight / 2;
    
    // Clamp to keep card on the right side and within viewport
    targetLeft = Math.max(minLeft, Math.min(targetLeft, vw - 32));
    targetTop = Math.max(32, Math.min(targetTop, vh - expandedHeight - 32));
    
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
      setExpandedCourseId(courseId);
      setShowExpandedActions(true);
    };
  };

  // Animate collapse back to original position and clean up
const startCollapse = (courseId?: string) => {

    const id = courseId ?? expandedCourseId;
    if (!id) {
      setExpandedCourseId(null);
      return;
    }
    const el = cardRefs.current[id];
    if (!el) {
      setExpandedCourseId(null);
      return;
    }

    // Smoothly animate back to original position using Web Animations API
    const transform = cardTransforms.current[id];
    if (!transform) {
      // fallback: just clear
      el.style.transition = "transform 300ms ease";
      el.style.transform = `translate(0px, 0px) scale(1)`;
      el.style.boxShadow = "";
      setTimeout(() => setExpandedCourseId(null), 320);
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
      setExpandedCourseId(null);
      setShowExpandedActions(false);
      setSubjectsPanelVisible(false);
      setSubjectsPanelCourseId(null);
    };
  };

  const applyExpandedCardTransform = (courseId: string, offsetX: number) => {
    const el = cardRefs.current[courseId];
    if (!el) {
      return;
    }

    const transform = cardTransforms.current[courseId];
    if (!transform) {
      return;
    }

    const { dx, dy, scale } = transform;
    el.style.transition = "transform 360ms cubic-bezier(0.22, 1, 0.36, 1)";
    el.style.transform = `translate(${dx + offsetX}px, ${dy}px) scale(${scale})`;
  };

  const handleViewSubjects = async (course: Course) => {
    setSelectedCourse(course);
    setLoadingSubjects(true);
    setError(null);

    try {
      if (Array.isArray(course.subjects) && course.subjects.length > 0) {
        setSubjects(course.subjects);
      } else {
        const { data } = await api.get(`/courses/${course._id}`);
        setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
      }

      setSubjectsPanelVisible(false);
      setSubjectsPanelCourseId(course._id);
      requestAnimationFrame(() => {
        setSubjectsPanelVisible(true);
        if (expandedCourseId === course._id) {
          applyExpandedCardTransform(course._id, -96);
        }
      });
    } catch (err: unknown) {
      console.error("Failed to fetch subjects:", err);
      toast.error("Failed to load subjects for this course");
      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const closeSubjectsPanel = () => {
    if (expandedCourseId) {
      applyExpandedCardTransform(expandedCourseId, 0);
    }
    window.setTimeout(() => {
      setSubjectsPanelCourseId(null);
    }, 260);
  };

  const [courseEditForm, setCourseEditForm] = useState({
    name: "",
    code: "",
    courseID: "",
    semester: "",
    year: "",
    unit: "",
    department: "",
    isActive: true,
  });

  useEffect(() => {
      if (!courseToEdit) return;
    setCourseEditForm({
      name: courseToEdit.name ?? "",
      code: courseToEdit.code ?? "",
      courseID: courseToEdit.courseID ?? "",
      semester: courseToEdit.semester ?? "",
      year: (courseToEdit as any).year ?? "",
      unit: (courseToEdit as any).unit?._id ?? "",
      department: courseToEdit.department?._id ?? "",
      isActive: (courseToEdit as any).isActive ?? true,
    });
  }, [courseToEdit]);

  const submitCourseEdit = async () => {
    if (!courseToEdit) return;
    try {
      await api.patch(`/courses/update/${courseToEdit._id}`, {
        name: courseEditForm.name,
        code: courseEditForm.code,
        courseID: courseEditForm.courseID,
        semester: courseEditForm.semester || null,
        year: courseEditForm.year || null,
        department: courseEditForm.department || null,
        unit: courseEditForm.unit || null,
        isActive: courseEditForm.isActive,
      });

      toast.success("Course updated");
      // refresh courses list for selected class
      if (selectedClassId) {
        const [courseResponse, timetableResponse] = await Promise.allSettled([
          api.get(`/courses?class=${selectedClassId}&topLevel=true`),
          api.get(`/timetables/${selectedClassId}`),
        ]);
        if (courseResponse.status === "fulfilled") {
          setCourses(Array.isArray(courseResponse.value.data.courses) ? courseResponse.value.data.courses : []);
        }
        if (timetableResponse.status === "fulfilled") {
          setClassSchedule(Array.isArray(timetableResponse.value.data.schedule) ? timetableResponse.value.data.schedule : []);
        }
      }

      setCourseEditDialogOpen(false);
      setCourseToEdit(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message ?? "Failed to update course");
    }
  };

  const [addSubjectForm, setAddSubjectForm] = useState({
    subjectID: "",
    name: "",
    code: "",
    lecturer: "",
    isActive: true,
    students: "",
  });

  useEffect(() => {
    if (!courseToAddSubject) return;
    setAddSubjectForm({
      subjectID: "",
      name: "",
      code: "",
      lecturer: "",
      isActive: true,
      students: "",
    });
  }, [courseToAddSubject]);

  const submitAddSubject = async () => {
    if (!courseToAddSubject) return;
    try {
      const lecturerIds: string[] = [];
      const studentIds: string[] = [];


      await api.post(`/courses/${courseToAddSubject._id}/subjects`, {
        subject: {
          subjectID: addSubjectForm.subjectID,
          name: addSubjectForm.name,
          code: addSubjectForm.code || null,
          lecturer: lecturerIds,
          students: studentIds,
          isActive: addSubjectForm.isActive,
        },
      });

      toast.success("Subject added to course");

      // refresh courses + subjects panel if open
      if (selectedClassId) {
        const [courseResponse, timetableResponse] = await Promise.allSettled([
          api.get(`/courses?class=${selectedClassId}&topLevel=true`),
          api.get(`/timetables/${selectedClassId}`),
        ]);
        if (courseResponse.status === "fulfilled") {
          setCourses(Array.isArray(courseResponse.value.data.courses) ? courseResponse.value.data.courses : []);
        }
        if (timetableResponse.status === "fulfilled") {
          setClassSchedule(Array.isArray(timetableResponse.value.data.schedule) ? timetableResponse.value.data.schedule : []);
        }
      }

      if (subjectsPanelCourseId === courseToAddSubject._id) {
        const { data } = await api.get(`/courses/${courseToAddSubject._id}`);
        setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
      }

      setAddSubjectDialogOpen(false);
      setCourseToAddSubject(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message ?? "Failed to add subject");
    }
  };

  if (!user || user.role !== "teacher" && user.role !== "admin") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <div className="rounded-3xl border border-border bg-muted p-10 shadow-sm">
          <h1 className="text-2xl font-semibold">Teacher Courses</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This page is for Teachers and Admins only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <Dialog
        open={courseEditDialogOpen}
        onOpenChange={(open) => {
          setCourseEditDialogOpen(open);
          if (!open) {
            setCourseToEdit(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Course Profile</DialogTitle>
            <DialogDescription>Update course metadata for this course.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <Input
              placeholder="Name"
              value={(courseEditForm?.name ?? "") as string}
              onChange={(e) =>
                setCourseEditForm((p) => ({ ...p, name: e.target.value }))
              }
            />
            <Input
              placeholder="Code"
              value={(courseEditForm?.code ?? "") as string}
              onChange={(e) =>
                setCourseEditForm((p) => ({ ...p, code: e.target.value }))
              }
            />
            <Input
              placeholder="Course ID"
              value={(courseEditForm?.courseID ?? "") as string}
              onChange={(e) =>
                setCourseEditForm((p) => ({ ...p, courseID: e.target.value }))
              }
            />
            <Input
              placeholder="Semester"
              value={(courseEditForm?.semester ?? "") as string}
              onChange={(e) =>
                setCourseEditForm((p) => ({ ...p, semester: e.target.value }))
              }
            />
            <Input
              placeholder="Year"
              value={(courseEditForm?.year ?? "") as string}
              onChange={(e) =>
                setCourseEditForm((p) => ({ ...p, year: e.target.value }))
              }
            />
            <Input
              placeholder="Unit (ObjectId)"
              value={(courseEditForm?.unit ?? "") as string}
              onChange={(e) =>
                setCourseEditForm((p) => ({ ...p, unit: e.target.value }))
              }
            />
            <Input
              placeholder="Department (ObjectId)"
              value={(courseEditForm?.department ?? "") as string}
              onChange={(e) =>
                setCourseEditForm((p) => ({ ...p, department: e.target.value }))
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCourseEditDialogOpen(false);
                setCourseToEdit(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                void submitCourseEdit();
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addSubjectDialogOpen}
        onOpenChange={(open) => {
          setAddSubjectDialogOpen(open);
          if (!open) {
            setCourseToAddSubject(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add Subject To Course</DialogTitle>
            <DialogDescription>Add an embedded subject to the selected course.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            {/* NOTE: This modal UI will be updated to dropdown-based selection.
                Current patch keeps structure intact to avoid breaking build.
                Future update will: 
                - list eligible subjects by department code
                - lecturer dropdown scoped to subject department
                - confirm class availability (no student selection) */}
            <Input
              placeholder="Subject selection coming via dropdown"
              value={addSubjectForm.subjectID}
              onChange={(e) =>
                setAddSubjectForm((p) => ({ ...p, subjectID: e.target.value }))
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddSubjectDialogOpen(false);
                setCourseToAddSubject(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                void submitAddSubject();
              }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6 p-6">
      {/* Header with Class Selection */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">
            Select Class
          </p>
        </div>

        {loadingClasses ? (
          <Skeleton className="h-10 w-48" />
        ) : error ? (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Select value={selectedClassId || ""} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Choose a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls._id} value={cls._id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClassId && (
              <div>
                <p className="text-sm text-muted-foreground">
                  Courses and subjects available for{" "}
                  <span className="font-semibold text-foreground">
                    {classes.find((c) => c._id === selectedClassId)?.name}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search courses by name, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="w-full md:w-48">
          <Select value={sortBy} onValueChange={(value: string) => setSortBy(value as typeof sortBy)}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name (A to Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z to A)</SelectItem>
              <SelectItem value="subjects-high">Most Subjects</SelectItem>
              <SelectItem value="subjects-low">Least Subjects</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Courses Grid */}
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loadingCourses ? (
          <>
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </>
        ) : filteredAndSortedCourses.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                {courses.length === 0
                  ? "No courses assigned to your class yet."
                  : "No courses match your search criteria."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Backdrop for expanded card */}
            {expandedCourseId && (
              <div
                className="fixed inset-0 z-40 bg-black/30 transition-opacity duration-300"
                onClick={() => {
                  handleCourseHoverEnd();
                }}
              />
            )}
            {subjectsPanelCourseId && expandedCourseId === subjectsPanelCourseId && subjectsPanelPosition && (
              <div
                className={`fixed z-[60] w-[min(320px,30vw)] rounded-2xl border border-primary/40 bg-background/95 p-4 shadow-2xl backdrop-blur transition-all duration-400 ${subjectsPanelVisible ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"}`}
                style={{ left: `${subjectsPanelPosition.left}px`, top: `${subjectsPanelPosition.top}px`, maxHeight: `min(70vh, ${subjectsPanelPosition.height}px)` }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{selectedCourse?.name ?? "Course subjects"}</p>
                    <p className="text-xs text-muted-foreground">{selectedCourse?.code}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); closeSubjectsPanel(); }}>
                    Close
                  </Button>
                </div>
                <div className="space-y-2 overflow-y-auto pr-1">
                  {loadingSubjects ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 rounded" />
                      <Skeleton className="h-10 rounded" />
                    </div>
                  ) : subjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No subjects assigned to this course.</p>
                  ) : (
                    subjects.map((subject) => (
                      <div key={subject._id} className="rounded-lg border border-border bg-muted/50 p-3">
                        <p className="font-medium">{subject.name}</p>
                        <p className="text-xs text-muted-foreground">{subject.code}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            <div className="contents">
              {filteredAndSortedCourses.map((course) => {
                const isHovered = hoveredCourseId === course._id;
                const isPulsing = pulsingCourseId === course._id;
                const isExpanded = expandedCourseId === course._id;

                return (
            <Card
              key={course._id}
              className={`cursor-pointer transition-all duration-700 ease-out will-change-transform ${
                isExpanded
                  ? "z-50 w-[40vw] max-w-[640px] overflow-y-auto border-primary/50 bg-background shadow-2xl"
                  : `hover:shadow-xl ${isHovered && !isExpanded && isPulsing ? "animate-card-pop" : ""} ${
                      selectedCourse?._id === course._id ? "ring-2 ring-primary" : ""
                    }`
              }`}
              data-course-id={course._id}
              ref={(el) => {
                cardRefs.current[course._id] = el;
              }}
              onMouseEnter={(event) => handleCourseHover(course._id, event.pageX, event.pageY)}
              onMouseMove={(event) => updateCardPointer(course._id, event.pageX, event.pageY)}
              onMouseLeave={() => handleCourseHoverEnd()}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="line-clamp-2">{course.name}</CardTitle>
                    <CardDescription className="mt-1">{course.code}</CardDescription>
                  </div>
                  {selectedCourse?._id === course._id && (
                    <ChevronRight className="h-5 w-5 text-primary" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {course.courseID && (
                  <Badge variant="outline">{course.courseID}</Badge>
                )}
                {course.unit && (
                  <div className="text-xs text-muted-foreground">
                    <p className="font-semibold">Unit: {course.unit.name}</p>
                  </div>
                )}
                {course.department?.name && (
                  <div className="text-xs text-muted-foreground">
                    <p className="font-semibold">Department</p>
                    <p>{course.department.name}</p>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  <p className="font-semibold">Assigned HOD</p>
                  <p>{course.department?.head?.name ?? "Not assigned"}</p>
                </div>
                {course.semester && (
                  <Badge variant="secondary">Semester {course.semester}</Badge>
                )}
                <div className="space-y-1 pt-2 text-sm text-muted-foreground">
                  {loadingSchedule ? (
                    <p>Loading timetable...</p>
                  ) : (
                    (() => {
                      const scheduleItems = getCourseSchedule(course._id);
                      return scheduleItems.length > 0 ? (
                        <div className="space-y-1">
                          {scheduleItems.slice(0, 2).map((period, index) => (
                            <div key={`${period.day}-${period.startTime}-${index}`} className="rounded-md bg-muted/50 p-2 text-xs">
                              <p className="font-semibold">{period.day}</p>
                              <p>
                                {period.startTime} - {period.endTime}
                                {period.displayLabel ? ` • ${period.displayLabel}` : ""}
                              </p>
                              {period.lecturer?.name && (
                                <p>{period.lecturer.name}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No timetable sessions found for this course.</p>
                      );
                    })()
                  )}
                </div>
        <div className="mt-2 grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    className={`w-full transition-all duration-300 ${isExpanded && showExpandedActions ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleViewSubjects(course);
                    }}
                  >
                    View Subjects
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>

                  <Button
                    variant="secondary"
                    className={`w-full transition-all duration-300 ${isExpanded && showExpandedActions ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCourseEditDialogOpen(true);
                      setCourseToEdit(course);
                    }}
                  >
                    Edit Course Profile
                  </Button>

                  <Button
                    variant="outline"
                    className={`w-full transition-all duration-300 ${isExpanded && showExpandedActions ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddSubjectDialogOpen(true);
                      setCourseToAddSubject(course);
                    }}
                  >
                    Add Subject
                  </Button>

                  <Button
                    variant="destructive"
                    className={`w-full transition-all duration-300 ${isExpanded && showExpandedActions ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!selectedClassId) return;
                      const ok = window.confirm("Remove this course from the selected class?");
                      if (!ok) return;
                      void (async () => {
                        try {
                          await api.delete(`/classes/${selectedClassId}/courses/${course._id}`);
                          // refresh
                          if (selectedClassId) {
                            const [courseResponse, timetableResponse] = await Promise.allSettled([
                              api.get(`/courses?class=${selectedClassId}&topLevel=true`),
                              api.get(`/timetables/${selectedClassId}`),
                            ]);
                            if (courseResponse.status === "fulfilled") {
                              setCourses(Array.isArray(courseResponse.value.data.courses) ? courseResponse.value.data.courses : []);
                            }
                            if (timetableResponse.status === "fulfilled") {
                              setClassSchedule(Array.isArray(timetableResponse.value.data.schedule) ? timetableResponse.value.data.schedule : []);
                            }
                          }
                          toast.success("Course removed from class");
                        } catch (err: unknown) {
                          console.error(err);
                          toast.error("Failed to remove course from class");
                        }
                      })();
                    }}
                  >
                    Remove from Class
                  </Button>
                    </div>
              </CardContent>
            </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
      <div />
    </div>
    </div>
  );
}

