"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";

interface NodeContentProps {
  content: unknown;
}

export function NodeContent({ content }: NodeContentProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class:
            "text-emerald-800 underline underline-offset-2 cursor-pointer break-all",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    ],
    content: (content as object) ?? { type: "doc", content: [] },
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-stone max-w-none [&_p]:my-2 [&_p]:leading-relaxed [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:font-serif [&_h3]:text-lg [&_h3]:mt-4 [&_h3]:mb-1.5 [&_blockquote]:border-l-2 [&_blockquote]:border-stone-700 [&_blockquote]:pl-4 [&_blockquote]:text-stone-700 [&_blockquote]:italic [&_code]:bg-stone-200 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.9em] [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
      },
      // Intercepta o click ANTES do ProseMirror — em editable:false ele
      // costuma engolir o evento. Se o click foi num <a>, abrimos a URL
      // manualmente em nova aba e devolvemos true pra travar a propagação
      // padrão do ProseMirror.
      handleDOMEvents: {
        click: (_view, event) => {
          const target = event.target as HTMLElement;
          const anchor = target.closest("a");
          if (!anchor) return false;
          const href = anchor.getAttribute("href");
          if (!href) return false;
          event.preventDefault();
          window.open(href, "_blank", "noopener,noreferrer");
          return true;
        },
      },
    },
  });

  // Re-render quando o conteúdo trocar (ex.: trocar de nó selecionado)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(content)) {
      editor.commands.setContent(
        (content as object) ?? { type: "doc", content: [] },
        { emitUpdate: false },
      );
    }
  }, [content, editor]);

  if (!editor) {
    return <div className="min-h-[100px] animate-pulse bg-stone-100" />;
  }

  return <EditorContent editor={editor} />;
}
