// ============================================================
//  src/game/actions.js
//  What happens when dice are rolled, robber moves, etc.
//  Mutates a cloned game state object — no visuals.
// ============================================================

import { TERRAIN_RESOURCE, PLAYERS, RES } from "./constants";
import { shuffle } from "./board";
import { vById } from "./rules";

// ---- RESOURCE DISTRIBUTION (on every non-7 roll) ----
export function distribute(s, total) {
  const gains = {};
  s.settlements.forEach(b => {
    const v = vById(s, b.vertexId);
    v.tileIds.forEach(tileId => {
      const tile = s.board.tiles[tileId];
      if (tile.number !== total || s.robberTile === tileId) return;
      const res = TERRAIN_RESOURCE[tile.terrain];
      if (!res) return;
      const n = b.isCity ? 2 : 1;
      s.hands[b.playerId][res] += n;
      if (!gains[b.playerId]) gains[b.playerId] = {};
      gains[b.playerId][res] = (gains[b.playerId][res] || 0) + n;
    });
  });
  s.lastGained = gains;
}

// ---- ROBBER: steal a random card from someone on the tile ----
export function stealFrom(s, tileId, thiefId) {
  const victims = new Set();
  s.settlements.forEach(b => {
    if (b.playerId === thiefId) return;
    const v = vById(s, b.vertexId);
    if (v.tileIds.includes(tileId)) victims.add(b.playerId);
  });
  const candidates = [...victims].filter(pid =>
    Object.values(s.hands[pid]).reduce((a, b) => a + b, 0) > 0
  );
  if (candidates.length === 0) return null;
  const victim = candidates[Math.floor(Math.random() * candidates.length)];
  const pool = [];
  Object.entries(s.hands[victim]).forEach(([r, n]) => {
    for (let i = 0; i < n; i++) pool.push(r);
  });
  const stolen = pool[Math.floor(Math.random() * pool.length)];
  s.hands[victim][stolen]--;
  s.hands[thiefId][stolen]++;
  return { victim, stolen };
}

// ---- DISCARD HALVES (when a 7 is rolled, anyone with >7 cards discards half) ----
export function discardHalves(s) {
  const notes = [];
  PLAYERS.forEach(p => {
    const total = Object.values(s.hands[p.id]).reduce((a, b) => a + b, 0);
    if (total > 7) {
      let toDiscard = Math.floor(total / 2);
      const pool = [];
      Object.entries(s.hands[p.id]).forEach(([r, n]) => {
        for (let i = 0; i < n; i++) pool.push(r);
      });
      const shuffled = shuffle(pool);
      for (let i = 0; i < toDiscard; i++) s.hands[p.id][shuffled[i]]--;
      notes.push(`${p.name} discards ${toDiscard}`);
    }
  });
  return notes;
}
