// ============================================================
//  src/components/TradePanel.jsx
//  The trading table. Click cards from your hand to place
//  them in "You Give". Click bank resources for "You Get".
//  Supports 4:1 bank trading (ports/player trading later).
// ============================================================

import { T, RES } from "../game/constants";

// A mini card shown in the give/get areas
function MiniCard({ resource, count, onClick }) {
  const r = RES[resource];
  if (!count) return null;
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 4,
      padding: "3px 8px",
      background: "#fffaf0",
      border: `1.5px solid ${r.color}`,
      borderRadius: 6, cursor: onClick ? "pointer" : "default",
      fontSize: 13,
    }}>
      <span>{r.emoji}</span>
      <b style={{ color: T.ink }}>×{count}</b>
    </div>
  );
}

export default function TradePanel({
  hand,            // my current hand
  giving,          // {wood:2, ...} what I'm offering
  getting,         // {wood:0, ...} what I want
  onAddGive,       // (resource) => add one to giving
  onRemoveGive,    // (resource) => remove one from giving
  onAddGet,        // (resource) => add one to getting
  onRemoveGet,     // (resource) => remove one from getting
  onConfirm,       // execute the trade
  onCancel,        // cancel trade mode
}) {
  const giveTotal = Object.values(giving).reduce((a, b) => a + b, 0);
  const getTotal = Object.values(getting).reduce((a, b) => a + b, 0);

  // Validate bank trade: 4 of one resource for 1 of another
  const giveTypes = Object.entries(giving).filter(([, n]) => n > 0);
  const getTypes = Object.entries(getting).filter(([, n]) => n > 0);
  const validBankTrade =
    giveTypes.length === 1 && giveTypes[0][1] === 4 &&
    getTypes.length === 1 && getTypes[0][1] === 1 &&
    giveTypes[0][0] !== getTypes[0][0];

  return (
    <div style={{
      background: `linear-gradient(150deg, #f4ead4, ${T.parchment})`,
      border: `1px solid ${T.parchDeep}`,
      borderRadius: 10,
      padding: "14px 16px",
      boxShadow: "0 4px 12px #00000044",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 10,
      }}>
        <span className="disp" style={{ fontSize: 13, color: T.ink, fontWeight: 700 }}>
          TRADING TABLE
        </span>
        <button onClick={onCancel} style={{
          background: "transparent", border: `1px solid ${T.inkSoft}`,
          color: T.inkSoft, borderRadius: 5, padding: "2px 10px",
          fontSize: 11, cursor: "pointer",
        }}>✕ Cancel</button>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {/* YOU GIVE */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 11, color: T.wax, fontWeight: 700,
            letterSpacing: 1, marginBottom: 6,
          }}>YOU GIVE</div>
          <div style={{
            minHeight: 50, padding: 8,
            background: "#f8eed8",
            border: `2px dashed ${T.parchDeep}`,
            borderRadius: 8,
            display: "flex", flexWrap: "wrap", gap: 4,
            alignItems: "center", justifyContent: "center",
          }}>
            {giveTotal === 0 ? (
              <span style={{ fontSize: 11, color: T.inkSoft, fontStyle: "italic" }}>
                click your cards ↑
              </span>
            ) : (
              Object.entries(giving).map(([r, n]) => (
                <MiniCard key={r} resource={r} count={n}
                  onClick={() => onRemoveGive(r)} />
              ))
            )}
          </div>
          <div style={{ fontSize: 10, color: T.inkSoft, marginTop: 3, textAlign: "center" }}>
            {giveTotal} card{giveTotal !== 1 ? "s" : ""} · click to remove
          </div>
        </div>

        {/* arrow */}
        <div style={{
          display: "flex", alignItems: "center", fontSize: 24, color: T.gold,
          padding: "0 4px",
        }}>⇄</div>

        {/* YOU GET */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 11, color: "#2a7a3a", fontWeight: 700,
            letterSpacing: 1, marginBottom: 6,
          }}>YOU GET</div>
          <div style={{
            minHeight: 50, padding: 8,
            background: "#f0f6ee",
            border: `2px dashed #b8d4b0`,
            borderRadius: 8,
            display: "flex", flexWrap: "wrap", gap: 4,
            alignItems: "center", justifyContent: "center",
          }}>
            {getTotal === 0 ? (
              <span style={{ fontSize: 11, color: T.inkSoft, fontStyle: "italic" }}>
                pick from bank ↓
              </span>
            ) : (
              Object.entries(getting).map(([r, n]) => (
                <MiniCard key={r} resource={r} count={n}
                  onClick={() => onRemoveGet(r)} />
              ))
            )}
          </div>
          <div style={{ fontSize: 10, color: T.inkSoft, marginTop: 3, textAlign: "center" }}>
            {getTotal} card{getTotal !== 1 ? "s" : ""} · click to remove
          </div>
        </div>
      </div>

      {/* BANK ROW — click to pick what you want */}
      <div style={{ marginTop: 10 }}>
        <div style={{
          fontSize: 10, color: T.inkSoft, letterSpacing: 1,
          marginBottom: 4, textAlign: "center",
        }}>BANK — click what you want</div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          {Object.entries(RES).map(([key, r]) => {
            const isGiving = giving[key] > 0;
            return (
              <button key={key} onClick={() => onAddGet(key)} disabled={isGiving}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  width: 48, padding: "6px 0",
                  background: "#fffaf0",
                  border: `1.5px solid ${isGiving ? "#ddd" : r.color}`,
                  borderRadius: 6,
                  cursor: isGiving ? "not-allowed" : "pointer",
                  opacity: isGiving ? 0.35 : 1,
                  transition: "all 0.15s",
                }}>
                <span style={{ fontSize: 18 }}>{r.emoji}</span>
                <span style={{ fontSize: 9, color: T.ink, fontWeight: 600 }}>{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONFIRM */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
        <button onClick={onConfirm} disabled={!validBankTrade} style={{
          background: validBankTrade
            ? `linear-gradient(135deg, ${T.goldSoft}, ${T.gold})`
            : "#e7ddc6",
          color: validBankTrade ? "#2a1d08" : "#a99a7a",
          border: "none", borderRadius: 7,
          padding: "8px 24px", fontSize: 13, fontWeight: 700,
          fontFamily: "'Cinzel',serif", letterSpacing: 1,
          cursor: validBankTrade ? "pointer" : "not-allowed",
          boxShadow: validBankTrade ? "0 3px 0 #8a6a18" : "none",
        }}>
          TRADE
        </button>
      </div>

      {/* helper text */}
      <div style={{ fontSize: 10, color: T.inkSoft, textAlign: "center", marginTop: 6 }}>
        Bank rate: 4 of same → 1 of any other
        {giveTotal > 0 && !validBankTrade && getTotal > 0 && (
          <span style={{ color: T.wax }}> · not a valid trade yet</span>
        )}
      </div>
    </div>
  );
}
