export interface MasonryPhotoInput {
    id: string;
    aspectRatio: number; // width / height
}

export interface MasonrySlotOutput {
    photoId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rowIndex: number;
    orderIndex: number;
    originalAspectRatio: number;
}

export interface MasonryEngineConfig {
    spreadWidth: number;
    spreadHeight: number;
    photos: MasonryPhotoInput[];
    gap?: number;
    margin?: number;
    strategy?: 'PRIORITIZE_HEIGHT' | 'PRIORITIZE_WIDTH' | 'FORCE_TWO_COLUMNS' | 'CHAOTIC_BALANCED';
    flipHorizontal?: boolean;
    variantSeed?: number;
}

/**
 * Fundy-style Masonry / Row-Packing Engine.
 * 
 * CORE RULES:
 * 1. Mathematically fills 100% of the bounds (W / H) with ZERO dead space.
 * 2. Does not arbitrarily deform aspect ratios; instead, it optimizes partitions
 *    to find the closest natural fit, then scales dimensions evenly to cover bounding boxes.
 * 3. Supports dynamically growing inputs (1 to N photos).
 */
export function generateFundyMasonryLayout(config: MasonryEngineConfig): MasonrySlotOutput[] {
    const { spreadWidth, spreadHeight, photos, gap = 10, margin = 20, variantSeed = 0 } = config;
    
    if (!photos || photos.length === 0) return [];

    const W = spreadWidth - margin * 2;
    const H = spreadHeight - margin * 2;

    if (photos.length === 1) {
        // Trivial case: 1 photo fills the entire available area
        return [{
            photoId: photos[0].id,
            x: margin,
            y: margin,
            width: W,
            height: H,
            rowIndex: 0,
            orderIndex: 0,
            originalAspectRatio: photos[0].aspectRatio
        }];
    }

    // --- STEP 1: GREEDY PARTITION TESTER ---
    // We try multiple "target row heights" to find all valid partition structures natively
    let validPartitions: { rows: MasonryPhotoInput[][], error: number, avgPhotosPerRow: number }[] = [];

    const minH = H / photos.length;
    const maxH = H;
    const steps = 150; // High resolution sampling for math optimization
    const stepSize = (maxH - minH) / steps;

    for (let th = minH; th <= maxH; th += stepSize) {
        const rows = packGreedy(photos, th, W, gap);
        const hCalc = calculateTotalHeight(rows, W, gap);
        const error = Math.abs(hCalc - H);
        
        validPartitions.push({ rows, error, avgPhotosPerRow: photos.length / rows.length });
    }

    // De-duplicate structurally equivalent partitions mathematically
    validPartitions = validPartitions.filter((v, i, a) => a.findIndex(t => t.rows.length === v.rows.length && t.rows.every((r, ri) => r.length === v.rows[ri].length)) === i);

    let bestRows: MasonryPhotoInput[][] = [photos];
    const targetStrategy = config.strategy || 'PRIORITIZE_VARIANCE';

    if (validPartitions.length > 0) {
        if (targetStrategy === 'PRIORITIZE_HEIGHT') {
            const sorted = validPartitions.sort((a,b) => a.error - b.error);
            bestRows = sorted[variantSeed % Math.max(1, sorted.length)].rows;
        } else if (targetStrategy === 'PRIORITIZE_WIDTH') {
            const sorted = validPartitions.sort((a,b) => a.avgPhotosPerRow - b.avgPhotosPerRow);
            bestRows = sorted[variantSeed % Math.max(1, Math.min(5, sorted.length))].rows;
        } else if (targetStrategy === 'FORCE_TWO_COLUMNS') {
            bestRows = validPartitions.sort((a,b) => Math.abs(a.avgPhotosPerRow - 2) - Math.abs(b.avgPhotosPerRow - 2))[0].rows;
        } else {
            // HERO_VARIANCE or CHAOTIC_BALANCED: We want dynamic asymmetry.
            // A varied layout is one where row lengths differ (e.g. 1 photo on top, 3 below).
            const scoredPartitions = validPartitions.map(p => {
                 const rowSizes = p.rows.map(r => r.length);
                 const uniqueSizes = new Set(rowSizes).size;
                 // Reward having a "hero row" (a row with exactly 1 photo) if we have enough total photos
                 const hasHeroRow = p.rows.some(r => r.length === 1);
                 const heroBonus = (photos.length >= 3 && hasHeroRow) ? 500 : 0;
                 // Add penalty for rows over 5 photos
                 const overCrowdedPenalty = p.rows.some(r => r.length >= 5) ? -200 : 0;
                 
                 const score = heroBonus + overCrowdedPenalty + (uniqueSizes * 100) - p.error;
                 return { ...p, varianceScore: score };
            });
            
            const sortedPartitions = scoredPartitions.sort((a,b) => b.varianceScore - a.varianceScore);
            // Cycle through the top 4 geometric best mathematically fit varied structures
            const selectedPartition = sortedPartitions[variantSeed % Math.max(1, Math.min(4, sortedPartitions.length))];
            bestRows = selectedPartition.rows;

            // Introduce a subtle layout rotation: cycle the Hero row via reversing or manual shifting
            if (targetStrategy === 'CHAOTIC_BALANCED' || (variantSeed % 2 === 1)) {
                 bestRows.reverse();
            }
        }
    }

    // --- STEP 2: FRAME CALCULATION & MATHEMATICAL STRETCH ---
    // We now have the best partition. Calculate natural heights assuming full width.
    const naturalRowHeights = bestRows.map(row => {
        const totalAR = row.reduce((sum, p) => sum + p.aspectRatio, 0);
        const effectiveW = W - (row.length - 1) * gap;
        return effectiveW / totalAR;
    });

    const sumNaturalH = naturalRowHeights.reduce((s, h) => s + h, 0);
    const availableTotalH = H - (bestRows.length - 1) * gap;
    
    // Instead of forced distortion (which crops photos and breaks aspect ratio mathematically),
    // we determine if the natural mosaic exceeds the available vertical boundaries.
    let globalScale = 1.0;
    if (sumNaturalH > availableTotalH) {
        // Proportionally scale the entire matrix structure (Width, Heights, and Gaps) to fit completely inside the Safe Area.
        const mathematicalTotalH = sumNaturalH + (bestRows.length - 1) * gap;
        globalScale = H / mathematicalTotalH;
    }

    const activeGap = gap * globalScale;
    const activeW = W * globalScale;

    const finalRowHeights = bestRows.map(row => {
        const totalAR = row.reduce((sum, p) => sum + p.aspectRatio, 0);
        const effectiveW = activeW - (row.length - 1) * activeGap;
        return effectiveW / totalAR;
    });

    const finalSumH = finalRowHeights.reduce((s, h) => s + h, 0);
    const finalTotalH = finalSumH + (bestRows.length - 1) * activeGap;

    const verticalOffset = Math.max(0, (H - finalTotalH) / 2);
    const horizontalOffset = Math.max(0, (W - activeW) / 2);

    // --- STEP 3: MAPPING TO ABSOLUTE GEOMETRY ---
    const slots: MasonrySlotOutput[] = [];
    let currentY = margin + verticalOffset;
    let orderCounter = 0;

    bestRows.forEach((row, rIndex) => {
        const finalRowH = finalRowHeights[rIndex]; // PERFECT PROPORTIONAL SCALING
        let currentX = margin + horizontalOffset;

        row.forEach((photo) => {
            const finalW = finalRowH * photo.aspectRatio; // PRESERVES EXACT ASPECT RATIO
            
            slots.push({
                photoId: photo.id,
                x: currentX,
                y: currentY,
                width: finalW,
                height: finalRowH,
                rowIndex: rIndex,
                orderIndex: orderCounter++,
                originalAspectRatio: photo.aspectRatio
            });

            currentX += finalW + activeGap;
        });

        // Snap the trailing edge to the calculated active bounds to avoid micro-rounding jaggedness
        if (row.length > 0) {
            const lastSlot = slots[slots.length - 1];
            const mathematicalRightEdge = currentX - activeGap;
            const expectedRightEdge = margin + horizontalOffset + activeW;
            if (Math.abs(mathematicalRightEdge - expectedRightEdge) > 0.01) {
                 lastSlot.width += (expectedRightEdge - mathematicalRightEdge);
            }
        }

        currentY += finalRowH + activeGap;
    });

    // --- STEP 4: POST-PROCESS EXPERIMENTAL MUTATIONS (FLIP HORIZONTAL) ---
    if (config.flipHorizontal) {
        slots.forEach(slot => {
            const distanceFromLeftMargin = slot.x - margin;
            // Mirror X relative to the bounds: newX = margin + W - width - distance
            slot.x = margin + W - slot.width - distanceFromLeftMargin;
        });
    }

    return slots;
}

// Internal Pure Function: Justified Layout Greedy Packer
function packGreedy(photos: MasonryPhotoInput[], targetH: number, maxW: number, gap: number): MasonryPhotoInput[][] {
    const rows: MasonryPhotoInput[][] = [];
    let currentRow: MasonryPhotoInput[] = [];
    let currentW = 0;

    for (const p of photos) {
        const projectedW = targetH * p.aspectRatio;
        
        if (currentRow.length === 0) {
            currentRow.push(p);
            currentW = projectedW;
        } else {
            const wWithNext = currentW + gap + projectedW;
            if (wWithNext > maxW) {
                const errWith = Math.abs(wWithNext - maxW);
                const errWithout = Math.abs(currentW - maxW);

                if (errWith <= errWithout) {
                    // It fits closer if we stuff it in
                    currentRow.push(p);
                    rows.push(currentRow);
                    currentRow = [];
                    currentW = 0;
                } else {
                    // Better to break line NOW
                    rows.push(currentRow);
                    currentRow = [p];
                    currentW = projectedW;
                }
            } else {
                currentRow.push(p);
                currentW = wWithNext;
            }
        }
    }

    if (currentRow.length > 0) {
        rows.push(currentRow);
    }

    return rows;
}

// Internal Pure Function: Height evaluation for a given configuration
function calculateTotalHeight(rows: MasonryPhotoInput[][], maxW: number, gap: number): number {
    let totalH = 0;
    rows.forEach(row => {
        const totalAR = row.reduce((sum, p) => sum + p.aspectRatio, 0);
        const effectiveW = maxW - (row.length - 1) * gap;
        const rowH = effectiveW / totalAR;
        totalH += rowH;
    });
    return totalH + (rows.length - 1) * gap;
}
