'use client';

import { useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import type * as Y from 'yjs';
import type { WebsocketProvider } from 'y-websocket';
import { Toolbar } from './Toolbar';
import { EditorFooter } from './EditorFooter';
import { SelectionBubbleMenu } from './SelectionBubbleMenu';
import { uploadImage } from '@/lib/editor/uploadImage';

interface EditorProps {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  user: { name: string; color: string };
  documentId: string;
  title: string;
  focusMode: boolean;
  onToggleFocus: () => void;
}

/**
 * The collaborative rich-text editor.
 *
 * TipTap is wired to the shared Y.Doc via the Collaboration extension, so every
 * keystroke is a CRDT operation that merges automatically — no operational
 * transform, no lock, no last-write-wins data loss. CollaborationCursor shares
 * each person's caret + selection through the same awareness channel that
 * powers presence.
 *
 * Note: StarterKit's own history is disabled because Collaboration supplies a
 * Yjs-aware undo manager that respects concurrent edits.
 */
export function CollaborativeEditor({
  ydoc,
  provider,
  user,
  documentId,
  title,
  focusMode,
  onToggleFocus,
}: EditorProps) {
  // Holds the editor so the paste/drop handlers (defined inside the editor
  // config, before `editor` exists) can reach it once it is created.
  const editorRef = useRef<Editor | null>(null);

  // Uploads the first image found in a paste/drop and inserts it at the cursor.
  // Returns true to tell ProseMirror we handled the event.
  function handleImageFiles(files: FileList | null | undefined): boolean {
    const file = files && Array.from(files).find((f) => f.type.startsWith('image/'));
    const editor = editorRef.current;
    if (!file || !editor) return false;
    uploadImage(file, documentId)
      .then((url) => editor.chain().focus().setImage({ src: url }).run())
      .catch((err) => console.error('[image upload]', err.message));
    return true;
  }

  const editor = useEditor(
    {
      // Required for SSR frameworks: render only after mount to avoid hydration
      // mismatches between server and client.
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ history: false }),
        Placeholder.configure({
          placeholder: 'Start writing… everyone in this document sees your changes live.',
        }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
        }),
        Image.configure({ HTMLAttributes: { class: 'editor-image' } }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Collaboration.configure({ document: ydoc }),
        CollaborationCursor.configure({
          provider,
          user: { name: user.name, color: user.color },
        }),
      ],
      editorProps: {
        attributes: {
          class: 'prose-editor focus:outline-none',
        },
        handlePaste: (_view, event) => handleImageFiles(event.clipboardData?.files),
        handleDrop: (_view, event) => handleImageFiles((event as DragEvent).dataTransfer?.files),
      },
    },
    // Re-create the editor if the underlying doc/provider identity changes.
    [ydoc, provider]
  );

  editorRef.current = editor;

  if (!editor) {
    return <div className="h-64 animate-pulse rounded-2xl bg-white/30" />;
  }

  return (
    <div>
      <SelectionBubbleMenu editor={editor} />

      {!focusMode && (
        <Toolbar
          editor={editor}
          documentId={documentId}
          title={title}
          focusMode={focusMode}
          onToggleFocus={onToggleFocus}
        />
      )}

      <div
        className={`glass-strong mx-auto rounded-3xl px-7 py-9 transition-all duration-500 sm:px-12 sm:py-12 ${
          focusMode ? 'max-w-2xl' : 'max-w-3xl'
        }`}
      >
        <EditorContent editor={editor} />
      </div>

      {!focusMode && <EditorFooter editor={editor} />}

      {focusMode && (
        <button
          onClick={onToggleFocus}
          className="glass-strong fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full text-lg text-slate-600 shadow-glass-lg transition hover:scale-105"
          title="Exit focus mode"
        >
          🗗
        </button>
      )}
    </div>
  );
}
