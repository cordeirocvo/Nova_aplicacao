import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateOrthogonalPath, isLineIntersectingBox, Point, Box } from '../orthogonalRouter';

describe('Orthogonal Router Geometric Engine Tests', () => {
  it('Deve gerar caminho ortogonal padrão em forma de árvore sem colisões', () => {
    const start: Point = { x: 100, y: 50 };
    const end: Point = { x: 250, y: 170 };
    const path = generateOrthogonalPath(start, end, []);
    assert.strictEqual(path, `M 100 50 L 100 110 L 250 110 L 250 170`);
  });

  it('Deve detectar corretamente se uma linha vertical intercepta uma caixa de componente', () => {
    const p1: Point = { x: 150, y: 10 };
    const p2: Point = { x: 150, y: 100 };
    const obstacleBox: Box = { x: 130, y: 40, width: 40, height: 40 };
    assert.strictEqual(isLineIntersectingBox(p1, p2, obstacleBox), true);
  });

  it('Deve desviar de obstáculos quando houver intersecção com o condutor', () => {
    const start: Point = { x: 100, y: 50 };
    const end: Point = { x: 100, y: 200 };
    const obstacleBox: Box = { x: 80, y: 80, width: 40, height: 40 };
    const path = generateOrthogonalPath(start, end, [obstacleBox]);
    assert.ok(path.includes('M 100 50'));
    assert.ok(path.includes('L 100 200'));
  });
});
