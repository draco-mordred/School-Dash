const normalizeDriveName = (value: string) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const extractGoogleDriveFolderId = (url: string) => {
  if (!url) return null;
  const trimmed = String(url).trim();

  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const folderMatch = parsed.pathname.match(/\/folders\/([A-Za-z0-9_-]+)/i);
    const fileMatch = parsed.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/i);
    const folderParam = parsed.searchParams.get("id") || parsed.searchParams.get("folderid");

    if (folderMatch?.[1]) return folderMatch[1];
    if (fileMatch?.[1]) return fileMatch[1];
    if (folderParam) return folderParam;
  } catch {
    // ignore invalid URL parsing and fall back to null
  }

  return null;
};

const driveMimeGroups: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/svg+xml": "image",
  "application/vnd.google-apps.document": "document",
  "application/vnd.google-apps.spreadsheet": "spreadsheet",
  "application/vnd.google-apps.presentation": "presentation",
  "application/vnd.google-apps.folder": "folder",
  "video/mp4": "video",
  "video/webm": "video",
  "audio/mpeg": "audio",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "spreadsheet",
};

const getDriveMimeGroup = (mimeType?: string) => {
  if (!mimeType) return "other";
  return driveMimeGroups[mimeType] ?? "other";
};

const matchesCourseName = (courseName: string, folderName: string) => {
  const normalizedCourse = normalizeDriveName(courseName);
  const normalizedFolder = normalizeDriveName(folderName);

  if (!normalizedCourse || !normalizedFolder) return false;

  if (normalizedCourse === normalizedFolder) return true;
  if (normalizedCourse.includes(normalizedFolder) || normalizedFolder.includes(normalizedCourse)) return true;

  const courseTokens = normalizedCourse.split(" ").filter(Boolean);
  const folderTokens = normalizedFolder.split(" ").filter(Boolean);
  const overlap = courseTokens.filter((token) => folderTokens.includes(token));

  return overlap.length >= Math.max(1, Math.min(courseTokens.length, folderTokens.length) - 1);
};

const listDriveFolderChildren = async (folderId: string, accessToken: string) => {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,parents,webViewLink,webContentLink,iconLink,thumbnailLink,modifiedTime,size)&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=1000`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Drive API request failed: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as { files?: any[] };
  return payload.files ?? [];
};

const recursivelyCollectDriveItems = async (folderId: string, accessToken: string, seen = new Set<string>()) => {
  if (!folderId || seen.has(folderId)) {
    return [] as any[];
  }

  seen.add(folderId);
  const items = await listDriveFolderChildren(folderId, accessToken);
  const nested: any[] = [];

  for (const item of items) {
    nested.push(item);

    if (item.mimeType === "application/vnd.google-apps.folder") {
      const children = await recursivelyCollectDriveItems(item.id, accessToken, seen);
      nested.push(...children);
    }
  }

  return nested;
};

export const buildDriveMaterialsPayload = async (rootUrl: string, courseDocs: any[], accessTokenOverride?: string | null) => {
  const folderId = extractGoogleDriveFolderId(rootUrl);
  if (!folderId) {
    return {
      synced: false,
      source: rootUrl,
      message: "A valid Google Drive folder link is required.",
      courseMaterials: [],
    };
  }

  const accessToken = accessTokenOverride || process.env.GOOGLE_DRIVE_ACCESS_TOKEN || null;
  if (!accessToken) {
    return {
      synced: false,
      source: rootUrl,
      folderId,
      message: "Drive API access is not configured on the backend yet.",
      courseMaterials: [],
    };
  }

  try {
    const driveItems = await recursivelyCollectDriveItems(folderId, accessToken, new Set());
    const folders = driveItems.filter((item) => item.mimeType === "application/vnd.google-apps.folder");

    const courseMaterials = courseDocs
      .map((course) => {
        const folderMatch = folders.find((folder) => matchesCourseName(course?.name ?? "", folder?.name ?? ""));
        if (!folderMatch) return null;

        const folderTree = new Set<string>([folderMatch.id]);
        const parentMap = new Map<string, string[]>();

        for (const item of driveItems) {
          if (!item.parents || !Array.isArray(item.parents)) continue;
          for (const parentId of item.parents) {
            if (!parentMap.has(parentId)) parentMap.set(parentId, []);
            parentMap.get(parentId)!.push(item.id);
          }
        }

        const walkFolderTree = (currentFolderId: string) => {
          const children = parentMap.get(currentFolderId) ?? [];
          for (const childId of children) {
            const childItem = driveItems.find((item) => item.id === childId);
            if (!childItem) continue;
            if (childItem.mimeType === "application/vnd.google-apps.folder" && !folderTree.has(childId)) {
              folderTree.add(childId);
              walkFolderTree(childId);
            }
          }
        };

        walkFolderTree(folderMatch.id);

        const files = driveItems.filter((item) => {
          if (item.id === folderMatch.id) return false;
          if (item.mimeType === "application/vnd.google-apps.folder") return false;
          const hasRelevantParent = (item.parents ?? []).some((parentId) => folderTree.has(parentId));
          return hasRelevantParent;
        });

        const groupedFiles = files.reduce((acc: Record<string, any[]>, file) => {
          const group = getDriveMimeGroup(file.mimeType);
          acc[group] = acc[group] ?? [];
          acc[group].push({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            viewUrl: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
            downloadUrl: file.webContentLink ?? `https://drive.google.com/uc?export=download&id=${file.id}`,
            thumbnailUrl: file.thumbnailLink ?? file.iconLink ?? "",
            size: Number(file.size ?? 0),
            modifiedTime: file.modifiedTime ?? null,
          });
          return acc;
        }, {});

        return {
          courseId: String(course?._id ?? ""),
          courseName: course?.name ?? "Untitled course",
          folderId: folderMatch.id,
          folderName: folderMatch.name,
          files: Object.entries(groupedFiles)
            .map(([group, items]) => ({
              group,
              items: (items as any[]).slice().sort((a, b) => new Date(String(b.modifiedTime ?? 0)).getTime() - new Date(String(a.modifiedTime ?? 0)).getTime()),
            }))
            .sort((a, b) => a.group.localeCompare(b.group)),
        };
      })
      .filter(Boolean);

    return {
      synced: true,
      source: rootUrl,
      folderId,
      courseMaterials,
    };
  } catch (error) {
    return {
      synced: false,
      source: rootUrl,
      folderId,
      message: error instanceof Error ? error.message : "Could not sync Drive materials.",
      courseMaterials: [],
    };
  }
};

export const classDriveMaterialsService = {
  extractGoogleDriveFolderId,
  buildDriveMaterialsPayload,
  matchesCourseName,
};

export default classDriveMaterialsService;
