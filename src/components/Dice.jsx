// ============================================================
//  src/components/Dice.jsx
//  Ivory bone dice with roll animation
// ============================================================

import { T } from "../game/constants";

export default function Dice({ die1, die2, rolling, hasRolled, disabled, onRoll }) {
  return (
    <div style={{ display:"flex", gap:10, alignItems:"center", justifyContent:"center" }}>
      <DieFace value={die1} rolling={rolling} />
      <DieFace value={die2} rolling={rolling} />
      {hasRolled && !rolling && (
        <span className="disp" style={{
          fontSize:30, fontWeight:700, minWidth:42, textAlign:"center",
          color: (die1 + die2) === 7 ? T.wax : T.ink,
        }}>{die1 + die2}</span>
      )}
      {!hasRolled && (
        <button onClick={onRoll} disabled={disabled} style={{
          background: disabled ? T.parchDeep : `linear-gradient(135deg,${T.goldSoft},${T.gold})`,
          color: "#2a1d08", border: "none", borderRadius: 7,
          padding: "10px 24px", fontSize: 14, fontWeight: 700,
          fontFamily: "'Cinzel',serif", letterSpacing: 1,
          cursor: disabled ? "wait" : "pointer",
          boxShadow: disabled ? "none" : "0 3px 0 #8a6a18",
        }}>
          {disabled ? "…" : "ROLL"}
        </button>
      )}
    </div>
  );
}

function DieFace({ value, rolling }) {
  const dots = {
    1: [[50,50]],
    2: [[25,25],[75,75]],
    3: [[25,25],[50,50],[75,75]],
    4: [[25,25],[75,25],[25,75],[75,75]],
    5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
    6: [[25,20],[75,20],[25,50],[75,50],[25,80],[75,80]],
  };
  return (
    <div style={{
      width: 46, height: 46,
      background: "radial-gradient(circle at 32% 28%,#fffdf6,#efe6d2 70%,#ddccac)",
      borderRadius: 10, border: "1.5px solid #b8a47e",
      boxShadow: "0 3px 5px #00000055, inset 0 1px 2px #ffffffcc",
      position: "relative",
      animation: rolling ? "shake 0.45s ease" : "none",
    }}>
      {(dots[value] || dots[1]).map(([x, y], i) => (
        <div key={i} style={{
          position: "absolute", width: 8, height: 8,
          background: "radial-gradient(circle at 35% 35%,#4a3a22,#241a0d)",
          borderRadius: "50%",
          left: `${x}%`, top: `${y}%`,
          transform: "translate(-50%,-50%)",
          boxShadow: "inset 0 1px 1px #00000088",
        }} />
      ))}
    </div>
  );
}
