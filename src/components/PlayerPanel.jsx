// ============================================================
//  src/components/PlayerPanel.jsx
//  Compact player panel for the sidebar.
//  Resource cards are shown in the fan below the board now,
//  so this just shows name, VP, pieces, and dev cards.
// ============================================================

import { T, RES, DEV_INFO } from "../game/constants";
import { countPieces, victoryPoints } from "../game/rules";

export default function PlayerPanel({ g, player, isMe, isActive, myTurn, onPlayDev, totalCards }) {
  const pc = countPieces(g, player.id);
  const vp = victoryPoints(g, player.id, false);
  const vpHidden = g.devHands[player.id].filter(c => c.type === "vp").length;

  return (
    <div style={{
      background: `linear-gradient(150deg, #f4ead4, ${T.parchment})`,
      border: `1px solid ${T.parchDeep}`,
      borderLeft: `4px solid ${player.color}`,
      borderRadius: 8, padding: "10px 14px", transition: "all 0.3s",
      boxShadow: isActive
        ? `0 0 0 2px ${player.color}, 0 4px 14px ${player.color}44`
        : "0 2px 8px #00000022",
      opacity: isActive ? 1 : 0.8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span className="disp" style={{ fontWeight: 700, color: player.color, fontSize: 15 }}>
            {player.name}
          </span>
          {isActive && (
            <span className="hand" style={{ color: T.wax, fontSize: 15, marginLeft: 8 }}>
              playing
            </span>
          )}
        </div>
        <span style={{ color: T.ink, fontSize: 14, fontWeight: 700 }}>
          🏆 {vp}{isMe && vpHidden > 0 ? ` (+${vpHidden})` : ""}
        </span>
      </div>

      <div style={{
        display: "flex", gap: 10, fontSize: 11, color: T.inkSoft, marginTop: 6,
        flexWrap: "wrap", alignItems: "center",
      }}>
        <span>🛤️ {pc.roads}</span>
        <span>🏠 {pc.settlements}</span>
        <span>🏛️ {pc.cities}</span>
        <span>⚔️ {g.knights[player.id]}</span>
        <span>🃏 {totalCards}</span>
        {g.lrHolder === player.id && <span style={{ color: T.wax, fontWeight: 600 }}>Longest Road</span>}
        {g.laHolder === player.id && <span style={{ color: T.wax, fontWeight: 600 }}>Largest Army</span>}
      </div>

      {/* dev cards (own only) */}
      {isMe && g.devHands[player.id].length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
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
                  color: T.ink, borderRadius: 6, padding: "3px 7px", fontSize: 11,
                  cursor: playable ? "pointer" : "default",
                  boxShadow: playable ? `0 0 6px ${T.gold}66` : "none",
                  opacity: c.type === "vp" ? 0.85 : playable ? 1 : 0.55,
                }}>
                {info.emoji} {info.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
