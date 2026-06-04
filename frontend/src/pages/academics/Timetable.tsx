import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/AuthProvider";
import type { schedule } from "@/types";
import GeneratorControls, {
  type GenSettings,
} from "@/components/timetable/GeneratorControls";
import TimetableGrid from "@/components/timetable/TimetableGrid";

const Timetable = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isStudent = user?.role === "student";

  const [scheduleData, setScheduleData] = useState<schedule[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");

  // fetch timetable
  const fetchTimetable = async (classId: string) => {
    if (!classId) return;

    try {
      const { data } = await api.get(`/timetables/${classId}`);
      setScheduleData(data.schedule || []);
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        setScheduleData([]);
        if (!isAdmin) {
          // Only show toast if user isn't admin (admins expect empty on new classes)
          toast("No schedule found for this class", { icon: "📅" });
        }
      } else {
        toast.error("Failed to load timetable");
      }
    } finally {
      setLoadingSchedule(false);
    }
  };

  // auto fetch using useEffect
  useEffect(() => {
    if (selectedClass) {
      fetchTimetable(selectedClass);
    }
  }, [selectedClass]);

  const handleGenerate = async (
    selectedClass: string,
    yearId: string,
    settings: GenSettings
  ) => {
    try {
      setIsGenerating(true);
      // sorry about that, we should be passing classId instead of selectedClass, now that won't work coz class is not assigned teachers and subjects
      const { data } = await api.post("/timetables/generate", {
        classId: selectedClass,
        academicYearId: yearId,
        settings,
      });

      toast.success(data.message || "AI Generation Started");

      // Poll for updates (simple version)
      setTimeout(() => {
        fetchTimetable(selectedClass);
        setIsGenerating(false);
        toast.success("Schedule refreshed!");
      }, 5000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Generation failed");
      setIsGenerating(false);
    }
  };
  //   console.log("class timetable:", scheduleData);
  //   console.log("selected class:", selectedClass);
  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Timetable Management
        </h1>
        <p className="text-muted-foreground">
          {isStudent
            ? "View your weekly class schedule."
            : "View or manage weekly schedules."}
        </p>
      </div>
      {!isStudent && (
        <GeneratorControls
          onGenerate={handleGenerate}
          onClassChange={fetchTimetable}
          isGenerating={isGenerating}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
        />
      )}
      <TimetableGrid schedule={scheduleData} isLoading={loadingSchedule} />
    </div>
  );
};

export default Timetable;
