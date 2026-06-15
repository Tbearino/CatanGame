// ============================================================
//  src/App.jsx
//  Top-level screen router: Menu → Lobby or Game
// ============================================================

import { useState, useEffect } from "react";
import { T, PLAYERS } from "./game/constants";
import { initGame } from "./game/board";
import { ONLINE_ENABLED, getSupabase, makeRoomCode } from "./config/supabase";
import Game from "./Game";
import Lobby from "./components/Lobby";

// Save/load session from URL hash so refresh keeps you in the game
// URL looks like: yoursite.netlify.app/#room=K7M2-PXQ9&seat=0
function saveSessionToURL(roomCode, seat) {
  window.location.hash = `room=${roomCode}&seat=${seat}`;
}
function loadSessionFromURL() {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  const room = params.get("room");
  const seat = params.get("seat");
  if (room && seat !== null) return { roomCode: room, mySeat: parseInt(seat) };
  return null;
}
function clearSessionURL() {
  history.replaceState(null, "", window.location.pathname);
}

export default function App() {
  const [screen, setScreen] = useState("menu");
  const [gameKey, setGameKey] = useState(0);
  const [session, setSession] = useState({ online:false, roomCode:null, mySeat:0, initialState:null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // On first load, check URL for an existing online session
  useEffect(() => {
    const saved = loadSessionFromURL();
    if (!saved) return;
    (async () => {
      const sb = await getSupabase();
      if (!sb) return;
      const { data } = await sb.from("games").select("state").eq("id", saved.roomCode).single();
      if (data?.state) {
        setSession({ online:true, roomCode:saved.roomCode, mySeat:saved.mySeat, initialState:data.state });
        setGameKey(k => k + 1);
        setScreen("game");
      }
    })();
  }, []);

  const startLocal = () => {
    clearSessionURL();
    setSession({ online:false, roomCode:null, mySeat:0, initialState:null });
    setGameKey(k => k + 1);
    setScreen("game");
  };

  const hostOnline = async () => {
    setBusy(true); setError("");
    const sb = await getSupabase();
    if (!sb) { setError("Online unavailable — check your Supabase keys."); setBusy(false); return; }
    const code = makeRoomCode();
    const state = initGame();
    const { error: err } = await sb.from("games").upsert({ id: code, state, updated_at: new Date().toISOString() });
    setBusy(false);
    if (err) { setError("Couldn't create room: " + err.message); return; }
    saveSessionToURL(code, 0);
    setSession({ online:true, roomCode:code, mySeat:0, initialState:state });
    setGameKey(k => k + 1);
    setScreen("game");
  };

  const joinOnline = async (joinCode) => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setBusy(true); setError("");
    const sb = await getSupabase();
    if (!sb) { setError("Online unavailable — check your Supabase keys."); setBusy(false); return; }
    const { data, error: err } = await sb.from("games").select("state").eq("id", code).single();
    setBusy(false);
    if (err || !data) { setError("Room not found. Check the code."); return; }
    saveSessionToURL(code, 1);
    setSession({ online:true, roomCode:code, mySeat:1, initialState:data.state });
    setGameKey(k => k + 1);
    setScreen("game");
  };

  const goToMenu = () => {
    clearSessionURL();
    setScreen("menu");
  };

  return (
    <div style={{
      minHeight:"100vh",
      background: `radial-gradient(ellipse at 50% 0%, #241c12 0%, ${T.table} 45%, ${T.tableEdge} 100%)`,
      color: T.parchment, fontFamily: "'Spectral', Georgia, serif",
      display:"flex", flexDirection:"column", alignItems:"center", padding:14,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Spectral:ital,wght@0,400;0,600;1,400&family=Caveat:wght@600&display=swap');
        @keyframes shake{0%,100%{transform:rotate(0deg)}25%{transform:rotate(-9deg) scale(1.06)}50%{transform:rotate(9deg) scale(1.1)}75%{transform:rotate(-4deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        button:active{transform:scale(0.97)}
        .disp{font-family:'Cinzel',serif;letter-spacing:1px}
        .hand{font-family:'Caveat',cursive}
        @media(prefers-reduced-motion:reduce){*{animation:none !important}}
      `}</style>

      {screen === "menu" && <MenuScreen onLocal={startLocal} onOnline={() => { setScreen("lobby"); setError(""); }} />}
      {screen === "lobby" && <Lobby onHost={hostOnline} onJoin={joinOnline} onBack={goToMenu} busy={busy} error={error} />}
      {screen === "game" && (
        <>
          <div style={{ width:"100%", maxWidth:1200, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <h2 className="disp" style={{ color:T.goldSoft, fontSize:20, margin:0, fontWeight:700 }}>OUR CATAN</h2>
            {session.online && (
              <span style={{ color:T.gold, fontSize:13, letterSpacing:1 }}>
                Room <b style={{ fontFamily:"'Cinzel',serif" }}>{session.roomCode}</b> · you are {PLAYERS[session.mySeat].name}
              </span>
            )}
            <button onClick={goToMenu} style={{
              background:"transparent", border:`1px solid ${T.inkSoft}`, color:T.gold,
              borderRadius:7, padding:"5px 14px", fontSize:12, cursor:"pointer",
            }}>← Harbor</button>
          </div>
          <Game key={gameKey} session={session} />
        </>
      )}
    </div>
  );
}

// ---- MENU SCREEN ----
function MenuScreen({ onLocal, onOnline }) {
  return (
    <div style={{
      textAlign:"center", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", minHeight:"88vh",
      animation:"fadeUp 0.7s ease both",
    }}>
      <svg width="150" height="150" viewBox="-60 -60 120 120" style={{ marginBottom:6 }}>
        <circle r="52" fill="none" stroke={T.gold} strokeWidth="0.8" opacity="0.5" />
        <circle r="44" fill="none" stroke={T.gold} strokeWidth="0.5" opacity="0.35" />
        {[0,45,90,135,180,225,270,315].map(a => (
          <line key={a} x1="0" y1="0"
            x2={48 * Math.cos(a * Math.PI / 180)} y2={48 * Math.sin(a * Math.PI / 180)}
            stroke={T.gold} strokeWidth="0.4" opacity="0.4" />
        ))}
        {[0,90,180,270].map(a => (
          <polygon key={a} transform={`rotate(${a})`} points="0,-46 7,0 0,10 -7,0" fill={T.goldSoft} opacity="0.9" />
        ))}
        {[45,135,225,315].map(a => (
          <polygon key={a} transform={`rotate(${a})`} points="0,-30 4,0 0,6 -4,0" fill={T.gold} opacity="0.7" />
        ))}
        <circle r="4" fill={T.wax} />
      </svg>
      <h1 className="disp" style={{ fontSize:52, color:T.goldSoft, margin:0, fontWeight:700, textShadow:"0 2px 18px #00000088" }}>
        OUR CATAN
      </h1>
      <p className="hand" style={{ color:T.gold, fontSize:24, margin:"2px 0 4px" }}>charted &amp; hand-painted by us</p>
      <p style={{ color:T.inkSoft, margin:"0 0 30px", fontSize:14, letterSpacing:1 }}>
        Roads · Cities · Development cards · The Robber · Provably fair dice
      </p>
      <div style={{ display:"flex", gap:14, flexWrap:"wrap", justifyContent:"center" }}>
        <button onClick={onLocal} style={menuBtn(false)}>SAME SCREEN</button>
        <button onClick={onOnline} style={menuBtn(true)}>PLAY ONLINE</button>
      </div>
      {!ONLINE_ENABLED && (
        <p style={{ color:T.inkSoft, fontSize:12, marginTop:16, maxWidth:340 }}>
          Online is off until you add your Supabase keys in src/config/supabase.js.
          Same-screen play works right now.
        </p>
      )}
    </div>
  );
}

const menuBtn = (primary) => ({
  background: primary ? `linear-gradient(135deg,${T.goldSoft},${T.gold})` : "transparent",
  color: primary ? "#2a1d08" : T.goldSoft,
  border: primary ? "none" : `1px solid ${T.gold}`,
  borderRadius:8, padding:"14px 36px", fontSize:16, fontWeight:700,
  fontFamily:"'Cinzel',serif", letterSpacing:2, cursor:"pointer",
  boxShadow: primary ? "0 4px 0 #8a6a18, 0 8px 22px #00000066" : "none",
});
