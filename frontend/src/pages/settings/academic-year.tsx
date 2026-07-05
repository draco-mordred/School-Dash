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
import { getClockPhaseId, getClassLevelPhasePlan } from "@/lib/academicClock";
import AcademicYearTable from "@/components/academic-year/academic-year-table";
import Search from "@/components/global/Search";
import AcademicYearForm from "@/components/academic-year/AcademicYearForm";
import CustomAlert from "@/components/global/CustomAlert";
import JUTHAcademicClock from "@/components/academic-clock/JUTHAcademicClock";

const AcademicYear = () => {
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
  const [selectedClockClassId, setSelectedClockClassId] = useState<string>("");
  const [clockNow, setClockNow] = useState<Date>(new Date());
  const [isClockPaused, setIsClockPaused] = useState(false);
  const [clockPausedAt, setClockPausedAt] = useState<Date | null>(null);
  const [clockPhase, setClockPhase] = useState<AcademicClockPhase>("phase1");
  const [hasClassClock, setHasClassClock] = useState<boolean>(false);
  const [selectedClockDocId, setSelectedClockDocId] = useState<string | null>(null);
  const [isStartPopoverOpen, setIsStartPopoverOpen] = useState(false);

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

    const loadClasses = async () => {
      try {
        const { data } = await api.get("/classes");
        const classList = Array.isArray(data.classes) ? data.classes : [];
        setClasses(classList);
        if (classList.length > 0 && !selectedClockClassId) {
          setSelectedClockClassId(classList[0]._id);
        }
      } catch {
        setClasses([]);
      }
    };

    void loadActiveYear();
    void loadClasses();
  }, [selectedClockClassId]);

  const activeYear = currentAcademicYear || currentYear;
  const activeStartDate = clockStartDate;
  const selectedClass = useMemo(
    () => classes.find((cls) => cls._id === selectedClockClassId) ?? null,
    [classes, selectedClockClassId],
  );
  const selectedClassPhasePlan = useMemo(
    () => getClassLevelPhasePlan(selectedClass?.name),
    [selectedClass?.name],
  );

  const getClassLevelFromName = (className?: string | null) => {
    const normalized = (className ?? "").toLowerCase();

    if (normalized.includes("500") || normalized.includes("fifth")) return "fifth";
    if (normalized.includes("400") || normalized.includes("fourth")) return "fourth";
    if (normalized.includes("300") || normalized.includes("third")) return "third";
    if (normalized.includes("600") || normalized.includes("sixth")) return "sixth";
    if (normalized.includes("final")) return "final";

    return null;
  };

  type ClassClockPayload = {
    clockStartDate?: string | null;
    clockIsPaused?: boolean;
    clockPausedAt?: string | null;
    clockPhase?: AcademicClockPhase | null;
    classLevel?: string | null;
    phaseConfig?: Record<string, { name: string; duration: number; postingType: string | null; postingId: string | null }>;
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
  }): ClassClockPayload => {
    const payload = normalizeClockUpdate({
      ...data,
      clockPhase: data.clockPhase ?? clockPhase,
    });

    const phaseConfig = selectedClassPhasePlan.reduce<Record<string, { name: string; duration: number; postingType: string | null; postingId: string | null }>>((acc, phase) => {
      acc[phase.id] = {
        name: phase.name,
        duration: phase.durationMonths,
        postingType: null,
        postingId: null,
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
  }) => {
    if (!activeYear) return;

    const activeYearId = activeYear ? (activeYear._id ?? (activeYear.id ?? undefined)) : undefined;
    if (!activeYearId) return;

    try {
      const payload = buildClassClockPayload({
        ...data,
        clockPhase: data.clockPhase ?? clockPhase,
      });

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
    } catch {
      toast.error("Failed to save clock state");
    }
  };

  // When current academic year or selected class changes, load class-specific clock data
  useEffect(() => {
    const loadSelectedClassClock = async () => {
      const ayId = currentAcademicYear ? (currentAcademicYear._id ?? currentAcademicYear.id ?? undefined) : undefined;
      if (!ayId || !selectedClockClassId) {
        setSelectedClockDocId(null);
        setHasClassClock(false);
        return;
      }

      try {
        const { data } = await api.get(`/academic-clocks?academicYearId=${ayId}&classId=${selectedClockClassId}`);
        const existingClock = Array.isArray(data?.clocks) ? data.clocks[0] : null;

        if (existingClock) {
          setSelectedClockDocId(existingClock._id);
          setHasClassClock(true);
          setClockStartDate(existingClock.clockStartDate ? new Date(existingClock.clockStartDate) : new Date(currentAcademicYear.fromYear));
          setIsClockPaused(Boolean(existingClock.clockIsPaused));
          setClockPausedAt(existingClock.clockPausedAt ? new Date(existingClock.clockPausedAt) : null);
          setClockPhase((existingClock.clockPhase as AcademicClockPhase) ?? getClockPhaseId(
            existingClock.clockStartDate ? new Date(existingClock.clockStartDate) : new Date(currentAcademicYear.fromYear),
            new Date(),
            selectedClassPhasePlan,
          ));
          return;
        }
      } catch {
        // fall back to the saved academic-year class clock data below
      }

      const classData = (currentAcademicYear as academicYear & { classClockData?: Record<string, ClassClockPayload> }).classClockData
        ? (currentAcademicYear as academicYear & { classClockData?: Record<string, ClassClockPayload> }).classClockData?.[selectedClockClassId]
        : undefined;

      if (classData) {
        setSelectedClockDocId(null);
        setHasClassClock(true);
        setClockStartDate(classData.clockStartDate ? new Date(classData.clockStartDate) : new Date(currentAcademicYear.fromYear));
        setIsClockPaused(Boolean(classData.clockIsPaused));
        setClockPausedAt(classData.clockPausedAt ? new Date(classData.clockPausedAt) : null);
        setClockPhase((classData.clockPhase as AcademicClockPhase) ?? getClockPhaseId(
          classData.clockStartDate ? new Date(classData.clockStartDate) : new Date(currentAcademicYear.fromYear),
          new Date(),
          selectedClassPhasePlan,
        ));
      } else {
        setSelectedClockDocId(null);
        setHasClassClock(false);
        setClockStartDate(new Date(currentAcademicYear.fromYear));
        setIsClockPaused(false);
        setClockPausedAt(null);
        setClockPhase("phase1");
      }
    };

    void loadSelectedClassClock();
  }, [currentAcademicYear, selectedClockClassId, selectedClassPhasePlan]);

  useEffect(() => {
    if (!activeYear) return;

    const startDate = activeYear.clockStartDate
      ? new Date(activeYear.clockStartDate)
      : new Date(activeYear.fromYear);

    setClockStartDate(startDate);

    const nextPhase = getClockPhaseId(startDate, new Date(), selectedClassPhasePlan);
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
  }, [activeYear, selectedClassPhasePlan]);

  useEffect(() => {
    if (isClockPaused) return undefined;
    const timer = window.setInterval(() => {
      const nextDate = new Date();
      setClockNow(nextDate);
      setClockPhase(getClockPhaseId(clockStartDate, nextDate, selectedClassPhasePlan));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isClockPaused, clockStartDate, selectedClassPhasePlan]);

  const handlePauseToggle = async () => {
    if (!activeYear) return;

    if (isClockPaused) {
      const resumeDate = new Date();
      const pauseDate = clockPausedAt ?? clockNow;
      const shiftMs = pauseDate
        ? resumeDate.getTime() - pauseDate.getTime()
        : 0;
      const newStartDate = new Date(clockStartDate.getTime() + shiftMs);

      const nextPhase = getClockPhaseId(newStartDate, resumeDate, selectedClassPhasePlan);

      setClockStartDate(newStartDate);
      setClockNow(resumeDate);
      setIsClockPaused(false);
      setClockPausedAt(null);
      setClockPhase(nextPhase);

      await saveClockState({
        clockStartDate: newStartDate,
        clockIsPaused: false,
        clockPausedAt: null,
        clockPhase: nextPhase,
      });
    } else {
      const pauseDate = new Date();

      const nextPhase = getClockPhaseId(clockStartDate, pauseDate, selectedClassPhasePlan);

      setClockNow(pauseDate);
      setIsClockPaused(true);
      setClockPausedAt(pauseDate);
      setClockPhase(nextPhase);

      await saveClockState({
        clockIsPaused: true,
        clockPausedAt: pauseDate,
        clockPhase: nextPhase,
      });
    }
  };

  const resetClock = async () => {
    const resetDate = activeYear
      ? new Date(activeYear.fromYear)
      : new Date();

    const resetDateNow = new Date();
    const nextPhase = getClockPhaseId(resetDate, resetDateNow, selectedClassPhasePlan);

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
      const lastPhase = selectedClassPhasePlan[selectedClassPhasePlan.length - 1];
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
                  Track the class-level clinical rotation timeline with a live SVG clock and controls.
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
            {hasClassClock ? (
              <JUTHAcademicClock
                startDate={activeStartDate}
                currentDate={clockNow}
                isPaused={isClockPaused}
                currentPhaseId={clockPhase}
                phasePlan={selectedClassPhasePlan}
                onComplete={handleClockComplete}
              />
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">No class clock configured for the selected class.</div>
            )}

            {/* Controls moved into the clock card */}
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
                        const nextPhase = getClockPhaseId(date, clockNow, selectedClassPhasePlan);
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
                        const nextPhase = getClockPhaseId(date, new Date(), selectedClassPhasePlan);
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
