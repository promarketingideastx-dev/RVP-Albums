"use client";

import { useState, useEffect } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { useTranslations } from 'next-intl';
import { 
  Camera, Type, Square, Image as ImageIcon, Sparkles, 
  LayoutTemplate, Eye, EyeOff, Lock, Unlock, Folder,
  Trash2, Copy, FolderOpen
} from 'lucide-react';

export default function LayersPanel() {
  const t = useTranslations('Editor');
  const project = useEditorStore((state) => state.project);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const setSelectedElement = useEditorStore((state) => state.setSelectedElement);
  const reorderElementsList = useEditorStore((state) => state.reorderElementsList);
  const updateElement = useEditorStore((state) => state.updateElement);
  const removeElement = useEditorStore((state) => state.removeElement);
  const duplicateElement = useEditorStore((state) => state.duplicateElement);
  const createGroup = useEditorStore((state) => state.createGroup);
  const bringToFront = useEditorStore((state) => state.bringToFront);
  const sendToBack = useEditorStore((state) => state.sendToBack);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, elementId: string} | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

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

  const getIcon = (type: string, isCollapsed?: boolean) => {
    switch (type) {
      case 'group': return isCollapsed ? <Folder className="w-3.5 h-3.5" /> : <FolderOpen className="w-3.5 h-3.5 text-blue-500" />;
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
    if (el.layerName) return el.layerName;
    if (el.type === 'text') return el.text ? el.text.substring(0, 15) + (el.text.length > 15 ? '...' : '') : 'Text Layer';
    if (el.type === 'photo') return 'Photo Area';
    if (el.type === 'overlay') return 'Artistic Overlay';
    if (el.type === 'group') return 'Group';
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
    <div className="flex flex-col h-full bg-white dark:bg-neutral-950 overflow-hidden w-full relative">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">{t('layers')}</h3>
      </div>
      
      {/* PHOTOSHOP TOP GLOBAL BAR */}
      {(() => {
         const selEl = selectedElementId ? spread.elements.find(e => e.id === selectedElementId) : null;
         return (
           <div className="flex flex-col gap-2 px-4 py-3 bg-neutral-50/80 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800 text-[12px] font-medium transition-colors">
             <div className="flex items-center justify-between">
                <select 
                  value={selEl?.blendMode || 'source-over'} 
                  onChange={(e) => { if(selEl) updateElement(spread.id, selEl.id, { blendMode: e.target.value })}}
                  className="bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-md outline-none px-2 py-1 cursor-pointer w-[110px] shadow-sm disabled:opacity-50"
                  disabled={!selEl || selEl.type === 'text' || selEl.type === 'group'}
                >
                  <option value="source-over">Normal</option>
                  <option value="multiply">Multiply</option>
                  <option value="screen">Screen</option>
                  <option value="overlay">Overlay</option>
                  <option value="darken">Darken</option>
                  <option value="lighten">Lighten</option>
                  <option value="color-dodge">Color Dodge</option>
                  <option value="color-burn">Color Burn</option>
                  <option value="hard-light">Hard Light</option>
                  <option value="soft-light">Soft Light</option>
                  <option value="difference">Difference</option>
                  <option value="exclusion">Exclusion</option>
                </select>
                
                <div className="flex items-center gap-1 opacity-90">
                   <span className="text-neutral-500 mr-1">{t('op') || 'Op:'}</span>
                   <input 
                     disabled={!selEl}
                     type="range" 
                     min="0" max="100" 
                     value={Math.round(((selEl && selEl.opacity !== undefined) ? selEl.opacity : 1) * 100)} 
                     onChange={(e) => { if(selEl) updateElement(spread.id, selEl.id, { opacity: Number(e.target.value) / 100 })}}
                     className="w-16 accent-blue-500 disabled:opacity-50 cursor-pointer"
                   />
                   <div className="flex items-center border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 px-1 py-0.5 ml-1">
                     <input 
                       disabled={!selEl}
                       type="number" 
                       min="0" max="100" 
                       value={Math.round(((selEl && selEl.opacity !== undefined) ? selEl.opacity : 1) * 100)} 
                       onChange={(e) => { if(selEl) updateElement(spread.id, selEl.id, { opacity: Number(e.target.value) / 100 })}}
                       className="w-8 bg-transparent text-neutral-800 dark:text-neutral-200 text-right outline-none ring-0 p-0 m-0 text-[11px]"
                       onClick={(e) => { (e.target as HTMLInputElement).select() }}
                     />
                     <span className="text-neutral-500 font-normal ml-0.5">%</span>
                   </div>
                </div>
             </div>
           </div>
         );
      })()}
      
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-0.5">
          {sortedElements.map((el) => {
             const originalIndex = el.zIndex;
             const isSelected = selectedElementId === el.id;
             const isVisible = el.visible !== false;
             const isLocked = el.locked === true;
             const isGroup = el.type === 'group';

             // Prevent rendering children if their parent group is collapsed currently
             if (el.groupId) {
                const parentGroup = spread.elements.find(g => g.id === el.groupId);
                if (parentGroup && parentGroup.isCollapsed) return null;
             }

             return (
               <div key={el.id} className="flex flex-col">
                 <div 
                   draggable
                   onDragStart={(e) => handleDragStart(e, originalIndex)}
                   onDragOver={handleDragOver}
                   onDrop={(e) => handleDrop(e, originalIndex)}
                   onClick={() => setSelectedElement(el.id)}
                   onContextMenu={(e) => {
                     e.preventDefault();
                     setSelectedElement(el.id);
                     setContextMenu({ x: e.clientX, y: e.clientY, elementId: el.id });
                   }}
                   className={`group flex items-center justify-between py-1.5 px-2 cursor-pointer text-xs transition-colors border-l-2 ${
                     isSelected 
                       ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300' 
                       : 'bg-transparent border-transparent text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                   } ${!isVisible ? 'opacity-50' : 'opacity-100'}`}
                   style={{ marginLeft: el.groupId ? '1.25rem' : '0' }}
                 >
                   <div className="flex items-center gap-2 overflow-hidden w-full">
                      {/* VISIBILITY TOGGLE */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); updateElement(spread.id, el.id, { visible: !isVisible }); }}
                        className={`p-1 rounded shrink-0 pointer-events-auto transition-colors ${isVisible ? 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300' : 'text-neutral-300 dark:text-neutral-600'}`}
                      >
                        {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      <div 
                        className={`${isSelected ? 'text-blue-500' : 'text-neutral-400 group-hover:text-neutral-500'} shrink-0 transition-colors`}
                        onClick={(e) => {
                           if (isGroup) {
                             e.stopPropagation();
                             updateElement(spread.id, el.id, { isCollapsed: !el.isCollapsed });
                           }
                        }}
                      >
                         {(() => {
                            const type = el.type as string;
                            if (type === 'group') return el.isCollapsed ? <Folder className="w-5 h-5 text-neutral-500 shrink-0" /> : <FolderOpen className="w-5 h-5 text-blue-500 shrink-0" />;
                            
                            const src = el.previewUrl || el.src;
                            if ((type === 'photo' || type === 'image' || type === 'background' || type === 'overlay') && src && src.length > 5) {
                               // eslint-disable-next-line @next/next/no-img-element
                               return <img src={src} className="w-7 h-7 object-cover rounded-[2px] border border-neutral-300 dark:border-neutral-600 bg-neutral-200 shadow-sm pointer-events-none shrink-0" alt="" />;
                            }
                            
                            if (type === 'text') {
                               return <div className="w-7 h-7 shrink-0 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-[2px] flex items-center justify-center font-serif text-[14px] font-bold text-neutral-800 dark:text-neutral-200 shadow-sm pointer-events-none leading-none">T</div>;
                            }
                            
                            if (type === 'shape') {
                               return <div className="w-7 h-7 shrink-0 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-[2px] flex items-center justify-center shadow-sm pointer-events-none">
                                  <div className="w-3.5 h-3.5 bg-neutral-400" style={{ borderRadius: el.shapeType === 'ellipse' ? '50%' : '0' }}></div>
                               </div>;
                            }
                            
                            return getIcon(type, el.isCollapsed);
                         })()}
                      </div>
                      
                      <span 
                         className="truncate flex-1 font-medium select-none text-[11px]"
                         onDoubleClick={(e) => {
                           e.stopPropagation();
                           const newName = window.prompt('Rename Layer:', getLayerName(el));
                           if (newName) updateElement(spread.id, el.id, { layerName: newName });
                         }}
                      >
                        {getLayerName(el)}
                      </span>
                   </div>
                   
                   {/* RIGHT SIDE CONTROLS (LOCK) */}
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); updateElement(spread.id, el.id, { locked: !isLocked }); }}
                        className={`p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded pointer-events-auto ${isLocked ? 'text-red-500 opacity-100' : 'text-neutral-400'}`}
                        title="Lock Layer"
                      >
                        {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                   </div>
                   
                   {/* Persistent Lock Display if locked but not hovering */}
                   {isLocked && (
                      <div className="group-hover:hidden shrink-0 pl-1">
                        <Lock className="w-3.5 h-3.5 text-red-500" />
                      </div>
                   )}
                 </div>

                 {/* DELETED INLINE COMPONENT REPLACED BY TOP HEADER BAR */}
               </div>
             );
          })}
        </div>
      </div>

      {/* BOTTOM BAR (PHOTOSHOP STYLE) */}
      <div className="flex items-center justify-end gap-1 px-3 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40">
        <button 
          onClick={() => {
             if (selectedElementId) duplicateElement(spread.id, selectedElementId);
          }}
          disabled={!selectedElementId}
          className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 disabled:opacity-30 transition-colors"
          title="Duplicate Element"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button 
          onClick={() => createGroup(spread.id)}
          className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
          title="Create Group"
        >
          <Folder className="w-4 h-4" />
        </button>
        <button 
          onClick={() => {
            if (selectedElementId) removeElement(spread.id, selectedElementId);
          }}
          disabled={!selectedElementId}
          className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 disabled:opacity-30 transition-colors"
          title="Delete Element"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* FLOATING CONTEXT MENU OVELAY */}
      {contextMenu && (
        <div 
          className="fixed z-[99999] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl rounded-md py-1 min-w-[160px] text-[11px] font-medium"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()} // Prevent bubble up that closes it prematurely
        >
           <button onClick={() => { duplicateElement(spread.id, contextMenu.elementId); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              Duplicate Layer
           </button>
           
           <button onClick={() => { createGroup(spread.id); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              Create Group Here
           </button>
           
           <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1 mx-2" />
           
           <button onClick={() => {
              const tgt = spread.elements.find(e => e.id === contextMenu.elementId);
              if(tgt) updateElement(spread.id, contextMenu.elementId, { visible: tgt.visible === false ? true : false });
              setContextMenu(null);
           }} className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              Hide / Show Layer
           </button>
           
           <button onClick={() => {
              const tgt = spread.elements.find(e => e.id === contextMenu.elementId);
              if(tgt) updateElement(spread.id, contextMenu.elementId, { locked: !tgt.locked });
              setContextMenu(null);
           }} className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              Lock / Unlock Bound
           </button>
           
           <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1 mx-2" />

           <button onClick={() => {
              const tgt = spread.elements.find(e => e.id === contextMenu.elementId);
              if (tgt) { 
                const n = window.prompt('Rename Layer:', getLayerName(tgt)); 
                if(n) updateElement(spread.id, tgt.id, { layerName: n }); 
              }
              setContextMenu(null);
           }} className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              Rename Base...
           </button>
           
           <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1 mx-2" />
           
           <button onClick={() => {
              bringToFront(spread.id, contextMenu.elementId);
              setContextMenu(null);
           }} className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-blue-600 dark:text-blue-400">
              Bring Forward Strict
           </button>

           <button onClick={() => {
              sendToBack(spread.id, contextMenu.elementId);
              setContextMenu(null);
           }} className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-blue-600 dark:text-blue-400">
              Send Backward Strict
           </button>

           <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1 mx-2" />

           <button onClick={() => {
              removeElement(spread.id, contextMenu.elementId);
              setContextMenu(null);
           }} className="w-full text-left px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30">
              Delete Object
           </button>
        </div>
      )}
    </div>
  );
}
