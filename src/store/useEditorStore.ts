import { create } from 'zustand';
import { temporal } from 'zundo';
import { EditorProject, EditorElement, ProjectAsset } from '@/types/editor';
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

  addAsset: (asset: ProjectAsset) => void;
  removeAsset: (assetId: string) => void;
  updateAsset: (assetId: string, updates: Partial<ProjectAsset>) => void;

  bringForward: (spreadId: string, elementId: string) => void;
  sendBackward: (spreadId: string, elementId: string) => void;
  reorderElementsList: (spreadId: string, oldIndex: number, newIndex: number) => void;
  bringToFront: (spreadId: string, elementId: string) => void;
  sendToBack: (spreadId: string, elementId: string) => void;
  applyTypographyPreset: (presetId: string) => void;
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

  addElement: (spreadId, element) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      element.zIndex = spread.elements.length;
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
      return { ...s, elements: s.elements.filter(e => e.id !== elementId) };
    });
    
    // Reset selection if deleting the selected item
    const newSelectedId = state.selectedElementId === elementId ? null : state.selectedElementId;
    return { project: { ...state.project, spreads: newSpreads }, selectedElementId: newSelectedId };
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
