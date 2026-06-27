import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, CalendarIcon, Pause, Play, RotateCcw } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { academicYear, AcademicClockPhase } from "@/types";
import { api } from "@/lib/api";
import { getClockPhaseId } from "@/lib/academicClock";
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
  const [clockNow, setClockNow] = useState<Date>(new Date());
  const [isClockPaused, setIsClockPaused] = useState(false);
  const [clockPausedAt, setClockPausedAt] = useState<Date | null>(null);
  const [clockPhase, setClockPhase] = useState<AcademicClockPhase>("phase1");

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
        setCurrentAcademicYear(data);
      } catch {
        // ignore when no current year exists yet
      }
    };

    void loadActiveYear();
  }, []);

  const activeYear = currentAcademicYear || currentYear;
  const activeStartDate = clockStartDate;

  const normalizeClockUpdate = (data: {
    clockStartDate?: Date | null;
    clockIsPaused?: boolean;
    clockPausedAt?: Date | null;
    clockPhase?: AcademicClockPhase | null;
  }) => {
    const payload: Record<string, unknown> = {};

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

  const saveClockState = async (data: {
    clockStartDate?: Date | null;
    clockIsPaused?: boolean;
    clockPausedAt?: Date | null;
    clockPhase?: AcademicClockPhase | null;
  }) => {
    if (!activeYear) return;

    try {
      const payload = normalizeClockUpdate({
        ...data,
        clockPhase: data.clockPhase ?? clockPhase,
      });
      await api.patch(`/academic-years/update/${activeYear._id}`, payload);
      await fetchYears();
    } catch {
      toast.error("Failed to save clock state");
    }
  };

  useEffect(() => {
    if (!activeYear) return;

    const startDate = activeYear.clockStartDate
      ? new Date(activeYear.clockStartDate)
      : new Date(activeYear.fromYear);

    setClockStartDate(startDate);

    const nextPhase = getClockPhaseId(startDate, new Date());
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
  }, [activeYear]);

  useEffect(() => {
    if (isClockPaused) return undefined;
    const timer = window.setInterval(() => {
      const nextDate = new Date();
      setClockNow(nextDate);
      setClockPhase(getClockPhaseId(clockStartDate, nextDate));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isClockPaused, clockStartDate]);

  const handlePauseToggle = async () => {
    if (!activeYear) return;

    if (isClockPaused) {
      const resumeDate = new Date();
      const pauseDate = clockPausedAt ?? clockNow;
      const shiftMs = pauseDate
        ? resumeDate.getTime() - pauseDate.getTime()
        : 0;
      const newStartDate = new Date(clockStartDate.getTime() + shiftMs);

      const nextPhase = getClockPhaseId(newStartDate, resumeDate);

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

      const nextPhase = getClockPhaseId(clockStartDate, pauseDate);

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
    const nextPhase = getClockPhaseId(resetDate, resetDateNow);

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

  //   console.log(years);
  return (
    <div id="page-academic-years" className="p-6 space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Academic Years</h1>
          <p className="text-muted-foreground">Manage school sessions.</p>
        </div>
        <div className="flex gap-3">
          <Search search={search} setSearch={setSearch} title="Academic Year" />
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add New Year
          </Button>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.85fr]">
        <Card className="rounded-3xl border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
          <CardHeader className="gap-2 p-0">
            <CardTitle className="text-lg font-semibold">JUTH 500-Level Academic Clock</CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Track the 16-month clinical rotation timeline with a live SVG clock, start date controls, pause, and reset.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <JUTHAcademicClock
              startDate={activeStartDate}
              currentDate={clockNow}
              isPaused={isClockPaused}
              currentPhaseId={clockPhase}
            />
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
          <CardHeader className="gap-2 p-0">
            <CardTitle className="text-lg font-semibold">Clock Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-0 pt-4">
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
                    {format(clockStartDate, "PPP")}
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={clockStartDate}
                    onSelect={async (date) => {
                      if (!date) return;
                      const nextPhase = getClockPhaseId(date, clockNow);
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
