"use client";

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useEditorStore } from '@/store/useEditorStore';
import { useDebouncedCallback } from 'use-debounce';
import Sidebar from '@/components/Sidebar';
import Toolbar from '@/components/Toolbar';
import EditorWorkspace from '@/components/editor/EditorWorkspace';

export default function AppPage() {
  const t = useTranslations('Editor');
  const loadProject = useEditorStore((state) => state.loadProject);
  const project = useEditorStore((state) => state.project);
  const [init, setInit] = useState(false);

  // MOCK MOCK LOADING
  useEffect(() => {
    // Generate a default project
    loadProject({
      id: "proj_123",
      // Typical lay-flat 10x10 album Spread is usually 20x10 inches => ~508mm x 254mm. 
      // adding 3mm bleed margin arbitrarily for math
      size: { w_mm: 514, h_mm: 260 },
      bleed_mm: 3, 
      safe_zone_mm: 5,
      spreads: [
        {
          id: "spread_1",
          bg_color: "#ffffff",
          elements: []
        }
      ]
    });
    setInit(true);
  }, [loadProject]);

  // MOCK AUTOSAVE DEBOUNCE (Hardened with deep string comparison)
  const [saveStatus, setSaveStatus] = useState<string>('');
  const lastSavedStr = useRef<string>('');
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const debouncedSave = useDebouncedCallback((p: any) => {
    const pStr = JSON.stringify(p);
    if (pStr === lastSavedStr.current) return; // Prevent unnecessary DB calls
    lastSavedStr.current = pStr;
    
    console.log("Saving project AST to DB...");
    setSaveStatus(t('save_success'));
    setTimeout(() => setSaveStatus(''), 2000);
  }, 1000);

  useEffect(() => {
    if (!init || !project) return;
    setSaveStatus(t('saving'));
    debouncedSave(project);
  }, [project, init, debouncedSave]);

  if (!init) return <div className="h-screen w-screen flex items-center justify-center">{t('initializing')}</div>;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden text-neutral-900 dark:text-neutral-100">
      <Toolbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 relative">
          {/* Editor Workspace dynamically calculates zoom and stages SpreadCanvas */}
          <EditorWorkspace />
          
          {/* MOCK SAVING INDICATOR UI */}
          {saveStatus && (
            <div className="absolute bottom-4 right-4 bg-black text-white text-xs px-3 py-1 rounded shadow-lg opacity-50">
              {saveStatus}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
