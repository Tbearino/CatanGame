// ============================================================
//  src/game/board.js
//  Board generation, hex math, vertex/edge computation.
//  No visuals — just math.
// ============================================================

import { HEX_SIZE, TERRAIN_POOL, NUMBER_POOL, ROW_COUNTS, DEV_DECK } from "./constants";

// Fisher–Yates shuffle (unbiased)
export function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Corner points of a pointy-top hexagon
export function hexCorners(cx, cy, size = HEX_SIZE) {
  const c = [];
  for (let k = 0; k < 6; k++) {
    const ang = (Math.PI / 180) * (60 * k - 30);
    c.push([cx + size * Math.cos(ang), cy + size * Math.sin(ang)]);
  }
  return c;
}

// Generate a rules-correct random Catan board
export function generateBoard() {
  const positions = [];
  const hexW = Math.sqrt(3) * HEX_SIZE;
  const rowH = 1.5 * HEX_SIZE;

  ROW_COUNTS.forEach((count, row) => {
    for (let i = 0; i < count; i++)
      positions.push({ x: (i - (count - 1) / 2) * hexW, y: (row - 2) * rowH });
  });

  // find which tiles touch each other
  const touchDist = hexW * 1.05;
  const neighbors = [];
  for (let i = 0; i < positions.length; i++)
    for (let j = i + 1; j < positions.length; j++) {
      const dx = positions[i].x - positions[j].x;
      const dy = positions[i].y - positions[j].y;
      if (Math.sqrt(dx * dx + dy * dy) < touchDist) neighbors.push([i, j]);
    }

  // shuffle until 6s and 8s don't touch (official rule)
  let tiles, attempts = 0;
  do {
    const terrains = shuffle(TERRAIN_POOL);
    const numbers = shuffle(NUMBER_POOL);
    let ni = 0;
    tiles = positions.map((pos, i) => ({
      id: i,
      terrain: terrains[i],
      number: terrains[i] === "desert" ? null : numbers[ni++],
      x: pos.x,
      y: pos.y,
    }));
    attempts++;
  } while (
    !neighbors.every(([a, b]) =>
      !((tiles[a].number === 6 || tiles[a].number === 8) &&
        (tiles[b].number === 6 || tiles[b].number === 8)))
    && attempts < 500
  );

  // vertices = corners where settlements go (shared between touching hexes)
  const vMap = new Map();
  tiles.forEach(tile => {
    hexCorners(tile.x, tile.y).forEach(([x, y]) => {
      const key = `${Math.round(x)},${Math.round(y)}`;
      if (!vMap.has(key)) vMap.set(key, { id: key, x, y, tileIds: [], neighborIds: [] });
      vMap.get(key).tileIds.push(tile.id);
    });
  });
  const vertices = Array.from(vMap.values());

  // edges = hex sides where roads go (vertices one edge-length apart)
  const edges = [];
  for (let i = 0; i < vertices.length; i++)
    for (let j = i + 1; j < vertices.length; j++) {
      const a = vertices[i], b = vertices[j];
      const d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
      if (d > HEX_SIZE * 0.9 && d < HEX_SIZE * 1.1) {
        edges.push({
          id: `${a.id}|${b.id}`,
          a: a.id, b: b.id,
          x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        });
        a.neighborIds.push(b.id);
        b.neighborIds.push(a.id);
      }
    }

  const desertTile = tiles.find(t => t.terrain === "desert");
  return { tiles, vertices, edges, robberStart: desertTile.id };
}

// Create a fresh game state object
export function initGame() {
  const board = generateBoard();
  return {
    board,
    robberTile: board.robberStart,
    hands: [
      { wood:0, brick:0, sheep:0, wheat:0, ore:0 },
      { wood:0, brick:0, sheep:0, wheat:0, ore:0 },
    ],
    settlements: [],
    roads: [],
    devDeck: shuffle(DEV_DECK),
    devHands: [[], []],
    knights: [0, 0],
    lrHolder: null, lrLength: 4,
    laHolder: null, laCount: 2,
    phase: "setup",
    setupStep: 0,
    setupSub: "settlement",
    lastSetupVertex: null,
    current: 0,
    turn: 1,
    hasRolled: false,
    playedDev: false,
    freeRoads: 0,
    mode: null,
    die1: 3, die2: 4, rolling: false,
    history: [],
    lastGained: {},
    message: "Crimson — place your first settlement!",
    winner: null,
  };
}
