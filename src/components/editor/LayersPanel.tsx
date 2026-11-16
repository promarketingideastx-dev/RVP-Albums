"use client";

import { useState, useEffect } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { useTranslations } from 'next-intl';
import {
  Camera,
  Type,
  Square,
  Image as ImageIcon,
  Sparkles,
  LayoutTemplate,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Folder,
  Trash2,
  Copy,
  FolderOpen,
  ArrowUpToLine,
  ArrowUp,
  ArrowDown,
  ArrowDownToLine,
} from 'lucide-react';

const pauseHistory = () => {
  try {
    useEditorStore.temporal.getState().pause();
  } catch {
    // ignore
  }
};

const resumeHistory = () => {
  try {
    useEditorStore.temporal.getState().resume();
  } catch {
    // ignore
  }
};

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
  const bringForward = useEditorStore((state) => state.bringForward);
  const sendBackward = useEditorStore((state) => state.sendBackward);
  const sendToBack = useEditorStore((state) => state.sendToBack);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const spread = project?.spreads.find((s) => s.id === activeSpreadId);
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
      case 'group':
        return isCollapsed ? (
          <Folder className="w-3.5 h-3.5" />
        ) : (
          <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
        );
      case 'photo':
        return <Camera className="w-3.5 h-3.5" />;
      case 'text':
        return <Type className="w-3.5 h-3.5" />;
      case 'shape':
        return <Square className="w-3.5 h-3.5" />;
      case 'overlay':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'background':
        return <LayoutTemplate className="w-3.5 h-3.5" />;
      default:
        return <ImageIcon className="w-3.5 h-3.5" />;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getLayerName = (el: any, indexFromTop: number) => {
    if (el.layerName) return el.layerName;
    if (el.type === 'text')
      return el.text ? el.text.substring(0, 18) + (el.text.length > 18 ? '...' : '') : 'Texto';
    if (el.type === 'image' || el.type === 'photo') {
      const asset = project?.assets?.find((a) => a.id === el.assetId);
      if (asset?.name) return asset.name;
      return `Foto ${sortedElements.length - indexFromTop}`;
    }
    if (el.type === 'decoration' || el.type === 'overlay') return 'Decoración';
    if (el.type === 'shape') return el.shapeType === 'ellipse' ? 'Elipse' : 'Rectángulo';
    if (el.type === 'group') return 'Grupo';
    return el.type.charAt(0).toUpperCase() + el.type.slice(1);
  };

  const handleDragStart = (e: React.DragEvent, originalIndex: number, isLocked?: boolean) => {
    if (isLocked) {
      e.preventDefault();
      return;
    }
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

  const selEl = selectedElementId ? spread.elements.find((e) => e.id === selectedElementId) : null;
  const selLocked = Boolean(selEl?.locked);
  const ctxTarget = contextMenu ? spread.elements.find((e) => e.id === contextMenu.elementId) : null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-950 overflow-hidden w-full relative">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest truncate">
          {t('layers')} ({sortedElements.length})
        </h3>
      </div>

      {/* TOP GLOBAL BAR */}
      <div className="flex flex-col gap-2 px-4 py-3 bg-neutral-50/80 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800 text-[12px] font-medium transition-colors">
        <div className="flex items-center justify-between gap-2 overflow-hidden">
          <select
            value={selEl?.blendMode || 'source-over'}
            onChange={(e) => {
              if (selEl && !selLocked) updateElement(spread.id, selEl.id, { blendMode: e.target.value });
            }}
            className="bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-md outline-none px-2 py-1 cursor-pointer w-full max-w-[90px] shrink text-[11px] shadow-sm disabled:opacity-50"
            disabled={!selEl || selLocked || selEl.type === 'text' || selEl.type === 'group'}
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

          <div className="flex items-center gap-1.5 opacity-90 flex-shrink-0">
            <span className="text-[10px] uppercase font-bold text-neutral-500">{t('op')}</span>
            <input
              disabled={!selEl || selLocked}
              type="range"
              min="0"
              max="100"
              value={Math.round((selEl && selEl.opacity !== undefined ? selEl.opacity : 1) * 100)}
              onPointerDown={pauseHistory}
              onPointerUp={resumeHistory}
              onChange={(e) => {
                if (selEl && !selLocked) {
                  updateElement(spread.id, selEl.id, { opacity: Number(e.target.value) / 100 });
                }
              }}
              className="w-[50px] accent-blue-500 disabled:opacity-50 cursor-pointer shrink-0"
            />
            <div className="flex items-center border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 px-1 py-0.5 shrink-0">
              <input
                disabled={!selEl || selLocked}
                type="number"
                min="0"
                max="100"
                value={Math.round((selEl && selEl.opacity !== undefined ? selEl.opacity : 1) * 100)}
                onChange={(e) => {
                  if (selEl && !selLocked) {
                    const next = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                    updateElement(spread.id, selEl.id, { opacity: next / 100 });
                  }
                }}
                className="w-7 bg-transparent text-neutral-800 dark:text-neutral-200 text-center outline-none ring-0 p-0 m-0 text-[11px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                onClick={(e) => {
                  (e.target as HTMLInputElement).select();
                }}
              />
              <span className="text-neutral-500 font-normal ml-0.5 mr-0.5 text-[10px]">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* LAYER LIST */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-1">
          {sortedElements.map((el, idxFromTop) => {
            const originalIndex = el.zIndex;
            const isSelected = selectedElementId === el.id;
            const isVisible = el.visible !== false;
            const isLocked = el.locked === true;
            const isGroup = el.type === 'group';

            if (el.groupId) {
              const parentGroup = spread.elements.find((g) => g.id === el.groupId);
              if (parentGroup && parentGroup.isCollapsed) return null;
            }

            return (
              <div key={el.id} className="flex flex-col">
                <div
                  draggable={!isLocked}
                  onDragStart={(e) => handleDragStart(e, originalIndex, isLocked)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, originalIndex)}
                  onClick={() => setSelectedElement(el.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedElement(el.id);
                    const menuX = Math.min(e.clientX, window.innerWidth - 190);
                    const menuY = Math.min(e.clientY, window.innerHeight - 280);
                    setContextMenu({ x: menuX, y: menuY, elementId: el.id });
                  }}
                  className={`group flex items-center justify-between py-1.5 px-1.5 rounded-md cursor-pointer text-xs transition-colors border ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-400/60 dark:border-blue-600/60 text-neutral-900 dark:text-neutral-100'
                      : 'bg-transparent border-transparent text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/70'
                  } ${!isVisible ? 'opacity-55' : 'opacity-100'}`}
                  style={{ marginLeft: el.groupId ? '1.25rem' : '0' }}
                >
                  <div className="flex items-center gap-1.5 overflow-hidden w-full min-w-0">
                    {/* VISIBILITY TOGGLE (EYE ICON) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateElement(spread.id, el.id, { visible: !isVisible });
                      }}
                      title={isVisible ? t('hide_layer') : t('show_layer')}
                      className={`w-6 h-6 flex items-center justify-center shrink-0 pointer-events-auto transition-colors rounded hover:bg-neutral-200/70 dark:hover:bg-neutral-700/60 ${
                        isVisible
                          ? 'text-neutral-600 dark:text-neutral-300'
                          : 'text-amber-500 dark:text-amber-400'
                      }`}
                    >
                      {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    {/* THUMBNAIL */}
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
                        if (type === 'group')
                          return el.isCollapsed ? (
                            <Folder className="w-5 h-5 text-neutral-500 shrink-0" />
                          ) : (
                            <FolderOpen className="w-5 h-5 text-blue-500 shrink-0" />
                          );

                        const src = el.previewUrl || el.src;
                        if (
                          (type === 'photo' || type === 'image' || type === 'background' || type === 'overlay' || type === 'decoration') &&
                          src &&
                          src.length > 5
                        ) {
                          return (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={src}
                              className="w-[40px] h-[30px] object-cover rounded-[3px] border border-neutral-300 dark:border-neutral-600 shadow-sm pointer-events-none shrink-0"
                              alt=""
                            />
                          );
                        }

                        if (type === 'text') {
                          return (
                            <div className="w-[40px] h-[30px] shrink-0 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-[3px] flex items-center justify-center font-serif text-[15px] font-bold text-neutral-800 dark:text-neutral-200 shadow-sm pointer-events-none leading-none">
                              T
                            </div>
                          );
                        }

                        if (type === 'shape') {
                          return (
                            <div className="w-[40px] h-[30px] shrink-0 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-[3px] flex items-center justify-center shadow-sm pointer-events-none">
                              <div
                                className="w-3.5 h-3.5"
                                style={{
                                  backgroundColor: el.fillColor || el.color || '#9ca3af',
                                  borderRadius: el.shapeType === 'ellipse' ? '50%' : '2px',
                                }}
                              />
                            </div>
                          );
                        }

                        return getIcon(type, el.isCollapsed);
                      })()}
                    </div>

                    <span
                      className="truncate flex-1 font-medium select-none text-[11px] ml-1"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        const newName = window.prompt(t('rename_layer'), getLayerName(el, idxFromTop));
                        if (newName) updateElement(spread.id, el.id, { layerName: newName });
                      }}
                    >
                      {getLayerName(el, idxFromTop)}
                    </span>
                  </div>

                  {/* RIGHT SIDE QUICK CONTROLS (DUPLICATE & LOCK) */}
                  <div className="flex items-center gap-0.5 shrink-0 ml-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateElement(spread.id, el.id);
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-opacity"
                      title={t('duplicate_layer')}
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateElement(spread.id, el.id, { locked: !isLocked });
                      }}
                      className={`p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded pointer-events-auto transition-opacity ${
                        isLocked
                          ? 'text-red-500 opacity-100'
                          : 'text-neutral-400 opacity-0 group-hover:opacity-100'
                      }`}
                      title={isLocked ? t('unlock_layer') : t('lock_layer')}
                    >
                      {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="flex items-center justify-between gap-1 px-3 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (selectedElementId) bringToFront(spread.id, selectedElementId);
            }}
            disabled={!selectedElementId}
            className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 disabled:opacity-30 transition-colors"
            title={t('bring_to_front')}
          >
            <ArrowUpToLine className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedElementId) bringForward(spread.id, selectedElementId);
            }}
            disabled={!selectedElementId}
            className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 disabled:opacity-30 transition-colors"
            title={t('bring_forward')}
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedElementId) sendBackward(spread.id, selectedElementId);
            }}
            disabled={!selectedElementId}
            className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 disabled:opacity-30 transition-colors"
            title={t('send_backward')}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedElementId) sendToBack(spread.id, selectedElementId);
            }}
            disabled={!selectedElementId}
            className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 disabled:opacity-30 transition-colors"
            title={t('send_to_back')}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (selectedElementId) duplicateElement(spread.id, selectedElementId);
            }}
            disabled={!selectedElementId}
            className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 disabled:opacity-30 transition-colors"
            title={t('duplicate_layer')}
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => createGroup(spread.id)}
            className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
            title={t('create_group')}
          >
            <Folder className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedElementId && !selLocked) removeElement(spread.id, selectedElementId);
            }}
            disabled={!selectedElementId || selLocked}
            className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 disabled:opacity-30 transition-colors"
            title={t('delete_layer')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* UNIFIED 8-ACTION CONTEXT MENU OVERLAY */}
      {contextMenu && ctxTarget && (
        <div
          className="fixed z-[99999] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-lg py-1.5 min-w-[185px] text-xs font-medium"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              bringToFront(spread.id, contextMenu.elementId);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 flex items-center gap-2.5"
          >
            <ArrowUpToLine className="w-3.5 h-3.5 text-neutral-400" />
            <span>{t('bring_to_front')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              bringForward(spread.id, contextMenu.elementId);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 flex items-center gap-2.5"
          >
            <ArrowUp className="w-3.5 h-3.5 text-neutral-400" />
            <span>{t('bring_forward')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sendBackward(spread.id, contextMenu.elementId);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 flex items-center gap-2.5"
          >
            <ArrowDown className="w-3.5 h-3.5 text-neutral-400" />
            <span>{t('send_backward')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sendToBack(spread.id, contextMenu.elementId);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 flex items-center gap-2.5"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-neutral-400" />
            <span>{t('send_to_back')}</span>
          </button>

          <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1 mx-2" />

          <button
            type="button"
            onClick={() => {
              duplicateElement(spread.id, contextMenu.elementId);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 flex items-center gap-2.5"
          >
            <Copy className="w-3.5 h-3.5 text-neutral-400" />
            <span>{t('duplicate_layer')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              updateElement(spread.id, contextMenu.elementId, { locked: !ctxTarget.locked });
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 flex items-center gap-2.5"
          >
            {ctxTarget.locked ? (
              <Unlock className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-neutral-400" />
            )}
            <span>{ctxTarget.locked ? t('unlock_layer') : t('lock_layer')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              updateElement(spread.id, contextMenu.elementId, {
                visible: ctxTarget.visible === false ? true : false,
              });
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 flex items-center gap-2.5"
          >
            {ctxTarget.visible === false ? (
              <Eye className="w-3.5 h-3.5 text-blue-500" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-neutral-400" />
            )}
            <span>{ctxTarget.visible === false ? t('show_layer') : t('hide_layer')}</span>
          </button>

          <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1 mx-2" />

          <button
            type="button"
            disabled={Boolean(ctxTarget.locked)}
            onClick={() => {
              if (!ctxTarget.locked) {
                removeElement(spread.id, contextMenu.elementId);
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2.5 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('delete_layer')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
