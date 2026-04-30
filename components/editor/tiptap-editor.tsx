"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Code,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TipTapEditorProps {
  initialContent: unknown;
  onChange: (json: unknown) => void;
}

const toolbarBtn =
  "size-8 inline-flex items-center justify-center text-stone-700 hover:bg-stone-200 transition-colors";
const toolbarBtnActive = "bg-stone-900 text-stone-50 hover:bg-stone-900";

export function TipTapEditor({ initialContent, onChange }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-emerald-800 underline underline-offset-2",
        },
      }),
    ],
    content: (initialContent as object) ?? { type: "doc", content: [] },
    editorProps: {
      attributes: {
        class:
          "prose prose-stone max-w-none min-h-[160px] p-4 focus:outline-none [&_p]:my-2 [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:font-serif [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:font-serif [&_blockquote]:border-l-2 [&_blockquote]:border-stone-700 [&_blockquote]:pl-4 [&_blockquote]:text-stone-700 [&_code]:bg-stone-200 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.9em]",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    immediatelyRender: false,
  });

  // Sincroniza conteúdo externo (ao trocar o nó selecionado)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(initialContent)) {
      editor.commands.setContent(
        (initialContent as object) ?? { type: "doc", content: [] },
        { emitUpdate: false },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent, editor]);

  if (!editor) {
    return (
      <div className="border-2 border-stone-300 min-h-[200px] animate-pulse bg-stone-100" />
    );
  }

  return (
    <div className="border-2 border-stone-300 bg-white">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-stone-200 bg-stone-50">
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Título"
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Subtítulo"
        >
          <Heading3 className="size-4" />
        </ToolbarButton>
        <Separator />
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrito (Ctrl+B)"
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Itálico (Ctrl+I)"
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Código inline"
        >
          <Code className="size-4" />
        </ToolbarButton>
        <Separator />
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista"
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Lista numerada"
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Citação"
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <Separator />
        <ToolbarButton
          active={editor.isActive("link")}
          onClick={() => {
            const previousUrl = editor.getAttributes("link").href;
            const url = window.prompt(
              "URL do link:",
              previousUrl ?? "https://",
            );
            if (url === null) return;
            if (url === "") {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              return;
            }
            editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href: url })
              .run();
          }}
          title="Link"
        >
          <LinkIcon className="size-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(toolbarBtn, active && toolbarBtnActive)}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <span className="w-px h-5 bg-stone-300 mx-0.5" />;
}
