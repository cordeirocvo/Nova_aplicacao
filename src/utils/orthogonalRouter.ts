export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Verifica se um segmento de reta entre p1 e p2 intercepta a caixa de um obstáculo.
 */
export function isLineIntersectingBox(p1: Point, p2: Point, box: Box): boolean {
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);

  return (
    minX <= box.x + box.width &&
    maxX >= box.x &&
    minY <= box.y + box.height &&
    maxY >= box.y
  );
}

/**
 * Gera um caminho vetorial SVG ortogonal (ângulo reto 90º) conectando start a end,
 * com desvio ortogonal automático caso cruze caixas de obstáculos registradas.
 */
export function generateOrthogonalPath(
  start: Point,
  end: Point,
  obstacles: Box[] = []
): string {
  const midY = start.y + (end.y - start.y) / 2;
  let points: Point[] = [
    start,
    { x: start.x, y: midY },
    { x: end.x, y: midY },
    end
  ];

  for (const box of obstacles) {
    if (isLineIntersectingBox(start, { x: start.x, y: midY }, box)) {
      const offset = 35;
      const escapeX = start.x < box.x + box.width / 2 ? box.x - offset : box.x + box.width + offset;
      points = [
        start,
        { x: escapeX, y: start.y + 15 },
        { x: escapeX, y: midY },
        { x: end.x, y: midY },
        end
      ];
      break;
    }
  }

  return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}
