"use client";

import { useTranslations } from 'next-intl';
import { useEditorStore } from '@/store/useEditorStore';
import { v4 as uuidv4 } from 'uuid';
import { useState } from 'react';
import AssetLibrary from './library/AssetLibrary';

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState<'photos' | 'decorations'>('photos');
  const t = useTranslations('Editor');
  const addElement = useEditorStore((state) => state.addElement);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const project = useEditorStore((state) => state.project);
  
  const currentSpread = project?.spreads.find(s => s.id === activeSpreadId);
  const currentElementsCount = currentSpread?.elements.length || 0;
  
  // Calculate a visual cascade offset (resetting every 10 elements so it doesn't leave the screen)
  const getCascadeOffset = () => 20 + (currentElementsCount % 10) * 5;

  const handleAddMockImage = () => {
    if (!activeSpreadId) return;
    const offset = getCascadeOffset();
    addElement(activeSpreadId, {
      id: uuidv4(),
      type: 'image',
      src: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800&q=80',
      previewUrl: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800&q=80',
      originalUrl: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=4000&q=100',
      x_mm: offset,
      y_mm: offset,
      w_mm: 100,
      h_mm: 66,
      rotation_deg: 0,
      zIndex: Date.now()
    });
  };



  return (
    <aside className="w-64 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col">
      <div className="flex border-b border-neutral-200 dark:border-neutral-800">
        <button 
          onClick={() => setActiveTab('photos')}
          className={`flex-1 py-3 text-xs font-semibold tracking-wider uppercase transition-colors ${activeTab === 'photos' ? 'bg-neutral-100 dark:bg-neutral-900 border-b-2 border-blue-500' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900'}`}
        >
          {t('tab_photos')}
        </button>
        <button 
          onClick={() => setActiveTab('decorations')}
          className={`flex-1 py-3 text-xs font-semibold tracking-wider uppercase transition-colors ${activeTab === 'decorations' ? 'bg-neutral-100 dark:bg-neutral-900 border-b-2 border-blue-500' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900'}`}
        >
          {t('tab_decorations')}
        </button>
      </div>

      <div className={`p-4 flex flex-col gap-4 flex-1 overflow-y-auto ${activeTab === 'decorations' ? 'p-0' : ''}`}>
        {activeTab === 'photos' ? (
          <>
            <button onClick={handleAddMockImage} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors">
              {t('add_image')}
            </button>
            <div className="flex-1 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded flex items-center justify-center text-xs text-neutral-400 text-center p-4">
              Use the Asset Library below to upload multiple images and drag them here
            </div>
          </>
        ) : (
          <div className="h-full -m-4">
            <AssetLibrary />
          </div>
        )}
      </div>
    </aside>
  );
}
