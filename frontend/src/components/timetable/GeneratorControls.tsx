import { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react"; // Added Search icon
import { api } from "@/lib/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { academicYear, Class } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useAdminClassOptions, useAdminCollection } from "@/lib/adminData";

export interface GenSettings {
  startTime: string;
  endTime: string;
  periods: number;
}

interface Props {
  onGenerate: (
    classId: string,
    yearId: string,
    settings: GenSettings
  ) => Promise<void>;
  isGenerating: boolean;
  selectedClass: string;
  setSelectedClass: (classId: string) => void;
}
const GeneratorControls = ({
  onGenerate,
  isGenerating,
  selectedClass,
  setSelectedClass,
}: Props) => {
  const { user } = useAuth();
  const hideGenerate = user?.role !== "admin";
  const [classes, setClasses] = useState<Class[]>([]);
  const [years, setYears] = useState<academicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const classesResource = useAdminClassOptions();
  const yearsResource = useAdminCollection<academicYear>(
    "admin:academic-years",
    "/academic-years",
    "years",
    ["academic-years"],
  );
  const loadingData = classesResource.isLoading || yearsResource.isLoading;
  // Time Settings
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("14:00");
  const [periods, setPeriods] = useState("5");

  useEffect(() => {
    if (classesResource.error) {
      console.error("Failed to load timetable class options", classesResource.error);
      toast.error("Failed to load class selection data");
    } else if (classesResource.data) {
      setClasses(classesResource.data as Class[]);
    }

    if (yearsResource.error) {
      console.error("Failed to load timetable academic years", yearsResource.error);
      toast.error("Failed to load academic year selection data");
    } else if (yearsResource.data) {
      setYears(yearsResource.data);
      const current = yearsResource.data.find((year) => year.isCurrent);
      if (current?._id) setSelectedYear(current._id);
    }
  }, [classesResource.data, classesResource.error, yearsResource.data, yearsResource.error]);

  const handleGenerateClick = () => {
    if (!selectedClass || !selectedYear) {
      toast.error("Please select both a Class and Academic Year");
      return;
    }
    onGenerate(selectedClass, selectedYear, {
      startTime,
      endTime,
      periods: parseInt(periods, 10) || 5,
    });
  };

  const handleClassSelect = (val: string) => {
    setSelectedClass(val);

    // Auto-detect clinical level classes and set clinical time frame
    const selectedClassData = classes.find((c) => c._id === val);
    if (selectedClassData) {
      const is500Level = /^500\s*level/i.test(selectedClassData.name);
      const is400Level = /^400\s*level/i.test(selectedClassData.name);
      if (is500Level) {
        setStartTime("10:00");
        setEndTime("13:00");
        setPeriods("3");
      } else if (is400Level) {
        setStartTime("10:00");
        setEndTime("12:00");
        setPeriods("2");
      }
    }
  };
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {hideGenerate ? "View Timetable" : "Timetable Controls"}
            </CardTitle>
            <CardDescription>
              {hideGenerate
                ? "Select a class to view its schedule"
                : "Configure constraints and generate schedule"}
            </CardDescription>
          </div>
          {isGenerating && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>AI is thinking...</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Academic Year</Label>
            <Select
              value={selectedYear}
              onValueChange={setSelectedYear}
              disabled={loadingData}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y._id} value={y._id}>
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Class</Label>
            <Select
              value={selectedClass}
              onValueChange={handleClassSelect}
              disabled={loadingData}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {!hideGenerate && (
          <>
            <div className="grid grid-cols-3 gap-4 border-t pt-4 mt-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={isGenerating}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={isGenerating}
                />
              </div>
              <div className="space-y-2">
                <Label>Periods / Day</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={periods}
                  onChange={(e) => setPeriods(e.target.value)}
                  disabled={isGenerating}
                />
              </div>
            </div>

            <Button
              className="w-full mt-2"
              onClick={handleGenerateClick}
              disabled={isGenerating || !selectedClass || !selectedYear}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Optimizing
                  Schedule...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Generate with AI
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default GeneratorControls;
