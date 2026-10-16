import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, CalendarIcon, Pause, Play, RotateCcw, Trash2, Check } from "lucide-react";
import { format, isAfter, isBefore, isValid } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { academicYear, AcademicClockPhase } from "@/types";
import { api } from "@/lib/api";
import { buildInitialPhasePlan, doesPhaseRequirePostingSchedule, getClockPhaseId, getClassLevelPhasePlan, type AcademicClockPhaseDefinition } from "@/lib/academicClock";
import AcademicYearTable from "@/components/academic-year/academic-year-table";
import Search from "@/components/global/Search";
import AcademicYearForm from "@/components/academic-year/AcademicYearForm";
import CustomAlert from "@/components/global/CustomAlert";
import JUTHAcademicClock from "@/components/academic-clock/JUTHAcademicClock";
import Modal from "@/components/global/Modal";
import { useInstitution } from "@/lib/useInstitution";
import { getInstitutionDisplayName } from "@/lib/institutionDisplay";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useAdminClassClock, useAdminClassOptions } from "@/lib/adminData";

const AcademicYear = () => {
  type PhaseLearningObjective = NonNullable<AcademicClockPhaseDefinition["learningObjectives"]>[number];
  type PhaseCourseOption = { _id: string; name: string; code?: string };
  type PhasePostingOption = { _id: string; name?: string; postings?: Array<{ name: string }> };
  const [years, setYears] = useState<academicYear[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Search & Pagination State ---
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dialog States 
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<academicYear | null>(null);

  // Alert States
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [currentAcademicYear, setCurrentAcademicYear] = useState<academicYear | null>(null);
  const [clockStartDate, setClockStartDate] = useState<Date>(new Date());
  const [classes, setClasses] = useState<Array<{ _id: string; name: string }>>([]);
  const [phaseCourses, setPhaseCourses] = useState<PhaseCourseOption[]>([]);
  const [phasePostingSchedules, setPhasePostingSchedules] = useState<PhasePostingOption[]>([]);
  const [selectedClockClassId, setSelectedClockClassId] = useState<string>("");
  const [clockNow, setClockNow] = useState<Date>(new Date());
  const [isClockPaused, setIsClockPaused] = useState(false);
  const [clockPausedAt, setClockPausedAt] = useState<Date | null>(null);
  const [clockPhase, setClockPhase] = useState<AcademicClockPhase>("phase1");
  const [hasClassClock, setHasClassClock] = useState<boolean>(false);
  const [isConfiguringClassClock, setIsConfiguringClassClock] = useState<boolean>(false);
  const [selectedClockDocId, setSelectedClockDocId] = useState<string | null>(null);
  const [classPhasePlan, setClassPhasePlan] = useState<AcademicClockPhaseDefinition[]>([]);
  const classesResource = useAdminClassOptions();
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [hoveredPhaseId, setHoveredPhaseId] = useState<string | null>(null);
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [isConfigureClockModalOpen, setIsConfigureClockModalOpen] = useState(false);
  const [phaseEditValues, setPhaseEditValues] = useState({
    name: "",
    durationMonths: "1",
    subPostings: "",
    color: "#3B82F6",
    requiresPostingSchedule: false,
    postingScheduleId: "",
    postingName: "",
    timetablePhaseId: "",
    courseIds: [] as string[],
    learningObjectives: [] as PhaseLearningObjective[],
  });
  const [newObjective, setNewObjective] = useState<PhaseLearningObjective>({
    type: "tutorial",
    title: "",
    courseId: "",
    description: "",
  });
  const [isStartPopoverOpen, setIsStartPopoverOpen] = useState(false);
  const { institution } = useInstitution();
  const institutionName = useMemo(() => getInstitutionDisplayName(institution), [institution]);

  //   Fetch Years
  const fetchYears = useCallback(async () => {
    try {
      setLoading(true);
      // Construct Query Params
      const params = new URLSearchParams();
      params.append("page", pageNum.toString());
      params.append("limit", "10");
      if (debouncedSearch) params.append("search", debouncedSearch);

      const { data } = await api.get(`/academic-years?${params.toString()}`);

      // Handle response structure { years: [], pagination: {} }
      if (data.years) {
        setYears(data.years);
        setTotalPages(data.pagination.pages);
      } else {
        setYears([]);
      }
    } catch {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [pageNum, debouncedSearch]);

  // Trigger fetch when Page or Search changes
  useEffect(() => {
    const loadYears = async () => {
      await fetchYears();
    };

    void loadYears();
  }, [fetchYears]);

  // Debounce Search Input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPageNum(1); // Reset to first page on new search
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  const handleCreate = () => {
    setEditingYear(null);
    setIsFormOpen(true);
  };

  const handleEdit = (year: academicYear) => {
    setEditingYear(year);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/academic-years/delete/${deletingId}`);
      toast.success("Academic year deleted");
      fetchYears();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setIsAlertOpen(false); 
      setDeletingId(null);
    }
  };

  const currentYear = useMemo(
    () => years.find((year) => year.isCurrent),
    [years],
  );

  useEffect(() => {
    if (currentYear) {
      setCurrentAcademicYear(currentYear);
    }
  }, [currentYear]);

  useEffect(() => {
    const loadActiveYear = async () => {
      try {
        const { data } = await api.get("/academic-years/current");
        setCurrentAcademicYear(data?.year ?? data);
      } catch {
        // ignore when no current year exists yet
      }
    };

    void loadActiveYear();
  }, []);

  useEffect(() => {
    if (classesResource.error) {
      console.error("Failed to load classes", classesResource.error);
      return;
    }
    const classList = classesResource.data;
    if (!classList) return;
    setClasses(classList);
    if (classList.length > 0 && !selectedClockClassId) {
      setSelectedClockClassId(classList[0]._id);
    }
  }, [classesResource.data, classesResource.error, selectedClockClassId]);

  useEffect(() => {
    if (!selectedClockClassId) {
      setPhaseCourses([]);
      setPhasePostingSchedules([]);
      return;
    }

    let cancelled = false;
    const loadPhaseOptions = async () => {
      try {
        const [classResponse, postingResponse] = await Promise.all([
          api.get(`/classes/${selectedClockClassId}`),
          api.get(`/rotation-schedules?classId=${selectedClockClassId}&limit=100`),
        ]);
        if (cancelled) return;
        setPhaseCourses(Array.isArray(classResponse.data?.courses) ? classResponse.data.courses : []);
        setPhasePostingSchedules(
          Array.isArray(postingResponse.data?.schedules) ? postingResponse.data.schedules : [],
        );
      } catch {
        if (cancelled) return;
        setPhaseCourses([]);
        setPhasePostingSchedules([]);
        toast.error("Failed to load phase courses or clinical posting schedules.");
      }
    };

    void loadPhaseOptions();
    return () => {
      cancelled = true;
    };
  }, [selectedClockClassId]);

  const activeYear = currentAcademicYear || currentYear;
  const classClockResource = useAdminClassClock(
    selectedClockClassId,
    activeYear?._id ?? activeYear?.id,
  );
  const activeStartDate = clockStartDate;
  const selectedClass = useMemo(
    () => classes.find((cls) => cls._id === selectedClockClassId) ?? null,
    [classes, selectedClockClassId],
  );
  const selectedClassPhasePlan = useMemo(
    () => getClassLevelPhasePlan(selectedClass?.name),
    [selectedClass?.name],
  );

  const isClassClockPreviewVisible = hasClassClock || classPhasePlan.length > 0;

  const getClassLevelFromName = (className?: string | null) => {
    const normalized = (className ?? "").toLowerCase();

    if (normalized.includes("500") || normalized.includes("fifth")) return "fifth";
    if (normalized.includes("400") || normalized.includes("fourth")) return "fourth";
    if (normalized.includes("300") || normalized.includes("third")) return "third";
    if (normalized.includes("600") || normalized.includes("sixth")) return "sixth";
    if (normalized.includes("final")) return "final";

    return null;
  };

  const convertPhaseConfigToPlan = useCallback((phaseConfig?: Record<string, { name: string; duration: number; postingType: string | null; postingId: string | null; requiresPostingSchedule?: boolean; missingScheduleAlertSignature?: string | null; postingScheduleId?: string | null; postingName?: string | null; timetablePhaseId?: string | null; courseIds?: string[]; learningObjectives?: PhaseLearningObjective[]; color?: string; subPostings?: string[] }>) => {
    if (!phaseConfig || Object.keys(phaseConfig).length === 0) return [];

    return Object.entries(phaseConfig).map(([phaseId, config], index) => ({
      id: phaseId,
      name: config?.name ?? `Phase ${index + 1}`,
      durationMonths: config?.duration ?? 1,
      color: config?.color ?? "#3B82F6",
      subPostings: config?.subPostings ?? [],
      postingType: config?.postingType ?? null,
      postingId: config?.postingId ?? null,
      requiresPostingSchedule: doesPhaseRequirePostingSchedule(config),
      missingScheduleAlertSignature: config?.missingScheduleAlertSignature ?? null,
      postingScheduleId: config?.postingScheduleId ?? null,
      postingName: config?.postingName ?? null,
      timetablePhaseId: config?.timetablePhaseId ?? null,
      courseIds: config?.courseIds?.map(String) ?? [],
      learningObjectives: config?.learningObjectives ?? [],
    }));
  }, []);

  const openPhaseEditor = (phase: AcademicClockPhaseDefinition) => {
    setSelectedPhaseId(phase.id);
    setEditingPhaseId(phase.id);
    setPhaseEditValues({
      name: phase.name,
      durationMonths: phase.durationMonths.toString(),
      subPostings: phase.subPostings.join(", "),
      color: phase.color,
      requiresPostingSchedule: doesPhaseRequirePostingSchedule(phase),
      postingScheduleId: phase.postingScheduleId ?? "",
      postingName: phase.postingName ?? "",
      timetablePhaseId: phase.timetablePhaseId ?? "",
      courseIds: phase.courseIds ?? [],
      learningObjectives: phase.learningObjectives ?? [],
    });
    setIsPhaseModalOpen(true);
  };

  const closePhaseEditor = () => {
    setIsPhaseModalOpen(false);
    setEditingPhaseId(null);
  };

  const persistPhasePlan = async (phasePlan: AcademicClockPhaseDefinition[]) => {
    if (!activeYear) throw new Error("Select an active academic year before saving phases.");
    const saved = await saveClockState({}, phasePlan);
    if (!saved) throw new Error("Class clock phases were not saved.");
  };

  const savePhaseEdit = async () => {
    if (!editingPhaseId) return;
    const duration = Math.max(1, Number(phaseEditValues.durationMonths) || 1);

    const updatedPlan = classPhasePlan.map((phase) =>
      phase.id === editingPhaseId
        ? {
            ...phase,
            name: phaseEditValues.name || phase.name,
            durationMonths: duration,
            color: phaseEditValues.color,
            subPostings: phaseEditValues.subPostings
              .split(",")
              .map((posting) => posting.trim())
              .filter(Boolean),
            requiresPostingSchedule: phaseEditValues.requiresPostingSchedule,
            postingScheduleId: phaseEditValues.postingScheduleId || null,
            postingName: phaseEditValues.postingName || null,
            timetablePhaseId: phaseEditValues.timetablePhaseId || null,
            courseIds: phaseEditValues.courseIds,
            learningObjectives: phaseEditValues.learningObjectives,
          }
        : phase,
    );

    try {
      await persistPhasePlan(updatedPlan);
      setClassPhasePlan(updatedPlan);
      closePhaseEditor();
    } catch {
      toast.error("Failed to save phase changes.");
    }
  };

  const addClassPhase = () => {
    const id = `phase-${Date.now()}`;
    const newPhase: AcademicClockPhaseDefinition = {
      id,
      name: "New Phase",
      durationMonths: 1,
      color: "#3B82F6",
      subPostings: [],
    };

    const nextPlan = [...classPhasePlan, newPhase];
    setClassPhasePlan(nextPlan);
    openPhaseEditor(newPhase);
  };

  const applyTemplatePhasePlan = () => {
    const nextPlan = buildInitialPhasePlan({ className: selectedClass?.name, useTemplate: true });
    setClassPhasePlan(nextPlan);
    setSelectedPhaseId(nextPlan[0]?.id ?? null);
    setClockPhase(nextPlan[0]?.id ?? "phase1");
    setIsConfiguringClassClock(true);
    setIsConfigureClockModalOpen(false);
    toast.success("Template phases loaded.");
  };

  const startManualClockConfiguration = () => {
    setClassPhasePlan([]);
    setSelectedPhaseId(null);
    setClockPhase("phase1");
    setIsConfiguringClassClock(true);
    setIsConfigureClockModalOpen(false);
    toast.success("Create the class clock phases below and save when ready.");
  };

  const openConfigureClockModal = () => setIsConfigureClockModalOpen(true);

  const movePhase = (phaseId: string, direction: "up" | "down") => {
    setClassPhasePlan((prevPlan) => {
      const index = prevPlan.findIndex((phase) => phase.id === phaseId);
      if (index === -1) return prevPlan;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prevPlan.length) return prevPlan;

      const nextPlan = [...prevPlan];
      const [phaseToMove] = nextPlan.splice(index, 1);
      nextPlan.splice(targetIndex, 0, phaseToMove);
      return nextPlan;
    });
  };

  const deleteClassPhase = async (phaseId: string) => {
    const nextPlan = classPhasePlan.filter((phase) => phase.id !== phaseId);

    if (clockPhase === phaseId && nextPlan.length > 0) {
      setClockPhase(nextPlan[0].id);
    }

    setClassPhasePlan(nextPlan);
    if (editingPhaseId === phaseId) {
      closePhaseEditor();
    }

    await persistPhasePlan(nextPlan);
  };

  const savePhasePlan = async () => {
    try {
      await persistPhasePlan(classPhasePlan);
      toast.success("Class clock phases saved.");
    } catch {
      toast.error("Failed to save class clock phases.");
    }
  };

  type ClassClockPayload = {
    clockStartDate?: string | null;
    clockIsPaused?: boolean;
    clockPausedAt?: string | null;
    clockPhase?: AcademicClockPhase | null;
    classLevel?: string | null;
    phaseConfig?: Record<string, {
      name: string;
      duration: number;
      postingType: string | null;
      postingId: string | null;
      requiresPostingSchedule?: boolean;
      missingScheduleAlertSignature?: string | null;
      postingScheduleId?: string | null;
      postingName?: string | null;
      timetablePhaseId?: string | null;
      courseIds?: string[];
      learningObjectives?: PhaseLearningObjective[];
      color?: string;
      subPostings?: string[];
    }>;
  };

  const normalizeClockUpdate = (data: {
    clockStartDate?: Date | null;
    clockIsPaused?: boolean;
    clockPausedAt?: Date | null;
    clockPhase?: AcademicClockPhase | null;
  }): ClassClockPayload => {
    const payload: ClassClockPayload = {};

    if (Object.prototype.hasOwnProperty.call(data, "clockStartDate")) {
      payload.clockStartDate = data.clockStartDate
        ? data.clockStartDate.toISOString()
        : null;
    }

    if (Object.prototype.hasOwnProperty.call(data, "clockIsPaused")) {
      payload.clockIsPaused = data.clockIsPaused;
    }

    if (Object.prototype.hasOwnProperty.call(data, "clockPausedAt")) {
      payload.clockPausedAt = data.clockPausedAt
        ? data.clockPausedAt.toISOString()
        : null;
    }

    if (Object.prototype.hasOwnProperty.call(data, "clockPhase")) {
      payload.clockPhase = data.clockPhase;
    }

    return payload;
  };

  const buildClassClockPayload = (data: {
    clockStartDate?: Date | null;
    clockIsPaused?: boolean;
    clockPausedAt?: Date | null;
    clockPhase?: AcademicClockPhase | null;
  }, phasePlan: AcademicClockPhaseDefinition[] = classPhasePlan): ClassClockPayload => {
    const payload = normalizeClockUpdate({
      ...data,
      clockPhase: data.clockPhase ?? clockPhase,
    });

    const phaseConfig = phasePlan.reduce<NonNullable<ClassClockPayload["phaseConfig"]>>((acc, phase) => {
      acc[phase.id] = {
        name: phase.name,
        duration: phase.durationMonths,
        postingType: phase.postingType ?? null,
        postingId: phase.postingId ?? null,
        requiresPostingSchedule: doesPhaseRequirePostingSchedule(phase),
        missingScheduleAlertSignature: phase.missingScheduleAlertSignature ?? null,
        postingScheduleId: phase.postingScheduleId ?? null,
        postingName: phase.postingName ?? null,
        timetablePhaseId: phase.timetablePhaseId ?? null,
        courseIds: phase.courseIds ?? [],
        learningObjectives: phase.learningObjectives ?? [],
        color: phase.color,
        subPostings: phase.subPostings,
      };
      return acc;
    }, {});

    return {
      ...payload,
      classLevel: getClassLevelFromName(selectedClass?.name),
      phaseConfig,
    };
  };

  const saveClockState = async (data: {
    clockStartDate?: Date | null;
    clockIsPaused?: boolean;
    clockPausedAt?: Date | null;
    clockPhase?: AcademicClockPhase | null;
  }, phasePlan: AcademicClockPhaseDefinition[] = classPhasePlan): Promise<boolean> => {
    if (!activeYear) return false;

    const activeYearId = activeYear ? (activeYear._id ?? (activeYear.id ?? undefined)) : undefined;
    if (!activeYearId) return false;

    try {
      const payload = buildClassClockPayload({
        clockStartDate: Object.prototype.hasOwnProperty.call(data, "clockStartDate") ? data.clockStartDate : clockStartDate,
        clockIsPaused: Object.prototype.hasOwnProperty.call(data, "clockIsPaused") ? data.clockIsPaused : isClockPaused,
        clockPausedAt: Object.prototype.hasOwnProperty.call(data, "clockPausedAt") ? data.clockPausedAt : clockPausedAt,
        clockPhase: Object.prototype.hasOwnProperty.call(data, "clockPhase") ? data.clockPhase : clockPhase,
        ...data,
      }, phasePlan);

      if (selectedClockClassId) {
        const existingMap = (activeYear as academicYear & { classClockData?: Record<string, unknown> }).classClockData || {};
        const merged = { ...(existingMap || {}), [selectedClockClassId]: payload };
        await api.patch(`/academic-years/update/${activeYearId}`, { classClockData: merged });

        const clockPayload = {
          academicYearId: activeYearId,
          classId: selectedClockClassId,
          clockStartDate: payload.clockStartDate ?? null,
          clockIsPaused: payload.clockIsPaused ?? false,
          clockPausedAt: payload.clockPausedAt ?? null,
          clockPhase: payload.clockPhase ?? null,
          classLevel: payload.classLevel ?? null,
          phaseConfig: payload.phaseConfig ?? {},
        };

        if (selectedClockDocId) {
          await api.patch(`/academic-clocks/update/${selectedClockDocId}`, clockPayload);
        } else {
          const { data: createdClock } = await api.post("/academic-clocks/create", clockPayload);
          setSelectedClockDocId(createdClock?._id ?? null);
        }
      } else {
        await api.patch(`/academic-years/update/${activeYearId}`, payload);
      }
      await fetchYears();
      return true;
    } catch {
      toast.error("Failed to save clock state");
      return false;
    }
  };

  const loadSelectedClassClock = useCallback(async () => {
    const ayId = activeYear ? (activeYear._id ?? activeYear.id ?? undefined) : undefined;
    if (!ayId || !selectedClockClassId) {
      setSelectedClockDocId(null);
      setHasClassClock(false);
      return;
    }

    setSelectedClockDocId(null);
    setHasClassClock(false);
    try {
      const snapshot = await classClockResource.refetch();
      const existingClock = snapshot.data;

      if (existingClock) {
        setSelectedClockDocId(existingClock._id);
        setHasClassClock(true);
        setClockStartDate(existingClock.clockStartDate ? new Date(existingClock.clockStartDate) : new Date(activeYear?.fromYear ?? new Date()));
        setIsClockPaused(Boolean(existingClock.clockIsPaused));
        setClockPausedAt(existingClock.clockPausedAt ? new Date(existingClock.clockPausedAt) : null);
        const existingPlan = convertPhaseConfigToPlan(existingClock.phaseConfig);
        setClassPhasePlan(existingPlan);
        setClockPhase((existingClock.activePhase?.id as AcademicClockPhase | undefined) ?? getClockPhaseId(
          existingClock.clockStartDate ? new Date(existingClock.clockStartDate) : new Date(activeYear?.fromYear ?? new Date()),
          new Date(),
          existingPlan,
        ));
        return;
      }
      if (snapshot.error) {
        const errorStatus = (snapshot.error as { response?: { status?: number } })?.response?.status;
        if (errorStatus !== 404) console.error("Failed to load class academic clock", snapshot.error);
      }
    } catch (error) {
      console.error("Failed to load class academic clock", error);
    }

    const classData = (currentAcademicYear as academicYear & { classClockData?: Record<string, ClassClockPayload> }).classClockData
      ? (currentAcademicYear as academicYear & { classClockData?: Record<string, ClassClockPayload> }).classClockData?.[selectedClockClassId]
      : undefined;

    if (classData) {
      setSelectedClockDocId(null);
      setHasClassClock(true);
      setClockStartDate(classData.clockStartDate ? new Date(classData.clockStartDate) : new Date(activeYear?.fromYear ?? new Date()));
      setIsClockPaused(Boolean(classData.clockIsPaused));
      setClockPausedAt(classData.clockPausedAt ? new Date(classData.clockPausedAt) : null);
      setClassPhasePlan(convertPhaseConfigToPlan(classData.phaseConfig));
      setClockPhase((classData.clockPhase as AcademicClockPhase) ?? getClockPhaseId(
        classData.clockStartDate ? new Date(classData.clockStartDate) : new Date(currentAcademicYear?.fromYear ?? new Date()),
        new Date(),
        convertPhaseConfigToPlan(classData.phaseConfig),
      ));
    } else {
      setSelectedClockDocId(null);
      setHasClassClock(false);
      setIsConfiguringClassClock(false);
      setClockStartDate(new Date(activeYear?.fromYear ?? new Date()));
      setIsClockPaused(false);
      setClockPausedAt(null);
      setClassPhasePlan([]);
      setClockPhase("phase1");
    }
  }, [activeYear, classClockResource.refetch, currentAcademicYear, selectedClockClassId, convertPhaseConfigToPlan]);

  // When current academic year or selected class changes, load class-specific clock data
  useEffect(() => {
    void loadSelectedClassClock();
  }, [loadSelectedClassClock]);

  useEffect(() => {
    if (!activeYear) return;
    if (hasClassClock || classPhasePlan.length > 0) return;

    const startDate = activeYear.clockStartDate
      ? new Date(activeYear.clockStartDate)
      : new Date(activeYear.fromYear ?? new Date());

    setClockStartDate(startDate);

    const nextPhase = getClockPhaseId(startDate, new Date(), classPhasePlan);
    setClockPhase(nextPhase);

    if (activeYear.clockIsPaused && activeYear.clockPausedAt) {
      const pausedDate = new Date(activeYear.clockPausedAt);
      setClockNow(pausedDate);
      setClockPausedAt(pausedDate);
      setIsClockPaused(true);
    } else {
      setClockNow(new Date());
      setClockPausedAt(null);
      setIsClockPaused(Boolean(activeYear.clockIsPaused));
    }
  }, [activeYear, classPhasePlan, hasClassClock]);

  useEffect(() => {
    if (isClockPaused) return undefined;
    const timer = window.setInterval(() => {
      const nextDate = new Date();
      setClockNow(nextDate);
      setClockPhase(getClockPhaseId(clockStartDate, nextDate, classPhasePlan));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isClockPaused, clockStartDate, classPhasePlan]);

  const handlePauseToggle = async () => {
    if (!activeYear) return;

    if (isClockPaused) {
      const resumeDate = new Date();
      const pausedDuration = clockPausedAt
        ? Math.max(0, resumeDate.getTime() - clockPausedAt.getTime())
        : 0;
      const resumedStartDate = new Date(clockStartDate.getTime() + pausedDuration);
      const nextPhase = getClockPhaseId(resumedStartDate, resumeDate, classPhasePlan);

      setClockNow(resumeDate);
      setClockStartDate(resumedStartDate);
      setIsClockPaused(false);
      setClockPausedAt(null);
      setClockPhase(nextPhase);

      await saveClockState({
        clockStartDate: resumedStartDate,
        clockIsPaused: false,
        clockPausedAt: null,
        clockPhase: nextPhase,
      });
      await fetchYears();
      await loadSelectedClassClock();
    } else {
      const pauseDate = new Date();
      const nextPhase = getClockPhaseId(clockStartDate, pauseDate, classPhasePlan);

      setClockNow(pauseDate);
      setIsClockPaused(true);
      setClockPausedAt(pauseDate);
      setClockPhase(nextPhase);

      await saveClockState({
        clockStartDate,
        clockIsPaused: true,
        clockPausedAt: pauseDate,
        clockPhase: nextPhase,
      });
      await fetchYears();
      await loadSelectedClassClock();
    }
  };

  const resetClock = async () => {
    if (!activeYear) return;

    const useAcademicYearStart = window.confirm(
      "Reset this class clock to the academic year start date? Choose OK to use the academic year start date, or Cancel to keep the current class-specific start date and continue from it."
    );

    const resetDate = useAcademicYearStart
      ? new Date(activeYear.fromYear)
      : clockStartDate;

    const resetDateNow = new Date();
    const nextPhase = getClockPhaseId(resetDate, resetDateNow, classPhasePlan);
    setClockStartDate(resetDate);
    setClockNow(resetDateNow);
    setIsClockPaused(false);
    setClockPausedAt(null);
    setClockPhase(nextPhase);

    await saveClockState({
      clockStartDate: resetDate,
      clockIsPaused: false,
      clockPausedAt: null,
      clockPhase: nextPhase,
    });
  };

  const safeFormat = (d: any, fmt = "PPP") => {
    if (!d) return "TBA";
    const dt = d instanceof Date ? d : new Date(d);
    if (!isValid(dt)) return "TBA";
    try {
      return format(dt, fmt);
    } catch (e) {
      return "TBA";
    }
  };

  const isDateSelectableForActiveYear = (date: Date) => {
    if (!activeYear) return false;

    const start = activeYear.fromYear ? new Date(activeYear.fromYear) : null;
    const end = activeYear.toYear ? new Date(activeYear.toYear) : null;

    if (start && !isValid(start)) return false;
    if (end && !isValid(end)) return false;

    if (start && isBefore(date, start)) return true;
    if (end && isAfter(date, end)) return true;

    return false;
  };

  const handleDeleteClassClock = async () => {
    if (!activeYear || !selectedClockClassId) return;

    const confirmed = window.confirm("Delete the clock for the selected class?");
    if (!confirmed) return;

    try {
      const ayId = activeYear ? (activeYear._id ?? activeYear.id ?? undefined) : undefined;
      if (!ayId) throw new Error('Missing academic year id');
      await api.delete(`/academic-clocks/delete/by-class?academicYearId=${ayId}&classId=${selectedClockClassId}`);
      setSelectedClockDocId(null);
      setHasClassClock(false);
      setClockStartDate(new Date(activeYear.fromYear));
      setClockNow(new Date());
      setIsClockPaused(false);
      setClockPausedAt(null);
      setClockPhase("phase1");
      await fetchYears();
      toast.success("Class clock deleted");
    } catch {
      toast.error("Failed to delete class clock");
    }
  };

  const handleClockComplete = async () => {
    if (!activeYear || !selectedClockClassId) return;

    try {
      const ayId = activeYear ? (activeYear._id ?? activeYear.id ?? undefined) : undefined;
      if (!ayId) throw new Error('Missing academic year id');
      await api.post(`/academic-clocks/complete/by-class`, { academicYearId: ayId, classId: selectedClockClassId });
      setIsClockPaused(true);
      const lastPhase = classPhasePlan[classPhasePlan.length - 1];
      if (lastPhase) setClockPhase(lastPhase.id);
      toast.success("Class academic clock completed and admins notified.");
    } catch (err) {
      toast.error("Failed to notify completion");
    }
  };

  return (
    <div id="page-academic-years" className="p-6 space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Academic Years</h1>
          <p className="text-muted-foreground">Manage school sessions.</p>
        </div>
        <div className="flex gap-3">
          <Search value={search} onChange={setSearch} placeholder="Academic Year" />
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add New Year
          </Button>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.25fr]">
        <Card className="rounded-3xl border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
          <CardHeader className="gap-2 p-0">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-lg font-semibold">Class Academic Clocks</CardTitle>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Track the class-level clinical rotation timeline with live clocks.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Clock scope</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Preview the academic clock for a selected class.</p>
                </div>
                <Select value={selectedClockClassId} onValueChange={setSelectedClockClassId}>
                  <SelectTrigger className="w-full sm:w-56">
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
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-6">
              {isClassClockPreviewVisible ? (
                <JUTHAcademicClock
                  startDate={activeStartDate}
                  currentDate={clockNow}
                  isPaused={isClockPaused}
                  currentPhaseId={clockPhase}
                  phasePlan={classPhasePlan}
                  onComplete={handleClockComplete}
                  institutionName={institutionName}
                />
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <p>No class clock configured for the selected class.</p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Not configured for this class. Click configure to start with a template or create your own phases.
                  </p>
                  <div className="mt-4 flex justify-center">
                    <Button onClick={openConfigureClockModal}>Configure class clock</Button>
                  </div>
                </div>
              )}

              {(hasClassClock || isConfiguringClassClock) && (
                <div className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Class clock phases</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Add, edit, or remove phases for the selected class clock.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={applyTemplatePhasePlan}>
                        Use template
                      </Button>
                      <Button variant="secondary" onClick={addClassPhase}>
                        <Plus className="mr-2 h-4 w-4" /> Add phase
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {classPhasePlan.map((phase, index) => {
                      const isSelected = selectedPhaseId === phase.id;
                      return (
                        <div
                          key={phase.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedPhaseId(phase.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " " ) {
                              event.preventDefault();
                              setSelectedPhaseId(phase.id);
                            }
                          }}
                          onMouseEnter={() => setHoveredPhaseId(phase.id)}
                          onMouseLeave={() => setHoveredPhaseId(null)}
                          className={`w-full rounded-2xl border bg-white p-4 shadow-sm transition ${isSelected ? "border-primary bg-slate-50 dark:border-primary/80 dark:bg-slate-900" : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: phase.color }} />
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-slate-100">{phase.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{phase.durationMonths} month{phase.durationMonths > 1 ? "s" : ""}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                {index + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 p-0"
                                  disabled={index === 0}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    movePhase(phase.id, "up");
                                  }}
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 p-0"
                                  disabled={index === classPhasePlan.length - 1}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    movePhase(phase.id, "down");
                                  }}
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              {phase.subPostings.length > 0 ? phase.subPostings.join(" • ") : "No postings defined."}
                            </p>
                            <div className={`${isSelected || hoveredPhaseId === phase.id ? "flex" : "hidden"} items-center gap-2`}>
                              <Button variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); openPhaseEditor(phase); }}>
                                Edit
                              </Button>
                              <Button variant="destructive" size="sm" onClick={(event) => { event.stopPropagation(); void deleteClassPhase(phase.id); }}>
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Modal
                    title="Edit phase"
                    description="Update the phase details, duration, and order for this class clock."
                    open={isPhaseModalOpen}
                    setOpen={setIsPhaseModalOpen}
                    className="bg-background !left-1/2 !top-1/2 !w-[min(92vw,40rem)] !max-w-none !translate-x-[-50%] !translate-y-[-50%] !max-h-[85vh] !rounded-2xl !p-5 sm:!p-6"
                  >
                    <div className="grid gap-4 py-2">
                      <div>
                        <Label htmlFor="phase-name">Name</Label>
                        <Input
                          id="phase-name"
                          value={phaseEditValues.name}
                          onChange={(event) => setPhaseEditValues({ ...phaseEditValues, name: event.target.value })}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phase-duration">Duration (months)</Label>
                        <Input
                          id="phase-duration"
                          type="number"
                          min={1}
                          value={phaseEditValues.durationMonths}
                          onChange={(event) => setPhaseEditValues({ ...phaseEditValues, durationMonths: event.target.value })}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phase-subpostings">Sub-postings</Label>
                        <Textarea
                          id="phase-subpostings"
                          value={phaseEditValues.subPostings}
                          onChange={(event) => setPhaseEditValues({ ...phaseEditValues, subPostings: event.target.value })}
                          rows={3}
                          className="mt-2"
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="phase-posting-schedule">Clinical posting schedule</Label>
                          <select
                            id="phase-posting-schedule"
                            value={phaseEditValues.postingScheduleId}
                            onChange={(event) => setPhaseEditValues({
                              ...phaseEditValues,
                              postingScheduleId: event.target.value,
                              postingName: "",
                            })}
                            className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="">No posting selected</option>
                            {phasePostingSchedules.map((schedule) => (
                              <option key={schedule._id} value={schedule._id}>
                                {schedule.name || "Clinical posting schedule"}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="phase-posting">Posting</Label>
                          <select
                            id="phase-posting"
                            value={phaseEditValues.postingName}
                            onChange={(event) => setPhaseEditValues({ ...phaseEditValues, postingName: event.target.value })}
                            disabled={!phaseEditValues.postingScheduleId}
                            className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                          >
                            <option value="">Choose posting</option>
                            {(phasePostingSchedules.find((schedule) => schedule._id === phaseEditValues.postingScheduleId)?.postings ?? []).map((posting) => (
                              <option key={posting.name} value={posting.name}>{posting.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={phaseEditValues.requiresPostingSchedule}
                          onChange={(event) => setPhaseEditValues({ ...phaseEditValues, requiresPostingSchedule: event.target.checked })}
                        />
                        Require a clinical posting schedule during this phase
                      </label>
                      <div>
                        <Label htmlFor="phase-timetable-source">Lecture timetable source</Label>
                        <select
                          id="phase-timetable-source"
                          value={phaseEditValues.timetablePhaseId}
                          onChange={(event) => setPhaseEditValues({ ...phaseEditValues, timetablePhaseId: event.target.value })}
                          className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="">Use this phase&apos;s timetable</option>
                          <option value="legacy">Use the existing shared timetable</option>
                          {classPhasePlan.filter((phase) => phase.id !== editingPhaseId).map((phase) => (
                            <option key={phase.id} value={phase.id}>Reuse {phase.name} timetable</option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-muted-foreground">A generated timetable is saved to the active phase unless another source is selected.</p>
                      </div>
                      <div>
                        <Label>Courses for this phase</Label>
                        {phaseCourses.length ? (
                          <div className="mt-2 grid max-h-36 gap-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-2">
                            {phaseCourses.map((course) => (
                              <label key={course._id} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={phaseEditValues.courseIds.includes(course._id)}
                                  onChange={(event) => setPhaseEditValues({
                                    ...phaseEditValues,
                                    courseIds: event.target.checked
                                      ? [...phaseEditValues.courseIds, course._id]
                                      : phaseEditValues.courseIds.filter((id) => id !== course._id),
                                  })}
                                />
                                <span>{course.code ? `${course.code} — ` : ""}{course.name}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-muted-foreground">No courses are assigned to this class. An empty selection means all class courses.</p>
                        )}
                      </div>
                      <div>
                        <Label>Learning objectives and activities</Label>
                        <div className="mt-2 grid gap-2 rounded-md border p-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <select
                              aria-label="Objective type"
                              value={newObjective.type}
                              onChange={(event) => setNewObjective({ ...newObjective, type: event.target.value as PhaseLearningObjective["type"] })}
                              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            >
                              {["tutorial", "presentation", "assignment", "research", "seminar"].map((type) => (
                                <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>
                              ))}
                            </select>
                            <select
                              aria-label="Objective course"
                              value={newObjective.courseId ?? ""}
                              onChange={(event) => setNewObjective({ ...newObjective, courseId: event.target.value || undefined })}
                              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            >
                              <option value="">No course link</option>
                              {phaseCourses.map((course) => <option key={course._id} value={course._id}>{course.name}</option>)}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              aria-label="Objective title"
                              placeholder="Objective or activity title"
                              value={newObjective.title}
                              onChange={(event) => setNewObjective({ ...newObjective, title: event.target.value })}
                            />
                            <Button
                              type="button"
                              disabled={!newObjective.title.trim()}
                              onClick={() => {
                                setPhaseEditValues({
                                  ...phaseEditValues,
                                  learningObjectives: [...phaseEditValues.learningObjectives, { ...newObjective, title: newObjective.title.trim() }],
                                });
                                setNewObjective({ type: "tutorial", title: "", courseId: "", description: "" });
                              }}
                            >
                              Add
                            </Button>
                          </div>
                          <Input
                            aria-label="Objective description"
                            placeholder="Description (optional)"
                            value={newObjective.description ?? ""}
                            onChange={(event) => setNewObjective({ ...newObjective, description: event.target.value })}
                          />
                          {phaseEditValues.learningObjectives.map((objective, index) => (
                            <div key={`${objective.type}-${objective.title}-${index}`} className="flex items-center justify-between gap-2 text-sm">
                              <span>{objective.type}: {objective.title}{objective.courseId ? ` (${phaseCourses.find((course) => course._id === objective.courseId)?.name ?? "course"})` : ""}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setPhaseEditValues({
                                  ...phaseEditValues,
                                  learningObjectives: phaseEditValues.learningObjectives.filter((_, objectiveIndex) => objectiveIndex !== index),
                                })}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-end">
                        <div>
                          <Label htmlFor="phase-color">Color</Label>
                          <input
                            id="phase-color"
                            type="color"
                            value={phaseEditValues.color}
                            onChange={(event) => setPhaseEditValues({ ...phaseEditValues, color: event.target.value })}
                            className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-800"
                          />
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button onClick={savePhaseEdit}>Save</Button>
                          <Button variant="secondary" onClick={closePhaseEditor}>Cancel</Button>
                        </div>
                      </div>
                    </div>
                  </Modal>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Click any phase card to reveal edit and reorder controls. Save when you’re done.
                    </p>
                    <Button onClick={savePhasePlan} className="w-full sm:w-auto">
                      Save phase plan
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Modal
              title="Configure class clock"
              description="Choose how you want to start the class clock for this class."
              open={isConfigureClockModalOpen}
              setOpen={setIsConfigureClockModalOpen}
              className="bg-background !left-1/2 !top-1/2 !w-[min(92vw,32rem)] !max-w-none !translate-x-[-50%] !translate-y-[-50%] !max-h-[75vh] !rounded-2xl !p-5 sm:!p-6"
            >
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Start by loading a class clock template, or create a new clock from scratch with custom phases.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button onClick={applyTemplatePhasePlan} className="w-full">
                    Use template
                  </Button>
                  <Button variant="secondary" onClick={startManualClockConfiguration} className="w-full">
                    Create manually
                  </Button>
                </div>
              </div>
            </Modal>

            <div className="mt-5 space-y-4 p-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Active Academic Year</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {activeYear ? activeYear.name : "No active academic year selected."}
                </p>
              </div>
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Start date</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {safeFormat(clockStartDate, "PPP")}
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={clockStartDate}
                      onSelect={async (date) => {
                        if (!date) return;
                        const nextPhase = getClockPhaseId(date, clockNow, classPhasePlan);
                        setClockStartDate(date);
                        setClockPhase(nextPhase);
                        await saveClockState({ clockStartDate: date, clockPhase: nextPhase });
                      }}
                      disabled={(date) =>
                        activeYear ? date > new Date(activeYear.toYear) : false
                      }
                    />
                  </PopoverContent>
                </Popover>
                <Popover open={isStartPopoverOpen} onOpenChange={setIsStartPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Play className="mr-2 h-4 w-4" /> Start clock
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={clockStartDate}
                      onSelect={async (date) => {
                        if (!date) return;
                        const nextPhase = getClockPhaseId(date, new Date(), classPhasePlan);
                        setClockStartDate(date);
                        setClockNow(date);
                        setIsClockPaused(false);
                        setClockPausedAt(null);
                        setClockPhase(nextPhase);
                        setIsStartPopoverOpen(false);
                        await saveClockState({ clockStartDate: date, clockIsPaused: false, clockPausedAt: null, clockPhase: nextPhase });
                      }}
                      disabled={(date) =>
                        activeYear ? date > new Date(activeYear.toYear) : false
                      }
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Set the academic clock start date. If there is an active academic year, this defaults to its start.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button onClick={handlePauseToggle} className="w-full">
                  {isClockPaused ? (
                    <>
                      <Play className="mr-2 h-4 w-4" /> Resume
                    </>
                  ) : (
                    <>
                      <Pause className="mr-2 h-4 w-4" /> Pause
                    </>
                  )}
                </Button>
                <Button variant="secondary" className="w-full" onClick={resetClock}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="destructive" className="w-full" onClick={handleDeleteClassClock}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete clock
                </Button>
                <Button variant="ghost" className="w-full" onClick={handleClockComplete}>
                  <Check className="mr-2 h-4 w-4" /> Mark complete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Table Component */}
      <AcademicYearTable
        data={years}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        pageNum={pageNum}
        setPageNum={setPageNum}
        totalPages={totalPages}
      />
      <AcademicYearForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingYear}
        onSuccess={fetchYears}
      />
      <CustomAlert
        handleDelete={confirmDelete}
        isOpen={isAlertOpen}
        setIsOpen={setIsAlertOpen}
        title="Delete Academic Year"
        description="Are you sure you want to delete this Academic Year? This action cannot be undone."
      />
    </div>
  );
};

export default AcademicYear;
