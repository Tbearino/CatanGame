// ============================================================
//  src/components/Board.jsx
//  The antique sea-chart board: ocean, tiles, tokens,
//  buildings, roads, and placement highlights.
// ============================================================

import { T, HEX_SIZE, DOT_COUNT, TERRAIN_STYLES, PLAYERS, SETUP_ORDER } from "../game/constants";
import { hexCorners } from "../game/board";
import { vById, eById, canPlaceSettlement, canPlaceRoad } from "../game/rules";

const W = Math.sqrt(3) * HEX_SIZE * 5 + 100;
const H = HEX_SIZE * 8 + 100;

export default function Board({
  g, myTurn, placingSettlement, placingRoad,
  onClickTile, onClickVertex, onClickEdge,
}) {
  return (
    <div style={{
      background: `radial-gradient(circle at 50% 40%, #1d2a22, ${T.tableEdge})`,
      borderRadius: 16, padding: 10,
      boxShadow: "inset 0 0 40px #00000088, 0 10px 30px #00000066",
      border: "1px solid #2a2418",
    }}>
      <svg viewBox={`${-W/2} ${-H/2} ${W} ${H}`} style={{ width:"100%", display:"block" }}>
        <defs>
          <radialGradient id="seaGrad" cx="50%" cy="42%" r="65%">
            <stop offset="0%" stopColor={T.sea} />
            <stop offset="100%" stopColor={T.seaDeep} />
          </radialGradient>
          {Object.entries(TERRAIN_STYLES).map(([k, s]) => (
            <linearGradient key={k} id={`t-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.lit} />
              <stop offset="55%" stopColor={s.fill} />
              <stop offset="100%" stopColor={s.shade} />
            </linearGradient>
          ))}
          <radialGradient id="tokenGrad" cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#fffdf4" />
            <stop offset="70%" stopColor="#f0e6cc" />
            <stop offset="100%" stopColor="#d8c6a0" />
          </radialGradient>
        </defs>

        {/* ocean */}
        <circle cx="0" cy="0" r={HEX_SIZE * 5.0} fill="url(#seaGrad)" />
        {[4.5, 4.0, 3.5].map((m, i) => (
          <circle key={i} cx="0" cy="0" r={HEX_SIZE * m} fill="none"
            stroke={T.seaLine} strokeWidth="0.6" opacity={0.25 - i * 0.05} />
        ))}
        {/* rhumb lines */}
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i * 22.5) * Math.PI / 180, R = HEX_SIZE * 4.5;
          return <line key={i} x1="0" y1="0" x2={R * Math.cos(a)} y2={R * Math.sin(a)}
            stroke={T.seaLine} strokeWidth="0.4" opacity="0.16" />;
        })}
        {/* compass rose */}
        <g transform={`translate(${HEX_SIZE * 3.0},${HEX_SIZE * 3.0})`} opacity="0.5">
          {[0, 90, 180, 270].map(a => (
            <polygon key={a} transform={`rotate(${a})`} points="0,-16 3,0 0,4 -3,0" fill={T.goldSoft} />
          ))}
          {[45, 135, 225, 315].map(a => (
            <polygon key={a} transform={`rotate(${a})`} points="0,-10 2,0 0,3 -2,0" fill={T.gold} />
          ))}
          <circle r="1.6" fill={T.wax} />
        </g>
        <circle cx="0" cy="0" r={HEX_SIZE * 5.0} fill="none" stroke={T.gold} strokeWidth="1.5" opacity="0.4" />

        {/* tiles */}
        {g.board.tiles.map(tile => {
          const style = TERRAIN_STYLES[tile.terrain];
          const points = hexCorners(tile.x, tile.y).map(([x, y]) => `${x},${y}`).join(" ");
          const isRed = tile.number === 6 || tile.number === 8;
          const robberHere = g.robberTile === tile.id;
          const clickable = myTurn && g.mode === "robber" && !robberHere;
          return (
            <g key={tile.id} onClick={() => clickable && onClickTile(tile.id)}
              style={{ cursor: clickable ? "pointer" : "default" }}>
              <polygon points={points} fill={`url(#t-${tile.terrain})`}
                stroke={clickable ? T.goldSoft : "#241a0e"}
                strokeWidth={clickable ? 3 : 2} strokeLinejoin="round"
                opacity={g.mode === "robber" && robberHere ? 0.55 : 1}
                style={{ filter: "drop-shadow(0 2px 2px #00000033)" }} />
              <text x={tile.x} y={tile.y - 16} textAnchor="middle" fontSize="20"
                style={{ pointerEvents: "none", userSelect: "none" }}>{style.emoji}</text>
              {tile.number && (
                <g style={{ pointerEvents: "none" }}>
                  <circle cx={tile.x} cy={tile.y + 13} r="15.5" fill="url(#tokenGrad)"
                    stroke="#9c8156" strokeWidth="1"
                    style={{ filter: "drop-shadow(0 1px 2px #00000055)" }} />
                  <text x={tile.x} y={tile.y + 18.5} textAnchor="middle"
                    fontSize={isRed ? 15.5 : 14} fontWeight="bold"
                    fontFamily="'Cinzel',serif"
                    fill={isRed ? T.wax : "#2a1f0e"} style={{ userSelect: "none" }}>{tile.number}</text>
                  <g>{Array.from({ length: DOT_COUNT[tile.number] || 0 }).map((_, i, arr) => (
                    <circle key={i} cx={tile.x + (i - (arr.length - 1) / 2) * 4.5} cy={tile.y + 25} r="1.3"
                      fill={isRed ? T.wax : "#2a1f0e"} />
                  ))}</g>
                </g>
              )}
              {robberHere && (
                <g style={{ pointerEvents: "none" }}>
                  <ellipse cx={tile.x} cy={tile.y + 20} rx="12" ry="4" fill="#00000055" />
                  <text x={tile.x} y={tile.y + 22} textAnchor="middle" fontSize="24"
                    style={{ userSelect: "none" }}>🤠</text>
                </g>
              )}
            </g>
          );
        })}

        {/* roads */}
        {g.roads.map((r, i) => {
          const e = eById(g, r.edgeId);
          return <g key={i} style={{ pointerEvents: "none" }}>
            <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke="#1a120a" strokeWidth="9" strokeLinecap="round" />
            <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke={PLAYERS[r.playerId].color} strokeWidth="6" strokeLinecap="round" />
            <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke={PLAYERS[r.playerId].colorLit} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          </g>;
        })}

        {/* valid road spots */}
        {placingRoad && g.board.edges.map(e => {
          const valid = g.phase === "setup"
            ? canPlaceRoad(g, e.id, SETUP_ORDER[g.setupStep], g.lastSetupVertex)
            : canPlaceRoad(g, e.id, g.current);
          if (!valid) return null;
          return <line key={e.id} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke={T.goldSoft} strokeWidth="8" strokeLinecap="round" opacity="0.5"
            style={{ cursor: "pointer" }} onClick={() => onClickEdge(e.id)}>
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.3s" repeatCount="indefinite" />
          </line>;
        })}

        {/* valid settlement spots */}
        {placingSettlement && g.board.vertices.map(v => {
          const pid = g.phase === "setup" ? SETUP_ORDER[g.setupStep] : g.current;
          const needRoad = g.phase !== "setup";
          if (!canPlaceSettlement(g, v.id, pid, needRoad)) return null;
          return (
            <circle key={v.id} cx={v.x} cy={v.y} r="8"
              fill={T.goldSoft + "66"} stroke={T.goldSoft} strokeWidth="2"
              style={{ cursor: "pointer" }} onClick={() => onClickVertex(v.id)}>
              <animate attributeName="r" values="6;9;6" dur="1.2s" repeatCount="indefinite" />
            </circle>
          );
        })}

        {/* city-upgrade highlights */}
        {myTurn && g.mode === "city" && g.settlements.filter(b => b.playerId === g.current && !b.isCity).map(b => {
          const v = vById(g, b.vertexId);
          return <circle key={b.vertexId} cx={v.x} cy={v.y} r="14"
            fill="none" stroke={T.goldSoft} strokeWidth="2.5" strokeDasharray="4 3"
            style={{ cursor: "pointer" }} onClick={() => onClickVertex(b.vertexId)}>
            <animateTransform attributeName="transform" type="rotate"
              from={`0 ${v.x} ${v.y}`} to={`360 ${v.x} ${v.y}`} dur="8s" repeatCount="indefinite" />
          </circle>;
        })}

        {/* buildings */}
        {g.settlements.map((b, i) => {
          const v = vById(g, b.vertexId);
          const c = PLAYERS[b.playerId].color;
          const cl = PLAYERS[b.playerId].colorLit;
          return b.isCity ? (
            <g key={i} style={{ pointerEvents: g.mode === "city" ? "none" : "auto",
              filter: "drop-shadow(0 2px 2px #00000077)" }}>
              <polygon points={`${v.x-10},${v.y+7} ${v.x-10},${v.y-3} ${v.x-5},${v.y-3} ${v.x-5},${v.y-9} ${v.x+2},${v.y-13} ${v.x+9},${v.y-9} ${v.x+10},${v.y+7}`}
                fill={c} stroke="#140c06" strokeWidth="1.5" />
              <polygon points={`${v.x-10},${v.y-3} ${v.x-5},${v.y-3} ${v.x+2},${v.y-13} ${v.x+9},${v.y-9}`}
                fill={cl} opacity="0.6" />
            </g>
          ) : (
            <g key={i} style={{ pointerEvents: "none", filter: "drop-shadow(0 2px 2px #00000077)" }}>
              <polygon points={`${v.x-7},${v.y+5} ${v.x-7},${v.y-2} ${v.x},${v.y-8} ${v.x+7},${v.y-2} ${v.x+7},${v.y+5}`}
                fill={c} stroke="#140c06" strokeWidth="1.5" />
              <polygon points={`${v.x-7},${v.y-2} ${v.x},${v.y-8} ${v.x+7},${v.y-2}`}
                fill={cl} opacity="0.55" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
