'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import type * as Y from 'yjs';
import type { WebsocketProvider } from 'y-websocket';
import { Toolbar } from './Toolbar';

interface EditorProps {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  user: { name: string; color: string };
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
export function CollaborativeEditor({ ydoc, provider, user }: EditorProps) {
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
      },
    },
    // Re-create the editor if the underlying doc/provider identity changes.
    [ydoc, provider]
  );

  if (!editor) {
    return <div className="h-64 animate-pulse rounded-2xl bg-white/30" />;
  }

  return (
    <div>
      <Toolbar editor={editor} />
      <div className="glass-strong mx-auto max-w-3xl rounded-3xl px-7 py-9 sm:px-12 sm:py-12">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
