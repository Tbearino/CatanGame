// ============================================================
//  src/components/GameOver.jsx
//  Winner overlay with Play Again button.
// ============================================================

import { T, PLAYERS } from "../game/constants";
import { victoryPoints } from "../game/rules";

export default function GameOver({ g, onRestart }) {
  return (
    <div style={{
      position:"fixed", inset:0, background:"#000000dd",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:10,
      animation:"fadeUp 0.5s ease both",
    }}>
      <div style={{
        background: `linear-gradient(160deg,#f4ead4,${T.parchment})`,
        border: `2px solid ${PLAYERS[g.winner].color}`,
        borderRadius:14, padding:"40px 64px", textAlign:"center",
        boxShadow: `0 0 60px ${PLAYERS[g.winner].color}66`,
      }}>
        <div style={{ fontSize:60 }}>🏆</div>
        <h2 className="disp" style={{
          color:PLAYERS[g.winner].color, fontSize:30, margin:"10px 0", fontWeight:700,
        }}>
          {PLAYERS[g.winner].name} prevails!
        </h2>
        <p style={{ color:T.ink }}>{victoryPoints(g, g.winner, true)} victory points</p>
        <button onClick={onRestart} style={{
          background: `linear-gradient(135deg,${T.goldSoft},${T.gold})`, color:"#2a1d08",
          border:"none", borderRadius:7, padding:"12px 34px", fontSize:15,
          fontFamily:"'Cinzel',serif", letterSpacing:1,
          fontWeight:700, cursor:"pointer", marginTop:18, boxShadow:"0 3px 0 #8a6a18",
        }}>
          NEW VOYAGE
        </button>
      </div>
    </div>
  );
}
