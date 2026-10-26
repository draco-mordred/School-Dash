const normalizeDriveName = (value: string) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const compactName = (value: string) => normalizeDriveName(value).replace(/\s+/g, "");

const acronymOf = (value: string) =>
  normalizeDriveName(value)
    .split(" ")
    .filter(Boolean)
    .map((token) => token[0])
    .join("");

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

// ─── Course folder alias registry ────────────────────────────────────
// Keys are compacted canonical course/department names; values are common
// short forms, acronyms and alternate spellings used for Drive folders.
const COURSE_FOLDER_ALIASES: Record<string, string[]> = {
  medicine: ["med", "internal medicine", "internal med"],
  pediatrics: ["paediatrics", "paediatric", "pediatric", "ped", "paed", "peds", "pae", "pd"],
  obstetricsandgynecology: [
    "obgyn",
    "obsgyn",
    "obgynae",
    "obsgynae",
    "og",
    "o g",
    "oandg",
    "oandgyn",
    "obstetrics",
    "obstetric",
    "gynaecology",
    "gynecology",
    "obstetricsandgynaecology",
    "obstetricsandgynaec",
    "obg",
  ],
  obstetricsandgynaecology: [
    // British-spelling canonical entry so "Obstetrics and Gynaecology"
    // course names match directly, plus the usual short forms.
    "obstetrics and gynaecology",
    "obstetricsandgynecology",
    "obgyn",
    "obsgyn",
    "obgynae",
    "obsgynae",
    "og",
    "o g",
    "oandg",
    "oandgyn",
    "obstetrics",
    "obstetric",
    "gynaecology",
    "gynecology",
    "obstetricsandgynaec",
    "obg",
  ],
  surgery: ["surg", "general surgery"],
  psychiatry: ["psych", "psy", "psychiatrices"],
  ent: [
    "orl",
    "otorhinolaryngology",
    "ear nose and throat",
    "ear nose throat",
    "head and neck",
  ],
  anaesthesiology: [
    "anesthesia",
    "anesthesiology",
    "anaesthesia",
    "anaesthetics",
    "anesthetics",
    "ane",
    "anaes",
    "anes",
  ],
  radiology: ["radio", "radiodiagnosis", "imaging", "rad"],
  ophthalmology: ["ophthal", "ophtho", "eye", "oph"],
  dermatology: ["derm", "skin", "der"],
  communitymedicine: [
    "communitymed",
    "comm med",
    "commed",
    "community health",
    "public health",
    "preventive medicine",
    "com",
  ],
  hematologyandbloodtransfusion: [
    "hematology",
    "haematology",
    "haem",
    "hem",
    "blood transfusion",
    "blood",
    "hbt",
  ],
  microbiology: ["medical microbiology", "micro", "mic", "microbe"],
  chemicalpathology: ["chem path", "chempath", "chemical path", "clinical chemistry", "chp", "cp"],
  clinicalpharmacologyandtherapeutics: [
    "pharmacology",
    "pharm",
    "pharma",
    "clinical pharmacology",
    "pha",
    "therapeutics",
  ],
  anatomicpathology: ["anat path", "anatpath", "pathology", "histopathology", "histopath", "pat", "ap"],
  familymedicine: ["family med", "fam med", "fam", "family practice"],
  orthopaedics: ["orthopedics", "orthopedic", "orthopaedic", "ortho", "ort"],
  forensicmedicine: ["forensic", "forensic pathology", "forensic path", "for"],
};

// Resolve which canonical course a course name refers to (longest match wins),
// then return that course's alias list.
const canonicalAliasesForCourse = (courseName: string): string[] => {
  const key = compactName(courseName);
  if (!key) return [];

  let best: { canonical: string; length: number } | null = null;

  for (const [canonical, aliases] of Object.entries(COURSE_FOLDER_ALIASES)) {
    const compactCanonical = compactName(canonical);

    if (key === compactCanonical) {
      best = { canonical, length: compactCanonical.length };
      break;
    }

    for (const candidate of [canonical, ...aliases]) {
      const compactCandidate = compactName(candidate);
      if (compactCandidate.length >= 4 && (key === compactCandidate || key.includes(compactCandidate))) {
        if (!best || compactCandidate.length > best.length) {
          best = { canonical, length: compactCandidate.length };
        }
      }
    }
  }

  return best ? COURSE_FOLDER_ALIASES[best.canonical] : [];
};

const nameMatchesFolder = (candidate: string, folderName: string): boolean => {
  const normalizedCandidate = normalizeDriveName(candidate);
  const normalizedFolder = normalizeDriveName(folderName);

  if (!normalizedCandidate || !normalizedFolder) return false;

  if (normalizedCandidate === normalizedFolder) return true;

  const compactCandidate = compactName(candidate);
  const compactFolder = compactName(folderName);
  if (compactCandidate.length >= 2 && compactFolder === compactCandidate) return true;

  const candidateTokens = normalizedCandidate.split(" ").filter(Boolean);
  const folderTokens = normalizedFolder.split(" ").filter(Boolean);

  // Whole-token match ("med" matches folder "MED 500" but not "Medical Microbiology")
  if (candidateTokens.length === 1 && folderTokens.includes(normalizedCandidate)) return true;
  if (folderTokens.length === 1 && candidateTokens.includes(normalizedFolder)) return true;

  // Containment with a minimum length to avoid substring false positives
  if (normalizedCandidate.length >= 4 && normalizedFolder.includes(normalizedCandidate)) return true;
  if (normalizedFolder.length >= 4 && normalizedCandidate.includes(normalizedFolder)) return true;

  // Token overlap (fuzzy partial-name match)
  const overlap = candidateTokens.filter((token) => folderTokens.includes(token));
  if (overlap.length >= Math.max(1, Math.min(candidateTokens.length, folderTokens.length) - 1)) return true;

  // Acronyms ("Medical Biochemistry" <-> "MB")
  const candidateAcronym = acronymOf(candidate);
  const folderAcronym = acronymOf(folderName);
  if (candidateAcronym.length >= 2 && compactFolder === candidateAcronym) return true;
  if (folderAcronym.length >= 2 && compactCandidate === folderAcronym) return true;

  return false;
};

export const matchesCourseName = (
  courseOrName: string | { name?: string; code?: string },
  folderName: string,
) => {
  const courseName =
    typeof courseOrName === "string" ? courseOrName : String(courseOrName?.name ?? "");
  const courseCode =
    typeof courseOrName === "string" ? "" : String(courseOrName?.code ?? "");

  const candidates = [
    courseName,
    courseCode,
    ...canonicalAliasesForCourse(courseName),
  ].filter(Boolean);

  return candidates.some((candidate) => nameMatchesFolder(candidate, folderName));
};

const listDriveFolderChildren = async (folderId: string, accessToken: string) => {
  const files: any[] = [];
  let pageToken: string | undefined;

  do {
    const pageParams = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id,name,mimeType,parents,webViewLink,webContentLink,iconLink,thumbnailLink,modifiedTime,size)",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      pageSize: "1000",
    });
    if (pageToken) pageParams.set("pageToken", pageToken);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${pageParams.toString()}`,
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

    const payload = (await response.json()) as { files?: any[]; nextPageToken?: string };
    files.push(...(payload.files ?? []));
    pageToken = payload.nextPageToken;
  } while (pageToken);

  return files;
};

// Fetch a single Drive item's name (used for the saved ROOT folder's display
// name — the crawl only lists the root's children, not the root itself).
const getDriveItemName = async (itemId: string, accessToken: string) => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(itemId)}?fields=id,name&supportsAllDrives=true`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { name?: string };
    return typeof payload?.name === "string" && payload.name ? payload.name : null;
  } catch {
    return null;
  }
};

// Crawl the folder tree breadth-first with bounded concurrency. The original
// version walked one folder per Drive round-trip (fully sequential), so a wide
// class Drive tree took longer than the frontend's request timeout on a cold
// cache (the 3-min listing cache only helps AFTER a successful first crawl).
const DRIVE_CRAWL_CONCURRENCY = 6;

const recursivelyCollectDriveItems = async (folderId: string, accessToken: string, seen = new Set<string>()) => {
  const all: any[] = [];
  if (!folderId || seen.has(folderId)) {
    return all;
  }

  seen.add(folderId);
  const queue: string[] = [folderId];

  while (queue.length) {
    const batch = queue
      .splice(0, DRIVE_CRAWL_CONCURRENCY)
      .filter((id) => !seen.has(id));

    if (!batch.length) continue;
    for (const id of batch) seen.add(id);

    const listings = await Promise.all(
      batch.map((id) => listDriveFolderChildren(id, accessToken)),
    );

    for (const items of listings) {
      for (const item of items) {
        all.push(item);
        if (item.mimeType === "application/vnd.google-apps.folder" && !seen.has(item.id)) {
          queue.push(item.id);
        }
      }
    }
  }

  return all;
};

const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";

const toFileItem = (file: any) => ({
  id: file.id,
  name: file.name,
  mimeType: file.mimeType,
  viewUrl: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
  downloadUrl: file.webContentLink ?? `https://drive.google.com/uc?export=download&id=${file.id}`,
  thumbnailUrl: file.thumbnailLink ?? file.iconLink ?? "",
  size: Number(file.size ?? 0),
  modifiedTime: file.modifiedTime ?? null,
});

const byModifiedDesc = (a: any, b: any) =>
  new Date(String(b.modifiedTime ?? 0)).getTime() - new Date(String(a.modifiedTime ?? 0)).getTime();

// Short-lived server-side cache of the full Drive listing. The materials
// page fires several requests per load (initial fetch + one per course
// in the sequential sync); without this each request re-crawled the
// entire Drive tree and blew past the frontend's 30s timeout.
const DRIVE_LISTING_CACHE = new Map<string, { items: any[]; rootName: string | null; expires: number }>();
const DRIVE_LISTING_CACHE_TTL_MS = 3 * 60 * 1000;

export const buildDriveMaterialsPayload = async (
  rootUrl: string,
  courseDocs: any[],
  accessTokenOverride?: string | null,
  accessTokenCandidates?: string[],
) => {
  const folderId = extractGoogleDriveFolderId(rootUrl);
  if (!folderId) {
    return {
      synced: false,
      source: rootUrl,
      message: "A valid Google Drive folder link is required.",
      courseMaterials: [],
    };
  }

  // Walk ALL usable token candidates until one actually lists the folder.
  // "Usable" (not expired) does not imply access: an admin whose own
  // connected Google account differs from the account the class Drive was
  // shared with would otherwise see an error/empty page while students
  // (resolved to the shared admin token) see everything.
  const tokenCandidates = Array.from(
    new Set(
      [
        ...(Array.isArray(accessTokenCandidates) ? accessTokenCandidates : []),
        accessTokenOverride || "",
        process.env.GOOGLE_DRIVE_ACCESS_TOKEN || "",
      ]
        .map((token) => String(token ?? "").trim())
        .filter(Boolean),
    ),
  );

  if (!tokenCandidates.length) {
    return {
      synced: false,
      source: rootUrl,
      folderId,
      message: "Drive API access is not configured on the backend yet.",
      courseMaterials: [],
    };
  }

  try {
    let driveItems: any[] | null = null;
    let rootFolderName: string | null = null;
    let rootNameToken: string | null = null;
    const cachedListing = DRIVE_LISTING_CACHE.get(folderId);
    if (cachedListing && cachedListing.expires > Date.now()) {
      driveItems = cachedListing.items;
      rootFolderName = cachedListing.rootName;
    } else {
      let lastError: unknown = null;
      for (const token of tokenCandidates) {
        try {
          driveItems = await recursivelyCollectDriveItems(folderId, token, new Set());
          rootNameToken = token;
          break;
        } catch (error) {
          lastError = error;
        }
      }
      if (!driveItems) {
        throw lastError ?? new Error("Could not sync Drive materials.");
      }
      if (rootNameToken) {
        rootFolderName = await getDriveItemName(folderId, rootNameToken);
      }
      DRIVE_LISTING_CACHE.set(folderId, {
        items: driveItems,
        rootName: rootFolderName,
        expires: Date.now() + DRIVE_LISTING_CACHE_TTL_MS,
      });
    }
    const folders = driveItems.filter((item) => item.mimeType === DRIVE_FOLDER_MIME);

    // Drive-wide index: parent -> children, and id -> item
    const parentMap = new Map<string, string[]>();
    const byId = new Map<string, any>();
    for (const item of driveItems) {
      byId.set(item.id, item);
      for (const parentId of item.parents ?? []) {
        if (!parentMap.has(parentId)) parentMap.set(parentId, []);
        parentMap.get(parentId)!.push(item.id);
      }
    }

    // All files anywhere under a folder (excluding the folder itself), newest first
    const subtreeFiles = (rootFolderId: string) => {
      const out: any[] = [];
      const stack = [rootFolderId];
      const visited = new Set<string>([rootFolderId]);
      while (stack.length) {
        const current = stack.pop()!;
        for (const childId of parentMap.get(current) ?? []) {
          if (visited.has(childId)) continue;
          visited.add(childId);
          const child = byId.get(childId);
          if (!child) continue;
          if (child.mimeType === DRIVE_FOLDER_MIME) stack.push(childId);
          else out.push(child);
        }
      }
      return out.sort(byModifiedDesc);
    };

    // All folder ids in a folder's subtree (excluding the folder itself)
    const subtreeFolderIds = (rootFolderId: string) => {
      const ids = new Set<string>();
      const stack = [rootFolderId];
      while (stack.length) {
        const current = stack.pop()!;
        for (const childId of parentMap.get(current) ?? []) {
          const child = byId.get(childId);
          if (!child) continue;
          if (child.mimeType === DRIVE_FOLDER_MIME) {
            ids.add(childId);
            stack.push(childId);
          }
        }
      }
      return ids;
    };

    const courseMaterials = (
      await Promise.all(
        courseDocs.map(async (course) => {
        const courseKey = { name: course?.name ?? "", code: (course as any)?.code ?? "" };
        const matchingFolders = folders.filter((folder) =>
          matchesCourseName(courseKey, folder?.name ?? ""),
        );
        if (!matchingFolders.length) return null;

        // Keep ALL folders that match the course name/code/acronym (deduped by id)
        const dedupedMatches = matchingFolders.filter(
          (folder: any, index: number, arr: any[]) =>
            arr.findIndex((other: any) => other.id === folder.id) === index,
        );

        // A matched folder that lives INSIDE another matched folder is
        // already rendered as part of that folder's full tree — including it
        // as its own card would duplicate files. Keep only top-level matches
        // (e.g. "Obstetrics and Gynaecology" root + a nested "O&G" subfolder
        // collapses into one card showing the root's FULL contents).
        const keptMatches = dedupedMatches.filter((match: any) =>
          !dedupedMatches.some(
            (other: any) => other.id !== match.id && subtreeFolderIds(other.id).has(match.id),
          ),
        );

        // Build the FULL nested tree for EVERY matched folder from the single
        // root listing already in memory (fast — NO per-folder Drive
        // round-trips, which caused 30s+ timeouts). The `seen` set must
        // start EMPTY: the builder marks the folder itself once it builds
        // it — seeding it with the folder's own id would skip the folder
        // and return an empty tree (the earlier bug).
        const buildFolderNode = (nodeFolderId: string, nodeName: string, seen: Set<string>): any => {
          if (seen.has(nodeFolderId)) {
            return { id: nodeFolderId, name: nodeName, subfolders: [], rootFiles: [] };
          }
          seen.add(nodeFolderId);

          const childIds = parentMap.get(nodeFolderId) ?? [];
          const childItems = childIds.map((id) => byId.get(id)).filter(Boolean);

          return {
            id: nodeFolderId,
            name: nodeName,
            subfolders: childItems
              .filter((child: any) => child.mimeType === DRIVE_FOLDER_MIME)
              .map((sub: any) => buildFolderNode(sub.id, sub.name, seen)),
            rootFiles: childItems
              .filter((child: any) => child.mimeType !== DRIVE_FOLDER_MIME)
              .sort(byModifiedDesc)
              .map(toFileItem),
          };
        };

        const matchedFolders = keptMatches.map((folderMatch: any) => ({
          ...buildFolderNode(folderMatch.id, folderMatch.name, new Set()),
          url: `https://drive.google.com/drive/folders/${folderMatch.id}`,
        }));

        // Legacy flat shape (first matched folder) kept for backward compatibility
        const legacyFolders = ((matchedFolders[0] as any)?.subfolders ?? []).map((sub: any) => ({
          id: sub.id,
          name: sub.name,
          items: subtreeFiles(sub.id).map(toFileItem),
        }));

        const allFilesMap = new Map<string, any>();
        for (const file of keptMatches.flatMap((folderMatch: any) => subtreeFiles(folderMatch.id))) {
          allFilesMap.set(file.id, file); // dedupe files shared across matched folders
        }
        const allFiles = [...allFilesMap.values()];

        const groupedFiles = allFiles.reduce((acc: Record<string, any[]>, file) => {
          const group = getDriveMimeGroup(file.mimeType);
          acc[group] = acc[group] ?? [];
          acc[group].push(toFileItem(file));
          return acc;
        }, {});

        return {
          courseId: String(course?._id ?? ""),
          courseName: course?.name ?? "Untitled course",
          folderId: matchedFolders[0]?.id ?? "",
          folderName: matchedFolders[0]?.name ?? "",
          folderUrl: matchedFolders[0]?.url ?? "",
          matchedFolders,
          folders: legacyFolders,
          rootFiles: matchedFolders[0]?.rootFiles ?? [],
          files: Object.entries(groupedFiles)
            .map(([group, items]) => ({
              group,
              items: items as any[],
            }))
            .sort((a, b) => a.group.localeCompare(b.group)),
        };
        }),
      )
    ).filter(Boolean);

    return {
      synced: true,
      source: rootUrl,
      folderId,
      rootFolderName: rootFolderName ?? "",
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
