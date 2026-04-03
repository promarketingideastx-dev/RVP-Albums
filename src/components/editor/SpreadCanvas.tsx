"use client";

import React, { useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Transformer, Image as KonvaImage } from 'react-konva';
import { useEditorStore } from '@/store/useEditorStore';
import { EditorElement } from '@/types/editor';
import useImage from 'use-image';

interface SpreadCanvasProps {
  stageWidth: number;
  stageHeight: number;
  scale: number;
}

const EditorImage = ({ element, spreadId, isSelected, onSelect }: { element: EditorElement, spreadId: string, isSelected: boolean, onSelect: () => void }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trRef = useRef<any>(null);
  const updateElement = useEditorStore((state) => state.updateElement);
  
  // Custom hook for loading image source
  const [image] = useImage(element.src || 'https://via.placeholder.com/150');

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
        draggable
        onClick={onSelect}
        onTap={onSelect}
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

export default function SpreadCanvas({ stageWidth, stageHeight, scale }: SpreadCanvasProps) {
  const project = useEditorStore((state) => state.project);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const setSelectedElement = useEditorStore((state) => state.setSelectedElement);

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
    <Stage
      width={stageWidth}
      height={stageHeight}
      onMouseDown={checkDeselect}
      onTouchStart={checkDeselect}
      style={{ boxShadow: '0px 10px 30px rgba(0,0,0,0.1)' }}
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
        {elements.map((el) => (
          <EditorImage
            key={el.id}
            element={el}
            spreadId={activeSpreadId}
            isSelected={selectedElementId === el.id}
            onSelect={() => setSelectedElement(el.id)}
          />
        ))}

        {/* Print Guides (Bleed and Safe Zone) - overlay on top, no events */}
        <Rect
           x={project.bleed_mm}
           y={project.bleed_mm}
           width={project.size.w_mm - (project.bleed_mm * 2)}
           height={project.size.h_mm - (project.bleed_mm * 2)}
           stroke="red"
           strokeWidth={0.5 / scale}
           dash={[4 / scale, 4 / scale]}
           listening={false}
        />
        <Rect
           x={project.bleed_mm + project.safe_zone_mm}
           y={project.bleed_mm + project.safe_zone_mm}
           width={project.size.w_mm - ((project.bleed_mm + project.safe_zone_mm) * 2)}
           height={project.size.h_mm - ((project.bleed_mm + project.safe_zone_mm) * 2)}
           stroke="blue"
           strokeWidth={0.5 / scale}
           dash={[4 / scale, 4 / scale]}
           listening={false}
        />
      </Layer>
    </Stage>
  );
}
