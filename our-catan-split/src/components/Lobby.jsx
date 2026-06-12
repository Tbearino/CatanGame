// ============================================================
//  src/components/Lobby.jsx
//  Create or join an online game room.
// ============================================================

import { useState } from "react";
import { T } from "../game/constants";

export default function Lobby({ onHost, onJoin, onBack, busy, error }) {
  const [joinCode, setJoinCode] = useState("");

  return (
    <div style={{
      textAlign:"center", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", minHeight:"85vh", gap:16,
      animation:"fadeUp 0.5s ease both",
    }}>
      <h2 className="disp" style={{ color:T.goldSoft, fontSize:30, margin:0 }}>PLAY ONLINE</h2>
      <p style={{ color:T.inkSoft, margin:0, maxWidth:380 }}>
        Create a game and share the code with your crew, or enter a code to join theirs.
      </p>

      <div style={{ display:"flex", gap:20, flexWrap:"wrap", justifyContent:"center", marginTop:8 }}>
        {/* host */}
        <div style={cardStyle}>
          <h3 className="disp" style={{ color:T.ink, margin:"0 0 8px" }}>Create</h3>
          <p style={{ color:T.inkSoft, fontSize:13, margin:"0 0 14px" }}>
            You'll play as Crimson and get a room code.
          </p>
          <button onClick={onHost} disabled={busy} style={btnStyle}>
            {busy ? "Creating…" : "Create Game"}
          </button>
        </div>
        {/* join */}
        <div style={cardStyle}>
          <h3 className="disp" style={{ color:T.ink, margin:"0 0 8px" }}>Join</h3>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value)}
            placeholder="ABCD-EFGH"
            style={{
              width:"100%", boxSizing:"border-box", padding:"9px 12px",
              fontSize:16, letterSpacing:2, textAlign:"center", borderRadius:6,
              border:`1px solid ${T.parchDeep}`, background:"#fffaf0", color:T.ink,
              fontFamily:"'Spectral',serif", marginBottom:12, textTransform:"uppercase",
            }} />
          <button onClick={() => onJoin(joinCode)} disabled={busy} style={btnStyle}>
            {busy ? "Joining…" : "Join Game"}
          </button>
        </div>
      </div>

      {error && <p style={{ color:"#e0917f", fontSize:13 }}>{error}</p>}

      <button onClick={onBack} style={{
        background:"transparent", border:`1px solid ${T.inkSoft}`, color:T.gold,
        borderRadius:7, padding:"6px 16px", fontSize:12, cursor:"pointer", marginTop:8,
      }}>← Back</button>
    </div>
  );
}

const cardStyle = {
  background: `linear-gradient(150deg,#f4ead4,#ece0c6)`,
  border: "1px solid #dccaa4", borderRadius: 10, padding: "20px 22px",
  width: 240, boxShadow: "0 6px 18px #00000055",
};

const btnStyle = {
  background: "linear-gradient(135deg,#e2c878,#c2972f)", color: "#2a1d08",
  border: "none", borderRadius: 7, padding: "10px 0", width: "100%", fontSize: 14,
  fontWeight: 700, fontFamily: "'Cinzel',serif", letterSpacing: 1, cursor: "pointer",
  boxShadow: "0 3px 0 #8a6a18",
};
