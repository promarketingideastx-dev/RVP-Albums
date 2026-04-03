"use client";

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEditorStore } from '@/store/useEditorStore';
import { usePathname, useRouter } from 'next/navigation';

export default function Toolbar() {
  const t = useTranslations('Editor');
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const bringForward = useEditorStore((state) => state.bringForward);
  const sendBackward = useEditorStore((state) => state.sendBackward);

  const swapLocale = () => {
    const nextLocale = pathname.startsWith('/es') ? '/en' : '/es';
    router.replace(nextLocale);
  };

  return (
    <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 flex items-center justify-between">
      <div className="font-bold text-lg">{t('title')}</div>
      
      <div className="flex items-center gap-2">
        {selectedElementId && activeSpreadId && (
          <>
            <button 
              onClick={() => bringForward(activeSpreadId, selectedElementId)}
              className="px-3 py-1 text-sm bg-neutral-100 dark:bg-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
            >
               Order: +
            </button>
            <button 
              onClick={() => sendBackward(activeSpreadId, selectedElementId)}
              className="px-3 py-1 text-sm bg-neutral-100 dark:bg-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
            >
               Order: -
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
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
  );
}
