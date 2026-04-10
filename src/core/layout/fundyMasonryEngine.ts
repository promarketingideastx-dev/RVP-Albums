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
        // But rather than just filling randomly, we should constrain it geometrically so it doesn't distort!
        const W = spreadWidth - margin * 2;
        const H = spreadHeight - margin * 2;
        const photoAR = photos[0].aspectRatio;
        const boundingAR = W / H;
        
        let finalW = W;
        let finalH = H;
        if (photoAR > boundingAR) {
             finalH = W / photoAR;
        } else {
             finalW = H * photoAR;
        }
        
        return [{
            photoId: photos[0].id,
            x: margin + (W - finalW) / 2,
            y: margin + (H - finalH) / 2,
            width: finalW,
            height: finalH,
            rowIndex: 0,
            orderIndex: 0,
            originalAspectRatio: photoAR
        }];
    }

    // Phase 13: STRICT LOW-COUNT INTERCEPTOR
    if (photos.length <= 6) {
        const lowCountResult = generateLowCountComposition(config);
        if (lowCountResult.length > 0) return lowCountResult;
    }

    // --- STEP 1.5: SEEDED PERMUTATION SHUFFLE ---
    // Mathematically permuting the input array forces the greedy packer to generate 
    // entirely different geometrical structures for the same seed, giving true variety.
    const shuffledPhotos = [...photos];
    if (variantSeed > 0) {
        let rngSeed = (variantSeed * 16807) % 2147483647;
        for (let i = shuffledPhotos.length - 1; i > 0; i--) {
            rngSeed = (rngSeed * 16807) % 2147483647;
            const j = rngSeed % (i + 1);
            [shuffledPhotos[i], shuffledPhotos[j]] = [shuffledPhotos[j], shuffledPhotos[i]];
        }
    }

    // --- STEP 2: GREEDY PARTITION TESTER ---
    // We try multiple "target row heights" to find all valid partition structures natively
    let validPartitions: { rows: MasonryPhotoInput[][], error: number, avgPhotosPerRow: number }[] = [];

    const minH = H / shuffledPhotos.length;
    const maxH = H;
    const steps = 150; // High resolution sampling for math optimization
    const stepSize = (maxH - minH) / steps;

    for (let th = minH; th <= maxH; th += stepSize) {
        const rows = packGreedy(shuffledPhotos, th, W, gap);
        const hCalc = calculateTotalHeight(rows, W, gap);
        const error = Math.abs(hCalc - H);
        
        validPartitions.push({ rows, error, avgPhotosPerRow: shuffledPhotos.length / rows.length });
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
            const sorted = validPartitions.sort((a,b) => b.avgPhotosPerRow - a.avgPhotosPerRow);
            bestRows = sorted[variantSeed % Math.max(1, Math.min(5, sorted.length))].rows;
        } else if (targetStrategy === 'FORCE_TWO_COLUMNS') {
            bestRows = validPartitions.sort((a,b) => Math.abs(a.avgPhotosPerRow - 2) - Math.abs(b.avgPhotosPerRow - 2))[0].rows;
        } else {
            // HERO_VARIANCE or CHAOTIC_BALANCED: We want dynamic asymmetry.
            const scoredPartitions = validPartitions.map(p => {
                 const rowSizes = p.rows.map(r => r.length);
                 const uniqueSizes = new Set(rowSizes).size;
                 
                 // Evaluate the mathematical height required by this partition
                 const sumNaturalH = p.rows.map(row => {
                     const totalAR = row.reduce((sum, photo) => sum + photo.aspectRatio, 0);
                     return (W - (row.length - 1) * gap) / totalAR;
                 }).reduce((s, h) => s + h, 0);
                 
                 // If the natural height massively exceeds the available height, globalScale will shrink the width drastically!
                 // We heavily penalize partitions that force globalScale down below 0.8 to preserve full-page usage.
                 const scaleRatio = H / sumNaturalH;
                 const skinnyPenalty = scaleRatio < 0.85 ? -5000 * (1 - scaleRatio) : 0; 
                 
                 // Reward a "hero row" ONLY if it does not trigger a catastrophic skinny shrink!
                 const hasHeroRow = p.rows.some(r => r.length === 1);
                 const heroBonus = (photos.length >= 3 && hasHeroRow) ? 300 : 0;
                 
                 const overCrowdedPenalty = p.rows.some(r => r.length >= 5) ? -200 : 0;
                 
                 const varianceBonus = uniqueSizes * 100;
                 const precisionScore = -p.error;
                 
                 const score = heroBonus + varianceBonus + overCrowdedPenalty + skinnyPenalty + precisionScore;
                 return { ...p, varianceScore: score };
            });
            
            const sortedPartitions = scoredPartitions.sort((a,b) => b.varianceScore - a.varianceScore);
            const maxVariants = Math.min(5, sortedPartitions.length);
            const selectedPartition = sortedPartitions[variantSeed % Math.max(1, maxVariants)];
            bestRows = selectedPartition.rows;

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

// --- LOW-COUNT COMPOSITIONAL AST ENGINE --- 
type TopoNode = 
    | { type: 'leaf', index: number }
    | { type: 'row', children: TopoNode[] }
    | { type: 'col', children: TopoNode[] };

interface LinearRel {
    s: number; 
    c: number;
}

function solveTreeRel(node: TopoNode, photos: MasonryPhotoInput[], gap: number): LinearRel {
    if (node.type === 'leaf') {
        return { s: photos[node.index].aspectRatio, c: 0 };
    }
    if (node.type === 'row') {
        const rels = node.children.map(c => solveTreeRel(c, photos, gap));
        let s = 0; let c = 0;
        rels.forEach(r => { s += r.s; c += r.c; });
        c += (rels.length - 1) * gap;
        return { s, c };
    }
    if (node.type === 'col') {
        const rels = node.children.map(c => solveTreeRel(c, photos, gap));
        let sumInv = 0; let sumCInv = 0;
        rels.forEach(r => { sumInv += 1 / r.s; sumCInv += r.c / r.s; });
        const s = 1 / sumInv;
        const c = (sumCInv - (rels.length - 1) * gap) / sumInv;
        return { s, c };
    }
    return { s: 1, c: 0 };
}

function computeTreeLayout(node: TopoNode, x: number, y: number, w: number, h: number, photos: MasonryPhotoInput[], gap: number, orderAcc: {count: number}): MasonrySlotOutput[] {
    if (node.type === 'leaf') {
        return [{
            photoId: photos[node.index].id,
            x, y, width: w, height: h,
            rowIndex: 0,
            orderIndex: orderAcc.count++,
            originalAspectRatio: photos[node.index].aspectRatio
        }];
    }
    const slots: MasonrySlotOutput[] = [];
    if (node.type === 'row') {
        let currentX = x;
        node.children.forEach(child => {
            const rel = solveTreeRel(child, photos, gap);
            const childW = rel.s * h + rel.c;
            slots.push(...computeTreeLayout(child, currentX, y, childW, h, photos, gap, orderAcc));
            currentX += childW + gap;
        });
    } else if (node.type === 'col') {
        let currentY = y;
        node.children.forEach(child => {
            const rel = solveTreeRel(child, photos, gap);
            const childH = (w - rel.c) / rel.s;
            slots.push(...computeTreeLayout(child, x, currentY, w, childH, photos, gap, orderAcc));
            currentY += childH + gap;
        });
    }
    return slots;
}

function getTopologies(n: number): TopoNode[] {
    const P = (i: number): TopoNode => ({ type: 'leaf', index: i });
    const R = (...c: TopoNode[]): TopoNode => ({ type: 'row', children: c });
    const C = (...c: TopoNode[]): TopoNode => ({ type: 'col', children: c });
    
    if (n === 2) return [ R(P(0), P(1)), C(P(0), P(1)) ];
    if (n === 3) return [
       R(P(0), P(1), P(2)), C(P(0), P(1), P(2)),
       R(P(0), C(P(1), P(2))), R(C(P(0), P(1)), P(2)),
       C(P(0), R(P(1), P(2))), C(R(P(0), P(1)), P(2))
    ];
    if (n === 4) return [
       R(P(0), P(1), P(2), P(3)), C(P(0), P(1), P(2), P(3)),
       C(R(P(0), P(1)), R(P(2), P(3))), R(P(0), C(P(1), P(2), P(3))), R(C(P(0), P(1), P(2)), P(3)),
       C(P(0), R(P(1), P(2), P(3))), C(R(P(0), P(1), P(2)), P(3)), R(C(P(0), P(1)), C(P(2), P(3))),
       C(P(0), R(P(1), P(2)), P(3)), R(P(0), C(P(1), P(2)), P(3))
    ];
    if (n === 5) return [
       R(P(0), P(1), P(2), P(3), P(4)), C(P(0), P(1), P(2), P(3), P(4)),
       C(R(P(0), P(1)), R(P(2), P(3), P(4))), C(R(P(0), P(1), P(2)), R(P(3), P(4))),
       R(C(P(0), P(1)), C(P(2), P(3), P(4))), R(C(P(0), P(1), P(2)), C(P(3), P(4))),
       C(P(0), R(P(1), P(2), P(3), P(4))), R(P(0), C(P(1), P(2), P(3), P(4))),
       C(R(P(0), P(1), P(2), P(3)), P(4)), R(C(P(0), P(1), P(2), P(3)), P(4)),
       C(P(0), R(P(1), P(2)), R(P(3), P(4)))
    ];
    if (n === 6) return [
       C(R(P(0), P(1), P(2)), R(P(3), P(4), P(5))), R(C(P(0), P(1), P(2)), C(P(3), P(4), P(5))),
       C(R(P(0), P(1)), R(P(2), P(3)), R(P(4), P(5))), R(C(P(0), P(1)), C(P(2), P(3)), C(P(4), P(5))),
       C(P(0), R(P(1), P(2), P(3), P(4), P(5))), C(R(P(0), P(1), P(2), P(3)), R(P(4), P(5))),
       R(P(0), C(R(P(1), P(2)), R(P(3), P(4)), P(5)))
    ];
    return [];
}

function generateLowCountComposition(config: MasonryEngineConfig): MasonrySlotOutput[] {
    const { spreadWidth, spreadHeight, photos, gap = 10, margin = 20, variantSeed = 0 } = config;
    const W = spreadWidth - margin * 2;
    const H = spreadHeight - margin * 2;

    const shuffledPhotos = [...photos];
    if (variantSeed > 0) {
        let rngSeed = (variantSeed * 16807) % 2147483647;
        for (let i = shuffledPhotos.length - 1; i > 0; i--) {
            rngSeed = (rngSeed * 16807) % 2147483647;
            const j = rngSeed % (i + 1);
            [shuffledPhotos[i], shuffledPhotos[j]] = [shuffledPhotos[j], shuffledPhotos[i]];
        }
    }

    const topologies = getTopologies(shuffledPhotos.length);
    const scoredTopos: { area: number, slots: MasonrySlotOutput[] }[] = [];

    topologies.forEach(topo => {
        const rootRel = solveTreeRel(topo, shuffledPhotos, gap);
        if (rootRel.s <= 0 || rootRel.c > Math.max(W, H) * 2) return;

        const hW = (W - rootRel.c) / rootRel.s;
        const validW = hW > 0 && hW <= H + 0.1;
        
        const wH = rootRel.s * H + rootRel.c;
        const validH = wH > 0 && wH <= W + 0.1;
        
        let area = 0;
        let finalW = 0; let finalH = 0;

        if (validW && validH) {
            const areaW = W * hW; const areaH = wH * H;
            if (areaW > areaH) { finalW = W; finalH = Math.min(hW, H); area = areaW; } 
            else { finalW = Math.min(wH, W); finalH = H; area = areaH; }
        } else if (validW) { finalW = W; finalH = Math.min(hW, H); area = W * hW; } 
        else if (validH) { finalW = Math.min(wH, W); finalH = H; area = wH * H; }

        if (area > 0) {
            const offsetX = margin + (W - finalW) / 2;
            const offsetY = margin + (H - finalH) / 2;
            const slots = computeTreeLayout(topo, offsetX, offsetY, finalW, finalH, shuffledPhotos, gap, { count: 0 });
            scoredTopos.push({ area, slots });
        }
    });

    if (scoredTopos.length === 0) return [];
    
    // Sort strictly by mathematical dominance 
    scoredTopos.sort((a, b) => b.area - a.area);
    
    // Fundy Variety Simulation: Pick among top 3 best-fitting topological frameworks!
    const poolSize = Math.min(3, scoredTopos.length);
    const selected = scoredTopos[variantSeed % poolSize];
    
    if (config.flipHorizontal) {
        selected.slots.forEach(slot => {
            const dist = slot.x - margin;
            slot.x = margin + W - slot.width - dist;
        });
    }

    return selected.slots;
}
