import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useCourseCardAnimations } from "@/hooks/useCourseCardAnimations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, BookOpen, Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Student {
  _id: string;
  name: string;
  studentClasses?: Class | string;
}

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

export default function ParentCourses() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [classSchedule, setClassSchedule] = useState<TimetableSchedule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "subjects-high" | "subjects-low">("name-asc");
  const [subjectsPanelCourseId, setSubjectsPanelCourseId] = useState<string | null>(null);

  const {
    animationState,
    cardRefs,
    handleCourseHover,
    handleCourseHoverEnd,
    updateCardPointer,
    applyExpandedCardTransform,
    startCollapse,
    cleanup,
  } = useCourseCardAnimations();

  const { hoveredCourseId, pulsingCourseId, expandedCourseId, showExpandedActions, subjectsPanelVisible, subjectsPanelPosition } = animationState;

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Fetch parent's children
  useEffect(() => {
    const fetchParentChildren = async () => {
      try {
        setLoadingChildren(true);
        if (!user?._id) {
          setError("User not authenticated");
          return;
        }

        // Use user data from auth context, which should already have parentStudents
        const parentStudents = user?.parentStudents;

        if (Array.isArray(parentStudents) && parentStudents.length > 0) {
          setChildren(parentStudents);
          if (parentStudents[0]._id) {
            setSelectedChildId(parentStudents[0]._id);
          }
        } else {
          setError("No children linked to your account");
          setChildren([]);
        }
      } catch (err: any) {
        console.error("Failed to fetch children:", err);
        setError("Failed to load your children");
      } finally {
        setLoadingChildren(false);
      }
    };

    fetchParentChildren();
  }, [user?._id, user?.parentStudents]);

  // Fetch courses for selected child's class
  useEffect(() => {
    const fetchCoursesForChild = async () => {
      if (!selectedChildId) return;

      try {
        setLoadingCourses(true);
        setError(null);
        setSelectedCourse(null);
        setSubjects([]);

        const selectedChild = children.find((c) => c._id === selectedChildId);
        if (!selectedChild) return;

        let childClassId: string | null = null;

        // Get the child's class
        if (selectedChild.studentClasses) {
          if (typeof selectedChild.studentClasses === "string") {
            childClassId = selectedChild.studentClasses;
          } else if (typeof selectedChild.studentClasses === "object" && selectedChild.studentClasses._id) {
            childClassId = selectedChild.studentClasses._id;
          }
        }

        if (!childClassId) {
          setError("No class assigned to this child");
          setCourses([]);
          return;
        }

        const [courseResponse, timetableResponse] = await Promise.allSettled([
          api.get(`/courses?class=${childClassId}&topLevel=true`),
          api.get(`/timetables/${childClassId}`),
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
      } catch (err: any) {
        console.error("Failed to fetch courses or timetable:", err);
        setCourses([]);
        setClassSchedule([]);
      } finally {
        setLoadingCourses(false);
        setLoadingSchedule(false);
      }
    };

    fetchCoursesForChild();
  }, [selectedChildId, children]);

  const getCourseSchedule = (courseId: string) => {
    return classSchedule.flatMap((schedule) =>
      (schedule.periods ?? [])
        .filter((period) => {
          if (!period.subject) return false;
          const subjectId = typeof period.subject === "string" ? period.subject : period.subject._id;
          return courses.find((c) => c._id === courseId)?.subjects?.some((s) => s._id === subjectId);
        })
        .map((period) => ({ day: schedule.day, ...period }))
    );
  };

  const filteredAndSortedCourses = courses
    .filter((course) => course.name.toLowerCase().includes(searchQuery.toLowerCase()) || course.code.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      if (sortBy === "subjects-high") return (b.subjects?.length ?? 0) - (a.subjects?.length ?? 0);
      if (sortBy === "subjects-low") return (a.subjects?.length ?? 0) - (b.subjects?.length ?? 0);
      return 0;
    });

  const handleViewSubjects = async (course: Course) => {
    setSelectedCourse(course);
    setLoadingSubjects(true);

    try {
      if (Array.isArray(course.subjects) && course.subjects.length > 0) {
        setSubjects(course.subjects);
      } else {
        const { data } = await api.get(`/courses/${course._id}`);
        setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
      }

      setSubjectsPanelCourseId(course._id);
      requestAnimationFrame(() => {
        if (expandedCourseId === course._id) {
          applyExpandedCardTransform(course._id, -96);
        }
      });
    } catch (err: any) {
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

  const selectedChild = children.find((c) => c._id === selectedChildId);

  if (!user || user.role !== "parent") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <div className="rounded-3xl border border-border bg-muted p-10 shadow-sm">
          <h1 className="text-2xl font-semibold">Parent Courses</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This page is for parents only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with Child Selection */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">
            Your Child
          </p>
        </div>

        {loadingChildren ? (
          <Skeleton className="h-10 w-48" />
        ) : error ? (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : children.length === 0 ? (
          <p className="text-sm text-muted-foreground">No children linked to your account</p>
        ) : (
          <div className="flex flex-col gap-4">
            {children.length > 1 && (
              <Select value={selectedChildId || ""} onValueChange={setSelectedChildId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Choose a child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
                    <SelectItem key={child._id} value={child._id}>
                      {child.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedChild && (
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{selectedChild.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Courses and subjects available for {selectedChild.name}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search and Sort Controls */}
      {children.length > 0 && (
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
      )}

      {/* Courses Grid */}
      {children.length > 0 && (
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
                    ? "No courses assigned to this class yet."
                    : "No courses match your search criteria."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
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
                  <div className="space-y-2 overflow-y-auto pr-2" style={{ maxHeight: "calc(70vh - 80px)" }}>
                    {loadingSubjects ? (
                      <p className="text-xs text-muted-foreground">Loading...</p>
                    ) : subjects.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No subjects assigned</p>
                    ) : (
                      subjects.map((subject) => (
                        <div key={subject._id} className="rounded-lg border border-border bg-muted/50 p-2">
                          <p className="text-xs font-semibold">{subject.name}</p>
                          <p className="text-xs text-muted-foreground">{subject.code}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredAndSortedCourses.map((course) => {
                  const isHovered = hoveredCourseId === course._id;
                  const isPulsing = pulsingCourseId === course._id;
                  const isExpanded = expandedCourseId === course._id;
                  const schedule = getCourseSchedule(course._id);

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
                          ) : schedule.length > 0 ? (
                            (() => {
                              const dayGroups = new Map<string, typeof schedule>();
                              schedule.forEach((item) => {
                                if (!dayGroups.has(item.day)) {
                                  dayGroups.set(item.day, []);
                                }
                                dayGroups.get(item.day)?.push(item);
                              });
                              return Array.from(dayGroups.entries()).map(([day, items]) => (
                                <div key={day}>
                                  <p className="font-semibold text-foreground">{day}</p>
                                  {items.map((item, i) => (
                                    <p key={i} className="text-xs">
                                      {item.startTime} - {item.endTime}
                                      {item.lecturer?.name && ` (${item.lecturer.name})`}
                                    </p>
                                  ))}
                                </div>
                              ));
                            })()
                          ) : (
                            <p>No schedule available</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          className={`mt-2 w-full transition-all duration-300 ${isExpanded && showExpandedActions ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleViewSubjects(course);
                          }}
                        >
                          View Subjects
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
