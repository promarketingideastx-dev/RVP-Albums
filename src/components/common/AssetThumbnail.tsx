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

  // Cropped photo rendering:
  // Accurately map crop viewport onto thumbnail container
  const wPct = Math.max(1, crop?.widthPercent || 100);
  const hPct = Math.max(1, crop?.heightPercent || 100);
  const xPct = Math.max(0, crop?.xPercent || 0);
  const yPct = Math.max(0, crop?.yPercent || 0);

  const naturalAspect = asset.aspectRatio || (asset.width && asset.height ? asset.width / asset.height : 1.5);
  const cropRatio = naturalAspect * (wPct / hPct);
  const absRot = Math.abs(Math.round(rot)) % 360;
  const effectiveAspect = (absRot === 90 || absRot === 270) ? (1 / cropRatio) : cropRatio;

  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}>
      <div
        className="relative overflow-hidden flex items-center justify-center"
        style={{
          aspectRatio: `${effectiveAspect}`,
          maxWidth: '100%',
          maxHeight: '100%',
          width: effectiveAspect >= 1 ? '100%' : 'auto',
          height: effectiveAspect < 1 ? '100%' : 'auto',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || asset.name}
          loading={priority ? undefined : 'lazy'}
          className={`pointer-events-none transition-transform duration-200 ${imgClassName}`}
          style={{
            position: 'absolute',
            width: `${(10000 / wPct).toFixed(3)}%`,
            height: `${(10000 / hPct).toFixed(3)}%`,
            left: `${(-(xPct / wPct) * 100).toFixed(3)}%`,
            top: `${(-(yPct / hPct) * 100).toFixed(3)}%`,
            maxWidth: 'none',
            maxHeight: 'none',
            filter: cssFilter,
            transform,
          }}
        />
      </div>
    </div>
  );
};
