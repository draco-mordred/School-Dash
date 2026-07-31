import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  getClassLevelPhasePlan,
  getClockPhaseId,
  type AcademicClockPhaseDefinition,
} from "@/lib/academicClock";
import type { schedule, period, courses } from "@/types";
import GeneratorControls, {
  type GenSettings,
} from "@/components/timetable/GeneratorControls";
import TimetableGrid from "@/components/timetable/TimetableGrid";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Modal from "@/components/global/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pencil,
  Trash2,
  Plus,
  X,
  Clock3,
  CalendarDays,
  Activity,
} from "lucide-react";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

type EditingPeriod = {
  dayIndex: number;
  periodIndex: number;
  period: period;
} | null;

type NewPeriod = {
  day: string;
  subject: string;
  lecturer: string;
  startTime: string;
  endTime: string;
};

type SelectedClassInfo = {
  name: string;
  academicYear: string;
  academicYearId?: string;
};

const parseTimeToMinutes = (time: string) => {
  if (!time || typeof time !== "string") return Number.POSITIVE_INFINITY;
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return Number.POSITIVE_INFINITY;
  }
  return hour * 60 + minute;
};

const formatClockTime = (value: string | undefined) => {
  if (!value) return "—";
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const Timetable = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isStudent = user?.role === "student";
  const isParent = user?.role === "parent";

  const [scheduleData, setScheduleData] = useState<schedule[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [selectedClassInfo, setSelectedClassInfo] =
    useState<SelectedClassInfo | null>(null);
  const [currentPostingTitle, setCurrentPostingTitle] = useState<string | null>(
    null,
  );
  const [postingScheduleAvailable, setPostingScheduleAvailable] =
    useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [clinicalEventsToday, setClinicalEventsToday] = useState<any[]>([]);

  // Parent: classes of linked children (multiple)
  const [parentChildrenClasses, setParentChildrenClasses] = useState<
    {
      classId: string;
      className: string;
      academicYear: string;
      classTeacher: string;
      schedule: schedule[];
    }[]
  >([]);
  const [loadingParentTimetables, setLoadingParentTimetables] = useState(false);

  // Period management state
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [editingPeriod, setEditingPeriod] = useState<EditingPeriod>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newPeriod, setNewPeriod] = useState<NewPeriod>({
    day: DAYS[0],
    subject: "",
    lecturer: "",
    startTime: "08:00",
    endTime: "08:45",
  });
  const [saving, setSaving] = useState(false);

  // Data for selectors
  const [coursesList, setCoursesList] = useState<courses[]>([]);
  const [lecturers, setLecturers] = useState<{ _id: string; name: string }[]>(
    [],
  );
  const [loadingData, setLoadingData] = useState(false);

  const fetchTimetable = async (classId: string) => {
    if (!classId) return;

    try {
      setLoadingSchedule(true);
      const { data } = await api.get(`/timetables/${classId}`);
      setScheduleData(data.schedule || []);
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        setScheduleData([]);
        if (!isAdmin) {
          toast("No schedule found for this class", { icon: "📅" });
        }
      } else {
        toast.error("Failed to load timetable");
      }
    } finally {
      setLoadingSchedule(false);
    }
  };

  const resolveCurrentPostingTitleFromClock = (
    clock: any,
    className?: string | null,
  ) => {
    const classLevelPlan = getClassLevelPhasePlan(
      clock?.classLevel ?? className ?? "",
    );

    const phaseConfigPlan: AcademicClockPhaseDefinition[] = (() => {
      if (Array.isArray(clock?.phaseConfig)) {
        return clock.phaseConfig.map((phase: any, index: number) => ({
          id: phase?.id ?? `phase${index + 1}`,
          name: phase?.name ?? `Phase ${index + 1}`,
          durationMonths: Number.isFinite(phase?.durationMonths)
            ? phase.durationMonths
            : 1,
          color: phase?.color ?? "#3B82F6",
          subPostings: Array.isArray(phase?.subPostings)
            ? phase.subPostings.filter(Boolean)
            : [],
        }));
      }

      if (clock?.phaseConfig && typeof clock.phaseConfig === "object") {
        return Object.entries(clock.phaseConfig)
          .filter(([key]) => typeof key === "string")
          .map(([key, phase], index) => ({
            id: String(key),
            name: phase?.name ?? `Phase ${index + 1}`,
            durationMonths: Number.isFinite(phase?.duration)
              ? phase.duration
              : 1,
            color: phase?.color ?? "#3B82F6",
            subPostings: Array.isArray(phase?.subPostings)
              ? phase.subPostings.filter(Boolean)
              : [],
          }));
      }

      return [];
    })();

    const phasePlan =
      phaseConfigPlan.length > 0 ? phaseConfigPlan : classLevelPlan;
    let activePhaseId: string | null = null;

    if (clock?.clockStartDate && phasePlan.length > 0) {
      const startDate =
        clock.clockStartDate instanceof Date
          ? clock.clockStartDate
          : new Date(clock.clockStartDate);
      if (!Number.isNaN(startDate.getTime())) {
        activePhaseId = getClockPhaseId(startDate, new Date(), phasePlan);
      }
    }

    if (
      !activePhaseId &&
      typeof clock?.clockPhase === "string" &&
      clock.clockPhase
    ) {
      activePhaseId = clock.clockPhase;
    }

    if (!activePhaseId) {
      activePhaseId = phasePlan[0]?.id ?? null;
    }

    const phaseDefinition = phasePlan.find(
      (phase) => phase.id === activePhaseId,
    );
    return (
      phaseDefinition?.name ??
      (activePhaseId ? `Phase ${activePhaseId.replace("phase", "")}` : null)
    );
  };

  useEffect(() => {
    if (selectedClass) {
      fetchTimetable(selectedClass);
    }
  }, [selectedClass]);

  // Auto-select student's own class on mount
  useEffect(() => {
    if (isStudent && user) {
      const raw = user.studentClasses ?? (user as any).studentClass;
      const classId = typeof raw === "object" ? raw?._id : raw;
      if (classId && !selectedClass) {
        setSelectedClass(typeof classId === "string" ? classId : "");
      }
    }
  }, [isStudent, user]);

  useEffect(() => {
    if (!isStudent || !selectedClass) {
      setClinicalEventsToday([]);
      return;
    }

    const loadClinicalHighlights = async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      try {
        const { data } = await api.get("/rotation-schedules/events", {
          params: {
            classId: selectedClass,
            start: start.toISOString(),
            end: end.toISOString(),
          },
        });
        setClinicalEventsToday(Array.isArray(data?.events) ? data.events : []);
      } catch {
        setClinicalEventsToday([]);
      }
    };

    void loadClinicalHighlights();
  }, [isStudent, selectedClass]);

  // Fetch student's class name + academic year
  useEffect(() => {
    if (!selectedClass) {
      setSelectedClassInfo(null);
      setCurrentPostingTitle(null);
      setPostingScheduleAvailable(false);
      return;
    }

    const fetchClassInfo = async () => {
      try {
        const { data } = await api.get(`/classes/${selectedClass}`);
        const academicYearId =
          typeof data.academicYear === "string"
            ? data.academicYear
            : data.academicYear?._id;

        setSelectedClassInfo({
          name: data.name ?? "—",
          academicYear: data.academicYear?.name ?? "—",
          academicYearId,
        });

        const clockParams = new URLSearchParams();
        if (academicYearId)
          clockParams.append("academicYearId", academicYearId);
        clockParams.append("classId", selectedClass);

        const [clockRes, postingRes] = await Promise.all([
          api
            .get(`/academic-clocks?${clockParams.toString()}`)
            .catch(() => ({ data: null })),
          api
            .get("/rotation-schedules", {
              params: { classId: selectedClass, limit: 1 },
            })
            .catch(() => ({ data: null })),
        ]);

        const clockData = (() => {
          const raw = clockRes.data;
          if (!raw) return null;
          if (Array.isArray(raw)) return raw[0] ?? null;
          if (raw?.data && Array.isArray(raw.data)) return raw.data[0] ?? null;
          if (raw?.clocks && Array.isArray(raw.clocks))
            return raw.clocks[0] ?? null;
          if (raw?.academicClocks && Array.isArray(raw.academicClocks))
            return raw.academicClocks[0] ?? null;
          return raw;
        })();

        setCurrentPostingTitle(
          resolveCurrentPostingTitleFromClock(clockData, data.name ?? ""),
        );

        const rotations = (() => {
          const raw = postingRes.data;
          if (!raw) return [];
          if (Array.isArray(raw)) return raw;
          if (raw?.schedules && Array.isArray(raw.schedules))
            return raw.schedules;
          return [];
        })();

        setPostingScheduleAvailable(
          Array.isArray(rotations) && rotations.length > 0,
        );
      } catch {
        setCurrentPostingTitle(null);
        setPostingScheduleAvailable(false);
      }
    };

    void fetchClassInfo();
  }, [selectedClass]);

  // Fetch timetables for parent's linked children's classes
  useEffect(() => {
    if (!isParent || !user) return;
    const parentStudentIds = (user.parentStudents ?? [])
      .map((s) => (typeof s === "object" ? (s as { _id?: string })._id : s))
      .filter(Boolean);
    if (parentStudentIds.length === 0) return;

    const fetchParentTimetables = async () => {
      setLoadingParentTimetables(true);
      try {
        const classMap = new Map<
          string,
          { className: string; academicYear: string; classTeacher: string }
        >();
        const scheduleMap = new Map<string, schedule[]>();

        // Fetch each student's class details and timetable sequentially to avoid overwhelming the server
        for (const studentId of parentStudentIds) {
          try {
            const studentRes = await api.get(`/users/${studentId}`);
            const student = studentRes.data;
            if (!student) continue;

            const rawClass = student.studentClasses;
            const classId =
              typeof rawClass === "object" && rawClass !== null
                ? (rawClass as { _id?: string })._id
                : typeof rawClass === "string"
                  ? rawClass
                  : null;
            if (!classId) continue;

            if (!classMap.has(classId)) {
              try {
                const clsRes = await api.get(`/classes/${classId}`);
                const cls = clsRes.data;
                classMap.set(classId, {
                  className: cls?.name ?? "—",
                  academicYear: cls?.academicYear?.name ?? "—",
                  classTeacher: cls?.classTeacher?.name ?? "—",
                });
              } catch {
                /* silent */
              }
            }

            try {
              const ttRes = await api.get(`/timetables/${classId}`);
              scheduleMap.set(classId, ttRes.data?.schedule ?? []);
            } catch {
              /* silent */
            }
          } catch {
            /* silent */
          }
        }

        const result = Array.from(classMap.entries())
          .map(([classId, info]) => ({
            classId,
            className: info.className,
            academicYear: info.academicYear,
            classTeacher: info.classTeacher,
            schedule: scheduleMap.get(classId) ?? [],
          }))
          .sort((a, b) => a.className.localeCompare(b.className));

        setParentChildrenClasses(result);
      } catch {
        /* silent */
      } finally {
        setLoadingParentTimetables(false);
      }
    };

    void fetchParentTimetables();
  }, [isParent, user]);

  const fetchCoursesAndLecturers = async () => {
    try {
      setLoadingData(true);
      const [coursesRes, usersRes] = await Promise.all([
        api.get("/courses?page=1&limit=500"),
        api.get("/users?page=1&limit=500"),
      ]);
      setCoursesList(coursesRes.data.courses ?? []);
      const allUsers: any[] = usersRes.data.users ?? [];
      setLecturers(
        allUsers
          .filter((u) => u.role === "teacher" || u.role === "admin")
          .map((u) => ({ _id: u._id, name: u.name })),
      );
    } catch {
      toast.error("Failed to load courses and teachers");
    } finally {
      setLoadingData(false);
    }
  };

  const handleOpenManage = (open: boolean) => {
    setManageOpen(open);
    if (open) {
      void fetchCoursesAndLecturers();
    }
  };

  const selectedDayIndex = useMemo(
    () => DAYS.findIndex((d) => d.toLowerCase() === selectedDay.toLowerCase()),
    [selectedDay],
  );

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString("en-US", { weekday: "long" });
  }, []);

  const selectedDaySchedule = useMemo(() => {
    if (selectedDayIndex < 0) return null;
    return scheduleData.find(
      (s) => s.day.toLowerCase() === DAYS[selectedDayIndex].toLowerCase(),
    );
  }, [scheduleData, selectedDayIndex]);

  const todaySchedule = useMemo(() => {
    return scheduleData.find((s) => s.day.toLowerCase() === todayLabel.toLowerCase()) ?? null;
  }, [scheduleData, todayLabel]);

  const currentTimeMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);

  const currentTimetableActivity = useMemo(() => {
    if (!todaySchedule?.periods?.length) return null;
    return todaySchedule.periods.find((period) => {
      const start = parseTimeToMinutes(period.startTime);
      const end = parseTimeToMinutes(period.endTime);
      return Number.isFinite(start) && Number.isFinite(end) && currentTimeMinutes >= start && currentTimeMinutes < end;
    }) ?? null;
  }, [currentTimeMinutes, todaySchedule]);

  const nextTimetableActivity = useMemo(() => {
    if (!todaySchedule?.periods?.length) return null;
    return [...todaySchedule.periods]
      .filter((period) => parseTimeToMinutes(period.startTime) > currentTimeMinutes)
      .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime))[0] ?? null;
  }, [currentTimeMinutes, todaySchedule]);

  const nextClinicalEvent = useMemo(() => {
    const now = new Date().getTime();
    return [...clinicalEventsToday]
      .filter((event) => new Date(event.startDate).getTime() >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0] ?? null;
  }, [clinicalEventsToday]);

  const currentTimeLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }, []);

  const handleAddPeriod = async () => {
    if (
      !newPeriod.subject ||
      !newPeriod.lecturer ||
      !newPeriod.startTime ||
      !newPeriod.endTime
    ) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      setSaving(true);
      await api.post(`/timetables/${selectedClass}/periods`, {
        day: newPeriod.day,
        period: {
          subject: newPeriod.subject,
          lecturer: newPeriod.lecturer,
          startTime: newPeriod.startTime,
          endTime: newPeriod.endTime,
        },
      });
      toast.success("Period added");
      setAddingNew(false);
      setNewPeriod({
        day: DAYS[0],
        subject: "",
        lecturer: "",
        startTime: "08:00",
        endTime: "08:45",
      });
      await fetchTimetable(selectedClass);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to add period");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePeriod = async () => {
    if (!editingPeriod) return;
    try {
      setSaving(true);
      await api.put(`/timetables/${selectedClass}/periods`, {
        dayIndex: editingPeriod.dayIndex,
        periodIndex: editingPeriod.periodIndex,
        period: {
          subject: editingPeriod.period.subject,
          lecturer: editingPeriod.period.lecturer,
          startTime: editingPeriod.period.startTime,
          endTime: editingPeriod.period.endTime,
        },
      });
      toast.success("Period updated");
      setEditingPeriod(null);
      await fetchTimetable(selectedClass);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to update period");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePeriod = async (dayIndex: number, periodIndex: number) => {
    try {
      setSaving(true);
      await api.delete(`/timetables/${selectedClass}/periods`, {
        data: { dayIndex, periodIndex },
      });
      toast.success("Period deleted");
      await fetchTimetable(selectedClass);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to delete period");
    } finally {
      setSaving(false);
    }
  };

  const cloneStylesForPrint = () => {
    const styles: string[] = [];
    // copy link[rel=stylesheet] and style tags
    document
      .querySelectorAll('link[rel="stylesheet"], style')
      .forEach((node) => {
        styles.push((node as HTMLElement).outerHTML);
      });
    return styles.join("\n");
  };

  const openPrintWindowWithContent = (htmlContent: string) => {
    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) {
      toast.error("Popup blocked. Allow popups to download PDF.");
      return;
    }
    const styles = cloneStylesForPrint();
    printWindow.document.write(
      `<!doctype html><html><head><meta charset=\"utf-8\">${styles}</head><body>${htmlContent}</body></html>`,
    );
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      // don't automatically close so user can save; close after a delay to be safe
      setTimeout(() => printWindow.close(), 2000);
    }, 500);
  };

  const handleDownloadTimetable = () => {
    const el = document.getElementById("timetable-printable");
    if (!el) {
      toast.error("No timetable content to print");
      return;
    }
    openPrintWindowWithContent(el.outerHTML);
  };

  const handleDownloadTimetableForId = (id: string) => {
    const el =
      document.getElementById(`timetable-printable-${id}`) ||
      document.getElementById(`timetable-${id}`);
    if (!el) {
      toast.error("Timetable not found");
      return;
    }
    openPrintWindowWithContent(el.outerHTML);
  };

  const handleGenerate = async (
    selectedClass: string,
    yearId: string,
    settings: GenSettings,
  ) => {
    try {
      setIsGenerating(true);
      const { data } = await api.post("/timetables/generate", {
        classId: selectedClass,
        academicYearId: yearId,
        // Send live clockPhase so backend can stay in sync with the AcademicClock.
        // Backend will still prefer AcademicYear.clockPhase when present.
        // If AcademicYear.clockPhase is missing/empty, backend will use this value.
        clockPhase: (settings as any)?.clockPhase,
        settings: {
          ...settings,
          fast: true,
        },
      });

      toast.success(data.message || "AI Generation Started");

      const pollInterval = 3000;
      const maxAttempts = 20;
      let attempts = 0;

      const poll = async () => {
        attempts += 1;
        try {
          const { data: refreshed } = await api.get(
            `/timetables/${selectedClass}`,
          );
          const sched = refreshed?.schedule ?? [];
          const hasPeriod = sched.some(
            (d: any) => Array.isArray(d.periods) && d.periods.length > 0,
          );
          if (hasPeriod) {
            setScheduleData(sched);
            setIsGenerating(false);
            toast.success("Schedule refreshed!");
            return;
          }
        } catch (err: any) {
          // ignore 404 while generating
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, pollInterval);
        } else {
          fetchTimetable(selectedClass);
          setIsGenerating(false);
          toast.error(
            "Timed out waiting for generated schedule. Check back later.",
          );
        }
      };

      setTimeout(poll, pollInterval);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Generation failed");
      setIsGenerating(false);
    }
  };

  return (
    <div
      data-tour="student-timetable"
      id="page-timetable"
      className="p-4 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Timetable Management
          </h1>
          <p className="text-muted-foreground">
            {isStudent && selectedClassInfo
              ? `${selectedClassInfo.name} · Academic Year ${selectedClassInfo.academicYear}`
              : isStudent
                ? "View your weekly class schedule."
                : isParent
                  ? "View your children's class schedules."
                  : "View or manage weekly schedules."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenManage(true)}
            >
              Manage Periods
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadTimetable()}
          >
            Save timetable
          </Button>
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
        </div>
      </div>

      {/* Parent: show multiple class timetable cards */}
      {isParent ? (
        loadingParentTimetables ? (
          <div className="h-64 w-full flex items-center justify-center border rounded-lg bg-card">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-muted-foreground text-sm">
                Loading timetables...
              </p>
            </div>
          </div>
        ) : parentChildrenClasses.length === 0 ? (
          <div className="h-40 w-full flex flex-col items-center justify-center border rounded-lg border-dashed bg-card">
            <p className="text-muted-foreground text-sm">
              No linked class timetables found.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {parentChildrenClasses.map((cls) => (
              <div
                key={cls.classId}
                id={`timetable-${cls.classId}`}
                className="border rounded-lg overflow-hidden"
              >
                <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-base">{cls.className}</h3>
                    <p className="text-xs text-muted-foreground">
                      Academic Year {cls.academicYear} · Class Teacher:{" "}
                      {cls.classTeacher}
                    </p>
                  </div>
                  <div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownloadTimetableForId(cls.classId)}
                    >
                      Save timetable
                    </Button>
                  </div>
                </div>
                <div id={`timetable-printable-${cls.classId}`} className="p-3">
                  <TimetableGrid schedule={cls.schedule} isLoading={false} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          {!isStudent && (
            <GeneratorControls
              onGenerate={handleGenerate}
              onClassChange={fetchTimetable}
              isGenerating={isGenerating}
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
            />
          )}

          {isStudent && (
            <div className="grid gap-3 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Clock3 className="h-4 w-4 text-primary" />
                    Current activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p className="font-medium text-foreground">
                    {currentTimetableActivity?.subject?.name ?? currentTimetableActivity?.displayLabel ?? "No active timetable activity"}
                  </p>
                  <p className="text-muted-foreground">
                    {currentTimetableActivity
                      ? `${formatClockTime(currentTimetableActivity.startTime)} – ${formatClockTime(currentTimetableActivity.endTime)} · as of ${currentTimeLabel}`
                      : `No timetable activity is running right now (${currentTimeLabel}).`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Next scheduled activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">
                        {nextTimetableActivity?.subject?.name ?? nextTimetableActivity?.displayLabel ?? "No upcoming lecture"}
                      </p>
                      <p className="text-muted-foreground">
                        {nextTimetableActivity
                          ? `${formatClockTime(nextTimetableActivity.startTime)} – ${formatClockTime(nextTimetableActivity.endTime)}`
                          : "No lecture is scheduled later today."}
                      </p>
                    </div>
                  </div>

                  {nextClinicalEvent ? (
                    <div className="flex items-start gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">
                          {nextClinicalEvent.postingName ?? "Clinical activity"}
                        </p>
                        <p className="text-muted-foreground">
                          {new Date(nextClinicalEvent.startDate).toLocaleString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No new clinical activity is scheduled for today.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="mb-4 space-y-1">
            {currentPostingTitle ? (
              <p className="text-sm font-medium">
                Current posting: {currentPostingTitle}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Clinical posting schedule:{" "}
              {postingScheduleAvailable ? "Available" : "Unavailable"}
            </p>
          </div>

          <div id="timetable-printable">
            <TimetableGrid
              schedule={scheduleData}
              isLoading={loadingSchedule}
              currentPostingTitle={currentPostingTitle}
              postingScheduleAvailable={postingScheduleAvailable}
            />
          </div>
        </>
      )}

      {/* Manage Periods Modal */}
      <Modal
        open={manageOpen}
        setOpen={handleOpenManage}
        title="Manage Timetable Periods"
        description="Add, edit, or delete periods for a specific day."
      >
        <div className="space-y-4">
          {/* Day selector */}
          <div className="space-y-2">
            <Label>Day</Label>
            <Select
              value={selectedDay}
              onValueChange={(v) => {
                setSelectedDay(v);
                setAddingNew(false);
                setEditingPeriod(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((day) => (
                  <SelectItem key={day} value={day}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Periods list for selected day */}
          <div className="space-y-2 max-h-[40vh] overflow-auto">
            {selectedDaySchedule && selectedDaySchedule.periods.length > 0 ? (
              selectedDaySchedule.periods.map((p, i) => (
                <div
                  key={p._id ?? i}
                  className="flex items-center justify-between gap-3 border rounded-md p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">
                      {typeof p.subject === "string"
                        ? p.subject
                        : p.subject?.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.startTime} – {p.endTime}
                      {(p as any).lecturer?.name &&
                        ` · ${(p as any).lecturer.name}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingPeriod({
                          dayIndex: selectedDayIndex,
                          periodIndex: i,
                          period: { ...p },
                        });
                        setAddingNew(false);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePeriod(selectedDayIndex, i)}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No periods scheduled for {selectedDay}.
              </p>
            )}
          </div>

          {/* Edit period form */}
          {editingPeriod && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Edit Period</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingPeriod(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select
                  value={editingPeriod.period.subject?._id ?? ""}
                  onValueChange={(v) =>
                    setEditingPeriod((prev) =>
                      prev
                        ? {
                            ...prev,
                            period: {
                              ...prev.period,
                              subject: { _id: v, name: "", code: "" },
                            },
                          }
                        : null,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {coursesList.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lecturer</Label>
                <Select
                  value={editingPeriod.period.lecturer?._id ?? ""}
                  onValueChange={(v) =>
                    setEditingPeriod((prev) =>
                      prev
                        ? {
                            ...prev,
                            period: {
                              ...prev.period,
                              lecturer: { _id: v, name: "", email: "" },
                            },
                          }
                        : null,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lecturer" />
                  </SelectTrigger>
                  <SelectContent>
                    {lecturers.map((l) => (
                      <SelectItem key={l._id} value={l._id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={editingPeriod.period.startTime}
                    onChange={(e) =>
                      setEditingPeriod((prev) =>
                        prev
                          ? {
                              ...prev,
                              period: {
                                ...prev.period,
                                startTime: e.target.value,
                              },
                            }
                          : null,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={editingPeriod.period.endTime}
                    onChange={(e) =>
                      setEditingPeriod((prev) =>
                        prev
                          ? {
                              ...prev,
                              period: {
                                ...prev.period,
                                endTime: e.target.value,
                              },
                            }
                          : null,
                      )
                    }
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => void handleUpdatePeriod()}
                disabled={saving}
              >
                {saving ? "Saving..." : "Update Period"}
              </Button>
            </div>
          )}

          {/* Add new period */}
          {addingNew ? (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Add Period</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setAddingNew(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Day</Label>
                <Select
                  value={newPeriod.day}
                  onValueChange={(v) => setNewPeriod((p) => ({ ...p, day: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select
                  value={newPeriod.subject}
                  onValueChange={(v) =>
                    setNewPeriod((p) => ({ ...p, subject: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {coursesList.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lecturer</Label>
                <Select
                  value={newPeriod.lecturer}
                  onValueChange={(v) =>
                    setNewPeriod((p) => ({ ...p, lecturer: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lecturer" />
                  </SelectTrigger>
                  <SelectContent>
                    {lecturers.map((l) => (
                      <SelectItem key={l._id} value={l._id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={newPeriod.startTime}
                    onChange={(e) =>
                      setNewPeriod((p) => ({ ...p, startTime: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={newPeriod.endTime}
                    onChange={(e) =>
                      setNewPeriod((p) => ({ ...p, endTime: e.target.value }))
                    }
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => void handleAddPeriod()}
                disabled={saving}
              >
                {saving ? "Adding..." : "Add Period"}
              </Button>
            </div>
          ) : (
            !editingPeriod && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setAddingNew(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Period
              </Button>
            )
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Timetable;
