"use client";

import React from 'react';
import { ProjectAsset } from '@/types/editor';
import { buildCssFilterForAdjustments } from '@/utils/rawImagePipeline';

interface AssetThumbnailProps {
  asset: ProjectAsset;
  className?: string;
  imgClassName?: string;
  fit?: 'contain' | 'cover';
  alt?: string;
  priority?: boolean;
}

export const AssetThumbnail: React.FC<AssetThumbnailProps> = ({
  asset,
  className = '',
  imgClassName = '',
  fit = 'contain',
  alt,
  priority = false,
}) => {
  const src = asset.thumbnailUrl || asset.previewUrl || asset.originalUrl;
  const cssFilter = buildCssFilterForAdjustments(
    asset.developSettings,
    asset.photoFilter,
    asset.filterIntensity
  );

  const rot = asset.rotation_deg || 0;
  const flipH = !!asset.flipHorizontal;
  const flipV = !!asset.flipVertical;

  const transforms: string[] = [];
  if (rot) transforms.push(`rotate(${rot}deg)`);
  if (flipH) transforms.push('scaleX(-1)');
  if (flipV) transforms.push('scaleY(-1)');
  const transform = transforms.length > 0 ? transforms.join(' ') : undefined;

  const crop = asset.cropData;
  const isCropped = Boolean(
    crop &&
    (
      (crop.widthPercent !== undefined && crop.widthPercent < 99.5) ||
      (crop.heightPercent !== undefined && crop.heightPercent < 99.5) ||
      (crop.xPercent !== undefined && crop.xPercent > 0.5) ||
      (crop.yPercent !== undefined && crop.yPercent > 0.5)
    )
  );

  if (!src) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 ${className}`}>
        <span className="text-neutral-400 text-xs">No image</span>
      </div>
    );
  }

  if (!isCropped) {
    return (
      <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || asset.name}
          loading={priority ? undefined : 'lazy'}
          className={`w-full h-full ${fit === 'cover' ? 'object-cover' : 'object-contain'} pointer-events-none transition-transform duration-200 ${imgClassName}`}
          style={{
            filter: cssFilter,
            transform,
          }}
        />
      </div>
    );
  }

  // Render cropped thumbnails in source-pixel coordinates. SVG's meet scaling
  // preserves the image aspect ratio even inside a differently shaped tray cell.
  const wPct = Math.max(1, Math.min(100, crop?.widthPercent ?? 100));
  const hPct = Math.max(1, Math.min(100, crop?.heightPercent ?? 100));
  const xPct = Math.max(0, Math.min(100 - wPct, crop?.xPercent ?? 0));
  const yPct = Math.max(0, Math.min(100 - hPct, crop?.yPercent ?? 0));
  const sourceW = asset.width && asset.width > 0 ? asset.width : 1500;
  const sourceH = asset.height && asset.height > 0 ? asset.height : sourceW / (asset.aspectRatio || 1.5);
  const cropX = sourceW * xPct / 100;
  const cropY = sourceH * yPct / 100;
  const cropW = sourceW * wPct / 100;
  const cropH = sourceH * hPct / 100;
  const cx = cropX + cropW / 2;
  const cy = cropY + cropH / 2;
  const normalizedRot = ((rot % 360) + 360) % 360;
  const quarterTurn = normalizedRot === 90 || normalizedRot === 270;
  const viewW = quarterTurn ? cropH : cropW;
  const viewH = quarterTurn ? cropW : cropH;

  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}>
      <svg
        className={`w-full h-full pointer-events-none ${imgClassName}`}
        viewBox={`${cx - viewW / 2} ${cy - viewH / 2} ${viewW} ${viewH}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={alt || asset.name}
      >
        <g transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${flipH ? -1 : 1} ${flipV ? -1 : 1}) translate(${-cx} ${-cy})`}>
          <image href={src} x="0" y="0" width={sourceW} height={sourceH} preserveAspectRatio="none" style={{ filter: cssFilter }} />
        </g>
      </svg>
    </div>
  );
};
