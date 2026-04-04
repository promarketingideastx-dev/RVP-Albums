import { create } from 'zustand';
import { temporal } from 'zundo';
import { EditorProject, EditorElement, ProjectAsset, GlobalImageStyles, SpreadBackgroundConfig } from '@/types/editor';
import { storage } from '@/storage';
import { TYPOGRAPHY_PRESETS } from '@/lib/typography-presets';

interface EditorState {
  project: EditorProject | null;
  activeSpreadId: string | null;
  selectedElementId: string | null;

  measurementUnit: 'in' | 'cm';
  toggleMeasurementUnit: () => void;

  previewOriginalPhotoId: string | null;
  setPreviewOriginalPhotoId: (elementId: string | null) => void;

  loadProject: (project: EditorProject) => void;
  unloadProject: () => void;
  setActiveSpread: (spreadId: string) => void;
  setSelectedElement: (elementId: string | null) => void;

  updateElement: (spreadId: string, elementId: string, changes: Partial<EditorElement>) => void;
  addElement: (spreadId: string, element: EditorElement) => void;
  removeElement: (spreadId: string, elementId: string) => void;
  duplicateElement: (spreadId: string, elementId: string) => void;
  createGroup: (spreadId: string) => void;

  addAsset: (asset: ProjectAsset) => void;
  removeAsset: (assetId: string) => void;
  updateAsset: (assetId: string, updates: Partial<ProjectAsset>) => void;

  bringForward: (spreadId: string, elementId: string) => void;
  sendBackward: (spreadId: string, elementId: string) => void;
  reorderElementsList: (spreadId: string, oldIndex: number, newIndex: number) => void;
  bringToFront: (spreadId: string, elementId: string) => void;
  sendToBack: (spreadId: string, elementId: string) => void;
  applyTypographyPreset: (presetId: string) => void;

  updateGlobalImageStyles: (styles: Partial<GlobalImageStyles>) => void;
  updateSpreadBackground: (spreadId: string, config: Partial<SpreadBackgroundConfig>) => void;
  resetGlobalImageStyles: () => void;
  resetSpreadBackground: (spreadId: string) => void;
  resetAllGlobalStyles: () => void;

  addGuide: (spreadId: string, guide: import('@/types/editor').SpreadGuide) => void;
  updateGuide: (spreadId: string, guideId: string, changes: Partial<import('@/types/editor').SpreadGuide>) => void;
  removeGuide: (spreadId: string, guideId: string) => void;
  clearGuides: (spreadId: string) => void;
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set) => ({
  project: null,
  activeSpreadId: null,
  selectedElementId: null,
  measurementUnit: 'in',
  previewOriginalPhotoId: null,

  toggleMeasurementUnit: () => set((state) => ({ measurementUnit: state.measurementUnit === 'in' ? 'cm' : 'in' })),
  setPreviewOriginalPhotoId: (id) => set({ previewOriginalPhotoId: id }),

  loadProject: (project) => set({ project, activeSpreadId: project.spreads[0]?.id || null }),
  unloadProject: () => set({ project: null, activeSpreadId: null, selectedElementId: null, previewOriginalPhotoId: null }),
  setActiveSpread: (id) => set({ activeSpreadId: id }),
  setSelectedElement: (id) => set({ selectedElementId: id }),

  updateElement: (spreadId, elementId, changes) => set((state) => {
    if (!state.project) return state;
    
    // Auto-save hook or wrapper can be added elsewhere. State is purely mutated here.
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      
      const newElements = spread.elements.map((el) => {
        if (el.id !== elementId) return el;
        return { ...el, ...changes };
      });
      return { ...spread, elements: newElements };
    });

    return { project: { ...state.project, spreads: newSpreads } };
  }),

  applyTypographyPreset: (presetId) => set((state) => {
    if (!state.project) return state;
    
    const preset = TYPOGRAPHY_PRESETS.find(p => p.id === presetId);
    if (!preset) return state;

    const newSpreads = state.project.spreads.map((spread) => {
      const newElements = spread.elements.map((el) => {
        if (el.type !== 'text') return el;
        if (el.lockedFonts === false) return el; // Manual override protection
        
        const role = el.textRole || 'body'; // Default fallback
        const fontStr = preset.fonts[role] || preset.fonts.body;
        const fontStyle = preset.styles?.[role] || { letterSpacing: 0, lineHeight: 1.2, textTransform: 'none' };
        
        // Map native color
        const assignedColor = role === 'h1' 
          ? preset.styles?.h1?.color || '#000'
          : role === 'h2' 
            ? preset.styles?.h2?.color || '#000'
            : preset.styles?.body?.color || '#000';

        return { 
          ...el, 
          fontFamily: fontStr,
          textRole: role,
          textColor: assignedColor,
          letterSpacing: fontStyle.letterSpacing || 0,
          lineHeight: fontStyle.lineHeight || 1.2,
          textTransform: fontStyle.textTransform || 'none'
        };
      });
      return { ...spread, elements: newElements };
    });

    return { 
      project: { 
        ...state.project, 
        typographyPresetId: presetId, 
        spreads: newSpreads 
      } 
    };
  }),

  updateGlobalImageStyles: (styles) => set((state) => {
    if (!state.project) return state;
    return {
      project: {
        ...state.project,
        globalImageStyles: { ...(state.project.globalImageStyles || {}), ...styles }
      }
    };
  }),

  updateSpreadBackground: (spreadId, config) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;
      return { ...s, bg_config: { ...(s.bg_config || { type: 'none' }), ...config } };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  resetGlobalImageStyles: () => set((state) => {
    if (!state.project) return state;
    return {
      project: { ...state.project, globalImageStyles: undefined }
    };
  }),

  resetSpreadBackground: (spreadId) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;
      return { ...s, bg_config: undefined };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  resetAllGlobalStyles: () => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map(s => ({ ...s, bg_config: undefined }));
    return {
      project: { 
        ...state.project, 
        globalImageStyles: undefined,
        spreads: newSpreads 
      }
    };
  }),

  addGuide: (spreadId, guide) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;
      return { ...s, guides: [...(s.guides || []), guide] };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  updateGuide: (spreadId, guideId, changes) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;
      const newGuides = (s.guides || []).map(g => g.id === guideId ? { ...g, ...changes } : g);
      return { ...s, guides: newGuides };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  removeGuide: (spreadId, guideId) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;
      return { ...s, guides: (s.guides || []).filter(g => g.id !== guideId) };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  clearGuides: (spreadId) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;
      return { ...s, guides: [] };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  addElement: (spreadId, element) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      
      const highestZIndex = spread.elements.length > 0 
        ? Math.max(...spread.elements.map(e => e.zIndex)) 
        : -1;
      
      element.zIndex = highestZIndex + 1;
      return { ...spread, elements: [...spread.elements, element] };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  removeElement: (spreadId, elementId) => set((state) => {
    if (!state.project) return state;
    
    // Garbage collection for blobs
    const spread = state.project.spreads.find(s => s.id === spreadId);
    const element = spread?.elements.find(e => e.id === elementId);
    // Offload garbage collection rules exclusively to the StorageDriver bounds
    if (element) {
      storage.cleanupElement(element).catch(console.error);
    }

    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;
      
      // Filter out element AND strictly filter out all children if element is a generic folder
      const isGroup = element?.type === 'group';
      const filteredElements = s.elements.filter(e => {
        if (e.id === elementId) return false;
        if (isGroup && e.groupId === elementId) return false;
        return true;
      });
      const sortedElements = [...filteredElements].sort((a, b) => a.zIndex - b.zIndex);
      const reindexedElements = sortedElements.map((el, index) => ({ ...el, zIndex: index }));
      
      return { ...s, elements: reindexedElements };
    });
    
    // Reset selection if deleting the selected item
    const newSelectedId = state.selectedElementId === elementId ? null : state.selectedElementId;
    return { project: { ...state.project, spreads: newSpreads }, selectedElementId: newSelectedId };
  }),

  duplicateElement: (spreadId, elementId) => set((state) => {
    if (!state.project) return state;
    const spread = state.project.spreads.find(s => s.id === spreadId);
    if (!spread) return state;
    const element = spread.elements.find(e => e.id === elementId);
    if (!element) return state;

    const newElement = { 
      ...element, 
      id: crypto.randomUUID(),
      x_mm: element.x_mm + 10,
      y_mm: element.y_mm + 10,
    };

    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;
      
      const highestZIndex = s.elements.length > 0 ? Math.max(...s.elements.map(e => e.zIndex)) : -1;
      newElement.zIndex = highestZIndex + 1;
      
      return { ...s, elements: [...s.elements, newElement] };
    });

    return { project: { ...state.project, spreads: newSpreads }, selectedElementId: newElement.id };
  }),

  createGroup: (spreadId) => set((state) => {
    if (!state.project) return state;
    const spread = state.project.spreads.find(s => s.id === spreadId);
    if (!spread) return state;

    const highestZIndex = spread.elements.length > 0 ? Math.max(...spread.elements.map(e => e.zIndex)) : -1;
    const groupElement: EditorElement = {
      id: crypto.randomUUID(),
      type: 'group',
      x_mm: 0,
      y_mm: 0,
      w_mm: state.project?.size?.w_mm || 500, // Safe bounding fallback
      h_mm: state.project?.size?.h_mm || 500,
      rotation_deg: 0,
      zIndex: highestZIndex + 1,
      layerName: `Group ${spread.elements.filter(e => e.type === 'group').length + 1}`,
      visible: true,
      locked: false,
      isCollapsed: false,
    };

    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;
      return { ...s, elements: [...s.elements, groupElement] };
    });

    return { project: { ...state.project, spreads: newSpreads }, selectedElementId: groupElement.id };
  }),

  addAsset: (asset) => set((state) => {
    if (!state.project) return state;
    const assets = state.project.assets || [];
    return { project: { ...state.project, assets: [...assets, asset] } };
  }),

  removeAsset: (assetId) => set((state) => {
    if (!state.project) return state;
    const assets = state.project.assets || [];
    const asset = assets.find(a => a.id === assetId);
    
    // Fire explicit garbage collection strictly routed across the IDBDriver
    if (asset) {
      storage.removeAsset(asset).catch(console.error);
    }

    return { project: { ...state.project, assets: assets.filter(a => a.id !== assetId) } };
  }),

  updateAsset: (assetId, updates) => set((state) => {
    if (!state.project) return state;
    const assets = state.project.assets || [];
    return {
      project: {
        ...state.project,
        assets: assets.map(a => a.id === assetId ? { ...a, ...updates } : a)
      }
    };
  }),

  bringForward: (spreadId, elementId) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      const elements = [...spread.elements].sort((a, b) => a.zIndex - b.zIndex);
      const idx = elements.findIndex(e => e.id === elementId);
      if (idx === -1 || idx === elements.length - 1) return spread;

      const target = elements.splice(idx, 1)[0];
      elements.splice(idx + 1, 0, target);

      const immutableElements = elements.map((el, index) => ({ ...el, zIndex: index }));
      return { ...spread, elements: immutableElements };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  sendBackward: (spreadId, elementId) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      const elements = [...spread.elements].sort((a, b) => a.zIndex - b.zIndex);
      const idx = elements.findIndex(e => e.id === elementId);
      if (idx <= 0) return spread;

      const target = elements.splice(idx, 1)[0];
      elements.splice(idx - 1, 0, target);

      const immutableElements = elements.map((el, index) => ({ ...el, zIndex: index }));
      return { ...spread, elements: immutableElements };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  reorderElementsList: (spreadId, oldIndex, newIndex) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      const elements = [...spread.elements].sort((a, b) => a.zIndex - b.zIndex);
      
      const target = elements.splice(oldIndex, 1)[0];
      elements.splice(newIndex, 0, target);
      
      const immutableElements = elements.map((el, index) => ({ ...el, zIndex: index }));
      return { ...spread, elements: immutableElements };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  bringToFront: (spreadId: string, elementId: string) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      const elements = [...spread.elements].sort((a, b) => a.zIndex - b.zIndex);
      const idx = elements.findIndex(e => e.id === elementId);
      if (idx === -1 || idx === elements.length - 1) return spread;

      const target = elements.splice(idx, 1)[0];
      elements.push(target);

      const immutableElements = elements.map((el, index) => ({ ...el, zIndex: index }));
      return { ...spread, elements: immutableElements };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  sendToBack: (spreadId: string, elementId: string) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      const elements = [...spread.elements].sort((a, b) => a.zIndex - b.zIndex);
      const idx = elements.findIndex(e => e.id === elementId);
      if (idx <= 0) return spread;

      const target = elements.splice(idx, 1)[0];
      elements.unshift(target);

      const immutableElements = elements.map((el, index) => ({ ...el, zIndex: index }));
      return { ...spread, elements: immutableElements };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),
    }),
    {
       partialize: (state) => ({ project: state.project })
    }
  )
);
