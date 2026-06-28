'use client';

import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { exportToMarkdown } from '@/lib/editor/exportMarkdown';
import { uploadImage } from '@/lib/editor/uploadImage';

interface ToolbarProps {
  editor: Editor;
  documentId: string;
  title: string;
  focusMode: boolean;
  onToggleFocus: () => void;
}

/**
 * Formatting toolbar for the editor. Buttons reflect the current selection's
 * active marks/nodes and include Yjs-powered undo/redo (the collaborative undo
 * stack, so you only ever undo *your own* changes — not your collaborators').
 */
export function Toolbar({ editor, documentId, title, focusMode, onToggleFocus }: ToolbarProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, documentId);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      console.error('[image upload]', (err as Error).message);
    } finally {
      setUploading(false);
    }
  }

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

  // Toggle a link on the current selection. Clicking with a link active removes
  // it; otherwise we ask for a URL and apply it.
  function setLink() {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', previous || 'https://');
    if (url === null) return; // cancelled
    if (url.trim() === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }

  return (
    <div className="sticky top-[4.75rem] z-20 mx-auto mb-5 flex max-w-3xl flex-wrap items-center gap-1 rounded-2xl border border-white/10 bg-slate-900/85 px-2 py-1.5 shadow-xl backdrop-blur-xl">
      <Group>
        <Btn label="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <UndoIcon />
        </Btn>
        <Btn label="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <RedoIcon />
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
        <Btn label="Link" active={editor.isActive('link')} onClick={setLink}>
          🔗
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
        <Btn label="Checklist" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}>
          ☑
        </Btn>
        <Btn label="Insert image" disabled={uploading} onClick={() => fileInput.current?.click()}>
          {uploading ? '…' : '🖼'}
        </Btn>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={onPickImage} />
      </Group>

      {/* Right-aligned utilities: export + distraction-free focus mode. */}
      <div className="ml-auto flex items-center gap-0.5">
        <Btn label="Export as Markdown" onClick={() => exportToMarkdown(editor.getHTML(), title)}>
          ⇩
        </Btn>
        <Btn label={focusMode ? 'Exit focus mode' : 'Focus mode'} active={focusMode} onClick={onToggleFocus}>
          {focusMode ? '🗗' : '⛶'}
        </Btn>
      </div>
    </div>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-white/15" />;
}

/** Horizontal "undo" curved arrow (points left). */
function UndoIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H9" />
    </svg>
  );
}

/** Horizontal "redo" curved arrow (points right). */
function RedoIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H15" />
    </svg>
  );
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
        disabled:cursor-not-allowed disabled:opacity-25
        ${active ? 'bg-indigo-500 text-white shadow' : 'text-slate-200 hover:bg-white/15 hover:text-white'}`}
    >
      {children}
    </button>
  );
}
