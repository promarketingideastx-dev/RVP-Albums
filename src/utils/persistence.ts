import { EditorProject, UserDecoration } from '@/types/editor';

export interface ProjectMetadata {
  id: string;
  title: string;
  type: string;
  labPresetId: string;
  labPresetName: string;
  updatedAt: string;
  folder?: string;
}

export async function listProjectsFromDB(): Promise<ProjectMetadata[]> {
  const { get: idbGet } = await import('idb-keyval');
  const registry = await idbGet<ProjectMetadata[]>('rvp_project_registry');
  return registry || [];
}

export async function deleteProjectFromDB(id: string): Promise<void> {
  const { get: idbGet, set: idbSet, del: idbDel } = await import('idb-keyval');
  const registry = (await idbGet<ProjectMetadata[]>('rvp_project_registry')) || [];
  const newRegistry = registry.filter((p) => p.id !== id);
  await idbSet('rvp_project_registry', newRegistry);
  await idbDel(`rvp_project_${id}`);

  if (id === 'proj_genesis') {
    await idbDel('rvp_editor_project');
  }
}

export async function saveProjectToDB(project: EditorProject): Promise<void> {
  const { get: idbGet, set: idbSet } = await import('idb-keyval');

  // Save Full Payload
  await idbSet(`rvp_project_${project.id}`, project);

  // Update Registry
  const registry = (await idbGet<ProjectMetadata[]>('rvp_project_registry')) || [];
  const meta: ProjectMetadata = {
    id: project.id,
    title: project.title,
    type: project.type,
    labPresetId: project.labPresetId,
    labPresetName: project.labPresetName,
    updatedAt: project.updatedAt,
  };

  const existingIndex = registry.findIndex((p) => p.id === project.id);
  if (existingIndex >= 0) {
    registry[existingIndex] = meta;
  } else {
    registry.push(meta);
  }

  await idbSet('rvp_project_registry', registry);
}

/**
 * Fast viewport hydration: loads only lightweight preview blobs (previewBlobId) into ObjectURLs
 * and reuses them across assets and spread elements. Heavy originalBlobId files remain in IndexedDB
 * until exportEngine requests them at 300 DPI export time.
 */
export async function hydrateProjectBlobs(project: EditorProject): Promise<EditorProject> {
  const { get: idbGet } = await import('idb-keyval');

  // Cache of blobId -> objectURL to avoid reading the same blob from IndexedDB more than once
  const blobUrlCache = new Map<string, string>();
  const resolveBlobUrl = async (blobId?: string): Promise<string | undefined> => {
    if (!blobId) return undefined;
    const cached = blobUrlCache.get(blobId);
    if (cached) return cached;
    const blob = await idbGet<Blob>(blobId);
    if (!blob) return undefined;
    const url = URL.createObjectURL(blob);
    blobUrlCache.set(blobId, url);
    return url;
  };

  // 1. Hydrate Asset Tray Blobs (fast preview proxy first; fallback to original only if preview missing)
  const rawAssets = project.assets || [];
  const hydratedAssets = await Promise.all(
    rawAssets.map(async (asset) => {
      const newAsset = { ...asset };
      if (!newAsset.previewUrl || !newAsset.previewUrl.startsWith('blob:')) {
        newAsset.previewUrl =
          (await resolveBlobUrl(newAsset.previewBlobId)) ||
          (await resolveBlobUrl(newAsset.originalBlobId)) ||
          newAsset.previewUrl;
      }
      // Point originalUrl to previewUrl in memory; exportEngine resolves originalBlobId directly from IDB
      if (!newAsset.originalUrl || !newAsset.originalUrl.startsWith('blob:')) {
        newAsset.originalUrl = newAsset.previewUrl;
      }
      return newAsset;
    })
  );

  const assetMap = new Map<string, (typeof hydratedAssets)[0]>();
  hydratedAssets.forEach((a) => assetMap.set(a.id, a));

  // Optional user decorations lookup if any spread contains user-decoration elements
  const hasUserDecorations = project.spreads.some((s) =>
    s.elements?.some((el) => el.type === 'decoration' && el.sourceType === 'user-decoration' && el.sourceId)
  );
  const userDecs = hasUserDecorations ? (await idbGet<UserDecoration[]>('rvp_user_decorations')) || [] : [];

  // 2. Hydrate Spread Elements reusing assetMap & blobUrlCache
  const hydratedSpreads = await Promise.all(
    project.spreads.map(async (spread) => {
      const hydratedElements = await Promise.all(
        (spread.elements || []).map(async (el) => {
          if (el.type === 'image') {
            const newEl = { ...el };
            const matchedAsset = newEl.assetId ? assetMap.get(newEl.assetId) : undefined;

            if (matchedAsset) {
              newEl.previewBlobId = newEl.previewBlobId || matchedAsset.previewBlobId;
              newEl.originalBlobId = newEl.originalBlobId || matchedAsset.originalBlobId;
              if (matchedAsset.previewUrl) {
                newEl.previewUrl = matchedAsset.previewUrl;
                newEl.originalUrl = matchedAsset.originalUrl || matchedAsset.previewUrl;
              }
            }

            if (!newEl.previewUrl || !newEl.previewUrl.startsWith('blob:')) {
              newEl.previewUrl =
                (await resolveBlobUrl(newEl.previewBlobId)) ||
                (await resolveBlobUrl(newEl.originalBlobId)) ||
                newEl.previewUrl;
            }
            if (!newEl.originalUrl || !newEl.originalUrl.startsWith('blob:')) {
              newEl.originalUrl = newEl.previewUrl;
            }

            return newEl;
          }

          if (el.type === 'decoration' && el.sourceType === 'user-decoration' && el.sourceId) {
            const matched = userDecs.find((d) => d.id === el.sourceId);
            if (matched?.blob) {
              return { ...el, src: URL.createObjectURL(matched.blob) };
            }
          }

          return el;
        })
      );
      return { ...spread, elements: hydratedElements };
    })
  );

  return { ...project, spreads: hydratedSpreads, assets: hydratedAssets };
}

export async function loadProjectFromDB(id: string): Promise<EditorProject | null> {
  const { get: idbGet } = await import('idb-keyval');
  let project = await idbGet<EditorProject>(`rvp_project_${id}`);

  if (!project && id === 'proj_genesis') {
    project = await idbGet<EditorProject>('rvp_editor_project');
  }

  if (!project) return null;

  return project;
}
