import { EditorProject } from '@/types/editor';
import { storage } from '@/storage';

/**
 * Serializes the current project state into a downloadable JSON file.
 * We strip transient blob URLs since they are session-specific.
 */
export function exportProjectToFile(project: EditorProject) {
  try {
    const projectCopy = JSON.parse(JSON.stringify(project)) as EditorProject;
    
    // Scrub session-specific blob URLs (idb references stay intact for local restoration)
    projectCopy.spreads.forEach(spread => {
      spread.elements.forEach(el => {
        if (el.type === 'image') {
          delete el.previewUrl;
          delete el.originalUrl;
        }
      });
    });

    if (projectCopy.assets) {
      projectCopy.assets.forEach(asset => {
        delete asset.previewUrl;
        delete asset.originalUrl;
      });
    }

    const dataString = JSON.stringify(projectCopy);
    const blob = new Blob([dataString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const safeName = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'album';
    const filename = `${safeName}.rvp`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export project to file:', err);
  }
}

/**
 * Parses an ingested .rvp file and reconstructs an EditorProject.
 */
export function importProjectFromFile(file: File): Promise<EditorProject | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const project = JSON.parse(content) as EditorProject;
        
        // Basic validation
        if (project && project.id && Array.isArray(project.spreads)) {
          await storage.saveProject(project);
          resolve(project);
        } else {
          console.error('Invalid .rvp project descriptor.');
          resolve(null);
        }
      } catch (err) {
        console.error('Failed to parse .rvp file:', err);
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}
