"use client";

import { useTranslations } from 'next-intl';
import AssetLibrary from './library/AssetLibrary';

export default function Sidebar() {
  const t = useTranslations('Editor');

  return (
    <aside className="w-64 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col h-full">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-neutral-500">{t('tab_decorations')}</h2>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto">
        <AssetLibrary />
      </div>
    </aside>
  );
}
