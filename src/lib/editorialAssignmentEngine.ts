import { AutoLayoutSlot, PhotoMetadata, LayoutFamily } from '@/types/editor';

interface AssignmentProps {
  slots: AutoLayoutSlot[];
  photos: PhotoMetadata[];
  mode: 'geometric' | 'editorial';
}

/**
 * PHASE 7.I.2: Analyzes context and semantic distributions recommending native composition families cleanly.
 * Evaluates proportions extracting dominant candidate arrays avoiding inappropriate mismatches natively.
 */
export function analyzePhotoSet(photos: PhotoMetadata[]): LayoutFamily {
    if (photos.length === 0) return 'geometric';
    
    const landscapes = photos.filter(p => p.orientation === 'landscape');
    const portraits = photos.filter(p => p.orientation === 'portrait');
    
    // Phase 7.I.3: Analyze strictly by maximum pre-calculated VisualWeight
    const maxWeight = Math.max(...photos.map(p => p.visualWeight || 0));
    
    // Evaluate explicit dominant hero criteria scaling isolated constraints mapping logically
    const strongHeroCandidates = photos.filter(p => (p.visualWeight || 0) >= maxWeight * 0.8 && p.orientation === 'landscape');
    
    if (strongHeroCandidates.length >= 1) {
       console.debug(`[Editorial Engine] Analyzer -> Recommended 'hero-dominant' based on strong visualWeight landscapes.`);
       return 'hero-dominant';
    }
    
    if (portraits.length > landscapes.length && portraits.length >= 2) {
       console.debug(`[Editorial Engine] Analyzer -> Recommended 'column-story' based on portrait majority.`);
       return 'column-story';
    }
    
    if (photos.length > 4) {
       console.debug(`[Editorial Engine] Analyzer -> Recommended 'mosaic' distributing advanced aggregates seamlessly.`);
       return 'mosaic';
    }
    
    console.debug(`[Editorial Engine] Analyzer -> Recommended 'balanced-story' scaling cleanly.`);
    return 'balanced-story';
}

/**
 * Transforms pure geometrical slots by deterministically mapping semantic visual roles
 * based on weighted scores, area dimensions, and intrinsic photo proportions.
 * Outputs diagnostic scoring tracing natively.
 */
export function resolveEditorialAssignment({ slots, photos, mode }: AssignmentProps): AutoLayoutSlot[] {
  // Ensure strict immutability traversing the generic slots
  const mappedSlots = slots.map(s => ({ ...s, assignedElementId: undefined as string | undefined }));

  if (mode === 'editorial') {
    let availablePhotos = [...photos];

    mappedSlots.forEach(slot => {
      // Pass 1: Aggressively target HERO slots calculating explicit deterministic visual masses
      if (slot.role === 'hero') {
        const scoredHeroes = availablePhotos.map(p => {
          let score = 0;
          
          // Phase 7.J: User Control Priority. Absolute domination blocking native metrics
          if (p.editorialRole === 'hero') score += 100000;
          if (p.editorialRole === 'filler') score -= 100000;
          if (p.editorialRole === 'supporting') score -= 50000;

          // Phase 7.I.3: VisualWeight Heuristic (Incorporates Area + Upload Order Bias inherently)
          const baseWeight = p.visualWeight || 0;
          score += baseWeight * 50; 
          
          // Rule 2: Slot Compatibility (Orientation Bias)
          const slotIsWide = slot.aspectRatio > 1.2;
          const slotIsTall = slot.aspectRatio < 0.8;
          
          if (slotIsWide && p.orientation === 'landscape') score += 30;
          else if (slotIsTall && p.orientation === 'portrait') score += 30;
          else if (!slotIsWide && !slotIsTall && p.orientation === 'square') score += 20;
          else score -= 25; // Severe penalty for structural orientation clash on Hero

          // Rule 3: Subtly reward dramatic mathematical ratios in proper bounds
          if (p.orientation === 'landscape') score += (p.aspectRatio * 5);

          return { photo: p, score };
        }).sort((a, b) => b.score - a.score);

        if (scoredHeroes.length > 0) {
          const winner = scoredHeroes[0];
          slot.assignedElementId = winner.photo.elementId;
          slot.assignmentReason = winner.photo.editorialRole === 'hero' ? 'Forzado a HERO estricto por el usuario' : 'Mayor peso visual absoluto + orientación';
          availablePhotos = availablePhotos.filter(p => p.elementId !== winner.photo.elementId);
          console.debug(`[Editorial Engine] ASSIGNED [HERO] -> ${winner.photo.elementId} (Total Score: ${winner.score.toFixed(2)} | BaseWeight: ${winner.photo.visualWeight?.toFixed(2)})`);
        }
      }
    });

    mappedSlots.forEach(slot => {
      // Pass 2: Process intermediate Supporting slots (Distribute mid-tier weights reasonably)
      if (!slot.assignedElementId && slot.role === 'supporting') {
        const scoredSupporting = availablePhotos.map(p => {
           let score = 0;
           
           // Phase 7.J: User Control Priority overrides
           if (p.editorialRole === 'supporting') score += 100000;
           if (p.editorialRole === 'filler') score -= 100000;
           if (p.editorialRole === 'hero') score += 50000; // If forced Hero didn't fit, ensure top supporting

           // Phase 7.I.3: Supporting needs high weights, but orientation is strict
           const baseWeight = p.visualWeight || 0;
           score += baseWeight * 20; 
           
           const slotIsWide = slot.aspectRatio > 1.2;
           const slotIsTall = slot.aspectRatio < 0.8;
           const slotIsSquare = slot.aspectRatio >= 0.8 && slot.aspectRatio <= 1.2;

           if (slotIsWide && p.orientation === 'landscape') score += 40;
           else if (slotIsTall && p.orientation === 'portrait') score += 40;
           else if (slotIsSquare && p.orientation === 'square') score += 40;

           return { photo: p, score };
        }).sort((a, b) => b.score - a.score);

        if (scoredSupporting.length > 0) {
          const winner = scoredSupporting[0];
          slot.assignedElementId = winner.photo.elementId;
          slot.assignmentReason = winner.photo.editorialRole === 'supporting' ? 'Supporting forzado manualmente' : winner.photo.editorialRole === 'hero' ? 'Hero forzado reubicado (No hubo slot hero)' : 'Buen balance estructural medio';
          availablePhotos = availablePhotos.filter(p => p.elementId !== winner.photo.elementId);
          console.debug(`[Editorial Engine] ASSIGNED [SUPPORTING] -> ${winner.photo.elementId} (Score: ${winner.score.toFixed(2)})`);
        }
      }
    });

    mappedSlots.forEach(slot => {
      // Pass 3: Fillers - Phase 7.I.3: Penalize wasting valuable high-weight photos as tiny irrelevant filler squares
      if (!slot.assignedElementId && slot.role === 'filler') {
         const sortedFillers = availablePhotos.map(p => {
            let score = 0;

            // Phase 7.J: User Control Override (Remember: Highest score wins Filler)
            if (p.editorialRole === 'filler') score += 100000;
            if (p.editorialRole === 'hero') score -= 100000;
            if (p.editorialRole === 'supporting') score -= 50000;

            // Invert the weight logic. Heaviest photos are penalized for filler arrays implicitly preventing burial.
            const baseWeight = p.visualWeight || 0;
            score -= baseWeight * 30; 
            
            const slotIsWide = slot.aspectRatio > 1.2;
            const slotIsTall = slot.aspectRatio < 0.8;
            
            if (slotIsWide && p.orientation === 'landscape') score += 20;
            if (slotIsTall && p.orientation === 'portrait') score += 20;
            
            return { photo: p, score }; 
         }).sort((a, b) => b.score - a.score); // Highest score (lowest weight) wins the filler
         
         if (sortedFillers.length > 0) {
            const winner = sortedFillers[0];
            slot.assignedElementId = winner.photo.elementId;
            slot.assignmentReason = winner.photo.editorialRole === 'filler' ? 'Enviado a relleno manualmente' : 'Minimizado heurísticamente para proteger joyas visuales';
            availablePhotos = availablePhotos.filter(p => p.elementId !== winner.photo.elementId);
            console.debug(`[Editorial Engine] ASSIGNED [FILLER] -> ${winner.photo.elementId} (Score: ${winner.score.toFixed(2)} - Protected Hi-Weights)`);
         }
      }
    });
    
    // Safety Fallback securing stray components missing strict roles (Extremely rare isolated overrides)
    mappedSlots.forEach(slot => {
       if (!slot.assignedElementId) {
          const p = availablePhotos.shift();
          if (p) {
             slot.assignedElementId = p.elementId;
             slot.assignmentReason = 'Fallback absoluto (Slot residual o rol perdido)';
          }
       }
    });

  } else {
    // Geometric simply aligns z-index input cleanly into sequential placement geometries avoiding scoring entirely
    mappedSlots.forEach((slot, i) => {
      if (photos[i]) {
         slot.assignedElementId = photos[i].elementId;
         slot.assignmentReason = 'Bypass técnico geométrico ciego';
      }
    });
  }

  return mappedSlots;
}
