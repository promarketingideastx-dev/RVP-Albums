import React, { useMemo } from 'react';
import { TYPOGRAPHY_PRESETS } from '@/lib/typography-presets';
import { useEditorStore } from '@/store/useEditorStore';

export default function TypographyPresetSelector() {
  const project = useEditorStore(state => state.project);
  const activePresetId = project?.typographyPresetId;

  // We need the action to apply to all spreads.
  // Assuming the action doesn't exist yet, we'll map the store update here or in the store natively.
  const applyTypographyPreset = useEditorStore(state => state.applyTypographyPreset);

  // Auto-inject Google Fonts dynamically so previews actually render
  const fontLinks = useMemo(() => {
    const fontsSet = new Set<string>();
    TYPOGRAPHY_PRESETS.forEach(p => {
      fontsSet.add(p.fonts.h1);
      fontsSet.add(p.fonts.h2);
      fontsSet.add(p.fonts.body);
      fontsSet.add(p.fonts.small);
    });
    return Array.from(fontsSet).map(font => 
      `@import url('https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}&display=swap');`
    ).join('\n');
  }, []);

  if (!project) return null;

  return (
    <div className="mb-4">
      <style dangerouslySetInnerHTML={{ __html: fontLinks }} />
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-800 dark:text-neutral-200 mb-3 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        Typography Styles
      </h3>
      
      <div className="grid grid-cols-2 gap-3 mb-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
        {TYPOGRAPHY_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => {
                if (applyTypographyPreset) {
                  useEditorStore.temporal?.getState().pause();
                  applyTypographyPreset(preset.id);
                  useEditorStore.temporal?.getState().resume();
                }
              }}
              className={`flex flex-col text-left p-3 rounded-lg border transition-all duration-200 hover:scale-[1.02] ${
                isActive 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm ring-1 ring-blue-500' 
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900 shadow-sm'
              }`}
            >
              <div 
                className="text-lg leading-tight mb-1 truncate w-full" 
                style={{ 
                  fontFamily: `"${preset.fonts.h1}", serif`, 
                  color: preset.styles?.h1?.color || '#000',
                  letterSpacing: `${preset.styles?.h1.letterSpacing || 0}px`,
                  textTransform: preset.styles?.h1.textTransform || 'none'
                }}
              >
                Maria & José
              </div>
              <div 
                className="text-[9px] font-semibold tracking-wider mb-2" 
                style={{ 
                  fontFamily: `"${preset.fonts.h2}", serif`, 
                  color: preset.styles?.h2?.color || '#000',
                  letterSpacing: `${preset.styles?.h2.letterSpacing || 0}px`,
                  textTransform: preset.styles?.h2.textTransform || 'none'
                }}
              >
                12 Agosto 2026
              </div>
              
              <div className="flex justify-between items-end mt-auto w-full border-t border-neutral-100 dark:border-neutral-800 pt-2">
                <span className="text-[9px] text-neutral-400 uppercase tracking-widest">{preset.category}</span>
                <div className="flex gap-1 ml-auto">
                  <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: preset.styles?.h1?.color || '#000' }}></span>
                  <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: preset.styles?.h2?.color || '#000' }}></span>
                  <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: preset.styles?.body?.color || '#000' }}></span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
