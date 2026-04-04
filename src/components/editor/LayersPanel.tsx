"use client";

import { useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { useTranslations } from 'next-intl';
import { Camera, Type, Square, Image as ImageIcon, Sparkles, MoveUp, MoveDown, LayoutTemplate } from 'lucide-react';

export default function LayersPanel() {
  const t = useTranslations('Editor');
  const project = useEditorStore((state) => state.project);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const setSelectedElement = useEditorStore((state) => state.setSelectedElement);
  const reorderElementsList = useEditorStore((state) => state.reorderElementsList);
  const bringForward = useEditorStore((state) => state.bringForward);
  const sendBackward = useEditorStore((state) => state.sendBackward);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const spread = project?.spreads.find(s => s.id === activeSpreadId);
  if (!spread) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-400 text-sm">
        {t('no_selection')}
      </div>
    );
  }

  // Photoshop layers panel: highest Z-Index is rendered at the TOP visually
  const sortedElements = [...spread.elements].sort((a, b) => b.zIndex - a.zIndex);

  const getIcon = (type: string) => {
    switch (type) {
      case 'photo': return <Camera className="w-3.5 h-3.5" />;
      case 'text': return <Type className="w-3.5 h-3.5" />;
      case 'shape': return <Square className="w-3.5 h-3.5" />;
      case 'overlay': return <Sparkles className="w-3.5 h-3.5" />;
      case 'background': return <LayoutTemplate className="w-3.5 h-3.5" />;
      default: return <ImageIcon className="w-3.5 h-3.5" />;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getLayerName = (el: any) => {
    if (el.type === 'text') return el.text ? el.text.substring(0, 15) + (el.text.length > 15 ? '...' : '') : 'Text Layer';
    if (el.type === 'photo') return 'Photo Area';
    if (el.type === 'overlay') return 'Artistic Overlay';
    if (el.layerName) return el.layerName;
    return el.type.charAt(0).toUpperCase() + el.type.slice(1);
  };

  const handleDragStart = (e: React.DragEvent, originalIndex: number) => {
    setDraggedIndex(originalIndex);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', originalIndex.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetOriginalIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetOriginalIndex) return;
    
    reorderElementsList(spread.id, draggedIndex, targetOriginalIndex);
    setDraggedIndex(null);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-950 overflow-hidden w-full">
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Layers</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-1">
          {sortedElements.map((el) => {
             const originalIndex = el.zIndex;
             const isSelected = selectedElementId === el.id;

             return (
               <div 
                 key={el.id}
                 draggable
                 onDragStart={(e) => handleDragStart(e, originalIndex)}
                 onDragOver={handleDragOver}
                 onDrop={(e) => handleDrop(e, originalIndex)}
                 onClick={() => setSelectedElement(el.id)}
                 className={`group flex items-center justify-between p-2 rounded-md cursor-pointer text-xs transition-colors border ${
                   isSelected 
                     ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' 
                     : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                 }`}
               >
                 <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className={`${isSelected ? 'text-blue-500' : 'text-neutral-400 group-hover:text-neutral-500'} shrink-0 transition-colors`}>
                      {getIcon(el.type)}
                    </div>
                    <span className="truncate flex-1 font-medium select-none">{getLayerName(el)}</span>
                 </div>
                 
                 {isSelected && (
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                       onClick={(e) => { e.stopPropagation(); bringForward(spread.id, el.id); }}
                       className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded text-blue-500 pointer-events-auto"
                       title="Bring Forward"
                     >
                       <MoveUp className="w-3 h-3" />
                     </button>
                     <button 
                       onClick={(e) => { e.stopPropagation(); sendBackward(spread.id, el.id); }}
                       className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded text-blue-500 pointer-events-auto"
                       title="Send Backward"
                     >
                       <MoveDown className="w-3 h-3" />
                     </button>
                   </div>
                 )}
               </div>
             );
          })}
        </div>
      </div>
    </div>
  );
}
