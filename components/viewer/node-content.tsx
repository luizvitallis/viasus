"use client";

import { useMemo } from "react";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import type { JSONContent } from "@tiptap/react";

interface NodeContentProps {
  content: unknown;
}

const PROSE_CLASS =
  "prose prose-stone max-w-none [&_p]:my-2 [&_p]:leading-relaxed [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:font-serif [&_h3]:text-lg [&_h3]:mt-4 [&_h3]:mb-1.5 [&_blockquote]:border-l-2 [&_blockquote]:border-stone-700 [&_blockquote]:pl-4 [&_blockquote]:text-stone-700 [&_blockquote]:italic [&_code]:bg-stone-200 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.9em] [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-emerald-800 [&_a]:underline [&_a]:underline-offset-2 [&_a]:break-all";

/**
 * Renderiza conteúdo TipTap como HTML puro (não usa o editor).
 *
 * Por que: em editable:false, o ProseMirror ainda monta e intercepta
 * cliques no DOM, impedindo que links nativos `<a target=_blank>`
 * abram normalmente. generateHTML extrai a HTML estática do JSON do
 * TipTap, deixando os <a> serem clicáveis pelo navegador como qualquer
 * link comum.
 */
export function NodeContent({ content }: NodeContentProps) {
  const html = useMemo(() => {
    const doc = (content as JSONContent | null) ?? {
      type: "doc",
      content: [],
    };
    try {
      return generateHTML(doc, [
        StarterKit.configure({ heading: { levels: [2, 3] } }),
        Link.configure({
          HTMLAttributes: {
            target: "_blank",
            rel: "noopener noreferrer",
          },
        }),
      ]);
    } catch {
      return "";
    }
  }, [content]);

  if (!html) {
    return (
      <p className="text-stone-400 italic">
        Sem conteúdo clínico cadastrado neste nó.
      </p>
    );
  }

  return (
    <div
      className={PROSE_CLASS}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
