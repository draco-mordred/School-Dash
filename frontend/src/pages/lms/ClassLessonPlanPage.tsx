import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const TextMarquee = ({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const measure = () => {
      const textNode = element.querySelector(".text-flow-track") as HTMLElement | null;
      if (!textNode) return;

      const nextDistance = Math.max(0, textNode.scrollWidth - element.clientWidth);
      setDistance(nextDistance);
      setShouldAnimate(nextDistance > 4);
    };

    measure();

    const resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [children]);

  return (
    <div
      ref={containerRef}
      className={`text-flow-scroll w-full ${className}`}
      style={{
        minWidth: 0,
        width: "100%",
        maxWidth: "100%",
        ["--marquee-distance" as string]: `${distance}px`,
        ["--marquee-duration" as string]: "22s",
        ...style,
      }}
    >
      <span className={`text-flow-track font-medium ${shouldAnimate ? "text-flow-animate" : ""}`}>
        {children}
      </span>
    </div>
  );
};

const parseDate = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value: unknown) => {
  const date = parseDate(value);
  if (!date) return "No date";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const normalizeIds = (value: unknown): string[] => {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  const ids = items
    .map((item) => {
      if (!item) return "";
      if (typeof item === "string") return item;
      if (typeof item === "object") {
        const possibleId = (item as { _id?: unknown })._id;
        return possibleId ? String(possibleId) : "";
      }
      return "";
    })
    .filter(Boolean);
  return Array.from(new Set(ids));
};

const sortSubjects = (items: any[] = []) =>
  [...items].sort((a, b) => {
    const aDate = parseDate(a?.date ?? a?.startDate ?? a?.createdAt) ?? new Date(0);
    const bDate = parseDate(b?.date ?? b?.startDate ?? b?.createdAt) ?? new Date(0);
    return aDate.getTime() - bDate.getTime();
  });

const ClassLessonPlanPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classData, setClassData] = useState<any | null>(null);
  const [usersById, setUsersById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [expandedCourseIds, setExpandedCourseIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data } = await api.get("/users?limit=500");
        const people = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
        const nextMap: Record<string, string> = {};

        for (const person of people) {
          if (!person?._id) continue;
          nextMap[String(person._id)] = person.name || person.email || "Unknown user";
        }

        setUsersById(nextMap);
      } catch (error) {
        console.error("Failed to load users for lecturer names", error);
        setUsersById({});
      }
    };

    void loadUsers();
  }, []);

  useEffect(() => {
    const loadClass = async () => {
      if (!classId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data } = await api.get(`/classes/${classId}`);
        setClassData(data ?? null);
      } catch (error) {
        console.error("Failed to load class lesson plan", error);
        setClassData(null);
      } finally {
        setLoading(false);
      }
    };

    void loadClass();
  }, [classId]);

  const teacherSubjectIds = useMemo(() => {
    const userIds = new Set<string>();
    const subjectValues = [
      ...(Array.isArray((user as any)?.teacherSubject) ? (user as any).teacherSubject : []),
      ...(Array.isArray((user as any)?.teacherSubjects) ? (user as any).teacherSubjects : []),
      ...(Array.isArray((user as any)?.teacherCourses) ? (user as any).teacherCourses : []),
    ];

    for (const value of subjectValues) {
      if (typeof value === "string") userIds.add(value);
      else if (value && typeof value === "object") {
        const id = (value as { _id?: unknown })._id;
        if (id) userIds.add(String(id));
      }
    }

    return userIds;
  }, [user]);

  const courseCards = useMemo(() => {
    const rawCourses = Array.isArray(classData?.courses) ? classData.courses : [];
    return rawCourses
      .map((course: any) => {
        const sortedSubjects = sortSubjects(Array.isArray(course?.subjects) ? course.subjects : []);
        return {
          ...course,
          sortedSubjects,
        };
      })
      .sort((a: any, b: any) => String(a?.name || "").localeCompare(String(b?.name || "")));
  }, [classData]);

  const toggleCourse = (courseId: string) => {
    setExpandedCourseIds((current) => ({
      ...current,
      [courseId]: !current[courseId],
    }));
  };

  const resolveDisplayName = (value: unknown) => {
    if (!value) return "Unknown user";

    if (typeof value === "string") {
      return usersById[value] || value;
    }

    if (typeof value === "object") {
      const id = (value as { _id?: unknown })._id;
      if (id && usersById[String(id)]) return usersById[String(id)];
      const name = (value as { name?: unknown }).name;
      if (name) return String(name);
      const email = (value as { email?: unknown }).email;
      if (email) return String(email);
    }

    return String(value);
  };

  const resolveLecturerNames = (lecturerValue: unknown): string[] => {
    if (!lecturerValue) return [];

    const entries = Array.isArray(lecturerValue) ? lecturerValue : [lecturerValue];
    return entries
      .map((entry) => resolveDisplayName(entry))
      .filter((name) => Boolean(name) && name !== "Unknown user");
  };

  const isTeacherSubjectMatch = (subject: any) => {
    if (!user || user.role === "student" || user.role === "admin") return false;

    const subjectReferenceIds = new Set([
      ...normalizeIds(subject?._id),
      ...normalizeIds(subject?.subjectID),
      ...normalizeIds(subject?.subjectUID),
      ...normalizeIds(subject?.lecturer),
    ]);

    const courseMatch = normalizeIds(subject?.course?._id ?? subject?.courseId).some((id) => teacherSubjectIds.has(id));
    const subjectMatch = Array.from(subjectReferenceIds).some((id) => teacherSubjectIds.has(id));
    const lecturerMatch = normalizeIds((subject?.lecturer ?? [])).some((id) => id === String((user as any)?._id));

    return Boolean(courseMatch || subjectMatch || lecturerMatch);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Loading lesson plan…</CardContent>
        </Card>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">This class lesson plan could not be loaded.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Class resources</p>
            <h1 className="text-2xl font-bold text-foreground">{classData.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          {courseCards.length} course{courseCards.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="space-y-4">
        {courseCards.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">No course records are available for this class yet.</CardContent>
          </Card>
        ) : (
          courseCards.map((course: any) => {
            const courseId = String(course?._id ?? "");
            const isExpanded = expandedCourseIds[courseId] ?? true;

            return (
              <Card key={courseId || course?.name} className="overflow-hidden border-border/70">
                <button
                  type="button"
                  onClick={() => courseId && toggleCourse(courseId)}
                  className="flex w-full items-center justify-between gap-4 bg-muted/30 px-4 py-3 text-left transition hover:bg-muted/50"
                >
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Course</p>
                    <h2 className="mt-1 text-lg font-semibold text-foreground">{course?.name || "Unnamed course"}</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                      {course?.sortedSubjects?.length ?? 0} subject{(course?.sortedSubjects?.length ?? 0) === 1 ? "" : "s"}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="min-w-full table-fixed border-separate border-spacing-0 text-left" style={{ width: "100%" }}>
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground" style={{ width: "14%", minWidth: 110 }}>Date</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground" style={{ width: "56%" }}>Subject / Course Topic</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground" style={{ width: "30%", minWidth: 180 }}>Teacher / Lecturer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(course?.sortedSubjects?.length ? course.sortedSubjects : []).map((subject: any, index: number) => {
                            const highlighted = isTeacherSubjectMatch(subject);
                            const lecturerNames = resolveLecturerNames(subject?.lecturer);
                            const lecturerLabel = lecturerNames.length ? lecturerNames.join(", ") : "Unassigned";
                            const subjectTitle = subject?.name || "Untitled subject";

                            return (
                              <tr
                                key={`${courseId}-${subject?._id ?? index}`}
                                className={highlighted ? "bg-primary/5" : "bg-transparent"}
                              >
                                <td className="border-t border-border/70 px-4 py-3 align-top text-sm text-muted-foreground" style={{ width: "14%", minWidth: 110 }}>
                                  {formatDate(subject?.date ?? subject?.startDate)}
                                </td>
                                <td className="border-t border-border/70 px-4 py-3 align-top" style={{ width: "56%" }}>
                                  <div className="flex min-w-0 items-center gap-2">
                                    <div className="min-w-0 flex-1">
                                      <TextMarquee>{subjectTitle}</TextMarquee>
                                    </div>
                                    {highlighted && (
                                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                                        Your subject
                                      </span>
                                    )}
                                  </div>
                                  {subject?.code ? (
                                    <div className="mt-1 text-xs text-muted-foreground">{subject.code}</div>
                                  ) : null}
                                </td>
                                <td className="border-t border-border/70 px-4 py-3 align-top text-sm text-muted-foreground" style={{ width: "30%", minWidth: 180 }}>
                                  <div className="min-w-0">
                                    <TextMarquee>{lecturerLabel}</TextMarquee>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ClassLessonPlanPage;
