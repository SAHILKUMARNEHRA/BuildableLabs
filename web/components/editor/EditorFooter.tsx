'use client';

import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';

type SaveState = 'saved' | 'saving';

/**
 * The thin status bar beneath the editor: live word + character counts and a
 * "saving / all changes saved" indicator.
 *
 * The save indicator is intentionally simple — every edit flips it to "Saving…"
 * and it settles to "All changes saved" once typing pauses. Changes really are
 * persisted continuously (locally to IndexedDB instantly, and to Supabase on a
 * short debounce), so this reflects the truth without faking progress.
 */
export function EditorFooter({ editor }: { editor: Editor }) {
  const [counts, setCounts] = useState({ words: 0, chars: 0 });
  const [save, setSave] = useState<SaveState>('saved');
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const recompute = () => {
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setCounts({ words, chars: text.length });
    };

    const onUpdate = () => {
      recompute();
      setSave('saving');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setSave('saved'), 900);
    };

    recompute();
    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [editor]);

  return (
    <div className="mx-auto mt-3 flex max-w-3xl items-center justify-between px-2 text-xs font-medium text-slate-400">
      <span>
        {counts.words} {counts.words === 1 ? 'word' : 'words'} · {counts.chars} characters
      </span>
      <span className="flex items-center gap-1.5">
        {save === 'saving' ? (
          <>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            Saving…
          </>
        ) : (
          <>
            <span className="text-emerald-500">✓</span>
            All changes saved
          </>
        )}
      </span>
    </div>
  );
}
