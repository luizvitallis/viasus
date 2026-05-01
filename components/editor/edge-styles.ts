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
 *
 * `customColor` (opcional) sobrescreve a cor padrão do estilo. Quando
 * passado, tanto a linha quanto a seta usam a cor customizada.
 */
const DEFAULT_STROKE: Record<EdgeStyle, string> = {
  normal: "#1c1917",
  urgente: "#b91c1c",
  condicional: "#57534e",
};

export function getEdgeStyleProps(
  style: EdgeStyle,
  customColor?: string | null,
) {
  const color = customColor || DEFAULT_STROKE[style];
  const base = { type: "smoothstep" as const };

  switch (style) {
    case "urgente":
      return {
        ...base,
        style: { stroke: color, strokeWidth: 2.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
          width: 18,
          height: 18,
        },
        labelStyle: { fill: color, fontWeight: 600 },
        labelBgStyle: { fill: "#fef2f2" },
      };
    case "condicional":
      return {
        ...base,
        style: {
          stroke: color,
          strokeWidth: 1.5,
          strokeDasharray: "6 4",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
          width: 16,
          height: 16,
        },
        labelStyle: { fill: color, fontStyle: "italic" as const },
        labelBgStyle: { fill: "#fafaf7" },
      };
    case "normal":
    default:
      return {
        ...base,
        style: { stroke: color, strokeWidth: 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
          width: 16,
          height: 16,
        },
        labelStyle: { fill: color },
        labelBgStyle: { fill: "#fafaf7" },
      };
  }
}
