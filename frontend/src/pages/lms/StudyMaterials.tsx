import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, FolderOpen, NotebookText } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const getObjectId = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const candidate = value as { _id?: unknown };
    return candidate._id ? String(candidate._id) : null;
  }
  return null;
};

const normalizeIds = (value: unknown): string[] => {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  const ids = items
    .map((item) => getObjectId(item))
    .filter((item): item is string => Boolean(item));
  return Array.from(new Set(ids));
};

export const resolveVisibleClasses = (user: any, classes: any[] = []) => {
  if (!user || !classes.length) return [];

  const normalizedRole = String(user.role ?? "").trim().toLowerCase();
  const isTeacherLikeRole = ["teacher", "staff", "unitconsultant", "unitresident"].includes(normalizedRole);

  switch (normalizedRole) {
    case "admin":
      return classes;
    case "student": {
      const studentClassIds = normalizeIds(user.studentClasses ?? user.studentClass);
      if (!studentClassIds.length) return [];
      return classes.filter((cls) => studentClassIds.includes(String(cls._id)));
    }
    case "teacher":
    case "staff":
    case "unitconsultant":
    case "unitresident": {
      const teacherClassIds = new Set(
        normalizeIds(user.teacherClasses).map((id) => String(id)),
      );

      const teacherAssignmentIds = new Set(
        [
          ...normalizeIds(user.teacherSubject),
          ...normalizeIds(user.teacherSubjects),
          ...normalizeIds(user.teacherCourses),
        ].map((id) => String(id)),
      );

      if (!teacherClassIds.size && !teacherAssignmentIds.size) return [];

      const matchingClasses = classes.filter((cls) => {
        const classId = String(cls._id);
        if (teacherClassIds.has(classId)) return true;

        const classCourseIds = normalizeIds(cls.courses ?? []);
        const classSubjectIds = normalizeIds(
          (cls.courses ?? []).flatMap((course: any) => course?.subjects ?? []),
        );

        return (
          classCourseIds.some((classCourseId) => teacherAssignmentIds.has(String(classCourseId))) ||
          classSubjectIds.some((classSubjectId) => teacherAssignmentIds.has(String(classSubjectId)))
        );
      });

      return matchingClasses.filter(
        (cls, index, arr) => arr.findIndex((candidate) => String(candidate._id) === String(cls._id)) === index,
      );
    }
    default:
      return [];
  }
};

const buildClassMaterials = (className: string, classId: string) => [
  {
    id: `${classId}-overview`,
    title: `${className} class overview`,
    description: "Course summary and key learning objectives.",
    type: "Overview",
    link: `/lms/materials/${classId}/lesson-plan`,
  },
  {
    id: `${classId}-lesson-plan`,
    title: `${className} lesson plan`,
    description: "Weekly teaching notes and planning guide.",
    type: "Lesson Plan",
    link: `/lms/materials/${classId}/lesson-plan`,
  },
  {
    id: `${classId}-resources`,
    title: `${className} resource pack`,
    description: "Reference notes, worksheets, and reading material.",
    type: "Resources",
    link: `/lms/materials/${classId}/resources`,
  },
];

const StudyMaterials = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeClassId, setActiveClassId] = useState<string>("");

  useEffect(() => {
    const loadClasses = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/users/visible-classes");
        const list = Array.isArray(data?.classes) ? data.classes : Array.isArray(data) ? data : [];
        setClasses(list);
      } catch (error) {
        console.error("Failed to load classes for learning materials", error);

        try {
          const { data } = await api.get("/classes?limit=200");
          const list = Array.isArray(data?.classes) ? data.classes : Array.isArray(data) ? data : [];
          setClasses(list);
        } catch {
          setClasses([]);
        }
      } finally {
        setLoading(false);
      }
    };

    void loadClasses();
  }, []);

  const visibleClasses = useMemo(
    () => (classes.length ? classes : resolveVisibleClasses(user, classes)),
    [classes, user],
  );

  useEffect(() => {
    if (!visibleClasses.length) {
      setActiveClassId("");
      return;
    }

    if (!activeClassId || !visibleClasses.some((cls) => String(cls._id) === activeClassId)) {
      setActiveClassId(String(visibleClasses[0]._id));
    }
  }, [activeClassId, visibleClasses]);

  const currentClass = visibleClasses.find((cls) => String(cls._id) === activeClassId) ?? visibleClasses[0] ?? null;

  return (
    <div id="page-lms-materials" className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">Learning materials</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Class materials</h1>
        </div>

        {user && ["admin", "teacher"].includes(user.role) && (
          <Button type="button" variant="default" className="shrink-0">
            Upload material
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-xl" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      ) : !visibleClasses.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              No class available
            </CardTitle>
            <CardDescription>
              {user?.role === "student"
                ? "Your class assignment has not been linked yet."
                : "There are no classes available for this user role yet."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Tabs value={activeClassId} onValueChange={setActiveClassId} className="space-y-4">
          <TabsList className="flex h-auto max-w-full flex-wrap justify-start gap-2 overflow-x-auto rounded-xl bg-muted/60 p-2">
            {visibleClasses.map((cls) => (
              <TabsTrigger
                key={cls._id}
                value={String(cls._id)}
                className="min-w-fit rounded-md px-4 py-2 text-sm font-medium"
              >
                {cls.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {visibleClasses.map((cls) => {
            const materials = buildClassMaterials(cls.name, cls._id);

            return (
              <TabsContent key={cls._id} value={String(cls._id)} className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Current class</p>
                    <h2 className="mt-1 text-xl font-semibold text-foreground">{cls.name}</h2>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FolderOpen className="h-4 w-4" />
                    {materials.length} material{materials.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {materials.map((material) => (
                    <Card key={material.id} className="h-full border-border/70 shadow-sm">
                      <CardHeader className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                            {material.type}
                          </span>
                          <NotebookText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-base leading-snug">{material.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{material.description}</p>
                        <Button type="button" variant="outline" size="sm" className="w-full" asChild>
                          <Link to={material.link}>Open</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {currentClass && !loading && visibleClasses.length > 0 && (
        <div className="hidden" aria-hidden="true">
          {currentClass.name}
        </div>
      )}
    </div>
  );
};

export default StudyMaterials;
