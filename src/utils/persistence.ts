import { get as idbGet, set as idbSet } from 'idb-keyval';
import { EditorProject } from '@/types/editor';

export async function saveProjectToDB(project: EditorProject): Promise<void> {
  // Serialize the whole AST. String URLs (blob:http...) will be safely skipped or overwritten on next load.
  await idbSet('rvp_editor_project', project);
}

export async function loadProjectFromDB(): Promise<EditorProject | null> {
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
