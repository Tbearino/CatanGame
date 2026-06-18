// ============================================================
//  src/game/actions.js
//  What happens when dice are rolled, robber moves, etc.
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

// ---- CHECK WHO MUST DISCARD (on a 7, anyone with >7 cards) ----
// Returns array of { playerId, amount } — doesn't discard anything yet
export function getDiscardRequirements(s) {
  const result = [];
  PLAYERS.forEach(p => {
    const total = Object.values(s.hands[p.id]).reduce((a, b) => a + b, 0);
    if (total > 7) {
      result.push({ playerId: p.id, amount: Math.floor(total / 2) });
    }
  });
  return result;
}

// ---- ACTUALLY DISCARD the selected cards ----
// selected = { wood: 2, brick: 1, ... }
export function applyDiscard(s, playerId, selected) {
  Object.entries(selected).forEach(([res, n]) => {
    s.hands[playerId][res] -= n;
  });
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