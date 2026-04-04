"use client";

import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { Stage, Layer, Rect, Ellipse, Transformer, Image as KonvaImage, Text, Group, Line, Circle } from 'react-konva';
import Konva from 'konva';
import { useTranslations } from 'next-intl';
import { LUT_LIBRARY } from '@/lib/lut-presets';
import { TYPOGRAPHY_PRESETS } from '@/lib/typography-presets';
import { useEditorStore } from '@/store/useEditorStore';
import { EditorElement } from '@/types/editor';
import useImage from 'use-image';

interface SpreadCanvasProps {
  stageWidth: number;
  stageHeight: number;
  scale: number;
}

const ShadowDragAnchor = ({ element, spreadId, isSelected }: { element: EditorElement, spreadId: string, isSelected: boolean }) => {
  const updateElement = useEditorStore((state) => state.updateElement);
  const globalStyles = useEditorStore((state) => state.project?.globalImageStyles);
  
  const appliedShadowOpacity = element.shadowOpacity ?? (globalStyles?.shadowEnabled ? (globalStyles.shadowOpacity ?? 0.5) : 0);
  const appliedShadowColor = element.shadowColor || (globalStyles?.shadowEnabled ? (globalStyles.shadowColor || 'transparent') : 'transparent');
  const appliedShadowOffsetX = element.shadowOffsetX ?? (globalStyles?.shadowEnabled ? (globalStyles.shadowOffsetX ?? 0) : 0);
  const appliedShadowOffsetY = element.shadowOffsetY ?? (globalStyles?.shadowEnabled ? (globalStyles.shadowOffsetY ?? 0) : 0);

  if (!isSelected || appliedShadowOpacity <= 0 || appliedShadowColor === 'transparent') return null;

  const centerX = element.x_mm + element.w_mm / 2;
  const centerY = element.y_mm + element.h_mm / 2;

  return (
    <Group x={centerX} y={centerY}>
      <Line 
        points={[0, 0, appliedShadowOffsetX, appliedShadowOffsetY]} 
        stroke="#3b82f6" 
        dash={[4,4]} 
        strokeWidth={1.5} 
        opacity={0.8}
      />
      <Circle 
        x={appliedShadowOffsetX} 
        y={appliedShadowOffsetY} 
        radius={7} 
        fill="#ffffff" 
        stroke="#3b82f6" 
        strokeWidth={3} 
        draggable 
        onDragMove={(e) => {
          updateElement(spreadId, element.id, {
            shadowOffsetX: Math.round(e.target.x()),
            shadowOffsetY: Math.round(e.target.y())
          });
        }}
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'move';
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'default';
        }}
      />
    </Group>
  );
};

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
  const groupRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trRef = useRef<any>(null);
  const updateElement = useEditorStore((state) => state.updateElement);
  const previewOriginalPhotoId = useEditorStore((state) => state.previewOriginalPhotoId);
  const globalStyles = useEditorStore((state) => state.project?.globalImageStyles);
  
  const [image] = useImage(element.previewUrl || element.src || 'https://via.placeholder.com/150');

  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  // Handle Photo Filters Natively via Dual-Layer
  useLayoutEffect(() => {
    if (filterLayerRef.current && image) {
      const node = filterLayerRef.current;
      if (element.photoFilter && element.photoFilter !== 'none') {
        node.clearCache();
        node.cache();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filtersArray: any[] = [];
        
        const lut = LUT_LIBRARY.find(l => l.id === element.photoFilter);
        
        if (lut) {
           if (lut.contrast && lut.contrast !== 0) {
              filtersArray.push(Konva.Filters.Contrast);
              node.contrast(lut.contrast);
           }
           if (lut.brightness && lut.brightness !== 0) {
              filtersArray.push(Konva.Filters.Brighten);
              node.brightness(lut.brightness);
           }
           if (lut.grayscale) filtersArray.push(Konva.Filters.Grayscale);
           if (lut.sepia) filtersArray.push(Konva.Filters.Sepia);
           if (lut.invert) filtersArray.push(Konva.Filters.Invert);
           
           if (lut.hue !== undefined || lut.saturation !== undefined || lut.luminance !== undefined) {
              filtersArray.push(Konva.Filters.HSL);
              if (lut.hue !== undefined) node.hue(lut.hue);
              if (lut.saturation !== undefined) node.saturation(lut.saturation);
              if (lut.luminance !== undefined) node.luminance(lut.luminance);
           }
        } else {
           // Fallback for legacy basic filters
           switch(element.photoFilter) {
             case 'sepia': filtersArray.push(Konva.Filters.Sepia); break;
             case 'grayscale': filtersArray.push(Konva.Filters.Grayscale); break;
             case 'invert': filtersArray.push(Konva.Filters.Invert); break;
             case 'blur': 
               filtersArray.push(Konva.Filters.Blur); 
               node.blurRadius(element.filterIntensity !== undefined ? element.filterIntensity : 5); 
               break;
             case 'noise': 
               filtersArray.push(Konva.Filters.Noise); 
               node.noise(element.filterIntensity !== undefined ? element.filterIntensity : 1); 
               break;
             case 'posterize': 
               filtersArray.push(Konva.Filters.Posterize); 
               node.levels(element.filterIntensity !== undefined ? element.filterIntensity : 4); 
               break;
           }
        }
        
        node.filters(filtersArray);
        node.getLayer()?.batchDraw();
      } else {
        node.clearCache();
        node.filters([]);
        node.getLayer()?.batchDraw();
      }
    }
  }, [element.photoFilter, image, element.filterIntensity, previewOriginalPhotoId, element.w_mm, element.h_mm, element.scale]);

  const mmToPx = 3.779527559;

  const appliedShadowColor = element.shadowColor || (!element.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowColor || '#000000') : 'transparent');
  const appliedShadowBlur = element.shadowBlur ?? (!element.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowBlur ?? 0) : 0);
  const appliedShadowOffsetX = element.shadowOffsetX ?? (!element.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowOffsetX ?? 0) : 0);
  const appliedShadowOffsetY = element.shadowOffsetY ?? (!element.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowOffsetY ?? 0) : 0);
  const appliedShadowOpacity = element.shadowOpacity ?? (!element.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowOpacity ?? 0.5) : 0.5);

  const shadowIsInvisibleArtifact = (appliedShadowBlur === 0 && appliedShadowOffsetX === 0 && appliedShadowOffsetY === 0) || appliedShadowOpacity === 0;
  
  if (element.type === 'image' || element.type === 'decoration') {
    console.log("SHADOW TRACE:", {
      id: element.id,
      globalEnabled: globalStyles?.shadowEnabled,
      appliedShadowColor,
      appliedShadowBlur,
      appliedShadowOffsetX,
      appliedShadowOffsetY,
      appliedShadowOpacity,
      shadowIsInvisibleArtifact
    });
  }

  const finalShadowColor = shadowIsInvisibleArtifact ? 'transparent' : appliedShadowColor;

  const strokeEnabled = !element.isolateFromGlobalStyles && (globalStyles?.strokeEnabled ?? false);
  const appliedStrokeWidth = element.strokeWidth ?? (strokeEnabled ? (globalStyles?.strokeWidth ?? 0) : 0);
  const appliedStrokeColor = element.strokeColor ?? (strokeEnabled ? (globalStyles?.strokeColor ?? '#ffffff') : undefined);
  
  const cornerRadiusEnabled = !element.isolateFromGlobalStyles && (globalStyles?.borderRadiusEnabled ?? false);
  const appliedBorderRadius = element.borderRadius ?? (cornerRadiusEnabled ? (globalStyles?.borderRadius ?? 0) : 0);

  return (
    <React.Fragment>
      <Group
        ref={groupRef}
        x={element.x_mm * mmToPx}
        y={element.y_mm * mmToPx}
        width={element.w_mm * mmToPx}
        height={element.h_mm * mmToPx}
        rotation={element.rotation_deg || 0}
        scaleX={element.scale || 1}
        scaleY={element.scale || 1}
        draggable={isSelected && !element.locked}
        onClick={onSelect}
        onTap={onSelect}
        opacity={element.opacity !== undefined ? element.opacity : 1}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        globalCompositeOperation={(element.blendMode as any) || 'source-over'}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          e.cancelBubble = true;
          e.evt.stopPropagation();
          onContextMenu(e.evt.clientX, e.evt.clientY, element.id);
        }}
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onDragEnd={(e) => {
          updateElement(spreadId, element.id, {
            x_mm: e.target.x() / mmToPx,
            y_mm: e.target.y() / mmToPx,
          });
        }}
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onTransformEnd={(e) => {
          const node = groupRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);

          updateElement(spreadId, element.id, {
            x_mm: node.x() / mmToPx,
            y_mm: node.y() / mmToPx,
            w_mm: Math.max(5, (element.w_mm * mmToPx * scaleX) / mmToPx),
            h_mm: Math.max(5, (element.h_mm * mmToPx * scaleY) / mmToPx),
            rotation_deg: node.rotation()
          });
        }}
      >
        <KonvaImage 
          image={image} 
          x={0} y={0}
          width={element.w_mm * mmToPx} 
          height={element.h_mm * mmToPx} 
          cornerRadius={appliedBorderRadius * mmToPx}
          stroke={appliedStrokeWidth > 0 ? appliedStrokeColor : undefined}
          strokeWidth={appliedStrokeWidth * mmToPx}
          shadowColor={finalShadowColor}
          shadowBlur={appliedShadowBlur}
          shadowOffsetX={appliedShadowOffsetX}
          shadowOffsetY={appliedShadowOffsetY}
          shadowOpacity={appliedShadowOpacity}
        />
        {element.photoFilter && element.photoFilter !== 'none' && element.id !== previewOriginalPhotoId && (
          <KonvaImage 
            ref={filterLayerRef}
            image={image} 
            x={0} y={0}
            width={element.w_mm * mmToPx} 
            height={element.h_mm * mmToPx} 
            opacity={element.filterIntensity !== undefined ? element.filterIntensity : 1}
            cornerRadius={appliedBorderRadius * mmToPx}
            stroke={appliedStrokeWidth > 0 ? appliedStrokeColor : undefined}
            strokeWidth={appliedStrokeWidth * mmToPx}
          />
        )}
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }}
        />
      )}
      <ShadowDragAnchor element={element} spreadId={spreadId} isSelected={isSelected} />
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
      e.cancelBubble = true;
      e.evt.stopPropagation();
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
      <ShadowDragAnchor element={element} spreadId={spreadId} isSelected={isSelected} />
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

  // Forces the canvas to redraw as soon as the font is downloaded
  useEffect(() => {
    if (element.fontFamily && typeof document !== 'undefined' && document.fonts) {
      document.fonts.load(`12px "${element.fontFamily}"`).then(() => {
        if (shapeRef.current) {
          shapeRef.current.getLayer()?.batchDraw();
        }
      }).catch(() => {});
    }
  }, [element.fontFamily]);

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
        text={element.textTransform === 'uppercase' ? (element.text || 'Doble clic para editar...').toUpperCase() : element.textTransform === 'lowercase' ? (element.text || 'Doble clic para editar...').toLowerCase() : (element.text || 'Doble clic para editar...')}
        fontFamily={element.fontFamily || 'Inter'}
        fontSize={element.fontSize || 32}
        fill={element.textColor || '#000000'}
        letterSpacing={element.letterSpacing || 0}
        lineHeight={element.lineHeight || 1}
        stroke={element.strokeColor || undefined}
        strokeWidth={element.strokeWidth || 0}
        rotation={element.rotation_deg}
        opacity={element.opacity !== undefined ? element.opacity : 1}
        shadowColor={element.shadowColor || 'black'}
        shadowBlur={element.shadowBlur || 0}
        shadowOffsetX={element.shadowOffsetX || 0}
        shadowOffsetY={element.shadowOffsetY || 0}
        shadowOpacity={element.shadowOpacity !== undefined ? element.shadowOpacity : 0.5}
        draggable={isSelected && !element.locked}
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
          e.cancelBubble = true;
          e.evt.stopPropagation();
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
      <ShadowDragAnchor element={element} spreadId={spreadId} isSelected={isSelected} />
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

  const fontLinks = React.useMemo(() => {
    const activePreset = TYPOGRAPHY_PRESETS.find(p => p.id === project?.typographyPresetId);
    if (!activePreset) return null;
    const fontsSet = new Set<string>();
    fontsSet.add(activePreset.fonts.h1);
    fontsSet.add(activePreset.fonts.h2);
    fontsSet.add(activePreset.fonts.body);
    fontsSet.add(activePreset.fonts.small);
    return Array.from(fontsSet).map(font => 
      `@import url('https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}&display=swap');`
    ).join('\n');
  }, [project?.typographyPresetId]);

  if (!project || !activeSpreadId) return null;

  const spread = project.spreads.find((s) => s.id === activeSpreadId);
  if (!spread) return null;

  // Sorting elements by zIndex to render properly
  const elements = [...spread.elements].sort((a, b) => a.zIndex - b.zIndex);

  // Parse advanced Background properties smoothly native organically
  const bgConfig = spread.bg_config || { type: 'none' };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bgProps: any = { fill: spread.bg_color || '#ffffff' };
  
  if (bgConfig.type === 'solid' && bgConfig.color1) {
    bgProps = { fill: bgConfig.color1 };
  } else if (bgConfig.type === 'linear' && bgConfig.color1 && bgConfig.color2) {
    const angleRad = (bgConfig.gradientAngle || 0) * (Math.PI / 180);
    const cx = project.size.w_mm / 2;
    const cy = project.size.h_mm / 2;
    const r = Math.sqrt(cx * cx + cy * cy);
    bgProps = {
       fillLinearGradientStartPoint: { x: cx - Math.cos(angleRad) * r, y: cy - Math.sin(angleRad) * r },
       fillLinearGradientEndPoint: { x: cx + Math.cos(angleRad) * r, y: cy + Math.sin(angleRad) * r },
       fillLinearGradientColorStops: [0, bgConfig.color1, 1, bgConfig.color2]
    };
  } else if (bgConfig.type === 'radial' && bgConfig.color1 && bgConfig.color2) {
    const cx = ((bgConfig.radialCenterX ?? 50) / 100) * project.size.w_mm;
    const cy = ((bgConfig.radialCenterY ?? 50) / 100) * project.size.h_mm;
    const maxRadius = Math.max(project.size.w_mm, project.size.h_mm);
    const radius = ((bgConfig.radialSize ?? 50) / 100) * maxRadius;
    bgProps = {
       fillRadialGradientStartPoint: { x: cx, y: cy },
       fillRadialGradientStartRadius: 0,
       fillRadialGradientEndPoint: { x: cx, y: cy },
       fillRadialGradientEndRadius: radius,
       fillRadialGradientColorStops: [0, bgConfig.color1, 1, bgConfig.color2]
    };
  }



  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const checkDeselect = (e: any) => {
    try {
      if (typeof e.target?.getStage === 'function') {
        const clickedOnEmpty = e.target === e.target.getStage();
        const clickedOnBackground = typeof e.target?.name === 'function' && e.target.name() === 'background-paper';
        if (clickedOnEmpty || clickedOnBackground) {
          setSelectedElement(null);
        }
      } else {
        if (typeof e.target?.tagName === 'string' && e.target.tagName.toUpperCase() !== 'CANVAS') {
          setSelectedElement(null);
        }
      }
    } catch (err) {
      console.warn("Deselect check failed silently natively", err);
    }
  };

  return (
    <div 
      className="flex-1 w-full h-full p-8 relative"
      onClick={checkDeselect}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu(null);
      }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
      onDrop={(e) => {
        e.preventDefault();
        try {
          const payload = JSON.parse(e.dataTransfer.getData('application/json'));
          
          if (payload) {
            let dropX = 20;
            let dropY = 20;
            
            if (e.target && (e.target as HTMLElement).tagName === 'CANVAS') {
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                dropX = (e.clientX - rect.left) / scale;
                dropY = (e.clientY - rect.top) / scale;
            }

            // Text payloads bypass image loading entirely!
            if (payload.type === 'text') {
              const role = payload.sourceId === 'txt-heading' ? 'h1' : payload.sourceId === 'txt-subheading' ? 'h2' : 'body';
              const textW = role === 'h1' ? 250 : role === 'h2' ? 200 : 150;
              const textH = role === 'h1' ? 80 : role === 'h2' ? 60 : 40;
              
              useEditorStore.getState().addElement(activeSpreadId, {
                id: `el_${Date.now()}`,
                type: 'text',
                textRole: role,
                text: role === 'h1' ? 'Añadir un título' : role === 'h2' ? 'Añadir un subtítulo' : 'Añade un poco de texto aquí...',
                fontFamily: 'Inter',
                fontSize: role === 'h1' ? 72 : role === 'h2' ? 48 : 24,
                textColor: '#000000',
                x_mm: dropX - (textW / 2),
                y_mm: dropY - (textH / 2),
                w_mm: textW,
                h_mm: textH,
                rotation_deg: 0,
                zIndex: 0
              });

              // Auto-apply current preset if active
              const presetId = useEditorStore.getState().project?.typographyPresetId;
              if (presetId) {
                setTimeout(() => {
                  useEditorStore.getState().applyTypographyPreset(presetId);
                }, 50);
              }
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
                  x_mm: dropX - (w / 2),
                  y_mm: dropY - (h / 2),
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
                  x_mm: payload.libraryCategory === 'cinematic' ? 0 : dropX - (w / 2),
                  y_mm: payload.libraryCategory === 'cinematic' ? 0 : dropY - (h / 2),
                  w_mm: payload.libraryCategory === 'cinematic' ? 900 : w,
                  h_mm: payload.libraryCategory === 'cinematic' ? 900 : h,
                  opacity: payload.libraryCategory === 'cinematic' ? 0.35 : 1,
                  rotation_deg: 0,
                  zIndex: 0
                });
              }
            };
            img.src = payload.type === 'decoration' ? payload.src : payload.previewUrl;
            }
          }
        } catch (err) {
          console.error("Drop parsing error", err);
        }
      }}
    >
      <div style={{ display: 'none' }}>
        {fontLinks && <style dangerouslySetInnerHTML={{ __html: fontLinks }} />}
      </div>
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
          name="background-paper"
          x={0}
          y={0}
          width={project.size.w_mm}
          height={project.size.h_mm}
          {...bgProps}
          shadowColor="black"
          shadowBlur={10}
          shadowOpacity={0.1}
        />

        {/* Elements */}
        {elements.map((rawEl) => {
          let el = { ...rawEl };
          if (el.type === 'group') return null; // Logical container bypassing visual draw explicitly
          if (el.visible === false) return null; // Direct visibility toggle overriding render loops

          // Calculate cascading visibility and Opacity correctly natively protecting render cycles
          if (el.groupId) {
             const parent = spread.elements.find(g => g.id === el.groupId);
             if (parent && parent.visible === false) return null; // Cascade Visibility
             
             if (parent && parent.opacity !== undefined) {
                // If parent has opacity, merge it natively
                const childOpacity = el.opacity !== undefined ? el.opacity : 1;
                el = { ...el, opacity: parent.opacity * childOpacity };
             }
          }

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
