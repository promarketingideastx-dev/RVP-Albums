"use client";

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEditorStore } from '@/store/useEditorStore';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { exportSpreadToJPG } from '@/utils/exportEngine';

export default function Toolbar() {
  const t = useTranslations('Editor');
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const bringForward = useEditorStore((state) => state.bringForward);
  const sendBackward = useEditorStore((state) => state.sendBackward);
  const project = useEditorStore((state) => state.project);
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleExport = async () => {
     if (isExporting || !project || !activeSpreadId) return;
     const spreadIndex = project.spreads.findIndex(s => s.id === activeSpreadId);
     if (spreadIndex === -1) return;
     const spread = project.spreads[spreadIndex];
     
     setIsExporting(true);
     setExportStatus('idle');

     // Force render frame before executing export to prevent UI freeze without feedback
     await new Promise(resolve => setTimeout(resolve, 50));

     try {
       const dataUrl = await exportSpreadToJPG(spread, { size: project.size });
       
       const a = document.createElement('a');
       a.href = dataUrl;
       const fileName = `album-spread-${spreadIndex + 1}.jpg`; 
       a.download = fileName;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);

       setExportStatus('success');
       setTimeout(() => setExportStatus('idle'), 2500);
     } catch (err) {
       console.error("Export Failed:", err);
       setExportStatus('error');
       setTimeout(() => setExportStatus('idle'), 4000);
     } finally {
       setIsExporting(false);
     }
  };

  const swapLocale = () => {
    const nextLocale = pathname.startsWith('/es') ? '/en' : '/es';
    window.location.href = nextLocale;
  };

  return (
    <>
      {/* GLOBAL EXPORT OVERLAY */}
      {isExporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-2xl p-8 flex flex-col items-center border border-neutral-200 dark:border-neutral-800">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-medium text-lg text-neutral-900 dark:text-neutral-100">{t('export_loading')}</p>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      {exportStatus === 'success' && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-6 py-3 rounded shadow-xl animate-in fade-in slide-in-from-bottom-4">
          <span className="font-medium">{t('export_success')}</span>
        </div>
      )}
      {exportStatus === 'error' && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-600 text-white px-6 py-3 rounded shadow-xl animate-in fade-in slide-in-from-bottom-4">
          <span className="font-medium">{t('export_error')}</span>
        </div>
      )}

      <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 flex items-center justify-between">
        <div className="font-bold text-lg">{t('title')}</div>
        
        <div className="flex items-center gap-2">
          {selectedElementId && activeSpreadId && (
            <>
              <button 
                onClick={() => bringForward(activeSpreadId, selectedElementId)}
                className="px-3 py-1 text-sm bg-neutral-100 dark:bg-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
              >
                 {t('order_up')}
              </button>
              <button 
                onClick={() => sendBackward(activeSpreadId, selectedElementId)}
                className="px-3 py-1 text-sm bg-neutral-100 dark:bg-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
              >
                 {t('order_down')}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button 
             onClick={handleExport}
             disabled={isExporting}
             className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isExporting ? t('exporting') : t('export')}
          </button>
          <button 
             onClick={swapLocale}
             className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition"
          >
            {t('language')}
          </button>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-sm w-24 py-1 border border-neutral-200 dark:border-neutral-800 rounded text-center"
          >
            {theme === 'dark' ? t('theme_light') : t('theme_dark')}
          </button>
        </div>
      </header>
    </>
  );
}
