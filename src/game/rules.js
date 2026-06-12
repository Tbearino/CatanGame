// ============================================================
//  src/game/rules.js
//  Can-I-build checks, longest road, largest army, scoring.
//  Pure logic — takes a game state, returns answers.
// ============================================================

import { HEX_SIZE, PLAYERS } from "./constants";

// --- helpers to look things up in the state ---
export const vById = (s, id) => s.board.vertices.find(v => v.id === id);
export const eById = (s, id) => s.board.edges.find(e => e.id === id);
export const buildingAt = (s, vertexId) => s.settlements.find(b => b.vertexId === vertexId);

export function canAfford(hand, cost) {
  return Object.entries(cost).every(([r, n]) => hand[r] >= n);
}

export function pay(s, playerId, cost) {
  Object.entries(cost).forEach(([r, n]) => { s.hands[playerId][r] -= n; });
}

// ---- DISTANCE RULE: no settlement directly next to another ----
export function canPlaceSettlement(s, vertexId, playerId, needRoad) {
  if (buildingAt(s, vertexId)) return false;
  const v = vById(s, vertexId);
  if (v.neighborIds.some(nId => buildingAt(s, nId))) return false;
  if (needRoad) {
    const hasRoad = s.roads.some(r => {
      if (r.playerId !== playerId) return false;
      const e = eById(s, r.edgeId);
      return e.a === vertexId || e.b === vertexId;
    });
    if (!hasRoad) return false;
  }
  return true;
}

// ---- ROAD PLACEMENT: must connect to own network ----
export function canPlaceRoad(s, edgeId, playerId, anchorVertexId = null) {
  if (s.roads.some(r => r.edgeId === edgeId)) return false;
  const e = eById(s, edgeId);
  if (anchorVertexId) return e.a === anchorVertexId || e.b === anchorVertexId;

  return [e.a, e.b].some(vId => {
    const b = buildingAt(s, vId);
    if (b && b.playerId === playerId) return true;
    if (b && b.playerId !== playerId) return false;
    return s.roads.some(r => {
      if (r.playerId !== playerId) return false;
      const re = eById(s, r.edgeId);
      return re.a === vId || re.b === vId;
    });
  });
}

// ---- COUNT PIECES ----
export function countPieces(s, playerId) {
  return {
    roads: s.roads.filter(r => r.playerId === playerId).length,
    settlements: s.settlements.filter(b => b.playerId === playerId && !b.isCity).length,
    cities: s.settlements.filter(b => b.playerId === playerId && b.isCity).length,
  };
}

// ---- LONGEST ROAD (DFS, blocked by enemy buildings) ----
export function longestRoad(s, playerId) {
  const myRoads = s.roads.filter(r => r.playerId === playerId).map(r => eById(s, r.edgeId));
  let best = 0;
  const dfs = (vertexId, used) => {
    const b = buildingAt(s, vertexId);
    if (b && b.playerId !== playerId) return 0;
    let max = 0;
    myRoads.forEach(e => {
      if (used.has(e.id)) return;
      if (e.a !== vertexId && e.b !== vertexId) return;
      used.add(e.id);
      const next = e.a === vertexId ? e.b : e.a;
      max = Math.max(max, 1 + dfs(next, used));
      used.delete(e.id);
    });
    return max;
  };
  myRoads.forEach(e => {
    best = Math.max(best, dfs(e.a, new Set()), dfs(e.b, new Set()));
  });
  return best;
}

// ---- BONUS AWARDS ----
export function updateBonuses(s) {
  PLAYERS.forEach(p => {
    const lr = longestRoad(s, p.id);
    if (lr >= 5 && lr > s.lrLength) { s.lrHolder = p.id; s.lrLength = lr; }
    if (s.knights[p.id] >= 3 && s.knights[p.id] > s.laCount) {
      s.laHolder = p.id; s.laCount = s.knights[p.id];
    }
  });
  if (s.lrHolder !== null) {
    s.lrLength = Math.max(s.lrLength, longestRoad(s, s.lrHolder));
  }
}

// ---- VICTORY POINTS ----
export function victoryPoints(s, playerId, includeHidden) {
  const pieces = countPieces(s, playerId);
  let vp = pieces.settlements + pieces.cities * 2;
  if (s.lrHolder === playerId) vp += 2;
  if (s.laHolder === playerId) vp += 2;
  if (includeHidden) vp += s.devHands[playerId].filter(c => c.type === "vp").length;
  return vp;
}

// ---- WIN CHECK ----
export function checkWin(s) {
  const vp = victoryPoints(s, s.current, true);
  if (vp >= 10) {
    s.phase = "gameover";
    s.winner = s.current;
    s.mode = null;
    s.message = `🎉 ${PLAYERS[s.current].name} wins with ${vp} victory points!`;
  }
}
