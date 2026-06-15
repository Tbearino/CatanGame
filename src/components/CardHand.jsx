// ============================================================
//  src/components/CardHand.jsx
//  Your resource cards displayed as a fan, like holding
//  physical cards. Click a card to select it for trading.
//  Placeholder art — your paintings replace the emoji later.
// ============================================================

import { T, RES } from "../game/constants";

// Card back pattern for opponent's hidden cards
function CardBack({ index, total }) {
  const angle = (index - (total - 1) / 2) * 4;
  return (
    <div style={{
      width: 48, height: 68,
      background: "linear-gradient(135deg, #3a2a18, #5a4028)",
      border: "2px solid #2a1a0c",
      borderRadius: 6,
      transform: `rotate(${angle}deg) translateY(${-Math.abs(angle)*0.5}px)`,
      transformOrigin: "bottom center",
      marginLeft: index > 0 ? -22 : 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 2px 4px #00000044",
    }}>
      <span style={{ fontSize: 16, opacity: 0.4 }}>🂠</span>
    </div>
  );
}

// One resource card face
function Card({ resource, index, total, glowing, onClick, disabled }) {
  const r = RES[resource];
  const angle = (index - (total - 1) / 2) * (total > 8 ? 3 : 4);
  const lift = -Math.abs(angle) * 0.6;

  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        width: 52, height: 74,
        background: "linear-gradient(180deg, #fffdf6, #f0e8d4)",
        border: `2px solid ${glowing ? T.gold : "#c8b89a"}`,
        borderRadius: 7,
        transform: `rotate(${angle}deg) translateY(${lift}px)`,
        transformOrigin: "bottom center",
        marginLeft: index > 0 ? -18 : 0,
        cursor: disabled ? "default" : "pointer",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 2,
        boxShadow: glowing
          ? `0 0 12px ${T.gold}88, 0 3px 6px #00000044`
          : "0 2px 5px #00000033",
        transition: "transform 0.15s, box-shadow 0.15s",
        position: "relative",
        zIndex: index,
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.transform = `rotate(${angle}deg) translateY(${lift - 12}px)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = `rotate(${angle}deg) translateY(${lift}px)`;
      }}
    >
      {/* color strip at top — your painted card art will replace this whole card */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 6,
        background: r.color, borderRadius: "5px 5px 0 0",
      }} />
      <span style={{ fontSize: 22, marginTop: 6 }}>{r.emoji}</span>
      <span style={{ fontSize: 9, color: T.ink, fontWeight: 600, letterSpacing: 0.5 }}>
        {r.label.toUpperCase()}
      </span>
    </div>
  );
}

// ============================================================
//  THE HAND — expands each resource into individual cards
//  e.g. {wood:3, brick:1} → [wood, wood, wood, brick]
// ============================================================
export default function CardHand({
  hand,           // {wood:2, brick:1, ...}
  isMe,           // show faces or backs?
  trading,        // are we in trade mode?
  onClickCard,    // (resource) => void — called when clicking a card
  lastGained = {},
}) {
  if (!isMe) {
    // Opponent: just show card backs in a fan
    const total = Object.values(hand).reduce((a, b) => a + b, 0);
    if (total === 0) return <span style={{ color: T.inkSoft, fontSize: 13, fontStyle: "italic" }}>no cards</span>;
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 20px" }}>
        {Array.from({ length: total }).map((_, i) => (
          <CardBack key={i} index={i} total={total} />
        ))}
      </div>
    );
  }

  // My hand: expand into individual face-up cards
  const cards = [];
  Object.entries(RES).forEach(([key]) => {
    for (let i = 0; i < (hand[key] || 0); i++) {
      cards.push({ resource: key, idx: cards.length });
    }
  });

  if (cards.length === 0) {
    return <span style={{ color: T.inkSoft, fontSize: 13, fontStyle: "italic" }}>no cards in hand</span>;
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 24px", minHeight: 90 }}>
      {cards.map((c) => (
        <Card
          key={`${c.resource}-${c.idx}`}
          resource={c.resource}
          index={c.idx}
          total={cards.length}
          glowing={trading || (lastGained[c.resource] || 0) > 0}
          onClick={() => onClickCard && onClickCard(c.resource)}
          disabled={!trading}
        />
      ))}
    </div>
  );
}
