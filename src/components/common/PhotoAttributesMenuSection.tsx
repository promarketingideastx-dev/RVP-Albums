"use client";

import React from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { AttributeCopyMode } from '@/types/editor';

interface Props {
  isEs?: boolean;
  /** Source to copy from (single photo). */
  source?: { assetId?: string; elementId?: string };
  /** Targets to paste onto (one or many photos). */
  target?: { assetIds?: string[]; elementId?: string };
  onDone: () => void;
}

const OPTIONS: { mode: AttributeCopyMode; es: string; en: string; icon: string }[] = [
  { mode: 'all', es: 'Todo (ajustes + recorte)', en: 'All (adjustments + crop)', icon: '◆' },
  { mode: 'adjustments', es: 'Solo ajustes (sin recorte)', en: 'Adjustments only (no crop)', icon: '◐' },
  { mode: 'crop', es: 'Solo recorte / rotación', en: 'Crop / rotation only', icon: '⌗' },
];

export const PhotoAttributesMenuSection: React.FC<Props> = ({ isEs = true, source, target, onDone }) => {
  const copied = useEditorStore((s) => s.copiedPhotoAttributes);
  const copyPhotoAttributes = useEditorStore((s) => s.copyPhotoAttributes);
  const pastePhotoAttributes = useEditorStore((s) => s.pastePhotoAttributes);

  const isSameAsSource =
    copied?.sourceAssetId &&
    target?.assetIds?.length === 1 &&
    target.assetIds[0] === copied.sourceAssetId;

  const itemCls =
    'w-full text-left px-3.5 py-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors flex items-center gap-2.5 disabled:opacity-40 disabled:pointer-events-none';
  const headerCls =
    'px-3.5 pt-1.5 pb-1 text-[10px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500';

  return (
    <div className="py-0.5">
      {source && (
        <>
          <div className={headerCls}>{isEs ? 'Copiar propiedades' : 'Copy properties'}</div>
          {OPTIONS.map((o) => (
            <button
              key={`c-${o.mode}`}
              type="button"
              className={itemCls}
              onClick={() => {
                copyPhotoAttributes(source, o.mode);
                onDone();
              }}
            >
              <span className="w-3.5 text-center text-amber-500">{o.icon}</span>
              <span>{isEs ? o.es : o.en}</span>
            </button>
          ))}
        </>
      )}

      {target && (
        <>
          <div className={`${headerCls} flex items-center justify-between gap-2`}>
            <span>{isEs ? 'Pegar propiedades' : 'Paste properties'}</span>
            {copied && (
              <span className="normal-case tracking-normal font-normal truncate max-w-[110px]" title={copied.sourceName}>
                {isEs ? 'de' : 'from'} {copied.sourceName}
              </span>
            )}
          </div>
          {!copied ? (
            <div className="px-3.5 py-1.5 text-[11px] italic text-neutral-400">
              {isEs ? 'Nada copiado todavía' : 'Nothing copied yet'}
            </div>
          ) : (
            OPTIONS.map((o) => {
              // Only allow pasting what was actually copied (e.g. crop-only copy cannot paste adjustments)
              const allowed = copied.mode === 'all' || copied.mode === o.mode;
              return (
                <button
                  key={`p-${o.mode}`}
                  type="button"
                  disabled={!allowed || Boolean(isSameAsSource)}
                  className={itemCls}
                  onClick={() => {
                    pastePhotoAttributes(target, o.mode);
                    onDone();
                  }}
                >
                  <span className="w-3.5 text-center text-emerald-500">{o.icon}</span>
                  <span>{isEs ? o.es : o.en}</span>
                </button>
              );
            })
          )}
        </>
      )}
    </div>
  );
};
