import { MarkerType } from "@xyflow/react";
import type { EdgeStyle } from "@/types/domain";

/**
 * Mapeia o `edge_style` do banco para props visuais aceitas
 * pelo edge default do @xyflow/react.
 *
 * `type: 'smoothstep'` produz linhas ortogonais (90°) com cantos com
 * leve arredondamento — visualmente parecido com fluxograma clínico
 * tradicional (vs. a curva bézier do tipo default).
 *
 * `markerEnd` adiciona seta no destino, herdando a cor do stroke.
 */
export function getEdgeStyleProps(style: EdgeStyle) {
  const base = {
    type: "smoothstep" as const,
  };

  switch (style) {
    case "urgente":
      return {
        ...base,
        style: { stroke: "#b91c1c", strokeWidth: 2.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#b91c1c",
          width: 18,
          height: 18,
        },
        labelStyle: { fill: "#b91c1c", fontWeight: 600 },
        labelBgStyle: { fill: "#fef2f2" },
      };
    case "condicional":
      return {
        ...base,
        style: {
          stroke: "#57534e",
          strokeWidth: 1.5,
          strokeDasharray: "6 4",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#57534e",
          width: 16,
          height: 16,
        },
        labelStyle: { fill: "#44403c", fontStyle: "italic" as const },
        labelBgStyle: { fill: "#fafaf7" },
      };
    case "normal":
    default:
      return {
        ...base,
        style: { stroke: "#1c1917", strokeWidth: 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#1c1917",
          width: 16,
          height: 16,
        },
        labelStyle: { fill: "#1c1917" },
        labelBgStyle: { fill: "#fafaf7" },
      };
  }
}
