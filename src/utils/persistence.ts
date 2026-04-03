import { EditorProject } from '@/types/editor';

export async function saveProjectToDB(project: EditorProject): Promise<void> {
  const { set: idbSet } = await import('idb-keyval');
  await idbSet('rvp_editor_project', project);
}

export async function loadProjectFromDB(): Promise<EditorProject | null> {
  const { get: idbGet } = await import('idb-keyval');
  const project = await idbGet<EditorProject>('rvp_editor_project');
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
