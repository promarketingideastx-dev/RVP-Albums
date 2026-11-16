import { EditorProject } from '@/types/editor';

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
  const registry = await idbGet<ProjectMetadata[]>('rvp_project_registry') || [];
  const newRegistry = registry.filter(p => p.id !== id);
  await idbSet('rvp_project_registry', newRegistry);
  await idbDel(`rvp_project_${id}`);
  
  // Nuke the legacy genesis fallback block ensuring it doesn't resurrect as a zombie
  if (id === 'proj_genesis') {
     await idbDel('rvp_editor_project');
  }
}

export async function saveProjectToDB(project: EditorProject): Promise<void> {
  const { get: idbGet, set: idbSet } = await import('idb-keyval');
  
  // Save Full Payload
  await idbSet(`rvp_project_${project.id}`, project);
  
  // Update Registry
  const registry = await idbGet<ProjectMetadata[]>('rvp_project_registry') || [];
  const meta: ProjectMetadata = {
    id: project.id,
    title: project.title,
    type: project.type,
    labPresetId: project.labPresetId,
    labPresetName: project.labPresetName,
    updatedAt: project.updatedAt,
  };
  
  const existingIndex = registry.findIndex(p => p.id === project.id);
  if (existingIndex >= 0) {
    registry[existingIndex] = meta;
  } else {
    registry.push(meta);
  }
  
  await idbSet('rvp_project_registry', registry);
}

export async function hydrateProjectBlobs(project: EditorProject): Promise<EditorProject> {
  const { get: idbGet } = await import('idb-keyval');

  // 1. Hydrate Asset Tray Blobs
  const rawAssets = project.assets || [];
  const hydratedAssets = await Promise.all(rawAssets.map(async (asset) => {
    const newAsset = { ...asset };
    
    // Preview URL restoration with originalBlob fallback
    if (!newAsset.previewUrl) {
      if (newAsset.previewBlobId) {
        const previewBlob = await idbGet<Blob>(newAsset.previewBlobId);
        if (previewBlob) newAsset.previewUrl = URL.createObjectURL(previewBlob);
      }
      if (!newAsset.previewUrl && newAsset.originalBlobId) {
        const origBlob = await idbGet<Blob>(newAsset.originalBlobId);
        if (origBlob) newAsset.previewUrl = URL.createObjectURL(origBlob);
      }
    }

    // Original URL restoration with previewBlob fallback
    if (!newAsset.originalUrl) {
      if (newAsset.originalBlobId) {
        const originalBlob = await idbGet<Blob>(newAsset.originalBlobId);
        if (originalBlob) newAsset.originalUrl = URL.createObjectURL(originalBlob);
      }
      if (!newAsset.originalUrl && newAsset.previewBlobId) {
        const prevBlob = await idbGet<Blob>(newAsset.previewBlobId);
        if (prevBlob) newAsset.originalUrl = URL.createObjectURL(prevBlob);
      }
    }

    // Ultimate fallback for preview/original
    newAsset.previewUrl = newAsset.previewUrl || newAsset.originalUrl;
    newAsset.originalUrl = newAsset.originalUrl || newAsset.previewUrl;

    return newAsset;
  }));

  // Create an asset lookup map for quick cross-referencing
  const assetMap = new Map<string, typeof hydratedAssets[0]>();
  hydratedAssets.forEach(a => assetMap.set(a.id, a));

  // 2. Hydrate Spreads Elements
  const hydratedSpreads = await Promise.all(project.spreads.map(async (spread) => {
    const hydratedElements = await Promise.all(spread.elements.map(async (el) => {
      if (el.type === 'image') {
        const newEl = { ...el };

        // Cross-reference with assets if blob IDs are missing on element
        if (newEl.assetId && (!newEl.previewBlobId || !newEl.originalBlobId)) {
          const matchedAsset = assetMap.get(newEl.assetId);
          if (matchedAsset) {
            newEl.previewBlobId = newEl.previewBlobId || matchedAsset.previewBlobId;
            newEl.originalBlobId = newEl.originalBlobId || matchedAsset.originalBlobId;
            if (!newEl.previewUrl && matchedAsset.previewUrl) newEl.previewUrl = matchedAsset.previewUrl;
            if (!newEl.originalUrl && matchedAsset.originalUrl) newEl.originalUrl = matchedAsset.originalUrl;
          }
        }

        // Re-generate preview blob URL
        if (!newEl.previewUrl && newEl.previewBlobId) {
          const previewBlob = await idbGet<Blob>(newEl.previewBlobId);
          if (previewBlob) {
            newEl.previewUrl = URL.createObjectURL(previewBlob);
          }
        }
        
        // Re-generate original blob URL
        if (!newEl.originalUrl && newEl.originalBlobId) {
          const originalBlob = await idbGet<Blob>(newEl.originalBlobId);
          if (originalBlob) {
            newEl.originalUrl = URL.createObjectURL(originalBlob);
          }
        }

        // Fallbacks between previewUrl and originalUrl
        if (!newEl.previewUrl && newEl.originalUrl) {
          newEl.previewUrl = newEl.originalUrl;
        }
        if (!newEl.originalUrl && newEl.previewUrl) {
          newEl.originalUrl = newEl.previewUrl;
        }

        // Fallback to linked asset if still missing
        if ((!newEl.previewUrl || !newEl.originalUrl) && newEl.assetId) {
          const matchedAsset = assetMap.get(newEl.assetId);
          if (matchedAsset) {
            newEl.previewUrl = newEl.previewUrl || matchedAsset.previewUrl;
            newEl.originalUrl = newEl.originalUrl || matchedAsset.originalUrl;
          }
        }

        return newEl;
      }
      return el;
    }));
    return { ...spread, elements: hydratedElements };
  }));

  return { ...project, spreads: hydratedSpreads, assets: hydratedAssets };
}

export async function loadProjectFromDB(id: string): Promise<EditorProject | null> {
  const { get: idbGet } = await import('idb-keyval');
  let project = await idbGet<EditorProject>(`rvp_project_${id}`);
  
  // Fallback for extreme legacy dev environment (genesis project override)
  if (!project && id === 'proj_genesis') {
    project = await idbGet<EditorProject>('rvp_editor_project');
  }

  if (!project) return null;

  return hydrateProjectBlobs(project);
}
