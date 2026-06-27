'use client';

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

/**
 * Formatting toolbar for the editor. Buttons reflect the current selection's
 * active marks/nodes and include Yjs-powered undo/redo (the collaborative undo
 * stack, so you only ever undo *your own* changes — not your collaborators').
 */
export function Toolbar({ editor }: { editor: Editor }) {
  // Re-render the toolbar whenever the selection or document changes so the
  // active states stay accurate.
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    editor.on('selectionUpdate', rerender);
    editor.on('transaction', rerender);
    return () => {
      editor.off('selectionUpdate', rerender);
      editor.off('transaction', rerender);
    };
  }, [editor]);

  return (
    <div className="glass sticky top-[4.75rem] z-20 mx-auto mb-5 flex max-w-3xl flex-wrap items-center gap-1 rounded-2xl px-2 py-1.5">
      <Group>
        <Btn label="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          ↶
        </Btn>
        <Btn label="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          ↷
        </Btn>
      </Group>

      <Divider />

      <Group>
        <Btn label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <span className="font-bold">B</span>
        </Btn>
        <Btn label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <span className="italic">i</span>
        </Btn>
        <Btn label="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <span className="line-through">S</span>
        </Btn>
        <Btn label="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
          {'</>'}
        </Btn>
      </Group>

      <Divider />

      <Group>
        <Btn label="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          H1
        </Btn>
        <Btn label="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </Btn>
      </Group>

      <Divider />

      <Group>
        <Btn label="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          •
        </Btn>
        <Btn label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          1.
        </Btn>
        <Btn label="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          ❝
        </Btn>
        <Btn label="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          {'{ }'}
        </Btn>
      </Group>
    </div>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-slate-300/60" />;
}

interface BtnProps {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

function Btn({ children, label, onClick, active = false, disabled = false }: BtnProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm transition
        disabled:cursor-not-allowed disabled:opacity-30
        ${active ? 'bg-indigo-500 text-white shadow' : 'text-slate-600 hover:bg-white/60'}`}
    >
      {children}
    </button>
  );
}
