// ============================================================
//  src/Game.jsx — v4 "The Explorer's Chart"
//  Layout from Dorothy's wireframe:
//    TOP:    title bar + message banner
//    MIDDLE: big board (left) + player panels (right)
//    BOTTOM: card fan + dice/actions + trade table
// ============================================================

import { useState, useEffect, useRef } from "react";
import {
  T, RES, TERRAIN_RESOURCE, PLAYERS, SETUP_ORDER,
  COSTS, LIMITS, PROBABILITY, DEV_INFO,
} from "./game/constants";
import { initGame, shuffle } from "./game/board";
import {
  vById, eById, canAfford, pay,
  canPlaceSettlement, canPlaceRoad, countPieces,
  updateBonuses, checkWin, victoryPoints,
} from "./game/rules";
import { distribute, stealFrom, discardHalves } from "./game/actions";
import { getSupabase } from "./config/supabase";

import Board from "./components/Board";
import Dice from "./components/Dice";
import PlayerPanel from "./components/PlayerPanel";
import CardHand from "./components/CardHand";
import TradePanel from "./components/TradePanel";
import GameOver from "./components/GameOver";

const EMPTY_TRADE = { wood:0, brick:0, sheep:0, wheat:0, ore:0 };

function CostTag({ cost }) {
  return (
    <span style={{ fontSize: 11, opacity: 0.85 }}>
      {Object.entries(cost).map(([r, n]) => `${n > 1 ? n : ""}${RES[r].emoji}`).join(" ")}
    </span>
  );
}

function BuildBtn({ label, cost, enabled, onClick, active }) {
  return (
    <button onClick={onClick} disabled={!enabled} style={{
      background: active ? T.gold + "44" : enabled ? "#fff6e2" : "#e7ddc6",
      border: `1.5px solid ${active ? T.gold : enabled ? T.gold : T.parchDeep}`,
      color: enabled ? T.ink : "#a99a7a",
      borderRadius: 7, padding: "6px 10px", fontSize: 12,
      cursor: enabled ? "pointer" : "not-allowed",
      boxShadow: active ? `0 0 8px ${T.gold}66` : enabled ? "0 1px 3px #00000022" : "none",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
    }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      {Object.keys(cost).length > 0 && <CostTag cost={cost} />}
    </button>
  );
}

// ============================================================
export default function Game({ session = { online:false, mySeat:0, roomCode:null, initialState:null } }) {
  const { online, mySeat, roomCode } = session;
  const [g, setG] = useState(() => session.initialState || initGame());
  const [showStats, setShowStats] = useState(false);
  const [copied, setCopied] = useState(false);

  // Trade state
  const [giving, setGiving] = useState({ ...EMPTY_TRADE });
  const [getting, setGetting] = useState({ ...EMPTY_TRADE });

  // Year of Plenty / Monopoly
  const [yopPicked, setYopPicked] = useState([]);

  const sbRef = useRef(null);

  // ---- online sync ----
  useEffect(() => {
    if (!online || !roomCode) return;
    let channel, pollTimer, cancelled = false;
    (async () => {
      const sb = await getSupabase();
      if (!sb || cancelled) return;
      sbRef.current = sb;
      channel = sb.channel(`room-${roomCode}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "games", filter: `id=eq.${roomCode}` },
          (payload) => { if (payload.new?.state) setG(payload.new.state); })
        .subscribe((status) => console.log("Realtime:", status));
      pollTimer = setInterval(async () => {
        if (cancelled) return;
        const { data } = await sb.from("games").select("state").eq("id", roomCode).single();
        if (data?.state) setG(data.state);
      }, 2000);
    })();
    return () => { cancelled = true; if (channel && sbRef.current) sbRef.current.removeChannel(channel); if (pollTimer) clearInterval(pollTimer); };
  }, [online, roomCode]);

  const pushState = (s) => {
    const sb = sbRef.current;
    if (!sb || !roomCode) return;
    sb.from("games").upsert({ id: roomCode, state: s, updated_at: new Date().toISOString() })
      .then(({ error }) => { if (error) console.warn("sync push failed", error.message); });
  };

  const activePlayer = g.phase === "setup" ? SETUP_ORDER[g.setupStep] : g.current;
  const myTurn = !online || activePlayer === mySeat;
  const me = online ? mySeat : g.current;
  const myHand = g.hands[me];
  const pieces = countPieces(g, me);

  const act = (fn) => {
    if (online && !myTurn) return;
    setG(prev => {
      if (prev.winner !== null && prev.phase === "gameover") return prev;
      const s = structuredClone(prev);
      fn(s);
      if (online) pushState(s);
      return s;
    });
  };

  const copyCode = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(roomCode).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  // ---- CLICK HANDLERS (same logic as before) ----
  const clickVertex = (vId) => act(s => {
    if (s.phase === "setup" && s.setupSub === "settlement") {
      const pid = SETUP_ORDER[s.setupStep];
      if (!canPlaceSettlement(s, vId, pid, false)) return;
      s.settlements.push({ playerId: pid, vertexId: vId, isCity: false });
      if (s.setupStep >= PLAYERS.length) {
        const v = vById(s, vId);
        const gained = {};
        v.tileIds.forEach(tid => {
          const res = TERRAIN_RESOURCE[s.board.tiles[tid].terrain];
          if (res) { s.hands[pid][res]++; gained[res] = (gained[res] || 0) + 1; }
        });
        s.lastGained = { [pid]: gained };
      }
      s.setupSub = "road"; s.lastSetupVertex = vId;
      s.message = `${PLAYERS[pid].name} — place a road next to that settlement!`;
    } else if (s.mode === "settlement") {
      if (!canPlaceSettlement(s, vId, s.current, true)) return;
      pay(s, s.current, COSTS.settlement);
      s.settlements.push({ playerId: s.current, vertexId: vId, isCity: false });
      s.mode = null; s.message = "Settlement built! 🏠";
      updateBonuses(s); checkWin(s);
    } else if (s.mode === "city") {
      const b = s.settlements.find(b => b.vertexId === vId);
      if (!b || b.playerId !== s.current || b.isCity) return;
      pay(s, s.current, COSTS.city); b.isCity = true;
      s.mode = null; s.message = "City built! 🏛️";
      checkWin(s);
    }
  });

  const clickEdge = (eId) => act(s => {
    if (s.phase === "setup" && s.setupSub === "road") {
      const pid = SETUP_ORDER[s.setupStep];
      if (!canPlaceRoad(s, eId, pid, s.lastSetupVertex)) return;
      s.roads.push({ playerId: pid, edgeId: eId });
      const next = s.setupStep + 1;
      if (next >= SETUP_ORDER.length) {
        s.phase = "play"; s.current = 0;
        s.message = "Setup complete! Crimson — roll the dice!";
      } else {
        s.setupStep = next; s.setupSub = "settlement";
        const p = PLAYERS[SETUP_ORDER[next]];
        s.message = `${p.name} — place your ${next >= PLAYERS.length ? "second" : "first"} settlement!`;
      }
    } else if (s.mode === "road") {
      if (!canPlaceRoad(s, eId, s.current)) return;
      if (s.freeRoads > 0) {
        s.freeRoads--; s.roads.push({ playerId: s.current, edgeId: eId });
        s.message = s.freeRoads > 0 ? "1 more free road!" : "Roads placed! 🛤️";
        if (s.freeRoads === 0) s.mode = null;
      } else {
        pay(s, s.current, COSTS.road);
        s.roads.push({ playerId: s.current, edgeId: eId });
        s.mode = null; s.message = "Road built! 🛤️";
      }
      updateBonuses(s); checkWin(s);
    }
  });

  const clickTile = (tileId) => act(s => {
    if (s.mode !== "robber" || tileId === s.robberTile) return;
    s.robberTile = tileId;
    const result = stealFrom(s, tileId, s.current);
    s.mode = null;
    s.message = result
      ? `Robber moved! Stole 1 ${RES[result.stolen].emoji} from ${PLAYERS[result.victim].name}.`
      : "Robber moved! Nobody to steal from.";
  });

  // ---- DICE ----
  const rollDice = () => {
    if (online && !myTurn) return;
    if (g.rolling || g.hasRolled || g.phase !== "play" || g.mode) return;
    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);
    act(s => { s.rolling = true; });
    setTimeout(() => act(s => {
      s.rolling = false; s.die1 = d1; s.die2 = d2; s.hasRolled = true;
      const total = d1 + d2; s.history.push(total); s.lastGained = {};
      if (total === 7) {
        const notes = discardHalves(s); s.mode = "robber";
        s.message = `🤠 A 7! ${notes.length ? notes.join(", ") + ". " : ""}Move the robber.`;
      } else {
        distribute(s, total);
        s.message = Object.keys(s.lastGained).length > 0
          ? `Rolled ${total} — resources collected!` : `Rolled ${total} — no production.`;
      }
    }), 420);
  };

  const endTurn = () => act(s => {
    if (!s.hasRolled || s.mode) return;
    s.current = (s.current + 1) % PLAYERS.length;
    s.turn++; s.hasRolled = false; s.playedDev = false;
    s.lastGained = {}; s.mode = null;
    s.message = `${PLAYERS[s.current].name}'s turn — roll the dice!`;
  });

  // ---- BUILD / BUY ----
  const startBuild = (what) => act(s => {
    if (!s.hasRolled || s.mode) return;
    const p = countPieces(s, s.current);
    if (what === "road" && (p.roads >= LIMITS.road || !canAfford(s.hands[s.current], COSTS.road))) return;
    if (what === "settlement" && (p.settlements >= LIMITS.settlement || !canAfford(s.hands[s.current], COSTS.settlement))) return;
    if (what === "city" && (p.cities >= LIMITS.city || !canAfford(s.hands[s.current], COSTS.city))) return;
    s.mode = what;
    s.message = what === "road" ? "Click an edge to build a road."
      : what === "settlement" ? "Click a spot to build a settlement."
      : "Click a settlement to upgrade.";
  });

  const buyDev = () => act(s => {
    if (!s.hasRolled || s.mode || s.devDeck.length === 0) return;
    if (!canAfford(s.hands[s.current], COSTS.dev)) return;
    pay(s, s.current, COSTS.dev);
    s.devHands[s.current].push({ type: s.devDeck.pop(), turnBought: s.turn });
    s.message = "Development card bought! 🃏"; checkWin(s);
  });

  const playDev = (index) => act(s => {
    const card = s.devHands[s.current][index];
    if (!card || card.type === "vp" || s.playedDev || card.turnBought === s.turn || s.mode) return;
    s.devHands[s.current].splice(index, 1); s.playedDev = true;
    if (card.type === "knight") {
      s.knights[s.current]++; s.mode = "robber";
      s.message = "⚔️ Knight! Move the robber."; updateBonuses(s); checkWin(s);
    } else if (card.type === "roadBuilding") {
      s.freeRoads = 2; s.mode = "road"; s.message = "🛤️ Place 2 free roads!";
    } else if (card.type === "yearOfPlenty") {
      s.mode = "yearOfPlenty"; s.message = "🌟 Pick 2 resources from the bank.";
    } else if (card.type === "monopoly") {
      s.mode = "monopoly"; s.message = "💰 Pick a resource to take from everyone.";
    }
  });

  // ---- TRADE (click cards into trade table) ----
  const startTrade = () => {
    act(s => { s.mode = "trade"; s.message = "Click your cards to offer, then pick from the bank."; });
    setGiving({ ...EMPTY_TRADE }); setGetting({ ...EMPTY_TRADE });
  };

  const addGive = (res) => {
    const available = myHand[res] - giving[res];
    if (available <= 0) return;
    setGiving(g => ({ ...g, [res]: g[res] + 1 }));
  };

  const removeGive = (res) => setGiving(g => ({ ...g, [res]: Math.max(0, g[res] - 1) }));
  const addGet = (res) => setGetting(g => ({ ...g, [res]: g[res] + 1 }));
  const removeGet = (res) => setGetting(g => ({ ...g, [res]: Math.max(0, g[res] - 1) }));

  const confirmTrade = () => act(s => {
    Object.entries(giving).forEach(([r, n]) => { s.hands[s.current][r] -= n; });
    Object.entries(getting).forEach(([r, n]) => { s.hands[s.current][r] += n; });
    s.mode = null;
    s.message = "Trade complete! ✅";
    setGiving({ ...EMPTY_TRADE }); setGetting({ ...EMPTY_TRADE });
  });

  const cancelMode = () => {
    act(s => {
      if (s.mode === "robber") return;
      if (s.freeRoads > 0) return;
      s.mode = null; s.message = "Cancelled.";
    });
    setGiving({ ...EMPTY_TRADE }); setGetting({ ...EMPTY_TRADE });
  };

  // ---- YOP / MONOPOLY ----
  const pickYop = (res) => {
    const next = [...yopPicked, res];
    if (next.length < 2) { setYopPicked(next); return; }
    setYopPicked([]);
    act(s => {
      next.forEach(r => { s.hands[s.current][r]++; }); s.mode = null;
      s.message = `Got ${RES[next[0]].emoji} and ${RES[next[1]].emoji}!`;
    });
  };

  const pickMonopoly = (res) => act(s => {
    let taken = 0;
    PLAYERS.forEach(p => { if (p.id !== s.current) { taken += s.hands[p.id][res]; s.hands[p.id][res] = 0; } });
    s.hands[s.current][res] += taken; s.mode = null;
    s.message = `💰 Took ${taken} ${RES[res].emoji}!`;
  });

  // ---- RENDER HELPERS ----
  const placingSettlement = myTurn && ((g.phase === "setup" && g.setupSub === "settlement") || g.mode === "settlement");
  const placingRoad = myTurn && ((g.phase === "setup" && g.setupSub === "road") || g.mode === "road");
  const counts = {}; g.history.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
  const maxCount = Math.max(1, ...Object.values(counts));
  const opponentId = me === 0 ? 1 : 0;

  // ============================================================
  return (
    <div style={{ width: "100%", maxWidth: 1300 }}>

      {/* ══════════ MESSAGE BANNER ══════════ */}
      <div style={{
        textAlign: "center", padding: "8px 18px",
        background: `linear-gradient(#f3e9d2, ${T.parchment})`,
        border: `1px solid ${T.parchDeep}`,
        borderLeft: `4px solid ${PLAYERS[activePlayer].color}`,
        borderRadius: 6, marginBottom: 10, fontSize: 14, color: T.ink,
        boxShadow: "0 2px 8px #00000033",
        display: "flex", justifyContent: "center", alignItems: "center", gap: 10,
      }}>
        <span>{g.message}</span>
        {g.mode && g.mode !== "robber" && g.mode !== "trade" && g.freeRoads === 0 && g.mode !== "yearOfPlenty" && g.mode !== "monopoly" && (
          <button onClick={cancelMode} style={{
            background: "transparent", border: `1px solid ${T.inkSoft}`,
            color: T.inkSoft, borderRadius: 5, padding: "2px 8px", fontSize: 11, cursor: "pointer",
          }}>cancel</button>
        )}
      </div>

      {/* YOP / Monopoly pickers */}
      {(g.mode === "yearOfPlenty" || g.mode === "monopoly") && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 10 }}>
          {Object.entries(RES).map(([r, info]) => (
            <button key={r}
              onClick={() => g.mode === "yearOfPlenty" ? pickYop(r) : pickMonopoly(r)}
              style={{
                background: info.color + "33", border: `2px solid ${info.color}`,
                color: T.parchment, borderRadius: 10, padding: "8px 16px", fontSize: 18, cursor: "pointer",
              }}>
              {info.emoji}
            </button>
          ))}
          {g.mode === "yearOfPlenty" && yopPicked.length === 1 && (
            <span style={{ alignSelf: "center", fontSize: 13, color: T.gold }}>
              picked {RES[yopPicked[0]].emoji} — 1 more
            </span>
          )}
        </div>
      )}

      {/* ══════════ MIDDLE ROW: Board + Sidebar ══════════ */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

        {/* BOARD (bigger, more ocean) */}
        <div style={{ flex: "1 1 520px", maxWidth: 700 }}>
          <Board g={g} myTurn={myTurn}
            placingSettlement={placingSettlement} placingRoad={placingRoad}
            onClickTile={clickTile} onClickVertex={clickVertex} onClickEdge={clickEdge} />
        </div>

        {/* SIDEBAR */}
        <div style={{ flex: "0 0 280px", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* room code */}
          {online && (
            <div style={{
              background: `linear-gradient(150deg, #f4ead4, ${T.parchment})`,
              border: `1px solid ${T.parchDeep}`, borderRadius: 8, padding: "8px 12px",
              textAlign: "center", boxShadow: "0 2px 8px #00000022",
            }}>
              <div style={{ fontSize: 10, color: T.inkSoft, marginBottom: 4 }}>ROOM CODE</div>
              <button onClick={copyCode} style={{
                background: "#fffaf0", border: `1px dashed ${T.gold}`, color: T.ink,
                fontFamily: "'Cinzel',serif", fontSize: 16, letterSpacing: 2,
                borderRadius: 6, padding: "4px 14px", cursor: "pointer",
              }}>{roomCode} {copied ? "✓" : "⧉"}</button>
              {!myTurn && (
                <div className="hand" style={{ color: T.wax, fontSize: 16, marginTop: 6 }}>
                  waiting for {PLAYERS[activePlayer].name}…
                </div>
              )}
            </div>
          )}

          {/* player panels */}
          <PlayerPanel g={g} player={PLAYERS[me]} isMe={true} isActive={activePlayer === me}
            myTurn={myTurn} onPlayDev={playDev}
            totalCards={Object.values(myHand).reduce((a, b) => a + b, 0)} />
          <PlayerPanel g={g} player={PLAYERS[opponentId]} isMe={false} isActive={activePlayer === opponentId}
            myTurn={false} onPlayDev={() => {}}
            totalCards={Object.values(g.hands[opponentId]).reduce((a, b) => a + b, 0)} />

          {/* building cost reference */}
          <div style={{
            background: `linear-gradient(150deg, #f4ead4, ${T.parchment})`,
            border: `1px solid ${T.parchDeep}`, borderRadius: 8, padding: "8px 12px",
            boxShadow: "0 2px 8px #00000022",
          }}>
            <div style={{ fontSize: 10, color: T.inkSoft, letterSpacing: 1, marginBottom: 4 }}>BUILDING COSTS</div>
            {Object.entries(COSTS).map(([name, cost]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.ink, padding: "2px 0" }}>
                <span>{name === "dev" ? "🃏 Dev Card" : name === "road" ? "🛤️ Road" : name === "settlement" ? "🏠 Settlement" : "🏛️ City"}</span>
                <CostTag cost={cost} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ BOTTOM ROW: Cards + Dice + Actions ══════════ */}
      <div style={{
        marginTop: 14,
        background: `linear-gradient(180deg, ${T.tableEdge}, #1a150e)`,
        borderRadius: 14, padding: "14px 20px",
        border: "1px solid #2a2418",
        boxShadow: "inset 0 2px 12px #00000044",
      }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>

          {/* MY CARDS (fan) */}
          <div style={{ flex: "1 1 300px", minWidth: 200 }}>
            <div style={{ fontSize: 10, color: T.inkSoft, letterSpacing: 1, marginBottom: 2, textAlign: "center" }}>
              YOUR HAND
            </div>
            <CardHand
              hand={myHand} isMe={true}
              trading={g.mode === "trade"}
              onClickCard={g.mode === "trade" ? addGive : undefined}
              lastGained={g.lastGained[me] || {}}
            />
          </div>

          {/* DICE + END TURN + BUILD BUTTONS */}
          <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            {g.phase !== "setup" && (
              <>
                <Dice die1={g.die1} die2={g.die2} rolling={g.rolling}
                  hasRolled={g.hasRolled}
                  disabled={g.rolling || g.phase === "gameover" || !myTurn}
                  onRoll={rollDice} />

                {g.hasRolled && (
                  <button onClick={endTurn} disabled={!!g.mode || !myTurn}
                    style={{
                      background: g.mode ? "transparent" : PLAYERS[me].color,
                      border: `1.5px solid ${g.mode ? "#555" : PLAYERS[me].color}`,
                      color: g.mode ? "#777" : "#fff",
                      borderRadius: 7, padding: "7px 20px", fontSize: 12, fontWeight: 700,
                      fontFamily: "'Cinzel',serif", letterSpacing: 1,
                      cursor: g.mode ? "not-allowed" : "pointer",
                    }}>END TURN</button>
                )}

                {g.hasRolled && g.phase === "play" && !g.mode && myTurn && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
                    <BuildBtn label="🛤️ Road" cost={COSTS.road} active={g.mode === "road"}
                      enabled={canAfford(myHand, COSTS.road) && pieces.roads < LIMITS.road}
                      onClick={() => startBuild("road")} />
                    <BuildBtn label="🏠 Settle" cost={COSTS.settlement} active={g.mode === "settlement"}
                      enabled={canAfford(myHand, COSTS.settlement) && pieces.settlements < LIMITS.settlement}
                      onClick={() => startBuild("settlement")} />
                    <BuildBtn label="🏛️ City" cost={COSTS.city} active={g.mode === "city"}
                      enabled={canAfford(myHand, COSTS.city) && pieces.cities < LIMITS.city && g.settlements.some(b => b.playerId === me && !b.isCity)}
                      onClick={() => startBuild("city")} />
                    <BuildBtn label="🃏 Dev" cost={COSTS.dev}
                      enabled={canAfford(myHand, COSTS.dev) && g.devDeck.length > 0}
                      onClick={buyDev} />
                    <BuildBtn label="🏦 Trade" cost={{}}
                      enabled={Object.values(myHand).some(n => n >= 4)}
                      onClick={startTrade} />
                  </div>
                )}
              </>
            )}

            {/* roll history */}
            {g.history.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center", maxWidth: 200 }}>
                {g.history.slice(-12).map((t, i) => (
                  <span key={i} style={{
                    padding: "0px 5px", borderRadius: 7, fontSize: 10, fontWeight: 600,
                    background: t === 7 ? T.wax : "#2a2010",
                    border: `1px solid ${t === 7 ? T.wax : "#3a3020"}`,
                    color: t === 7 ? "#fff" : T.goldSoft,
                  }}>{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* TRADE PANEL (visible only in trade mode) */}
          {g.mode === "trade" && (
            <div style={{ flex: "1 1 280px", maxWidth: 360 }}>
              <TradePanel
                hand={myHand} giving={giving} getting={getting}
                onAddGive={addGive} onRemoveGive={removeGive}
                onAddGet={addGet} onRemoveGet={removeGet}
                onConfirm={confirmTrade} onCancel={cancelMode}
              />
            </div>
          )}
        </div>
      </div>

      {/* ══════════ DICE FAIRNESS ══════════ */}
      <div style={{ marginTop: 10, textAlign: "center" }}>
        <button onClick={() => setShowStats(s => !s)} style={{
          background: "transparent", border: `1px solid #2a2418`, color: T.gold,
          borderRadius: 7, padding: "4px 12px", fontSize: 11, cursor: "pointer", letterSpacing: 1,
        }}>
          {showStats ? "▾" : "▸"} DICE FAIRNESS ({g.history.length} rolls)
        </button>
        {showStats && (
          <div style={{
            background: T.parchment, border: `1px solid ${T.parchDeep}`,
            borderRadius: 10, padding: 14, marginTop: 6,
            boxShadow: "0 3px 10px #00000044", display: "inline-block",
          }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60 }}>
              {[2,3,4,5,6,7,8,9,10,11,12].map(n => {
                const observed = counts[n] || 0;
                const expected = g.history.length > 0 ? (PROBABILITY[n] / 36) * g.history.length : 0;
                const barH = g.history.length > 0 ? (observed / maxCount) * 48 : 0;
                const expH = g.history.length > 0 ? (expected / maxCount) * 48 : 0;
                return (
                  <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24 }}>
                    <div style={{ position: "relative", width: "100%", height: 48, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                      <div style={{ position: "absolute", bottom: expH, left: 0, right: 0, height: 1.5, background: T.wax, opacity: 0.7 }} />
                      <div style={{ width: "65%", height: barH || 2, background: n === 7 ? T.wax : T.gold, borderRadius: "2px 2px 0 0" }} />
                    </div>
                    <span style={{ fontSize: 9, color: T.ink, fontWeight: 600 }}>{n}</span>
                  </div>
                );
              })}
            </div>
            <p style={{ color: T.inkSoft, fontSize: 10, margin: "4px 0 0" }}>red = expected · gold = actual</p>
          </div>
        )}
      </div>

      {g.phase === "gameover" && <GameOver g={g} onRestart={() => setG(initGame())} />}
    </div>
  );
}
