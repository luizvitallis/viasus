import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";

const NODE_W = 240;
const NODE_H = 100;

/**
 * Aplica layout top-down com Dagre.
 * Retorna nós com `position` ajustada; arestas inalteradas.
 */
export function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: 80, nodesep: 60 });

  for (const n of nodes) {
    // decisão tem altura maior por causa do losango
    const height = n.type === "decisao" ? 200 : NODE_H;
    const width = n.type === "decisao" ? 200 : NODE_W;
    g.setNode(n.id, { width, height });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const placed = g.node(n.id);
    if (!placed) return n;
    return {
      ...n,
      position: {
        x: placed.x - placed.width / 2,
        y: placed.y - placed.height / 2,
      },
    };
  });
}
