// ============================================================
//  src/Game.jsx
//  The conductor: wires board, dice, players, and rules.
//  Handles online sync, turn gating, and all player actions.
// ============================================================

import { useState, useEffect, useRef } from "react";
import {
  T, RES, TERRAIN_RESOURCE, PLAYERS, SETUP_ORDER,
  COSTS, LIMITS, PROBABILITY,
} from "./game/constants";
import { initGame, shuffle } from "./game/board";
import {
  vById, eById, canAfford, pay,
  canPlaceSettlement, canPlaceRoad, countPieces,
  updateBonuses, checkWin,
} from "./game/rules";
import { distribute, stealFrom, discardHalves } from "./game/actions";
import { getSupabase } from "./config/supabase";

import Board from "./components/Board";
import Dice from "./components/Dice";
import PlayerPanel from "./components/PlayerPanel";
import GameOver from "./components/GameOver";

function CostTag({ cost }) {
  return (
    <span style={{ fontSize:11, opacity:0.85 }}>
      {Object.entries(cost).map(([r, n]) => `${n > 1 ? n : ""}${RES[r].emoji}`).join(" ")}
    </span>
  );
}

function BuildBtn({ label, cost, enabled, onClick }) {
  return (
    <button onClick={onClick} disabled={!enabled} style={{
      background: enabled ? "#fff6e2" : "#e7ddc6",
      border: `1px solid ${enabled ? T.gold : T.parchDeep}`,
      color: enabled ? T.ink : "#a99a7a",
      borderRadius:7, padding:"7px 8px", fontSize:12,
      cursor: enabled ? "pointer" : "not-allowed",
      boxShadow: enabled ? "0 1px 3px #00000022" : "none",
      display:"flex", flexDirection:"column", alignItems:"center", gap:2,
    }}>
      <span style={{ fontWeight:600 }}>{label}</span>
      {Object.keys(cost).length > 0 && <CostTag cost={cost} />}
    </button>
  );
}

export default function Game({ session = { online:false, mySeat:0, roomCode:null, initialState:null } }) {
  const { online, mySeat, roomCode } = session;
  const [g, setG] = useState(() => session.initialState || initGame());
  const [showStats, setShowStats] = useState(false);
  const [tradeGive, setTradeGive] = useState(null);
  const [yopPicked, setYopPicked] = useState([]);
  const [copied, setCopied] = useState(false);

  const sbRef = useRef(null);

  // ---- online sync: subscribe to the shared room row ----
  useEffect(() => {
    if (!online || !roomCode) return;
    let channel;
    let cancelled = false;
    (async () => {
      const sb = await getSupabase();
      if (!sb || cancelled) return;
      sbRef.current = sb;
      channel = sb.channel(`room-${roomCode}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "games", filter: `id=eq.${roomCode}` },
          (payload) => { if (payload.new?.state) setG(payload.new.state); })
        .subscribe();
    })();
    return () => { cancelled = true; if (channel && sbRef.current) sbRef.current.removeChannel(channel); };
  }, [online, roomCode]);

  const pushState = (s) => {
    const sb = sbRef.current;
    if (!sb || !roomCode) return;
    sb.from("games").upsert({ id: roomCode, state: s, updated_at: new Date().toISOString() })
      .then(({ error }) => { if (error) console.warn("sync push failed", error.message); });
  };

  // whose turn is it?
  const activePlayer = g.phase === "setup" ? SETUP_ORDER[g.setupStep] : g.current;
  const myTurn = !online || activePlayer === mySeat;

  // "me" = my cards panel. Online: my seat. Local: current player.
  const me = online ? mySeat : g.current;
  const myHand = g.hands[me];
  const pieces = countPieces(g, me);

  // central update: clone, mutate, set, sync
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

  // ----------------------------------------------------------
  //  CLICK HANDLERS
  // ----------------------------------------------------------
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
      s.setupSub = "road";
      s.lastSetupVertex = vId;
      s.message = `${PLAYERS[pid].name} — place a road next to that settlement!`;
    }
    else if (s.mode === "settlement") {
      if (!canPlaceSettlement(s, vId, s.current, true)) return;
      pay(s, s.current, COSTS.settlement);
      s.settlements.push({ playerId: s.current, vertexId: vId, isCity: false });
      s.mode = null; s.message = "Settlement built! 🏠";
      updateBonuses(s); checkWin(s);
    }
    else if (s.mode === "city") {
      const b = s.settlements.find(b => b.vertexId === vId);
      if (!b || b.playerId !== s.current || b.isCity) return;
      pay(s, s.current, COSTS.city);
      b.isCity = true;
      s.mode = null; s.message = "City built! 🏛️ (produces double)";
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
        const round = next >= PLAYERS.length ? "second" : "first";
        s.message = `${p.name} — place your ${round} settlement!`;
      }
    }
    else if (s.mode === "road") {
      if (!canPlaceRoad(s, eId, s.current)) return;
      if (s.freeRoads > 0) {
        s.freeRoads--;
        s.roads.push({ playerId: s.current, edgeId: eId });
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
    if (s.mode !== "robber") return;
    if (tileId === s.robberTile) return;
    s.robberTile = tileId;
    const result = stealFrom(s, tileId, s.current);
    s.mode = null;
    s.message = result
      ? `Robber moved! Stole 1 ${RES[result.stolen].emoji} from ${PLAYERS[result.victim].name}.`
      : "Robber moved! Nobody to steal from.";
  });

  // ----------------------------------------------------------
  //  DICE
  // ----------------------------------------------------------
  const rollDice = () => {
    if (online && !myTurn) return;
    if (g.rolling || g.hasRolled || g.phase !== "play" || g.mode) return;
    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);
    act(s => { s.rolling = true; });
    setTimeout(() => act(s => {
      s.rolling = false; s.die1 = d1; s.die2 = d2; s.hasRolled = true;
      const total = d1 + d2;
      s.history.push(total);
      s.lastGained = {};
      if (total === 7) {
        const notes = discardHalves(s);
        s.mode = "robber";
        s.message = `🤠 A 7! ${notes.length ? notes.join(", ") + ". " : ""}Click a tile to move the robber.`;
      } else {
        distribute(s, total);
        const any = Object.keys(s.lastGained).length > 0;
        s.message = any ? `Rolled ${total} — resources distributed!` : `Rolled ${total} — no production.`;
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

  // ----------------------------------------------------------
  //  BUILD / BUY / DEV ACTIONS
  // ----------------------------------------------------------
  const startBuild = (what) => act(s => {
    if (!s.hasRolled || s.mode) return;
    const p = countPieces(s, s.current);
    if (what === "road" && (p.roads >= LIMITS.road || !canAfford(s.hands[s.current], COSTS.road))) return;
    if (what === "settlement" && (p.settlements >= LIMITS.settlement || !canAfford(s.hands[s.current], COSTS.settlement))) return;
    if (what === "city" && (p.cities >= LIMITS.city || !canAfford(s.hands[s.current], COSTS.city))) return;
    s.mode = what;
    s.message = what === "road" ? "Click a glowing edge to build a road."
      : what === "settlement" ? "Click a glowing spot to build a settlement."
      : "Click one of your settlements to upgrade it.";
  });

  const buyDev = () => act(s => {
    if (!s.hasRolled || s.mode) return;
    if (s.devDeck.length === 0) { s.message = "Dev card deck is empty!"; return; }
    if (!canAfford(s.hands[s.current], COSTS.dev)) return;
    pay(s, s.current, COSTS.dev);
    const type = s.devDeck.pop();
    s.devHands[s.current].push({ type, turnBought: s.turn });
    s.message = "Development card bought! 🃏";
    checkWin(s);
  });

  const playDev = (index) => act(s => {
    const card = s.devHands[s.current][index];
    if (!card || card.type === "vp") return;
    if (s.playedDev) { s.message = "Only 1 dev card per turn!"; return; }
    if (card.turnBought === s.turn) { s.message = "Can't play a card the turn you bought it!"; return; }
    if (s.mode) return;
    s.devHands[s.current].splice(index, 1);
    s.playedDev = true;
    if (card.type === "knight") {
      s.knights[s.current]++; s.mode = "robber";
      s.message = "⚔️ Knight! Click a tile to move the robber.";
      updateBonuses(s); checkWin(s);
    } else if (card.type === "roadBuilding") {
      s.freeRoads = 2; s.mode = "road";
      s.message = "🛤️ Road Building — place 2 free roads!";
    } else if (card.type === "yearOfPlenty") {
      s.mode = "yearOfPlenty";
      s.message = "🌟 Year of Plenty — pick 2 resources from the bank.";
    } else if (card.type === "monopoly") {
      s.mode = "monopoly";
      s.message = "💰 Monopoly — pick a resource to take from everyone.";
    }
  });

  const pickYop = (res) => {
    const next = [...yopPicked, res];
    if (next.length < 2) { setYopPicked(next); return; }
    setYopPicked([]);
    act(s => {
      next.forEach(r => { s.hands[s.current][r]++; });
      s.mode = null;
      s.message = `Got ${RES[next[0]].emoji} and ${RES[next[1]].emoji} from the bank!`;
    });
  };

  const pickMonopoly = (res) => act(s => {
    let taken = 0;
    PLAYERS.forEach(p => {
      if (p.id === s.current) return;
      taken += s.hands[p.id][res]; s.hands[p.id][res] = 0;
    });
    s.hands[s.current][res] += taken;
    s.mode = null;
    s.message = `💰 Monopoly! Took ${taken} ${RES[res].emoji} from opponents.`;
  });

  const doTrade = (give, get) => act(s => {
    if (s.hands[s.current][give] < 4) return;
    s.hands[s.current][give] -= 4;
    s.hands[s.current][get] += 1;
    s.mode = null;
    s.message = `Traded 4 ${RES[give].emoji} → 1 ${RES[get].emoji} with the bank.`;
  });

  const cancelMode = () => act(s => {
    if (s.mode === "robber") return;
    if (s.freeRoads > 0) return;
    s.mode = null; s.message = "Action cancelled.";
  });

  // ----------------------------------------------------------
  //  RENDER
  // ----------------------------------------------------------
  const placingSettlement = myTurn && ((g.phase === "setup" && g.setupSub === "settlement") || g.mode === "settlement");
  const placingRoad = myTurn && ((g.phase === "setup" && g.setupSub === "road") || g.mode === "road");
  const counts = {};
  g.history.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
  const maxCount = Math.max(1, ...Object.values(counts));

  return (
    <div style={{ width:"100%", maxWidth:1200 }}>
      {/* message banner */}
      <div style={{
        textAlign:"center", padding:"9px 18px",
        background: `linear-gradient(#f3e9d2,${T.parchment})`,
        border: `1px solid ${T.parchDeep}`,
        borderLeft: `4px solid ${PLAYERS[activePlayer].color}`,
        borderRadius:6, marginBottom:10, fontSize:15, color:T.ink,
        boxShadow:"0 2px 8px #00000044",
        display:"flex", justifyContent:"center", alignItems:"center", gap:10,
      }}>
        <span>{g.message}</span>
        {g.mode && g.mode !== "robber" && g.freeRoads === 0 && g.mode !== "yearOfPlenty" && g.mode !== "monopoly" && (
          <button onClick={cancelMode} style={{
            background:"transparent", border:`1px solid ${T.inkSoft}`,
            color:T.inkSoft, borderRadius:5, padding:"2px 8px", fontSize:11, cursor:"pointer",
          }}>cancel</button>
        )}
      </div>

      {/* Year of Plenty / Monopoly pickers */}
      {(g.mode === "yearOfPlenty" || g.mode === "monopoly") && (
        <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:10 }}>
          {Object.entries(RES).map(([r, info]) => (
            <button key={r}
              onClick={() => g.mode === "yearOfPlenty" ? pickYop(r) : pickMonopoly(r)}
              style={{
                background: info.color + "33", border: `2px solid ${info.color}`,
                color: T.parchment, borderRadius:10, padding:"8px 14px", fontSize:16, cursor:"pointer",
              }}>
              {info.emoji}
            </button>
          ))}
          {g.mode === "yearOfPlenty" && yopPicked.length === 1 && (
            <span style={{ alignSelf:"center", fontSize:13, color:T.gold }}>
              picked {RES[yopPicked[0]].emoji} — pick 1 more
            </span>
          )}
        </div>
      )}

      {/* Bank trade picker */}
      {g.mode === "trade" && (
        <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:10, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ fontSize:13, color:T.inkSoft }}>Give 4:</span>
          {Object.entries(RES).map(([r, info]) => (
            <button key={r} onClick={() => setTradeGive(r)} disabled={myHand[r] < 4}
              style={{
                background: tradeGive === r ? info.color + "66" : info.color + "22",
                border: `2px solid ${tradeGive === r ? info.color : "#333"}`,
                color: T.parchment, borderRadius:8, padding:"5px 10px", fontSize:14,
                cursor: myHand[r] >= 4 ? "pointer" : "not-allowed",
                opacity: myHand[r] >= 4 ? 1 : 0.35,
              }}>{info.emoji}</button>
          ))}
          {tradeGive && <>
            <span style={{ fontSize:13, color:T.inkSoft }}>→ Get 1:</span>
            {Object.entries(RES).filter(([r]) => r !== tradeGive).map(([r, info]) => (
              <button key={r} onClick={() => { doTrade(tradeGive, r); setTradeGive(null); }}
                style={{
                  background: info.color + "22", border: `2px solid ${info.color}`,
                  color: T.parchment, borderRadius:8, padding:"5px 10px", fontSize:14, cursor:"pointer",
                }}>{info.emoji}</button>
            ))}
          </>}
        </div>
      )}

      <div style={{ display:"flex", flexWrap:"wrap", gap:16, justifyContent:"center", alignItems:"flex-start" }}>
        {/* board */}
        <div style={{ flex:"1 1 440px", maxWidth:600 }}>
          <Board g={g} myTurn={myTurn}
            placingSettlement={placingSettlement} placingRoad={placingRoad}
            onClickTile={clickTile} onClickVertex={clickVertex} onClickEdge={clickEdge} />

          <button onClick={() => setShowStats(s => !s)} style={{
            background:"transparent", border:`1px solid ${T.inkSoft}`, color:T.gold,
            borderRadius:7, padding:"5px 12px", fontSize:11, cursor:"pointer",
            marginTop:8, letterSpacing:1,
          }}>
            {showStats ? "▾" : "▸"} DICE FAIRNESS ({g.history.length} rolls)
          </button>
          {showStats && (
            <div style={{
              background:T.parchment, border:`1px solid ${T.parchDeep}`,
              borderRadius:10, padding:14, marginTop:6, boxShadow:"0 3px 10px #00000044",
            }}>
              <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:70 }}>
                {[2,3,4,5,6,7,8,9,10,11,12].map(n => {
                  const observed = counts[n] || 0;
                  const expected = g.history.length > 0 ? (PROBABILITY[n] / 36) * g.history.length : 0;
                  const barH = g.history.length > 0 ? (observed / maxCount) * 54 : 0;
                  const expH = g.history.length > 0 ? (expected / maxCount) * 54 : 0;
                  return (
                    <div key={n} style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1 }}>
                      <div style={{ position:"relative", width:"100%", height:54, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
                        <div style={{ position:"absolute", bottom:expH, left:0, right:0, height:1.5, background:T.wax, opacity:0.7 }} />
                        <div style={{ width:"70%", height:barH || 2, background: n === 7 ? T.wax : T.gold, borderRadius:"2px 2px 0 0", transition:"height 0.3s" }} />
                      </div>
                      <span style={{ fontSize:9, color:T.ink, fontWeight:600 }}>{n}</span>
                      <span style={{ fontSize:9, color:T.inkSoft }}>{observed}</span>
                    </div>
                  );
                })}
              </div>
              <p style={{ color:T.inkSoft, fontSize:10, margin:"6px 0 0" }}>red line = expected · bars = actual</p>
            </div>
          )}
        </div>

        {/* side panel */}
        <div style={{ flex:"0 1 380px", display:"flex", flexDirection:"column", gap:10 }}>
          {/* online room code */}
          {online && (
            <div style={{
              background: `linear-gradient(150deg,#f4ead4,${T.parchment})`,
              border: `1px solid ${T.parchDeep}`, borderRadius:8, padding:"10px 14px",
              boxShadow:"0 3px 10px #00000033", textAlign:"center",
            }}>
              <div style={{ fontSize:12, color:T.inkSoft, marginBottom:6 }}>Room code — share with your crew</div>
              <button onClick={copyCode} style={{
                background:"#fffaf0", border:`1px dashed ${T.gold}`, color:T.ink,
                fontFamily:"'Cinzel',serif", fontSize:18, letterSpacing:2,
                borderRadius:6, padding:"6px 16px", cursor:"pointer",
              }}>{roomCode} {copied ? "✓" : "⧉"}</button>
              {!myTurn && (
                <div className="hand" style={{ color:T.wax, fontSize:18, marginTop:8 }}>
                  waiting for {PLAYERS[activePlayer].name}…
                </div>
              )}
            </div>
          )}

          {/* player panels */}
          {PLAYERS.map(p => (
            <PlayerPanel key={p.id} g={g} player={p}
              isMe={p.id === me} isActive={activePlayer === p.id}
              myTurn={myTurn} onPlayDev={playDev} />
          ))}

          {/* dice + actions */}
          {g.phase !== "setup" && (
            <div style={{
              background: `linear-gradient(150deg,#f4ead4,${T.parchment})`,
              border: `1px solid ${T.parchDeep}`, borderRadius:8,
              boxShadow:"0 3px 10px #00000033",
              opacity: online && !myTurn ? 0.5 : 1,
              pointerEvents: online && !myTurn ? "none" : "auto",
              padding:14, display:"flex", flexDirection:"column", gap:10,
            }}>
              <div style={{ display:"flex", gap:10, alignItems:"center", justifyContent:"center" }}>
                <Dice die1={g.die1} die2={g.die2} rolling={g.rolling}
                  hasRolled={g.hasRolled}
                  disabled={g.rolling || g.phase === "gameover"}
                  onRoll={rollDice} />
                {g.hasRolled && (
                  <button onClick={endTurn} disabled={!!g.mode || g.phase === "gameover"}
                    style={{
                      background: g.mode ? "transparent" : PLAYERS[me].color,
                      border: `1.5px solid ${g.mode ? T.parchDeep : PLAYERS[me].color}`,
                      color: g.mode ? T.inkSoft : "#fff",
                      borderRadius:7, padding:"9px 18px", fontSize:13, fontWeight:700,
                      fontFamily:"'Cinzel',serif", letterSpacing:1,
                      cursor: g.mode ? "not-allowed" : "pointer",
                    }}>END TURN</button>
                )}
              </div>

              {g.hasRolled && g.phase === "play" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  <BuildBtn label="🛤️ Road" cost={COSTS.road}
                    enabled={!g.mode && canAfford(myHand, COSTS.road) && pieces.roads < LIMITS.road}
                    onClick={() => startBuild("road")} />
                  <BuildBtn label="🏠 Settlement" cost={COSTS.settlement}
                    enabled={!g.mode && canAfford(myHand, COSTS.settlement) && pieces.settlements < LIMITS.settlement}
                    onClick={() => startBuild("settlement")} />
                  <BuildBtn label="🏛️ City" cost={COSTS.city}
                    enabled={!g.mode && canAfford(myHand, COSTS.city) && pieces.cities < LIMITS.city && g.settlements.some(b => b.playerId === me && !b.isCity)}
                    onClick={() => startBuild("city")} />
                  <BuildBtn label="🃏 Dev Card" cost={COSTS.dev}
                    enabled={!g.mode && canAfford(myHand, COSTS.dev) && g.devDeck.length > 0}
                    onClick={buyDev} />
                  <BuildBtn label="🏦 Trade 4:1" cost={{}}
                    enabled={!g.mode && Object.values(myHand).some(n => n >= 4)}
                    onClick={() => act(s => { s.mode = "trade"; s.message = "Bank trade: pick what to give (4) and get (1)."; })} />
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:T.inkSoft }}>
                    deck: {g.devDeck.length} cards
                  </div>
                </div>
              )}

              {g.history.length > 0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:3, justifyContent:"center" }}>
                  {g.history.slice(-15).map((t, i) => (
                    <span key={i} style={{
                      padding:"1px 6px", borderRadius:8, fontSize:10, fontWeight:600,
                      background: t === 7 ? T.wax : "#fffaf0",
                      border: `1px solid ${t === 7 ? T.wax : T.parchDeep}`,
                      color: t === 7 ? "#fff" : T.inkSoft,
                    }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {g.phase === "gameover" && <GameOver g={g} onRestart={() => setG(initGame())} />}
    </div>
  );
}
