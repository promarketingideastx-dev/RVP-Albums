"use client";

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

type Category = 'backgrounds' | 'overlays' | 'frames' | 'shapes' | 'typography' | 'cinematic';

interface MockAsset {
  id: string;
  src: string;
  name: string;
}

const ASSET_DATA: Record<Category, MockAsset[]> = {
  backgrounds: [{ id: 'bg1', src: '/mock-library/backgrounds/bg-solid-1.svg', name: 'Background 1' }],
  overlays: [{ id: 'ov1', src: '/mock-library/overlays/overlay-1.svg', name: 'Overlay 1' }],
  frames: [{ id: 'fr1', src: '/mock-library/frames/frame-1.svg', name: 'Frame 1' }],
  shapes: [{ id: 'sh1', src: '/mock-library/shapes/shape-1.svg', name: 'Shape 1' }],
  typography: [{ id: 'ty1', src: '/mock-library/typography/type-1.svg', name: 'Typography 1' }],
  cinematic: [{ id: 'ci1', src: '/mock-library/cinematic/cine-1.svg', name: 'Cinematic 1' }]
};

export default function AssetLibrary() {
  const t = useTranslations('Editor');
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  const categories: { id: Category, labelKey: string }[] = [
    { id: 'backgrounds', labelKey: 'lib_backgrounds' },
    { id: 'overlays', labelKey: 'lib_overlays' },
    { id: 'frames', labelKey: 'lib_frames' },
    { id: 'shapes', labelKey: 'lib_shapes' },
    { id: 'typography', labelKey: 'lib_typography' },
    { id: 'cinematic', labelKey: 'lib_cinematic' }
  ];

  const handleDragStart = (e: React.DragEvent, asset: MockAsset, category: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'decoration',
      src: asset.src,
      libraryCategory: category
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (activeCategory) {
    const assets = ASSET_DATA[activeCategory] || [];
    return (
      <div className="flex flex-col h-full bg-white dark:bg-neutral-950 p-4">
        <button 
          onClick={() => setActiveCategory(null)}
          className="mb-4 text-xs text-blue-500 font-semibold cursor-pointer text-left hover:text-blue-600 transition-colors flex items-center gap-1"
        >
          <span>&larr;</span> {t('lib_back')}
        </button>
        <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-800 dark:text-neutral-200 mb-4">
          {t(`lib_${activeCategory}`)}
        </h3>

        {assets.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-neutral-400 text-xs">
            <p>{t('lib_empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1">
            {assets.map((asset) => (
              <div 
                key={asset.id} 
                className="aspect-square bg-neutral-100 dark:bg-neutral-900 rounded-md border border-neutral-200 dark:border-neutral-800 relative overflow-hidden cursor-grab active:cursor-grabbing hover:border-blue-400 transition-all hover:shadow-sm"
                draggable
                onDragStart={(e) => handleDragStart(e, asset, activeCategory)}
                title={asset.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.src} alt={asset.name} className="absolute inset-0 w-full h-full object-contain pointer-events-none p-2" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-950 p-4 overflow-y-auto">
       <p className="text-xs text-neutral-500 mb-4 text-center border-b border-neutral-100 dark:border-neutral-900 pb-4">{t('lib_upload_prompt')}</p>
       <div className="flex flex-col gap-2">
         {categories.map((cat) => (
            <button 
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="py-3 px-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-left transition-colors font-medium text-neutral-700 dark:text-neutral-300 shadow-sm"
            >
              {t(cat.labelKey)}
              <span className="text-neutral-400 font-bold">&rarr;</span>
            </button>
         ))}
       </div>
    </div>
  );
}
