// ============================================================
//  src/components/PlayerPanel.jsx
//  One player's parchment ledger: name, resources, dev cards.
// ============================================================

import { T, RES, DEV_INFO } from "../game/constants";
import { countPieces, victoryPoints } from "../game/rules";

export default function PlayerPanel({ g, player, isMe, isActive, myTurn, onPlayDev }) {
  const hand = g.hands[player.id];
  const total = Object.values(hand).reduce((a, b) => a + b, 0);
  const pc = countPieces(g, player.id);
  const vp = victoryPoints(g, player.id, false);
  const vpHidden = g.devHands[player.id].filter(c => c.type === "vp").length;
  const lg = g.lastGained[player.id] || {};

  return (
    <div style={{
      background: `linear-gradient(150deg,#f4ead4,${T.parchment})`,
      border: `1px solid ${T.parchDeep}`,
      borderTop: `4px solid ${player.color}`,
      borderRadius: 8, padding: "11px 15px", transition: "all 0.3s",
      boxShadow: isActive
        ? `0 0 0 2px ${player.color}, 0 6px 18px ${player.color}44`
        : "0 3px 10px #00000033",
      opacity: isActive ? 1 : 0.86,
    }}>
      {/* header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <span className="disp" style={{ fontWeight:700, color:player.color, fontSize:15 }}>
          {player.name}
          {isActive && (
            <span className="hand" style={{ color:T.wax, fontSize:16, marginLeft:8 }}>
              now playing
            </span>
          )}
        </span>
        <span style={{ color:T.ink, fontSize:13, fontWeight:600 }}>
          🏆 {vp}{isMe && vpHidden > 0 ? ` (+${vpHidden})` : ""}
        </span>
      </div>

      {/* piece counts */}
      <div style={{ display:"flex", gap:9, fontSize:11, color:T.inkSoft, marginBottom:9, flexWrap:"wrap" }}>
        <span>🛤️ {pc.roads}/15</span>
        <span>🏠 {pc.settlements}/5</span>
        <span>🏛️ {pc.cities}/4</span>
        <span>⚔️ {g.knights[player.id]}</span>
        {g.lrHolder === player.id && <span style={{ color:T.wax, fontWeight:600 }}>Longest Road</span>}
        {g.laHolder === player.id && <span style={{ color:T.wax, fontWeight:600 }}>Largest Army</span>}
      </div>

      {/* resource cards */}
      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
        {isMe ? Object.entries(RES).map(([key, r]) => (
          <div key={key} style={{
            display:"flex", flexDirection:"column", alignItems:"center",
            width:44, paddingBottom:4, overflow:"hidden",
            background:"#fffaf0",
            border: `1px solid ${(lg[key] || 0) > 0 ? r.color : T.parchDeep}`,
            borderRadius:6, transition:"all 0.3s",
            boxShadow: (lg[key] || 0) > 0 ? `0 0 8px ${r.color}aa` : "0 1px 2px #00000022",
            opacity: hand[key] > 0 || (lg[key] || 0) > 0 ? 1 : 0.45,
          }}>
            <div style={{ width:"100%", height:5, background:r.color }} />
            <span style={{ fontSize:16, marginTop:3 }}>{r.emoji}</span>
            <b style={{ fontSize:14, color:T.ink }}>{hand[key]}</b>
            {(lg[key] || 0) > 0 && (
              <span style={{ fontSize:9, color:r.color, fontWeight:"bold" }}>+{lg[key]}</span>
            )}
          </div>
        )) : (
          <span style={{ fontSize:13, color:T.inkSoft, fontStyle:"italic" }}>🂠 {total} cards held</span>
        )}
      </div>

      {/* dev cards (own only) */}
      {isMe && g.devHands[player.id].length > 0 && (
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:9 }}>
          {g.devHands[player.id].map((c, i) => {
            const info = DEV_INFO[c.type];
            const playable = myTurn && c.type !== "vp" && !g.playedDev
              && c.turnBought < g.turn && g.hasRolled && !g.mode;
            return (
              <button key={i} onClick={() => playable && onPlayDev(i)}
                title={`${info.label}: ${info.desc}`}
                style={{
                  background: playable ? "#fff6e2" : "#efe6cf",
                  border: `1px solid ${playable ? T.gold : T.parchDeep}`,
                  color: T.ink, borderRadius:6, padding:"4px 8px", fontSize:12,
                  cursor: playable ? "pointer" : "default",
                  boxShadow: playable ? `0 0 6px ${T.gold}66` : "none",
                  opacity: c.type === "vp" ? 0.85 : playable ? 1 : 0.55,
                }}>
                {info.emoji} <span style={{ fontSize:10 }}>{info.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
