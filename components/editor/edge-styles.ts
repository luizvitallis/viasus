import type { EdgeStyle } from "@/types/domain";

/**
 * Mapeia o `edge_style` do banco para props visuais aceitas
 * pelo edge default do @xyflow/react.
 */
export function getEdgeStyleProps(style: EdgeStyle) {
  switch (style) {
    case "urgente":
      return {
        style: { stroke: "#b91c1c", strokeWidth: 2.5 },
        labelStyle: { fill: "#b91c1c", fontWeight: 600 },
        labelBgStyle: { fill: "#fef2f2" },
      };
    case "condicional":
      return {
        style: {
          stroke: "#57534e",
          strokeWidth: 1.5,
          strokeDasharray: "6 4",
        },
        labelStyle: { fill: "#44403c", fontStyle: "italic" as const },
        labelBgStyle: { fill: "#fafaf7" },
      };
    case "normal":
    default:
      return {
        style: { stroke: "#1c1917", strokeWidth: 1.5 },
        labelStyle: { fill: "#1c1917" },
        labelBgStyle: { fill: "#fafaf7" },
      };
  }
}
