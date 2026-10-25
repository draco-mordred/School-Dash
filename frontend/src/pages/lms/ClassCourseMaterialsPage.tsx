import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, ChevronDown, Clock, Copy, Folder, FolderOpen, Link as LinkIcon, LogOut, Plus, RefreshCw, SlidersHorizontal } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const formatDate = (value: unknown) => {
  if (!value) return "No date";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const parseDriveFolderId = (url: string) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const folderMatch = path.match(/\/folders\/([A-Za-z0-9-_]+)/i);
    const fileMatch = path.match(/\/file\/d\/([A-Za-z0-9-_]+)/i);
    if (folderMatch?.[1]) return folderMatch[1];
    if (fileMatch?.[1]) return fileMatch[1];
    return parsed.searchParams.get("folderid") || parsed.searchParams.get("id");
  } catch {
    return null;
  }
};

const createDrivePreview = (courseName: string, link: string) => {
  const folderId = parseDriveFolderId(link);
  const title = folderId ? `Drive folder: ${folderId}` : "Shared drive folder";

  return [
    {
      id: `${courseName}-folder`,
      name: title,
      type: "Folder",
      updatedAt: new Date().toISOString(),
      url: link,
    },
    {
      id: `${courseName}-notes`,
      name: `${courseName} Lecture Notes`,
      type: "File",
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      url: link,
    },
    {
      id: `${courseName}-slides`,
      name: `${courseName} Slides`,
      type: "File",
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      url: link,
    },
  ];
};

const FileRow = ({ file, driveLink }: { file: any; driveLink: string }) => (
  <div className="rounded-lg border border-border bg-muted/20 p-3">
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {file.mimeType ? String(file.mimeType).split("/").pop() : "File"}
        </p>
      </div>
      <a
        href={file.viewUrl || file.downloadUrl || driveLink}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-primary"
      >
        Open
      </a>
    </div>
    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>Uploaded: {formatDate(file.modifiedTime)}</span>
      <span>{file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "File"}</span>
    </div>
  </div>
);

const countFolderFiles = (node: any): number =>
  (node?.rootFiles?.length ?? 0) +
  (node?.subfolders ?? []).reduce((acc: number, sub: any) => acc + countFolderFiles(sub), 0);

const countNestedFolders = (node: any): number =>
  (node?.subfolders ?? []).reduce((acc: number, sub: any) => acc + 1 + countNestedFolders(sub), 0);

const FolderNodeSection = ({
  node,
  nodeKey,
  openSubfolders,
  toggleSubfolder,
  driveLink,
}: {
  node: any;
  nodeKey: string;
  openSubfolders: Record<string, boolean>;
  toggleSubfolder: (key: string) => void;
  driveLink: string;
}) => {
  const isOpen = Boolean(openSubfolders[nodeKey]);
  const fileCount = countFolderFiles(node);
  const nestedCount = countNestedFolders(node);

  return (
    <div className="rounded-md border border-border/70 bg-muted/10">
      <button
        type="button"
        onClick={() => toggleSubfolder(nodeKey)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-foreground"
      >
        <span className="flex min-w-0 items-center gap-2">
          {isOpen ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">{node?.name || "Folder"}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs font-normal text-muted-foreground">
          {nestedCount > 0 && (
            <span>
              {nestedCount} folder{nestedCount === 1 ? "" : "s"}
            </span>
          )}
          <span>
            {fileCount} file{fileCount === 1 ? "" : "s"}
          </span>
          <ChevronDown className={"h-3.5 w-3.5 transition-transform " + (isOpen ? "rotate-180" : "")} />
        </span>
      </button>
      {isOpen && (
        <div className="space-y-2 border-t border-border/60 p-2">
          {(node?.subfolders ?? []).map((sub: any) => (
            <FolderNodeSection
              key={sub.id}
              node={sub}
              nodeKey={nodeKey + ":" + sub.id}
              openSubfolders={openSubfolders}
              toggleSubfolder={toggleSubfolder}
              driveLink={driveLink}
            />
          ))}
          {(node?.rootFiles ?? []).map((file: any) => (
            <FileRow key={file.id} file={file} driveLink={driveLink} />
          ))}
          {fileCount === 0 && nestedCount === 0 && (
            <p className="px-1 py-1 text-xs text-muted-foreground">No files in this folder yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

const ensureGoogleDriveScripts = async () => {
  const existingScript = document.querySelector('script[data-google-identity]');
  if (!existingScript) {
    const gsiScript = document.createElement("script");
    gsiScript.src = "https://accounts.google.com/gsi/client";
    gsiScript.async = true;
    gsiScript.defer = true;
    gsiScript.dataset.googleIdentity = "true";
    document.body.appendChild(gsiScript);
  }

  const pickerScript = document.querySelector('script[data-google-picker]');
  if (!pickerScript) {
    const pickerApiScript = document.createElement("script");
    pickerApiScript.src = "https://apis.google.com/js/api.js";
    pickerApiScript.async = true;
    pickerApiScript.defer = true;
    pickerApiScript.dataset.googlePicker = "true";
    document.body.appendChild(pickerApiScript);
  }

  await new Promise<void>((resolve) => {
    const interval = window.setInterval(() => {
      if (window.google?.accounts?.oauth2 && window.google?.picker) {
        window.clearInterval(interval);
        resolve();
      }
    }, 150);

    window.setTimeout(() => window.clearInterval(interval), 8000);
  });
};

const pickGoogleDriveFolder = async (onSuccess: (folderUrl: string) => void) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    window.alert("Google OAuth is not configured yet. Add VITE_GOOGLE_CLIENT_ID to the frontend environment.");
    return;
  }

  try {
    await ensureGoogleDriveScripts();

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_DRIVE_SCOPE,
      callback: async (response: any) => {
        if (response.error) {
          throw new Error(response.error_description ?? "Google Drive authorization was cancelled.");
        }

        const picker = new window.google.picker.PickerBuilder()
          .addView(
            new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
              .setIncludeFolders(true)
              .setSelectFolderEnabled(true)
              .setParent("root"),
          )
          .setAppId(import.meta.env.VITE_GOOGLE_DRIVE_APP_ID || clientId)
          .setOAuthToken(response.access_token)
          .setDeveloperKey(import.meta.env.VITE_GOOGLE_API_KEY || "")
          .setCallback((data: any) => {
            if (data.action === window.google.picker.Action.PICKED) {
              const folder = data.docs?.[0];
              if (folder?.id) {
                onSuccess(`https://drive.google.com/drive/folders/${folder.id}`);
              }
            }
          })
          .setTitle("Select the class Drive folder")
          .build();

        picker.setVisible(true);
      },
    });

    tokenClient.requestAccessToken();
  } catch (error) {
    console.error("Failed to open Google Drive picker", error);
    window.alert(error instanceof Error ? error.message : "Google Drive picker failed.");
  }
};

const ClassCourseMaterialsPage = () => {
  const { classId } = useParams();
  const { user: authUser } = useAuth();
  const isStudent = String((authUser as any)?.role ?? "").toLowerCase() === "student";
  const navigate = useNavigate();
  const [classData, setClassData] = useState<any | null>(null);
  const [courseMaterials, setCourseMaterials] = useState<any[]>([]);
  const [syncMessage, setSyncMessage] = useState<string>("");
  const [sortBy, setSortBy] = useState<"name" | "date">("name");
  const [filter, setFilter] = useState<"all" | "with-link" | "without-link">("all");
  const [resourceLinks, setResourceLinks] = useState<Record<string, string>>({});
  const [newLink, setNewLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeCourseId, setActiveCourseId] = useState<string>("");
  const [syncingCourseId, setSyncingCourseId] = useState<string | null>(null);
  const [openFolderCards, setOpenFolderCards] = useState<Record<string, boolean>>({});
  const [openSubfolders, setOpenSubfolders] = useState<Record<string, boolean>>({});
  const [syncRunActive, setSyncRunActive] = useState(false);
  const [syncedCourses, setSyncedCourses] = useState<Record<string, boolean>>({});
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveConnectionMessage, setDriveConnectionMessage] = useState<string>(
    "No Google account connected yet. Sign in to choose a Drive folder for this class.",
  );

  const toggleSubfolder = (key: string) =>
    setOpenSubfolders((prev) => ({ ...prev, [key]: !prev[key] }));

  const loadGoogleDriveStatus = async () => {
    try {
      const { data } = await api.get("/users/google-drive/status");
      const connected = Boolean(data?.connected && (data?.googleDriveAccount?.accessToken || data?.googleDriveAccount?.status === "connected"));
      setDriveConnected(connected);
      if (connected) {
        setDriveConnectionMessage(`Google Drive connected for ${data?.googleDriveAccount?.email ?? "your account"}. Choose a class folder to sync.`);
      } else {
        setDriveConnectionMessage("No Google account connected yet. Sign in to choose a Drive folder for this class.");
      }
      return connected;
    } catch (error) {
      setDriveConnected(false);
      setDriveConnectionMessage("No Google account connected yet. Sign in to choose a Drive folder for this class.");
      return false;
    }
  };

  const refreshMaterials = async (rootUrl?: string) => {
    if (!classId) return;

    try {
      const { data } = await api.get(`/classes/${classId}/course-materials`);
      setCourseMaterials(Array.isArray(data?.courseMaterials) ? data.courseMaterials : []);
      setSyncMessage(data?.message ?? "");

      if (data?.cloudStorage?.rootUrl) {
        setNewLink(data.cloudStorage.rootUrl);
      }

      if (rootUrl) {
        const nextMap: Record<string, string> = {};
        for (const item of Array.isArray(data?.courseMaterials) ? data.courseMaterials : []) {
          nextMap[String(item.courseId)] = rootUrl;
        }
        if (Object.keys(nextMap).length) {
          setResourceLinks((current) => ({ ...current, ...nextMap }));
        }
      }
    } catch (error) {
      console.error("Failed to load class course materials", error);
      setCourseMaterials([]);
      setSyncMessage("Could not load course materials for this class.");
    }
  };

  useEffect(() => {
    const loadClass = async () => {
      if (!classId) return;
      try {
        const { data } = await api.get(`/classes/${classId}`);
        setClassData(data ?? null);
        const currentLink = data?.cloudStorage?.rootUrl ?? "";
        setNewLink(currentLink);
        if (currentLink) {
          setResourceLinks((current) => ({
            ...current,
            ...(Array.isArray(data?.courses) ? data.courses.reduce((acc: Record<string, string>, course: any) => {
              acc[String(course._id)] = currentLink;
              return acc;
            }, {}) : {}),
          }));
        }
        await refreshMaterials(currentLink);
      } catch (error) {
        console.error("Failed to load class for course materials", error);
        setClassData(null);
      }
    };

    void loadClass();
    if (!isStudent) {
      void loadGoogleDriveStatus();
    }
  }, [classId]);

  const courses = useMemo(() => {
    const rawCourses = Array.isArray(classData?.courses) ? classData.courses : [];

    return [...rawCourses]
      .map((course: any) => {
        const match = courseMaterials.find((entry) => String(entry.courseId) === String(course?._id));
        const materials = match?.files ?? [];
        return {
          ...course,
          materials,
          folderName: match?.folderName ?? "",
          driveLink: resourceLinks[String(course?._id)] ?? classData?.cloudStorage?.rootUrl ?? "",
        };
      })
      .sort((a: any, b: any) => {
        if (sortBy === "date") {
          const aDate = a?.materials?.[0]?.items?.[0]?.modifiedTime ? new Date(a.materials[0].items[0].modifiedTime).getTime() : 0;
          const bDate = b?.materials?.[0]?.items?.[0]?.modifiedTime ? new Date(b.materials[0].items[0].modifiedTime).getTime() : 0;
          return bDate - aDate;
        }
        return String(a?.name || "").localeCompare(String(b?.name || ""));
      });
  }, [classData, courseMaterials, resourceLinks, sortBy]);

  useEffect(() => {
    if (!courses.length) return;
    if (!activeCourseId || !courses.some((course) => String(course._id) === activeCourseId)) {
      setActiveCourseId(String(courses[0]._id));
    }
  }, [activeCourseId, courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course: any) => {
      const hasLink = Boolean(course.driveLink);
      if (filter === "with-link") return hasLink;
      if (filter === "without-link") return !hasLink;
      return true;
    });
  }, [courses, filter]);

  const syncCourseFoldersSequentially = async (rootUrl: string) => {
    if (!classId || !rootUrl) return;
    const courseList = courses;
    setSyncRunActive(true);
    setSyncedCourses({});
    setOpenSubfolders({});
    for (const course of courseList) {
      const courseId = String(course?._id ?? "");
      if (!courseId) continue;
      setSyncingCourseId(courseId);
      setOpenFolderCards((prev) => ({ ...prev, [courseId]: false }));
      try {
        const { data } = await api.get(`/classes/${classId}/course-materials`, {
          params: { courseId },
        });
        const entry = (Array.isArray(data?.courseMaterials) ? data.courseMaterials : []).find(
          (e: any) => String(e?.courseId) === courseId,
        );
        setCourseMaterials((prev) => [
          ...prev.filter((e: any) => String(e?.courseId) !== courseId),
          ...(entry ? [entry] : []),
        ]);
        const entryFolders =
          Array.isArray(entry?.matchedFolders) && entry.matchedFolders.length
            ? entry.matchedFolders
            : entry?.folderId
              ? [{ id: entry.folderId }]
              : [];
        setOpenFolderCards((prev) => {
          const next = { ...prev };
          for (const matchedFolder of entryFolders) {
            next[`${courseId}:${matchedFolder.id}`] = true;
          }
          return next;
        });
      } catch (error) {
        console.error("Failed to sync course folder", course?.name, error);
      } finally {
        setSyncedCourses((prev) => ({ ...prev, [courseId]: true }));
        setSyncingCourseId(null);
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
    setSyncRunActive(false);
    setSyncMessage(
      `Sync complete — ${courseList.length} course folder${courseList.length === 1 ? "" : "s"} processed from Drive.`,
    );
  };

  const saveCourseLink = async () => {
    if (!classId || !newLink.trim()) return;

    setSaving(true);
    try {
      const { data } = await api.post(`/classes/${classId}/cloud-storage`, {
        provider: "google-drive",
        rootUrl: newLink.trim(),
      });

      setClassData((current: any) => ({
        ...(current ?? {}),
        cloudStorage: data?.cloudStorage ?? current?.cloudStorage,
      }));

      if (data?.cloudStorage?.rootUrl) {
        setNewLink(data.cloudStorage.rootUrl);
      }

      setSyncMessage("Class storage link saved. Syncing course folders from Drive…");
      await syncCourseFoldersSequentially(data?.cloudStorage?.rootUrl ?? newLink.trim());
    } catch (error: any) {
      console.error("Failed to save class cloud storage link", error);
      setSyncMessage(error?.response?.data?.message ?? "Failed to save class storage link.");
    } finally {
      setSaving(false);
    }
  };

  const connectGoogleDrive = async () => {
    try {
      const { data } = await api.get("/users/google-drive/connect-url");
      const authUrl = data?.authUrl;

      if (!data?.configured || !authUrl) {
        setDriveConnectionMessage(data?.message ?? "Google Drive is not configured yet. Add the Google OAuth credentials in the backend and then connect a Google account.");
        return;
      }

      const popup = window.open(authUrl, "google_drive_auth", "width=520,height=640");
      if (!popup) {
        window.alert("Your browser blocked the Google sign-in popup. Please allow popups and try again.");
        return;
      }

      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type !== "GOOGLE_DRIVE_AUTH_DONE") return;
        window.removeEventListener("message", handleMessage);
        const connected = await loadGoogleDriveStatus();
        if (connected) {
          setDriveConnectionMessage("Google Drive connected. Select the class folder to sync resources.");
        }
      };

      window.addEventListener("message", handleMessage);
      await pickGoogleDriveFolder(async (folderUrl) => {
        const folderId = parseDriveFolderId(folderUrl);
        setNewLink(folderUrl);
        setDriveConnectionMessage("Google Drive connected. A folder is ready to be saved for this class.");
        await api.post("/users/google-drive/link", {
          driveFolderId: folderId,
          driveFolderUrl: folderUrl,
          status: "connected",
        });
        await saveCourseLink();
      });
    } catch (error: any) {
      console.error("Failed to connect Google Drive", error);
      const message = error?.response?.data?.message ?? "Google Drive connection failed.";
      setDriveConnectionMessage(message);
    }
  };

  const disconnectGoogleDrive = async () => {
    try {
      await api.post("/users/google-drive/disconnect");
      setDriveConnected(false);
      setDriveConnectionMessage("Google Drive disconnected. Sign in again to choose a class folder.");
    } catch (error) {
      console.error("Failed to disconnect Google Drive", error);
    }
  };

  const activeCourse = filteredCourses.find((course: any) => String(course._id) === activeCourseId) ?? filteredCourses[0] ?? null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Course materials</p>
            <h1 className="text-2xl font-bold text-foreground">{classData?.name ?? "Class resources"}</h1>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 md:p-5">
          {!isStudent && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Google Drive</p>
              <p className="mt-1 text-sm text-muted-foreground">{driveConnectionMessage}</p>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={connectGoogleDrive}>
                <LinkIcon className="mr-2 h-4 w-4" /> {driveConnected ? "Reconnect Google Drive" : "Connect Google Drive"}
              </Button>
              {driveConnected && (
                <Button type="button" variant="ghost" onClick={disconnectGoogleDrive} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </Button>
              )}
            </div>
          </div>
          )}

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              Display options
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as "name" | "date")}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
              >
                <option value="name">Sort by course name</option>
                <option value="date">Sort by latest update</option>
              </select>

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as "all" | "with-link" | "without-link")}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
              >
                <option value="all">All courses</option>
                <option value="with-link">With drive links</option>
                <option value="without-link">No drive link</option>
              </select>

              {!isStudent && activeCourse && (
                <Button type="button" variant="default" onClick={() => setNewLink(resourceLinks[String(activeCourse._id)] ?? "")}>
                  <Plus className="mr-2 h-4 w-4" /> Add drive link
                </Button>
              )}
            </div>
          </div>

          {!isStudent && activeCourse && (
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-3 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <input
                  value={newLink || resourceLinks[String(activeCourse._id)] || ""}
                  onChange={(event) => setNewLink(event.target.value)}
                  placeholder="Paste Google Drive / cloud folder link"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
                />
              </div>
              <Button type="button" variant="outline" onClick={saveCourseLink} disabled={!newLink.trim()}>
                Save link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No courses match the current filter for this class yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course: any) => {
            const courseId = String(course._id);
            const driveLink = course.driveLink || resourceLinks[courseId] || classData?.cloudStorage?.rootUrl || "";
            const match = courseMaterials.find((entry: any) => String(entry?.courseId) === courseId) ?? null;
            const matchedFolders: any[] = Array.isArray(match?.matchedFolders) && match.matchedFolders.length
              ? match.matchedFolders
              : match?.folderId
                ? [{
                    id: match.folderId,
                    name: match.folderName ?? course?.name ?? "Course folder",
                    url: match.folderUrl ?? `https://drive.google.com/drive/folders/${match.folderId}`,
                    subfolders: (Array.isArray(match?.folders) ? match.folders : []).map((f: any) => ({
                      id: f.id,
                      name: f.name,
                      subfolders: [],
                      rootFiles: Array.isArray(f?.items) ? f.items : [],
                    })),
                    rootFiles: Array.isArray(match?.rootFiles) ? match.rootFiles : [],
                  }]
                : [];
            const isSyncing = syncingCourseId === courseId;
            const isQueued = syncRunActive && !syncedCourses[courseId];
            const isActive = activeCourseId === courseId;

            return (
              <Card
                key={courseId || course?.name}
                className={`overflow-hidden border-border/70 transition ${isActive ? "ring-2 ring-primary/30" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => setActiveCourseId(courseId)}
                  className="flex w-full items-center justify-between gap-3 bg-muted/30 px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Course</p>
                    <h2 className="mt-1 text-lg font-semibold text-foreground">{course?.name || "Unnamed course"}</h2>
                  </div>
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                </button>

                <CardContent className="space-y-4 p-4">
                  <div className="rounded-lg border border-dashed border-border bg-background/70 p-3 text-sm text-muted-foreground">
                    {driveLink ? (
                      <>
                        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">
                          <LinkIcon className="h-3.5 w-3.5" /> Shared folder
                        </div>
                        <a href={driveLink} target="_blank" rel="noreferrer" className="break-all text-sm text-primary underline decoration-dotted">
                          {driveLink}
                        </a>
                      </>
                    ) : (
                      <span>No shared resource link added for this course yet.</span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {isSyncing ? (
                      <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                        <span>Synchronizing folder contents with Drive…</span>
                      </div>
                    ) : isQueued ? (
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Queued — this course folder will sync next…</span>
                      </div>
                    ) : matchedFolders.length ? (
                      <>
                        {matchedFolders.map((matchedFolder) => {
                          const folderCardKey = `${courseId}:${matchedFolder.id}`;
                          const thisFolderOpen = Boolean(openFolderCards[folderCardKey]);
                          const folderTotalFiles = countFolderFiles(matchedFolder);
                          const nestedFolderCount = countNestedFolders(matchedFolder);
                          return (
                            <div key={folderCardKey} className="space-y-3">
                              <button
                                type="button"
                                onClick={() => setOpenFolderCards((prev) => ({ ...prev, [folderCardKey]: !prev[folderCardKey] }))}
                                className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-left transition hover:bg-muted/50"
                              >
                                <span className="flex min-w-0 flex-1 items-center gap-2">
                                  {thisFolderOpen ? (
                                    <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
                                  ) : (
                                    <Folder className="h-4 w-4 shrink-0 text-primary" />
                                  )}
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold uppercase tracking-wide text-foreground">
                                      {matchedFolder.name || course?.name || "Course folder"}
                                    </span>
                                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                      <a
                                        href={matchedFolder.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="truncate underline decoration-dotted hover:text-primary"
                                      >
                                        ({matchedFolder.url})
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          void navigator.clipboard?.writeText(matchedFolder.url);
                                        }}
                                        title="Copy Drive link"
                                        className="shrink-0 hover:text-primary"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </button>
                                    </span>
                                  </span>
                                </span>
                                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                                  {nestedFolderCount > 0 && (
                                    <span>
                                      {nestedFolderCount} folder{nestedFolderCount === 1 ? "" : "s"}
                                    </span>
                                  )}
                                  <span>
                                    {folderTotalFiles} file{folderTotalFiles === 1 ? "" : "s"}
                                  </span>
                                  <ChevronDown className={"h-4 w-4 transition-transform " + (thisFolderOpen ? "rotate-180" : "")} />
                                </span>
                              </button>

                              {thisFolderOpen && (
                                <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-border bg-background/70 p-2">
                                  {(matchedFolder.subfolders ?? []).map((sub: any) => (
                                    <FolderNodeSection
                                      key={sub.id}
                                      node={sub}
                                      nodeKey={folderCardKey + ":" + sub.id}
                                      openSubfolders={openSubfolders}
                                      toggleSubfolder={toggleSubfolder}
                                      driveLink={driveLink}
                                    />
                                  ))}
                                  {(matchedFolder.rootFiles ?? []).map((file: any) => (
                                    <FileRow key={file.id} file={file} driveLink={driveLink} />
                                  ))}
                                  {folderTotalFiles === 0 && nestedFolderCount === 0 && (
                                    <p className="px-2 py-2 text-sm text-muted-foreground">This folder is empty.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                        No matched Drive folder was found for this course yet. Rename a Drive subfolder to the
                        course name, code or acronym and save the link again.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Drive deep-search note</p>
        <p className="mt-1">
          Yes — this is possible with the Google Drive API, but only through a backend integration using OAuth and recursive folder listing.
          A public folder URL alone is not enough to deep-search files automatically in the browser. For production, we should store a shared Drive folder URL per course,
          then use a server endpoint to list child folders/files recursively and render them here.
        </p>
      </div>
    </div>
  );
};

export default ClassCourseMaterialsPage;
