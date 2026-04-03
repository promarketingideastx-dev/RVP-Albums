"use client";

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useEditorStore } from '@/store/useEditorStore';
import { useDebouncedCallback } from 'use-debounce';
import Sidebar from '@/components/Sidebar';
import Toolbar from '@/components/Toolbar';
import Inspector from '@/components/Inspector';
import EditorWorkspace from '@/components/editor/EditorWorkspace';
import { saveProjectToDB, loadProjectFromDB } from '@/utils/persistence';

export default function AppPage() {
  const t = useTranslations('Editor');
  const loadProject = useEditorStore((state) => state.loadProject);
  const project = useEditorStore((state) => state.project);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const removeElement = useEditorStore((state) => state.removeElement);
  
  const [mounted, setMounted] = useState(false);
  const [init, setInit] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // BLOB HYDRATION / LOAD CYCLE -> IndexedDB
  useEffect(() => {
    if (!mounted || init) return;

    loadProjectFromDB().then((savedProject) => {
      const projectToLoad = savedProject;

      // GUARD: Healing corrupted or legacy IDB schemas (No spreads array)
      if (projectToLoad && (!projectToLoad.spreads || projectToLoad.spreads.length === 0)) {
        projectToLoad.spreads = [
          {
            id: "spread_1",
            bg_color: "#ffffff",
            elements: []
          }
        ];
      }

      if (projectToLoad) {
        // GUARD: Healing missing attributes
        projectToLoad.size = projectToLoad.size || { w_mm: 514, h_mm: 260 };
        if (typeof projectToLoad.bleed_mm === 'undefined') projectToLoad.bleed_mm = 3;
        if (typeof projectToLoad.safe_zone_mm === 'undefined') projectToLoad.safe_zone_mm = 5;

        // GUARD: Healing missing elements arrays within active spreads
        projectToLoad.spreads = projectToLoad.spreads.map(s => ({
          ...s,
          elements: s.elements || []
        }));

        loadProject(projectToLoad);
        setInit(true);
      } else {
        // Genesis default project setup if DB misses
        loadProject({
          id: "proj_genesis",
          size: { w_mm: 514, h_mm: 260 },
          bleed_mm: 3, 
          safe_zone_mm: 5,
          spreads: [
            {
              id: "spread_1",
              bg_color: "#ffffff",
              elements: [
                {
                  id: "test_rect_1",
                  type: "shape",
                  shapeType: "rect",
                  x_mm: 50,
                  y_mm: 50,
                  w_mm: 100,
                  h_mm: 100,
                  rotation_deg: 0,
                  zIndex: 1,
                  fillColor: "#14B8A6"
                }
              ]
            }
          ]
        });
        setInit(true);
      }
    }).catch((e) => {
      console.error("Hydration Corrupted:", e);
      setInit(true);
    });
  }, [loadProject, init, mounted]);

  // MOCK AUTOSAVE DEBOUNCE (Hardened with deep string comparison)
  const [saveStatus, setSaveStatus] = useState<string>('');
  const lastSavedStr = useRef<string>('');
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const debouncedSave = useDebouncedCallback((p: any) => {
    const pStr = JSON.stringify(p);
    if (pStr === lastSavedStr.current) return; // Prevent unnecessary DB calls
    lastSavedStr.current = pStr;
    
    // Real IDB Save (Asynchronous local save)
    saveProjectToDB(p).catch(console.error);

    setSaveStatus(t('save_success'));
    setTimeout(() => setSaveStatus(''), 2000);
  }, 1000);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName) ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }
      
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (activeSpreadId && selectedElementId) {
          removeElement(activeSpreadId, selectedElementId);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSpreadId, selectedElementId, removeElement]);

  useEffect(() => {
    if (!mounted || !init || !project) return;
    setSaveStatus(t('saving'));
    debouncedSave(project);
  }, [project, init, mounted, debouncedSave, t]);

  if (!mounted) return <div className="h-screen w-screen bg-white dark:bg-neutral-950" />;
  if (!init) return <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-neutral-950 text-black dark:text-white font-medium">{t('initializing')}</div>;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden text-neutral-900 dark:text-neutral-100">
      <Toolbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 relative flex flex-col h-full w-full">
          {/* Editor Workspace dynamically calculates zoom and stages SpreadCanvas */}
          <EditorWorkspace />
          
          {/* MOCK SAVING INDICATOR UI */}
          {saveStatus && (
            <div className="absolute bottom-4 right-4 bg-black text-white text-xs px-3 py-1 rounded shadow-lg opacity-50">
              {saveStatus}
            </div>
          )}
        </main>
        <Inspector />
      </div>
    </div>
  );
}
