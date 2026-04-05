import { ProjectAsset, AssetMetadata } from '@/types/editor';

/**
 * Phase 15 - Metadata Engine
 * Utilities for extracting basic editorial metadata from files and normalizing arrays deterministically.
 */

export function extractAssetMetadataFromFile(
   file: File, 
   sourceIndex: number, 
   dims: { w: number, h: number }
): AssetMetadata {
   const ratio = dims.h > 0 ? dims.w / dims.h : 1;
   let orientation: 'landscape' | 'portrait' | 'square' = 'square';
   if (ratio > 1.05) orientation = 'landscape';
   else if (ratio < 0.95) orientation = 'portrait';

   return {
       fileName: file.name,
       fileType: file.type,
       widthPx: dims.w,
       heightPx: dims.h,
       orientation,
       aspectRatio: ratio,
       captureTimestamp: file.lastModified || Date.now(),
       sourceOrderIndex: sourceIndex,
       metadataStatus: 'raw'
   };
}

export function normalizeAssetSequence(
   assets: ProjectAsset[], 
   mode: 'ORIGINAL_ORDER' | 'CHRONOLOGICAL' | 'MANUAL_PRIORITY'
): ProjectAsset[] {
    const copy = [...assets];
    
    // Fallback normalizer logic respecting multiple bounds securely
    copy.sort((a, b) => {
        const metaA = a.metadata;
        const metaB = b.metadata;

        if (mode === 'MANUAL_PRIORITY') {
            const prioA = metaA?.manualPriority ?? 0;
            const prioB = metaB?.manualPriority ?? 0;
            if (prioA !== prioB) return prioB - prioA; // Highest priority first (Descending)
        }

        if (mode === 'CHRONOLOGICAL' || mode === 'MANUAL_PRIORITY') {
            const timeA = metaA?.captureTimestamp ?? 0;
            const timeB = metaB?.captureTimestamp ?? 0;
            if (timeA !== timeB) return timeA - timeB; // Oldest first
        }

        // ORIGINAL_ORDER or Fallback for Chronological collisions
        const idxA = metaA?.sourceOrderIndex ?? 0;
        const idxB = metaB?.sourceOrderIndex ?? 0;
        if (idxA !== idxB) return idxA - idxB;

        // Ultimate deterministic fallback
        const nameA = metaA?.fileName || a.name || '';
        const nameB = metaB?.fileName || b.name || '';
        if (nameA !== nameB) return nameA.localeCompare(nameB, undefined, { numeric: true });

        // Absolute fallback preventing array unstable mutation
        return a.id.localeCompare(b.id);
    });

    return copy;
}

export function groupAssetsForSpread(
    assets: ProjectAsset[], 
    targetCapacity: number
): ProjectAsset[][] {
    const chunks: ProjectAsset[][] = [];
    let currentChunk: ProjectAsset[] = [];

    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        const ratio = asset.metadata?.aspectRatio || 1;
        const isExtreme = ratio < 0.5 || ratio > 2.5;
        const priority = asset.metadata?.manualPriority || 0;

        // Protect Hero (Priority 2): If incoming is Hero and chunk has visual noise, slice early
        if (priority === 2 && currentChunk.length > 0 && currentChunk.length >= Math.max(1, targetCapacity - 2)) {
             chunks.push(currentChunk);
             currentChunk = [];
        }

        // Avoid mixing extremes recklessly
        const chunkHasExtreme = currentChunk.some(a => {
             const r = a.metadata?.aspectRatio || 1;
             return r < 0.5 || r > 2.5;
        });
        
        if (isExtreme && currentChunk.length > 0 && !chunkHasExtreme && currentChunk.length >= targetCapacity / 2) {
             chunks.push(currentChunk);
             currentChunk = [];
        }

        if (currentChunk.length >= targetCapacity) {
            chunks.push(currentChunk);
            currentChunk = [];
        }

        currentChunk.push(asset);
        
        // If we just pushed a hero, and it's full enough, slice immediately to limit densification
        if (priority === 2 && currentChunk.length >= Math.max(1, targetCapacity - 1)) {
             chunks.push(currentChunk);
             currentChunk = [];
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    return chunks;
}
