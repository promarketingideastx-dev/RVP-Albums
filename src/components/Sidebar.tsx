"use client";

import { useTranslations } from 'next-intl';
import { useEditorStore } from '@/store/useEditorStore';
import { v4 as uuidv4 } from 'uuid';

export default function Sidebar() {
  const t = useTranslations('Editor');
  const addElement = useEditorStore((state) => state.addElement);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);

  const handleAddMockImage = () => {
    if (!activeSpreadId) return;
    addElement(activeSpreadId, {
      id: uuidv4(),
      type: 'image',
      src: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800&q=80',
      x_mm: 20,
      y_mm: 20,
      w_mm: 100,
      h_mm: 66,
      rotation_deg: 0,
      zIndex: Date.now()
    });
  };

  return (
    <aside className="w-64 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 flex flex-col gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Assets Library</h2>
      <button 
        onClick={handleAddMockImage}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
      >
        {t('add_image')}
      </button>
      
      {/* Mocking generic placeholder assets area */}
      <div className="flex-1 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded flex items-center justify-center text-xs text-neutral-400">
        Asset Grid Placeholder
      </div>
    </aside>
  );
}
