"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Ellipse, Transformer, Image as KonvaImage, Text } from 'react-konva';
import { useTranslations } from 'next-intl';
import { useEditorStore } from '@/store/useEditorStore';
import { EditorElement } from '@/types/editor';
import useImage from 'use-image';

interface SpreadCanvasProps {
  stageWidth: number;
  stageHeight: number;
  scale: number;
}

const EditorImage = ({ 
  element, 
  spreadId, 
  isSelected, 
  onSelect,
  onContextMenu
}: { 
  element: EditorElement, 
  spreadId: string, 
  isSelected: boolean, 
  onSelect: () => void,
  onContextMenu: (x: number, y: number, id: string) => void
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trRef = useRef<any>(null);
  const updateElement = useEditorStore((state) => state.updateElement);
  
  // Custom hook prioritizing Phase 2 low-res previews over legacy src
  const [image] = useImage(element.previewUrl || element.src || 'https://via.placeholder.com/150');

  useEffect(() => {
    if (isSelected && trRef.current && imageRef.current) {
      trRef.current.nodes([imageRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <React.Fragment>
      <KonvaImage
        ref={imageRef}
        image={image}
        x={element.x_mm}
        y={element.y_mm}
        width={element.w_mm}
        height={element.h_mm}
        rotation={element.rotation_deg}
        opacity={element.opacity !== undefined ? element.opacity : 1}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        globalCompositeOperation={(element.blendMode as any) || 'source-over'}
        shadowColor={element.shadowColor || 'transparent'}
        shadowBlur={element.shadowBlur || 0}
        shadowOffsetX={element.shadowOffsetX || 0}
        shadowOffsetY={element.shadowOffsetY || 0}
        shadowOpacity={element.shadowOpacity !== undefined ? element.shadowOpacity : 0.5}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          onContextMenu(e.evt.clientX, e.evt.clientY, element.id);
        }}
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onDragEnd={(e) => {
          updateElement(spreadId, element.id, {
            x_mm: e.target.x(),
            y_mm: e.target.y(),
          });
        }}
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onTransformEnd={(e) => {
          const node = imageRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // Reset scale internally and update w/h so we keep mm absolute
          node.scaleX(1);
          node.scaleY(1);

          updateElement(spreadId, element.id, {
            x_mm: node.x(),
            y_mm: node.y(),
            w_mm: Math.max(5, node.width() * scaleX),
            h_mm: Math.max(5, node.height() * scaleY),
             rotation_deg: node.rotation()
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

const EditorShape = ({ 
  element, 
  spreadId, 
  isSelected, 
  onSelect,
  onContextMenu
}: { 
  element: EditorElement, 
  spreadId: string, 
  isSelected: boolean, 
  onSelect: () => void,
  onContextMenu: (x: number, y: number, id: string) => void
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shapeRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trRef = useRef<any>(null);
  const updateElement = useEditorStore((state) => state.updateElement);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  const commonProps = {
    ref: shapeRef,
    fill: element.fillColor || '#aaaaaa',
    rotation: element.rotation_deg,
    opacity: element.opacity !== undefined ? element.opacity : 1,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalCompositeOperation: (element.blendMode as any) || 'source-over',
    shadowColor: element.shadowColor || 'transparent',
    shadowBlur: element.shadowBlur || 0,
    shadowOffsetX: element.shadowOffsetX || 0,
    shadowOffsetY: element.shadowOffsetY || 0,
    shadowOpacity: element.shadowOpacity !== undefined ? element.shadowOpacity : 0.5,
    draggable: true,
    onClick: onSelect,
    onTap: onSelect,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onContextMenu: (e: any) => {
      e.evt.preventDefault();
      onContextMenu(e.evt.clientX, e.evt.clientY, element.id);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onDragEnd: (e: any) => {
      updateElement(spreadId, element.id, {
        x_mm: e.target.x(),
        y_mm: e.target.y(),
      });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onTransformEnd: () => {
      const node = shapeRef.current;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);

      updateElement(spreadId, element.id, {
        x_mm: node.x(),
        y_mm: node.y(),
        w_mm: Math.max(5, node.width() * scaleX),
        h_mm: Math.max(5, node.height() * scaleY),
        rotation_deg: node.rotation()
      });
    }
  };

  return (
    <React.Fragment>
      {element.shapeType === 'ellipse' ? (
        <Ellipse
          {...commonProps}
          radiusX={element.w_mm / 2}
          radiusY={element.h_mm / 2}
          x={element.x_mm}
          y={element.y_mm}
          offset={{ x: -element.w_mm / 2, y: -element.h_mm / 2 }}
        />
      ) : (
        <Rect
          {...commonProps}
          x={element.x_mm}
          y={element.y_mm}
          width={element.w_mm}
          height={element.h_mm}
        />
      )}
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EditorText = ({ element, spreadId, isSelected, onSelect, onContextMenu }: any) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shapeRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trRef = useRef<any>(null);
  const updateElement = useEditorStore((state) => state.updateElement);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  const onTransformEnd = () => {
    const node = shapeRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    
    updateElement(spreadId, element.id, {
      x_mm: node.x(),
      y_mm: node.y(),
      w_mm: Math.max(10, node.width() * scaleX),
      h_mm: Math.max(10, node.height() * scaleY),
      fontSize: Math.round((element.fontSize || 32) * scaleX),
      rotation_deg: node.rotation()
    });
  };

  return (
    <React.Fragment>
      <Text
        ref={shapeRef}
        x={element.x_mm}
        y={element.y_mm}
        width={element.w_mm}
        height={element.h_mm}
        text={element.text || 'Doble clic para editar...'}
        fontFamily={element.fontFamily || 'Inter'}
        fontSize={element.fontSize || 32}
        fill={element.textColor || '#000000'}
        rotation={element.rotation_deg}
        opacity={element.opacity !== undefined ? element.opacity : 1}
        shadowColor={element.shadowColor || 'black'}
        shadowBlur={element.shadowBlur || 0}
        shadowOffsetX={element.shadowOffsetX || 0}
        shadowOffsetY={element.shadowOffsetY || 0}
        shadowOpacity={element.shadowOpacity !== undefined ? element.shadowOpacity : 0.5}
        stroke={element.strokeColor || undefined}
        strokeWidth={element.strokeWidth || 0}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onDragEnd={(e: any) => {
          updateElement(spreadId, element.id, {
            x_mm: e.target.x(),
            y_mm: e.target.y(),
          });
        }}
        onTransformEnd={onTransformEnd}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onContextMenu={(e: any) => {
          e.evt.preventDefault();
          onContextMenu(e.evt.clientX, e.evt.clientY, element.id);
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10) return oldBox;
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

export default function SpreadCanvas({ stageWidth, stageHeight, scale }: SpreadCanvasProps) {
  const project = useEditorStore((state) => state.project);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const setSelectedElement = useEditorStore((state) => state.setSelectedElement);

  const bringToFront = useEditorStore((state) => state.bringToFront);
  const bringForward = useEditorStore((state) => state.bringForward);
  const sendBackward = useEditorStore((state) => state.sendBackward);
  const sendToBack = useEditorStore((state) => state.sendToBack);

  const t = useTranslations('Editor');

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, elementId: string } | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => { if (contextMenu) setContextMenu(null); };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [contextMenu]);

  if (!project || !activeSpreadId) return null;

  const spread = project.spreads.find((s) => s.id === activeSpreadId);
  if (!spread) return null;

  // Sorting elements by zIndex to render properly
  const elements = [...spread.elements].sort((a, b) => a.zIndex - b.zIndex);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const checkDeselect = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedElement(null);
    }
  };

  return (
    <div 
      className="flex-1 w-full h-full relative"
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
      onDrop={(e) => {
        e.preventDefault();
        try {
          const payload = JSON.parse(e.dataTransfer.getData('application/json'));
          
          if (payload) {
            // Text payloads bypass image loading entirely!
            if (payload.type === 'text') {
              useEditorStore.getState().addElement(activeSpreadId, {
                id: `el_${Date.now()}`,
                type: 'text',
                text: 'Escribe tu texto...',
                fontFamily: 'Inter',
                fontSize: 32,
                textColor: '#000000',
                x_mm: 30, // Default coordinate 
                y_mm: 30,
                w_mm: 150,
                h_mm: 50,
                rotation_deg: 0,
                zIndex: 0
              });
              return;
            }

            if (payload.type === 'image' || payload.type === 'decoration') {
              const img = new window.Image();
            img.onload = () => {
              const aspect = img.width / img.height;
              let w = 80;
              let h = 80 / aspect;
              
              if (h > 120) {
                 h = 120;
                 w = 120 * aspect;
              }

              if (payload.type === 'image') {
                useEditorStore.getState().addElement(activeSpreadId, {
                  id: `el_${Date.now()}`,
                  type: 'image',
                  previewUrl: payload.previewUrl,
                  originalUrl: payload.originalUrl,
                  previewBlobId: payload.previewBlobId,
                  originalBlobId: payload.originalBlobId,
                  x_mm: 20, // default injection x
                  y_mm: 20, // default injection y
                  w_mm: w,
                  h_mm: h,
                  rotation_deg: 0,
                  zIndex: 0
                });
              } else if (payload.type === 'decoration') {
                useEditorStore.getState().addElement(activeSpreadId, {
                  id: `el_${Date.now()}`,
                  type: 'decoration',
                  src: payload.src,
                  libraryCategory: payload.libraryCategory,
                  sourceType: payload.sourceType || 'default',
                  blendMode: payload.libraryCategory === 'cinematic' ? 'multiply' : payload.libraryCategory === 'overlays' ? 'screen' : 'source-over',
                  sourceId: payload.sourceId,
                  x_mm: 20,
                  y_mm: 20,
                  w_mm: w,
                  h_mm: h,
                  rotation_deg: 0,
                  zIndex: 0
                });
              }
            };
            img.src = payload.type === 'decoration' ? payload.src : payload.previewUrl;
            }
          }
        } catch {
          // Ignore invalid drags
        }
      }}
    >
      <Stage
        width={stageWidth}
        height={stageHeight}
        onMouseDown={checkDeselect}
        onTouchStart={checkDeselect}
        style={{ boxShadow: '0px 10px 30px rgba(0,0,0,0.1)' }}
        onContextMenu={(e) => e.evt.preventDefault()}
      >
      <Layer scaleX={scale} scaleY={scale}>
        {/* Background Paper */}
        <Rect
          x={0}
          y={0}
          width={project.size.w_mm}
          height={project.size.h_mm}
          fill={spread.bg_color || '#ffffff'}
          shadowColor="black"
          shadowBlur={10}
          shadowOpacity={0.1}
        />

        {/* Elements */}
        {elements.map((el) => {
          if (el.type === 'shape') {
            return (
              <EditorShape
                key={el.id}
                element={el}
                spreadId={activeSpreadId}
                isSelected={selectedElementId === el.id}
                onSelect={() => setSelectedElement(el.id)}
                onContextMenu={(x: number, y: number, id: string) => setContextMenu({ x, y, elementId: id })}
              />
            );
          }
          if (el.type === 'text') {
            return (
              <EditorText
                key={el.id}
                element={el}
                spreadId={activeSpreadId}
                isSelected={selectedElementId === el.id}
                onSelect={() => setSelectedElement(el.id)}
                onContextMenu={(x: number, y: number, id: string) => setContextMenu({ x, y, elementId: id })}
              />
            );
          }
          return (
            <EditorImage
              key={el.id}
              element={el}
              spreadId={activeSpreadId}
              isSelected={selectedElementId === el.id}
              onSelect={() => setSelectedElement(el.id)}
              onContextMenu={(x: number, y: number, id: string) => setContextMenu({ x, y, elementId: id })}
            />
          );
        })}

        {/* Empty State Indicator */}
        {elements.length === 0 && (
           <Text
             text="Drag images here to begin designing"
             x={0}
             y={project.size.h_mm / 2 - 10}
             width={project.size.w_mm}
             fontSize={12}
             fill="#aaaaaa"
             fontStyle="italic"
             align="center"
             verticalAlign="middle"
             listening={false}
           />
        )}

        {/* Print Guides (Bleed, Safe Zone, and Center Fold) - overlay on top, no events */}
        
        {/* Bleed Guide: Red Dashed */}
        <Rect
           x={project.bleed_mm}
           y={project.bleed_mm}
           width={project.size.w_mm - (project.bleed_mm * 2)}
           height={project.size.h_mm - (project.bleed_mm * 2)}
           stroke="#ff0000"
           strokeWidth={1 / scale}
           dash={[6 / scale, 4 / scale]}
           opacity={0.6}
           listening={false}
        />
        
        {/* Safe Zone Guide: Blue Dashed */}
        <Rect
           x={project.bleed_mm + project.safe_zone_mm}
           y={project.bleed_mm + project.safe_zone_mm}
           width={project.size.w_mm - ((project.bleed_mm + project.safe_zone_mm) * 2)}
           height={project.size.h_mm - ((project.bleed_mm + project.safe_zone_mm) * 2)}
           stroke="#0000ff"
           strokeWidth={1 / scale}
           dash={[4 / scale, 4 / scale]}
           opacity={0.4}
           listening={false}
        />
        
        {/* Center Fold Line Component replaced by individual Spread Canvases - No Center Fold needed here */}
      </Layer>
      </Stage>

      {contextMenu && (
        <div 
          className="absolute z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl py-1 min-w-[160px] text-sm overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
            onClick={() => { bringToFront(activeSpreadId, contextMenu.elementId); setContextMenu(null); }}
          >
            {t('bring_to_front')}
          </button>
          <button
            className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
            onClick={() => { bringForward(activeSpreadId, contextMenu.elementId); setContextMenu(null); }}
          >
            {t('bring_forward')}
          </button>
          <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1"></div>
          <button
            className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
            onClick={() => { sendBackward(activeSpreadId, contextMenu.elementId); setContextMenu(null); }}
          >
            {t('send_backward')}
          </button>
          <button
            className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
            onClick={() => { sendToBack(activeSpreadId, contextMenu.elementId); setContextMenu(null); }}
          >
            {t('send_to_back')}
          </button>
        </div>
      )}
    </div>
  );
}
