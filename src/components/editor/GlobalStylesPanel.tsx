import React from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { useTranslations } from 'next-intl';

export default function GlobalStylesPanel() {
  const project = useEditorStore((state) => state.project);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  
  const updateGlobalImageStyles = useEditorStore((state) => state.updateGlobalImageStyles);
  const updateSpreadBackground = useEditorStore((state) => state.updateSpreadBackground);
  const resetGlobalImageStyles = useEditorStore((state) => state.resetGlobalImageStyles);
  const resetSpreadBackground = useEditorStore((state) => state.resetSpreadBackground);
  
  const t = useTranslations('Editor');

  if (!project || !activeSpreadId) return null;

  const spread = project.spreads.find((s) => s.id === activeSpreadId);
  if (!spread) return null;

  const globalStyles = project.globalImageStyles || {};
  const bgConfig = spread.bg_config || { type: 'none' };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 overflow-y-auto fundy-scroll">
      
      {/* BACKGROUND SETTINGS */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 tracking-wider uppercase">
            {t('page_background') || 'Page Background'}
          </h3>
          {bgConfig.type !== 'none' && (
             <button onClick={() => resetSpreadBackground(activeSpreadId)} className="text-xs text-red-500 hover:underline">
               Reset
             </button>
          )}
        </div>

        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-md mb-4 text-xs font-medium">
          <button 
            className={`flex-1 py-1.5 rounded text-center ${bgConfig.type === 'none' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
            onClick={() => updateSpreadBackground(activeSpreadId, { type: 'none' })}
          >
            None
          </button>
          <button 
            className={`flex-1 py-1.5 rounded text-center ${bgConfig.type === 'solid' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
            onClick={() => updateSpreadBackground(activeSpreadId, { type: 'solid', color1: bgConfig.color1 || '#ffffff' })}
          >
            Solid
          </button>
          <button 
            className={`flex-1 py-1.5 rounded text-center ${bgConfig.type === 'linear' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
            onClick={() => updateSpreadBackground(activeSpreadId, { type: 'linear', color1: bgConfig.color1 || '#ffffff', color2: bgConfig.color2 || '#e5e5e5' })}
          >
            Linear
          </button>
          <button 
            className={`flex-1 py-1.5 rounded text-center ${bgConfig.type === 'radial' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
            onClick={() => updateSpreadBackground(activeSpreadId, { type: 'radial', color1: bgConfig.color1 || '#ffffff', color2: bgConfig.color2 || '#e5e5e5' })}
          >
            Radial
          </button>
        </div>

        {bgConfig.type !== 'none' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-neutral-500 dark:text-neutral-400 w-16">Color 1</label>
              <input 
                type="color" 
                value={bgConfig.color1 || '#ffffff'}
                onChange={(e) => updateSpreadBackground(activeSpreadId, { color1: e.target.value })}
                className="w-full h-8 rounded border border-neutral-200 dark:border-neutral-700 cursor-pointer"
              />
            </div>
            
            {(bgConfig.type === 'linear' || bgConfig.type === 'radial') && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-neutral-500 dark:text-neutral-400 w-16">Color 2</label>
                <input 
                  type="color" 
                  value={bgConfig.color2 || '#e5e5e5'}
                  onChange={(e) => updateSpreadBackground(activeSpreadId, { color2: e.target.value })}
                  className="w-full h-8 rounded border border-neutral-200 dark:border-neutral-700 cursor-pointer"
                />
              </div>
            )}

            {bgConfig.type === 'linear' && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400">
                  <label>Angle</label>
                  <span>{bgConfig.gradientAngle || 0}°</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={bgConfig.gradientAngle || 0}
                    onChange={(e) => updateSpreadBackground(activeSpreadId, { gradientAngle: parseInt(e.target.value, 10) })}
                    className="w-full accent-teal-500"
                  />
                  <input 
                    type="number" 
                    className="w-12 bg-neutral-100 dark:bg-neutral-800 text-xs px-1 rounded border-none text-center outline-none" 
                    value={bgConfig.gradientAngle || 0}
                    onChange={(e) => updateSpreadBackground(activeSpreadId, { gradientAngle: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
              </div>
            )}

            {bgConfig.type === 'radial' && (
              <>
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400">
                    <label>Size</label>
                    <span>{bgConfig.radialSize || 50}%</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min="10"
                      max="150"
                      value={bgConfig.radialSize || 50}
                      onChange={(e) => updateSpreadBackground(activeSpreadId, { radialSize: parseInt(e.target.value, 10) })}
                      className="w-full accent-teal-500"
                    />
                    <input 
                      type="number" 
                      className="w-12 bg-neutral-100 dark:bg-neutral-800 text-xs px-1 rounded border-none text-center outline-none" 
                      value={bgConfig.radialSize || 50}
                      onChange={(e) => updateSpreadBackground(activeSpreadId, { radialSize: parseInt(e.target.value, 10) || 50 })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400">
                    <label>Center X</label>
                    <span>{bgConfig.radialCenterX ?? 50}%</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={bgConfig.radialCenterX ?? 50}
                      onChange={(e) => updateSpreadBackground(activeSpreadId, { radialCenterX: parseInt(e.target.value, 10) })}
                      className="w-full accent-teal-500"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400">
                    <label>Center Y</label>
                    <span>{bgConfig.radialCenterY ?? 50}%</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={bgConfig.radialCenterY ?? 50}
                      onChange={(e) => updateSpreadBackground(activeSpreadId, { radialCenterY: parseInt(e.target.value, 10) })}
                      className="w-full accent-teal-500"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* GLOBAL IMAGE STYLES */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 tracking-wider uppercase">
            {t('global_image_styles') || 'Global Image Styles'}
          </h3>
          {(globalStyles.strokeEnabled || globalStyles.shadowEnabled || globalStyles.borderRadiusEnabled) && (
             <button onClick={resetGlobalImageStyles} className="text-xs text-red-500 hover:underline">
               Reset All
             </button>
          )}
        </div>

        {/* BORDER RADIUS GLOBAL */}
        <div className="mb-6 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={globalStyles.borderRadiusEnabled || false}
              onChange={(e) => updateGlobalImageStyles({ borderRadiusEnabled: e.target.checked })}
              className="accent-teal-500"
            />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Enable Corner Radius</span>
          </label>
          {globalStyles.borderRadiusEnabled && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  <label>Radius (mm)</label>
                  <span>{globalStyles.borderRadius || 0}</span>
                </div>
                <div className="flex gap-2">
                  <input type="range" min="0" max="50" step="1" className="w-full accent-teal-500" value={globalStyles.borderRadius || 0} onChange={(e) => updateGlobalImageStyles({ borderRadius: parseFloat(e.target.value) })}/>
                  <input type="number" className="w-12 bg-neutral-100 dark:bg-neutral-800 text-xs px-1 rounded border-none text-center outline-none" value={globalStyles.borderRadius || 0} onChange={(e) => updateGlobalImageStyles({ borderRadius: parseFloat(e.target.value) || 0 })}/>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STROKE GLOBAL */}
        <div className="mb-6 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={globalStyles.strokeEnabled || false}
              onChange={(e) => updateGlobalImageStyles({ strokeEnabled: e.target.checked, strokeWidth: globalStyles.strokeWidth || 1, strokeColor: globalStyles.strokeColor || '#ffffff' })}
              className="accent-teal-500"
            />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Enable Global Border</span>
          </label>
          {globalStyles.strokeEnabled && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">Color</label>
                <input 
                  type="color" 
                  value={globalStyles.strokeColor || '#ffffff'}
                  onChange={(e) => updateGlobalImageStyles({ strokeColor: e.target.value })}
                  className="w-full h-8 rounded border border-neutral-200 dark:border-neutral-700 cursor-pointer block"
                />
              </div>
              <div>
                <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  <label>Width (mm)</label>
                  <span>{globalStyles.strokeWidth || 0}</span>
                </div>
                <div className="flex gap-2">
                  <input type="range" min="0" max="25" step="0.5" className="w-full accent-teal-500" value={globalStyles.strokeWidth || 0} onChange={(e) => updateGlobalImageStyles({ strokeWidth: parseFloat(e.target.value) })}/>
                  <input type="number" className="w-12 bg-neutral-100 dark:bg-neutral-800 text-xs px-1 rounded border-none text-center outline-none" value={globalStyles.strokeWidth || 0} onChange={(e) => updateGlobalImageStyles({ strokeWidth: parseFloat(e.target.value) || 0 })}/>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SHADOW GLOBAL */}
        <div className="mb-6 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={globalStyles.shadowEnabled || false}
              onChange={(e) => updateGlobalImageStyles({ shadowEnabled: e.target.checked, shadowBlur: globalStyles.shadowBlur || 15, shadowOpacity: globalStyles.shadowOpacity || 0.5, shadowColor: globalStyles.shadowColor || '#000000', shadowOffsetX: globalStyles.shadowOffsetX || 0, shadowOffsetY: globalStyles.shadowOffsetY || 10 })}
              className="accent-teal-500"
            />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Enable Global Shadow</span>
          </label>
          {globalStyles.shadowEnabled && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">Color</label>
                <input 
                  type="color" 
                  value={globalStyles.shadowColor || '#000000'}
                  onChange={(e) => updateGlobalImageStyles({ shadowColor: e.target.value })}
                  className="w-full h-8 rounded border border-neutral-200 dark:border-neutral-700 cursor-pointer block"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  <label>Opacity</label>
                  <span>{Math.round((globalStyles.shadowOpacity || 0.5) * 100)}%</span>
                </div>
                <div className="flex gap-2">
                  <input type="range" min="0" max="1" step="0.1" className="w-full accent-teal-500" value={globalStyles.shadowOpacity ?? 0.5} onChange={(e) => updateGlobalImageStyles({ shadowOpacity: parseFloat(e.target.value) })}/>
                  <input type="number" step="0.1" className="w-12 bg-neutral-100 dark:bg-neutral-800 text-xs px-1 rounded border-none text-center outline-none" value={globalStyles.shadowOpacity ?? 0.5} onChange={(e) => updateGlobalImageStyles({ shadowOpacity: parseFloat(e.target.value) || 0 })}/>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  <label>Blur</label>
                  <span>{globalStyles.shadowBlur || 0}</span>
                </div>
                <div className="flex gap-2">
                  <input type="range" min="0" max="100" step="1" className="w-full accent-teal-500" value={globalStyles.shadowBlur || 0} onChange={(e) => updateGlobalImageStyles({ shadowBlur: parseInt(e.target.value, 10) })}/>
                  <input type="number" className="w-12 bg-neutral-100 dark:bg-neutral-800 text-xs px-1 rounded border-none text-center outline-none" value={globalStyles.shadowBlur || 0} onChange={(e) => updateGlobalImageStyles({ shadowBlur: parseInt(e.target.value, 10) || 0 })}/>
                </div>
              </div>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
