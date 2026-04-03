import { StorageDriver, ProjectMetadata } from './StorageDriver';
import { EditorProject, ProjectAsset } from '@/types/editor';

export class IDBDriver implements StorageDriver {
  private async getIDB() {
    return await import('idb-keyval');
  }

  async listProjects(): Promise<ProjectMetadata[]> {
    const { get } = await this.getIDB();
    const registry = await get<ProjectMetadata[]>('rvp_project_registry');
    return registry || [];
  }

  async createProject(project: EditorProject): Promise<void> {
    await this.saveProject(project);
  }

  async openProject(id: string): Promise<EditorProject | null> {
    const { get } = await this.getIDB();
    let project = await get<EditorProject>(`rvp_project_${id}`);
    
    // Legacy fallback check exactly as existed
    if (!project && id === 'proj_genesis') {
      project = await get<EditorProject>('rvp_editor_project');
    }

    if (!project) return null;

    // Hydration phase mapping Blobs to objectURLs
    const hydratedSpreads = await Promise.all(project.spreads.map(async (spread) => {
      const hydratedElements = await Promise.all(spread.elements.map(async (el) => {
        if (el.type === 'image') {
          const newEl = { ...el };
          if (el.previewBlobId) {
            const previewBlob = await get<Blob>(el.previewBlobId);
            if (previewBlob) newEl.previewUrl = URL.createObjectURL(previewBlob);
          }
          if (el.originalBlobId) {
            const originalBlob = await get<Blob>(el.originalBlobId);
            if (originalBlob) newEl.originalUrl = URL.createObjectURL(originalBlob);
          }
          return newEl;
        }
        return el;
      }));
      return { ...spread, elements: hydratedElements };
    }));

    const rawAssets = project.assets || [];
    const hydratedAssets = await Promise.all(rawAssets.map(async (asset) => {
      const newAsset = { ...asset };
      if (asset.previewBlobId) {
        const previewBlob = await get<Blob>(asset.previewBlobId);
        if (previewBlob) newAsset.previewUrl = URL.createObjectURL(previewBlob);
      }
      if (asset.originalBlobId) {
        const originalBlob = await get<Blob>(asset.originalBlobId);
        if (originalBlob) newAsset.originalUrl = URL.createObjectURL(originalBlob);
      }
      return newAsset;
    }));

    return { ...project, spreads: hydratedSpreads, assets: hydratedAssets };
  }

  async saveProject(project: EditorProject): Promise<void> {
    const { get, set } = await this.getIDB();
    await set(`rvp_project_${project.id}`, project);
    
    const registry = await get<ProjectMetadata[]>('rvp_project_registry') || [];
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
    await set('rvp_project_registry', registry);
  }

  async deleteProject(id: string): Promise<void> {
    const { get, set, del } = await this.getIDB();
    const registry = await get<ProjectMetadata[]>('rvp_project_registry') || [];
    const newRegistry = registry.filter(p => p.id !== id);
    await set('rvp_project_registry', newRegistry);
    await del(`rvp_project_${id}`);
    
    if (id === 'proj_genesis') {
       await del('rvp_editor_project');
    }
  }

  async addAsset(file: File): Promise<ProjectAsset> {
    const { set } = await this.getIDB();
    const assetId = `asset_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const previewBlobId = `blob_prev_${assetId}`;
    const originalBlobId = `blob_orig_${assetId}`;
    
    // In a real browser, creating ImageBitmaps or scaling could happen here.
    // For pure architectural parity with current bounds, we map the single file strictly.
    await set(previewBlobId, file);
    await set(originalBlobId, file);
    
    return {
      id: assetId,
      name: file.name,
      originalBlobId,
      previewBlobId,
      originalUrl: URL.createObjectURL(file), // Provide immediate UX hydration natively
      previewUrl: URL.createObjectURL(file)
    };
  }

  async removeAsset(asset: ProjectAsset): Promise<void> {
    const { del } = await this.getIDB();
    
    // Memory Garbage Collection
    if (asset.previewUrl && asset.previewUrl.startsWith('blob:')) URL.revokeObjectURL(asset.previewUrl);
    if (asset.originalUrl && asset.originalUrl.startsWith('blob:')) URL.revokeObjectURL(asset.originalUrl);
    
    // Persistent Storage Purge
    if (asset.previewBlobId) await del(asset.previewBlobId);
    if (asset.originalBlobId) await del(asset.originalBlobId);
  }

  async cleanupElement(element: any): Promise<void> {
    // For pure element cleanup, memory URL strings must be revoked to stop RAM leakage.
    // However, the actual persistent IDB blob is SHARED with the AssetTray asset. 
    // We MUST NOT delete the underlying Blob from IDB when an element is removed from a spread, 
    // otherwise the Asset in the tray breaks instantly!
    // The IDB Blob will only be deleted when removeAsset() is explicitly called via the Tray.
    
    if (element?.originalUrl && element.originalUrl.startsWith('blob:')) {
      URL.revokeObjectURL(element.originalUrl);
    }
    
    // Note: previewUrl isn't strictly tracked inside the element structure, but if it exists:
    if (element?.previewUrl && element.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(element.previewUrl);
    }
  }
}
