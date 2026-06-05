import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Search as SearchIcon } from "lucide-react";

import { api } from "@/lib/api";
import type { Class, courses } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";

type LoadingState = "idle" | "loading" | "error";

export default function Courses() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredClasses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) => {
      const haystack = [c.name, c.academicYear?.name].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [classes, search]);

  const selectedClass = useMemo(() => {
    if (!selectedClassId) return null;
    return classes.find((c) => c._id === selectedClassId) ?? null;
  }, [classes, selectedClassId]);

  const selectedCourses: courses[] = useMemo(() => {
    // Backend populates Class.courses
    const courses = selectedClass?.courses;
    if (Array.isArray(courses)) return courses;

    // Fallback (legacy)
    const subjectsLegacy = (selectedClass as unknown as { subjects?: courses[] })?.subjects;
    if (Array.isArray(subjectsLegacy)) return subjectsLegacy;

    return [];
  }, [selectedClass]);

  const fetchClasses = useCallback(async () => {
    try {
      setLoadingState("loading");

      const { data } = (await api.get(`/classes?page=1&limit=200`)) as {
        data: { classes: Class[] };
      };

      const loaded = data?.classes ?? [];
      setClasses(loaded);

      if (!selectedClassId && loaded.length > 0) {
        setSelectedClassId(loaded[0]._id);
      }

      setLoadingState("idle");
    } catch (e) {
      console.error(e);
      setLoadingState("error");
      toast.error("Failed to load classes");
    }
  }, [selectedClassId]);

  useEffect(() => {
    void fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground">Available course subjects for each class.</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative w-[260px] max-w-[60vw]">
            <SearchIcon className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search classes..."
              className="pl-9"
            />
          </div>
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-6">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Classes</h2>
            <Badge variant="secondary">{filteredClasses.length}</Badge>
          </div>

          {loadingState === "loading" ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-muted-foreground">No classes found.</div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
              {filteredClasses.map((cls) => {
                const isActive = cls._id === selectedClassId;
                return (
                  <button
                    key={cls._id}
                    type="button"
                    onClick={() => setSelectedClassId(cls._id)}
                    className={
                      "w-full text-left rounded-md border px-3 py-2 transition " +
                      (isActive
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground/40")
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{cls.name}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {cls.academicYear?.name ?? "N/A"}
                        </div>
                      </div>
                      <ChevronRight className={"h-4 w-4 text-muted-foreground " + (isActive ? "opacity-100" : "opacity-60")} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void fetchClasses()}>
              Refresh
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold">Subjects / Courses</h2>
            <Badge variant="secondary">{selectedCourses.length}</Badge>
          </div>

          {selectedClass ? (
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Selected class</div>
                <div className="font-medium">{selectedClass.name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedClass.academicYear?.name ?? "N/A"}
                </div>
              </div>

              {selectedCourses.length === 0 ? (
                <div className="text-muted-foreground">
                  No course subjects are assigned to this class yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedCourses.map((c) => (
                    <div key={c._id} className="border rounded-md p-3">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-sm text-muted-foreground">{c.code}</div>
                      {typeof (c as { isActive?: unknown }).isActive === "boolean" &&
                        !(c as { isActive?: boolean }).isActive && (
                          <div className="mt-2">
                            <Badge variant="destructive">Inactive</Badge>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground">Select a class to view its available courses.</div>
          )}
        </Card>
      </div>
    </div>
  );
}

