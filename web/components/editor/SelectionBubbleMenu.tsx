'use client';

import { BubbleMenu, type Editor } from '@tiptap/react';

/**
 * A small floating toolbar that appears right above the current text
 * selection — the quick, Medium/Notion-style way to format without reaching
 * for the top toolbar. Only shows for non-empty text selections.
 */
export function SelectionBubbleMenu({ editor }: { editor: Editor }) {
  function setLink() {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt('Link URL', 'https://');
    if (!url) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 150 }}
      shouldShow={({ editor: e, from, to }) => from !== to && !e.isActive('image')}
      className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-slate-900/90 px-1 py-1 shadow-xl backdrop-blur-xl"
    >
      <Mark label="B" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} className="font-bold" />
      <Mark label="i" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} className="italic" />
      <Mark label="S" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} className="line-through" />
      <Mark label="</>" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} />
      <span className="mx-0.5 h-5 w-px bg-white/15" />
      <Mark label="🔗" active={editor.isActive('link')} onClick={setLink} />
    </BubbleMenu>
  );
}

function Mark({
  label,
  active,
  onClick,
  className = '',
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-sm transition
        ${active ? 'bg-indigo-500 text-white' : 'text-slate-200 hover:bg-white/15 hover:text-white'} ${className}`}
    >
      {label}
    </button>
  );
}
