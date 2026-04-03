"use client";

import React, { useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Ellipse, Transformer, Image as KonvaImage } from 'react-konva';
import { useEditorStore } from '@/store/useEditorStore';
import { EditorElement } from '@/types/editor';
import useImage from 'use-image';

interface SpreadCanvasProps {
  stageWidth: number;
  stageHeight: number;
  scale: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const EditorImage = ({ element, spreadId, isSelected, onSelect }: { element: EditorElement, spreadId: string, isSelected: boolean, onSelect: () => void }) => {
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const EditorShape = ({ element, spreadId, isSelected, onSelect }: { element: EditorElement, spreadId: string, isSelected: boolean, onSelect: () => void }) => {
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
    draggable: true,
    onClick: onSelect,
    onTap: onSelect,
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function SpreadCanvas({ stageWidth, stageHeight, scale }: SpreadCanvasProps) {
  const project = useEditorStore((state) => state.project);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);

  return (
    <React.Fragment>
      <div className="absolute top-10 left-10 z-[999] bg-black text-white p-4 font-mono text-xl">
        STRICT DEBUG: SpreadCanvas mounted!
        <br/>activeSpreadId: {activeSpreadId || 'NULL'}
        <br/>spreads.length: {project?.spreads?.length || 0}
        <br/>stage Width: {stageWidth?.toFixed(2) || 'NaN'}
        <br/>stage Height: {stageHeight?.toFixed(2) || 'NaN'}
      </div>
      <Stage width={800} height={400} style={{ backgroundColor: 'yellow', border: '5px solid blue', display: 'block' }}>
        <Layer>
          <Rect x={50} y={50} width={200} height={100} fill="red" />
        </Layer>
      </Stage>
    </React.Fragment>
  );
}
