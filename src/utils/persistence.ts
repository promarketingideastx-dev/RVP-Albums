import { EditorProject } from '@/types/editor';

export interface ProjectMetadata {
  id: string;
  title: string;
  type: string;
  labPresetId: string;
  labPresetName: string;
  updatedAt: string;
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

export async function loadProjectFromDB(id: string): Promise<EditorProject | null> {
  const { get: idbGet } = await import('idb-keyval');
  let project = await idbGet<EditorProject>(`rvp_project_${id}`);
  
  // Fallback for extreme legacy dev environment (genesis project override)
  if (!project && id === 'proj_genesis') {
    project = await idbGet<EditorProject>('rvp_editor_project');
  }

  if (!project) return null;

  // Hydration phase: Restore dynamic object URLs from actual stored Blobs in IndexedDB
  const hydratedSpreads = await Promise.all(project.spreads.map(async (spread) => {
    const hydratedElements = await Promise.all(spread.elements.map(async (el) => {
      if (el.type === 'image') {
        const newEl = { ...el };
        
        // Re-generate preview blob URL
        if (el.previewBlobId) {
          const previewBlob = await idbGet<Blob>(el.previewBlobId);
          if (previewBlob) {
            newEl.previewUrl = URL.createObjectURL(previewBlob);
          }
        }
        
        // Re-generate original blob URL
        if (el.originalBlobId) {
          const originalBlob = await idbGet<Blob>(el.originalBlobId);
          if (originalBlob) {
            newEl.originalUrl = URL.createObjectURL(originalBlob);
          }
        }
        return newEl;
      }
      return el;
    }));
    return { ...spread, elements: hydratedElements };
  }));

  return { ...project, spreads: hydratedSpreads };
}
