import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, BookOpen } from "lucide-react";

interface Course {
  _id: string;
  name: string;
  code: string;
  courseID: string;
  unit?: { _id: string; name: string };
  semester?: string;
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

export default function StudentCourses() {
  const { user } = useAuth();
  const [studentClass, setStudentClass] = useState<Class | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingClass, setLoadingClass] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const { data } = await api.get(`/courses?class=${studentClass._id}`);
        setCourses(Array.isArray(data.courses) ? data.courses : []);
        setSelectedCourse(null);
        setSubjects([]);
      } catch (err: any) {
        console.error("Failed to fetch courses:", err);
        setError("Failed to load courses for your class");
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCoursesForClass();
  }, [studentClass?._id]);

  // Fetch subjects for selected course
  const handleCourseSelect = async (course: Course) => {
    setSelectedCourse(course);
    
    try {
      setLoadingSubjects(true);
      setError(null);
      const { data } = await api.get(`/courses/${course._id}`);
      setSubjects(Array.isArray(data.subjects) ? data.subjects : data.studentClasses?.[0]?.subjects ?? []);
    } catch (err: any) {
      console.error("Failed to fetch subjects:", err);
      toast.error("Failed to load subjects for this course");
      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
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

      {/* Courses Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loadingCourses ? (
          <>
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </>
        ) : courses.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                No courses assigned to your class yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          courses.map((course) => (
            <Card
              key={course._id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedCourse?._id === course._id
                  ? "ring-2 ring-primary"
                  : ""
              }`}
              onClick={() => handleCourseSelect(course)}
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
                {course.semester && (
                  <Badge variant="secondary">Semester {course.semester}</Badge>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCourseSelect(course);
                  }}
                >
                  View Subjects
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Subjects Panel */}
      {selectedCourse && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>{selectedCourse.name} - Subjects</CardTitle>
            <CardDescription>
              {selectedCourse.code} • {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSubjects ? (
              <div className="space-y-3">
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
              </div>
            ) : subjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BookOpen className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No subjects assigned to this course.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {subjects.map((subject) => (
                  <div
                    key={subject._id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4"
                  >
                    <div>
                      <p className="font-medium">{subject.name}</p>
                      <p className="text-xs text-muted-foreground">{subject.code}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      View Details
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
