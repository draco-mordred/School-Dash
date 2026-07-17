import { useEffect, useMemo, useState, useRef, type FormEvent, type MouseEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useInstitution } from "@/lib/useInstitution";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";

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
  academicYear?: { _id: string; name?: string } | null;
  department?: {
    _id: string;
    name?: string;
    code?: string;
    departmentID?: string;
    head?: { _id: string; name?: string };
  };
  lecturer?: Array<{ _id: string; name?: string; email?: string }>;
  subjects?: Subject[];
}

interface Subject {
  _id: string;
  name: string;
  code?: string;
  subjectID?: string;
  semester?: string;
}

interface SubjectOption {
  _id: string;
  name: string;
  code?: string;
  subjectID?: string;
  courseId?: string;
  courseName?: string;
  departmentId?: string;
}

interface Class {
  _id: string;
  name: string;
  academicYear?: { _id: string; name: string };
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
  const { institution } = useInstitution();
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
  const [createCourseDialogOpen, setCreateCourseDialogOpen] = useState(false);
  const [createCourseLoading, setCreateCourseLoading] = useState(false);
  const [createCourseError, setCreateCourseError] = useState<string | null>(null);
  const [createDepartments, setCreateDepartments] = useState<Array<{ _id: string; name: string; departmentID: string; code: string }>>([]);
  const [createUnits, setCreateUnits] = useState<Array<{ _id: string; name: string; unitID: string; department: string | { _id?: string } }>>([]);
  const [createAcademicYears, setCreateAcademicYears] = useState<{ _id: string; name: string }[]>([]);
  const [createCourseForm, setCreateCourseForm] = useState({
    name: "",
    code: "",
    courseID: "",
    semester: "First" as "First" | "Second",
    department: "",
    unit: "",
    academicYearId: "",
    isActive: true,
    assignToClass: false,
  });

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
  const subjectsPanelAnchorRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  const cardTransforms = useRef<Record<string, { dx: number; dy: number; scale: number; anchorX: number; anchorY: number }>>({});
  const pointerRef = useRef<Record<string, { x: number; y: number }>>({});

  const selectedClass = useMemo(
    () => classes.find((cls) => cls._id === selectedClassId) ?? null,
    [classes, selectedClassId]
  );

  const filteredUnits = useMemo(() => {
    if (!createCourseForm.department) return createUnits;
    return createUnits.filter((u) => {
      const deptId = typeof u.department === "object" ? u.department._id : u.department;
      return String(deptId) === String(createCourseForm.department);
    });
  }, [createUnits, createCourseForm.department]);

  useEffect(() => {
    const loadCourseMeta = async () => {
      try {
        const { data } = await api.get("/courses/meta");
        setCreateDepartments(Array.isArray(data.departments) ? data.departments : []);
        setCreateUnits(Array.isArray(data.units) ? data.units : []);
        setCreateAcademicYears(Array.isArray(data.academicYears) ? data.academicYears : []);
      } catch (error) {
        console.error("Failed to load course metadata", error);
      }
    };

    void loadCourseMeta();
  }, []);

  const canCreateCourse = ["admin", "teacher", "unitconsultant"].includes(user?.role ?? "");

  const handleOpenCreateCourse = (open: boolean) => {
    setCreateCourseDialogOpen(open);
    if (open) {
      setCreateCourseForm((prev) => ({
        ...prev,
        assignToClass: Boolean(selectedClassId),
      }));
      setCreateCourseError(null);
    }
  };

  const handleCreateCourseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateCourseError(null);
    setCreateCourseLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: createCourseForm.name.trim(),
        code: createCourseForm.code.trim(),
        courseID: createCourseForm.courseID.trim(),
        department: createCourseForm.department,
        semester: createCourseForm.semester,
        academicYearId: createCourseForm.academicYearId,
        isActive: createCourseForm.isActive,
      };

      if (createCourseForm.unit) {
        payload.unit = createCourseForm.unit;
      }

      if (selectedClassId) {
        payload.studentClasses = [selectedClassId];
      }

      await api.post("/courses", payload);
      toast.success("Course created successfully");
      setCreateCourseDialogOpen(false);
      setCreateCourseForm({
        name: "",
        code: "",
        courseID: "",
        semester: "First",
        department: "",
        unit: "",
        academicYearId: "",
        isActive: true,
        assignToClass: Boolean(selectedClassId),
      });
      if (selectedClassId) {
        const { data } = await api.get(`/courses?class=${selectedClassId}&topLevel=true`);
        setCourses(Array.isArray(data.courses) ? data.courses : []);
      }
    } catch (error: unknown) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } } };
      setCreateCourseError(err.response?.data?.message ?? "Failed to create course");
    } finally {
      setCreateCourseLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      Object.values(hoverTimeoutRef.current).forEach((timeout) => clearTimeout(timeout));
      hoverTimeoutRef.current = {};
    };
  }, []);

    useEffect(() => {
      if (!subjectsPanelCourseId || !expandedCourseId) {
        const timeoutId = window.setTimeout(() => {
          setSubjectsPanelPosition(null);
        }, 0);
        return () => window.clearTimeout(timeoutId);
      }
  
      const updatePanelPosition = () => {
          const anchor = subjectsPanelAnchorRef.current;
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const panelWidth = Math.min(viewportWidth * 0.36, 420);
          const panelHeight = Math.min(viewportHeight * 0.8, 720);
          const fallbackEl = cardRefs.current[subjectsPanelCourseId];
          const rect = fallbackEl?.getBoundingClientRect();

          // Estimate content height based on subjects count so the panel grows to fit items when possible
          const itemHeight = 64; // estimate per-subject item height
          const headerHeight = 92; // space for header and controls
          const contentDesired = Math.min(panelHeight, (subjects.length || 0) * itemHeight + headerHeight);

          if (anchor) {
            const left = Math.min(anchor.left + anchor.width + 16, viewportWidth - panelWidth - 16);
            const top = Math.max(16, Math.min(anchor.top, viewportHeight - panelHeight - 16));
            setSubjectsPanelPosition({ left, top, height: Math.min(Math.max(anchor.height + 24, contentDesired), panelHeight) });
            return;
          }

          if (!rect) {
            return;
          }

          const left = Math.min(rect.right + 24, viewportWidth - panelWidth - 24);
          setSubjectsPanelPosition({ left, top: rect.top, height: Math.min(Math.max(rect.height, contentDesired), panelHeight) });
        };
  
      updatePanelPosition();
      window.addEventListener("resize", updatePanelPosition);
      window.addEventListener("scroll", updatePanelPosition, true);
  
      return () => {
        window.removeEventListener("resize", updatePanelPosition);
        window.removeEventListener("scroll", updatePanelPosition, true);
      };
    }, [subjectsPanelCourseId, expandedCourseId, subjectsPanelVisible, subjects]);

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
      } catch (error: unknown) {
        console.error(error);
        const err = error as { response?: { data?: { message?: string } } };
        setCreateCourseError(err.response?.data?.message ?? "Failed to create course");
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
    }, 300);
    hoverTimeoutRef.current[`${courseId}-pulse`] = pulseTimer;

    // Expand shortly after pulse
    const expandTimer = window.setTimeout(() => {
      setPulsingCourseId(null);
      startExpand(courseId);
    }, 1200);
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

  // Start expand animation by measuring the card and animating it around the cursor
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
    const targetWidth = Math.max(rect.width * 1.08, baseTargetWidth);
    const pointer = pointerRef.current[courseId];
    const pointerX = pointer ? pointer.x : rect.left + rect.width / 2;
    const pointerY = pointer ? pointer.y : rect.top + rect.height / 2;
    const scale = targetWidth / rect.width;
    const expandedHeight = Math.min(vh - 32, rect.height * 1.08 + 120);
    const maxLeft = Math.max(16, vw - targetWidth - 16);
    const targetLeft = Math.min(Math.max(16, pointerX - rect.width * 0.3), maxLeft);
    const targetTop = Math.min(Math.max(16, pointerY - rect.height * 0.3), Math.max(16, vh - expandedHeight - 16));
    const dx = targetLeft - rect.left;
    const dy = targetTop - rect.top;
    const originX = Math.min(Math.max(pointerX - rect.left, 24), rect.width - 24);
    const originY = Math.min(Math.max(pointerY - rect.top, 24), rect.height - 24);

    // Fix the element in place at its current position so it doesn't jump
    el.style.position = "fixed";
    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.top}px`;
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
    el.style.margin = "0";
    el.style.zIndex = "50";
    el.style.transformOrigin = `${originX}px ${originY}px`;
    // store measured transform for collapse
    cardTransforms.current[courseId] = { dx, dy, scale, anchorX: targetWidth / 2, anchorY: expandedHeight / 2 };

    // Use Web Animations API to create an overshooting, smooth animation (Windows Store-like)
    el.style.transform = `translate(0px, 0px) scale(1)`;
    el.style.boxShadow = "0 24px 60px rgba(2,6,23,0.28)";

    const anim = el.animate(
      [
        { transform: `translate(0px, 0px) scale(1)` },
        { transform: `translate(${dx * 0.6}px, ${dy * 0.55}px) scale(${scale * 1.01})` },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
      ],
      {
        duration: 340,
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
      el.style.transition = "transform 200ms ease";
      el.style.transform = `translate(0px, 0px) scale(1)`;
      el.style.boxShadow = "";
      setTimeout(() => setExpandedCourseId(null), 220);
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
        duration: 300,
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
    el.style.transition = "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)";
    el.style.transform = `translate(${dx + offsetX}px, ${dy}px) scale(${scale})`;
  };

  const handleViewSubjects = async (course: Course, event?: MouseEvent<HTMLButtonElement>) => {
    setSelectedCourse(course);
    setLoadingSubjects(true);
    setError(null);

    if (event?.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      subjectsPanelAnchorRef.current = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    } else {
      subjectsPanelAnchorRef.current = null;
    }

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
    subjectsPanelAnchorRef.current = null;
    window.setTimeout(() => {
      setSubjectsPanelCourseId(null);
    }, 260);
  };

  const [courseEditForm, setCourseEditForm] = useState({
    name: "",
    code: "",
    semester: "",
    academicYear: "",
    departmentCode: "",
    departmentName: "",
    className: "",
    hodId: "",
    selectedSubjectIds: [] as string[],
  });
  const [courseSubjectOptions, setCourseSubjectOptions] = useState<SubjectOption[]>([]);
  const [departmentTeachers, setDepartmentTeachers] = useState<Array<{ _id: string; name: string; email?: string; role?: string }>>([]);

  useEffect(() => {
    if (!courseToEdit) return;

    const loadSubjectOptions = async () => {
      try {
        const { data } = await api.get("/courses?topLevel=true&limit=200");
        const allCourses = Array.isArray(data.courses)
          ? (data.courses as Array<{
              _id: string;
              name: string;
              department?: { _id?: string };
              subjects?: Array<{ _id?: string; name: string; code?: string; subjectID?: string }>;
            }>)
          : [];

        const options = allCourses.flatMap((courseDoc) => {
          const sameDepartment = String(courseDoc.department?._id ?? "") === String(courseToEdit.department?._id ?? "");
          if (!sameDepartment) return [];

          return (Array.isArray(courseDoc.subjects) ? courseDoc.subjects : []).map((subject) => ({
            _id: String(subject._id ?? `${courseDoc._id}-${subject.subjectID ?? subject.name}`),
            name: subject.name,
            code: subject.code ?? "",
            subjectID: subject.subjectID,
            courseId: courseDoc._id,
            courseName: courseDoc.name,
            departmentId: courseDoc.department?._id,
          }));
        });

        const uniqueOptions = Array.from(new Map(options.map((option) => [option._id, option])).values()) as SubjectOption[];
        setCourseSubjectOptions(uniqueOptions);
      } catch (error) {
        console.error("Failed to load department subject options", error);
        setCourseSubjectOptions([]);
      }
    };

    void loadSubjectOptions();

    const departmentIdentifier = courseToEdit.department?.departmentID ?? courseToEdit.department?.code ?? courseToEdit.department?._id ?? "";
    const loadDepartmentTeachers = async () => {
      if (!departmentIdentifier) {
        setDepartmentTeachers([]);
        return;
      }

      try {
        const { data } = await api.get(`/users?role=teacher&page=1&limit=200&department=${encodeURIComponent(departmentIdentifier)}`);
        const users = Array.isArray(data.users) ? data.users : [];
        setDepartmentTeachers(users.filter((user: { role?: string }) => !user.role || user.role === "teacher" || user.role === "admin"));
      } catch (error) {
        console.error("Failed to load department teachers", error);
        setDepartmentTeachers([]);
      }
    };

    void loadDepartmentTeachers();

    const existingHodId = Array.isArray(courseToEdit.lecturer)
      ? (typeof courseToEdit.lecturer[0] === "string" ? courseToEdit.lecturer[0] : courseToEdit.lecturer[0]?._id ?? "")
      : "";

    const frameId = window.requestAnimationFrame(() => {
      setCourseEditForm({
        name: courseToEdit.name ?? "",
        code: courseToEdit.code ?? "",
        semester: courseToEdit.semester ?? "",
        academicYear: typeof courseToEdit.academicYear === "object" ? courseToEdit.academicYear?._id ?? "" : "",
        departmentCode: courseToEdit.department?.code ?? "",
        departmentName: courseToEdit.department?.name ?? "",
        className: selectedClassId ? classes.find((cls) => cls._id === selectedClassId)?.name ?? "" : "",
        hodId: existingHodId || courseToEdit.department?.head?._id || "",
        selectedSubjectIds: (courseToEdit.subjects ?? []).map((subject) => subject._id),
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [courseToEdit, classes, selectedClassId]);

  const submitCourseEdit = async () => {
    if (!courseToEdit) return;
    try {
      const selectedSubjects = courseSubjectOptions
        .filter((subject) => courseEditForm.selectedSubjectIds.includes(subject._id))
        .map((subject) => ({
          name: subject.name,
          code: subject.code ?? null,
          subjectID: subject.subjectID ?? subject.code ?? "",
          lecturer: [],
          students: [],
          isActive: true,
          semester: courseToEdit.subjects?.find((current) => current._id === subject._id)?.semester ?? null,
        }));

      await api.patch(`/courses/update/${courseToEdit._id}`, {
        name: courseEditForm.name,
        code: courseEditForm.code,
        semester: courseEditForm.semester || null,
        academicYearId: courseEditForm.academicYear || null,
        department: courseToEdit.department?._id || null,
        unit: courseToEdit.unit?._id || null,
        lecturer: courseEditForm.hodId ? [courseEditForm.hodId] : [],
        subjects: selectedSubjects,
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
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to update course");
    }
  };

  const [addSubjectForm, setAddSubjectForm] = useState({
    name: "",
    code: "",
    semester: "First",
    lecturerId: "",
  });

  useEffect(() => {
    if (!courseToAddSubject) return;

    const departmentIdentifier = courseToAddSubject.department?.departmentID ?? courseToAddSubject.department?.code ?? courseToAddSubject.department?._id ?? "";
    const loadDepartmentTeachers = async () => {
      if (!departmentIdentifier) {
        setDepartmentTeachers([]);
        return;
      }

      try {
        const { data } = await api.get(`/users?role=teacher&page=1&limit=200&department=${encodeURIComponent(departmentIdentifier)}`);
        const users = Array.isArray(data.users) ? data.users : [];
        setDepartmentTeachers(users.filter((user: { role?: string }) => !user.role || user.role === "teacher" || user.role === "admin"));
      } catch (error) {
        console.error("Failed to load department teachers", error);
        setDepartmentTeachers([]);
      }
    };

    void loadDepartmentTeachers();
    const frameId = window.requestAnimationFrame(() => {
      setAddSubjectForm({
        name: "",
        code: "",
        semester: "First",
        lecturerId: "",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [courseToAddSubject]);

  const submitAddSubject = async () => {
    if (!courseToAddSubject) return;
    try {
      let departmentIdentifier =
        courseToAddSubject.department?.departmentID ??
        courseToAddSubject.department?.code ??
        courseToAddSubject.department?._id ??
        courseToAddSubject.department?.name ??
        "";

      // If departmentIdentifier appears to be a Mongo id or we don't have a departmentID/code, fetch the course to get the department doc
      const looksLikeObjectId = typeof departmentIdentifier === "string" && /^[0-9a-fA-F]{24}$/.test(departmentIdentifier);
      if (!departmentIdentifier || looksLikeObjectId) {
        try {
          const { data } = await api.get(`/courses/${courseToAddSubject._id}`);
          const dept = data?.department;
          departmentIdentifier = dept?.departmentID ?? dept?.code ?? dept?._id ?? dept?.name ?? departmentIdentifier;
        } catch {
          // fallback to previously-determined identifier
        }
      }

      await api.post(`/courses/${courseToAddSubject._id}/subjects`, {
        subject: {
          subjectID: departmentIdentifier,
          name: addSubjectForm.name,
          code: addSubjectForm.code || null,
          semester: addSubjectForm.semester || null,
          lecturer: addSubjectForm.lecturerId ? [addSubjectForm.lecturerId] : [],
          students: [],
          isActive: true,
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
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to add subject");
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
              placeholder="Course Name"
              value={courseEditForm.name}
              onChange={(e) => setCourseEditForm((p) => ({ ...p, name: e.target.value }))}
            />
            <Input
              placeholder="Course Code"
              value={courseEditForm.code}
              onChange={(e) => setCourseEditForm((p) => ({ ...p, code: e.target.value }))}
            />
            <Input
              placeholder="Course Department Code"
              value={courseEditForm.departmentCode}
              readOnly
            />
            <Input
              placeholder="Course Department Name"
              value={courseEditForm.departmentName}
              readOnly
            />
            <Select
              value={courseEditForm.academicYear}
              onValueChange={(value) => setCourseEditForm((p) => ({ ...p, academicYear: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select academic year" />
              </SelectTrigger>
              <SelectContent>
                      {createAcademicYears.map((year) => (
                  <SelectItem key={year._id} value={year._id}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={courseEditForm.hodId}
              onValueChange={(value) => setCourseEditForm((p) => ({ ...p, hodId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select course H.O.D." />
              </SelectTrigger>
              <SelectContent>
                {departmentTeachers.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No department lecturers found.</div>
                ) : (
                  departmentTeachers.map((teacher) => (
                    <SelectItem key={teacher._id} value={teacher._id}>
                      {teacher.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Input
              placeholder="Class"
              value={courseEditForm.className}
              readOnly
            />
            <div className="rounded-lg border border-border p-3">
              <p className="mb-2 text-sm font-medium">Subjects</p>
              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {courseSubjectOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No department-scoped subjects are available for this course yet.</p>
                ) : (
                  courseSubjectOptions.map((subject) => {
                    const isSelected = courseEditForm.selectedSubjectIds.includes(subject._id);
                    return (
                      <label key={subject._id} className="flex items-start gap-2 rounded-md border border-border/60 p-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            setCourseEditForm((p) => ({
                              ...p,
                              selectedSubjectIds: checked
                                ? [...p.selectedSubjectIds, subject._id]
                                : p.selectedSubjectIds.filter((id) => id !== subject._id),
                            }));
                          }}
                        />
                        <div>
                          <p className="text-sm font-medium">{subject.name}</p>
                          <p className="text-xs text-muted-foreground">{subject.code || subject.subjectID || "No code"}</p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
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
        open={createCourseDialogOpen}
        onOpenChange={(open) => setCreateCourseDialogOpen(open)}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
            <DialogDescription>
              Create a top-level course and assign it to the currently selected class.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCourseSubmit} className="space-y-4 py-2">
            <Input
              placeholder="Course Name"
              value={createCourseForm.name}
              onChange={(e) => setCreateCourseForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <Input
              placeholder="Course Code"
              value={createCourseForm.code}
              onChange={(e) => setCreateCourseForm((prev) => ({ ...prev, code: e.target.value }))}
            />
            <Input
              placeholder="Course Group ID"
              value={createCourseForm.courseID}
              onChange={(e) => setCreateCourseForm((prev) => ({ ...prev, courseID: e.target.value }))}
            />
            <Select value={createCourseForm.semester} onValueChange={(value) => setCreateCourseForm((prev) => ({ ...prev, semester: value as "First" | "Second" }))}>
              <SelectTrigger>
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="First">First</SelectItem>
                <SelectItem value="Second">Second</SelectItem>
              </SelectContent>
            </Select>
            <Select value={createCourseForm.department} onValueChange={(value) => setCreateCourseForm((prev) => ({ ...prev, department: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                {createDepartments.map((dept) => (
                  <SelectItem key={dept._id} value={dept._id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={createCourseForm.unit} onValueChange={(value) => setCreateCourseForm((prev) => ({ ...prev, unit: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Unit (optional)" />
              </SelectTrigger>
              <SelectContent>
                {filteredUnits.map((unit) => (
                  <SelectItem key={unit._id} value={unit._id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={createCourseForm.academicYearId} onValueChange={(value) => setCreateCourseForm((prev) => ({ ...prev, academicYearId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                {createAcademicYears.map((year) => (
                  <SelectItem key={year._id} value={year._id}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={createCourseForm.isActive}
                onCheckedChange={(checked) => setCreateCourseForm((prev) => ({ ...prev, isActive: Boolean(checked) }))}
              />
              <span className="text-sm">Active course</span>
            </div>
            {!selectedClass && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={createCourseForm.assignToClass}
                  onCheckedChange={(checked) => setCreateCourseForm((prev) => ({ ...prev, assignToClass: Boolean(checked) }))}
                />
                <span className="text-sm">Assign to selected class after create</span>
              </div>
            )}
            {selectedClass && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                <p className="font-semibold">Selected class</p>
                <p>{selectedClass.name}</p>
                <p className="text-xs text-muted-foreground">Academic year: {selectedClass.academicYear?.name ?? "Unknown"}</p>
                <Link to={`/classes?selected=${selectedClass._id}`} className="text-primary underline">
                  View class details
                </Link>
              </div>
            )}
            {createCourseError && <p className="text-sm text-destructive">{createCourseError}</p>}
            <Button type="submit" className="w-full" disabled={createCourseLoading}>
              {createCourseLoading ? "Creating..." : "Create Course"}
            </Button>
          </form>
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
            <Input
              placeholder="Subject Name"
              value={addSubjectForm.name}
              onChange={(e) => setAddSubjectForm((p) => ({ ...p, name: e.target.value }))}
            />
            <Input
              placeholder="Subject Code"
              value={addSubjectForm.code}
              onChange={(e) => setAddSubjectForm((p) => ({ ...p, code: e.target.value }))}
            />
            <Input
              placeholder="Course Name"
              value={courseToAddSubject?.name ?? ""}
              readOnly
            />
            <Input
              placeholder="Course Department"
              value={courseToAddSubject?.department?.name ?? ""}
              readOnly
            />
            <Select
              value={addSubjectForm.lecturerId}
              onValueChange={(value) => setAddSubjectForm((p) => ({ ...p, lecturerId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select lecturer" />
              </SelectTrigger>
              <SelectContent>
                {departmentTeachers.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No department lecturers found.</div>
                ) : (
                  departmentTeachers.map((teacher) => (
                    <SelectItem key={teacher._id} value={teacher._id}>
                      {teacher.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Select
              value={addSubjectForm.semester}
              onValueChange={(value) => setAddSubjectForm((p) => ({ ...p, semester: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="First">First</SelectItem>
                <SelectItem value="Second">Second</SelectItem>
              </SelectContent>
            </Select>
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
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                {institution?.logoUrl ? (
                  <img src={institution.logoUrl} alt="Institution logo" className="h-full w-full rounded-3xl object-cover" />
                ) : (
                  <span className="text-xl font-semibold">
                    {String(institution?.shortName ?? institution?.name ?? "?").slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Institution</p>
                <p className="text-lg font-semibold">{institution?.name ?? "Institution"}</p>
              </div>
            </div>
            <div className="grid gap-1 text-right">
              <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Active academic year</p>
              <p className="text-lg font-semibold">{selectedClass?.academicYear?.name ?? "Not set"}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Selected class</p>
              <p className="font-semibold">{selectedClass?.name ?? "No class selected"}</p>
            </div>
            {canCreateCourse && (
              <Button variant="default" onClick={() => handleOpenCreateCourse(true)}>
                Create Course
              </Button>
            )}
          </div>
        </div>
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
                      void handleViewSubjects(course, e);
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

