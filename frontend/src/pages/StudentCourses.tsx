import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronRight, BookOpen, Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
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

export default function StudentCourses() {
  const { user } = useAuth();
  const [studentClass, setStudentClass] = useState<Class | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingClass, setLoadingClass] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [classSchedule, setClassSchedule] = useState<TimetableSchedule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "subjects-high" | "subjects-low">("name-asc");
  
  const [subjectsPanelCourseId, setSubjectsPanelCourseId] = useState<string | null>(null);
  const [subjectsPanelVisible, setSubjectsPanelVisible] = useState(false);
  const [courseSummaryDialogOpen, setCourseSummaryDialogOpen] = useState(false);
  const [summaryCourse, setSummaryCourse] = useState<Course | null>(null);
  const [courseSummaryText, setCourseSummaryText] = useState<string>("");
  const [courseSummaryLoading, setCourseSummaryLoading] = useState(false);
  const [courseSummaryError, setCourseSummaryError] = useState<string | null>(null);

  
  // Fetch student's assigned class
  useEffect(() => {
    const fetchStudentClass = async () => {
      try {
        setLoadingClass(true);
        if (!user?._id) {
          setError("User not authenticated");
          return;
        }

        // Use user data from auth context, which should already have studentClasses
        const userClass = user?.studentClasses;

        if (userClass) {
          if (typeof userClass === "object" && userClass._id) {
            setStudentClass(userClass);
          } else if (typeof userClass === "string") {
            // Fetch full class details if only ID is stored
            const classData = await api.get(`/classes/${userClass}`);
            setStudentClass(classData.data);
          } else if (Array.isArray(userClass) && userClass.length > 0) {
            // If it's an array, use the first class
            const classItem = userClass[0];
            if (typeof classItem === "object" && classItem._id) {
              setStudentClass(classItem);
            }
          }
        } else {
          setError("No class assigned to your account");
        }
      } catch (err: any) {
        console.error("Failed to fetch student class:", err);
        setError("Failed to load your class assignment");
      } finally {
        setLoadingClass(false);
      }
    };

    fetchStudentClass();
  }, [user?._id, user?.studentClasses]);

  // Fetch courses for the student's class
  useEffect(() => {
    const fetchCoursesForClass = async () => {
      if (!studentClass?._id) return;

      try {
        setLoadingCourses(true);
        setError(null);
        setSelectedCourse(null);
        setSubjects([]);

        const [courseResponse, timetableResponse] = await Promise.allSettled([
          api.get(`/courses?class=${studentClass._id}&topLevel=true`),
          api.get(`/timetables/${studentClass._id}`),
        ]);

        if (courseResponse.status === "fulfilled") {
          setCourses(Array.isArray(courseResponse.value.data.courses) ? courseResponse.value.data.courses : []);
        } else {
          console.error("Failed to fetch courses:", courseResponse.reason);
          setError("Failed to load courses for your class");
          setCourses([]);
        }

        if (timetableResponse.status === "fulfilled") {
          setClassSchedule(Array.isArray(timetableResponse.value.data.schedule) ? timetableResponse.value.data.schedule : []);
        } else {
          console.warn("Unable to load class timetable:", timetableResponse.reason);
          setClassSchedule([]);
        }
      } catch (err: any) {
        console.error("Failed to fetch courses or timetable:", err);
        setError("Failed to load courses for your class");
        setCourses([]);
        setClassSchedule([]);
      } finally {
        setLoadingCourses(false);
        setLoadingSchedule(false);
      }
    };

    fetchCoursesForClass();
  }, [studentClass?._id]);

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

  // Filter and sort courses
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

      setSubjectsPanelCourseId(course._id);
      setSubjectsPanelVisible(true);
    } catch (err: any) {
      console.error("Failed to fetch subjects:", err);
      toast.error("Failed to load subjects for this course");
      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const closeSubjectsPanel = () => {
    setSubjectsPanelVisible(false);
    setSubjectsPanelCourseId(null);
  };

  const openCourseSummary = async (course: Course) => {
    setSummaryCourse(course);
    setCourseSummaryText("");
    setCourseSummaryError(null);
    setCourseSummaryLoading(true);
    setCourseSummaryDialogOpen(true);

    try {
      const { data } = await api.post("/mordred/course-summary", { courseId: course._id });
      const text = typeof data?.text === "string" ? data.text.trim() : "";
      if (text) {
        setCourseSummaryText(text);
      } else {
        setCourseSummaryText(getCourseSummaryLines(course).join("\n"));
      }
    } catch (error) {
      console.error("Failed to fetch course summary:", error);
      setCourseSummaryError("Unable to fetch MORDRED summary right now. Showing a template summary instead.");
      setCourseSummaryText(getCourseSummaryLines(course).join("\n"));
    } finally {
      setCourseSummaryLoading(false);
    }
  };

  const getCourseSummaryLines = (course: Course) => {
    const className = studentClass?.name ?? "your class";
    const departmentName = course.department?.name ? ` from the ${course.department.name} department` : "";
    const responsibleHead = course.department?.head?.name ? ` under ${course.department.head.name}` : "";
    return [
      `${course.name} (${course.code}) is a key course for ${className}${departmentName}.${course.semester ? ` It is taught in semester ${course.semester}.` : ""}`,
      `This course is designed to give you strong foundations in the subject area and support your academic progress in ${className}.`,
      `You will learn important concepts that connect your class timetable, assessments, and future study pathways.`,
      `For students in ${className}, this course helps build confidence, clarity, and readiness for related modules.`,
      `It is especially useful for understanding how your unit content applies to real class goals${responsibleHead ? `, ${responsibleHead}.` : "."}`,
      `Use this summary to see why the course matters and what makes it important for your current studies.`,
    ];
  };

  if (!user || user.role !== "student") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <div className="rounded-3xl border border-border bg-muted p-10 shadow-sm">
          <h1 className="text-2xl font-semibold">Student Courses</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This page is for students only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with Class Info */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">
            Your Class
          </p>
        </div>
        
        {loadingClass ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
          </div>
        ) : error && !studentClass ? (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : studentClass ? (
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{studentClass.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Courses and subjects available for {studentClass.name}
            </p>
          </div>
        ) : null}
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
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
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
            {subjectsPanelCourseId && subjectsPanelVisible && (
              <div className="fixed inset-0 z-40 bg-black/30" onClick={closeSubjectsPanel}>
                <div
                  className="absolute left-1/2 top-1/2 z-50 w-[min(680px,calc(100vw-48px))] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-primary/40 bg-background p-6 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{selectedCourse?.name ?? "Course subjects"}</p>
                    <p className="text-xs text-muted-foreground">{selectedCourse?.code}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={closeSubjectsPanel}>
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
            </div>
            )}
            <div className="contents">
              {filteredAndSortedCourses.map((course) => {
                return (
            <Card
              key={course._id}
              className={`cursor-pointer ${selectedCourse?._id === course._id ? "ring-2 ring-primary" : ""}`}
              data-course-id={course._id}
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
                <div className="mt-2 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full"
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
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCourseSummary(course);
                    }}
                  >
                    Course Summary
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

      <Dialog open={courseSummaryDialogOpen} onOpenChange={setCourseSummaryDialogOpen}>
        <DialogContent className="glass-card border-border/70 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Course Summary</DialogTitle>
            <DialogDescription>
              MORDRED has prepared a quick summary of why this course matters to your class.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            {courseSummaryLoading ? (
              <p>Loading course summary…</p>
            ) : courseSummaryText ? (
              courseSummaryText.split("\n").map((line, index) => (
                <p key={index}>{line}</p>
              ))
            ) : summaryCourse ? (
              getCourseSummaryLines(summaryCourse).map((line, index) => (
                <p key={index}>{line}</p>
              ))
            ) : (
              <p>Loading course summary…</p>
            )}
            {courseSummaryError && (
              <p className="text-xs text-destructive">{courseSummaryError}</p>
            )}
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={() => setCourseSummaryDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
